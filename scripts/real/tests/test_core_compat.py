"""Tests for the dtcc-core coupling layer.

Section 1 (integer_classification) is the temporary R6 workaround; section 2
(compose_marker_sources, conditioning_defaults) is the permanent R5 face-marker
reproduction. Both are the code most likely to break on a Core upgrade, so they
carry the most explicit tests in the pipeline.
"""

import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import core_compat


def test_integer_classification_casts_an_integral_float_array_to_uint8():
    """dtcc-core 4c8d621 cannot build the tile without this cast (ledger R6).

    PointCloud.classification defaults to np.empty(0), which is float64, and
    io.load_pointcloud's list path merges the loader's uint8 into that float64
    seed. Post-#85 build_terrain_raster then rejects the non-integer dtype
    (terrain.py:321-323). The values are already whole numbers; only the dtype
    is wrong.
    """
    from dtcc_core.model import PointCloud

    pc = PointCloud(points=np.zeros((3, 3)),
                    classification=np.array([1.0, 2.0, 7.0], dtype=np.float64))
    fixed = core_compat.integer_classification(pc)

    assert fixed.classification.dtype.kind in "iu"
    assert fixed.classification.tolist() == [1, 2, 7]
    assert len(fixed.points) == 3


def test_integer_classification_leaves_an_already_integer_array_alone():
    from dtcc_core.model import PointCloud

    original = np.array([1, 2, 7], dtype=np.uint8)
    pc = PointCloud(points=np.zeros((3, 3)), classification=original)
    fixed = core_compat.integer_classification(pc)

    assert fixed.classification.dtype == np.uint8
    assert fixed.classification.tolist() == [1, 2, 7]


def test_integer_classification_refuses_to_round_a_non_integral_value():
    """Rounding here would silently reclassify a point. Fail loudly instead."""
    from dtcc_core.model import PointCloud

    pc = PointCloud(points=np.zeros((2, 3)),
                    classification=np.array([1.0, 2.5], dtype=np.float64))
    with pytest.raises(ValueError, match=r"not integral \(e\.g\. 2\.5\)"):
        core_compat.integer_classification(pc)


def test_integer_classification_refuses_a_length_mismatch():
    from dtcc_core.model import PointCloud

    pc = PointCloud(points=np.zeros((3, 3)),
                    classification=np.array([1.0, 2.0], dtype=np.float64))
    with pytest.raises(ValueError, match=r"3 points but 2 classifications"):
        core_compat.integer_classification(pc)


def test_compose_marker_sources_walks_the_whole_chain():
    """marker -> conditioned region -> city.buildings, not marker -> city.buildings.

    Between the conditioned regions and the face markers Core clips each region
    to the raster bounds and then renormalizes the coverage
    (meshes.py:2258-2283). Both layers are identity on the Skansen Kronan tile,
    but neither is guaranteed to be, so the composition is done rather than
    assumed.
    """
    # marker 0 <- region 1; marker 1 <- regions 0 and 2 (a renormalization merge)
    marker_regions = [[1], [0, 2]]
    source_map = [[0], [1, 2], [3]]
    assert core_compat.compose_marker_sources(marker_regions, source_map) == [
        [1, 2], [0, 3],
    ]


def test_compose_marker_sources_deduplicates_a_repeated_source_building():
    marker_regions = [[0, 1]]
    source_map = [[4], [4]]
    assert core_compat.compose_marker_sources(marker_regions, source_map) == [[4]]


def test_compose_marker_sources_rejects_a_region_outside_the_conditioned_set():
    with pytest.raises(ValueError, match=r"conditioned region 9, but only 1 regions"):
        core_compat.compose_marker_sources([[9]], [[0]])


def test_conditioning_defaults_are_read_from_core_not_hard_coded():
    """These pin the marker space. A silent upstream retune must fail loudly.

    `build_from_city` passes only max_mesh_size and fills the rest from
    CitySurfaceMeshArgs, so those defaults are what the shipped mesh was built
    with. If Core ever retunes one, the reproduction would describe a different
    mesh than the one on disk and every DTCC id could be wrong.
    """
    defaults = core_compat.conditioning_defaults(10.0)
    assert defaults == {
        "min_building_detail": 0.5,
        "min_building_area": 15.0,
        "merge_tolerance": 0.5,
        "merge_buildings": True,
        "pipeline_mode": "strict",
        "max_mesh_size": 10.0,
    }


def test_conditioning_defaults_normalizes_max_mesh_size_the_way_core_does():
    # Core maps a non-positive max_mesh_size to None before conditioning
    # (_normalize_max_mesh_size), so the reproduction must too.
    assert core_compat.conditioning_defaults(0.0)["max_mesh_size"] is None
    assert core_compat.conditioning_defaults(25.0)["max_mesh_size"] == 25.0
