// prism: light through a triangular glass prism, or a raindrop (Class 10 The Human Eye and the Colourful World,
// 2026-10-28). Every ray is traced: at each surface it refracts by Snell's law in vector form, with a refractive
// index that depends on the wavelength (Cauchy, n = A + B/λ²), so white light splits into its colours by the physics
// itself, not by a drawing. One ray shows the book's Fig. 10.4: the angles of incidence, refraction and emergence,
// the prism's angle A and the deviation D = i + e − A. White light shows the spectrum (VIBGYOR) on a screen; a second
// prism upside down recombines it (Newton); a raindrop refracts, reflects once inside and refracts out, red leaving
// at about 42° to the sunlight and violet at about 40° (the rainbow).
import type {Key} from '../keys.ts';
import type {Prop, Scene} from '../scene.ts';
import {wavelengthColour} from '../physics/light.ts';
import {wrapText} from '../svg.ts';
import {deg, rad, round, type Vec} from '../vec.ts';
import {n2} from './calculus.ts';

type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};
export type PrismSpec = Common & {
  verb: 'prism';
  /** prism: one triangular prism; two_prisms: a second, upside down, after it (Newton); raindrop: a drop of water. */
  /** newton_test: Newton's first test: a slit passes one colour of the spectrum into a second, similar prism, which
   * bends it further but splits it no more. */
  setup?: 'prism' | 'two_prisms' | 'raindrop' | 'newton_test';
  /** newton_test: the colour the slit lets through (default green). */
  colour?: string;
  /** White light: show each end colour's refractive index and its speed in the glass (v = c/n): violet slows most. */
  speeds?: boolean;
  /** ray: one ray of one colour, with every angle marked; white: white light, split into its colours. */
  light?: 'ray' | 'white';
  /** The prism's angle A in degrees (30 to 75, default 60). */
  angle?: number;
  /** The angle of incidence at the first face, in degrees (default 40; a raindrop: where the ray meets the drop). */
  incidence?: number;
  /** The prism's glass: crown glass or flint glass (default flint for white light, whose colours spread more). */
  glass?: 'crown glass' | 'flint glass' | 'glass';
  panel?: boolean;
  seconds?: number;
  /** White light: how many times wider the colours' spread is drawn than it really is (1 to 8, default 4; the
   * book's figures widen it too). The angles quoted are the real ones, and the screen says it is drawn wider. */
  spread?: number;
};

/** Cauchy coefficients (λ in µm): n = A + B/λ². */
const CAUCHY: Record<string, [number, number]> = {'crown glass': [1.5046, 0.0042], 'flint glass': [1.5996, 0.0070], water: [1.3242, 0.0031]};
const nOf = (medium: string, nm: number) => CAUCHY[medium][0] + CAUCHY[medium][1] / (nm / 1000) ** 2;
/** VIBGYOR: a wavelength for each of the book's seven colours. */
export const COLOURS: [string, number][] = [['violet', 410], ['indigo', 445], ['blue', 475], ['green', 520], ['yellow', 575], ['orange', 605], ['red', 660]];
const ONE = 589;    // a single ray: yellow sodium light, the wavelength refractive indices are quoted at

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const fmt = (v: number, places = 1) => n2(Number(v.toFixed(places)), places).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1];
const unit = (a: Vec): Vec => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };

type Shape = {kind: 'polygon'; points: Vec[]; medium: string} | {kind: 'circle'; centre: Vec; r: number; medium: string};
type Hit = {t: number; point: Vec; normal: Vec; shape: number};

/** Where a ray (from p along d, unit) first meets a shape's boundary beyond t = 1e-6; normal: the boundary's unit normal. */
function nearest(shapes: Shape[], p: Vec, d: Vec): Hit | null {
  let best: Hit | null = null;
  shapes.forEach((s, i) => {
    if (s.kind === 'polygon') {
      for (let j = 0; j < s.points.length; j++) {
        const a = s.points[j], b = s.points[(j + 1) % s.points.length], e: Vec = [b[0] - a[0], b[1] - a[1]];
        const den = d[0] * e[1] - d[1] * e[0];
        if (Math.abs(den) < 1e-12) continue;
        const t = ((a[0] - p[0]) * e[1] - (a[1] - p[1]) * e[0]) / den, u = ((a[0] - p[0]) * d[1] - (a[1] - p[1]) * d[0]) / den;
        if (t > 1e-6 && u >= 0 && u <= 1 && (!best || t < best.t)) best = {t, point: [p[0] + d[0] * t, p[1] + d[1] * t], normal: unit([e[1], -e[0]]), shape: i};
      }
    } else {
      const o: Vec = [p[0] - s.centre[0], p[1] - s.centre[1]], b = dot(o, d), c = dot(o, o) - s.r * s.r, disc = b * b - c;
      if (disc < 0) return;
      for (const t of [-b - Math.sqrt(disc), -b + Math.sqrt(disc)]) {
        if (t > 1e-6 && (!best || t < best.t)) {
          const q: Vec = [p[0] + d[0] * t, p[1] + d[1] * t];
          best = {t, point: q, normal: unit([q[0] - s.centre[0], q[1] - s.centre[1]]), shape: i};
          break;
        }
      }
    }
  });
  return best;
}

/** Snell's law in vector form: the refracted direction, or null past the critical angle. */
function refract(d: Vec, normal: Vec, n1: number, n2v: number): Vec | null {
  const n: Vec = dot(d, normal) > 0 ? [-normal[0], -normal[1]] : normal;       // against the ray
  const eta = n1 / n2v, cosi = -dot(n, d), k = 1 - eta * eta * (1 - cosi * cosi);
  if (k < 0) return null;
  return unit([eta * d[0] + (eta * cosi - Math.sqrt(k)) * n[0], eta * d[1] + (eta * cosi - Math.sqrt(k)) * n[1]]);
}
const reflect = (d: Vec, n: Vec): Vec => { const k = 2 * dot(d, n); return unit([d[0] - k * n[0], d[1] - k * n[1]]); };

/** A ray's path through the shapes: its points, and the direction it leaves in. `reflectInside`: the number of times
 * it reflects inside a circle before it may leave (a raindrop's one internal reflection). Works in y-up coordinates. */
export function trace(shapes: Shape[], start: Vec, dir: Vec, nm: number, reflectInside = 0): {points: Vec[]; out: Vec; hits: {point: Vec; normal: Vec}[]} {
  const points: Vec[] = [start], hits: {point: Vec; normal: Vec}[] = [];
  let p = start, d = unit(dir), inside = -1, reflections = 0;
  for (let step = 0; step < 12; step++) {
    const hit = nearest(shapes, p, d);
    if (!hit) break;
    points.push(hit.point); hits.push({point: hit.point, normal: hit.normal});
    const s = shapes[hit.shape], entering = inside !== hit.shape;
    if (!entering && s.kind === 'circle' && reflections < reflectInside) {
      d = reflect(d, hit.normal); reflections++; p = hit.point; continue;
    }
    const n1 = entering ? 1.0003 : nOf(s.medium, nm), n2v = entering ? nOf(s.medium, nm) : 1.0003;
    const next = refract(d, hit.normal, n1, n2v);
    if (!next) { d = reflect(d, hit.normal); p = hit.point; continue; }          // total internal reflection: stays in
    d = next; p = hit.point; inside = entering ? hit.shape : -1;
  }
  return {points, out: d, hits};
}

export function prismErrors(s: PrismSpec): string[] {
  const e: string[] = [];
  const setup = s.setup ?? 'prism';
  if (!['prism', 'two_prisms', 'raindrop', 'newton_test'].includes(setup)) e.push('prism: setup is prism, two_prisms, raindrop or newton_test');
  if (s.colour !== undefined && !(setup === 'newton_test' && COLOURS.some(([n]) => n === s.colour))) e.push(`prism: colour (for newton_test) is one of ${COLOURS.map(([n]) => n).join(', ')}`);
  if (setup === 'newton_test' && s.light === 'ray') e.push('prism: newton_test starts from white light: leave light out');
  if (s.speeds !== undefined && typeof s.speeds !== 'boolean') e.push('prism: speeds is true or false');
  if (s.light !== undefined && !['ray', 'white'].includes(s.light)) e.push('prism: light is ray (one colour, angles marked) or white (split into colours)');
  if (s.angle !== undefined && !(isNum(s.angle) && s.angle >= 30 && s.angle <= 75)) e.push('prism: angle (the prism angle A) is 30 to 75 degrees');
  if (s.incidence !== undefined && !(isNum(s.incidence) && s.incidence >= 0 && s.incidence <= 80)) e.push('prism: incidence is 0 to 80 degrees');
  if (s.glass !== undefined && !['crown glass', 'flint glass', 'glass'].includes(s.glass)) e.push('prism: glass is crown glass or flint glass (glass alone means crown glass)');
  if (s.spread !== undefined && !(isNum(s.spread) && s.spread >= 1 && s.spread <= 8)) e.push('prism: spread is 1 to 8 (how much wider the colours are drawn)');
  if (s.panel !== undefined && typeof s.panel !== 'boolean') e.push('prism: panel is true or false');
  if (s.seconds !== undefined && !(isNum(s.seconds) && s.seconds >= 4 && s.seconds <= 20)) e.push('prism: seconds is 4 to 20');
  if (setup === 'raindrop' && s.angle !== undefined) e.push('prism: a raindrop has no angle; leave it out');
  if (setup === 'two_prisms' && s.light === 'ray') e.push('prism: two_prisms shows white light split and joined again: light white');
  if (e.length || setup === 'raindrop') return e;
  // The ray must get out of the far face: past the critical angle it would not.
  const A = s.angle ?? 60, n = nOf(s.glass === 'glass' ? 'crown glass' : s.glass ?? (s.light === 'white' ? 'flint glass' : 'crown glass'), 410), i = s.incidence ?? (s.light === 'white' ? 55 : 40);
  const r1 = deg(Math.asin(Math.sin(rad(i)) / n)), r2 = A - r1;
  if (n * Math.sin(rad(r2)) >= 1) e.push(`prism: at incidence ${i}° the light is totally reflected inside at the second face (it meets it at ${fmt(r2)}°); use a larger incidence or a smaller angle`);
  return e;
}

export function prism(s: PrismSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, panel = s.panel !== false;
  const setup = s.setup ?? 'prism', white = (s.light ?? (setup === 'prism' ? 'ray' : 'white')) === 'white';
  if (setup === 'newton_test') return newtonTest(s);
  const glass = s.glass === 'glass' ? 'crown glass' : s.glass ?? (white ? 'flint glass' : 'crown glass'), A = s.angle ?? 60, i = s.incidence ?? (setup === 'raindrop' ? 0 : white ? 55 : 40);   // white: near the least deviation
  const left = 0.04 * W, right = panel ? 0.62 * W : 0.96 * W, top = panel ? 0.12 * H : (s.title ? 0.24 : 0.13) * H, bottom = 0.93 * H;
  // Drawing in y-up units of px from the frame's lower left; P converts to the frame.
  const P = (q: Vec): Vec => [round(q[0], 2), round(H - q[1], 2)];
  const props: Prop[] = [], facts: string[] = [], anchors: Record<string, Vec> = {};
  const T = s.seconds ?? 8, draw = (t0: number, t1: number) => ({draw: 0, keys: {draw: [[t0, 0], [t1, 1, 'linear']] as Key[]}});
  const shapes: Shape[] = [];
  // A ray's end: `length` along d from p, or where it would leave the drawing.
  const clip = (p: Vec, d: Vec, length: number): Vec => {
    const box = [left + 6 * k, H - bottom + 6 * k, right - 6 * k, H - top - 6 * k];
    let t = length;
    if (d[0] > 1e-9) t = Math.min(t, (box[2] - p[0]) / d[0]);
    if (d[0] < -1e-9) t = Math.min(t, (box[0] - p[0]) / d[0]);
    if (d[1] > 1e-9) t = Math.min(t, (box[3] - p[1]) / d[1]);
    if (d[1] < -1e-9) t = Math.min(t, (box[1] - p[1]) / d[1]);
    return [p[0] + d[0] * Math.max(0, t), p[1] + d[1] * Math.max(0, t)];
  };
  // The colours' paths are drawn `spread` times farther from the yellow one than they really are, from where the
  // light enters on: dispersion in glass or water is a few degrees, too little to see in a film.
  // Two prisms: the real spread, so each colour meets the second prism's faces where it truly does.
  const spread = white ? s.spread ?? (setup === 'two_prisms' ? 1 : 4) : 1;
  const widen = (paths: Vec[][]): Vec[][] => {
    const ref = paths[4] ?? paths[0];
    return paths.map(pts => pts.map((q, j) => (j < 2 || !ref[j] ? q : [ref[j][0] + spread * (q[0] - ref[j][0]), ref[j][1] + spread * (q[1] - ref[j][1])] as Vec)));
  };
  const cx = left + 0.42 * (right - left), cy = H - (top + bottom) / 2, side = Math.min(0.42 * (right - left), 0.62 * (bottom - top));
  const triangle = (apexUp: boolean, x: number): Vec[] => {
    const half = side * Math.sin(rad(A / 2)), h = side * Math.cos(rad(A / 2)), y0 = cy - h / 2;
    return apexUp ? [[x - half, y0], [x, y0 + h], [x + half, y0]] : [[x - half, y0 + h], [x + half, y0 + h], [x, y0]];
  };
  let lines: string[] = [];
  if (setup !== 'raindrop') {
    const two = setup === 'two_prisms', x1 = two ? cx - 0.18 * (right - left) : cx;
    shapes.push({kind: 'polygon', points: triangle(true, x1), medium: glass});
    if (two) {
      // Newton's second prism: the first turned through 180° about a point on the yellow ray beyond it, so each colour
      // is bent back exactly as much as it was bent, and they leave together, parallel to the incoming light.
      const first = shapes[0] as {kind: 'polygon'; points: Vec[]; medium: string};
      const [b0, a0] = [first.points[0], first.points[1]], f: Vec = unit([a0[0] - b0[0], a0[1] - b0[1]]), no: Vec = [-f[1], f[0]];
      const hit0: Vec = [(a0[0] + b0[0]) / 2 + f[0] * side * 0.06, (a0[1] + b0[1]) / 2 + f[1] * side * 0.06], inw: Vec = [-no[0], -no[1]];
      const c0 = Math.cos(rad(i)), s0 = Math.sin(rad(i)), d0: Vec = unit([inw[0] * c0 - inw[1] * s0, inw[0] * s0 + inw[1] * c0]);
      const y = trace([first], [hit0[0] - d0[0] * side, hit0[1] - d0[1] * side], d0, 575);
      const exit = y.points.at(-1)!, M: Vec = [exit[0] + y.out[0] * 0.5 * side, exit[1] + y.out[1] * 0.5 * side];
      shapes.push({kind: 'polygon', points: first.points.map(q => [2 * M[0] - q[0], 2 * M[1] - q[1]] as Vec), medium: glass});
    }
    const [b, a] = shapes[0].kind === 'polygon' ? [shapes[0].points[0], shapes[0].points[1]] : [[0, 0], [0, 0]] as Vec[];
    anchors.A = P(a);
    // The ray meets the left face at its middle, at angle i to the face's outward normal.
    const face: Vec = unit([a[0] - b[0], a[1] - b[1]]), normalOut: Vec = [-face[1], face[0]];
    const hitAt: Vec = [(a[0] + b[0]) / 2 + face[0] * side * 0.06, (a[1] + b[1]) / 2 + face[1] * side * 0.06];
    const inward: Vec = [-normalOut[0], -normalOut[1]], c = Math.cos(rad(i)), sn = Math.sin(rad(i));
    // The inward normal turned anticlockwise by i: the ray comes up from below-left and heads for the far face, as in
    // the book's Fig. 10.4.
    const dir: Vec = unit([inward[0] * c - inward[1] * sn, inward[0] * sn + inward[1] * c]);
    const start: Vec = [hitAt[0] - dir[0] * 0.55 * side, hitAt[1] - dir[1] * 0.55 * side];
    for (const [id, sh] of shapes.entries()) if (sh.kind === 'polygon')
      props.push({id: `prism${id}`, type: 'polyline', points: sh.points.map(P), closed: true, style: {stroke: 'cool', width: 4 * k, fill: 'cool', opacity: 0.18}, layer: 1},
        {id: `prism${id}-edge`, type: 'polyline', points: sh.points.map(P), closed: true, style: {stroke: 'cool', width: 4 * k}, layer: 3});
    const waves: [string, number][] = white ? COLOURS : [['', ONE]];
    const ends: Vec[] = [], drawn: {name: string; colour: string; pts: Vec[]; width: number}[] = [];
    waves.forEach(([name, nm], w) => {
      const path = trace(shapes, start, dir, nm);
      const last = path.points.at(-1)!, end = clip(last, path.out, (white ? 1.2 : 0.62) * side);
      ends.push(end);
      const colour = white ? wavelengthColour(nm) : 'accent';
      const pts = [...path.points, end];
      // The incident ray is drawn once (white), then each colour from the first face on.
      if (!w) props.push({id: 'incident', type: 'line', x1: P(start)[0], y1: P(start)[1], x2: P(path.points[1])[0], y2: P(path.points[1])[1], ...draw(0.5, 1.5),
        style: {stroke: white ? 'ink' : 'accent', width: 6 * k}, layer: 4});
      drawn.push({name: name || 'one', colour, pts, width: white ? 4 : 5});
      if (!white) {
        const [e1, e2] = [path.hits[0], path.hits[1]];
        for (const [id, h] of [['normal1', e1], ['normal2', e2]] as const) {
          const L = 0.22 * side;
          props.push({id, type: 'line', x1: P([h.point[0] - h.normal[0] * L, h.point[1] - h.normal[1] * L])[0], y1: P([h.point[0] - h.normal[0] * L, h.point[1] - h.normal[1] * L])[1],
            x2: P([h.point[0] + h.normal[0] * L, h.point[1] + h.normal[1] * L])[0], y2: P([h.point[0] + h.normal[0] * L, h.point[1] + h.normal[1] * L])[1],
            show: [1.4, 1e9], style: {stroke: 'muted', width: 2.5 * k, dash: [10 * k, 8 * k]}, layer: 2});
        }
        anchors.incidence = P(e1.point); anchors.emergence = P(e2.point);
        // The deviation: the incident ray's line runs on, dashed, and D is the angle between it and the emergent ray.
        const r1 = deg(Math.asin(Math.sin(rad(i)) / nOf(glass, nm))), r2 = A - r1, e = deg(Math.asin(nOf(glass, nm) * Math.sin(rad(r2)))), D = i + e - A;
        const on: Vec = [e1.point[0] + dir[0] * side * 1.1, e1.point[1] + dir[1] * side * 1.1];
        props.push({id: 'undeviated', type: 'line', x1: P(e1.point)[0], y1: P(e1.point)[1], x2: P(on)[0], y2: P(on)[1], ...draw(3.6, 4.4), style: {stroke: 'muted', width: 2.5 * k, dash: [12 * k, 9 * k]}, layer: 2});
        const tag = (id: string, text: string, at: Vec, t: number, fill: string) => props.push({id, type: 'text', x: P(at)[0], y: P(at)[1], text, size: 30 * k, weight: 700,
          align: 'middle', show: [t, 1e9], fade: 0.3, style: {fill, stroke: 'paper', width: 8 * k}, layer: 6});
        tag('label-i', 'i', [e1.point[0] - (dir[0] + e1.normal[0] * -1) * 0.07 * side - dir[0] * 0.05 * side, e1.point[1] - (dir[1] - e1.normal[1]) * 0.07 * side - dir[1] * 0.05 * side], 1.6, 'accent');
        const inside: Vec = unit([path.points[2][0] - path.points[1][0], path.points[2][1] - path.points[1][1]]);
        tag('label-r', 'r', [e1.point[0] + (inside[0] - e1.normal[0]) * 0.08 * side, e1.point[1] + (inside[1] - e1.normal[1]) * 0.08 * side], 2.4, 'good');
        tag('label-e', 'e', [e2.point[0] + (path.out[0] + e2.normal[0]) * 0.08 * side, e2.point[1] + (path.out[1] + e2.normal[1]) * 0.08 * side], 3.4, 'good');
        tag('label-A', 'A', [a[0], a[1] - 0.16 * side], 1.0, 'cool');
        tag('label-D', 'D', [e2.point[0] + (path.out[0] + dir[0]) * 0.32 * side, e2.point[1] + (path.out[1] + dir[1]) * 0.32 * side], 4.4, 'bad');
        lines = [`Prism angle A = ${fmt(A)}°; ${glass} (n = ${fmt(nOf(glass, nm), 3)})`, `i = ${fmt(i)}°, r = ${fmt(r1)}° at the first face`,
          `At the second face it meets it at ${fmt(r2)}° and leaves at e = ${fmt(e)}°`, `Deviation D = i + e − A = ${fmt(D)}°`];
        facts.push(`a ray meeting a ${fmt(A)}° prism of ${glass} at ${fmt(i)}° is refracted at ${fmt(r1)}°, leaves at ${fmt(e)}° and is deviated by D = i + e − A = ${fmt(D)}°`,
          'it bends towards the normal entering the glass and away from it leaving, towards the base of the prism');
      }
    });
    const wide = widen(drawn.map(d => d.pts));
    drawn.forEach((d, j) => {
      props.push({id: `ray-${d.name}`, type: 'polyline', points: wide[j].slice(1).map(P), ...draw(1.5, 3.5), style: {stroke: d.colour, width: d.width * k}, layer: 4});
      ends[j] = wide[j].at(-1)!;
    });
    if (white) {
      // The spectrum on a screen (one prism), or one white beam again after the second prism.
      if (!two) {
        const sx = Math.max(...ends.map(e => e[0])) + 8 * k, ys = ends.map(e => e[1]);
        props.push({id: 'screen', type: 'line', x1: P([sx, Math.max(...ys) + 0.1 * side])[0], y1: P([sx, Math.max(...ys) + 0.1 * side])[1], x2: P([sx, Math.min(...ys) - 0.1 * side])[0], y2: P([sx, Math.min(...ys) - 0.1 * side])[1],
          show: [3.4, 1e9], style: {stroke: 'muted', width: 6 * k}, layer: 3});
        // Names beside the screen, at least a line apart, in the spectrum's order.
        const slots: number[] = new Array(ends.length), order = ends.map((e, w) => [e[1], w]).sort((a, b) => b[0] - a[0]);
        order.forEach(([y, w], j) => { slots[w] = j ? Math.min(y, slots[order[j - 1][1]] - 26 * k) : y; });
        COLOURS.forEach(([name], w) => props.push({id: `name-${name}`, type: 'text', x: P([sx + 14 * k, 0])[0], y: P([0, slots[w]])[1], text: name, size: 22 * k, align: 'start',
          show: [3.8, 1e9], fade: 0.3, style: {fill: wavelengthColour(COLOURS[w][1])}, layer: 6}));
        anchors.violet = P(ends[0]); anchors.red = P(ends[6]);
        const nV = nOf(glass, 410), nR = nOf(glass, 660);
        lines = [`White light enters a ${glass} prism`, 'Each colour bends by a different angle: violet the most, red the least', 'The band of colours on the screen is the spectrum: VIBGYOR'];
        if (s.speeds) {
          // Why: the glass's refractive index is larger for violet, so violet slows more (v = c/n) and bends more.
          const speedLines = [`violet: n = ${fmt(nV, 3)}, v = ${fmt(3 / nV, 3)} × 10⁸ m/s`, `red: n = ${fmt(nR, 3)}, v = ${fmt(3 / nR, 3)} × 10⁸ m/s`];
          if (panel) lines.push('In glass violet slows the most:', ...speedLines);
          else speedLines.forEach((t, j) => props.push({id: `speed-${j}`, type: 'text', x: left + 6 * k, y: bottom - 70 * k + 30 * k * j, text: t, size: 26 * k, weight: 700, show: [3.8, 1e9], fade: 0.3,
            style: {fill: j ? '#ff6a5a' : '#a98bff', stroke: 'paper', width: 7 * k}, layer: 7}));
          facts.push(`violet slows the most in the glass: ${fmt(3 / nV, 3)} × 10^8 m/s against ${fmt(3 / nR, 3)} × 10^8 m/s for red (v = c/n), so it bends the most`);
        }
        facts.push(`in ${glass} the refractive index is ${fmt(nV, 3)} for violet light and ${fmt(nR, 3)} for red, so violet bends the most and red the least`,
          'white light is split into seven colours, violet, indigo, blue, green, yellow, orange and red (VIBGYOR): this is dispersion, and the band of colours is the spectrum');
      } else {
        // Out of the second prism the colours run together, side by side within a few pixels: white light again.
        const last = drawn.map(d => d.pts.at(-1)!), before = drawn.map(d => d.pts.at(-2)!);
        const mean = (v: Vec[]): Vec => [v.reduce((a, q) => a + q[0], 0) / v.length, v.reduce((a, q) => a + q[1], 0) / v.length];
        const [p0, p1] = [mean(before), mean(last)];
        props.push({id: 'recombined', type: 'line', x1: P(p0)[0], y1: P(p0)[1], x2: P(p1)[0], y2: P(p1)[1], show: [3.4, 1e9], fade: 0.4, style: {stroke: 'ink', width: 9 * k}, layer: 5});
        lines = ['The first prism splits white light into its colours', 'The second prism, upside down, bends each colour back', 'The colours join again into white light'];
        facts.push('a second identical prism placed upside down bends each colour back by the same amount, so the colours recombine into white light (Newton)');
      }
    }
  } else {
    // A raindrop: sunlight from the left meets the drop's upper half, refracts in, reflects once inside the back of
    // the drop and refracts out, going back down towards an observer with the Sun behind them.
    const R = Math.min(0.3 * (right - left), 0.36 * (bottom - top)), centre: Vec = [cx + 0.06 * (right - left), cy + 0.04 * (bottom - top)];
    shapes.push({kind: 'circle', centre, r: R, medium: 'water'});
    props.push({id: 'drop', type: 'circle', x: P(centre)[0], y: P(centre)[1], r: R, style: {fill: 'cool', opacity: 0.16, stroke: 'cool', width: 4 * k}, layer: 1});
    const height = R * 0.86;                      // close to the impact height that gives the rainbow's angle
    const start: Vec = [left + 0.02 * W, centre[1] + height], dir: Vec = [1, 0];
    const waves: [string, number][] = white ? COLOURS : [['', ONE]];
    const exits: number[] = [], drops: {name: string; colour: string; pts: Vec[]}[] = [];
    waves.forEach(([name, nm], w) => {
      const path = trace(shapes, start, dir, nm, 1);
      const last = path.points.at(-1)!, end = clip(last, path.out, R * 1.5);
      exits.push(deg(Math.acos(-path.out[0])));      // the angle between the light leaving and the sunlight coming in
      if (!w) props.push({id: 'sunlight', type: 'line', x1: P(start)[0], y1: P(start)[1], x2: P(path.points[1])[0], y2: P(path.points[1])[1], ...draw(0.5, 1.6), style: {stroke: 'ink', width: 6 * k}, layer: 4});
      drops.push({name: name || 'one', colour: white ? wavelengthColour(nm) : 'accent', pts: [...path.points, end]});
    });
    const wide = widen(drops.map(d => d.pts));
    drops.forEach((d, j) => {
      props.push({id: `ray-${d.name}`, type: 'polyline', points: wide[j].slice(1).map(P), ...draw(1.6, 4.0), style: {stroke: d.colour, width: 3.5 * k}, layer: 4});
      if (d.name === 'red' || d.name === 'violet') anchors[d.name] = P(wide[j].at(-1)!);
    });
    anchors.drop = P(centre);
    const [v, r] = [exits[0], exits.at(-1)!];
    lines = ['Sunlight enters a raindrop and is refracted (dispersed)', 'It reflects once inside the back of the drop', 'It is refracted again as it leaves: the colours separate', `Red leaves at about ${fmt(r)}° to the sunlight, violet at about ${fmt(v)}°`];
    facts.push('a rainbow forms when sunlight is refracted and dispersed entering a raindrop, reflected inside it, and refracted again leaving it; it is seen opposite the Sun',
      `traced here, red light leaves at about ${fmt(r)}° to the incoming sunlight and violet at about ${fmt(v)}°, which is why red is on the outside of the bow`);
  }
  if (white && spread > 1) {
    props.push({id: 'spread-note', type: 'text', x: left + 6 * k, y: bottom - 6 * k, text: `colours drawn ${fmt(spread, 0)}× more spread out than they really are`, size: 22 * k,
      show: [3.5, 1e9], fade: 0.3, style: {fill: 'muted'}, layer: 6});
    facts.push(`the colours' spread is drawn ${fmt(spread, 0)} times wider than it really is, so it can be seen`);
  }
  if (panel) {
    const px = 0.66 * W, pw = W - px - 40 * k;
    let row = 0.14 * H;
    if (s.title) { props.push({id: 'title', type: 'text', x: px, y: row, text: s.title, size: 44 * k, weight: 700, width: pw}); row += wrapText(s.title, 44 * k, pw).length * 1.25 * 44 * k + 18 * k; }
    lines.forEach((text, j) => {
      props.push({id: `line${j}`, type: 'text', x: px, y: row, text, size: 30 * k, width: pw, weight: j ? 400 : 700, show: [1 + 0.9 * j, 1e9], fade: 0.3, style: {fill: j ? 'ink' : 'muted'}});
      row += wrapText(text, 30 * k, pw).length * 1.3 * 30 * k + 12 * k;
    });
  } else if (s.title) props.push({id: 'title', type: 'text', x: left, y: 0.16 * H, text: s.title, size: 44 * k, weight: 700, width: 0.92 * W});
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: Math.max(T, 6), theme: s.theme ?? 'dark', props, actors: [],
    meta: {verb: 'prism', facts, anchors}};
}

/** Newton's first test: white light through a prism; a slit lets one colour through to a second, similar prism; that
 * colour bends again but stays one colour. */
function newtonTest(s: PrismSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, panel = s.panel !== false;
  const glass = s.glass === 'glass' || s.glass === 'crown glass' ? 'crown glass' : 'flint glass', A = s.angle ?? 60, i = s.incidence ?? 55;
  const pick = COLOURS.find(([n]) => n === (s.colour ?? 'green'))!;
  const left = 0.04 * W, right = panel ? 0.62 * W : 0.96 * W, top = panel ? 0.12 * H : (s.title ? 0.24 : 0.13) * H, bottom = 0.93 * H;
  const P = (q: Vec): Vec => [round(q[0], 2), round(H - q[1], 2)], w = right - left, side = Math.min(0.26 * w, 0.42 * (bottom - top));
  const cy = H - (top + bottom) / 2 + 0.08 * (bottom - top);
  const tri = (x: number): Vec[] => { const half = side * Math.sin(rad(A / 2)), h = side * Math.cos(rad(A / 2)), y0 = cy - h / 2; return [[x - half, y0], [x, y0 + h], [x + half, y0]]; };
  const first: Shape = {kind: 'polygon', points: tri(left + 0.2 * w), medium: glass};
  const [b, a] = first.points;
  const face: Vec = unit([a[0] - b[0], a[1] - b[1]]), inward: Vec = [face[1], -face[0]];
  const hit: Vec = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], c = Math.cos(rad(i)), sn = Math.sin(rad(i));
  const dir: Vec = unit([inward[0] * c - inward[1] * sn, inward[0] * sn + inward[1] * c]), start: Vec = [hit[0] - dir[0] * 0.5 * side, hit[1] - dir[1] * 0.5 * side];
  const props: Prop[] = [], spread = s.spread ?? 4, draw = (t0: number, t1: number) => ({draw: 0, keys: {draw: [[t0, 0], [t1, 1, 'linear']] as Key[]}});
  const glassStyle = {stroke: 'cool', width: 4 * k, fill: 'cool', opacity: 0.18};
  props.push({id: 'prism1', type: 'polyline', points: first.points.map(P), closed: true, style: glassStyle, layer: 1},
    {id: 'incident', type: 'line', x1: P(start)[0], y1: P(start)[1], x2: P(hit)[0], y2: P(hit)[1], ...draw(0.4, 1.2), style: {stroke: 'ink', width: 6 * k}, layer: 4});
  // Each colour out of the first prism to the slit screen, drawn `spread` times farther from yellow (as elsewhere).
  const paths = COLOURS.map(([, nm]) => trace([first], start, dir, nm));
  const ref = paths[4], screenX = ref.points.at(-1)![0] + 0.55 * side;
  const at = (p: {points: Vec[]; out: Vec}) => { const q = p.points.at(-1)!; return [screenX, q[1] + p.out[1] * (screenX - q[0]) / p.out[0]] as Vec; };
  const yRef = at(ref)[1], ends = paths.map(p => [screenX, yRef + spread * (at(p)[1] - yRef)] as Vec);
  paths.forEach((p, j) => props.push({id: `ray-${COLOURS[j][0]}`, type: 'polyline', points: [...p.points.slice(1), ends[j]].map(P), ...draw(1.2, 2.6),
    style: {stroke: wavelengthColour(COLOURS[j][1]), width: 4 * k}, layer: 4}));
  const j = COLOURS.indexOf(pick), slit = ends[j], ys = ends.map(e => e[1]);
  props.push({id: 'screen-top', type: 'line', x1: P([screenX, Math.max(...ys) + 0.2 * side])[0], y1: P([screenX, Math.max(...ys) + 0.2 * side])[1], x2: P([screenX, slit[1] + 6 * k])[0], y2: P([screenX, slit[1] + 6 * k])[1], style: {stroke: 'muted', width: 8 * k}, layer: 5},
    {id: 'screen-bottom', type: 'line', x1: P([screenX, slit[1] - 6 * k])[0], y1: P([screenX, slit[1] - 6 * k])[1], x2: P([screenX, Math.min(...ys) - 0.2 * side])[0], y2: P([screenX, Math.min(...ys) - 0.2 * side])[1], style: {stroke: 'muted', width: 8 * k}, layer: 5});
  // Through the slit the chosen colour goes on, with its real direction, into a second prism set the same way up.
  const outDir = paths[j].out, m1: Vec = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const target: Vec = [slit[0] + outDir[0] * 0.55 * side, slit[1] + outDir[1] * 0.55 * side], shift: Vec = [target[0] - m1[0], target[1] - m1[1]];
  const second: Shape = {kind: 'polygon', points: first.points.map(q => [q[0] + shift[0], q[1] + shift[1]] as Vec), medium: glass};
  const onward = trace([second], slit, outDir, pick[1]), lastPt = onward.points.at(-1)!;
  const tail: Vec = [lastPt[0] + onward.out[0] * 0.6 * side, lastPt[1] + onward.out[1] * 0.6 * side];
  props.push({id: 'prism2', type: 'polyline', points: second.points.map(P), closed: true, style: glassStyle, layer: 1},
    {id: 'one-colour', type: 'polyline', points: [...onward.points, tail].map(P), ...draw(2.8, 4.2), style: {stroke: wavelengthColour(pick[1]), width: 5 * k}, layer: 4});
  const label = (id: string, text: string, q: Vec, t: number, fill: string, align: 'start' | 'middle' | 'end' = 'middle') =>
    props.push({id, type: 'text', x: P(q)[0], y: P(q)[1], text, size: 26 * k, weight: 700, align, show: [t, 1e9], fade: 0.3, style: {fill, stroke: 'paper', width: 7 * k}, layer: 7});
  label('slit-label', `the slit lets only ${pick[0]} through`, [screenX, Math.min(...ys) - 0.2 * side - 30 * k], 2.6, 'muted');
  label('result', `still only ${pick[0]}: no new colours`, [tail[0], tail[1] - 40 * k], 4.2, wavelengthColour(pick[1]), 'end');
  const lines = ['A prism splits white light into its colours', `A slit lets one colour (${pick[0]}) through to a second, similar prism`, 'It bends again but splits no further: the colours of sunlight are its own'];
  if (panel) {
    const px = 0.66 * W, pw = W - px - 40 * k;
    let row = 0.14 * H;
    if (s.title) { props.push({id: 'title', type: 'text', x: px, y: row, text: s.title, size: 44 * k, weight: 700, width: pw}); row += wrapText(s.title, 44 * k, pw).length * 1.25 * 44 * k + 18 * k; }
    lines.forEach((text, n) => { props.push({id: `line${n}`, type: 'text', x: px, y: row, text, size: 30 * k, width: pw, weight: n ? 400 : 700, show: [1 + 1.4 * n, 1e9], fade: 0.3}); row += wrapText(text, 30 * k, pw).length * 1.3 * 30 * k + 12 * k; });
  } else if (s.title) props.push({id: 'title', type: 'text', x: left, y: 0.16 * H, text: s.title, size: 44 * k, weight: 700, width: 0.92 * W});
  if (spread > 1) props.push({id: 'spread-note', type: 'text', x: left + 6 * k, y: bottom - 6 * k, text: `colours drawn ${spread}× more spread out than they really are`, size: 22 * k, style: {fill: 'muted'}, layer: 6});
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: Math.max(s.seconds ?? 8, 6), theme: s.theme ?? 'dark', props, actors: [],
    meta: {verb: 'prism', facts: [`Newton sent one colour (${pick[0]}) of the spectrum through a second, similar prism: it was bent again but split into no further colours, so the colours are not made by the glass; they are in sunlight`,
      ...(spread > 1 ? [`the colours' spread is drawn ${spread} times wider than it really is, so it can be seen`] : [])],
      anchors: {slit: P(slit), second: P(m1.map((v, n) => v + shift[n]) as Vec), out: P(tail)}}};
}
