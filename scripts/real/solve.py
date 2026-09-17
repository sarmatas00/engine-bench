#!/usr/bin/env python
"""Runs INSIDE the dtcc-sim container. Solves urban heat over the bench tile.

Reads /out/dataset.json for the bounds, writes /out/heat.{xdmf,h5},
/out/heat.meta.json and /out/heat.pre.f64. The meta and the raw values are
written BEFORE save_volume_mesh so the native side can measure what the
save -> load round trip (dtcc-core#85) preserved.
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))   # /work, mounted beside solve.py
import benchio

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


def patch_terrain_raster_classification():
    """Apply the R6 classification cast inside the container, at Core's boundary.

    The upstream regression this works around is not confined to our stage 1.
    `dtcc_sim.urban_heat` builds its own city through
    `dtcc_core.datasets.city_volume_mesh` -> `prepare_city_from_bounds` ->
    `build_terrain_raster(ground_only=True)`, which is several layers inside the
    image and cannot be handed a pre-built city. Container Core (5ca2ca4) has
    the same guard as native Core (4c8d621), so stage 2 fails in exactly the
    same place for exactly the same reason:

        ValueError: ground_only=True requires one integer LAS classification per point

    So we wrap `build_terrain_raster` where `_city_mesh_common` looks it up, and
    repair the dtype on the way in. Same cast, same rule, same never-round
    guarantee as stage 1 -- see `benchio.integer_classification` and the issue
    draft at docs/upstream/dtcc-core-classification-dtype.md.

    Delete this together with the native workaround once the upstream fix lands.
    """
    import dtcc_core

    original = dtcc_core.builder.build_terrain_raster

    def build_terrain_raster(pointcloud, *args, **kwargs):
        return original(benchio.integer_classification(pointcloud), *args, **kwargs)

    dtcc_core.builder.build_terrain_raster = build_terrain_raster
    print("solve: patched build_terrain_raster for the classification dtype regression (R6)",
          flush=True)


def main():
    meta = json.loads((OUT / "dataset.json").read_text())
    bounds = [float(v) for v in meta["bounds"]]
    print(f"solve: {meta['name']} {bounds}", flush=True)

    patch_terrain_raster_classification()

    from dtcc_sim.datasets import UrbanHeatSimulationDataset
    from dtcc_core.io import save_volume_mesh

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
        "dtcc_core_revision": benchio.distribution_revision("dtcc-core"),
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
