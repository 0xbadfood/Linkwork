// Motion in a straight line, and how big a moving thing is beside how far it goes.
//
// motion_on_line: an object (a dot, a walker, a car, a bus, a train, a cyclist, a ball, a block) moves along an x-axis
//   with its origin and positive direction marked; between the given positions it moves at constant velocity. Time,
//   position and displacement are read off the drawing; the velocity of each stretch and the distance covered are
//   computed. Optionally its position–time graph draws itself beside the motion, point for point.
//   The axis may stand upright (vertical: up is positive, the ground and a building drawn), and the motion may be
//   uniformly accelerated (accelerate: x0, v0, a): a ball thrown up from a building, a stone dropped from rest, with
//   its position marked every few seconds so the growing gaps show (user, 2026-10-26: the free-fall film needed a
//   ball thrown straight up from a 25 m building, which stage cannot throw).
// scale_compare: an object of length L shown against distances D, drawn to scale. It first appears large enough to
//   recognise, then shrinks to its true size against the distance while the ratio L/D is shown: when is it a point?
import type {Key} from '../keys.ts';
import {OBJECTS} from '../objects.ts';
import {toScene, type Plane} from '../plane.ts';
import type {Actor, Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {dfOf, exprErrors, fOf, inTime} from '../expr.ts';
import {round} from '../vec.ts';
import {n2, walking} from './calculus.ts';
import {niceStep} from './graph.ts';

const MOVERS = ['dot', 'figure', 'car', 'bus', 'train', 'bicycle', 'ball', 'block'] as const;
const SCALED = ['car', 'bus', 'train', 'bicycle', 'ball', 'block', 'figure'] as const;
const READOUTS = ['t', 'x', 'y', 'displacement', 'v', 'distance'] as const;
/** What can move on an upright axis: things that fall. */
const UPRIGHT = ['dot', 'ball', 'block'] as const;
type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};

export type MotionSpec = Common & {
  verb: 'motion_on_line';
  /** vertical: the axis stands upright, up positive (its coordinate is named y). */
  axis: {range: [number, number]; unit?: string; step?: number; vertical?: boolean};
  object?: (typeof MOVERS)[number];
  /** The object's real length in axis units, to draw it to scale (optional). */
  object_length?: number;
  moves?: {t: number; x: number}[];
  /** Instead of moves: x as a formula of time, x(t) written in the variable x (e.g. '0.08*x^3'), from t0 to t1
   * (user, 2026-10-24: the book's x = 0.08t³ car). The motion follows it exactly; v is its rate, read live. */
  formula?: {expr: string; t: [number, number]};
  /** Instead of moves or a formula: uniformly accelerated motion from x0 at velocity v0 with acceleration a (a = -9.8
   * for a ball thrown up under gravity), from t0 to t1. The formula x0 + v0 t + a t²/2 is followed exactly. */
  accelerate?: {x0: number; v0: number; a: number; t: [number, number]};
  /** Upright axis only: the ground (a line across, at this value) and a building or tower whose roof is at `top`. */
  ground?: number;
  building?: {top: number; label?: string};
  /** Mark where the mover is every `every` seconds, and list the distance covered in each interval. */
  every?: number;
  /** A speedometer beside the axis showing the mover's speed (max: the top of its dial). */
  speedometer?: {max?: number};
  marks?: {x: number; label: string}[];
  graph?: boolean;
  readouts?: (typeof READOUTS)[number][];
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const fmt = (v: number) => n2(Number(v.toFixed(3)), 3).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
const signed = (v: number) => (v > 0 ? `+${fmt(v)}` : fmt(v));

/** x0 + v0 t + a t²/2, written in the formula's variable. */
const accelerated = (c: NonNullable<MotionSpec['accelerate']>) => {
  // Written as a person would (25 + 20x - 5x^2): it is shown in facts and a linked graph's legend.
  const term = (v: number, tail: string, first: boolean) => (v === 0 ? '' : `${v < 0 ? (first ? '-' : ' - ') : first ? '' : ' + '}${
    !tail ? Math.abs(v) : Math.abs(v) === 1 ? tail : `${Math.abs(v)}*${tail}`}`);
  const expr = [term(c.x0, '', true), term(c.v0, 'x', !c.x0), term(c.a / 2, 'x^2', !c.x0 && !c.v0)].join('') || '0';
  return {expr, t: c.t};
};

export function motionErrors(s: MotionSpec): string[] {
  const e: string[] = [];
  const [a, b] = s.axis?.range ?? [NaN, NaN];
  if (!isNum(a) || !isNum(b) || a >= b) return ['motion_on_line: axis.range is [low, high]'];
  const up = s.axis.vertical === true;
  if (s.axis.vertical !== undefined && typeof s.axis.vertical !== 'boolean') e.push('motion_on_line: axis.vertical is true or false');
  if (up && s.object !== undefined && !UPRIGHT.includes(s.object as never)) e.push(`motion_on_line: on an upright axis the object is one of ${UPRIGHT.join(', ')}`);
  if (!up && (s.ground !== undefined || s.building !== undefined)) e.push('motion_on_line: ground and building need an upright axis (axis.vertical: true)');
  if (s.ground !== undefined && !(isNum(s.ground) && s.ground >= a && s.ground <= b)) e.push(`motion_on_line: ground must be on the axis (${a} to ${b})`);
  if (s.building !== undefined) {
    const floor = s.ground ?? Math.max(a, 0);
    if (!isNum(s.building?.top) || s.building.top <= floor || s.building.top > b) e.push(`motion_on_line: building.top must be above the ground (${floor}) and on the axis`);
    if (s.building?.label !== undefined && (typeof s.building.label !== 'string' || s.building.label.length > 24)) e.push('motion_on_line: building.label is short text (24 characters)');
  }
  if (s.every !== undefined && !(isNum(s.every) && s.every > 0)) e.push('motion_on_line: every is a positive number of seconds');
  if (s.accelerate !== undefined) {
    if (s.moves !== undefined || s.formula !== undefined) return [...e, 'motion_on_line: give one of moves, formula or accelerate'];
    const c = s.accelerate;
    if (![c?.x0, c?.v0, c?.a].every(isNum)) return [...e, 'motion_on_line: accelerate needs x0, v0 and a (numbers)'];
    if (!(isNum(c.x0) && c.x0 >= a && c.x0 <= b)) e.push(`motion_on_line: accelerate.x0 = ${c.x0} is off the axis (${a} to ${b})`);
    s = {...s, formula: accelerated(c)};
  }
  const [t0e, t1e] = s.formula?.t ?? s.moves?.length ? [s.formula?.t?.[0] ?? s.moves![0].t, s.formula?.t?.[1] ?? s.moves!.at(-1)!.t] : [0, 0];
  if (isNum(s.every) && s.every > 0 && isNum(t0e) && isNum(t1e) && (t1e - t0e) / s.every > 20) e.push('motion_on_line: every gives more than 20 marks; use a longer interval');
  if (up && s.readouts?.includes('displacement') && !s.formula) e.push('motion_on_line: on an upright axis the displacement readout needs accelerate or a formula');
  if (s.axis.step !== undefined && !(s.axis.step > 0 && (b - a) / s.axis.step <= 20)) e.push('motion_on_line: axis.step must give at most 20 ticks');
  if (s.object !== undefined && !MOVERS.includes(s.object)) e.push(`motion_on_line: object is one of ${MOVERS.join(', ')}`);
  if (s.object_length !== undefined) {
    if (!(s.object_length > 0)) e.push('motion_on_line: object_length must be positive');
    else if (s.object_length > 0.6 * (b - a)) e.push('motion_on_line: the object is too long for the axis (at most 60% of it)');
    if (!SCALED.includes((s.object ?? 'dot') as never)) e.push('motion_on_line: object_length needs an object that has a length (not a dot)');
  }
  if (s.formula !== undefined) {
    const formula = typeof s.formula?.expr === 'string' ? {...s.formula, expr: inTime(s.formula.expr)} : s.formula;
    if (s.moves !== undefined) return [...e, 'motion_on_line: give moves or a formula, not both'];
    const errs = exprErrors(formula?.expr, ['x'], 'motion_on_line: formula.expr');
    if (errs.length) return [...e, ...errs];
    const [t0, t1] = formula.t ?? [NaN, NaN];
    if (!isNum(t0) || !isNum(t1) || t0 < 0 || t1 <= t0 || t1 - t0 > 60) return [...e, `motion_on_line: ${s.accelerate ? 'accelerate' : 'formula'}.t is [t0, t1] seconds, under a minute`];
    const f = fOf(formula.expr);
    for (let i = 0; i <= 200; i++) {
      const v = f(t0 + (t1 - t0) * i / 200);
      if (!isNum(v) || v < a || v > b) { e.push(`motion_on_line: ${up ? 'y' : 'x'}(t) leaves the axis (${a} to ${b}) at t = ${fmt(t0 + (t1 - t0) * i / 200)} s; widen axis.range`); break; }
      if (up && s.ground !== undefined && v < s.ground - 1e-6) { e.push(`motion_on_line: it goes below the ground (${s.ground}) at t = ${fmt(t0 + (t1 - t0) * i / 200)} s; end the motion when it lands`); break; }
    }
    for (const r of s.readouts ?? []) if (!READOUTS.includes(r)) e.push(`motion_on_line: readouts are ${READOUTS.join(', ')}`);
    return e;
  }
  if (!Array.isArray(s.moves) || s.moves.length < 2) return [...e, 'motion_on_line: give at least two moves {t, x}, or a formula'];
  s.moves.forEach((m, i) => {
    const where = `motion_on_line: move ${i + 1}`;
    if (!isNum(m?.t) || !isNum(m?.x)) { e.push(`${where} needs t (seconds) and x`); return; }
    if (i === 0 && m.t < 0) e.push(`${where}: t starts at 0 or later`);
    if (i && !(m.t > s.moves![i - 1].t)) e.push(`${where}: times must increase`);
    if (m.x < a || m.x > b) e.push(`${where}: x = ${m.x} is off the axis (${a} to ${b})`);
  });
  if (s.moves!.at(-1)!.t > 60) e.push('motion_on_line: keep the motion under a minute');
  if (s.speedometer !== undefined && !(s.speedometer?.max === undefined || s.speedometer.max > 0)) e.push('motion_on_line: speedometer.max must be positive');
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
  // A formula is sampled finely (30 a second) into moves; readouts of v come from its exact rate.
  const up = s.axis.vertical === true, name = up ? 'y' : 'x';
  const given = s.accelerate ? accelerated(s.accelerate) : s.formula;
  const formula = given ? {...given, expr: inTime(given.expr)} : undefined, fx = formula ? fOf(formula.expr) : null;
  let moves: {t: number; x: number}[] = s.moves ?? [];
  if (formula) {
    const n = Math.ceil((formula.t[1] - formula.t[0]) * 30);
    moves = [];
    for (let i = 0; i <= n; i++) { const t = formula.t[0] + (formula.t[1] - formula.t[0]) * i / n; moves.push({t: round(t, 6), x: fx!(t)}); }
  }
  const T = moves.at(-1)!.t, kind = s.object ?? 'dot';
  const left = 0.06 * W, right = 0.6 * W, yAxis = (s.graph ? 0.3 : 0.6) * H;
  // Upright: the axis is a column (with the building just right of it, and the graph beyond); its top and bottom.
  // In a narrow box (a compound's part) the column moves left and the panel follows it, instead of starting at 0.66 W.
  const narrow = W < H, xAxis = (s.graph ? 0.12 : narrow ? 0.16 : 0.3) * W, top = 0.1 * H, bottom = 0.88 * H, house = s.building ? (narrow ? 0.1 : 0.07) * W : 0;
  const axis: Plane = up ? {id: 'axis', x: [0, 1], y: [a, b], box: [xAxis, top, xAxis + 10, bottom]}
    : {id: 'axis', x: [a, b], y: [0, 1], box: [left, yAxis - 10, right, yAxis]};
  const X = (x: number) => (up ? [xAxis, toScene(axis, [0, x])[1]] as [number, number] : toScene(axis, [x, 0]));
  const step = s.axis.step ?? niceStep(a, b);
  const props: Prop[] = up ? [
    {id: 'axis', type: 'arrow', x1: xAxis, y1: bottom + 30 * k, x2: xAxis, y2: top - 40 * k, style: {stroke: 'muted', width: 4 * k}, head: 18 * k},
    {id: 'plus', type: 'text', x: xAxis - 20 * k, y: top - 30 * k, text: '+y', size: 28 * k, align: 'end', weight: 700, style: {fill: 'muted'}},
  ] : [
    {id: 'axis', type: 'arrow', x1: left - 30 * k, y1: yAxis, x2: right + 50 * k, y2: yAxis, style: {stroke: 'muted', width: 4 * k}, head: 18 * k},
    {id: 'plus', type: 'text', x: right + 50 * k, y: yAxis + 44 * k, text: `+x`, size: 28 * k, align: 'end', weight: 700, style: {fill: 'muted'}},
  ];
  for (let v = Math.ceil(a / step) * step, i = 0; v <= b + 1e-9; v += step, i++) {
    const [px, py] = X(v), zero = Math.abs(v) < 1e-9, len = (zero ? 16 : 10) * k;
    props.push(up
      ? {id: `tick${i}`, type: 'line', x1: px - len, y1: py, x2: px + len, y2: py, style: {stroke: zero ? 'ink' : 'muted', width: (zero ? 4 : 3) * k}}
      : {id: `tick${i}`, type: 'line', x1: px, y1: yAxis - len, x2: px, y2: yAxis + len, style: {stroke: zero ? 'ink' : 'muted', width: (zero ? 4 : 3) * k}},
      up ? {id: `num${i}`, type: 'text', x: px - 26 * k, y: py + 9 * k, text: fmt(round(v, 9)), size: 26 * k, align: 'end', style: {fill: zero ? 'ink' : 'muted'}}
        : {id: `num${i}`, type: 'text', x: px, y: yAxis + 40 * k, text: fmt(round(v, 9)), size: 26 * k, align: 'middle', style: {fill: zero ? 'ink' : 'muted'}});
    if (zero && !up) props.push({id: 'origin', type: 'text', x: px, y: yAxis + 76 * k, text: 'O', size: 30 * k, align: 'middle', weight: 700});
  }
  if (up && s.ground !== undefined) {
    const [, gy] = X(s.ground);
    props.push({id: 'ground', type: 'line', x1: xAxis - 90 * k, y1: gy, x2: xAxis + house + 90 * k, y2: gy, style: {stroke: 'ink', width: 5 * k}});
    if (!s.building) props.push({id: 'ground-label', type: 'text', x: xAxis - 90 * k, y: gy + 36 * k, text: 'ground', size: 24 * k, style: {fill: 'muted'}});
  }
  if (up && s.building) {
    const [, roof] = X(s.building.top), [, foot] = X(s.ground ?? Math.max(a, 0)), x0 = xAxis + 14 * k;
    props.push({id: 'building', type: 'rect', x: x0, y: roof, w: house, h: foot - roof, style: {fill: 'faint', stroke: 'muted', width: 3 * k}});
    for (let f = 1, y = roof + 30 * k; y < foot - 40 * k && f < 40; f++, y += 46 * k)    // windows, floor by floor
      props.push({id: `window${f}`, type: 'rect', x: x0 + 0.3 * house, y, w: 0.4 * house, h: 20 * k, style: {fill: 'muted'}});
    // Its label sits under the ground, below the building (beside it is where the graph's numbers are).
    if (s.building.label) props.push({id: 'building-label', type: 'text', x: x0 + house / 2, y: foot + 40 * k, text: s.building.label, size: 24 * k, weight: 700, align: 'middle', style: {fill: 'muted'}});
  }
  // The origin is already labelled O: a mark repeating it is dropped.
  (s.marks ?? []).filter(m => !(Math.abs(m.x) < 1e-9 && /^(o|origin)$/i.test(m.label.trim()))).forEach((m, i) => {
    const [px, py] = X(m.x);
    props.push({id: `mark${i}`, type: 'circle', x: px, y: py, r: 8 * k, style: {fill: 'cool'}, layer: 1},
      up ? {id: `mark${i}-label`, type: 'text', x: xAxis + house + 30 * k, y: py + 9 * k, text: m.label, size: 26 * k, weight: 700, style: {fill: 'cool'}}
        : {id: `mark${i}-label`, type: 'text', x: px, y: yAxis + 112 * k, text: m.label, size: 26 * k, align: 'middle', weight: 700, style: {fill: 'cool'}});
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
  const facingKeys: Key[] = up ? [[0, 1]] : facings.length ? facings.flatMap(([t, f], i) => (i ? [[t, facings[i - 1][1]], [t, f]] : [[0, f], [t, f]]) as Key[]) : [[0, 1]];
  const unitPx = (right - left) / (b - a);
  if (kind === 'figure') {
    const walker: Actor = {id: 'walker', rig: 'figure', at: X(moves[0].x), base, scale: (s.object_length ? s.object_length * unitPx / 70 : 1.4) * k,
      facing: facings[0]?.[1] === -1 ? -1 : 1, facings: facings.map(([t, f]) => ({t, facing: f as 1 | -1})), pose: [{t: 0, pose: 'stand'}], layer: 2};
    if (formula) walker.pose!.push(...walking(moves[0].t, T));
    else moves.slice(1).forEach((m, i) => { if (m.x !== moves[i].x) walker.pose!.push(...walking(moves[i].t, m.t)); });
    actors.push(walker);
  } else if (kind !== 'dot') {
    const size = s.object_length ? s.object_length * unitPx : Math.min(OBJECTS[kind].length, 0.18 * (right - left)) * k;
    props.push({id: 'object', type: 'object', name: kind, x: X(moves[0].x)[0], y: X(moves[0].x)[1], size, anchor: {actor: 'mover', joint: 'p'},
      keys: {facing: facingKeys}, layer: 2});
  }

  const tip = {actor: 'mover', joint: 'p'};
  const px = up && !s.graph ? xAxis + house + 0.12 * W : 0.66 * W, pw = W - px - 40 * k;
  let row = 0.14 * H;
  if (s.title) {
    props.push({id: 'title', type: 'text', x: px, y: row, text: s.title, size: 44 * k, weight: 700, width: pw});
    row += wrapText(s.title, 44 * k, pw).length * 1.25 * 44 * k + 24 * k;
  }
  const reads = (s.readouts ?? ['t', 'x']).map(r => (r === 'y' ? 'x' : r));
  if (reads.includes('t')) { props.push({id: 'ro-t', type: 'readout', x: px, y: row, size: 34 * k, text: 't = {t} s', decimals: 1, measures: {t: {kind: 'time'}}}); row += 1.35 * 34 * k; }
  if (reads.includes('x')) { props.push({id: 'ro-x', type: 'readout', x: px, y: row, size: 34 * k, text: `${name} = {x}${u}`, decimals: 2, measures: {x: {kind: 'coord', of: tip, plane: 'axis', axis: up ? 'y' : 'x'}}, style: {fill: 'accent'}}); row += 1.35 * 34 * k; }
  if (reads.includes('displacement') && up && formula) {
    props.push({id: 'ro-d', type: 'readout', x: px, y: row, size: 34 * k, text: `displacement = {d}${u}`, decimals: 2,
      measures: {d: {kind: 'of_time', expr: `(${formula.expr}) - (${moves[0].x})`, from: 0, until: formula.t[1]}}, style: {fill: 'cool'}});
    row += 1.35 * 34 * k;
  } else if (reads.includes('displacement')) {
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
  if (formula && reads.includes('v')) {
    props.push({id: 'ro-v', type: 'readout', x: px, y: row, size: 34 * k, text: `v = {v}${unit ? ` ${unit}/s` : ''}`, decimals: 2,
      measures: {v: {kind: 'of_time', expr: formula.expr, rate: true, from: 0, until: formula.t[1]}}, style: {fill: 'good'}});
    row += 1.35 * 34 * k;
  } else if (reads.includes('v')) shared('ro-v', segments.map((g, i) => ({text: `v = ${signed(round(g.v, 6))}${unit ? ` ${unit}/s` : ''}`,
    show: [g.t0, i < segments.length - 1 ? g.t1 : 1e9] as [number, number]})), 'good');
  if (reads.includes('distance') && !formula) {
    let covered = 0;
    shared('ro-s', segments.map((g, i) => {
      covered += Math.abs(g.x1 - g.x0);
      return {text: `distance covered = ${fmt(round(covered, 6))}${u}`, show: [g.t1, i < segments.length - 1 ? segments[i + 1].t1 : 1e9] as [number, number]};
    }));
  }

  const planes: Plane[] = [axis];
  if (s.graph) {
    // Upright: the graph stands beside the axis on the same heights, so the dashed link from the ball is level.
    const xt: Plane = {id: 'xt', x: [0, Math.max(T, 1)], y: [a, b], box: up ? [xAxis + house + 0.12 * W, top, right, bottom] : [0.1 * W, 0.46 * H, right, 0.9 * H]};
    planes.push(xt);
    props.push({id: 'xt-axes', type: 'axes', plane: 'xt', step: [niceStep(0, Math.max(T, 1)), step], names: ['t (s)', `${name}${unit ? ` (${unit})` : ''}`], size: 22 * k});
    actors.push({id: 'tracer', rig: 'dot', at: toScene(xt, [moves[0].t, moves[0].x]), scale: 1.1 * k, layer: 4,
      base: moves.map((m, i) => ({t: m.t, at: toScene(xt, [m.t, m.x]), ...(i ? {ease: 'linear' as const} : {})}))});
    props.push({id: 'xt-line', type: 'trail', of: {actor: 'tracer', joint: 'p'}, t0: moves[0].t, style: {stroke: 'accent', width: 5 * k}, layer: 3},
      {id: 'link', type: 'line', x1: 0, y1: 0, x2: 0, y2: 0, ends: [up ? tip : {...tip, pin: {y: yAxis + 20 * k}}, {actor: 'tracer', joint: 'p'}],
        style: {stroke: 'muted', width: 2 * k, dash: [5 * k, 8 * k]}, layer: 1});
  }

  if (s.speedometer) {
    // Its reading: the formula's rate, or the speed of each stretch (constant between moves).
    const keys: Key[] = formula ? moves.map(m => [m.t, Math.abs(dfOf(formula.expr)(m.t)), 'linear'] as Key)
      : segments.flatMap(g => [[g.t0, Math.abs(g.v)], [g.t1, Math.abs(g.v)]] as Key[]);
    const max = s.speedometer.max ?? Math.max(1, ...keys.map(x => x[1])) * 1.25;
    props.push({id: 'speedometer', type: 'object', name: 'speedometer', x: 0.8 * W, y: 0.9 * H, size: 260 * k,
      params: {max: Number(max.toPrecision(2)), unit: unit ? `${unit}/s` : ''}, keys: {a: keys}, a: keys[0][1]});
  }
  // Every few seconds: a mark where the mover is, and the distance covered in that interval (the odd-number rule).
  const where = (t: number) => (fx ? fx(t) : (() => {
    const g = segments.find(q => t <= q.t1 + 1e-9) ?? segments.at(-1)!;
    return g.x0 + g.v * (Math.min(t, g.t1) - g.t0);
  })());
  const intervals: {t0: number; t1: number; distance: number}[] = [];
  if (s.every) {
    const t0 = moves[0].t, n = Math.floor((T - t0) / s.every + 1e-9);
    for (let i = 0; i <= n; i++) {
      const t = round(t0 + i * s.every, 6), x = where(t), [mx, my] = X(x);
      props.push(up ? {id: `every${i}`, type: 'line', x1: mx - 22 * k, y1: my, x2: mx + 22 * k, y2: my, style: {stroke: 'cool', width: 4 * k}, show: [t, 1e9], layer: 2}
        : {id: `every${i}`, type: 'line', x1: mx, y1: yAxis - 26 * k, x2: mx, y2: yAxis + 26 * k, style: {stroke: 'cool', width: 4 * k}, show: [t, 1e9], layer: 2},
      up ? {id: `every${i}-t`, type: 'text', x: xAxis - 90 * k, y: my + 9 * k, text: `${fmt(t)} s`, size: 22 * k, align: 'end', style: {fill: 'cool'}, show: [t, 1e9]}
        : {id: `every${i}-t`, type: 'text', x: mx, y: yAxis - 40 * k, text: `${fmt(t)} s`, size: 22 * k, align: 'middle', style: {fill: 'cool'}, show: [t, 1e9]});
      if (i) intervals.push({t0: round(t - s.every, 6), t1: t, distance: round(Math.abs(x - where(t - s.every)), 6)});
    }
    for (const [i, g] of intervals.slice(0, 8).entries()) {
      props.push({id: `interval${i}`, type: 'text', x: px, y: row, text: `${fmt(g.t0)}–${fmt(g.t1)} s: ${fmt(g.distance)}${u}`, size: 30 * k, show: [g.t1, 1e9], fade: 0.2, style: {fill: 'cool'}});
      row += 1.3 * 30 * k;
    }
  }
  const total = moves.at(-1)!.x - moves[0].x, distance = segments.reduce((d, g) => d + Math.abs(g.x1 - g.x0), 0);
  const turn = s.accelerate && s.accelerate.a && -s.accelerate.v0 / s.accelerate.a;
  const extra = [
    ...(s.accelerate ? [`it starts at ${name} = ${fmt(s.accelerate.x0)}${u} with velocity ${signed(s.accelerate.v0)}${unit ? ` ${unit}/s` : ''} and acceleration ${signed(s.accelerate.a)}${unit ? ` ${unit}/s²` : ''}`] : []),
    ...(turn && turn > moves[0].t && turn < T ? [`it stops and turns back at t = ${fmt(round(turn, 6))} s, at ${name} = ${fmt(round(fx!(turn), 6))}${u}`] : []),
    ...(intervals.length ? [`distance in each ${fmt(s.every!)} s interval: ${intervals.map(g => fmt(g.distance)).join(', ')}${u}`] : []),
  ];
  const facts = formula ? [
    `${name} = ${formula.expr.replace(/(?<![a-z])x(?![a-z])/g, 't')} from t = ${fmt(formula.t[0])} s to ${fmt(formula.t[1])} s: ${name} goes from ${fmt(moves[0].x)} to ${fmt(moves.at(-1)!.x)}${u}`,
    ...[formula.t[0], (formula.t[0] + formula.t[1]) / 2, formula.t[1]].map(t => `at t = ${fmt(t)} s, v = ${fmt(round(dfOf(formula.expr)(t), 6))}${unit ? ` ${unit}/s` : ''}`),
    `average velocity over the whole motion: ${fmt(round((moves.at(-1)!.x - moves[0].x) / (T - moves[0].t), 6))}${unit ? ` ${unit}/s` : ''}`,
    ...extra,
  ] : [
    ...segments.map(g => `from t = ${fmt(g.t0)} s to ${fmt(g.t1)} s: x goes from ${fmt(g.x0)} to ${fmt(g.x1)}${u}, velocity ${signed(round(g.v, 6))}${unit ? ` ${unit}/s` : ''}`),
    `displacement ${signed(round(total, 6))}${u}; distance covered ${fmt(round(distance, 6))}${u}`,
    ...extra,
  ];
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: T + 1.5, theme: s.theme ?? 'dark', planes, props, actors,
    surfaces: kind === 'figure' ? [{x0: left - 30 * k, x1: right + 50 * k, y: yAxis}] : undefined,
    meta: {verb: 'motion_on_line', facts, segments, displacement: round(total, 9), distance: round(distance, 9), ...(intervals.length ? {intervals} : {}),
      // Its motion as a formula of time, for a compound's link to plot (compose.ts).
      ...(formula ? {signal: {name, unit, expr: formula.expr.replace(/(?<![a-z])x(?![a-z])/g, 't'), t: formula.t}} : {})}};
}

// ---------------------------------------------------------------------------------------------------------------
const COMPARED = ['car', 'bus', 'train', 'bicycle', 'ball', 'block'] as const;
export type ScaleSpec = Common & {
  verb: 'scale_compare';
  object: (typeof COMPARED)[number];
  /** The object's length in metres. */
  length: number;
  cases: {label: string; distance: number; setting?: (typeof SETTINGS)[number]}[];
};
/** What the distance is drawn as: a platform beside the track, a road, a parking bay, or a route between two places. */
const SETTINGS = ['route', 'platform', 'road', 'parking'] as const;

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
    if (c?.setting !== undefined && !SETTINGS.includes(c.setting)) e.push(`${where}: setting is one of ${SETTINGS.join(', ')}`);
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
    // A long object against a short distance (a bus in a parking bay) would be drawn too tall for its row: the whole
    // case is drawn smaller instead, so it stays to scale and fits.
    const ratio = s.length / c.distance, reach = Math.min(span, big / ratio), end = x0 + reach;
    const y = top + gap * (i + 0.72), small = Math.max(ratio * reach, 0.6 * k);
    const at = t, shrink = at + 1.2, done = shrink + 2.6;
    props.push(
      {id: `label${i}`, type: 'text', x: x0, y: y - gap * 0.52, text: c.label, size: 32 * k, weight: 700, show: [at, 1e9]},
      (c.setting ?? 'route') === 'route'
        ? {id: `bar${i}`, type: 'line', x1: x0, y1: y + 12 * k, x2: end, y2: y + 12 * k, draw: 0, keys: {draw: [[at, 0], [at + 1, 1, 'inOut']]}, style: {stroke: 'accent', width: 6 * k}}
        : {id: `bar${i}`, type: 'object', name: c.setting!, x: (x0 + end) / 2, y: y + 9 * k, size: reach, show: [at, 1e9], fade: 0.6, layer: 1},
      {id: `end${i}a`, type: 'line', x1: x0, y1: y, x2: x0, y2: y + 24 * k, style: {stroke: 'accent', width: 4 * k}, show: [at, 1e9]},
      {id: `end${i}b`, type: 'line', x1: end, y1: y, x2: end, y2: y + 24 * k, style: {stroke: 'accent', width: 4 * k}, show: [at + 1, 1e9]},
      {id: `dist${i}`, type: 'text', x: end, y: y + 50 * k, text: `D = ${metres(c.distance)}`, size: 28 * k, align: 'end', style: {fill: 'accent'}, show: [at + 1, 1e9]},
      // Recognisable first, then its true size against the distance; its left end stays on the start of the bar.
      {id: `obj${i}`, type: 'object', name: s.object, x: x0 + big / 2, y: y + 9 * k, size: big, show: [at, 1e9], layer: 2, params: {smoke: 0},
        keys: {size: [[shrink, big], [done, Math.min(big, small), 'inOut']], x: [[shrink, x0 + big / 2], [done, x0 + Math.min(big, small) / 2, 'inOut']]}},
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
