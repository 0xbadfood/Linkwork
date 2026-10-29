// Motion in a plane, computed: a mover on its path with its position vector r from the origin, its velocity along the
// tangent, its acceleration and the velocity's x and y parts; the average velocity Δr/Δt turning into the tangent as
// Δt shrinks; and uniform circular motion, whose velocity keeps its size but turns, so Δv points to the centre and
// a = v²/R. Paths: constant acceleration (r0, v0, a: x and y move independently), x(t) and y(t) formulas, or a circle
// (user, 2026-10-29: Class 11 Motion in a Plane had no verb for any of these).
import {exprErrors, fOf, inTime} from '../expr.ts';
import {toScene, type Plane} from '../plane.ts';
import type {Key} from '../keys.ts';
import type {Actor, Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {round} from '../vec.ts';
import {n2, panel, scene, text} from './calculus.ts';
import {frame} from './vectors.ts';

type P2 = [number, number];
export const SHOWS = ['position', 'velocity', 'acceleration', 'components', 'limit', 'delta_v'] as const;
export type PlaneMotionSpec = {verb: 'plane_motion';
  accelerate?: {r0?: P2; v0: P2; a: P2; t: [number, number]};
  formula?: {x: string; y: string; t: [number, number]};
  circle?: {radius: number; speed: number; turns?: number};
  show?: (typeof SHOWS)[number][]; at?: number; dt?: number; unit?: string;
  x?: [number, number]; y?: [number, number]; title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isP = (v: unknown): v is P2 => Array.isArray(v) && v.length === 2 && v.every(isNum);
const f = (v: number) => n2(round(v, 9), Math.abs(v) >= 100 || Number.isInteger(round(v, 9)) ? 0 : 2);

/** r(t), v(t), a(t) and the physical time span of the path. */
function kinematics(s: PlaneMotionSpec) {
  if (s.circle) {
    const {radius: R, speed: v} = s.circle, w = v / R, T = 2 * Math.PI / w;
    return {t0: 0, t1: (s.circle.turns ?? 1) * T,
      r: (t: number): P2 => [R * Math.cos(w * t), R * Math.sin(w * t)],
      v: (t: number): P2 => [-v * Math.sin(w * t), v * Math.cos(w * t)],
      a: (t: number): P2 => [-v * w * Math.cos(w * t), -v * w * Math.sin(w * t)]};
  }
  if (s.accelerate) {
    const {r0 = [0, 0], v0, a, t} = s.accelerate;
    return {t0: t[0], t1: t[1],
      r: (u: number): P2 => [r0[0] + v0[0] * u + a[0] * u * u / 2, r0[1] + v0[1] * u + a[1] * u * u / 2],
      v: (u: number): P2 => [v0[0] + a[0] * u, v0[1] + a[1] * u], a: (): P2 => [a[0], a[1]]};
  }
  const fx = fOf(inTime(s.formula!.x)), fy = fOf(inTime(s.formula!.y)), h = 1e-4;
  const r = (t: number): P2 => [fx(t), fy(t)];
  const v = (t: number): P2 => [(fx(t + h) - fx(t - h)) / (2 * h), (fy(t + h) - fy(t - h)) / (2 * h)];
  return {t0: s.formula!.t[0], t1: s.formula!.t[1], r, v,
    a: (t: number): P2 => { const p = v(t + h), q = v(t - h); return [(p[0] - q[0]) / (2 * h), (p[1] - q[1]) / (2 * h)]; }};
}

const DV_ANGLES = [Math.PI / 3, Math.PI / 6, Math.PI / 12];

/** Where the velocity triangle goes (its common tail H, beside the circle), the drawn length per m/s, and every point
 * it reaches. */
function hodograph(R: number, v: number, at: number, vel: (t: number) => P2) {
  const H: P2 = [2.1 * R, 0], scale = 0.8 * R / v, w = v / R;
  const points: P2[] = [H, ...[0, ...DV_ANGLES].map(th => { const u = vel(at + th / w); return [H[0] + u[0] * scale, H[1] + u[1] * scale] as P2; })];
  return {H, scale, points};
}

export function planeMotionErrors(s: PlaneMotionSpec): string[] {
  const e: string[] = [], ways = [s.accelerate, s.formula, s.circle].filter(Boolean).length;
  if (ways !== 1) return ['plane_motion: give exactly one path: accelerate {r0?, v0, a, t}, formula {x, y, t} (formulas of t) or circle {radius, speed}'];
  if (s.accelerate && (!isP(s.accelerate.v0) || !isP(s.accelerate.a) || (s.accelerate.r0 !== undefined && !isP(s.accelerate.r0))))
    e.push('plane_motion: accelerate has v0 and a as [x, y] (and r0, default [0, 0])');
  if (s.formula) {
    e.push(...exprErrors(inTime(String(s.formula.x ?? '')), ['x'], 'plane_motion: formula.x'), ...exprErrors(inTime(String(s.formula.y ?? '')), ['x'], 'plane_motion: formula.y'));
  }
  const span = s.accelerate?.t ?? s.formula?.t;
  if (span !== undefined && !(isP(span) && span[1] > span[0])) e.push('plane_motion: t is [start, end] seconds, end after start');
  if (s.circle && !(isNum(s.circle.radius) && s.circle.radius > 0 && isNum(s.circle.speed) && s.circle.speed > 0))
    e.push('plane_motion: circle has radius > 0 and speed > 0');
  if (s.circle?.turns !== undefined && !(isNum(s.circle.turns) && s.circle.turns > 0 && s.circle.turns <= 3)) e.push('plane_motion: circle.turns is above 0, at most 3');
  for (const x of s.show ?? []) if (!SHOWS.includes(x)) e.push(`plane_motion: show items are ${SHOWS.join(', ')}`);
  if ((s.show ?? []).includes('delta_v') && !s.circle) e.push('plane_motion: delta_v is for a circle (uniform circular motion)');
  if (e.length) return e;
  const k = kinematics(s);
  if (s.at !== undefined && !(isNum(s.at) && s.at >= k.t0 && s.at < k.t1)) e.push(`plane_motion: at is a time inside the path, ${f(k.t0)} to ${f(k.t1)} s`);
  if (s.dt !== undefined && !(isNum(s.dt) && s.dt > 0 && (s.at ?? (k.t0 + k.t1) / 2) + s.dt <= k.t1)) e.push('plane_motion: dt is above 0 and at + dt stays inside the path');
  for (let i = 0; i <= 60; i++) { const p = k.r(k.t0 + (k.t1 - k.t0) * i / 60); if (!p.every(isNum)) { e.push('plane_motion: the path is undefined somewhere in t'); break; } }
  return e;
}

export function planeMotion(s: PlaneMotionSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, u = s.unit ?? 'm';
  const kin = kinematics(s), {t0, t1} = kin, show = new Set(s.show ?? (s.circle ? ['velocity', 'acceleration'] : ['position', 'velocity']));
  const samples = Array.from({length: 121}, (_, i) => t0 + (t1 - t0) * i / 120), path = samples.map(kin.r);
  const vmax = Math.max(...samples.map(t => Math.hypot(...kin.v(t))), 1e-9), amax = Math.max(...samples.map(t => Math.hypot(...kin.a(t))), 0);
  // the window: the path and the origin, with room for arrows, at equal scale across and up
  const fr = frame(W, H, k, s.title), narrow = W < 1.3 * H;
  // a half-width part keeps a shorter drawing and smaller lines, so its readouts and sentences stay above the captions
  const box: [number, number, number, number] = narrow ? [fr.box[0], fr.box[1], fr.box[2], fr.box[1] + 0.3 * H] : fr.box, lineSize = (narrow ? 25 : 30) * k;
  // delta_v draws the velocity triangle apart, to the right of the circle, as the book does (Fig. 3.18): it is in the window
  const dvAt = s.circle ? s.at ?? Math.PI / 4 / (s.circle.speed / s.circle.radius) : 0;
  const hodo = show.has('delta_v') && s.circle ? hodograph(s.circle.radius, s.circle.speed, dvAt, kin.v) : undefined;
  const reach = [...path, ...(hodo?.points ?? [])];
  let [x0, x1] = s.x ?? [Math.min(0, ...reach.map(p => p[0])), Math.max(0, ...reach.map(p => p[0]))];
  let [y0, y1] = s.y ?? [Math.min(0, ...reach.map(p => p[1])), Math.max(0, ...reach.map(p => p[1]))];
  const size = Math.max(x1 - x0, y1 - y0, 1e-6), vs = 0.2 * size / vmax, as = amax > 1e-9 ? 0.16 * size / amax : 0;
  if (!s.x) { x0 -= 0.25 * size; x1 += 0.25 * size; }
  if (!s.y) { y0 -= 0.25 * size; y1 += 0.25 * size; }
  const per = Math.max((x1 - x0) / (box[2] - box[0]), (y1 - y0) / (box[3] - box[1])), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const plane: Plane = {id: 'p', x: [cx - per * (box[2] - box[0]) / 2, cx + per * (box[2] - box[0]) / 2], y: [cy - per * (box[3] - box[1]) / 2, cy + per * (box[3] - box[1]) / 2], box};
  const span = plane.x[1] - plane.x[0], step = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500].find(v => span / v <= 14) ?? 1000;
  const px = fr.px, ptext = panel(W, k);
  const props: Prop[] = [{id: 'axes', type: 'axes', plane: 'p', step: [step, step], size: 22 * k, grid: true, names: ['x', 'y']}];
  let row = narrow ? box[3] + 50 * k : fr.row;
  props.push(...fr.titles);
  const line = (id: string, t: string, at: number, extra: Partial<Prop> = {}, until = 1e9) => {
    props.push(ptext(id, px, row, t, lineSize, {show: [at, until], ...extra}));
    return wrapText(t, lineSize, W - px - 40 * k).length * 1.3 * lineSize + 6 * k;
  };
  const facts: string[] = [];

  // Physical time on screen: the motion plays in 4 to 10 s, from 0.6 s.
  const D = Math.min(10, Math.max(4, t1 - t0)), lead = 0.6, tau = (t: number) => lead + (t - t0) * D / (t1 - t0);
  const ts = Array.from({length: Math.ceil(D * 15) + 1}, (_, i) => t0 + (t1 - t0) * i / Math.ceil(D * 15));
  const keyed = (g: (t: number) => number): Key[] => ts.map((t, i) => (i ? [tau(t), g(t), 'linear'] : [tau(t), g(t)]) as Key);
  const mover: Actor = {id: 'mover', rig: 'dot', at: toScene(plane, path[0]), scale: 1.3 * k, layer: 3,
    base: ts.map((t, i) => ({t: tau(t), at: toScene(plane, kin.r(t)), ...(i ? {ease: 'linear' as const} : {})}))};
  props.push({id: 'path', type: 'polyline', plane: 'p', points: path, style: {stroke: 'muted', width: 3 * k, dash: [10 * k, 8 * k], opacity: 0.7}} as Prop);
  if (s.circle) props.push({id: 'centre', type: 'circle', plane: 'p', x: 0, y: 0, r: 6 * k, style: {fill: 'ink'}} as Prop);
  // with nothing after the motion, its last frame holds; else the arrows and readouts make way for the construction
  const after = show.has('limit') || (show.has('delta_v') && !!s.circle), hold = after ? tau(t1) + 0.01 : 1e9;
  const moving = (id: string, from: (t: number) => P2, to: (t: number) => P2, stroke: string, width = 5, until = hold): Prop =>
    ({id, type: 'arrow', plane: 'p', x1: from(t0)[0], y1: from(t0)[1], x2: to(t0)[0], y2: to(t0)[1], head: 18 * k,
      keys: {x1: keyed(t => from(t)[0]), y1: keyed(t => from(t)[1]), x2: keyed(t => to(t)[0]), y2: keyed(t => to(t)[1])},
      style: {stroke, width: width * k}, show: [lead, until], fade: 0.2} as Prop);
  const plus = (p: P2, q: P2, m = 1): P2 => [p[0] + m * q[0], p[1] + m * q[1]];
  const legend: [string, string][] = [];
  if (show.has('position')) { props.push(moving('r', () => [0, 0], kin.r, 'accent')); legend.push(['r: position vector, from O', 'accent']); }
  if (show.has('velocity')) { props.push(moving('v', kin.r, t => plus(kin.r(t), kin.v(t), vs), 'cool')); legend.push(['v: velocity, along the tangent', 'cool']); }
  if (show.has('components')) {
    props.push(moving('vx', kin.r, t => plus(kin.r(t), [kin.v(t)[0], 0], vs), 'cool', 3), moving('vy', kin.r, t => plus(kin.r(t), [0, kin.v(t)[1]], vs), 'good', 3));
    legend.push(['vx and vy: the velocity\'s x and y parts', 'good']);
  }
  if (show.has('acceleration') && as > 0) { props.push(moving('a', kin.r, t => plus(kin.r(t), kin.a(t), as), 'bad')); legend.push([s.circle ? 'a: acceleration, towards the centre' : 'a: acceleration', 'bad']); }
  legend.forEach(([t, c], i) => { row += line(`legend${i}`, t, lead, {style: {fill: c}}); });
  // live readouts during the motion
  const ro = (id: string, t: string, measures: Record<string, Key[]>) => {
    props.push({id, type: 'readout', x: px, y: row, size: lineSize, text: t, decimals: 2, show: [lead, hold],
      measures: Object.fromEntries(Object.entries(measures).map(([n, keys]) => [n, {kind: 'keys', keys}]))} as Prop);
    row += 1.35 * lineSize;
  };
  row += 8 * k;
  ro('ro-t', 't = {t} s', {t: keyed(t => t)});
  ro('ro-r', `r = ({x}, {y}) ${u}`, {x: keyed(t => kin.r(t)[0]), y: keyed(t => kin.r(t)[1])});
  ro('ro-v', `v = ({vx}, {vy}) ${u}/s`, {vx: keyed(t => kin.v(t)[0]), vy: keyed(t => kin.v(t)[1])});
  ro('ro-s', `speed |v| = {sp} ${u}/s`, {sp: keyed(t => Math.hypot(...kin.v(t)))});
  const motionRow = row;
  if (s.accelerate) {
    const {v0, a} = s.accelerate;
    row += line('eqx', `x and y move independently: vx = ${f(v0[0])} + ${f(a[0])}t, vy = ${f(v0[1])} + ${f(a[1])}t`, lead + 1, {style: {fill: 'muted'}}, hold);
    facts.push(`a = (${f(a[0])}, ${f(a[1])}) ${u}/s²`, `at t = ${f(t1)} s: r = (${f(kin.r(t1)[0])}, ${f(kin.r(t1)[1])}) ${u}, v = (${f(kin.v(t1)[0])}, ${f(kin.v(t1)[1])}) ${u}/s`);
  }
  if (s.circle) {
    const {radius: R, speed: v} = s.circle, w = v / R;
    row += line('c1', `ω = v / R = ${f(w)} rad/s;  T = 2πR / v = ${f(2 * Math.PI / w)} s`, lead + 1, {}, hold);
    row += line('c2', `|v| stays ${f(v)} ${u}/s; its direction turns: a = v²/R = ${f(v * v / R)} ${u}/s², towards the centre`, lead + 2, {weight: 700}, hold);
    facts.push(`speed v = ${f(v)} ${u}/s`, `radius R = ${f(R)} ${u}`, `angular speed ω = ${f(w)} rad/s`, `period T = ${f(2 * Math.PI / w)} s`,
      `centripetal acceleration a = v²/R = ${f(v * v / R)} ${u}/s²`, `frequency ν = ${f(w / (2 * Math.PI))} per second`);
  }
  let end = tau(t1) + 0.8;

  // Δt shrinking: the average velocity Δr/Δt turns into the velocity along the tangent
  if (show.has('limit')) {
    const at = s.at ?? (t0 + t1) / 2, P = kin.r(at), first = s.dt ?? Math.min((t1 - t0) / 2, t1 - at);
    const steps = [first, first / 2, first / 4, first / 8], begin = end, each = 1.6;
    row = motionRow;
    props.push({id: 'P', type: 'circle', plane: 'p', x: P[0], y: P[1], r: 7 * k, style: {fill: 'ink'}, show: [begin, 1e9]} as Prop);
    const [sx, sy] = toScene(plane, P);
    props.push(text('lP', sx - 18 * k, sy - 14 * k, 'P', 30 * k, {weight: 700, align: 'end', show: [begin, 1e9]}));
    // in words as well, for an illustrative scene, which hides every line with a number in it
    row += line('dtw', 'Δt halves at each step: the average velocity Δr/Δt turns towards the tangent at P', begin, {}, 1e9);
    steps.forEach((dt, i) => {
      const Q = kin.r(at + dt), dr: P2 = [Q[0] - P[0], Q[1] - P[1]], vbar: P2 = [dr[0] / dt, dr[1] / dt], on = begin + each * i, off = begin + each * (i + 1);
      props.push({id: `Q${i}`, type: 'circle', plane: 'p', x: Q[0], y: Q[1], r: 6 * k, style: {fill: 'muted'}, show: [on, off]} as Prop,
        {id: `dr${i}`, type: 'arrow', plane: 'p', x1: P[0], y1: P[1], x2: Q[0], y2: Q[1], head: 14 * k, style: {stroke: 'accent', width: 4 * k}, show: [on, off]} as Prop,
        {id: `vbar${i}`, type: 'arrow', plane: 'p', x1: P[0], y1: P[1], x2: P[0] + vbar[0] * vs, y2: P[1] + vbar[1] * vs, head: 18 * k, style: {stroke: 'cool', width: 5 * k, dash: [10 * k, 6 * k]}, show: [on, off]} as Prop);
      line(`dt${i}`, `Δt = ${f(dt)} s: Δr/Δt = (${f(vbar[0])}, ${f(vbar[1])}) ${u}/s`, on, {style: {fill: 'cool'}}, off);
    });
    const vP = kin.v(at), fin = begin + each * steps.length;
    props.push({id: 'vP', type: 'arrow', plane: 'p', x1: P[0], y1: P[1], x2: P[0] + vP[0] * vs, y2: P[1] + vP[1] * vs, head: 20 * k, style: {stroke: 'cool', width: 6 * k}, show: [fin, 1e9]} as Prop);
    row += 1.35 * lineSize;
    row += line('vlimw', 'As Δt shrinks, Δr/Δt becomes the velocity v, along the tangent at P', fin, {weight: 700});
    line('vlim', `v = (${f(vP[0])}, ${f(vP[1])}) ${u}/s at t = ${f(at)} s`, fin, {weight: 700});
    facts.push(`at t = ${f(at)} s the velocity is (${f(vP[0])}, ${f(vP[1])}) ${u}/s, speed ${f(Math.hypot(...vP))} ${u}/s`);
    end = fin + 2.2;
  }

  // uniform circular motion, the book's two triangles (Fig. 3.18): r, r′ and Δr in the circle, and beside it v and v′
  // from one tail with Δv between their heads; both turn through Δθ, so they are similar and Δv points to the centre.
  // Named in letters an illustrative scene keeps (2026-10-29: drawn at P at the motion's arrow scale, the triangles were
  // specks in a half-width part, and every line with a number in it was hidden).
  if (hodo && s.circle) {
    const {radius: R, speed: v} = s.circle, w = v / R, at = dvAt, begin = end, each = 2.4, {H, scale: vd} = hodo;
    row = motionRow;
    const P = kin.r(at), v1 = kin.v(at), O: P2 = [0, 0], tip1 = plus(H, v1, vd), d = 32 * k * (plane.x[1] - plane.x[0]) / (box[2] - box[0]);
    const unit = (p: P2): P2 => { const l = Math.hypot(...p) || 1; return [p[0] / l, p[1] / l]; };
    const turn = (p: P2, side: number): P2 => { const q = unit(p); return [side * q[1], -side * q[0]]; };   // side 1: clockwise
    const mid = (p: P2, q: P2): P2 => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    // a name at p, pushed d along the plane direction n
    const name = (id: string, p: P2, n: P2, t: string, fill: string, on: number, off: number) => {
      const [x, y] = toScene(plane, [p[0] + n[0] * d, p[1] + n[1] * d]);
      props.push(text(id, x, y + 10 * k, t, 30 * k, {weight: 700, align: 'middle', style: {fill}, show: [on, off]}));
    };
    const arrow = (id: string, p: P2, q: P2, stroke: string, on: number, off: number, width = 5, extra: Partial<Prop> = {}): Prop =>
      ({id, type: 'arrow', plane: 'p', x1: p[0], y1: p[1], x2: q[0], y2: q[1], head: 16 * k, style: {stroke, width: width * k}, show: [on, off], ...extra} as Prop);
    const tan = 0.35 * R / v;           // v and v′ on the circle, short: the triangle beside it carries the names
    props.push(arrow('r1', O, P, 'accent', begin, 1e9), arrow('v1t', P, plus(P, v1, tan), 'cool', begin, 1e9, 3),
      arrow('v1', H, tip1, 'cool', begin + 0.4, 1e9),
      {id: 'H', type: 'circle', plane: 'p', x: H[0], y: H[1], r: 5 * k, style: {fill: 'ink'}, show: [begin + 0.4, 1e9]} as Prop);
    name('lP', P, unit(P), 'P', 'ink', begin, 1e9);
    name('lr1', mid(O, P), turn(P, 1), 'r', 'accent', begin, 1e9);
    name('lv1', mid(H, tip1), turn(v1, 1), 'v', 'cool', begin + 0.4, 1e9);
    row += line('dvw', 'The triangle of r, r′, Δr and the triangle of v, v′, Δv are similar: both turn through Δθ', begin, {}, 1e9);
    DV_ANGLES.forEach((th, i) => {
      const t2 = at + th / w, Q = kin.r(t2), v2 = kin.v(t2), on = begin + each * i, off = begin + each * (i + 1);
      const tip2 = plus(H, v2, vd), dv: P2 = [v2[0] - v1[0], v2[1] - v1[1]];
      props.push(arrow(`r2-${i}`, O, Q, 'accent', on, off, 4),
        arrow(`dr-${i}`, P, Q, 'ink', on + 0.4, off, 4),
        arrow(`v2t-${i}`, Q, plus(Q, v2, tan), 'good', on, off, 3),
        arrow(`v2-${i}`, H, tip2, 'good', on + 0.8, off, 4),
        arrow(`dv-${i}`, tip1, tip2, 'bad', on + 1.2, off, 5));
      name(`lQ${i}`, Q, unit(Q), 'P′', 'ink', on, off);
      name(`lr2-${i}`, mid(O, Q), turn(Q, -1), 'r′', 'accent', on, off);
      name(`ldr-${i}`, mid(P, Q), unit(mid(P, Q)), 'Δr', 'ink', on + 0.4, off);
      name(`lv2-${i}`, mid(H, tip2), turn(v2, -1), 'v′', 'good', on + 0.8, off);
      name(`ldv-${i}`, mid(tip1, tip2), unit([mid(tip1, tip2)[0] - H[0], mid(tip1, tip2)[1] - H[1]]), 'Δv', 'bad', on + 1.2, off);
      line(`dvt${i}`, `Δθ = ${f(th * 180 / Math.PI)}°: |Δv| = ${f(Math.hypot(...dv))} ${u}/s; |Δv|/Δt = ${f(Math.hypot(...dv) / (th / w))} ${u}/s²`, on, {style: {fill: 'bad'}}, off);
    });
    const fin = begin + each * DV_ANGLES.length, a = kin.a(at), aTip = plus(P, a, 0.6 * R / (v * w));
    props.push(arrow('aP', P, aTip, 'bad', fin, 1e9, 6));
    name('laP', mid(P, aTip), turn(a, 1), 'a', 'bad', fin, 1e9);
    row += 1.35 * lineSize;
    row += line('alimw', 'As Δt shrinks, Δv points at the centre: the acceleration is centripetal', fin, {weight: 700});
    line('alim', `a = v²/R = ${f(v * v / R)} ${u}/s²`, fin, {weight: 700});
    end = fin + 2.2;
  }
  // after the motion the mover steps aside for the Δt and Δv constructions
  if (end > tau(t1) + 0.9) mover.show = [0, tau(t1) + 0.6];
  return {...scene(s, W, H, end, plane, props, [mover], {verb: 'plane_motion', facts}), planes: [plane]};
}
