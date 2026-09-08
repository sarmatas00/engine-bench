import sys
from pathlib import Path

import numpy as np
from affine import Affine

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import stage1_build
from dtcc_core.model import Raster


def make_raster(cell=2.0, n=250, x0=318369.0, y1=6399390.0):
    """A north-up raster over the tile: height = 10 + (x - x0) / 25, so relief = 20 m."""
    xs = x0 + (np.arange(n) + 0.5) * cell
    data = np.tile(10.0 + (xs - x0) / 25.0, (n, 1))
    return Raster(data=data, georef=Affine(cell, 0.0, x0, 0.0, -cell, y1), nodata=np.nan, crs="EPSG:3006")


def test_local_frame_centres_the_origin_and_reports_the_half_size():
    frame = stage1_build.local_frame([318369, 6398890, 318869, 6399390])
    assert frame["origin"] == [318619.0, 6399140.0]
    assert frame["extent"] == 250.0


def test_raster_stats_ignores_nodata():
    r = make_raster()
    r.data = r.data.copy()
    r.data[0, 0] = np.nan
    stats = stage1_build.raster_stats(r)
    assert stats["zmin"] > 10.0
    assert stats["relief"] == stats["zmax"] - stats["zmin"]
    assert 19.0 < stats["relief"] < 20.1


def test_sample_raster_grid_is_north_up_and_matches_the_ramp():
    r = make_raster()
    grid = stage1_build.sample_raster_grid(r, [318619.0, 6399140.0], 250.0, 8)
    assert grid.shape == (8, 8)
    # The ramp runs west to east and does not vary with y, so every row is equal
    assert np.allclose(grid[0], grid[-1])
    assert grid[0, 0] < grid[0, -1]
    # Row 0 is north: flip the raster and the sampled grid must flip with it
    flipped = Raster(data=r.data[::-1].copy(), georef=r.georef, nodata=r.nodata, crs=r.crs)
    fgrid = stage1_build.sample_raster_grid(flipped, [318619.0, 6399140.0], 250.0, 8)
    assert np.allclose(fgrid, grid[::-1])


def test_anchor_lonlat_lands_on_skansen_kronan():
    lon, lat = stage1_build.anchor_lonlat([318619.0, 6399140.0], "EPSG:3006")
    assert abs(lon - 11.9564) < 0.002
    assert abs(lat - 57.6978) < 0.002


def test_write_terrain_artifacts_writes_every_file_and_a_consistent_dataset_json(tmp_path):
    r = make_raster()
    meta = stage1_build.write_terrain_artifacts(
        tmp_path, r,
        bounds=[318369, 6398890, 318869, 6399390],
        name="gothenburg-skansen-kronan", crs="EPSG:3006", size=64,
    )
    for f in ["dataset.json", "terrain.tif", "terrain-rgb.png", "terrain.json", "basemap.png"]:
        assert (tmp_path / f).exists(), f
    assert meta["origin"] == [318619.0, 6399140.0]
    assert meta["z0"] == meta["relief"]["zmin"]
    assert meta["cell_size"] == 2.0
    assert meta["stages"]["stage2"] is None
    assert meta["stages"]["stage1"].endswith("Z") or "T" in meta["stages"]["stage1"]

    import json
    from PIL import Image
    import benchio
    terrain = json.loads((tmp_path / "terrain.json").read_text())
    assert terrain["width"] == terrain["height"] == 64
    assert terrain["bounds_local"] == [-250.0, -250.0, 250.0, 250.0]
    rgb = np.asarray(Image.open(tmp_path / "terrain-rgb.png").convert("RGB"))
    decoded = benchio.decode_terrain_rgb(rgb)
    # The PNG stores heights above z0, so its minimum is 0 and its span is the relief.
    # Tolerance: the 64x64 query grid is coarser than the 2 m raster (7.8 m pitch), so a
    # nearest-cell sample can miss the extreme cell by one pitch — 7.8 m x 0.04 m/m = 0.31 m
    # on this fixture's ramp — plus 0.05 m of Terrain-RGB quantisation. A missing z0
    # subtraction would show up as ~10 m, far outside this bound.
    assert abs(decoded.min()) < 0.4
    assert abs(decoded.max() - meta["relief"]["relief"]) < 0.4
