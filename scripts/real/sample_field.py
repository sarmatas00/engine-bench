#!/usr/bin/env python
"""Stage 2, native half: measure the volume-mesh round trip, then sample the
field onto the geometry the bench draws.

    .venv/bin/python scripts/real/sample_field.py

The comparison against the values the container recorded before saving is the
dtcc-core#85 measurement. It is written to dataset.json and to NOTES.md whether
it is good news or bad news.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import benchio

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "public" / "data" / "real"
NOTES = REPO / "NOTES.md"

GRID_DIMS = (64, 64, 32)
GRID_HEIGHT_M = 80.0
PERCENTILES = (2.0, 98.0)

# Same five stops as src/lib/colormap.ts.
STOPS = np.array([[33, 102, 172], [67, 200, 220], [120, 200, 80], [250, 220, 50], [200, 30, 30]], dtype=np.float64)


def colormap(values, tmin: float, tmax: float) -> np.ndarray:
    """Blue -> cyan -> green -> yellow -> red, matching src/lib/colormap.ts."""
    values = np.asarray(values, dtype=np.float64).reshape(-1)
    span = tmax - tmin if tmax > tmin else 1.0
    u = np.clip((values - tmin) / span, 0.0, 1.0) * (len(STOPS) - 1)
    i = np.minimum(len(STOPS) - 2, np.floor(u).astype(np.int64))
    f = (u - i)[:, None]
    return np.rint(STOPS[i] + (STOPS[i + 1] - STOPS[i]) * f).astype(np.uint8)


def interpolate(points, values, targets) -> np.ndarray:
    """Linear inside the convex hull, nearest outside it."""
    from scipy.interpolate import LinearNDInterpolator, NearestNDInterpolator

    points = np.asarray(points, dtype=np.float64)
    values = np.asarray(values, dtype=np.float64).reshape(-1)
    targets = np.asarray(targets, dtype=np.float64)
    out = LinearNDInterpolator(points, values)(targets)
    missing = ~np.isfinite(out)
    if missing.any():
        out[missing] = NearestNDInterpolator(points, values)(targets[missing])
    return out


def compare_round_trip(pre_values, post_values, meta, *, vertices, cells, field_name, dtype) -> dict:
    """What survived save_volume_mesh -> load_volume_mesh (dtcc-core#85)."""
    pre = np.asarray(pre_values, dtype=np.float64).reshape(-1)
    result = {
        "vertices_before": int(meta["vertices"]), "vertices_after": int(vertices),
        "cells_before": int(meta["cells"]), "cells_after": int(cells),
        "field_name_before": meta["field"]["name"], "field_name_after": field_name,
        "dtype_before": meta["field"]["dtype"], "dtype_after": dtype,
        "count_before": int(meta["field"]["count"]),
        "count_after": None if post_values is None else int(np.asarray(post_values).size),
        "field_present": post_values is not None,
        "max_abs_delta": None,
    }
    if post_values is not None and result["count_after"] == result["count_before"]:
        post = np.asarray(post_values, dtype=np.float64).reshape(-1)
        result["max_abs_delta"] = float(np.max(np.abs(post - pre)))
    result["lossless"] = bool(
        result["field_present"]
        # The name is part of what a round trip can lose. Without this, a field silently renamed
        # while its values stayed byte-identical would still be reported lossless — and a renamed
        # field is precisely the shape of metadata loss this measurement exists to catch.
        and result["field_name_before"] == result["field_name_after"]
        and result["vertices_before"] == result["vertices_after"]
        and result["cells_before"] == result["cells_after"]
        and result["count_before"] == result["count_after"]
        and result["dtype_before"] == result["dtype_after"]
        and result["max_abs_delta"] == 0.0
    )
    return result


def round_trip_note(name: str, round_trip: dict) -> str:
    verdict = "no loss" if round_trip["lossless"] else "LOSS"
    return (
        f"- dtcc-core#85 round trip on `{name}` "
        f"(`save_volume_mesh` in the dtcc-sim container -> `load_volume_mesh` natively): **{verdict}**. "
        f"vertices {round_trip['vertices_before']} -> {round_trip['vertices_after']}, "
        f"cells {round_trip['cells_before']} -> {round_trip['cells_after']}, "
        f"field `{round_trip['field_name_before']}` -> `{round_trip['field_name_after']}`, "
        f"dtype {round_trip['dtype_before']} -> {round_trip['dtype_after']}, "
        f"max |dT| {round_trip['max_abs_delta']}. Full record in "
        f"`public/data/real/dataset.json` under `stage2.roundtrip`."
    )


def append_note(text: str) -> None:
    """Append a bullet under NOTES.md's `## Findings` heading."""
    body = NOTES.read_text()
    marker = "## Findings\n"
    if marker not in body:
        body = body.rstrip() + "\n\n" + marker + "\n"
    head, tail = body.split(marker, 1)
    NOTES.write_text(head + marker + "\n" + text.rstrip() + "\n" + tail.lstrip("\n"))


def main(out_dir: Path = OUT) -> dict:
    from dtcc_core.io import load_volume_mesh

    meta = benchio.load_dataset_json(out_dir)
    heat_meta = json.loads((out_dir / "heat.meta.json").read_text())
    pre = np.frombuffer((out_dir / "heat.pre.f64").read_bytes(), dtype=np.float64)

    vm = load_volume_mesh(str(out_dir / "heat.xdmf"))
    fields = list(getattr(vm, "fields", []) or [])
    field = next((f for f in fields if f.name == heat_meta["field"]["name"]), fields[0] if fields else None)
    post = None if field is None else np.asarray(field.values, dtype=np.float64).reshape(-1)

    round_trip = compare_round_trip(
        pre, post, heat_meta,
        vertices=len(vm.vertices), cells=len(vm.cells),
        field_name=None if field is None else field.name,
        dtype=None if field is None else str(np.asarray(field.values).dtype),
    )
    print("round trip:", json.dumps(round_trip, indent=2), flush=True)

    # Persist the verdict BEFORE anything else can fail. This is the only durable record of the
    # dtcc-core#85 measurement, and the branch where it matters most — a field that did not
    # survive — is exactly the branch that cannot go on to produce the other artifacts. Note that
    # `stages.stage2` stays null when the field is gone: the JS side reads it as `hasField`, and a
    # timestamp there would make the pages try to load field files that were never written.
    stage2 = {
        "args": heat_meta["args"],
        "roundtrip": round_trip,
        "solver_dtcc_core_revision": heat_meta.get("dtcc_core_revision", "unknown"),
        "native_dtcc_core_revision": benchio.distribution_revision("dtcc-core"),
    }
    stages = dict(meta["stages"])
    if post is not None:
        stages["stage2"] = datetime.now(timezone.utc).isoformat()
    benchio.patch_dataset_json(out_dir, stages=stages, stage2=stage2)
    append_note(round_trip_note(meta["name"], round_trip))

    if post is None:
        raise RuntimeError(
            "the temperature field did not survive the volume-mesh round trip; the comparison has "
            "been written to dataset.json (stage2.roundtrip) and to NOTES.md"
        )

    origin, z0, extent = meta["origin"], meta["z0"], meta["extent"]
    local = np.asarray(vm.vertices, dtype=np.float64).copy()
    local[:, 0] -= origin[0]
    local[:, 1] -= origin[1]
    local[:, 2] -= z0

    ground = benchio.read_mesh_pair(out_dir, "ground")
    positions = ground["positions"].reshape(-1, 3).astype(np.float64)
    normals = ground["normals"].reshape(-1, 3).astype(np.float64)
    indices = ground["indices"]

    temperature = interpolate(local, post, positions)
    tmin, tmax = (float(v) for v in np.percentile(temperature, PERCENTILES))
    print(f"field on ground mesh: {len(temperature)} values, "
          f"{temperature.min():.2f}..{temperature.max():.2f} degC, "
          f"colour range {tmin:.2f}..{tmax:.2f}", flush=True)

    benchio.write_mesh_pair(out_dir, "field", positions=positions, normals=normals, indices=indices,
                            extra={"temperature": (temperature, "f32", 1)})
    benchio.write_mesh_pair(out_dir, "field-baked", positions=positions, normals=normals, indices=indices,
                            extra={"colors": (colormap(temperature, tmin, tmax).reshape(-1), "u8", 3)})

    nx, ny, nz = GRID_DIMS
    spacing = [2 * extent / (nx - 1), 2 * extent / (ny - 1), GRID_HEIGHT_M / (nz - 1)]
    grid_origin = [-extent, -extent, 0.0]
    gx = grid_origin[0] + np.arange(nx) * spacing[0]
    gy = grid_origin[1] + np.arange(ny) * spacing[1]
    gz = grid_origin[2] + np.arange(nz) * spacing[2]
    # x fastest, then y, then z -- the order src/lib/scene.ts fieldGrid() writes.
    zz, yy, xx = np.meshgrid(gz, gy, gx, indexing="ij")
    grid_values = interpolate(local, post, np.column_stack([xx.ravel(), yy.ravel(), zz.ravel()]))
    (out_dir / "field.grid.f32").write_bytes(np.ascontiguousarray(grid_values, dtype=np.float32).tobytes())
    (out_dir / "field.grid.json").write_text(json.dumps({
        "dims": list(GRID_DIMS), "origin": grid_origin, "spacing": spacing,
        "min": float(grid_values.min()), "max": float(grid_values.max()),
        "dataUrl": "/data/real/field.grid.f32",
    }, indent=2) + "\n")

    (out_dir / "field.json").write_text(json.dumps({
        "unit": heat_meta["field"]["unit"] or "degC",
        "tmin": tmin, "tmax": tmax,
        "source": "dtcc-sim urban_heat",
        "args": heat_meta["args"],
        "roundtrip": round_trip,
    }, indent=2) + "\n")

    stage2["field"] = {"tmin": tmin, "tmax": tmax, "unit": heat_meta["field"]["unit"] or "degC"}
    benchio.patch_dataset_json(out_dir, stage2=stage2)

    print("sample_field: wrote field, field-baked, field.grid.*, field.json; NOTES.md updated", flush=True)
    return {"roundtrip": round_trip, "tmin": tmin, "tmax": tmax}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default=str(OUT))
    args = parser.parse_args()
    main(Path(args.out))
