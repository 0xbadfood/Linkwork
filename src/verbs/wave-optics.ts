// Class 12 Wave Optics (leph2-02, 2026-11-03): four verbs, every wavefront, fringe and intensity computed.
//
// huygens       Huygens' principle: secondary wavelets from a wavefront and their forward envelope, the new wavefront
//               (spherical or plane, Fig. 10.2); a point source at a convex lens's focus leaving as plane wavefronts;
//               and the book's constructions of refraction and reflection of a plane wave (Figs. 10.4, 10.6): AB meets
//               the surface at A, B travels v1τ to C, the wavelet from A grows to v2τ, and the tangent CE is the new
//               wavefront: sin i / sin r = v1/v2 = n21, the wavelength shorter in the slower medium. The wavefronts
//               drawn are the level lines of the wave's phase, so every one bends at the surface where it must.
// interference  two coherent sources in water (Fig. 10.8): their crests, the bright lines where the path difference is
//               nλ and the dark ones at (n + ½)λ, each traced as a hyperbola; incoherent sources give no steady
//               pattern. Young's double slit (Fig. 10.12): fringes on the screen from I = 4I0 cos²(πxd/λD), fringe
//               width β = λD/d, one or two wavelengths, or white light; and the intensity against path difference,
//               4I0 cos²(φ/2) beside the incoherent 2I0.
// diffraction   the single slit (Fig. 10.15): the screen's pattern from I = I0 (sin β/β)², β = πay/λD, minima at
//               θ = nλ/a, a central maximum twice as wide as the rest; and the book's argument, the slit cut into halves
//               (or thirds, or quarters) whose paired points differ in path by λ/2 and cancel.
// polaroid      Malus' law (Fig. 10.18): unpolarised light through P1 (I1 = I0/2), then P2 at θ: I = I1 cos²θ, the
//               pass axes drawn on discs in perspective; and a third polaroid between crossed ones (Example 10.2):
//               I = (I1/4) sin² 2θ, most at 45°.
import {kit} from './potential.ts';
import {wavelengthColour} from '../physics/light.ts';
import type {Prop, Scene} from '../scene.ts';
import type {Key} from '../keys.ts';

type P2 = [number, number];
type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const rad = (d: number) => d * Math.PI / 180, deg = (r: number) => r * 180 / Math.PI;
const f1 = (v: number, p = 1) => String(+v.toFixed(p));
const sig = (v: number, p = 3) => String(+v.toPrecision(p));
const only = (s: Record<string, unknown>, verb: string, show: string, allowed: string[], all: string[]) =>
  all.filter(f => s[f] !== undefined && !allowed.includes(f)).map(f => `${verb}: ${f} is not used by show ${show}; leave it out`);
const halo = (k: number, fill: string, extra: Record<string, unknown> = {}) => ({...extra, style: {fill, stroke: 'paper', width: 6 * k}});
const smooth = (u: number) => { const x = Math.min(1, Math.max(0, u)); return x * x * (3 - 2 * x); };

/** The angle of refraction in degrees from n1 into n2 at incidence i (NaN past the critical angle). */
export const refractionAngle = (n1: number, n2: number, i: number) => { const s = n1 * Math.sin(rad(i)) / n2; return s >= 1 ? NaN : deg(Math.asin(s)); };
/** Young's fringe width in mm: β = λD/d, λ in nm, D in m, d in mm. */
export const fringeWidth = (lambdaNm: number, D: number, dMm: number) => lambdaNm * 1e-9 * D / (dMm * 1e-3) * 1e3;
/** Two-source intensity as a fraction of the brightest, at path difference Δ (in wavelengths): cos²(πΔ). */
export const twoSource = (delta: number) => Math.cos(Math.PI * delta) ** 2;
/** The single slit's intensity as a fraction of the centre's, at angle θ (rad), slit a and wavelength λ in the same units. */
export const singleSlit = (theta: number, a: number, lambda: number) => { const b = Math.PI * a * Math.sin(theta) / lambda; return Math.abs(b) < 1e-9 ? 1 : (Math.sin(b) / b) ** 2; };
/** Malus: the fraction of the light after P1 that passes P2 at θ degrees. */
export const malus = (theta: number) => Math.cos(rad(theta)) ** 2;
/** A polaroid at θ between crossed ones: the fraction of the light after P1 that leaves P3, (1/4) sin² 2θ. */
export const crossedThree = (theta: number) => Math.sin(rad(2 * theta)) ** 2 / 4;
/** The first distance from the centre (in mm) where bright fringes of two wavelengths fall together: m1 λ1 = m2 λ2. */
export function coincidence(l1: number, l2: number, D: number, d: number) {
  for (let m = 1; m <= 60; m++) { const m2 = m * l1 / l2; if (Math.abs(m2 - Math.round(m2)) < 1e-6) return {m1: m, m2: Math.round(m2), y: m * fringeWidth(l1, D, d)}; }
  return undefined;
}

// ------------------------------------------------------------------------------------------------------- huygens
export const HUYGENS_SHOWS = ['spherical', 'plane', 'lens', 'refraction', 'reflection'] as const;
export type HuygensSpec = Common & {verb: 'huygens'; show: (typeof HUYGENS_SHOWS)[number];
  /** refraction: the refractive indices of the first medium and the second (default 1 and 1.5); n2 < n1 for a rarer medium. */
  n1?: number; n2?: number;
  /** refraction, reflection: the angle of incidence in degrees (default 40). */
  i?: number};

export function huygensErrors(s: HuygensSpec): string[] {
  const e: string[] = [], W = 'huygens';
  if (!HUYGENS_SHOWS.includes(s.show)) return [`${W}: show is one of ${HUYGENS_SHOWS.join(', ')}`];
  const use: Record<string, string[]> = {spherical: [], plane: [], lens: [], refraction: ['n1', 'n2', 'i'], reflection: ['i']};
  e.push(...only(s as never, W, s.show, use[s.show], ['n1', 'n2', 'i']));
  for (const f of ['n1', 'n2'] as const) if (s[f] !== undefined && !(isNum(s[f]) && s[f]! >= 1 && s[f]! <= 3)) e.push(`${W}: ${f} is a refractive index, 1 to 3`);
  if (s.i !== undefined && !(isNum(s.i) && s.i >= 10 && s.i <= 70)) e.push(`${W}: i is 10 to 70 degrees`);
  if (!e.length && s.show === 'refraction') {
    const n1 = s.n1 ?? 1, n2 = s.n2 ?? 1.5, i = s.i ?? 40;
    if (n1 === n2) e.push(`${W}: n1 and n2 are the same: nothing refracts; give two different media`);
    else if (!Number.isFinite(refractionAngle(n1, n2, i))) e.push(`${W}: i = ${i}° is past the critical angle (${f1(deg(Math.asin(n2 / n1)))}°) from n1 = ${n1} into n2 = ${n2}: no refracted wavefront; choose a smaller i`);
  }
  return e;
}

export function huygens(s: HuygensSpec): Scene {
  const {k, props, bx, by, bw, bh, cx, cy, S, on, arrow, line, poly, label, finish} = kit(s);
  const num = !s.illustrative, facts: string[] = [], anchors: Record<string, P2> = {};
  let dur = 7, story = '', second = '';
  const inBox = (p: P2) => p[0] >= bx - .5 && p[0] <= bx + bw + .5 && p[1] >= by - .5 && p[1] <= by + bh + .5;
  // a sampled path, kept only where it lies in the drawing: one polyline per stretch inside
  const polyIn = (pts: P2[], stroke: string, width: number, extra: Record<string, unknown> = {}, dash = false) => {
    let run: P2[] = [];
    const flush = () => { if (run.length > 1) poly(run, stroke, width, extra, dash); run = []; };
    for (const p of pts) { if (inBox(p)) run.push(p); else flush(); }
    flush();
  };
  const arc = (c: P2, r: number, a0: number, a1: number, stroke: string, width: number, extra: Record<string, unknown> = {}, dash = false) =>
    polyIn(Array.from({length: 61}, (_, j) => { const a = rad(a0 + (a1 - a0) * j / 60); return [c[0] + r * Math.cos(a), c[1] - r * Math.sin(a)] as P2; }), stroke, width, extra, dash);
  const dot = (p: P2, fill: string, r = 7, extra: Record<string, unknown> = {}) => props.push({id: `dot${props.length}`, type: 'circle', x: p[0], y: p[1], r: r * k, style: {fill}, layer: 4, ...extra} as Prop);

  if (s.show === 'spherical' || s.show === 'plane') {
    const sph = s.show === 'spherical', lam = S * .12, rho = S * .12, h = S * .4;
    const src: P2 = [bx + bw * .16, cy], r1 = S * .36, x0 = bx + bw * .4;
    // the wavefront now, the two before it fainter, then wavelets from points on it and their envelope τ later
    const front = (back: number, stroke: string, width: number, extra: Record<string, unknown>) => sph
      ? arc(src, r1 - back, -62, 62, stroke, width, extra) : line([x0 - back, cy - h], [x0 - back, cy + h], stroke, width, extra);
    if (sph) { dot(src, 'accent', 9); label(src[0], src[1] + 40 * k, 'point source', 'accent', 24); anchors.source = src; }
    front(2 * lam, 'faint', 2.5, on(.2, .8)); front(lam, 'faint', 2.5, on(.6, 1.2)); front(0, 'accent', 5, on(1, 1.8));
    const centres: P2[] = sph ? [-48, -32, -16, 0, 16, 32, 48].map(a => [src[0] + r1 * Math.cos(rad(a)), src[1] - r1 * Math.sin(rad(a))])
      : [-.85, -.57, -.28, 0, .28, .57, .85].map(f => [x0, cy + f * h]);
    centres.forEach((c, j) => {
      dot(c, 'accent', 6, {show: [2, 1e9]});
      const a = sph ? deg(Math.atan2(src[1] - c[1], c[0] - src[0])) : 0;
      arc(c, rho, a - 90, a + 90, 'cool', 2.5, on(2.3 + j * .08, 3.3 + j * .08));
    });
    if (sph) arc(src, r1 + rho, -62, 62, 'good', 5, on(4, 5)); else line([x0 + rho, cy - h], [x0 + rho, cy + h], 'good', 5, on(4, 5));
    const top = sph ? [src[0] + r1 * Math.cos(rad(62)), src[1] - r1 * Math.sin(rad(62))] as P2 : [x0, cy - h] as P2;
    const newTop = sph ? [src[0] + (r1 + rho) * Math.cos(rad(62)), src[1] - (r1 + rho) * Math.sin(rad(62))] as P2 : [x0 + rho, cy - h] as P2;
    label(top[0] - 16 * k, top[1] - 16 * k, 'wavefront', 'accent', 24, {align: 'end', show: [1, 1e9]});
    label(newTop[0] + 14 * k, newTop[1] - 16 * k, 'new wavefront', 'good', 24, {align: 'start', show: [4.4, 1e9]});
    const mid: P2 = sph ? [src[0] + r1, src[1]] : [x0, cy];
    arrow([mid[0] + rho + 20 * k, mid[1]], [mid[0] + rho + 110 * k, mid[1]], 'muted', 3, {show: [4.6, 1e9]});
    Object.assign(anchors, {wavefront: mid, new: [mid[0] + rho, mid[1]] as P2, wavelet: centres[3]});
    story = sph ? 'Each point of a wavefront is a source of secondary wavelets; their forward envelope is the wavefront a moment later'
      : 'From a plane wavefront the wavelets\' forward envelope is again a plane, vτ further on';
    second = sph ? 'From a point source the wavefronts are spheres; the wavelets\' backward envelope is not taken: the backwave has no amplitude'
      : 'Far from a point source, a small part of a spherical wavefront is nearly plane';
    facts.push('in a time τ each wavelet grows to a radius vτ; the new wavefront is their common tangent');
    dur = 6.5;
  } else if (s.show === 'lens') {
    const lam = S * .085, h = S * .38, xL = bx + bw * .46, f = bw * .3, F: P2 = [xL - f, cy];
    dot(F, 'accent', 9); label(F[0], cy + 40 * k, 'F', 'accent', 26); anchors.source = F;
    props.push({id: 'lens', type: 'polyline', points: Array.from({length: 41}, (_, j) => { const u = j / 40 * 2 * Math.PI; return [xL + 16 * k * Math.cos(u), cy + h * 1.05 * Math.sin(u)] as P2; }),
      closed: true, style: {stroke: 'cool', width: 4 * k, fill: 'cool', opacity: .18}, layer: 1} as Prop);
    label(xL, cy - h * 1.05 - 18 * k, 'convex lens', 'cool', 24);
    let j = 0;
    for (let m = 1; m * lam < f * .96; m++, j++) { const r = m * lam, lim = Math.min(70, deg(Math.asin(Math.min(1, h / r)))); arc(F, r, -lim, lim, 'accent', 3, on(.3 + j * .12, .8 + j * .12)); }
    const after: number[] = [];
    for (let m = Math.ceil((f + 26 * k) / lam); F[0] + m * lam < bx + bw; m++) after.push(F[0] + m * lam);
    after.forEach((x, q) => line([x, cy - h], [x, cy + h], 'good', 3, on(1.6 + j * .12 + q * .12, 2.1 + j * .12 + q * .12)));
    for (const y of [-h * .9, -h * .45, 0, h * .45, h * .9]) {
      line(F, [xL, cy + y], 'muted', 2, {show: [.2, 1e9]}, true); line([xL, cy + y], [bx + bw, cy + y], 'muted', 2, {show: [1.6 + j * .12, 1e9]}, true);
    }
    label(F[0] + f * .5, cy - h * .95, 'spherical', 'accent', 24); label((xL + bx + bw) / 2, cy - h - 18 * k, 'plane', 'good', 24, {show: [2, 1e9]});
    Object.assign(anchors, {lens: [xL, cy] as P2, spherical: [F[0] + f * .5, cy] as P2, plane: [after[0] ?? xL, cy] as P2});
    story = 'Light from a point at the focus reaches the lens on spherical wavefronts and leaves it on plane ones';
    second = 'The lens holds back the middle of each wavefront, which has the most glass to cross, until the edges catch up';
    facts.push('a point source at the focus of a convex lens gives a parallel beam: plane wavefronts');
    dur = 6;
  } else {
    // refraction or reflection of a plane wave at a horizontal surface; the light comes down from the upper left
    const refl = s.show === 'reflection', n1 = refl ? 1 : s.n1 ?? 1, n2 = refl ? 1 : s.n2 ?? 1.5, i = s.i ?? 40;
    const r = refl ? i : refractionAngle(n1, n2, i), l1 = S * .24, l2 = refl ? l1 : l1 * n1 / n2;
    const yI = by + bh * .5, xA = bx + bw * .3, si = Math.sin(rad(i)), ci = Math.cos(rad(i)), sr = Math.sin(rad(r)), cr = Math.cos(rad(r));
    props.push({id: 'm2', type: 'rect', x: bx, y: yI, w: bw, h: by + bh - yI, style: {fill: refl ? 'muted' : 'cool', opacity: refl ? .16 : .14}, layer: 0} as Prop);
    line([bx, yI], [bx + bw, yI], refl ? 'ink' : 'cool', refl ? 5 : 3);
    if (refl) for (let x = bx + 10 * k; x < bx + bw; x += 26 * k) line([x, yI + 2 * k], [x - 16 * k, yI + 20 * k], 'muted', 2);
    const nameOf = (n: number, first: boolean) => `${first ? 'medium 1' : 'medium 2'}${num ? `, n = ${n}` : ''}`;
    label(bx + 14 * k, by + 34 * k, refl ? 'air' : nameOf(n1, true), 'muted', 24, halo(k, 'muted', {align: 'start', layer: 5}));
    label(bx + 14 * k, by + bh - 18 * k, refl ? 'mirror' : nameOf(n2, false), refl ? 'muted' : 'cool', 24, halo(k, refl ? 'muted' : 'cool', {align: 'start', layer: 5}));
    // each wavefront is a level line of the phase: m whole wavelengths along; above the surface (x − xA) sin i + (y − yI) cos i = m λ1
    const ys = (a: number, b: number) => Array.from({length: 41}, (_, j) => a + (b - a) * j / 40);
    const xIn = (m: number, y: number) => xA + (m * l1 - (y - yI) * ci) / si;
    const xOut = (m: number, y: number) => refl ? xA + (m * l1 + (y - yI) * ci) / si : xA + (m - (y - yI) * cr / l2) * l1 / si;
    let q = 0;
    for (let m = -8; m <= 8; m++) {
      const inPts = ys(by, yI).map(y => [xIn(m, y), y] as P2), outPts = (refl ? ys(by, yI) : ys(yI, by + bh)).map(y => [xOut(m, y), y] as P2);
      if (![...inPts, ...outPts].some(inBox)) continue;
      const t0 = .3 + q++ * .1;
      polyIn(inPts, 'accent', 2, {...on(t0, t0 + .6), fade: .3}); polyIn(outPts, 'good', 2, {...on(t0 + .5, t0 + 1.1), fade: .3});
    }
    // the construction: AB meets the surface at A; B travels v1τ to C while A's wavelet grows to v2τ; CE touches it at E
    const A: P2 = [xA, yI], C: P2 = [xA + l1 / si, yI], B: P2 = [C[0] - l1 * si, yI - l1 * ci];
    const E: P2 = refl ? [xA + l1 * si, yI - l1 * ci] : [xA + l2 * sr, yI + l2 * cr];
    const T = 3;
    line(A, B, 'accent', 6, on(T, T + .6)); arrow(B, C, 'accent', 3, {...on(T + .8, T + 1.6), style: {stroke: 'accent', width: 3 * k, dash: [10 * k, 8 * k]}});
    arc(A, refl ? l1 : l2, refl ? 0 : 180, refl ? 180 : 360, 'cool', 3, on(T + .8, T + 1.6), true);
    line(C, E, 'good', 6, on(T + 1.9, T + 2.5)); line(A, E, 'cool', 2.5, {show: [T + 1.9, 1e9]});
    line([xA, yI - S * .3], [xA, yI + (refl ? 0 : S * .3)], 'muted', 2, {show: [T, 1e9]}, true);
    const tag = (p: P2, t: string, dx: number, dy: number, at: number, fill = 'ink') => label(p[0] + dx * k, p[1] + dy * k, t, fill, 28, halo(k, fill, {show: [at, 1e9], layer: 5}));
    tag(A, 'A', -26, 36, T); tag(B, 'B', -6, -20, T); tag(C, 'C', 22, 36, T + .8); tag(E, 'E', refl ? -24 : 26, refl ? -12 : 30, T + 1.9);
    // i at A, between the surface (AC) and the incident wavefront (AB); r at C, between CA and CE
    const wedge = (c: P2, a0: number, a1: number, rr: number, name: string, fill: string, at: number) => {
      arc(c, rr, a0, a1, fill, 3, {show: [at, 1e9]});
      const am = rad((a0 + a1) / 2); label(c[0] + (rr + 26 * k) * Math.cos(am), c[1] - (rr + 26 * k) * Math.sin(am) + 9 * k, name, fill, 28, halo(k, fill, {show: [at, 1e9], layer: 5}));
    };
    wedge(A, 0, i, 70 * k, 'i', 'accent', T + .4);
    if (refl) wedge(C, 180 - r, 180, 70 * k, 'r', 'good', T + 2.3); else wedge(C, 180, 180 + r, 70 * k, 'r', 'good', T + 2.3);
    tag([(B[0] + C[0]) / 2, (B[1] + C[1]) / 2], 'v₁τ', 26, -6, T + 1.2, 'accent');
    tag([(A[0] + E[0]) / 2, (A[1] + E[1]) / 2], refl ? 'v₁τ' : 'v₂τ', refl ? 34 : -40, refl ? 10 : 8, T + 1.4, 'cool');
    Object.assign(anchors, {A, B, C, E, normal: [xA, yI - S * .3] as P2});
    dur = T + 4;
    if (refl) {
      story = 'B travels v1τ to C while the wavelet from A grows to v1τ: the tangent CE is the reflected wavefront';
      second = 'Triangles EAC and BAC are congruent: the angle of reflection equals the angle of incidence';
      facts.push(`i = ${f1(i)}°: the reflected wavefront leaves at r = ${f1(r)}°, the same angle`);
    } else {
      const denser = n2 > n1;
      story = 'B travels v1τ to C while the wavelet from A grows to v2τ: the tangent CE is the refracted wavefront';
      second = denser ? 'Slower in the denser medium: sin i / sin r = v1/v2 = n2/n1, and a shorter wavelength, λ2 = λ1 v2/v1'
        : 'Faster in the rarer medium: the wavefront bends away from the normal, r > i, and the wavelength grows';
      facts.push(`n1 = ${n1}, n2 = ${n2}: sin i / sin r = v1/v2 = n2/n1 = ${sig(n2 / n1)}`, `i = ${f1(i)}°, r = ${f1(r)}°`,
        `λ2 = λ1 × n1/n2 = ${sig(n1 / n2)} λ1; the frequency stays the same`);
    }
  }
  return finish('huygens', s as never, dur, story, second, facts, anchors, s.illustrative);
}

// -------------------------------------------------------------------------------------------------- interference
export const INTERFERENCE_SHOWS = ['ripples', 'young', 'intensity'] as const;
export type InterferenceSpec = Common & {verb: 'interference'; show: (typeof INTERFERENCE_SHOWS)[number];
  /** ripples: the sources' separation in wavelengths (default 3); coherent false: their phases jump about. */
  separation?: number; coherent?: boolean;
  /** young: the wavelength in nm (default 600), or two wavelengths; white true for white light. */
  lambda?: number | number[]; white?: boolean;
  /** young: the slits' separation d in mm (default 0.28) and the screen's distance D in m (default 1.4): the book's exercise. */
  d?: number; D?: number;
  /** young: the bright fringe to mark (default 4; 0 for none). */
  order?: number;
  /** intensity: a path difference to mark, in wavelengths (e.g. 0.3333 for λ/3). */
  mark?: number};

export function interferenceErrors(s: InterferenceSpec): string[] {
  const e: string[] = [], W = 'interference';
  if (!INTERFERENCE_SHOWS.includes(s.show)) return [`${W}: show is one of ${INTERFERENCE_SHOWS.join(', ')}`];
  const use: Record<string, string[]> = {ripples: ['separation', 'coherent'], young: ['lambda', 'white', 'd', 'D', 'order'], intensity: ['mark']};
  e.push(...only(s as never, W, s.show, use[s.show], ['separation', 'coherent', 'lambda', 'white', 'd', 'D', 'order', 'mark']));
  if (s.separation !== undefined && !(isNum(s.separation) && s.separation >= 1 && s.separation <= 6)) e.push(`${W}: separation is 1 to 6 wavelengths`);
  if (s.coherent !== undefined && typeof s.coherent !== 'boolean') e.push(`${W}: coherent is true or false`);
  const ls = s.lambda === undefined ? [] : Array.isArray(s.lambda) ? s.lambda : [s.lambda];
  if (s.lambda !== undefined && (!ls.length || ls.length > 2 || !ls.every(l => isNum(l) && l >= 380 && l <= 750))) e.push(`${W}: lambda is a visible wavelength in nm (380 to 750), or a list of two`);
  if (s.white && s.lambda !== undefined) e.push(`${W}: white light has every wavelength: leave lambda out`);
  if (s.d !== undefined && !(isNum(s.d) && s.d >= .01 && s.d <= 5)) e.push(`${W}: d is the slits' separation in mm, 0.01 to 5`);
  if (s.D !== undefined && !(isNum(s.D) && s.D >= .1 && s.D <= 5)) e.push(`${W}: D is the screen's distance in m, 0.1 to 5`);
  if (s.order !== undefined && !(Number.isInteger(s.order) && s.order >= 0 && s.order <= 4)) e.push(`${W}: order is the bright fringe to mark, 0 to 4`);
  if (s.mark !== undefined && !(isNum(s.mark) && Math.abs(s.mark) <= 2.5)) e.push(`${W}: mark is a path difference in wavelengths, −2.5 to 2.5`);
  return e;
}

const hexRgb = (h: string) => [1, 3, 5].map(j => parseInt(h.slice(j, j + 2), 16));
const rgbHex = (c: number[]) => `#${c.map(v => Math.round(Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`;

export function interference(s: InterferenceSpec): Scene {
  const {k, props, bx, by, bw, bh, cx, cy, S, on, arrow, line, poly, label, finish} = kit(s);
  const num = !s.illustrative, facts: string[] = [], anchors: Record<string, P2> = {};
  let dur = 8, story = '', second = '';
  const inBox = (p: P2) => p[0] >= bx - .5 && p[0] <= bx + bw + .5 && p[1] >= by - .5 && p[1] <= by + bh + .5;
  const polyIn = (pts: P2[], stroke: string, width: number, extra: Record<string, unknown> = {}, dash = false) => {
    let run: P2[] = [];
    const flush = () => { if (run.length > 1) poly(run, stroke, width, extra, dash); run = []; };
    for (const p of pts) { if (inBox(p)) run.push(p); else flush(); }
    flush();
  };

  if (s.show === 'ripples') {
    const sep = s.separation ?? 3, coherent = s.coherent ?? true, lam = S * .085, a = sep * lam / 2, xs = bx + bw * .08;
    const S1: P2 = [xs, cy - a], S2: P2 = [xs, cy + a];
    for (const [p, name] of [[S1, 'S₁'], [S2, 'S₂']] as const) {
      props.push({id: `src-${name}`, type: 'circle', x: p[0], y: p[1], r: 9 * k, style: {fill: 'accent'}, layer: 4} as Prop);
      label(p[0] - 18 * k, p[1] + 9 * k, name, 'accent', 26, {align: 'end'});
    }
    const crests = (c: P2, phase: number, stroke: string, extra: Record<string, unknown>) => {
      for (let m = 1; (m + phase) * lam < bw * 1.05; m++) {
        const r = (m + phase) * lam;
        polyIn(Array.from({length: 73}, (_, j) => { const u = rad(-90 + 180 * j / 72); return [c[0] + r * Math.cos(u), c[1] + r * Math.sin(u)] as P2; }), stroke, 1.5, extra);
      }
    };
    crests(S1, 0, 'accent', on(.3, 1.6));
    if (coherent) {
      crests(S2, 0, 'cool', on(.3, 1.6));
      // bright where r2 − r1 = nλ, dark where it is (n + ½)λ: for each x the root in y, by halving (r2 − r1 falls as y grows)
      const curve = (delta: number): P2[] => {
        const pts: P2[] = [];
        for (let x = xs + lam * .2; x <= bx + bw; x += bw / 90) {
          const g = (y: number) => Math.hypot(x - S2[0], y - S2[1]) - Math.hypot(x - S1[0], y - S1[1]) - delta * lam;
          let lo = by, hi = by + bh; if (g(lo) < 0 || g(hi) > 0) continue;
          for (let it = 0; it < 40; it++) { const m = (lo + hi) / 2; if (g(m) > 0) lo = m; else hi = m; }
          pts.push([x, (lo + hi) / 2]);
        }
        return pts;
      };
      const nMax = Math.floor(sep - 1e-9);
      for (let n = -nMax; n <= nMax; n++) {
        const pts = curve(n); if (pts.length < 2) continue;
        polyIn(pts, 'good', 5, on(2.4 + Math.abs(n) * .3, 3.4 + Math.abs(n) * .3));
        const end = pts.at(-1)!; if (n >= 0) label(end[0] - 10 * k, end[1] - 14 * k, n ? `${n === 1 ? '' : n}λ` : 'Δ = 0', 'good', 26, halo(k, 'good', {align: 'end', show: [3.4, 1e9], layer: 5}));
        if (n === 0) anchors.central = end;
      }
      for (let n = -nMax - 1; n <= nMax; n++) {
        const delta = n + .5; if (Math.abs(delta) >= sep) continue;
        const pts = curve(delta); if (pts.length > 1) polyIn(pts, 'bad', 3, on(4.4, 5.2), true);
      }
      story = 'Where crest meets crest the water swings most; where crest meets trough it stays still';
      second = 'Bright along S2P − S1P = nλ, dark along (n + ½)λ: the pattern stays put because the sources keep in step';
      facts.push(`sources ${sep} wavelengths apart: ${2 * nMax + 1} lines of maximum disturbance`);
    } else {
      // the second source's phase jumps every half second: its crests sit somewhere new each time, and no line stays dark
      const phases = [0, .55, .2, .8, .4, .05, .7];
      phases.forEach((ph, j) => crests(S2, ph, 'cool', {show: [.3 + j * .9, j === phases.length - 1 ? 1e9 : .3 + (j + 1) * .9]}));
      story = 'If the sources\' phases jump about, crests meet troughs at one instant and crests the next';
      second = 'The pattern averages out: the intensity is I1 + I2 everywhere, with no interference to see';
      facts.push('incoherent sources: the time-averaged intensity is 2I0 everywhere');
      dur = 7;
    }
    Object.assign(anchors, {S1, S2});
  } else if (s.show === 'young') {
    const white = !!s.white, ls = white ? [] : s.lambda === undefined ? [600] : Array.isArray(s.lambda) ? s.lambda : [s.lambda];
    const d = s.d ?? .28, D = s.D ?? 1.4, order = s.order ?? (white || ls.length > 1 ? 0 : 4);
    const betas = (white ? [550] : ls).map(l => fringeWidth(l, D, d)), b0 = betas[0];
    const Y = 4.6 * Math.max(...betas);                            // the screen shows ±Y mm: true to scale up and down the screen
    const xs = bx + bw * .16, xsc = bx + bw * .6, half = bh * .44, ppm = half / Y, gap = bh * .09;
    const yOf = (mm: number) => cy - mm * ppm;
    // the slits: a wall with two openings, far apart for the eye (a fraction of a mm in truth)
    for (const [a, b] of [[cy - half, cy - gap - 12 * k], [cy - gap + 12 * k, cy + gap - 12 * k], [cy + gap + 12 * k, cy + half]] as const)
      line([xs, a], [xs, b], 'ink', 7);
    label(xs - 16 * k, cy - gap + 9 * k, 'S₁', 'ink', 26, {align: 'end'}); label(xs - 16 * k, cy + gap + 9 * k, 'S₂', 'ink', 26, {align: 'end'});
    for (let x = bx + 6 * k; x < xs - 40 * k; x += 34 * k) line([x, cy - half * .5], [x, cy + half * .5], 'muted', 2, on(.2, .7));
    label(xs, cy + half + 34 * k, 'slits not to scale', 'muted', 22);
    // the screen: thin bands whose brightness is the intensity there
    const N = 220, band = 2 * half / N, wl = white ? [410, 450, 490, 530, 570, 610, 650, 690] : ls;
    const strips = white ? 1 : ls.length, sw = 30 * k;
    for (let q = 0; q < strips; q++) {
      for (let j = 0; j < N; j++) {
        const y = -Y + (j + .5) * 2 * Y / N;
        let fill: string, op: number;
        if (white) {
          const sum = [0, 0, 0]; let tot = 0;
          for (const l of wl) { const I = twoSource(y / fringeWidth(l, D, d)), c = hexRgb(wavelengthColour(l)); c.forEach((v, z) => sum[z] += v * I); tot += I; }
          const top = Math.max(...sum, 1); fill = rgbHex(sum.map(v => v / top * 255)); op = tot / wl.length;
        } else { fill = wavelengthColour(ls[q]); op = twoSource(y / betas[q]); }
        props.push({id: `band${q}-${j}`, type: 'rect', x: xsc + q * sw, y: cy - half + j * band, w: sw, h: band + .6, style: {fill, opacity: +op.toFixed(3)}, layer: 1, show: [1.2, 1e9]} as Prop);
      }
    }
    props.push({id: 'screen', type: 'rect', x: xsc, y: cy - half, w: strips * sw, h: 2 * half, style: {stroke: 'muted', width: 2 * k}, layer: 2} as Prop);
    label(xsc + strips * sw / 2, cy + half + 34 * k, 'screen', 'muted', 22);
    // intensity across the screen, to the right: 4I0 cos²(πyd/λD)
    const g0 = xsc + strips * sw + 40 * k, g1 = bx + bw - 10 * k;
    line([g0, cy - half], [g0, cy + half], 'faint', 2);
    (white ? [550] : ls).forEach((l, q) => poly(Array.from({length: 301}, (_, j) => { const y = -Y + 2 * Y * j / 300; return [g0 + (g1 - g0) * twoSource(y / betas[q]), yOf(y)] as P2; }),
      white ? 'ink' : wavelengthColour(l), 3, on(1.6 + q * .4, 3 + q * .4)));
    label((g0 + g1) / 2, cy - half - 14 * k, 'intensity', 'muted', 22);
    line([xs, cy], [xsc, cy], 'faint', 2, {}, true);
    label(xsc - 14 * k, cy + 30 * k, 'central bright', 'ink', 22, halo(k, 'ink', {align: 'end', show: [1.6, 1e9], layer: 5}));
    // fringe width: from the centre to the first bright fringe beside the screen
    if (!white) {
      const xm = xsc - 24 * k;
      line([xm, yOf(0)], [xm, yOf(b0)], 'accent', 3, {show: [3.2, 1e9]});
      for (const v of [0, b0]) line([xm - 8 * k, yOf(v)], [xm + 8 * k, yOf(v)], 'accent', 3, {show: [3.2, 1e9]});
      label(xm - 14 * k, Math.min(yOf(b0) + 9 * k, cy - 12 * k), num ? `β = ${sig(b0)} mm` : 'β', 'accent', 24, halo(k, 'accent', {align: 'end', show: [3.2, 1e9], layer: 5}));
    }
    if (order > 0 && !white) {
      const yP = yOf(order * b0), P: P2 = [xsc, yP];
      line([xs, cy - gap], P, 'accent', 2.5, on(4, 4.8)); line([xs, cy + gap], P, 'cool', 2.5, on(4, 4.8));
      props.push({id: 'P', type: 'circle', x: P[0], y: P[1], r: 8 * k, style: {fill: 'good'}, layer: 4, show: [4.6, 1e9]} as Prop);
      label(xsc - 14 * k, yP - 12 * k, `P: bright fringe ${order}`, 'good', 22, {align: 'end', show: [4.8, 1e9]});
      anchors.P = P;
      facts.push(`the ${['', 'first', 'second', 'third', 'fourth'][order]} bright fringe is ${order}β = ${sig(order * b0)} mm from the centre`);
    }
    Object.assign(anchors, {S1: [xs, cy - gap] as P2, S2: [xs, cy + gap] as P2, centre: [xsc, cy] as P2, screen: [xsc, cy - half] as P2});
    if (white) {
      story = 'With white light each colour makes its own fringes: the centre is white, the next fringes coloured, blue edge nearest';
      second = 'Away from the centre the colours overlap and wash out to white';
      facts.push(`white light, d = ${d} mm, D = ${D} m: only a few coloured fringes beside a white centre`);
    } else {
      story = 'Light from the two slits reaches P by paths that differ by xd/D: bright where that is nλ, dark at (n + ½)λ';
      second = 'Equally spaced fringes: β = λD/d';
      ls.forEach((l, q) => facts.push(`λ = ${l} nm, d = ${d} mm, D = ${D} m: fringe width β = λD/d = ${sig(betas[q])} mm`));
      if (ls.length === 2) { const c = coincidence(ls[0], ls[1], D, d); if (c) facts.push(`bright fringes of both first fall together ${sig(c.y)} mm from the centre: ${c.m1} × ${ls[0]} nm = ${c.m2} × ${ls[1]} nm`); }
    }
    dur = order > 0 ? 7 : 6;
  } else {
    // intensity against path difference: coherent 4I0 cos²(φ/2), incoherent 2I0
    const x0 = bx + bw * .06, x1 = bx + bw * .96, y0 = by + bh * .86, top = by + bh * .1, X = (dl: number) => x0 + (dl + 2.5) / 5 * (x1 - x0), Yv = (I: number) => y0 - I / 4 * (y0 - top);
    line([x0, y0], [x1, y0], 'ink', 3); line([X(0), y0], [X(0), top - 10 * k], 'ink', 2);
    for (const dl of [-2, -1, 0, 1, 2]) { line([X(dl), y0], [X(dl), y0 + 10 * k], 'ink', 2); label(X(dl), y0 + 40 * k, dl === 0 ? '0' : `${dl < 0 ? '−' : ''}${Math.abs(dl) === 1 ? '' : Math.abs(dl)}λ`, 'muted', 24); }
    label(x1, y0 + 74 * k, 'path difference', 'muted', 24, {align: 'end'});
    poly(Array.from({length: 401}, (_, j) => { const dl = -2.5 + 5 * j / 400; return [X(dl), Yv(4 * twoSource(dl))] as P2; }), 'accent', 5, on(.5, 3));
    line([x0, Yv(2)], [x1, Yv(2)], 'cool', 3, {show: [3.3, 1e9]}, true);
    label(X(0) + 14 * k, Yv(4) + 6 * k, '4I₀', 'accent', 26, {align: 'start', show: [1.5, 1e9]});
    label(x1, Yv(2) - 14 * k, 'incoherent: 2I₀ everywhere', 'cool', 24, halo(k, 'cool', {align: 'end', show: [3.3, 1e9], layer: 5}));
    if (s.mark !== undefined) {
      const I = 4 * twoSource(s.mark);
      line([X(s.mark), y0], [X(s.mark), Yv(I)], 'good', 3, {show: [4.3, 1e9]}, true);
      props.push({id: 'mark', type: 'circle', x: X(s.mark), y: Yv(I), r: 9 * k, style: {fill: 'good'}, layer: 4, show: [4.3, 1e9]} as Prop);
      anchors.mark = [X(s.mark), Yv(I)];
      facts.push(`at a path difference of ${sig(s.mark)}λ: I = 4I₀ cos²(π × ${sig(s.mark)}) = ${sig(twoSource(s.mark))} of the brightest`);
    }
    Object.assign(anchors, {peak: [X(0), Yv(4)] as P2, dark: [X(.5), y0] as P2, average: [X(-2), Yv(2)] as P2});
    story = 'Coherent waves give 4I0 where they arrive in step and nothing where half a wavelength apart';
    second = 'The energy is only moved about: averaged over the fringes it is 2I0, the same as incoherent light';
    facts.push('a path difference Δ is a phase difference φ = 2πΔ/λ; I = 4I₀ cos²(φ/2)');
    dur = 6.5;
  }
  return finish('interference', s as never, dur, story, second, facts, anchors, s.illustrative);
}

// --------------------------------------------------------------------------------------------------- diffraction
export const DIFFRACTION_SHOWS = ['pattern', 'halves'] as const;
export type DiffractionSpec = Common & {verb: 'diffraction'; show: (typeof DIFFRACTION_SHOWS)[number];
  /** pattern: the slit's width a in mm (default 0.1), the wavelength in nm (default 600) and the screen's distance D in m (default 1). */
  a?: number; lambda?: number; D?: number;
  /** halves: a sin θ in wavelengths: 1 (halves cancel: the first minimum), 1.5 (thirds: a weak maximum) or 2 (quarters: dark). */
  order?: number};

export function diffractionErrors(s: DiffractionSpec): string[] {
  const e: string[] = [], W = 'diffraction';
  if (!DIFFRACTION_SHOWS.includes(s.show)) return [`${W}: show is one of ${DIFFRACTION_SHOWS.join(', ')}`];
  e.push(...only(s as never, W, s.show, s.show === 'pattern' ? ['a', 'lambda', 'D'] : ['order'], ['a', 'lambda', 'D', 'order']));
  if (s.a !== undefined && !(isNum(s.a) && s.a >= .005 && s.a <= 2)) e.push(`${W}: a is the slit's width in mm, 0.005 to 2`);
  if (s.lambda !== undefined && !(isNum(s.lambda) && s.lambda >= 380 && s.lambda <= 750)) e.push(`${W}: lambda is a visible wavelength in nm, 380 to 750`);
  if (s.D !== undefined && !(isNum(s.D) && s.D >= .1 && s.D <= 5)) e.push(`${W}: D is the screen's distance in m, 0.1 to 5`);
  if (s.order !== undefined && ![1, 1.5, 2].includes(s.order)) e.push(`${W}: order is 1, 1.5 or 2 (a sin θ in wavelengths)`);
  if (!e.length && s.show === 'pattern' && (s.lambda ?? 600) * 1e-6 / (s.a ?? .1) > .3) e.push(`${W}: a slit only ${s.a} mm wide spreads the light past 0.3 rad: the small-angle pattern no longer holds; widen it`);
  return e;
}

export function diffraction(s: DiffractionSpec): Scene {
  const {k, props, bx, by, bw, bh, cx, cy, S, on, arrow, line, poly, label, finish} = kit(s);
  const num = !s.illustrative, facts: string[] = [], anchors: Record<string, P2> = {};
  let dur = 7, story = '', second = '';
  if (s.show === 'pattern') {
    const a = s.a ?? .1, lam = s.lambda ?? 600, D = s.D ?? 1, w = lam * 1e-6 / a * D * 1e3;   // first minimum, mm from the centre
    const Y = 3.6 * w, xs = bx + bw * .18, xsc = bx + bw * .6, half = bh * .44, ppm = half / Y, yOf = (mm: number) => cy - mm * ppm, gap = bh * .05;
    line([xs, cy - half], [xs, cy - gap], 'ink', 7); line([xs, cy + gap], [xs, cy + half], 'ink', 7);
    for (let x = bx + 6 * k; x < xs - 30 * k; x += 34 * k) line([x, cy - half * .5], [x, cy + half * .5], 'muted', 2, on(.2, .7));
    label(xs, cy + half + 34 * k, 'slit not to scale', 'muted', 22);
    const col = wavelengthColour(lam), N = 240, band = 2 * half / N, sw = 34 * k;
    // the eye sees the faint side fringes better than their 4.7 % suggests: the screen's brightness is I^0.4; the curve is I
    for (let j = 0; j < N; j++) {
      const y = -Y + (j + .5) * 2 * Y / N, I = singleSlit(y / (D * 1e3), a, lam * 1e-6);
      props.push({id: `band${j}`, type: 'rect', x: xsc, y: cy - half + j * band, w: sw, h: band + .6, style: {fill: col, opacity: +(I ** .4).toFixed(3)}, layer: 1, show: [1.2, 1e9]} as Prop);
    }
    props.push({id: 'screen', type: 'rect', x: xsc, y: cy - half, w: sw, h: 2 * half, style: {stroke: 'muted', width: 2 * k}, layer: 2} as Prop);
    const g0 = xsc + sw + 40 * k, g1 = bx + bw - 10 * k;
    line([g0, cy - half], [g0, cy + half], 'faint', 2);
    poly(Array.from({length: 481}, (_, j) => { const y = -Y + 2 * Y * j / 480; return [g0 + (g1 - g0) * singleSlit(y / (D * 1e3), a, lam * 1e-6), yOf(y)] as P2; }), col, 3, on(1.6, 3.2));
    label((g0 + g1) / 2, cy - half - 14 * k, 'intensity', 'muted', 22);
    for (const n of [-2, -1, 1, 2]) line([xsc - 12 * k, yOf(n * w)], [xsc, yOf(n * w)], 'bad', 3, {show: [3.4, 1e9]});
    label(xsc - 18 * k, yOf(w) + 8 * k, 'θ = λ/a', 'bad', 22, halo(k, 'bad', {align: 'end', show: [3.4, 1e9], layer: 5}));
    label(xsc - 18 * k, yOf(2 * w) + 8 * k, 'θ = 2λ/a', 'bad', 22, halo(k, 'bad', {align: 'end', show: [3.8, 1e9], layer: 5}));
    line([xs, cy - gap], [xsc, yOf(-w)], 'muted', 2, on(3.4, 4), true); line([xs, cy + gap], [xsc, yOf(-w)], 'muted', 2, on(3.4, 4), true);
    const xm = g1 - 6 * k;
    line([xm, yOf(w)], [xm, yOf(-w)], 'accent', 3, {show: [4.4, 1e9]});
    label(xm, yOf(w) - 16 * k, num ? `central maximum, ${sig(2 * w)} mm` : 'central maximum', 'accent', 22, halo(k, 'accent', {align: 'end', show: [4.4, 1e9], layer: 5}));
    Object.assign(anchors, {slit: [xs, cy] as P2, centre: [xsc, cy] as P2, minimum: [xsc, yOf(w)] as P2, screen: [xsc, cy - half] as P2});
    story = 'One slit spreads the light: a broad bright centre, then dark and bright bands ever fainter';
    second = 'Dark where a sin θ = nλ; the central maximum, between ±λ/a, is twice as wide as the others';
    facts.push(`a = ${a} mm, λ = ${lam} nm: the first minima are at θ = λ/a = ${sig(lam * 1e-6 / a)} rad, ${sig(w)} mm either side on a screen ${D} m away`,
      `the central maximum is ${sig(2 * w)} mm wide; the next maxima have about ${f1(100 * singleSlit(Math.asin(1.4303 * lam * 1e-6 / a), a, lam * 1e-6))}% of its intensity`);
  } else {
    // a sin θ = order × λ, drawn at an angle chosen for the eye: the slit cut into 2, 3 or 4 strips, neighbours λ/2 apart
    const order = s.order ?? 1, parts = order === 1 ? 2 : order === 1.5 ? 3 : 4, th = rad(22), sn = Math.sin(th), cs = Math.cos(th);
    const xs = bx + bw * .3, ha = bh * .36, top = cy - ha, bot = cy + ha, L = bw * .55;
    line([xs, by + 4 * k], [xs, top - 6 * k], 'ink', 8); line([xs, bot + 6 * k], [xs, by + bh - 4 * k], 'ink', 8);
    for (let x = bx + 6 * k; x < xs - 30 * k; x += 34 * k) line([x, top], [x, bot], 'muted', 2, on(.2, .7));
    const per = 4, pts = parts * per, cols = ['accent', 'cool', 'good', 'bad'];
    for (let j = 0; j < pts; j++) {
      const y = top + (j + .5) * (bot - top) / pts, part = Math.floor(j / per);
      const cancel = parts === 3 ? part < 2 : true, stroke = cancel ? cols[j % per] : 'ink';
      props.push({id: `src${j}`, type: 'circle', x: xs, y, r: 5 * k, style: {fill: stroke}, layer: 4, show: [.8, 1e9]} as Prop);
      line([xs, y], [xs + L * cs, y + L * sn], stroke, cancel ? 2.5 : 3.5, on(1 + j * .05, 2 + j * .05));
    }
    // the extra path: a perpendicular from the top edge to the bottom ray; its foot leaves a sin θ
    const foot: P2 = [xs + (bot - top) * sn * sn, bot - (bot - top) * sn * cs];
    line([xs, top], foot, 'muted', 2.5, {show: [2.8, 1e9]}, true);
    line([xs, bot], foot, 'bad', 6, {show: [3, 1e9]});
    label(foot[0] + 20 * k, (foot[1] + bot) / 2 + 30 * k, order === 1 ? 'a sin θ = λ' : order === 1.5 ? 'a sin θ = 3λ/2' : 'a sin θ = 2λ', 'bad', 26, halo(k, 'bad', {align: 'start', show: [3, 1e9], layer: 5}));
    for (let q = 1; q < parts; q++) { const y = top + q * (bot - top) / parts; line([xs - 26 * k, y], [xs + 26 * k, y], 'ink', 3, {show: [3.6, 1e9]}); }
    label(xs - 36 * k, cy + 9 * k, 'a', 'ink', 28, {align: 'end'});
    const say = order === 1 ? 'each point in the top half has a partner in the bottom half λ/2 behind: they cancel in pairs'
      : order === 1.5 ? 'the first two thirds cancel in pairs; the last third is left: a weak maximum'
        : 'each half cancels within itself, quarter against quarter: dark again';
    label(xs + L * cs, by + bh - 10 * k, order === 2 ? 'dark' : order === 1 ? 'dark: the first minimum' : 'a third survives', order === 1.5 ? 'ink' : 'bad', 26, halo(k, order === 1.5 ? 'ink' : 'bad', {align: 'end', show: [4.2, 1e9], layer: 5}));
    Object.assign(anchors, {slit: [xs, cy] as P2, top: [xs, top] as P2, bottom: [xs, bot] as P2, extra: foot});
    story = order === 1 ? 'Cut the slit into two halves: at a sin θ = λ every point has a partner λ/2 behind it' : order === 1.5 ? 'At a sin θ = 3λ/2 cut the slit into thirds' : 'At a sin θ = 2λ cut the slit into quarters';
    second = say; dur = 6;
    facts.push(order === 1.5 ? 'at a sin θ = 3λ/2 one third of the slit is left uncancelled: a maximum far weaker than the centre' : `at a sin θ = ${order === 1 ? '' : '2'}λ the paired strips cancel: a minimum`);
    facts.push('angles drawn larger than in truth');
  }
  return finish('diffraction', s as never, dur, story, second, facts, anchors, s.illustrative);
}

// ------------------------------------------------------------------------------------------------------ polaroid
export const POLAROID_SHOWS = ['malus', 'crossed'] as const;
export type PolaroidSpec = Common & {verb: 'polaroid'; show: (typeof POLAROID_SHOWS)[number];
  /** malus: P2's pass axis from P1's, in degrees; crossed: the middle polaroid's from P1's. Left out: it turns from 0° to 180°. */
  angle?: number};

export function polaroidErrors(s: PolaroidSpec): string[] {
  const W = 'polaroid';
  if (!POLAROID_SHOWS.includes(s.show)) return [`${W}: show is one of ${POLAROID_SHOWS.join(', ')}`];
  if (s.angle !== undefined && !(isNum(s.angle) && s.angle >= 0 && s.angle <= 180)) return [`${W}: angle is 0 to 180 degrees`];
  return [];
}

export function polaroid(s: PolaroidSpec): Scene {
  const {k, props, bx, by, bw, bh, cx, cy, S, on, arrow, line, poly, label, keysOf, finish} = kit(s);
  const num = !s.illustrative, facts: string[] = [], anchors: Record<string, P2> = {}, crossed = s.show === 'crossed', sweep = s.angle === undefined;
  const yb = by + bh * .3, R = Math.min(bh * .24, bw * .11), ox = -.42, oy = .3;      // the beam's line; z drawn down and to the left
  const at = (x: number, y: number, z: number): P2 => [x + R * ox * z, yb - R * y + R * oy * z];
  const xs = crossed ? [.22, .5, .78] : [.3, .66], X = xs.map(f => bx + bw * f);
  const T0 = 1.6, T1 = 9.6, dur = sweep ? T1 + 1.2 : 6;
  const theta = (t: number) => sweep ? 180 * smooth((t - T0) / (T1 - T0)) : s.angle!;
  const frac = (th: number) => crossed ? crossedThree(th) : malus(th);
  line([bx, yb], [bx + bw, yb], 'faint', 2);
  arrow([bx + bw - 90 * k, yb], [bx + bw - 10 * k, yb], 'muted', 3);
  // the discs and their pass axes; P2 (crossed: the middle one) turns
  const disc = (x: number, name: string) => {
    props.push({id: `disc-${name}`, type: 'polyline', closed: true, points: Array.from({length: 49}, (_, j) => { const u = j / 48 * 2 * Math.PI; return at(x, Math.cos(u), Math.sin(u)); }),
      style: {stroke: 'cool', width: 3 * k, fill: 'cool', opacity: .12}, layer: 1} as Prop);
    label(x, yb - R * 1.25 - 10 * k, name, 'cool', 26);
  };
  const axis = (x: number, th: (t: number) => number, id: string, keyed: boolean) => {
    const end = (sg: number, t: number) => at(x, sg * .9 * Math.cos(rad(th(t))), sg * .9 * Math.sin(rad(th(t))));
    const base = {id, type: 'line', x1: end(-1, 0)[0], y1: end(-1, 0)[1], x2: end(1, 0)[0], y2: end(1, 0)[1], style: {stroke: 'ink', width: 4 * k, dash: [12 * k, 7 * k]}, layer: 2} as Record<string, unknown>;
    if (keyed) base.keys = {x1: keysOf(dur, t => end(-1, t)[0]), y1: keysOf(dur, t => end(-1, t)[1]), x2: keysOf(dur, t => end(1, t)[0]), y2: keysOf(dur, t => end(1, t)[1])};
    props.push(base as Prop);
  };
  const names = crossed ? ['P1', 'P2', 'P3'] : ['P1', 'P2'];
  X.forEach((x, j) => disc(x, names[j]));
  axis(X[0], () => 0, 'axis-P1', false);
  axis(X[1], theta, 'axis-P2', sweep);
  if (crossed) axis(X[2], () => 90, 'axis-P3', false);
  // the field: unpolarised before P1 (every direction), along P1 after it, along P2 with cos θ after P2 (and so on)
  const xu = (bx + X[0]) / 2;
  for (const a of [0, 45, 90, 135]) {
    const p = at(xu, .55 * Math.cos(rad(a)), .55 * Math.sin(rad(a))), q = at(xu, -.55 * Math.cos(rad(a)), -.55 * Math.sin(rad(a)));
    arrow([xu, yb], p, 'accent', 3); arrow([xu, yb], q, 'accent', 3);
  }
  label(xu, yb + R * .9 + 30 * k, 'unpolarised', 'accent', 22);
  const field = (x: number, dir: (t: number) => number, amp: (t: number) => number, id: string, keyed: boolean) => {
    for (const sg of [1, -1]) {
      const tip = (t: number) => at(x, sg * .75 * amp(t) * Math.cos(rad(dir(t))), sg * .75 * amp(t) * Math.sin(rad(dir(t))));
      const base = {id: `${id}${sg}`, type: 'arrow', x1: x, y1: yb, x2: tip(0)[0], y2: tip(0)[1], head: 14 * k, style: {stroke: 'accent', width: 4 * k}, layer: 3} as Record<string, unknown>;
      if (keyed) base.keys = {x2: keysOf(dur, t => tip(t)[0]), y2: keysOf(dur, t => tip(t)[1])};
      props.push(base as Prop);
    }
  };
  const xa = (X[0] + X[1]) / 2, xb = crossed ? (X[1] + X[2]) / 2 : (X[1] + bx + bw) / 2;
  field(xa, () => 0, () => 1, 'E1', false);
  field(xb, theta, t => Math.abs(Math.cos(rad(theta(t)))), 'E2', sweep);
  if (crossed) field((X[2] + bx + bw) / 2, () => 90, t => Math.abs(Math.cos(rad(theta(t))) * Math.sin(rad(theta(t)))), 'E3', sweep);
  // the transmitted intensity against θ, below, with the present angle's point riding on it
  const g0 = bx + bw * .1, g1 = bx + bw * .9, gy0 = by + bh * .95, gy1 = by + bh * .62, GX = (th: number) => g0 + th / 180 * (g1 - g0), GY = (f: number) => gy0 - f * (gy0 - gy1);
  line([g0, gy0], [g1, gy0], 'ink', 2.5); line([g0, gy0], [g0, gy1 - 16 * k], 'ink', 2.5);
  for (const th of [0, 45, 90, 135, 180]) { line([GX(th), gy0], [GX(th), gy0 + 8 * k], 'ink', 2); label(GX(th), gy0 + 32 * k, `${th}°`, 'muted', 20); }
  label(g0 - 10 * k, gy1 - 2 * k, 'I', 'muted', 26, {align: 'end'}); label(g1, gy0 - 12 * k, 'θ', 'muted', 26, {align: 'end'});
  poly(Array.from({length: 181}, (_, j) => [GX(j), GY(frac(j))] as P2), 'good', 3, sweep ? {draw: 0, keys: {draw: [[T0, 0], [T1, 1, 'linear']] as Key[]}} : {style: {stroke: 'good', width: 3 * k, dash: [8 * k, 7 * k]}});
  const dotP = (t: number): P2 => [GX(theta(t)), GY(frac(theta(t)))];
  props.push({id: 'dot', type: 'circle', x: dotP(0)[0], y: dotP(0)[1], r: 9 * k, style: {fill: 'accent'}, layer: 4, ...(sweep ? {keys: {x: keysOf(dur, t => dotP(t)[0]), y: keysOf(dur, t => dotP(t)[1])}} : {})} as Prop);
  // a bar for the light leaving the last polaroid, as tall as its share of what P1 lets through
  const barX = bx + bw - 40 * k, barH = R * 1.6, base = yb + R * 1.1 + barH;
  props.push({id: 'bar-frame', type: 'rect', x: barX - 14 * k, y: base - barH, w: 28 * k, h: barH, style: {stroke: 'muted', width: 2 * k}, layer: 2} as Prop);
  const h0 = barH * frac(theta(0)), bar = {id: 'bar', type: 'rect', x: barX - 14 * k, y: base - h0, w: 28 * k, h: h0, style: {fill: 'good'}, layer: 3} as Record<string, unknown>;
  if (sweep) bar.keys = {y: keysOf(dur, t => base - barH * frac(theta(t))), h: keysOf(dur, t => barH * frac(theta(t)))};
  props.push(bar as Prop);
  label(barX, base + 30 * k, crossed ? 'I3 / I1' : 'I / I1', 'muted', 22);
  if (!sweep) label(GX(s.angle!), GY(frac(s.angle!)) - 18 * k, num ? `${s.angle}°: ${sig(frac(s.angle!))} I1` : 'θ', 'accent', 22, halo(k, 'accent', {layer: 5}));
  Object.assign(anchors, {P1: [X[0], yb] as P2, P2: [X[1], yb] as P2, ...(crossed ? {P3: [X[2], yb] as P2} : {}), bar: [barX, base - barH * frac(theta(dur))] as P2, base: [barX, base] as P2, point: dotP(dur)});
  const story = crossed ? 'Crossed polaroids pass nothing, but a third between them at θ lets light through: I = (I1/4) sin² 2θ'
    : 'P1 passes half of unpolarised light, polarised along its axis; P2 at θ passes I1 cos²θ';
  const second = crossed ? 'Most at θ = 45°, a quarter of I1; none at 0° or 90°' : 'Dark when the pass axes are crossed, at 90°; full again at 180°: light is a transverse wave';
  facts.push('unpolarised light through one polaroid: I1 = I0/2, whatever its angle');
  if (!sweep) facts.push(crossed ? `the middle polaroid at θ = ${s.angle}°: I3 = (I1/4) sin² 2θ = ${sig(frac(s.angle!))} I1` : `θ = ${s.angle}°: I = I1 cos²θ = ${sig(frac(s.angle!))} I1`);
  else facts.push(crossed ? 'turning the middle polaroid, the light leaving P3 is greatest, I1/4, at 45° and 135°' : 'turning P2 from 0° to 180° the light fades to nothing at 90°, then returns');
  return finish('polaroid', s as never, dur, story, second, facts, anchors, s.illustrative);
}
