// Thermodynamics (NCERT Class 11 Physics, Ch. 11; 2026-10-31). Two verbs, every number computed from the book's formulas:
// - gas_process: a gas under a piston and its path on a P–V graph, one scale for both axes' origins and the piston's height
//   following V: isothermal, W = μRT ln(V₂/V₁); adiabatic, PV^γ constant, W = μR(T₁ − T₂)/(γ − 1); isobaric, W = PΔV; isochoric,
//   W = 0; compare, an isotherm and an adiabat from one state; first_law, ΔQ = ΔU + ΔW. A fixed `window` holds the scale.
// - heat_engine: engine, Q₁ in, W out, Q₂ rejected, η = 1 − Q₂/Q₁; refrigerator, α = Q₂/W; carnot, the four steps on P–V,
//   η = 1 − T₂/T₁ and Q₁/Q₂ = T₁/T₂. Arrow widths follow the heats, to one scale.
import type {Prop, Scene} from '../scene.ts';
import {kit} from './fluids.ts';
import {axes, curve, num as num3} from './thermal.ts';

type P2 = [number, number];
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const R_GAS = 8.31;
// four figures: the book's 2256 J is not 2260
const num = (v: number) => (v !== 0 && (Math.abs(v) < 1e-3 || Math.abs(v) >= 1e5) ? num3(v) : String(+v.toPrecision(4)).replace('-', '−'));
type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};

export const PROCESS_KINDS = ['first_law', 'isothermal', 'adiabatic', 'isobaric', 'isochoric', 'compare'] as const;
export type GasProcessSpec = Common & {verb: 'gas_process'; kind: (typeof PROCESS_KINDS)[number]; mu?: number; T?: number; T2?: number; V1?: number; V2?: number; gamma?: number;
  /** The graph's reach, fixed: V and P from 0 to these. One scale whatever the process, so settings can be compared. */
  window?: {V: number; P: number}; Q?: number; W?: number; U?: number; P?: number; dV?: number};

export function gasProcessErrors(s: GasProcessSpec): string[] {
  const e: string[] = [], v = 'gas_process';
  if (!PROCESS_KINDS.includes(s.kind)) return [`${v}: kind is one of ${PROCESS_KINDS.join(', ')}`];
  for (const f of ['mu', 'T', 'T2', 'V1', 'V2', 'P', 'dV'] as const) if (s[f] !== undefined && !(isNum(s[f]) && s[f]! > 0)) e.push(`${v}: ${f} is a number above 0`);
  if (s.gamma !== undefined && !(isNum(s.gamma) && s.gamma > 1 && s.gamma <= 5 / 3 + 1e-9)) e.push(`${v}: gamma is above 1, at most 5/3`);
  if (s.window !== undefined && !(s.window && isNum(s.window.V) && s.window.V > 0 && isNum(s.window.P) && s.window.P > 0)) e.push(`${v}: window is {V: m³, P: Pa}, the graph's reach from 0`);
  if (s.kind === 'first_law') {
    const given = [s.Q, s.W ?? (s.P && s.dV ? s.P * s.dV : undefined), s.U].filter(x => x !== undefined).length;
    if (given !== 2 && !s.illustrative) e.push(`${v}: first_law solves one unknown: give two of Q, U and W (J), or P and dV for the work`);
    return e;
  }
  if (s.kind === 'isochoric' && s.T2 === undefined && !s.illustrative) e.push(`${v}: isochoric needs T2, the final temperature (K)`);
  if (s.kind === 'isobaric' && s.V2 === undefined && s.T2 === undefined && !s.illustrative) e.push(`${v}: isobaric needs V2 or T2`);
  if (['isothermal', 'adiabatic', 'compare'].includes(s.kind) && s.V1 !== undefined && s.V1 === s.V2) e.push(`${v}: V2 differs from V1`);
  if (!e.length && s.window) {
    const {points} = paths(s);
    if (points.some(([V, P]) => V > s.window!.V || P > s.window!.P)) e.push(`${v}: the path leaves the window: widen window, or keep V and P inside it`);
  }
  return e;
}

/** The process in numbers. */
function paths(s: GasProcessSpec) {
  const mu = s.mu ?? 1, T1 = s.T ?? 300, V1 = s.V1 ?? 0.02, g = s.gamma ?? 1.4, Cv = R_GAS / (g - 1), P1 = mu * R_GAS * T1 / V1, n = 48;
  const along = (a: number, b: number, f: (V: number) => number) => Array.from({length: n + 1}, (_, i) => { const V = a + (b - a) * i / n; return [V, f(V)] as P2; });
  const iso = (V: number) => mu * R_GAS * T1 / V, adi = (V: number) => P1 * (V1 / V) ** g;
  let V2 = s.V2 ?? 2 * V1, T2 = T1, W = 0, line: P2[] = [], other: P2[] | undefined;
  if (s.kind === 'isothermal') { line = along(V1, V2, iso); W = mu * R_GAS * T1 * Math.log(V2 / V1); }
  else if (s.kind === 'adiabatic') { line = along(V1, V2, adi); T2 = T1 * (V1 / V2) ** (g - 1); W = mu * R_GAS * (T1 - T2) / (g - 1); }
  else if (s.kind === 'isobaric') { V2 = s.V2 ?? V1 * (s.T2 ?? 1.5 * T1) / T1; T2 = T1 * V2 / V1; line = along(V1, V2, () => P1); W = P1 * (V2 - V1); }
  else if (s.kind === 'isochoric') { V2 = V1; T2 = s.T2 ?? 1.5 * T1; line = [[V1, P1], [V1, P1 * T2 / T1]]; }
  else { line = along(V1, V2, iso); other = along(V1, V2, adi); T2 = T1 * (V1 / V2) ** (g - 1); W = mu * R_GAS * T1 * Math.log(V2 / V1); }
  const dU = s.kind === 'isothermal' || s.kind === 'compare' ? 0 : mu * Cv * (T2 - T1);
  return {mu, T1, T2, V1, V2, g, P1, W, dU, Q: dU + W, line, other, points: [...line, ...(other ?? [])]};
}

/** A cylinder whose piston follows V; returns nothing, draws in place. */
function cylinder(c: ReturnType<typeof kit>, x0: number, x1: number, top: number, base: number, fr: (t: number) => number, times: number[], hot = false) {
  const {k, rect, dot, anchors} = c, w = x1 - x0, room = base - top, h = (t: number) => Math.max(0.04, fr(t)) * room, ks = times.map(t => [t, base - h(t), 'inOut']), hs = times.map(t => [t, h(t), 'inOut']);
  ks[0] = ks[0].slice(0, 2); hs[0] = hs[0].slice(0, 2);
  rect('cyl', x0, top - 24 * k, w, base - top + 24 * k, {stroke: 'ink', width: 3 * k});
  rect('gas', x0, base - h(times[0]), w, h(times[0]), {fill: hot ? 'bad' : 'cool', opacity: 0.3}, {layer: 1, keys: {y: ks, h: hs}} as never);
  rect('piston', x0, base - h(times[0]) - 20 * k, w, 20 * k, {fill: 'figure', stroke: 'ink', width: 2 * k}, {keys: {y: ks.map(q => [q[0], (q[1] as number) - 20 * k, ...q.slice(2)])}} as never);
  void dot;
  Object.assign(anchors, {piston: [(x0 + x1) / 2, base - h(times[times.length - 1]) - 10 * k], gas: [(x0 + x1) / 2, base - h(times[times.length - 1]) / 2]});
}

export function gasProcess(s: GasProcessSpec): Scene {
  const c = kit(s), {k, bx0, bx1, by0, by1, bw, bh, ill, props, facts, line, label, rect, seg, arrow, dot, anchors, end} = c;
  if (s.kind === 'first_law') {
    const Wd = s.W ?? (s.P && s.dV ? s.P * s.dV : undefined);
    const Q = s.Q ?? (s.U !== undefined && Wd !== undefined ? s.U + Wd : 100), W = Wd ?? (s.U !== undefined ? Q - s.U : 40), U = s.U ?? Q - W;
    const cx = bx0 + 0.3 * bw, w = 0.32 * bw, base = by1 - 0.22 * bh, top = by0 + 0.2 * bh;
    cylinder(c, cx - w / 2, cx + w / 2, top, base, () => 0.6, [0, 1]);
    arrow('Qin', cx, by1 - 0.03 * bh, cx, base + 8 * k, 'bad', {show: [0.8, 1e9], fade: 0.3}); label('lQ', cx + 16 * k, by1 - 0.08 * bh, ill ? 'ΔQ in' : `ΔQ = ${num(Q)} J`, {style: {fill: 'bad'}, show: [0.8, 1e9]});
    const py = base - 0.6 * (base - top) - 20 * k;
    arrow('Wout', cx, py, cx, py - 0.17 * bh, 'accent', {show: [1.8, 1e9], fade: 0.3}); label('lW', cx + 16 * k, py - 0.1 * bh, ill ? 'ΔW by the gas' : `ΔW = ${num(W)} J`, {style: {fill: 'accent'}, show: [1.8, 1e9]});
    label('lU', cx, base - 0.2 * (base - top), ill ? 'ΔU' : `ΔU = ${num(U)} J`, {align: 'middle', style: {fill: 'ink'}, show: [2.8, 1e9]});
    // bars to one scale: heat in against what it becomes
    const bx = bx0 + 0.62 * bw, bb = by1 - 0.14 * bh, top2 = by0 + 0.12 * bh, sc = (bb - top2) / Math.max(Math.abs(Q), Math.abs(W) + Math.abs(U), 1e-9), bwd = 0.12 * bw;
    rect('barQ', bx, bb - Math.abs(Q) * sc, bwd, Math.abs(Q) * sc, {fill: 'bad', opacity: 0.8}, {show: [0.8, 1e9], fade: 0.5});
    rect('barU', bx + 1.3 * bwd, bb - Math.abs(U) * sc, bwd, Math.abs(U) * sc, {fill: 'cool', opacity: 0.8}, {show: [2.8, 1e9], fade: 0.5});
    rect('barW', bx + 1.3 * bwd, bb - (Math.abs(U) + Math.abs(W)) * sc, bwd, Math.abs(W) * sc, {fill: 'accent', opacity: 0.8}, {show: [1.8, 1e9], fade: 0.5});
    label('bq', bx + bwd / 2, bb + 34 * k, 'ΔQ', {align: 'middle', style: {fill: 'bad'}}); label('bu', bx + 1.8 * bwd, bb + 34 * k, 'ΔU + ΔW', {align: 'middle'});
    Object.assign(anchors, {heat: [cx, by1 - 0.06 * bh], work: [cx, py - 0.14 * bh], energy: [cx, base - 0.3 * (base - top)], bars: [bx + bwd, top2]});
    line('l1', 'First law: ΔQ = ΔU + ΔW', 0.3, {weight: 700, style: {fill: 'accent'}});
    line('l2', 'Heat in goes partly to internal energy, partly to work by the system', 1.2, {style: {fill: 'cool'}});
    if (!ill) line('l3', `${num(Q)} J = ${num(U)} J + ${num(W)} J`, 3, {weight: 700});
    facts.push(`ΔQ = ${num(Q)} J, ΔW = ${num(W)} J, ΔU = ${num(U)} J`);
    return end('gas_process', 4.2, {Q, W, U});
  }
  const p = paths(s), Vmax = s.window?.V ?? Math.max(...p.points.map(q => q[0])) * (s.kind === 'isochoric' ? 2 : 1.3), Pmax = s.window?.P ?? Math.max(...p.points.map(q => q[1])) * 1.15;
  const x0 = bx0 + 0.1 * bw, x1 = bx0 + 0.7 * bw, y0 = by0 + 0.06 * bh, y1 = by1 - 0.12 * bh;
  const at = axes(c, x0, y0, x1, y1, 'V', 'P'), G = ([V, P]: P2): P2 => at(V / Vmax, P / Pmax);
  const go = 0.8, done = 3.2, line0 = p.line.map(G), a = line0[0], b = line0[line0.length - 1];
  const expands = p.V2 >= p.V1;
  // the work: the area under the path, strip by strip as the state moves along it
  if (s.kind !== 'isochoric') for (let i = 0; i < p.line.length - 1; i += 1) {
    const q = line0[i], r = line0[i + 1], when = go + (done - go) * i / (p.line.length - 1);
    rect(`w${i}`, Math.min(q[0], r[0]), Math.min(q[1], r[1]), Math.abs(r[0] - q[0]) + 0.5, y1 - Math.min(q[1], r[1]), {fill: 'accent', opacity: s.kind === 'compare' ? 0.12 : 0.28}, {layer: 1, show: [when, 1e9]});
  }
  props.push(curve('path', line0, s.kind === 'adiabatic' ? 'bad' : 'cool', k, go, done));
  if (p.other) { props.push(curve('adiabat', p.other.map(G), 'bad', k, done, done + 1.6)); const e = G(p.other[p.other.length - 1]), f = b;
    label('liso', f[0] - 10 * k, f[1] - 40 * k, 'isothermal', {align: 'end', style: {fill: 'cool'}, show: [done, 1e9]}); label('ladi', e[0] - 10 * k, e[1] + 34 * k, 'adiabatic', {align: 'end', style: {fill: 'bad'}, show: [done + 1.6, 1e9]}); anchors.adiabat = e; }
  const stepKeys = (f: (q: P2) => number) => line0.map((q, i) => (i ? [go + (done - go) * i / (line0.length - 1), f(q), 'linear'] : [go, f(q)]));
  props.push({id: 'state', type: 'circle', x: a[0], y: a[1], r: 11 * k, style: {fill: 'accent', stroke: 'ink', width: 2 * k}, layer: 6, keys: {x: stepKeys(q => q[0]), y: stepKeys(q => q[1])}} as unknown as Prop);
  dot('start', a[0], a[1], 'ink', {show: [0, 1e9]});
  label('l1pt', a[0] + (expands ? 14 : -14) * k, a[1] - 14 * k, '1', {align: expands ? 'start' : 'end'}); label('l2pt', b[0] + 14 * k, b[1] - 14 * k, '2', {show: [done, 1e9]});
  // the axis's numbers
  for (const [id, V] of [['v1', p.V1], ...(p.V2 !== p.V1 ? [['v2', p.V2]] : [])] as [string, number][]) {
    const q = at(V / Vmax, 0); seg(`t${id}`, q[0], q[1], q[0], q[1] + 10 * k, {stroke: 'ink', width: 3 * k});
    label(`lt${id}`, q[0], q[1] + 36 * k, ill ? (id === 'v1' ? 'V₁' : 'V₂') : `${num(V)} m³`, {align: 'middle', style: {fill: 'muted'}});
  }
  // the piston's height follows V, on the graph's own V scale
  const cx0 = bx0 + 0.78 * bw, cx1 = bx0 + 0.96 * bw, frac = (i: number) => p.line[i][0] / Vmax;
  const hot = s.kind === 'isochoric' || s.kind === 'isobaric';
  cylinder(c, cx0, cx1, y0 + 30 * k, y1, t => (t <= go ? frac(0) : frac(p.line.length - 1)), [go, done], hot);
  Object.assign(anchors, {start: a, end: b, curve: line0[Math.floor(line0.length / 2)], area: [(a[0] + b[0]) / 2, (y1 + Math.max(a[1], b[1])) / 2]});
  // the gas and the piston are too narrow to carry words: theirs go under the panel's, or at the foot of a half-width part
  const note: P2 = c.narrow ? [bx0 + 0.1 * bw, c.H - 60 * k] : [bx1 + 20 * k, by1 - 60 * k];
  const words = {
    isothermal: ['Isothermal: T stays fixed, so PV is constant', 'W = μRT ln(V₂/V₁); ΔU = 0, so the heat taken in equals the work'],
    adiabatic: ['Adiabatic: insulated walls, no heat in or out', 'PV^γ is constant; W = μR(T₁ − T₂)/(γ − 1), paid from internal energy'],
    isobaric: ['Isobaric: pressure stays fixed', 'W = P(V₂ − V₁), the rectangle under the line'],
    isochoric: ['Isochoric: volume stays fixed', 'No work is done; all the heat goes to internal energy'],
    compare: ['An isotherm and an adiabat from one state', 'The adiabat falls faster: P ∝ V^−γ against P ∝ V^−1'],
  }[s.kind];
  line('l1', words[0], 0.3, {weight: 700}); line('l2', words[1], 1.4, {style: {fill: 'cool'}});
  if (!ill) {
    line('l3', `T: ${num(p.T1)} K to ${num(p.T2)} K`, done, {style: {fill: 'muted'}});
    if (s.kind !== 'compare') { line('l4', `W = ${num(p.W)} J${expands ? '' : ' (done on the gas)'}`, done, {weight: 700, style: {fill: 'accent'}}); line('l5', `ΔU = ${num(p.dU)} J, Q = ${num(p.Q)} J`, done + 0.3, {style: {fill: 'accent'}}); }
    else { const pa = p.other![p.other!.length - 1][1], pi = p.line[p.line.length - 1][1]; line('l4', `At the end: P isothermal ${num(pi)} Pa, adiabatic ${num(pa)} Pa`, done + 1.6, {weight: 700, style: {fill: 'accent'}}); facts.push(`final pressure: isothermal ${num(pi)} Pa, adiabatic ${num(pa)} Pa`); }
    facts.push(`μ = ${num(p.mu)} mol, T₁ = ${num(p.T1)} K, T₂ = ${num(p.T2)} K, V₁ = ${num(p.V1)} m³, V₂ = ${num(p.V2)} m³`, `W = ${num(p.W)} J, ΔU = ${num(p.dU)} J, Q = ${num(p.Q)} J`);
  }
  return end('gas_process', p.other ? 5.6 : 4.6, {labelEnd: cx0 - 8 * k, labelSpill: note, labelAt: {gas: note, piston: note}, W: p.W, dU: p.dU, Q: p.Q, T2: p.T2, P1: p.P1, P2: p.line[p.line.length - 1][1], Pa2: p.other?.[p.other.length - 1][1], scale: {V: (x1 - x0) / Vmax, P: (y1 - y0) / Pmax}});
}

export const ENGINE_KINDS = ['engine', 'refrigerator', 'carnot'] as const;
export type HeatEngineSpec = Common & {verb: 'heat_engine'; kind: (typeof ENGINE_KINDS)[number]; Q1?: number; Q2?: number; W?: number; eta?: number; T1?: number; T2?: number; V1?: number; V2?: number; mu?: number; gamma?: number; window?: {V: number; P: number}};

export function heatEngineErrors(s: HeatEngineSpec): string[] {
  const e: string[] = [], v = 'heat_engine';
  if (!ENGINE_KINDS.includes(s.kind)) return [`${v}: kind is one of ${ENGINE_KINDS.join(', ')}`];
  for (const f of ['Q1', 'Q2', 'W', 'T1', 'T2', 'V1', 'V2', 'mu'] as const) if (s[f] !== undefined && !(isNum(s[f]) && s[f]! > 0)) e.push(`${v}: ${f} is a number above 0`);
  if (s.T1 !== undefined && s.T2 !== undefined && s.T2 >= s.T1) e.push(`${v}: T1 is the hot reservoir, T2 the cold: T1 above T2, both in kelvin`);
  if (s.Q1 !== undefined && s.Q2 !== undefined && s.Q2 >= s.Q1) e.push(`${v}: Q1 exceeds Q2: the difference is the work`);
  if (s.eta !== undefined && !(isNum(s.eta) && s.eta > 0 && s.eta < 1)) e.push(`${v}: eta is a fraction, above 0 and below 1`);
  if (s.kind !== 'carnot' && !s.illustrative && [s.Q1, s.Q2, s.W, s.eta].filter(x => x !== undefined).length !== 2) e.push(`${v}: give two of Q1, Q2, W, eta`);
  if (s.kind === 'carnot' && s.V1 !== undefined && s.V2 !== undefined && s.V2 <= s.V1) e.push(`${v}: carnot: V2 is above V1, the isothermal expansion`);
  return e;
}

export function heatEngine(s: HeatEngineSpec): Scene {
  const c = kit(s), {k, bx0, by0, by1, bw, bh, ill, props, facts, line, label, rect, anchors, end} = c;
  if (s.kind === 'carnot') {
    const T1 = s.T1 ?? 500, T2 = s.T2 ?? 300, g = s.gamma ?? 5 / 3, mu = s.mu ?? 1, V1 = s.V1 ?? 0.01, V2 = s.V2 ?? 0.022, r = (T1 / T2) ** (1 / (g - 1)), V3 = V2 * r, V4 = V1 * r;
    const Q1 = mu * R_GAS * T1 * Math.log(V2 / V1), Q2 = mu * R_GAS * T2 * Math.log(V3 / V4), W = Q1 - Q2, eta = 1 - T2 / T1, P = (T: number, V: number) => mu * R_GAS * T / V;
    const n = 30, seg4 = (a: number, b: number, f: (V: number) => number) => Array.from({length: n + 1}, (_, i) => { const V = a + (b - a) * i / n; return [V, f(V)] as P2; });
    const P1 = P(T1, V1), P2 = P(T1, V2), P3 = P(T2, V3), P4 = P(T2, V4);
    const legs: [P2[], string, string][] = [[seg4(V1, V2, V => P(T1, V)), 'bad', '1 → 2 isothermal expansion: takes in Q₁'], [seg4(V2, V3, V => P2 * (V2 / V) ** g), 'accent', '2 → 3 adiabatic expansion: T falls'],
      [seg4(V3, V4, V => P(T2, V)), 'cool', '3 → 4 isothermal compression: gives out Q₂'], [seg4(V4, V1, V => P4 * (V4 / V) ** g), 'good', '4 → 1 adiabatic compression: T rises']];
    const Vmax = s.window?.V ?? V3 * 1.12, Pmax = s.window?.P ?? P1 * 1.12, x0 = bx0 + 0.1 * bw, x1 = bx0 + 0.94 * bw, y0 = by0 + 0.06 * bh, y1 = by1 - 0.1 * bh;
    const at = axes(c, x0, y0, x1, y1, 'V', 'P'), G = ([V, Pr]: P2): P2 => at(V / Vmax, Pr / Pmax), each = 1.5;
    legs.forEach(([pts, col, words], i) => { props.push(curve(`leg${i}`, pts.map(G), col, k, 0.6 + i * each, 0.6 + (i + 1) * each)); line(`s${i}`, words, 0.6 + i * each, {style: {fill: col}}); });
    ([[V1, P1, '1', 'start'], [V2, P2, '2', 'start'], [V3, P3, '3', 'start'], [V4, P4, '4', 'end']] as [number, number, string, 'start' | 'end'][]).forEach(([V, Pr, n2, align], i) => {
      const q = G([V, Pr]); c.dot(`p${i}`, q[0], q[1], 'ink'); label(`lp${i}`, q[0] + (align === 'start' ? 14 : -14) * k, q[1] - 14 * k, n2, {align}); anchors[`state${i + 1}`] = q; });
    const t = 0.6 + 4 * each;
    if (!ill) { line('r1', `η = 1 − T₂/T₁ = ${num(eta)}`, t, {weight: 700, style: {fill: 'accent'}}); line('r2', `Q₁ = ${num(Q1)} J, Q₂ = ${num(Q2)} J, W = ${num(W)} J`, t + 0.2); }
    else line('r1', 'η = 1 − T₂/T₁, whatever the working gas', t, {weight: 700, style: {fill: 'accent'}});
    facts.push(`T₁ = ${num(T1)} K, T₂ = ${num(T2)} K: η = 1 − T₂/T₁ = ${num(eta)}`, `Q₁ = ${num(Q1)} J, Q₂ = ${num(Q2)} J, W = ${num(W)} J; Q₁/Q₂ = T₁/T₂ = ${num(T1 / T2)}`);
    return end('heat_engine', t + 1, {eta, Q1, Q2, W, ratio: Q1 / Q2});
  }
  const fridge = s.kind === 'refrigerator';
  let {Q1, Q2, W} = s;
  if (s.eta !== undefined) { if (Q1 !== undefined) W = s.eta * Q1; else if (W !== undefined) Q1 = W / s.eta; else if (Q2 !== undefined) Q1 = Q2 / (1 - s.eta); }
  if (Q1 === undefined) Q1 = Q2 !== undefined && W !== undefined ? Q2 + W : 100;
  if (W === undefined) W = Q2 !== undefined ? Q1 - Q2 : 40;
  if (Q2 === undefined) Q2 = Q1 - W;
  const eta = W / Q1, alpha = Q2 / W;
  const cx = bx0 + 0.42 * bw, w = 0.56 * bw, hb = 0.13 * bh, yt = by0 + 0.03 * bh, yb = by1 - 0.03 * bh - hb, midy = (yt + hb + yb) / 2, R = 0.125 * bh, full = 46 * k, wid = (q: number) => Math.max(3 * k, full * q / Q1!);
  rect('hot', cx - w / 2, yt, w, hb, {fill: 'bad', opacity: 0.7, stroke: 'ink', width: 3 * k}); rect('cold', cx - w / 2, yb, w, hb, {fill: 'cool', opacity: 0.7, stroke: 'ink', width: 3 * k});
  label('lhot', cx, yt + hb / 2 + 9 * k, s.T1 && !ill ? `hot reservoir, ${num(s.T1)} K` : 'hot reservoir', {align: 'middle'}); label('lcold', cx, yb + hb / 2 + 9 * k, s.T2 && !ill ? `cold reservoir, ${num(s.T2)} K` : 'cold reservoir', {align: 'middle'});
  props.push({id: 'body', type: 'circle', x: cx, y: midy, r: R, style: {stroke: 'ink', width: 4 * k, fill: 'paper'}, layer: 4} as Prop);
  label('lbody', cx, midy + 9 * k, fridge ? 'refrigerator' : 'engine', {align: 'middle'});
  // A wide arrow is a band and a filled head: an arrow prop's head is drawn with its shaft's stroke, and a thick one hides it
  const pipe = (id: string, x1: number, y1: number, x2: number, y2: number, q: number, col: string, when: number) => {
    const L = Math.hypot(x2 - x1, y2 - y1), u: P2 = [(x2 - x1) / L, (y2 - y1) / L], n: P2 = [-u[1], u[0]], w = wid(q), hl = Math.max(26 * k, w * 0.9), hw = Math.max(16 * k, w * 0.95), bx = x2 - u[0] * hl, by = y2 - u[1] * hl, on = {show: [when, 1e9] as [number, number], fade: 0.4};
    props.push({id, type: 'line', x1, y1, x2: bx, y2: by, style: {stroke: col, width: w}, layer: 3, ...on} as Prop);
    props.push({id: `${id}h`, type: 'polyline', closed: true, points: [[x2, y2], [bx + n[0] * hw, by + n[1] * hw], [bx - n[0] * hw, by - n[1] * hw]], style: {fill: col}, layer: 3, ...on} as unknown as Prop);
  };
  const gapT = yt + hb + 6 * k, gapB = yb - 6 * k;
  if (fridge) { pipe('q2', cx, gapB, cx, midy + R + 8 * k, Q2, 'cool', 0.8); pipe('q1', cx, midy - R - 8 * k, cx, gapT, Q1, 'bad', 2.4); pipe('w', cx + 0.3 * bw + 60 * k, midy, cx + R + 8 * k, midy, W, 'accent', 1.6); }
  else { pipe('q1', cx, gapT, cx, midy - R - 8 * k, Q1, 'bad', 0.8); pipe('w', cx + R + 8 * k, midy, cx + 0.3 * bw + 60 * k, midy, W, 'accent', 1.6); pipe('q2', cx, midy + R + 8 * k, cx, gapB, Q2, 'cool', 2.4); }
  const lq = (n: string, q: number) => (ill ? n : `${n} = ${num(q)} J`);
  label('lq1', cx - wid(Q1) / 2 - 12 * k, (gapT + midy - R) / 2 + 9 * k, lq('Q₁', Q1), {align: 'end', style: {fill: 'bad'}, show: [fridge ? 2.4 : 0.8, 1e9]});
  label('lq2', cx - wid(Q2) / 2 - 12 * k, (gapB + midy + R) / 2 + 9 * k, lq('Q₂', Q2), {align: 'end', style: {fill: 'cool'}, show: [fridge ? 0.8 : 2.4, 1e9]});
  label('lw', cx + R + 20 * k, midy - wid(W) / 2 - 14 * k, lq('W', W), {style: {fill: 'accent'}, show: [1.6, 1e9]});
  Object.assign(anchors, {hot: [cx, yt + hb / 2], cold: [cx, yb + hb / 2], body: [cx, midy], work: [cx + R + 60 * k, midy]});
  const under = midy + Math.max(16 * k, 0.95 * wid(W)) + 34 * k, side = cx + w / 2 + 16 * k;
  const labelAt = {hot: [side, yt + hb / 2], cold: [side, yb + hb / 2], work: [cx + R + 20 * k, under], body: [cx + R + 20 * k, under + 40 * k]};
  if (fridge) { line('l1', 'A refrigerator: work carries heat from cold to hot', 0.3, {weight: 700}); line('l2', 'Q₁ = Q₂ + W; α = Q₂ / W', 1.6, {style: {fill: 'cool'}}); if (!ill) line('l3', `α = ${num(alpha)}`, 2.8, {weight: 700, style: {fill: 'accent'}}); facts.push(`Q₁ = ${num(Q1)} J, Q₂ = ${num(Q2)} J, W = ${num(W)} J, α = ${num(alpha)}`); }
  else { line('l1', 'A heat engine: heat in, work out, the rest rejected', 0.3, {weight: 700}); line('l2', 'W = Q₁ − Q₂; η = W / Q₁ = 1 − Q₂ / Q₁', 1.6, {style: {fill: 'cool'}}); if (!ill) line('l3', `η = ${num(eta)}`, 2.8, {weight: 700, style: {fill: 'accent'}}); facts.push(`Q₁ = ${num(Q1)} J, Q₂ = ${num(Q2)} J, W = ${num(W)} J, η = ${num(eta)}`); }
  return end('heat_engine', 3.8, {Q1, Q2, W, eta, alpha, labelAt});
}
