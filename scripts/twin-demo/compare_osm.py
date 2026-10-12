"""Page 21's comparison: each of dtcc-core's buildings against the basemap's OpenStreetMap buildings.

Reads core's city mesh (.cache/twin-demo/city-mesh/, export_city_mesh.py, plus sample_surface.py's ground.f32),
the basemap's buildings (.cache/twin-demo/osm/buildings.geojson, fetch_osm_buildings.ts) and the Lantmäteriet boxes
page 21 extrudes (public/data/twin-demo/buildings.json). All three go onto one 1 m grid as height above ground, so
buildings clipped at tile edges, building parts and blocks with several roof levels need no polygon matching:
each core building is compared cell by cell over its own footprint.

Writes public/data/twin-demo/compare/:

- compare.json, per core building and in total, what an agent or the page needs to say where core and OSM disagree;
- delta.f32, per vertex of core's city.obj, the building's core-minus-OSM height in m, NaN where there is nothing
  to compare (terrain, no OSM building there, or OSM has no height for it).

    .venv/bin/python scripts/twin-demo/compare_osm.py
"""

import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import shapely
import shapely.geometry
from pyproj import Transformer
from scipy import ndimage

from sample_surface import MESH, building_parts, read_core_mesh

REPO = Path(__file__).resolve().parents[2]
OSM = REPO / ".cache" / "twin-demo" / "osm" / "buildings.geojson"
CORE = REPO / "public" / "data" / "twin-demo" / "core-mesh"
BOXES = REPO / "public" / "data" / "twin-demo" / "buildings.json"
OUT = REPO / "public" / "data" / "twin-demo" / "compare"
CELL_M = 1.0
# OpenMapTiles' render_height is ceil(COALESCE(height, levels * 3.66, 5)) (openmaptiles layers/building/building.sql):
# 5 is what a building with neither a height nor a levels tag gets. A 5 m comparison would measure that default.
OSM_DEFAULT_M = 5
MIN_COVER = 0.5  # a core building OSM covers less than half of has no OSM counterpart to compare with
MIN_GAP_M2 = 20  # OSM buildings with no core building under them, ignored below this (edge slivers)


def grid(bounds):
    x0, y0, x1, y1 = bounds
    nx, ny = int(round((x1 - x0) / CELL_M)), int(round((y1 - y0) / CELL_M))
    return x0 + (np.arange(nx) + 0.5) * CELL_M, y0 + (np.arange(ny) + 0.5) * CELL_M


def burn_polygons(polygons, heights, xs, ys):
    """Max height of the polygons covering each cell centre, 0 where none does."""
    out = np.zeros((len(ys), len(xs)), np.float32)
    for polygon, height in zip(polygons, heights):
        x0, y0, x1, y1 = polygon.bounds
        i0, i1 = np.searchsorted(xs, [x0, x1])
        j0, j1 = np.searchsorted(ys, [y0, y1])
        if i0 >= i1 or j0 >= j1:
            continue
        gx, gy = np.meshgrid(xs[i0:i1], ys[j0:j1])
        inside = shapely.contains_xy(polygon, gx, gy)
        block = out[j0:j1, i0:i1]
        block[inside] = np.maximum(block[inside], height)
    return out


def burn_roofs(vertices, height, faces, label, xs, ys):
    """Core's roofs: height above ground, interpolated across each up-facing triangle, and its building per cell."""
    surface = np.zeros((len(ys), len(xs)), np.float32)
    owner = np.full((len(ys), len(xs)), -1, np.int64)
    for face in faces:
        p = vertices[face, :2]
        x0, y0 = p.min(axis=0)
        x1, y1 = p.max(axis=0)
        i0, i1 = np.searchsorted(xs, [x0, x1])
        j0, j1 = np.searchsorted(ys, [y0, y1])
        if i0 >= i1 or j0 >= j1:
            continue
        gx, gy = np.meshgrid(xs[i0:i1], ys[j0:j1])
        (ax, ay), (bx, by), (cx, cy) = p
        det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        w0 = ((by - cy) * (gx - cx) + (cx - bx) * (gy - cy)) / det
        w1 = ((cy - ay) * (gx - cx) + (ax - cx) * (gy - cy)) / det
        w2 = 1 - w0 - w1
        inside = (w0 >= -1e-9) & (w1 >= -1e-9) & (w2 >= -1e-9)
        z = w0 * height[face[0]] + w1 * height[face[1]] + w2 * height[face[2]]
        block, who = surface[j0:j1, i0:i1], owner[j0:j1, i0:i1]
        higher = inside & (z > block)
        block[higher] = z[higher]
        who[higher] = label[face[0]]
    return surface, owner


def main():
    vertices, faces, markers = read_core_mesh()
    ground = np.fromfile(CORE / "ground.f32", np.float32).astype(np.float64)
    if len(ground) != len(vertices):
        raise SystemExit("compare_osm: ground.f32 does not match city.obj; re-run sample_surface.py")
    part, ids = building_parts(vertices, faces, markers)
    bounds = json.loads((MESH / "city.meta.json").read_text())["bounds"]  # export_city_mesh.py's area
    xs, ys = grid(bounds)

    edge1, edge2 = vertices[faces[:, 1]] - vertices[faces[:, 0]], vertices[faces[:, 2]] - vertices[faces[:, 0]]
    normal = np.cross(edge1, edge2)
    up = normal[:, 2] / (np.linalg.norm(normal, axis=1) + 1e-12) > 0.5
    roofs = faces[(markers >= 0) & up]
    core, owner = burn_roofs(vertices, vertices[:, 2] - ground, roofs, part, xs, ys)

    osm_json = json.loads(OSM.read_text())
    to_sweref = Transformer.from_crs(4326, 3006, always_xy=True)
    pieces, heights = [], []
    for feature in osm_json["features"]:
        props = feature["properties"]
        if props.get("hide_3d"):
            continue  # an outline whose parts are drawn instead: the basemap doesn't extrude it either
        geometry = shapely.transform(shapely.geometry.shape(feature["geometry"]),
                                     lambda c: np.column_stack(to_sweref.transform(c[:, 0], c[:, 1])))
        pieces.append(shapely.make_valid(geometry))
        heights.append(float(props["render_height"]))
    osm = burn_polygons(pieces, heights, xs, ys)

    boxes_json = json.loads(BOXES.read_text())
    lm = burn_polygons([shapely.Polygon(b["ring"]) for b in boxes_json["buildings"]],
                       [b["height"] for b in boxes_json["buildings"]], xs, ys)

    to_lonlat = Transformer.from_crs(3006, 4326, always_xy=True)
    rows, delta_by_part = [], {}
    for p in np.unique(owner[owner >= 0]):
        cells = owner == p
        area = int(cells.sum())
        covered = cells & (osm > 0)
        known = covered & (osm != OSM_DEFAULT_M)
        cover = covered.sum() / area
        jj, ii = np.nonzero(cells)
        cx, cy = float(xs[ii].mean()), float(ys[jj].mean())
        lon, lat = to_lonlat.transform(cx, cy)
        row = {
            "id": int(p), "centre_sweref": [round(cx, 1), round(cy, 1)], "centre_lonlat": [round(lon, 6), round(lat, 6)],
            "footprint_m2": area,
            "core_height_m": {"mean": round(float(core[cells].mean()), 1), "max": round(float(core[cells].max()), 1)},
            "osm_cover": round(float(cover), 2),
            "osm_height_m": round(float(osm[covered].mean()), 1) if covered.any() else None,
            "osm_default_share": round(float(1 - known.sum() / covered.sum()), 2) if covered.any() else None,
            "lm_height_m": round(float(lm[cells & (lm > 0)].mean()), 1) if (cells & (lm > 0)).any() else None,
        }
        if cover < MIN_COVER:
            row["status"] = "no OSM building"
        elif known.sum() < 0.5 * covered.sum():
            row["status"] = "OSM has no height"
        else:
            row["status"] = "compared"
            row["delta_m"] = round(float((core[known] - osm[known]).mean()), 1)
            delta_by_part[int(p)] = row["delta_m"]
        rows.append(row)

    # OSM buildings with no core building under them.
    gaps, count = ndimage.label((osm > 0) & (owner < 0))
    missing = []
    for k, sl in enumerate(ndimage.find_objects(gaps), start=1):
        blob = gaps[sl] == k
        if blob.sum() < MIN_GAP_M2:
            continue
        jj, ii = np.nonzero(blob)
        cx, cy = float(xs[sl[1]][ii].mean()), float(ys[sl[0]][jj].mean())
        lon, lat = to_lonlat.transform(cx, cy)
        missing.append({"centre_sweref": [round(cx, 1), round(cy, 1)], "centre_lonlat": [round(lon, 6), round(lat, 6)],
                        "area_m2": int(blob.sum()), "osm_height_m": round(float(osm[sl][blob].max()), 1),
                        "in_lm_boxes": bool((lm[sl][blob] > 0).mean() >= 0.5),
                        # cut by the area's edge: core keeps only buildings inside it, so these are a bounds effect
                        "at_edge": bool(sl[0].start == 0 or sl[1].start == 0 or sl[0].stop == len(ys) or sl[1].stop == len(xs))})
    missing.sort(key=lambda m: -m["area_m2"])

    delta = np.full(len(vertices), np.nan, np.float32)
    for p, d in delta_by_part.items():
        delta[part == p] = d
    delta[np.setdiff1d(np.arange(len(vertices)), ids)] = np.nan  # terrain

    compared = [r["delta_m"] for r in rows if r["status"] == "compared"]
    summary = {
        "core_buildings": len(rows),
        "compared": len(compared),
        "osm_has_no_height": sum(r["status"] == "OSM has no height" for r in rows),
        "no_osm_building": sum(r["status"] == "no OSM building" for r in rows),
        "delta_m": {"median": round(float(np.median(compared)), 1),
                    "abs_median": round(float(np.median(np.abs(compared))), 1),
                    "over_5m": int(np.sum(np.abs(compared) > 5))} if compared else None,
        "footprint_overlap": {
            "core_m2": int((owner >= 0).sum()), "osm_m2": int((osm > 0).sum()),
            "both_m2": int(((owner >= 0) & (osm > 0)).sum()),
        },
        "osm_buildings_not_in_core": len(missing),
        "osm_not_in_core_m2": int(sum(m["area_m2"] for m in missing)),
        "osm_not_in_core_at_edge": sum(m["at_edge"] for m in missing),
        "osm_not_in_core_at_edge_m2": int(sum(m["area_m2"] for m in missing if m["at_edge"])),
    }
    OUT.mkdir(parents=True, exist_ok=True)
    delta.tofile(OUT / "delta.f32")
    (OUT / "compare.json").write_text(json.dumps({
        "crs": "EPSG:3006", "bounds": bounds, "cell_m": CELL_M,
        "method": ("Heights above ground on a 1 m grid. core: dtcc-core city surface mesh roofs minus sample_surface.py's "
                   "ground. osm: the basemap's render_height (OpenMapTiles: ceil(height, else levels x 3.66, else 5)); "
                   f"cells at exactly {OSM_DEFAULT_M} m are treated as OSM having no height. lm: page 21's Lantmäteriet "
                   f"boxes (dtcc-core buildings). A core building needs OSM over {MIN_COVER:.0%} of its footprint to be "
                   "compared. delta = core - osm, mean over cells where OSM has a height."),
        "osm_source": osm_json["source"], "osm_attribution": osm_json["attribution"], "osm_fetched_at": osm_json["fetched_at"],
        "summary": summary, "buildings": rows, "osm_not_in_core": missing,
        "built_at": datetime.now(timezone.utc).isoformat(),
    }, indent=1) + "\n")
    print(json.dumps(summary, indent=1))


if __name__ == "__main__":
    main()
