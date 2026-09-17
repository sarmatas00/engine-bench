"""Contract tests for the shared scientific artifact bundle.

Runs against the real (Task 1) tile committed at public/data/real/. `generated`
builds the manifest and binary once per test session (dtcc-core datasets.smoke
calls are not free) and every test reads that single result.
"""

import hashlib
import json
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import generate

REAL_DIR = Path(__file__).resolve().parents[3] / "public" / "data" / "real"
OUT_DIR = Path(__file__).resolve().parents[3] / "public" / "data" / "scientific"


@pytest.fixture(scope="session")
def generated():
    return generate.generate(REAL_DIR)


def test_manifest_contract(generated):
    manifest, blob = generated
    assert manifest["schemaVersion"] == 1
    assert manifest["coordinateFrame"]["crs"] == "EPSG:3006"
    assert manifest["cases"]["smoke"]["dataCategory"] == "synthetic"
    assert manifest["cases"]["heat"]["dataCategory"] == "simulation"
    assert manifest["fields"]["speed"]["unit"] == "m/s"
    assert manifest["fields"]["pressure"]["unit"] == "Pa"
    assert manifest["fields"]["temperature"]["unit"] == "degC"
    assert manifest["binary"]["byteLength"] == len(blob)
    assert hashlib.sha256(blob).hexdigest() == manifest["binary"]["sha256"]
    assert {item["path"] for item in manifest["dependencies"]} == {
        "../real/dataset.json",
        "../real/ground.mesh.json", "../real/ground.mesh.bin",
        "../real/buildings.mesh.json", "../real/buildings.mesh.bin",
        "../real/field.json", "../real/field.grid.json", "../real/field.grid.f32",
    }
    assert all(item["byteLength"] > 0 and len(item["sha256"]) == 64
               for item in manifest["dependencies"])


def _array_slice(blob, spec):
    dtype = {"f32": np.float32, "u32": np.uint32, "u8": np.uint8}[spec["type"]]
    itemsize = np.dtype(dtype).itemsize
    length = spec["length"]
    raw = blob[spec["offset"]: spec["offset"] + length * itemsize]
    return np.frombuffer(raw, dtype=dtype)


def _arrays_by_name(case):
    return {a["name"]: a for a in case["arrays"]}


def test_every_array_is_four_byte_aligned_and_in_range(generated):
    manifest, blob = generated
    for case_name in ("grid", "slice", "streamlines"):
        case = manifest["cases"]["smoke"][case_name]
        for spec in case["arrays"]:
            assert spec["offset"] % 4 == 0, spec
            itemsize = {"f32": 4, "u32": 4, "u8": 1}[spec["type"]]
            end = spec["offset"] + spec["length"] * itemsize
            assert 0 <= spec["offset"] and end <= len(blob), spec


def test_grid_values_are_finite_and_resolution_cubed(generated):
    manifest, blob = generated
    grid = manifest["cases"]["smoke"]["grid"]
    resolution = grid["resolution"]
    arrays = _arrays_by_name(grid)
    speed = _array_slice(blob, arrays["grid_speed"])
    pressure = _array_slice(blob, arrays["grid_pressure"])
    velocity = _array_slice(blob, arrays["grid_velocity"])
    assert speed.size == resolution ** 3
    assert pressure.size == resolution ** 3
    assert velocity.size == resolution ** 3 * 3
    assert np.all(np.isfinite(speed))
    assert np.all(np.isfinite(pressure))
    assert np.all(np.isfinite(velocity))
    assert grid["association"] == "vertex"


def test_slice_values_are_finite_and_resolution_squared(generated):
    manifest, blob = generated
    slice_case = manifest["cases"]["smoke"]["slice"]
    resolution = slice_case["resolution"]
    arrays = _arrays_by_name(slice_case)
    speed = _array_slice(blob, arrays["slice_speed"])
    pressure = _array_slice(blob, arrays["slice_pressure"])
    velocity = _array_slice(blob, arrays["slice_velocity"])
    assert speed.size == resolution ** 2
    assert pressure.size == resolution ** 2
    assert velocity.size == resolution ** 2 * 3
    assert np.all(np.isfinite(speed))
    assert np.all(np.isfinite(pressure))
    assert np.all(np.isfinite(velocity))


def test_streamline_offsets_are_monotonic_and_values_finite(generated):
    manifest, blob = generated
    lines = manifest["cases"]["smoke"]["streamlines"]
    offsets = lines["vertexOffsets"]
    assert offsets[0] == 0
    assert all(b > a for a, b in zip(offsets, offsets[1:]))
    assert lines["actualCount"] == len(offsets) - 1
    arrays = _arrays_by_name(lines)
    positions = _array_slice(blob, arrays["streamline_positions"])
    velocity = _array_slice(blob, arrays["streamline_velocity"])
    speed = _array_slice(blob, arrays["streamline_speed"])
    pressure = _array_slice(blob, arrays["streamline_pressure"])
    total_vertices = offsets[-1]
    assert positions.size == total_vertices * 3
    assert velocity.size == total_vertices * 3
    assert speed.size == total_vertices
    assert pressure.size == total_vertices
    assert np.all(np.isfinite(positions))
    assert np.all(np.isfinite(velocity))
    assert np.all(np.isfinite(speed))
    assert np.all(np.isfinite(pressure))


def test_local_positions_are_inside_the_city_frame(generated):
    manifest, blob = generated
    frame = manifest["coordinateFrame"]
    xmin, ymin, zmin, xmax, ymax, zmax = frame["localBounds"]
    tol = 1e-6 * max(xmax - xmin, ymax - ymin, zmax - zmin, 1.0)

    lines = manifest["cases"]["smoke"]["streamlines"]
    arrays = _arrays_by_name(lines)
    positions = _array_slice(blob, arrays["streamline_positions"]).reshape(-1, 3)
    assert np.all(positions[:, 0] >= xmin - tol) and np.all(positions[:, 0] <= xmax + tol)
    assert np.all(positions[:, 1] >= ymin - tol) and np.all(positions[:, 1] <= ymax + tol)
    assert np.all(positions[:, 2] >= zmin - tol) and np.all(positions[:, 2] <= zmax + tol)

    slice_case = manifest["cases"]["smoke"]["slice"]
    fixed = slice_case["fixedLocalCoordinate"]
    assert zmin - tol <= fixed <= zmax + tol


def test_grid_association_taken_from_core_not_asserted(generated):
    # Global Constraint: take association from Core's Field.association, never assert
    # it independently. Measured on 4c8d621: the VolumeMesh ("field"/grid) product sets
    # association="vertex" for velocity/speed/pressure, but FieldSlice and
    # StreamlineCollection (native-exchange-unsupported per the plan) leave it None.
    # Generation must fail only on an explicit empty string, never fabricate a value,
    # and must not silently accept a missing association on the one product Core does
    # populate (the grid/field case).
    manifest, blob = generated
    assert manifest["cases"]["smoke"]["grid"]["association"] == "vertex"
    assert manifest["cases"]["smoke"]["slice"]["association"] is None
    assert manifest["cases"]["smoke"]["streamlines"]["association"] is None


def test_generation_fails_on_an_explicit_empty_association(monkeypatch):
    import dtcc_core.model as model

    original_init = model.Field.__init__

    def patched_init(self, *args, **kwargs):
        original_init(self, *args, **kwargs)
        if self.name == "velocity":
            self.association = ""

    monkeypatch.setattr(model.Field, "__init__", patched_init)
    with pytest.raises(ValueError):
        generate.generate(REAL_DIR)


@dataclass
class _FakeField:
    name: str
    association: object


def _fake_map(*associations):
    names = ("velocity", "speed", "pressure")
    return {name: _FakeField(name, assoc) for name, assoc in zip(names, associations)}


def test_resolve_association_allows_none_when_not_required():
    # Regression for review finding #7: the empty-string check must be exercised
    # directly for the require_present=False path (smoke.slice / smoke.streamlines),
    # not only indirectly through the grid product, which returns before those
    # call sites run once it raises.
    fmap = _fake_map(None, None, None)
    assert generate._resolve_association(fmap, ("velocity", "speed", "pressure"),
                                         case="smoke.slice", require_present=False) is None


def test_resolve_association_rejects_empty_string_when_not_required():
    fmap = _fake_map("", None, None)
    with pytest.raises(ValueError, match="empty-string"):
        generate._resolve_association(fmap, ("velocity", "speed", "pressure"),
                                       case="smoke.streamlines", require_present=False)


def test_resolve_association_rejects_disagreement():
    fmap = _fake_map("vertex", "cell", "vertex")
    with pytest.raises(ValueError, match="disagree"):
        generate._resolve_association(fmap, ("velocity", "speed", "pressure"),
                                       case="smoke.grid", require_present=True)


def test_streamline_seed_indices_are_recorded_and_verified(generated):
    # Review finding #1: Core exposes no public seed accessor on
    # StreamlineCollection. generate._resolve_streamline_seeds recovers each
    # line's seed index and verifies it against the actual polyline before
    # returning it (raises rather than guesses on a mismatch) -- this test
    # checks the manifest carries the result and every index is in range.
    manifest, blob = generated
    lines = manifest["cases"]["smoke"]["streamlines"]
    offsets = lines["vertexOffsets"]
    seed_indices = lines["seedIndices"]
    assert len(seed_indices) == lines["actualCount"]
    for i, seed_index in enumerate(seed_indices):
        line_length = offsets[i + 1] - offsets[i]
        assert 0 <= seed_index < line_length


def test_slice_and_streamlines_carry_full_unsupported_exchange_context(generated):
    # Global Constraint: FieldSlice/StreamlineCollection are unsupported by Core
    # native exchange, so the manifest must carry their full context (domain,
    # metadata, crs, name), not only their arrays (review finding #4).
    manifest, blob = generated
    slice_case = manifest["cases"]["smoke"]["slice"]
    for key in ("name", "crs", "metadata", "domainLocalBounds"):
        assert key in slice_case, key
    assert slice_case["crs"] == manifest["coordinateFrame"]["crs"]

    streamlines = manifest["cases"]["smoke"]["streamlines"]
    for key in ("name", "crs", "metadata", "domainLocalBounds"):
        assert key in streamlines, key
    assert streamlines["crs"] == manifest["coordinateFrame"]["crs"]


def test_resolutions_and_counts_are_read_from_core_not_the_request(generated):
    # Review finding #3: slice.resolution and streamlines.requestedCount must
    # come from Core's own reply (slice_.resolution, lines.requested_line_count),
    # not echo the constants generate.py sent, even though they agree today.
    manifest, blob = generated
    assert manifest["cases"]["smoke"]["slice"]["resolution"] == generate.RESOLUTION
    assert manifest["cases"]["smoke"]["streamlines"]["requestedCount"] == generate.STREAMLINE_COUNT


def test_heat_case_has_an_explicit_null_association(generated):
    # Review finding #10: state the fact explicitly rather than omitting the key.
    manifest, blob = generated
    assert "association" in manifest["cases"]["heat"]
    assert manifest["cases"]["heat"]["association"] is None


def test_heat_case_names_which_sampling_each_range_describes(generated):
    # Task 3 review round 1, finding #8: cases.heat used to carry the ground-mesh
    # surface field's tmin/tmax under bare, unlabelled names in a block that
    # otherwise describes the grid. The volume grid and the surface field are two
    # different samplings of the same solve with two different ranges (grid maxes
    # at 32.26 degC, surface at 18.76) -- an unlabelled tmax here is exactly the
    # kind of ambiguous-provenance contract this spike exists to catch, so pin
    # the renamed keys rather than letting a future edit reintroduce them quietly.
    manifest, blob = generated
    heat = manifest["cases"]["heat"]
    assert {"surfaceTmin", "surfaceTmax", "surfaceSampling", "gridRangeSource"} <= heat.keys()
    assert "tmin" not in heat and "tmax" not in heat
    heat_meta = json.loads((REAL_DIR / "field.json").read_text())
    assert heat["surfaceTmin"] == heat_meta["tmin"]
    assert heat["surfaceTmax"] == heat_meta["tmax"]
    assert heat["surfaceSampling"] == "ground mesh (public/data/real/field.json)"
    assert heat["gridRangeSource"] == "public/data/real/field.grid.json"


def test_temperature_dim_is_derived_not_hardcoded(generated):
    # Review finding #2: derive from field.grid.f32 / field.grid.json rather
    # than assuming scalar.
    manifest, blob = generated
    grid_meta = json.loads((REAL_DIR / "field.grid.json").read_text())
    node_count = 1
    for d in grid_meta["dims"]:
        node_count *= d
    grid_bytes = (REAL_DIR / "field.grid.f32").stat().st_size
    expected_dim = (grid_bytes // 4) // node_count
    assert manifest["fields"]["temperature"]["dim"] == expected_dim


def test_resolve_temperature_dim_rejects_a_roundtrip_count_mismatch(tmp_path):
    grid_meta = {"dims": [2, 2, 2]}
    (tmp_path / "field.grid.json").write_text(json.dumps(grid_meta))
    (tmp_path / "field.grid.f32").write_bytes(bytes(4 * 8))  # 8 nodes, 1 component
    heat_meta = {"roundtrip": {"count_after": 8, "vertices_after": 9}}
    with pytest.raises(ValueError, match="roundtrip"):
        generate._resolve_temperature_dim(tmp_path, heat_meta)


def test_resolve_temperature_dim_rejects_a_non_integral_component_count(tmp_path):
    grid_meta = {"dims": [2, 2, 3]}  # 12 nodes
    (tmp_path / "field.grid.json").write_text(json.dumps(grid_meta))
    (tmp_path / "field.grid.f32").write_bytes(bytes(4 * 10))  # 10 floats over 12 nodes
    with pytest.raises(ValueError, match="whole component count"):
        generate._resolve_temperature_dim(tmp_path, {})


def test_reject_markup_passes_plain_values_and_rejects_markup():
    assert generate._reject_markup("degC", context="test") == "degC"
    assert generate._reject_markup(None, context="test") is None
    with pytest.raises(ValueError, match="markup"):
        generate._reject_markup("<script>alert(1)</script>", context="test")


def test_committed_bundle_matches_the_generator(generated):
    # Review finding #5: nothing previously compared a freshly generated
    # manifest/blob against what is actually committed, so editing generate.py
    # without re-running it left every other test green while the two diverged.
    manifest, blob = generated
    committed_manifest = (OUT_DIR / "scientific-manifest.json").read_bytes()
    committed_blob = (OUT_DIR / "scientific.bin").read_bytes()
    assert generate.manifest_bytes(manifest) == committed_manifest, (
        "public/data/scientific/scientific-manifest.json is stale -- "
        "re-run: .venv/bin/python scripts/scientific/generate.py"
    )
    assert blob == committed_blob, (
        "public/data/scientific/scientific.bin is stale -- "
        "re-run: .venv/bin/python scripts/scientific/generate.py"
    )


def test_seed_recovery_fails_loudly_when_cores_seed_placement_moves(monkeypatch):
    """A renamed Core private must not degrade into a plausible wrong seed.

    `_resolve_streamline_seeds` reaches into dtcc-core's private
    `_streamline_seeds`. If that moves, the failure has to name what stopped
    being trustworthy -- the same contract scripts/real/core_compat.py holds for
    the face-marker reproduction. A bare ImportError from inside
    dtcc_core.datasets.smoke would not tell the next reader that falling back to
    a polyline's first or middle vertex is wrong, which it is: integration runs
    backward and forward from the seed and stops early at the domain boundary.
    """
    # `import dtcc_core.datasets.smoke as m` does NOT give the module: Core
    # shadows the module name with a SmokeDataset instance so `datasets.smoke(...)`
    # is callable. `from ... import name` still resolves through sys.modules, so
    # that is what has to be patched here.
    import sys

    monkeypatch.delattr(sys.modules["dtcc_core.datasets.smoke"], "_streamline_seeds")
    with pytest.raises(RuntimeError, match=r"seed placement moved"):
        generate._resolve_streamline_seeds(
            datasets=None, lines=None, position_parts=[], origin=[0.0, 0.0], z0=0.0)
