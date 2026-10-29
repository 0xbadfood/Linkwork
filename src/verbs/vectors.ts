// Vectors on a plane drawn to scale (one unit is the same length across and up, so angles are true): adding head to
// tail or by the parallelogram, subtracting as adding the negative, multiplying by a number, equal vectors drawn at
// different places, resolving into components along x and y with the unit vectors, and adding by components. Every
// number shown is computed from the vectors as given, by magnitude and angle or by components (user, 2026-10-29:
// Class 11 Motion in a Plane needed all of these; the verb only added two vectors head to tail).
import {toScene, type Plane} from '../plane.ts';
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {round} from '../vec.ts';
import {n2, panel, scene, text} from './calculus.ts';

/** A vector by components [x, y], or by magnitude and direction (degrees anticlockwise from +x). */
export type V = [number, number] | {magnitude: number; angle: number};
export const MODES = ['add', 'subtract', 'scale', 'equal', 'resolve', 'components'] as const;
export type VectorSpec = {verb: 'vector_add'; mode?: (typeof MODES)[number]; a: V; b?: V; method?: 'triangle' | 'parallelogram';
  factors?: number[]; at?: [number, number][]; names?: [string, string]; unit?: string; x?: [number, number]; y?: [number, number];
  title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};

const DEG = Math.PI / 180;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const okV = (v: unknown) => (Array.isArray(v) ? v.length === 2 && v.every(isNum)
  : !!v && typeof v === 'object' && isNum((v as {magnitude: number}).magnitude) && (v as {magnitude: number}).magnitude >= 0
    && isNum((v as {angle: number}).angle));
const xy = (v: V): [number, number] => (Array.isArray(v) ? v : [v.magnitude * Math.cos(v.angle * DEG), v.magnitude * Math.sin(v.angle * DEG)]);
const polar = (v: V) => !Array.isArray(v);
const f = (v: number) => n2(round(v, 9), Number.isInteger(round(v, 9)) ? 0 : 2);
const deg = (x: number, y: number) => Math.atan2(y, x) / DEG;

/** Every point the drawing reaches (tails and heads), for the window. */
function points(s: VectorSpec): [number, number][] {
  const a = xy(s.a), b = s.b ? xy(s.b) : [0, 0] as [number, number], mode = s.mode ?? 'add';
  const sum: [number, number] = [a[0] + b[0], a[1] + b[1]];
  switch (mode) {
    case 'add': return [[0, 0], a, b, sum];
    case 'subtract': return [[0, 0], a, b, [a[0] - b[0], a[1] - b[1]]];
    case 'scale': return [[0, 0], a, ...(s.factors ?? [2, -1]).map(k => [k * a[0], k * a[1]] as [number, number])];
    case 'equal': return [[0, 0], a, ...(s.at ?? [[2, 1]]).flatMap(p => [p, [p[0] + a[0], p[1] + a[1]]] as [number, number][])];
    case 'resolve': return [[0, 0], a, [a[0], 0], [0, a[1]]];
    case 'components': return [[0, 0], a, b, sum, [a[0], 0], [0, a[1]], [b[0], 0], [0, b[1]]];
  }
}

/** A window with equal units across and up, holding every point with a margin. */
function fit(s: VectorSpec, boxW: number, boxH: number): {x: [number, number]; y: [number, number]} {
  const ps = points(s);
  let [x0, x1] = s.x ?? [Math.min(...ps.map(p => p[0])), Math.max(...ps.map(p => p[0]))];
  let [y0, y1] = s.y ?? [Math.min(...ps.map(p => p[1])), Math.max(...ps.map(p => p[1]))];
  if (!s.x) { const m = 0.15 * Math.max(x1 - x0, y1 - y0, 1); x0 -= m; x1 += m; }
  if (!s.y) { const m = 0.15 * Math.max(x1 - x0, y1 - y0, 1); y0 -= m; y1 += m; }
  // equal scale: widen the narrower direction about its middle
  const per = Math.max((x1 - x0) / boxW, (y1 - y0) / boxH);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return {x: [cx - per * boxW / 2, cx + per * boxW / 2], y: [cy - per * boxH / 2, cy + per * boxH / 2]};
}

export function vectorErrors(s: VectorSpec): string[] {
  const e: string[] = [], mode = s.mode ?? 'add';
  if (!MODES.includes(mode)) return [`vector_add: mode is one of ${MODES.join(', ')}`];
  if (!okV(s.a)) return ['vector_add: a is [x, y] or {magnitude, angle} (angle in degrees from +x)'];
  const needsB = ['add', 'subtract', 'components'].includes(mode);
  if (needsB && !okV(s.b)) e.push(`vector_add: ${mode} needs b as [x, y] or {magnitude, angle}`);
  if (s.method !== undefined && !['triangle', 'parallelogram'].includes(s.method)) e.push('vector_add: method is triangle or parallelogram');
  if (s.factors !== undefined && (!Array.isArray(s.factors) || !s.factors.length || s.factors.length > 3 || !s.factors.every(isNum)))
    e.push('vector_add: factors is 1 to 3 numbers (2, −1, 0.5)');
  if (s.at !== undefined && (!Array.isArray(s.at) || !s.at.length || s.at.length > 3 || !s.at.every(p => Array.isArray(p) && p.length === 2 && p.every(isNum))))
    e.push('vector_add: at is 1 to 3 tail points [x, y] for copies of a');
  if (s.names !== undefined && (!Array.isArray(s.names) || s.names.length !== 2 || !s.names.every(n => typeof n === 'string' && n.length >= 1 && n.length <= 3)))
    e.push("vector_add: names is two short names, such as ['A', 'B']");
  if (e.length) return e;
  const [ax, ay] = xy(s.a);
  if (Math.hypot(ax, ay) < 1e-9 && mode !== 'add') e.push('vector_add: a has zero length');
  for (const [lo, hi, name] of [[...(s.x ?? [0, 1]), 'x'], [...(s.y ?? [0, 1]), 'y']] as [number, number, string][])
    if (!(lo < hi)) e.push(`vector_add: ${name} is a window [low, high]`);
  if (s.x || s.y) {
    const [x0, x1] = s.x ?? [-Infinity, Infinity], [y0, y1] = s.y ?? [-Infinity, Infinity];
    for (const p of points(s)) if (p[0] < x0 || p[0] > x1 || p[1] < y0 || p[1] > y1) {
      e.push(`vector_add: (${f(p[0])}, ${f(p[1])}) is outside the window; widen x or y, or leave them out to fit`); break;
    }
  }
  return e;
}

export function vectorAdd(s: VectorSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, mode = s.mode ?? 'add';
  const box: [number, number, number, number] = [0.06 * W, 0.16 * H, 0.6 * W, 0.94 * H];
  const win = fit(s, box[2] - box[0], box[3] - box[1]);
  const plane: Plane = {id: 'p', x: win.x, y: win.y, box};
  const span = win.x[1] - win.x[0], step = [1, 2, 5, 10, 20, 50, 100].find(v => span / v <= 14) ?? 200;
  const axes: Prop = {id: 'axes', type: 'axes', plane: 'p', step: [step, step], size: 22 * k, grid: true};
  const px = 0.66 * W, ptext = panel(W, k);
  const title: Prop[] = s.title ? [{id: 'title', type: 'text', x: px, y: 0.155 * H, size: 44 * k, weight: 700, text: s.title, width: W - px - 40 * k}] : [];
  let row = 0.155 * H + (s.title ? wrapText(s.title, 44 * k, W - px - 40 * k).length * 1.25 * 44 * k + 20 * k : 0);
  const [A, B] = s.names ?? ['a', 'b'], u = s.unit ? ` ${s.unit}` : '';
  const a = xy(s.a), b = s.b ? xy(s.b) : [0, 0] as [number, number];
  const magA = Math.hypot(...a), magB = Math.hypot(...b);
  const props: Prop[] = [axes, ...title];
  const facts: string[] = [];
  const perUnit = (box[2] - box[0]) / span;              // pixels per unit, the same both ways
  const off = 26 * k / perUnit;                           // a label's distance from its arrow, in units

  const arrow = (id: string, p: [number, number], q: [number, number], stroke: string, from: number, extra: Partial<Prop> = {}): Prop =>
    ({id, type: 'arrow', plane: 'p', x1: p[0], y1: p[1], x2: q[0], y2: q[1], draw: 0, keys: {draw: [[from, 0], [from + 1.1, 1, 'inOut']]},
      style: {stroke, width: 6 * k}, head: 22 * k, show: [from, 1e9], fade: 0.01, ...extra} as Prop);
  const ghost = (id: string, p: [number, number], q: [number, number], stroke: string, from: number) =>
    arrow(id, p, q, stroke, from, {style: {stroke, width: 3 * k, dash: [8 * k, 8 * k], opacity: 0.65}, head: 16 * k});
  const dashed = (id: string, p: [number, number], q: [number, number], from: number): Prop =>
    ({id, type: 'line', plane: 'p', x1: p[0], y1: p[1], x2: q[0], y2: q[1], style: {stroke: 'muted', width: 2.5 * k, dash: [6 * k, 6 * k]}, show: [from, 1e9], fade: 0.3} as Prop);
  // a label beside the middle of p→q, on the side `side` (+1 left of the direction of travel)
  const label = (id: string, p: [number, number], q: [number, number], t: string, fill: string, from: number, side = 1) => {
    const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, nx = -side * dy / l, ny = side * dx / l;
    // clear of the arrow: half the label's width across a steep arrow, half its height across a flat one
    const half = 0.3 * 34 * k * t.length / perUnit, tall = 0.5 * 34 * k / perUnit;
    const d = off + Math.abs(nx) * half + Math.abs(ny) * tall;
    const m: [number, number] = [(p[0] + q[0]) / 2 + nx * d, (p[1] + q[1]) / 2 + ny * d];
    const [sx, sy] = toScene(plane, m);
    return text(id, sx, sy + 12 * k, t, 34 * k, {weight: 700, align: 'middle', style: {fill}, show: [from + 0.7, 1e9]});
  };
  const line = (id: string, t: string, from: number, extra: Partial<Prop> = {}) => {
    props.push(ptext(id, px, row, t, 32 * k, {show: [from, 1e9], ...extra}));
    row += wrapText(t, 32 * k, W - px - 40 * k).length * 1.3 * 32 * k + 6 * k;
  };
  const given = (name: string, v: V) => (polar(v) ? `|${name}| = ${f((v as {magnitude: number}).magnitude)}${u} at ${f((v as {angle: number}).angle)}° to x`
    : `${name} = (${f(xy(v)[0])}, ${f(xy(v)[1])})${u}`);
  const comps = (name: string, p: [number, number]) => `${name} = ${f(p[0])} î ${p[1] < 0 ? '−' : '+'} ${f(Math.abs(p[1]))} ĵ${u}`;
  const arc = (id: string, r: number, from: number, to: number, at: number, stroke: string, centre: [number, number] = [0, 0]): Prop => {
    const n = 24, pts: [number, number][] = [];
    for (let i = 0; i <= n; i++) { const t = (from + (to - from) * i / n) * DEG; pts.push([centre[0] + r * Math.cos(t), centre[1] + r * Math.sin(t)]); }
    return {id, type: 'polyline', plane: 'p', points: pts, style: {stroke, width: 3 * k}, show: [at, 1e9], fade: 0.3} as Prop;
  };
  let end = 6;

  if (mode === 'add') {
    const r: [number, number] = [a[0] + b[0], a[1] + b[1]], magR = Math.hypot(...r);
    const theta = Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1]) / ((magA * magB) || 1)))) / DEG;
    const alpha = Math.acos(Math.max(-1, Math.min(1, (a[0] * r[0] + a[1] * r[1]) / ((magA * magR) || 1)))) / DEG;
    if (s.method === 'parallelogram') {
      props.push(arrow('a', [0, 0], a, 'accent', 0.6), arrow('b', [0, 0], b, 'cool', 1.6),
        ghost('b2', a, r, 'cool', 2.8), ghost('a2', b, r, 'accent', 2.8), arrow('r', [0, 0], r, 'ink', 4),
        label('la', [0, 0], a, A, 'accent', 0.6, -1), label('lb', [0, 0], b, B, 'cool', 1.6), label('lr', [0, 0], r, `${A} + ${B}`, 'ink', 4, 1));
      line('l1', `${given(A, s.a)};  ${given(B, s.b!)}`, 0.6);
      line('l2', `Both from one point; complete the parallelogram: the diagonal is ${A} + ${B}.`, 2.8, {style: {fill: 'muted'}});
    } else {
      props.push(arrow('a', [0, 0], a, 'accent', 0.6), arrow('b', a, r, 'cool', 1.8), arrow('r', [0, 0], r, 'ink', 3.2),
        ghost('b2', [0, 0], b, 'cool', 4.8), ghost('a2', b, r, 'accent', 4.8),
        label('la', [0, 0], a, A, 'accent', 0.6, -1), label('lb', a, r, B, 'cool', 1.8, -1), label('lr', [0, 0], r, `${A} + ${B}`, 'ink', 3.2, 1));
      line('l1', `${given(A, s.a)};  ${given(B, s.b!)}`, 0.6);
      line('l2', `Head to tail: ${B} starts where ${A} ends.`, 1.8, {style: {fill: 'muted'}});
    }
    if (polar(s.a) || polar(s.b!)) {
      line('l3', `|R|² = ${A}² + ${B}² + 2 ${A} ${B} cos θ, θ = ${f(theta)}°`, 4);
      line('l4', `|${A} + ${B}| = ${f(magR)}${u}, at ${f(alpha)}° to ${A}`, 4.6, {weight: 700});
    } else {
      line('l3', `${A} + ${B} = (${f(a[0])} + ${f(b[0])}, ${f(a[1])} + ${f(b[1])}) = (${f(r[0])}, ${f(r[1])})${u}`, 4, {weight: 700});
      line('l4', `|${A} + ${B}| = √(${f(r[0])}² + ${f(r[1])}²) = ${f(magR)}${u}`, 4.6);
    }
    if (s.method !== 'parallelogram') line('l5', `Either order gives the same ${A} + ${B}.`, 5.2, {style: {fill: 'muted'}});
    facts.push(`|${A} + ${B}| = ${f(magR)}${u}`, `${A} + ${B} = (${f(r[0])}, ${f(r[1])})${u}`, `angle between ${A} and ${B} = ${f(theta)}°`,
      `${A} + ${B} makes ${f(alpha)}° with ${A}`, `${A} + ${B} makes ${f(deg(...r))}° with the x-axis`);
    end = 6.4;
    return scene(s, W, H, end, plane, props, [], {verb: 'vector_add', facts, sum: [round(r[0], 6), round(r[1], 6)], magnitude: round(magR, 6)});
  }

  if (mode === 'subtract') {
    const nb: [number, number] = [-b[0], -b[1]], d: [number, number] = [a[0] - b[0], a[1] - b[1]], magD = Math.hypot(...d);
    props.push(arrow('a', [0, 0], a, 'accent', 0.6), arrow('b', [0, 0], b, 'cool', 1.6), arrow('nb', a, d, 'bad', 2.8),
      arrow('d', [0, 0], d, 'ink', 4), label('la', [0, 0], a, A, 'accent', 0.6, -1), label('lb', [0, 0], b, B, 'cool', 1.6),
      label('lnb', a, d, `−${B}`, 'bad', 2.8, -1), label('ld', [0, 0], d, `${A} − ${B}`, 'ink', 4, 1));
    line('l1', `${given(A, s.a)};  ${given(B, s.b!)}`, 0.6);
    line('l2', `−${B}: the same length as ${B}, turned the other way.`, 2.8, {style: {fill: 'muted'}});
    line('l3', `${A} − ${B} = ${A} + (−${B}) = (${f(d[0])}, ${f(d[1])})${u}`, 4, {weight: 700});
    line('l4', `|${A} − ${B}| = ${f(magD)}${u}`, 4.6);
    facts.push(`${A} − ${B} = (${f(d[0])}, ${f(d[1])})${u}`, `|${A} − ${B}| = ${f(magD)}${u}`, `−${B} = (${f(nb[0])}, ${f(nb[1])})${u}`);
    return scene(s, W, H, 6.4, plane, props, [], {verb: 'vector_add', facts});
  }

  if (mode === 'scale') {
    const ks = s.factors ?? [2, -1];
    // each multiple from its own tail, set apart across a's direction so they do not overlap
    const nx = -a[1] / magA, ny = a[0] / magA, gap = 0.12 * Math.max(span, 1);
    props.push(arrow('a', [0, 0], a, 'accent', 0.6), label('la', [0, 0], a, A, 'accent', 0.6, 1));
    line('l1', given(A, s.a), 0.6);
    ks.forEach((m, i) => {
      const t0: [number, number] = [-(i + 1) * gap * nx, -(i + 1) * gap * ny], t1: [number, number] = [t0[0] + m * a[0], t0[1] + m * a[1]];
      const at = 1.8 + 1.4 * i, name = m === 1 ? A : m === -1 ? `−${A}` : `${f(m)}${A}`;
      props.push(arrow(`k${i}`, t0, t1, m < 0 ? 'bad' : 'cool', at), label(`lk${i}`, t0, t1, name, m < 0 ? 'bad' : 'cool', at, -1));
      const size = Math.abs(m) === 1 ? 'the same length' : m === 0 ? 'the zero vector' : `${f(Math.abs(m))} times as long`;
      line(`m${i}`, `${name}: ${size}${m < 0 ? ', turned the other way' : ''}; |${name}| = ${f(Math.abs(m) * magA)}${u}`, at);
      facts.push(`|${name}| = ${f(Math.abs(m) * magA)}${u}`, `${name} = (${f(m * a[0])}, ${f(m * a[1])})${u}`);
    });
    end = 2.4 + 1.4 * ks.length;
    return scene(s, W, H, end, plane, props, [], {verb: 'vector_add', facts});
  }

  if (mode === 'equal') {
    const tails = s.at ?? [[2, 1]];
    props.push(arrow('a', [0, 0], a, 'accent', 0.6), label('la', [0, 0], a, A, 'accent', 0.6, 1));
    tails.forEach((p, i) => {
      const q: [number, number] = [p[0] + a[0], p[1] + a[1]], at = 1.8 + 1.2 * i;
      props.push(ghost(`g${i}`, [0, 0], p, 'muted', at), arrow(`c${i}`, p, q, 'accent', at + 0.6), label(`lc${i}`, p, q, A, 'accent', at + 0.6, 1));
    });
    line('l1', given(A, s.a), 0.6);
    line('l2', `Moved without turning or stretching, ${A} is the same vector: equal vectors have the same magnitude and direction, wherever they are drawn.`, 1.8);
    facts.push(`|${A}| = ${f(magA)}${u}`, `${A} makes ${f(deg(...a))}° with the x-axis`);
    end = 3.2 + 1.2 * tails.length;
    return scene(s, W, H, end, plane, props, [], {verb: 'vector_add', facts});
  }

  if (mode === 'resolve') {
    const th = deg(...a), unit = Math.max(0.12 * span, 0.6);
    props.push(arrow('a', [0, 0], a, 'accent', 0.6), label('la', [0, 0], a, A, 'accent', 0.6, 1),
      dashed('px', a, [a[0], 0], 1.8), dashed('py', a, [0, a[1]], 1.8),
      arrow('ax', [0, 0], [a[0], 0], 'cool', 2.2), arrow('ay', [0, 0], [0, a[1]], 'good', 2.8),
      label('lax', [0, 0], [a[0], 0], `${A}x î`, 'cool', 2.2, a[0] >= 0 ? -1 : 1), label('lay', [0, 0], [0, a[1]], `${A}y ĵ`, 'good', 2.8, a[1] >= 0 ? 1 : -1),
      arc('th', 0.22 * Math.max(span, 1) * 0.6, 0, th, 1.4, 'ink'),
      arrow('i', [0, 0], [unit, 0], 'ink', 4.2, {style: {stroke: 'ink', width: 4 * k}, head: 14 * k}),
      arrow('j', [0, 0], [0, unit], 'ink', 4.2, {style: {stroke: 'ink', width: 4 * k}, head: 14 * k}));
    const [tx, ty] = toScene(plane, [0.3 * Math.max(span, 1) * 0.6 * Math.cos(th / 2 * DEG), 0.3 * Math.max(span, 1) * 0.6 * Math.sin(th / 2 * DEG)]);
    props.push(text('lth', tx, ty + 10 * k, 'θ', 32 * k, {weight: 700, align: 'middle', show: [1.6, 1e9]}));
    const [ix, iy] = toScene(plane, [unit, 0]), [jx, jy] = toScene(plane, [0, unit]);
    props.push(text('li', ix, iy + 36 * k, 'î', 30 * k, {weight: 700, align: 'middle', show: [4.6, 1e9]}),
      text('lj', jx + 22 * k, jy + 10 * k, 'ĵ', 30 * k, {weight: 700, show: [4.6, 1e9]}));
    line('l1', given(A, s.a) + (polar(s.a) ? '' : `, θ = ${f(th)}°`), 0.6);
    line('l2', `${A}x = ${A} cos θ = ${f(a[0])}${u}`, 2.2, {style: {fill: 'cool'}});
    line('l3', `${A}y = ${A} sin θ = ${f(a[1])}${u}`, 2.8, {style: {fill: 'good'}});
    line('l4', `î and ĵ: unit vectors along x and y (length 1, no unit).`, 4.2, {style: {fill: 'muted'}});
    line('l5', comps(A, a), 5, {weight: 700});
    line('l6', `|${A}| = √(${A}x² + ${A}y²) = ${f(magA)}${u};  tan θ = ${A}y / ${A}x`, 5.6);
    facts.push(`${A}x = ${f(a[0])}${u}`, `${A}y = ${f(a[1])}${u}`, `|${A}| = ${f(magA)}${u}`, `θ = ${f(th)}°`, comps(A, a));
    return scene(s, W, H, 7, plane, props, [], {verb: 'vector_add', facts});
  }

  // components: add by components
  const r: [number, number] = [a[0] + b[0], a[1] + b[1]], magR = Math.hypot(...r);
  props.push(arrow('a', [0, 0], a, 'accent', 0.6), arrow('b', [0, 0], b, 'cool', 1.2),
    label('la', [0, 0], a, A, 'accent', 0.6, 1), label('lb', [0, 0], b, B, 'cool', 1.2, -1),
    dashed('pax', a, [a[0], 0], 2), dashed('pbx', b, [b[0], 0], 2), dashed('pay', a, [0, a[1]], 2.6), dashed('pby', b, [0, b[1]], 2.6),
    arrow('r', [0, 0], r, 'ink', 3.6), dashed('prx', r, [r[0], 0], 4.2), dashed('pry', r, [0, r[1]], 4.2),
    label('lr', [0, 0], r, 'R', 'ink', 3.6, 1));
  line('l1', `${comps(A, a)};  ${comps(B, b)}`, 0.6);
  line('l2', `Rx = ${A}x + ${B}x = ${f(a[0])} + ${f(b[0])} = ${f(r[0])}${u}`, 2, {style: {fill: 'cool'}});
  line('l3', `Ry = ${A}y + ${B}y = ${f(a[1])} + ${f(b[1])} = ${f(r[1])}${u}`, 2.6, {style: {fill: 'good'}});
  line('l4', `|R| = √(Rx² + Ry²) = ${f(magR)}${u}`, 3.6, {weight: 700});
  line('l5', `tan α = Ry / Rx: α = ${f(deg(...r))}° from x`, 4.2);
  facts.push(`Rx = ${f(r[0])}${u}`, `Ry = ${f(r[1])}${u}`, `|R| = ${f(magR)}${u}`, `R makes ${f(deg(...r))}° with the x-axis`);
  return scene(s, W, H, 5.6, plane, props, [], {verb: 'vector_add', facts, sum: [round(r[0], 6), round(r[1], 6)], magnitude: round(magR, 6)});
}
