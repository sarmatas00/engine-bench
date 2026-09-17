"""Contract tests for the shared scientific artifact bundle.

Runs against the real (Task 1) tile committed at public/data/real/. `generated`
builds the manifest and binary once per test session (dtcc-core datasets.smoke
calls are not free) and every test reads that single result.
"""

import hashlib
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import generate

REAL_DIR = Path(__file__).resolve().parents[3] / "public" / "data" / "real"


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
