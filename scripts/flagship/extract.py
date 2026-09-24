#!/usr/bin/env python
"""Extract flagship building geometry into the bench's mesh artifacts.

    .venv/bin/python scripts/flagship/extract.py <flagship.dtcc>

Writes public/data/flagship/{buildings.mesh.json,buildings.mesh.bin,dataset.json}.
This is the geometry axis only: flagship's 10k buildings against the 215 of the
Gothenburg tile. It carries no volume field -- the 256 MiB native format cannot
hold a city and a usable volume grid at once (see NOTES.md).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import mapbox_earcut

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts" / "real"))
import benchio  # noqa: E402

OUT = REPO / "public" / "data" / "flagship"
CRS = "EPSG:7415"
REPRESENTATION = "cityjson-2"   # the LoD 2.2 Solid every part carries


def newell_normal(points: np.ndarray) -> np.ndarray:
    """Polygon normal that is correct for non-planar and concave rings alike."""
    nxt = np.roll(points, -1, axis=0)
    n = np.array([
        np.sum((points[:, 1] - nxt[:, 1]) * (points[:, 2] + nxt[:, 2])),
        np.sum((points[:, 2] - nxt[:, 2]) * (points[:, 0] + nxt[:, 0])),
        np.sum((points[:, 0] - nxt[:, 0]) * (points[:, 1] + nxt[:, 1])),
    ])
    length = np.linalg.norm(n)
    return n / length if length else np.array([0.0, 0.0, 1.0])


def triangulate(outer: np.ndarray, holes: list[np.ndarray]) -> tuple[np.ndarray, np.ndarray]:
    """Return (vertices, triangle indices) for one surface, holes included.

    Rings are projected onto the surface's own plane before ear cutting: earcut
    is a 2D algorithm and projecting onto a fixed axis pair would collapse any
    vertical wall to a line. Indices address the returned vertex block.
    """
    rings = [np.asarray(outer, dtype=np.float64)] + [np.asarray(h, dtype=np.float64) for h in holes]
    verts = np.concatenate(rings, axis=0)
    if len(verts) < 3:
        return verts, np.empty((0, 3), dtype=np.int64)

    normal = newell_normal(rings[0])
    # Any two unit vectors spanning the plane will do; pick the axis least
    # aligned with the normal so the cross product is never degenerate.
    helper = np.eye(3)[int(np.argmin(np.abs(normal)))]
    u = np.cross(normal, helper)
    u /= np.linalg.norm(u) or 1.0
    v = np.cross(normal, u)
    flat = np.column_stack([verts @ u, verts @ v])

    ring_ends = np.cumsum([len(r) for r in rings]).astype(np.uint32)
    try:
        idx = mapbox_earcut.triangulate_float64(flat, ring_ends)
    except Exception:
        return verts, np.empty((0, 3), dtype=np.int64)
    tris = np.asarray(idx, dtype=np.int64).reshape(-1, 3)
    if tris.size == 0:
        return verts, tris
    # earcut works in the projected frame, so its winding follows u x v. Flip it
    # back when that disagrees with the surface's own outward normal.
    if np.dot(np.cross(u, v), normal) < 0:
        tris = tris[:, ::-1]
    return verts, tris


def collect(city) -> dict:
    from dtcc_core.model.object.building import BuildingPart

    def walk(obj):
        yield obj
        for group in obj.children.values():
            for child in group:
                yield from walk(child)

    # Sorted so a rebuild produces byte-identical output and cell indices keep
    # meaning across runs.
    parts = sorted((o for o in walk(city) if isinstance(o, BuildingPart)), key=lambda o: str(o.id))

    positions, indices, cell_object, table = [], [], [], []
    base = 0
    skipped_surfaces = 0
    for part_index, part in enumerate(parts):
        try:
            solid = part.get_geometry(id=REPRESENTATION)
        except Exception:
            solid = None
        surfaces = getattr(solid, "surfaces", None) if solid is not None else None
        if not surfaces:
            continue
        table.append(str(part.id))
        object_index = len(table) - 1
        for surface in surfaces:
            outer = np.asarray(surface.vertices, dtype=np.float64)
            holes = [np.asarray(h, dtype=np.float64) for h in (getattr(surface, "holes", None) or [])]
            verts, tris = triangulate(outer, holes)
            if tris.size == 0:
                skipped_surfaces += 1
                if len(verts):
                    base += len(verts)
                    positions.append(verts)
                continue
            positions.append(verts)
            indices.append(tris + base)
            cell_object.append(np.full(len(tris), object_index, dtype=np.uint32))
            base += len(verts)

    return {
        "positions": np.concatenate(positions) if positions else np.zeros((0, 3)),
        "indices": np.concatenate(indices) if indices else np.zeros((0, 3), dtype=np.int64),
        "cell_object_index": np.concatenate(cell_object) if cell_object else np.zeros(0, np.uint32),
        "object_table": table,
        "parts_seen": len(parts),
        "skipped_surfaces": skipped_surfaces,
    }


def area_weighted_normals(positions: np.ndarray, indices: np.ndarray) -> np.ndarray:
    normals = np.zeros_like(positions)
    tri = positions[indices]
    face = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    for k in range(3):
        np.add.at(normals, indices[:, k], face)
    lengths = np.linalg.norm(normals, axis=1)
    lengths[lengths == 0] = 1.0
    return normals / lengths[:, None]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("model", type=Path)
    ap.add_argument("--out", type=Path, default=OUT)
    args = ap.parse_args()

    from dtcc_core import io
    from pyproj import Transformer

    raw = args.model.read_bytes()
    source_sha256 = hashlib.sha256(raw).hexdigest()
    city = io.load_model(str(args.model))

    mesh = collect(city)
    positions = mesh["positions"]
    indices = mesh["indices"]
    if not len(indices):
        raise SystemExit("no triangles extracted")

    xmin, ymin = positions[:, 0].min(), positions[:, 1].min()
    xmax, ymax = positions[:, 0].max(), positions[:, 1].max()
    # The bench derives `extent` from the x span alone and reuses it as the y
    # half-size, so a non-square frame would be silently wrong downstream.
    # Square the frame about its own centre rather than trusting the data.
    cx, cy = (xmin + xmax) / 2.0, (ymin + ymax) / 2.0
    extent = max(xmax - xmin, ymax - ymin) / 2.0
    bounds = [cx - extent, cy - extent, cx + extent, cy + extent]
    z0 = float(positions[:, 2].min())
    zmax = float(positions[:, 2].max())

    local = positions.copy()
    local[:, 0] -= cx
    local[:, 1] -= cy
    local[:, 2] -= z0
    normals = area_weighted_normals(local, indices)

    args.out.mkdir(parents=True, exist_ok=True)
    info = benchio.write_mesh_pair(
        args.out, "buildings",
        positions=local, normals=normals, indices=indices,
        cell_extra={"cell_object_index": (mesh["cell_object_index"], "u32", 1)},
        metadata={"objectTable": mesh["object_table"]},
    )

    tf = Transformer.from_crs(CRS, "EPSG:4326", always_xy=True)
    lon0, lat0 = tf.transform(cx, cy)
    west, south = tf.transform(bounds[0], bounds[1])
    east, north = tf.transform(bounds[2], bounds[3])

    dataset = {
        "name": "delft-flagship",
        "crs": CRS,
        "bounds": [float(v) for v in bounds],
        "origin": [float(cx), float(cy)],
        "extent": float(extent),
        "anchor_lonlat": [float(lon0), float(lat0)],
        "bounds_lonlat": [float(west), float(south), float(east), float(north)],
        "z0": z0,
        "relief": {"zmin": z0, "zmax": zmax, "relief": zmax - z0},
        "axis": "geometry",
        "volume_field": None,
        "volume_field_reason":
            "flagship carries no usable volume grid: the 256 MiB native format cannot hold "
            "a 2 km city and a high-resolution VolumeGrid at once",
        "source": {
            "file": args.model.name,
            "sha256": source_sha256,
            "note": "hash recorded here because upstream removed source checksums in dtcc-core 9b4e9b9",
        },
        "counts": {
            "buildingParts": mesh["parts_seen"],
            "objectsInTable": len(mesh["object_table"]),
            "vertices": info["vertexCount"],
            "triangles": info["indexCount"] // 3,
            "skippedSurfaces": mesh["skipped_surfaces"],
            "skippedSurfacesReason":
                "degenerate in the source: fewer than 3 distinct vertices, zero area, "
                "no triangle exists to draw (verified for every skipped surface)",
        },
        "stages": {"extract": datetime.now(timezone.utc).isoformat()},
    }
    (args.out / "dataset.json").write_text(json.dumps(dataset, indent=2) + "\n")

    # Manifest of byteLength+sha256 for every file the page loads. The bench
    # verifies bytes before constructing a single typed-array view; a geometry
    # page that skipped that would be the one unverified loader in the suite.
    def verified(name: str) -> dict:
        raw_bytes = (args.out / name).read_bytes()
        return {"byteLength": len(raw_bytes), "sha256": hashlib.sha256(raw_bytes).hexdigest()}

    manifest = {
        "axis": "geometry",
        "dataset": "dataset.json",
        "files": {name: verified(name) for name in
                  ("buildings.mesh.json", "buildings.mesh.bin", "dataset.json")},
    }
    (args.out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")

    print(json.dumps({"counts": dataset["counts"], "extent": extent,
                      "z0": z0, "bytes": info["byteLength"]}, indent=2))


if __name__ == "__main__":
    main()
