import { MercatorCoordinate } from "maplibre-gl6";
import { sweref } from "./sweref";

/**
 * Column-major matrix from the spike's local metres (SWEREF 99 TM axes, origin at `origin`, z up) to MapLibre's
 * mercator units. Affine, fitted at the origin: over the demo area the projection's curvature is under a millimetre.
 */
export function sceneToMercator(origin: [number, number]): Float64Array {
  const at = (dx: number, dy: number) => {
    const [lng, lat] = sweref.inverse([origin[0] + dx, origin[1] + dy]) as [number, number];
    return MercatorCoordinate.fromLngLat([lng, lat]);
  };
  // trap: grid north here is ~2.5 degrees off mercator north, so x and y need a full 2x2 fit, not a scale and an offset.
  const o = at(0, 0),
    east = at(1, 0),
    north = at(0, 1);
  const up = o.meterInMercatorCoordinateUnits();
  // prettier-ignore
  return new Float64Array([
    east.x - o.x, east.y - o.y, 0, 0,
    north.x - o.x, north.y - o.y, 0, 0,
    0, 0, up, 0,
    o.x, o.y, 0, 1,
  ]);
}
