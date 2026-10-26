// A graph of science or maths: curves from a formula in the axis's own variable (v = 2 + 3t, P = 24/V) or from the
// book's data (a line, a smooth curve that keeps the data's shape, or dots), drawn on in turn. A tracer runs along a
// curve with readouts measured from the drawing; a tangent, a shaded area and marked points are optional. Every value
// the narration may quote is computed here and listed in meta.facts.
import {derivative, evaluate, exprErrors, show, tree} from '../expr.ts';
import {integrate, toScene, type Plane} from '../plane.ts';
import type {Actor, BaseKey, Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {round, type Vec} from '../vec.ts';
import {n2, panel, scene} from './calculus.ts';

export type Axis = {name: string; unit?: string; range: [number, number]; step?: number};
export type Series = {label: string; at?: number} & (
  | {expr: string}
  | {points: Vec[]; join?: 'line' | 'smooth' | 'none'; names?: string[]});
export type GraphSpec = {
  verb: 'graph'; title?: string; x: Axis; y: Axis; series: Series[];
  /** clock: the x axis is time in seconds and the tracer moves in step with it (from `at`, taking to - from seconds,
   * at an even pace), so it can follow a mover in another part of a compound. */
  trace?: {series: number; from: number; to: number; at?: number; time?: number; clock?: boolean};
  tangent?: {series: number; x: number; at?: number};
  /** The area under a formula series, or a list of areas; `above` names the series a part sits on (default the x
   * axis), so a v–t area splits into a rectangle under v = u and a triangle between v = u and v = u + at. */
  shade?: Shade | Shade[];
  marks?: {series?: number; x: number; y?: number; label: string; at?: number}[];
  width?: number; height?: number; fps?: number; theme?: 'dark' | 'light';
};

type Shade = {series: number; above?: number; from: number; to: number; label?: string; unit?: string; at?: number; time?: number};
const COLOURS = ['accent', 'cool', 'good', 'bad'];
const shadesOf = (s: GraphSpec): Shade[] => (s.shade === undefined ? [] : Array.isArray(s.shade) ? s.shade : [s.shade]);
const DRAW = 1.8;
/** Up to `places` decimals, without trailing zeros. */
const trim = (v: number, places = 3) => n2(Number(v.toFixed(places)), places).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** The expression rewritten in x (the scene's curves are y = f(x)); the variable is one letter, not e. */
const inX = (src: string, v: string) => (v === 'x' ? src : src.replace(new RegExp(`(?<![A-Za-z_])${v}(?![A-Za-z_(])`, 'g'), 'x'));
const fn = (src: string) => { const n = tree(src); return (x: number) => evaluate(n, {x}); };
const dfn = (src: string) => { const n = derivative(tree(src)); return (x: number) => evaluate(n, {x}); };

/** A step giving about 5–10 ticks: 1, 2 or 5 times a power of ten. */
export function niceStep(lo: number, hi: number): number {
  const raw = (hi - lo) / 8, p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map(m => m * p).find(s => s >= raw * 0.999)!;
}
const stepOf = (a: Axis) => a.step ?? niceStep(...a.range);
const unitText = (a: Axis) => (a.unit ? ` ${a.unit}` : '');
const axisName = (a: Axis) => (a.unit ? `${a.name} (${a.unit})` : a.name);
/** Decimal places for values on an axis: two significant places beyond its step. */
const placesOf = (a: Axis) => Math.max(0, Math.min(4, 1 - Math.floor(Math.log10(stepOf(a)))));

/** Monotone cubic through the points (Fritsch–Carlson): smooth, with no bumps the data doesn't have. */
export function smooth(points: Vec[], per = 24): Vec[] {
  const n = points.length;
  if (n < 3) return points;
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const d = xs.slice(0, -1).map((x, i) => (ys[i + 1] - ys[i]) / (xs[i + 1] - x));
  const m = xs.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  const out: Vec[] = [];
  for (let i = 0; i < n - 1; i++) {
    const h = xs[i + 1] - xs[i];
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t;
      out.push([xs[i] + h * t, (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1]]);
    }
  }
  out.push(points[n - 1]);
  return out;
}

/** The value of a data series at x, along the line or curve drawn through its points. */
function dataAt(path: Vec[], x: number): number {
  for (let i = 1; i < path.length; i++) {
    const [x0, y0] = path[i - 1], [x1, y1] = path[i];
    if (x >= x0 - 1e-12 && x <= x1 + 1e-12) return x1 === x0 ? y0 : y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }
  return NaN;
}
const pathOf = (s: Series) => ('points' in s ? (s.join === 'smooth' ? smooth(s.points) : s.points) : []);

export function graphErrors(s: GraphSpec): string[] {
  const e: string[] = [];
  for (const k of ['x', 'y'] as const) {
    const a = s[k];
    if (!a || typeof a.name !== 'string' || !a.name.trim()) { e.push(`graph: ${k} needs a name, e.g. {"name": "t", "unit": "s", "range": [0, 10]}`); continue; }
    if (axisName(a).length > 20) e.push(`graph: ${k} "${axisName(a)}" is too long for an axis label (20 characters)`);
    if (!Array.isArray(a.range) || !isNum(a.range[0]) || !isNum(a.range[1]) || !(a.range[0] < a.range[1])) { e.push(`graph: ${k}.range is [low, high]`); continue; }
    if (a.step !== undefined && !(isNum(a.step) && a.step > 0)) e.push(`graph: ${k}.step must be positive`);
    else if ((a.range[1] - a.range[0]) / stepOf(a) > 16) e.push(`graph: ${k}.step gives more than 16 ticks; use a larger step`);
    if (stepOf(a) < 1e-3) e.push(`graph: ${k} ticks below 0.001 can't be labelled; rescale the axis (e.g. 1/T in 10⁻³ K⁻¹)`);
  }
  if (e.length) return e;
  const v = s.x.name.trim();
  const oneLetter = /^[A-Za-z]$/.test(v) && v !== 'e';
  if (!Array.isArray(s.series) || !s.series.length || s.series.length > 4) return [...e, 'graph: series is a list of 1 to 4 curves'];
  const [a, b] = s.x.range, [c, d] = s.y.range;
  const inside = (x: number, y: number) => x >= a - 1e-9 && x <= b + 1e-9 && y >= c - 1e-9 && y <= d + 1e-9;
  s.series.forEach((ser, i) => {
    const where = `graph: series ${i + 1}`;
    if (typeof ser?.label !== 'string' || !ser.label.trim()) e.push(`${where} needs a label`);
    else if (ser.label.length > 32) e.push(`${where}: label is too long (32 characters)`);
    if ('expr' in ser === 'points' in ser) { e.push(`${where} has either expr (a formula in ${v}) or points (the book's data)`); return; }
    if ('expr' in ser) {
      if (!oneLetter) { e.push(`${where}: a formula needs the x axis named by one letter (t, V, T…), not "${v}"`); return; }
      const errs = exprErrors(ser.expr, [v], `${where} expr`);
      if (errs.length) { e.push(...errs); return; }
      const f = fn(inX(ser.expr, v));
      let ok = 0, seen = 0;
      for (let j = 0; j <= 400; j++) { const x = a + (b - a) * j / 400, y = f(x); if (Number.isFinite(y)) { seen++; if (y >= c && y <= d) ok++; } }
      if (!seen) e.push(`${where}: ${s.y.name} = ${ser.expr} is not defined anywhere from ${n2(a)} to ${n2(b)}`);
      else if (ok < 0.5 * seen) e.push(`${where}: ${s.y.name} = ${ser.expr} is outside the y range for most of the graph; widen y`);
    } else {
      const pts = ser.points;
      if (!Array.isArray(pts) || pts.length < 2 || pts.some(p => !Array.isArray(p) || p.length !== 2 || !isNum(p[0]) || !isNum(p[1]))) { e.push(`${where}: points is a list of at least 2 [x, y] pairs`); return; }
      const out = pts.find(p => !inside(p[0], p[1]));
      if (out) e.push(`${where}: the point (${out.join(', ')}) is outside the graph; widen x or y`);
      if ((ser.join ?? 'line') !== 'none' && pts.some((p, j) => j && !(p[0] > pts[j - 1][0]))) e.push(`${where}: joined points must go left to right (x increasing)`);
      if (ser.join && !['line', 'smooth', 'none'].includes(ser.join)) e.push(`${where}: join is line, smooth or none`);
      if (ser.names && (!Array.isArray(ser.names) || ser.names.length !== pts.length)) e.push(`${where}: names gives one name per point`);
      if (ser.names && pts.length > 24) e.push(`${where}: at most 24 named points (names would crowd)`);
      if (ser.join === 'smooth') { const out2 = smooth(pts).find(p => !inside(p[0], p[1])); if (out2) e.push(`${where}: the smooth curve leaves the graph near x = ${n2(out2[0])}; widen y`); }
    }
  });
  if (e.length) return e;
  const valueOf = (i: number) => { const ser = s.series[i]; return 'expr' in ser ? fn(inX(ser.expr, v)) : (x: number) => dataAt(pathOf(ser), x); };
  const pick = (i: unknown, what: string) => {
    if (!(Number.isInteger(i) && (i as number) >= 0 && (i as number) < s.series.length)) { e.push(`graph: ${what}.series is the index of a series, 0 to ${s.series.length - 1}`); return false; }
    return true;
  };
  if (s.trace && pick(s.trace.series, 'trace')) {
    const {from, to} = s.trace, f = valueOf(s.trace.series);
    if (!isNum(from) || !isNum(to) || !(from < to) || from < a || to > b) e.push(`graph: trace runs from < to, inside ${n2(a)} to ${n2(b)}`);
    else for (let j = 0; j <= 200; j++) {
      const x = from + (to - from) * j / 200, y = f(x);
      if (!Number.isFinite(y) || y < c - 1e-9 || y > d + 1e-9) { e.push(`graph: the trace leaves the curve or the graph at ${v} = ${n2(x)}; change from or to`); break; }
    }
  }
  if (s.tangent && pick(s.tangent.series, 'tangent')) {
    const ser = s.series[s.tangent.series], x = s.tangent.x;
    if (!('expr' in ser)) e.push('graph: a tangent needs a formula series (for data, mark two points and give the slope)');
    else if (!isNum(x) || !inside(x, fn(inX(ser.expr, v))(x)) || !Number.isFinite(dfn(inX(ser.expr, v))(x))) e.push(`graph: the tangent point ${v} = ${x} must be on the curve, inside the graph`);
  }
  if (Array.isArray(s.shade) && !(s.shade.length >= 1 && s.shade.length <= 4)) e.push('graph: shade is one area, or a list of 1 to 4');
  for (const [j, sh] of shadesOf(s).slice(0, 4).entries()) {
    const what = Array.isArray(s.shade) ? `shade ${j + 1}` : 'shade';
    if (!sh || !pick(sh.series, what) || (sh.above !== undefined && !pick(sh.above, `${what} above`))) continue;
    const ser = s.series[sh.series], low = sh.above !== undefined ? s.series[sh.above] : undefined, {from, to} = sh;
    if (!('expr' in ser) || (low && !('expr' in low))) e.push(`graph: ${what}: shading needs formula series`);
    else if (!isNum(from) || !isNum(to) || !(from < to) || from < a || to > b) e.push(`graph: ${what} runs from < to, inside ${n2(a)} to ${n2(b)}`);
    else if (!Number.isFinite(integrate(fn(inX(ser.expr, v)), from, to))) e.push(`graph: ${what}: the curve must be defined across the shaded part`);
    else if (low && 'expr' in low) {
      const f = fn(inX(ser.expr, v)), g = fn(inX(low.expr, v));
      for (let k = 0; k <= 100; k++) {
        const x = from + (to - from) * k / 100;
        if (!(f(x) >= g(x) - 1e-9)) { e.push(`graph: ${what}: series ${sh.series} must be on top of series ${sh.above} (it is below at ${v} = ${n2(x)}); swap series and above`); break; }
      }
    }
  }
  (s.marks ?? []).forEach((m, j) => {
    const where = `graph: mark ${j + 1}`;
    if (typeof m?.label !== 'string' || !m.label.trim() || m.label.length > 28) e.push(`${where} needs a short label (28 characters)`);
    if (m.series !== undefined && !pick(m.series, `mark ${j + 1}`)) return;
    const y = m.y ?? (m.series !== undefined ? valueOf(m.series)(m.x) : NaN);
    if (!isNum(m.x) || !Number.isFinite(y)) e.push(`${where}: give x, and y or the series it sits on`);
    else if (!inside(m.x, y)) e.push(`${where}: (${n2(m.x)}, ${n2(y)}) is outside the graph`);
  });
  return e;
}

export function graph(s: GraphSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080;
  const v = s.x.name.trim(), [a, b] = s.x.range, [c, d] = s.y.range;
  // The plane leaves room on its right for the x axis's name before the panel.
  const plane: Plane = {id: 'p', x: [a, b], y: [c, d], box: [0.09 * W, 0.13 * H, 0.555 * W, 0.88 * H]};
  const P = (x: number, y: number) => toScene(plane, [x, y]);
  const axisY = P(0, Math.min(Math.max(0, c), d))[1], axisX = P(Math.min(Math.max(0, a), b), 0)[0];
  const px = 0.655 * W, pw = W - px - 40 * k, ptext = panel(W, k);
  const props: Prop[] = [{id: 'axes', type: 'axes', plane: 'p', step: [stepOf(s.x), stepOf(s.y)], names: [axisName(s.x), axisName(s.y)], size: 24 * k}];
  const actors: Actor[] = [];
  const facts: string[] = [];
  const meta: Record<string, unknown> = {verb: 'graph'};
  const fx = (x: number) => n2(x, placesOf(s.x)), fy = (y: number) => n2(y, placesOf(s.y));
  const valueOf = (ser: Series) => ('expr' in ser ? fn(inX(ser.expr, v)) : (x: number) => dataAt(pathOf(ser), x));

  let row = 0.13 * H;
  if (s.title) {
    props.push(ptext('title', px, row, s.title, 44 * k, {weight: 700}));
    row += wrapText(s.title, 44 * k, pw).length * 1.25 * 44 * k + 18 * k;
  }

  // Each series draws on in turn, left to right; its label sits in the panel as a legend.
  let t = 0.6;
  s.series.forEach((ser, i) => {
    const colour = COLOURS[i], at = ser.at ?? t, style = {stroke: colour, width: 5 * k};
    if ('expr' in ser) {
      props.push({id: `s${i}`, type: 'curve', plane: 'p', expr: inX(ser.expr, v), draw: 0, keys: {draw: [[at, 0], [at + DRAW, 1, 'inOut']]}, style, layer: 2});
    } else {
      const join = ser.join ?? 'line';
      if (join !== 'none') props.push({id: `s${i}`, type: 'polyline', plane: 'p', points: pathOf(ser), draw: 0, keys: {draw: [[at, 0], [at + DRAW, 1, 'inOut']]}, style, layer: 2});
      ser.points.forEach(([x, y], j) => {
        const when = at + DRAW * (x - ser.points[0][0]) / ((ser.points.at(-1)![0] - ser.points[0][0]) || 1);
        props.push({id: `s${i}p${j}`, type: 'circle', plane: 'p', x, y, r: 7 * k, style: {fill: colour, stroke: 'paper', width: 2}, show: [when, 1e9], fade: 0.15, layer: 3});
        if (ser.names) props.push({id: `s${i}n${j}`, type: 'text', plane: 'p', x, y, text: ser.names[j], size: 20 * k, align: 'middle', style: {fill: 'muted'}, show: [when, 1e9], fade: 0.15, layer: 3});
      });
    }
    props.push({id: `key${i}`, type: 'line', x1: px, y1: row, x2: px + 36 * k, y2: row, style: {stroke: colour, width: 6 * k}, show: [at, 1e9]},
      ptext(`label${i}`, px + 50 * k, row, ser.label, 32 * k, {style: {fill: colour}, show: [at, 1e9]}));
    row += wrapText(ser.label, 32 * k, pw - 50 * k).length * 1.25 * 32 * k;
    if ('expr' in ser) {
      props.push(ptext(`formula${i}`, px + 50 * k, row, `${s.y.name} = ${show(tree(ser.expr, [v]))}`, 28 * k, {style: {fill: 'muted'}, show: [at, 1e9]}));
      row += 1.25 * 28 * k;
    }
    row += 16 * k;
    t = Math.max(t, at + DRAW + 0.4);
  });
  // Point names sit above their points, or below a dip (lower than its neighbours), so the line doesn't cross them.
  for (const p of props) {
    const m = p.type === 'text' ? /^s(\d+)n(\d+)$/.exec(p.id) : null;
    if (!m) continue;
    const pts = (s.series[+m[1]] as {points: Vec[]}).points, j = +m[2], y = pts[j][1];
    const dip = [pts[j - 1], pts[j + 1]].filter(Boolean).every(q => q[1] > y);
    (p as {y: number}).y += (dip ? -0.05 : 0.045) * (d - c);
  }
  row += 14 * k;

  if (s.trace) {
    const tr = s.trace, ser = s.series[tr.series], f = valueOf(ser), at = tr.at ?? t, time = tr.clock ? tr.to - tr.from : tr.time ?? 4;
    const dot: Actor = {id: 'tracer', rig: 'dot', at: P(tr.from, f(tr.from)), scale: 1.3 * k, layer: 4, show: [at, 1e9]};
    if ('expr' in ser) dot.drivers = [{t0: 0, t1: 1e9, driver: 'curve', plane: 'p', expr: inX(ser.expr, v), x: [[0, tr.from], [at, tr.from], [at + time, tr.to, tr.clock ? 'linear' : 'inOut']]}];
    else {
      // Along the drawn data path, moving steadily in x.
      const path = pathOf(ser).filter(p => p[0] > tr.from && p[0] < tr.to);
      const pts: Vec[] = [[tr.from, f(tr.from)], ...path, [tr.to, f(tr.to)]];
      dot.base = pts.map(([x, y], j): BaseKey => ({t: at + time * (x - tr.from) / (tr.to - tr.from), at: P(x, y), ...(j ? {ease: 'linear' as const} : {})}));
    }
    actors.push(dot);
    const tip = {actor: 'tracer', joint: 'p'};
    props.push(
      {id: 'drop-x', type: 'line', x1: 0, y1: 0, x2: 0, y2: 0, ends: [{...tip, pin: {y: axisY}}, tip], style: {stroke: COLOURS[tr.series], width: 2.5 * k, dash: [6 * k, 8 * k]}, show: [at, 1e9], layer: 1},
      {id: 'drop-y', type: 'line', x1: 0, y1: 0, x2: 0, y2: 0, ends: [{...tip, pin: {x: axisX}}, tip], style: {stroke: COLOURS[tr.series], width: 2.5 * k, dash: [6 * k, 8 * k]}, show: [at, 1e9], layer: 1},
      {id: 'ro-x', type: 'readout', x: px, y: row, size: 34 * k, width: pw, text: `${v} = {x}${unitText(s.x)}`, decimals: placesOf(s.x),
        measures: {x: {kind: 'coord', of: tip, plane: 'p', axis: 'x'}}, show: [at, 1e9]},
      {id: 'ro-y', type: 'readout', x: px, y: row + 1.3 * 34 * k, size: 34 * k, width: pw, text: `${s.y.name} = {y}${unitText(s.y)}`, decimals: placesOf(s.y),
        measures: {y: {kind: 'coord', of: tip, plane: 'p', axis: 'y'}}, style: {fill: COLOURS[tr.series]}, show: [at, 1e9]});
    row += 2.6 * 34 * k + 16 * k;
    facts.push(`trace: ${v} from ${fx(tr.from)} to ${fx(tr.to)}${unitText(s.x)}; ${s.y.name} goes from ${fy(f(tr.from))} to ${fy(f(tr.to))}${unitText(s.y)}`);
    meta.trace = {from: [tr.from, round(f(tr.from), 6)], to: [tr.to, round(f(tr.to), 6)], at, until: at + time};
    t = Math.max(t, at + time + 0.6);
  }

  const shades = shadesOf(s), areas: {label: string; from: number; to: number; value: number; shown: number}[] = [];
  for (const [j, sh] of shades.entries()) {
    const ser = s.series[sh.series] as Series & {expr: string}, at = sh.at ?? t, time = sh.time ?? 3;
    const low = sh.above !== undefined ? inX((s.series[sh.above] as Series & {expr: string}).expr, v) : undefined, top = inX(ser.expr, v);
    const g = low ? fn(low) : () => 0, f = fn(top), area = integrate((x: number) => f(x) - g(x), sh.from, sh.to);
    const units = sh.unit ?? (s.x.unit && s.y.unit ? `${s.y.unit} × ${s.x.unit}` : '');
    // Each part in its own tone: the series' colour, or the next one when two parts share a series.
    const tone = COLOURS[(sh.series + shades.slice(0, j).filter(o => o.series === sh.series).length) % COLOURS.length];
    const id = j ? `shade-${j + 1}` : 'shade', label = sh.label ?? 'area';
    props.push({id, type: 'region', plane: 'p', expr: top, ...(low ? {lower: low} : {}), from: sh.from, to: sh.from, keys: {to: [[at, sh.from + 1e-6], [at + time, sh.to, 'inOut']]},
      style: {fill: tone, opacity: 0.3}, show: [at, 1e9], layer: 1},
    ptext(j ? `area-${j + 1}` : 'area', px, row, `${label} = ${trim(area)}${units ? ' ' + units : ''}`, 34 * k, {weight: 700, style: {fill: tone}, show: [at + time, 1e9]}));
    row += wrapText(`${label} = ${trim(area)} ${units}`, 34 * k, pw).length * 1.25 * 34 * k + 16 * k;
    facts.push(`${label} from ${v} = ${fx(sh.from)} to ${fx(sh.to)}: ${trim(area)}${units ? ' ' + units : ''}`);
    areas.push({label, from: sh.from, to: sh.to, value: round(area, 8), shown: at + time});
    t = Math.max(t, at + time + 0.6);
  }
  if (areas.length) meta.area = areas[0];
  if (areas.length > 1) {
    meta.areas = areas;
    facts.push(`together: ${areas.map(a => a.label).join(' + ')} = ${trim(areas.reduce((m, a) => m + a.value, 0))}`);
  }

  if (s.tangent) {
    const tg = s.tangent, ser = s.series[tg.series] as Series & {expr: string}, at = tg.at ?? t;
    const x0 = tg.x, y0 = fn(inX(ser.expr, v))(x0), m = dfn(inX(ser.expr, v))(x0);
    const slopeUnit = !(s.x.unit && s.y.unit) ? '' : s.y.unit.endsWith(`/${s.x.unit}`) ? ` ${s.y.unit}²` : ` ${s.y.unit}/${s.x.unit}`;
    props.push({id: 'tangent', type: 'through', plane: 'p', a: {plane: 'p', at: [x0, y0]}, b: {plane: 'p', at: [x0 + 1, y0 + m]}, style: {stroke: 'ink', width: 3.5 * k, dash: [14 * k, 8 * k]}, show: [at, 1e9], layer: 3},
      {id: 'tangent-at', type: 'circle', plane: 'p', x: x0, y: y0, r: 9 * k, style: {fill: 'ink', stroke: 'paper', width: 2}, show: [at, 1e9], layer: 4},
      ptext('slope', px, row, `slope at ${v} = ${fx(x0)}: ${trim(m)}${slopeUnit}`, 32 * k, {weight: 700, show: [at + 0.4, 1e9]}));
    row += wrapText(`slope at ${v} = ${fx(x0)}: ${trim(m)}${slopeUnit}`, 32 * k, pw).length * 1.25 * 32 * k + 16 * k;
    facts.push(`slope of the tangent at ${v} = ${fx(x0)}: ${trim(m)}${slopeUnit}`);
    meta.tangent = {x: x0, y: round(y0, 6), slope: round(m, 6), at};
    t = Math.max(t, at + 2.4);
  }

  meta.marks = (s.marks ?? []).map((mk, j) => {
    const at = mk.at ?? t, y = mk.y ?? valueOf(s.series[mk.series!])(mk.x);
    const colour = mk.series !== undefined ? COLOURS[mk.series] : 'ink';
    const [sx, sy] = P(mk.x, y), right = sx < (plane.box[0] + plane.box[2]) / 2;
    props.push(
      {id: `mark${j}-x`, type: 'line', plane: 'p', x1: mk.x, y1: Math.min(Math.max(0, c), d), x2: mk.x, y2: y, style: {stroke: 'muted', width: 2 * k, dash: [5 * k, 7 * k]}, show: [at, 1e9], layer: 1},
      {id: `mark${j}-y`, type: 'line', plane: 'p', x1: Math.min(Math.max(0, a), b), y1: y, x2: mk.x, y2: y, style: {stroke: 'muted', width: 2 * k, dash: [5 * k, 7 * k]}, show: [at, 1e9], layer: 1},
      {id: `mark${j}`, type: 'circle', x: sx, y: sy, r: 10 * k, style: {fill: 'none', stroke: colour, width: 4 * k}, show: [at, 1e9], pulse: [at], layer: 4},
      {id: `mark${j}-label`, type: 'text', x: sx + (right ? 18 : -18) * k, y: sy - 24 * k, text: mk.label, size: 26 * k, align: right ? 'start' : 'end', weight: 700, style: {fill: colour}, show: [at, 1e9], layer: 4});
    facts.push(`${mk.label}: ${v} = ${fx(mk.x)}${unitText(s.x)}, ${s.y.name} = ${fy(y)}${unitText(s.y)}`);
    t = Math.max(t, at + 1.6);
    return {label: mk.label, x: mk.x, y: round(y, 6), at};
  });

  for (const ser of s.series) if ('points' in ser) facts.push(`${ser.label}: ${ser.points.map(([x, y], j) => `${ser.names?.[j] ? ser.names[j] + ' ' : ''}(${fx(x)}, ${fy(y)})`).join(', ')}`);
  meta.facts = facts;
  return scene(s, W, H, t + 2.4, plane, props, actors, meta);
}
