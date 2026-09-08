import sys
from pathlib import Path

import numpy as np

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


def test_submesh_computes_area_weighted_vertex_normals():
    v = np.array([[0.0, 0, 0], [1, 0, 0], [0, 1, 0]])
    mesh = Mesh(vertices=v, faces=np.array([[0, 1, 2]]), markers=np.array([-2]))
    sub = stage1_build.submesh(mesh, np.array([True]), origin=[0.0, 0.0], z0=0.0)
    assert np.allclose(sub["normals"], np.array([0.0, 0.0, 1.0]))
