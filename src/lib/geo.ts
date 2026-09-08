export const R = 6378137;
import {LON0, LAT0} from './scene';

const DEG = Math.PI / 180;

export function localToLngLat(x: number, y: number): [number, number] {
  const c = Math.cos(LAT0 * DEG);
  return [LON0 + x / (R * c) / DEG, LAT0 + y / R / DEG];
}

export function lngLatToLocal(lng: number, lat: number): [number, number] {
  const c = Math.cos(LAT0 * DEG);
  return [(lng - LON0) * DEG * R * c, (lat - LAT0) * DEG * R];
}

/** Lon/lat of pixel (px, py) in web-mercator tile z/x/y of `size` px. */
export function tileToLngLat(z: number, x: number, y: number, px: number, py: number, size: number): [number, number] {
  const n = 2 ** z;
  const lng = ((x + px / size) / n) * 360 - 180;
  const yy = (y + py / size) / n;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * yy))) * 180) / Math.PI;
  return [lng, lat];
}
