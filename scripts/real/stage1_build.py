#!/usr/bin/env python
"""Stage 1: build the real tile from DTCC's own datasets into public/data/real/.

Runs natively in engine-bench/.venv (Python 3.11). TetGen is not available
natively, so this script never touches volume meshing -- that lives in the
dtcc-sim container (Stage 2).

    .venv/bin/python scripts/real/stage1_build.py
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import benchio

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "public" / "data" / "real"
BOUNDS_PATH = Path(__file__).resolve().parent / "bounds.json"
RASTER_CELL_SIZE = 2.0
RASTER_RADIUS = 3.0
MAX_MESH_SIZE = 10.0
IMAGE_SIZE = 1024
MIN_RELIEF_M = 20.0


def local_frame(bounds) -> dict:
    xmin, ymin, xmax, ymax = [float(v) for v in bounds]
    x_span, y_span = xmax - xmin, ymax - ymin
    # `extent` is derived from the x span alone and then reused as the y half-size everywhere
    # downstream (every page's zoom, camera, sideOffset, grid spacing and TerrainLayer bounds) —
    # a non-square `bounds.json` would silently produce a wrong y half-size across the whole bench.
    assert abs(x_span - y_span) < 1e-6, (
        f"local_frame: bounds must be square — x span {x_span} m != y span {y_span} m "
        f"(bounds={bounds}); `extent` is derived from the x span alone and reused as the y "
        f"half-size everywhere downstream"
    )
    return {"origin": [(xmin + xmax) / 2.0, (ymin + ymax) / 2.0],
            "extent": x_span / 2.0}


def raster_stats(raster) -> dict:
    data = np.asarray(raster.data, dtype=np.float64)
    mask = np.isfinite(data)
    if not np.isnan(raster.nodata):
        mask &= data != raster.nodata
    values = data[mask]
    if values.size == 0:
        raise RuntimeError("terrain raster has no valid cells")
    zmin, zmax = float(values.min()), float(values.max())
    return {"zmin": zmin, "zmax": zmax, "relief": zmax - zmin}


def sample_raster_grid(raster, origin, extent, size) -> np.ndarray:
    """Nearest-cell sample of the raster on a size x size local grid, row 0 = north.

    Returns absolute metres; nodata cells are filled with the raster minimum so
    the encoded PNG never carries a NaN.
    """
    e0, n0 = origin
    xs = e0 - extent + (np.arange(size) + 0.5) * (2 * extent / size)
    ys = n0 + extent - (np.arange(size) + 0.5) * (2 * extent / size)   # row 0 = north
    xx, yy = np.meshgrid(xs, ys)
    inv = ~raster.georef
    cols, rows = inv @ (xx, yy)   # `*` raises PendingDeprecationWarning in affine
    rows = np.clip(rows.astype(np.int64), 0, raster.data.shape[0] - 1)
    cols = np.clip(cols.astype(np.int64), 0, raster.data.shape[1] - 1)
    grid = np.asarray(raster.data, dtype=np.float64)[rows, cols]
    bad = ~np.isfinite(grid)
    if not np.isnan(raster.nodata):
        bad |= grid == raster.nodata
    if bad.any():
        grid = np.where(bad, raster_stats(raster)["zmin"], grid)
    return grid


def anchor_lonlat(origin, crs) -> list:
    from pyproj import Transformer
    tf = Transformer.from_crs(crs, "EPSG:4326", always_xy=True)
    lon, lat = tf.transform(origin[0], origin[1])
    return [float(lon), float(lat)]


def write_terrain_artifacts(out_dir, raster, *, bounds, name, crs, size=IMAGE_SIZE) -> dict:
    """terrain.tif, terrain-rgb.png, terrain.json, basemap.png and dataset.json."""
    import dtcc_core.io as dtcc_io

    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    frame = local_frame(bounds)
    stats = raster_stats(raster)
    z0 = stats["zmin"]

    dtcc_io.save_raster(raster, str(out_dir / "terrain.tif"))

    grid = sample_raster_grid(raster, frame["origin"], frame["extent"], size) - z0
    # No `mode=`: it is deprecated in Pillow 13, and a (H, W, 3) uint8 array already infers RGB.
    Image.fromarray(benchio.encode_terrain_rgb(grid)).save(out_dir / "terrain-rgb.png")
    Image.fromarray(benchio.basemap_rgb(grid)).save(out_dir / "basemap.png")

    lon0, lat0 = anchor_lonlat(frame["origin"], crs)
    from pyproj import Transformer
    tf = Transformer.from_crs(crs, "EPSG:4326", always_xy=True)
    west, south = tf.transform(bounds[0], bounds[1])
    east, north = tf.transform(bounds[2], bounds[3])
    (out_dir / "terrain.json").write_text(json.dumps({
        "width": size, "height": size,
        "bounds_local": [-frame["extent"], -frame["extent"], frame["extent"], frame["extent"]],
        "bounds_lonlat": [float(west), float(south), float(east), float(north)],
    }, indent=2) + "\n")

    meta = {
        "name": name,
        "crs": crs,
        "bounds": [float(v) for v in bounds],
        "origin": frame["origin"],
        "extent": frame["extent"],
        "anchor_lonlat": [lon0, lat0],
        "z0": z0,
        "relief": stats,
        "cell_size": RASTER_CELL_SIZE,
        "stages": {"stage1": datetime.now(timezone.utc).isoformat(), "stage2": None},
    }
    (out_dir / "dataset.json").write_text(json.dumps(meta, indent=2) + "\n")
    return meta


def split_surface_mesh(mesh):
    """Face masks for terrain and buildings.

    dtcc-core's city surface mesh marks faces -2 ground, -1 halo (both terrain)
    and >= 0 for the building whose index that is
    (dtcc_core/cpp/include/MeshBuilder.h "markers:" and the wall_face_mask in
    builder/geometry_builders/meshes.py::_surface_shell_stage_audit).
    """
    markers = np.asarray(mesh.markers).reshape(-1)
    faces = np.asarray(mesh.faces)
    if markers.size != len(faces):
        raise RuntimeError(f"{len(faces)} faces but {markers.size} markers -- "
                           "the surface mesh did not come back with per-face markers")
    buildings = markers >= 0
    return ~buildings, buildings


def submesh(mesh, face_mask, origin, z0, face_values=None) -> dict:
    """Compact the masked faces into a standalone mesh in the local frame.

    face_values: one value per face of the *source* mesh. The very same mask that
    selects the faces selects these, and nothing downstream reorders either, so
    output triangle k keeps the value of the source face it came from. That
    correspondence is the whole basis for attributing a triangle to an object.
    """
    face_mask = np.asarray(face_mask)
    faces = np.asarray(mesh.faces)[face_mask]
    used = np.unique(faces)
    remap = np.full(len(mesh.vertices), -1, dtype=np.int64)
    remap[used] = np.arange(len(used))
    positions = np.asarray(mesh.vertices, dtype=np.float64)[used].copy()
    positions[:, 0] -= origin[0]
    positions[:, 1] -= origin[1]
    positions[:, 2] -= z0
    indices = remap[faces]

    # Area-weighted vertex normals: the cross product is already proportional to
    # the triangle area, so accumulating it unnormalised does the weighting.
    normals = np.zeros_like(positions)
    tri = positions[indices]
    face_normals = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    for k in range(3):
        np.add.at(normals, indices[:, k], face_normals)
    lengths = np.linalg.norm(normals, axis=1)
    lengths[lengths == 0] = 1.0
    normals /= lengths[:, None]

    out = {"positions": positions, "normals": normals, "indices": indices}
    if face_values is not None:
        values = np.asarray(face_values).reshape(-1)
        if values.size != len(mesh.faces):
            raise ValueError(f"face_values has {values.size} values "
                             f"for {len(mesh.faces)} source faces")
        out["face_values"] = values[face_mask]
    return out


def flatten_buildings(sub) -> dict:
    """Move every building down so its lowest vertex sits at z = 0.

    This is the real-data analogue of the synthetic blocks.glb: buildings placed
    at sea level, which pages 02/03/09 draw against real terrain to show that
    z = 0 geometry is buried, not floating.

    Buildings are grouped by connected component, NOT by face marker. Adjacent
    buildings in a real tile share wall vertices, and a shared vertex belongs to
    two markers: subtracting per marker moves it twice, which does not translate
    the geometry, it deforms it. The invariant that catches this is edge length —
    a translation cannot change it. On the Skansen Kronan tile the marker version
    stretched the tallest vertical edge from 16.59 m to 50.34 m and left 11,171 of
    37,672 triangles with vertices displaced by amounts differing by over a metre.
    A welded pair has to move as one unit or the shared wall tears.
    """
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import connected_components

    positions = sub["positions"].copy()
    indices = sub["indices"]
    n = len(positions)
    edges = np.vstack([indices[:, [0, 1]], indices[:, [1, 2]], indices[:, [2, 0]]])
    graph = coo_matrix((np.ones(len(edges)), (edges[:, 0], edges[:, 1])), shape=(n, n))
    count, component = connected_components(graph, directed=False)
    for c in range(count):
        verts = np.flatnonzero(component == c)
        positions[verts, 2] -= positions[verts, 2].min()
    return {"positions": positions, "normals": sub["normals"], "indices": indices}


def building_height(building):
    """The height dtcc-core itself would use for a building, or None.

    At dtcc-core 4c8d621 (post-#85) `Building.height` became an alias for
    `measured_height`, which is only set when the *source data* carried a
    measurement. The height this pipeline computes from the point cloud
    (`compute_building_heights`) is stored as `estimated_height`, so on a
    downloaded tile `building.height` is None and the previous
    `float(building.height)` raises a TypeError.

    Core resolves the pair itself in builder/model_conversion.py, and this
    follows that rule exactly rather than inventing a second one: the estimate
    wins when present, the measurement is the fallback. That is also the value
    the surface mesh beside these footprints was extruded from.
    """
    height = (building.measured_height if building.estimated_height is None
              else building.estimated_height)
    return None if height is None else float(height)


def footprints_geojson(city, crs) -> dict:
    """LOD0 footprints in lon/lat with a `height` property, for page 01."""
    from pyproj import Transformer
    tf = Transformer.from_crs(crs, "EPSG:4326", always_xy=True)
    features = []
    for building in city.buildings:
        footprint = building.lod0
        if footprint is None or len(footprint.vertices) < 3:
            continue
        polygon = footprint.to_polygon(simplify=0.0)
        if polygon.is_empty:
            continue
        height = building_height(building)
        if height is None:
            # Spec section 9: fail loudly. Page 01 extrudes by this value, and there is
            # no honest substitute for a height the source never supplied.
            raise RuntimeError(
                f"building {building.id} has neither an estimated_height nor a "
                f"measured_height; page 01 extrudes footprints by this value"
            )
        ring = list(polygon.exterior.coords)
        lons, lats = tf.transform([c[0] for c in ring], [c[1] for c in ring])
        features.append({
            "type": "Feature",
            "properties": {"height": height},
            "geometry": {"type": "Polygon", "coordinates": [[[lon, lat] for lon, lat in zip(lons, lats)]]},
        })
    return {"type": "FeatureCollection", "features": features}


def build_stage1(out_dir=OUT, bounds_path=BOUNDS_PATH) -> dict:
    from dtcc_core.datasets._city_mesh_common import prepare_city_from_bounds
    from dtcc_core.model import Bounds

    spec = json.loads(Path(bounds_path).read_text())
    bounds = [float(v) for v in spec["bounds"]]
    name, crs = spec["name"], spec["crs"]
    print(f"stage1: {name} {bounds} {crs}", flush=True)

    try:
        city = prepare_city_from_bounds(
            Bounds(xmin=bounds[0], ymin=bounds[1], xmax=bounds[2], ymax=bounds[3]),
            raster_cell_size=RASTER_CELL_SIZE, raster_radius=RASTER_RADIUS,
            remove_outliers=True, outlier_threshold=3.0,
        )
    except Exception as exc:  # spec section 9: fail loudly, never fall back to synthetic
        raise RuntimeError(
            f"stage1 could not build the city for {name} bbox {bounds} ({crs}). "
            f"The DTCC data servers are compute.dtcc.chalmers.se:8001 (footprints) and "
            f":8000 (point cloud); neither needs credentials. The failing URL is in the "
            f"chained exception below. Underlying error: {exc!r}"
        ) from exc
    raster = city.terrain.raster
    if raster is None:
        raise RuntimeError("prepare_city_from_bounds returned a city with no terrain raster")

    meta = write_terrain_artifacts(out_dir, raster, bounds=bounds, name=name, crs=crs)
    print(f"stage1: relief {meta['relief']['relief']:.1f} m "
          f"(zmin {meta['relief']['zmin']:.1f}, zmax {meta['relief']['zmax']:.1f})", flush=True)
    if meta["relief"]["relief"] < MIN_RELIEF_M:
        print(f"stage1: WARNING relief is below {MIN_RELIEF_M} m. Spec section 3 says to move to "
              f"the fallback box {spec['fallback']['bounds']} ({spec['fallback']['name']}) and "
              f"record why in NOTES.md.", flush=True)

    from dtcc_core.datasets.city_surface_mesh import CitySurfaceMeshDataset

    print(f"stage1: {len(city.buildings)} buildings", flush=True)
    surface = CitySurfaceMeshDataset().build_from_city(
        city, bounds=bounds, max_mesh_size=MAX_MESH_SIZE, format=None)
    print(f"stage1: surface mesh {len(surface.vertices)} vertices, {len(surface.faces)} faces", flush=True)

    ground_mask, building_mask = split_surface_mesh(surface)
    origin, z0 = meta["origin"], meta["z0"]
    ground = submesh(surface, ground_mask, origin, z0)
    buildings = submesh(surface, building_mask, origin, z0)
    flat = flatten_buildings(buildings)

    out_dir = Path(out_dir)
    for name, sub in [("ground", ground), ("buildings", buildings), ("buildings-flat", flat)]:
        info = benchio.write_mesh_pair(out_dir, name, positions=sub["positions"],
                                       normals=sub["normals"], indices=sub["indices"])
        print(f"stage1: {name}.mesh {info['vertexCount']} vertices, "
              f"{info['indexCount'] // 3} triangles", flush=True)

    fc = footprints_geojson(city, crs)
    (out_dir / "footprints.geojson").write_text(json.dumps(fc) + "\n")
    print(f"stage1: {len(fc['features'])} footprints", flush=True)
    return {"meta": meta, "city": city, "surface": surface}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default=str(OUT))
    parser.add_argument("--bounds", default=str(BOUNDS_PATH))
    args = parser.parse_args()
    build_stage1(Path(args.out), Path(args.bounds))
