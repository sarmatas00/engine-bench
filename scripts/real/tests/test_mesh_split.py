import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import stage1_build
from dtcc_core.model import Mesh


def two_block_mesh():
    """Two flat quads at z = 100 and z = 130, plus one ground quad at z = 90.

    markers: -2 ground, 0 building zero, 1 building one.
    """
    v = []
    f = []
    markers = []
    for i, (x0, z) in enumerate([(0.0, 90.0), (10.0, 100.0), (20.0, 130.0)]):
        base = len(v)
        v += [[x0, 0.0, z], [x0 + 5, 0.0, z], [x0 + 5, 5.0, z], [x0, 5.0, z]]
        f += [[base, base + 1, base + 2], [base, base + 2, base + 3]]
        markers += [-2 if i == 0 else i - 1] * 2
    return Mesh(vertices=np.array(v), faces=np.array(f), markers=np.array(markers))


def test_split_surface_mesh_sorts_by_marker_sign():
    mesh = two_block_mesh()
    ground, buildings = stage1_build.split_surface_mesh(mesh)
    assert ground.sum() == 2
    assert buildings.sum() == 4
    assert not (ground & buildings).any()


def test_submesh_compacts_vertices_and_moves_into_the_local_frame():
    mesh = two_block_mesh()
    ground, _ = stage1_build.split_surface_mesh(mesh)
    sub = stage1_build.submesh(mesh, ground, origin=[2.5, 2.5], z0=90.0)
    assert sub["positions"].shape == (4, 3)          # only the ground quad's vertices survive
    assert sub["indices"].shape == (2, 3)
    assert int(sub["indices"].max()) == 3
    assert np.allclose(sub["positions"][:, 2], 0.0)  # z0 subtracted
    assert np.allclose(sub["positions"][:, 0].min(), -2.5)
    assert np.allclose(sub["normals"], np.array([0.0, 0.0, 1.0]))


def test_flatten_buildings_rebases_each_building_on_its_own_minimum():
    mesh = two_block_mesh()
    _, buildings = stage1_build.split_surface_mesh(mesh)
    sub = stage1_build.submesh(mesh, buildings, origin=[0.0, 0.0], z0=90.0)
    flat = stage1_build.flatten_buildings(sub)
    assert np.allclose(flat["positions"][:, 2], 0.0)         # both blocks land on zero
    assert np.allclose(flat["positions"][:, :2], sub["positions"][:, :2])
    assert np.array_equal(flat["indices"], sub["indices"])
    assert not np.allclose(sub["positions"][:, 2], 0.0)      # the source is untouched


def _edge_lengths(positions, indices):
    return np.linalg.norm(positions[indices[:, 0]] - positions[indices[:, 1]], axis=1)


def test_flatten_buildings_translates_welded_neighbours_without_deforming_them():
    """Two buildings at different heights sharing a wall vertex.

    Grouping by face marker would subtract twice at the shared vertex and stretch
    the mesh. Grouping by connected component moves the welded pair as one unit,
    so every edge keeps its length -- the invariant a translation cannot break.
    """
    positions = np.array([
        [0.0, 0, 10], [1, 0, 10], [0, 1, 10], [1, 1, 10],   # low block, base 10
        [1.0, 0, 30], [2, 0, 30], [2, 1, 30],                # tall block, base 30
    ])
    indices = np.array([[0, 1, 2], [1, 3, 2], [1, 4, 5], [1, 5, 6]])  # vertex 1 is shared
    sub = {"positions": positions, "normals": np.zeros_like(positions), "indices": indices}
    flat = stage1_build.flatten_buildings(sub)

    assert np.allclose(_edge_lengths(flat["positions"], indices),
                       _edge_lengths(positions, indices))
    assert flat["positions"][:, 2].min() == 0.0
    assert (flat["positions"][:, 2] >= 0.0).all()
    # One welded unit, so the pair keeps its 20 m step rather than both landing on zero.
    assert np.allclose(flat["positions"][:, 2].max(), 20.0)


def test_flatten_buildings_lands_every_separate_building_on_zero():
    """Disconnected buildings each get their own base."""
    positions = np.array([
        [0.0, 0, 10], [1, 0, 10], [0, 1, 10],
        [5.0, 0, 30], [6, 0, 30], [5, 1, 30],
    ])
    indices = np.array([[0, 1, 2], [3, 4, 5]])
    sub = {"positions": positions, "normals": np.zeros_like(positions), "indices": indices}
    flat = stage1_build.flatten_buildings(sub)
    assert np.allclose(flat["positions"][:, 2], 0.0)


def test_building_height_resolves_the_pair_the_way_core_does():
    """At dtcc-core 4c8d621 `Building.height` is an alias for `measured_height`.

    This pipeline's heights are computed from the point cloud, and Core stores
    those as `estimated_height`, so `building.height` is None for a downloaded
    tile and the old `float(building.height)` raises. Core resolves the pair in
    builder/model_conversion.py as "the estimate wins, the measurement is the
    fallback", and the extruded mesh is built from the estimate -- so the
    footprint height has to agree with the geometry beside it.
    """
    from dtcc_core.model import Building

    assert stage1_build.building_height(
        Building(id="b", attributes={"estimated_height": 8.0})) == 8.0
    assert stage1_build.building_height(
        Building(id="b", attributes={"measured_height": 12.5})) == 12.5
    both = Building(id="b", attributes={"estimated_height": 8.0, "measured_height": 12.5})
    assert stage1_build.building_height(both) == 8.0
    assert stage1_build.building_height(Building(id="b")) is None


def test_submesh_returns_the_selected_face_values_in_triangle_order():
    """The face values have to line up with the compacted triangles one for one.

    `submesh` reorders nothing, so selecting the marker array with the same mask
    that selected the faces is what makes triangle k of the output describe the
    same source object as marker k. A reordering here would silently attribute
    every triangle to the wrong building.
    """
    mesh = two_block_mesh()
    _, buildings = stage1_build.split_surface_mesh(mesh)
    markers = np.asarray(mesh.markers).reshape(-1)
    sub = stage1_build.submesh(mesh, buildings, origin=[0.0, 0.0], z0=90.0,
                               face_values=markers)
    assert sub["face_values"].tolist() == [0, 0, 1, 1]
    assert len(sub["face_values"]) == len(sub["indices"])


def test_submesh_omits_face_values_when_none_are_asked_for():
    mesh = two_block_mesh()
    ground, _ = stage1_build.split_surface_mesh(mesh)
    assert "face_values" not in stage1_build.submesh(mesh, ground, origin=[0.0, 0.0], z0=90.0)


def test_submesh_computes_area_weighted_vertex_normals():
    v = np.array([[0.0, 0, 0], [1, 0, 0], [0, 1, 0]])
    mesh = Mesh(vertices=v, faces=np.array([[0, 1, 2]]), markers=np.array([-2]))
    sub = stage1_build.submesh(mesh, np.array([True]), origin=[0.0, 0.0], z0=0.0)
    assert np.allclose(sub["normals"], np.array([0.0, 0.0, 1.0]))


def test_building_objects_fans_out_a_merged_region_to_every_source_building():
    """A surface face marker indexes a *conditioned region*, not city.buildings.

    With merge_buildings=True (the default this pipeline gets) Core merges
    adjacent footprints before meshing, so one region can stand for several
    source buildings. Ruling R5 says we publish that fan-out honestly rather
    than picking one of them and stamping its UUID on the whole region.
    """
    from dtcc_core.model import Building

    buildings = [Building(id="uuid-a"), Building(id="uuid-b"), Building(id="uuid-c")]
    source_map = [[0], [1, 2]]          # region 1 merged buildings 1 and 2
    objects = stage1_build.building_objects(source_map, buildings, marker_count=2)

    assert objects == [
        {"sourceIndexes": [0], "dtccIds": ["uuid-a"]},
        {"sourceIndexes": [1, 2], "dtccIds": ["uuid-b", "uuid-c"]},
    ]


def test_building_objects_records_split_added_markers_as_empty():
    """_split_ground_mesh_building_components can append markers past the region count.

    Those markers have no conditioned region behind them and therefore no source
    building. An empty entry says exactly that; inventing an ID for them is the
    fabrication R5 exists to prevent.
    """
    from dtcc_core.model import Building

    buildings = [Building(id="uuid-a")]
    objects = stage1_build.building_objects([[0]], buildings, marker_count=3)

    assert objects[0] == {"sourceIndexes": [0], "dtccIds": ["uuid-a"]}
    assert objects[1] == {"sourceIndexes": [], "dtccIds": []}
    assert objects[2] == {"sourceIndexes": [], "dtccIds": []}


def test_building_objects_rejects_a_source_index_outside_the_building_list():
    from dtcc_core.model import Building

    with pytest.raises(ValueError, match=r"marker 1 names source building 7"):
        stage1_build.building_objects([[0], [7]], [Building(id="uuid-a")], marker_count=2)


def test_identity_mapping_pairs_each_source_index_with_its_dtcc_id():
    """The two-load audit compares these mappings, so it must be a plain observation."""
    from dtcc_core.model import Building

    class FakeCity:
        buildings = [Building(id="uuid-a"), Building(id="uuid-b")]

    assert stage1_build.identity_mapping(FakeCity()) == {0: "uuid-a", 1: "uuid-b"}


def test_building_objects_refuses_to_truncate_a_drifted_marker_space():
    """More reproduced markers than the mesh carries means our map drifted.

    Truncating would silently relabel real regions as split-added, or shift the
    index space, attributing wrong DTCC ids to triangles. That is the exact
    invisible failure R5 exists to prevent, so it raises instead.
    """
    from dtcc_core.model import Building

    with pytest.raises(RuntimeError, match=r"reproduced 3 region markers .* only 2"):
        stage1_build.building_objects(
            [[0], [0], [0]], [Building(id="uuid-a")], marker_count=2)
