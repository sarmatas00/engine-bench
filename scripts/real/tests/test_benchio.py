import json
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import benchio


def test_terrain_rgb_round_trip_is_within_half_a_decimetre():
    heights = np.array([[0.0, 5.25, 41.7], [100.0, 0.05, 12.34]])
    rgb = benchio.encode_terrain_rgb(heights)
    assert rgb.shape == (2, 3, 3)
    assert rgb.dtype == np.uint8
    back = benchio.decode_terrain_rgb(rgb)
    assert np.all(np.abs(back - heights) <= 0.05)


def test_terrain_rgb_matches_the_mapbox_formula_at_zero():
    rgb = benchio.encode_terrain_rgb(np.zeros((1, 1)))
    v = (rgb[0, 0, 0] << 16) | (rgb[0, 0, 1] << 8) | rgb[0, 0, 2]
    assert v == 100000  # (0 + 10000) / 0.1


def test_basemap_draws_a_contour_line_and_a_high_ground_tint():
    # The contour rule fires when the height is within 0.4 m of a 10 m multiple,
    # i.e. |((e % 10) + 10) % 10 - 5| > 4.6.
    heights = np.array([[3.0, 0.0, 63.0]])
    rgb = benchio.basemap_rgb(heights)
    assert tuple(rgb[0, 0]) == (235, 235, 230)   # 3 m: flat ground, off-contour
    assert tuple(rgb[0, 1]) == (175, 175, 170)   # 0 m: on a 10 m contour, -60
    assert tuple(rgb[0, 2]) == (215, 205, 190)   # 63 m: high-ground tint, off-contour


def test_write_and_read_mesh_pair_round_trips_every_array(tmp_path):
    positions = np.array([[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 2]], dtype=np.float64)
    normals = np.tile(np.array([0.0, 0.0, 1.0]), (4, 1))
    indices = np.array([[0, 1, 2], [1, 3, 2]], dtype=np.int64)
    temperature = np.array([18.0, 21.5, 24.0, 32.0])
    meta = benchio.write_mesh_pair(
        tmp_path, "field",
        positions=positions, normals=normals, indices=indices,
        extra={"temperature": (temperature, "f32", 1)},
    )
    assert meta["vertexCount"] == 4
    assert meta["indexCount"] == 6
    assert [a["name"] for a in meta["arrays"]] == ["positions", "normals", "indices", "temperature"]
    assert all(a["offset"] % 4 == 0 for a in meta["arrays"])
    on_disk = json.loads((tmp_path / "field.mesh.json").read_text())
    assert on_disk == meta
    assert (tmp_path / "field.mesh.bin").stat().st_size == meta["byteLength"]

    back = benchio.read_mesh_pair(tmp_path, "field")
    assert np.allclose(back["positions"], positions)
    assert np.array_equal(back["indices"], indices.reshape(-1))
    assert np.allclose(back["temperature"], temperature, atol=1e-6)


def test_uint8_extra_is_padded_to_a_four_byte_boundary(tmp_path):
    positions = np.zeros((3, 3))
    normals = np.zeros((3, 3))
    indices = np.array([0, 1, 2], dtype=np.int64)
    colors = np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]], dtype=np.uint8)  # 9 bytes
    meta = benchio.write_mesh_pair(
        tmp_path, "baked",
        positions=positions, normals=normals, indices=indices,
        extra={"colors": (colors, "u8", 3)},
    )
    assert meta["byteLength"] % 4 == 0
    back = benchio.read_mesh_pair(tmp_path, "baked")
    assert np.array_equal(back["colors"].reshape(3, 3), colors)


def test_patch_dataset_json_merges_without_dropping_keys(tmp_path):
    (tmp_path / "dataset.json").write_text(json.dumps({"name": "t", "stages": {"stage1": "x", "stage2": None}}))
    out = benchio.patch_dataset_json(tmp_path, stages={"stage1": "x", "stage2": "y"}, z0=3.0)
    assert out["name"] == "t"
    assert out["stages"]["stage2"] == "y"
    assert out["z0"] == 3.0
    assert benchio.load_dataset_json(tmp_path) == out


def test_read_mesh_pair_rejects_a_truncated_binary(tmp_path):
    positions = np.zeros((3, 3)); normals = np.zeros((3, 3))
    indices = np.array([0, 1, 2], dtype=np.int64)
    benchio.write_mesh_pair(tmp_path, "t", positions=positions, normals=normals, indices=indices)
    (tmp_path / "t.mesh.bin").write_bytes(b"short")
    with pytest.raises(ValueError, match="byteLength"):
        benchio.read_mesh_pair(tmp_path, "t")
