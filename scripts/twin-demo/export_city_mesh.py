#!/usr/bin/env python
"""Runs INSIDE the dtcc-engine-fixtures image. Exports dtcc-core's city surface mesh for the Atlas demo area.

Page 21 extrudes core's raw footprints in the browser. This is what core itself builds instead: footprints merged,
filtered and simplified, plus the terrain, as one triangulated surface. Core's defaults, nothing tuned.

    docker run --rm --platform linux/amd64 -v $PWD/scripts/twin-demo:/work:ro -v $PWD/.cache/twin-demo/city-mesh:/out \
      -w /src/dtcc-core dtcc-engine-fixtures uv run --no-sync python /work/export_city_mesh.py

Writes /out/city.obj, /out/city.glb (and city.fbx if core's IO can) and /out/city.meta.json.
"""

import json
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

OUT = Path("/out")
# Atlas's demo area (dtcc-twin apps/backend/fixtures/engine/area.json), EPSG:3006, the same as solve_wind.py.
BOUNDS = [319370.0, 6397790.0, 319996.0, 6398431.0]


def main():
    from dtcc_core.datasets.registry import get_dataset

    t0 = time.time()
    mesh = get_dataset("city_surface_mesh")(bounds=BOUNDS)
    seconds = time.time() - t0
    vertices, faces = np.asarray(mesh.vertices), np.asarray(mesh.faces)
    markers = np.asarray(getattr(mesh, "markers", None) if getattr(mesh, "markers", None) is not None else [])
    print(f"export_city_mesh: {len(vertices)} vertices, {len(faces)} triangles in {seconds:.0f} s", flush=True)

    # The OBJ carries no markers; their order is mesh.faces', which is the OBJ's face order. -2 terrain, >= 0 buildings.
    markers.astype(np.int32).tofile(OUT / "city.markers.i32")
    files, failed = {}, {}
    # trap: core's .glb declares FLOAT / UNSIGNED_INT but writes float64 / int64 (dtcc_core/io/meshes.py, tobytes()
    # on numpy's defaults), so no glTF reader can open it. The OBJ is the file to use.
    for ext in ("obj", "glb", "fbx"):
        path = OUT / f"city.{ext}"
        try:
            mesh.save(str(path))
            files[ext] = path.stat().st_size
        except Exception as e:  # FBX needs assimp, which this image may lack: record it, don't guess
            failed[ext] = f"{type(e).__name__}: {e}"[:300]

    meta = {
        "bounds": BOUNDS, "crs": "EPSG:3006", "dataset": "city_surface_mesh", "args": "core defaults",
        "vertices": int(len(vertices)), "triangles": int(len(faces)),
        "z_range": [float(vertices[:, 2].min()), float(vertices[:, 2].max())],
        "markers": {str(int(k)): int(v) for k, v in zip(*np.unique(markers, return_counts=True))} if markers.size else None,
        "seconds": round(seconds, 1), "files": files, "failed": failed,
        "exported_at": datetime.now(timezone.utc).isoformat(),
    }
    (OUT / "city.meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(f"export_city_mesh: files {files}, failed {list(failed)}", flush=True)


if __name__ == "__main__":
    main()
