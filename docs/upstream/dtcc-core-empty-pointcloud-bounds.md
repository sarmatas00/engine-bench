# DRAFT: not posted

Intended target: `dtcc-core` issues. **Nothing here has been posted.** Posting needs
explicit approval plus an immediate `sarmatas00` identity check.

Second upstream finding from the post-#85 regeneration, independent of the
classification-dtype regression in `dtcc-core-classification-dtype.md`.

---

**Title:** `add_buildings(remove_outside_terrain=True)` silently deletes buildings that have no roof points

## Summary

A building with no lidar returns on its footprint gets an **empty** `POINT_CLOUD`
geometry from `extract_roof_points`. An empty geometry's bounds are zeros, and
`Object.bounds` folds them into the object's aggregate bounds, so the building's
bounding box is stretched from its real location back to the projected origin.
`City.add_buildings(remove_outside_terrain=True)` then tests
`terrain_bounds.contains_bounds(b.bounds)`, which fails, and the building is
removed as "outside the terrain" while sitting comfortably inside it.

## Measured

A 500 m Gothenburg tile (`EPSG:3006`, `[318369.0, 6398890.0, 318869.0, 6399390.0]`),
`raster_cell_size=2.0`, `raster_radius=3.0`:

```
download_footprints            : 217
after extract_roof_points      : 217
after compute_building_heights : 217
add_buildings(remove=False)    : 217
add_buildings(remove=True)     : 215      <- two removed
```

Both removed buildings are the two the builder logs `has no roof points. using min height`
for. Terrain bounds are `x[318369.0, 318869.0] y[6398890.0, 6399390.0]`; one of them:

```
building bounds : x[0.00, 318460.55]  y[0.00, 6399125.05]     <- xmin/ymin dragged to 0
its LOD0 bounds : x[318456.42, 318460.55]  y[6399120.86, 6399125.05]
geometry keys   : ['GeometryType.LOD0', 'GeometryType.POINT_CLOUD']
estimated_height: 2.5   measured_height: None   footprint area: 11.57 m2
```

The LOD0 footprint is ~90 m inside the tile edge. Only the aggregate bounds place it
at the origin. The second case is the same shape (area 13.68 m2).

`contains_bounds` defaults to `ignore_z=True`, so this is not a z-extent issue.

## Why it is post-#85 behavior

`City.add_buildings` is unchanged between `5cf56fa` and `4c8d621`. `Object.calculate_bounds`
was rewritten in that range (`dtcc_core/model/object/object.py`), and the rewrite is
where the behavior changed.

The new implementation skips empty geometries, but only for three of the four kinds:

```python
for geometry in geometries:
    if geometry is None:
        continue
    if isinstance(geometry, Surface) and not geometry.vertices.size:
        continue
    if isinstance(geometry, (MultiSurface, Solid)) and not any(s.vertices.size for s in geometry.surfaces):
        continue
    recalculate = getattr(geometry, "calculate_bounds", None)
    if callable(recalculate):
        recalculate()          # <- an empty PointCloud lands here
    geometry_bounds = geometry.bounds
    ...union...
```

An empty `PointCloud` matches none of the guards, so it is recomputed and unioned in
as a zero box. The old implementation read `geom.bounds` lazily and did not force that
recompute, so the same tile keeps all 217 buildings at `5cf56fa`.

The intent is already in the code: empty geometry should not contribute. `PointCloud`
is simply missing from the list.

## Why it matters

The removal is silent in the sense that matters: the log line says
`Removed 2 buildings outside terrain`, which is a true statement about the computed
bounds and a false statement about the world. Anything counting buildings, or joining
to source data by index, quietly loses rows, and the count depends on lidar coverage
rather than on geometry.

## Suggested fix

Add the missing case to the skip list in `Object.calculate_bounds`, so an empty
`PointCloud` contributes nothing rather than a zero box:

```python
if isinstance(geometry, PointCloud) and not geometry.points.size:
    continue
```

A general emptiness check would cover every geometry type at once and avoid the next
omission of this shape. Alternatively, have `extract_roof_points` attach no geometry
at all when there are no points, rather than an empty one.

A regression test would be: a building inside the terrain whose point-cloud geometry
is empty survives `add_buildings(remove_outside_terrain=True)`.

## What we did meanwhile

Nothing. We record the 217 -> 215 change as measured Core-upgrade drift in our own
NOTES.md rather than working around it, because the two buildings contribute no mesh
faces either way and suppressing the symptom would hide the behavior change.
