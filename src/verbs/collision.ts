// A collision in two dimensions between smooth balls, computed: m1 moving along x at v1i strikes m2 at rest, its line of
// motion offset from m2's centre by the impact parameter b. At contact the push acts along the line of centres (smooth
// balls: no sideways friction), so m2 leaves along that line, at θ2 = arcsin(b / (r1 + r2)) below the horizontal, and
// m1 swerves above it; the impulse J = (1 + e) μ u, with u the closing speed along the line of centres, keeps momentum
// along x and y, and kinetic energy when e = 1. Equal masses, elastic: they leave at right angles (NCERT Example 5.12);
// b = 0: head-on, the one-dimensional collision. The outgoing directions are never typed in: they follow from b.
// (2026-11-05: keph1-05 C11 S05 and C13 S13 were left blank; stage's collide acts only along one line.)
import type {Key} from '../keys.ts';
import {toScene, type Plane} from '../plane.ts';
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {round, type Vec} from '../vec.ts';
import {n2, panel, scene, text} from './calculus.ts';
import {frame} from './vectors.ts';

const VELOCITIES = ['none', 'names', 'values'] as const;
export type Collision2dSpec = {verb: 'collision_2d';
  /** masses (kg), m1's speed before (m/s), the impact parameter as a fraction of r1 + r2 (0 head-on, below 1), the
   * coefficient of restitution (1 elastic) */
  m1?: number; m2?: number; v1i?: number; b?: number; e?: number;
  /** what is marked: θ1 and θ2 (default true), the names m1 and m2 (default true), velocity arrows (default none), the
   * momentum along x and y (default false), the impact parameter b (default false), the panel's reason (default true) */
  angles?: boolean; names?: boolean; velocities?: (typeof VELOCITIES)[number]; components?: boolean; impact?: boolean; explain?: boolean;
  seconds?: number; title?: string; illustrative?: boolean; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const f = (v: number, p = 2) => n2(round(v, 9), Math.abs(v) >= 100 ? 0 : p);
const DEG = 180 / Math.PI;

/** The outcome for smooth balls, m2 at rest at the origin, m1 coming along +x on the line y = b (b in units of r1 + r2):
 * v1f, v2f, the line of centres n (from m1 to m2) at contact, θ1 above and θ2 below the horizontal (degrees). */
export function collide2d(m1: number, m2: number, v1i: number, b: number, e = 1) {
  const n: Vec = [Math.sqrt(1 - b * b), -b], u = v1i * n[0], J = (1 + e) * m1 * m2 / (m1 + m2) * u;
  const v1f: Vec = [v1i - J / m1 * n[0], -J / m1 * n[1]], v2f: Vec = [J / m2 * n[0], J / m2 * n[1]];
  const s1 = Math.hypot(...v1f), s2 = Math.hypot(...v2f);
  return {n, J, v1f, v2f, s1, s2, theta1: s1 > 1e-9 * v1i ? Math.atan2(v1f[1], v1f[0]) * DEG : 0, theta2: -Math.atan2(v2f[1], v2f[0]) * DEG,
    K0: m1 * v1i * v1i / 2, K1: (m1 * s1 * s1 + m2 * s2 * s2) / 2};
}

export function collision2dErrors(s: Collision2dSpec): string[] {
  const e: string[] = [];
  for (const k of ['m1', 'm2'] as const) if (s[k] !== undefined && !(isNum(s[k]) && s[k]! > 0 && s[k]! <= 1e6)) e.push(`collision_2d: ${k} is a mass in kg, above 0`);
  if (s.m1 !== undefined && s.m2 !== undefined && isNum(s.m1) && isNum(s.m2) && Math.max(s.m1 / s.m2, s.m2 / s.m1) > 20)
    e.push('collision_2d: the masses differ by at most 20 times (the lighter ball would be a dot)');
  if (s.v1i !== undefined && !(isNum(s.v1i) && s.v1i > 0)) e.push('collision_2d: v1i is m1\'s speed before the collision, m/s, above 0 (m2 is at rest)');
  if (s.b !== undefined && !(isNum(s.b) && s.b >= 0 && s.b < 0.98))
    e.push('collision_2d: b is the impact parameter as a fraction of r1 + r2 (the distance between the centres at contact): 0 head-on, up to 0.97 a grazing hit; 1 or more is a miss');
  if (s.e !== undefined && !(isNum(s.e) && s.e >= 0 && s.e <= 1)) e.push('collision_2d: e is the coefficient of restitution, 0 to 1 (1 elastic, the default)');
  if (s.velocities !== undefined && !VELOCITIES.includes(s.velocities)) e.push(`collision_2d: velocities is ${VELOCITIES.join(', ')}`);
  for (const k of ['angles', 'names', 'components', 'impact', 'explain'] as const) if (s[k] !== undefined && typeof s[k] !== 'boolean') e.push(`collision_2d: ${k} is true or false`);
  if (s.components && (s.velocities ?? 'none') === 'none') e.push('collision_2d: components splits the velocities into x and y parts: give velocities names or values');
  if (s.seconds !== undefined && !(isNum(s.seconds) && s.seconds >= 6 && s.seconds <= 30)) e.push('collision_2d: seconds is the scene length, 6 to 30');
  return e;
}

export function collision2d(s: Collision2dSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080;
  const m1 = s.m1 ?? 1, m2 = s.m2 ?? 1, v1i = s.v1i ?? 2, b = s.b ?? 0.5, e = s.e ?? 1;
  const out = collide2d(m1, m2, v1i, b, e), {v1f, v2f, s1, s2, theta1, theta2} = out;
  const wantAngles = s.angles !== false, wantNames = s.names !== false, vel = s.velocities ?? 'none', explain = s.explain !== false;
  // sizes: one density, r ∝ ∛m, with r1 + r2 = 1 (the plane's unit is the distance between centres at contact)
  const c1 = Math.cbrt(m1), c2 = Math.cbrt(m2), r1 = c1 / (c1 + c2), r2 = c2 / (c1 + c2);
  const contact: Vec = [-Math.sqrt(1 - b * b), b], start: Vec = [contact[0] - 4, b];
  // on screen: the approach in 2.4 s; afterwards, at the same rate, until the faster ball has gone about 4.5 units
  const lead = 0.6, A = 2.4, Tin = 4 / v1i, rate = A / Tin, vOut = Math.max(s1, s2);
  const Tout = Math.min(1.4 * Tin, 4.5 / vOut), tc = lead + A, tEnd = tc + Tout * rate;
  const at1 = (t: number): Vec => (t <= Tin ? [start[0] + v1i * t, b] : [contact[0] + v1f[0] * (t - Tin), contact[1] + v1f[1] * (t - Tin)]);
  const at2 = (t: number): Vec => (t <= Tin ? [0, 0] : [v2f[0] * (t - Tin), v2f[1] * (t - Tin)]);
  const vsc = 1.5 / Math.max(v1i, vOut);                                         // arrow units per m/s, one scale
  const end1 = at1(Tin + Tout), end2 = at2(Tin + Tout);

  // the window: everything the balls, arrows and angle marks reach, at equal scale
  const reach: Vec[] = [start, [0, 0], contact, end1, end2, [contact[0] + 2.4, b], [2.4, 0]];
  if (vel !== 'none') reach.push([start[0] + v1i * vsc + 0.6, b], [end1[0] + v1f[0] * vsc, end1[1] + v1f[1] * vsc], [end2[0] + v2f[0] * vsc, end2[1] + v2f[1] * vsc]);
  // b is marked on the incoming side, left of where m1 starts, so neither ball nor θ arcs ever reach it
  const xb = start[0] - r1 - 0.35;
  if (s.impact) reach.push([xb - 0.75, b]);
  const fr = frame(W, H, k, s.title), narrow = W < 1.3 * H, box = fr.box, lineSize = (narrow ? 25 : 30) * k;
  const pad = 0.9;
  const x0 = Math.min(...reach.map(p => p[0])) - pad, x1 = Math.max(...reach.map(p => p[0])) + pad + (vel === 'values' ? 1.2 : 0);   // room for 'v2f = 1.60 m/s'
  const y0 = Math.min(...reach.map(p => p[1])) - pad, y1 = Math.max(...reach.map(p => p[1])) + pad;
  const bw = box[2] - box[0], bh = box[3] - box[1], per = Math.max((x1 - x0) / bw, (y1 - y0) / bh), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const plane: Plane = {id: 'p', x: [cx - per * bw / 2, cx + per * bw / 2], y: [cy - per * bh / 2, cy + per * bh / 2], box};
  const props: Prop[] = [...fr.titles], facts: string[] = [], px = fr.px, ptext = panel(W, k);
  let row = fr.row;
  const line = (id: string, t: string, at: number, extra: Partial<Prop> = {}) => {
    props.push(ptext(id, px, row, t, lineSize, {show: [at, 1e9], ...extra}));
    row += wrapText(t, lineSize, W - px - 40 * k).length * 1.3 * lineSize + 6 * k;
  };

  // time keys: physical t sampled, shown at lead + t × rate
  const N = Math.ceil((tEnd - lead) * 20), ts = Array.from({length: N + 1}, (_, i) => (Tin + Tout) * i / N);
  if (!ts.includes(Tin)) { ts.push(Tin); ts.sort((a, c) => a - c); }
  const keyed = (g: (t: number) => number): Key[] => ts.map((t, i) => (i ? [lead + t * rate, g(t), 'linear'] : [lead, g(t)]) as Key);
  const dashed = {stroke: 'muted', width: 3 * k, dash: [10 * k, 8 * k], opacity: 0.75};

  // the horizontal through m2 (the x direction), and the paths drawn behind the balls
  props.push({id: 'xline', type: 'line', plane: 'p', x1: plane.x[0] + 0.3, y1: 0, x2: 2.4, y2: 0, style: {stroke: 'faint', width: 2 * k}} as Prop);
  props.push({id: 'path1in', type: 'line', plane: 'p', x1: start[0], y1: b, x2: start[0], y2: b, keys: {x2: keyed(t => Math.min(at1(t)[0], contact[0]))}, style: dashed} as Prop);
  props.push({id: 'path1out', type: 'line', plane: 'p', x1: contact[0], y1: b, x2: contact[0], y2: b, keys: {x2: keyed(t => at1(Math.max(t, Tin))[0]), y2: keyed(t => at1(Math.max(t, Tin))[1])}, style: dashed, show: [tc, 1e9]} as Prop);
  props.push({id: 'path2out', type: 'line', plane: 'p', x1: 0, y1: 0, x2: 0, y2: 0, keys: {x2: keyed(t => at2(t)[0]), y2: keyed(t => at2(t)[1])}, style: dashed, show: [tc, 1e9]} as Prop);
  // the balls
  const ball = (id: string, r: number, pos: (t: number) => Vec, fill: string) =>
    props.push({id, type: 'circle', plane: 'p', x: pos(0)[0], y: pos(0)[1], r: r / per, layer: 3, keys: {x: keyed(t => pos(t)[0]), y: keyed(t => pos(t)[1])},
      style: {fill, stroke: 'ink', width: 2 * k}} as Prop);
  ball('ball1', r1, at1, 'accent'); ball('ball2', r2, at2, 'cool');
  const gap = 34 * k * per;
  if (wantNames) {
    // m1 named on the left of its way (above it before the hit), m2 on the right of its way (below it at rest): m1
    // swerves up and m2 down, so the names stay outside, clear of the velocity names at the arrows' tips; the name
    // swings round in the first moments after the hit
    const name = (id: string, t: string, pos: (t: number) => Vec, before: Vec, after: Vec, r: number) => {
      const off = (u: number): Vec => { const w = Math.min(1, Math.max(0, (u - Tin) * rate / 0.4)), x = before[0] + (after[0] - before[0]) * w, y = before[1] + (after[1] - before[1]) * w, l = Math.hypot(x, y) || 1;
        return [x / l * (r + gap), y / l * (r + gap)]; };
      props.push({id, type: 'text', plane: 'p', x: pos(0)[0] + off(0)[0], y: pos(0)[1] + off(0)[1], text: t, size: 30 * k, weight: 700, align: 'middle', layer: 4,
        keys: {x: keyed(u => pos(u)[0] + off(u)[0]), y: keyed(u => pos(u)[1] + off(u)[1])}, style: {fill: 'ink', stroke: 'paper', width: 7 * k}} as Prop);
    };
    const left = (v: Vec): Vec => { const l = Math.hypot(...v); return l > 1e-9 ? [-v[1] / l, v[0] / l] : [0, 1]; };
    name('name1', 'm1', at1, [0, 1], left(v1f), r1); name('name2', 'm2', at2, [0, -1], [-left(v2f)[0], -left(v2f)[1]], r2);
  }
  const anchors: Record<string, Vec> = {m2: toScene(plane, [0, 0]), contact: toScene(plane, contact), m1_end: toScene(plane, end1), m2_end: toScene(plane, end2)};

  // the impact parameter: from the horizontal through m2's centre up to m1's line of motion, on the incoming side
  // behind m1's start (2026-11-05, keph1-05 C13: marked beside m2, b sat on θ2's arc name near the line of motion)
  if (s.impact) {
    const on = lead;
    props.push({id: 'bline', type: 'line', plane: 'p', x1: xb - 0.25, y1: b, x2: start[0], y2: b, style: {...dashed, opacity: 0.5}, show: [on, 1e9]} as Prop);
    if (b > 0.02) {
      props.push({id: 'bmeasure', type: 'line', plane: 'p', x1: xb, y1: 0, x2: xb, y2: b, style: {stroke: 'good', width: 4 * k}, show: [on, 1e9]} as Prop);
      for (const y of [0, b]) props.push({id: `btick${y ? 1 : 0}`, type: 'line', plane: 'p', x1: xb - 0.1, y1: y, x2: xb + 0.1, y2: y, style: {stroke: 'good', width: 4 * k}, show: [on, 1e9]} as Prop);
      props.push({id: 'lb', type: 'text', plane: 'p', x: xb - 0.12 - 10 * k * per, y: b / 2, text: 'b', size: 32 * k, weight: 700, align: 'end', style: {fill: 'good', stroke: 'paper', width: 7 * k}, show: [on, 1e9]} as Prop);
    }
    anchors.b = toScene(plane, [xb, b / 2]);
  }

  // velocity arrows riding the balls: v1i before, v1f and v2f after
  const arrow = (id: string, pos: (t: number) => Vec, v: (t: number) => Vec, r: number, label: string, stroke: string, on: number, off: number) => {
    const tail = (t: number): Vec => { const p = pos(t), w = v(t), l = Math.hypot(...w) || 1; return [p[0] + w[0] / l * r, p[1] + w[1] / l * r]; };
    const tip = (t: number): Vec => { const a = tail(t), w = v(t); return [a[0] + w[0] * vsc, a[1] + w[1] * vsc]; };
    const lab = (t: number): Vec => { const a = tip(t), w = v(t), l = Math.hypot(...w) || 1; return [a[0] + w[0] / l * 1.6 * gap, a[1] + w[1] / l * 1.6 * gap]; };
    props.push({id, type: 'arrow', plane: 'p', x1: tail(0)[0], y1: tail(0)[1], x2: tip(0)[0], y2: tip(0)[1], head: 16 * k, layer: 2,
      keys: {x1: keyed(t => tail(t)[0]), y1: keyed(t => tail(t)[1]), x2: keyed(t => tip(t)[0]), y2: keyed(t => tip(t)[1])}, style: {stroke, width: 5 * k}, show: [on, off], fade: 0.2} as Prop,
      {id: `l${id}`, type: 'text', plane: 'p', x: lab(0)[0], y: lab(0)[1], text: label, size: 28 * k, weight: 700, align: 'middle', layer: 4,
        keys: {x: keyed(t => lab(t)[0]), y: keyed(t => lab(t)[1])}, style: {fill: stroke, stroke: 'paper', width: 7 * k}, show: [on, off], fade: 0.2} as Prop);
  };
  const named = (nm: string, v: number) => (vel === 'values' ? `${nm} = ${f(v)} m/s` : nm);
  const after = tc + 0.25;
  if (vel !== 'none') {
    arrow('v1i', at1, () => [v1i, 0], r1, named('v1i', v1i), 'accent', lead, tc - 0.05);
    if (s1 > 1e-6 * v1i) arrow('v1f', at1, () => v1f, r1, named('v1f', s1), 'accent', after, 1e9);
    arrow('v2f', at2, () => v2f, r2, named('v2f', s2), 'cool', after, 1e9);
    if (s.components) {
      // each final velocity's x and y parts, dashed, at the end of the motion
      const parts = (id: string, p: Vec, v: Vec, r: number, stroke: string) => {
        const l = Math.hypot(...v) || 1, o: Vec = [p[0] + v[0] / l * r, p[1] + v[1] / l * r];
        props.push({id: `${id}x`, type: 'arrow', plane: 'p', x1: o[0], y1: o[1], x2: o[0] + v[0] * vsc, y2: o[1], head: 12 * k, style: {stroke, width: 3 * k, dash: [8 * k, 6 * k]}, show: [tEnd + 0.2, 1e9], fade: 0.3} as Prop,
          {id: `${id}y`, type: 'arrow', plane: 'p', x1: o[0] + v[0] * vsc, y1: o[1], x2: o[0] + v[0] * vsc, y2: o[1] + v[1] * vsc, head: 12 * k, style: {stroke, width: 3 * k, dash: [8 * k, 6 * k]}, show: [tEnd + 0.2, 1e9], fade: 0.3} as Prop);
      };
      if (s1 > 1e-6 * v1i) parts('c1', end1, v1f, r1, 'accent');
      parts('c2', end2, v2f, r2, 'cool');
    }
  }

  // θ1 and θ2: from the horizontal through each ball's starting point to the way it leaves
  const head = b < 1e-6;
  if (wantAngles && !head) {
    const on = tc + Math.min(1, 0.4 * (tEnd - tc));
    const mark = (id: string, o: Vec, from: number, to: number, r: number, label: string, stroke: string) => {
      const pts: Vec[] = Array.from({length: 31}, (_, i) => { const a = (from + (to - from) * i / 30) / DEG; return [o[0] + r * Math.cos(a), o[1] + r * Math.sin(a)] as Vec; });
      const mid = (from + to) / 2 / DEG, lr = r + 0.32;
      props.push({id: `ref${id}`, type: 'line', plane: 'p', x1: o[0], y1: o[1], x2: o[0] + r + 0.7, y2: o[1], style: {stroke: 'ink', width: 2.5 * k, dash: [8 * k, 6 * k]}, show: [on, 1e9], fade: 0.3} as Prop,
        {id: `arc${id}`, type: 'polyline', plane: 'p', points: pts, style: {stroke, width: 4 * k}, show: [on, 1e9], fade: 0.3} as Prop,
        {id: `l${id}`, type: 'text', plane: 'p', x: o[0] + lr * Math.cos(mid), y: o[1] + lr * Math.sin(mid), text: label, size: 32 * k, weight: 700, align: 'middle', layer: 4,
          style: {fill: stroke, stroke: 'paper', width: 7 * k}, show: [on, 1e9], fade: 0.3} as Prop);
      anchors[id] = toScene(plane, [o[0] + lr * Math.cos(mid), o[1] + lr * Math.sin(mid)]);
    };
    if (s1 > 1e-6 * v1i) mark('theta1', contact, 0, theta1, 1.25, 'θ₁', 'accent');
    mark('theta2', [0, 0], 0, -theta2, 1.0, 'θ₂', 'cool');
  }

  // the panel: in words first (an illustrative scene keeps these), then the numbers
  const who = wantNames ? 'm1 and m2' : 'the two balls';
  if (s.impact) line('w-b', wantNames ? "b: the impact parameter, from m2's centre to m1's line of motion" : "b: the impact parameter, from the target's centre to the line of motion", lead, {style: {fill: 'good'}});
  if (head) line('w-out', `A head-on hit: ${who} stay on the one line, a collision in one dimension`, after);
  else if (wantAngles) line('w-out', `After the collision ${who} move off at angles θ₁ and θ₂ with the horizontal`, after);
  else line('w-out', `The off-centre hit sends ${who} apart at an angle`, after);
  const elastic = e === 1, equal = Math.abs(m1 - m2) < 1e-9 * Math.max(m1, m2);
  if (explain) {
    if (head && equal && elastic) line('x1', 'Equal masses, elastic: the first ball stops and the second moves on', tEnd);
    else if (!head) {
      if (!(narrow && s.components)) line('x1', `${wantNames ? 'm2' : 'The target'} is pushed along the line of centres; ${wantNames ? 'm1' : 'the other ball'} swerves the other way`, tEnd);
      if (equal && elastic) line('x2', 'Equal masses, elastic: they move off at right angles', tEnd + 0.5, {weight: 700});
    }
    if (!elastic) line('x3', 'Kinetic energy is lost: the collision is inelastic', tEnd + 0.5);
  }
  row += 6 * k;
  const nums: string[] = [];
  if (wantAngles && !head) nums.push(`θ₁ = ${f(theta1, 1)}°, θ₂ = ${f(theta2, 1)}°`);
  if (vel === 'values') nums.push(`v1f = ${f(s1)} m/s, v2f = ${f(s2)} m/s`);
  if (!elastic) nums.push(`e = ${f(e)}: kinetic energy ${f(out.K0)} J before, ${f(out.K1)} J after`);
  if (!(narrow && s.components)) nums.forEach((t, i) => line(`n${i}`, t, tEnd + 0.3, {style: {fill: 'muted'}}));
  if (s.components) {
    line('px', 'Along x: m1v1i = m1v1f cos θ₁ + m2v2f cos θ₂', tEnd + 0.4, {weight: 700});
    line('py', 'Along y: 0 = m1v1f sin θ₁ − m2v2f sin θ₂', tEnd + 0.8, {weight: 700});
    line('pn', `x: ${f(m1 * v1i)} = ${f(m1 * v1f[0])} + ${f(m2 * v2f[0])};  y: 0 = ${f(m1 * v1f[1])} − ${f(-m2 * v2f[1])} (kg m/s)`, tEnd + 1.2, {style: {fill: 'muted'}});
  }
  facts.push(`m1 = ${f(m1)} kg, m2 = ${f(m2)} kg, v1i = ${f(v1i)} m/s, m2 at rest`, `impact parameter b = ${f(b)} of r1 + r2`,
    `θ1 = ${f(theta1, 1)}°, θ2 = ${f(theta2, 1)}°, angle between them ${f(theta1 + theta2, 1)}°`, `v1f = ${f(s1)} m/s, v2f = ${f(s2)} m/s`,
    `momentum along x ${f(m1 * v1i)} kg m/s before and after; along y 0`, `kinetic energy ${f(out.K0)} J before, ${f(out.K1)} J after`);
  const lastText = s.components ? tEnd + 1.2 : tEnd + 0.5;
  const duration = Math.max(tEnd + 2.5, lastText + 2, s.seconds ?? 0);
  return {...scene(s, W, H, duration, plane, props, [], {verb: 'collision_2d', facts, anchors}), planes: [plane]};
}
