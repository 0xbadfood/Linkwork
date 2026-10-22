// 2D maths. Scene coordinates have y pointing down (as in SVG); angles are degrees, counter-clockwise as seen on
// screen, with 0 pointing right.
export type Vec = [number, number];

export const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]];
export const mul = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k];
export const len = (a: Vec): number => Math.hypot(a[0], a[1]);
export const dist = (a: Vec, b: Vec): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
export const lerpVec = (a: Vec, b: Vec, k: number): Vec => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
export const rad = (d: number): number => d * Math.PI / 180;
export const deg = (r: number): number => r * 180 / Math.PI;
/** Unit vector pointing at angle a (degrees, counter-clockwise on screen). */
export const dir = (a: number): Vec => [Math.cos(rad(a)), -Math.sin(rad(a))];
export const angleOf = (v: Vec): number => deg(Math.atan2(-v[1], v[0]));
/** The shortest signed turn from angle a to angle b, in (-180, 180]. */
export const turnBetween = (a: number, b: number): number => {
  const d = ((b - a) % 360 + 540) % 360 - 180;
  return d === -180 ? 180 : d;
};
/** The point on the line through a and b closest to p. */
export const project = (p: Vec, a: Vec, b: Vec): Vec => {
  const ab = sub(b, a), l2 = ab[0] * ab[0] + ab[1] * ab[1];
  if (!l2) return a;
  const k = ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / l2;
  return add(a, mul(ab, k));
};
export const round = (x: number, places = 2): number => Math.round(x * 10 ** places) / 10 ** places;
