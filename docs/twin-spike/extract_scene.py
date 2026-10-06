"""Buildings (LoD1, heights) and a smoke field for the Atlas demo area, as plain JSON/binary."""
import json, sys
from pathlib import Path
import numpy as np
from dtcc_core.datasets.registry import get_dataset

out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
area = json.loads(Path("/area.json").read_text())
b = area["bounds"]

bc = get_dataset("buildings")(bounds=b)
blds, no_height, srcs = [], 0, {}
probe = None
for bld in bc.buildings if hasattr(bc, "buildings") else bc:
    fp = bld.get_footprint()
    if fp is None: continue
    v = np.asarray(fp.vertices)
    if len(v) < 3: continue
    ground = float(v[:, 2].min()) if v.shape[1] > 2 else 0.0
    h, src = None, None
    for name in ("height", "estimated_height", "measured_height"):
        val = getattr(bld, name, None)
        if isinstance(val, (int, float)) and val > 0: h, src = float(val), name; break
    if h is None:
        val = (bld.attributes or {}).get("height") if hasattr(bld, "attributes") else None
        if isinstance(val, (int, float)) and val > 0: h, src = float(val), "attributes.height"
    if h is None and getattr(bld, "lod1", None) is not None:
        bb = bld.lod1.bounds
        zmax = getattr(bb, "zmax", None)
        if zmax is not None and zmax - ground > 0: h, src = float(zmax - ground), "lod1.bounds"
    if probe is None: probe = {"src": src, "height": bld.height, "est": getattr(bld, "estimated_height", None),
                               "meas": getattr(bld, "measured_height", None), "attrs": dict(list((bld.attributes or {}).items())[:8]),
                               "lod1_bounds": str(getattr(getattr(bld, "lod1", None), "bounds", None))}
    srcs[src] = srcs.get(src, 0) + 1
    if h is None or h <= 0:
        no_height += 1
        continue
    blds.append({"ring": [[round(float(x), 2), round(float(y), 2)] for x, y in v[:, :2]],
                 "height": round(float(h), 2), "ground": round(ground, 2)})
print("probe", probe); print("height sources", srcs)
print("no usable height", no_height)
(out / "buildings.json").write_text(json.dumps({"crs": "EPSG:3006", "bounds": b, "buildings": blds}))
print("buildings", len(blds), "heights", min(x["height"] for x in blds), max(x["height"] for x in blds))

vm = get_dataset("smoke")(bounds=b, resolution=64, zmin=0.0, zmax=100.0)
v = np.asarray(vm.vertices)
xs, ys, zs = (np.unique(np.round(v[:, i], 4)) for i in range(3))
dims = (len(xs), len(ys), len(zs))
print("smoke dims", dims, "bounds", [float(xs[0]), float(ys[0]), float(zs[0]), float(xs[-1]), float(ys[-1]), float(zs[-1])])
assert dims[0] * dims[1] * dims[2] == len(v), "not a full lattice"
# Index of each vertex in x-fastest (VTK / WebGL 3D texture) order.
ix = np.searchsorted(xs, np.round(v[:, 0], 4)); iy = np.searchsorted(ys, np.round(v[:, 1], 4)); iz = np.searchsorted(zs, np.round(v[:, 2], 4))
lin = ix + dims[0] * (iy + dims[1] * iz)
print("already x-fastest:", bool((lin == np.arange(len(v))).all()))
fields = {f.name: np.asarray(f.values) for f in vm.fields}
speed = np.empty(len(v), np.float32); speed[lin] = fields["speed"].reshape(-1)
vel = np.empty((len(v), 3), np.float32); vel[lin] = fields["velocity"]
speed.tofile(out / "speed.f32"); vel.tofile(out / "velocity.f32")
(out / "field.json").write_text(json.dumps({"crs": "EPSG:3006", "dims": dims, "order": "x-fastest",
    "origin": [float(xs[0]), float(ys[0]), float(zs[0])],
    "spacing": [float(xs[1] - xs[0]), float(ys[1] - ys[0]), float(zs[1] - zs[0])],
    "speed_range": [float(speed.min()), float(speed.max())], "files": {"speed": "speed.f32", "velocity": "velocity.f32"},
    "source": "dtcc-core smoke dataset (synthetic, analytic), resolution 64, z 0-100 m"}))
print("speed range", float(speed.min()), float(speed.max()))
