#!/usr/bin/env python
"""Runs INSIDE the dtcc-sim container. Solves urban wind over the Atlas demo area (Chalmers Johanneberg).

Writes /out/wind.npz (tet mesh vertices, cells, velocity, pressure) and /out/wind.meta.json. Resampling onto the
regular grid the renderers draw happens natively, in sample_wind.py.
"""

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

sys.path.insert(0, "/real")  # scripts/real, for the container's Core patch and the revision helper
import benchio
import core_compat

OUT = Path("/out")
# Atlas's demo area (dtcc-twin apps/backend/fixtures/engine/area.json), EPSG:3006.
BOUNDS = [319370.0, 6397790.0, 319996.0, 6398431.0]
import os

# EQUATIONS=stokes is dtcc-sim's stationary solve: one linear system, no inertia, so a stand-in for wind, not wind.
# Navier-Stokes defaults diverge (dtcc-sim#12). sweep_wind.py found the stable ones, now the NS defaults here:
# slip side/top (SIDE_TOP=slip), nu_t 5, a 50-step inlet ramp, dt 0.05. Needs dtcc-sim >= c46f34e
# (dolfinx 0.11, dtcc-sim#9): run in dtcc-sim:develop-41055d5 or later.
EQUATIONS = os.environ.get("EQUATIONS", "stokes")
ARGS = dict(
    wind_speed=5.0,
    wind_dir_deg=225.0,          # from the south-west, Gothenburg's prevailing wind
    inlet_profile="power_law",
    mesh_max_mesh_size=float(os.environ.get("MESH_SIZE", "40")),
    mesh_domain_height=float(os.environ.get("DOMAIN_HEIGHT", "80")),
    equations=EQUATIONS,
    side_top_boundary=os.environ.get("SIDE_TOP", "open"),
    **({} if EQUATIONS == "stokes" else dict(
        simulation_mode="steady",
        dt=float(os.environ.get("DT", "0.05")),
        nu_t=float(os.environ.get("NU_T", "5.0")),
        inlet_ramp_steps=int(os.environ.get("RAMP", "50")),
        max_steps=int(os.environ.get("MAX_STEPS", "1000")),
    )),
)


def plausibility(speed, diagnostics, args, vertices=None):
    """dtcc-sim#12: a diverged wind run still returns a normal-looking mesh. Check before anything uses it.

    Whether the flow crosses the domain is checked on the regular grid in sample_wind.py: per mesh vertex it is
    biased low, because the mesh crowds vertices against walls and ground, where the speed is near zero.
    """
    limit = 5 * args["wind_speed"]
    problems = []
    if not np.isfinite(speed).all():
        problems.append("non-finite speed")
    if float(np.nanmax(speed)) > limit:
        problems.append(f"max speed {float(np.nanmax(speed)):.1f} m/s > {limit:.0f} (5x the inlet)")
    reason = (diagnostics or {}).get("stop_reason")
    convergence = (diagnostics or {}).get("convergence") or {}
    rel, tol = convergence.get("relative_update"), convergence.get("steady_tolerance")
    # A run whose div_rms plateaus above tolerance ends at max_steps even once the flow has settled (seen on
    # dtcc-sim#12's box: rel 5e-7, div_rms flat at 0.04). Accept that only when rel itself met the tolerance.
    settled = reason == "max_steps" and rel is not None and tol is not None and rel < tol
    if reason not in (None, "steady_criteria", "statistical_stationarity", "linear_solve_converged") and not settled:
        problems.append(f"stop_reason={reason} (relative update {rel}, tolerance {tol})")
    return problems


def main():
    core_compat.patch_terrain_raster_classification()
    from dtcc_sim.datasets import UrbanWindSimulationDataset

    t0 = time.time()
    mesh = UrbanWindSimulationDataset()(bounds=BOUNDS, format=None, **ARGS)
    seconds = time.time() - t0
    fields = {f.name: np.asarray(f.values) for f in (getattr(mesh, "fields", None) or [])}
    print(f"solve_wind: {len(mesh.vertices)} vertices, {len(mesh.cells)} cells, fields {list(fields)}, "
          f"{seconds:.0f} s", flush=True)
    velocity = next((v for k, v in fields.items() if "veloc" in k.lower()), None)
    if velocity is None:
        raise RuntimeError(f"no velocity field among {list(fields)}")
    velocity = velocity.reshape(len(mesh.vertices), -1)
    pressure = next((v for k, v in fields.items() if "press" in k.lower()), None)
    np.savez_compressed(OUT / "wind.npz", vertices=np.asarray(mesh.vertices, np.float64),
                        cells=np.asarray(mesh.cells, np.int64), velocity=velocity.astype(np.float32),
                        pressure=(pressure.reshape(-1).astype(np.float32) if pressure is not None else np.zeros(0, np.float32)))
    speed = np.linalg.norm(velocity, axis=1)
    diagnostics = dict((getattr(mesh, "attributes", None) or {}).get("simulation_diagnostics")
                       or getattr(mesh, "simulation_diagnostics", None) or {})
    problems = plausibility(speed, diagnostics, ARGS, np.asarray(mesh.vertices))
    meta = {
        "bounds": BOUNDS, "crs": "EPSG:3006", "args": ARGS,
        "vertices": int(len(mesh.vertices)), "cells": int(len(mesh.cells)),
        "fields": {k: list(np.asarray(v).shape) for k, v in fields.items()},
        "speed": {"min": float(speed.min()), "max": float(speed.max()), "mean": float(speed.mean())},
        "solve_seconds": round(seconds, 1),
        "plausible": not problems, "problems": problems,
        "diagnostics": json.loads(json.dumps(diagnostics, default=str)),
        "dtcc_core_revision": benchio.distribution_revision("dtcc-core"),
        "dtcc_sim_revision": benchio.distribution_revision("dtcc-sim"),
        "solved_at": datetime.now(timezone.utc).isoformat(),
    }
    (OUT / "wind.meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(f"solve_wind: speed {meta['speed']}, plausible={not problems} {problems}", flush=True)


if __name__ == "__main__":
    main()
