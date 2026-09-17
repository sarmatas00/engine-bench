# DRAFT — not posted

Intended target: `dtcc-core` issues. **Nothing here has been posted.** Posting needs
explicit approval plus an immediate `sarmatas00` identity check (`gh auth status`).

Recorded as ledger ruling R6 / decision `548c3d0a`.

---

**Title:** `build_terrain_raster(ground_only=True)` rejects every downloaded point cloud: `load_list` upcasts classification to float64

## Summary

On `4c8d621`, any pipeline that goes `download_pointcloud` → `build_terrain_raster(ground_only=True)`
fails. That includes `datasets._city_mesh_common.prepare_city_from_bounds`, and so every dataset
built on it — `city_surface_mesh` and `city_volume_mesh` among them.

It reaches downstream repos. `dtcc-sim`'s urban-heat simulation fails the same way on container
Core `5ca2ca4`, because `dtcc_sim.urban_heat._build_mesh_from_bounds` calls
`datasets.city_volume_mesh`, which calls `prepare_city_from_bounds`:

```
File "/app/dtcc_sim/urban_heat.py", line 424, in _build_mesh_from_bounds
    volume_mesh = datasets.city_volume_mesh(
File "dtcc_core/datasets/city_volume_mesh.py", line 346, in build
    city = prepare_city_from_bounds(
File "dtcc_core/datasets/_city_mesh_common.py", line 79, in prepare_city_from_bounds
    raster = dtcc_core.builder.build_terrain_raster(
ValueError: ground_only=True requires one integer LAS classification per point
```

A caller at that depth cannot hand in a pre-built city, so there is no consumer-side fix that is
not a monkeypatch.

```
File "dtcc_core/datasets/_city_mesh_common.py", line 79, in prepare_city_from_bounds
    raster = dtcc_core.builder.build_terrain_raster(...)
File "dtcc_core/builder/geometry_builders/terrain.py", line 323, in build_terrain_raster
    raise ValueError("ground_only=True requires one integer LAS classification per point")
```

The classification values are correct and complete. Only the dtype is wrong, and Core's own
loader is what makes it wrong, so no re-download or cache clear helps.

## Cause

1. `PointCloud.classification` defaults to `np.empty(0)` — **float64**.
   `model/geometry/pointcloud.py:35`
2. `io.load_pointcloud` on a *list* of tiles seeds a fresh `PointCloud()` and merges into it.
   `merge` does `np.concatenate((self.classification, other.classification))`, so the float64
   empty seed upcasts the loader's `uint8` to float64.
   `io/pointcloud.py:154`, `model/geometry/pointcloud.py:166`
3. `download_pointcloud` always goes through that list path.
   `io/data/wrapper.py`, the `'lidar'` branch
4. `build_terrain_raster` newly requires `classifications.dtype.kind in "iu"`.
   `builder/geometry_builders/terrain.py:321-323`
5. `prepare_city_from_bounds` always passes `ground_only=True`, so there is no supported way through.
   `datasets/_city_mesh_common.py:79`

Step 4 is the new part. The guard does not exist at `5cf56fa`; it arrived with the post-#85 work.
Steps 1-3 are long-standing and were harmless until the guard landed.

## Reproduction

Any bounds with point-cloud coverage. Measured on a 500 m Gothenburg tile
(`EPSG:3006`, `[318369.0, 6398890.0, 318869.0, 6399390.0]`):

```
points            : 456241
classification len: 456241   dtype: float64      unique classes: [1. 2. 7.]
after remove_global_outliers: 451404 points, 451404 classifications, float64
```

Length correct, values integral, dtype float64.

## Why CI does not catch it

The only test covering this path, `tests/datasets/test_city_mesh_common.py`, mocks
`build_terrain_raster` entirely (`mock_build_terrain_raster.assert_called_once_with(...)`),
so the real loader and the new guard are never exercised together.

## Suggested fix

Either of these, at the source rather than at each consumer:

```python
# model/geometry/pointcloud.py
classification: np.ndarray = field(default_factory=lambda: np.empty(0, dtype=np.uint8))
```

or make `merge` preserve the incoming dtype when `self` is empty. The first is smaller; the second
also covers a merge of an empty cloud that was constructed some other way.

An integration test that loads a real (or fixture) multi-tile point cloud and calls
`build_terrain_raster(ground_only=True)` unmocked would keep it fixed.

## What we did meanwhile

Cast to an integer dtype at our own boundary before calling `build_terrain_raster`, refusing to
round any non-integral value. Natively that is a small fork of `prepare_city_from_bounds`; inside
the `dtcc-sim` container it has to be a monkeypatch over `dtcc_core.builder.build_terrain_raster`,
because the failing call is four frames inside the image. Both are temporary and go away with the
upstream fix.

Affected versions: reproduced on `4c8d621` (native) and `5ca2ca4` (container). Not present at
`5cf56fa`, where the guard does not exist.
