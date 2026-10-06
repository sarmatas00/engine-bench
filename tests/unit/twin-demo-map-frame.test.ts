import { MercatorCoordinate } from "maplibre-gl6";
import { describe, expect, it } from "bun:test";
import { sweref } from "../../src/lib/twin-demo/sweref";
import { sceneToMercator } from "../../src/lib/twin-demo/map-frame";

// The demo area's centre on the EPSG:3006 grid, which is where the spike's local metres start.
const origin: [number, number] = [319683, 6398110.5];

function apply(m: Float64Array, [x, y, z]: [number, number, number]) {
  return [0, 1, 2].map((r) => m[r]! * x + m[4 + r]! * y + m[8 + r]! * z + m[12 + r]!);
}

/** Where MapLibre itself puts a local point: through proj4 to WGS84, then MercatorCoordinate. */
function exact([x, y, z]: [number, number, number]) {
  const [lng, lat] = sweref.inverse([origin[0] + x, origin[1] + y]) as [number, number];
  const m = MercatorCoordinate.fromLngLat([lng, lat], z);
  return [m.x, m.y, m.z];
}

describe("sceneToMercator", () => {
  const matrix = sceneToMercator(origin);
  // One mercator unit is the Earth's circumference at the equator; 5 cm of it is the tolerance.
  const metresPerUnit = 40075016.686;

  it.each<[string, [number, number, number]]>([
    ["the origin", [0, 0, 0]],
    ["the south-west corner", [-313, -320.5, 0]],
    ["the north-east corner", [313, 320.5, 0]],
    ["a rooftop 36 m up at the north-west corner", [-313, 320.5, 36]],
  ])("puts %s where proj4 and MapLibre do, to 5 cm", (_, point) => {
    const got = apply(matrix, point),
      want = exact(point);
    for (let axis = 0; axis < 3; axis++) {
      expect(Math.abs(got[axis]! - want[axis]!) * metresPerUnit).toBeLessThan(0.05);
    }
  });

  it("turns grid north away from mercator north, as SWEREF 99 TM does west of 15 E", () => {
    const [x0, y0] = apply(matrix, [0, 0, 0]),
      [x1, y1] = apply(matrix, [0, 100, 0]);
    const degrees = (Math.atan2(x1! - x0!, -(y1! - y0!)) * 180) / Math.PI;
    expect(degrees).toBeLessThan(-2);
    expect(degrees).toBeGreaterThan(-3);
  });
});
