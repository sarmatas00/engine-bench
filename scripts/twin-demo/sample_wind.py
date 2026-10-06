"""Resample the wind solve (.cache/twin-demo/wind.npz, from solve_wind.py) onto page 21's volume grid.

Same dims, x/y origin and spacing as the smoke field (public/data/twin-demo/field.json), so the page swaps one for
the other. z: the solve's mesh sits at absolute terrain height, the page puts the ground at 0, so the grid starts at
the mesh's lowest ground. Interpolation is scripts/real/sample_field.py's: linear inside the mesh, nearest outside.

    .venv/bin/python scripts/twin-demo/sample_wind.py
"""

import json
import sys
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts" / "real"))
from sample_field import interpolate  # noqa: E402

SOLVE = REPO / ".cache" / "twin-demo"
SMOKE = REPO / "public" / "data" / "twin-demo" / "field.json"
OUT = REPO / "public" / "data" / "twin-demo" / "wind"


def main():
    solve = np.load(SOLVE / "wind.npz")
    meta = json.loads((SOLVE / "wind.meta.json").read_text())
    grid = json.loads(SMOKE.read_text())
    vertices, velocity = solve["vertices"], solve["velocity"]
    (nx, ny, nz), (ox, oy, _), (sx, sy, sz) = grid["dims"], grid["origin"], grid["spacing"]
    ground = float(vertices[:, 2].min())

    # x-fastest, the order the renderers' 3D textures take.
    zs, ys, xs = np.meshgrid(ground + np.arange(nz) * sz, oy + np.arange(ny) * sy, ox + np.arange(nx) * sx, indexing="ij")
    targets = np.column_stack([xs.ravel(), ys.ravel(), zs.ravel()])
    sampled = np.column_stack([interpolate(vertices, velocity[:, i], targets) for i in range(3)]).astype(np.float32)
    speed = np.linalg.norm(sampled, axis=1).astype(np.float32)

    OUT.mkdir(parents=True, exist_ok=True)
    speed.tofile(OUT / "speed.f32")
    lo, hi = (float(v) for v in np.percentile(speed, [2, 98]))
    equations = meta["args"]["equations"]
    source = (f"dtcc-sim urban_wind_simulation ({equations}), {meta['args']['wind_speed']} m/s from "
              f"{meta['args']['wind_dir_deg']:.0f} deg, {meta['args']['mesh_max_mesh_size']:.0f} m mesh, "
              f"{meta['vertices']} vertices; resampled to {nx}x{ny}x{nz}")
    if equations == "stokes":
        source += ". Stokes: stationary, no inertia, so flow routed around buildings, not turbulent wind"
    field = {
        "crs": grid["crs"], "dims": grid["dims"], "order": "x-fastest",
        # z relative to the mesh's lowest ground, which the page draws at 0.
        "origin": [ox, oy, 0.0], "spacing": grid["spacing"],
        "speed_range": [lo, hi], "speed_min_max": [float(speed.min()), float(speed.max())],
        "ground_z": ground, "source": source, "solve": meta,
    }
    (OUT / "field.json").write_text(json.dumps(field, indent=2) + "\n")
    print(f"sample_wind: {speed.size} cells, speed {speed.min():.2f}-{speed.max():.2f} m/s "
          f"(2-98%: {lo:.2f}-{hi:.2f}), ground z {ground:.1f} m")


if __name__ == "__main__":
    main()
