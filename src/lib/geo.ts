export const R = 6378137;

const DEG = Math.PI / 180;

export type Anchor = [number, number];

// The synthetic scene's anchor, duplicated here as the default so geo.ts does
// not import scene.ts (scene.ts imports this module).
let ACTIVE: Anchor = [11.97, 57.70];

export function setAnchor(a: Anchor): void { ACTIVE = a; }
export function anchor(): Anchor { return ACTIVE; }

export function localToLngLat(x: number, y: number, a: Anchor = ACTIVE): [number, number] {
  const c = Math.cos(a[1] * DEG);
  return [a[0] + x / (R * c) / DEG, a[1] + y / R / DEG];
}

export function lngLatToLocal(lng: number, lat: number, a: Anchor = ACTIVE): [number, number] {
  const c = Math.cos(a[1] * DEG);
  return [(lng - a[0]) * DEG * R * c, (lat - a[1]) * DEG * R];
}

/** Lon/lat of pixel (px, py) in web-mercator tile z/x/y of `size` px. */
export function tileToLngLat(z: number, x: number, y: number, px: number, py: number, size: number): [number, number] {
  const n = 2 ** z;
  const lng = ((x + px / size) / n) * 360 - 180;
  const yy = (y + py / size) / n;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * yy))) * 180) / Math.PI;
  return [lng, lat];
}
