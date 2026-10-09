"""Resample the wind solve (.cache/twin-demo/wind.npz, from solve_wind.py) onto page 21's volume grid.

Same dims, x/y origin and spacing as the smoke field (public/data/twin-demo/field.json), so the page swaps one for
the other. z follows the terrain: page 21 draws the map and buildings flat, and the tile has 57 m of relief, so grid
level k sits k * spacing above the local ground (the lowest mesh vertex within 15 m). Interpolation is
scripts/real/sample_field.py's: linear inside the mesh, nearest outside.

    .venv/bin/python scripts/twin-demo/sample_wind.py          # .cache/twin-demo/wind.*
    WIND_RUN=ns-270 .venv/bin/python scripts/twin-demo/sample_wind.py   # .cache/twin-demo/ns-270/wind.*
"""

import json
import os
import sys
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts" / "real"))
from sample_field import interpolate  # noqa: E402

SOLVE = REPO / ".cache" / "twin-demo" / os.environ.get("WIND_RUN", "")
SMOKE = REPO / "public" / "data" / "twin-demo" / "field.json"
OUT = REPO / "public" / "data" / "twin-demo" / "wind"


def main():
    solve = np.load(SOLVE / "wind.npz")
    meta = json.loads((SOLVE / "wind.meta.json").read_text())
    if not meta.get("plausible"):
        sys.exit(f"sample_wind: refusing an implausible solve ({meta.get('problems')}); see dtcc-sim#12")
    grid = json.loads(SMOKE.read_text())
    vertices, velocity = solve["vertices"], solve["velocity"]
    (nx, ny, nz), (ox, oy, _), (sx, sy, sz) = grid["dims"], grid["origin"], grid["spacing"]
    from scipy.spatial import cKDTree
    xs2, ys2 = np.meshgrid(ox + np.arange(nx) * sx, oy + np.arange(ny) * sy, indexing="xy")
    columns = np.column_stack([xs2.ravel(), ys2.ravel()])
    tree = cKDTree(vertices[:, :2])
    ground_xy = np.array([vertices[tree.query_ball_point(p, 15.0) or [tree.query(p)[1]], 2].min() for p in columns])

    # x-fastest, the order the renderers' 3D textures take: x within y within z.
    heights = np.arange(nz) * sz
    targets = np.column_stack([np.tile(columns, (nz, 1)), (ground_xy[None, :] + heights[:, None]).ravel()])
    sampled = np.column_stack([interpolate(vertices, velocity[:, i], targets) for i in range(3)]).astype(np.float32)
    speed = np.linalg.norm(sampled, axis=1).astype(np.float32)

    # The flow must cross the area: 30-60 m above local ground, in the middle half of the tile.
    cells = speed.reshape(nz, ny, nx)
    band = cells[(heights >= 30) & (heights <= 60)][:, ny // 4:3 * ny // 4, nx // 4:3 * nx // 4]
    if float(np.median(band)) < 0.2 * meta["args"]["wind_speed"]:
        sys.exit(f"sample_wind: flow doesn't cross the area (median {float(np.median(band)):.2f} m/s 30-60 m up)")

    # Where the air actually comes from aloft (60-100 m, middle half), which needn't be the requested direction:
    # dtcc-sim lets air in through one bbox face only, so a diagonal wind turns toward that face's normal.
    aloft = (heights >= 60) & (heights <= 100)
    uv = sampled.reshape(nz, ny, nx, 3)[aloft][:, ny // 4:3 * ny // 4, nx // 4:3 * nx // 4, :2].reshape(-1, 2)
    measured_from = float((np.degrees(np.arctan2(np.median(uv[:, 0]), np.median(uv[:, 1]))) + 180) % 360)

    OUT.mkdir(parents=True, exist_ok=True)
    speed.tofile(OUT / "speed.f32")
    lo, hi = (float(v) for v in np.percentile(speed, [2, 98]))
    equations = meta["args"]["equations"]
    source = (f"dtcc-sim wind ({equations}), {meta['args']['wind_speed']:.0f} m/s from "
              f"{meta['args']['wind_dir_deg']:.0f} deg, {meta['args']['side_top_boundary']} side/top, "
              f"{meta['args']['mesh_domain_height']:.0f} m domain, {meta['vertices']} vertices. "
              f"Measured 60-100 m up: from {measured_from:.0f} deg")
    if meta["args"]["wind_dir_deg"] % 90:
        source += " (dtcc-sim lets a diagonal wind in through one side of its box only)"
    if equations == "stokes":
        source += ". Stokes approximation: the routing of air around and over buildings, not real speeds; far too slow near the ground"
    else:
        # A constant eddy viscosity (nu_t) and no-slip walls: right above the roofs, near-still air in the streets.
        source += (f". Navier-Stokes, settled (relative change {meta['diagnostics']['convergence']['relative_update']:.0e}). "
                   f"Constant eddy viscosity {meta['args']['nu_t']:g} m2/s: far too slow below roof height")
    field = {
        "crs": grid["crs"], "dims": grid["dims"], "order": "x-fastest",
        # z relative to the mesh's lowest ground, which the page draws at 0.
        "origin": [ox, oy, 0.0], "spacing": grid["spacing"],
        "speed_range": [lo, hi], "speed_min_max": [float(speed.min()), float(speed.max())],
        "terrain": "z is height above local ground", "source": source, "solve": meta,
    }
    (OUT / "field.json").write_text(json.dumps(field, indent=2) + "\n")
    print(f"sample_wind: {speed.size} cells, speed {speed.min():.2f}-{speed.max():.2f} m/s "
          f"(2-98%: {lo:.2f}-{hi:.2f}); median 30-60 m up {float(np.median(band)):.2f} m/s; "
          f"from {measured_from:.0f} deg 60-100 m up")


if __name__ == "__main__":
    main()
