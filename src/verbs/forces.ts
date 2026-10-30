// forces: a free-body diagram, computed. A body (block, ball, car or a point such as a knot in a rope) on a floor, on an
// incline or in the air, with the forces on it drawn to scale from it: its weight mg, the normal force, tension, friction,
// a push or pull. Unknown forces are solved by Newton's second law: with the body's acceleration a given (a = [0, 0] for
// rest or uniform motion), up to two unknown sizes, or one force unknown in size and direction, make the sum equal ma;
// without a, the normal force alone is solved (the body neither sinks into the surface nor leaves it) and the net force
// gives a = F/m. Shown as asked: each force's components (along and across the slope on an incline), the net force, and
// the forces head to tail (a closed triangle when they balance, the book's Fig. 4.7).
// A ramp shows friction at work (Fig. 4.10): a push growing from zero, static friction matching it up to µs N, then the
// block slipping with kinetic friction µk N; or a plane tilted slowly until the block slips at tan θ = µs (Example 4.6).
// (user, 2026-10-29: Class 11 Laws of Motion had no verb for forces on a body.)
import type {Key} from '../keys.ts';
import type {Plane} from '../plane.ts';
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {round} from '../vec.ts';
import {n2, panel, scene, text} from './calculus.ts';
import {frame} from './vectors.ts';

type P2 = [number, number];
export const KINDS = ['weight', 'normal', 'friction', 'tension', 'applied', 'spring', 'other'] as const;
export const DIRS = ['up', 'down', 'left', 'right', 'normal', 'up_slope', 'down_slope'] as const;
export const BODIES = ['block', 'ball', 'car', 'point'] as const;
export const SHOWS = ['components', 'net', 'triangle'] as const;
type Dir = number | (typeof DIRS)[number];
export type ForceItem = {name: string; kind?: (typeof KINDS)[number]; magnitude?: number; direction?: Dir};
export type ForcesSpec = {verb: 'forces'; body?: (typeof BODIES)[number]; label?: string; mass?: number; g?: number;
  surface?: 'none' | 'floor' | 'incline'; angle?: number; forces?: ForceItem[]; a?: P2; show?: (typeof SHOWS)[number][];
  ramp?: {kind: 'push' | 'tilt'; mu_s: number; mu_k?: number; to?: number};
  title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};

/** An illustrative diagram hides every number, so a mass it never states may stand in (2026-10-29: plans for "a book
 * at rest", with no mass in the narration, were refused round after round for want of one). */
const fill = (s: ForcesSpec): ForcesSpec => (s.illustrative && s.mass === undefined ? {...s, mass: 1} : s);

const DEG = Math.PI / 180;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const f = (v: number) => n2(round(v, 9), Math.abs(v) >= 100 || Number.isInteger(round(v, 9)) ? 0 : 2);
const COLOURS: Record<string, string> = {weight: 'accent', normal: 'cool', friction: 'bad', tension: 'good', applied: 'figure', spring: 'good', other: 'ink'};
const DEFAULT_DIR: Partial<Record<string, Dir>> = {weight: 'down', normal: 'normal'};

/** A direction as a unit vector, x right and y up; the incline rises to the right at θ. */
function unit(d: Dir, theta: number): P2 {
  if (isNum(d)) return [Math.cos(d * DEG), Math.sin(d * DEG)];
  const c = Math.cos(theta), s = Math.sin(theta);
  return ({up: [0, 1], down: [0, -1], left: [-1, 0], right: [1, 0], normal: [-s, c], up_slope: [c, s], down_slope: [-c, -s]} as Record<string, P2>)[d];
}

type Solved = {name: string; kind: string; size: number; u: P2; solved: boolean; flipped: boolean};

/** Every force's size and direction, unknowns solved; or the reason they cannot be. */
function solve(s: ForcesSpec): {forces: Solved[]; net: P2; errors: string[]} {
  const theta = (s.surface === 'incline' ? s.angle ?? 30 : 0) * DEG, m = s.mass ?? 0, g = s.g ?? 9.8;
  const out: Solved[] = [], unknown: number[] = [], errors: string[] = [];
  let free = -1;
  for (const [i, x] of (s.forces ?? []).entries()) {
    const kind = x.kind ?? 'other', d = x.direction ?? DEFAULT_DIR[kind];
    let size = x.magnitude;
    if (size === undefined && kind === 'weight' && m > 0) size = m * g;
    out.push({name: x.name, kind, size: size ?? NaN, u: d === undefined ? [0, 0] : unit(d, theta), solved: size === undefined, flipped: false});
    if (size === undefined) { if (d === undefined) free = i; else unknown.push(i); }
  }
  const sum = (skip: Set<number>): P2 => out.reduce((acc, x, i) => (skip.has(i) ? acc : [acc[0] + x.size * x.u[0], acc[1] + x.size * x.u[1]]), [0, 0] as P2);
  if (s.a === undefined) {
    // no acceleration given: only a normal force is solved, from no motion across the surface
    for (const i of unknown) if (out[i].kind !== 'normal') errors.push(`forces: ${out[i].name} has no magnitude; give it, or give a (the body's acceleration, [0, 0] when it is at rest or moves uniformly) so it is solved`);
    if (free >= 0) errors.push(`forces: ${out[free].name} has neither magnitude nor direction; give a (the body's acceleration) so it is solved`);
    if (errors.length) return {forces: out, net: [0, 0], errors};
    const rest = sum(new Set(unknown));
    for (const i of unknown) out[i].size = Math.max(0, -(rest[0] * out[i].u[0] + rest[1] * out[i].u[1]));
    return {forces: out, net: sum(new Set()), errors};
  }
  if (!(m > 0) && (s.a[0] || s.a[1])) return {forces: out, net: [0, 0], errors: ['forces: an acceleration needs the mass (mass in kg)']};
  const target: P2 = [m * s.a[0], m * s.a[1]];
  if (free >= 0) {
    if (unknown.length) return {forces: out, net: [0, 0], errors: [`forces: ${out[free].name} is unknown in size and direction, so every other force needs its magnitude`]};
    const rest = sum(new Set([free])), F: P2 = [target[0] - rest[0], target[1] - rest[1]], size = Math.hypot(...F);
    out[free] = {...out[free], size, u: size > 1e-12 ? [F[0] / size, F[1] / size] : [0, 1]};
  } else if (unknown.length === 1) {
    const i = unknown[0], rest = sum(new Set([i])), R: P2 = [target[0] - rest[0], target[1] - rest[1]], u = out[i].u;
    const along = R[0] * u[0] + R[1] * u[1], across = Math.abs(R[0] * -u[1] + R[1] * u[0]);
    if (across > 1e-6 * Math.max(1, Math.hypot(...R)))
      return {forces: out, net: [0, 0], errors: [`forces: ${out[i].name} alone cannot give the acceleration: ${f(across)} N is left across it; leave a second force's magnitude unknown (friction along a slope), or change a`]};
    out[i].size = along;
  } else if (unknown.length === 2) {
    const [i, j] = unknown, rest = sum(new Set(unknown)), R: P2 = [target[0] - rest[0], target[1] - rest[1]], u = out[i].u, v = out[j].u;
    const det = u[0] * v[1] - u[1] * v[0];
    if (Math.abs(det) < 1e-9) return {forces: out, net: [0, 0], errors: [`forces: ${out[i].name} and ${out[j].name} are parallel, so their sizes cannot both be found; give one`]};
    out[i].size = (R[0] * v[1] - R[1] * v[0]) / det;
    out[j].size = (u[0] * R[1] - u[1] * R[0]) / det;
  } else if (unknown.length > 2) return {forces: out, net: [0, 0], errors: ['forces: at most two magnitudes can be unknown (two equations: across and up)']};
  else {
    const net = sum(new Set());
    if (Math.hypot(net[0] - target[0], net[1] - target[1]) > 1e-6 * Math.max(1, Math.hypot(...net)))
      return {forces: out, net, errors: [`forces: the forces add to (${f(net[0])}, ${f(net[1])}) N but m a is (${f(target[0])}, ${f(target[1])}) N; leave a magnitude out to be solved, or leave a out`]};
  }
  // a solved size below zero: the force points the other way
  for (const x of out) if (x.size < 0) { x.size = -x.size; x.u = [-x.u[0], -x.u[1]]; x.flipped = true; }
  return {forces: out, net: sum(new Set()), errors};
}

export function forcesErrors(spec: ForcesSpec): string[] {
  const s = fill(spec);
  const e: string[] = [];
  if (s.body !== undefined && !BODIES.includes(s.body)) e.push(`forces: body is one of ${BODIES.join(', ')}`);
  if (s.surface !== undefined && !['none', 'floor', 'incline'].includes(s.surface)) e.push('forces: surface is none, floor or incline');
  if (s.angle !== undefined && !(isNum(s.angle) && s.angle >= 5 && s.angle <= 75)) e.push('forces: angle (the incline) is 5 to 75 degrees');
  if (s.mass !== undefined && !(isNum(s.mass) && s.mass > 0)) e.push('forces: mass is in kg, above 0');
  if (s.g !== undefined && !(isNum(s.g) && s.g > 0)) e.push('forces: g is above 0 (default 9.8)');
  if (s.a !== undefined && !(Array.isArray(s.a) && s.a.length === 2 && s.a.every(isNum))) e.push('forces: a is the acceleration [ax, ay] in m/s² ([0, 0]: at rest or moving uniformly)');
  for (const x of s.show ?? []) if (!SHOWS.includes(x)) e.push(`forces: show items are ${SHOWS.join(', ')}`);
  if (s.ramp) {
    const r = s.ramp;
    if (!['push', 'tilt'].includes(r.kind)) e.push('forces: ramp.kind is push (a growing push on a floor) or tilt (a plane tilted until the block slips)');
    if (!(isNum(r.mu_s) && r.mu_s > 0 && r.mu_s < 2)) e.push('forces: ramp.mu_s (coefficient of static friction) is above 0, below 2');
    if (r.mu_k !== undefined && !(isNum(r.mu_k) && r.mu_k >= 0 && r.mu_k <= r.mu_s)) e.push('forces: ramp.mu_k is at least 0 and at most mu_s (kinetic friction is less than limiting static friction)');
    if (!(isNum(s.mass) && s.mass > 0)) e.push('forces: a ramp needs the mass (kg)');
    if (r.kind === 'push' && !(isNum(r.to) && r.to > 0)) e.push('forces: ramp.to is the largest push in N');
    if (r.kind === 'tilt' && r.to !== undefined && !(isNum(r.to) && r.to > 0 && r.to <= 75)) e.push('forces: ramp.to is the steepest angle, up to 75 degrees');
    if (r.kind === 'tilt' && Math.atan(r.mu_s) / DEG > 70) e.push('forces: with this mu_s the block slips only above 70°; take mu_s below 2.7');
    if (s.forces?.length) e.push('forces: a ramp draws its own forces (weight, normal, push, friction); leave forces out');
    return e;
  }
  if (!Array.isArray(s.forces) || !s.forces.length || s.forces.length > 6) return [...e, 'forces: forces is 1 to 6 forces {name, kind?, magnitude?, direction?}'];
  const names = new Set<string>();
  for (const x of s.forces) {
    if (typeof x?.name !== 'string' || !x.name || x.name.length > 6) e.push('forces: each force has a short name (W, N, T1, f, F)');
    else if (names.has(x.name)) e.push(`forces: two forces are named ${x.name}`); else names.add(x.name);
    if (x.kind !== undefined && !KINDS.includes(x.kind)) e.push(`forces: kind is one of ${KINDS.join(', ')}`);
    if (x.magnitude !== undefined && !(isNum(x.magnitude) && x.magnitude >= 0)) e.push(`forces: ${x.name}'s magnitude is in N, at least 0`);
    if (x.direction !== undefined && !isNum(x.direction) && !DIRS.includes(x.direction))
      e.push(`forces: ${x.name}'s direction is degrees anticlockwise from +x, or one of ${DIRS.join(', ')}`);
    if (['up_slope', 'down_slope'].includes(String(x.direction)) && s.surface !== 'incline') e.push(`forces: ${x.name} is along a slope, so surface is incline`);
    if (x.kind === 'weight' && x.magnitude === undefined && !(isNum(s.mass) && s.mass > 0)) e.push(`forces: ${x.name} is a weight with no magnitude, so give mass (kg): W = mg; or, when the narration states no numbers, set illustrative: true`);
  }
  if (e.length) return e;
  const {forces, errors} = solve(s);
  if (errors.length) return errors;
  if (!forces.some(x => x.size > 1e-9)) e.push('forces: every force is zero');
  // head to tail, forces along one line lie on a line, not a triangle: a stray stroke beside the body (2026-10-29)
  const live = forces.filter(x => x.size > 1e-9);
  if (s.show?.includes('triangle') && live.every(x => Math.abs(x.u[0] * live[0].u[1] - x.u[1] * live[0].u[0]) < 1e-6))
    e.push("forces: these forces all lie along one line, so head to tail they make no triangle; leave 'triangle' out of show (use 'net')");
  if (forces.some(x => x.size > 0 && x.size < 0.02 * Math.max(...forces.map(y => y.size)))) {
    const tiny = forces.find(x => x.size > 0 && x.size < 0.02 * Math.max(...forces.map(y => y.size)))!;
    e.push(`forces: ${tiny.name} is under 2% of the largest force and would not show; leave it out or change the numbers`);
  }
  return e;
}

export function forces(spec: ForcesSpec): Scene {
  const s = fill(spec);
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080;
  const fr = frame(W, H, k, s.title), props: Prop[] = [...fr.titles], facts: string[] = [];
  // a half-width part keeps a shorter drawing and smaller lines, so its readouts and sentences stay above the captions
  const narrow = W < 1.3 * H, box: [number, number, number, number] = narrow ? [fr.box[0], fr.box[1], fr.box[2], fr.box[1] + 0.36 * H] : fr.box;
  const plane: Plane = {id: 'p', x: [0, 1], y: [0, 1], box};
  const px = fr.px, ptext = panel(W, k), fs0 = (narrow ? 26 : 30) * k;
  let row = narrow ? box[3] + 50 * k : fr.row;
  const line = (id: string, t: string, at: number, extra: Partial<Prop> = {}, until = 1e9) => {
    props.push(ptext(id, px, row, t, fs0, {show: [at, until], ...extra}));
    row += wrapText(t, fs0, W - px - 40 * k).length * 1.3 * fs0 + 6 * k;
  };
  const arrow = (id: string, p: P2, q: P2, stroke: string, at: number, width = 6, extra: Partial<Prop> = {}): Prop =>
    ({id, type: 'arrow', x1: p[0], y1: p[1], x2: q[0], y2: q[1], head: 20 * k, style: {stroke, width: width * k}, show: [at, 1e9], fade: 0.3, ...extra} as Prop);
  const label = (id: string, at: P2, t: string, fill: string, from: number, extra: Partial<Prop> = {}) =>
    text(id, at[0], at[1] + 11 * k, t, 32 * k, {weight: 700, align: 'middle', style: {fill}, show: [from, 1e9], ...extra});
  if (s.ramp) return ramp(s, {W, H, k, box, props, facts, plane, px, ptext, label, row});

  const theta = (s.surface === 'incline' ? s.angle ?? 30 : 0) * DEG, m = s.mass, show = new Set(s.show ?? []);
  const {forces: fs, net} = solve(s);
  // the body's region, and the triangle's beside it when asked
  const split = show.has('triangle'), bw = box[2] - box[0], bh = box[3] - box[1];
  const region = split ? [box[0], box[1], box[0] + 0.58 * bw, box[3]] : [box[0], box[1], box[2], box[3]];
  const C: P2 = [(region[0] + region[2]) / 2, (region[1] + region[3]) / 2], room = Math.min(region[2] - region[0], region[3] - region[1]);
  // a half-width part's body is drawn larger: at a fifth of its short drawing, "1 kg" could not be read (C5, 2026-10-30)
  const body = s.body ?? 'block', side = (body === 'point' ? 0 : body === 'ball' ? 0.16 * room : 0.2 * room) * (narrow ? 1.3 : 1);
  const [hx, hy] = body === 'car' ? [0.8 * side, 0.37 * side] : body === 'block' ? [0.5 * side, 0.35 * side] : [side / 2, side / 2];
  // pixels per newton: the longest arrow, from the body's edge, ends inside the region with room for its name
  const big = Math.max(...fs.map(x => x.size), Math.hypot(...net)), L = (0.42 * room - Math.max(hx, hy, 12 * k)) / big;
  const sc = (u: P2, size: number, from: P2 = C): P2 => [from[0] + u[0] * size * L, from[1] - u[1] * size * L];
  // the surface under the body, through its contact point
  const nrm = unit('normal', theta), along = unit('up_slope', theta), lift = side * (body === 'car' ? 0.37 : body === 'block' ? 0.35 : 0.5), contact: P2 = [C[0] - nrm[0] * lift, C[1] + nrm[1] * lift];
  if (s.surface === 'floor' || s.surface === 'incline') {
    const half = 0.48 * (region[2] - region[0]), a: P2 = [contact[0] - along[0] * half, contact[1] + along[1] * half], b: P2 = [contact[0] + along[0] * half, contact[1] - along[1] * half];
    if (s.surface === 'incline') {
      props.push({id: 'slope', type: 'polyline', points: [a, b, [b[0], a[1]]], closed: true, style: {fill: 'faint', stroke: 'muted', width: 3 * k}} as Prop);
      const r = 70 * k, pts: P2[] = Array.from({length: 13}, (_, i) => [a[0] + r * Math.cos(-theta * i / 12), a[1] + r * Math.sin(-theta * i / 12)]);
      props.push({id: 'arc', type: 'polyline', points: pts, style: {stroke: 'muted', width: 2.5 * k}} as Prop,
        text('ltheta', a[0] + (r + 28 * k) * Math.cos(theta / 2), a[1] - (r + 28 * k) * Math.sin(theta / 2) + 10 * k, 'θ', 30 * k, {style: {fill: 'muted'}}));
    } else props.push({id: 'floor', type: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1], style: {stroke: 'muted', width: 4 * k}} as Prop);
  }
  if (body === 'point') props.push({id: 'body', type: 'circle', x: C[0], y: C[1], r: 9 * k, style: {fill: 'ink'}} as Prop);
  else if (body === 'ball') props.push({id: 'body', type: 'circle', x: C[0], y: C[1], r: side / 2, style: {fill: 'faint', stroke: 'ink', width: 4 * k}} as Prop);
  else props.push({id: 'body', type: 'object', name: body, x: contact[0], y: contact[1], size: body === 'car' ? 1.6 * side : side, angle: theta / DEG,
    label: body === 'block' ? s.label ?? (m ? `${f(m)} kg` : undefined) : undefined} as Prop);
  // a rope for each tension, from the body out past the arrow
  for (const [i, x] of fs.entries()) if (x.kind === 'tension') {
    const end = sc(x.u, big * 1.25);
    props.push({id: `rope${i}`, type: 'line', x1: C[0], y1: C[1], x2: end[0], y2: end[1], style: {stroke: 'muted', width: 3 * k, dash: [10 * k, 6 * k]}} as Prop);
  }
  // how far the body reaches from its centre along u: arrows start at its edge, so none runs over the mass written on
  // it (Laws of Motion C1, 2026-10-29: N through "1 kg"); a tension starts at the centre, where its rope is tied
  const edge = (u: P2): number => body === 'point' ? 12 * k : body === 'ball' ? side / 2 + 4 * k
    : Math.min(hx / Math.max(Math.abs(u[0] * along[0] + u[1] * along[1]), 1e-9), hy / Math.max(Math.abs(u[0] * nrm[0] + u[1] * nrm[1]), 1e-9)) + 4 * k;
  const foot = (u: P2): P2 => [C[0] + u[0] * edge(u), C[1] - u[1] * edge(u)];
  // the forces one by one, each named at its head
  const t0 = 0.6, step = 0.9;
  // forces pointing the same way are drawn side by side, not one over the other (Laws of Motion C7, 2026-10-30: the
  // cylinder's push C ran down the block's weight W, its name on W's shaft)
  const same = (i: number) => fs.map((y, j) => j).filter(j => fs[j].size > 1e-9 && Math.hypot(fs[j].u[0] - fs[i].u[0], fs[j].u[1] - fs[i].u[1]) < 1e-6);
  const apart = (i: number, p: P2): P2 => {
    const g = same(i), d = (g.indexOf(i) - (g.length - 1) / 2) * 72 * k, u = fs[i].u;
    return [p[0] + u[1] * d, p[1] + u[0] * d];
  };
  fs.forEach((x, i) => {
    if (x.size < 1e-9) return;
    const from = apart(i, x.kind === 'tension' ? C : foot(x.u)), at = t0 + step * i, tip = sc(x.u, x.size, from), name = sc(x.u, x.size + 34 * k / L, from);
    props.push(arrow(`F${i}`, from, tip, COLOURS[x.kind], at), label(`lF${i}`, name, x.name, COLOURS[x.kind], at));
    const how = x.kind === 'weight' && m && !(s.forces ?? [])[i].magnitude ? `${x.name === 'mg' ? '' : ' = mg'} = ${f(m)} × ${f(s.g ?? 9.8)}` : '';
    line(`v${i}`, `${x.name}${how} = ${f(x.size)} N${x.solved ? ' (solved)' : ''}${x.flipped ? ', pointing the other way' : ''}`, at, {style: {fill: COLOURS[x.kind]}});
    facts.push(`${x.name} = ${f(x.size)} N${x.solved ? ', solved by the second law' : ''}`);
  });
  let next = t0 + step * fs.length + 0.4;
  // components: along and across the slope on an incline, else across and up
  if (show.has('components')) {
    const [e1, e2] = s.surface === 'incline' ? [along, nrm] : [[1, 0] as P2, [0, 1] as P2];
    const [n1, n2] = s.surface === 'incline' ? ['along the slope', 'across it'] : ['x', 'y'];
    row += 6 * k;
    fs.forEach((x, i) => {
      if (x.size < 1e-9) return;
      const c1 = x.size * (x.u[0] * e1[0] + x.u[1] * e1[1]), c2 = x.size * (x.u[0] * e2[0] + x.u[1] * e2[1]);
      if (Math.abs(c1) < 1e-6 * x.size || Math.abs(c2) < 1e-6 * x.size) return;      // already along an axis
      const p1 = sc(e1, c1), p2 = sc(e2, c2), style = {stroke: COLOURS[x.kind], width: 3 * k, dash: [8 * k, 6 * k], opacity: 0.8};
      props.push(arrow(`c${i}a`, C, p1, COLOURS[x.kind], next, 3, {style}), arrow(`c${i}b`, C, p2, COLOURS[x.kind], next, 3, {style}));
      line(`cv${i}`, `${x.name}: ${f(c1)} N ${n1}, ${f(c2)} N ${n2}`, next, {style: {fill: COLOURS[x.kind]}});
      facts.push(`${x.name} has ${f(c1)} N ${n1} and ${f(c2)} N ${n2}`);
      next += 0.6;
    });
    next += 0.4;
  }
  // the net force and what it does
  const size = Math.hypot(...net), rest = size < 1e-6 * big;
  row += 6 * k;
  if (show.has('net') || rest) {
    if (!rest) {
      // from beyond the body's edge, shifted to one side: clear of the forces at its centre (a horizontal net drawn
      // below the body ran down the weight, Laws of Motion C1 2026-10-29) and of one it runs along (a lift's N)
      const u: P2 = [net[0] / size, net[1] / size], d = 60 * k, e0 = edge(u) + 24 * k;
      const o: P2 = [C[0] + u[0] * e0 + Math.abs(u[1]) * d, C[1] - u[1] * e0 - Math.abs(u[0]) * d], tip = sc(u, size, o);
      const mid: P2 = [(o[0] + tip[0]) / 2 + Math.abs(u[1]) * 44 * k, (o[1] + tip[1]) / 2 - Math.abs(u[0]) * 46 * k];
      props.push(arrow('net', o, tip, 'ink', next, 7, {style: {stroke: 'ink', width: 7 * k, dash: [14 * k, 8 * k]}}), label('lnet', mid, 'net', 'ink', next));
    }
    line('netw', rest ? 'The forces add to zero: no acceleration (at rest, or moving at a steady velocity)' : 'The net force is not zero: the body accelerates along it', next, {weight: 700});
    line('netv', rest ? 'Net force = 0' : `Net force = ${f(size)} N${m ? `, so a = F / m = ${f(size)} / ${f(m)} = ${f(size / m)} m/s²` : ''}`, next, {weight: 700});
    facts.push(rest ? 'the net force is zero' : `the net force is ${f(size)} N${m ? `; a = ${f(size / m)} m/s²` : ''}`);
    next += 1.2;
  }
  // the forces head to tail: they close when they balance
  if (split) {
    const r2 = [box[0] + 0.62 * bw, box[1] + 0.1 * bh, box[2], box[3] - 0.1 * bh];
    const pts: P2[] = [[0, 0]];
    for (const x of fs) { const p = pts[pts.length - 1]; pts.push([p[0] + x.u[0] * x.size, p[1] + x.u[1] * x.size]); }
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1e-9);
    const s2 = 0.85 * Math.min(r2[2] - r2[0], r2[3] - r2[1]) / span, mid: P2 = [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2];
    const at2 = (p: P2): P2 => [(r2[0] + r2[2]) / 2 + (p[0] - mid[0]) * s2, (r2[1] + r2[3]) / 2 - (p[1] - mid[1]) * s2];
    fs.forEach((x, i) => {
      if (x.size < 1e-9) return;
      const a = at2(pts[i]), b = at2(pts[i + 1]), when = next + 0.7 * i, len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      props.push(arrow(`t${i}`, a, b, COLOURS[x.kind], when, 5));
      props.push(label(`lt${i}`, [(a[0] + b[0]) / 2 + (b[1] - a[1]) / len * 28 * k, (a[1] + b[1]) / 2 - (b[0] - a[0]) / len * 28 * k], x.name, COLOURS[x.kind], when));
    });
    next += 0.7 * fs.length;
    line('triw', rest ? 'Head to tail, the forces close a triangle: they add to zero' : 'Head to tail, the forces do not close: the gap is the net force', next, {weight: 700});
    if (!rest) props.push(arrow('tnet', at2(pts[0]), at2(pts[pts.length - 1]), 'ink', next, 4, {style: {stroke: 'ink', width: 4 * k, dash: [10 * k, 6 * k]}}));
    next += 1;
  }
  return scene(s, W, H, next + 2.4, plane, props, [], {verb: 'forces', facts});
}

type Kit = {W: number; H: number; k: number; box: [number, number, number, number]; props: Prop[]; facts: string[]; plane: Plane;
  px: number; ptext: ReturnType<typeof panel>;
  label: (id: string, at: P2, t: string, fill: string, from: number, extra?: Partial<Prop>) => Prop; row: number};

/** Friction at work: a push growing from zero on a floor, or a plane tilted slowly; static friction matches what it
 * must, up to µs N, and then the block slips and kinetic friction µk N takes over. */
function ramp(s: ForcesSpec, kit: Kit): Scene {
  const {W, H, k, box, props, facts, plane, px, ptext, label} = kit, r = s.ramp!, m = s.mass!, g = s.g ?? 9.8;
  const muK = r.mu_k ?? r.mu_s, bw = box[2] - box[0], bh = box[3] - box[1];
  const T = 6, lead = 0.6, n = 90;                                   // the ramp's growth on screen, then the slide
  const times = Array.from({length: n + 1}, (_, i) => i * (T + 3) / n);
  // physical state at screen time t (from the ramp's start)
  type St = {F: number; th: number; N: number; fr: number; x: number; v: number; slipping: boolean};
  const states: St[] = [];
  let x = 0, v = 0, slipAt = Infinity;
  if (r.kind === 'push') {
    const N = m * g, lim = r.mu_s * N, dt = (T + 3) / n;
    if (r.to! > lim) slipAt = T * lim / r.to!;
    for (const t of times) {
      const F = r.to! * Math.min(1, t / T), slipping = t >= slipAt, fr = slipping ? muK * N : Math.min(F, lim);
      const a = slipping ? (F - fr) / m : 0;
      states.push({F, th: 0, N, fr, x, v, slipping});
      if (slipping) { x += v * dt + a * dt * dt / 2; v += a * dt; }
    }
    facts.push(`N = mg = ${f(N)} N`, `limiting static friction µs N = ${f(lim)} N`, `kinetic friction µk N = ${f(muK * N)} N`,
      r.to! > lim ? `the block slips when the push passes ${f(lim)} N` : `a push of up to ${f(r.to!)} N never moves it: static friction matches it`);
  } else {
    const slip = Math.atan(r.mu_s), top = r.to ? r.to * DEG : Math.min(75 * DEG, slip + 12 * DEG);
    const reach = Math.min(top, slip), dt = (T + 3) / n;
    if (top >= slip) slipAt = T * slip / top;
    for (const t of times) {
      const th = Math.min(top * t / T, reach), slipping = t >= slipAt, N = m * g * Math.cos(th);
      const fr = slipping ? muK * N : m * g * Math.sin(th), a = slipping ? g * Math.sin(th) - muK * g * Math.cos(th) : 0;
      states.push({F: 0, th, N, fr, x, v, slipping});
      if (slipping && a > 0) { x += v * dt + a * dt * dt / 2; v += a * dt; }
    }
    facts.push(`the block slips when tan θ = µs: θ = ${f(slip / DEG)}°`, `µs = tan θ = ${f(r.mu_s)}`,
      `at that angle N = mg cos θ = ${f(m * g * Math.cos(slip))} N and friction = mg sin θ = ${f(m * g * Math.sin(slip))} N`,
      ...(r.mu_k !== undefined ? [`then it slides with a = g(sin θ − µk cos θ) = ${f(Math.max(0, g * Math.sin(slip) - muK * g * Math.cos(slip)))} m/s²`] : []));
  }
  // drawing: the block's travel fits 40% of the box; forces at a common scale
  const travel = Math.max(...states.map(q => q.x), 1e-9), ppm = 0.4 * bw / travel;
  const big = Math.max(m * g, r.kind === 'push' ? r.to! : 0), L = (r.kind === 'tilt' ? 0.22 : 0.28) * Math.min(bw, bh) / big, side = 0.17 * Math.min(bw, bh);
  const pivot: P2 = r.kind === 'push' ? [box[0] + 0.12 * bw, box[1] + 0.7 * bh] : [box[0] + 0.08 * bw, box[1] + 0.68 * bh];
  const span = 0.84 * bw, start = r.kind === 'push' ? 0.08 * bw : 0.62 * span;     // tilt: the block starts high on the plane
  const key = (fn: (q: St) => number): Key[] => states.map((q, i) => (i ? [lead + times[i], fn(q), 'linear'] : [lead + times[i], fn(q)]) as Key);
  // where along the surface (from the pivot) the block's contact is, and the frame there
  const pos = (q: St) => (r.kind === 'push' ? start + q.x * ppm : Math.max(0.12 * span, start - q.x * ppm));
  const contact = (q: St): P2 => [pivot[0] + pos(q) * Math.cos(q.th), pivot[1] - pos(q) * Math.sin(q.th)];
  const centre = (q: St): P2 => { const c = contact(q); return [c[0] - Math.sin(q.th) * side * 0.35, c[1] - Math.cos(q.th) * side * 0.35]; };
  props.push({id: 'plane', type: 'line', x1: pivot[0], y1: pivot[1], x2: pivot[0] + span, y2: pivot[1], style: {stroke: 'muted', width: 5 * k},
    keys: {x2: key(q => pivot[0] + span * Math.cos(q.th)), y2: key(q => pivot[1] - span * Math.sin(q.th))}} as Prop);
  if (r.kind === 'tilt') props.push({id: 'ground', type: 'line', x1: pivot[0], y1: pivot[1], x2: pivot[0] + span, y2: pivot[1], style: {stroke: 'faint', width: 3 * k}} as Prop);
  props.push({id: 'body', type: 'object', name: 'block', x: contact(states[0])[0], y: contact(states[0])[1], size: side, label: `${f(m)} kg`, layer: 1,
    keys: {x: key(q => contact(q)[0]), y: key(q => contact(q)[1]), angle: key(q => q.th / DEG)}} as Prop);
  // the forces, from the block's centre, changing with the ramp
  const force = (id: string, name: string, colour: string, dir: (q: St) => P2, size: (q: St) => number) => {
    const tip = (q: St): P2 => { const c = centre(q), u = dir(q); return [c[0] + u[0] * size(q) * L, c[1] - u[1] * size(q) * L]; };
    const lab = (q: St): P2 => { const c = centre(q), u = dir(q), d = size(q) * L + 34 * k; return [c[0] + u[0] * d, c[1] - u[1] * d + 11 * k]; };
    props.push({id, type: 'arrow', x1: 0, y1: 0, x2: 0, y2: 0, head: 18 * k, style: {stroke: colour, width: 6 * k}, show: [lead, 1e9], layer: 2,
      keys: {x1: key(q => centre(q)[0]), y1: key(q => centre(q)[1]), x2: key(q => tip(q)[0]), y2: key(q => tip(q)[1])}} as Prop);
    props.push(label(`l${id}`, [0, 0], name, colour, lead, {keys: {x: key(q => lab(q)[0]), y: key(q => lab(q)[1])}, layer: 2}));
  };
  const up = (q: St): P2 => [Math.cos(q.th), Math.sin(q.th)];
  force('W', 'mg', 'accent', () => [0, -1], () => m * g);
  force('N', 'N', 'cool', q => [-Math.sin(q.th), Math.cos(q.th)], q => q.N);
  if (r.kind === 'push') force('F', 'F', 'figure', () => [1, 0], q => Math.max(q.F, 1e-6));
  force('f', 'f', 'bad', q => (r.kind === 'push' ? [-1, 0] : up(q)), q => Math.max(q.fr, 1e-6));
  // readouts and the story in words
  let row = kit.row;
  const ro = (id: string, t: string, measures: Record<string, Key[]>) => {
    props.push({id, type: 'readout', x: px, y: row, size: 30 * k, text: t, decimals: 1, show: [lead, 1e9],
      measures: Object.fromEntries(Object.entries(measures).map(([nm, keys]) => [nm, {kind: 'keys', keys}]))} as Prop);
    row += 1.35 * 30 * k;
  };
  if (r.kind === 'push') ro('roF', 'push F = {F} N', {F: key(q => q.F)}); else ro('roT', 'θ = {th}°', {th: key(q => q.th / DEG)});
  ro('roN', 'N = {N} N', {N: key(q => q.N)});
  ro('rof', 'friction f = {f} N', {f: key(q => q.fr)});
  ro('rov', 'speed = {v} m/s', {v: key(q => q.v)});
  row += 8 * k;
  // the story in words (kept by an illustrative scene), then its numbers; the first line gives way to the second
  const say = (id: string, t: string, at: number, until = 1e9, extra: Partial<Prop> = {}) => {
    props.push(ptext(id, px, row, t, 30 * k, {show: [at, until], ...extra}));
    return wrapText(t, 30 * k, W - px - 40 * k).length * 1.3 * 30 * k + 6 * k;
  };
  const slipT = lead + slipAt;
  say('s1', r.kind === 'push' ? 'Static friction matches the push: the block stays put' : 'Static friction holds the block: it matches mg sin θ', lead, Number.isFinite(slipAt) ? slipT : 1e9);
  if (Number.isFinite(slipAt)) {
    const lim = r.kind === 'push' ? `${f(r.mu_s * m * g)} N` : `${f(Math.atan(r.mu_s) / DEG)}°`;
    row += say('s2w', r.kind === 'push' ? 'Static friction has reached its limit µs N: the block slips' : 'At tan θ = µs the block begins to slide', slipT, 1e9, {weight: 700});
    say('s2', r.kind === 'push' ? `µs N = ${lim}; now kinetic friction µk N = ${f(muK * m * g)} N, a little less` : `θ = ${lim}: µs = tan θ = ${f(r.mu_s)}`, slipT);
  }
  return scene(s, W, H, lead + T + 3 + 1.5, plane, props, [], {verb: 'forces', facts});
}
