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
task-2-report.md for the findings (association handling, streamline seed
recovery) this module encodes.
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
        "crs": _reject_markup(dataset["crs"], context="dataset.json.crs"),
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


def _reject_markup(value, *, context: str):
    """Refuse a value that looks like markup rather than plain data (Step 4:
    "Do not accept UI HTML from data"). Applied to strings copied verbatim from
    real/*.json into a manifest a browser will parse and display."""
    if isinstance(value, str) and ("<" in value or ">" in value):
        raise ValueError(f"{context}: value looks like markup, not plain data: {value!r}")
    return value


def _resolve_temperature_dim(real_dir: Path, heat_meta: dict) -> int:
    """Derive the heat field's component count from the committed grid file
    itself rather than assuming scalar. field.grid.f32's byte length must
    divide evenly into (component count) x (grid node count) x 4 bytes, and
    that must agree with field.json's own round-trip vertex/count record."""
    grid_meta = json.loads((real_dir / "field.grid.json").read_text())
    dims = grid_meta["dims"]
    node_count = 1
    for d in dims:
        node_count *= int(d)
    grid_bytes = (real_dir / "field.grid.f32").stat().st_size
    if grid_bytes % 4 != 0:
        raise ValueError(f"heat.field.grid.f32: {grid_bytes} bytes is not a whole number of f32s")
    total_components = grid_bytes // 4
    if node_count == 0 or total_components % node_count != 0:
        raise ValueError(
            f"heat.field.grid.f32: {grid_bytes} bytes over dims {dims} ({node_count} nodes) "
            "does not divide into a whole component count"
        )
    dim = total_components // node_count

    roundtrip = heat_meta.get("roundtrip", {})
    count_after = roundtrip.get("count_after")
    vertices_after = roundtrip.get("vertices_after")
    if count_after is not None and vertices_after is not None and count_after != vertices_after:
        raise ValueError(
            f"heat.field: roundtrip.count_after ({count_after}) != roundtrip.vertices_after "
            f"({vertices_after}); temperature is not confirmed one value per vertex"
        )
    return dim


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


def _rebase(points: np.ndarray, origin, z0) -> np.ndarray:
    local = np.asarray(points, dtype=np.float64).copy()
    local[:, 0] -= origin[0]
    local[:, 1] -= origin[1]
    local[:, 2] -= z0
    return local


def _build_grid_case(field, origin, z0, local_bounds) -> tuple:
    """product="field" -> a VolumeMesh. Returns (case dict without "arrays",
    array defs for pack_array_bundle, the field map for the top-level units
    registry)."""
    grid_local = _rebase(field.vertices, origin, z0)
    order = _lattice_order(
        [grid_local[:, 0], grid_local[:, 1], grid_local[:, 2]],
        [(local_bounds[0], local_bounds[3]), (local_bounds[1], local_bounds[4]),
         (local_bounds[2], local_bounds[5])],
        RESOLUTION,
    )
    fmap = _field_map(field.fields)
    for name in FIELD_NAMES:
        if name not in fmap:
            raise ValueError(f"smoke.grid: product='field' is missing Field {name!r}")
    association = _resolve_association(fmap, FIELD_NAMES, case="smoke.grid", require_present=True)

    velocity = np.asarray(fmap["velocity"].values, dtype=np.float64)[order]
    speed = np.asarray(fmap["speed"].values, dtype=np.float64).reshape(-1)[order]
    pressure = np.asarray(fmap["pressure"].values, dtype=np.float64).reshape(-1)[order]
    _assert_finite("smoke.grid", velocity=velocity, speed=speed, pressure=pressure)

    # Unlike FieldSlice/StreamlineCollection, VolumeMesh exposes no "resolution"
    # (or any other) echo of the request -- only vertices/cells. RESOLUTION is
    # the only source of truth available here, but it is not taken on faith:
    # _lattice_order above already raised if the vertices did not form a
    # complete RESOLUTION**3 lattice, so by this point it is verified, not assumed.
    case = {
        "resolution": RESOLUTION,
        "dims": [RESOLUTION, RESOLUTION, RESOLUTION],
        "order": "x-fastest,y,z-slowest",
        "origin": [local_bounds[0], local_bounds[1], local_bounds[2]],
        "spacing": [
            (local_bounds[3] - local_bounds[0]) / (RESOLUTION - 1),
            (local_bounds[4] - local_bounds[1]) / (RESOLUTION - 1),
            (local_bounds[5] - local_bounds[2]) / (RESOLUTION - 1),
        ],
        "association": association,
    }
    arrays = [
        ("grid_velocity", velocity, "f32", 3),
        ("grid_speed", speed, "f32", 1),
        ("grid_pressure", pressure, "f32", 1),
    ]
    return case, arrays, fmap


def _build_slice_case(slice_, origin, z0, local_bounds) -> tuple:
    """product="slice" -> a FieldSlice. FieldSlice is explicitly unsupported by
    Core native exchange, so its full context (axis/position/resolution/time/
    period/domain/metadata/crs/name), not just arrays, belongs in the manifest."""
    slice_local = _rebase(slice_.points, origin, z0)
    a_axis, b_axis = slice_.axes
    fixed_axis = 3 - a_axis - b_axis
    fixed_values = slice_local[:, fixed_axis]
    fixed_span = max(local_bounds[fixed_axis + 3] - local_bounds[fixed_axis], 1.0)
    if fixed_values.max() - fixed_values.min() > 1e-6 * fixed_span:
        raise ValueError("smoke.slice: sample points are not coplanar on the fixed axis")
    fixed_local_coordinate = float(fixed_values.mean())

    resolution = int(slice_.resolution)
    order = _lattice_order(
        [slice_local[:, a_axis], slice_local[:, b_axis]],
        [(local_bounds[a_axis], local_bounds[a_axis + 3]),
         (local_bounds[b_axis], local_bounds[b_axis + 3])],
        resolution,
    )
    smap = _field_map(slice_.fields)
    for name in FIELD_NAMES:
        if name not in smap:
            raise ValueError(f"smoke.slice: product='slice' is missing Field {name!r}")
    association = _resolve_association(smap, FIELD_NAMES, case="smoke.slice", require_present=False)

    velocity = np.asarray(smap["velocity"].values, dtype=np.float64)[order]
    speed = np.asarray(smap["speed"].values, dtype=np.float64).reshape(-1)[order]
    pressure = np.asarray(smap["pressure"].values, dtype=np.float64).reshape(-1)[order]
    _assert_finite("smoke.slice", velocity=velocity, speed=speed, pressure=pressure)

    domain_bounds = slice_.domain_bounds
    domain_local_bounds = [
        domain_bounds.xmin - origin[0], domain_bounds.ymin - origin[1], domain_bounds.zmin - z0,
        domain_bounds.xmax - origin[0], domain_bounds.ymax - origin[1], domain_bounds.zmax - z0,
    ]

    case = {
        "name": slice_.name,
        "crs": _reject_markup(slice_.crs, context="smoke.slice.crs"),
        "axis": slice_.slice_axis,
        "position": float(slice_.slice_position),
        "resolution": resolution,
        "order": "a-fastest,b-slower (a,b = the two non-fixed local axes)",
        "localAxes": [a_axis, b_axis],
        "fixedLocalAxis": fixed_axis,
        "fixedLocalCoordinate": fixed_local_coordinate,
        "time": float(slice_.time),
        "period": float(slice_.period),
        "domainLocalBounds": domain_local_bounds,
        "metadata": slice_.metadata_payload,
        "association": association,
    }
    arrays = [
        ("slice_velocity", velocity, "f32", 3),
        ("slice_speed", speed, "f32", 1),
        ("slice_pressure", pressure, "f32", 1),
    ]
    return case, arrays


def _resolve_streamline_seeds(datasets, lines, position_parts, origin, z0) -> list:
    """Recover each surviving line's seed vertex index, verified against the
    actual traced polyline rather than assumed from position or Core-internal
    splitting.

    StreamlineCollection exposes no public seed accessor (Global Constraint:
    the manifest must carry its full context precisely because native exchange
    cannot). `_streamline_seeds` is dtcc-core's own private, deterministic
    seed-placement function, pinned to this Core revision; candidates from it
    are affinely mapped into this tile's local frame using the *publicly*
    documented normalized domain (`datasets.smoke.describe()["normalized_domain"]`),
    then matched to each surviving line's actual vertices by nearest distance.
    A candidate is accepted only if it lands within tolerance of an actual
    vertex on that specific line, and each candidate may be claimed by at most
    one line; generation fails rather than guess if either check does not hold.
    """
    # Same guard pattern as scripts/real/core_compat.py: this reaches into a
    # private Core function and a documented-but-nested describe() key, and a
    # bare ImportError deep inside dtcc_core.datasets.smoke would not tell the
    # next reader what stopped being trustworthy or what not to substitute.
    try:
        from dtcc_core.datasets.smoke import _streamline_seeds

        normalized_bounds = datasets.smoke.describe()["normalized_domain"]["bounds"]
        bounds = lines.domain_bounds
        candidate_count = lines.requested_line_count
        seed_axis, seed_position = lines.seed_axis, lines.seed_position
    except (ImportError, AttributeError, KeyError, TypeError) as exc:
        raise RuntimeError(
            "dtcc-core's smoke seed placement moved, so a streamline's seed "
            "vertex can no longer be recovered and verified. The manifest must "
            "carry seeds because Core native exchange cannot (Global "
            "Constraint), so do NOT fall back to the first or middle vertex of "
            "a polyline: integration runs backward and forward from the seed "
            "and terminates early at the domain boundary, so neither is right. "
            f"Re-read _trace_streamline before emitting seeds again. ({exc})"
        ) from exc

    n_min, n_max = float(normalized_bounds[0]), float(normalized_bounds[3])
    n_span = n_max - n_min

    scale = np.array([bounds.xmax - bounds.xmin, bounds.ymax - bounds.ymin, bounds.zmax - bounds.zmin])
    abs_origin = np.array([bounds.xmin, bounds.ymin, bounds.zmin])
    local_origin = np.array([origin[0], origin[1], z0])

    candidates_normalized = np.asarray(
        _streamline_seeds(candidate_count, seed_axis, seed_position),
        dtype=np.float64,
    )
    candidates_local = abs_origin + (candidates_normalized - n_min) / n_span * scale - local_origin

    tol = 1e-6 * max(float(scale.max()), 1.0)
    used_candidates = set()
    seed_indices = []
    for line_points in position_parts:
        distances = np.linalg.norm(
            candidates_local[:, None, :] - line_points[None, :, :], axis=2
        )
        best_candidate, best_vertex = np.unravel_index(np.argmin(distances), distances.shape)
        best_distance = distances[best_candidate, best_vertex]
        if best_distance > tol:
            raise ValueError(
                "smoke.streamlines: could not verify a seed for one line within tolerance "
                f"(closest reconstructed candidate is {best_distance:.6g} m away); "
                "refusing to guess a seed index"
            )
        if best_candidate in used_candidates:
            raise ValueError(
                f"smoke.streamlines: reconstructed seed candidate {best_candidate} "
                "matched more than one line"
            )
        used_candidates.add(int(best_candidate))
        seed_indices.append(int(best_vertex))
    return seed_indices


def _build_streamline_case(datasets, lines, origin, z0) -> tuple:
    """product="streamlines" -> a StreamlineCollection. Unsupported by Core
    native exchange like FieldSlice, so seeds/steps/time/period/domain/metadata
    all belong in the manifest, not only the arrays."""
    position_parts, velocity_parts, speed_parts, pressure_parts = [], [], [], []
    offsets = [0]
    line_associations = set()
    for line in lines.lines:
        lmap = _field_map(line.fields)
        for name in FIELD_NAMES:
            if name not in lmap:
                raise ValueError(f"smoke.streamlines: a line is missing Field {name!r}")
        line_associations.add(
            _resolve_association(lmap, FIELD_NAMES, case="smoke.streamlines", require_present=False)
        )
        pts = _rebase(line.vertices, origin, z0)
        position_parts.append(pts)
        velocity_parts.append(np.asarray(lmap["velocity"].values, dtype=np.float64))
        speed_parts.append(np.asarray(lmap["speed"].values, dtype=np.float64).reshape(-1))
        pressure_parts.append(np.asarray(lmap["pressure"].values, dtype=np.float64).reshape(-1))
        offsets.append(offsets[-1] + len(pts))
    if len(line_associations) > 1:
        raise ValueError(f"smoke.streamlines: association differs across lines: {line_associations}")
    association = next(iter(line_associations)) if line_associations else None

    seed_indices = _resolve_streamline_seeds(datasets, lines, position_parts, origin, z0)

    positions = np.concatenate(position_parts) if position_parts else np.empty((0, 3))
    velocity = np.concatenate(velocity_parts) if velocity_parts else np.empty((0, 3))
    speed = np.concatenate(speed_parts) if speed_parts else np.empty((0,))
    pressure = np.concatenate(pressure_parts) if pressure_parts else np.empty((0,))
    _assert_finite("smoke.streamlines", positions=positions, velocity=velocity,
                  speed=speed, pressure=pressure)

    bounds = lines.domain_bounds
    domain_local_bounds = [
        bounds.xmin - origin[0], bounds.ymin - origin[1], bounds.zmin - z0,
        bounds.xmax - origin[0], bounds.ymax - origin[1], bounds.zmax - z0,
    ]

    case = {
        "name": lines.name,
        "crs": _reject_markup(lines.crs, context="smoke.streamlines.crs"),
        "seedAxis": lines.seed_axis,
        "seedPosition": float(lines.seed_position),
        "requestedCount": int(lines.requested_line_count),
        "actualCount": len(lines.lines),
        "steps": int(lines.streamline_steps),
        "stepSize": float(lines.streamline_step_size),
        "time": float(lines.time),
        "period": float(lines.period),
        "domainLocalBounds": domain_local_bounds,
        "metadata": lines.metadata_payload,
        "vertexOffsets": offsets,
        "seedIndices": seed_indices,
        "association": association,
    }
    arrays = [
        ("streamline_positions", positions, "f32", 3),
        ("streamline_velocity", velocity, "f32", 3),
        ("streamline_speed", speed, "f32", 1),
        ("streamline_pressure", pressure, "f32", 1),
    ]
    return case, arrays


def manifest_bytes(manifest: dict) -> bytes:
    """The one place that decides how the manifest is serialized to disk, so
    generation and the staleness check in test_generate.py can never drift."""
    return (json.dumps(manifest, indent=2) + "\n").encode("utf-8")


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

    grid_case, grid_arrays, fmap = _build_grid_case(field, origin, z0, local_bounds)
    slice_case, slice_arrays = _build_slice_case(slice_, origin, z0, local_bounds)
    streamline_case, streamline_arrays = _build_streamline_case(datasets, lines, origin, z0)

    blob, specs = benchio.pack_array_bundle(grid_arrays + slice_arrays + streamline_arrays)
    spec_map = {s["name"]: s for s in specs}
    grid_case["arrays"] = [spec_map[n] for n, *_ in grid_arrays]
    slice_case["arrays"] = [spec_map[n] for n, *_ in slice_arrays]
    streamline_case["arrays"] = [spec_map[n] for n, *_ in streamline_arrays]

    heat_meta = json.loads((real_dir / "field.json").read_text())
    heat_dim = _resolve_temperature_dim(real_dir, heat_meta)
    heat_unit = _reject_markup(heat_meta["unit"], context="field.json.unit")
    heat_source = _reject_markup(heat_meta.get("source"), context="field.json.source")

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
            "temperature": {"unit": heat_unit, "dim": heat_dim},
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
                "grid": grid_case,
                "slice": slice_case,
                "streamlines": streamline_case,
            },
            # Two samplings of the same solve live side by side here, and they
            # do NOT share a range: the volume grid reaches 32.26 degC while the
            # ground-mesh surface sampling reaches 18.76. An unlabelled `tmax`
            # in this block is a trap -- a consumer colouring the volume by it
            # would clamp everything above 18.76 to the top of the ramp and get
            # a saturated blob that looks plausible. So each range says which
            # sampling it describes, and the grid's own range stays where it is
            # measured, in field.grid.json.
            "heat": {
                "dataCategory": "simulation",
                "source": heat_source,
                "unit": heat_unit,
                "surfaceTmin": heat_meta.get("tmin"),
                "surfaceTmax": heat_meta.get("tmax"),
                "surfaceSampling": "ground mesh (public/data/real/field.json)",
                "gridRangeSource": "public/data/real/field.grid.json",
                "association": None,
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
    (OUT_DIR / "scientific-manifest.json").write_bytes(manifest_bytes(manifest))
    print(f"generate: wrote scientific-manifest.json + scientific.bin ({len(blob)} bytes)",
          flush=True)


if __name__ == "__main__":
    main()
