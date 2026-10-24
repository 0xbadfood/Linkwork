// Motion in a straight line, and how big a moving thing is beside how far it goes.
//
// motion_on_line: an object (a dot, a walker, a car, a bus, a train, a cyclist, a ball, a block) moves along an x-axis
//   with its origin and positive direction marked; between the given positions it moves at constant velocity. Time,
//   position and displacement are read off the drawing; the velocity of each stretch and the distance covered are
//   computed. Optionally its position–time graph draws itself beside the motion, point for point.
// scale_compare: an object of length L shown against distances D, drawn to scale. It first appears large enough to
//   recognise, then shrinks to its true size against the distance while the ratio L/D is shown: when is it a point?
import type {Key} from '../keys.ts';
import {OBJECTS} from '../objects.ts';
import {toScene, type Plane} from '../plane.ts';
import type {Actor, Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {round} from '../vec.ts';
import {n2, walking} from './calculus.ts';
import {niceStep} from './graph.ts';

const MOVERS = ['dot', 'figure', 'car', 'bus', 'train', 'bicycle', 'ball', 'block'] as const;
const SCALED = ['car', 'bus', 'train', 'bicycle', 'ball', 'block', 'figure'] as const;
const READOUTS = ['t', 'x', 'displacement', 'v', 'distance'] as const;
type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};

export type MotionSpec = Common & {
  verb: 'motion_on_line';
  axis: {range: [number, number]; unit?: string; step?: number};
  object?: (typeof MOVERS)[number];
  /** The object's real length in axis units, to draw it to scale (optional). */
  object_length?: number;
  moves: {t: number; x: number}[];
  marks?: {x: number; label: string}[];
  graph?: boolean;
  readouts?: (typeof READOUTS)[number][];
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const fmt = (v: number) => n2(Number(v.toFixed(3)), 3).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
const signed = (v: number) => (v > 0 ? `+${fmt(v)}` : fmt(v));

export function motionErrors(s: MotionSpec): string[] {
  const e: string[] = [];
  const [a, b] = s.axis?.range ?? [NaN, NaN];
  if (!isNum(a) || !isNum(b) || a >= b) return ['motion_on_line: axis.range is [low, high]'];
  if (s.axis.step !== undefined && !(s.axis.step > 0 && (b - a) / s.axis.step <= 20)) e.push('motion_on_line: axis.step must give at most 20 ticks');
  if (s.object !== undefined && !MOVERS.includes(s.object)) e.push(`motion_on_line: object is one of ${MOVERS.join(', ')}`);
  if (s.object_length !== undefined) {
    if (!(s.object_length > 0)) e.push('motion_on_line: object_length must be positive');
    else if (s.object_length > 0.6 * (b - a)) e.push('motion_on_line: the object is too long for the axis (at most 60% of it)');
    if (!SCALED.includes((s.object ?? 'dot') as never)) e.push('motion_on_line: object_length needs an object that has a length (not a dot)');
  }
  if (!Array.isArray(s.moves) || s.moves.length < 2) return [...e, 'motion_on_line: give at least two moves {t, x}'];
  s.moves.forEach((m, i) => {
    const where = `motion_on_line: move ${i + 1}`;
    if (!isNum(m?.t) || !isNum(m?.x)) { e.push(`${where} needs t (seconds) and x`); return; }
    if (i === 0 && m.t < 0) e.push(`${where}: t starts at 0 or later`);
    if (i && !(m.t > s.moves[i - 1].t)) e.push(`${where}: times must increase`);
    if (m.x < a || m.x > b) e.push(`${where}: x = ${m.x} is off the axis (${a} to ${b})`);
  });
  if (s.moves.at(-1)!.t > 60) e.push('motion_on_line: keep the motion under a minute');
  for (const [i, m] of (s.marks ?? []).entries()) {
    if (!isNum(m?.x) || m.x < a || m.x > b) e.push(`motion_on_line: mark ${i + 1} must be on the axis`);
    if (typeof m?.label !== 'string' || !m.label.trim() || m.label.length > 16) e.push(`motion_on_line: mark ${i + 1} needs a short label (16 characters)`);
  }
  for (const r of s.readouts ?? []) if (!READOUTS.includes(r)) e.push(`motion_on_line: readouts are ${READOUTS.join(', ')}`);
  return e;
}

export function motionOnLine(s: MotionSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080;
  const [a, b] = s.axis.range, unit = s.axis.unit ?? 'm', u = unit ? ` ${unit}` : '';
  const moves = s.moves, T = moves.at(-1)!.t, kind = s.object ?? 'dot';
  const left = 0.06 * W, right = 0.6 * W, yAxis = (s.graph ? 0.3 : 0.6) * H;
  const axis: Plane = {id: 'axis', x: [a, b], y: [0, 1], box: [left, yAxis - 10, right, yAxis]};
  const X = (x: number) => toScene(axis, [x, 0]);
  const step = s.axis.step ?? niceStep(a, b);
  const props: Prop[] = [
    {id: 'axis', type: 'arrow', x1: left - 30 * k, y1: yAxis, x2: right + 50 * k, y2: yAxis, style: {stroke: 'muted', width: 4 * k}, head: 18 * k},
    {id: 'plus', type: 'text', x: right + 50 * k, y: yAxis + 44 * k, text: `+x`, size: 28 * k, align: 'end', weight: 700, style: {fill: 'muted'}},
  ];
  for (let v = Math.ceil(a / step) * step, i = 0; v <= b + 1e-9; v += step, i++) {
    const [px] = X(v), zero = Math.abs(v) < 1e-9;
    props.push({id: `tick${i}`, type: 'line', x1: px, y1: yAxis - (zero ? 16 : 10) * k, x2: px, y2: yAxis + (zero ? 16 : 10) * k, style: {stroke: zero ? 'ink' : 'muted', width: (zero ? 4 : 3) * k}},
      {id: `num${i}`, type: 'text', x: px, y: yAxis + 40 * k, text: fmt(round(v, 9)), size: 26 * k, align: 'middle', style: {fill: zero ? 'ink' : 'muted'}});
    if (zero) props.push({id: 'origin', type: 'text', x: px, y: yAxis + 76 * k, text: 'O', size: 30 * k, align: 'middle', weight: 700});
  }
  // The origin is already labelled O: a mark repeating it is dropped.
  (s.marks ?? []).filter(m => !(Math.abs(m.x) < 1e-9 && /^(o|origin)$/i.test(m.label.trim()))).forEach((m, i) => {
    const [px] = X(m.x);
    props.push({id: `mark${i}`, type: 'circle', x: px, y: yAxis, r: 8 * k, style: {fill: 'cool'}, layer: 1},
      {id: `mark${i}-label`, type: 'text', x: px, y: yAxis + 112 * k, text: m.label, size: 26 * k, align: 'middle', weight: 700, style: {fill: 'cool'}});
  });

  // The mover: a dot actor carries the position (readouts and the object follow it). Between moves it goes at constant
  // velocity, so its keys are linear.
  const base = moves.map((m, i) => ({t: m.t, at: X(m.x), ...(i ? {ease: 'linear' as const} : {})}));
  const actors: Actor[] = [];
  const mover: Actor = {id: 'mover', rig: 'dot', at: X(moves[0].x), base, scale: 1.2 * k, layer: 3};
  if (kind !== 'dot') mover.opacity = [[0, 0]];
  actors.push(mover);
  const facings: [number, number][] = [];
  moves.slice(1).forEach((m, i) => { const dx = m.x - moves[i].x; if (dx) facings.push([moves[i].t, dx > 0 ? 1 : -1]); });
  const facingKeys: Key[] = facings.length ? facings.flatMap(([t, f], i) => (i ? [[t, facings[i - 1][1]], [t, f]] : [[0, f], [t, f]]) as Key[]) : [[0, 1]];
  const unitPx = (right - left) / (b - a);
  if (kind === 'figure') {
    const walker: Actor = {id: 'walker', rig: 'figure', at: X(moves[0].x), base, scale: (s.object_length ? s.object_length * unitPx / 70 : 0.8) * k,
      facing: facings[0]?.[1] === -1 ? -1 : 1, facings: facings.map(([t, f]) => ({t, facing: f as 1 | -1})), pose: [{t: 0, pose: 'stand'}], layer: 2};
    moves.slice(1).forEach((m, i) => { if (m.x !== moves[i].x) walker.pose!.push(...walking(moves[i].t, m.t)); });
    actors.push(walker);
  } else if (kind !== 'dot') {
    const size = s.object_length ? s.object_length * unitPx : Math.min(OBJECTS[kind].length, 0.18 * (right - left)) * k;
    props.push({id: 'object', type: 'object', name: kind, x: X(moves[0].x)[0], y: yAxis, size, anchor: {actor: 'mover', joint: 'p'},
      keys: {facing: facingKeys}, layer: 2});
  }

  const tip = {actor: 'mover', joint: 'p'};
  const px = 0.66 * W, pw = W - px - 40 * k;
  let row = 0.14 * H;
  if (s.title) {
    props.push({id: 'title', type: 'text', x: px, y: row, text: s.title, size: 44 * k, weight: 700, width: pw});
    row += wrapText(s.title, 44 * k, pw).length * 1.25 * 44 * k + 24 * k;
  }
  const reads = s.readouts ?? ['t', 'x'];
  if (reads.includes('t')) { props.push({id: 'ro-t', type: 'readout', x: px, y: row, size: 34 * k, text: 't = {t} s', decimals: 1, measures: {t: {kind: 'time'}}}); row += 1.35 * 34 * k; }
  if (reads.includes('x')) { props.push({id: 'ro-x', type: 'readout', x: px, y: row, size: 34 * k, text: `x = {x}${u}`, decimals: 2, measures: {x: {kind: 'coord', of: tip, plane: 'axis', axis: 'x'}}, style: {fill: 'accent'}}); row += 1.35 * 34 * k; }
  if (reads.includes('displacement')) {
    props.push({id: 'ro-d', type: 'readout', x: px, y: row, size: 34 * k, text: `displacement = {d}${u}`, decimals: 2,
      measures: {d: {kind: 'run', a: {plane: 'axis', at: [moves[0].x, 0]}, b: tip, plane: 'axis'}}, style: {fill: 'cool'}});
    row += 1.35 * 34 * k;
  }
  // Velocity per stretch and distance covered are computed from the moves (constant velocity between them).
  const segments = moves.slice(1).map((m, i) => ({t0: moves[i].t, t1: m.t, x0: moves[i].x, x1: m.x, v: (m.x - moves[i].x) / (m.t - moves[i].t)}));
  // One line each, showing one stretch at a time.
  const shared = (id: string, texts: {text: string; show: [number, number]}[], fill = 'ink') => {
    texts.forEach((x, i) => props.push({id: `${id}${i}`, type: 'text', x: px, y: row, text: x.text, size: 34 * k, width: pw, show: x.show, fade: 0.1, style: {fill}}));
    row += 1.35 * 34 * k;
  };
  if (reads.includes('v')) shared('ro-v', segments.map((g, i) => ({text: `v = ${signed(round(g.v, 6))}${unit ? ` ${unit}/s` : ''}`,
    show: [g.t0, i < segments.length - 1 ? g.t1 : 1e9] as [number, number]})), 'good');
  if (reads.includes('distance')) {
    let covered = 0;
    shared('ro-s', segments.map((g, i) => {
      covered += Math.abs(g.x1 - g.x0);
      return {text: `distance covered = ${fmt(round(covered, 6))}${u}`, show: [g.t1, i < segments.length - 1 ? segments[i + 1].t1 : 1e9] as [number, number]};
    }));
  }

  const planes: Plane[] = [axis];
  if (s.graph) {
    const xt: Plane = {id: 'xt', x: [0, Math.max(T, 1)], y: [a, b], box: [0.1 * W, 0.46 * H, right, 0.9 * H]};
    planes.push(xt);
    props.push({id: 'xt-axes', type: 'axes', plane: 'xt', step: [niceStep(0, Math.max(T, 1)), step], names: ['t (s)', `x${unit ? ` (${unit})` : ''}`], size: 22 * k});
    actors.push({id: 'tracer', rig: 'dot', at: toScene(xt, [moves[0].t, moves[0].x]), scale: 1.1 * k, layer: 4,
      base: moves.map((m, i) => ({t: m.t, at: toScene(xt, [m.t, m.x]), ...(i ? {ease: 'linear' as const} : {})}))});
    props.push({id: 'xt-line', type: 'trail', of: {actor: 'tracer', joint: 'p'}, t0: moves[0].t, style: {stroke: 'accent', width: 5 * k}, layer: 3},
      {id: 'link', type: 'line', x1: 0, y1: 0, x2: 0, y2: 0, ends: [{...tip, pin: {y: yAxis + 20 * k}}, {actor: 'tracer', joint: 'p'}],
        style: {stroke: 'muted', width: 2 * k, dash: [5 * k, 8 * k]}, layer: 1});
  }

  const total = moves.at(-1)!.x - moves[0].x, distance = segments.reduce((d, g) => d + Math.abs(g.x1 - g.x0), 0);
  const facts = [
    ...segments.map(g => `from t = ${fmt(g.t0)} s to ${fmt(g.t1)} s: x goes from ${fmt(g.x0)} to ${fmt(g.x1)}${u}, velocity ${signed(round(g.v, 6))}${unit ? ` ${unit}/s` : ''}`),
    `displacement ${signed(round(total, 6))}${u}; distance covered ${fmt(round(distance, 6))}${u}`,
  ];
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: T + 1.5, theme: s.theme ?? 'dark', planes, props, actors,
    surfaces: kind === 'figure' ? [{x0: left - 30 * k, x1: right + 50 * k, y: yAxis}] : undefined,
    meta: {verb: 'motion_on_line', facts, segments, displacement: round(total, 9), distance: round(distance, 9)}};
}

// ---------------------------------------------------------------------------------------------------------------
const COMPARED = ['car', 'bus', 'train', 'bicycle', 'ball', 'block'] as const;
export type ScaleSpec = Common & {
  verb: 'scale_compare';
  object: (typeof COMPARED)[number];
  /** The object's length in metres. */
  length: number;
  cases: {label: string; distance: number}[];
};

/** Each object's height over its length (local units), so a large first view stays under its label. */
const HEIGHT: Record<string, number> = {car: 92, bus: 118, train: 146, bicycle: 185, ball: 40, block: 70};
/** Three significant figures, written out (0.000125, not 1.25e-4). */
const sig = (v: number) => { const s = Number(v.toPrecision(3)); return s >= 1e-6 ? s.toFixed(Math.max(0, 2 - Math.floor(Math.log10(s)))).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') : String(s); };
const metres = (m: number) => (m >= 1000 ? `${fmt(round(m / 1000, 6))} km` : `${fmt(round(m, 6))} m`);

export function scaleErrors(s: ScaleSpec): string[] {
  const e: string[] = [];
  if (!COMPARED.includes(s.object)) e.push(`scale_compare: object is one of ${COMPARED.join(', ')}`);
  if (!(isNum(s.length) && s.length > 0)) e.push('scale_compare: length (metres) must be positive');
  if (!Array.isArray(s.cases) || s.cases.length < 1 || s.cases.length > 3) return [...e, 'scale_compare: give 1–3 cases'];
  s.cases.forEach((c, i) => {
    const where = `scale_compare: case ${i + 1}`;
    if (typeof c?.label !== 'string' || !c.label.trim() || c.label.length > 40) e.push(`${where} needs a short label (40 characters)`);
    if (!(isNum(c?.distance) && c.distance > 0)) e.push(`${where}: distance (metres) must be positive`);
    else if (c.distance < s.length) e.push(`${where}: the distance must be at least the object's length`);
  });
  return e;
}

export function scaleCompare(s: ScaleSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080;
  const x0 = 0.06 * W, x1 = 0.62 * W, span = x1 - x0, px = 0.68 * W, pw = W - px - 40 * k;
  const props: Prop[] = [];
  const facts: string[] = [];
  let top = 0.14 * H;
  if (s.title) {
    props.push({id: 'title', type: 'text', x: x0, y: top, text: s.title, size: 46 * k, weight: 700, width: x1 - x0});
    top += wrapText(s.title, 46 * k, x1 - x0).length * 1.25 * 46 * k + 30 * k;
  }
  const gap = (0.92 * H - top) / s.cases.length;
  const big = Math.min(0.22 * span, 0.42 * gap * OBJECTS[s.object].length / HEIGHT[s.object]);   // recognisable, below its label
  let t = 0.6;
  const cases = s.cases.map((c, i) => {
    const y = top + gap * (i + 0.72), ratio = s.length / c.distance, small = Math.max(ratio * span, 0.6 * k);
    const at = t, shrink = at + 1.2, done = shrink + 2.6;
    props.push(
      {id: `label${i}`, type: 'text', x: x0, y: y - gap * 0.52, text: c.label, size: 32 * k, weight: 700, show: [at, 1e9]},
      {id: `bar${i}`, type: 'line', x1: x0, y1: y + 12 * k, x2: x1, y2: y + 12 * k, draw: 0, keys: {draw: [[at, 0], [at + 1, 1, 'inOut']]}, style: {stroke: 'accent', width: 6 * k}},
      {id: `end${i}a`, type: 'line', x1: x0, y1: y, x2: x0, y2: y + 24 * k, style: {stroke: 'accent', width: 4 * k}, show: [at, 1e9]},
      {id: `end${i}b`, type: 'line', x1: x1, y1: y, x2: x1, y2: y + 24 * k, style: {stroke: 'accent', width: 4 * k}, show: [at + 1, 1e9]},
      {id: `dist${i}`, type: 'text', x: x1, y: y + 50 * k, text: `D = ${metres(c.distance)}`, size: 28 * k, align: 'end', style: {fill: 'accent'}, show: [at + 1, 1e9]},
      // Recognisable first, then its true size against the distance; its left end stays on the start of the bar.
      {id: `obj${i}`, type: 'object', name: s.object, x: x0 + big / 2, y: y + 9 * k, size: big, show: [at, 1e9], layer: 2, params: {smoke: 0},
        keys: {size: [[shrink, big], [done, small, 'inOut']], x: [[shrink, x0 + big / 2], [done, x0 + small / 2, 'inOut']]}},
      {id: `len${i}`, type: 'text', x: x0, y: y + 50 * k, text: `L = ${metres(s.length)}`, size: 28 * k, style: {fill: 'ink'}, show: [at, shrink + 0.4]},
      {id: `ratio${i}`, type: 'text', x: px, y: y - 10 * k, width: pw, size: 34 * k, weight: 700, show: [done, 1e9],
        text: `L/D = ${sig(ratio)} (${sig(100 * ratio)}%)`},
    );
    if (small < 3 * k) props.push({id: `tiny${i}`, type: 'arrow', x1: x0 + 60 * k, y1: y - 46 * k, x2: x0 + 6 * k, y2: y + 4 * k,
      style: {stroke: 'ink', width: 3 * k}, head: 14 * k, show: [done, 1e9]},
    {id: `tiny${i}-t`, type: 'text', x: x0 + 66 * k, y: y - 52 * k, text: 'too small to see at this scale', size: 24 * k, style: {fill: 'muted'}, show: [done, 1e9]});
    facts.push(`${c.label}: L = ${metres(s.length)}, D = ${metres(c.distance)}, L/D = ${round(ratio, 6)}`);
    t = done + 0.8;
    return {label: c.label, distance: c.distance, ratio: round(ratio, 9), shown: done};
  });
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: t + 1.6, theme: s.theme ?? 'dark', props, actors: [],
    meta: {verb: 'scale_compare', facts, cases}};
}
