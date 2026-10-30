// Thermal properties of matter (NCERT Class 11 Physics, Ch. 10; 2026-10-30). Four verbs, every number computed from the
// book's formulas and tables:
// - temperature: scales, Celsius, Fahrenheit and Kelvin side by side; conversion, the straight line (tF − 32)/180 = tC/100;
//   absolute_zero, gas pressure against temperature extrapolated to −273.15 °C; gas_law, PV = μRT, one unknown solved.
// - thermal_expansion: rod, Δl = αl l ΔT; sheet, ΔA = ΔA₁ + ΔA₂ + ΔA₃ ≈ 2αl A ΔT; block, αv = 3αl; ring, heated to fit a rim;
//   water, its volume least at 4 °C; stress, a rod held between walls, F/A = Y αl ΔT.
// - heat_exchange: heating, the same heat raising substances by different amounts, Q = msΔT; mixing, heat lost = heat
//   gained, solving a specific heat, a final temperature or (with ice) a latent heat; state, temperature against heat
//   through ice, water and steam, Q = mL on the flats.
// - heat_transfer: conduction, bars end to end in the steady state, H = KAΔT/L; convection, a pot, sea and land breezes, a
//   pumped loop; radiation, H = eσA(T⁴ − Ts⁴); wien, blackbody curves, λmT = 2.9 × 10⁻³ m K; cooling, Newton's law.
import type {Prop, Scene} from '../scene.ts';
import {kit} from './fluids.ts';
import {sci} from './gravitation.ts';
import {n2} from './calculus.ts';

type P2 = [number, number];
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const num = (v: number) => (v !== 0 && (Math.abs(v) < 1e-3 || Math.abs(v) >= 1e5) ? sci(v) : n2(+v.toPrecision(3), Math.max(0, 2 - Math.floor(Math.log10(Math.abs(v) || 1)))));
const deg = (v: number) => `${n2(+v.toPrecision(4), 1)} °C`;
const lookup = <T>(table: Record<string, T>, name: unknown) => (typeof name === 'string' ? table[name.toLowerCase()] : undefined);
const heads = (table: Record<string, unknown>) => Object.keys(table).join(', ');
type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};

// Table 10.1, K⁻¹ (steel from the book's rail); Table 10.3, J kg⁻¹ K⁻¹; Table 10.6, W m⁻¹ K⁻¹
export const ALPHA: Record<string, number> = {aluminium: 2.5e-5, brass: 1.8e-5, iron: 1.2e-5, steel: 1.2e-5, copper: 1.7e-5, silver: 1.9e-5, gold: 1.4e-5, glass: 0.32e-5, lead: 0.29e-5};
export const SPECIFIC: Record<string, number> = {aluminium: 900, carbon: 506.5, copper: 386.4, lead: 127.7, silver: 236.1, tungsten: 134.4, water: 4186, ice: 2060, glass: 840, iron: 450, kerosene: 2118, 'edible oil': 1965, mercury: 140};
export const CONDUCTIVITY: Record<string, number> = {silver: 406, copper: 385, aluminium: 205, brass: 109, steel: 50.2, lead: 34.7, mercury: 8.3, 'insulating brick': 0.15, concrete: 0.8, 'body fat': 0.2, felt: 0.04, glass: 0.8, ice: 1.6, 'glass wool': 0.04, wood: 0.12, water: 0.8, air: 0.024, argon: 0.016, hydrogen: 0.14};
const R_GAS = 8.31, SIGMA = 5.67e-8, WIEN = 2.9e-3;

/** A pair of axes with names; returns the box's mapping from the 0–1 square. */
function axes(c: ReturnType<typeof kit>, x0: number, y0: number, x1: number, y1: number, xn: string, yn: string) {
  const {k, seg, label} = c;
  seg('axx', x0, y1, x1, y1, {stroke: 'ink', width: 3 * k}); seg('axy', x0, y0, x0, y1, {stroke: 'ink', width: 3 * k});
  label('axxn', x1, y1 + 38 * k, xn, {align: 'end', style: {fill: 'muted'}});
  label('axyn', x0 + 10 * k, y0 + 8 * k, yn, {style: {fill: 'muted'}});
  return (u: number, v: number): P2 => [x0 + u * (x1 - x0), y1 - v * (y1 - y0)];
}
/** A polyline drawing itself on between two times. */
const curve = (id: string, points: P2[], stroke: string, k: number, from = 0.3, to = 2.2, extra: Record<string, unknown> = {}): Prop =>
  ({id, type: 'polyline', points, style: {stroke, width: 4 * k, ...(extra.dash ? {dash: extra.dash} : {})}, layer: 4, draw: 1, keys: {draw: [[from, 0], [to, 1, 'linear']]}} as unknown as Prop);
/** A heat-coloured strip: cold blue to hot red, u(x) from 0 to 1. */
function ramp(c: ReturnType<typeof kit>, id: string, x: number, y: number, w: number, h: number, u: (f: number) => number, extra: Partial<Prop> = {}) {
  const n = 28;
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n, sx = x + i * w / n, sw = w / n + 0.5;
    c.rect(`${id}c${i}`, sx, y, sw, h, {fill: 'cool', opacity: 0.55 * (1 - u(f))}, {layer: 2, ...extra});
    c.rect(`${id}h${i}`, sx, y, sw, h, {fill: 'bad', opacity: 0.85 * u(f)}, {layer: 2, ...extra});
  }
}
const colour = (u: number) => (u > 0.5 ? 'bad' : 'cool');

// ───────────────────────────── temperature ─────────────────────────────
export const TEMPERATURE_KINDS = ['scales', 'conversion', 'absolute_zero', 'gas_law'] as const;
export type TemperatureSpec = Common & {verb: 'temperature'; kind: (typeof TEMPERATURE_KINDS)[number]; t?: number; tF?: number; T?: number; lines?: number;
  P?: number; V?: number; mu?: number; T2?: number; hold?: 'P' | 'V'};

export function temperatureErrors(s: TemperatureSpec): string[] {
  const e: string[] = [], v = 'temperature';
  if (!TEMPERATURE_KINDS.includes(s.kind)) return [`${v}: kind is one of ${TEMPERATURE_KINDS.join(', ')}`];
  for (const f of ['t', 'tF', 'T', 'P', 'V', 'mu', 'T2'] as const) if (s[f] !== undefined && !isNum(s[f])) e.push(`${v}: ${f} is a number`);
  if ([s.t, s.tF, s.T].filter(x => x !== undefined).length > 1 && s.kind !== 'gas_law') e.push(`${v}: give one of t (°C), tF (°F) or T (K)`);
  if (s.T !== undefined && s.T <= 0) e.push(`${v}: T is in kelvin, above absolute zero`);
  if (s.t !== undefined && s.t < -273.15) e.push(`${v}: t is below absolute zero (−273.15 °C)`);
  if (s.lines !== undefined && !(Number.isInteger(s.lines) && s.lines >= 1 && s.lines <= 4)) e.push(`${v}: lines is 1 to 4 gases`);
  if (s.kind === 'gas_law') {
    const known = [s.P, s.V, s.mu, s.T].filter(x => x !== undefined).length;
    if (known !== 3 && !s.illustrative) e.push(`${v}: gas_law solves one unknown: give three of P (Pa), V (m³), mu (moles), T (K)`);
    if (s.T2 !== undefined && (s.T2 <= 0 || !s.hold)) e.push(`${v}: T2 (K, above zero) with hold 'P' or 'V', what stays fixed as the gas warms`);
  }
  return e;
}

export function temperature(s: TemperatureSpec): Scene {
  const c = kit(s), {k, bx0, by0, by1, bw, bh, ill, props, facts, line, label, rect, seg, dot, anchors, end} = c;
  const tc = s.t ?? (s.tF !== undefined ? (s.tF - 32) * 100 / 180 : s.T !== undefined ? s.T - 273.15 : undefined);
  const toF = (x: number) => x * 180 / 100 + 32, toK = (x: number) => x + 273.15;
  if (s.kind === 'scales') {
    const lo = Math.min(-20, tc ?? 0), hi = Math.max(120, tc ?? 0), top = by0 + 0.1 * bh, bot = by1 - 0.1 * bh, y = (x: number) => bot - (x - lo) / (hi - lo) * (bot - top);
    const scales: [string, (x: number) => number, string][] = [['Celsius', x => x, '°C'], ['Fahrenheit', toF, '°F'], ['Kelvin', toK, 'K']];
    scales.forEach(([name, f, unit], i) => {
      const x = bx0 + (0.14 + 0.32 * i) * bw, w = 34 * k;
      rect(`tube${i}`, x - w / 2, top, w, bot - top, {stroke: 'ink', width: 3 * k});
      if (tc !== undefined) rect(`col${i}`, x - w / 2, y(tc), w, bot - y(tc), {fill: 'bad', opacity: 0.8}, {keys: {y: [[0.8, bot], [2.4, y(tc), 'out']], h: [[0.8, 0], [2.4, bot - y(tc), 'out']]} as never});
      label(`name${i}`, x, bot + 40 * k, name, {align: 'middle'});
      for (const [id, at] of [['ice', 0], ['steam', 100]] as const) {
        seg(`m${id}${i}`, x - w / 2 - 10 * k, y(at), x + w / 2 + 10 * k, y(at), {stroke: 'ink', width: 3 * k});
        label(`l${id}${i}`, x + w / 2 + 16 * k, y(at) + 9 * k, `${n2(+f(at).toFixed(2), 2)} ${unit}`, {style: {fill: id === 'ice' ? 'cool' : 'bad'}, show: [0.4, 1e9]});
      }
      if (tc !== undefined && !ill) label(`read${i}`, x + w / 2 + 16 * k, y(tc) + 9 * k, `${n2(+f(tc).toFixed(unit === 'K' ? 2 : 1), unit === 'K' ? 2 : 1)} ${unit}`, {style: {fill: 'accent'}, show: [2.4, 1e9]});
      anchors[name.toLowerCase()] = [x, top];
    });
    Object.assign(anchors, {ice: [bx0 + 0.14 * bw, y(0)], steam: [bx0 + 0.14 * bw, y(100)]});
    line('l1', 'Ice point and steam point fix each scale', 0.3, {weight: 700});
    line('l2', 'Fahrenheit has 180 divisions between them, Celsius and Kelvin 100', 1, {style: {fill: 'cool'}});
    line('l3', '(tF − 32) / 180 = tC / 100;  T = tC + 273.15', 1.8, {style: {fill: 'accent'}});
    if (tc !== undefined && !ill) { line('l4', `${deg(tc)} = ${n2(+toF(tc).toFixed(1), 1)} °F = ${n2(+toK(tc).toFixed(2), 2)} K`, 2.6, {weight: 700}); facts.push(`${deg(tc)} = ${n2(+toF(tc).toFixed(1), 1)} °F = ${n2(+toK(tc).toFixed(2), 2)} K`); }
    facts.push('ice point 0 °C = 32 °F = 273.15 K; steam point 100 °C = 212 °F = 373.15 K');
    return end('temperature', 4, {t: tc});
  }
  if (s.kind === 'conversion') {
    const lo = Math.min(-40, tc ?? 0), hi = Math.max(120, tc ?? 0), Flo = toF(lo), Fhi = toF(hi), x0 = bx0 + 0.14 * bw, x1 = bx0 + 0.94 * bw, y0 = by0 + 0.08 * bh, y1 = by1 - 0.14 * bh;
    const at = axes(c, x0, y0, x1, y1, 'tC (°C)', 'tF (°F)'), P = (x: number) => at((x - lo) / (hi - lo), (toF(x) - Flo) / (Fhi - Flo));
    props.push(curve('line', [P(lo), P(hi)], 'cool', k));
    for (const [id, x] of [['ice', 0], ['steam', 100]] as const) {
      const p = P(x); dot(id, p[0], p[1], id === 'ice' ? 'cool' : 'bad', {show: [1.6, 1e9]});
      label(`l${id}`, p[0] + (id === 'ice' ? 18 : -18) * k, p[1] + 34 * k, `${x} °C, ${toF(x)} °F`, {align: id === 'ice' ? 'start' : 'end', style: {fill: id === 'ice' ? 'cool' : 'bad'}, show: [1.6, 1e9]});
      anchors[id] = p;
    }
    if (tc !== undefined) { const p = P(tc); dot('read', p[0], p[1], 'accent', {show: [2.4, 1e9]}); anchors.point = p; if (!ill) label('lread', p[0] + (tc < 50 ? 18 : -18) * k, p[1] - 18 * k, `${n2(+tc.toFixed(1), 1)} °C, ${n2(+toF(tc).toFixed(1), 1)} °F`, {align: tc < 50 ? 'start' : 'end', style: {fill: 'accent'}, show: [2.4, 1e9]}); facts.push(`${deg(tc)} = ${n2(+toF(tc).toFixed(1), 1)} °F`); }
    line('l1', 'A straight line through two fixed points', 0.3, {weight: 700});
    line('l2', '(tF − 32) / 180 = tC / 100', 1.2, {style: {fill: 'accent'}});
    line('l3', 'One Celsius degree is 1.8 Fahrenheit degrees', 2, {style: {fill: 'cool'}});
    facts.push('(tF − 32)/180 = tC/100; the line passes 0 °C, 32 °F and 100 °C, 212 °F');
    return end('temperature', 3.6, {t: tc});
  }
  if (s.kind === 'absolute_zero') {
    const x0 = bx0 + 0.08 * bw, x1 = bx0 + 0.96 * bw, y0 = by0 + 0.06 * bh, y1 = by1 - 0.14 * bh, n = s.lines ?? 3, lo = -300, hi = 150;
    const at = axes(c, x0, y0, x1, y1, 'temperature (°C)', 'pressure'), X = (x: number) => (x - lo) / (hi - lo), Z = -273.15;
    for (let i = 0; i < n; i++) {
      const slope = (0.26 + 0.13 * i) / (0 - Z), P = (x: number): P2 => at(X(x), (x - Z) * slope);
      props.push(curve(`gas${i}`, [P(-20), P(hi - 10)], ['cool', 'good', 'accent', 'figure'][i], k, 0.4 + 0.2 * i, 1.6 + 0.2 * i));
      props.push(curve(`ext${i}`, [P(-20), P(Z)], 'muted', k, 2 + 0.1 * i, 3.4 + 0.1 * i, {dash: [10 * k, 10 * k]}));
    }
    const p = at(X(Z), 0); dot('zero', p[0], p[1], 'bad', {show: [3.4, 1e9]}); anchors.zero = p; anchors.gases = at(X(100), 0.5);
    label('lzero', p[0], p[1] + 38 * k, '−273.15 °C', {align: 'start', style: {fill: 'bad'}, show: [3.4, 1e9]});
    const q = at(X(0), 0); seg('t0', q[0], q[1], q[0], q[1] + 10 * k, {stroke: 'ink', width: 3 * k}); label('l0', q[0], q[1] + 38 * k, '0 °C', {align: 'middle', style: {fill: 'muted'}});
    line('l1', 'Low-density gases at constant volume: pressure rises in a straight line with temperature', 0.3, {weight: 700});
    line('l2', 'Each line, carried back, reaches zero pressure at the same point', 2, {style: {fill: 'cool'}});
    line('l3', 'Absolute zero: −273.15 °C, the zero of the Kelvin scale', 3.4, {style: {fill: 'bad'}});
    line('l4', 'T = tC + 273.15', 3.8, {style: {fill: 'accent'}});
    facts.push('absolute zero is −273.15 °C = 0 K; every low-density gas line extrapolates to it');
    return end('temperature', 5);
  }
  // gas_law: a gas in a cylinder under a piston
  let {P, V, mu, T} = s;
  if (P === undefined && V !== undefined && mu !== undefined && T !== undefined) P = mu * R_GAS * T / V;
  else if (V === undefined && P !== undefined && mu !== undefined && T !== undefined) V = mu * R_GAS * T / P;
  else if (mu === undefined && P !== undefined && V !== undefined && T !== undefined) mu = P * V / (R_GAS * T);
  else if (T === undefined && P !== undefined && V !== undefined && mu !== undefined) T = P * V / (mu * R_GAS);
  const cx = bx0 + 0.42 * bw, w = 0.44 * bw, base = by1 - 0.1 * bh, h1 = 0.42 * bh, ratio = s.T2 && T && s.hold === 'P' ? Math.min(1.7, Math.max(0.5, s.T2 / T)) : 1, h2 = h1 * ratio;
  rect('cyl', cx - w / 2, by0 + 0.1 * bh, w, base - by0 - 0.1 * bh, {stroke: 'ink', width: 3 * k});
  rect('gas', cx - w / 2, base - h1, w, h1, {fill: 'bad', opacity: 0.25}, {layer: 1, keys: {y: [[1.6, base - h1], [3.2, base - h2, 'inOut']], h: [[1.6, h1], [3.2, h2, 'inOut']]} as never});
  rect('piston', cx - w / 2, base - h1 - 22 * k, w, 22 * k, {fill: 'figure', stroke: 'ink', width: 2 * k}, {keys: {y: [[1.6, base - h1 - 22 * k], [3.2, base - h2 - 22 * k, 'inOut']]} as never});
  for (let i = 0; i < 14; i++) { const u = (i * 0.5698) % 1, v = (i * 0.7548) % 1; dot(`m${i}`, cx - w / 2 + (0.08 + 0.84 * u) * w, base - (0.08 + 0.8 * v) * h1, 'ink', {r: 6 * k} as never); }
  Object.assign(anchors, {gas: [cx, base - h1 / 2], piston: [cx, base - h1 - 11 * k], base: [cx, base]});
  line('l1', 'PV = μRT, with T in kelvin', 0.3, {weight: 700, style: {fill: 'accent'}});
  line('l2', 'R = 8.31 J mol⁻¹ K⁻¹, the same for every gas', 1, {style: {fill: 'cool'}});
  if (!ill && P && V && mu && T) { line('l3', `P = ${num(P)} Pa, V = ${num(V)} m³`, 1.6); line('l4', `μ = ${num(mu)} mol, T = ${num(T)} K`, 1.8); facts.push(`P = ${num(P)} Pa, V = ${num(V)} m³, μ = ${num(mu)} mol, T = ${num(T)} K, R = 8.31 J/(mol K)`); }
  if (s.T2 && T) { const f = s.T2 / T, t = s.hold === 'P' ? `Pressure held: V grows ${num(f)} times to ${num((V ?? 0) * f)} m³` : `Volume held: P grows ${num(f)} times to ${num((P ?? 0) * f)} Pa`; if (!ill) { line('l5', t, 3.2, {style: {fill: 'bad'}}); facts.push(t); } }
  return end('temperature', 4.2, {P, V, mu, T});
}

// ───────────────────────────── thermal_expansion ─────────────────────────────
export const EXPANSION_KINDS = ['rod', 'sheet', 'block', 'ring', 'water', 'stress'] as const;
export type ExpansionSpec = Common & {verb: 'thermal_expansion'; kind: (typeof EXPANSION_KINDS)[number]; material?: string; alpha?: number; l?: number; a?: number; b?: number; dT?: number; T1?: number;
  d_ring?: number; d_rim?: number; Y?: number; A?: number};

export function expansionErrors(s: ExpansionSpec): string[] {
  const e: string[] = [], v = 'thermal_expansion';
  if (!EXPANSION_KINDS.includes(s.kind)) return [`${v}: kind is one of ${EXPANSION_KINDS.join(', ')}`];
  if (s.material !== undefined && lookup(ALPHA, s.material) === undefined) e.push(`${v}: material is one of Table 10.1 (${heads(ALPHA)}), or give alpha (K⁻¹)`);
  if (s.alpha !== undefined && !(isNum(s.alpha) && s.alpha > 0 && s.alpha < 1e-2)) e.push(`${v}: alpha is the linear coefficient in K⁻¹ (iron 1.2e-5)`);
  if (s.kind === 'water' || s.kind === 'sheet' || s.kind === 'block') return e;   // the derivations need no material
  if (s.material === undefined && s.alpha === undefined && !s.illustrative) e.push(`${v}: give material or alpha`);
  if (s.kind === 'ring') { if (!(isNum(s.d_ring) && isNum(s.d_rim) && s.d_ring > 0 && s.d_rim > s.d_ring)) e.push(`${v}: ring needs d_ring (m) smaller than d_rim (m)`); return e; }
  if (!s.illustrative && !(isNum(s.dT) && s.dT !== 0)) e.push(`${v}: dT is the temperature change in K or °C`);
  if (s.kind === 'rod' || s.kind === 'stress') { if (s.l !== undefined && !(isNum(s.l) && s.l > 0)) e.push(`${v}: l is the length in m`); }
  if (s.kind === 'stress' && !s.illustrative && !(isNum(s.Y) && s.Y > 0)) e.push(`${v}: stress needs Y, Young's modulus in N/m² (steel 2e11)`);
  return e;
}

export function thermalExpansion(s: ExpansionSpec): Scene {
  const c = kit(s), {k, bx0, bx1, by0, by1, bw, bh, ill, props, facts, line, label, rect, seg, arrow, dot, anchors, end} = c;
  const name = s.material ?? 'the solid', alpha = s.alpha ?? lookup(ALPHA, s.material) ?? 1.2e-5, dT = s.dT ?? 100, drawn = ill ? '' : ' (growth drawn larger than real)';
  if (s.kind === 'rod') {
    const l = s.l ?? 1, dl = alpha * l * dT, x = bx0 + 0.06 * bw, L = 0.68 * bw, gap = 0.16 * L, y1 = by0 + 0.26 * bh, y2 = by0 + 0.56 * bh, h = 0.11 * bh;
    rect('cold', x, y1, L, h, {fill: 'cool', opacity: 0.55, stroke: 'ink', width: 2 * k});
    rect('hot', x, y2, L, h, {fill: 'bad', opacity: 0.7, stroke: 'ink', width: 2 * k}, {keys: {w: [[1, L], [3, L + gap, 'inOut']]} as never});
    seg('d1', x + L, y1, x + L, y2 + h + 26 * k, {stroke: 'muted', width: 2 * k, dash: [6 * k, 6 * k]});
    arrow('dl', x + L, y2 + h + 26 * k, x + L + gap, y2 + h + 26 * k, 'accent', {show: [3, 1e9], fade: 0.3});
    label('ldl', x + L + gap / 2, y2 + h + 66 * k, 'Δl', {align: 'middle', style: {fill: 'accent'}, show: [3, 1e9]});
    label('lcold', x, y1 - 14 * k, ill ? 'length l' : `l = ${num(l)} m`, {style: {fill: 'cool'}});
    label('lhot', x, y2 - 14 * k, ill ? 'hotter by ΔT' : `hotter by ${num(dT)} K`, {style: {fill: 'bad'}, show: [1, 1e9]});
    Object.assign(anchors, {cold: [x + L / 2, y1 + h / 2], hot: [x + L / 2, y2 + h / 2], end: [x + L + gap, y2 + h / 2]});
    line('l1', `A rod of ${name} heated${drawn}`, 0.3, {weight: 700});
    line('l2', 'Δl / l = αl ΔT: the fractional growth is proportional to the rise', 1.6, {style: {fill: 'cool'}});
    if (!ill) { line('l3', `Δl = ${num(alpha)} K⁻¹ × ${num(l)} m × ${num(dT)} K = ${num(dl * 1000)} mm`, 3, {weight: 700, style: {fill: 'accent'}}); facts.push(`Δl = αl l ΔT = ${num(dl)} m (αl = ${num(alpha)} K⁻¹)`); }
    return end('thermal_expansion', 4.2, {dl});
  }
  if (s.kind === 'sheet') {
    const a = s.a ?? 1, b = s.b ?? 0.6, r = b / a, W0 = 0.52 * bw, H0 = Math.min(0.5 * bh, W0 * r), da = 0.15 * W0, db = 0.15 * W0, x = bx0 + 0.08 * bw, y = by0 + 0.2 * bh;
    rect('sheet', x, y, W0, H0, {fill: 'cool', opacity: 0.5, stroke: 'ink', width: 3 * k});
    rect('dA1', x, y + H0, W0, db, {fill: 'bad', opacity: 0.55, stroke: 'ink', width: 2 * k}, {show: [1.2, 1e9], fade: 0.5});
    rect('dA2', x + W0, y, da, H0, {fill: 'accent', opacity: 0.55, stroke: 'ink', width: 2 * k}, {show: [1.8, 1e9], fade: 0.5});
    rect('dA3', x + W0, y + H0, da, db, {fill: 'good', opacity: 0.7, stroke: 'ink', width: 2 * k}, {show: [2.4, 1e9], fade: 0.5});
    label('la', x + W0 / 2, y - 14 * k, 'a', {align: 'middle'}); label('lb', x - 26 * k, y + H0 / 2, 'b', {align: 'middle'});
    label('lA1', x + W0 / 2, y + H0 + db / 2 + 9 * k, 'a Δb', {align: 'middle', show: [1.2, 1e9]});
    label('lA2', x + W0 + da / 2, y + H0 / 2, 'b Δa', {align: 'middle', show: [1.8, 1e9]});
    label('lA3', x + W0 + da + 12 * k, y + H0 + db / 2 + 9 * k, 'Δa Δb, tiny', {style: {fill: 'good'}, show: [2.4, 1e9]});
    Object.assign(anchors, {sheet: [x + W0 / 2, y + H0 / 2], strip: [x + W0 / 2, y + H0 + db / 2], corner: [x + W0 + da / 2, y + H0 + db / 2]});
    line('l1', 'A sheet grows in length and breadth (growth drawn larger than real)', 0.3, {weight: 700});
    line('l2', 'ΔA = a Δb + b Δa + Δa Δb', 1.4, {style: {fill: 'cool'}});
    line('l3', 'αl ≈ 10⁻⁵ K⁻¹, so the corner Δa Δb is negligible: ΔA / A ≈ 2αl ΔT', 2.6, {style: {fill: 'accent'}});
    facts.push('ΔA = a Δb + b Δa + Δa Δb; dropping the last term, the coefficient of area expansion is 2αl');
    if (!ill && (s.material || s.alpha) && s.dT) { const f = 2 * alpha * dT; facts.push(`ΔA/A = 2αl ΔT = ${num(f)}`); line('l4', `Here ΔA / A = ${num(f)}`, 3.2, {weight: 700}); }
    return end('thermal_expansion', 4.2);
  }
  if (s.kind === 'block') {
    const x = bx0 + 0.16 * bw, y = by0 + 0.3 * bh, a0 = 0.34 * bh, g = 0.14 * a0, d = 0.32 * a0;
    const cube = (id: string, a: number, style: Prop['style'], extra: Partial<Prop>) => {
      const y1 = y + a0 - a;
      props.push({id: `${id}f`, type: 'polyline', closed: true, points: [[x, y1], [x + a, y1], [x + a, y1 + a], [x, y1 + a]], style, layer: 3, ...extra} as Prop);
      props.push({id: `${id}t`, type: 'polyline', closed: true, points: [[x, y1], [x + d, y1 - d], [x + a + d, y1 - d], [x + a, y1]], style, layer: 3, ...extra} as Prop);
      props.push({id: `${id}s`, type: 'polyline', closed: true, points: [[x + a, y1], [x + a + d, y1 - d], [x + a + d, y1 + a - d], [x + a, y1 + a]], style, layer: 3, ...extra} as Prop);
    };
    cube('hot', a0 + g, {fill: 'bad', opacity: 0.3, stroke: 'bad', width: 2 * k}, {show: [1.4, 1e9], fade: 0.6});
    cube('cold', a0, {fill: 'cool', opacity: 0.6, stroke: 'ink', width: 3 * k}, {});
    label('lV', x + a0 / 2, y + a0 / 2 + 9 * k, 'V', {align: 'middle'}); label('ldV', x + a0 + g + d + 16 * k, y + a0 / 2, 'V + ΔV', {style: {fill: 'bad'}, show: [1.4, 1e9]});
    Object.assign(anchors, {block: [x + a0 / 2, y + a0 / 2], grown: [x + a0 + g, y]});
    line('l1', 'A solid grows along all three edges (growth drawn larger than real)', 0.3, {weight: 700});
    line('l2', 'ΔV / V = αv ΔT', 1.4, {style: {fill: 'cool'}});
    line('l3', 'Each edge grows by αl ΔT, so αv = 3αl', 2.2, {style: {fill: 'accent'}});
    facts.push('αv = 3αl: the three edges each grow by the fraction αl ΔT');
    if (!ill && (s.material || s.alpha)) { line('l4', `${name}: αl = ${num(alpha)} K⁻¹, αv = ${num(3 * alpha)} K⁻¹`, 3, {weight: 700}); facts.push(`${name}: αl = ${num(alpha)} K⁻¹, αv = ${num(3 * alpha)} K⁻¹`); }
    return end('thermal_expansion', 4);
  }
  if (s.kind === 'ring') {
    const T1 = s.T1 ?? 27, dr = s.d_ring ?? 5.231, dm = s.d_rim ?? 5.243, T2 = T1 + (dm - dr) / (dr * alpha), cx = bx0 + 0.36 * bw, cy = by0 + 0.5 * bh, Rm = Math.min(0.36 * bh, 0.28 * bw), Rr = 0.86 * Rm;
    props.push({id: 'rim', type: 'circle', x: cx, y: cy, r: Rm, style: {fill: 'figure', opacity: 0.35, stroke: 'ink', width: 3 * k}, layer: 2} as Prop);
    props.push({id: 'ring', type: 'circle', x: cx, y: cy, r: Rr, style: {stroke: 'bad', width: 12 * k}, layer: 4, keys: {r: [[1.2, Rr], [3.4, Rm, 'inOut']]}} as unknown as Prop);
    label('lrim', cx, cy - 10 * k, ill ? 'wooden rim' : `rim ${dm} m`, {align: 'middle'});
    label('lring', cx, cy + 30 * k, ill ? 'iron ring' : `ring ${dr} m`, {align: 'middle', style: {fill: 'bad'}});
    Object.assign(anchors, {ring: [cx + Rm * Math.SQRT1_2, cy - Rm * Math.SQRT1_2], rim: [cx, cy], centre: [cx, cy]});
    line('l1', `${/^[aeiou]/i.test(s.material ?? 'metal') ? 'An' : 'A'} ${s.material ?? 'metal'} ring heated until it fits (gap drawn larger than real)`, 0.3, {weight: 700});
    line('l2', 'L₂ = L₁ [1 + αl (T₂ − T₁)]', 1.2, {style: {fill: 'cool'}});
    if (!ill) { line('l3', `T₂ = ${n2(+T1.toFixed(1), 1)} °C + (${dm} − ${dr}) / (${dr} × ${num(alpha)}) = ${n2(Math.round(T2), 0)} °C`, 3.4, {weight: 700, style: {fill: 'accent'}}); }
    facts.push(`the ring must reach ${n2(Math.round(T2), 0)} °C from ${n2(T1, 0)} °C`);
    return end('thermal_expansion', 4.6, {T2});
  }
  if (s.kind === 'water') {
    const x0 = bx0 + 0.12 * bw, x1 = bx0 + 0.94 * bw, y0 = by0 + 0.1 * bh, y1 = by1 - 0.16 * bh, at = axes(c, x0, y0, x1, y1, 'temperature (°C)', 'volume'), V = (T: number) => 0.14 + 0.62 * ((T - 4) / 8) ** 2;
    props.push(curve('v', Array.from({length: 49}, (_, i) => at(i / 48, V(12 * i / 48))), 'cool', k));
    const p = at(4 / 12, V(4)); dot('min', p[0], p[1], 'accent', {show: [2.2, 1e9]}); seg('m4', p[0], y1, p[0], p[1], {stroke: 'muted', width: 2 * k, dash: [6 * k, 6 * k]}, {show: [2.2, 1e9]});
    label('l4', p[0], y1 + 38 * k, '4 °C', {align: 'middle', style: {fill: 'accent'}, show: [2.2, 1e9]}); label('l0', x0, y1 + 38 * k, '0', {align: 'middle', style: {fill: 'muted'}});
    Object.assign(anchors, {minimum: p, cold: at(0.06, V(0.7)), warm: at(0.9, V(10.8))});
    line('l1', 'Water contracts on heating from 0 °C to 4 °C (shape only, not to scale)', 0.3, {weight: 700});
    line('l2', 'Above 4 °C it expands like other liquids', 1.2, {style: {fill: 'cool'}});
    line('l3', 'So its volume is least and its density greatest at 4 °C', 2.2, {style: {fill: 'accent'}});
    line('l4b', 'A lake freezes from the top: the densest water sinks', 3, {style: {fill: 'muted'}});
    facts.push('water has its maximum density at 4 °C; between 0 °C and 4 °C it contracts on heating');
    return end('thermal_expansion', 4);
  }
  // stress: a rod between rigid walls
  const l = s.l ?? 5, Y = s.Y ?? 2e11, strain = alpha * dT, stress = Y * strain, x = bx0 + 0.1 * bw, x2 = bx1 - 0.1 * bw, y = by0 + 0.38 * bh, h = 0.14 * bh;
  rect('wallL', x - 44 * k, y - 0.16 * bh, 44 * k, h + 0.32 * bh, {fill: 'faint', stroke: 'ink', width: 2 * k}); rect('wallR', x2, y - 0.16 * bh, 44 * k, h + 0.32 * bh, {fill: 'faint', stroke: 'ink', width: 2 * k});
  rect('rod', x, y, x2 - x, h, {fill: 'bad', opacity: 0.6, stroke: 'ink', width: 2 * k});
  arrow('fL', x - 4 * k, y + h / 2, x + 130 * k, y + h / 2, 'accent', {show: [1.6, 1e9], fade: 0.3}); arrow('fR', x2 + 4 * k, y + h / 2, x2 - 130 * k, y + h / 2, 'accent', {show: [1.6, 1e9], fade: 0.3});
  label('lrod', (x + x2) / 2, y + h / 2 + 9 * k, ill ? 'heated, cannot grow' : `${s.material ?? 'rod'}, ${num(dT)} K hotter`, {align: 'middle'});
  label('lF', (x + x2) / 2, y + h + 60 * k, 'the walls press it back', {align: 'middle', style: {fill: 'accent'}, show: [1.6, 1e9]});
  Object.assign(anchors, {rod: [(x + x2) / 2, y + h / 2], left: [x, y + h / 2], right: [x2, y + h / 2]});
  line('l1', 'A heated rod held between rigid walls', 0.3, {weight: 700});
  line('l2', 'The strain it is denied, αl ΔT, sets up a thermal stress: F / A = Y αl ΔT', 1.6, {style: {fill: 'cool'}});
  if (!ill) {
    line('l3', `Strain ${num(strain)}; stress ${num(stress)} N/m²`, 2.4, {weight: 700, style: {fill: 'accent'}});
    if (s.A) line('l4', `Force on a ${num(s.A)} m² section: ${num(stress * s.A)} N`, 2.8, {style: {fill: 'accent'}});
    facts.push(`strain αl ΔT = ${num(strain)}, thermal stress Y αl ΔT = ${num(stress)} N/m²${s.A ? `, force ${num(stress * s.A)} N` : ''} (l = ${num(l)} m is not in the answer)`);
  }
  return end('thermal_expansion', 3.6, {stress});
}

// ───────────────────────────── heat_exchange ─────────────────────────────
export const EXCHANGE_KINDS = ['heating', 'mixing', 'state'] as const;
type Lump = {name?: string; material?: string; m?: number; s?: number; T?: number};
export type ExchangeSpec = Common & {verb: 'heat_exchange'; kind: (typeof EXCHANGE_KINDS)[number]; substances?: string[]; m?: number; Q?: number; dT?: number;
  hot?: Lump; cold?: Lump; vessel?: Lump; ice?: number; Tf?: number; T0?: number; T1?: number; s_ice?: number; s_water?: number; Lf?: number; Lv?: number; axis?: 'heat' | 'time'};
const sOf = (x: Lump | undefined) => x?.s ?? lookup(SPECIFIC, x?.material);

export function exchangeErrors(s: ExchangeSpec): string[] {
  const e: string[] = [], v = 'heat_exchange';
  if (!EXCHANGE_KINDS.includes(s.kind)) return [`${v}: kind is one of ${EXCHANGE_KINDS.join(', ')}`];
  if (s.kind === 'heating') {
    if (!Array.isArray(s.substances) || s.substances.length < 2 || s.substances.length > 4) e.push(`${v}: heating compares substances, 2 to 4 names from Table 10.3 (${heads(SPECIFIC)})`);
    else for (const n of s.substances) if (lookup(SPECIFIC, n) === undefined) e.push(`${v}: ${n} is not in Table 10.3 (${heads(SPECIFIC)})`);
    if (!s.illustrative && s.Q === undefined && s.dT === undefined) e.push(`${v}: give Q (J, the same heat to each) or dT (K, the same rise for each)`);
    if (s.Q !== undefined && s.dT !== undefined) e.push(`${v}: give Q or dT, not both`);
  }
  if (s.kind === 'mixing' && !s.illustrative) {
    const need = (x: Lump | undefined, n: string) => { if (!x || !(isNum(x.m) && x.m > 0) || !isNum(x.T)) e.push(`${v}: ${n} needs m (kg) and T (°C)`); if (x?.material !== undefined && lookup(SPECIFIC, x.material) === undefined) e.push(`${v}: ${n}.material is one of ${heads(SPECIFIC)}, or give s`); };
    need(s.hot, 'hot');
    if (s.ice !== undefined) { if (!isNum(s.Tf)) e.push(`${v}: with ice, give Tf, the final temperature (°C): the latent heat is solved`); }
    else {
      need(s.cold, 'cold');
      const unknowns = [sOf(s.hot), sOf(s.cold), s.Tf].filter(x => x === undefined).length;
      if (unknowns !== 1) e.push(`${v}: mixing solves one unknown: leave out one of the hot body's specific heat, the cold body's, or Tf (${unknowns} missing)`);
      if (isNum(s.Tf) && s.hot?.T !== undefined && s.cold?.T !== undefined && !(s.Tf > s.cold.T && s.Tf < s.hot.T)) e.push(`${v}: Tf lies between the two starting temperatures`);
    }
  }
  if (s.kind === 'state') {
    if (s.m !== undefined && !(isNum(s.m) && s.m > 0)) e.push(`${v}: m is the mass in kg`);
    if (s.T0 !== undefined && !(isNum(s.T0) && s.T0 < 0)) e.push(`${v}: T0 is the ice's starting temperature, below 0 °C`);
    if (s.T1 !== undefined && s.T1 !== 100) e.push(`${v}: the curve ends as steam at 100 °C; leave T1 out`);
  }
  return e;
}

export function heatExchange(s: ExchangeSpec): Scene {
  const c = kit(s), {k, bx0, by0, by1, bw, bh, ill, props, facts, line, label, rect, seg, dot, anchors, end} = c;
  if (s.kind === 'heating') {
    const names = s.substances ?? ['water', 'copper'], m = s.m ?? 1, sp = names.map(n => lookup(SPECIFIC, n)!), rises = sp.map(x => (s.Q ? s.Q / (m * x) : s.dT ?? 1 / x)), heats = sp.map(x => m * x * (s.dT ?? 1));
    const same = s.dT !== undefined, values = same ? heats : rises, top = Math.max(...values), y1 = by1 - 0.14 * bh, y0 = by0 + 0.08 * bh, n = names.length;
    names.forEach((name, i) => {
      const x = bx0 + (i + 0.5) / n * bw, w = 0.5 * bw / n, h = values[i] / top * (y1 - y0);
      rect(`bar${i}`, x - w / 2, y1 - h, w, h, {fill: same ? 'accent' : 'bad', opacity: 0.8}, {keys: {y: [[0.8, y1], [2.8, y1 - h, 'out']], h: [[0.8, 0], [2.8, h, 'out']]} as never});
      label(`n${i}`, x, y1 + 38 * k, name, {align: 'middle'});
      if (!ill) label(`v${i}`, x, y1 - h - 14 * k, same ? `${num(heats[i])} J` : `${num(rises[i])} K`, {align: 'middle', style: {fill: 'ink'}, show: [2.8, 1e9]});
      facts.push(`${name}: s = ${num(sp[i])} J/(kg K)${s.Q ? `, ${num(s.Q)} J raises ${num(m)} kg by ${num(rises[i])} K` : s.dT ? `, ${num(m)} kg by ${num(s.dT)} K takes ${num(heats[i])} J` : ''}`);
      anchors[name.toLowerCase().replace(/\s+/g, '_')] = [x, y1 - h];
    });
    seg('base', bx0, y1, bx0 + bw, y1, {stroke: 'ink', width: 3 * k});
    line('l1', same ? 'The same rise takes different heat' : 'The same heat gives different rises', 0.3, {weight: 700});
    line('l2', 'Q = m s ΔT: s is the heat for 1 kg to rise by 1 K', 1.2, {style: {fill: 'cool'}});
    const lo = names[sp.indexOf(Math.max(...sp))];
    line('l3', same ? `${lo} takes the most heat` : `${lo} has the largest s, so it warms least`, 2.8, {style: {fill: 'accent'}});
    return end('heat_exchange', 4, {rises, heats});
  }
  if (s.kind === 'state') {
    const m = s.m ?? 1, T0 = s.T0 ?? -12, si = s.s_ice ?? 2100, sw = s.s_water ?? 4186, Lf = s.Lf ?? 3.35e5, Lv = s.Lv ?? 2.256e6;
    const Q = [m * si * -T0, m * Lf, m * sw * 100, m * Lv], total = Q.reduce((a, b) => a + b, 0), x0 = bx0 + 0.1 * bw, x1 = bx0 + 0.96 * bw, y0 = by0 + 0.08 * bh, y1 = by1 - 0.16 * bh;
    const at = axes(c, x0, y0, x1, y1, s.axis === 'time' ? 'time (steady heater)' : 'heat added', 'temperature');
    // the flats are true to scale only if the drawing allows: each stage keeps a readable width, in order
    const widths = Q.map(q => 0.2 + 0.6 * q / total), W = widths.reduce((a, b) => a + b, 0), fr = widths.map(w => w / W), lo = T0 - 60, hi = 112, tv = (T: number) => (T - lo) / (hi - lo);
    const nodes: [number, number][] = [[0, T0]]; let u = 0;
    [0, 0, 100, 100].forEach((T, i) => { u += fr[i]; nodes.push([u, T]); });
    const pts = nodes.map(([a, T]) => at(a * 0.92, tv(T)));
    const times = [0.5, 1.5, 2.7, 3.7, 5.2];
    pts.slice(1).forEach((p, i) => props.push(curve(`st${i}`, [pts[i], p], ['cool', 'accent', 'cool', 'accent'][i], k, times[i], times[i + 1])));
    props.push({id: 'mark', type: 'circle', x: pts[0][0], y: pts[0][1], r: 11 * k, style: {fill: 'bad', stroke: 'ink', width: 2 * k}, layer: 6,
      keys: {x: pts.map((p, i) => [times[i], p[0], 'linear']), y: pts.map((p, i) => [times[i], p[1], 'linear'])}} as unknown as Prop);
    const mid = (i: number): P2 => [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2], names = ['ice warms', 'melting', 'water warms', 'boiling'];
    names.forEach((n, i) => {
      const p = mid(i), flat = i % 2 === 1;
      // flats carry their words above the line; the first slope's go below the melting flat, the second's beside it
      label(`s${i}`, p[0] + (flat ? 0 : 16 * k), p[1] + (flat ? -50 : i === 0 ? 62 : 34) * k, n, {align: flat ? 'middle' : 'start', style: {fill: flat ? 'accent' : 'cool'}, show: [times[i], 1e9]});
      if (!ill) label(`q${i}`, p[0] + (flat ? 0 : 16 * k), p[1] + (flat ? -18 : i === 0 ? 94 : 66) * k, `${num(Q[i])} J`, {align: flat ? 'middle' : 'start', style: {fill: 'muted'}, show: [times[i + 1], 1e9]});
    });
    label('t0', x0 - 12 * k, pts[1][1] + 9 * k, '0 °C', {align: 'end', style: {fill: 'muted'}}); label('t100', x0 - 12 * k, pts[3][1] + 9 * k, '100 °C', {align: 'end', style: {fill: 'muted'}});
    Object.assign(anchors, {ice: mid(0), melting: mid(1), water: mid(2), boiling: mid(3), start: pts[0], end: pts[4]});
    line('l1', 'While the state changes (solid and liquid, or liquid and steam, together), the temperature stays fixed', 0.3, {weight: 700});
    line('l2', 'Q = m s ΔT on the slopes; Q = m L on the flats', 1.5, {style: {fill: 'cool'}});
    if (!ill) { line('l3', `Latent heats: Lf = ${num(Lf)} J/kg, Lv = ${num(Lv)} J/kg`, 2.7, {style: {fill: 'accent'}}); line('l4', `In all: ${num(total)} J for ${num(m)} kg from ${n2(T0, 0)} °C`, 5.2, {weight: 700}); }
    else line('l3', 'Boiling takes far more heat than melting', 3.7, {style: {fill: 'accent'}});
    facts.push(...Q.map((q, i) => `${names[i]}: ${num(q)} J`), `total ${num(total)} J`, 'drawing: stage widths follow the heat only roughly (not to scale)');
    return end('heat_exchange', 6, {Q, total});
  }
  // mixing: a hot lump into a cold liquid; heat lost = heat gained
  const hot = s.hot ?? {}, cold = s.cold ?? {material: 'water'}, vessel = s.vessel, ice = s.ice;
  const mh = hot.m ?? 1, Th = hot.T ?? 100, sw = ice ? (hot.s ?? 4186) : 4186;
  let sh = ice ? sw : sOf(hot), sc = sOf(cold), Tf = s.Tf, L: number | undefined;
  const vc = vessel ? (vessel.m ?? 0) * (sOf(vessel) ?? 0) : 0, mc = cold.m ?? 1, Tc = ice ? 0 : cold.T ?? 20;
  if (ice) { L = (mh * sw * (Th - (Tf ?? 0)) - ice * sw * (Tf ?? 0)) / ice; }
  else if (Tf === undefined && sh !== undefined && sc !== undefined) { const a = mh * sh, b = mc * sc + vc; Tf = (a * Th + b * Tc) / (a + b); }
  else if (sh === undefined && Tf !== undefined && sc !== undefined) sh = (mc * sc + vc) * (Tf - Tc) / (mh * (Th - Tf));
  else if (sc === undefined && Tf !== undefined && sh !== undefined) sc = (mh * sh * (Th - Tf) - vc * (Tf - Tc)) / (mc * (Tf - Tc));
  const lost = ice ? mh * sw * (Th - (Tf ?? 0)) : (mh * (sh ?? 0) * (Th - (Tf ?? Tc)));
  const hn = hot.name ?? hot.material ?? 'hot body', cn = ice ? 'ice' : cold.name ?? cold.material ?? 'water';
  const cx = bx0 + 0.3 * bw, w = 0.36 * bw, y0 = by0 + 0.24 * bh, y1 = by1 - 0.1 * bh, lvl = y0 + 0.2 * (y1 - y0);
  rect('vessel', cx - w / 2, y0, w, y1 - y0, {stroke: 'ink', width: 4 * k});
  rect('liquid', cx - w / 2, lvl, w, y1 - lvl, {fill: 'cool', opacity: 0.5}, {layer: 1});
  props.push({id: 'lump', type: 'circle', x: cx - w * 0.14, y: by0 + 0.05 * bh, r: 38 * k, style: {fill: 'bad', stroke: 'ink', width: 3 * k}, layer: 4, keys: {y: [[0.6, by0 + 0.05 * bh], [1.8, lvl + 0.5 * (y1 - lvl), 'in']]}} as unknown as Prop);
  const tx = cx + w * 0.26; seg('thermo', tx, by0 + 0.06 * bh, tx, y1 - 30 * k, {stroke: 'ink', width: 6 * k}, {layer: 5});
  const bx = bx0 + 0.62 * bw, bw2 = 0.12 * bw, by = by1 - 0.16 * bh, bh2 = 0.55 * bh;
  rect('lost', bx, by - bh2, bw2, bh2, {fill: 'bad', opacity: 0.8}, {keys: {y: [[2, by], [4, by - bh2, 'out']], h: [[2, 0], [4, bh2, 'out']]} as never});
  rect('gain', bx + 1.3 * bw2, by - bh2, bw2, bh2, {fill: 'cool', opacity: 0.8}, {keys: {y: [[2, by], [4, by - bh2, 'out']], h: [[2, 0], [4, bh2, 'out']]} as never});
  label('llost', bx + bw2 / 2, by + 34 * k, 'lost', {align: 'middle', style: {fill: 'bad'}}); label('lgain', bx + 1.8 * bw2, by + 34 * k, 'gained', {align: 'middle', style: {fill: 'cool'}});
  if (!ill) label('lQ', bx + 1.15 * bw2, by - bh2 - 16 * k, `${num(lost)} J`, {align: 'middle', show: [4, 1e9]});
  label('lhot', cx - w * 0.14 + 54 * k, by0 + 0.05 * bh + 9 * k, ill ? hn : `${hn}, ${n2(Th, 0)} °C`, {style: {fill: 'bad'}, show: [0, 0.6]});
  label('lcold', cx, y1 - 18 * k, ill ? cn : `${cn}, ${n2(Tc, 0)} °C`, {align: 'middle', style: {fill: 'cool'}});
  if (!ill && Tf !== undefined) label('lTf', tx + 14 * k, lvl - 16 * k, `${n2(+Tf.toFixed(1), 1)} °C`, {style: {fill: 'accent'}, show: [4, 1e9]});
  Object.assign(anchors, {lump: [cx - w * 0.14, lvl + 0.5 * (y1 - lvl)], liquid: [cx, (lvl + y1) / 2], thermometer: [tx, lvl], lost: [bx + bw2 / 2, by - bh2], gained: [bx + 1.8 * bw2, by - bh2]});
  line('l1', 'Heat lost by the hot body = heat gained by the cold, with none escaping', 0.3, {weight: 700});
  line('l2', ice ? 'Q = m L melts the ice; Q = m s ΔT warms what it becomes' : 'Q = m s ΔT for each', 1.4, {style: {fill: 'cool'}});
  if (!ill) {
    if (ice && L !== undefined) { line('l3', `Lf = ${num(L)} J/kg`, 4, {weight: 700, style: {fill: 'accent'}}); facts.push(`heat lost ${num(lost)} J; latent heat of fusion Lf = ${num(L)} J/kg (${num(ice)} kg of ice, final ${n2(Tf ?? 0, 1)} °C)`); }
    else {
      if (s.hot && !sOf(s.hot) && sh !== undefined) { line('l3', `s of ${hn} = ${n2(Math.round(sh), 0)} J/(kg K)`, 4, {weight: 700, style: {fill: 'accent'}}); facts.push(`specific heat of ${hn}: ${n2(Math.round(sh), 0)} J/(kg K)`); }
      else if (s.cold && !sOf(s.cold) && sc !== undefined) { line('l3', `s of ${cn} = ${n2(Math.round(sc), 0)} J/(kg K)`, 4, {weight: 700, style: {fill: 'accent'}}); facts.push(`specific heat of ${cn}: ${n2(Math.round(sc), 0)} J/(kg K)`); }
      else if (Tf !== undefined) { line('l3', `Final temperature ${n2(+Tf.toFixed(1), 1)} °C`, 4, {weight: 700, style: {fill: 'accent'}}); }
      facts.push(`heat lost = heat gained = ${num(lost)} J; final temperature ${n2(+(Tf ?? 0).toFixed(1), 1)} °C`);
    }
  }
  return end('heat_exchange', 5, {Tf, s_hot: sh, s_cold: sc, L, lost});
}

// ───────────────────────────── heat_transfer ─────────────────────────────
export const TRANSFER_KINDS = ['conduction', 'convection', 'radiation', 'wien', 'cooling'] as const;
type Bar = {material?: string; K?: number; L?: number; A?: number};
export type TransferSpec = Common & {verb: 'heat_transfer'; kind: (typeof TRANSFER_KINDS)[number]; bars?: Bar[]; T1?: number; T2?: number; setting?: 'pot' | 'day' | 'night' | 'forced';
  T?: number; Ts?: number; A?: number; e?: number; temps?: number[]; lambda?: number; body?: string; from?: number; to?: number; minutes?: number; then_from?: number; then_to?: number};

export function transferErrors(s: TransferSpec): string[] {
  const e: string[] = [], v = 'heat_transfer';
  if (!TRANSFER_KINDS.includes(s.kind)) return [`${v}: kind is one of ${TRANSFER_KINDS.join(', ')}`];
  if (s.kind === 'conduction') {
    if (!Array.isArray(s.bars) || s.bars.length < 1 || s.bars.length > 3) e.push(`${v}: bars is 1 to 3 bars end to end, each with material or K, and L (m)`);
    else s.bars.forEach((b, i) => {
      if (b.K === undefined && lookup(CONDUCTIVITY, b.material) === undefined) e.push(`${v}: bars[${i}].material is one of Table 10.6 (${heads(CONDUCTIVITY)}), or give K (W/(m K))`);
      if (!s.illustrative && !(isNum(b.L) && b.L > 0)) e.push(`${v}: bars[${i}].L is its length in m`);
    });
    if (!s.illustrative && !(isNum(s.T1) && isNum(s.T2) && s.T1 > s.T2)) e.push(`${v}: T1 is the hot end, T2 the cold end, T1 > T2, in one unit`);
  }
  if (s.kind === 'convection' && s.setting !== undefined && !['pot', 'day', 'night', 'forced'].includes(s.setting)) e.push(`${v}: setting is pot, day (sea breeze), night (land breeze) or forced`);
  if (s.kind === 'radiation' && !s.illustrative) {
    if (!(isNum(s.T) && s.T > 0)) e.push(`${v}: T is the body's temperature in kelvin`);
    if (!(isNum(s.A) && s.A > 0)) e.push(`${v}: A is the surface area in m²`);
  }
  if (s.kind === 'radiation' && s.e !== undefined && !(isNum(s.e) && s.e > 0 && s.e <= 1)) e.push(`${v}: e, the emissivity, is above 0 and at most 1`);
  if (s.kind === 'wien') {
    if (s.temps !== undefined && !(Array.isArray(s.temps) && s.temps.length >= 1 && s.temps.length <= 4 && s.temps.every(t => isNum(t) && t >= 200 && t <= 3e4))) e.push(`${v}: temps is 1 to 4 temperatures, 200 K to 30000 K`);
    if (s.temps && s.temps.length > 1 && Math.max(...s.temps) / Math.min(...s.temps) > 4) e.push(`${v}: temps span too much to share one graph: keep the hottest within 4 times the coolest`);
    if (s.lambda !== undefined && !(isNum(s.lambda) && s.lambda > 0 && s.lambda < 1e-3)) e.push(`${v}: lambda is the peak wavelength in m (4753 Å is 4.753e-7)`);
  }
  if (s.kind === 'cooling' && !s.illustrative) {
    if (!isNum(s.Ts)) e.push(`${v}: Ts is the room temperature, °C`);
    if (!(isNum(s.from) && isNum(s.to) && isNum(s.minutes) && s.from > s.to && s.minutes > 0)) e.push(`${v}: from, to (°C) and minutes give the first cooling interval`);
    if ((s.then_from === undefined) !== (s.then_to === undefined)) e.push(`${v}: give then_from and then_to together: the interval whose time is solved`);
  }
  return e;
}

export function heatTransfer(s: TransferSpec): Scene {
  const c = kit(s), {k, bx0, bx1, by0, by1, bw, bh, ill, props, facts, line, label, rect, seg, arrow, dot, anchors, end} = c;
  if (s.kind === 'conduction') {
    const bars = (s.bars ?? [{material: 'copper', L: 1}]).map(b => ({...b, K: b.K ?? lookup(CONDUCTIVITY, b.material) ?? 1, L: b.L ?? 1, A: b.A ?? 1})), T1 = s.T1 ?? 100, T2 = s.T2 ?? 0;
    const Rs = bars.map(b => b.L / (b.K * b.A)), Rt = Rs.reduce((a, b) => a + b, 0), H = (T1 - T2) / Rt, Tj: number[] = [T1];
    bars.forEach((_, i) => Tj.push(Tj[i] - H * Rs[i]));
    const Ltot = bars.reduce((a, b) => a + b.L, 0), x0 = bx0 + 0.1 * bw, Lp = 0.78 * bw, ybar = by0 + 0.12 * bh, h = 0.15 * bh, u = (T: number) => (T - T2) / (T1 - T2);
    const gx0 = x0, gy0 = ybar + h + 0.1 * bh, gy1 = by1 - 0.12 * bh;
    let xp = x0;
    const xs: number[] = [x0];
    bars.forEach((b, i) => {
      const w = b.L / Ltot * Lp;
      ramp(c, `b${i}`, xp, ybar, w, h, f => u(Tj[i] + (Tj[i + 1] - Tj[i]) * f), {show: [0.6, 1e9], fade: 1.2});
      rect(`o${i}`, xp, ybar, w, h, {stroke: 'ink', width: 3 * k}, {layer: 4});
      label(`n${i}`, xp + w / 2, ybar - 14 * k, ill ? (b.material ?? `bar ${i + 1}`) : `${b.material ?? `K = ${num(b.K)}`}${b.material ? `, K = ${num(b.K)}` : ''}`, {align: 'middle'});
      anchors[`bar${bars.length > 1 ? i + 1 : ''}`] = [xp + w / 2, ybar + h / 2];
      xp += w; xs.push(xp);
    });
    const G = (x: number, T: number): P2 => [x, gy1 - u(T) * (gy1 - gy0)];
    seg('gaxis', gx0, gy1, x0 + Lp, gy1, {stroke: 'muted', width: 2 * k}); seg('gaxisy', gx0, gy0, gx0, gy1, {stroke: 'muted', width: 2 * k});
    label('gname', x0 + Lp, gy1 + 34 * k, 'along the bar', {align: 'end', style: {fill: 'muted'}});
    props.push(curve('profile', xs.map((x, i) => G(x, Tj[i])), 'accent', k, 1.2, 2.6));
    arrow('H', x0 + 0.1 * Lp, ybar + h / 2, x0 + 0.9 * Lp, ybar + h / 2, 'ink', {show: [2.6, 1e9], fade: 0.3});
    label('lH', x0 + 0.5 * Lp, ybar + h / 2 - 12 * k, 'H', {align: 'middle', style: {fill: 'ink'}, show: [2.6, 1e9]});
    Tj.forEach((T, i) => { if (i === 0 || i === bars.length || !ill) label(`T${i}`, xs[i], ybar + h + 36 * k, ill ? (i === 0 ? 'hot end' : 'cold end') : `${n2(+T.toFixed(1), 1)}°`, {align: i === 0 ? 'start' : i === bars.length ? 'end' : 'middle', style: {fill: colour(u(T))}, show: [i === 0 || i === bars.length ? 0.4 : 2.6, 1e9]}); });
    Object.assign(anchors, {hot: [xs[0], ybar + h / 2], cold: [xs[bars.length], ybar + h / 2], profile: G((xs[0] + xs[1]) / 2, (Tj[0] + Tj[1]) / 2)});
    if (bars.length > 1) anchors.junction = [xs[1], ybar + h / 2];
    line('l1', 'In the steady state the same heat current passes every section', 0.3, {weight: 700});
    line('l2', 'H = K A (T₁ − T₂) / L', 1.2, {style: {fill: 'cool'}});
    line('l3', bars.length > 1 ? 'The poorer conductor takes the steeper drop' : 'The temperature falls evenly along the bar', 2.6, {style: {fill: 'accent'}});
    if (!ill) {
      if (bars.length > 1) { line('l4', `Junction ${n2(+Tj[1].toFixed(1), 1)}°`, 3, {weight: 700}); facts.push(`junction temperature ${n2(+Tj[1].toFixed(1), 1)}`); }
      if (bars.every(b => b.A !== 1)) { line('l5', `H = ${num(H)} W`, 3.2, {weight: 700}); facts.push(`heat current H = ${num(H)} W`); }
      if (bars.length === 2 && bars[0].A === bars[1].A && bars[0].L === bars[1].L) { const Ke = 2 * bars[0].K * bars[1].K / (bars[0].K + bars[1].K); facts.push(`equivalent conductivity K' = 2K₁K₂/(K₁ + K₂) = ${num(Ke)} W/(m K)`); line('l6', `K' = ${num(Ke)} W/(m K)`, 3.4); }
    }
    return end('heat_transfer', 4.4, {H, junctions: Tj});
  }
  if (s.kind === 'convection') {
    const setting = s.setting ?? 'pot', loop = (id: string, cx: number, cy: number, rx: number, ry: number, clockwise: boolean, n = 8) => {
      // particles riding a closed loop, so the matter itself is seen to move
      const P = (a: number): P2 => [cx + rx * Math.cos(a), cy + ry * Math.sin(a)], dir = clockwise ? 1 : -1, dur = 5;
      props.push({id: `${id}path`, type: 'polyline', closed: true, points: Array.from({length: 40}, (_, i) => P(i / 40 * 2 * Math.PI)), style: {stroke: 'muted', width: 2 * k, dash: [8 * k, 10 * k]}, layer: 3} as Prop);
      for (let i = 0; i < n; i++) {
        const ph = i / n * 2 * Math.PI, ks = Array.from({length: 25}, (_, j) => j / 24), xs = ks.map(f => [0.5 + f * dur, P(ph + dir * f * 2 * Math.PI)[0], 'linear']), ys = ks.map(f => [0.5 + f * dur, P(ph + dir * f * 2 * Math.PI)[1], 'linear']);
        const a0 = P(ph);
        props.push({id: `${id}d${i}`, type: 'circle', x: a0[0], y: a0[1], r: 9 * k, style: {fill: 'accent', stroke: 'ink', width: 2 * k}, layer: 5, keys: {x: xs, y: ys}} as unknown as Prop);
      }
    };
    const x0 = bx0 + 0.06 * bw, W = 0.84 * bw, y0 = by0 + 0.1 * bh, y1 = by1 - 0.14 * bh, mx = x0 + W / 2, my = (y0 + y1) / 2;
    if (setting === 'pot') {
      rect('pot', x0, y0, W, y1 - y0, {stroke: 'ink', width: 4 * k}); rect('water', x0, y0 + 30 * k, W, y1 - y0 - 30 * k, {fill: 'cool', opacity: 0.4}, {layer: 1});
      rect('hotb', x0, y1 - 24 * k, W, 24 * k, {fill: 'bad', opacity: 0.9}, {layer: 2});
      label('lheat', mx, y1 + 38 * k, 'heated from below', {align: 'middle', style: {fill: 'bad'}});
      // both cells rise up the middle, over the hottest part, and sink by the walls
      loop('a', x0 + W * 0.27, my + 14 * k, W * 0.2, (y1 - y0) * 0.32, false); loop('b', x0 + W * 0.73, my + 14 * k, W * 0.2, (y1 - y0) * 0.32, true);
      arrow('up', mx, y1 - 40 * k, mx, y0 + 60 * k, 'bad', {show: [0.4, 1e9]}); label('lup', mx, y0 - 14 * k, 'hot, less dense, rises', {style: {fill: 'bad'}, align: 'middle', show: [1.2, 1e9]});
      Object.assign(anchors, {bottom: [mx, y1], top: [mx, y0 + 30 * k], rising: [mx, my], sinking: [x0 + 20 * k, my]});
      line('l1', 'Convection: the heated fluid itself moves', 0.3, {weight: 700});
      line('l2', 'Heated from below, it expands, grows less dense and rises by buoyancy', 1.2, {style: {fill: 'bad'}});
      line('l3', 'Colder fluid sinks to replace it, and the cycle goes on', 2.4, {style: {fill: 'cool'}});
      facts.push('natural convection: the hot part rises because it is less dense; gravity is essential; only in fluids');
    } else if (setting === 'forced') {
      rect('tank', x0, my - 90 * k, 0.26 * W, 180 * k, {fill: 'bad', opacity: 0.5, stroke: 'ink', width: 3 * k}); label('ltank', x0 + 0.13 * W, my + 9 * k, 'hot source', {align: 'middle'});
      rect('sink', x0 + 0.74 * W, my - 90 * k, 0.26 * W, 180 * k, {fill: 'cool', opacity: 0.5, stroke: 'ink', width: 3 * k}); label('lsink', x0 + 0.87 * W, my + 9 * k, 'radiator', {align: 'middle'});
      loop('a', mx, my, W * 0.37, (y1 - y0) * 0.36, true, 10);
      props.push({id: 'pump', type: 'circle', x: mx, y: my - (y1 - y0) * 0.36, r: 34 * k, style: {fill: 'figure', stroke: 'ink', width: 3 * k}, layer: 6} as Prop); label('lpump', mx, my - (y1 - y0) * 0.36 - 46 * k, 'pump', {align: 'middle'});
      Object.assign(anchors, {pump: [mx, my - (y1 - y0) * 0.36], source: [x0 + 0.13 * W, my], radiator: [x0 + 0.87 * W, my]});
      line('l1', 'Forced convection: a pump drives the fluid', 0.3, {weight: 700});
      line('l2', 'The moving matter carries the heat from where it is hot to where it is cool', 1.4, {style: {fill: 'cool'}});
      line('l3', 'As in a car engine\'s cooling, or the blood in the body', 2.6, {style: {fill: 'muted'}});
      facts.push('forced convection: the material is made to move by a pump or some other physical means');
    } else {
      const day = setting === 'day', gy = y1 - 60 * k, split = mx;
      rect('land', x0, gy, split - x0, y1 - gy, {fill: day ? 'bad' : 'figure', opacity: 0.7}, {layer: 2}); rect('sea', split, gy, x0 + W - split, y1 - gy, {fill: 'cool', opacity: day ? 0.7 : 0.9}, {layer: 2});
      label('lland', (x0 + split) / 2, y1 + 38 * k, day ? 'land: warmer' : 'land: cooler', {align: 'middle', style: {fill: day ? 'bad' : 'cool'}});
      label('lsea', (x0 + W + split) / 2, y1 + 38 * k, day ? 'sea: cooler' : 'sea: warmer', {align: 'middle', style: {fill: day ? 'cool' : 'bad'}});
      // day: rises over the land, comes in from the sea along the ground (seen from here, the near-ground flow runs right to left)
      loop('a', mx, (y0 + gy) / 2 + 10 * k, W * 0.36, (gy - y0) * 0.38, day);
      label('lwind', mx, gy - 14 * k, day ? 'sea breeze' : 'land breeze', {align: 'middle', style: {fill: 'accent'}, show: [1.4, 1e9]});
      arrow('wind', day ? split + 90 * k : split - 90 * k, gy - 44 * k, day ? split - 90 * k : split + 90 * k, gy - 44 * k, 'accent', {show: [1.4, 1e9]});
      Object.assign(anchors, {land: [(x0 + split) / 2, gy], sea: [(x0 + W + split) / 2, gy], wind: [split, gy - 44 * k], rising: [day ? (x0 + split) / 2 : (x0 + W + split) / 2, (y0 + gy) / 2]});
      line('l1', day ? 'By day the ground heats up faster than the water' : 'At night the ground loses heat faster than the water', 0.3, {weight: 700});
      line('l2', day ? 'Warm air over the land rises; cooler air from the sea moves in' : 'Warm air over the sea rises; cooler air from the land moves out', 1.4, {style: {fill: 'cool'}});
      line('l3', day ? 'Water has the greater specific heat, and mixing spreads its heat' : 'The day\'s cycle is reversed', 2.6, {style: {fill: 'muted'}});
      facts.push(day ? 'sea breeze: by day air rises over the warmer land and air from the sea replaces it' : 'land breeze: at night air rises over the warmer sea and air from the land replaces it');
    }
    return end('heat_transfer', 6, {setting});
  }
  if (s.kind === 'radiation') {
    const T = s.T ?? 300, A = s.A ?? 1, e = s.e ?? 1, Ts = s.Ts, H = e * SIGMA * A * (T ** 4 - (Ts ?? 0) ** 4), cx = bx0 + 0.4 * bw, cy = by0 + 0.5 * bh, R = 0.17 * bh;
    props.push({id: 'body', type: 'circle', x: cx, y: cy, r: R, style: {fill: 'bad', opacity: 0.75, stroke: 'ink', width: 3 * k}, layer: 3} as Prop);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, r0 = R + 16 * k, len = 0.2 * bh, pts: P2[] = Array.from({length: 25}, (_, j) => { const f = j / 24, d = r0 + f * len, off = 9 * k * Math.sin(f * 4 * 2 * Math.PI); return [cx + d * Math.cos(a) - off * Math.sin(a), cy + d * Math.sin(a) + off * Math.cos(a)]; });
      props.push(curve(`w${i}`, pts, 'accent', k, 0.6 + 0.05 * i, 1.8 + 0.05 * i));
    }
    label('lbody', cx, cy + 9 * k, ill ? 'T' : `${num(T)} K`, {align: 'middle'});
    if (Ts !== undefined) label('lroom', bx0 + 0.02 * bw, by0 + 0.08 * bh, ill ? 'surroundings Ts' : `surroundings ${num(Ts)} K`, {style: {fill: 'cool'}, show: [2, 1e9]});
    Object.assign(anchors, {body: [cx, cy], surface: [cx + R, cy], waves: [cx + R + 0.14 * bh, cy]});
    line('l1', 'Radiation needs no medium: electromagnetic waves carry the energy', 0.3, {weight: 700});
    line('l2', Ts !== undefined ? 'Net loss: H = e σ A (T⁴ − Ts⁴)' : 'H = A e σ T⁴ (Stefan-Boltzmann)', 1.4, {style: {fill: 'cool'}});
    line('l3', 'e = 1 for a perfect radiator; σ = 5.67 × 10⁻⁸ W m⁻² K⁻⁴', 2.2, {style: {fill: 'muted'}});
    if (!ill) { line('l4', `H = ${num(H)} W`, 3, {weight: 700, style: {fill: 'accent'}}); facts.push(`H = ${num(H)} W (T = ${num(T)} K${Ts !== undefined ? `, Ts = ${num(Ts)} K` : ''}, A = ${num(A)} m², e = ${num(e)})`); }
    return end('heat_transfer', 4, {H});
  }
  if (s.kind === 'wien') {
    const given = s.lambda, temps = s.temps ?? (s.T ? [s.T] : given ? [WIEN / given] : [1000, 1500, 2000]), hot = Math.max(...temps), peak = WIEN / hot, x0 = bx0 + 0.1 * bw, x1 = bx0 + 0.96 * bw, y0 = by0 + 0.06 * bh, y1 = by1 - 0.14 * bh;
    const at = axes(c, x0, y0, x1, y1, 'wavelength', 'energy emitted'), span = 5 * WIEN / Math.min(...temps);
    // Planck's shape, in units where the hottest peak is 1; the height grows as T⁵
    const B = (lam: number, T: number) => { const x = 1.4388e-2 / (lam * T); return x > 500 ? 0 : (1 / lam ** 5) / (Math.exp(x) - 1); }, top = B(peak, hot);
    temps.slice().sort((a, b) => a - b).forEach((T, i) => {
      props.push(curve(`c${i}`, Array.from({length: 80}, (_, j) => { const lam = span * (j + 0.5) / 80; return at(lam / span, B(lam, T) / top * 0.92); }), ['cool', 'good', 'accent', 'bad'][i + 4 - temps.length], k, 0.4 + 0.5 * i, 1.8 + 0.5 * i));
      const lm = WIEN / T, p = at(lm / span, B(lm, T) / top * 0.92);
      dot(`pk${i}`, p[0], p[1], 'ink', {show: [1.8 + 0.5 * i, 1e9]});
      if (!ill) label(`lp${i}`, p[0] + 14 * k, p[1] - 14 * k, `${num(T)} K, ${num(lm * 1e6)} µm`, {show: [1.8 + 0.5 * i, 1e9]});
      else label(`lp${i}`, p[0] + 14 * k, p[1] - 14 * k, T === hot ? 'hotter' : T === Math.min(...temps) ? 'cooler' : '', {show: [1.8 + 0.5 * i, 1e9]});
      if (T === hot) anchors.peak = p;
    });
    anchors.cool_peak = at((WIEN / Math.min(...temps)) / span, B(WIEN / Math.min(...temps), Math.min(...temps)) / top * 0.92);
    line('l1', 'Hotter bodies emit more, and peak at a shorter wavelength', 0.3, {weight: 700});
    line('l2', "λm T = 2.9 × 10⁻³ m K (Wien's law)", 1.4, {style: {fill: 'accent'}});
    line('l3', 'So heated iron goes from dull red to yellow to white', 2.6, {style: {fill: 'muted'}});
    if (!ill && given) { const name = s.body ?? 'the body', Tg = s.T ?? WIEN / given; line('l4', `${name}: λm = ${num(given * 1e6)} µm gives T ≈ ${num(Tg)} K`, 3, {weight: 700}); facts.push(`${name}: λm = ${num(given * 1e6)} µm, T ≈ ${num(Tg)} K`); }
    facts.push(...temps.map(T => `at ${num(T)} K the peak is at ${num(WIEN / T * 1e6)} µm`), 'curve heights are computed from Planck\'s formula, the hottest scaled to the frame');
    return end('heat_transfer', 4.6, {peaks: temps.map(T => WIEN / T)});
  }
  // cooling: Newton's law, the rate proportional to the excess over the room
  const Ts = s.Ts ?? 20, from = s.from ?? 90, to = s.to ?? 80, minutes = s.minutes ?? 2, K = (from - to) / minutes / ((from + to) / 2 - Ts);
  const sol = s.then_from !== undefined && s.then_to !== undefined ? (s.then_from - s.then_to) / (K * ((s.then_from + s.then_to) / 2 - Ts)) : undefined;
  const tEnd = Math.max(4 / K * 0.6, (sol ?? 0) * 3), Tof = (t: number) => Ts + (from - Ts) * Math.exp(-K * t), tOf = (T: number) => -Math.log((T - Ts) / (from - Ts)) / K;
  const x0 = bx0 + 0.12 * bw, x1 = bx0 + 0.96 * bw, y0 = by0 + 0.06 * bh, y1 = by1 - 0.14 * bh, at = axes(c, x0, y0, x1, y1, 'time', 'temperature'), P = (t: number): P2 => at(t / tEnd, (Tof(t) - Ts * 0.6) / (from * 1.05 - Ts * 0.6));
  props.push(curve('cool', Array.from({length: 60}, (_, i) => P(tEnd * i / 59)), 'cool', k, 0.3, 2.4));
  const room = at(0, (Ts - Ts * 0.6) / (from * 1.05 - Ts * 0.6));
  seg('room', x0, room[1], x1, room[1], {stroke: 'muted', width: 2 * k, dash: [8 * k, 8 * k]}); label('lroom', x1, room[1] - 12 * k, ill ? 'room' : `room ${n2(Ts, 0)} °C`, {align: 'end', style: {fill: 'muted'}});
  const span = (id: string, a: number, b: number, col: string, when: number) => {
    const t1 = tOf(a), t2 = tOf(b), p = P(t1), q = P(t2);
    props.push(curve(`s${id}`, [p, [q[0], p[1]], q], col, k, when, when + 0.6));
    dot(`d${id}`, p[0], p[1], col, {show: [when, 1e9]});
    return q;
  };
  anchors.start = P(0); anchors.late = P(tEnd * 0.7); anchors.room = [x1, room[1]];
  anchors.first = span('1', from, to, 'bad', 2.4);
  if (sol !== undefined) anchors.second = span('2', s.then_from!, s.then_to!, 'accent', 3.2);
  line('l1', "Newton's law of cooling: the rate of loss is proportional to the excess over the room", 0.3, {weight: 700});
  line('l2', '−dQ/dt = k (T₂ − T₁): hotter, faster; the curve flattens toward the room', 1.4, {style: {fill: 'cool'}});
  if (!ill && s.from !== undefined) {
    line('l3', `${n2(from, 0)} → ${n2(to, 0)} °C in ${num(minutes)} min: K = ${num(K)} per min`, 2.4, {style: {fill: 'bad'}});
    facts.push(`K = (ΔT/t) / (Tavg − Ts) = ${num(K)} per minute, from ${n2(from, 0)} to ${n2(to, 0)} °C in ${num(minutes)} min, room ${n2(Ts, 0)} °C`);
    if (sol !== undefined) { const secs = Math.round(sol * 60); line('l4', `${n2(s.then_from!, 0)} → ${n2(s.then_to!, 0)} °C takes ${num(sol)} min = ${n2(secs, 0)} s`, 3.2, {weight: 700, style: {fill: 'accent'}}); facts.push(`from ${n2(s.then_from!, 0)} to ${n2(s.then_to!, 0)} °C takes ${n2(secs, 0)} s`); }
  }
  return end('heat_transfer', 4.4, {K, time: sol});
}
