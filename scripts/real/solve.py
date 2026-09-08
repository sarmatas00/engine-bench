#!/usr/bin/env python
"""Runs INSIDE the dtcc-sim container. Solves urban heat over the bench tile.

Reads /out/dataset.json for the bounds, writes /out/heat.{xdmf,h5},
/out/heat.meta.json and /out/heat.pre.f64. The meta and the raw values are
written BEFORE save_volume_mesh so the native side can measure what the
save -> load round trip (dtcc-core#85) preserved.
"""

import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

OUT = Path("/out")

ARGS = dict(
    mesh_max_mesh_size=25.0,
    mesh_domain_height=80.0,
    kappa=1.0,
    sigma=0.0,
    T_ambient=18.0,
    degree=1,
    wall_bc_type="robin", wall_value=28.0, wall_h=1.0,
    roof_bc_type="robin", roof_value=32.0, roof_h=1.0,
    ground_bc_type="dirichlet", ground_value=18.0,
    open_bc_type="dirichlet", open_value=18.0,
)


def main():
    meta = json.loads((OUT / "dataset.json").read_text())
    bounds = [float(v) for v in meta["bounds"]]
    print(f"solve: {meta['name']} {bounds}", flush=True)

    from dtcc_sim.datasets import UrbanHeatSimulationDataset
    from dtcc_core.io import save_volume_mesh
    import dtcc_core

    mesh = UrbanHeatSimulationDataset()(bounds=bounds, format=None, **ARGS)

    fields = list(getattr(mesh, "fields", []) or [])
    if not fields:
        raise RuntimeError("urban_heat_simulation returned a volume mesh with no fields")
    field = next((f for f in fields if f.name == "temperature"), fields[0])
    values = np.asarray(field.values, dtype=np.float64).reshape(-1)

    heat_meta = {
        "name": meta["name"],
        "bounds": bounds,
        "vertices": int(len(mesh.vertices)),
        "cells": int(len(mesh.cells)),
        "field": {
            "name": field.name,
            "unit": getattr(field, "unit", ""),
            "dtype": str(np.asarray(field.values).dtype),
            "count": int(values.size),
            "min": float(values.min()),
            "max": float(values.max()),
            "mean": float(values.mean()),
        },
        "field_names": [f.name for f in fields],
        "args": ARGS,
        "dtcc_core_version": getattr(dtcc_core, "__version__", "unknown"),
        "solved_at": datetime.now(timezone.utc).isoformat(),
    }
    (OUT / "heat.meta.json").write_text(json.dumps(heat_meta, indent=2) + "\n")
    (OUT / "heat.pre.f64").write_bytes(np.ascontiguousarray(values, dtype=np.float64).tobytes())
    print(f"solve: {heat_meta['vertices']} vertices, {heat_meta['cells']} cells, "
          f"T {heat_meta['field']['min']:.2f}..{heat_meta['field']['max']:.2f} "
          f"{heat_meta['field']['unit']}", flush=True)

    save_volume_mesh(mesh, str(OUT / "heat.xdmf"))
    print("solve: wrote /out/heat.xdmf", flush=True)


if __name__ == "__main__":
    main()
