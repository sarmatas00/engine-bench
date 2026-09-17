"""Generate the shared scientific artifact bundle (smoke grid, slice, streamlines).

Consumes dtcc_core.datasets.smoke over the real tile's own bounds (read from
public/data/real/dataset.json, never duplicated) plus the real dependency files
themselves (referenced by path/byteLength/sha256, never copied). Produces one
schema-version-1 manifest and one four-byte-aligned binary with the grid, slice
and streamline arrays.

Byte layout (type, component count, offset, length, alignment) is entirely
delegated to scripts/real/benchio.pack_array_bundle. This module owns only
domain meaning: which array is which field, on which product, with which
association, over which local frame.

    .venv/bin/python scripts/scientific/generate.py

See docs/superpowers/plans/2026-09-11-scientific-visualization-decision-spike.md
(Task 2) and .superpowers/sdd/2026-09-11-scientific-visualization-decision-spike/
task-2-report.md for the association-handling finding this module encodes.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "real"))
import benchio  # noqa: E402  (path must be extended first)

REPO = Path(__file__).resolve().parents[2]
REAL_DIR = REPO / "public" / "data" / "real"
OUT_DIR = REPO / "public" / "data" / "scientific"

# Files Task 1 committed under public/data/real/ that this manifest depends on.
# Referenced by path/byteLength/sha256 -- never copied, never modified.
DEPENDENCY_NAMES = [
    "dataset.json",
    "ground.mesh.json", "ground.mesh.bin",
    "buildings.mesh.json", "buildings.mesh.bin",
    "field.json", "field.grid.json", "field.grid.f32",
]

# Step 3's fixed generation parameters (plan Task 2, Contract Amendments unaffected).
RESOLUTION = 32
TIME = 0.0
PERIOD = 8.0
DOMAIN_HEIGHT_M = 80.0
SLICE_AXIS = "z"
SLICE_POSITION = 0.5
STREAMLINE_COUNT = 24
STREAMLINE_STEPS = 160
STREAMLINE_STEP_SIZE = 0.05

FIELD_NAMES = ("velocity", "speed", "pressure")


def load_real_frame(real_dir: Path) -> dict:
    """CRS, bounds, origin and z0 straight from Task 1's dataset.json -- never
    re-derived or hardcoded here."""
    dataset = benchio.load_dataset_json(real_dir)
    return {
        "crs": dataset["crs"],
        "bounds": [float(v) for v in dataset["bounds"]],
        "origin": [float(v) for v in dataset["origin"]],
        "z0": float(dataset["z0"]),
    }


def dependency_records(real_dir: Path) -> list[dict]:
    records = []
    for name in DEPENDENCY_NAMES:
        data = (real_dir / name).read_bytes()
        records.append({
            "path": f"../real/{name}",
            "byteLength": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
        })
    return records


def _field_map(fields) -> dict:
    out = {}
    for f in fields:
        out[f.name] = f
    return out


def _resolve_association(fmap: dict, names: tuple, *, case: str, require_present: bool):
    """Take association from Core's Field.association only -- never assert it
    independently (Global Constraint). `None` is Core's own documented "unset,
    not yet serialized" state (Field docstring: "None is allowed while editing,
    but serialization requires an explicit association") and is exactly what
    Core 4c8d621 leaves on FieldSlice/StreamlineCollection fields, which are
    themselves explicitly unsupported by Core native exchange. An explicit
    empty string is never expected and always fails generation. `require_present`
    additionally fails on None -- reserved for the VolumeMesh/grid product, the
    one place Core is measured to set an explicit association ("vertex")."""
    values = set()
    for name in names:
        association = fmap[name].association
        if association == "":
            raise ValueError(
                f"{case}: Field {name!r} has an explicit empty-string association; "
                "never fabricate a substitute for it"
            )
        values.add(association)
    if len(values) != 1:
        raise ValueError(f"{case}: velocity/speed/pressure associations disagree: {values}")
    (association,) = values
    if require_present and not association:
        raise ValueError(
            f"{case}: Core did not set an association for velocity/speed/pressure "
            "(measured None); Core 4c8d621 is expected to set 'vertex' here"
        )
    return association


def _assert_finite(case: str, **arrays):
    for name, arr in arrays.items():
        if arr.size and not np.all(np.isfinite(arr)):
            raise ValueError(f"{case}.{name}: contains non-finite values")


def _lattice_order(columns: list, axis_bounds: list, resolution: int) -> np.ndarray:
    """Return the permutation that reorders rows so `columns[0]` is fastest-
    varying and `columns[-1]` is slowest, after asserting every expected lattice
    coordinate occurs exactly once.

    Core's sample order is not documented to already be grid order -- measured
    on 4c8d621, VolumeMesh vertices come out z-fastest, x-slowest for a 3D
    bounds request, the opposite of what is needed here -- so this is always
    derived from the actual coordinates, never assumed from array position.
    """
    n = len(columns[0])
    ticks = [np.linspace(lo, hi, resolution) for lo, hi in axis_bounds]
    span = max((hi - lo for lo, hi in axis_bounds), default=1.0)
    tol = 1e-6 * max(span, 1.0)
    indices = []
    for col, tick in zip(columns, ticks):
        i = np.argmin(np.abs(col[:, None] - tick[None, :]), axis=1)
        if not np.all(np.abs(col - tick[i]) <= tol):
            raise ValueError("smoke lattice: sample coordinates do not align with the "
                             "expected regular grid to within tolerance")
        indices.append(i)
    lin = np.zeros(n, dtype=np.int64)
    stride = 1
    for i in indices:
        lin += i.astype(np.int64) * stride
        stride *= resolution
    total = resolution ** len(columns)
    if not np.array_equal(np.sort(lin), np.arange(total)):
        raise ValueError("smoke lattice: samples do not form a complete regular lattice; "
                         "every expected coordinate must occur exactly once")
    return np.argsort(lin)


def generate(real_dir: Path = REAL_DIR) -> tuple:
    """Build the manifest and binary blob. Pure w.r.t. the filesystem: reads
    real_dir's dependency files and calls dtcc-core, writes nothing."""
    import dtcc_core.datasets as datasets

    frame = load_real_frame(real_dir)
    origin, z0, crs = frame["origin"], frame["z0"], frame["crs"]
    zmin, zmax = z0, z0 + DOMAIN_HEIGHT_M

    common = dict(bounds=frame["bounds"], zmin=zmin, zmax=zmax,
                  resolution=RESOLUTION, crs=crs, time=TIME, period=PERIOD)

    field = datasets.smoke(**common, product="field")
    slice_ = datasets.smoke(**common, product="slice",
                            slice_axis=SLICE_AXIS, slice_position=SLICE_POSITION)
    lines = datasets.smoke(**common, product="streamlines",
                           slice_axis=SLICE_AXIS, slice_position=SLICE_POSITION,
                           streamline_count=STREAMLINE_COUNT,
                           streamline_steps=STREAMLINE_STEPS,
                           streamline_step_size=STREAMLINE_STEP_SIZE)

    core_bounds = field.bounds
    local_bounds = [
        core_bounds.xmin - origin[0], core_bounds.ymin - origin[1], core_bounds.zmin - z0,
        core_bounds.xmax - origin[0], core_bounds.ymax - origin[1], core_bounds.zmax - z0,
    ]

    # ---- grid (product="field", a VolumeMesh) ----
    grid_local = np.asarray(field.vertices, dtype=np.float64).copy()
    grid_local[:, 0] -= origin[0]
    grid_local[:, 1] -= origin[1]
    grid_local[:, 2] -= z0
    grid_order = _lattice_order(
        [grid_local[:, 0], grid_local[:, 1], grid_local[:, 2]],
        [(local_bounds[0], local_bounds[3]), (local_bounds[1], local_bounds[4]),
         (local_bounds[2], local_bounds[5])],
        RESOLUTION,
    )
    fmap = _field_map(field.fields)
    for name in FIELD_NAMES:
        if name not in fmap:
            raise ValueError(f"smoke.grid: product='field' is missing Field {name!r}")
    grid_association = _resolve_association(fmap, FIELD_NAMES, case="smoke.grid",
                                            require_present=True)
    grid_velocity = np.asarray(fmap["velocity"].values, dtype=np.float64)[grid_order]
    grid_speed = np.asarray(fmap["speed"].values, dtype=np.float64).reshape(-1)[grid_order]
    grid_pressure = np.asarray(fmap["pressure"].values, dtype=np.float64).reshape(-1)[grid_order]
    _assert_finite("smoke.grid", velocity=grid_velocity, speed=grid_speed, pressure=grid_pressure)

    # ---- slice (product="slice", a FieldSlice) ----
    slice_local = np.asarray(slice_.points, dtype=np.float64).copy()
    slice_local[:, 0] -= origin[0]
    slice_local[:, 1] -= origin[1]
    slice_local[:, 2] -= z0
    a_axis, b_axis = slice_.axes
    fixed_axis = 3 - a_axis - b_axis
    fixed_values = slice_local[:, fixed_axis]
    fixed_span = max(local_bounds[fixed_axis + 3] - local_bounds[fixed_axis], 1.0)
    if fixed_values.max() - fixed_values.min() > 1e-6 * fixed_span:
        raise ValueError("smoke.slice: sample points are not coplanar on the fixed axis")
    fixed_local_coordinate = float(fixed_values.mean())

    slice_order = _lattice_order(
        [slice_local[:, a_axis], slice_local[:, b_axis]],
        [(local_bounds[a_axis], local_bounds[a_axis + 3]),
         (local_bounds[b_axis], local_bounds[b_axis + 3])],
        RESOLUTION,
    )
    smap = _field_map(slice_.fields)
    for name in FIELD_NAMES:
        if name not in smap:
            raise ValueError(f"smoke.slice: product='slice' is missing Field {name!r}")
    slice_association = _resolve_association(smap, FIELD_NAMES, case="smoke.slice",
                                             require_present=False)
    slice_velocity = np.asarray(smap["velocity"].values, dtype=np.float64)[slice_order]
    slice_speed = np.asarray(smap["speed"].values, dtype=np.float64).reshape(-1)[slice_order]
    slice_pressure = np.asarray(smap["pressure"].values, dtype=np.float64).reshape(-1)[slice_order]
    _assert_finite("smoke.slice", velocity=slice_velocity, speed=slice_speed, pressure=slice_pressure)

    # ---- streamlines (product="streamlines", a StreamlineCollection) ----
    position_parts, velocity_parts, speed_parts, pressure_parts = [], [], [], []
    offsets = [0]
    line_associations = set()
    for line in lines.lines:
        lmap = _field_map(line.fields)
        for name in FIELD_NAMES:
            if name not in lmap:
                raise ValueError(f"smoke.streamlines: a line is missing Field {name!r}")
        line_associations.add(_resolve_association(lmap, FIELD_NAMES, case="smoke.streamlines",
                                                    require_present=False))
        pts = np.asarray(line.vertices, dtype=np.float64).copy()
        pts[:, 0] -= origin[0]
        pts[:, 1] -= origin[1]
        pts[:, 2] -= z0
        position_parts.append(pts)
        velocity_parts.append(np.asarray(lmap["velocity"].values, dtype=np.float64))
        speed_parts.append(np.asarray(lmap["speed"].values, dtype=np.float64).reshape(-1))
        pressure_parts.append(np.asarray(lmap["pressure"].values, dtype=np.float64).reshape(-1))
        offsets.append(offsets[-1] + len(pts))
    if len(line_associations) > 1:
        raise ValueError(f"smoke.streamlines: association differs across lines: {line_associations}")
    streamline_association = next(iter(line_associations)) if line_associations else None

    streamline_positions = (np.concatenate(position_parts) if position_parts
                            else np.empty((0, 3)))
    streamline_velocity = (np.concatenate(velocity_parts) if velocity_parts
                           else np.empty((0, 3)))
    streamline_speed = np.concatenate(speed_parts) if speed_parts else np.empty((0,))
    streamline_pressure = np.concatenate(pressure_parts) if pressure_parts else np.empty((0,))
    _assert_finite("smoke.streamlines", positions=streamline_positions,
                  velocity=streamline_velocity, speed=streamline_speed, pressure=streamline_pressure)

    # ---- pack the binary (benchio owns byte layout) ----
    arrays_spec = [
        ("grid_velocity", grid_velocity, "f32", 3),
        ("grid_speed", grid_speed, "f32", 1),
        ("grid_pressure", grid_pressure, "f32", 1),
        ("slice_velocity", slice_velocity, "f32", 3),
        ("slice_speed", slice_speed, "f32", 1),
        ("slice_pressure", slice_pressure, "f32", 1),
        ("streamline_positions", streamline_positions, "f32", 3),
        ("streamline_velocity", streamline_velocity, "f32", 3),
        ("streamline_speed", streamline_speed, "f32", 1),
        ("streamline_pressure", streamline_pressure, "f32", 1),
    ]
    blob, specs = benchio.pack_array_bundle(arrays_spec)
    spec_map = {s["name"]: s for s in specs}

    heat_meta = json.loads((real_dir / "field.json").read_text())

    manifest = {
        "schemaVersion": 1,
        "coordinateFrame": {
            "crs": crs,
            "origin": origin,
            "z0": z0,
            "bounds": frame["bounds"],
            "localBounds": local_bounds,
        },
        "fields": {
            "velocity": {"unit": fmap["velocity"].unit, "dim": int(fmap["velocity"].dim)},
            "speed": {"unit": fmap["speed"].unit, "dim": int(fmap["speed"].dim)},
            "pressure": {"unit": fmap["pressure"].unit, "dim": int(fmap["pressure"].dim)},
            "temperature": {"unit": heat_meta["unit"], "dim": 1},
        },
        "cases": {
            "smoke": {
                "dataCategory": datasets.smoke.data_category,
                "dtccCoreRevision": benchio.distribution_revision("dtcc-core"),
                "params": {
                    "resolution": RESOLUTION, "time": TIME, "period": PERIOD,
                    "zRange": [zmin, zmax],
                    "sliceAxis": SLICE_AXIS, "slicePosition": SLICE_POSITION,
                    "streamlineCount": STREAMLINE_COUNT, "streamlineSteps": STREAMLINE_STEPS,
                    "streamlineStepSize": STREAMLINE_STEP_SIZE,
                },
                "grid": {
                    "resolution": RESOLUTION,
                    "dims": [RESOLUTION, RESOLUTION, RESOLUTION],
                    "order": "x-fastest,y,z-slowest",
                    "origin": [local_bounds[0], local_bounds[1], local_bounds[2]],
                    "spacing": [
                        (local_bounds[3] - local_bounds[0]) / (RESOLUTION - 1),
                        (local_bounds[4] - local_bounds[1]) / (RESOLUTION - 1),
                        (local_bounds[5] - local_bounds[2]) / (RESOLUTION - 1),
                    ],
                    "association": grid_association,
                    "arrays": [spec_map[n] for n in
                              ("grid_velocity", "grid_speed", "grid_pressure")],
                },
                "slice": {
                    "axis": slice_.slice_axis,
                    "position": float(slice_.slice_position),
                    "resolution": RESOLUTION,
                    "order": "a-fastest,b-slower (a,b = the two non-fixed local axes)",
                    "localAxes": [a_axis, b_axis],
                    "fixedLocalAxis": fixed_axis,
                    "fixedLocalCoordinate": fixed_local_coordinate,
                    "time": float(slice_.time),
                    "period": float(slice_.period),
                    "association": slice_association,
                    "arrays": [spec_map[n] for n in
                              ("slice_velocity", "slice_speed", "slice_pressure")],
                },
                "streamlines": {
                    "seedAxis": lines.seed_axis,
                    "seedPosition": float(lines.seed_position),
                    "requestedCount": STREAMLINE_COUNT,
                    "actualCount": len(lines.lines),
                    "steps": int(lines.streamline_steps),
                    "stepSize": float(lines.streamline_step_size),
                    "time": float(lines.time),
                    "period": float(lines.period),
                    "vertexOffsets": offsets,
                    "association": streamline_association,
                    "arrays": [spec_map[n] for n in
                              ("streamline_positions", "streamline_velocity",
                               "streamline_speed", "streamline_pressure")],
                },
            },
            "heat": {
                "dataCategory": "simulation",
                "source": heat_meta.get("source"),
                "unit": heat_meta.get("unit"),
                "tmin": heat_meta.get("tmin"),
                "tmax": heat_meta.get("tmax"),
            },
        },
        "dependencies": dependency_records(real_dir),
        "binary": {
            "path": "scientific.bin",
            "byteLength": len(blob),
            "sha256": hashlib.sha256(blob).hexdigest(),
        },
    }
    return manifest, blob


def main() -> None:
    manifest, blob = generate(REAL_DIR)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "scientific.bin").write_bytes(blob)
    (OUT_DIR / "scientific-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"generate: wrote scientific-manifest.json + scientific.bin ({len(blob)} bytes)",
          flush=True)


if __name__ == "__main__":
    main()
