// moving_charges: Class 12 Moving Charges and Magnetism, computed (leph1-04, 2026-11-02). What magnetic_field and
// magnetic_force (Class 10, drawn by rule) have no numbers for.
//   cross      F = q v × B in a 3-D sketch: the force at right angles to v and B, qvB sin θ, zero along B
//   wire       F = I L × B on a straight wire, against its weight: B = mg/IL holds it in mid-air
//   path       a charge in a uniform field: circle r = mv/qB, or helix with pitch; T does not depend on v
//   element    Biot–Savart: dB = (μ₀/4π) I dl sin θ / r² at P, into or out of the page
//   loop       B on a loop's axis: μ₀IR²/2(x² + R²)^(3/2), and its curve
//   ampere     Ampère's law round a long wire: B = μ₀I/2πr outside, μ₀Ir/2πa² inside, and its curve
//   solenoid   B = μ₀nI inside, an amperian rectangle
//   parallel   two long wires: f = μ₀I₁I₂/2πd, like currents attract
//   torque     a rectangular coil in a field: τ = NIAB sin θ, the couple turns m toward B
//   galvo      moving coil: φ = (NAB/k)I in a radial field; with a shunt (ammeter) or a series R (voltmeter)
import type {Prop, Scene} from '../scene.ts';
import {kit} from './potential.ts';
import {sci} from './electric.ts';

type P2 = [number, number];
export const MOVING_SHOWS = ['cross', 'wire', 'path', 'element', 'loop', 'ampere', 'solenoid', 'parallel', 'torque', 'galvo'] as const;
export type MovingSpec = {verb: 'moving_charges'; show: (typeof MOVING_SHOWS)[number]; charge?: 'positive' | 'negative'; q?: number; m?: number; v?: number; B?: number; angle?: number; field?: 'in' | 'out';
  I?: number; I2?: number; L?: number; reverse?: boolean; R?: number; x?: number; r?: number; a?: number; dl?: number; n?: number; d?: number; N?: number; A?: number; b?: number; swing?: boolean; k?: number; G?: number; Ig?: number;
  kind?: 'coil' | 'ammeter' | 'voltmeter'; V?: number; rspan?: number; Tspan?: number; fspan?: number;
  title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};

const MU = 4 * Math.PI * 1e-7, GRAV = 9.8, QE = 1.6e-19, ME = 9e-31, RAD = Math.PI / 180;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v), fmt = (x: number, unit: string) => sci(x, unit);

export const radiusOf = (m: number, v: number, q: number, B: number) => m * v / (q * B);
export const loopField = (I: number, R: number, x: number) => MU * I * R * R / (2 * (x * x + R * R) ** 1.5);
export const wireField = (I: number, r: number, a = 0) => r < a ? MU * I * r / (2 * Math.PI * a * a) : MU * I / (2 * Math.PI * r);
export const shuntFor = (Ig: number, G: number, I: number) => Ig * G / (I - Ig);
export const seriesFor = (Ig: number, G: number, V: number) => V / Ig - G;

export function movingErrors(s: MovingSpec): string[] {
  const e: string[] = [], W = 'moving_charges';
  if (!MOVING_SHOWS.includes(s.show)) return [`${W}: show is one of ${MOVING_SHOWS.join(', ')}`];
  for (const n of ['q', 'm', 'v', 'B', 'I', 'I2', 'L', 'R', 'r', 'a', 'dl', 'n', 'd', 'N', 'A', 'b', 'k', 'G', 'Ig', 'V', 'rspan', 'Tspan', 'fspan'] as const) if (s[n] !== undefined && !(isNum(s[n]) && s[n]! > 0)) e.push(`${W}: ${n} is a number above 0`);
  if (s.angle !== undefined && !(isNum(s.angle) && s.angle >= 0 && s.angle <= 180)) e.push(`${W}: angle is 0 to 180 degrees`);
  if (s.show === 'path' && s.angle !== undefined && (s.angle < 20 || s.angle > 160)) e.push(`${W}: path needs angle 20 to 160 degrees; nearer B the charge just runs along the field, with no circle to see`);
  if (s.x !== undefined && !(isNum(s.x) && s.x >= 0)) e.push(`${W}: x, the distance along the axis, is 0 or more`);
  if (s.show === 'loop' && (s.x ?? 0) > 3 * (s.R ?? .1)) e.push(`${W}: loop draws x up to 3 R; raise R or lower x`);
  if (s.show === 'ampere' && s.a !== undefined && (s.r ?? .05) > 4 * s.a) e.push(`${W}: ampere draws r up to 4 a; lower r or leave a out`);
  if (s.field !== undefined && !['in', 'out'].includes(s.field)) e.push(`${W}: field is in or out (of the page)`);
  if (s.charge !== undefined && !['positive', 'negative'].includes(s.charge)) e.push(`${W}: charge is positive or negative`);
  if (s.kind !== undefined && !['coil', 'ammeter', 'voltmeter'].includes(s.kind)) e.push(`${W}: kind is coil, ammeter or voltmeter`);
  if (s.show === 'galvo' && s.kind === 'ammeter' && s.I !== undefined && s.I <= (s.Ig ?? 1e-3)) e.push(`${W}: an ammeter's range I must be above the galvanometer's full-scale Ig`);
  if (s.show === 'galvo' && s.kind === 'voltmeter' && s.V !== undefined && s.V <= (s.Ig ?? 1e-3) * (s.G ?? 100)) e.push(`${W}: a voltmeter's range V must be above Ig × G`);
  if (s.show === 'galvo' && (s.kind ?? 'coil') === 'coil' && (s.N ?? 100) * (s.A ?? 2e-4) * (s.B ?? .5) * (s.I ?? 5e-5) / (s.k ?? 1e-6) > 1.2) e.push(`${W}: the coil would turn past the scale (over 1.2 rad); lower I or raise k`);
  return e;
}

export function movingCharges(s: MovingSpec): Scene {
  const {k, props, bx, by, bw, bh, cx, cy, S, arrow, line, poly, label, ring, keysOf, finish} = kit(s);
  const facts: string[] = [], anchors: Record<string, P2> = {}; let dur = 8, story = '', second = '';
  const num = !s.illustrative;
  let n = 0;
  // the book's sign for a line at right angles to the page: a dot coming out, a cross going in
  const mark = (x: number, y: number, way: 'in' | 'out', r = 14, c = 'muted', extra: Record<string, unknown> = {}) => {
    props.push({id: `mk${n++}`, type: 'circle', x, y, r: r * k, style: {fill: 'paper', stroke: c, width: 2.5 * k}, layer: 2, ...extra} as Prop);
    if (way === 'out') props.push({id: `mk${n++}`, type: 'circle', x, y, r: r * .28 * k, style: {fill: c}, layer: 3, ...extra} as Prop);
    else { const g = r * .62 * k; line([x - g, y - g], [x + g, y + g], c, 2.5, {layer: 3, ...extra}); line([x - g, y + g], [x + g, y - g], c, 2.5, {layer: 3, ...extra}); }
  };
  const field = (way: 'in' | 'out', x0: number, y0: number, w: number, h: number, nx = 7, ny = 5) => { for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) mark(x0 + w * (i + .5) / nx, y0 + h * (j + .5) / ny, way, 9, 'faint'); };
  const axes = (x0: number, y0: number, w: number, h: number, xn: string, yn: string) => {
    line([x0, y0], [x0 + w, y0], 'ink', 3); line([x0, y0], [x0, y0 - h], 'ink', 3);
    label(x0 + w, y0 + 36 * k, xn, 'muted', 26); label(x0 - 30 * k, y0 - h + 8 * k, yn, 'muted', 26);
  };

  if (s.show === 'cross') {
    const pos = s.charge !== 'negative', q = s.q ?? QE, v = s.v ?? 1e6, B = s.B ?? 1, th = s.angle ?? 90, F = q * v * B * Math.sin(th * RAD), O: P2 = [cx - bw * .08, cy + bh * .16], Ls = S * .38;
    const px = (x: number, y: number, z: number): P2 => [O[0] + (x + y * .55 * Math.cos(th0)) * Ls, O[1] - (y * .55 * Math.sin(th0) + z) * Ls], th0 = 35 * RAD;
    poly([px(-.45, -.8, 0), px(1.25, -.8, 0), px(1.25, 1.1, 0), px(-.45, 1.1, 0), px(-.45, -.8, 0)], 'faint', 2);
    const tv = px(1.1, 0, 0), tb = px(Math.cos(th * RAD), Math.sin(th * RAD), 0), mag = Math.sin(th * RAD) * .85 * (pos ? 1 : -1), tf = px(0, 0, mag);
    arrow(O, tv, 'cool', 6); arrow(O, tb, 'accent', 6);
    if (Math.abs(mag) > .01) arrow(O, tf, 'bad', 7, {show: [1.6, 1e9]});
    label(tv[0] + 26 * k, tv[1] + 8 * k, 'v', 'cool', 34); label(tb[0] + 20 * k, tb[1] - 12 * k, 'B', 'accent', 34);
    if (Math.abs(mag) > .01) label(tf[0] + 30 * k, tf[1] + 10 * k, 'F', 'bad', 34, {show: [1.6, 1e9]});
    if (th > 3) { const arc = Array.from({length: 25}, (_, i) => { const a = th * RAD * i / 24; return px(.3 * Math.cos(a), .3 * Math.sin(a), 0); }); poly(arc, 'ink', 2); const m = px(.42 * Math.cos(th * RAD / 2), .42 * Math.sin(th * RAD / 2), 0); label(m[0], m[1] + 8 * k, 'θ', 'ink', 26); }
    props.push({id: 'q', type: 'circle', x: O[0], y: O[1], r: 15 * k, style: {fill: pos ? 'bad' : 'cool', stroke: 'ink', width: 2 * k}, layer: 4} as Prop);
    anchors.charge = O; anchors.v = tv; anchors.B = tb; anchors.F = tf;
    facts.push(`F = qvB sin θ = ${fmt(F, 'N')}`, `q = ${fmt(q, 'C')}, v = ${fmt(v, 'm/s')}, B = ${fmt(B, 'T')}, θ = ${th}°`);
    story = Math.abs(mag) > .01 ? `The force stands at right angles to both v and B${pos ? '' : ': a negative charge feels it the other way'}` : 'Moving along the field, the charge feels no force at all';
    second = 'F = q v × B. It does no work, so the speed never changes';
  } else if (s.show === 'wire') {
    const I = s.I ?? 2, L = s.L ?? 1.5, mass = s.m, B = s.B ?? (mass ? mass * GRAV / (I * L) : .65), F = B * I * L, up = !s.reverse, W = mass ? mass * GRAV : undefined, span = s.fspan ?? Math.max(F, W ?? 0), unit = bh * .3 / span, y = cy, x0 = bx + bw * .12, x1 = bx + bw * .88;
    field('in', x0, by + bh * .1, x1 - x0, bh * .8, 8, 5);
    line([x0, y], [x1, y], 'ink', 8, {layer: 3});
    if (up) arrow([x0 + 40 * k, y - 34 * k], [x0 + 150 * k, y - 34 * k], 'cool', 5); else arrow([x1 - 40 * k, y - 34 * k], [x1 - 150 * k, y - 34 * k], 'cool', 5);
    label(up ? x0 + 95 * k : x1 - 95 * k, y - 50 * k, 'I', 'cool', 28);
    const mid: P2 = [cx, y], tip: P2 = [cx - 40 * k, y + (up ? -1 : 1) * F * unit];
    arrow([cx - 40 * k, y], tip, 'bad', 7, {show: [1, 1e9]}); label(tip[0] - 40 * k, tip[1] + 8 * k, 'F', 'bad', 30, {show: [1, 1e9]});
    anchors.wire = mid; anchors.force = tip;
    if (W) { const t: P2 = [cx + 40 * k, y + W * unit]; arrow([cx + 40 * k, y], t, 'accent', 7, {show: [2, 1e9]}); label(t[0] + 46 * k, t[1] + 8 * k, 'mg', 'accent', 30, {show: [2, 1e9]}); anchors.weight = t; }
    facts.push(`F = BIL = ${fmt(F, 'N')}`, ...(W ? [`mg = ${fmt(W, 'N')}`, `to hang in mid-air B = mg/IL = ${fmt(W / (I * L), 'T')}`] : []), `I = ${fmt(I, 'A')}, L = ${fmt(L, 'm')}, B = ${fmt(B, 'T')}`);
    story = W ? (Math.abs(F - W) < W * .005 ? 'The upward force exactly carries the weight: the wire hangs in mid-air' : F > W ? 'The force is more than the weight: the wire would rise' : 'The force is less than the weight: the wire would fall') : 'A current in a field feels F = I L × B, at right angles to both';
    second = 'The crosses are the field going into the page';
  } else if (s.show === 'path') {
    const pos = s.charge !== undefined ? s.charge === 'positive' : s.q !== undefined, q = s.q ?? QE, m = s.m ?? ME, v = s.v ?? 3e7, B = s.B ?? 6e-4, th = s.angle ?? 90, vp = v * Math.sin(th * RAD), vz = v * Math.cos(th * RAD);
    const r = radiusOf(m, vp, q, B), T = 2 * Math.PI * m / (q * B), span = s.Tspan ?? T, turn = 5 * T / span; dur = 11;
    if (th === 90) {
      const way = s.field ?? 'in', rot = pos === (way === 'in') ? 1 : -1, c: P2 = [cx, cy], Sc = bh * .38 / (s.rspan ?? r), Rr = r * Sc, f0 = rot > 0 ? -Math.PI / 2 : Math.PI / 2;
      field(way, bx + bw * .08, by + bh * .04, bw * .84, bh * .92, 9, 7);
      ring(c, Rr, Rr, 'accent', 3, true);
      const ph = (t: number) => f0 + rot * 2 * Math.PI * t / turn, X = (t: number) => c[0] + Rr * Math.cos(ph(t)), Y = (t: number) => c[1] - Rr * Math.sin(ph(t));
      const L1 = 90 * k, L2 = 70 * k, vx = (t: number) => -rot * Math.sin(ph(t)), vy = (t: number) => -rot * Math.cos(ph(t));
      props.push({id: 'vArrow', type: 'arrow', x1: X(0), y1: Y(0), x2: X(0) + L1 * vx(0), y2: Y(0) + L1 * vy(0), head: 15 * k, style: {stroke: 'cool', width: 5 * k}, layer: 4, keys: {x1: keysOf(dur, X), y1: keysOf(dur, Y), x2: keysOf(dur, t => X(t) + L1 * vx(t)), y2: keysOf(dur, t => Y(t) + L1 * vy(t))}} as Prop);
      props.push({id: 'fArrow', type: 'arrow', x1: X(0), y1: Y(0), x2: X(0) - L2 * Math.cos(ph(0)), y2: Y(0) + L2 * Math.sin(ph(0)), head: 15 * k, style: {stroke: 'bad', width: 5 * k}, layer: 4, keys: {x1: keysOf(dur, X), y1: keysOf(dur, Y), x2: keysOf(dur, t => X(t) - L2 * Math.cos(ph(t))), y2: keysOf(dur, t => Y(t) + L2 * Math.sin(ph(t)))}} as Prop);
      props.push({id: 'particle', type: 'circle', x: X(0), y: Y(0), r: 13 * k, style: {fill: pos ? 'bad' : 'cool', stroke: 'ink', width: 2 * k}, layer: 5, keys: {x: keysOf(dur, X), y: keysOf(dur, Y)}} as Prop);
      line(c, [c[0] + Rr, c[1]], 'ink', 2); label(c[0] + Rr / 2, c[1] - 12 * k, 'r', 'ink', 28);
      anchors.centre = c; anchors.edge = [c[0] + Rr, c[1]];
      story = 'The force always points to the centre, so the charge goes round a circle at constant speed'; second = 'r = mv/qB. Blue arrow: v. Red arrow: F';
    } else {
      const pitch = vz * T, turns = 3, sign = pitch >= 0 ? 1 : -1, slant = .32, Sc = s.rspan ? bh * .3 / s.rspan : Math.min(bw * .78 / (turns * Math.abs(pitch) + 2 * r * slant + 1e-30), bh * .3 / r), Rr = r * Sc, adv = pitch * Sc, x0 = sign > 0 ? bx + bw * .1 : bx + bw * .9, rot = pos ? 1 : -1;
      for (const yy of [cy - bh * .42, cy + bh * .42]) arrow([bx + bw * .08, yy], [bx + bw * .92, yy], 'faint', 3);
      label(bx + bw * .94, cy - bh * .42 + 8 * k, 'B', 'accent', 30);
      const at = (u: number): P2 => { const a = 2 * Math.PI * u * rot; return [x0 + adv * u + Rr * slant * Math.sin(a), cy - Rr * Math.cos(a)]; };
      poly(Array.from({length: turns * 48 + 1}, (_, i) => at(i / 48)), 'accent', 3, {draw: 0, keys: {draw: [[0, 0], [dur, 1, 'linear']]}});
      const u = (t: number) => turns * t / dur;
      props.push({id: 'particle', type: 'circle', x: at(0)[0], y: at(0)[1], r: 13 * k, style: {fill: pos ? 'bad' : 'cool', stroke: 'ink', width: 2 * k}, layer: 5, keys: {x: keysOf(dur, t => at(u(t))[0]), y: keysOf(dur, t => at(u(t))[1])}} as Prop);
      const pa = at(1), pb = at(2), yb = cy + Rr + 44 * k; line([pa[0], yb], [pb[0], yb], 'ink', 3); label((pa[0] + pb[0]) / 2, yb + 34 * k, 'pitch', 'ink', 26);
      anchors.start = at(0); anchors.pitch = [(pa[0] + pb[0]) / 2, yb];
      story = 'Along B nothing changes the velocity; across B the charge circles. Together: a helix'; second = 'Pitch p = v∥T, the distance gained in one turn';
      facts.push(`pitch = v∥T = ${fmt(Math.abs(pitch), 'm')}`);
    }
    facts.unshift(`r = mv⊥/qB = ${fmt(r, 'm')}`, `T = 2πm/qB = ${fmt(T, 's')}, and it does not depend on v`, `ν = ${fmt(1 / T, 'Hz')}`, `v = ${fmt(v, 'm/s')}, B = ${fmt(B, 'T')}`);
  } else if (s.show === 'element') {
    const I = s.I ?? 10, dl = s.dl ?? .01, r = s.r ?? .5, th = s.angle ?? 60, dB = MU / (4 * Math.PI) * I * dl * Math.sin(th * RAD) / (r * r), wx = bx + bw * .25, E: P2 = [wx, cy + bh * .12], Lr = bh * .55, P: P2 = [E[0] + Lr * Math.sin(th * RAD), E[1] - Lr * Math.cos(th * RAD)], way: 'in' = 'in';
    line([wx, by + bh * .02], [wx, by + bh * .98], 'muted', 4); line([E[0], E[1] + 42 * k], [E[0], E[1] - 42 * k], 'ink', 9, {layer: 3}); arrow([wx - 44 * k, E[1] + 42 * k], [wx - 44 * k, E[1] - 42 * k], 'cool', 5); label(wx - 84 * k, E[1] + 8 * k, 'I dl', 'cool', 28);
    arrow(E, P, 'muted', 3); label((E[0] + P[0]) / 2 + 24 * k, (E[1] + P[1]) / 2 + 24 * k, 'r', 'ink', 30);
    if (th > 5 && th < 175) { const arc = Array.from({length: 21}, (_, i) => { const a = th * RAD * i / 20; return [E[0] + 80 * k * Math.sin(a), E[1] - 80 * k * Math.cos(a)] as P2; }); poly(arc, 'ink', 2); const a = th * RAD / 2; label(E[0] + 108 * k * Math.sin(a), E[1] - 108 * k * Math.cos(a) + 8 * k, 'θ', 'ink', 26); }
    mark(P[0], P[1], way, 18, 'accent', {show: [1.6, 1e9]}); label(P[0] + 62 * k, P[1] + 8 * k, 'dB', 'accent', 30, {show: [1.6, 1e9]}); label(P[0], P[1] - 32 * k, 'P', 'ink', 28);
    anchors.element = E; anchors.P = P;
    facts.push(`dB = (μ₀/4π) I dl sin θ/r² = ${fmt(dB, 'T')}`, `I = ${fmt(I, 'A')}, dl = ${fmt(dl, 'm')}, r = ${fmt(r, 'm')}, θ = ${th}°`);
    story = 'Each small piece of current adds a little field at P, at right angles to both dl and r'; second = 'dB falls as 1/r² and goes as sin θ: nothing straight ahead along the wire';
  } else if (s.show === 'loop') {
    const I = s.I ?? 1, R = s.R ?? .1, N = s.N ?? 1, x = s.x ?? 0, B0 = N * loopField(I, R, 0), Bx = N * loopField(I, R, x), lx = bx + bw * .2, ly = cy - bh * .18, RR = bh * .2, u = bw * .62 / (3 * R), P: P2 = [lx + x * u, ly];
    ring([lx, ly], RR * .3, RR, 'ink', 6); arrow([lx - RR * .3 + 2 * k, ly - 18 * k], [lx - RR * .3 + 2 * k, ly + 18 * k], 'cool', 5); label(lx - RR * .3 - 26 * k, ly + 8 * k, 'I', 'cool', 28);
    line([lx - 30 * k, ly], [bx + bw * .9, ly], 'muted', 2, {}, true); label(bx + bw * .92, ly + 8 * k, 'x', 'muted', 26);
    const Lb = bw * .2 * Bx / B0 + 6 * k; arrow(P, [P[0] + Lb, P[1]], 'accent', 7, {show: [1.2, 1e9]}); label(P[0] + Lb / 2, P[1] - 22 * k, 'B', 'accent', 30, {show: [1.2, 1e9]});
    props.push({id: 'P', type: 'circle', x: P[0], y: P[1], r: 8 * k, style: {fill: 'ink'}, layer: 4} as Prop); label(P[0], P[1] + 34 * k, 'P', 'ink', 26);
    const gy = by + bh * .96, gh = bh * .3, gx = lx; axes(gx, gy, bw * .62, gh, 'x', 'B');
    poly(Array.from({length: 61}, (_, i) => { const xi = 3 * R * i / 60; return [gx + xi * u, gy - gh * .92 * loopField(1, R, xi) / loopField(1, R, 0)] as P2; }), 'accent', 3, {draw: 0, keys: {draw: [[.6, 0], [2.4, 1, 'inOut']]}});
    const dot: P2 = [gx + x * u, gy - gh * .92 * Bx / B0]; props.push({id: 'dot', type: 'circle', x: dot[0], y: dot[1], r: 8 * k, style: {fill: 'good'}, layer: 4, show: [2.4, 1e9]} as Prop);
    anchors.centre = [lx, ly]; anchors.P = P; anchors.curve = dot;
    facts.push(`B at x = ${fmt(Bx, 'T')}`, `B at the centre = μ₀${N > 1 ? 'N' : ''}I/2R = ${fmt(B0, 'T')}`, `I = ${fmt(I, 'A')}, R = ${fmt(R, 'm')}, x = ${fmt(x, 'm')}${N > 1 ? `, N = ${N}` : ''}`);
    story = x === 0 ? 'At the centre every piece of the loop adds along the axis: B = μ₀I/2R' : 'Along the axis the sideways parts cancel and the rest add up, weaker further out';
    second = 'B = μ₀IR²/2(x² + R²)^(3/2), along the axis by the right-hand rule';
  } else if (s.show === 'ampere') {
    const I = s.I ?? 1, a = s.a, r = s.r ?? .05, top = a ? 4 * a : 4 * r, B = wireField(I, r, a ?? 0), c: P2 = [bx + bw * .25, cy], Rm = Math.min(bw * .22, bh * .42), ur = Rm / top, Rr = r * ur;
    if (a) { props.push({id: 'wire', type: 'circle', x: c[0], y: c[1], r: a * ur, style: {fill: 'faint', stroke: 'ink', width: 2 * k}, layer: 1} as Prop); }
    mark(c[0], c[1], 'out', 12, 'cool'); ring(c, Rr, Rr, 'accent', 3, true);
    for (let i = 0; i < 8; i++) { const f = i * Math.PI / 4, p: P2 = [c[0] + Rr * Math.cos(f), c[1] - Rr * Math.sin(f)], Lt = Math.min(46 * k, Rr * .5); arrow(p, [p[0] - Lt * Math.sin(f), p[1] - Lt * Math.cos(f)], 'accent', 4, {show: [.8 + i * .18, 1e9]}); }
    line(c, [c[0] + Rr, c[1]], 'ink', 2); label(c[0] + Rr / 2, c[1] - 12 * k, 'r', 'ink', 26);
    const gx = bx + bw * .56, gy = cy + bh * .3, gw = bw * .4, gh = bh * .6, bmax = a ? MU * I / (2 * Math.PI * a) : MU * I / (2 * Math.PI * top * .08), at = (ri: number): P2 => [gx + gw * ri / top, gy - gh * .95 * Math.min(1, wireField(I, ri, a ?? 0) / bmax)]; axes(gx, gy, gw, gh, 'r', 'B');
    poly(Array.from({length: 81}, (_, i) => at(a ? top * i / 80 : top * (.08 + .92 * i / 80))), 'accent', 3, {draw: 0, keys: {draw: [[.6, 0], [2.6, 1, 'inOut']]}});
    const dot = at(r); props.push({id: 'dot', type: 'circle', x: dot[0], y: dot[1], r: 8 * k, style: {fill: 'good'}, layer: 4, show: [2.6, 1e9]} as Prop);
    anchors.wire = c; anchors.loop = [c[0] + Rr, c[1]]; anchors.curve = dot;
    facts.push(`B = ${r < (a ?? 0) ? 'μ₀Ir/2πa²' : 'μ₀I/2πr'} = ${fmt(B, 'T')}`, `I = ${fmt(I, 'A')}, r = ${fmt(r, 'm')}${a ? `, a = ${fmt(a, 'm')}` : ''}`);
    story = 'Walk the dashed circle: B is along it and the same size all round, so B × 2πr = μ₀I';
    second = a ? 'Inside the wire only the current within r counts: B grows with r, then falls as 1/r' : 'Outside a long wire B falls as 1/r. The law is true for any loop; only symmetry makes it easy';
  } else if (s.show === 'solenoid') {
    const I = s.I ?? 5, n1 = s.n ?? (s.N && s.L ? s.N / s.L : 1000), B = MU * n1 * I, x0 = bx + bw * .08, x1 = bx + bw * .92, yt = cy - bh * .22, yb = cy + bh * .22, c = 13;
    for (let i = 0; i < c; i++) { const x = x0 + (x1 - x0) * (i + .5) / c; mark(x, yt, 'out', 14, 'ink'); mark(x, yb, 'in', 14, 'ink'); }
    for (let j = 0; j < 3; j++) { const y = cy + (j - 1) * bh * .11; arrow([x0 + bw * .1, y], [x1 - bw * .1, y], 'accent', 4, {show: [.8 + j * .2, 1e9]}); }
    label(x1 - bw * .05, cy + 8 * k, 'B', 'accent', 32);
    const ax = cx - bw * .14, bxx = cx + bw * .14, ty = cy - bh * .36, by2 = cy + bh * .06;
    poly([[ax, by2], [bxx, by2], [bxx, ty], [ax, ty], [ax, by2]], 'good', 3, {show: [2.2, 1e9]}, true); label(cx + bw * .07, by2 - 12 * k, 'h', 'good', 28, {show: [2.2, 1e9]});
    anchors.loop = [cx, by2]; anchors.inside = [cx, cy]; anchors.top = [cx, yt]; anchors.bottom = [cx, yb];
    facts.push(`B = μ₀nI = ${fmt(B, 'T')}`, `n = ${fmt(n1, 'turns/m')}, I = ${fmt(I, 'A')}`);
    story = 'Inside, the field is uniform and along the axis; outside a long solenoid it is close to zero'; second = 'Round the green rectangle only the side inside counts: Bh = μ₀(nh)I, so B = μ₀nI';
  } else if (s.show === 'parallel') {
    const Ia = s.I ?? 1, Ib = s.I2 ?? Ia, d = s.d ?? 1, unlike = !!s.reverse, f = MU * Ia * Ib / (2 * Math.PI * d), xa = cx - bw * .2, xb = cx + bw * .2, y0 = by + bh * .06, y1 = by + bh * .94, tips = unlike ? 1 : -1, L = bw * .12;
    line([xa, y0], [xa, y1], 'ink', 6); line([xb, y0], [xb, y1], 'ink', 6);
    arrow([xa - 30 * k, cy + 70 * k], [xa - 30 * k, cy - 70 * k], 'cool', 5); label(xa - 58 * k, cy + 8 * k, 'I₁', 'cool', 28);
    if (unlike) arrow([xb + 30 * k, cy - 70 * k], [xb + 30 * k, cy + 70 * k], 'cool', 5); else arrow([xb + 30 * k, cy + 70 * k], [xb + 30 * k, cy - 70 * k], 'cool', 5); label(xb + 58 * k, cy + 8 * k, 'I₂', 'cool', 28);
    for (const yy of [by + bh * .2, by + bh * .8]) mark(xb - 44 * k, yy, 'in', 12, 'accent', {show: [.8, 1e9]});
    label(xb - 44 * k, by + bh * .2 - 26 * k, 'B₁', 'accent', 24, {show: [.8, 1e9]});
    const tipb: P2 = [xb + tips * L, cy + bh * .22], tipa: P2 = [xa - tips * L, cy + bh * .22];
    arrow([xb, cy + bh * .22], tipb, 'bad', 7, {show: [1.6, 1e9]}); arrow([xa, cy + bh * .22], tipa, 'bad', 7, {show: [1.6, 1e9]});
    label(tipb[0], tipb[1] - 18 * k, 'F', 'bad', 28, {show: [1.6, 1e9]}); label(tipa[0], tipa[1] - 18 * k, 'F', 'bad', 28, {show: [1.6, 1e9]});
    line([xa, by + bh * .94], [xb, by + bh * .94], 'muted', 2); label(cx, by + bh * .94 - 12 * k, 'd', 'muted', 26);
    anchors.a = [xa, cy]; anchors.b = [xb, cy];
    facts.push(`force per metre = μ₀I₁I₂/2πd = ${fmt(f, 'N/m')}`, `I₁ = ${fmt(Ia, 'A')}, I₂ = ${fmt(Ib, 'A')}, d = ${fmt(d, 'm')}`);
    story = unlike ? 'Unlike currents push apart, equally on each wire' : 'Like currents pull together, equally on each wire';
    second = 'One wire makes the field, the other feels it. 2 × 10⁻⁷ N per metre at 1 A and 1 m defines the ampere';
  } else if (s.show === 'torque') {
    const N = s.N ?? 1, I = s.I ?? 1, A = s.A ?? 1e-2, B = s.B ?? 1, th = s.angle ?? 60, sw = !!s.swing, m = N * I * A, tau = m * B * Math.sin(th * RAD), c: P2 = [cx, cy], half = bh * .28; dur = sw ? 9 : 8;
    for (let j = 0; j < 5; j++) { const y = by + bh * (.1 + j * .2); arrow([bx + bw * .04, y], [bx + bw * .96, y], 'faint', 3); }
    label(bx + bw * .97, by + bh * .1 + 8 * k, 'B', 'accent', 30);
    const ang = (t: number) => sw ? th * RAD * Math.exp(-Math.max(0, t - 1.5) * .9) * Math.cos(Math.max(0, t - 1.5) * 1.6) : th * RAD;
    const ex = (sgn: number) => (t: number) => c[0] - sgn * half * Math.sin(ang(t)), ey = (sgn: number) => (t: number) => c[1] - sgn * half * Math.cos(ang(t));
    props.push({id: 'coil', type: 'line', x1: ex(1)(0), y1: ey(1)(0), x2: ex(-1)(0), y2: ey(-1)(0), style: {stroke: 'ink', width: 6 * k}, layer: 2, keys: {x1: keysOf(dur, ex(1)), y1: keysOf(dur, ey(1)), x2: keysOf(dur, ex(-1)), y2: keysOf(dur, ey(-1))}} as Prop);
    for (const [sgn, way] of [[1, 'out'], [-1, 'in']] as const) {
      const X = ex(sgn), Y = ey(sgn), Lf = 110 * k;
      props.push({id: `end${way}`, type: 'circle', x: X(0), y: Y(0), r: 17 * k, style: {fill: 'paper', stroke: 'cool', width: 3 * k}, layer: 3, keys: {x: keysOf(dur, X), y: keysOf(dur, Y)}} as Prop);
      props.push({id: `sym${way}`, type: 'text', x: X(0), y: Y(0) + 10 * k, text: way === 'out' ? '•' : '×', size: 30 * k, weight: 700, align: 'middle', style: {fill: 'cool'}, layer: 4, keys: {x: keysOf(dur, X), y: keysOf(dur, t => Y(t) + 10 * k)}} as Prop);
      props.push({id: `F${way}`, type: 'arrow', x1: X(0), y1: Y(0), x2: X(0), y2: Y(0) - sgn * Lf, head: 15 * k, style: {stroke: 'bad', width: 6 * k}, layer: 3, keys: {x1: keysOf(dur, X), y1: keysOf(dur, Y), x2: keysOf(dur, X), y2: keysOf(dur, t => Y(t) - sgn * Lf)}} as Prop);
    }
    const Lm = bh * .3, mx = (t: number) => c[0] + Lm * Math.cos(ang(t)), my = (t: number) => c[1] - Lm * Math.sin(ang(t));
    props.push({id: 'm', type: 'arrow', x1: c[0], y1: c[1], x2: mx(0), y2: my(0), head: 16 * k, style: {stroke: 'good', width: 6 * k}, layer: 3, keys: {x2: keysOf(dur, mx), y2: keysOf(dur, my)}} as Prop);
    props.push({id: 'mName', type: 'text', x: mx(0) + 24 * k, y: my(0), text: 'm', size: 30 * k, weight: 700, align: 'middle', style: {fill: 'good'}, layer: 3, keys: {x: keysOf(dur, t => mx(t) + 24 * k), y: keysOf(dur, my)}} as Prop);
    anchors.coil = c; anchors.m = [mx(0), my(0)];
    facts.push(`τ = NIAB sin θ = ${fmt(tau, 'N m')}`, `m = NIA = ${fmt(m, 'A m²')}`, `N = ${N}, I = ${fmt(I, 'A')}, A = ${fmt(A, 'm²')}, B = ${fmt(B, 'T')}, θ = ${th}°`);
    story = th === 0 ? 'With m along B the forces pull in one line: no couple, the coil rests' : 'Equal and opposite forces make a couple, and it turns m toward B';
    second = 'τ = m × B. Largest with the coil\'s plane along B, zero with m along B';
  } else {
    const kind = s.kind ?? 'coil', G = s.G ?? 100, Ig = s.Ig ?? 1e-3;
    if (kind === 'coil') {
      const N = s.N ?? 100, A = s.A ?? 2e-4, B = s.B ?? .5, kk = s.k ?? 1e-6, I = s.I ?? 5e-5, phi = N * A * B * I / kk, c: P2 = [bx + bw * .28, cy], Ro = Math.min(bw * .24, bh * .42), Ri = Ro * .42, dx = Ro * 1.02;
      const pole = (sgn: number, name: string) => { poly(Array.from({length: 25}, (_, i) => { const a = (-55 + 110 * i / 24) * RAD; return [c[0] + sgn * Ro * Math.cos(a), c[1] + Ro * Math.sin(a)] as P2; }), 'bad', 7); label(c[0] + sgn * (dx + 28 * k), c[1] + 10 * k, name, 'bad', 34); };
      pole(-1, 'N'); pole(1, 'S');
      ring(c, Ri, Ri, 'muted', 3); label(c[0], c[1] + 8 * k, 'core', 'muted', 22);
      for (const a of [-40, -20, 0, 20, 40]) { const f = a * RAD, co = Math.cos(f), si = Math.sin(f); arrow([c[0] - Ro * .97 * co, c[1] + Ro * .97 * si], [c[0] - Ri * 1.08 * co, c[1] + Ri * 1.08 * si], 'accent', 3); arrow([c[0] + Ri * 1.08 * co, c[1] - Ri * 1.08 * si], [c[0] + Ro * .97 * co, c[1] - Ro * .97 * si], 'accent', 3); }
      const rot = (t: number) => Math.min(1, Math.max(0, (t - 1) / 2.5)) * phi, Rc = Ri * 1.35, ex = (sgn: number) => (t: number) => c[0] + sgn * Rc * Math.cos(rot(t)), ey = (sgn: number) => (t: number) => c[1] + sgn * Rc * Math.sin(rot(t));
      for (const [sgn, way] of [[-1, 'out'], [1, 'in']] as const) {
        props.push({id: `coil${way}`, type: 'circle', x: ex(sgn)(0), y: ey(sgn)(0), r: 15 * k, style: {fill: 'paper', stroke: 'cool', width: 3 * k}, layer: 3, keys: {x: keysOf(dur, ex(sgn)), y: keysOf(dur, ey(sgn))}} as Prop);
        props.push({id: `coilS${way}`, type: 'text', x: ex(sgn)(0), y: ey(sgn)(0) + 9 * k, text: way === 'out' ? '•' : '×', size: 26 * k, weight: 700, align: 'middle', style: {fill: 'cool'}, layer: 4, keys: {x: keysOf(dur, ex(sgn)), y: keysOf(dur, t => ey(sgn)(t) + 9 * k)}} as Prop);
      }
      const dc: P2 = [bx + bw * .76, cy + bh * .18], Rd = Math.min(bw * .2, bh * .34), lim = 70 * RAD, needle = (t: number) => Math.max(-lim, Math.min(lim, rot(t)));
      poly(Array.from({length: 29}, (_, i) => { const a = (-70 + 140 * i / 28) * RAD; return [dc[0] + Rd * Math.sin(a), dc[1] - Rd * Math.cos(a)] as P2; }), 'ink', 3);
      for (let i = -3; i <= 3; i++) { const a = i * 70 / 3 * RAD; line([dc[0] + Rd * .93 * Math.sin(a), dc[1] - Rd * .93 * Math.cos(a)], [dc[0] + Rd * Math.sin(a), dc[1] - Rd * Math.cos(a)], 'ink', 2); }
      props.push({id: 'needle', type: 'line', x1: dc[0], y1: dc[1], x2: dc[0], y2: dc[1] - Rd * .88, style: {stroke: 'accent', width: 4 * k}, layer: 3, keys: {x2: keysOf(dur, t => dc[0] + Rd * .88 * Math.sin(needle(t))), y2: keysOf(dur, t => dc[1] - Rd * .88 * Math.cos(needle(t)))}} as Prop);
      anchors.core = c; anchors.needle = dc;
      facts.push(`φ = (NAB/k) I = ${fmt(phi, 'rad')}`, `current sensitivity φ/I = NAB/k = ${fmt(N * A * B / kk, 'rad/A')}`, `N = ${N}, A = ${fmt(A, 'm²')}, B = ${fmt(B, 'T')}, I = ${fmt(I, 'A')}`);
      story = 'In a radial field the coil\'s plane always lies along B, so the torque NIAB does not change as it turns'; second = 'The spring pushes back with kφ, so φ = (NAB/k) I: a scale of equal steps';
    } else {
      const am = kind === 'ammeter', range = am ? s.I ?? 1 : s.V ?? 10, Rx = am ? shuntFor(Ig, G, range) : seriesFor(Ig, G, range), y = cy, x0 = bx + bw * .06, x1 = bx + bw * .94;
      const zig = (a: number, b: number, yy: number, name: string, c = 'ink') => { const pts: P2[] = [[a, yy]], t = 8; for (let i = 0; i <= t; i++) pts.push([a + (b - a) * (.15 + .7 * i / t), yy + (i === 0 || i === t ? 0 : i % 2 ? -18 * k : 18 * k)]); pts.push([b, yy]); poly(pts, c, 4); label((a + b) / 2, yy - 34 * k, name, c, 26); };
      const gal = (x: number, yy: number) => { props.push({id: `g${n++}`, type: 'circle', x, y: yy, r: 42 * k, style: {fill: 'paper', stroke: 'ink', width: 3 * k}, layer: 3} as Prop); label(x, yy + 10 * k, 'G', 'ink', 30); };
      if (am) {
        const a = cx - bw * .24, b = cx + bw * .24, up = y - bh * .16, dn = y + bh * .16;
        line([x0, y], [a, y], 'ink', 3); line([b, y], [x1, y], 'ink', 3); line([a, up], [a, dn], 'ink', 3); line([b, up], [b, dn], 'ink', 3);
        line([a, up], [cx - 42 * k, up], 'ink', 3); line([cx + 42 * k, up], [b, up], 'ink', 3); gal(cx, up); zig(a, b, dn, num ? `rs = ${fmt(Rx, 'Ω')}` : 'rs', 'accent');
        arrow([x0 + 30 * k, y - 28 * k], [x0 + 130 * k, y - 28 * k], 'cool', 5); label(x0 + 80 * k, y - 46 * k, 'I', 'cool', 28); label(cx - 80 * k, up - 52 * k, 'Ig', 'cool', 26);
        anchors.shunt = [cx, dn]; anchors.G = [cx, up];
        facts.push(`shunt rs = IgG/(I − Ig) = ${fmt(Rx, 'Ω')}`, `combined R = ${fmt(G * Rx / (G + Rx), 'Ω')}`, `G = ${fmt(G, 'Ω')}, Ig = ${fmt(Ig, 'A')}, range ${fmt(range, 'A')}`);
        story = 'A small shunt in parallel carries nearly all the current, so the meter barely disturbs the circuit'; second = 'An ideal ammeter has zero resistance';
      } else {
        const g = cx - bw * .2, z0 = cx - bw * .02, z1 = cx + bw * .34;
        line([x0, y], [g - 42 * k, y], 'ink', 3); gal(g, y); line([g + 42 * k, y], [z0, y], 'ink', 3); zig(z0, z1, y, num ? `R = ${fmt(Rx, 'Ω')}` : 'R', 'accent'); line([z1, y], [x1, y], 'ink', 3);
        anchors.series = [(z0 + z1) / 2, y]; anchors.G = [g, y];
        facts.push(`series R = V/Ig − G = ${fmt(Rx, 'Ω')}`, `whole meter ${fmt(Rx + G, 'Ω')}`, `G = ${fmt(G, 'Ω')}, Ig = ${fmt(Ig, 'A')}, range ${fmt(range, 'V')}`);
        story = 'A large series resistance lets the meter draw almost no current from what it measures'; second = 'An ideal voltmeter has infinite resistance';
      }
    }
  }
  return finish('moving_charges', s as never, dur, story, second, facts, anchors, s.illustrative);
}

/** Compared paths share one radius scale and one clock, so a stronger field draws a smaller circle in the same time. */
export function shareMovingScale(specs: unknown[]) {
  const paths = (specs as MovingSpec[]).filter(s => s?.verb === 'moving_charges' && s.show === 'path');
  if (paths.length < 2) return;
  const rs = paths.map(s => radiusOf(s.m ?? ME, (s.v ?? 3e7) * Math.sin((s.angle ?? 90) * RAD), s.q ?? QE, s.B ?? 6e-4)), Ts = paths.map(s => 2 * Math.PI * (s.m ?? ME) / ((s.q ?? QE) * (s.B ?? 6e-4)));
  paths.forEach(s => { s.rspan = Math.max(...rs); s.Tspan = Math.max(...Ts); });
}
