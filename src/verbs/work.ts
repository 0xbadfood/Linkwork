// work: work done by a constant force, computed (NCERT Class 11 Work, Energy and Power, §5.3–5.6; user, 2026-10-30).
// A body on a floor moves through a displacement d while a force F pulls at θ to the motion (0° along it, 90° across it,
// 180° against it) and kinetic friction (µk N, or a given size) opposes it. Code computes N = mg − F sin θ, the
// acceleration, the final speed and the time, and the work each force does: F d cos θ (positive, zero or negative with θ),
// −f d for friction, none for N and mg (across the motion). Two bars grow as it moves, the work done on it so far and its
// kinetic energy, so the work-energy theorem (net work = ΔK) is seen, with or without numbers. Without d, it slides until
// it stops (a braking cyclist, Example 5.2). Power (W / t, and F v cos θ at the end) when asked.
import {nameError} from './names.ts';
import type {Key} from '../keys.ts';
import type {Plane} from '../plane.ts';
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {round} from '../vec.ts';
import {n2, panel, scene, text} from './calculus.ts';
import {frame} from './vectors.ts';

type P2 = [number, number];
export const WORK_BODIES = ['block', 'car', 'ball'] as const;
export type WorkSpec = {verb: 'work'; body?: (typeof WORK_BODIES)[number]; label?: string; mass?: number; g?: number; v0?: number;
  force?: {name?: string; magnitude: number; angle?: number}; friction?: {mu?: number; magnitude?: number}; d?: number;
  show?: ('power')[]; title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};

const DEG = Math.PI / 180;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const f = (v: number) => n2(round(v, 9), Math.abs(v) >= 100 || Number.isInteger(round(v, 9)) ? 0 : 2);

type Motion = {N: number; fr: number; along: number; a: number; d: number; vf: number; t: number; errors: string[]};

/** The motion: forces, acceleration, distance, final speed and time; errors name the field to change. */
function motion(s: WorkSpec): Motion {
  const m = s.mass ?? 1, g = s.g ?? 9.8, v0 = s.v0 ?? 0, F = s.force?.magnitude ?? 0, th = (s.force?.angle ?? 0) * DEG;
  const N = m * g - F * Math.sin(th), along = F * Math.cos(th);
  const out: Motion = {N, fr: 0, along, a: 0, d: 0, vf: 0, t: 0, errors: []};
  if (N < -1e-9) { out.errors.push(`work: F sin θ = ${f(F * Math.sin(th))} N is more than mg = ${f(m * g)} N, so it lifts the body off the floor; lower F or θ`); return out; }
  out.fr = s.friction ? s.friction.magnitude ?? (s.friction.mu ?? 0) * Math.max(N, 0) : 0;
  out.a = (along - out.fr) / m;
  if (v0 < 1e-9 && out.a <= 1e-9) {
    out.errors.push(`work: starting at rest, F cos θ = ${f(along)} N does not beat friction ${f(out.fr)} N, so it never moves; raise F, lower θ or friction, or give v0`);
    return out;
  }
  const stop = out.a < -1e-9 ? v0 * v0 / (2 * -out.a) : Infinity;
  if (s.d === undefined) {
    if (!isFinite(stop)) { out.errors.push('work: give d (the displacement in m): nothing stops it'); return out; }
    out.d = stop;
  } else if (s.d > stop + 1e-9) {
    out.errors.push(`work: it stops after ${f(stop)} m, before d = ${f(s.d)} m; give d up to ${f(stop)} m, or leave d out to end where it stops`); return out;
  } else out.d = s.d;
  out.vf = Math.sqrt(Math.max(0, v0 * v0 + 2 * out.a * out.d));
  out.t = Math.abs(out.a) > 1e-9 ? (out.vf - v0) / out.a : out.d / v0;
  return out;
}

export function workErrors(s: WorkSpec): string[] {
  const e: string[] = [];
  if (s.body !== undefined && !WORK_BODIES.includes(s.body)) e.push(`work: body is one of ${WORK_BODIES.join(', ')}`);
  if (s.mass !== undefined && !(isNum(s.mass) && s.mass > 0)) e.push('work: mass is in kg, above 0');
  if (s.mass === undefined && !s.illustrative) e.push('work: give mass (kg); or, when the narration states no numbers, set illustrative: true');
  if (s.g !== undefined && !(isNum(s.g) && s.g > 0)) e.push('work: g is above 0 (default 9.8)');
  if (s.v0 !== undefined && !(isNum(s.v0) && s.v0 >= 0)) e.push('work: v0 is the starting speed in m/s, 0 or more, along the motion (to the right)');
  if (s.force !== undefined) {
    if (!(isNum(s.force?.magnitude) && s.force.magnitude > 0)) e.push('work: force.magnitude is in N, above 0');
    if (s.force?.angle !== undefined && !(isNum(s.force.angle) && s.force.angle >= 0 && s.force.angle <= 180))
      e.push('work: force.angle is 0 to 180 degrees from the direction of motion (0 along it, 90 across it, 180 against it)');
    if (s.force?.name !== undefined) { const bad = nameError('work: force.name', s.force.name, 4, 'F, P, T'); if (bad) e.push(bad); }
  }
  if (s.friction !== undefined) {
    const fr = s.friction;
    if ((fr?.mu === undefined) === (fr?.magnitude === undefined)) e.push('work: friction is {mu} (kinetic, µk N) or {magnitude} in N');
    else if (fr.mu !== undefined && !(isNum(fr.mu) && fr.mu > 0 && fr.mu < 2)) e.push('work: friction.mu is above 0, below 2');
    else if (fr.magnitude !== undefined && !(isNum(fr.magnitude) && fr.magnitude > 0)) e.push('work: friction.magnitude is in N, above 0');
  }
  if (!s.force && !s.friction) e.push('work: give a force, friction, or both');
  if (!s.force && !(isNum(s.v0) && s.v0 > 0)) e.push('work: with friction alone, give v0 (it slides and slows)');
  if (s.d !== undefined && !(isNum(s.d) && s.d > 0)) e.push('work: d is the displacement in m, above 0');
  for (const x of s.show ?? []) if (x !== 'power') e.push("work: show items: 'power'");
  if (e.length) return e;
  return motion(s).errors;
}

export function work(s: WorkSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080;
  const fr = frame(W, H, k, s.title), box = fr.box, props: Prop[] = [...fr.titles], facts: string[] = [];
  const plane: Plane = {id: 'p', x: [0, 1], y: [0, 1], box};
  const m = s.mass ?? 1, g = s.g ?? 9.8, v0 = s.v0 ?? 0, F = s.force?.magnitude ?? 0, th = (s.force?.angle ?? 0) * DEG, Fn = s.force?.name ?? 'F';
  const mo = motion(s), {N, fr: fk, a, d, vf, t: T} = mo;
  const WF = F * d * Math.cos(th), Wf = -fk * d, Wnet = WF + Wf, K0 = m * v0 * v0 / 2, K1 = m * vf * vf / 2;
  // screen time: the motion takes 3 to 7 s on screen whatever it takes in the world
  const lead = 1.2, Ts = Math.min(7, Math.max(3, T)), n = 80;
  const at = (i: number) => lead + Ts * i / n, tw = (i: number) => T * i / n;
  const xAt = (t: number) => v0 * t + a * t * t / 2, vAt = (t: number) => Math.max(0, v0 + a * t);
  const key = (fn: (t: number) => number): Key[] => Array.from({length: n + 1}, (_, i) => (i ? [at(i), fn(tw(i)), 'linear'] : [at(i), fn(tw(i))]) as Key);
  // the drawing: the floor low in the box, the bars above it
  const bw = box[2] - box[0], bh = box[3] - box[1], floorY = box[1] + 0.82 * bh;
  const body = s.body ?? 'block', side = 0.16 * Math.min(bw, bh), hy = body === 'car' ? 0.37 * side : body === 'block' ? 0.35 * side : 0.5 * side;
  // room behind the body at the start for a backward force (friction, a pull at over 90°) and its name: a braking
  // cycle's friction arrow and "f" were drawn off the left edge (2026-10-30)
  const hx0 = body === 'car' ? 0.8 * side : 0.5 * side, L0 = 0.2 * Math.min(bw, bh) / Math.max(F, motion(s).fr, 1e-9);
  const back = Math.max(motion(s).fr, F * Math.max(0, -Math.cos((s.force?.angle ?? 0) * DEG)));
  const x0 = box[0] + Math.max(0.1 * bw, back > 0 ? hx0 + back * L0 + 70 * k : 0), ppm = Math.min(0.62 * bw, box[2] - 0.06 * bw - hx0 - x0) / d;
  const cx = (t: number) => x0 + xAt(t) * ppm, cy = floorY - hy;
  props.push({id: 'floor', type: 'line', x1: box[0], y1: floorY, x2: box[2], y2: floorY, style: {stroke: 'muted', width: 4 * k}} as Prop);
  if (body === 'ball') props.push({id: 'body', type: 'circle', x: x0, y: cy, r: side / 2, style: {fill: 'faint', stroke: 'ink', width: 4 * k}, layer: 1, keys: {x: key(t => cx(t))}} as Prop);
  else props.push({id: 'body', type: 'object', name: body, x: x0, y: floorY, size: body === 'car' ? 1.6 * side : side, layer: 1,
    label: body === 'block' ? s.label ?? (s.illustrative ? undefined : `${f(m)} kg`) : undefined, keys: {x: key(t => cx(t))}} as Prop);
  // the forces on it, riding along: F at θ, friction at the floor; arrows at a common scale
  const big = Math.max(F, fk, 1e-9), L = 0.2 * Math.min(bw, bh) / big;
  const arrow = (id: string, from: (t: number) => P2, u: P2, size: number, stroke: string, name: string, extra: Partial<Prop> = {}) => {
    const tip = (t: number): P2 => [from(t)[0] + u[0] * size * L, from(t)[1] - u[1] * size * L];
    props.push({id, type: 'arrow', x1: 0, y1: 0, x2: 0, y2: 0, head: 18 * k, style: {stroke, width: 6 * k}, layer: 2, show: [0.3, 1e9],
      keys: {x1: key(t => from(t)[0]), y1: key(t => from(t)[1]), x2: key(t => tip(t)[0]), y2: key(t => tip(t)[1])}, ...extra} as Prop);
    const off = 30 * k + Math.abs(u[0]) * 0.28 * 32 * k * name.length;      // a long name along a level arrow sits past its head
    props.push(text(`l${id}`, 0, 0, name, 32 * k, {weight: 700, align: 'middle', style: {fill: stroke}, layer: 2, show: [0.3, 1e9],
      keys: {x: key(t => tip(t)[0] + u[0] * off), y: key(t => tip(t)[1] - u[1] * off + 11 * k)}}));
  };
  const hx = body === 'car' ? 0.8 * side : 0.5 * side;
  if (F > 0) {
    const u: P2 = [Math.cos(th), Math.sin(th)], edge = Math.min(hx / Math.max(Math.abs(u[0]), 1e-9), hy / Math.max(Math.abs(u[1]), 1e-9)) + 4 * k;
    arrow('F', t => [cx(t) + u[0] * edge, cy - u[1] * edge], u, F, 'figure', Fn);
    if (Math.abs(Math.sin(th)) > 0.05 && Math.abs(Math.cos(th)) > 0.05) {
      // its part along the motion, F cos θ, dashed along the floor line through the body
      const dir = Math.sign(Math.cos(th));
      arrow('Fx', t => [cx(t) + dir * (hx + 4 * k), cy], [dir, 0], Math.abs(F * Math.cos(th)), 'figure', `${Fn} cos θ`,
        {style: {stroke: 'figure', width: 3 * k, dash: [8 * k, 6 * k], opacity: 0.8}, show: [lead - 0.4, 1e9]});
    }
  }
  if (fk > 0) arrow('f', t => [cx(t) - hx - 4 * k, floorY - 8 * k], [-1, 0], fk, 'bad', 'f');
  // the displacement: a measuring line under the floor once it has moved
  const end = at(n);
  props.push({id: 'dline', type: 'arrow', x1: x0, y1: floorY + 36 * k, x2: x0 + d * ppm, y2: floorY + 36 * k, head: 16 * k, style: {stroke: 'muted', width: 3 * k}, show: [end, 1e9], fade: 0.4} as Prop,
    text('ld', x0 + d * ppm / 2, floorY + 76 * k, 'd', 32 * k, {weight: 700, align: 'middle', style: {fill: 'muted'}, show: [end, 1e9]}));
  // the bars: work done on it so far (signed, from a zero line) and its kinetic energy; ΔK equals the net work
  // each bar under its name; a negative bar grows left of the zero line, so the zero line sits further in
  const top = box[1] + 0.04 * bh, rowH = 0.16 * bh, neg = Wnet < -1e-9, zero = box[0] + (neg ? 0.55 : 0.04) * bw;
  const scaleE = (neg ? 0.5 : 0.85) * bw / Math.max(Math.abs(Wnet), K0, K1, 1e-9);
  const bar = (id: string, y: number, fill: string, name: string, value: (t: number) => number) => {
    props.push(text(`l${id}`, zero + 12 * k, y + 26 * k, name, 28 * k, {weight: 700, style: {fill}, show: [0.3, 1e9]}));
    props.push({id, type: 'rect', x: zero, y: y + 40 * k, w: 0, h: 0.4 * rowH, style: {fill, opacity: 0.85}, show: [0.3, 1e9],
      keys: {x: key(t => zero + Math.min(0, value(t)) * scaleE), w: key(t => Math.max(1e-6, Math.abs(value(t)) * scaleE))}} as Prop);
  };
  props.push({id: 'zero', type: 'line', x1: zero, y1: top + 34 * k, x2: zero, y2: top + rowH + 50 * k + 0.4 * rowH, style: {stroke: 'muted', width: 2 * k}} as Prop);
  bar('bw', top, Wnet < 0 ? 'bad' : 'good', 'net work done', t => (F * Math.cos(th) - fk) * xAt(t));
  bar('bk', top + rowH, 'accent', 'kinetic energy', t => m * vAt(t) ** 2 / 2);
  // readouts, live, then the story
  const px = fr.px, ptext = panel(W, k);
  let row = fr.row;
  const ro = (id: string, t: string, measures: Record<string, Key[]>, decimals = 2) => {
    props.push({id, type: 'readout', x: px, y: row, size: 28 * k, text: t, decimals, show: [0.3, 1e9],
      measures: Object.fromEntries(Object.entries(measures).map(([nm, keys]) => [nm, {kind: 'keys', keys}]))} as Prop);
    row += 1.35 * 28 * k;
  };
  ro('rox', 'distance = {x} m', {x: key(t => xAt(t))});
  ro('rov', 'speed v = {v} m/s', {v: key(t => vAt(t))});
  ro('rok', 'K = ½mv² = {K} J', {K: key(t => m * vAt(t) ** 2 / 2)});
  row += 8 * k;
  const line = (id: string, t: string, when: number, extra: Partial<Prop> = {}) => {
    props.push(ptext(id, px, row, t, 27 * k, {show: [when, 1e9], ...extra}));
    row += wrapText(t, 27 * k, W - px - 40 * k).length * 1.28 * 27 * k + 5 * k;
  };
  const sign = (w: number) => (Math.abs(w) < 1e-9 ? 'zero' : w > 0 ? 'positive' : 'negative');
  if (F > 0) {
    const thd = th / DEG;
    line('w1', thd < 1e-9 ? `${Fn} acts along the motion: it does positive work` : Math.abs(thd - 90) < 1e-9 ? `${Fn} acts across the motion: it does no work`
      : thd < 90 ? `${Fn} acts at θ to the motion: only ${Fn} cos θ does work` : `${Fn} has a part against the motion: its work is negative`, lead,
      {style: {fill: 'figure'}});
    line('w2', `W = ${Fn} d cos θ = ${f(F)} × ${f(d)} × cos ${f(th / DEG)}° = ${f(WF)} J`, end, {style: {fill: 'figure'}});
  }
  if (fk > 0) {
    line('w3', 'Friction acts against the motion: its work is negative', lead + 0.6, {style: {fill: 'bad'}});
    line('w4', `${s.friction?.mu !== undefined ? `f = µk N = ${f(s.friction.mu)} × ${f(N)} = ${f(fk)} N; ` : ''}W = −f d = ${f(Wf)} J`, end + 0.5, {style: {fill: 'bad'}});
  }
  line('w5', 'N and mg do no work: they act across the motion', end + 1, {style: {fill: 'muted'}});
  row += 4 * k;
  line('w6', 'The net work done equals the change in kinetic energy (the work-energy theorem)', end + 1.6, {weight: 700});
  line('w7', `W net = ${f(Wnet)} J = ½mv² − ½mu² = ${f(K1)} − ${f(K0)} J`, end + 2.2, {weight: 700});
  if (s.show?.includes('power') && F > 0) {
    line('p1', `Average power of ${Fn} = W / t = ${f(WF)} / ${f(T)} = ${f(WF / T)} W`, end + 2.8, {style: {fill: 'cool'}});
    line('p2', `At the end, P = ${Fn} v cos θ = ${f(F * vf * Math.cos(th))} W`, end + 3.4, {style: {fill: 'cool'}});
  }
  if (F > 0) facts.push(`work done by ${Fn} = ${Fn} d cos θ = ${f(WF)} J (${sign(WF)})`);
  if (fk > 0) facts.push(`friction f = ${f(fk)} N`, `work done by friction = −f d = ${f(Wf)} J`);
  facts.push(`N = ${f(N)} N`, `d = ${f(d)} m`, `a = ${f(a)} m/s²`, `speed ${f(v0)} m/s → ${f(vf)} m/s in ${f(T)} s`,
    `kinetic energy ${f(K0)} J → ${f(K1)} J (ΔK = ${f(K1 - K0)} J)`, `net work = ${f(Wnet)} J = ΔK`);
  if (s.show?.includes('power') && F > 0) facts.push(`average power of ${Fn} = ${f(WF / T)} W`, `power of ${Fn} at the end = ${Fn} v cos θ = ${f(F * vf * Math.cos(th))} W`);
  return scene(s, W, H, end + (s.show?.includes('power') ? 6 : 4.4), plane, props, [], {verb: 'work', facts});
}
