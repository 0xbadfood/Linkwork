// moments: turning effects on a beam, computed (NCERT Class 11 System of Particles and Rotational Motion, §6.8–6.9;
// 2026-10-30). A beam rests on a pivot (a see-saw, a lever, a metre rule on a knife edge) or on two supports (a rod on
// two knife edges, a bridge). Forces push down (weights, given as mass or N) or up at distances from its left end; the
// beam's own weight acts at its middle. Code finds the clockwise and anticlockwise moments about the pivot and either
// shows they balance, solves the one unknown (a force's size or its place: the principle of moments), or tips the beam
// the way the larger moment turns it; with two supports it solves both reactions. A lever names its effort and load:
// mechanical advantage = load / effort = effort arm / load arm. A couple: two equal, opposite, parallel forces on a free
// rod, no net force, so it turns without moving off: its moment F d is the same about every point.
import {nameError} from './names.ts';
import type {Key} from '../keys.ts';
import type {Plane} from '../plane.ts';
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {round} from '../vec.ts';
import {n2, panel, scene, text} from './calculus.ts';
import {frame} from './vectors.ts';

type Force = {name: string; magnitude?: number | '?'; mass?: number; x: number | '?'; dir?: 'down' | 'up'};
export type MomentsSpec = {verb: 'moments'; length?: number; pivot?: number; supports?: [number, number]; forces?: Force[];
  beam_mass?: number; g?: number; effort?: string; load?: string; couple?: {magnitude: number; d: number};
  title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};

const DEG = Math.PI / 180;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const f = (v: number) => n2(round(v, 9), Math.abs(v) >= 100 || Number.isInteger(round(v, 9)) ? 0 : 2);

type Solved = {forces: {name: string; F: number; x: number; up: boolean; beam?: boolean}[]; unknown?: {name: string; what: 'magnitude' | 'x'}; R: number[]; turn: number; errors: string[]};

/** Every force's size and place, the unknown solved, the reactions, and the net turning moment (+ anticlockwise). */
function solve(s: MomentsSpec): Solved {
  const L = s.length ?? 1, g = s.g ?? 9.8, errors: string[] = [];
  const fs = (s.forces ?? []).map(q => ({name: q.name, F: q.magnitude === '?' ? NaN : q.magnitude ?? (q.mass ?? 0) * g, x: q.x === '?' ? NaN : q.x as number, up: q.dir === 'up'}));
  if (s.beam_mass) fs.push({name: 'W (beam)', F: s.beam_mass * g, x: L / 2, up: false, beam: true} as never);
  const out: Solved = {forces: fs, R: [], turn: 0, errors};
  const sign = (q: {up: boolean}) => (q.up ? 1 : -1);     // a down force right of the pivot turns clockwise (−)
  if (s.supports) {
    const [a, b] = s.supports, down = fs.reduce((t, q) => t - sign(q) * q.F, 0);
    const Rb = fs.reduce((t, q) => t - sign(q) * q.F * (q.x - a), 0) / (b - a), Ra = down - Rb;
    if (Ra < -1e-9 || Rb < -1e-9) errors.push(`moments: support ${Ra < 0 ? 1 : 2} would have to pull down (${f(Math.min(Ra, Rb))} N): the beam tips off it; move the supports or the forces`);
    out.R = [Ra, Rb];
    return out;
  }
  const p = s.pivot ?? L / 2, i = fs.findIndex(q => Number.isNaN(q.F) || Number.isNaN(q.x));
  const moment = (q: typeof fs[0]) => sign(q) * q.F * (q.x - p);
  if (i >= 0) {
    const q = fs[i], rest = fs.filter((_, j) => j !== i).reduce((t, r) => t + moment(r), 0);
    out.unknown = {name: q.name, what: Number.isNaN(q.F) ? 'magnitude' : 'x'};
    if (Number.isNaN(q.F)) {
      if (Math.abs(q.x - p) < 1e-9) errors.push(`moments: ${q.name} acts at the pivot, so no size of it can balance; move it`);
      q.F = -rest / (sign(q) * (q.x - p));
      if (q.F <= 1e-9) errors.push(`moments: ${q.name} would have to be ${f(q.F)} N: pushing ${q.up ? 'up' : 'down'} there turns the beam the same way as the rest; put it on the other side or change dir`);
    } else {
      q.x = p - rest / (sign(q) * q.F);
      if (q.x < -1e-9 || q.x > L + 1e-9) errors.push(`moments: ${q.name} would have to be ${f(q.x)} m from the left end, off the ${f(L)} m beam; change the forces or the length`);
    }
  } else out.turn = fs.reduce((t, r) => t + moment(r), 0);
  out.R = [fs.reduce((t, q) => t - sign(q) * q.F, 0)];
  return out;
}

export function momentsErrors(s: MomentsSpec): string[] {
  const e: string[] = [];
  if (s.couple) {
    if (!(isNum(s.couple.magnitude) && s.couple.magnitude > 0 && isNum(s.couple.d) && s.couple.d > 0)) e.push('moments: couple is {magnitude (N), d (m, the distance between the two forces)}');
    if (s.forces || s.pivot !== undefined || s.supports) e.push('moments: a couple acts on a free rod: leave out forces, pivot and supports');
    return e;
  }
  const L = s.length ?? 1;
  if (!(isNum(L) && L > 0)) e.push('moments: length is the beam\'s length in m, above 0');
  if (s.pivot !== undefined && s.supports) e.push('moments: give a pivot (one point it turns about) or supports (two), not both');
  if (s.pivot !== undefined && !(isNum(s.pivot) && s.pivot >= 0 && s.pivot <= L)) e.push(`moments: pivot is a distance from the left end, 0 to ${f(L)} m`);
  if (s.supports !== undefined && !(Array.isArray(s.supports) && s.supports.length === 2 && s.supports.every(x => isNum(x) && x >= 0 && x <= L) && s.supports[0] < s.supports[1]))
    e.push(`moments: supports is [x1, x2], two distances from the left end, x1 < x2, within 0 to ${f(L)} m`);
  if (!Array.isArray(s.forces) || s.forces.length < 1 || s.forces.length > 6) return [...e, 'moments: forces is a list of 1 to 6 {name, magnitude (N) or mass (kg), x (m from the left end), dir?: down | up}; or give couple'];
  let unknowns = 0;
  for (const [i, q] of s.forces.entries()) {
    const at = `moments: forces ${i + 1}`;
    const bad = nameError(`${at}: name`, q?.name, 16, 'W, F, effort, 2 kg, child A'); if (bad) e.push(bad);
    if (q.magnitude === '?' || q.x === '?') unknowns++;
    if (q.magnitude !== '?' && !((isNum(q.magnitude) && q.magnitude > 0) !== (isNum(q.mass) && q.mass > 0))) e.push(`${at}: give magnitude (N) or mass (kg, its weight mg), one of them; or magnitude: '?' to solve for it`);
    if (q.magnitude === '?' && q.mass !== undefined) e.push(`${at}: an unknown force has no mass`);
    if (q.x !== '?' && !(isNum(q.x) && q.x >= 0 && q.x <= L)) e.push(`${at}: x is its distance from the left end, 0 to ${f(L)} m; or '?' to solve for it`);
    if (q.dir !== undefined && !['down', 'up'].includes(q.dir)) e.push(`${at}: dir is down (default) or up`);
  }
  if (unknowns > 1) e.push("moments: solve for one thing at a time: only one magnitude: '?' or x: '?'");
  if (unknowns && s.supports) e.push("moments: with supports the reactions are what is solved: give every force (no '?')");
  if (s.beam_mass !== undefined && !(isNum(s.beam_mass) && s.beam_mass > 0)) e.push('moments: beam_mass is in kg, above 0 (it acts at the middle)');
  for (const k of ['effort', 'load'] as const) if (s[k] !== undefined && !s.forces.some(q => q.name === s[k])) e.push(`moments: ${k} names one of the forces`);
  if ((s.effort === undefined) !== (s.load === undefined)) e.push('moments: a lever names both effort and load');
  if (e.length) return e;
  return solve(s).errors;
}

export function moments(s: MomentsSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080;
  const fr = frame(W, H, k, s.title), box = fr.box, props: Prop[] = [...fr.titles], facts: string[] = [];
  const plane: Plane = {id: 'p', x: [0, 1], y: [0, 1], box};
  const px = fr.px, ptext = panel(W, k);
  let row = fr.row;
  const line = (id: string, t: string, when: number, extra: Partial<Prop> = {}) => {
    props.push(ptext(id, px, row, t, 29 * k, {show: [when, 1e9], ...extra}));
    row += wrapText(t, 29 * k, W - px - 40 * k).length * 1.3 * 29 * k + 6 * k;
  };
  const bw = box[2] - box[0], bh = box[3] - box[1], cx = (box[0] + box[2]) / 2, cy = box[1] + 0.5 * bh;
  const arrowP = (id: string, x1: number, y1: number, x2: number, y2: number, stroke: string, when: number, extra: Partial<Prop> = {}) =>
    props.push({id, type: 'arrow', x1, y1, x2, y2, head: 20 * k, style: {stroke, width: 6 * k}, show: [when, 1e9], fade: 0.3, layer: 3, ...extra} as Prop);

  if (s.couple) {
    // a free rod turning under a couple: the forces ride at its ends, square to it
    const {magnitude: F, d} = s.couple, half = 0.36 * bw, n = 60, t0 = 1.6, t1 = 6.5, turn = 120;
    const ang = (i: number) => turn * (i / n) ** 2 * DEG, at = (i: number) => t0 + (t1 - t0) * i / n;
    const key = (fn: (a: number) => number): Key[] => [[0, fn(0)], ...Array.from({length: n + 1}, (_, i) => [at(i), fn(ang(i)), 'linear'] as Key)];
    const end = (a: number, side: number) => [cx + side * half * Math.cos(a), cy - side * half * Math.sin(a)];
    const len = 0.24 * bh;
    props.push({id: 'rod', type: 'line', x1: 0, y1: 0, x2: 0, y2: 0, style: {stroke: 'ink', width: 16 * k}, layer: 1,
      keys: {x1: key(a => end(a, -1)[0]), y1: key(a => end(a, -1)[1]), x2: key(a => end(a, 1)[0]), y2: key(a => end(a, 1)[1])}} as Prop,
      {id: 'mid', type: 'circle', x: cx, y: cy, r: 7 * k, style: {fill: 'accent'}, layer: 2} as Prop);
    for (const side of [1, -1]) {
      // up at the right end, down at the left: anticlockwise
      const tail = (a: number) => end(a, side), tip = (a: number) => [end(a, side)[0] - side * len * Math.sin(a), end(a, side)[1] - side * len * Math.cos(a)];
      props.push({id: `F${side}`, type: 'arrow', x1: 0, y1: 0, x2: 0, y2: 0, head: 20 * k, style: {stroke: 'figure', width: 6 * k}, show: [0.6, 1e9], layer: 3,
        keys: {x1: key(a => tail(a)[0]), y1: key(a => tail(a)[1]), x2: key(a => tip(a)[0]), y2: key(a => tip(a)[1])}} as Prop,
        text(`lF${side}`, 0, 0, 'F', 32 * k, {weight: 700, align: 'middle', style: {fill: 'figure'}, show: [0.6, 1e9], layer: 3,
          keys: {x: key(a => tip(a)[0] + 30 * k * Math.cos(a) * side), y: key(a => tip(a)[1] - 30 * k * Math.sin(a) * side + 10 * k)}}));
    }
    line('l1', 'A couple: two equal forces, opposite and not in line', 0.6, {weight: 700});
    line('l2', 'They add to zero, so the centre of mass stays put', 1.4, {style: {fill: 'muted'}});
    line('l3', 'Their moments add, so the rod turns', 2.2, {style: {fill: 'figure'}});
    line('l4', s.illustrative ? 'Moment of a couple = F × d, the same about any point' : `Moment of a couple = F × d = ${f(F)} × ${f(d)} = ${f(F * d)} N m, the same about any point`, 3, {weight: 700});
    line('l5', 'Turning a tap, a steering wheel, a key: couples', 4.2, {style: {fill: 'muted'}});
    facts.push(`moment of the couple = F d = ${f(F * d)} N m`, 'net force = 0: no translation, rotation only');
    return scene(s, W, H, t1 + 1.5, plane, props, [], {verb: 'moments', facts});
  }

  const L = s.length ?? 1, sol = solve(s), ppm = 0.82 * bw / L, x0 = cx - L * ppm / 2, X = (x: number) => x0 + x * ppm;
  const thick = 16 * k, top = cy - thick / 2, piv = s.pivot ?? L / 2;
  // the beam tips when the moments don't balance (no unknown to solve): about the pivot, to 10°
  // as far as the floor lets the longer arm go, at most 10°
  const arm = Math.max(piv, L - piv) * ppm, room = Math.asin(Math.min(1, 44 * k / Math.max(arm, 1e-9)));
  const tip = s.supports || sol.unknown || Math.abs(sol.turn) < 1e-9 ? 0 : Math.sign(sol.turn) * Math.min(10 * DEG, room), t0 = 5.4;
  const rot = (x: number, y: number, a: number): [number, number] => { const ox = X(piv), dx = x - ox, dy = y - cy;
    return [ox + dx * Math.cos(a) + dy * Math.sin(a), cy - dx * Math.sin(a) + dy * Math.cos(a)]; };
  const keyed = (fn: (a: number) => number): Key[] | undefined => (tip ? [[0, fn(0)], [t0, fn(0)], [t0 + 1.2, fn(tip), 'inOut']] : undefined);
  const pin = (x: number, y: number) => (tip ? {keys: {x: keyed(a => rot(x, y, a)[0])!, y: keyed(a => rot(x, y, a)[1])!}} : {});
  // a force stays vertical: it rides with the point of the beam it acts on
  const ride = (x: number, y1: number, y2: number) => (tip ? {keys: {x1: keyed(a => rot(x, cy, a)[0])!, y1: keyed(a => rot(x, cy, a)[1] + y1 - cy)!,
    x2: keyed(a => rot(x, cy, a)[0])!, y2: keyed(a => rot(x, cy, a)[1] + y2 - cy)!}} : {});
  const rideText = (x: number, y: number) => (tip ? {keys: {x: keyed(a => rot(x, cy, a)[0])!, y: keyed(a => rot(x, cy, a)[1] + y - cy)!}} : {});
  const pin2 = (x1: number, y1: number, x2: number, y2: number) => (tip ? {keys: {x1: keyed(a => rot(x1, y1, a)[0])!, y1: keyed(a => rot(x1, y1, a)[1])!,
    x2: keyed(a => rot(x2, y2, a)[0])!, y2: keyed(a => rot(x2, y2, a)[1])!}} : {});
  props.push({id: 'beam', type: 'line', x1: X(0), y1: cy, x2: X(L), y2: cy, style: {stroke: 'ink', width: thick}, layer: 1, ...pin2(X(0), cy, X(L), cy)} as Prop);
  const wedge = (id: string, x: number) => props.push({id, type: 'polyline', points: [[x, cy + thick / 2], [x - 26 * k, cy + thick / 2 + 50 * k], [x + 26 * k, cy + thick / 2 + 50 * k]],
    closed: true, style: {fill: 'muted', stroke: 'ink', width: 3 * k}, layer: 2} as Prop);
  const at = s.supports ?? [piv];
  at.forEach((x, i) => wedge(`wedge${i}`, X(x)));
  props.push({id: 'floor', type: 'line', x1: box[0], y1: cy + thick / 2 + 50 * k, x2: box[2], y2: cy + thick / 2 + 50 * k, style: {stroke: 'muted', width: 3 * k}} as Prop);
  // the forces, to one scale; a down force from above onto the beam, an up force from below
  const big = Math.max(...sol.forces.map(q => q.F), ...sol.R, 1e-9), len = (F: number) => Math.max(30 * k, 0.26 * bh * F / big);
  const solvedAt = 3.2;
  for (const [i, q] of sol.forces.entries()) {
    const x = X(q.x), l = len(q.F), when = sol.unknown?.name === q.name ? solvedAt : 0.6 + 0.35 * i, colour = q.beam ? 'muted' : sol.unknown?.name === q.name ? 'accent' : 'figure';
    const [y1, y2] = q.up ? [cy + thick / 2 + l, cy + thick / 2] : [top - l, top];
    arrowP(`f${i}`, x, y1, x, y2, colour, when, ride(x, y1, y2));
    const value = s.illustrative ? q.name : `${q.name} = ${f(q.F)} N`, ly = q.up ? y1 + 34 * k : y1 - 14 * k;
    // two forces close together on the same side: the left one's name leans left, the right one's right
    const near = (r: Solved['forces'][0]) => r !== q && r.up === q.up && Math.abs(X(r.x) - x) < 0.3 * 27 * k * (value.length + 8);
    const lean = sol.forces.some(r => near(r) && r.x > q.x) ? 'end' : sol.forces.some(r => near(r) && r.x < q.x) ? 'start' : 'middle';
    const lx = x + (lean === 'end' ? -8 * k : lean === 'start' ? 8 * k : 0);
    props.push(text(`lf${i}`, lx, ly, value, 27 * k, {weight: 700, align: lean, style: {fill: colour}, show: [when, 1e9], layer: 3, ...rideText(lx, ly)}));
  }
  for (const [i, R] of sol.R.entries()) {
    const x = X(at[i]), l = len(R), y1 = cy + thick / 2 + l;
    if (R > 1e-9) {
      // beside the wedge, its name beside its middle
      arrowP(`R${i}`, x + 34 * k, y1, x + 34 * k, cy + thick / 2, 'good', 4, {style: {stroke: 'good', width: 5 * k}});
      props.push(text(`lR${i}`, x + 44 * k, cy + thick / 2 + 0.6 * l + 70 * k, s.illustrative ? `R${sol.R.length > 1 ? i + 1 : ''}` : `R${sol.R.length > 1 ? i + 1 : ''} = ${f(R)} N`, 26 * k,
        {weight: 700, style: {fill: 'good'}, show: [4, 1e9]}));
    }
  }
  // distances from the pivot (or the left end, with supports), along a line under the floor
  if (!s.illustrative) {
    // below the reactions' arrows and names
    const ref = s.supports ? 0 : piv, yd = Math.max(cy + 0.36 * bh, cy + thick / 2 + Math.max(0, ...sol.R.map(len)) + 96 * k);
    sol.forces.filter(q => !q.beam).forEach((q, i) => {
      if (Math.abs(q.x - ref) < 1e-9) return;
      const y = yd + (i % 2) * 44 * k, when = sol.unknown?.name === q.name ? solvedAt : 1.4;
      props.push({id: `dl${i}`, type: 'line', x1: X(ref), y1: y, x2: X(q.x), y2: y, style: {stroke: 'muted', width: 2 * k}, show: [when, 1e9], fade: 0.3} as Prop,
        {id: `dt${i}`, type: 'line', x1: X(q.x), y1: y - 10 * k, x2: X(q.x), y2: y + 10 * k, style: {stroke: 'muted', width: 2 * k}, show: [when, 1e9], fade: 0.3} as Prop,
        text(`ld${i}`, (X(ref) + X(q.x)) / 2, y - 8 * k, `${f(Math.abs(q.x - ref))} m`, 24 * k, {align: 'middle', style: {fill: 'muted'}, show: [when, 1e9]}));
    });
  }
  // the story
  const side = (q: Solved['forces'][0]) => (q.up ? 1 : -1) * (q.x - piv);
  // the unknown stays a name until it is solved
  const hid = (q: Solved['forces'][0], what: 'magnitude' | 'x') => s.illustrative || (sol.unknown?.name === q.name && sol.unknown.what === what);
  const term = (q: Solved['forces'][0]) => `${hid(q, 'magnitude') ? q.name : f(q.F)} × ${hid(q, 'x') ? 'd' : f(Math.abs(q.x - piv))}`;
  if (s.supports) {
    const [Ra, Rb] = sol.R, total = sol.forces.reduce((t, q) => t + (q.up ? -q.F : q.F), 0);
    line('l1', 'In equilibrium: no net force and no net moment', 1.2, {weight: 700});
    line('l2', s.illustrative ? 'R1 + R2 = the total load' : `R1 + R2 = ${f(total)} N, the total load`, 2.2);
    line('l3', 'Moments about support 1: R2 × (its distance) balances the loads\' moments', 3);
    if (!s.illustrative) line('l4', `R1 = ${f(Ra)} N,  R2 = ${f(Rb)} N: the nearer support carries more`, 4, {style: {fill: 'good'}, weight: 700});
    facts.push(`reaction at support 1 (x = ${f(at[0])} m) = ${f(Ra)} N`, `reaction at support 2 (x = ${f(at[1]!)} m) = ${f(Rb)} N`, `total downward load = ${f(total)} N`);
  } else {
    const anti = sol.forces.filter(q => side(q) > 1e-9), clock = sol.forces.filter(q => side(q) < -1e-9);
    const sum = (qs: typeof anti) => qs.reduce((t, q) => t + Math.abs(side(q)) * q.F, 0);
    line('l1', 'Moment = force × its distance from the pivot', 1, {weight: 700});
    line('l2', `Anticlockwise: ${anti.map(term).join(' + ') || 'none'}${s.illustrative || anti.some(q => q.name === sol.unknown?.name) ? '' : ` = ${f(sum(anti))} N m`}`, 1.8, {style: {fill: 'cool'}});
    line('l3', `Clockwise: ${clock.map(term).join(' + ') || 'none'}${s.illustrative || clock.some(q => q.name === sol.unknown?.name) ? '' : ` = ${f(sum(clock))} N m`}`, 2.4, {style: {fill: 'bad'}});
    if (sol.unknown) {
      const q = sol.forces.find(r => r.name === sol.unknown!.name)!;
      line('l4', `Balanced when they are equal (the principle of moments): ${q.name} ${sol.unknown.what === 'x' ? `acts ${f(Math.abs(q.x - piv))} m from the pivot` : `= ${f(q.F)} N`}`, solvedAt, {weight: 700, style: {fill: 'accent'}});
    } else line('l4', Math.abs(sol.turn) < 1e-9 ? 'They are equal: the beam balances (the principle of moments)' : `The ${sol.turn > 0 ? 'anticlockwise' : 'clockwise'} moment is larger: the beam turns that way`, 3.2,
      {weight: 700, style: {fill: Math.abs(sol.turn) < 1e-9 ? 'good' : 'accent'}});
    if (!s.illustrative) line('l5', `The pivot pushes up with R = ${f(sol.R[0])} N, so the forces balance too`, 4, {style: {fill: 'good'}});
    if (s.effort && s.load) {
      const E = sol.forces.find(q => q.name === s.effort)!, Ld = sol.forces.find(q => q.name === s.load)!;
      const ea = Math.abs(E.x - piv), la = Math.abs(Ld.x - piv), ma = Ld.F / E.F;
      line('l6', `Mechanical advantage = load / effort = effort arm / load arm${s.illustrative ? '' : ` = ${f(ea)} / ${f(la)} = ${f(ma)}`}`, 4.8, {weight: 700});
      line('l7', ma > 1 + 1e-9 ? 'More than 1: a small effort lifts a large load' : ma < 1 - 1e-9 ? 'Less than 1: more effort than load, for a larger movement' : 'Equal to 1: effort equals load', 5.4, {style: {fill: 'muted'}});
      facts.push(`effort arm = ${f(ea)} m, load arm = ${f(la)} m`, `mechanical advantage = ${f(ma)}`);
    }
    facts.push(`anticlockwise moments = ${f(sum(anti))} N m`, `clockwise moments = ${f(sum(clock))} N m`, `reaction at the pivot = ${f(sol.R[0])} N`,
      ...(sol.unknown ? [`${sol.unknown.name} = ${sol.unknown.what === 'x' ? `${f(sol.forces.find(r => r.name === sol.unknown!.name)!.x)} m from the left end` : `${f(sol.forces.find(r => r.name === sol.unknown!.name)!.F)} N`}`] : []));
  }
  facts.push(...sol.forces.map(q => `${q.name}: ${f(q.F)} N ${q.up ? 'up' : 'down'} at ${f(q.x)} m from the left end`));
  return scene(s, W, H, s.effort ? 7.4 : tip ? t0 + 2.4 : 6, plane, props, [], {verb: 'moments', facts});
}
