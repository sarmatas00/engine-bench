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
# The Navier-Stokes defaults (25 m mesh, dt 0.2) ran out of Docker memory and diverged (CFL 55-68) on 2026-10-06.
EQUATIONS = os.environ.get("EQUATIONS", "stokes")
ARGS = dict(
    wind_speed=5.0,
    wind_dir_deg=225.0,          # from the south-west, Gothenburg's prevailing wind
    inlet_profile="power_law",
    mesh_max_mesh_size=float(os.environ.get("MESH_SIZE", "40")),
    mesh_domain_height=80.0,
    equations=EQUATIONS,
    **({} if EQUATIONS == "stokes" else dict(simulation_mode="steady", dt=float(os.environ.get("DT", "0.02")),
                                              inlet_ramp_steps=20, max_steps=int(os.environ.get("MAX_STEPS", "400")))),
)


def patch_dolfinx_assemble_matrix_mat():
    """dtcc-sim's urban_wind.py calls fem.petsc.assemble_matrix_mat, gone in dolfinx 0.11 (the image's version).

    0.11 assembles into an existing matrix through the PETSc.Mat overload of assemble_matrix, same arguments.
    """
    import dolfinx.fem.petsc as fem_petsc
    if not hasattr(fem_petsc, "assemble_matrix_mat"):
        fem_petsc.assemble_matrix_mat = lambda A, a, bcs=None, **kw: fem_petsc.assemble_matrix(A, a, bcs=bcs, **kw)
        print("solve_wind: aliased dolfinx.fem.petsc.assemble_matrix_mat for dolfinx 0.11", flush=True)


def main():
    core_compat.patch_terrain_raster_classification()
    patch_dolfinx_assemble_matrix_mat()
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
    meta = {
        "bounds": BOUNDS, "crs": "EPSG:3006", "args": ARGS,
        "vertices": int(len(mesh.vertices)), "cells": int(len(mesh.cells)),
        "fields": {k: list(np.asarray(v).shape) for k, v in fields.items()},
        "speed": {"min": float(speed.min()), "max": float(speed.max()), "mean": float(speed.mean())},
        "solve_seconds": round(seconds, 1),
        "dtcc_core_revision": benchio.distribution_revision("dtcc-core"),
        "dtcc_sim_revision": benchio.distribution_revision("dtcc-sim"),
        "solved_at": datetime.now(timezone.utc).isoformat(),
    }
    (OUT / "wind.meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(f"solve_wind: speed {meta['speed']}", flush=True)


if __name__ == "__main__":
    main()
