// Five-stop blue→cyan→green→yellow→red ramp. Same stops in TS and GLSL.
const STOPS: [number, number, number][] = [[33, 102, 172], [67, 200, 220], [120, 200, 80], [250, 220, 50], [200, 30, 30]];

export function colormap(t: number, min: number, max: number): [number, number, number] {
  const u = Math.min(1, Math.max(0, (t - min) / (max - min))) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(u)), f = u - i;
  const a = STOPS[i], b = STOPS[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f].map(Math.round) as [number, number, number];
}

export const COLORMAP_GLSL = /* glsl */ `
vec3 benchColormap(float u) {
  vec3 s0 = vec3(33., 102., 172.) / 255.;
  vec3 s1 = vec3(67., 200., 220.) / 255.;
  vec3 s2 = vec3(120., 200., 80.) / 255.;
  vec3 s3 = vec3(250., 220., 50.) / 255.;
  vec3 s4 = vec3(200., 30., 30.) / 255.;
  float x = clamp(u, 0., 1.) * 4.;
  if (x < 1.) return mix(s0, s1, x);
  if (x < 2.) return mix(s1, s2, x - 1.);
  if (x < 3.) return mix(s2, s3, x - 2.);
  return mix(s3, s4, x - 3.);
}`;
