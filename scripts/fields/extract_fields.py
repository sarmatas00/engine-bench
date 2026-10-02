#!/usr/bin/env python
"""Extract Anders's time series of grid fields into the bench's animation artifact.

    <python with dtcc-core develop>/bin/python scripts/fields/extract_fields.py \
        <fields.zip> --generator <dtcc-core>/scripts/generate_fields.py

Writes public/data/fields/{pressure.NNNN.f32, pressure.json, manifest.json}.

THE SOURCE. dtcc-core's scripts/generate_fields.py (Anders, 2026-10-01): a
VolumeGrid over flagship's bounds, 101 snapshots over one 10 s period, with
`velocity` and `pressure` on the grid's VERTICES. Its own manifest says
"Analytic visualization fixtures; not a fluid simulation", and the field does
not know the buildings exist. It is here as a time series of realistic size,
not as a flow result.

25 OF 101 FRAMES. Every FRAME_STRIDE-th snapshot, 0..96. The field is periodic
with the series' duration (phase = 2 pi t / period, t running 0..period), so
snapshot 100 equals snapshot 0 and 0, 4, ..., 96 loops without a seam; main()
checks that rather than trusting it. All 101 float32 frames would be 249 MB in
git and in gh-pages; 25 are 62 MB. The number of distinct frames does not
change what a per-frame swap costs; it only bounds the preloaded mode's GPU
memory, which the bigger generated grid is for.

ORDER IS PROVED, NOT ASSUMED. The generator flattens vertices (y, x, z) with z
fastest. After the transpose to x-fastest, the frame is compared with the
generator's own analytic function evaluated at x-fastest node coordinates;
reading x and y swapped is the control and must disagree.

NEEDS CORE DEVELOP + LINKML, like scripts/flagship/extract_volume.py.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[2]
GEOMETRY = REPO / "public" / "data" / "flagship"
OUT = REPO / "public" / "data" / "fields"
FIELD = "pressure"
FRAME_STRIDE = 4


def load_generator(path: Path):
    spec = importlib.util.spec_from_file_location("generate_fields", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def node_coordinates(bounds, dims) -> np.ndarray:
    """(n, 3) world coordinates of the grid's vertices, x fastest, then y, then z."""
    nx, ny, nz = dims
    xs = np.linspace(bounds["xmin"], bounds["xmax"], nx)
    ys = np.linspace(bounds["ymin"], bounds["ymax"], ny)
    zs = np.linspace(bounds["zmin"], bounds["zmax"], nz)
    z, y, x = np.meshgrid(zs, ys, xs, indexing="ij")
    return np.column_stack([x.ravel(), y.ravel(), z.ravel()])


def check_order(frame_xyz: np.ndarray, gen, bounds, dims, seconds: float, period: float) -> dict:
    """The transposed frame against the generator's analytic field at the same nodes.

    The control evaluates at x and y swapped: the field is not symmetric in
    them, so a wrong transpose cannot pass both.
    """
    xyz = node_coordinates(bounds, dims)
    origin = np.array([bounds["xmin"], bounds["ymin"], bounds["zmin"]])
    lengths = np.array([bounds["xmax"], bounds["ymax"], bounds["zmax"]]) - origin
    sample = 2 * np.pi * ((xyz - origin) / lengths - .5)
    by_name = {f.name: f for f in gen.sample_fields(sample, seconds, period)}
    expected = np.asarray(by_name[FIELD].values, dtype=np.float32)
    swapped = expected.reshape(dims[2], dims[1], dims[0]).transpose(0, 2, 1).ravel()
    scale = float(np.abs(expected).max())
    err = float(np.abs(frame_xyz - expected).max()) / scale
    err_swapped = float(np.abs(frame_xyz - swapped).max()) / scale
    # Generator and extractor both run float64 maths into float32; 1e-5 of the
    # peak is rounding, not order. The control must be off by a visible amount.
    if not (err < 1e-5 and err_swapped > 0.05):
        raise SystemExit(f"order check failed: max error {err:.2e} of peak, {err_swapped:.2e} if x/y swapped")
    return {"maxErrorOfPeak": err, "maxErrorOfPeakIfXYSwapped": round(err_swapped, 4), "atSeconds": seconds}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("archive", type=Path, help="fields.zip as shared by Anders")
    ap.add_argument("--generator", type=Path, required=True,
                    help="dtcc-core scripts/generate_fields.py, used to prove the order")
    ap.add_argument("--out", type=Path, default=OUT)
    ap.add_argument("--core-commit", default="897faf6",
                    help="dtcc-core commit of the generator; recorded, not checked")
    args = ap.parse_args()

    from dtcc_core import io

    gen = load_generator(args.generator)
    archive_sha = hashlib.sha256()
    with args.archive.open("rb") as fh:
        for block in iter(lambda: fh.read(1 << 24), b""):
            archive_sha.update(block)

    with zipfile.ZipFile(args.archive) as zf, tempfile.TemporaryDirectory() as tmp:
        series = json.loads(zf.read("fields/fields-series.json"))
        period = float(series["period_seconds"])
        frames = series["frames"]
        bounds = series["bounds"]
        sub = series["subdivisions"]
        dims = (sub["nx"] + 1, sub["ny"] + 1, sub["nz"] + 1)
        nodes = dims[0] * dims[1] * dims[2]

        def read(index: int) -> np.ndarray:
            name = f"fields/{frames[index]['grid']['dtcc']}"
            path = Path(zf.extract(name, tmp))
            grid = io.load_model(str(path))
            path.unlink()
            if (grid.width, grid.height, grid.depth) != (sub["nx"], sub["ny"], sub["nz"]):
                raise SystemExit(f"{name}: grid {grid.width}x{grid.height}x{grid.depth}, series says {sub}")
            field = {f.name: f for f in grid.fields}[FIELD]
            if field.association != "vertex":
                raise SystemExit(f"{name}: {FIELD} on {field.association}, expected vertex")
            values = np.asarray(field.values, dtype=np.float32)
            if values.shape != (nodes,):
                raise SystemExit(f"{name}: {values.shape}, expected one value per vertex ({nodes})")
            # Generator order: (y, x, z), z fastest. Textures want x fastest, then y, then z.
            return np.ascontiguousarray(values.reshape(dims[1], dims[0], dims[2]).transpose(2, 0, 1)).ravel()

        last = len(frames) - 1
        picked = list(range(0, last, FRAME_STRIDE))
        if last % FRAME_STRIDE:
            raise SystemExit(f"{len(frames)} frames do not split into a seamless loop at stride {FRAME_STRIDE}")
        first = read(0)
        seam = float(np.abs(read(last) - first).max()) / float(np.abs(first).max())
        if seam > 1e-5:
            raise SystemExit(f"snapshot {last} differs from 0 by {seam:.2e} of peak: the series is not one period")
        order = check_order(first, gen, bounds, dims, frames[0]["time_seconds"], period)

        data = {0: first}
        for index in picked[1:]:
            data[index] = read(index)
            print(f"  frame {index}/{last}", flush=True)
        # One range for every frame, so a colour means the same pressure all loop long.
        lo = float(min(a.min() for a in data.values()))
        hi = float(max(a.max() for a in data.values()))

    dataset = json.loads((GEOMETRY / "dataset.json").read_text())
    ox, oy = dataset["origin"]
    z0 = dataset["z0"]
    # Values sit ON the vertices, so node 0 is the bounds' corner itself.
    origin = [bounds["xmin"] - ox, bounds["ymin"] - oy, bounds["zmin"] - z0]
    spacing = [(bounds[f"{a}max"] - bounds[f"{a}min"]) / (dims[i] - 1) for i, a in enumerate("xyz")]

    args.out.mkdir(parents=True, exist_ok=True)
    for old in args.out.glob(f"{FIELD}.*.f32"):
        old.unlink()
    files = []
    for index in picked:
        name = f"{FIELD}.{index:04d}.f32"
        (args.out / name).write_bytes(data[index].astype("<f4").tobytes())
        files.append({"file": name, "snapshot": index, "timeSeconds": frames[index]["time_seconds"]})

    meta = {
        "field": FIELD,
        "unit": "Pa",
        "dims": list(dims),
        "origin": origin,
        "spacing": spacing,
        "order": "x-fastest",
        "association": "vertex",
        "frame": "the flagship geometry artifact's local frame (dataset.json origin and z0)",
        "range": [lo, hi],
        "periodSeconds": period,
        "frameStride": FRAME_STRIDE,
        "frames": files,
        "seamCheck": {"snapshot": last, "maxDifferenceOfPeakFromSnapshot0": seam},
        "orderCheck": order,
        "synthetic": True,
        "source": {
            "file": args.archive.name,
            "sha256": archive_sha.hexdigest(),
            "series": "fields/fields-series.json",
            "generator": "dtcc-core scripts/generate_fields.py",
            "generatorCommit": args.core_commit,
        },
        "stages": {"extract": datetime.now(timezone.utc).isoformat()},
    }
    (args.out / f"{FIELD}.json").write_text(json.dumps(meta, indent=2) + "\n")

    def verified(name: str) -> dict:
        blob = (args.out / name).read_bytes()
        return {"byteLength": len(blob), "sha256": hashlib.sha256(blob).hexdigest()}

    manifest = {
        "axis": "animation",
        "grid": f"{FIELD}.json",
        "files": {name: verified(name) for name in [f"{FIELD}.json", *(f["file"] for f in files)]},
    }
    (args.out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({k: meta[k] for k in ("dims", "origin", "spacing", "range", "seamCheck", "orderCheck")}
                     | {"frames": len(files)}, indent=2))


if __name__ == "__main__":
    main()
