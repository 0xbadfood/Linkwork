// em_waves: electromagnetic waves, computed (NCERT Class 12 Physics, Ch. 8; 2026-11-03).
//   displacement  a charging capacitor: Ampère's loop with a flat surface (i through it) and a pot surface (none),
//                 the growing E between the plates, i_d = ε0 dΦE/dt = i, and B at M between the plates as at P outside
//   plane         a plane wave: E and B at right angles to each other and to the travel, in phase, B0 = E0/c, λν = c;
//                 `axes` names the travel, E and B axes, and E × B gives the direction (Examples 8.1 and 8.2)
//   medium        the same wave entering glass: same ν, slower, shorter λ: v = c/√(εr μr)
//   source        a charge at rest, in steady motion, or oscillating: only the accelerated charge radiates
//   hertz         Hertz's transmitter, a spark gap, and a ring receiver that sparks a moment later; staged builds it in the
//                 narration's order (rods and gap, coil, spark and oscillating current, waves, receiver, its spark on arrival)
//   source `energy`: the oscillating charge's swing dies away as its rings carry energy off, two bars on one scale
//   spectrum      the bands from radio to gamma on one wavelength scale; `mark` places a wave on it, with its band,
//                 frequency and photon energy
import {kit} from './potential.ts';
import {sci} from './electric.ts';
import {wavelengthColour} from '../physics/light.ts';
import type {Prop, Scene} from '../scene.ts';

type P2 = [number, number];
export const EM_SHOWS = ['displacement', 'plane', 'medium', 'source', 'hertz', 'spectrum'] as const;
export type EmWavesSpec = {verb: 'em_waves'; show: (typeof EM_SHOWS)[number];
  i?: number; R?: number; d?: number; r?: number; C?: number; V?: number; omega?: number; surfaces?: boolean;
  E0?: number; B0?: number; nu?: number; lambda?: number; k?: number; axes?: string;
  n?: number; epsilon_r?: number; mu_r?: number; motion?: 'still' | 'steady' | 'oscillating'; antenna?: boolean; energy?: boolean; seconds?: number;
  staged?: boolean; cues?: {coil?: number; spark?: number; receiver?: number; arrival?: number}; mark?: number; mark_nu?: number; band?: string;
  title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};

export const C_LIGHT = 3e8, EPS0 = 8.854e-12, MU0 = 4 * Math.PI * 1e-7;
const TAU = 2 * Math.PI;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const sig = (x: number, unit: string, d = 3) => { const a = Math.abs(x); return a !== 0 && (a >= 1e5 || a < .01) ? sci(+x.toPrecision(d), unit) : `${+x.toPrecision(d)} ${unit}`; };

/** The book's bands (Table 8.1), by wavelength in metres: [name, shortest, longest]. X-rays and gamma overlap there; here they meet at 10⁻¹² m. */
export const BANDS: [string, number, number][] = [['radio', .1, 1e4], ['microwave', 1e-3, .1], ['infrared', 7e-7, 1e-3], ['visible', 4e-7, 7e-7],
  ['ultraviolet', 1e-9, 4e-7], ['X-rays', 1e-12, 1e-9], ['gamma rays', 1e-14, 1e-12]];
export const bandOf = (lambda: number) => (BANDS.find(([, lo, hi]) => lambda >= lo && lambda < hi) ?? (lambda >= 1e4 ? BANDS[0] : BANDS[6]))[0];
/** Photon energy in eV: E = hc/λ, hc = 1240 eV nm. */
export const photonEV = (lambda: number) => 1240e-9 / lambda;

/** B between or beside circular plates of radius R carrying a total (displacement) current i, at r from the axis. */
export const fieldAt = (i: number, R: number, r: number) => r < R ? MU0 * i * r / (TAU * R * R) : MU0 * i / (TAU * r);
export const capacitance = (R: number, d: number) => EPS0 * Math.PI * R * R / d;

/** The travel axis, E's axis and B's axis, e.g. 'zxy' (Fig. 8.3) or 'xzy' (Example 8.2), and the sign E × B gives the travel. */
export function axesOf(axes = 'zxy'): {travel: string; E: string; B: string; sign: 1 | -1} | undefined {
  if (!/^[xyz]{3}$/.test(axes) || new Set(axes).size !== 3) return undefined;
  const [travel, E, B] = axes, cyclic = ['xyz', 'yzx', 'zxy'].includes(E + B + travel);
  return {travel, E, B, sign: cyclic ? 1 : -1};
}

/** λ and ν from whichever the spec gives (λ, ν, or k); by default 25 MHz, Example 8.1. */
export function waveOf(s: {nu?: number; lambda?: number; k?: number}) {
  const lambda = s.lambda ?? (s.k ? TAU / s.k : s.nu ? C_LIGHT / s.nu : C_LIGHT / 25e6);
  return {lambda, nu: s.nu ?? C_LIGHT / lambda};
}

export function emWavesErrors(s: EmWavesSpec): string[] {
  const e: string[] = [], W = 'em_waves';
  if (!EM_SHOWS.includes(s.show)) return [`${W}: show is one of ${EM_SHOWS.join(', ')}`];
  for (const n of ['i', 'R', 'd', 'r', 'C', 'V', 'omega', 'E0', 'B0', 'nu', 'lambda', 'k', 'n', 'epsilon_r', 'mu_r', 'mark', 'mark_nu'] as const)
    if (s[n] !== undefined && !(isNum(s[n]) && (s[n] as number) > 0)) e.push(`${W}: ${n} is a number above 0`);
  if (s.axes !== undefined && !axesOf(s.axes)) e.push(`${W}: axes is three different letters: travel, E, B, e.g. 'zxy' (travel z, E along x, B along y)`);
  if (s.motion !== undefined && !['still', 'steady', 'oscillating'].includes(s.motion)) e.push(`${W}: motion is still, steady or oscillating`);
  if (s.band !== undefined && !BANDS.some(([b]) => b === s.band)) e.push(`${W}: band is one of ${BANDS.map(([b]) => b).join(', ')}`);
  if (s.E0 !== undefined && s.B0 !== undefined && Math.abs(s.E0 / s.B0 / C_LIGHT - 1) > .02) e.push(`${W}: E0/B0 must be c = 3 × 10⁸ m/s: give one, the other follows`);
  if (s.nu !== undefined && s.lambda !== undefined && Math.abs(s.nu * s.lambda / C_LIGHT - 1) > .02) e.push(`${W}: ν λ must be c: give one of nu and lambda`);
  if (s.n !== undefined && (s.epsilon_r !== undefined || s.mu_r !== undefined)) e.push(`${W}: give n, or epsilon_r and mu_r, not both`);
  if (s.n !== undefined && s.n < 1) e.push(`${W}: n is 1 or more`);
  if (s.energy !== undefined && (typeof s.energy !== 'boolean' || s.show !== 'source' || (s.motion ?? 'oscillating') !== 'oscillating' || s.antenna))
    e.push(`${W}: energy (true or false) goes with show source, motion oscillating, a lone charge (no antenna): its swing dies away as the waves carry energy off`);
  if (s.seconds !== undefined && (s.show !== 'source' && s.show !== 'hertz')) e.push(`${W}: seconds is for show source or hertz`);
  else if (s.seconds !== undefined && !(isNum(s.seconds) && s.seconds >= 4 && s.seconds <= 40)) e.push(`${W}: seconds is 4 to 40`);
  if (s.staged !== undefined && (typeof s.staged !== 'boolean' || s.show !== 'hertz')) e.push(`${W}: staged (true or false) is for show hertz`);
  if (s.cues !== undefined) {
    const T = s.seconds ?? 20, c = s.cues, names = ['coil', 'spark', 'receiver', 'arrival'] as const;
    if (!s.staged) e.push(`${W}: cues go with staged: true (the seconds each part of Hertz's apparatus appears)`);
    else if (typeof c !== 'object' || c === null || Object.keys(c).some(n => !(names as readonly string[]).includes(n))) e.push(`${W}: cues is {coil?, spark?, receiver?, arrival?}, each in seconds`);
    else {
      const at = hertzCues(T, c), bad = names.filter(n => c[n] !== undefined && !(isNum(c[n]) && c[n]! > 0 && c[n]! < T));
      if (bad.length) e.push(`${W}: cues ${bad.join(', ')} must be within the scene's seconds (${T})`);
      else if (!(at.coil < at.spark && at.spark < at.receiver && at.receiver < at.arrival)) e.push(`${W}: cues come in order: coil, then spark, then receiver, then arrival (now ${names.map(n => `${n} ${+at[n].toFixed(1)}`).join(', ')})`);
      else if (at.receiver - at.spark < HERTZ_LIFE) e.push(`${W}: cues: give the waves ${HERTZ_LIFE} s between spark and receiver (a wave has to pass before the receiver is shown)`);
      else if (at.arrival - at.receiver < 1) e.push(`${W}: cues: arrival comes at least 1 s after receiver`);
    }
  }
  return e;
}

/** Hertz staged: the second each part appears, by default where the narration usually names it (rods and gap first,
 * the coil a quarter in, the spark a third in, the receiver half-way, its spark three quarters in). */
const HERTZ_LIFE = 1.6;   // s at most that a wave stays on screen (it fades before the frame's edge)
export function hertzCues(T: number, c: EmWavesSpec['cues'] = {}) {
  return {coil: c.coil ?? .24 * T, spark: c.spark ?? .34 * T, receiver: c.receiver ?? .52 * T, arrival: c.arrival ?? .78 * T};
}
/** The oscillating charge's energy, as a share of its first: falling as it radiates, from t0 to a fifth by the end. */
export const energyLeft = (t: number, T: number, t0 = .6) => Math.exp(-Math.max(0, t - t0) / ((T - t0) / 1.6));

export function emWaves(s: EmWavesSpec): Scene {
  const {k, props, bx, by, bw, bh, cx, cy, S, arrow, line, poly, label, ring, charge, keysOf, finish} = kit(s);
  const facts: string[] = [], anchors: Record<string, P2> = {}, labelAt: Record<string, P2> = {}; let dur = 10, story = '', second = '', c = 0;
  const id = (p: string) => `em${p}${c++}`, num = !s.illustrative;
  const rect = (x: number, y: number, w: number, h: number, fill: string, extra: Record<string, unknown> = {}, stroke = 'ink') => props.push({id: id('r'), type: 'rect', x, y, w, h, style: {fill, stroke, width: 2 * k}, layer: 2, ...extra} as Prop);
  const keyed = (p: Record<string, unknown>) => props.push({id: id('k'), layer: 3, ...p} as Prop);

  if (s.show === 'displacement') {
    // Fig. 8.1/8.2: the wire comes in from the left to the left plate; the right plate leads on to the right
    const fromC = s.C !== undefined && s.V !== undefined && s.omega !== undefined, R = s.R ?? (fromC ? .06 : .12), d = s.d ?? .05;
    const i = s.i ?? (fromC ? s.V! * s.omega! * s.C! : .15), r = s.r ?? R / 2, surfaces = s.surfaces ?? true; dur = 12;
    const pl = S * .3, gap = S * .16, xL = bx + bw * .32, xR = xL + gap, yT = cy - pl, yB = cy + pl, wy = cy;
    rect(xL - 8 * k, yT, 16 * k, 2 * pl, 'ink', {layer: 3}); rect(xR - 8 * k, yT, 16 * k, 2 * pl, 'ink', {layer: 3});
    line([bx + bw * .02, wy], [xL - 8 * k, wy], 'ink', 5); line([xR + 8 * k, wy], [bx + bw * .6, wy], 'ink', 5);
    arrow([bx + bw * .05, wy - 24 * k], [bx + bw * .13, wy - 24 * k], 'good', 4); label(bx + bw * .09, wy - 44 * k, 'i', 'good', 30);
    arrow([bx + bw * .5, wy - 24 * k], [bx + bw * .58, wy - 24 * k], 'good', 4); label(bx + bw * .54, wy - 44 * k, 'i', 'good', 30);
    const q = (t: number) => Math.min(1, t / dur * 1.15);
    label(xL - 34 * k, yT - 16 * k, '+q', 'bad', 26); label(xR + 34 * k, yT - 16 * k, '−q', 'cool', 26);
    const P: P2 = [bx + bw * .14, wy], M: P2 = [(xL + xR) / 2, wy];
    if (surfaces) {
      ring(P, 22 * k, S * .12, 'accent', 4, false, {show: [1, 1e9]}); label(P[0], wy + S * .12 + 34 * k, 'loop at P', 'accent', 24, {show: [1, 1e9]});
      props.push({id: 'flat', type: 'polyline', points: Array.from({length: 73}, (_, j) => [P[0] + 22 * k * Math.cos(j * Math.PI / 36), wy + S * .12 * Math.sin(j * Math.PI / 36)] as P2), closed: true, style: {fill: 'good', opacity: .25, stroke: 'good', width: 2 * k}, layer: 1, show: [2, 5]} as Prop);
      label(P[0], wy + S * .12 + 70 * k, 'flat surface: i crosses it', 'good', 24, {show: [2, 5]});
      const pot: P2[] = [...Array.from({length: 19}, (_, j) => { const a = -Math.PI / 2 + Math.PI * j / 18; return [P[0] + (xL + gap * .55 - P[0]) * Math.cos(a), wy + S * .12 * Math.sin(a)] as P2; })];
      poly(pot, 'bad', 4, {show: [5, 8.5]}, true); label(bx + bw * .02, yB + 50 * k, 'pot surface, through the gap: no conduction current', 'bad', 24, {align: 'start', show: [5, 8.5]});
      label(bx + bw * .3, by + bh * .06, '∮B·dl = μ0 i ... or 0?', 'muted', 26, {show: [5, 8.5]});
    }
    // E between the plates grows with the charge; it is the source of i_d
    for (let j = 0; j < 5; j++) { const y = yT + pl * 2 * (j + .5) / 5; keyed({type: 'arrow', x1: xL + 10 * k, y1: y, x2: xL + 12 * k, y2: y, head: 12 * k, style: {stroke: 'accent', width: 3 * k}, keys: {x2: keysOf(dur, t => xL + 12 * k + (gap - 26 * k) * q(t))}}); }
    label(M[0], yT - 52 * k, 'E grows', 'accent', 24);
    const tB = surfaces ? 8.5 : 3;
    label(M[0], yB + 92 * k, num ? `i_d = ε0 dΦE/dt = ${sig(i, 'A')}` : 'i_d = ε0 dΦE/dt = i', 'accent', 28, {show: [tB, 1e9]});
    ring(M, 30 * k, S * .08, 'cool', 3, true, {show: [tB + 1, 1e9]}); label(M[0], yB + 40 * k, 'B at M, between the plates', 'cool', 24, {show: [tB + 1, 1e9]});
    ring(P, 34 * k, S * .08, 'cool', 3, true, {show: [tB + 1, 1e9]}); label(P[0], wy - S * .12 - 18 * k, 'B at P, outside', 'cool', 24, {show: [tB + 1, 1e9]});
    anchors.plates = M; anchors.M = M; anchors.P = P; anchors.loop = P; anchors.wire = [bx + bw * .09, wy]; anchors.field = [M[0], yT];
    story = 'Between the plates no charge flows, yet the changing E is a current too: i_d = ε0 dΦE/dt';
    second = 'With it, Ampère\'s law gives the same B whatever surface the loop spans, and B appears between the plates as outside';
    if (s.C !== undefined || s.R !== undefined || s.d !== undefined) { const Cv = s.C ?? capacitance(R, d); facts.push(`C = ${sig(Cv, 'F')}`, `dV/dt = i/C = ${sig(i / Cv, 'V/s')}`); }
    facts.push(`i_d = ${sig(i, 'A')}`, `B at ${sig(r, 'm', 2)} from the axis = ${sig(fieldAt(i, R, r), 'T')}`);
  } else if (s.show === 'plane' || s.show === 'medium') {
    const ax = axesOf(s.axes) ?? axesOf()!, w = waveOf(s), E0 = s.E0 ?? (s.B0 ? s.B0 * C_LIGHT : 6.3), B0 = E0 / C_LIGHT, medium = s.show === 'medium';
    const nIdx = s.n ?? Math.sqrt((s.epsilon_r ?? (medium ? 2.25 : 1)) * (s.mu_r ?? 1)), sign = ax.sign, period = 2.4; dur = 10;
    const o: P2 = [bx + bw * .08, cy], L = bw * .82, amp = S * .3, waves = 2.2, lamPx = L / waves, oblique: P2 = [-.55, .38];
    const glassX = medium ? o[0] + L * .45 : Infinity, lamIn = lamPx / nIdx;
    // phase at screen x: in the medium the wave goes on at the same frequency with λ/n
    const phaseAt = (x: number, t: number) => { const tt = sign * TAU * t / period; return x <= glassX ? TAU * (x - o[0]) / lamPx - tt : TAU * (glassX - o[0]) / lamPx + TAU * (x - glassX) / lamIn - tt; };
    line(o, [o[0] + L + 30 * k, o[1]], 'ink', 3); label(o[0] + L + 52 * k, o[1] + 9 * k, sign > 0 ? ax.travel : `−${ax.travel}`, 'muted', 28);
    line([o[0], o[1] + amp * 1.15], [o[0], o[1] - amp * 1.15], 'faint', 2); label(o[0] - 22 * k, o[1] - amp * 1.15, ax.E, 'accent', 28);
    line([o[0] - oblique[0] * amp * .9, o[1] - oblique[1] * amp * .9], [o[0] + oblique[0] * amp * 1.1, o[1] + oblique[1] * amp * 1.1], 'faint', 2); label(o[0] + oblique[0] * amp * 1.1 - 14 * k, o[1] + oblique[1] * amp * 1.1 + 26 * k, ax.B, 'cool', 28);
    if (medium) { rect(glassX, o[1] - amp * 1.25, o[0] + L - glassX, amp * 2.5, 'cool', {layer: 0, style: {fill: 'cool', opacity: .12, stroke: 'cool', width: 2 * k}}); label(glassX + 20 * k, o[1] - amp * 1.25 + 34 * k, num ? `glass, n = ${sig(nIdx, '', 3).trim()}` : 'glass', 'cool', 26, {align: 'start'}); label(o[0] + 20 * k, o[1] + amp * 1.25 - 14 * k, 'vacuum', 'muted', 26, {align: 'start'}); }
    const N = 44, segs = 88, fade = medium ? 1 : 1;
    for (let j = 0; j <= N; j++) {
      const x = o[0] + L * j / N;
      keyed({type: 'line', x1: x, y1: o[1], x2: x, y2: o[1], style: {stroke: 'accent', width: 3 * k}, keys: {y2: keysOf(dur, t => o[1] - amp * fade * Math.sin(phaseAt(x, t)), 12)}});
      keyed({type: 'line', x1: x, y1: o[1], x2: x, y2: o[1], style: {stroke: 'cool', width: 3 * k}, layer: 2, keys: {x2: keysOf(dur, t => x + oblique[0] * amp * .75 * Math.sin(phaseAt(x, t)), 12), y2: keysOf(dur, t => o[1] + oblique[1] * amp * .75 * Math.sin(phaseAt(x, t)), 12)}});
    }
    for (let j = 0; j < segs; j++) {
      const xa = o[0] + L * j / segs, xb = o[0] + L * (j + 1) / segs;
      keyed({type: 'line', x1: xa, y1: o[1], x2: xb, y2: o[1], style: {stroke: 'accent', width: 5 * k}, layer: 4, keys: {y1: keysOf(dur, t => o[1] - amp * Math.sin(phaseAt(xa, t)), 12), y2: keysOf(dur, t => o[1] - amp * Math.sin(phaseAt(xb, t)), 12)}});
      keyed({type: 'line', x1: xa, y1: o[1], x2: xb, y2: o[1], style: {stroke: 'cool', width: 5 * k}, layer: 4, keys: {
        x1: keysOf(dur, t => xa + oblique[0] * amp * .75 * Math.sin(phaseAt(xa, t)), 12), y1: keysOf(dur, t => o[1] + oblique[1] * amp * .75 * Math.sin(phaseAt(xa, t)), 12),
        x2: keysOf(dur, t => xb + oblique[0] * amp * .75 * Math.sin(phaseAt(xb, t)), 12), y2: keysOf(dur, t => o[1] + oblique[1] * amp * .75 * Math.sin(phaseAt(xb, t)), 12)}});
    }
    label(o[0] + lamPx * .25, o[1] - amp - 22 * k, `E along ${ax.E}`, 'accent', 26); label(o[0] + lamPx * .25 + oblique[0] * amp, o[1] + oblique[1] * amp + 40 * k, `B along ${ax.B}`, 'cool', 26);
    arrow([o[0] + L * (sign > 0 ? .78 : .98), by + bh * .08], [o[0] + L * (sign > 0 ? .98 : .78), by + bh * .08], 'good', 5); label(o[0] + L * .88, by + bh * .08 - 18 * k, medium ? 'v' : 'c', 'good', 28);
    const l0 = o[0] + lamPx * 1.25, l1 = l0 + lamPx; if (!medium) { line([l0, o[1] + amp * 1.3], [l1, o[1] + amp * 1.3], 'muted', 2); label((l0 + l1) / 2, o[1] + amp * 1.3 + 32 * k, num ? `λ = ${sig(w.lambda, 'm')}` : 'λ', 'muted', 26); }
    anchors.origin = o; anchors.E = [o[0] + lamPx * .25, o[1] - amp]; anchors.B = [o[0] + lamPx * .25 + oblique[0] * amp * .75, o[1] + oblique[1] * amp * .75]; anchors.travel = [o[0] + L, o[1]];
    // a note at the travel end or the origin would sit on the axis among the moving fields (leph1-08 C3): its words go
    // to the clear row above the wave, left of the c arrow
    labelAt.travel = labelAt.origin = [o[0], by + bh * .08];
    if (medium) { anchors.glass = [glassX, o[1] - amp]; anchors.vacuum = [o[0] + L * .2, o[1] - amp]; }
    if (medium) {
      story = 'In glass the wave keeps its frequency but slows: v = c/√(εr μr), so each wavelength is shorter';
      second = 'The source sets ν; the medium sets the speed, and λ = v/ν follows';
      facts.push(`v = c/n = ${sig(C_LIGHT / nIdx, 'm/s')}`, `λ in glass = λ/n = ${sig(w.lambda / nIdx, 'm')}`);
    } else {
      story = 'E and B rise and fall together, at right angles to each other and to the travel: E × B points the way the wave goes';
      second = 'B0 = E0/c: the magnetic field is small in tesla, yet carries as much energy as E';
      facts.push(`B0 = E0/c = ${sig(B0, 'T')}`, `λ = c/ν = ${sig(w.lambda, 'm')}`, `ν = ${sig(w.nu, 'Hz')}`);
    }
  } else if (s.show === 'source') {
    const motion = s.motion ?? 'oscillating', energy = !!s.energy, cardTop = by + bh - 192 * k, o: P2 = energy ? [bx + bw * .45, (by + cardTop) / 2] : [bx + bw * .2, cy], A = S * .12, period = 2; dur = s.seconds ?? 10;
    if (motion === 'still') {
      for (let j = 0; j < 12; j++) { const a = TAU * j / 12; arrow([o[0] + 34 * k * Math.cos(a), o[1] + 34 * k * Math.sin(a)], [o[0] + S * .34 * Math.cos(a), o[1] + S * .34 * Math.sin(a)], 'accent', 3); }
      charge(o[0], o[1], 1, 26, 'q'); story = 'A charge at rest: a steady electric field, nothing travels outward'; second = 'Static charges make no waves';
    } else if (motion === 'steady') {
      const x = (t: number) => o[0] - S * .1 + S * .5 * t / dur;
      for (let j = 0; j < 12; j++) { const a = TAU * j / 12; keyed({type: 'arrow', x1: o[0], y1: o[1] + 34 * k * Math.sin(a), x2: o[0], y2: o[1] + S * .3 * Math.sin(a), head: 14 * k, style: {stroke: 'accent', width: 3 * k}, layer: 2, keys: {x1: keysOf(dur, t => x(t) + 34 * k * Math.cos(a)), x2: keysOf(dur, t => x(t) + S * .3 * Math.cos(a))}}); }
      keyed({type: 'circle', x: o[0], y: o[1], r: 26 * k, style: {fill: 'bad', stroke: 'ink', width: 2 * k}, layer: 4, keys: {x: keysOf(dur, x)}});
      arrow([o[0], o[1] + S * .38], [o[0] + S * .2, o[1] + S * .38], 'good', 4); label(o[0] + S * .1, o[1] + S * .38 + 34 * k, 'steady speed', 'good', 24);
      story = 'A charge in uniform motion carries its field along: a steady current, still no wave'; second = 'Its fields do not change in time anywhere: nothing radiates';
    } else {
      // energy (2026-11-04, leph1-08 C2 S12: "the accelerated charge loses energy as it radiates" had rings but no loss):
      // the swing's amplitude goes as √(energy left), each ring is as bright as the energy it set out with
      const left = (t: number) => energy ? energyLeft(t, dur) : 1;
      const y = (t: number) => o[1] - A * Math.sqrt(left(t)) * Math.sin(TAU * t / period), speed = bw * .14;   // drawn speed of the wavefront, px per s
      // a ring has faded out before it reaches the frame's edge (check() refused every oscillating source: rings left the frame)
      const W0 = s.width ?? 1920, H0 = s.height ?? 1080, fadeAt = Math.min(bw * .75, o[0], o[1] - by + 60 * k, W0 - o[0], H0 - o[1]) - 6 * k;   // and clear of a narrow part's title
      if (s.antenna) { line([o[0], o[1] - A * 1.6], [o[0], o[1] + A * 1.6], 'ink', 6); keyed({type: 'circle', x: o[0], y: o[1] - A * 1.6, r: 18 * k, style: {fill: 'bad', stroke: 'ink', width: 2 * k}, layer: 4, keys: {opacity: keysOf(dur, t => .3 + .7 * Math.max(0, Math.sin(TAU * t / period)))}}); keyed({type: 'circle', x: o[0], y: o[1] + A * 1.6, r: 18 * k, style: {fill: 'cool', stroke: 'ink', width: 2 * k}, layer: 4, keys: {opacity: keysOf(dur, t => .3 + .7 * Math.max(0, Math.sin(TAU * t / period)))}}); label(o[0] - 40 * k, o[1] - A * 1.6, 'antenna', 'muted', 22, {align: 'end'}); }
      else keyed({type: 'circle', x: o[0], y: o[1], r: 24 * k, style: {fill: 'bad', stroke: 'ink', width: 2 * k}, layer: 4, keys: {y: keysOf(dur, y)}});
      for (let j = 0; j < Math.ceil(dur / (period / 2)); j++) { const t0 = j * period / 2; keyed({type: 'circle', x: o[0], y: o[1], r: 1, style: {fill: 'none', stroke: j % 2 ? 'cool' : 'accent', width: 3 * k}, layer: 1, show: [t0, 1e9], keys: {r: keysOf(dur, t => Math.max(1, (t - t0) * speed)), opacity: keysOf(dur, t => left(t0) * Math.max(0, 1 - (t - t0) * speed / fadeAt))}}); }
      if (energy) {
        // two bars on one scale, below the rings on a card of their own: what the charge has and what the waves took
        const x0 = bx + bw * .04, wmax = bw * .62, h = 30 * k, y2 = by + bh - h - 24 * k, y1 = y2 - 86 * k;
        props.push({id: 'energy-card', type: 'rect', x: bx, y: cardTop, w: bw, h: by + bh - cardTop, r: 12 * k, style: {fill: 'paper', stroke: 'faint', width: 2 * k}, layer: 5} as Prop);
        const bar = (yb: number, fill: string, w: (t: number) => number, name: string) => {
          props.push({id: `bar-${fill}`, type: 'rect', x: x0, y: yb, w: Math.max(1, w(0)), h, style: {fill}, layer: 6, keys: {w: keysOf(dur, t => Math.max(1, w(t)), 12)}} as Prop);
          props.push({id: `frame-${fill}`, type: 'rect', x: x0, y: yb, w: wmax, h, style: {fill: 'none', stroke: 'muted', width: 2 * k}, layer: 6} as Prop);
          label(x0, yb - 24 * k, name, fill, 24, {align: 'start', layer: 6});
        };
        bar(y1, 'bad', t => wmax * left(t), 'energy of the oscillating charge');
        bar(y2, 'cool', t => wmax * (1 - left(t)), 'energy carried away by the waves');
        anchors.charge_energy = [x0 + wmax * left(dur), y1 + h / 2]; anchors.wave_energy = [x0 + wmax * (1 - left(dur)), y2 + h / 2];
        facts.push('the energy the waves carry away is the energy the oscillating charge loses: the two bars always add to the same total');
      } else {
      // E along a line to the right: the charge's motion, arriving late by x/c
      for (let j = 1; j <= 14; j++) { const x = o[0] + bw * .05 + bw * .5 * j / 14, delay = (x - o[0]) / speed; keyed({type: 'arrow', x1: x, y1: cy + S * .38, x2: x, y2: cy + S * .38, head: 10 * k, style: {stroke: 'accent', width: 3 * k}, layer: 3, keys: {y2: keysOf(dur, t => cy + S * .38 - (t < delay ? 0 : S * .1 * Math.sin(TAU * (t - delay) / period)), 12)}}); }
      label(o[0] + bw * .3, cy + S * .38 + S * .16, 'E further out: the same swing, later', 'accent', 22);
      }
      anchors.waves = [o[0] + bw * .3, o[1] - S * .3];
      story = energy ? 'The wave\'s energy comes at the expense of its source' : 'An oscillating charge accelerates: its changing E makes a changing B, which makes E again, and the pair travels out at c';
      second = energy ? 'The accelerated charge supplies it, so it loses energy as it radiates: its swing dies away' : 'The wave has the frequency of the charge\'s oscillation; its energy comes from the source';
    }
    anchors.charge = o;
  } else if (s.show === 'hertz') {
    // The transmitter sits far enough from the frame's edges that its waves reach the receiver's gap, which faces it,
    // before they fade (2026-11-04, leph1-08 C2 S16: the rings left the frame, check() refused every hertz scene, and
    // the receiver sparked a fixed 0.4 s after the transmitter, wherever it stood). Its sparks come when a wave arrives.
    // staged builds the apparatus in the order a narration names it, at cues (seconds) or at shares of seconds.
    const W0 = s.width ?? 1920, H0 = s.height ?? 1080, staged = !!s.staged;
    const tx = bx + bw * .3, rx = bx + bw * .7, yy = cy, g = 14 * k, rod = bw * .09, rr = S * .1, gapX = rx - rr, head = Math.max(S * .26, 150 * k), cy2 = yy + Math.max(S * .22, 130 * k);
    const v = bw * .32, fadeR = Math.min(tx, yy, H0 - yy, W0 - tx) - 6 * k, life = Math.min(HERTZ_LIFE, fadeR / v), travel = (gapX - tx) / v;
    dur = s.seconds ?? (staged ? 20 : 9);
    const c = staged ? hertzCues(dur, s.cues) : {coil: 0, spark: 1.5, receiver: 0, arrival: 0}, from = (t0: number) => ({show: [t0, 1e9], fade: .3});
    const times: number[] = [];
    if (!staged) for (let t = 1.5; t < dur - .3; t += 1.5) times.push(t);
    else {
      for (let t = c.spark; t <= c.receiver - life + 1e-9; t += 1.5) times.push(t);          // each wave gone before the receiver is shown
      for (let t = c.arrival - travel; t < dur - .3; t += 1.5) times.push(t);                // then the wave that arrives on cue, and more
    }
    const arrivals = times.map(t => t + travel).filter(t => t >= c.receiver && t < dur);
    // the transmitter: two rods with plates, a small gap between them; the coil below drives it
    const ends = [tx - g - rod, tx + g + rod];
    line([ends[0], yy], [tx - g, yy], 'ink', 6); line([tx + g, yy], [ends[1], yy], 'ink', 6);
    rect(ends[0] - 44 * k, yy - 44 * k, 44 * k, 88 * k, 'paper', {style: {fill: 'paper', stroke: 'ink', width: 3 * k}}); rect(ends[1], yy - 44 * k, 44 * k, 88 * k, 'paper', {style: {fill: 'paper', stroke: 'ink', width: 3 * k}});
    label(tx, yy - head, 'transmitter', 'ink', 26); label(tx, yy - 46 * k, 'spark gap', 'accent', 22, staged ? from(.6) : {});
    rect(tx - 115 * k, cy2, 230 * k, 70 * k, 'faint', staged ? from(c.coil) : {}); label(tx, cy2 + 44 * k, 'induction coil', 'ink', 22, staged ? from(c.coil) : {});
    line([tx - g - rod * .5, yy], [tx - 40 * k, cy2], 'ink', 2, staged ? from(c.coil) : {}); line([tx + g + rod * .5, yy], [tx + 40 * k, cy2], 'ink', 2, staged ? from(c.coil) : {});
    const zigzag = (x: number, y: number, t0: number) => {
      keyed({type: 'circle', x, y, r: 20 * k, style: {fill: 'accent', opacity: .35}, layer: 5, show: [t0, t0 + .45], fade: .05});
      poly([[x - 12 * k, y - 16 * k], [x + 7 * k, y - 4 * k], [x - 7 * k, y + 4 * k], [x + 12 * k, y + 16 * k]], 'accent', 5, {layer: 6, show: [t0, t0 + .45], fade: .05});
    };
    for (const t0 of times) {
      zigzag(tx, yy, t0);
      // the spark sets charge surging between the plates: their signs swap, dying away
      for (let j = 0; j < 8; j++) { const w = {show: [t0 + .15 * j, t0 + .15 * (j + 1)], fade: .02, layer: 4}; label(ends[0] - 22 * k, yy + 15 * k, j % 2 ? '−' : '+', j % 2 ? 'cool' : 'bad', 44, w); label(ends[1] + 22 * k, yy + 15 * k, j % 2 ? '+' : '−', j % 2 ? 'bad' : 'cool', 44, w); }
      keyed({type: 'circle', x: tx, y: yy, r: 1, style: {fill: 'none', stroke: 'cool', width: 3 * k}, layer: 1, show: [t0, t0 + life],
        keys: {r: keysOf(dur, t => Math.max(1, (t - t0) * v)), opacity: keysOf(dur, t => Math.min(1, Math.max(0, (1 - (t - t0) * v / fadeR) / .2)))}});
    }
    if (staged) label(tx, yy - 100 * k, 'oscillating current', 'accent', 22, from(c.spark + .4));
    // the receiver: a loop with a tiny gap facing the transmitter, sparking as each wave reaches it
    const rec = staged ? from(c.receiver) : {};
    poly(Array.from({length: 61}, (_, j) => { const a = .16 + (TAU - .32) * j / 60; return [rx - rr * Math.cos(a), yy + rr * Math.sin(a)] as P2; }), 'ink', 5, rec);
    label(rx, yy - head, 'receiver', 'ink', 26, rec); label(rx, yy + rr + 44 * k, staged ? 'a loop with a tiny gap' : 'small spark', 'accent', 22, staged ? from(c.receiver + .4) : {});
    for (const t0 of arrivals) zigzag(gapX, yy, t0);
    if (staged) label(rx, yy + rr + 80 * k, 'spark: a wave has arrived', 'accent', 22, from(c.arrival));
    anchors.transmitter = [tx, yy]; anchors.receiver = [rx, yy]; anchors.gap = [tx, yy]; anchors.receiver_gap = [gapX, yy]; anchors.coil = [tx, cy2 + 35 * k];
    facts.push('a spark jumps the receiver\'s gap when a wave from the transmitter reaches it: nothing else connects them');
    // staged: the panel names nothing ahead of the narration; each part's label comes in at its cue
    story = staged ? 'How Hertz produced electromagnetic waves' : 'Hertz, 1887: sparks across the transmitter\'s gap made sparks jump across a ring\'s gap some metres away';
    second = staged ? '' : 'Nothing connected them: electromagnetic waves carried the energy across, as Maxwell had predicted';
  } else {
    // the spectrum on one log wavelength scale, long wavelengths on the left
    const x0 = bx + bw * .03, x1 = bx + bw * .97, top = Math.log10(1e4), bot = Math.log10(1e-14), X = (lam: number) => x0 + (x1 - x0) * (top - Math.log10(lam)) / (top - bot), yb = cy - S * .02, hb = S * .1; dur = 9;
    const tones = ['muted', 'cool', 'bad', 'accent', 'good', 'cool', 'bad'];
    BANDS.forEach(([name, lo, hi], j) => { const a = X(hi), b = X(lo), hot = s.band === name; rect(a, yb, b - a, hb, tones[j], {layer: 1, style: {fill: tones[j], opacity: hot ? .75 : .35, stroke: 'ink', width: (hot ? 4 : 1) * k}}); label((a + b) / 2, yb + (j % 2 ? hb + 34 * k : -16 * k), name, hot ? 'ink' : 'muted', name === 'visible' ? 20 : 22); anchors[name.split(' ')[0]] = [(a + b) / 2, yb]; });
    // the visible band opened out below, red to violet
    const vy = yb + hb + S * .2, va = X(1e-5), vb = X(1e-10);
    line([X(7e-7), yb + hb], [va, vy], 'faint', 2); line([X(4e-7), yb + hb], [vb, vy], 'faint', 2);
    for (let j = 0; j < 30; j++) { const nm = 700 - 300 * j / 30; rect(va + (vb - va) * j / 30, vy, (vb - va) / 30 + 1, hb * .7, wavelengthColour(nm), {layer: 1, style: {fill: wavelengthColour(nm), stroke: 'none', width: 0}}); }
    label(va, vy + hb * .7 + 30 * k, '700 nm', 'muted', 20); label(vb, vy + hb * .7 + 30 * k, '400 nm', 'muted', 20);
    for (let e = 4; e >= -14; e -= 2) { const x = X(10 ** e); line([x, yb - S * .02], [x, yb], 'muted', 2); }
    label(x0, yb - S * .06, 'λ: 10⁴ m', 'muted', 22, {align: 'start'}); label(x1, yb - S * .06, '10⁻¹⁴ m', 'muted', 22, {align: 'end'});
    label(x0, by + bh * .95, 'longer λ, lower ν, less energy per photon', 'muted', 22, {align: 'start'}); label(x1, by + bh * .95, 'shorter λ, higher ν, more energy', 'muted', 22, {align: 'end'});
    // a wave above the bar whose wavelength shrinks as it sweeps from radio to gamma
    const wy = by + bh * .14, wa = S * .05, sweep = (t: number) => Math.min(1, t / (dur * .8)), lamPx = (t: number) => 160 * k * 10 ** (-1.4 * sweep(t)), wx = (t: number) => x0 + (x1 - x0 - bw * .16) * sweep(t);
    for (let j = 0; j < 40; j++) keyed({type: 'line', x1: 0, y1: wy, x2: 0, y2: wy, style: {stroke: 'accent', width: 3 * k}, layer: 4,
      keys: {x1: keysOf(dur, t => wx(t) + bw * .16 * j / 40, 12), x2: keysOf(dur, t => wx(t) + bw * .16 * (j + 1) / 40, 12), y1: keysOf(dur, t => wy - wa * Math.sin(TAU * bw * .16 * j / 40 / lamPx(t)), 12), y2: keysOf(dur, t => wy - wa * Math.sin(TAU * bw * .16 * (j + 1) / 40 / lamPx(t)), 12)}});
    const lam = s.mark ?? (s.mark_nu ? C_LIGHT / s.mark_nu : undefined);
    if (lam !== undefined) { const x = X(Math.min(1e4, Math.max(1e-14, lam))); line([x, yb - S * .08], [x, yb + hb + S * .04], 'ink', 4, {show: [dur * .8, 1e9]}); label(x, yb - S * .1, num ? `${bandOf(lam)}: λ = ${sig(lam, 'm')}` : bandOf(lam), 'ink', 26, {show: [dur * .8, 1e9]}); anchors.mark = [x, yb];
      facts.push(`${bandOf(lam)}`, `ν = c/λ = ${sig(C_LIGHT / lam, 'Hz')}`, `photon energy hc/λ = ${sig(photonEV(lam), 'eV')}`); }
    story = 'One family of waves, all travelling at c: only the wavelength, and so the frequency, differs';
    second = 'The bands overlap at their edges; we name them by how they are made and detected';
    if (s.band) { const b = BANDS.find(([n]) => n === s.band)!; facts.push(`${b[0]}: λ from ${sig(b[1], 'm')} to ${sig(b[2], 'm')}`); story = `${b[0][0].toUpperCase() + b[0].slice(1)}: ${b[0] === 'visible' ? 'the narrow band the eye detects, 700 to 400 nm' : `λ from ${sig(b[1], 'm')} to ${sig(b[2], 'm')}`}`; }
    anchors.bar = [cx, yb]; anchors.long = [x0, yb];
  }
  return finish('em_waves', s as never, dur, story, second, facts, anchors, s.illustrative, {labelAt});
}
