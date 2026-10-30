// rotation: a rigid body turning about a fixed axis, computed (NCERT Class 11 System of Particles and Rotational
// Motion, §6.6, 6.10–6.13; 2026-10-30). Seen end-on: a disc, ring, wheel, sphere or rod (about its centre or an end).
// Its moment of inertia comes from the book's table (or is given); it starts at ω0 and turns with a constant angular
// acceleration α, given, or from a torque τ = r F sin φ (a cord pulled off the rim, or a push at φ to the radius):
// α = τ / I. Code integrates θ and ω, so the readouts and the drawing agree: ω = ω0 + αt, θ = ω0t + ½αt². Particles
// along one radius share ω while v = ωr grows outwards. With a torque: the work τθ and the power τω. Conservation of
// angular momentum: two masses slide along the rod from r1 to r2 while nothing turns it from outside, so L = Iω stays
// fixed and ω rises as I falls (a skater pulling in her arms); the kinetic energy changes, done by the inner pull.
import type {Key} from '../keys.ts';
import type {Plane} from '../plane.ts';
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {round} from '../vec.ts';
import {n2, panel, scene, text} from './calculus.ts';
import {frame} from './vectors.ts';

export const ROT_BODIES = ['disc', 'ring', 'wheel', 'sphere', 'rod'] as const;
export type RotationSpec = {verb: 'rotation'; body?: (typeof ROT_BODIES)[number]; axis?: 'centre' | 'end'; r?: number; length?: number; mass?: number; I?: number;
  omega0?: number; alpha?: number; torque?: {F: number; phi?: number; at?: number}; t?: number;
  slide?: {m: number; r1: number; r2: number}; show?: ('particles' | 'momentum' | 'energy')[];
  title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};

const DEG = Math.PI / 180;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const f = (v: number) => n2(round(v, 9), Math.abs(v) >= 100 || Number.isInteger(round(v, 9)) ? 0 : 2);

/** The body's size (radius, or the rod's reach from the axis) and its moment of inertia about the axis, with the formula. */
function inertia(s: RotationSpec): {R: number; I: number; formula: string} {
  const body = s.body ?? 'disc', M = s.mass ?? 1, end = s.axis === 'end';
  if (body === 'rod') {
    const L = s.length ?? 1;
    return {R: end ? L : L / 2, I: s.I ?? (end ? M * L * L / 3 : M * L * L / 12), formula: end ? 'I = ML²/3 (rod about an end)' : 'I = ML²/12 (rod about its centre)'};
  }
  const R = s.r ?? 0.5;
  const [k, name] = {disc: [0.5, 'I = MR²/2 (disc)'], ring: [1, 'I = MR² (ring)'], wheel: [1, 'I ≈ MR² (wheel: mass at the rim)'], sphere: [0.4, 'I = 2MR²/5 (solid sphere)']}[body] as [number, string];
  return {R, I: s.I ?? k * M * R * R, formula: s.I !== undefined ? `I = ${f(s.I)} kg m² (given)` : name};
}

export function rotationErrors(s: RotationSpec): string[] {
  const e: string[] = [];
  if (s.body !== undefined && !ROT_BODIES.includes(s.body)) e.push(`rotation: body is one of ${ROT_BODIES.join(', ')}`);
  if (s.axis !== undefined && !['centre', 'end'].includes(s.axis)) e.push('rotation: axis is centre (default) or end (a rod only)');
  if (s.axis === 'end' && s.body !== 'rod') e.push('rotation: axis end is for a rod; a disc, ring, wheel or sphere turns about its centre');
  for (const k of ['r', 'length', 'mass', 'I'] as const) if (s[k] !== undefined && !(isNum(s[k]) && s[k]! > 0)) e.push(`rotation: ${k} is above 0`);
  if (s.mass === undefined && s.I === undefined && !s.illustrative) e.push('rotation: give mass (kg) or I (kg m²); or, when the narration states no numbers, set illustrative: true');
  if (s.omega0 !== undefined && !(isNum(s.omega0) && s.omega0 >= 0)) e.push('rotation: omega0 is the starting angular speed in rad/s, 0 or more (anticlockwise)');
  if (s.alpha !== undefined && !isNum(s.alpha)) e.push('rotation: alpha is in rad/s² (negative slows it)');
  if (s.alpha !== undefined && s.torque) e.push('rotation: give alpha or a torque (α = τ / I is computed), not both');
  if (s.torque) {
    const q = s.torque, R = inertia(s).R;
    if (!(isNum(q.F) && q.F > 0)) e.push('rotation: torque.F is the force in N, above 0');
    if (q.phi !== undefined && !(isNum(q.phi) && q.phi > 0 && q.phi < 180)) e.push('rotation: torque.phi is the angle between the radius and the force, 0 to 180° (90, square to it, default)');
    if (q.at !== undefined && !(isNum(q.at) && q.at > 0 && q.at <= R + 1e-9)) e.push(`rotation: torque.at is the distance from the axis where F acts, up to ${f(R)} m (default the rim)`);
  }
  if (s.slide) {
    const q = s.slide, R = inertia(s).R;
    if (s.body !== 'rod' || s.axis === 'end') e.push('rotation: slide moves two masses along a rod turning about its centre: set body rod');
    if (!(isNum(q.m) && q.m > 0) || !(isNum(q.r1) && q.r1 > 0 && q.r1 <= R) || !(isNum(q.r2) && q.r2 > 0 && q.r2 <= R) || Math.abs(q.r1 - q.r2) < 1e-9)
      e.push(`rotation: slide is {m (kg, each of two masses), r1, r2 (m from the axis, different, up to ${f(R)} m)}`);
    if (s.torque || s.alpha) e.push('rotation: with slide nothing turns it from outside (that is why L is conserved): leave out torque and alpha');
    if (!(isNum(s.omega0) && s.omega0 > 0)) e.push('rotation: with slide give omega0, its starting angular speed, above 0');
  } else if (!s.omega0 && !s.alpha && !s.torque) e.push('rotation: give omega0, alpha or a torque: something must turn it');
  if (s.t !== undefined && !(isNum(s.t) && s.t > 0 && s.t <= 600)) e.push('rotation: t is how long it turns, in s, up to 600');
  for (const x of s.show ?? []) if (!['particles', 'momentum', 'energy'].includes(x)) e.push("rotation: show items: 'particles', 'momentum', 'energy'");
  if (e.length) return e;
  const {I} = inertia(s), a = s.alpha ?? (s.torque ? torqueOf(s) / I : 0), w0 = s.omega0 ?? 0, T = s.t ?? 4;
  if (a < 0 && w0 + a * T < -1e-9) e.push(`rotation: it stops after ${f(w0 / -a)} s (ω = 0), before t = ${f(T)} s; give t up to ${f(w0 / -a)}`);
  return e;
}

const torqueOf = (s: RotationSpec) => { const q = s.torque!; return q.F * (q.at ?? inertia(s).R) * Math.sin((q.phi ?? 90) * DEG); };

export function rotation(s: RotationSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, body = s.body ?? 'disc';
  const fr = frame(W, H, k, s.title), box = fr.box, props: Prop[] = [...fr.titles], facts: string[] = [];
  const plane: Plane = {id: 'p', x: [0, 1], y: [0, 1], box};
  const px = fr.px, ptext = panel(W, k);
  let row = fr.row;
  const bw = box[2] - box[0], bh = box[3] - box[1], cx = (box[0] + box[2]) / 2, cy = box[1] + 0.52 * bh;
  const {R, I: I0, formula} = inertia(s), M = s.mass ?? 1, w0 = s.omega0 ?? 0, T = s.t ?? 4, tau = s.torque ? torqueOf(s) : 0;
  const alpha = s.alpha ?? (s.torque ? tau / I0 : 0), sl = s.slide;
  // the world's motion, sampled; screen time 3 to 8 s whatever the world takes (a slide runs at its own pace)
  const n = 160, lead = 1.2;
  const Ts = sl ? 7 : Math.min(8, Math.max(3, T)), Tw = sl ? Ts : T;
  const at = (i: number) => lead + Ts * i / n, tw = (i: number) => Tw * i / n;
  const rOf = (t: number) => (sl ? (t < 2 ? sl.r1 : t > 3.5 ? sl.r2 : sl.r1 + (sl.r2 - sl.r1) * (0.5 - 0.5 * Math.cos(Math.PI * (t - 2) / 1.5))) : 0);
  const Iof = (t: number) => I0 + (sl ? 2 * sl.m * rOf(t) ** 2 : 0), L0 = Iof(0) * w0;
  const w = (t: number) => (sl ? L0 / Iof(t) : w0 + alpha * t);
  const th: number[] = [0];
  for (let i = 1; i <= n; i++) th.push(th[i - 1] + (w(tw(i - 1)) + w(tw(i))) / 2 * (tw(i) - tw(i - 1)));
  // a slow world spin still shows: the drawing turns at the true rate, the stripe makes the turning visible
  const key = (fn: (i: number) => number): Key[] => [[0, fn(0)], ...Array.from({length: n + 1}, (_, i) => [at(i), fn(i), 'linear'] as Key)];
  const Rpx = 0.36 * Math.min(bw, bh), ppm = Rpx / R;
  const ox = cx;     // a rod about its end sweeps the whole circle too
  const pt = (r: number, a: number): [number, number] => [ox + r * ppm * Math.cos(a), cy - r * ppm * Math.sin(a)];
  const spoke = (id: string, r0: number, r1: number, off: number, style: Record<string, unknown>, layer = 2) =>
    props.push({id, type: 'line', x1: 0, y1: 0, x2: 0, y2: 0, style, layer,
      keys: {x1: key(i => pt(r0, th[i] + off)[0]), y1: key(i => pt(r0, th[i] + off)[1]), x2: key(i => pt(r1, th[i] + off)[0]), y2: key(i => pt(r1, th[i] + off)[1])}} as Prop);
  // the body
  if (body === 'rod') {
    const back = s.axis === 'end' ? 0 : R;
    props.push({id: 'rod-shadow', type: 'circle', x: ox, y: cy, r: R * ppm, style: {stroke: 'faint', width: 2 * k, dash: [6 * k, 8 * k]}, layer: 0} as Prop);
    spoke('rod', 0, R, 0, {stroke: 'ink', width: 18 * k}, 1);
    if (back) spoke('rod2', 0, back, Math.PI, {stroke: 'ink', width: 18 * k}, 1);
  } else {
    props.push({id: 'body', type: 'circle', x: ox, y: cy, r: Rpx, style: body === 'ring' || body === 'wheel' ? {stroke: 'ink', width: 14 * k} : {fill: 'faint', stroke: 'ink', width: 4 * k}, layer: 1} as Prop);
    if (body === 'wheel') for (let j = 0; j < 6; j++) spoke(`spoke${j}`, 0, R, j * Math.PI / 3, {stroke: 'muted', width: 4 * k});
    spoke('stripe', 0, R, 0, {stroke: 'accent', width: 6 * k}, 2);
  }
  props.push({id: 'axis', type: 'circle', x: ox, y: cy, r: 9 * k, style: {fill: 'ink'}, layer: 3} as Prop);
  // particles along one radius: same ω, v = ωr square to the radius
  const vmax = Math.max(...Array.from({length: n + 1}, (_, i) => w(tw(i)) * R), 1e-9), vs = 0.45 * Rpx / vmax;
  if (s.show?.includes('particles') && !sl) {
    for (const [j, frac] of [1 / 3, 2 / 3, 1].entries()) {
      const r = frac * R, P = (i: number) => pt(r, th[i]), V = (i: number) => { const a = th[i], v = w(tw(i)) * r * vs; return [P(i)[0] - v * Math.sin(a), P(i)[1] - v * Math.cos(a)]; };
      props.push({id: `pt${j}`, type: 'circle', x: 0, y: 0, r: 9 * k, style: {fill: 'cool', stroke: 'ink', width: 2 * k}, layer: 4, keys: {x: key(i => P(i)[0]), y: key(i => P(i)[1])}} as Prop,
        {id: `pv${j}`, type: 'arrow', x1: 0, y1: 0, x2: 0, y2: 0, head: 14 * k, style: {stroke: 'cool', width: 4 * k}, layer: 4,
          keys: {x1: key(i => P(i)[0]), y1: key(i => P(i)[1]), x2: key(i => V(i)[0]), y2: key(i => V(i)[1])}} as Prop);
    }
  }
  // the sliding masses
  if (sl) for (const side of [0, Math.PI]) {
    const P = (i: number) => pt(rOf(tw(i)), th[i] + side);
    props.push({id: `mass${side ? 2 : 1}`, type: 'circle', x: 0, y: 0, r: 22 * k, style: {fill: 'cool', stroke: 'ink', width: 3 * k}, layer: 4, keys: {x: key(i => P(i)[0]), y: key(i => P(i)[1])}} as Prop);
  }
  // the torque: a force fixed in space at the top of the body, at φ to the radius
  if (s.torque) {
    const q = s.torque, r = q.at ?? R, phi = (q.phi ?? 90) * DEG, [fx, fy] = [ox, cy - r * ppm], len = 0.6 * Rpx;
    // the radius points up; F turns anticlockwise: at φ from the radius, leaning left
    const dir = [-Math.sin(phi), -Math.cos(phi)];
    props.push({id: 'F', type: 'arrow', x1: fx, y1: fy, x2: fx + dir[0] * len, y2: fy + dir[1] * len, head: 20 * k, style: {stroke: 'figure', width: 6 * k}, show: [0.4, 1e9], layer: 5} as Prop,
      text('lF', fx + dir[0] * (len + 30 * k), fy + dir[1] * (len + 30 * k) + 10 * k, 'F', 32 * k, {weight: 700, align: 'middle', style: {fill: 'figure'}, show: [0.4, 1e9], layer: 5}),
      {id: 'rline', type: 'line', x1: ox, y1: cy, x2: fx, y2: fy, style: {stroke: 'figure', width: 2.5 * k, dash: [7 * k, 6 * k]}, show: [0.4, 1e9], layer: 5} as Prop,
      text('lr', ox + 16 * k, (cy + fy) / 2, 'r', 30 * k, {weight: 700, style: {fill: 'figure'}, show: [0.4, 1e9], layer: 5}));
  }
  // readouts and the story
  // a half-width part has its text under the drawing: smaller, so it fits above the frame's foot
  const fs = W < 1.3 * H ? 0.8 : 1;
  const ro = (id: string, t: string, fn: (i: number) => number, decimals = 2, fill = 'ink') => {
    props.push({id, type: 'readout', x: px, y: row, size: 28 * k * fs, text: t, decimals, style: {fill},
      measures: {v: {kind: 'keys', keys: key(fn)}}} as Prop);
    row += 1.35 * 28 * k * fs;
  };
  const line = (id: string, t: string, when: number, extra: Partial<Prop> = {}) => {
    props.push(ptext(id, px, row, t, 27 * k * fs, {show: [when, 1e9], ...extra}));
    row += wrapText(t, 27 * k * fs, W - px - 40 * k).length * 1.28 * 27 * k * fs + 5 * k;
  };
  const end = at(n), Tend = tw(n), wEnd = w(Tend), thEnd = th[n];
  if (sl) {
    ro('roI', 'I = {v} kg m²', i => Iof(tw(i)), 3, 'cool');
    ro('row', 'ω = {v} rad/s', i => w(tw(i)), 2, 'accent');
    ro('roL', 'L = Iω = {v} kg m²/s', i => Iof(tw(i)) * w(tw(i)), 2, 'good');
    row += 8 * k;
    const I1 = Iof(0), I2 = Iof(Ts), w2 = L0 / I2, K1 = I1 * w0 * w0 / 2, K2 = I2 * w2 * w2 / 2;
    line('s1', 'No torque from outside: the angular momentum L = Iω stays the same', lead, {weight: 700, style: {fill: 'good'}});
    line('s2', sl.r2 < sl.r1 ? 'The masses move in: I falls, so ω rises' : 'The masses move out: I rises, so ω falls', lead + 2, {style: {fill: 'accent'}});
    if (!s.illustrative) line('s3', `I₁ω₁ = I₂ω₂: ${f(I1)} × ${f(w0)} = ${f(I2)} × ω₂, so ω₂ = ${f(w2)} rad/s`, lead + 3.6, {weight: 700});
    if (s.show?.includes('energy') && !s.illustrative) line('s4', `Kinetic energy ½Iω²: ${f(K1)} J → ${f(K2)} J (${K2 > K1 ? 'the pull inward does work' : 'less: the masses do work moving out'})`, lead + 4.4, {style: {fill: 'muted'}});
    facts.push(`I before = ${f(I1)} kg m², after = ${f(I2)} kg m²`, `ω before = ${f(w0)} rad/s, after = ${f(w2)} rad/s`, `L = Iω = ${f(L0)} kg m²/s throughout`,
      `kinetic energy ${f(K1)} J → ${f(K2)} J`, formula);
    return scene(s, W, H, end + 1.5, plane, props, [], {verb: 'rotation', facts});
  }
  ro('rot', 't = {v} s', i => tw(i), 2, 'muted');
  ro('row', 'ω = {v} rad/s', i => w(tw(i)), 2, 'accent');
  ro('roth', 'θ = {v} rad', i => th[i], 2, 'cool');
  if (s.show?.includes('momentum')) ro('roL', 'L = Iω = {v} kg m²/s', i => I0 * w(tw(i)), 2, 'good');
  if (s.show?.includes('energy')) ro('roK', 'K = ½Iω² = {v} J', i => I0 * w(tw(i)) ** 2 / 2, 2, 'good');
  row += 8 * k;
  line('k1', `${formula}${s.illustrative ? '' : ` = ${f(I0)} kg m²`}`, lead, {style: {fill: 'muted'}});
  if (s.torque) {
    const q = s.torque;
    line('k2', s.illustrative ? 'Torque τ = r F sin φ' : `Torque τ = r F sin φ = ${f(q.at ?? R)} × ${f(q.F)} × sin ${f(q.phi ?? 90)}° = ${f(tau)} N m`, lead + 0.4, {style: {fill: 'figure'}});
    line('k3', s.illustrative ? 'τ = Iα: the same torque turns a larger I more slowly' : `α = τ / I = ${f(tau)} / ${f(I0)} = ${f(alpha)} rad/s²`, lead + 1, {weight: 700});
  } else if (alpha) line('k3', `Constant α = ${f(alpha)} rad/s²: ω = ω₀ + αt, θ = ω₀t + ½αt²`, lead + 0.4, {weight: 700});
  else line('k3', 'No torque: ω stays the same, θ = ωt', lead + 0.4, {weight: 700});
  if (s.show?.includes('particles')) line('k4', 'Every particle turns through the same angle: one ω. Farther out, a larger circle, so a larger speed v = ωr', lead + 1.6, {style: {fill: 'cool'}});
  if (!s.illustrative) line('k5', `After ${f(Tend)} s: ω = ${f(wEnd)} rad/s, θ = ${f(thEnd)} rad (${f(thEnd / (2 * Math.PI))} turns)`, end, {weight: 700});
  if (s.torque && !s.illustrative) line('k6', `Work done by the torque W = τθ = ${f(tau * thEnd)} J = ½Iω² gained; power P = τω = ${f(tau * wEnd)} W at the end`, end + 0.6, {style: {fill: 'figure'}});
  facts.push(formula, `I = ${f(I0)} kg m²`, `α = ${f(alpha)} rad/s²`, `after ${f(Tend)} s: ω = ${f(wEnd)} rad/s, θ = ${f(thEnd)} rad = ${f(thEnd / (2 * Math.PI))} revolutions`,
    `angular momentum L = Iω = ${f(I0 * wEnd)} kg m²/s at the end`, `rotational kinetic energy ½Iω² = ${f(I0 * wEnd * wEnd / 2)} J at the end`);
  if (s.torque) facts.push(`torque τ = ${f(tau)} N m`, `work done by the torque = τθ = ${f(tau * thEnd)} J`, `power at the end = τω = ${f(tau * wEnd)} W`);
  if (s.show?.includes('particles')) facts.push(`rim speed v = ωR = ${f(wEnd * R)} m/s at the end`);
  return scene(s, W, H, end + (s.torque ? 2 : 1.4), plane, props, [], {verb: 'rotation', facts});
}
