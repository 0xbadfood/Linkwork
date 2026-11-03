// Class 12 Ray Optics and Optical Instruments (leph2-01, 2026-11-03): the parts Class 10's ray_diagram, refraction
// and prism do not draw. Four verbs, every ray computed:
//
// tir                 total internal reflection put to work: an optical fibre (core and cladding, Fig. 9.14), where a
//                     ray entering at angle i is trapped only if it meets the wall beyond the critical angle (else it
//                     leaks out at every hit), and the book's right-angled prisms that turn light through 90° or 180°
//                     or invert an image (Fig. 9.13), each ray traced by Snell's law in vector form.
// refracting_surface  refraction at one spherical surface, n2/v − n1/u = (n2 − n1)/R (Fig. 9.16), and a thin lens as
//                     two such surfaces (Fig. 9.17): the first surface's image I1, then the second's, F: the lens
//                     maker's formula 1/f = (n − 1)(1/R1 − 1/R2). Rays are paraxial, as in the book.
// prism_deviation     one prism, the ray at one angle of incidence after another and each deviation δ plotted against i
//                     (Fig. 9.22): δ falls, then rises; at its least, Dm, the ray passes symmetrically (r = A/2), and
//                     n21 = sin[(A + Dm)/2] / sin(A/2). Given Dm instead of n, the verb finds n.
// optical_instrument  the simple and compound microscope, the refracting telescope and the Cassegrain reflecting
//                     telescope, true to scale: thin lenses by ray transfer (a ray's slope changes by −y/f at a lens),
//                     mirrors traced on their true spheres. Magnifying powers come from the book's formulas and agree
//                     with the drawn images.
import {kit} from './potential.ts';
import {nearest, refract, reflect, type Shape} from './prism.ts';
import type {Prop, Scene} from '../scene.ts';
import type {Key} from '../keys.ts';

type P2 = [number, number];
type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const rad = (d: number) => d * Math.PI / 180, deg = (r: number) => r * 180 / Math.PI;
const f1 = (v: number, p = 1) => String(+v.toFixed(p));
const unit = (a: P2): P2 => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
const dot = (a: P2, b: P2) => a[0] * b[0] + a[1] * b[1];
const only = (s: Record<string, unknown>, verb: string, show: string, allowed: string[], all: string[]) =>
  all.filter(f => s[f] !== undefined && !allowed.includes(f)).map(f => `${verb}: ${f} is not used by show ${show}; leave it out`);

/** The critical angle in degrees from a medium of index n1 into one of n2 (NaN when n2 ≥ n1). */
export const criticalAngle = (n1: number, n2 = 1) => n2 >= n1 ? NaN : deg(Math.asin(n2 / n1));
/** The largest angle with a fibre's axis at which light from outside (n0) is still trapped: sin i = √(n1² − n2²)/n0. */
export const acceptance = (n1: number, n2: number, n0 = 1) => { const s = Math.sqrt(n1 * n1 - n2 * n2) / n0; return s >= 1 ? 90 : deg(Math.asin(s)); };

// ---------------------------------------------------------------------------------------------------------- tir
export const TIR_SHOWS = ['fibre', 'prism_90', 'prism_180', 'prism_invert'] as const;
export type TirSpec = Common & {verb: 'tir'; show: (typeof TIR_SHOWS)[number];
  /** prisms: the glass's refractive index (default 1.52, crown glass, Table 9.1). */
  n?: number;
  /** fibre: the core's and cladding's refractive indices (default 1.68 and 1.44, the book's light pipe); n_clad 1: no cladding. */
  n_core?: number; n_clad?: number;
  /** fibre: the angle of incidence at the fibre's end face, from the axis, in degrees (default 40). */
  incidence?: number};

export function tirErrors(s: TirSpec): string[] {
  const e: string[] = [];
  if (!TIR_SHOWS.includes(s.show)) return [`tir: show is one of ${TIR_SHOWS.join(', ')}`];
  const fibre = s.show === 'fibre';
  e.push(...only(s as never, 'tir', s.show, fibre ? ['n_core', 'n_clad', 'incidence'] : ['n'], ['n', 'n_core', 'n_clad', 'incidence']));
  if (s.n !== undefined && !(isNum(s.n) && s.n >= 1.2 && s.n <= 2.5)) e.push('tir: n is 1.2 to 2.5');
  if (s.n_core !== undefined && !(isNum(s.n_core) && s.n_core > 1 && s.n_core <= 2.5)) e.push('tir: n_core is above 1, up to 2.5');
  if (s.n_clad !== undefined && !(isNum(s.n_clad) && s.n_clad >= 1 && s.n_clad <= 2.5)) e.push('tir: n_clad is 1 (no cladding) to 2.5');
  if (fibre && !e.length && (s.n_clad ?? 1.44) >= (s.n_core ?? 1.68)) e.push('tir: the core must have the larger refractive index (n_core > n_clad): otherwise nothing is trapped');
  if (s.incidence !== undefined && !(isNum(s.incidence) && s.incidence >= 0 && s.incidence <= 85)) e.push('tir: incidence is 0 to 85 degrees');
  return e;
}

/** A ray through one glass polygon (index n in air): its points, and each surface event with its angle of incidence. */
export function traceGlass(points: P2[], n: number, start: P2, dir: P2) {
  const shapes: Shape[] = [{kind: 'polygon', points, medium: 'glass'}];
  const pts: P2[] = [start], events: {point: P2; angle: number; kind: 'in' | 'out' | 'tir'}[] = [];
  let p = start, d = unit(dir), inside = false;
  for (let step = 0; step < 10; step++) {
    const hit = nearest(shapes, p, d);
    if (!hit) break;
    const angle = deg(Math.acos(Math.min(1, Math.abs(dot(d, hit.normal as P2)))));
    pts.push(hit.point as P2);
    const next = refract(d, hit.normal, inside ? n : 1, inside ? 1 : n);
    if (!next) { d = reflect(d, hit.normal) as P2; events.push({point: hit.point as P2, angle, kind: 'tir'}); }
    else { d = next as P2; events.push({point: hit.point as P2, angle, kind: inside ? 'out' : 'in'}); inside = !inside; if (!inside) break; }
    p = hit.point as P2;
  }
  return {pts, out: d, events};
}

export function tir(s: TirSpec): Scene {
  const {k, props, bx, by, bw, bh, cy, S, line, poly, label, finish} = kit(s);
  const num = !s.illustrative, facts: string[] = [], anchors: Record<string, P2> = {};
  let dur = 8, story = '', second = '';
  const drawn = (t0: number, t1: number) => ({draw: 0, keys: {draw: [[t0, 0], [t1, 1, 'linear']] as Key[]}});
  if (s.show === 'fibre') {
    const n1 = s.n_core ?? 1.68, n2 = s.n_clad ?? 1.44, i = s.incidence ?? 40, ic = criticalAngle(n1, n2), acc = acceptance(n1, n2);
    const r = deg(Math.asin(Math.sin(rad(i)) / n1)), wall = 90 - r, trapped = r === 0 || wall > ic;
    const x0 = bx + bw * .16, x1 = bx + bw * .97, hc = S * .075, cl = S * .045;
    // cladding above and below the core, then the core
    for (const sgn of [-1, 1]) props.push({id: `clad${sgn}`, type: 'rect', x: x0, y: sgn < 0 ? cy - hc - cl : cy + hc, w: x1 - x0, h: cl, style: {fill: 'cool', opacity: n2 > 1 ? .14 : 0, stroke: 'cool', width: 2 * k}, layer: 0} as Prop);
    props.push({id: 'core', type: 'rect', x: x0, y: cy - hc, w: x1 - x0, h: 2 * hc, style: {fill: 'cool', opacity: .3, stroke: 'cool', width: 3 * k}, layer: 0} as Prop);
    label(x0 + 14 * k, cy + hc + cl + 38 * k, num ? `core, n1 = ${n1}` : 'core (higher n)', 'cool', 24, {align: 'start'});
    if (n2 > 1) label(x1 - 10 * k, cy - hc - cl - 14 * k, num ? `cladding, n2 = ${n2}` : 'cladding (lower n)', 'muted', 24, {align: 'end'});
    else label(x0 + 14 * k, cy - hc - 14 * k, 'no cladding: air outside', 'muted', 24, {align: 'start'});
    // the ray enters at the axis from below-left at angle i, refracts to r, then zigzags
    const entry: P2 = [x0, cy], back = S * .32;
    line([x0 - S * .2, cy], [x0 + S * .06, cy], 'muted', 2, {}, true);
    const start: P2 = [x0 - back * Math.cos(rad(i)), cy + back * Math.sin(rad(i))];
    props.push({id: 'in', type: 'line', x1: start[0], y1: start[1], x2: x0, y2: cy, style: {stroke: 'accent', width: 5 * k}, layer: 3, ...drawn(.4, 1.2)} as Prop);
    label(x0 - S * .12, cy - 16 * k, num ? `i = ${f1(i)}°` : 'i', 'accent', 26);
    const pts: P2[] = [entry], hits: P2[] = [];
    let x = x0, y = cy, up = true;
    const slope = Math.tan(rad(r));
    if (r < 1e-6) pts.push([x1, cy]);
    else for (let j = 0; j < 40 && x < x1; j++) {
      const ty = up ? cy - hc : cy + hc, dx = Math.abs(ty - y) / slope;
      if (x + dx >= x1) { pts.push([x1, y + (up ? -1 : 1) * (x1 - x) * slope]); x = x1; break; }
      x += dx; y = ty; pts.push([x, y]); hits.push([x, y]); up = !up;
      if (!trapped && hits.length >= 3) break;
    }
    const total = pts.reduce((a, q, j) => j ? a + Math.hypot(q[0] - pts[j - 1][0], q[1] - pts[j - 1][1]) : 0, 0);
    let run = 0; const when = (q: P2) => { const j = pts.indexOf(q); run = pts.slice(1, j + 1).reduce((a, p2, m) => a + Math.hypot(p2[0] - pts[m][0], p2[1] - pts[m][1]), 0); return 1.2 + 4.8 * run / total; };
    if (trapped) props.push({id: 'path', type: 'polyline', points: pts, style: {stroke: 'accent', width: 5 * k}, layer: 3, ...drawn(1.2, 6)} as Prop);
    else pts.slice(1).forEach((q, j) => {
      // past the critical angle not reached: at each hit most light leaves, and what reflects grows fainter
      const p0 = pts[j];
      props.push({id: `seg${j}`, type: 'line', x1: p0[0], y1: p0[1], x2: q[0], y2: q[1], style: {stroke: 'accent', width: 5 * k, opacity: Math.max(.2, 1 - .35 * j)}, layer: 3, ...drawn(when(p0), when(q))} as Prop);
    });
    if (!trapped) hits.forEach((h, j) => {
      const out = h[1] < cy ? -1 : 1, th = Math.asin(Math.min(1, n1 * Math.sin(rad(wall)) / n2)), L = S * .2;
      props.push({id: `leak${j}`, type: 'line', x1: h[0], y1: h[1], x2: h[0] + L * Math.sin(th), y2: h[1] + out * L * Math.cos(th), style: {stroke: 'bad', width: 4 * k}, layer: 2, ...drawn(when(h), when(h) + .6)} as Prop);
    });
    if (hits.length) {
      const h = hits[0], L = S * .1;
      line([h[0], h[1] - L], [h[0], h[1] + L], 'muted', 2, {show: [2, 1e9]}, true);
      label(h[0] + 16 * k, h[1] < cy ? h[1] - cl - 16 * k : h[1] + cl + 40 * k, num ? `${f1(wall)}° ${trapped ? '>' : '<'} ic = ${f1(ic)}°` : trapped ? 'more than the critical angle' : 'less than the critical angle', trapped ? 'good' : 'bad', 24, {align: 'start', show: [2.2, 1e9]});
      anchors.wall = h;
    }
    if (!trapped) label(x1 - 10 * k, cy + hc + cl + 80 * k, 'the light leaks out: it is lost', 'bad', 26, {align: 'end', show: [5, 1e9]});
    Object.assign(anchors, {entry, core: [x0 + (x1 - x0) * .5, cy] as P2, cladding: [x0 + (x1 - x0) * .5, cy - hc - cl / 2] as P2, exit: pts.at(-1)!});
    dur = 9;
    story = trapped ? 'The light meets the wall beyond the critical angle: totally reflected, again and again'
      : 'The light meets the wall within the critical angle: at each hit it escapes';
    second = n2 > 1 ? 'The core is denser than its cladding: that is what traps the light' : 'Without cladding the glass meets air';
    facts.push(`critical angle at the core's wall: sin ic = n2/n1 = ${f1(n2 / n1, 3)}, ic = ${f1(ic)}°`,
      `at i = ${f1(i)}° it meets the wall at ${f1(wall)}°: ${trapped ? 'totally reflected' : 'it escapes'}`,
      acc >= 90 ? 'every ray entering the end is trapped' : `trapped up to i = ${f1(acc)}°: sin i = √(n1² − n2²)`);
  } else {
    const n = s.n ?? 1.52, ic = criticalAngle(n), c: P2 = [bx + bw * .5, cy], L = S * .62, h = L / Math.SQRT2;
    let tri: P2[], rays: [P2, P2][];
    if (s.show === 'prism_90') {        // Fig. 9.13(a): right angle at lower left, the long face from top left to lower right
      tri = [[c[0] - L / 2, c[1] - L / 2], [c[0] - L / 2, c[1] + L / 2], [c[0] + L / 2, c[1] + L / 2]];
      rays = [[[bx + bw * .02, c[1] - L * .05], [1, 0]], [[bx + bw * .02, c[1] + L * .2], [1, 0]]];
    } else if (s.show === 'prism_180') { // Fig. 9.13(b): the long face upright on the left, light in through its upper half
      tri = [[c[0] - h / 2, c[1] - h], [c[0] - h / 2, c[1] + h], [c[0] + h / 2, c[1]]];
      rays = [[[bx + bw * .02, c[1] - h * .6], [1, 0]], [[bx + bw * .02, c[1] - h * .25], [1, 0]]];
    } else {                             // Fig. 9.13(c): the long face below; light in through one slant face, out the other
      tri = [[c[0] - h, c[1] + h / 2], [c[0] + h, c[1] + h / 2], [c[0], c[1] - h / 2]];
      rays = [[[bx + bw * .02, c[1] + h * .2], [1, 0]], [[bx + bw * .02, c[1] + h * .36], [1, 0]]];
    }
    props.push({id: 'glass', type: 'polyline', points: tri, closed: true, style: {fill: 'cool', opacity: .2, stroke: 'cool', width: 4 * k}, layer: 1} as Prop);
    const colours = ['accent', 'good'];
    let reflections: {point: P2; angle: number}[] = [], leaked = false;
    rays.forEach(([p, d], j) => {
      const t = traceGlass(tri, n, p, d), last = t.pts.at(-1)!;
      // on out to the frame's edge
      let far = S;
      if (t.out[0] > 1e-9) far = Math.min(far, (bx + bw - last[0]) / t.out[0]); if (t.out[0] < -1e-9) far = Math.min(far, (bx - last[0]) / t.out[0]);
      if (t.out[1] > 1e-9) far = Math.min(far, (by + bh - last[1]) / t.out[1]); if (t.out[1] < -1e-9) far = Math.min(far, (by - last[1]) / t.out[1]);
      const pts = [...t.pts, [last[0] + t.out[0] * far, last[1] + t.out[1] * far] as P2];
      props.push({id: `ray${j}`, type: 'polyline', points: pts, style: {stroke: colours[j], width: 5 * k}, layer: 3, ...drawn(.6 + j * .5, 4.5 + j * .5)} as Prop);
      if (!j) reflections = t.events.filter(ev => ev.kind === 'tir');
      if (t.events.some((ev, m) => m > 0 && ev.kind === 'out' && t.events.filter(q => q.kind === 'tir').length === 0)) leaked = true;
      anchors[`ray${j + 1}`] = p; anchors[`out${j + 1}`] = pts.at(-1)!;
    });
    reflections.forEach((ev, j) => label(ev.point[0] + (s.show === 'prism_180' ? -60 : 30) * k, ev.point[1] + (s.show === 'prism_invert' ? 44 : -24) * k,
      num ? `${f1(ev.angle)}° > ic = ${f1(ic)}°` : 'beyond the critical angle', 'good', 24, {align: s.show === 'prism_180' ? 'end' : 'start', show: [2 + j, 1e9]}));
    anchors.prism = c; anchors.face = reflections[0]?.point ?? c;
    const turn = s.show === 'prism_90' ? 'through 90°' : s.show === 'prism_180' ? 'back through 180°' : 'on, upside down';
    story = leaked ? `Here the critical angle is ${f1(ic)}°, more than 45°: the light leaks out`
      : `Meeting a face beyond the critical angle, the light is totally reflected: turned ${turn}`;
    second = s.show === 'prism_invert' ? 'The rays leave in the opposite order: the image is inverted'
      : s.show === 'prism_180' ? 'The ray that went in higher comes out lower' : 'No silvering needed, nothing lost';
    facts.push(`n = ${n}: critical angle ${f1(ic)}°`, leaked ? 'within the critical angle the light leaks out of the long face' : 'it needs ic < 45°, that is n > 1.414',
      ...reflections.map(ev => `it meets the face at ${f1(ev.angle)}°, ${ev.angle > ic ? 'beyond' : 'within'} ic`));
  }
  return finish('tir', s as never, dur, story, second, facts, anchors, s.illustrative);
}

// ------------------------------------------------------------------------------------------- refracting_surface
export type RefractingSurfaceSpec = Common & {verb: 'refracting_surface'; show?: 'surface' | 'lens';
  /** surface: the media's indices, light going from n1 into n2 (default 1 and 1.5). */
  n1?: number; n2?: number;
  /** surface: radius of curvature in cm, + when the centre is on the far side (default 20). */
  R?: number;
  /** surface: a point object's distance in cm, negative (default −100, the book's example). */
  u?: number;
  /** lens: the glass's index (default 1.55) and its surfaces' radii in cm, signs by the convention (default 22, −22). */
  n?: number; R1?: number; R2?: number};

/** Refraction at one spherical surface: v from n2/v − n1/u = (n2 − n1)/R (Infinity when the rays leave parallel). */
export const surfaceImage = (n1: number, n2: number, R: number, u: number) => { const q = (n2 - n1) / R + n1 / u; return Math.abs(q) < 1e-12 ? Infinity : n2 / q; };
/** The lens maker's formula: f from 1/f = (n − 1)(1/R1 − 1/R2), in a medium of index 1. */
export const lensMaker = (n: number, R1: number, R2: number) => 1 / ((n - 1) * (1 / R1 - 1 / R2));

export function refractingSurfaceErrors(s: RefractingSurfaceSpec): string[] {
  const e: string[] = [], show = s.show ?? 'surface';
  if (!['surface', 'lens'].includes(show)) return ['refracting_surface: show is surface (one curved surface) or lens (two: the lens maker\'s formula)'];
  e.push(...only(s as never, 'refracting_surface', show, show === 'surface' ? ['n1', 'n2', 'R', 'u'] : ['n', 'R1', 'R2'], ['n1', 'n2', 'R', 'u', 'n', 'R1', 'R2']));
  for (const f of ['n1', 'n2', 'n'] as const) if (s[f] !== undefined && !(isNum(s[f]) && s[f]! >= 1 && s[f]! <= 2.5)) e.push(`refracting_surface: ${f} is 1 to 2.5`);
  for (const f of ['R', 'R1', 'R2'] as const) if (s[f] !== undefined && !(isNum(s[f]) && Math.abs(s[f]!) >= 2 && Math.abs(s[f]!) <= 500)) e.push(`refracting_surface: ${f} is a radius in cm, 2 to 500 either sign (+ when its centre is on the side the light goes to)`);
  if (s.u !== undefined && !(isNum(s.u) && s.u <= -1 && s.u >= -1000)) e.push('refracting_surface: u is the object\'s distance in cm, negative (−1 to −1000): the object is on the side the light comes from');
  if (e.length) return e;
  if (show === 'surface') {
    const n1 = s.n1 ?? 1, n2 = s.n2 ?? 1.5, v = surfaceImage(n1, n2, s.R ?? 20, s.u ?? -100);
    if (n1 === n2) e.push('refracting_surface: n1 and n2 must differ, or nothing refracts');
    else if (!Number.isFinite(v) || Math.abs(v) > 2000) e.push(`refracting_surface: the rays leave (nearly) parallel and the image is at infinity; move the object (u)`);
  } else {
    const f = lensMaker(s.n ?? 1.55, s.R1 ?? 22, s.R2 ?? -22);
    if (!Number.isFinite(f) || Math.abs(f) > 500) e.push('refracting_surface: R1 and R2 give a lens of no power (f beyond 500 cm); give surfaces that bend the light');
  }
  return e;
}

export function refractingSurface(s: RefractingSurfaceSpec): Scene {
  const {k, props, bx, bw, cy, S, line, poly, label, finish} = kit(s);
  const num = !s.illustrative, facts: string[] = [], anchors: Record<string, P2> = {}, show = s.show ?? 'surface';
  const drawn = (t0: number, t1: number) => ({draw: 0, keys: {draw: [[t0, 0], [t1, 1, 'linear']] as Key[]}});
  let story = '', second = '';
  const sag = (Rp: number, y: number) => Math.abs(Rp) - Math.sqrt(Math.max(0, Rp * Rp - y * y));
  if (show === 'surface') {
    const n1 = s.n1 ?? 1, n2 = s.n2 ?? 1.5, R = s.R ?? 20, u = s.u ?? -100, v = surfaceImage(n1, n2, R, u);
    const xs = [u, 0, R, v], lo = Math.min(...xs), hi = Math.max(...xs), pad = (hi - lo) * .08;
    const ppc = bw * .94 / (hi - lo + 2 * pad), X = (x: number) => bx + bw * .03 + (x - lo + pad) * ppc, Rp = R * ppc, a = S * .28;
    // heights stretched when the true aperture would be a sliver (paraxial rays stay straight lines to I either way)
    const ex = Math.max(1, a / (Math.abs(Rp) * .6)), surf = (y: number) => X(0) + Math.sign(R) * sag(Rp, y / ex);
    if (ex > 1.5) label(bx + bw * .97, cy + a + 50 * k, 'heights not to scale', 'muted', 22, {align: 'end'});
    line([bx, cy], [bx + bw, cy], 'faint', 2);
    const arc = Array.from({length: 41}, (_, j) => { const y = -a + 2 * a * j / 40; return [surf(y), cy + y] as P2; });
    props.push({id: 'medium2', type: 'polyline', points: [...arc, [bx + bw, cy + a], [bx + bw, cy - a]], closed: true, style: {fill: 'cool', opacity: .14}, layer: 0} as Prop);
    poly(arc, 'cool', 4);
    const O: P2 = [X(u), cy], I: P2 = [X(v), cy], real = v > 0;
    props.push({id: 'O', type: 'circle', x: O[0], y: O[1], r: 8 * k, style: {fill: 'accent'}, layer: 4} as Prop);
    label(O[0], cy + 40 * k, 'O', 'accent', 28);
    props.push({id: 'C', type: 'circle', x: X(R), y: cy, r: 6 * k, style: {fill: 'muted'}, layer: 4} as Prop); label(X(R), cy + 40 * k, 'C', 'muted', 26);
    label(X(0) - 16 * k, cy - a - 20 * k, num ? `n1 = ${n1}` : 'n1', 'ink', 24, {align: 'end'}); label(X(0) + 16 * k, cy - a - 20 * k, num ? `n2 = ${n2}` : 'n2', 'cool', 24, {align: 'start'});
    [-.7, -.35, .35, .7].forEach((f, j) => {
      const P: P2 = [surf(a * f), cy + a * f];
      props.push({id: `in${j}`, type: 'line', x1: O[0], y1: O[1], x2: P[0], y2: P[1], style: {stroke: 'accent', width: 4 * k}, layer: 3, ...drawn(.6, 2)} as Prop);
      const d = unit(real ? [I[0] - P[0], I[1] - P[1]] : [P[0] - I[0], P[1] - I[1]]), L = real ? Math.hypot(I[0] - P[0], I[1] - P[1]) * 1.25 : S * .5;
      props.push({id: `out${j}`, type: 'line', x1: P[0], y1: P[1], x2: P[0] + d[0] * L, y2: P[1] + d[1] * L, style: {stroke: 'accent', width: 4 * k}, layer: 3, ...drawn(2.2, 3.8)} as Prop);
      if (!real) props.push({id: `back${j}`, type: 'line', x1: P[0], y1: P[1], x2: I[0], y2: I[1], style: {stroke: 'muted', width: 2.5 * k, dash: [10 * k, 8 * k]}, layer: 2, ...drawn(4, 5)} as Prop);
    });
    props.push({id: 'I', type: 'circle', x: I[0], y: I[1], r: 8 * k, style: {fill: real ? 'good' : 'muted'}, layer: 4, show: [real ? 3.8 : 5, 1e9]} as Prop);
    label(I[0], cy - 22 * k, real ? 'I (real)' : 'I (virtual)', real ? 'good' : 'muted', 26, {show: [4, 1e9]});
    Object.assign(anchors, {object: O, image: I, centre: [X(R), cy] as P2, vertex: [X(0), cy] as P2, medium1: [X(0) - 60 * k, cy - a] as P2, medium2: [X(0) + 60 * k, cy - a] as P2});
    story = 'Rays from O bend at the curved surface and meet (or seem to meet) at one point, I: n2/v − n1/u = (n2 − n1)/R';
    second = real ? 'The rays really meet: a real image, on the far side' : 'The rays spread apart as if from I on the near side: a virtual image';
    facts.push(`n1 = ${n1}, n2 = ${n2}, R = ${f1(R)} cm, u = ${f1(u)} cm`, `n2/v = (n2 − n1)/R + n1/u gives v = ${f1(v)} cm: a ${real ? 'real' : 'virtual'} image`);
    return finish('refracting_surface', s as never, 6, story, second, facts, anchors, s.illustrative);
  }
  // lens: a parallel beam from the left; the first surface alone would bring it to I1, the second to F
  const n = s.n ?? 1.55, R1 = s.R1 ?? 22, R2 = s.R2 ?? -22, f = lensMaker(n, R1, R2), v1 = n * R1 / (n - 1);
  const xs = [0, f, Number.isFinite(v1) && Math.abs(v1) < 4 * Math.abs(f) ? v1 : f], span = Math.max(...xs.map(Math.abs)) * 1.15;
  const lo = Math.min(-span * .55, ...xs.map(x => x * 1.1)), hi = Math.max(span * .3, ...xs.map(x => x * 1.1));
  const ppc = bw * .94 / (hi - lo), X = (x: number) => bx + bw * .03 + (x - lo) * ppc, x0 = X(0);
  const Rp1 = R1 * ppc, Rp2 = R2 * ppc, a = Math.min(S * .3, Math.abs(Rp1) * .85, Math.abs(Rp2) * .85);
  const t = Math.max(10 * k, 10 * k + Math.sign(R1) * sag(Rp1, a) - Math.sign(R2) * sag(Rp2, a));
  const front = (y: number) => x0 - t / 2 + Math.sign(R1) * sag(Rp1, y), backS = (y: number) => x0 + t / 2 + Math.sign(R2) * sag(Rp2, y);
  line([bx, cy], [bx + bw, cy], 'faint', 2);
  const ys = Array.from({length: 41}, (_, j) => -a + 2 * a * j / 40);
  props.push({id: 'lens', type: 'polyline', points: [...ys.map(y => [front(y), cy + y] as P2), ...ys.slice().reverse().map(y => [backS(y), cy + y] as P2)], closed: true,
    style: {fill: 'cool', opacity: .22, stroke: 'cool', width: 3 * k}, layer: 1} as Prop);
  const I1: P2 = [X(v1), cy], F: P2 = [X(f), cy], showI1 = Number.isFinite(v1) && Math.abs(v1) < 4 * Math.abs(f);
  [-.7, -.35, .35, .7].forEach((q, j) => {
    const y = a * q, P: P2 = [front(y), cy + y];
    props.push({id: `in${j}`, type: 'line', x1: bx + bw * .01, y1: cy + y, x2: P[0], y2: P[1], style: {stroke: 'accent', width: 4 * k}, layer: 3, ...drawn(.5, 1.6)} as Prop);
    // inside: towards I1 (paraxial), to the second surface
    const d = unit(v1 > 0 ? [I1[0] - P[0], I1[1] - P[1]] : [P[0] - I1[0], P[1] - I1[1]]);
    let Q: P2 = P; for (let m = 0; m < 6; m++) { const tt = (backS(Q[1] - cy) - P[0]) / d[0]; Q = [P[0] + d[0] * tt, P[1] + d[1] * tt]; }
    props.push({id: `glass${j}`, type: 'line', x1: P[0], y1: P[1], x2: Q[0], y2: Q[1], style: {stroke: 'accent', width: 4 * k}, layer: 3, ...drawn(1.6, 2)} as Prop);
    if (showI1) props.push({id: `toI1${j}`, type: 'line', x1: Q[0], y1: Q[1], x2: I1[0], y2: I1[1], style: {stroke: 'muted', width: 2.5 * k, dash: [10 * k, 8 * k]}, layer: 2, show: [2.2, 5.2], fade: .3} as Prop);
    const e = unit(f > 0 ? [F[0] - Q[0], F[1] - Q[1]] : [Q[0] - F[0], Q[1] - F[1]]), L = f > 0 ? Math.hypot(F[0] - Q[0], F[1] - Q[1]) * 1.3 : S * .45;
    props.push({id: `out${j}`, type: 'line', x1: Q[0], y1: Q[1], x2: Q[0] + e[0] * L, y2: Q[1] + e[1] * L, style: {stroke: 'good', width: 4 * k}, layer: 3, ...drawn(5.2, 6.6)} as Prop);
    if (f < 0) props.push({id: `backF${j}`, type: 'line', x1: Q[0], y1: Q[1], x2: F[0], y2: F[1], style: {stroke: 'muted', width: 2.5 * k, dash: [10 * k, 8 * k]}, layer: 2, ...drawn(6.6, 7.4)} as Prop);
  });
  if (showI1) { props.push({id: 'I1', type: 'circle', x: I1[0], y: I1[1], r: 7 * k, style: {fill: 'muted'}, layer: 4, show: [2.6, 5.2]} as Prop); label(I1[0] + 10 * k, cy + 44 * k, 'I1: first surface alone', 'muted', 24, {align: 'end', show: [2.6, 5.2]}); }
  props.push({id: 'F', type: 'circle', x: F[0], y: F[1], r: 8 * k, style: {fill: 'good'}, layer: 4, show: [6.4, 1e9]} as Prop); label(F[0], cy + 44 * k, 'F', 'good', 28, {show: [6.4, 1e9]});
  label(x0, cy - a - 24 * k, num ? `n = ${n}` : 'glass', 'cool', 24);
  Object.assign(anchors, {lens: [x0, cy] as P2, focus: F, image1: I1, front: [front(0), cy] as P2, back: [backS(0), cy] as P2});
  story = 'Each surface refracts in turn: the first alone would bring the light to I1, the second brings it to F';
  second = 'Adding the two surfaces\' equations gives the lens maker\'s formula: 1/f = (n − 1)(1/R1 − 1/R2)';
  facts.push(`n = ${n}, R1 = ${f1(R1)} cm, R2 = ${f1(R2)} cm`, `first surface alone: v1 = nR1/(n − 1) = ${f1(v1)} cm`, `1/f = (n − 1)(1/R1 − 1/R2): f = ${f1(f)} cm, power ${f1(100 / f, 2)} D`);
  return finish('refracting_surface', s as never, 8.5, story, second, facts, anchors, s.illustrative);
}

// ---------------------------------------------------------------------------------------------- prism_deviation
export type DeviationSpec = Common & {verb: 'prism_deviation';
  /** The prism's angle A in degrees (default 60). */
  A?: number;
  /** The prism's refractive index (default 1.5), or Dm, the measured minimum deviation in degrees, to find n from. */
  n?: number; Dm?: number;
  /** The surrounding medium's index (default 1, air; water 1.33). */
  medium?: number;
  /** Angles of incidence in degrees to show in turn (default: four across the range, the least deviation last). */
  incidences?: number[];
  seconds_each?: number};

/** The deviation at incidence i (degrees) for a prism of angle A and relative index n21; NaN when the ray cannot leave. */
export function deviation(A: number, n21: number, i: number) {
  const r1 = deg(Math.asin(Math.sin(rad(i)) / n21)), r2 = A - r1, se = n21 * Math.sin(rad(r2));
  return Math.abs(se) > 1 ? NaN : i + deg(Math.asin(se)) - A;
}
export const minimumDeviation = (A: number, n21: number) => 2 * deg(Math.asin(Math.min(1, n21 * Math.sin(rad(A / 2))))) - A;
export const indexFromDm = (A: number, Dm: number) => Math.sin(rad((A + Dm) / 2)) / Math.sin(rad(A / 2));
/** The least angle of incidence at which the ray still leaves the second face (degrees). */
export const grazingIncidence = (A: number, n21: number) => { const r1 = A - deg(Math.asin(Math.min(1, 1 / n21))); return r1 <= 0 ? 0 : deg(Math.asin(Math.min(1, n21 * Math.sin(rad(r1))))); };

function deviationSetup(s: DeviationSpec) {
  const A = s.A ?? 60, m = s.medium ?? 1, n21 = s.Dm !== undefined ? indexFromDm(A, s.Dm) : (s.n ?? 1.5) / m;
  return {A, m, n21, n: n21 * m, Dm: minimumDeviation(A, n21), i0: grazingIncidence(A, n21)};
}

export function prismDeviationErrors(s: DeviationSpec): string[] {
  const e: string[] = [];
  if (s.A !== undefined && !(isNum(s.A) && s.A >= 20 && s.A <= 75)) e.push('prism_deviation: A is 20 to 75 degrees');
  if (s.n !== undefined && s.Dm !== undefined) e.push('prism_deviation: give n or Dm (to find n from), not both');
  if (s.n !== undefined && !(isNum(s.n) && s.n > 1 && s.n <= 2.5)) e.push('prism_deviation: n is above 1, up to 2.5');
  if (s.Dm !== undefined && !(isNum(s.Dm) && s.Dm > 0 && s.Dm < 90)) e.push('prism_deviation: Dm is the minimum deviation in degrees, 0 to 90');
  if (s.medium !== undefined && !(isNum(s.medium) && s.medium >= 1 && s.medium <= 2)) e.push('prism_deviation: medium is the surrounding index, 1 (air) to 2');
  if (s.seconds_each !== undefined && !(isNum(s.seconds_each) && s.seconds_each >= 1.5 && s.seconds_each <= 6)) e.push('prism_deviation: seconds_each is 1.5 to 6');
  if (e.length) return e;
  const {A, n21, i0} = deviationSetup(s);
  if (n21 <= 1) return [`prism_deviation: the prism must be denser than the medium (n/medium = ${f1(n21, 3)}); it then bends light away from its base`];
  if (n21 * Math.sin(rad(A / 2)) >= 1) return ['prism_deviation: no ray gets through this prism at any angle (n sin(A/2) ≥ 1): use a smaller angle A'];
  if (s.incidences !== undefined) {
    if (!Array.isArray(s.incidences) || s.incidences.length < 1 || s.incidences.length > 6 || !s.incidences.every(isNum)) e.push('prism_deviation: incidences is a list of 1 to 6 angles in degrees');
    else s.incidences.forEach(i => { if (!(i > i0 + .5 && i <= 85)) e.push(`prism_deviation: incidence ${i}° does not get through: below ${f1(i0 + .5)}° the ray is totally reflected at the second face (use ${Math.ceil(i0 + .5)} to 85)`); });
  }
  return e;
}

export function prismDeviation(s: DeviationSpec): Scene {
  const {k, props, bx, by, bw, bh, S, line, label, finish} = kit(s);
  const num = !s.illustrative, facts: string[] = [], anchors: Record<string, P2> = {};
  const {A, m, n21, n, Dm, i0} = deviationSetup(s), iMin = (A + Dm) / 2, each = s.seconds_each ?? 3;
  const list = s.incidences ?? [i0 + (85 - i0) * .12, 85 - (85 - i0) * .05, i0 + (85 - i0) * .55, iMin].map(v => Math.round(v));
  const showMin = s.incidences === undefined || s.incidences.some(i => Math.abs(i - iMin) < .5);
  // the prism on the left half
  const side = Math.min(bw * .4, bh * .72), base = by + bh * .62 + side * Math.cos(rad(A / 2)) * .5, cxp = bx + bw * .25;
  const half = side * Math.sin(rad(A / 2)), hgt = side * Math.cos(rad(A / 2));
  const tri: P2[] = [[cxp - half, base], [cxp, base - hgt], [cxp + half, base]];
  props.push({id: 'prism', type: 'polyline', points: tri, closed: true, style: {fill: 'cool', opacity: .2, stroke: 'cool', width: 4 * k}, layer: 1} as Prop);
  label(cxp, base - hgt + 52 * k, 'A', 'cool', 28);
  if (m > 1) label(bx + 10 * k, by + 30 * k, num ? `in a medium of n = ${m}` : 'in water', 'cool', 24, {align: 'start'});
  // the graph on the right half: δ against i, i from 0 to 90
  const gx0 = bx + bw * .58, gx1 = bx + bw * .98, gy0 = by + bh * .86, gy1 = by + bh * .12;
  const curve = Array.from({length: 120}, (_, j) => i0 + .01 + (89.9 - i0) * j / 119).map(i => [i, deviation(A, n21, i)] as P2).filter(q => Number.isFinite(q[1]));
  const dHi = Math.max(...curve.map(q => q[1])), dLo = Math.max(0, Dm - (dHi - Dm) * .25);
  const G = (i: number, d: number): P2 => [gx0 + (gx1 - gx0) * i / 90, gy0 + (gy1 - gy0) * (d - dLo) / (dHi - dLo)];
  props.push({id: 'gx', type: 'arrow', x1: gx0, y1: gy0, x2: gx1 + 14 * k, y2: gy0, head: 14 * k, style: {stroke: 'muted', width: 3 * k}, layer: 2} as Prop,
    {id: 'gy', type: 'arrow', x1: gx0, y1: gy0, x2: gx0, y2: gy1 - 14 * k, head: 14 * k, style: {stroke: 'muted', width: 3 * k}, layer: 2} as Prop);
  label(gx1, gy0 + 36 * k, num ? 'i (0° to 90°)' : 'i', 'muted', 24, {align: 'end'}); label(gx0 - 12 * k, gy1, 'δ', 'muted', 28, {align: 'end'});
  const T = 1 + list.length * each;
  if (list.length >= 3) props.push({id: 'curve', type: 'polyline', points: curve.map(([i, d]) => G(i, d)), style: {stroke: 'muted', width: 3 * k}, layer: 2, show: [T - .2, 1e9], fade: .5} as Prop);
  // each incidence in turn: its ray through the prism, then its point on the graph
  const face = unit([tri[1][0] - tri[0][0], tri[1][1] - tri[0][1]]), inward: P2 = [face[1] * -1, face[0] * 1];
  const nIn: P2 = dot(inward, [1, 0]) > 0 ? inward : [-inward[0], -inward[1]];
  const hit: P2 = [(tri[0][0] + tri[1][0]) / 2, (tri[0][1] + tri[1][1]) / 2];
  list.forEach((i, j) => {
    const t0 = 1 + j * each, last = j === list.length - 1, win: [number, number] = [t0, last ? 1e9 : t0 + each - .1];
    const rot = (a: number): P2 => [nIn[0] * Math.cos(a) - nIn[1] * Math.sin(a), nIn[0] * Math.sin(a) + nIn[1] * Math.cos(a)];
    const dir = [rot(rad(i)), rot(-rad(i))].sort((p, q) => p[1] - q[1])[0];   // the ray comes up from below, as in Fig. 9.21
    const start: P2 = [hit[0] - dir[0] * side * .5, hit[1] - dir[1] * side * .5], t = traceGlass(tri, n21, start, dir), out = t.pts.at(-1)!;
    const end: P2 = [out[0] + t.out[0] * side * .45, out[1] + t.out[1] * side * .45], on: P2 = [hit[0] + dir[0] * side * .9, hit[1] + dir[1] * side * .9];
    const isMin = showMin && last && Math.abs(i - iMin) < .5, colour = isMin ? 'good' : 'accent';
    props.push({id: `ray${j}`, type: 'polyline', points: [...t.pts, end], style: {stroke: colour, width: 5 * k}, layer: 3, show: win, draw: 0, keys: {draw: [[t0, 0], [t0 + 1, 1, 'linear']] as Key[]}} as Prop);
    props.push({id: `straight${j}`, type: 'line', x1: hit[0], y1: hit[1], x2: on[0], y2: on[1], style: {stroke: 'muted', width: 2.5 * k, dash: [10 * k, 8 * k]}, layer: 2, show: [t0 + 1, win[1]]} as Prop);
    const d = deviation(A, n21, i), P = G(i, d);
    label(bx + 10 * k, by + bh * .97, num ? `i = ${f1(i)}°   δ = ${f1(d)}°` : '', colour, 28, {align: 'start', show: [t0 + 1, win[1]]});
    props.push({id: `pt${j}`, type: 'circle', x: P[0], y: P[1], r: 9 * k, style: {fill: colour}, layer: 4, show: [t0 + 1.2, 1e9]} as Prop);
    anchors.point = P; anchors.ray = hit;
    if (isMin) {
      const inside = t.pts[1], back = t.pts[2];
      label((inside[0] + back[0]) / 2, (inside[1] + back[1]) / 2 - 46 * k, 'parallel to the base: r = A/2', 'good', 24, {show: [t0 + 1.4, 1e9]});
      anchors.minimum = P;
    }
  });
  if (showMin) {
    const P = G(iMin, Dm);
    line([gx0, P[1]], [P[0], P[1]], 'good', 2.5, {show: [T, 1e9]}, true);
    label(gx0 + 10 * k, P[1] + 32 * k, num ? `Dm = ${f1(Dm)}°` : 'Dm', 'good', 26, {align: 'start', show: [T, 1e9]});
    anchors.minimum = P;
  }
  Object.assign(anchors, {prism: [cxp, base - hgt / 3] as P2, apex: tri[1], graph: [(gx0 + gx1) / 2, (gy0 + gy1) / 2] as P2, origin: [gx0, gy0] as P2});
  const story = 'As the angle of incidence grows, the deviation first falls, then rises: it is least, Dm, when the ray passes through symmetrically';
  const second = 'At the least deviation r1 = r2 = A/2 and i = e, so n21 = sin[(A + Dm)/2] / sin(A/2)';
  facts.push(s.Dm !== undefined ? `A = ${f1(A)}°, Dm = ${f1(s.Dm)}°: n = sin[(A + Dm)/2] / sin(A/2) = ${f1(n21, 3)}` : `A = ${f1(A)}°, n = ${f1(n, 3)}: minimum deviation Dm = ${f1(Dm)}° at i = ${f1(iMin)}°`,
    ...(m > 1 ? [`in a medium of index ${m} the prism's relative index is ${f1(n21, 3)}, and Dm = ${f1(Dm)}°`] : []),
    `deviations: ${list.map(i => `i = ${f1(i)}°, δ = ${f1(deviation(A, n21, i))}°`).join('; ')}`);
  return finish('prism_deviation', s as never, T + 2, story, second, facts, anchors, s.illustrative);
}

// ------------------------------------------------------------------------------------------- optical_instrument
export const INSTRUMENTS = ['simple_microscope', 'compound_microscope', 'refracting_telescope', 'reflecting_telescope'] as const;
export type InstrumentSpec = Common & {verb: 'optical_instrument'; show: (typeof INSTRUMENTS)[number];
  /** simple_microscope: the lens's focal length in cm (default 5). */
  f?: number;
  /** compound microscope, refracting telescope: objective and eyepiece focal lengths in cm. */
  fo?: number; fe?: number;
  /** compound_microscope: the distance between the lenses in cm (default 15, the book's exercise). */
  L?: number;
  /** where the final image is: at the near point (D, 25 cm) or at infinity (normal adjustment). */
  image_at?: 'near_point' | 'infinity';
  /** refracting_telescope: the distant object's angle α at the eye, in degrees (default: so the final image is 30° wide). */
  angle?: number;
  /** reflecting_telescope (Cassegrain): the mirrors' radii in mm and their separation in mm (default 220, 140, 60). */
  R1?: number; R2?: number; d?: number};

const D0 = 25;
export function simpleMicroscope(f: number, at: 'near_point' | 'infinity' = 'near_point') {
  return at === 'near_point' ? {u: -D0 * f / (D0 + f), v: -D0, m: 1 + D0 / f} : {u: -f, v: -Infinity, m: D0 / f};
}
export function compoundMicroscope(fo: number, fe: number, L: number, at: 'near_point' | 'infinity' = 'near_point') {
  const ue = at === 'near_point' ? -D0 * fe / (D0 + fe) : -fe, vo = L + ue, uo = 1 / (1 / vo - 1 / fo), mo = vo / uo, me = at === 'near_point' ? 1 + D0 / fe : D0 / fe;
  return {ue, vo, uo, mo, me, m: Math.abs(mo) * me};
}
export function refractingTelescope(fo: number, fe: number, at: 'near_point' | 'infinity' = 'infinity') {
  const ue = at === 'near_point' ? -D0 * fe / (D0 + fe) : -fe;
  return {m: at === 'near_point' ? fo / fe * (1 + fe / D0) : fo / fe, L: fo - ue};
}
/** Cassegrain: the secondary is d in front of the primary; the light it meets converges to a point f1 − d behind it.
 * v: where the final image is, measured from the secondary towards the primary (+), or Infinity / negative (virtual). */
export function cassegrain(R1: number, R2: number, d: number) {
  const f1v = R1 / 2, p = f1v - d, f2 = R2 / 2;
  return {f1: f1v, p, v: Math.abs(p - f2) < 1e-9 ? Infinity : p * f2 / (f2 - p)};
}

export function opticalInstrumentErrors(s: InstrumentSpec): string[] {
  const e: string[] = [];
  if (!INSTRUMENTS.includes(s.show)) return [`optical_instrument: show is one of ${INSTRUMENTS.join(', ')}`];
  const use: Record<string, string[]> = {simple_microscope: ['f', 'image_at'], compound_microscope: ['fo', 'fe', 'L', 'image_at'], refracting_telescope: ['fo', 'fe', 'image_at', 'angle'], reflecting_telescope: ['R1', 'R2', 'd']};
  e.push(...only(s as never, 'optical_instrument', s.show, use[s.show], ['f', 'fo', 'fe', 'L', 'image_at', 'angle', 'R1', 'R2', 'd']));
  if (s.image_at !== undefined && !['near_point', 'infinity'].includes(s.image_at)) e.push('optical_instrument: image_at is near_point (25 cm) or infinity');
  for (const f of ['f', 'fo', 'fe', 'L'] as const) if (s[f] !== undefined && !(isNum(s[f]) && s[f]! > 0 && s[f]! <= 2000)) e.push(`optical_instrument: ${f} is a length in cm, above 0`);
  for (const f of ['R1', 'R2', 'd'] as const) if (s[f] !== undefined && !(isNum(s[f]) && s[f]! > 0 && s[f]! <= 5000)) e.push(`optical_instrument: ${f} is a length in mm, above 0`);
  if (s.angle !== undefined && !(isNum(s.angle) && s.angle > 0 && s.angle <= 10)) e.push('optical_instrument: angle is the distant object\'s angle in degrees, above 0 up to 10');
  if (e.length) return e;
  if (s.show === 'compound_microscope') {
    const fo = s.fo ?? 2, fe = s.fe ?? 6.25, c = compoundMicroscope(fo, fe, s.L ?? 15, s.image_at);
    if (fo >= fe * 2 && s.fo !== undefined && s.fe !== undefined) e.push('optical_instrument: a microscope\'s objective has the shorter focal length (fo < fe)');
    if (c.vo <= fo * 1.05) e.push(`optical_instrument: with L = ${s.L ?? 15} cm the objective's image would have to be ${f1(c.vo)} cm away, inside its focal length: lengthen L`);
  }
  if (s.show === 'simple_microscope' && (s.image_at ?? 'near_point') === 'near_point' && (s.f ?? 5) < 4)
    // 2026-11-03 (leph2-01 C8): f 2 cm with the image at 25 cm, true to scale, put the lens and object in a corner
    e.push(`optical_instrument: with f = ${s.f} cm the image at 25 cm is ${f1(1 + 25 / s.f!, 2)} times the object and the lens a speck in the corner: choose f 4 cm or more, or image_at infinity`);
  if (s.show === 'refracting_telescope' && (s.fo ?? 144) <= (s.fe ?? 6)) e.push('optical_instrument: a telescope\'s objective has the longer focal length (fo > fe)');
  if (s.show === 'reflecting_telescope') {
    const {p} = cassegrain(s.R1 ?? 220, s.R2 ?? 140, s.d ?? 60);
    if (p <= 0) e.push('optical_instrument: the secondary must sit inside the primary\'s focal length: d < R1/2');
  }
  return e;
}

export function opticalInstrument(s: InstrumentSpec): Scene {
  const {k, props, bx, by, bw, bh, cy, S, arrow, line, label, finish} = kit(s);
  const num = !s.illustrative, facts: string[] = [], anchors: Record<string, P2> = {};
  const drawn = (t0: number, t1: number) => ({draw: 0, keys: {draw: [[t0, 0], [t1, 1, 'linear']] as Key[]}});
  let story = '', second = '', dur = 9;
  const at = s.image_at ?? (s.show === 'refracting_telescope' ? 'infinity' : 'near_point');
  // image_at left out: the rays are traced for the default, but the words name no adjustment (2026-11-03: a reviewer struck a
  // near-point picture on the sentence that only introduced the lens, three times, until the plan ran out of tries)
  const told = s.image_at !== undefined;
  // physical cm (y up) → screen, one scale both ways: the drawing is true to scale
  let ppc = 1, xl = 0;
  const X = (x: number) => bx + bw * .03 + (x - xl) * ppc, Y = (y: number) => cy - y * ppc, P = (q: P2): P2 => [X(q[0]), Y(q[1])];
  const lens = (x: number, half: number, name: string, fval: number) => {
    props.push({id: `lens-${name}`, type: 'line', x1: X(x), y1: Y(half), x2: X(x), y2: Y(-half), style: {stroke: 'cool', width: 5 * k}, layer: 2} as Prop);
    for (const sg of [1, -1]) props.push({id: `lens-${name}-${sg}`, type: 'polyline', points: [[X(x) - 12 * k, Y(sg * half) + sg * 14 * k], [X(x), Y(sg * half)], [X(x) + 12 * k, Y(sg * half) + sg * 14 * k]], style: {stroke: 'cool', width: 4 * k}, layer: 2} as Prop);
    label(X(x), Y(half) - 18 * k, name, 'cool', 24);
    for (const sg of [1, -1]) if (x + sg * fval > xl) { props.push({id: `F-${name}-${sg}`, type: 'circle', x: X(x + sg * fval), y: cy, r: 5 * k, style: {fill: 'muted'}, layer: 2} as Prop); }
  };
  const objectArrow = (x: number, h: number, colour: string, dashed = false, show: [number, number] = [0, 1e9]) =>
    props.push({id: `arrow-${colour}-${round(x)}`, type: 'arrow', x1: X(x), y1: cy, x2: X(x), y2: Y(h), head: 14 * k, style: {stroke: colour, width: 5 * k, ...(dashed ? {dash: [10 * k, 8 * k]} : {})}, layer: 4, show} as Prop);
  // a paraxial ray: from (x, y) with slope s through thin lenses [x, f] in order; the points, and the slope it leaves with
  const transfer = (x: number, y: number, sl: number, lenses: [number, number][]) => {
    const pts: P2[] = [[x, y]]; let cx = x, cyy = y, sc = sl;
    for (const [xl2, f] of lenses) { cyy += sc * (xl2 - cx); cx = xl2; pts.push([cx, cyy]); sc -= cyy / f; }
    return {pts, slope: sc};
  };
  const round = (v: number) => Math.round(v * 100);
  if (s.show === 'simple_microscope' || s.show === 'compound_microscope') {
    const compound = s.show === 'compound_microscope';
    const fo = compound ? s.fo ?? 2 : s.f ?? 5, fe = s.fe ?? 6.25, L = compound ? s.L ?? 15 : 0;
    const c = compound ? compoundMicroscope(fo, fe, L, at) : null, sm = compound ? null : simpleMicroscope(fo, at);
    const u = compound ? c!.uo : sm!.u, lenses: [number, number][] = compound ? [[0, fo], [L, fe]] : [[0, fo]];
    const vFinal = at === 'near_point' ? (compound ? L - D0 : -D0) : NaN, m = compound ? c!.m : sm!.m;
    const lo = Math.min(u, Number.isFinite(vFinal) ? vFinal : u, -fo) - 1.5, hi = (compound ? L + fe : fo) + 4;
    ppc = bw * .94 / (hi - lo); xl = lo;
    const room = bh * .42 / ppc, h = Math.min(room / (at === 'near_point' ? m : 2.5), (compound ? 1 : 2) * room / 4);
    line([bx, cy], [bx + bw, cy], 'faint', 2);
    objectArrow(u, h, 'accent');
    label(X(u), cy + 40 * k, 'object', 'accent', 24);
    const rays = [transfer(u, h, 0, lenses), transfer(u, h, -h / (0 - u), lenses)];
    const half = Math.max(...rays.flatMap(r => r.pts.slice(1).map(q => Math.abs(q[1])))) * 1.15 + 1 / ppc * 20;
    lens(0, half, compound ? 'objective' : 'lens', fo); if (compound) lens(L, half, 'eyepiece', fe);
    rays.forEach((r, j) => {
      const end = r.pts.at(-1)!, run = (hi - end[0]), out: P2 = [end[0] + run, end[1] + r.slope * run];
      const segs = [...r.pts, out];
      props.push({id: `ray${j}`, type: 'polyline', points: segs.map(P), style: {stroke: j ? 'good' : 'accent', width: 4 * k}, layer: 3, ...drawn(.6, compound ? 4.5 : 3)} as Prop);
      if (Number.isFinite(vFinal)) props.push({id: `back${j}`, type: 'line', x1: X(end[0]), y1: Y(end[1]), x2: X(vFinal), y2: Y(end[1] + r.slope * (vFinal - end[0])), style: {stroke: 'muted', width: 2.5 * k, dash: [10 * k, 8 * k]}, layer: 2, ...drawn(compound ? 4.8 : 3.2, compound ? 6 : 4.4)} as Prop);
    });
    if (compound) {
      const hi1 = h * c!.mo; objectArrow(c!.vo, hi1, 'cool', false, [2.6, 1e9]);
      label(X(c!.vo), cy - Math.sign(hi1) * 36 * k + (hi1 < 0 ? 0 : 0), 'first image (real)', 'cool', 22, {show: [2.6, 1e9]});
      anchors.image1 = P([c!.vo, hi1]); anchors.eyepiece = P([L, 0]);
    }
    if (Number.isFinite(vFinal)) {
      const hf = rays[0].pts.at(-1)![1] + rays[0].slope * (vFinal - rays[0].pts.at(-1)![0]);
      objectArrow(vFinal, hf, 'muted', true, [compound ? 6 : 4.4, 1e9]);
      label(Math.max(X(vFinal), bx + 150 * k), Y(hf) + (hf > 0 ? -18 : 36) * k, num && told ? 'final image, 25 cm from the eye' : 'final image (virtual)', 'muted', 22, {show: [compound ? 6 : 4.4, 1e9]});
      anchors.image = P([vFinal, hf]); anchors.near_point = P([vFinal, 0]);
    }
    const eye = compound ? L : 0;
    props.push({id: 'eye', type: 'circle', x: X(eye) + 34 * k, y: cy, r: 14 * k, style: {stroke: 'ink', width: 3 * k}, layer: 1} as Prop);
    label(X(eye) + 34 * k, cy + 44 * k, 'eye', 'ink', 22);
    Object.assign(anchors, {object: P([u, h]), objective: P([0, 0]), lens: P([0, 0]), eye: [X(eye) + 34 * k, cy] as P2});
    if (compound) {
      story = 'The objective makes a real, enlarged, inverted image; the eyepiece, used as a magnifier, enlarges it again';
      second = !told ? 'm = mo × me: each lens magnifies in turn' : at === 'near_point' ? 'm = mo × me: mo = vo/|uo|, and me = 1 + D/fe with the final image at the near point' : 'With the final image at infinity, me = D/fe';
      facts.push(`fo = ${fo} cm, fe = ${fe} cm, lenses ${L} cm apart: place the object ${f1(-u, 2)} cm from the objective`);
      if (told) facts.push(`the objective's image is ${f1(c!.vo, 2)} cm behind it: mo = ${f1(Math.abs(c!.mo), 2)}; the eyepiece gives me = ${f1(c!.me, 2)}`, `magnifying power m = ${f1(m, 1)}`);
    } else {
      story = told ? 'Held close to the eye, a convex lens lets the object come nearer than 25 cm: it fills a larger angle' : 'Held close to the eye, a convex lens of short focal length lets the object come nearer: it fills a larger angle';
      second = !told ? 'The object sits within f of the lens: the image is virtual, erect and magnified' : at === 'near_point' ? 'The image is virtual, erect and at the near point: m = 1 + D/f' : 'With the object at the focus the image is at infinity: m = D/f';
      facts.push(told ? `f = ${fo} cm: the object is ${f1(-u, 2)} cm from the lens` : `f = ${fo} cm: the object is within f of the lens`);
      if (told) facts.push(`magnifying power m = ${at === 'near_point' ? '1 + D/f' : 'D/f'} = ${f1(m, 2)}`);
    }
    dur = compound ? 8 : 6;
  } else if (s.show === 'refracting_telescope') {
    const fo = s.fo ?? 144, fe = s.fe ?? 6, t = refractingTelescope(fo, fe, at), ue = at === 'near_point' ? -D0 * fe / (D0 + fe) : -fe, xe = fo - ue;
    const alpha = s.angle ?? Math.min(3, 30 / t.m), sl = -Math.tan(rad(alpha));   // the object above: its light comes down
    const lo = -fo * .12, hi = xe + Math.max(fe * 3, fo * .12);
    ppc = bw * .94 / (hi - lo); xl = lo;
    line([bx, cy], [bx + bw, cy], 'faint', 2);
    const a = Math.min(fo / 8, bh * .3 / ppc), lenses: [number, number][] = [[0, fo], [xe, fe]];
    const rays = [a * .8, 0, -a * .8].map(y0 => transfer(lo, y0 - sl * (0 - lo), sl, lenses));
    const halfE = Math.max(...rays.map(r => Math.abs(r.pts[2][1]))) * 1.3 + 14 / ppc;
    lens(0, a * 1.05, 'objective', fo); lens(xe, halfE, 'eyepiece', fe);
    rays.forEach((r, j) => {
      const end = r.pts.at(-1)!, run = hi - end[0];
      props.push({id: `ray${j}`, type: 'polyline', points: [...r.pts, [end[0] + run, end[1] + r.slope * run] as P2].map(P), style: {stroke: j === 1 ? 'good' : 'accent', width: 3.5 * k}, layer: 3, ...drawn(.6, 4)} as Prop);
    });
    const yi = fo * sl; objectArrow(fo, yi, 'cool', false, [2.2, 1e9]);
    label(X(fo), cy + 44 * k + Math.max(0, -yi * ppc), 'image in the focal plane', 'cool', 22, {align: 'end', show: [2.2, 1e9]});
    const beta = deg(Math.atan(Math.abs(rays[1].slope)));
    label(X(0) + 60 * k, cy - 14 * k, num ? `α = ${f1(alpha, 2)}°` : 'α', 'accent', 24, {align: 'start', show: [1, 1e9]});
    label(X(xe) + 30 * k, cy + 70 * k, num ? `β = ${f1(beta, 1)}°` : 'β', 'good', 24, {align: 'start', show: [4, 1e9]});
    Object.assign(anchors, {objective: P([0, 0]), eyepiece: P([xe, 0]), image1: P([fo, yi]), focus: P([fo, 0])});
    story = 'Light from a distant object comes in at a small angle α; the objective images it in its focal plane, and the eyepiece sends it on at a larger angle β';
    second = at === 'infinity' ? 'In normal adjustment m = β/α = fo/fe, and the tube is fo + fe long' : 'With the final image at 25 cm, m = (fo/fe)(1 + fe/D)';
    facts.push(`fo = ${fo} cm, fe = ${fe} cm: magnifying power m = ${f1(t.m, 2)}`, `separation of the lenses ${f1(t.L, 2)} cm`);
    dur = 7;
  } else {
    // Cassegrain, in mm: the primary's vertex at 0 (concave, facing left), the secondary's at −d (convex, facing right)
    const R1 = s.R1 ?? 220, R2 = s.R2 ?? 140, d = s.d ?? 60, c = cassegrain(R1, R2, d), real = Number.isFinite(c.v) && c.v > 0;
    const imageX = real ? -d + c.v : NaN, lo = -d - Math.max(d, R1 * .25) - 30, hi = Math.max(real ? imageX : 0, 0) + Math.max(30, R1 * .15);
    ppc = bw * .94 / (hi - lo); xl = lo;
    const A1 = Math.min(R1 * .22, bh * .4 / ppc), hole = A1 * .18, ys = A1 * (c.p / c.f1) * 1.08 + 2;
    line([bx, cy], [bx + bw, cy], 'faint', 2);
    const prim = (y: number) => -R1 + Math.sqrt(R1 * R1 - y * y), sec = (y: number) => -d - R2 + Math.sqrt(R2 * R2 - y * y);
    for (const sg of [1, -1]) props.push({id: `primary${sg}`, type: 'polyline', points: Array.from({length: 21}, (_, j) => { const y = sg * (hole + (A1 - hole) * j / 20); return P([prim(y), y]); }), style: {stroke: 'cool', width: 6 * k}, layer: 2} as Prop);
    props.push({id: 'secondary', type: 'polyline', points: Array.from({length: 21}, (_, j) => { const y = -ys + 2 * ys * j / 20; return P([sec(y), y]); }), style: {stroke: 'cool', width: 6 * k}, layer: 2} as Prop);
    label(X(0) + 16 * k, Y(A1) - 6 * k, 'primary (concave)', 'cool', 22, {align: 'start'}); label(X(-d), cy + 34 * k, 'secondary (convex)', 'cool', 22, {align: 'end'});
    // rays parallel to the axis, outside the secondary's shadow: reflected on the true spheres
    [.9, .55, -.55, -.9].map(q => q * A1).forEach((y0, j) => {
      const p1: P2 = [prim(y0), y0], C1: P2 = [-R1, 0], n1 = unit([p1[0] - C1[0], p1[1] - C1[1]]), d1 = reflect([1, 0], n1) as P2;
      const C2: P2 = [-d - R2, 0], o: P2 = [p1[0] - C2[0], p1[1] - C2[1]], b = dot(o, d1), cc = dot(o, o) - R2 * R2, disc = b * b - cc;
      const tt = disc < 0 ? NaN : [-b - Math.sqrt(disc), -b + Math.sqrt(disc)].find(t2 => t2 > 1e-6 && p1[0] + d1[0] * t2 > C2[0])!;
      const p2: P2 = [p1[0] + d1[0] * tt, p1[1] + d1[1] * tt], d2 = reflect(d1, unit([p2[0] - C2[0], p2[1] - C2[1]])) as P2;
      const far = (hi - p2[0]) / Math.max(.05, d2[0]), p3: P2 = [p2[0] + d2[0] * far, p2[1] + d2[1] * far];
      props.push({id: `ray${j}`, type: 'polyline', points: [P([lo, y0]), P(p1), P(p2), P(p3)], style: {stroke: 'accent', width: 3.5 * k}, layer: 3, ...drawn(.6, 4.5)} as Prop);
      if (!real) props.push({id: `back${j}`, type: 'line', x1: X(p2[0]), y1: Y(p2[1]), x2: X(-d - (Number.isFinite(c.v) ? -c.v : 0)), y2: cy, style: {stroke: 'muted', width: 2, dash: [10 * k, 8 * k]}, layer: 2, ...drawn(4.6, 5.4)} as Prop);
    });
    if (real) { props.push({id: 'image', type: 'circle', x: X(imageX), y: cy, r: 8 * k, style: {fill: 'good'}, layer: 4, show: [4.4, 1e9]} as Prop); label(X(imageX), cy + 40 * k, 'image', 'good', 24, {show: [4.4, 1e9]}); }
    Object.assign(anchors, {primary: P([prim(A1 * .6), A1 * .6]), secondary: P([-d, 0]), focus: P([-c.f1, 0]), image: real ? P([imageX, 0]) : P([-d, 0])});
    story = 'The concave primary gathers the light; before it can focus, the convex secondary sends it back through a hole in the primary';
    second = 'Folding the light this way gives a long focal length in a short tube, and mirrors have no chromatic aberration';
    facts.push(`primary R1 = ${R1} mm (f = ${f1(c.f1)} mm), secondary R2 = ${R2} mm, ${d} mm apart`,
      real ? `the final image is ${f1(c.v)} mm from the secondary, ${f1(c.v - d)} mm behind the primary` : `with these mirrors the light leaves the secondary diverging, as if from ${f1(Math.abs(c.v))} mm behind it: no real image`);
    dur = 7;
  }
  return finish('optical_instrument', s as never, dur, story, second, facts, anchors, s.illustrative);
}
