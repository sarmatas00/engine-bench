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
    return {"origin": [(xmin + xmax) / 2.0, (ymin + ymax) / 2.0],
            "extent": (xmax - xmin) / 2.0}


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
    cols, rows = inv * (xx, yy)
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
    Image.fromarray(benchio.encode_terrain_rgb(grid), mode="RGB").save(out_dir / "terrain-rgb.png")
    Image.fromarray(benchio.basemap_rgb(grid), mode="RGB").save(out_dir / "basemap.png")

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
            f"The DTCC data servers are compute.dtcc.chalmers.se:8001/tiles (footprints) and "
            f":8000/get_lidar (point cloud); neither needs credentials. Underlying error: {exc!r}"
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
    print(f"stage1: {len(city.buildings)} buildings", flush=True)
    return {"meta": meta, "city": city}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default=str(OUT))
    parser.add_argument("--bounds", default=str(BOUNDS_PATH))
    args = parser.parse_args()
    build_stage1(Path(args.out), Path(args.bounds))
