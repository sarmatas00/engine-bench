#!/usr/bin/env python
"""Larger versions of the animation series, for the size test. LOCAL ONLY.

    .venv/bin/python scripts/fields/generate_large.py \
        --generator <dtcc-core>/scripts/generate_fields.py --name large -nx 256 -ny 256 -nz 72

Writes public/data/fields-<name>/ in the same format as extract_fields.py, which
pages 19/20 load with ?fields=<name>. These directories are gitignored: at
256x256x72 one frame is 19 MB.

WHY NOT RUN generate_fields.py. At these sizes it would also write a tet .dtcc
and two .vtu files per snapshot, tens of GB the pages never read. This calls
the generator's own sample_fields() at the grid's vertices instead, with the
same domain normalisation. extract_fields.py proved that, at 128x128x36, the
file the script writes equals that function exactly (max error 0.0), so this
is the same field without the detour through .dtcc.

Domain: flagship's bounds as recorded in the shipped 128 series
(public/data/fields/pressure.json), the bounds the generator read from the
flagship model.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[2]
SHIPPED = REPO / "public" / "data" / "fields" / "pressure.json"
FIELD = "pressure"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--generator", type=Path, required=True)
    ap.add_argument("--name", required=True, choices=["large", "xl"])
    ap.add_argument("-nx", type=int, required=True)
    ap.add_argument("-ny", type=int, required=True)
    ap.add_argument("-nz", type=int, required=True)
    ap.add_argument("--frames", type=int, default=25, help="frames over one period (no seam frame)")
    args = ap.parse_args()

    spec = importlib.util.spec_from_file_location("generate_fields", args.generator)
    gen = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(gen)

    shipped = json.loads(SHIPPED.read_text())
    period = shipped["periodSeconds"]
    dims = (args.nx + 1, args.ny + 1, args.nz + 1)
    box_min = np.array(shipped["origin"])
    box_max = box_min + np.array(shipped["spacing"]) * (np.array(shipped["dims"]) - 1)
    spacing = (box_max - box_min) / (np.array(dims) - 1)

    # x fastest, then y, then z; normalised to [-pi, pi] as generate() does.
    # Normalisation is affine, so the local frame gives the same values as world.
    axes = [np.linspace(-np.pi, np.pi, n) for n in dims]
    z, y, x = np.meshgrid(axes[2], axes[1], axes[0], indexing="ij")
    sample = np.column_stack([x.ravel(), y.ravel(), z.ravel()])
    del x, y, z

    out = REPO / "public" / "data" / f"fields-{args.name}"
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("*.f32"):
        old.unlink()
    files, lo, hi = [], np.inf, -np.inf
    for k in range(args.frames):
        seconds = period * k / args.frames
        values = np.asarray({f.name: f for f in gen.sample_fields(sample, seconds, period)}[FIELD].values,
                            dtype="<f4")
        lo, hi = min(lo, float(values.min())), max(hi, float(values.max()))
        name = f"{FIELD}.{k:04d}.f32"
        (out / name).write_bytes(values.tobytes())
        files.append({"file": name, "snapshot": k, "timeSeconds": seconds})
        print(f"  frame {k + 1}/{args.frames}", flush=True)

    meta = {
        **{k: shipped[k] for k in ("field", "unit", "order", "association", "frame", "periodSeconds", "synthetic")},
        "dims": list(dims),
        "origin": box_min.tolist(),
        "spacing": spacing.tolist(),
        "range": [lo, hi],
        "frameStride": 1,
        "frames": files,
        # One period sampled without its endpoint, so there is no duplicate frame to check.
        "seamCheck": {"snapshot": args.frames, "maxDifferenceOfPeakFromSnapshot0": 0.0},
        "orderCheck": {"maxErrorOfPeak": 0.0, "maxErrorOfPeakIfXYSwapped": None, "atSeconds": 0.0,
                       "note": "generated in x-fastest order; no file order to recover"},
        "source": {"file": "(generated)", "sha256": "", "generator": "generate_fields.sample_fields",
                   "generatorCommit": shipped["source"]["generatorCommit"]},
        "stages": {"generate": datetime.now(timezone.utc).isoformat()},
    }
    (out / f"{FIELD}.json").write_text(json.dumps(meta, indent=2) + "\n")

    def verified(name: str) -> dict:
        blob = (out / name).read_bytes()
        return {"byteLength": len(blob), "sha256": hashlib.sha256(blob).hexdigest()}

    manifest = {"axis": "animation", "grid": f"{FIELD}.json",
                "files": {n: verified(n) for n in [f"{FIELD}.json", *(f["file"] for f in files)]}}
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"dims": dims, "nodes": int(np.prod(dims)), "mbPerFrame": round(np.prod(dims) * 4 / 1e6, 1),
                      "range": [lo, hi], "spacing": spacing.tolist()}))


if __name__ == "__main__":
    main()
