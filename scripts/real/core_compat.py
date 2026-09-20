#!/usr/bin/env python
"""Everything that couples this pipeline to dtcc-core's internals, in one place.

Two kinds of code live here, and they have different lifetimes:

**Section 1 (TEMPORARY, ledger R6)** works around an upstream regression that
stops post-#85 Core from building the tile at all. It is deleted as a unit when
the upstream fix lands. Draft report:
`docs/upstream/dtcc-core-classification-dtype.md`.

**Section 2 (PERMANENT, ledger R5)** reproduces the face-marker index space,
because `build_city_surface_mesh` computes it and keeps it to itself. This is
not a workaround: it is the only honest way to say which DTCC building a
triangle belongs to. It stays, but it is coupled to Core's private API and is
the most upgrade-fragile code in the repo.

Kept out of `benchio` because benchio promises pure numpy/JSON transforms with
no dtcc dependency, and out of `stage1_build` so the temporary half can be
deleted without reading the pipeline around it.
"""

from __future__ import annotations

import numpy as np

# Core's own defaults for the conditioning stage. Not hard-coded: read from the
# dataset args model that `CitySurfaceMeshDataset.build_from_city` actually
# passes, so a Core upgrade that retunes them cannot silently desynchronize our
# reproduction from the mesh it is describing. See `conditioning_defaults`.
_CONDITIONING_KEYS = (
    "min_building_detail",
    "min_building_area",
    "merge_tolerance",
    "merge_buildings",
    "pipeline_mode",
)


# ---------------------------------------------------------------------------
# Section 1 -- TEMPORARY (R6): the classification dtype regression
# ---------------------------------------------------------------------------

def integer_classification(pointcloud):
    """Restore an integer LAS classification dtype on a downloaded point cloud.

    At Core 4c8d621 (and container Core 5ca2ca4):

      * `PointCloud.classification` defaults to `np.empty(0)`, which is float64
        (model/geometry/pointcloud.py:35);
      * `io.load_pointcloud`'s list path seeds a fresh `PointCloud()` and merges
        into it, so `np.concatenate` upcasts the loader's uint8 to float64
        (io/pointcloud.py:154, model/geometry/pointcloud.py:166);
      * `download_pointcloud` always takes that list path
        (io/data/wrapper.py, the 'lidar' branch);
      * post-#85 `build_terrain_raster` newly requires `dtype.kind in "iu"` and
        raises otherwise (builder/geometry_builders/terrain.py:321-323). The
        guard does not exist at 5cf56fa, so this is new in the upgrade.

    Only the dtype is wrong -- the values are whole numbers and the length is
    right -- so this casts and never rounds. A fractional class would mean
    something we do not understand about the source, and rounding it would
    silently reclassify a point.

    Mutates `pointcloud` in place and returns it, matching how Core's own
    builders pass point clouds around.
    """
    points = np.asarray(pointcloud.points)
    classification = np.asarray(pointcloud.classification)
    if classification.shape != (len(points),):
        raise ValueError(
            f"{len(points)} points but {classification.size} classifications; "
            f"build_terrain_raster(ground_only=True) requires one per point")
    if classification.dtype.kind in "iu":
        return pointcloud
    if not np.isfinite(classification).all():
        raise ValueError("point cloud classification contains non-finite values")
    rounded = np.rint(classification)
    if not np.array_equal(rounded, classification):
        bad = classification[rounded != classification]
        raise ValueError(
            f"point cloud classification is not integral (e.g. {bad[0]}); "
            f"refusing to round a LAS class into a different one")
    fits_uint8 = classification.size and rounded.min() >= 0 and rounded.max() <= 255
    pointcloud.classification = rounded.astype(np.uint8 if fits_uint8 else np.int32)
    return pointcloud


def prepare_city(bounds, *, raster_cell_size, raster_radius, outlier_threshold=3.0):
    """dtcc-core's `prepare_city_from_bounds`, with the R6 cast inside it.

    A step-for-step fork of
    `dtcc_core.datasets._city_mesh_common.prepare_city_from_bounds` for the
    `flat_ground=False` path, in the same order with the same arguments, plus
    one `integer_classification` call before the terrain raster is built.
    Delete this and go back to Core's helper once the upstream fix lands.
    """
    import dtcc_core
    from dtcc_core.model import City

    pointcloud = dtcc_core.io.data.download_pointcloud(bounds=bounds)
    buildings = dtcc_core.io.data.download_footprints(bounds=bounds)
    pointcloud = pointcloud.remove_global_outliers(outlier_threshold)

    # The one line that is not in Core's helper.
    pointcloud = integer_classification(pointcloud)

    raster = dtcc_core.builder.build_terrain_raster(
        pointcloud, cell_size=raster_cell_size, radius=raster_radius, ground_only=True)
    buildings = dtcc_core.builder.extract_roof_points(buildings, pointcloud)
    buildings = dtcc_core.builder.compute_building_heights(buildings, raster, overwrite=True)

    city = City()
    city.add_terrain(raster)
    city.add_buildings(buildings, remove_outside_terrain=True)
    return city


def patch_terrain_raster_classification():
    """Apply the R6 cast inside the dtcc-sim container, at Core's boundary.

    The regression is not confined to our stage 1. `dtcc_sim.urban_heat`
    builds its own city through `dtcc_core.datasets.city_volume_mesh` ->
    `prepare_city_from_bounds` -> `build_terrain_raster(ground_only=True)`,
    which is four frames inside the image and cannot be handed a pre-built
    city. Container Core has the same guard, so stage 2 fails in the same place
    for the same reason.

    So we wrap `build_terrain_raster` where `_city_mesh_common` looks it up
    (its module-level `dtcc_core.builder.build_terrain_raster` attribute) and
    repair the dtype on the way in. Returns the original callable so a caller
    can restore it.
    """
    import dtcc_core

    original = dtcc_core.builder.build_terrain_raster

    def build_terrain_raster(pointcloud, *args, **kwargs):
        return original(integer_classification(pointcloud), *args, **kwargs)

    dtcc_core.builder.build_terrain_raster = build_terrain_raster
    return original


# ---------------------------------------------------------------------------
# Section 2 -- PERMANENT (R5): reproducing the face-marker index space
# ---------------------------------------------------------------------------

def conditioning_defaults(max_mesh_size):
    """The conditioning arguments `build_from_city` actually passes, read from Core.

    `CitySurfaceMeshDataset.build_from_city(city, max_mesh_size=...)` fills every
    other conditioning argument from `CitySurfaceMeshArgs` defaults, so those
    are the source of truth rather than literals in this file. We cross-check
    them against `build_city_surface_mesh`'s own signature and raise if the two
    ever disagree, because a silent retune upstream would desynchronize our
    reproduction from the mesh it claims to describe.

    Also asserts `treat_lod0_as_holes` is still False. Core's LOD0-as-holes
    branch (meshes.py:2252-2257) consumes a surface *without* assigning it a
    marker; `marker_source_map` does not reproduce that branch, so if the
    default ever flips, the marker space shifts and every id would be wrong.
    """
    import inspect
    from dtcc_core.builder.geometry_builders.meshes import (
        build_city_surface_mesh, _normalize_max_mesh_size,
    )
    from dtcc_core.datasets.city_surface_mesh import CitySurfaceMeshArgs

    signature = inspect.signature(build_city_surface_mesh).parameters
    values = {}
    for key in _CONDITIONING_KEYS:
        field = CitySurfaceMeshArgs.model_fields.get(key)
        if field is None:
            raise RuntimeError(
                f"CitySurfaceMeshArgs no longer declares {key!r}; the face-marker "
                f"reproduction in core_compat cannot be trusted until it is re-read "
                f"against Core. Refusing to guess.")
        values[key] = field.default
        builder_default = signature[key].default if key in signature else None
        if key in signature and builder_default != field.default:
            raise RuntimeError(
                f"Core disagrees with itself on {key!r}: CitySurfaceMeshArgs says "
                f"{field.default!r}, build_city_surface_mesh says {builder_default!r}. "
                f"Re-read which one the mesh was built with before trusting any id.")

    holes = signature["treat_lod0_as_holes"].default
    if holes is not False:
        raise RuntimeError(
            f"build_city_surface_mesh now defaults treat_lod0_as_holes={holes!r}. "
            f"That branch consumes surfaces without assigning markers, which shifts "
            f"the whole marker space; core_compat.marker_source_map does not "
            f"reproduce it. Refusing to emit building identity.")

    values["max_mesh_size"] = _normalize_max_mesh_size(max_mesh_size)
    return values


def compose_marker_sources(marker_regions, source_map) -> list[list[int]]:
    """Compose marker -> conditioned region -> city.buildings into one map.

    Kept separate from the Core calls that produce `marker_regions` so the
    composition itself is testable without building a city.
    """
    composed = []
    for regions in marker_regions:
        indexes: list[int] = []
        for region in regions:
            if not 0 <= region < len(source_map):
                raise ValueError(
                    f"marker names conditioned region {region}, but only "
                    f"{len(source_map)} regions were conditioned")
            for index in source_map[region]:
                if int(index) not in indexes:
                    indexes.append(int(index))
        composed.append(sorted(indexes))
    return composed


def marker_source_map(city, max_mesh_size) -> tuple[list[list[int]], int]:
    """The real face-marker -> city.buildings map, and the conditioned count.

    `build_city_surface_mesh` keeps this to itself, so we reproduce the three
    stages it runs, in order and with its own argument values:

      1. footprint conditioning -> `source_map` (conditioned region ->
         city.buildings), which merging and `min_building_area` make non-trivial
         (meshes.py:4918);
      2. clipping each conditioned region to the terrain raster bounds, where
         one region can yield several components (meshes.py:2258-2270);
      3. coverage renormalization, which can merge or drop components again and
         reports what it did in `normalized_sources` (meshes.py:2271-2283).

    Only after all three does `marker = len(active_surfaces)` get assigned. On
    the Skansen Kronan tile stages 2 and 3 both turn out to be identity, but
    composing them is the difference between a measured mapping and a lucky one.

    Returns `(marker_sources, conditioned_count)`. `len(marker_sources)` is the
    number of markers that have a conditioned region behind them, which is the
    boundary that separates real regions from the markers
    `_split_ground_mesh_building_components` appends. `conditioned_count` is the
    pre-clip region count and is reported for provenance only -- do NOT use it
    as that boundary; the two coincide only when stages 2 and 3 are identity.
    """
    import dtcc_core
    from shapely.geometry import box
    from shapely.ops import orient

    try:
        from dtcc_core.builder.geometry_builders.meshes import (
            _consume_conditioned_building_regions_with_sources,
            _iter_polygon_components,
            _raster_bounds_tuple,
        )
        conditioner = dtcc_core.builder.build_conditioned_footprints
        # Inside the guard: conditioning_defaults does its own Core imports
        # (build_city_surface_mesh, _normalize_max_mesh_size,
        # CitySurfaceMeshArgs), and those deserve the same named failure.
        defaults = conditioning_defaults(max_mesh_size)
    except (ImportError, AttributeError) as exc:
        raise RuntimeError(
            "dtcc-core's surface-region internals moved, so the face-marker to "
            "building mapping can no longer be reproduced. Re-read "
            "build_city_surface_mesh before trusting any identity in "
            "buildings.mesh.json -- do not fall back to indexing city.buildings "
            f"by marker, which is what ruling R5 exists to prevent. ({exc})"
        ) from exc

    conditioned = conditioner(
        city.buildings,
        lod=None,
        cleaning_diagnostics=True,
        show_footprints=False,
        footprint_cleaning_plot_block=True,
        raise_on_contract_error=False,   # matches _condition_city_meshing_footprints
        **defaults,
    )

    domain = box(*_raster_bounds_tuple(city.terrain.raster))
    clipped_polygons, clipped_markers, clip_to_region = [], [], []
    for region, surface in enumerate(conditioned.surfaces):
        polygon = surface.to_polygon(simplify=0.0)
        if polygon.is_empty:
            continue
        for component in _iter_polygon_components(polygon.intersection(domain)):
            if component.area <= 0.0:
                continue
            clipped_markers.append(len(clip_to_region))
            clipped_polygons.append(orient(component, sign=1.0))
            clip_to_region.append(region)

    _, _, normalized_sources = _consume_conditioned_building_regions_with_sources(
        building_polygons=clipped_polygons,
        building_markers=clipped_markers,
        footprint_diagnostics=conditioned.diagnostics,
        min_building_detail=defaults["min_building_detail"],
        cleaning_diagnostics=True,
        pipeline_mode=defaults["pipeline_mode"],
        allow_boundary_short_edges=True,
    )

    marker_regions = [[clip_to_region[clip] for clip in sources]
                      for sources in normalized_sources]
    return (compose_marker_sources(marker_regions, conditioned.source_map),
            len(conditioned.surfaces))
