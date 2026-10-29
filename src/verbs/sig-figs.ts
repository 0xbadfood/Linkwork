// sig_figs: significant figures (Class 11 Units and Measurement C3–C4; Class 11 Chemistry Some Basic Concepts,
// 2026-10-29). A measured number's digits are marked significant or not by the book's rules (non-zero digits; zeros
// between them; zeros after a decimal point at the end; not the zeros that only place the point, and not the
// trailing zeros of a number with no decimal point); a product or quotient keeps the fewest significant figures of
// its numbers, a sum or difference the fewest decimal places; a number is rounded off with the book's rule for a
// dropped 5 (the digit before it stays if even, rises if odd). Numbers are written as strings, so their zeros keep.
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {round, type Vec} from '../vec.ts';

type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};
export type SigFigsSpec = Common & {
  verb: 'sig_figs';
  /** count: each number's significant digits marked; multiply, divide, add, subtract: two numbers and the result to
   * its proper figures; round: one number rounded to `figures`. */
  mode: 'count' | 'multiply' | 'divide' | 'add' | 'subtract' | 'round';
  /** The numbers as written, in quotes so zeros keep: ['4.700', '0.0025'] (count: 1 to 4; operations: 2 to 3; round: 1). */
  numbers: string[];
  /** Units written after each number (count: one per number or one for all), and after the result. */
  units?: string[];
  unit?: string;
  /** round: the significant figures to keep. */
  figures?: number;
  panel?: boolean;
  seconds?: number;
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const NUMBER = /^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i;

/** Each character's role: a significant digit, a zero that only places the point (leading), a trailing zero of a
 * whole number (not significant), the point, or the sign. */
export type Role = 'sig' | 'leading' | 'trailing' | 'point' | 'sign' | 'exp';
export function roles(s: string): Role[] {
  const [mant] = s.toLowerCase().split('e'), out: Role[] = [...s].map(() => 'exp' as Role);
  const chars = [...mant], digits = chars.map((c, i) => /\d/.test(c) ? i : -1).filter(i => i >= 0);
  const first = digits.find(i => chars[i] !== '0'), last = [...digits].reverse().find(i => chars[i] !== '0'), point = chars.includes('.');
  chars.forEach((c, i) => {
    if (c === '-') out[i] = 'sign';
    else if (c === '.') out[i] = 'point';
    else if (first === undefined) out[i] = point && i > chars.indexOf('.') ? 'sig' : 'leading';   // 0.00 → its zeros after the point
    else if (i < first) out[i] = 'leading';
    else if (i > last! && !point) out[i] = 'trailing';
    else out[i] = 'sig';
  });
  return out;
}
export const sigCount = (s: string) => roles(s).filter(r => r === 'sig').length;
export const decimals = (s: string) => { const m = s.toLowerCase().split('e')[0]; return m.includes('.') ? m.length - m.indexOf('.') - 1 : 0; };

/** Round a numeric string to n significant figures, a dropped 5 (nothing after it) by the book's even rule. */
export function roundSig(s: string, n: number): string {
  const x = Number(s);
  if (!x) return (0).toFixed(Math.max(0, n - 1));
  const e = Math.floor(Math.log10(Math.abs(x))), places = n - 1 - e;
  return roundPlaces(s, places);
}
/** Round to a number of decimal places (negative: tens, hundreds), the even rule for an exact 5. */
export function roundPlaces(s: string, places: number): string {
  const x = Number(s), scaled = x * 10 ** places, lo = Math.floor(scaled), frac = scaled - lo;
  const exactHalf = Math.abs(frac - 0.5) < 1e-9 && halfIsExact(s, places);
  const r = exactHalf ? (lo % 2 === 0 ? lo : lo + 1) : Math.round(scaled);
  const v = r / 10 ** places;
  return places > 0 ? v.toFixed(places) : String(Math.round(v));
}
/** Is the dropped part exactly 5 (no other digits after it) in the written number? */
function halfIsExact(s: string, places: number): boolean {
  const m = s.replace('-', ''), point = m.includes('.') ? m.indexOf('.') : m.length, digits = m.replace('.', '');
  const cut = point + places;                                     // index in digits of the first dropped digit
  return digits[cut] === '5' && /^0*$/.test(digits.slice(cut + 1));
}

export function sigFigsErrors(s: SigFigsSpec): string[] {
  const e: string[] = [];
  const modes = ['count', 'multiply', 'divide', 'add', 'subtract', 'round'];
  if (!modes.includes(s.mode)) return [`sig_figs: mode is ${modes.join(', ')}`];
  const [lo, hi] = s.mode === 'count' ? [1, 4] : s.mode === 'round' ? [1, 1] : [2, 3];
  if (!Array.isArray(s.numbers) || s.numbers.length < lo || s.numbers.length > hi) return [`sig_figs: numbers is a list of ${lo === hi ? lo : `${lo} to ${hi}`} number${hi > 1 ? 's' : ''} written as strings ('4.700')`];
  s.numbers.forEach((n, j) => {
    if (typeof n !== 'string') e.push(`sig_figs: numbers[${j}] is a string, so its zeros keep: '${n}' in quotes`);
    else if (!NUMBER.test(n.trim()) || n.length > 12) e.push(`sig_figs: numbers[${j}] '${n}' is a plain number up to 12 characters (4.700, 0.0025, 2.64e24)`);
  });
  if ((s.mode === 'divide') && s.numbers.slice(1).some(n => !Number(n))) e.push('sig_figs: cannot divide by zero');
  if (s.mode === 'round' && !(Number.isInteger(s.figures) && s.figures! >= 1 && s.figures! < sigCount(String(s.numbers[0]))))
    e.push(`sig_figs: figures is how many significant figures to keep, 1 to ${Math.max(1, sigCount(String(s.numbers?.[0] ?? '')) - 1)} (fewer than the number has)`);
  if (s.units !== undefined && (!Array.isArray(s.units) || s.units.length !== s.numbers.length || s.units.some(u => typeof u !== 'string' || u.length > 10))) e.push('sig_figs: units is one short unit per number (up to 10 letters each)');
  if (s.unit !== undefined && (typeof s.unit !== 'string' || s.unit.length > 12)) e.push('sig_figs: unit is a short unit for the result (up to 12 letters)');
  if (s.panel !== undefined && typeof s.panel !== 'boolean') e.push('sig_figs: panel is true or false');
  if (s.seconds !== undefined && !(isNum(s.seconds) && s.seconds >= 4 && s.seconds <= 20)) e.push('sig_figs: seconds is 4 to 20');
  return e;
}

/** The result of an operation and how it is cut: by significant figures (× ÷) or decimal places (+ −). */
export function operate(mode: SigFigsSpec['mode'], numbers: string[]) {
  const xs = numbers.map(Number);
  const raw = mode === 'multiply' ? xs.reduce((a, b) => a * b) : mode === 'divide' ? xs.reduce((a, b) => a / b)
    : mode === 'add' ? xs.reduce((a, b) => a + b) : xs.reduce((a, b) => a - b);
  const bySig = mode === 'multiply' || mode === 'divide';
  const limits = numbers.map(n => bySig ? sigCount(n) : decimals(n)), least = Math.min(...limits), which = limits.indexOf(least);
  const rawText = bySig ? String(round(raw, 6)) : raw.toFixed(Math.max(...numbers.map(decimals)));
  const result = bySig ? roundSig(String(raw), least) : roundPlaces(raw.toFixed(12), least);
  return {raw, rawText, result, least, which, bySig};
}

export function sigFigsScene(s: SigFigsSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, panel = s.panel !== false;
  const left = 0.05 * W, right = panel ? 0.62 * W : 0.95 * W, top = (panel ? 0.2 : s.title ? 0.27 : 0.2) * H;
  const T = s.seconds ?? 10, props: Prop[] = [], facts: string[] = [], anchors: Record<string, Vec> = {}, lines: string[] = [];
  const size = 64 * k, adv = 0.6 * size;                        // monospace: every character one advance wide
  const plain = (id: string, value: string, x: number, y: number, t: number, fill = 'ink', sz = 34, align: 'start' | 'middle' | 'end' = 'start', weight = 600) =>
    props.push({id, type: 'text', x: round(x, 2), y: round(y, 2), text: value, size: sz * k, align, weight, show: [t, 1e9], fade: 0.35, style: {fill}, layer: 6});
  const COLOR: Record<Role, string> = {sig: 'accent', leading: 'muted', trailing: 'muted', point: 'ink', sign: 'ink', exp: 'ink'};
  /** A number digit by digit; `mark` colours significant digits (after `t2`) and underlines them. */
  const digits = (id: string, n: string, x: number, y: number, t: number, mark: number | null, unit = '') => {
    const rs = roles(n);
    [...n].forEach((c, i) => {
      const cx = round(x + adv * (i + 0.5), 2), base = {id: `${id}-d${i}`, type: 'text' as const, x: cx, y: round(y, 2), text: c, size, align: 'middle' as const, weight: 700, font: 'mono' as const, show: [t, 1e9] as [number, number], fade: 0.3, layer: 6};
      if (mark === null) props.push({...base, style: {fill: 'ink'}});
      else props.push({...base, show: [t, mark + 0.3], style: {fill: 'ink'}}, {...base, id: `${id}-c${i}`, show: [mark, 1e9], style: {fill: COLOR[rs[i]]}});
      if (mark !== null && rs[i] === 'sig') props.push({id: `${id}-u${i}`, type: 'line', x1: round(cx - 0.4 * adv, 2), y1: round(y + 0.55 * size, 2), x2: round(cx + 0.4 * adv, 2), y2: round(y + 0.55 * size, 2), show: [mark + 0.4, 1e9], fade: 0.3, style: {stroke: 'accent', width: 4 * k}, layer: 6});
    });
    if (unit) plain(`${id}-unit`, unit, x + adv * n.length + 16 * k, y, t, 'muted', 40, 'start', 500);
    return x + adv * n.length;
  };
  const rowH = 130 * k, ns = s.numbers.map(n => n.trim());
  if (s.mode === 'count') {
    const y0 = top + Math.max(0, (0.78 * H - top - rowH * ns.length) / 2), step = Math.max(1.2, (T - 2) / ns.length);
    ns.forEach((n, j) => {
      const y = y0 + rowH * j, t = 0.4 + step * j, c = sigCount(n), rs = roles(n);
      digits(`n${j}`, n, left, y, t, t + 0.7, s.units?.[j] ?? s.unit ?? '');
      const why = rs.includes('trailing') ? 'trailing zeros, no decimal point: not significant' : rs.includes('leading') ? 'leading zeros only place the point' : n.includes('.') && /0$/.test(n.split(/e/i)[0]) ? 'zeros after the point at the end count' : /[1-9]0+[1-9]/.test(n) ? 'zeros between digits count' : 'every non-zero digit counts';
      plain(`n${j}-count`, `${c} significant`, right, y - 12 * k, t + 1.1, 'accent', 34, 'end', 700);
      plain(`n${j}-why`, why, right, y + 26 * k, t + 1.1, 'muted', 24, 'end', 400);
      anchors[`n${j}`] = [left, round(y, 2)];
      facts.push(`${n} has ${c} significant figure${c === 1 ? '' : 's'}${why ? ` (${why})` : ''}`);
    });
    lines.push('Significant figures', 'All non-zero digits count, and zeros between them', 'Zeros that only place the decimal point do not', 'Trailing zeros count only after a decimal point');
  } else if (s.mode === 'round') {
    const n = ns[0], f = s.figures!, out = roundSig(n, f), y = top + 0.18 * H;
    digits('n0', n, left, y, 0.4, 0.9, s.unit ?? '');
    plain('keep', `keep ${f} significant figure${f === 1 ? '' : 's'}`, left, y + rowH * 0.8, 2.2, 'muted', 30, 'start', 500);
    digits('out', out, left, y + rowH * 1.7, 3.4, 3.8, s.unit ?? '');
    anchors.result = [left, round(y + rowH * 1.7, 2)];
    lines.push(`Rounding ${n} to ${f} figure${f === 1 ? '' : 's'}`, 'Dropped digit above 5: raise the last kept digit; below 5: leave it', 'Exactly 5: leave an even digit, raise an odd one');
    facts.push(`${n} rounded to ${f} significant figure${f === 1 ? '' : 's'} is ${out}`);
  } else {
    const {rawText, result, least, which, bySig} = operate(s.mode, ns), op = {multiply: '×', divide: '÷', add: '+', subtract: '−'}[s.mode as 'add'];
    const y0 = top + 0.06 * H, step = 0.9, rule = bySig ? 'significant figures' : 'decimal places';
    ns.forEach((n, j) => {
      const y = y0 + rowH * 0.9 * j, t = 0.4 + step * j, end = digits(`n${j}`, n, left + 60 * k, y, t, 2.6, s.units?.[j] ?? '');
      if (j) plain(`op${j}`, op, left, y, t, 'ink', 56, 'start', 700);
      const c = bySig ? sigCount(n) : decimals(n);
      plain(`n${j}-count`, `${c} ${bySig ? 'sig. fig.' : `decimal place${c === 1 ? '' : 's'}`}`, right, y, 2.8, j === which ? 'bad' : 'muted', 28, 'end', j === which ? 700 : 400);
      void end;
    });
    const yr = y0 + rowH * 0.9 * ns.length + 20 * k;
    props.push({id: 'bar', type: 'line', x1: round(left, 2), y1: round(yr - 0.5 * rowH, 2), x2: round(right, 2), y2: round(yr - 0.5 * rowH, 2), show: [0.4 + step * ns.length, 1e9], fade: 0.3, style: {stroke: 'faint', width: 2 * k}, layer: 5});
    plain('raw-label', 'calculator', left, yr - 0.15 * rowH, 0.4 + step * ns.length, 'muted', 24, 'start', 400);
    digits('raw', rawText, left + 60 * k, yr + 0.2 * rowH, 0.4 + step * ns.length, null);
    plain('result-label', `keep ${least} ${least === 1 ? rule.replace(/s$/, '') : rule}`, left, yr + 0.85 * rowH, 4.2, 'accent', 26, 'start', 600);
    digits('result', result, left + 60 * k, yr + 1.25 * rowH, 4.6, 5.0, s.unit ?? '');
    anchors.result = [left, round(yr + 1.25 * rowH, 2)];
    lines.push(bySig ? 'Multiplying or dividing' : 'Adding or subtracting', bySig ? 'Keep as many significant figures as the number with the fewest' : 'Keep as many decimal places as the number with the fewest', `${ns[which]} has the fewest: ${least} ${rule}`, 'The result cannot be more precise than the least precise measurement');
    facts.push(`${ns.join(` ${op} `)} = ${rawText} by arithmetic; to ${least} ${rule} (the fewest, in ${ns[which]}) it is ${result}${s.unit ? ` ${s.unit}` : ''}`);
  }
  if (panel) {
    const px = 0.66 * W, pw = W - px - 40 * k;
    let row = 0.14 * H;
    if (s.title) { props.push({id: 'title', type: 'text', x: px, y: row, text: s.title, size: 44 * k, weight: 700, width: pw}); row += wrapText(s.title, 44 * k, pw).length * 1.25 * 44 * k + 18 * k; }
    lines.forEach((value, j) => { props.push({id: `say${j}`, type: 'text', x: px, y: row, text: value, size: 30 * k, width: pw, weight: j ? 400 : 700, show: [0.6 + 1.2 * j, 1e9], fade: 0.3}); row += wrapText(value, 30 * k, pw).length * 1.3 * 30 * k + 12 * k; });
  } else if (s.title) props.push({id: 'title', type: 'text', x: left, y: 0.16 * H, text: s.title, size: 44 * k, weight: 700, width: 0.9 * W});
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: T, theme: s.theme ?? 'dark', props, actors: [], meta: {verb: 'sig_figs', facts, anchors}};
}
