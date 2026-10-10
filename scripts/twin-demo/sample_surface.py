"""Page 21's heatmap: dtcc-core's city surface mesh, coloured by the dtcc-sim wind near each surface.

Reads .cache/twin-demo/city-mesh/ (export_city_mesh.py) and a wind solve (.cache/twin-demo/<WIND_RUN>/wind.*), and
writes public/data/twin-demo/core-mesh/:

- city.obj, core's OBJ byte for byte: the page draws core's own file;
- ground.f32, per vertex, the ground height to subtract, since page 21 draws the map flat and the area has 57 m of
  relief. Terrain vertices and the wall bottoms standing on it get their own z (so 0); every other building vertex
  gets its building's lowest wall bottom, which keeps roofs flat;
- speed.f32, per vertex, the wind speed OFFSET_M along the surface normal. At the surface itself it is 0 (no-slip);
- mesh.json, what the page needs to say about it.

    WIND_RUN=ns-270 .venv/bin/python scripts/twin-demo/sample_surface.py
"""

import json
import os
import shutil
import sys
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts" / "real"))
from sample_field import interpolate  # noqa: E402

MESH = REPO / ".cache" / "twin-demo" / "city-mesh"
SOLVE = REPO / ".cache" / "twin-demo" / os.environ.get("WIND_RUN", "ns-270")
OUT = REPO / "public" / "data" / "twin-demo" / "core-mesh"
OFFSET_M = 2.0  # pedestrian height, the usual height for wind comfort


def read_obj(path):
    vertices, faces = [], []
    for line in path.read_text().splitlines():
        if line.startswith("v "):
            vertices.append([float(x) for x in line.split()[1:4]])
        elif line.startswith("f "):
            faces.append([int(x.split("/")[0]) - 1 for x in line.split()[1:4]])
    return np.array(vertices), np.array(faces)


def main():
    vertices, faces = read_obj(MESH / "city.obj")
    markers = np.fromfile(MESH / "city.markers.i32", np.int32)
    if len(markers) != len(faces):
        sys.exit(f"sample_surface: {len(markers)} markers for {len(faces)} faces; re-run export_city_mesh.py")
    solve_meta = json.loads((SOLVE / "wind.meta.json").read_text())
    if not solve_meta.get("plausible"):
        sys.exit(f"sample_surface: refusing an implausible solve ({solve_meta.get('problems')})")

    on_ground = np.zeros(len(vertices), bool)
    on_ground[np.unique(faces[markers == -2])] = True
    ground = vertices[:, 2].copy()
    # trap: a building's roof and walls carry DIFFERENT markers, and the roof touches no terrain. Per marker, a roof's
    # "lowest point" is the roof itself, which put every roof on the ground. Group by connectivity instead: one
    # building is its roof and walls joined through shared vertices (or vertices at the same place).
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import connected_components
    building = faces[markers >= 0]
    edges = [building[:, [0, 1]], building[:, [1, 2]]]
    ids = np.unique(building)
    _, first = np.unique(np.round(vertices[ids], 2), axis=0, return_inverse=True)
    twins = np.full(first.max() + 1, -1)
    twins[first] = ids  # one representative per position
    edges.append(np.column_stack([ids, twins[first]]))
    edges = np.vstack(edges)
    n = len(vertices)
    _, part = connected_components(coo_matrix((np.ones(len(edges)), (edges[:, 0], edges[:, 1])), shape=(n, n)), directed=False)
    for p in np.unique(part[ids]):
        members = ids[part[ids] == p]
        base = members[on_ground[members]]
        ground[members[~on_ground[members]]] = vertices[base if base.size else members, 2].min()
    buildings_count = int(len(np.unique(part[ids])))

    # Roofs must stay up: no up-facing building face may end on the flat map.
    up = np.cross(vertices[faces[:, 1]] - vertices[faces[:, 0]], vertices[faces[:, 2]] - vertices[faces[:, 0]])[:, 2] > 0
    flat = (markers >= 0) & up & ((vertices[:, 2] - ground)[faces].max(axis=1) < 1.0)
    if flat.any():
        sys.exit(f"sample_surface: {int(flat.sum())} roof triangles flattened onto the ground")

    face_normals = np.cross(vertices[faces[:, 1]] - vertices[faces[:, 0]], vertices[faces[:, 2]] - vertices[faces[:, 0]])
    normals = np.zeros_like(vertices)
    for i in range(3):
        np.add.at(normals, faces[:, i], face_normals)
    normals /= np.linalg.norm(normals, axis=1, keepdims=True) + 1e-12

    solve = np.load(SOLVE / "wind.npz")
    probes = vertices + normals * OFFSET_M
    velocity = np.column_stack([interpolate(solve["vertices"], solve["velocity"][:, i], probes) for i in range(3)])
    speed = np.linalg.norm(velocity, axis=1).astype(np.float32)

    OUT.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(MESH / "city.obj", OUT / "city.obj")
    ground.astype(np.float32).tofile(OUT / "ground.f32")
    speed.tofile(OUT / "speed.f32")
    lo, hi = (float(v) for v in np.percentile(speed, [2, 98]))
    export = json.loads((MESH / "city.meta.json").read_text())
    args = solve_meta["args"]
    meta = {
        "crs": "EPSG:3006", "vertices": int(len(vertices)), "triangles": int(len(faces)),
        "buildings": buildings_count,
        "speed_range": [lo, hi], "offset_m": OFFSET_M,
        "source": (f"dtcc-core city surface mesh (core defaults, {len(faces)} triangles). Colour: dtcc-sim wind "
                   f"({args['equations']}, {args['wind_speed']:.0f} m/s from {args['wind_dir_deg']:.0f} deg) "
                   f"{OFFSET_M:g} m off each surface, scaled to its own 2-98% range ({lo:.2f}-{hi:.2f} m/s): "
                   f"where the wind reaches surfaces, not pedestrian wind speeds"),
        "export": export, "solve": {k: solve_meta[k] for k in ("args", "diagnostics", "solved_at") if k in solve_meta},
    }
    (OUT / "mesh.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(f"sample_surface: {len(vertices)} vertices, {meta['buildings']} buildings, speed 2-98% {lo:.2f}-{hi:.2f} m/s; "
          f"ground-flattened height max {float((vertices[:, 2] - ground).max()):.1f} m, "
          f"min {float((vertices[:, 2] - ground).min()):.2f} m")


if __name__ == "__main__":
    main()
