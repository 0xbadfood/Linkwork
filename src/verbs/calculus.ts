// Maths on a plane: domain and range (walls on the x-axis where f is undefined, the curve's shadow on the y-axis),
// maxima and minima (a tangent rod on a hinge tied to the curve, level exactly at each), a secant turning into the
// tangent, the area under a curve with Riemann sums, and adding vectors. Every number shown is computed from the
// expression or measured from the drawing.
import {derivative, dfOf, exprErrors, fOf, show, tree} from '../expr.ts';
import {claimErrors, criticalPoints, definedIntervals, integrate, parseClaim, riemann, toScene, type Plane} from '../plane.ts';
import type {Actor, Prop, Scene} from '../scene.ts';
import type {Key} from '../keys.ts';
import {wrapText} from '../svg.ts';
import {round, type Vec} from '../vec.ts';

type Window = {expr: string; x?: [number, number]; y?: [number, number]; step?: [number, number]};
type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};
export const n2 = (v: number, places = 2) => {
  if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v)).replace('-', '−');
  const s = v.toFixed(places);
  return /^-0\.?0*$/.test(s) ? s.slice(1) : s.replace('-', '−');
};
const pretty = (src: string) => show(tree(src));

function windowErrors(s: Window, verb: string): string[] {
  const e = exprErrors(s.expr, ['x'], `${verb}: expr`);
  const [a, b] = s.x ?? [-5, 5], [c, d] = s.y ?? [-5, 5];
  if (!(a < b) || !(c < d)) e.push(`${verb}: x and y are windows [low, high]`);
  if (s.step && !(s.step[0] > 0 && s.step[1] > 0)) e.push(`${verb}: step is [x step, y step], both positive`);
  return e;
}

function layout(s: Window & Common) {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080;
  const plane: Plane = {id: 'p', x: s.x ?? [-5, 5], y: s.y ?? [-5, 5], box: [0.08 * W, 0.13 * H, 0.6 * W, 0.9 * H]};
  const axes: Prop = {id: 'axes', type: 'axes', plane: 'p', step: s.step ?? [1, 1], size: 24 * k};
  const px = 0.66 * W;
  const title: Prop[] = s.title ? [{id: 'title', type: 'text', x: px, y: 0.13 * H, size: 44 * k, weight: 700, text: s.title, width: W - px - 40 * k}] : [];
  // Panel rows are placed by fraction of the height, moved down when the title wraps onto more lines.
  const shift = s.title ? (wrapText(s.title, 44 * k, W - px - 40 * k).length - 1) * 1.25 * 44 * k : 0;
  const py = (f: number) => f * H + shift;
  return {W, H, k, plane, axes, px, title, py};
}
export const text = (id: string, x: number, y: number, t: string, size: number, extra: Partial<Prop> = {}): Prop =>
  ({id, type: 'text', x, y, text: t, size, ...extra} as Prop);
/** Panel text on the right: wrapped to the panel's width. */
export const panel = (W: number, k: number) => (id: string, x: number, y: number, t: string, size: number, extra: Partial<Prop> = {}): Prop =>
  ({id, type: 'text', x, y, text: t, size, width: W - x - 40 * k, ...extra} as Prop);
export const scene = (s: Common, W: number, H: number, duration: number, plane: Plane, props: Prop[], actors: Actor[], meta: Record<string, unknown>): Scene =>
  ({linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration, theme: s.theme ?? 'dark', planes: [plane], props, actors, meta});

/** Walking poses for a figure moving between t0 and t1 (a step every `beat` seconds). */
export function walking(t0: number, t1: number, beat = 0.28) {
  const keys: {t: number; pose: string}[] = [];
  let i = 0;
  for (let t = t0; t < t1 - beat / 2; t += beat) keys.push({t, pose: i++ % 2 ? 'walk_b' : 'walk_a'});
  keys.push({t: t1, pose: 'stand'});
  return keys;
}

// ---------------------------------------------------------------------------------------------------------------
export type DomainSpec = Window & Common & {verb: 'domain_range'; domain: string; range: string};

const gapsOf = (spec: Window) => {
  const f = fOf(spec.expr), [a, b] = spec.x ?? [-5, 5], [c, d] = spec.y ?? [-5, 5];
  const parts = definedIntervals(f, a, b, 1e3 * (d - c));
  const gaps: {lo: number; hi: number}[] = [];
  let at = a;
  for (const p of parts) { if (p.lo > at + 1e-9) gaps.push({lo: at, hi: p.lo}); at = p.hi; }
  if (at < b - 1e-9) gaps.push({lo: at, hi: b});
  return {parts, gaps};
};

export function domainErrors(s: DomainSpec): string[] {
  const e = windowErrors(s, 'domain_range');
  if (e.length) return e;
  for (const [field, v] of [['domain', s.domain], ['range', s.range]] as const) {
    try { parseClaim(v, field === 'domain' ? 'x' : 'y'); } catch (err) { e.push(`domain_range: ${field}: ${(err as Error).message}`); }
  }
  if (e.length) return e;
  e.push(...claimErrors(s.expr, ...(s.x ?? [-5, 5]), s.domain, s.range).map(x => `domain_range: ${x}`));
  const {parts} = gapsOf(s);
  if (!parts.length) e.push('domain_range: f is not defined anywhere in this x window');
  if (parts.length > 4) e.push('domain_range: more than 4 separate pieces in this window; narrow the x window');
  return e;
}

export function domainRange(s: DomainSpec): Scene {
  const {W, H, k, plane, axes, px, title, py} = layout(s);
  const ptext = panel(W, k);
  const f = fOf(s.expr), [a, b] = plane.x, [c, d] = plane.y, span = b - a;
  const {parts, gaps} = gapsOf(s);
  const axisY = toScene(plane, [0, Math.min(Math.max(0, c), d)])[1], axisX = toScene(plane, [Math.min(Math.max(0, a), b), 0])[0];
  const wallH = 0.1 * (d - c), margin = 0.035 * span;
  const props: Prop[] = [axes, {id: 'curve', type: 'curve', plane: 'p', expr: s.expr, draw: 0, keys: {draw: [[0.4, 0], [2.2, 1, 'inOut']]}, style: {stroke: 'ink', width: 5 * k}}];
  gaps.forEach((g, i) => {
    const thin = g.hi - g.lo < 0.02 * span, mid = (g.lo + g.hi) / 2;
    const lo = thin ? mid - 0.006 * span : g.lo, hi = thin ? mid + 0.006 * span : g.hi;
    props.push({id: `wall${i}`, type: 'rect', plane: 'p', x: lo, y: Math.max(0, c), w: hi - lo, h: wallH, style: {fill: 'bad', stroke: 'bad', width: 2, opacity: 0.55}, show: [2.4, 1e9]});
    if (thin) props.push({id: `asymptote${i}`, type: 'line', plane: 'p', x1: mid, y1: c, x2: mid, y2: d, style: {stroke: 'bad', width: 2, dash: [8, 10], opacity: 0.7}, show: [2.4, 1e9]});
    props.push(text(`wall${i}-label`, toScene(plane, [mid, 0])[0], toScene(plane, [mid, Math.max(0, c) + wallH])[1] - 22 * k,
      thin ? `x = ${n2(mid)}: not allowed` : 'f not defined', 24 * k, {align: 'middle', style: {fill: 'bad'}, show: [2.4, 1e9]}));
  });

  // The walker crosses each piece of the domain in turn; between pieces it can't pass the wall, so it reappears
  // on the other side.
  const walker: Actor = {id: 'walker', rig: 'figure', at: toScene(plane, [parts[0].lo + margin, 0]), scale: 0.72 * k, layer: 3,
    pose: [{t: 0, pose: 'stand'}], base: [], blink: [], opacity: [[0, 1]], expression: [{t: 0, face: 'smile'}]};
  const dot: Actor = {id: 'dot', rig: 'dot', at: [0, 0], scale: k, layer: 4, drivers: [], blink: []};
  let t = 3.0;
  parts.forEach((p, i) => {
    // Step right up to an end where f is defined (√0 = 0); stop short of one where it is not (1/x near 0).
    const edge = (x: number, inner: number) => (Number.isFinite(f(x)) && Math.abs(f(x)) < 1e3 * (d - c) ? x : inner);
    const x0 = p.lo > a + 1e-9 ? edge(p.lo, p.lo + margin) : p.lo + 0.01 * span;
    const x1 = p.hi < b - 1e-9 ? edge(p.hi, p.hi - margin) : p.hi - 0.01 * span;
    const dur = Math.max(1.6, 6 * (x1 - x0) / span);
    const keys: Key[] = [[t, x0], [t + dur, x1, 'linear']];
    walker.base!.push({t, at: toScene(plane, [x0, 0])}, {t: t + dur, at: toScene(plane, [x1, 0]), ease: 'linear'});
    walker.pose!.push(...walking(t, t + dur));
    dot.drivers!.push({t0: t, t1: t + dur, driver: 'curve', plane: 'p', expr: s.expr, x: keys, clamp: true});
    props.push(
      {id: `dom${i}`, type: 'trail', of: {actor: 'dot', joint: 'p', pin: {y: axisY}}, t0: t, t1: t + dur, style: {stroke: 'accent', width: 12 * k, cap: 'butt'}, layer: 2},
      {id: `ran${i}`, type: 'trail', of: {actor: 'dot', joint: 'p', pin: {x: axisX}}, t0: t, t1: t + dur, style: {stroke: 'cool', width: 12 * k, cap: 'butt'}, layer: 2},
    );
    if (i === 0) { walker.at = toScene(plane, [x0, 0]); dot.at = toScene(plane, [x0, Math.max(c, Math.min(d, f(x0)))]); }
    t += dur;
    if (i < parts.length - 1) {
      // At the wall: a shrug, then across it.
      walker.pose!.push({t: t + 0.2, pose: 'shrug'}, {t: t + 0.9, pose: 'shrug'}, {t: t + 1.1, pose: 'stand'});
      walker.expression!.push({t: t + 0.1, face: 'surprise'}, {t: t + 1.6, face: 'smile'});
      (walker.opacity as Key[]).push([t + 1.0, 1], [t + 1.15, 0], [t + 1.35, 0], [t + 1.5, 1]);
      walker.blink!.push([t + 0.9, t + 1.6]); dot.blink!.push([t, t + 1.7]);
      t += 1.7;
    }
  });
  walker.expression!.push({t, face: 'grin'});
  walker.pose!.push({t: t + 0.3, pose: 'cheer'});
  props.push(
    {id: 'v-line', type: 'line', x1: 0, y1: 0, x2: 0, y2: 0, ends: [{actor: 'dot', joint: 'p', pin: {y: axisY}}, {actor: 'dot', joint: 'p'}], style: {stroke: 'accent', width: 2.5 * k, dash: [6 * k, 8 * k]}, show: [3, t], layer: 2},
    {id: 'h-line', type: 'line', x1: 0, y1: 0, x2: 0, y2: 0, ends: [{actor: 'dot', joint: 'p', pin: {x: axisX}}, {actor: 'dot', joint: 'p'}], style: {stroke: 'cool', width: 2.5 * k, dash: [6 * k, 8 * k]}, show: [3, t], layer: 2},
    ...title,
    ptext('f', px, py(0.24), `f(x) = ${pretty(s.expr)}`, 40 * k, {weight: 700}),
    {id: 'ro-x', type: 'readout', width: W - px - 40 * k, x: px, y: py(0.34), size: 34 * k, text: 'x = {x}', measures: {x: {kind: 'coord', of: {actor: 'dot', joint: 'p'}, plane: 'p', axis: 'x'}}, style: {fill: 'accent'}, show: [3, t]},
    {id: 'ro-y', type: 'readout', width: W - px - 40 * k, x: px, y: py(0.40), size: 34 * k, text: 'f(x) = {y}', measures: {y: {kind: 'expr', expr: s.expr, at: {actor: 'dot', joint: 'p'}, plane: 'p'}}, style: {fill: 'cool'}, show: [3, t]},
    ptext('dom-note', px, py(0.52), 'Walk along x: only where f(x) exists.', 30 * k, {style: {fill: 'muted'}, show: [3, 1e9]}),
    ptext('ran-note', px, py(0.57), "The values f(x) takes fill the y-axis.", 30 * k, {style: {fill: 'muted'}, show: [3.6, 1e9]}),
    ptext('dom', px, py(0.7), `Domain: ${parseClaim(s.domain, 'x').text}`, 40 * k, {weight: 700, style: {fill: 'accent'}, show: [t + 0.2, 1e9]}),
    ptext('ran', px, py(0.78), `Range: ${parseClaim(s.range, 'y').text}`, 40 * k, {weight: 700, style: {fill: 'cool'}, show: [t + 0.9, 1e9]}),
  );
  if (s.x && (s.x[0] > -Infinity)) props.push(ptext('window', px, py(0.87), `(drawn for ${n2(a, 1)} ≤ x ≤ ${n2(b, 1)})`, 24 * k, {style: {fill: 'muted'}, show: [t + 0.9, 1e9]}));
  return scene(s, W, H, t + 3, plane, props, [dot, walker], {verb: 'domain_range', pieces: parts.map(p => [round(p.lo, 4), round(p.hi, 4)])});
}

// ---------------------------------------------------------------------------------------------------------------
export type ExtremaSpec = Window & Common & {verb: 'extrema'; pause?: number};

export function extremaErrors(s: ExtremaSpec): string[] {
  const e = windowErrors(s, 'extrema');
  if (e.length) return e;
  const [a, b] = s.x ?? [-5, 5], [c, d] = s.y ?? [-5, 5];
  const f = fOf(s.expr), df = dfOf(s.expr);
  const parts = definedIntervals(f, a, b, 1e3 * (d - c));
  if (parts.length !== 1 || parts[0].lo > a + 1e-6 || parts[0].hi < b - 1e-6) e.push('extrema: f must be defined across the whole x window');
  for (let i = 0; i <= 400; i++) {
    const y = f(a + (b - a) * i / 400);
    if (Number.isFinite(y) && (y < c || y > d)) { e.push(`extrema: the curve leaves the y window at x = ${n2(a + (b - a) * i / 400)}; widen y`); break; }
  }
  const cps = criticalPoints(f, df, a, b);
  if (!cps.length) e.push('extrema: no maximum or minimum in this window (f′ never changes sign)');
  if (cps.length > 5) e.push('extrema: more than 5 turning points; narrow the window');
  return e;
}

export function extrema(s: ExtremaSpec): Scene {
  const {W, H, k, plane, axes, px, title, py} = layout(s);
  const ptext = panel(W, k);
  const f = fOf(s.expr), df = dfOf(s.expr), [a, b] = plane.x, span = b - a;
  const cps = criticalPoints(f, df, a, b), pause = s.pause ?? 1.6;
  const half = 0.11 * (plane.box[2] - plane.box[0]);
  const xs: Key[] = [];
  let t = 2.4, x = a + 0.03 * span;
  xs.push([0, x], [t, x]);
  const legs: {t0: number; t1: number; from: number; to: number}[] = [];
  for (const target of [...cps.map(c => c.x), b - 0.03 * span]) {
    const dur = Math.max(1.2, 6 * (target - x) / span);
    legs.push({t0: t, t1: t + dur, from: x, to: target});
    xs.push([t + dur, target, 'inOut']);
    t += dur;
    if (target !== b - 0.03 * span) { xs.push([t + pause, target]); t += pause; }
    x = target;
  }
  const rod: Actor = {id: 'rod', rig: 'tangent', at: toScene(plane, [xs[0][1], f(xs[0][1])]), scale: half / 100, layer: 3,
    skin: {color: 'accent', width: 5 * k / (half / 100), joints: {hinge: {style: 'ball', size: 13 * k / (half / 100), fill: 'accent'}}},
    drivers: [{t0: 0, t1: t + 5, driver: 'curve', plane: 'p', expr: s.expr, x: xs}],
    angles: [{bone: 'right', kind: 'slope', plane: 'p', expr: s.expr}, {bone: 'left', kind: 'slope', plane: 'p', expr: s.expr, offset: 180}]};
  const props: Prop[] = [axes, {id: 'curve', type: 'curve', plane: 'p', expr: s.expr, draw: 0, keys: {draw: [[0.3, 0], [2, 1, 'inOut']]}, style: {stroke: 'ink', width: 5 * k}}, ...title,
    ptext('f', px, py(0.24), `f(x) = ${pretty(s.expr)}`, 40 * k, {weight: 700}),
    ptext('df', px, py(0.31), `f′(x) = ${show(derivative(tree(s.expr)))}`, 36 * k, {style: {fill: 'muted'}}),
    {id: 'ro-x', type: 'readout', width: W - px - 40 * k, x: px, y: py(0.41), size: 34 * k, text: 'x = {x}    f(x) = {y}',
      measures: {x: {kind: 'coord', of: {actor: 'rod', joint: 'hinge'}, plane: 'p', axis: 'x'}, y: {kind: 'coord', of: {actor: 'rod', joint: 'hinge'}, plane: 'p', axis: 'y'}}},
    {id: 'ro-s', type: 'readout', width: W - px - 40 * k, x: px, y: py(0.48), size: 38 * k, weight: 700, text: 'slope of the rod = {s}',
      measures: {s: {kind: 'slope', a: {actor: 'rod', joint: 'hinge'}, b: {actor: 'rod', joint: 'r'}, plane: 'p'}}, style: {fill: 'accent'}},
  ];
  legs.forEach((leg, i) => {
    const rising = df((leg.from + leg.to) / 2) > 0;
    props.push(ptext(`leg${i}`, px, py(0.57), rising ? 'rising: the slope is positive' : 'falling: the slope is negative', 32 * k,
      {style: {fill: rising ? 'good' : 'bad'}, show: [leg.t0 + 0.2, leg.t1 - 0.1], fade: 0.15}));
  });
  cps.forEach((cp, i) => {
    const at = legs[i].t1, p = toScene(plane, [cp.x, cp.y]);
    const word = cp.kind === 'flat' ? 'level, but neither' : cp.kind;
    props.push(
      {id: `cp${i}`, type: 'circle', x: p[0], y: p[1], r: 9 * k, style: {fill: cp.kind === 'maximum' ? 'good' : cp.kind === 'minimum' ? 'bad' : 'muted'}, show: [at, 1e9], pulse: [at], layer: 4},
      text(`cp${i}-label`, p[0], p[1] + (cp.kind === 'maximum' ? -58 : 58) * k, `${word} (${n2(cp.x)}, ${n2(cp.y)})`, 28 * k,
        {align: 'middle', weight: 700, style: {fill: cp.kind === 'maximum' ? 'good' : cp.kind === 'minimum' ? 'bad' : 'muted'}, show: [at, 1e9]}),
      ptext(`cp${i}-why`, px, py(0.57), `level: slope 0 → ${cp.kind === 'maximum' ? 'a maximum (rising, then falling)' : cp.kind === 'minimum' ? 'a minimum (falling, then rising)' : 'a flat point, neither'}`, 32 * k,
        {weight: 700, show: [at, at + pause], fade: 0.12}),
    );
  });
  return scene(s, W, H, t + 2, plane, props, [rod], {verb: 'extrema', critical: cps.map(c => ({x: round(c.x, 6), y: round(c.y, 6), kind: c.kind}))});
}

// ---------------------------------------------------------------------------------------------------------------
export type SecantSpec = Window & Common & {verb: 'secant_to_tangent'; at: number; h?: number; time?: number};

export function secantErrors(s: SecantSpec): string[] {
  const e = windowErrors(s, 'secant_to_tangent');
  if (e.length) return e;
  const f = fOf(s.expr), df = dfOf(s.expr), h = s.h ?? 2;
  const [a, b] = s.x ?? [-5, 5], [c, d] = s.y ?? [-5, 5];
  if (!(s.at > a && s.at + h < b)) e.push('secant_to_tangent: at and at + h must be inside the x window');
  for (let i = 0; i <= 100; i++) {
    const x = s.at + h * i / 100, y = f(x);
    if (!Number.isFinite(y) || y < c || y > d) { e.push(`secant_to_tangent: the curve must stay in the window between at and at + h (fails at x = ${n2(x)})`); break; }
  }
  if (!Number.isFinite(df(s.at))) e.push('secant_to_tangent: f has no slope at that point');
  return e;
}

export function secantToTangent(s: SecantSpec): Scene {
  const {W, H, k, plane, axes, px, title, py} = layout(s);
  const ptext = panel(W, k);
  const f = fOf(s.expr), df = dfOf(s.expr), a0 = s.at, h = s.h ?? 2, T = s.time ?? 6, t0 = 2.4, t1 = t0 + T;
  const slope = df(a0);
  const P: Actor = {id: 'P', rig: 'dot', at: toScene(plane, [a0, f(a0)]), scale: k, layer: 4, skin: {joints: {p: {style: 'ball', size: 10, fill: 'accent'}}}};
  const Q: Actor = {id: 'Q', rig: 'dot', at: toScene(plane, [a0 + h, f(a0 + h)]), scale: k, layer: 4, skin: {joints: {p: {style: 'ball', size: 10, fill: 'cool'}}},
    drivers: [{t0: 0, t1: t1 + 5, driver: 'curve', plane: 'p', expr: s.expr, x: [[0, a0 + h], [t0, a0 + h], [t1, a0 + h * 0.01, 'out']]}]};
  const P2: Vec = toScene(plane, [a0 + 1, f(a0) + slope]);
  const props: Prop[] = [axes, {id: 'curve', type: 'curve', plane: 'p', expr: s.expr, draw: 0, keys: {draw: [[0.3, 0], [2, 1, 'inOut']]}, style: {stroke: 'ink', width: 5 * k}}, ...title,
    {id: 'secant', type: 'through', plane: 'p', a: {actor: 'P', joint: 'p'}, b: {actor: 'Q', joint: 'p'}, style: {stroke: 'cool', width: 4 * k}, show: [2.2, t1 + 0.6], layer: 2},
    {id: 'tangent', type: 'through', plane: 'p', a: {plane: 'p', at: [a0, f(a0)]}, b: P2, style: {stroke: 'accent', width: 5 * k}, show: [t1 + 0.4, 1e9], layer: 2},
    text('P', 0, 0, 'P', 30 * k, {anchor: {actor: 'P', joint: 'p', offset: [-26 * k, -26 * k]}, weight: 700, style: {fill: 'accent'}, layer: 5}),
    text('Q', 0, 0, 'Q', 30 * k, {anchor: {actor: 'Q', joint: 'p', offset: [18 * k, -26 * k]}, weight: 700, style: {fill: 'cool'}, layer: 5}),
    ptext('f', px, py(0.24), `f(x) = ${pretty(s.expr)}`, 40 * k, {weight: 700}),
    ptext('pq', px, py(0.33), `P is fixed at x = ${n2(a0)}. Q = P + h slides in.`, 30 * k, {style: {fill: 'muted'}}),
    {id: 'ro-h', type: 'readout', width: W - px - 40 * k, x: px, y: py(0.42), size: 36 * k, text: 'h = {h}', decimals: 3, measures: {h: {kind: 'run', a: {actor: 'P', joint: 'p'}, b: {actor: 'Q', joint: 'p'}, plane: 'p'}}, style: {fill: 'cool'}},
    {id: 'ro-m', type: 'readout', width: W - px - 40 * k, x: px, y: py(0.49), size: 36 * k, weight: 700, text: 'slope of PQ = {m}', decimals: 3, measures: {m: {kind: 'slope', a: {actor: 'P', joint: 'p'}, b: {actor: 'Q', joint: 'p'}, plane: 'p'}}, style: {fill: 'cool'}},
    ptext('limit', px, py(0.6), `As h → 0, the slope → f′(${n2(a0)}) = ${n2(slope, 3)}`, 34 * k, {weight: 700, style: {fill: 'accent'}, show: [t1 + 0.4, 1e9]}),
    ptext('df', px, py(0.72), `f′(x) = ${show(derivative(tree(s.expr)))}`, 30 * k, {style: {fill: 'muted'}, show: [t1 + 0.8, 1e9]}),
  ];
  return scene(s, W, H, t1 + 3, plane, props, [P, Q], {verb: 'secant_to_tangent', slope: round(slope, 6)});
}

// ---------------------------------------------------------------------------------------------------------------
export type AreaSpec = Window & Common & {verb: 'area_under'; from: number; to: number; riemann?: number[]; rule?: 'left' | 'right' | 'mid'};

export function areaErrors(s: AreaSpec): string[] {
  const e = windowErrors(s, 'area_under');
  if (e.length) return e;
  const [a, b] = s.x ?? [-5, 5];
  if (!(s.from < s.to) || s.from < a || s.to > b) e.push('area_under: from < to, both inside the x window');
  const f = fOf(s.expr);
  const parts = definedIntervals(f, s.from, s.to);
  if (parts.length !== 1 || parts[0].lo > s.from + 1e-6 || parts[0].hi < s.to - 1e-6) e.push('area_under: f must be defined from `from` to `to`');
  for (const n of s.riemann ?? []) if (!Number.isInteger(n) || n < 1 || n > 200) e.push('area_under: riemann is a list of rectangle counts, 1 to 200');
  return e;
}

export function areaUnder(s: AreaSpec): Scene {
  const {W, H, k, plane, axes, px, title, py} = layout(s);
  const ptext = panel(W, k);
  const f = fOf(s.expr), a0 = s.from, b0 = s.to, T = 4, t0 = 2.4, t1 = t0 + T;
  const exact = integrate(f, a0, b0);
  const negative = Array.from({length: 101}, (_, i) => f(a0 + (b0 - a0) * i / 100)).some(y => y < 0);
  const sweep: Actor = {id: 'sweep', rig: 'dot', at: toScene(plane, [a0, f(a0)]), scale: k, layer: 4,
    drivers: [{t0: 0, t1: 1e9, driver: 'curve', plane: 'p', expr: s.expr, x: [[0, a0], [t0, a0], [t1, b0, 'inOut']]}]};
  const props: Prop[] = [axes,
    {id: 'region', type: 'region', plane: 'p', expr: s.expr, from: a0, to: a0, keys: {to: [[t0, a0 + 1e-6], [t1, b0, 'inOut']]}, style: {fill: 'accent', opacity: 0.35}, show: [t0, 1e9], layer: 1},
    {id: 'curve', type: 'curve', plane: 'p', expr: s.expr, draw: 0, keys: {draw: [[0.3, 0], [2, 1, 'inOut']]}, style: {stroke: 'ink', width: 5 * k}, layer: 2},
    {id: 'edge', type: 'line', x1: 0, y1: 0, x2: 0, y2: 0, ends: [{actor: 'sweep', joint: 'p', pin: {y: toScene(plane, [0, 0])[1]}}, {actor: 'sweep', joint: 'p'}], style: {stroke: 'accent', width: 3 * k}, show: [t0, t1 + 0.2], layer: 3},
    ...title,
    ptext('f', px, py(0.24), `f(x) = ${pretty(s.expr)}`, 40 * k, {weight: 700}),
    {id: 'ro-a', type: 'readout', width: W - px - 40 * k, x: px, y: py(0.34), size: 36 * k, text: 'area up to x = {x}:  {A}', decimals: {x: 2, A: 3},
      measures: {x: {kind: 'coord', of: {actor: 'sweep', joint: 'p'}, plane: 'p', axis: 'x'},
        A: {kind: 'integral', expr: s.expr, from: a0, to: {actor: 'sweep', joint: 'p'}, plane: 'p'}}, style: {fill: 'accent'}},
    ptext('exact', px, py(0.43), `area from ${n2(a0)} to ${n2(b0)} = ${n2(exact, 4)}`, 34 * k, {weight: 700, show: [t1 + 0.2, 1e9]}),
  ];
  if (negative) props.push(ptext('neg', px, py(0.5), 'Area below the x-axis counts as negative.', 28 * k, {style: {fill: 'muted'}, show: [t1 + 0.4, 1e9]}));
  let t = t1 + 1.2;
  const sums: {n: number; sum: number}[] = [];
  (s.riemann ?? []).forEach((n, i) => {
    const sum = riemann(f, a0, b0, n, s.rule ?? 'mid');
    sums.push({n, sum: round(sum, 6)});
    const until = i < (s.riemann!.length - 1) ? t + 1.8 : 1e9;
    props.push({id: `rects${i}`, type: 'riemann', plane: 'p', expr: s.expr, from: a0, to: b0, n, rule: s.rule ?? 'mid',
      style: {fill: 'cool', stroke: 'cool', width: 2, opacity: 0.35}, show: [t, until], fade: 0.2, layer: 1},
    ptext(`sum${i}`, px, py(0.6), `${n} rectangles: ${n2(sum, 4)}  (off by ${n2(Math.abs(sum - exact), 4)})`, 32 * k, {style: {fill: 'cool'}, show: [t, until], fade: 0.2}));
    t += 1.8;
  });
  if (s.riemann?.length) props.push(ptext('more', px, py(0.67), 'More rectangles, closer to the exact area.', 28 * k, {style: {fill: 'muted'}, show: [t - 1.8 + 0.5, 1e9]}));
  return scene(s, W, H, t + 1.5, plane, props, [sweep], {verb: 'area_under', integral: round(exact, 8), riemann: sums});
}

// ---------------------------------------------------------------------------------------------------------------
export type VectorSpec = Common & {verb: 'vector_add'; a: Vec; b: Vec; x?: [number, number]; y?: [number, number]; step?: [number, number]};

export function vectorErrors(s: VectorSpec): string[] {
  const e: string[] = [];
  const ok = (v: unknown) => Array.isArray(v) && v.length === 2 && v.every(n => typeof n === 'number' && Number.isFinite(n));
  if (!ok(s.a) || !ok(s.b)) return ['vector_add: a and b are [x, y] pairs of numbers'];
  const [x0, x1] = s.x ?? [-1, 8], [y0, y1] = s.y ?? [-1, 6];
  for (const [name, p] of [['a', s.a], ['a + b', [s.a[0] + s.b[0], s.a[1] + s.b[1]]], ['b', s.b]] as const)
    if (p[0] < x0 || p[0] > x1 || p[1] < y0 || p[1] > y1) e.push(`vector_add: ${name} = (${p.join(', ')}) is outside the window; widen x or y`);
  return e;
}

export function vectorAdd(s: VectorSpec): Scene {
  const {W, H, k, plane, axes, px, title, py} = layout({...s, expr: '0', x: s.x ?? [-1, 8], y: s.y ?? [-1, 6]});
  const ptext = panel(W, k);
  const [ax, ay] = s.a, [bx, by] = s.b, rx = ax + bx, ry = ay + by;
  const mag = Math.hypot(rx, ry);
  const arrow = (id: string, x1: number, y1: number, x2: number, y2: number, stroke: string, from: number, extra: Partial<Prop> = {}): Prop =>
    ({id, type: 'arrow', plane: 'p', x1, y1, x2, y2, draw: 0, keys: {draw: [[from, 0], [from + 1.2, 1, 'inOut']]}, style: {stroke, width: 6 * k}, head: 22 * k, show: [from, 1e9], fade: 0.01, ...extra} as Prop);
  const label = (id: string, x: number, y: number, t: string, fill: string, from: number) =>
    text(id, toScene(plane, [x, y])[0], toScene(plane, [x, y])[1], t, 34 * k, {weight: 700, align: 'middle', style: {fill}, show: [from + 0.8, 1e9]});
  const nrm = (dx: number, dy: number, d = 0.35): Vec => { const l = Math.hypot(dx, dy) || 1; return [-dy / l * d, dx / l * d]; };
  const [nax, nay] = nrm(ax, ay), [nbx, nby] = nrm(bx, by), [nrx, nry] = nrm(rx, ry);
  const fmt = (v: number) => n2(v, Number.isInteger(v) ? 0 : 2);
  const props: Prop[] = [axes,
    arrow('ghost-b', 0, 0, bx, by, 'cool', 5.4, {style: {stroke: 'cool', width: 3 * k, dash: [8 * k, 8 * k], opacity: 0.6}}),
    arrow('ghost-a', bx, by, rx, ry, 'accent', 5.4, {style: {stroke: 'accent', width: 3 * k, dash: [8 * k, 8 * k], opacity: 0.6}}),
    arrow('a', 0, 0, ax, ay, 'accent', 1),
    arrow('b', ax, ay, rx, ry, 'cool', 2.4),
    arrow('r', 0, 0, rx, ry, 'ink', 3.9),
    label('la', ax / 2 + nax, ay / 2 + nay, 'a', 'accent', 1), label('lb', ax + bx / 2 + nbx, ay + by / 2 + nby, 'b', 'cool', 2.4),
    label('lr', rx / 2 - nrx, ry / 2 - nry, 'a + b', 'ink', 3.9),
    ...title,
    ptext('ta', px, py(0.26), `a = (${fmt(ax)}, ${fmt(ay)})`, 36 * k, {style: {fill: 'accent'}, show: [1, 1e9]}),
    ptext('tb', px, py(0.33), `b = (${fmt(bx)}, ${fmt(by)})`, 36 * k, {style: {fill: 'cool'}, show: [2.4, 1e9]}),
    ptext('tr', px, py(0.42), `a + b = (${fmt(ax)} + ${fmt(bx)}, ${fmt(ay)} + ${fmt(by)}) = (${fmt(rx)}, ${fmt(ry)})`, 32 * k, {weight: 700, show: [3.9, 1e9]}),
    ptext('tm', px, py(0.5), `|a + b| = √(${fmt(rx)}² + ${fmt(ry)}²) = ${n2(mag, 2)}`, 32 * k, {show: [4.6, 1e9]}),
    ptext('tail', px, py(0.6), 'Head to tail: b starts where a ends.', 28 * k, {style: {fill: 'muted'}, show: [2.4, 1e9]}),
    ptext('order', px, py(0.66), 'Either order gives the same a + b.', 28 * k, {style: {fill: 'muted'}, show: [5.6, 1e9]}),
  ];
  return scene(s, W, H, 8.5, plane, props, [], {verb: 'vector_add', sum: [rx, ry], magnitude: round(mag, 6)});
}
