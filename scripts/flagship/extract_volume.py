#!/usr/bin/env python
"""Extract flagship's air-grid speed field into the bench's volume artifact.

    <python with dtcc-core develop>/bin/python scripts/flagship/extract_volume.py <flagship.dtcc>

Writes public/data/flagship/volume/{speed.grid.f32,speed.grid.json,manifest.json}.

NEEDS A NEWER CORE THAN .venv HAS. The grid-only flagship is 490 MB, and the
dtcc-core this bench's .venv resolves refuses anything over 256 MiB. Core's
develop at b375f47 raised that to Protobuf's own 2 GiB ceiling and, in the same
range, made load_model validate against LinkML, which .venv does not carry. The
revision actually used is recorded in speed.grid.json.

The buildings are NOT re-extracted. They are byte-identical to
public/data/flagship/buildings.mesh.bin (verified by running extract.py on this
same file: same sha256), so pages 17 and 18 reuse the geometry artifact and
this script writes the volume alone, in that artifact's local frame.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[2]
GEOMETRY = REPO / "public" / "data" / "flagship"
OUT = GEOMETRY / "volume"
FIELD = "speed"          # the field pages 13 and 14 open on
ARROW_HEIGHT_NAP_M = 15.0   # the generator's own height_15m slice height
ARROW_STRIDE_CELLS = 5      # one arrow per 5x5 cells: 40 m apart on the 8 m grid
SEED_STRIDE_ARROWS = 5      # one streamline seed per 5x5 arrows: 200 m apart
TRACE_Z_RANGE_NAP_M = (-2.0, 60.0)   # layers the browser traces through
TRACE_Z_STRIDE = 4          # every 4th layer: ~4 m vertical, full 8 m horizontal
DOMAIN_ID = "synthetic-flow-domain"
GRID_KEY = "air_grid"


def find_grid(city):
    def walk(obj):
        yield obj
        for group in obj.children.values():
            for child in group:
                yield from walk(child)

    for obj in walk(city):
        if str(getattr(obj, "id", "")) == DOMAIN_ID:
            return obj, obj.geometry[GRID_KEY].geometry
    raise SystemExit(f"no {DOMAIN_ID}/{GRID_KEY} in the model")


def building_probes(city, min_width: float) -> np.ndarray:
    """(x, y, z) world points 2 m above each building part's base, at its centroid.

    These should land in masked (solid) cells if the grid's axes are wired the
    way we claim. Used only to check the order, never exported.

    Only parts at least `min_width` across on their narrow side. MEASURED on the
    8 m grid: parts narrower than one cell hit a solid cell 45% of the time,
    because the generator masks by cell centre and a small footprint often
    misses every centre; parts 8-32 m wide hit 91-95%. A probe that cannot land
    inside its building tests the resolution, not the axis order.
    """
    from dtcc_core.model.object.building import BuildingPart

    def walk(obj):
        yield obj
        for group in obj.children.values():
            for child in group:
                yield from walk(child)

    points = []
    for part in walk(city):
        if not isinstance(part, BuildingPart):
            continue
        try:
            solid = part.get_geometry(id="cityjson-2")
        except Exception:
            continue
        surfaces = getattr(solid, "surfaces", None) or []
        verts = [np.asarray(s.vertices, dtype=np.float64) for s in surfaces if len(s.vertices)]
        if not verts:
            continue
        v = np.concatenate(verts)
        if min(np.ptp(v[:, 0]), np.ptp(v[:, 1])) < min_width:
            continue
        points.append([v[:, 0].mean(), v[:, 1].mean(), v[:, 2].min() + 2.0])
    return np.asarray(points)


def check_order(mask_xyz: np.ndarray, grid, probes: np.ndarray) -> dict:
    """Prove the reordered mask is x-fastest with z up, against the city itself.

    Two independent checks, each with a deliberately wrong reading as control:
      * vertical: the bottom layer (below ground) is solid, the top layer open.
      * horizontal: building interiors are solid. The control reads the same
        probes with x and y swapped, and must score far lower -- otherwise the
        check could not tell the right wiring from the wrong one.
    """
    nz, ny, nx = mask_xyz.shape            # C order (z, y, x): x varies fastest
    solid = ~mask_xyz
    layer_solid = solid.reshape(nz, -1).mean(axis=1)
    if not (layer_solid[0] > 0.95 and layer_solid[-1] == 0.0):
        raise SystemExit(f"vertical order check failed: bottom {layer_solid[0]:.3f}, top {layer_solid[-1]:.3f}")

    b = grid.bounds

    def solid_rate(px, py):
        i = np.floor((px - b.xmin) / grid.xstep).astype(int)
        j = np.floor((py - b.ymin) / grid.ystep).astype(int)
        k = np.floor((probes[:, 2] - b.zmin) / grid.zstep).astype(int)
        ok = (i >= 0) & (i < nx) & (j >= 0) & (j < ny) & (k >= 0) & (k < nz)
        return float(solid[k[ok], j[ok], i[ok]].mean()), int(ok.sum())

    rate, n = solid_rate(probes[:, 0], probes[:, 1])
    # Control: swap x and y about the grid centre.
    cx, cy = (b.xmin + b.xmax) / 2, (b.ymin + b.ymax) / 2
    swapped, _ = solid_rate(cx + (probes[:, 1] - cy), cy + (probes[:, 0] - cx))
    # 0.85, not 1: a concave footprint's centroid can sit in its own courtyard
    # (the widest parts measure 0.89). The swapped control is what makes this a
    # test of the order rather than of the threshold.
    if not (rate > 0.85 and rate - swapped > 0.3):
        raise SystemExit(f"horizontal order check failed: {rate:.3f} inside buildings, {swapped:.3f} swapped")
    return {
        "bottomLayerSolid": round(float(layer_solid[0]), 4),
        "topLayerSolid": float(layer_solid[-1]),
        "buildingProbes": n,
        "buildingProbesSolid": round(rate, 4),
        "buildingProbesSolidIfXYSwapped": round(swapped, 4),
    }


def sample_arrows(velocity_xyz: np.ndarray, air_xyz: np.ndarray, grid, local_offset) -> tuple[np.ndarray, dict]:
    """One horizontal layer of wind arrows, sampled from the velocity field.

    The layer is the grid's z layer whose centre is nearest ARROW_HEIGHT_NAP_M,
    every ARROW_STRIDE_CELLS cells in x and y, starting mid-block so the
    lattice sits centred in the domain. Solid cells are skipped, not zeroed: an
    arrow of length zero inside a building would still be an instance to draw.

    Rows are (x, y, z, vx, vy, vz) float32 at cell centres, in the geometry
    artifact's local frame. Both pages draw exactly these rows.
    """
    nz, ny, nx = air_xyz.shape
    b = grid.bounds
    centres_z = b.zmin + (np.arange(nz) + 0.5) * grid.zstep
    k = int(np.argmin(np.abs(centres_z - ARROW_HEIGHT_NAP_M)))
    first = ARROW_STRIDE_CELLS // 2
    js, is_ = np.meshgrid(np.arange(first, ny, ARROW_STRIDE_CELLS),
                          np.arange(first, nx, ARROW_STRIDE_CELLS), indexing="ij")
    js, is_ = js.ravel(), is_.ravel()
    keep = air_xyz[k, js, is_]
    js, is_ = js[keep], is_[keep]
    ox, oy, oz = local_offset
    rows = np.empty((len(js), 6), dtype=np.float32)
    rows[:, 0] = b.xmin + (is_ + 0.5) * grid.xstep - ox
    rows[:, 1] = b.ymin + (js + 0.5) * grid.ystep - oy
    rows[:, 2] = centres_z[k] - oz
    rows[:, 3:6] = velocity_xyz[k, js, is_]
    if not np.isfinite(rows).all():
        raise SystemExit("arrow rows contain NaN: the air mask and velocity disagree")
    speed = np.linalg.norm(rows[:, 3:6], axis=1)
    return rows, {
        "count": int(len(rows)),
        "layout": "x, y, z, vx, vy, vz as float32 per arrow",
        "layer": k,
        "heightNapM": float(centres_z[k]),
        "strideCells": ARROW_STRIDE_CELLS,
        "spacingM": [ARROW_STRIDE_CELLS * grid.xstep, ARROW_STRIDE_CELLS * grid.ystep],
        "skippedSolid": int((~keep).sum()),
        "speedRange": [float(speed.min()), float(speed.max())],
    }


def trace_grid(velocity_xyz: np.ndarray, air_xyz: np.ndarray, grid, local_offset) -> tuple[np.ndarray, dict]:
    """The velocity field both pages trace streamlines through.

    The full field is 99 MiB, too much for a page. Horizontally it keeps the
    full 8 m cells, so building wakes survive; vertically every
    TRACE_Z_STRIDE-th layer between TRACE_Z_RANGE_NAP_M. Solid cells carry
    NaN in the source, and vtkImageStreamline has no stop rule, so a NaN would
    poison every later point of a line: they are written as zero velocity, and
    a line that reaches a wall stalls there on both pages.
    """
    nz, ny, nx = air_xyz.shape
    b = grid.bounds
    centres_z = b.zmin + (np.arange(nz) + 0.5) * grid.zstep
    lo, hi = TRACE_Z_RANGE_NAP_M
    ks = np.arange(nz)[(centres_z >= lo) & (centres_z <= hi)][::TRACE_Z_STRIDE]
    sub = velocity_xyz[ks].copy()
    sub[~air_xyz[ks]] = 0.0
    if not np.isfinite(sub).all():
        raise SystemExit("trace grid has NaN outside solid cells")
    ox, oy, oz = local_offset
    return np.ascontiguousarray(sub, dtype=np.float32), {
        "dims": [nx, ny, int(len(ks))],
        "origin": [b.xmin + grid.xstep / 2 - ox, b.ymin + grid.ystep / 2 - oy, float(centres_z[ks[0]]) - oz],
        "spacing": [grid.xstep, grid.ystep, float(centres_z[ks[1]] - centres_z[ks[0]])],
        "order": "x-fastest",
        "components": 3,
        "layersNapM": [float(centres_z[ks[0]]), float(centres_z[ks[-1]])],
        "zStrideLayers": TRACE_Z_STRIDE,
        "solidCellsZeroed": int((~air_xyz[ks]).sum()),
    }


def core_revision() -> str:
    import dtcc_core
    from importlib.metadata import version, PackageNotFoundError
    try:
        return version("dtcc-core")
    except PackageNotFoundError:
        return getattr(dtcc_core, "__version__", "unknown")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("model", type=Path)
    ap.add_argument("--out", type=Path, default=OUT)
    ap.add_argument("--core-commit", default="b375f47",
                    help="dtcc-core commit the environment was built from; recorded, not checked")
    args = ap.parse_args()

    from dtcc_core import io

    raw = args.model.read_bytes()
    source_sha256 = hashlib.sha256(raw).hexdigest()
    del raw
    city = io.load_model(str(args.model))
    _, grid = find_grid(city)

    nx, ny, nz = grid.width, grid.height, grid.depth
    by_name = {f.name: f for f in grid.fields}
    values = np.asarray(by_name[FIELD].values, dtype=np.float32)
    air = np.asarray(by_name["air_mask"].values, dtype=bool)
    if values.shape != (nx * ny * nz,):
        raise SystemExit(f"{FIELD}: {values.shape}, expected one value per cell ({nx * ny * nz})")

    # The generator samples cell centres from np.meshgrid(xc, yc, zc) with the
    # default 'xy' indexing and ravels in C order: array shape (ny, nx, nz), so
    # z varies fastest, then x, then y (its own comment: "(northing, easting,
    # elevation) array order"). A 3D texture wants x fastest, then y, then z.
    def to_xyz(a: np.ndarray) -> np.ndarray:
        return np.ascontiguousarray(a.reshape(ny, nx, nz).transpose(2, 0, 1))

    speed = to_xyz(values)
    air_xyz = to_xyz(air)
    order = check_order(air_xyz, grid, building_probes(city, min_width=grid.xstep))

    finite = np.isfinite(speed)
    if not np.array_equal(finite, air_xyz):
        raise SystemExit("NaN cells and air_mask disagree; the fill below would be wrong")
    lo, hi = float(speed[finite].min()), float(speed[finite].max())
    # Solid cells carry NaN, which neither renderer's transfer function defines.
    # They are written as the field's own minimum, which both transfer functions
    # map to zero opacity, so solids draw as empty air without a sentinel that
    # would stretch the colour range or darken the trilinear blend at walls.
    masked = int((~finite).sum())
    speed[~finite] = lo

    dataset = json.loads((GEOMETRY / "dataset.json").read_text())
    ox, oy = dataset["origin"]
    z0 = dataset["z0"]
    b = grid.bounds
    # Values sit at CELL CENTRES, so node 0 is half a step in from the bounds.
    origin = [b.xmin + grid.xstep / 2 - ox, b.ymin + grid.ystep / 2 - oy, b.zmin + grid.zstep / 2 - z0]

    velocity = np.asarray(by_name["velocity"].values, dtype=np.float32)
    if velocity.shape != (nx * ny * nz, 3):
        raise SystemExit(f"velocity: {velocity.shape}, expected (cells, 3)")
    velocity_xyz = np.ascontiguousarray(velocity.reshape(ny, nx, nz, 3).transpose(2, 0, 1, 3))
    arrow_rows, arrows_meta = sample_arrows(velocity_xyz, air_xyz, grid, (ox, oy, z0))
    trace, trace_meta = trace_grid(velocity_xyz, air_xyz, grid, (ox, oy, z0))
    # Seeds are a coarser lattice of the arrow points, so every seed is in air.
    per_row = len(np.arange(ARROW_STRIDE_CELLS // 2, nx, ARROW_STRIDE_CELLS))
    lattice = arrow_rows[:, :3]
    col = np.rint((lattice[:, 0] - lattice[:, 0].min()) / (ARROW_STRIDE_CELLS * grid.xstep)).astype(int)
    row = np.rint((lattice[:, 1] - lattice[:, 1].min()) / (ARROW_STRIDE_CELLS * grid.ystep)).astype(int)
    pick = (col % SEED_STRIDE_ARROWS == SEED_STRIDE_ARROWS // 2) & (row % SEED_STRIDE_ARROWS == SEED_STRIDE_ARROWS // 2)
    trace_meta["seeds"] = [[round(float(v), 3) for v in p] for p in lattice[pick]]
    trace_meta["seedSpacingM"] = SEED_STRIDE_ARROWS * ARROW_STRIDE_CELLS * grid.xstep
    del per_row

    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "speed.grid.f32").write_bytes(speed.astype("<f4").tobytes())
    (args.out / "arrows.f32").write_bytes(arrow_rows.astype("<f4").tobytes())
    (args.out / "arrows.json").write_text(json.dumps(arrows_meta, indent=2) + "\n")
    (args.out / "velocity.grid.f32").write_bytes(trace.astype("<f4").tobytes())
    (args.out / "velocity.grid.json").write_text(json.dumps(trace_meta, indent=2) + "\n")
    meta = {
        "field": FIELD,
        "unit": "m/s",
        "dims": [nx, ny, nz],
        "origin": origin,
        "spacing": [grid.xstep, grid.ystep, grid.zstep],
        "order": "x-fastest",
        "association": "cell-centre",
        "frame": "the flagship geometry artifact's local frame (dataset.json origin and z0)",
        "range": [lo, hi],
        "maskedCells": masked,
        "maskedFill": lo,
        "maskedFillReason": "solid cells are NaN in the source; written as the field minimum, "
                            "which both transfer functions map to zero opacity",
        "orderCheck": order,
        "synthetic": True,
        "source": {
            "file": args.model.name,
            "sha256": source_sha256,
            "object": f"{DOMAIN_ID}/{GRID_KEY}",
            "dtccCore": {"version": core_revision(), "commit": args.core_commit},
        },
        "stages": {"extract": datetime.now(timezone.utc).isoformat()},
    }
    (args.out / "speed.grid.json").write_text(json.dumps(meta, indent=2) + "\n")

    def verified(name: str) -> dict:
        data = (args.out / name).read_bytes()
        return {"byteLength": len(data), "sha256": hashlib.sha256(data).hexdigest()}

    manifest = {
        "axis": "volume",
        "grid": "speed.grid.json",
        "arrows": "arrows.json",
        "velocity": "velocity.grid.json",
        "files": {name: verified(name) for name in
                  ("speed.grid.json", "speed.grid.f32", "arrows.json", "arrows.f32",
                   "velocity.grid.json", "velocity.grid.f32")},
    }
    (args.out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({**{k: meta[k] for k in ("dims", "origin", "spacing", "range", "maskedCells", "orderCheck")},
                      "arrows": arrows_meta,
                      "trace": {k: v for k, v in trace_meta.items() if k != "seeds"} | {"seedCount": len(trace_meta["seeds"])}},
                     indent=2))


if __name__ == "__main__":
    main()
