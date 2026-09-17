import json
import sys
from datetime import datetime
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
    # int() first: numpy 2 keeps the uint8 dtype through <<, so the shift overflows to 0.
    v = (int(rgb[0, 0, 0]) << 16) | (int(rgb[0, 0, 1]) << 8) | int(rgb[0, 0, 2])
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
    # Exactly the arrays, nothing else: callers iterate this dict expecting numpy arrays.
    assert set(back) == {"positions", "normals", "indices", "temperature"}
    assert np.allclose(back["positions"].reshape(-1, 3), positions)
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


def test_pack_array_bundle_packs_nothing_for_no_arrays():
    blob, specs = benchio.pack_array_bundle([])
    assert blob == b""
    assert specs == []


def test_pack_array_bundle_aligns_every_offset_and_pads_the_tail():
    # 3 uint8s then a uint32 array: the u8 run has to be padded to 4 bytes or the
    # Uint32Array view over the next offset is unaligned and illegal on the JS side.
    blob, specs = benchio.pack_array_bundle([
        ("flags", np.array([1, 2, 3], dtype=np.uint8), "u8", 1),
        ("ids", np.array([7, 8], dtype=np.uint32), "u32", 1),
        ("temps", np.array([1.5, 2.5], dtype=np.float64), "f32", 1),
    ])
    assert [s["name"] for s in specs] == ["flags", "ids", "temps"]
    assert [s["offset"] for s in specs] == [0, 4, 12]
    assert [s["length"] for s in specs] == [3, 2, 2]
    assert len(blob) == 20 and len(blob) % 4 == 0
    assert np.frombuffer(blob[4:12], dtype=np.uint32).tolist() == [7, 8]
    # f32 is the on-disk type: the float64 input is converted, not reinterpreted.
    assert np.allclose(np.frombuffer(blob[12:20], dtype=np.float32), [1.5, 2.5])


def test_pack_array_bundle_rejects_a_duplicate_name():
    with pytest.raises(ValueError, match="duplicate"):
        benchio.pack_array_bundle([
            ("ids", np.zeros(1, dtype=np.uint32), "u32", 1),
            ("ids", np.zeros(1, dtype=np.uint32), "u32", 1),
        ])


def test_pack_array_bundle_rejects_an_unsupported_type():
    with pytest.raises(ValueError, match="f64"):
        benchio.pack_array_bundle([("temps", np.zeros(1), "f64", 1)])


def test_mesh_pair_round_trips_cell_arrays(tmp_path):
    meta = benchio.write_mesh_pair(
        tmp_path, "mesh",
        positions=np.array([[0, 0, 0], [1, 0, 0], [0, 1, 0]], dtype=float),
        normals=np.array([[0, 0, 1]] * 3, dtype=float),
        indices=np.array([[0, 1, 2]], dtype=np.uint32),
        cell_extra={"cell_object_index": (np.array([7]), "u32", 1)},
        metadata={"objects": [{"sourceIndex": 7, "dtccId": "building-7"}]},
    )
    loaded = benchio.read_mesh_pair(tmp_path, "mesh")
    assert loaded["cell_object_index"].tolist() == [7]
    assert meta["objects"] == [{"sourceIndex": 7, "dtccId": "building-7"}]


def test_write_mesh_pair_validates_cell_extras_against_the_triangle_count(tmp_path):
    # One value per *triangle*, not per vertex: a cell array sized like the vertices
    # would still pack, and every triangle would then be attributed to the wrong object.
    with pytest.raises(ValueError, match="1 triangles"):
        benchio.write_mesh_pair(
            tmp_path, "mesh",
            positions=np.zeros((3, 3)), normals=np.zeros((3, 3)),
            indices=np.array([[0, 1, 2]]),
            cell_extra={"cell_object_index": (np.array([1, 2, 3]), "u32", 1)},
        )


def test_write_mesh_pair_rejects_metadata_that_would_overwrite_the_format(tmp_path):
    with pytest.raises(ValueError, match="byteLength"):
        benchio.write_mesh_pair(
            tmp_path, "mesh",
            positions=np.zeros((3, 3)), normals=np.zeros((3, 3)),
            indices=np.array([[0, 1, 2]]),
            metadata={"byteLength": 0},
        )


def test_identity_audit_reports_stable_when_two_loads_agree():
    mapping = {0: "a-uuid", 1: "b-uuid"}
    audit = benchio.audit_identity_stability(mapping, dict(mapping))
    assert audit["identityStability"] == "stable_observed_two_loads"
    assert audit["firstLoadHash"] == audit["secondLoadHash"]
    assert datetime.fromisoformat(audit["auditedAt"]).tzinfo is not None


def test_identity_audit_reports_unstable_and_keeps_both_hashes():
    # Same buildings, freshly minted UUIDs: the geometry is identical and only the
    # identity drifted, so both hashes have to survive as the evidence for that.
    audit = benchio.audit_identity_stability({0: "a-uuid", 1: "b-uuid"},
                                             {0: "a-uuid", 1: "DIFFERENT"})
    assert audit["identityStability"] == "unstable_observed"
    assert audit["firstLoadHash"] != audit["secondLoadHash"]
    assert audit["firstLoadHash"] and audit["secondLoadHash"]


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


def test_distribution_revision_resolves_the_editable_dtcc_core_install():
    # dtcc-core is installed editable from ../dtcc-core in the native venv, with no
    # __version__ attribute on the pinned build — this is the case a naive
    # getattr(dtcc_core, "__version__", "unknown") would silently misreport.
    # Don't assert a specific commit: the local ../dtcc-core clone moves.
    revision = benchio.distribution_revision("dtcc-core")
    assert revision not in ("unknown", "not installed")
    assert len(revision) >= 7  # a git hash (short or full), not a placeholder


def test_distribution_revision_reports_a_package_that_is_not_installed():
    assert benchio.distribution_revision("this-package-does-not-exist-12345") == "not installed"
