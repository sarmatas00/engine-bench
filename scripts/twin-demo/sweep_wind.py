#!/usr/bin/env python
"""Runs INSIDE dtcc-sim (>= c46f34e). One urban_wind_simulation on dtcc-sim#12's 200 m box, settings by name.

    docker run ... dtcc-sim:develop-41055d5 python /work/sweep_wind.py <config>

Prints one JSON line: the settings, dtcc-sim's own diagnostics, the speed range and the plausibility verdict.
The point is to find settings under which the default Navier-Stokes solve stops diverging (dtcc-sim#12 lists
eddy viscosity, an inlet ramp and slip side/top boundaries as untested).
"""

import json
import sys
import time

import numpy as np

sys.path.insert(0, "/real")
import core_compat  # noqa: E402

sys.path.insert(0, "/work")
from solve_wind import plausibility  # noqa: E402

BOX = [319891.0, 6399790.0, 320091.0, 6399990.0]  # dtcc-sim#12's reproduction box, EPSG:3006
BASE = dict(wind_speed=5.0, wind_dir_deg=270.0, equations="navier_stokes", simulation_mode="steady", max_steps=600)
CONFIGS = {
    "default": {},  # dt 0.2, nu_t 0, no ramp, open side/top: #12's failing case
    "small-dt": dict(dt=0.05),
    "nut1-ramp": dict(dt=0.05, nu_t=1.0, inlet_ramp_steps=50),
    "nut5-ramp": dict(dt=0.05, nu_t=5.0, inlet_ramp_steps=50),
    "nut1-ramp-slip": dict(dt=0.05, nu_t=1.0, inlet_ramp_steps=50, side_top_boundary="slip"),
    "nut5-ramp-slip": dict(dt=0.05, nu_t=5.0, inlet_ramp_steps=50, side_top_boundary="slip"),
    "stokes": dict(equations="stokes"),
    "stokes-slip": dict(equations="stokes", side_top_boundary="slip"),
}


def main(name):
    core_compat.patch_terrain_raster_classification()
    from dtcc_sim.datasets import UrbanWindSimulationDataset

    args = {**BASE, **CONFIGS[name]}
    if args["equations"] == "stokes":
        args = {k: v for k, v in args.items() if k not in ("simulation_mode", "max_steps")}
    t0 = time.time()
    mesh = UrbanWindSimulationDataset()(bounds=BOX, format=None, **args)
    fields = {f.name: np.asarray(f.values) for f in mesh.fields}
    velocity = next(v for k, v in fields.items() if "veloc" in k.lower()).reshape(len(mesh.vertices), -1)
    speed = np.linalg.norm(velocity, axis=1)
    diagnostics = dict((getattr(mesh, "attributes", None) or {}).get("simulation_diagnostics")
                       or getattr(mesh, "simulation_diagnostics", None) or {})
    keep = ("stop_reason", "steps", "time_s", "relative_update", "divergence_rms", "flux_imbalance", "cfl")
    solves = diagnostics.get("linear_solves") or {}
    print("SWEEP " + json.dumps({
        "config": name, "args": args, "seconds": round(time.time() - t0, 1), "vertices": len(mesh.vertices),
        "speed": {"max": float(np.nanmax(speed)), "p99": float(np.nanpercentile(speed, 99)),
                  "mean": float(np.nanmean(speed))},
        "diagnostics": {k: diagnostics.get(k) for k in keep},
        "linear_solves": json.loads(json.dumps(solves, default=str)),
        "problems": plausibility(speed, diagnostics, args, np.asarray(mesh.vertices)),
    }), flush=True)


if __name__ == "__main__":
    main(sys.argv[1])
