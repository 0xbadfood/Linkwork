// dimensions: dimensional formulas and dimensional analysis (Class 11 Units and Measurement, 2026-10-29). Every
// quantity is a product of powers of the base quantities [M], [L], [T] (and [A], [K]); a formula's dimensions are
// added up power by power, an equation is checked term by term (only terms of the same dimensions may be added or
// equated), a relation is deduced by matching powers (a pendulum's period from its length, its bob's mass and g:
// T = k √(l/g), the constant k unknown), and a value is converted between unit systems by n₂ = n₁ (M₁/M₂)ᵃ (L₁/L₂)ᵇ
// (T₁/T₂)ᶜ. All of it is computed from the quantities' dimensions, never typed in.
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {round, type Vec} from '../vec.ts';

type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};
/** A factor: a quantity's name and its power (['velocity', 2] is v²). */
export type Factor = [string, number];
export type Term = {label: string; factors: Factor[]};
export type DimensionsSpec = Common & {
  verb: 'dimensions';
  /** formula: a quantity's dimensions from its factors; check: an equation term by term; deduce: a relation from the
   * quantities it depends on; convert: a value from one system of units to another. */
  mode: 'formula' | 'check' | 'deduce' | 'convert';
  /** formula, deduce, convert: the quantity (a name from the list). */
  quantity?: string;
  /** formula: what it is a product of, e.g. force: [['mass', 1], ['acceleration', 1]]. */
  factors?: Factor[];
  /** check: the left side and the terms of the right side. */
  left?: Term;
  right?: Term[];
  /** deduce: the 1 to 3 quantities the quantity depends on, e.g. ['length', 'mass', 'g']. */
  depends?: string[];
  /** deduce: the symbols written for them in the relation (default: their usual symbols). */
  symbols?: string[];
  /** convert: the value and the units of mass, length and time it is given in and wanted in. */
  value?: number;
  from?: Partial<Record<'M' | 'L' | 'T', string>>;
  to?: Partial<Record<'M' | 'L' | 'T', string>>;
  panel?: boolean;
  seconds?: number;
};

type Dims = [number, number, number, number, number];   // M L T A K
const BASE = ['M', 'L', 'T', 'A', 'K'] as const;
/** The quantities a spec may name, with their dimensions and usual symbols. */
export const QUANTITIES: Record<string, {dims: Dims; symbol: string}> = {
  length: {dims: [0, 1, 0, 0, 0], symbol: 'l'}, distance: {dims: [0, 1, 0, 0, 0], symbol: 'x'}, displacement: {dims: [0, 1, 0, 0, 0], symbol: 'x'},
  height: {dims: [0, 1, 0, 0, 0], symbol: 'h'}, radius: {dims: [0, 1, 0, 0, 0], symbol: 'r'}, wavelength: {dims: [0, 1, 0, 0, 0], symbol: 'λ'},
  mass: {dims: [1, 0, 0, 0, 0], symbol: 'm'}, time: {dims: [0, 0, 1, 0, 0], symbol: 't'}, period: {dims: [0, 0, 1, 0, 0], symbol: 'T'},
  area: {dims: [0, 2, 0, 0, 0], symbol: 'A'}, volume: {dims: [0, 3, 0, 0, 0], symbol: 'V'},
  velocity: {dims: [0, 1, -1, 0, 0], symbol: 'v'}, speed: {dims: [0, 1, -1, 0, 0], symbol: 'v'},
  acceleration: {dims: [0, 1, -2, 0, 0], symbol: 'a'}, g: {dims: [0, 1, -2, 0, 0], symbol: 'g'},
  force: {dims: [1, 1, -2, 0, 0], symbol: 'F'}, weight: {dims: [1, 1, -2, 0, 0], symbol: 'W'},
  momentum: {dims: [1, 1, -1, 0, 0], symbol: 'p'}, impulse: {dims: [1, 1, -1, 0, 0], symbol: 'J'},
  energy: {dims: [1, 2, -2, 0, 0], symbol: 'E'}, work: {dims: [1, 2, -2, 0, 0], symbol: 'W'}, 'kinetic energy': {dims: [1, 2, -2, 0, 0], symbol: 'K'},
  'potential energy': {dims: [1, 2, -2, 0, 0], symbol: 'U'}, heat: {dims: [1, 2, -2, 0, 0], symbol: 'Q'}, torque: {dims: [1, 2, -2, 0, 0], symbol: 'τ'},
  power: {dims: [1, 2, -3, 0, 0], symbol: 'P'}, pressure: {dims: [1, -1, -2, 0, 0], symbol: 'p'}, stress: {dims: [1, -1, -2, 0, 0], symbol: 'σ'},
  density: {dims: [1, -3, 0, 0, 0], symbol: 'ρ'}, frequency: {dims: [0, 0, -1, 0, 0], symbol: 'ν'}, 'angular velocity': {dims: [0, 0, -1, 0, 0], symbol: 'ω'},
  angle: {dims: [0, 0, 0, 0, 0], symbol: 'θ'}, strain: {dims: [0, 0, 0, 0, 0], symbol: 'ε'}, 'refractive index': {dims: [0, 0, 0, 0, 0], symbol: 'n'},
  'surface tension': {dims: [1, 0, -2, 0, 0], symbol: 'S'}, 'spring constant': {dims: [1, 0, -2, 0, 0], symbol: 'k'},
  G: {dims: [-1, 3, -2, 0, 0], symbol: 'G'}, 'speed of light': {dims: [0, 1, -1, 0, 0], symbol: 'c'},
  current: {dims: [0, 0, 0, 1, 0], symbol: 'I'}, charge: {dims: [0, 0, 1, 1, 0], symbol: 'q'}, temperature: {dims: [0, 0, 0, 0, 1], symbol: 'T'},
};
/** Units of mass, length and time, in kg, m and s. */
export const UNITS: Record<'M' | 'L' | 'T', Record<string, number>> = {
  M: {kg: 1, g: 1e-3, mg: 1e-6, tonne: 1e3},
  L: {m: 1, cm: 1e-2, mm: 1e-3, km: 1e3},
  T: {s: 1, min: 60, h: 3600, day: 86400},
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const SUP: Record<string, string> = {'0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '/': 'ᐟ'};
/** An exponent as a superscript: 2 → ², −1/2 → ⁻¹ᐟ². */
export const sup = (p: number) => [...frac(p)].map(c => SUP[c] ?? c).join('');
/** A power as the book writes it: an integer, or a half (−1/2). */
const frac = (p: number) => Number.isInteger(p) ? String(p) : Number.isInteger(2 * p) ? `${2 * p}/2` : String(round(p, 3));
/** [M L² T⁻²]; [M⁰ L⁰ T⁰] for a dimensionless quantity. */
export function dimText(d: Dims): string {
  const parts = BASE.map((b, i) => d[i] ? `${b}${d[i] === 1 ? '' : sup(d[i])}` : '').filter(Boolean);
  return parts.length ? `[${parts.join(' ')}]` : '[M⁰ L⁰ T⁰]';
}
const of = (name: string) => QUANTITIES[name]?.dims;
export function product(factors: Factor[]): Dims {
  const d: Dims = [0, 0, 0, 0, 0];
  for (const [name, p] of factors) of(name).forEach((v, i) => { d[i] += v * p; });
  return d.map(v => round(v, 9) + 0) as Dims;
}
const same = (a: Dims, b: Dims) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);

/** Powers x, y, z with [quantity] = Π [depends_i]^x_i, matched base by base; null when they do not fix one answer. */
export function deduce(quantity: string, depends: string[]): number[] | null {
  const rows = BASE.map((_, i) => [...depends.map(n => of(n)[i]), of(quantity)[i]]).filter(r => r.some(v => v));
  const n = depends.length, m = rows.map(r => [...r]);
  let r = 0;
  const pivots: number[] = [];
  for (let c = 0; c < n && r < m.length; c++) {
    const p = m.findIndex((row, i) => i >= r && Math.abs(row[c]) > 1e-12);
    if (p < 0) return null;
    [m[r], m[p]] = [m[p], m[r]];
    const lead = m[r][c];
    m[r] = m[r].map(v => v / lead);
    m.forEach((row, i) => { if (i !== r) { const f = row[c]; m[i] = row.map((v, j) => v - f * m[r][j]); } });
    pivots.push(c); r++;
  }
  if (pivots.length < n) return null;
  if (m.slice(r).some(row => Math.abs(row[n]) > 1e-9)) return null;      // no powers fit: it depends on something else
  return m.slice(0, n).map(row => round(row[n], 9) + 0);
}

/** The factor converting a value from one system's units to another's, base by base: [base, ratio, power]. */
export function convert(quantity: string, from: DimensionsSpec['from'] = {}, to: DimensionsSpec['to'] = {}) {
  const d = of(quantity), steps: {base: 'M' | 'L' | 'T'; u1: string; u2: string; p: number; f: number}[] = [];
  (['M', 'L', 'T'] as const).forEach((b, i) => {
    const p = d[i];
    if (!p) return;
    const u1 = from[b] ?? Object.keys(UNITS[b])[0], u2 = to[b] ?? Object.keys(UNITS[b])[0];
    steps.push({base: b, u1, u2, p, f: (UNITS[b][u1] / UNITS[b][u2]) ** p});
  });
  return {steps, factor: steps.reduce((x, s) => x * s.f, 1)};
}

const sci = (x: number) => {
  if (x === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(x)) + 1e-9), m = round(x / 10 ** e, 3);
  return e === 0 ? String(m) : m === 1 ? `10${sup(e)}` : `${m} × 10${sup(e)}`;
};

function factorErrors(fs: unknown, at: string): string[] {
  if (!Array.isArray(fs) || fs.length < 1 || fs.length > 5) return [`${at} is a list of 1 to 5 [quantity, power] pairs, e.g. [['mass', 1], ['velocity', 2]]`];
  const e: string[] = [];
  fs.forEach((f, j) => {
    if (!Array.isArray(f) || f.length !== 2 || typeof f[0] !== 'string' || !isNum(f[1])) e.push(`${at}[${j}] is [quantity, power], e.g. ['velocity', 2]`);
    else if (!QUANTITIES[f[0]]) e.push(`${at}[${j}]: '${f[0]}' is not a known quantity (${Object.keys(QUANTITIES).join(', ')})`);
    else if (f[1] === 0 || Math.abs(f[1]) > 4) e.push(`${at}[${j}]: the power is -4 to 4, not 0`);
  });
  return e;
}

export function dimensionsErrors(s: DimensionsSpec): string[] {
  const e: string[] = [];
  if (!['formula', 'check', 'deduce', 'convert'].includes(s.mode)) return ['dimensions: mode is formula, check, deduce or convert'];
  const needQ = s.mode !== 'check';
  if (needQ && !QUANTITIES[s.quantity as string]) e.push(`dimensions: quantity is one of ${Object.keys(QUANTITIES).join(', ')}`);
  if (s.mode === 'formula') e.push(...factorErrors(s.factors, 'dimensions: factors'));
  if (s.mode === 'formula' && !e.length && !same(product(s.factors!), of(s.quantity!)))
    e.push(`dimensions: ${s.quantity} is ${dimText(of(s.quantity!))} but its factors give ${dimText(product(s.factors!))}`);
  if (s.mode === 'check') {
    const terms = [s.left, ...(Array.isArray(s.right) ? s.right : [])];
    if (!s.left || !Array.isArray(s.right) || s.right.length < 1 || s.right.length > 4) e.push('dimensions: check takes left (a term) and right (1 to 4 terms), each {label, factors}');
    else terms.forEach((t, j) => {
      const at = j ? `dimensions: right[${j - 1}]` : 'dimensions: left';
      if (typeof t?.label !== 'string' || !t.label.trim() || t.label.length > 16) e.push(`${at}.label is the term as written, up to 16 letters (v₀t, ½at²)`);
      e.push(...factorErrors(t?.factors, `${at}.factors`));
    });
  }
  if (s.mode === 'deduce') {
    if (!Array.isArray(s.depends) || s.depends.length < 1 || s.depends.length > 3 || s.depends.some(n => !QUANTITIES[n])) e.push('dimensions: depends is 1 to 3 known quantities');
    else if (!e.length && !deduce(s.quantity!, s.depends)) e.push(`dimensions: ${s.quantity} cannot be built from ${s.depends.join(', ')} alone: no one set of powers matches its dimensions`);
    if (s.symbols !== undefined && (!Array.isArray(s.symbols) || s.symbols.length !== (s.depends?.length ?? 0) || s.symbols.some(x => typeof x !== 'string' || !x || x.length > 3))) e.push('dimensions: symbols is one short symbol (up to 3 letters) for each quantity in depends');
  }
  if (s.mode === 'convert') {
    if (!(isNum(s.value) && s.value > 0)) e.push('dimensions: value is the number to convert, above 0');
    for (const side of ['from', 'to'] as const) {
      const u = s[side];
      if (!u || typeof u !== 'object') { e.push(`dimensions: ${side} gives the units of mass, length and time: {M: 'kg', L: 'm', T: 's'}`); continue; }
      for (const [b, name] of Object.entries(u)) if (!(b in UNITS) || !(String(name) in UNITS[b as 'M'])) e.push(`dimensions: ${side}.${b} is one of ${b in UNITS ? Object.keys(UNITS[b as 'M']).join(', ') : 'M, L or T (keys)'}`);
    }
  }
  if (s.panel !== undefined && typeof s.panel !== 'boolean') e.push('dimensions: panel is true or false');
  if (s.seconds !== undefined && !(isNum(s.seconds) && s.seconds >= 4 && s.seconds <= 20)) e.push('dimensions: seconds is 4 to 20');
  return e;
}

export function dimensionsScene(s: DimensionsSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, panel = s.panel !== false;
  const left = 0.05 * W, right = panel ? 0.62 * W : 0.95 * W, top = (panel ? 0.2 : s.title ? 0.27 : 0.2) * H;
  const T = s.seconds ?? 10, props: Prop[] = [], facts: string[] = [], anchors: Record<string, Vec> = {}, lines: string[] = [];
  const text = (id: string, value: string, x: number, y: number, t: number, fill = 'ink', size = 38, align: 'start' | 'middle' | 'end' = 'start', weight = 700) =>
    props.push({id, type: 'text', x: round(x, 2), y: round(y, 2), text: value, size: size * k, align, weight, show: [t, 1e9], fade: 0.35, style: {fill}, layer: 6});
  const sym = (name: string) => QUANTITIES[name].symbol;
  const term = (fs: Factor[]) => fs.map(([n, p]) => `${sym(n)}${p === 1 ? '' : sup(p)}`).join(' ');
  const rows: {id: string; a: string; b: string; fill?: string}[] = [];
  let verdict: {text: string; fill: string} | null = null;
  if (s.mode === 'formula') {
    const q = s.quantity!, fs = s.factors!;
    rows.push(...fs.map(([n, p], j) => ({id: `f${j}`, a: `${n}${p === 1 ? '' : ` (power ${frac(p)})`}`, b: dimText(product([[n, p]]))})));
    verdict = {text: `${q} = ${fs.map(([n, p]) => p === 1 ? n : `${n}${sup(p)}`).join(' × ')}  →  ${dimText(of(q))}`, fill: 'accent'};
    lines.push(`Dimensions of ${q}`, 'Add the powers of M, L and T factor by factor', `${q}: ${dimText(of(q))}`);
    facts.push(`the dimensions of ${q} are ${dimText(of(q))}: its dimensional formula`, `${q} = ${fs.map(([n, p]) => p === 1 ? n : `${n}^${frac(p)}`).join(' × ')}`);
  } else if (s.mode === 'check') {
    const L = product(s.left!.factors);
    rows.push({id: 'left', a: `${s.left!.label}  (left side)`, b: dimText(L)});
    const bad: string[] = [];
    s.right!.forEach((t, j) => { const d = product(t.factors), ok = same(d, L); if (!ok) bad.push(t.label); rows.push({id: `r${j}`, a: t.label, b: `${dimText(d)}  ${ok ? '✓' : '✗'}`, fill: ok ? 'good' : 'bad'}); });
    verdict = bad.length ? {text: `Not consistent: ${bad.join(', ')} ${bad.length > 1 ? 'have' : 'has'} other dimensions`, fill: 'bad'} : {text: `Every term is ${dimText(L)}: dimensionally consistent`, fill: 'good'};
    lines.push('Checking an equation by its dimensions', 'Only terms of the same dimensions can be added or equated', bad.length ? 'A term with other dimensions: the equation is wrong' : 'Consistent; this does not prove it right (a missing ½ would not show)');
    facts.push(bad.length ? `the equation is dimensionally inconsistent: ${bad.join(', ')} ${bad.length > 1 ? 'do' : 'does'} not have the dimensions ${dimText(L)} of ${s.left!.label}, so it is wrong`
      : `every term has the dimensions ${dimText(L)}: the equation is dimensionally consistent (which does not by itself prove it correct; dimensionless factors such as ½ cannot be checked)`);
  } else if (s.mode === 'deduce') {
    const q = s.quantity!, ds = s.depends!, p = deduce(q, ds)!, letters = ['x', 'y', 'z'], syms = s.symbols ?? ds.map(sym);
    rows.push({id: 'guess', a: `${sym(q)} = k ${syms.map((x, j) => `${x}${'ˣʸᶻ'[j]}`).join(' ')}`, b: ''});
    BASE.forEach((b, i) => {
      const lhs = of(q)[i], cs = ds.map(n => of(n)[i]);
      if (!lhs && cs.every(c => !c)) return;
      const eq = cs.map((c, j) => c ? `${c === 1 ? '' : c === -1 ? '−' : String(c).replace('-', '−')}${letters[j]}` : '').filter(Boolean).join(' + ').replace(/\+ −/g, '− ');
      rows.push({id: `eq${b}`, a: `[${b}]:  ${eq || '0'} = ${String(lhs).replace('-', '−')}`, b: ''});
    });
    rows.push({id: 'solved', a: ds.map((_, j) => `${letters[j]} = ${frac(p[j]).replace('-', '−')}`).join(',  '), b: '', fill: 'accent'});
    const rel = `${sym(q)} = k ${ds.map((_, j) => p[j] ? `${syms[j]}${p[j] === 1 ? '' : sup(p[j])}` : '').filter(Boolean).join(' ')}`;
    const half = ds.length && p.every(v => v === 0 || Math.abs(v) === 0.5) && p.some(v => v === 0.5) && p.some(v => v === -0.5);
    const up = syms.filter((_, j) => p[j] === 0.5), down = syms.filter((_, j) => p[j] === -0.5);
    const root = half ? `${sym(q)} = k √(${up.join(' ')}/${down.join(' ')})` : '';
    verdict = {text: `${rel}${root ? `   i.e.  ${root}` : ''}`, fill: 'accent'};
    const none = ds.filter((_, j) => !p[j]);
    lines.push(`Deducing ${q} from its dimensions`, `Match the powers of M, L and T on both sides`, `${rel}${none.length ? `: it does not depend on ${none.join(', ')}` : ''}`, 'The constant k cannot be found this way');
    facts.push(`by dimensional analysis ${q} = k × ${ds.map((n, j) => `${n}^${frac(p[j])}`).join(' × ')}${root ? `, that is ${root}` : ''}`, ...none.map(n => `${q} does not depend on ${n}`),
      'dimensional analysis cannot give the dimensionless constant k (it is found by experiment or full theory)');
  } else {
    const q = s.quantity!, {steps, factor} = convert(q, s.from, s.to), v = s.value!, out = v * factor;
    rows.push({id: 'dims', a: `${q}`, b: dimText(of(q))});
    steps.forEach(st => rows.push({id: `u${st.base}`, a: `(${st.u1} / ${st.u2})${st.p === 1 ? '' : sup(st.p)}`, b: `= ${sci(st.f)}`}));
    const unit = (u: DimensionsSpec['from']) => steps.map(st => `${(u ?? {})[st.base] ?? Object.keys(UNITS[st.base])[0]}${st.p === 1 ? '' : sup(st.p)}`).join(' ');
    verdict = {text: `${sci(v)} ${unit(s.from)} = ${sci(out)} ${unit(s.to)}`, fill: 'accent'};
    lines.push(`Converting ${q} between units`, 'n₂ = n₁ (M₁/M₂)ᵃ (L₁/L₂)ᵇ (T₁/T₂)ᶜ, with a, b, c its dimensions', `${sci(v)} ${unit(s.from)} = ${sci(out)} ${unit(s.to)}`);
    facts.push(`${v} ${unit(s.from)} = ${out.toPrecision(4).replace(/\.?0+(e|$)/, '$1')} ${unit(s.to)} (${q}, dimensions ${dimText(of(q))})`);
  }
  // Rows appear one after another, then the result.
  const n = rows.length + 1, rowH = Math.min(100 * k, (0.86 * H - top) / n), step = Math.max(0.6, (T - 3) / n);
  const y0 = top + Math.max(0, (0.8 * H - top - rowH * n) / 2);     // the block sits in the middle of its room
  rows.forEach((r, j) => {
    const y = y0 + rowH * j, t = 0.5 + step * j;
    text(`${r.id}-a`, r.a, left, y, t, r.b ? 'ink' : r.fill ?? 'ink', 38);
    if (r.b) text(`${r.id}-b`, r.b, right, y, t + 0.4, r.fill ?? 'cool', 38, 'end');
    anchors[r.id] = [left, round(y, 2)];
  });
  if (verdict) {
    const y = y0 + rowH * rows.length + 20 * k;
    props.push({id: 'verdict-rule', type: 'line', x1: round(left, 2), y1: round(y - 0.55 * rowH, 2), x2: round(right, 2), y2: round(y - 0.55 * rowH, 2), show: [0.5 + step * rows.length, 1e9], fade: 0.3, style: {stroke: 'faint', width: 2 * k}, layer: 5});
    props.push({id: 'verdict', type: 'text', x: round(left, 2), y: round(y, 2), text: verdict.text, size: 40 * k, weight: 700, width: right - left, show: [0.5 + step * rows.length, 1e9], fade: 0.35, style: {fill: verdict.fill}, layer: 6});
    anchors.verdict = [left, round(y, 2)];
  }
  if (panel) {
    const px = 0.66 * W, pw = W - px - 40 * k;
    let row = 0.14 * H;
    if (s.title) { props.push({id: 'title', type: 'text', x: px, y: row, text: s.title, size: 44 * k, weight: 700, width: pw}); row += wrapText(s.title, 44 * k, pw).length * 1.25 * 44 * k + 18 * k; }
    lines.forEach((value, j) => { props.push({id: `say${j}`, type: 'text', x: px, y: row, text: value, size: 30 * k, width: pw, weight: j ? 400 : 700, show: [0.6 + 1.2 * j, 1e9], fade: 0.3}); row += wrapText(value, 30 * k, pw).length * 1.3 * 30 * k + 12 * k; });
  } else if (s.title) props.push({id: 'title', type: 'text', x: left, y: 0.16 * H, text: s.title, size: 44 * k, weight: 700, width: 0.9 * W});
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: T, theme: s.theme ?? 'dark', props, actors: [], meta: {verb: 'dimensions', facts, anchors}};
}
