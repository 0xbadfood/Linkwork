// ac: alternating current, computed (NCERT Class 12 Physics, Ch. 7; 2026-11-03).
//   waves       v and i traced from their rotating phasors, for R, L, C or a series LCR; `power` adds p = vi and its average
//   rms         i and i² over a cycle: the mean of i² is ½im², so I = im/√2
//   circuit     a source and elements in series; a lamp's glow follows the current; iron in the coil, a smaller C, or a dc source
//   phasors     series LCR: VR, VL, VC, their sum V, and the impedance triangle
//   reactance   XL and XC against ν, crossing at the resonant frequency
//   resonance   im against ω, one or two resistances; `sharp` marks the half-power width
//   power       I resolved along V and across it: P = VI cos φ; `correct` cancels the wattless part with a capacitor
//   energy      the energy in a coil or capacitor over a cycle: stored, then returned
//   add         two sinusoids of one frequency added as phasors
//   transformer a core with two windings: Vs/Vp = Ns/Np, Vs Is = Vp Ip
import {kit} from './potential.ts';
import {sci} from './electric.ts';
import type {Prop, Scene} from '../scene.ts';

type P2 = [number, number];
export const AC_SHOWS = ['waves', 'rms', 'circuit', 'phasors', 'reactance', 'resonance', 'power', 'energy', 'add', 'transformer'] as const;
const ELEMENTS = ['R', 'L', 'C', 'bulb'] as const;
export type AcSpec = {verb: 'ac'; show: (typeof AC_SHOWS)[number]; element?: 'R' | 'L' | 'C' | 'LCR'; elements?: (typeof ELEMENTS)[number][];
  V?: number; vm?: number; P?: number; nu?: number; R?: number; R2?: number; L?: number; C?: number; XL?: number; XC?: number; phi?: number;
  plot?: 'power'; quantity?: 'i' | 'v'; sharp?: boolean; correct?: boolean; dc?: boolean; iron?: boolean; reduce?: boolean; a1?: number; a2?: number; delta?: number;
  Np?: number; Ns?: number; Vp?: number; Ip?: number; full?: number; winding?: 'separate' | 'same'; losses?: boolean;
  title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};

const RAD = Math.PI / 180, TAU = 2 * Math.PI;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const sig = (x: number, unit: string, d = 3) => { const a = Math.abs(x); return a !== 0 && (a >= 1e5 || a < .01) ? sci(+x.toPrecision(d), unit) : `${+x.toPrecision(d)} ${unit}`; };

export const reactanceL = (L: number, nu: number) => TAU * nu * L;
export const reactanceC = (C: number, nu: number) => 1 / (TAU * nu * C);
/** Series circuit, by the book's convention i = im sin(ωt + φ), tan φ = (XC − XL)/R: φ below zero, the current lags. */
export const seriesOf = (R: number, XL: number, XC: number) => { const Z = Math.hypot(R, XL - XC); return {Z, phi: Math.atan2(XC - XL, R) / RAD, pf: R / Z}; };
export const resonantOmega = (L: number, C: number) => 1 / Math.sqrt(L * C);
export const peakCurrent = (vm: number, R: number, L: number, C: number, w: number) => vm / Math.hypot(R, w * L - 1 / (w * C));
export const transformerOf = (Vp: number, Np: number, Ns: number, Ip?: number) => ({Vs: Vp * Ns / Np, Is: Ip === undefined ? undefined : Ip * Np / Ns});
/** Two phasors at δ degrees: the size and phase of their sum. */
export const addPhasors = (a1: number, a2: number, delta: number) => { const x = a1 + a2 * Math.cos(delta * RAD), y = a2 * Math.sin(delta * RAD); return {a: Math.hypot(x, y), phase: Math.atan2(y, x) / RAD}; };

/** The element a phasors spec draws: R alone when it gives only R, L or C alone likewise; otherwise the series LCR. */
export function phasorElement(s: AcSpec): 'R' | 'L' | 'C' | 'LCR' {
  const R = s.R !== undefined, L = s.L !== undefined || s.XL !== undefined, C = s.C !== undefined || s.XC !== undefined;
  return R && !L && !C ? 'R' : L && !R && !C ? 'L' : C && !R && !L ? 'C' : 'LCR';
}

/** The curves a reactance spec draws: XL alone for element L or only L given, XC alone likewise; otherwise both. */
export function reactanceElement(s: AcSpec): 'L' | 'C' | 'LCR' {
  if (s.element === 'L' || s.element === 'C') return s.element;
  const L = s.L !== undefined, C = s.C !== undefined;
  return L && !C ? 'L' : C && !L ? 'C' : 'LCR';
}

export function acErrors(s: AcSpec): string[] {
  const e: string[] = [], W = 'ac';
  if (!AC_SHOWS.includes(s.show)) return [`${W}: show is one of ${AC_SHOWS.join(', ')}`];
  for (const n of ['V', 'vm', 'P', 'nu', 'R', 'R2', 'L', 'C', 'a1', 'a2', 'Np', 'Ns', 'Vp', 'Ip', 'full'] as const) if (s[n] !== undefined && !(isNum(s[n]) && (s[n] as number) > 0)) e.push(`${W}: ${n} is a number above 0`);
  for (const n of ['XL', 'XC'] as const) if (s[n] !== undefined && !(isNum(s[n]) && (s[n] as number) >= 0)) e.push(`${W}: ${n} is a number, 0 or above`);
  if (s.phi !== undefined && !(isNum(s.phi) && Math.abs(s.phi) <= 90)) e.push(`${W}: phi is −90 to 90 degrees`);
  if (s.delta !== undefined && !(isNum(s.delta) && Math.abs(s.delta) <= 180)) e.push(`${W}: delta is −180 to 180 degrees`);
  if (s.element !== undefined && !['R', 'L', 'C', 'LCR'].includes(s.element)) e.push(`${W}: element is R, L, C or LCR`);
  if (s.elements !== undefined && !(Array.isArray(s.elements) && s.elements.length > 0 && s.elements.length <= 4 && s.elements.every(x => ELEMENTS.includes(x)))) e.push(`${W}: elements is up to 4 of ${ELEMENTS.join(', ')}`);
  if (s.winding !== undefined && !['separate', 'same'].includes(s.winding)) e.push(`${W}: winding is separate or same`);
  if (s.quantity !== undefined && !['i', 'v'].includes(s.quantity)) e.push(`${W}: quantity is i or v`);
  // L and C in henry and farad with no frequency were read at 50 Hz: a 1 mH, 1 nF resonance phasor came out all VC
  // (leph1-07 C6, 2026-11-03). Which reactance wins depends on ν, so the spec says it, or gives XL and XC.
  if ((s.show === 'phasors' || s.show === 'waves') && s.L !== undefined && s.C !== undefined && s.nu === undefined && s.XL === undefined && s.XC === undefined)
    e.push(`${W}: with L and C give nu (Hz), or give XL and XC: at 50 Hz, XL = ${sig(reactanceL(s.L, 50), 'Ω')} and XC = ${sig(reactanceC(s.C, 50), 'Ω')}; resonance is at ${sig(resonantOmega(s.L, s.C) / TAU, 'Hz', 3)}`);
  if (s.show === 'reactance' && s.element === 'R') e.push(`${W}: reactance is for element L, C or LCR`);
  if (s.show === 'energy' && s.element !== undefined && !['L', 'C'].includes(s.element)) e.push(`${W}: energy is for element L or C`);
  if (s.iron && !(s.elements ?? []).includes('L')) e.push(`${W}: iron goes in a coil: elements needs L`);
  if (s.reduce && !(s.elements ?? []).includes('C')) e.push(`${W}: reduce makes the capacitor smaller: elements needs C`);
  return e;
}

export function ac(s: AcSpec): Scene {
  const {k, props, bx, by, bw, bh, cx, cy, S, arrow, line, poly, label, ring, keysOf, finish} = kit(s);
  const facts: string[] = [], anchors: Record<string, P2> = {}; let dur = 12, story = '', second = '', c = 0;
  const id = (p: string) => `ac${p}${c++}`, num = !s.illustrative;
  const rect = (x: number, y: number, w: number, h: number, fill: string, extra: Record<string, unknown> = {}, stroke = 'ink') => props.push({id: id('r'), type: 'rect', x, y, w, h, style: {fill, stroke, width: 2 * k}, layer: 2, ...extra} as Prop);
  const dot = (x: number, y: number, r: number, fill: string, extra: Record<string, unknown> = {}) => props.push({id: id('o'), type: 'circle', x, y, r: r * k, style: {fill, stroke: 'ink', width: 2 * k}, layer: 4, ...extra} as Prop);
  /** Axes for a curve in θ, 0 to `turns` cycles: traced as time runs, with a dot on it. */
  const axes = (x0: number, y0: number, w: number, h: number, turns: number, ticks = true) => {
    line([x0, y0], [x0 + w, y0], 'ink', 3); line([x0, y0 - h * 1.12], [x0, y0 + h * 1.12], 'ink', 3); label(x0 + w + 24 * k, y0 + 9 * k, 'ωt', 'muted', 24);
    if (ticks) for (let i = 1; i <= 2 * turns; i++) label(x0 + w * i / (2 * turns), y0 + 34 * k, i === 1 ? 'π' : `${i}π`, 'muted', 20);
  };
  const traced = (x0: number, y0: number, w: number, h: number, turns: number, fn: (th: number) => number, colour: string, end: number, start = 0, stroke = 4) => {
    const X = (th: number) => x0 + w * th / (turns * TAU), Y = (th: number) => y0 - h * fn(th), th = (t: number) => turns * TAU * Math.max(0, Math.min(1, (t - start) / (end - start)));
    props.push({id: id('p'), type: 'polyline', points: Array.from({length: 241}, (_, i) => { const a = turns * TAU * i / 240; return [X(a), Y(a)] as P2; }), style: {stroke: colour, width: stroke * k}, draw: 0, keys: {draw: [[start, 0], [end, 1, 'linear']]}, layer: 2} as Prop);
    props.push({id: id('d'), type: 'circle', x: X(0), y: Y(0), r: 9 * k, style: {fill: colour, stroke: 'ink', width: 2 * k}, layer: 4, keys: {x: keysOf(dur, t => X(th(t))), y: keysOf(dur, t => Y(th(t)))}} as Prop);
  };
  /** A phasor turning anticlockwise from `phase` degrees; its height is the instantaneous value. */
  const phasor = (c0: P2, r: number, phase: number, colour: string, name: string, th: (t: number) => number, keyId?: string) => {
    const tx = (t: number) => c0[0] + r * Math.cos(th(t) + phase * RAD), ty = (t: number) => c0[1] - r * Math.sin(th(t) + phase * RAD);
    props.push({id: keyId ?? id('f'), type: 'arrow', x1: c0[0], y1: c0[1], x2: tx(0), y2: ty(0), head: 16 * k, style: {stroke: colour, width: 6 * k}, layer: 4, keys: {x2: keysOf(dur, tx), y2: keysOf(dur, ty)}} as Prop);
    const lx = (t: number) => c0[0] + (r + 30 * k) * Math.cos(th(t) + phase * RAD), ly = (t: number) => c0[1] + 9 * k - (r + 30 * k) * Math.sin(th(t) + phase * RAD);
    label(lx(0), ly(0), name, colour, 30, {keys: {x: keysOf(dur, lx), y: keysOf(dur, ly)}});
  };
  const values = () => { const nu = s.nu ?? 50, R = s.R, XL = s.XL ?? (s.L !== undefined ? reactanceL(s.L, nu) : undefined), XC = s.XC ?? (s.C !== undefined ? reactanceC(s.C, nu) : undefined), vm = s.vm ?? (s.V ?? 220) * Math.SQRT2; return {nu, R, XL, XC, vm, V: vm / Math.SQRT2}; };

  if (s.show === 'waves') {
    const v = values(), el = s.element ?? (v.R !== undefined && (v.XL !== undefined || v.XC !== undefined) ? 'LCR' : v.XL !== undefined ? 'L' : v.XC !== undefined ? 'C' : 'R');
    const R = v.R ?? (el === 'LCR' ? 3 : 100), XL = v.XL ?? (el === 'LCR' ? 8 : 10), XC = v.XC ?? (el === 'LCR' ? 4 : 10);
    const st = el === 'R' ? seriesOf(R, 0, 0) : el === 'L' ? seriesOf(0, XL, 0) : el === 'C' ? seriesOf(0, 0, XC) : seriesOf(R, XL, XC), phi = st.phi, turns = 2, plotP = s.plot === 'power';
    const yW = plotP ? cy - bh * .2 : cy, r = S * (plotP ? .2 : .26), c0: P2 = [bx + bw * .22, yW], th = (t: number) => TAU * turns * Math.min(1, t / dur), gx = bx + bw * .48, gw = bw * .46, iL = r * .65;
    line([c0[0] - r * 1.15, c0[1]], [c0[0] + r * 1.15, c0[1]], 'faint', 2); line([c0[0], c0[1] - r * 1.15], [c0[0], c0[1] + r * 1.15], 'faint', 2); ring(c0, r, r, 'faint', 2, true);
    phasor(c0, r, 0, 'accent', 'V', th, 'phasorV'); phasor(c0, iL, phi, 'good', 'I', th, 'phasorI');
    axes(gx, yW, gw, r, turns); traced(gx, yW, gw, r, turns, a => Math.sin(a), 'accent', dur); traced(gx, yW, gw, r, turns, a => (iL / r) * Math.sin(a + phi * RAD), 'good', dur);
    label(gx - 2 * k, yW - r * 1.2, 'v', 'accent', 28); label(gx + 34 * k, yW - r * 1.2, 'i', 'good', 28);
    props.push({id: 'levelV', type: 'line', x1: c0[0], y1: yW, x2: gx, y2: yW, style: {stroke: 'accent', width: 2 * k, dash: [8 * k, 8 * k]}, layer: 1, keys: {x1: keysOf(dur, t => c0[0] + r * Math.cos(th(t))), y1: keysOf(dur, t => yW - r * Math.sin(th(t))), x2: keysOf(dur, t => gx + gw * th(t) / (turns * TAU)), y2: keysOf(dur, t => yW - r * Math.sin(th(t)))}} as Prop);
    anchors.phasors = c0; anchors.v = [gx + gw / 8, yW - r]; anchors.i = [gx + gw * ((Math.PI / 2 - phi * RAD + TAU) % TAU) / (turns * TAU), yW - iL];
    const say = el === 'R' ? 'v and i rise and fall together: in phase' : el === 'L' ? 'The current lags the voltage by π/2: it peaks a quarter-cycle later' : el === 'C' ? 'The current leads the voltage by π/2: it peaks a quarter-cycle earlier' : Math.abs(phi) < .5 ? 'At resonance v and i are in phase' : phi < 0 ? 'XL is larger than XC: the current lags the voltage by φ' : 'XC is larger than XL: the current leads the voltage by φ';
    story = say; second = 'Each phasor turns anticlockwise at ω; its height is the value at that instant. Drawn slowed down, i to its own scale';
    if (el === 'L') facts.push(...(s.L !== undefined || s.XL !== undefined ? [`XL = ωL = ${sig(XL, 'Ω')}`, `I = V/XL = ${sig(v.V / XL, 'A', 2)}`] : []));
    if (el === 'C') facts.push(...(s.C !== undefined || s.XC !== undefined ? [`XC = 1/ωC = ${sig(XC, 'Ω')}`, `I = V/XC = ${sig(v.V / XC, 'A')}`, `im = √2 I = ${sig(v.vm / XC, 'A')}`] : []));
    if (el === 'LCR') facts.push(`Z = ${sig(st.Z, 'Ω')}`, `φ = ${Math.round(phi)}°`, `cos φ = ${sig(st.pf, '', 2).trim()}`);
    if (plotP) { const py = cy + bh * .3, ph = bh * .15, mean = Math.cos(phi * RAD) / 2, p = (a: number) => Math.sin(a) * Math.sin(a + phi * RAD);
      axes(gx, py, gw, ph, turns, false); traced(gx, py, gw, ph, turns, p, 'bad', dur); label(gx, py - ph * 1.2, 'p = vi', 'bad', 26); line([gx, py - ph * mean], [gx + gw, py - ph * mean], 'bad', 2, {}, true);
      label(bx + bw * .22, py + 9 * k, Math.abs(mean) < .01 ? 'average power: zero' : 'average power: above zero', 'bad', 26); anchors.power = [gx + gw, py - ph * mean];
      second = Math.abs(mean) < .01 ? 'Above the axis the element takes energy, below it gives the same back: no power is used' : 'p has both signs but its average, the dashed line, is ½ vm im cos φ';
    }
  } else if (s.show === 'rms') {
    const V = s.V ?? (s.vm ? s.vm / Math.SQRT2 : 220), vm = V * Math.SQRT2, R = s.R ?? (s.P ? V * V / s.P : undefined), turns = 2, gx = bx + bw * .08, gw = bw * .8, y1 = cy - bh * .22, h1 = bh * .2, y2 = cy + bh * .38, h2 = bh * .32; dur = 10;
    axes(gx, y1, gw, h1, turns); traced(gx, y1, gw, h1, turns, a => Math.sin(a), 'accent', 6); const q = s.quantity === 'v' ? 'v' : 'i', Q = q.toUpperCase(); label(gx, y1 - h1 * 1.2, q, 'accent', 28);
    axes(gx, y2, gw, h2 * .56, turns, false); traced(gx, y2, gw, h2, turns, a => Math.sin(a) ** 2, 'bad', 6); label(gx, y2 - h2 * 1.05, `${q}²`, 'bad', 28);
    const meanY = y2 - h2 / 2, rmsY = y1 - h1 * Math.SQRT1_2;
    line([gx, meanY], [gx + gw, meanY], 'bad', 3, {show: [6.5, 1e9]}, true); label(gx + gw * .86, meanY - 12 * k, `mean = ½ ${q}m²`, 'bad', 24, {show: [6.5, 1e9]});
    line([gx, rmsY], [gx + gw, rmsY], 'good', 3, {show: [7.5, 1e9]}, true); label(gx + gw * .9, rmsY - 12 * k, `${Q} = ${q}m/√2`, 'good', 24, {show: [7.5, 1e9]}); label(gx + 40 * k, y1 - h1 + 30 * k, `${q}m`, 'accent', 24);
    anchors.peak = [gx + gw / 8, y1 - h1]; anchors.rms = [gx + gw * .9, rmsY]; anchors.mean = [gx + gw * .86, meanY]; anchors.zero = [gx + gw * .62, y1];
    story = q === 'v' ? 'The voltage averages to zero over a cycle, but v² does not' : 'The current averages to zero over a cycle, but i² does not: the heating follows i²'; second = q === 'v' ? 'Its rms value is vm/√2, 0.707 vm: the value quoted for a supply' : 'A steady current of im/√2 heats the same: that is the rms value, 0.707 im';
    facts.push(`V = ${sig(V, 'V')} rms: vm = √2 V = ${sig(vm, 'V')}`, ...(R !== undefined ? [`R = ${sig(R, 'Ω')}`, `I = V/R = ${sig(V / R, 'A', 2)}`] : []));
  } else if (s.show === 'circuit') {
    const els = s.elements ?? ['R'], dcOn = !!s.dc, x0 = bx + bw * .08, x1 = bx + bw * .92, yT = cy - bh * .26, yB = cy + bh * .28, xs = els.map((_, i) => x0 + (x1 - x0) * (i + 1) / (els.length + 1)), gap = S * .06; dur = 12;
    const cutsT: [number, number][] = xs.map(x => [x - gap, x + gap]); let px = x0;
    cutsT.forEach(([a, b]) => { line([px, yT], [a, yT], 'ink', 4); px = b; }); line([px, yT], [x1, yT], 'ink', 4);
    line([x0, yT], [x0, yB], 'ink', 4); line([x1, yT], [x1, yB], 'ink', 4); const sx = cx, sr = S * .055; line([x0, yB], [sx - sr, yB], 'ink', 4); line([sx + sr, yB], [x1, yB], 'ink', 4);
    if (dcOn) { line([sx - sr, yB], [sx - 8 * k, yB], 'ink', 4); line([sx + 8 * k, yB], [sx + sr, yB], 'ink', 4); line([sx - 8 * k, yB - 34 * k], [sx - 8 * k, yB + 34 * k], 'ink', 5); line([sx + 8 * k, yB - 18 * k], [sx + 8 * k, yB + 18 * k], 'ink', 5); label(sx, yB + 68 * k, 'dc source', 'muted', 24); }
    else { ring([sx, yB], sr, sr, 'ink', 4); poly(Array.from({length: 33}, (_, i) => { const u = i / 32; return [sx - sr * .6 + sr * 1.2 * u, yB - sr * .4 * Math.sin(TAU * u)] as P2; }), 'accent', 4); label(sx, yB + sr + 34 * k, 'ac source', 'muted', 24); }
    anchors.source = [sx, yB];
    let glow = (_t: number) => 1;     // the lamp's brightness, 0 to 1
    const tEv = 4.5, tEv2 = 7, ramp = (t: number) => Math.max(0, Math.min(1, (t - tEv) / (tEv2 - tEv)));
    const hasC = els.includes('C'), hasL = els.includes('L');
    if (dcOn && hasC) glow = t => Math.exp(-t / .8); else if (s.iron) glow = t => 1 - .65 * ramp(t); else if (s.reduce && !dcOn) glow = t => 1 - .55 * ramp(t); else if (dcOn && hasL) glow = t => 1 - Math.exp(-t * 2);
    els.forEach((el, i) => { const x = xs[i];
      if (el === 'R') { poly(Array.from({length: 9}, (_, j) => [x - gap + 2 * gap * j / 8, yT + (j === 0 || j === 8 ? 0 : j % 2 ? -22 * k : 22 * k)] as P2), 'ink', 4); label(x, yT - 48 * k, 'R', 'ink', 30); anchors.R = [x, yT]; }
      if (el === 'L') { const n = 4, w = 2 * gap / n; for (let j = 0; j < n; j++) poly(Array.from({length: 17}, (_, m) => { const a = Math.PI * m / 16; return [x - gap + w * j + w / 2 - (w / 2) * Math.cos(a), yT - 30 * k * Math.sin(a)] as P2; }), 'cool', 4); label(x, yT - 58 * k, 'L', 'cool', 30); anchors.L = [x, yT];
        if (s.iron) { rect(x - gap, yT - 22 * k, 2 * gap, 14 * k, 'muted', {layer: 1, show: [tEv, 1e9]}); label(x, yT + 44 * k, 'iron rod in', 'muted', 24, {show: [tEv, 1e9]}); } }
      if (el === 'C') { const g = 10 * k; line([x - gap, yT], [x - g, yT], 'ink', 4); line([x + g, yT], [x + gap, yT], 'ink', 4); line([x - g, yT - 38 * k], [x - g, yT + 38 * k], 'good', 6); line([x + g, yT - 38 * k], [x + g, yT + 38 * k], 'good', 6); label(x, yT - 58 * k, 'C', 'good', 30); anchors.C = [x, yT]; if (s.reduce) label(x, yT + 72 * k, 'C reduced', 'muted', 24, {show: [tEv, 1e9]}); }
      if (el === 'bulb') { const r = gap * .8; props.push({id: 'glow', type: 'circle', x, y: yT, r: r * 1.5, style: {fill: 'accent'}, layer: 0, keys: {opacity: keysOf(dur, t => Math.max(0, glow(t)))}} as Prop); ring([x, yT], r, r, 'ink', 4); line([x - gap, yT], [x - r, yT], 'ink', 4); line([x + r, yT], [x + gap, yT], 'ink', 4); line([x - r * .7, yT - r * .7], [x + r * .7, yT + r * .7], 'ink', 3); line([x - r * .7, yT + r * .7], [x + r * .7, yT - r * .7], 'ink', 3); label(x, yT + r * 1.5 + 34 * k, 'lamp', 'ink', 26); anchors.bulb = [x, yT]; }
    });
    const flow = (t0: number, t1: number, dir: number) => { const xa = (x0 + (xs[0] - gap)) / 2, L = (xs[0] - gap - x0) * .35; arrow([xa - dir * L, yT - 34 * k], [xa + dir * L, yT - 34 * k], 'good', 5, {show: [t0, t1]}); };
    if (dcOn) flow(0, hasC ? 2 : 1e9, 1); else for (let i = 0; i < 6; i++) flow(i * 2, (i + 1) * 2, i % 2 ? -1 : 1);
    label(x0 + 36 * k, yT - 70 * k, dcOn ? 'i' : 'i, back and forth', 'good', 24, {align: 'start'}); anchors.current = [x0 + (xs[0] - gap - x0) / 2, yT - 34 * k];
    const v = values(); if (v.XL !== undefined || v.XC !== undefined || v.R !== undefined) { const st = seriesOf(v.R ?? 0, v.XL ?? 0, v.XC ?? 0); if (v.XL !== undefined) facts.push(`XL = ${sig(v.XL, 'Ω')}`); if (v.XC !== undefined) facts.push(`XC = ${sig(v.XC, 'Ω')}`); if (st.Z > 0) facts.push(`Z = ${sig(st.Z, 'Ω')}, I = ${sig(v.V / st.Z, 'A', 2)}`); }
    story = dcOn && hasC ? 'With dc the capacitor charges, then blocks: the lamp flashes and goes dark' : s.iron ? 'Iron raises L, so XL rises: more of the voltage falls across the coil, the lamp dims' : s.reduce ? 'A smaller C has a larger XC = 1/ωC: less current, a dimmer lamp' : els.includes('bulb') && hasC ? 'With ac the capacitor charges and discharges without end: current keeps flowing, the lamp glows' : els.length > 1 ? 'One current through every element: its voltages add as phasors, not as numbers' : 'The source drives the current one way, then the other';
    second = s.iron ? 'Book Example 7.5: the glow decreases' : dcOn && hasC ? 'Reducing C changes nothing here' : '';
  } else if (s.show === 'phasors' && (s.element ?? phasorElement(s)) !== 'LCR') {
    // one element alone: its voltage phasor beside I, in phase (R), 90° ahead (L) or 90° behind (C); no sum, no triangle
    const el = s.element ?? phasorElement(s), o: P2 = [bx + bw * .3, cy], r = S * .32; dur = 7;
    line([bx + bw * .05, cy], [bx + bw * .6, cy], 'faint', 2); line([o[0], cy - S * .42], [o[0], cy + S * .42], 'faint', 2);
    ring(o, r, r, 'faint', 2, true);
    const iy = el === 'R' ? cy + 16 * k : cy;          // in phase: I drawn just below VR so both are seen
    arrow([o[0], iy], [o[0] + r * .8, iy], 'good', 5, {show: [.5, 1e9]}); label(o[0] + r * .8 + 24 * k, iy + 30 * k, 'I', 'good', 28, {show: [.5, 1e9]});
    const name = `V${el}`, tip: P2 = el === 'R' ? [o[0] + r, cy] : [o[0], el === 'L' ? cy - r : cy + r];
    arrow(o, tip, el === 'R' ? 'ink' : el === 'L' ? 'cool' : 'bad', 7, {show: [1.5, 1e9]}); label(tip[0] + (el === 'R' ? 30 : 40) * k, tip[1] - (el === 'R' ? 22 : 0) * k, name, el === 'R' ? 'ink' : el === 'L' ? 'cool' : 'bad', 28, {show: [1.5, 1e9]});
    anchors.origin = o; anchors.V = tip; anchors.I = [o[0] + r * .8, iy]; anchors[name] = tip;
    story = el === 'R' ? 'For a resistor alone, V and I point the same way: in phase' : el === 'L' ? 'For an inductor alone, V points 90° ahead of I: the current lags by π/2' : 'For a capacitor alone, V points 90° behind I: the current leads by π/2';
    second = 'Both phasors turn together anticlockwise at ω; the angle between them stays fixed';
  } else if (s.show === 'phasors') {
    const v = values(), R = v.R ?? 3, XL = v.XL ?? 8, XC = v.XC ?? 4, st = seriesOf(R, XL, XC), res = Math.abs(XL - XC) < 1e-3 * Math.max(R, XL, XC, 1), big = Math.max(R, XL, XC, st.Z), o: P2 = [bx + bw * .28, cy], u = S * .36 / big;
    const tI = .5, tL = 2.5, tC = 4.5, tN = 6.5, tV = 8.5; dur = 11;
    line([bx + bw * .05, cy], [bx + bw * .56, cy], 'faint', 2); line([o[0], cy - S * .42], [o[0], cy + S * .42], 'faint', 2);
    arrow(o, [o[0] + R * u * 1.25, cy], 'good', 4, {show: [tI, 1e9]}); label(o[0] + R * u * 1.25 + 24 * k, cy - 14 * k, 'I', 'good', 28, {show: [tI, 1e9]});
    arrow(o, [o[0] + R * u, cy], 'ink', 7, {show: [tI + .6, 1e9]}); label(o[0] + R * u / 2, cy + 36 * k, 'VR', 'ink', 28, {show: [tI + .6, 1e9]});
    const x2 = o[0] - 26 * k;
    if (XL > 0) { arrow([x2, cy], [x2, cy - XL * u], 'cool', 6, {show: [tL, 1e9]}); label(x2 - 38 * k, cy - XL * u + 12 * k, 'VL', 'cool', 28, {show: [tL, 1e9]}); }
    if (XC > 0) { arrow([x2, cy], [x2, cy + XC * u], 'bad', 6, {show: [tC, 1e9]}); label(x2 - 38 * k, cy + XC * u + 12 * k, 'VC', 'bad', 28, {show: [tC, 1e9]}); }
    const net = XL - XC, tip: P2 = [o[0] + R * u, cy - net * u];
    if (!res) { arrow(o, [o[0], cy - net * u], 'accent', 7, {show: [tN, 1e9]}); label(o[0] + 84 * k, cy - net * u * .55, 'VL − VC', 'accent', 24, {show: [tN, tV]}); } else label(x2 + 90 * k, cy - XL * u * .6, 'VL and VC cancel', 'accent', 24, {show: [tN, 1e9]});
    arrow(o, tip, 'accent', 8, {show: [tV, 1e9]}); label(tip[0] + 26 * k, tip[1] + (net >= 0 ? -10 : 30) * k, 'V', 'accent', 32, {show: [tV, 1e9]});
    if (!res) { line([o[0], cy - net * u], tip, 'muted', 2, {show: [tV, 1e9]}, true); line([o[0] + R * u, cy], tip, 'muted', 2, {show: [tV, 1e9]}, true); label(o[0] + R * u * .5 + 34 * k, cy - net * u * .16 + 8 * k, 'φ', 'muted', 28, {show: [tV, 1e9]}); }
    anchors.origin = o; anchors.VR = [o[0] + R * u, cy]; anchors.V = tip; anchors.VL = [x2, cy - XL * u]; anchors.VC = [x2, cy + XC * u];
    const tx = bx + bw * .66, ty = cy + bh * .12, tu = bw * .28 / Math.max(R, Math.abs(net), .001 + st.Z * .8), rW = R * tu, nH = Math.abs(net) * tu;
    if (!res) { const top: P2 = [tx + rW, ty - nH]; poly([[tx, ty], [tx + rW, ty], top, [tx, ty]], 'ink', 4, {show: [tV + .6, 1e9]}); label(tx + rW / 2, ty + 34 * k, 'R', 'ink', 26, {show: [tV + .6, 1e9]}); label(tx + rW + 66 * k, ty - nH / 2 + 8 * k, net > 0 ? 'XL − XC' : 'XC − XL', 'accent', 22, {show: [tV + .6, 1e9]}); label(tx + rW / 2 - 24 * k, ty - nH / 2 - 14 * k, 'Z', 'bad', 28, {show: [tV + .6, 1e9]}); anchors.triangle = [tx + rW / 2, ty - nH / 2]; }
    else label(tx + bw * .1, ty, 'Z = R', 'bad', 32, {show: [tV + .6, 1e9]});
    story = res ? 'At resonance VL and VC cancel: V is VR alone, in phase with I, and Z = R is smallest' : net > 0 ? 'VL beats VC: V leads I by φ. The voltages add as phasors, not as numbers' : 'VC beats VL: I leads V by φ. The voltages add as phasors, not as numbers';
    second = 'I is the same in all three: VR along it, VL ahead by 90°, VC behind by 90°. V² = VR² + (VL − VC)²';
    facts.push(`Z = √(R² + (XL − XC)²) = ${sig(st.Z, 'Ω')}`, `φ = ${Math.round(st.phi)}°`, ...(v.R !== undefined ? [`I = V/Z = ${sig(v.V / st.Z, 'A', 2)}, P = I²R = ${sig((v.V / st.Z) ** 2 * R, 'W', 2)}`] : []));
  } else if (s.show === 'reactance' && (s.element ?? reactanceElement(s)) !== 'LCR') {
    // one element alone: only its own curve, no partner and no resonance crossing (an inductor concept met XC, 2026-11-03)
    const el = s.element ?? reactanceElement(s), L = s.L ?? 25e-3, C = s.C ?? 15e-6, nuMax = (s.nu ?? 50) * 2.4;
    const fn = (n: number) => el === 'L' ? reactanceL(L, n) : reactanceC(C, n), top = el === 'L' ? fn(nuMax) * 1.05 : fn(nuMax * .12);
    const gx = bx + bw * .08, gy = by + bh * .86, gw = bw * .82, gh = bh * .74, X = (n: number) => gx + gw * n / nuMax, Y = (x: number) => gy - gh * Math.min(1, x / top); dur = 7;
    line([gx, gy], [gx + gw, gy], 'ink', 3); line([gx, gy], [gx, gy - gh * 1.04], 'ink', 3); label(gx + gw + 24 * k, gy + 9 * k, 'ν', 'muted', 26); label(gx, gy - gh * 1.08, el === 'L' ? 'XL' : 'XC', 'muted', 26);
    const curve = Array.from({length: 241}, (_, i) => nuMax * (i + 1) / 241).filter(n => fn(n) <= top).map(n => [X(n), Y(fn(n))] as P2);
    poly(curve, el === 'L' ? 'cool' : 'good', 5);
    if (el === 'L') label(X(nuMax * .7) - 24 * k, Y(fn(nuMax * .7)) - 16 * k, num ? `XL = 2πνL, L = ${sig(L, 'H', 2)}` : 'XL = ωL', 'cool', 28, {align: 'end'});
    else label(X(nuMax * .3), Y(fn(nuMax * .3)) - 30 * k, num ? `XC = 1/(2πνC), C = ${sig(C, 'F', 2)}` : 'XC = 1/ωC', 'good', 28, {align: 'start'});
    anchors.curve = curve[Math.floor(curve.length * .6)];
    if (s.nu !== undefined) { const n0 = s.nu; line([X(n0), gy], [X(n0), Y(fn(n0))], 'accent', 2, {}, true); dot(X(n0), Y(fn(n0)), 8, 'accent'); label(X(n0), gy + 36 * k, num ? `ν = ${sig(n0, 'Hz', 2)}` : 'ν', 'accent', 24); anchors.nu = [X(n0), Y(fn(n0))]; if (num) facts.push(`at ${sig(n0, 'Hz', 2)}: ${el === 'L' ? 'XL' : 'XC'} = ${sig(fn(n0), 'Ω')}`); }
    story = el === 'L' ? 'XL grows in step with the frequency: double ν, double XL' : 'XC falls as the frequency rises: double ν, half XC';
    second = el === 'L' ? 'At ν = 0, dc, the coil is a plain wire; at high frequency it all but blocks the current' : 'At ν = 0, dc, the capacitor is a break; at high frequency it passes the current easily';
  } else if (s.show === 'reactance') {
    const L = s.L ?? 25.48e-3, C = s.C ?? 796e-6, nu0 = resonantOmega(L, C) / TAU, top = reactanceL(L, nu0) * 3, nuMax = nu0 * 2.6, gx = bx + bw * .08, gy = by + bh * .86, gw = bw * .82, gh = bh * .74, X = (n: number) => gx + gw * n / nuMax, Y = (x: number) => gy - gh * Math.min(1, x / top); dur = 8;
    line([gx, gy], [gx + gw, gy], 'ink', 3); line([gx, gy], [gx, gy - gh * 1.04], 'ink', 3); label(gx + gw + 24 * k, gy + 9 * k, 'ν', 'muted', 26); label(gx, gy - gh * 1.08, 'X', 'muted', 26);
    const pts = (fn: (n: number) => number) => Array.from({length: 241}, (_, i) => nuMax * (i + 1) / 241).filter(n => fn(n) <= top).map(n => [X(n), Y(fn(n))] as P2);
    poly(pts(n => reactanceL(L, n)), 'cool', 5); poly(pts(n => reactanceC(C, n)), 'good', 5);
    label(X(nuMax * .86), Y(reactanceL(L, nuMax * .86)) - 40 * k, 'XL = ωL', 'cool', 28); label(X(nuMax * .2), Y(reactanceC(C, nuMax * .15)) - 8 * k, 'XC = 1/ωC', 'good', 28, {align: 'start'});
    const cross: P2 = [X(nu0), Y(reactanceL(L, nu0))]; line([cross[0], cross[1]], [cross[0], gy], 'muted', 2, {}, true); dot(cross[0], cross[1], 9, 'bad'); label(cross[0], gy + 36 * k, num ? `ν₀ = ${sig(nu0, 'Hz', 2)}` : 'ν₀', 'bad', 26); anchors.cross = cross;
    if (s.nu !== undefined) { const n0 = Math.min(s.nu, nuMax); line([X(n0), gy], [X(n0), gy - gh], 'accent', 2, {}, true); dot(X(n0), Y(reactanceL(L, n0)), 7, 'cool'); dot(X(n0), Y(reactanceC(C, n0)), 7, 'good'); label(X(n0), gy - gh - 14 * k, num ? `ν = ${sig(s.nu, 'Hz', 2)}` : 'ν', 'accent', 24); anchors.nu = [X(n0), gy]; facts.push(`at ${sig(s.nu, 'Hz', 2)}: XL = ${sig(reactanceL(L, s.nu), 'Ω')}, XC = ${sig(reactanceC(C, s.nu), 'Ω')}`); }
    story = 'XL grows with the frequency, XC shrinks: a coil blocks high frequencies, a capacitor low ones'; second = 'Where they cross the two cancel in series: that is resonance. At ν = 0, dc, a coil is a plain wire and a capacitor a break';
  } else if (s.show === 'resonance') {
    const L = s.L ?? 1e-3, C = s.C ?? 1e-9, R = s.R ?? 100, R2 = s.R2, vm = s.vm ?? (s.V !== undefined ? s.V * Math.SQRT2 : 100), w0 = resonantOmega(L, C), lo = .5 * w0, hi = 1.5 * w0, top = s.full ?? vm / Math.min(R, R2 ?? R), gx = bx + bw * .1, gy = by + bh * .86, gw = bw * .8, gh = bh * .7, X = (w: number) => gx + gw * (w - lo) / (hi - lo), Y = (i: number) => gy - gh * i / top; dur = 9;
    line([gx, gy], [gx + gw, gy], 'ink', 3); line([gx, gy], [gx, gy - gh * 1.1], 'ink', 3); label(gx + gw + 24 * k, gy + 9 * k, 'ω', 'muted', 26); label(gx, gy - gh * 1.14, 'im', 'muted', 26);
    const curve = (r: number, colour: string, t0: number) => { poly(Array.from({length: 241}, (_, i) => { const w = lo + (hi - lo) * i / 240; return [X(w), Y(peakCurrent(vm, r, L, C, w))] as P2; }), colour, 5, {draw: 0, keys: {draw: [[t0, 0], [t0 + 2.5, 1, 'inOut']]}}); label(X(w0) + 16 * k, Y(vm / r) - 16 * k, num ? `R = ${sig(r, 'Ω')}` : (colour === 'accent' ? 'smaller R' : 'larger R'), colour, 26, {align: 'start', show: [t0 + 2, 1e9]}); };
    const small = Math.min(R, R2 ?? R), large = Math.max(R, R2 ?? R); curve(small, 'accent', .5); if (R2 !== undefined) curve(large, 'cool', 3.2);
    line([X(w0), gy], [X(w0), Y(vm / small)], 'muted', 2, {}, true); label(X(w0), gy + 36 * k, 'ω₀', 'bad', 28); anchors.peak = [X(w0), Y(vm / small)]; anchors.omega0 = [X(w0), gy];
    if (s.nu !== undefined) { const w = TAU * s.nu, x = X(Math.max(lo, Math.min(hi, w))), i = peakCurrent(vm, small, L, C, w); dot(x, Y(i), 11, 'bad'); line([x, gy], [x, Y(i)], 'bad', 3); anchors.state = [x, Y(i)]; anchors.base = [x, gy]; facts.push(`at ν = ${sig(s.nu, 'Hz', 3)}: im = ${sig(i, 'A', 3)}`); }
    if (s.sharp) { const half = vm / small / Math.SQRT2, d = small / (2 * L), a = X(w0 - d), b = X(w0 + d); line([a, Y(half)], [b, Y(half)], 'bad', 3, {show: [4, 1e9]}); line([a, gy], [a, Y(half)], 'bad', 2, {show: [4, 1e9]}, true); line([b, gy], [b, Y(half)], 'bad', 2, {show: [4, 1e9]}, true); label(b + 12 * k, Y(half) - 8 * k, 'im/√2', 'bad', 24, {align: 'start', show: [4, 1e9]}); label((a + b) / 2, gy + 70 * k, '2Δω = R/L', 'bad', 24, {show: [4, 1e9]}); anchors.width = [(a + b) / 2, Y(half)]; facts.push(`Q = ω₀L/R = ${sig(w0 * L / small, '', 2).trim()}`); }
    story = R2 !== undefined ? 'The smaller the resistance, the taller and sharper the peak at ω₀' : 'The current is largest where XL = XC: there Z = R alone'; second = 'ω₀ = 1/√(LC) does not depend on R. A radio is tuned this way: only the station at ω₀ gets a large current';
    facts.unshift(`ω₀ = 1/√(LC) = ${sig(w0, 'rad/s')}, ν₀ = ${sig(w0 / TAU, 'Hz', 2)}`, ...(s.vm || s.V ? [`Z = R = ${sig(small, 'Ω')}, I = ${sig(vm / Math.SQRT2 / small, 'A')}, P = ${sig((vm / Math.SQRT2 / small) ** 2 * small, 'W', 2)}`] : []));
  } else if (s.show === 'power') {
    const phi = s.phi ?? 53.1, a = Math.abs(phi) * RAD, lag = phi >= 0, o: P2 = [bx + bw * .42, cy + bh * .34], I = S * .62, Ip = I * Math.cos(a), Iq = I * Math.sin(a), side = lag ? 1 : -1, tip: P2 = [o[0] + side * Iq, o[1] - Ip], correct = !!s.correct, tC = 6; dur = correct ? 11 : 8;
    arrow(o, [o[0], o[1] - S * .76], 'accent', 7); label(o[0] - 30 * k, o[1] - S * .76, 'V', 'accent', 32);
    arrow(o, tip, 'good', 7, correct ? {show: [0, tC + 2]} : {}); label(tip[0] + side * 26 * k, tip[1] - 6 * k, 'I', 'good', 30, correct ? {show: [0, tC + 2]} : {});
    arrow(o, [o[0], o[1] - Ip], 'ink', 8, {show: [1.5, 1e9]}); label(o[0] - side * 46 * k, o[1] - Ip / 2, 'Ip', 'ink', 28, {show: [1.5, 1e9]});
    arrow(o, [o[0] + side * Iq, o[1]], 'bad', 6, {show: [3, correct ? tC + 2 : 1e9]}); label(o[0] + side * Iq / 2, o[1] + 38 * k, 'Iq: wattless', 'bad', 26, {show: [3, correct ? tC + 2 : 1e9]});
    line([o[0], o[1] - Ip], tip, 'muted', 2, {show: [1.5, correct ? tC + 2 : 1e9]}, true); line([o[0] + side * Iq, o[1]], tip, 'muted', 2, {show: [3, correct ? tC + 2 : 1e9]}, true);
    if (a > .05) label(o[0] + side * Iq * .22, o[1] - Ip * .5, 'φ', 'muted', 28, correct ? {show: [0, tC + 2]} : {});
    anchors.origin = o; anchors.V = [o[0], o[1] - S * .76]; anchors.I = tip; anchors.Ip = [o[0], o[1] - Ip]; anchors.Iq = [o[0] + side * Iq, o[1]];
    if (correct) { arrow(o, [o[0] - side * Iq, o[1]], 'cool', 6, {show: [tC, 1e9]}); label(o[0] - side * Iq / 2, o[1] + 38 * k, 'from C', 'cool', 26, {show: [tC, 1e9]}); label(o[0] + side * S * .4, o[1] - Ip * .5, 'I is now Ip alone: cos φ = 1', 'good', 26, {show: [tC + 2, 1e9]}); }
    story = correct ? 'A capacitor in parallel draws a current that cancels Iq: the source now supplies only Ip' : `Only the part of I along V does work: P = VI cos φ`;
    second = correct ? 'The same power at less current: less I²R is lost in the lines' : 'Iq is a quarter-cycle out of step: it flows, and heats the lines, but delivers no power';
    facts.push(`cos φ = ${sig(Math.cos(a), '', 2).trim()}`, ...(s.V && s.P ? [`I = P/(V cos φ) = ${sig(s.P / (s.V * Math.cos(a)), 'A', 2)}`] : []));
  } else if (s.show === 'energy') {
    const el = s.element === 'C' ? 'C' : 'L', turns = 2, gx = bx + bw * .08, gw = bw * .66, y1 = cy - bh * .22, h1 = bh * .2, y2 = cy + bh * .36, h2 = bh * .32, bar = bx + bw * .86, bw2 = bw * .07, e = (a: number) => Math.sin(a) ** 2;
    axes(gx, y1, gw, h1, turns); traced(gx, y1, gw, h1, turns, a => Math.sin(a), 'good', dur); label(gx, y1 - h1 * 1.2, el === 'L' ? 'i' : 'v', 'good', 28);
    axes(gx, y2, gw, h2 * .5, turns, false); traced(gx, y2, gw, h2, turns, e, 'accent', dur); label(gx + 70 * k, y2 - h2 * 1.05, el === 'L' ? 'U = ½Li²' : 'U = ½Cv²', 'accent', 28);
    const th = (t: number) => turns * TAU * t / dur;
    props.push({id: 'store', type: 'rect', x: bar - bw2 / 2, y: y2 - h2 * e(0), w: bw2, h: h2 * e(0), style: {fill: 'accent', stroke: 'ink', width: 2 * k}, layer: 3, keys: {y: keysOf(dur, t => y2 - h2 * e(th(t))), h: keysOf(dur, t => h2 * e(th(t)))}} as Prop);
    line([bar - bw2, y2], [bar + bw2, y2], 'ink', 3); label(bar, y2 + 36 * k, el === 'L' ? 'in the field' : 'between the plates', 'accent', 22); anchors.store = [bar, y2]; anchors.peak = [gx + gw / 8, y2 - h2];
    story = el === 'L' ? 'The coil stores energy as the current grows and gives it all back as it falls' : 'The capacitor stores energy as it charges and gives it all back as it discharges';
    second = 'Twice each cycle the energy goes in and comes back out: over a full cycle nothing is lost';
  } else if (s.show === 'add') {
    const a1 = s.a1 ?? 10, a2 = s.a2 ?? 10, delta = s.delta ?? 90, sum = addPhasors(a1, a2, delta), big = Math.max(a1, a2, sum.a), o: P2 = [bx + bw * .16, cy + S * .14], u = S * .3 / big, P = (a: number, d: number): P2 => [o[0] + a * u * Math.cos(d * RAD), o[1] - a * u * Math.sin(d * RAD)], t1 = P(a1, 0), t2 = P(a2, delta), r = P(sum.a, sum.phase); dur = 9;
    arrow(o, t1, 'accent', 6); label(t1[0] + 34 * k, t1[1] + 8 * k, 'V₁', 'accent', 28); arrow(o, t2, 'cool', 6, {show: [1.2, 1e9]}); label(t2[0], t2[1] - 18 * k, 'V₂', 'cool', 28, {show: [1.2, 1e9]});
    line(t1, r, 'muted', 2, {show: [2.4, 1e9]}, true); line(t2, r, 'muted', 2, {show: [2.4, 1e9]}, true); arrow(o, r, 'bad', 8, {show: [3, 1e9]}); label(r[0] + 26 * k, r[1] - 10 * k, 'V', 'bad', 30, {show: [3, 1e9]});
    const gx = bx + bw * .46, gw = bw * .46, gh = S * .3; axes(gx, cy, gw, gh, 2); traced(gx, cy, gw, gh, 2, x => (a1 / big) * Math.sin(x), 'accent', 8, 1); traced(gx, cy, gw, gh, 2, x => (a2 / big) * Math.sin(x + delta * RAD), 'cool', 8, 1); traced(gx, cy, gw, gh, 2, x => (sum.a / big) * Math.sin(x + sum.phase * RAD), 'bad', 8, 1, 5);
    anchors.origin = o; anchors.V = r; story = 'Same frequency, different phase: add the phasors like vectors, and the sum is one sinusoid'; second = 'The sizes do not simply add unless the two are in phase';
    facts.push(`V = ${sig(sum.a, 'V')}, ${Math.round(sum.phase)}° ahead of V₁`);
  } else if (s.show === 'transformer') {
    const Np = s.Np ?? 100, Ns = s.Ns ?? 200, Vp = s.Vp ?? 220, f = transformerOf(Vp, Np, Ns, s.Ip), same = s.winding === 'same', full = s.full ?? Math.max(Vp, f.Vs), up = Ns > Np; dur = 10;
    const cw = bw * .4, ch = bh * .52, x0 = bx + bw * .1, y0 = by + bh * .12, th = S * .055;
    rect(x0, y0, cw, ch, 'none', {layer: 1, style: {stroke: 'muted', width: th}});
    const period = 3.2;
    const coil = (x: number, turns: number, colour: string, wide: number) => { const n = Math.max(3, Math.min(14, Math.round(turns / Math.max(Np, Ns) * 14))), hh = ch * .62, yc = y0 + ch / 2; for (let i = 0; i < n; i++) { const yy = yc - hh / 2 + hh * (i + .5) / n; poly(Array.from({length: 13}, (_, j) => { const a = Math.PI * j / 12; return [x + wide * Math.cos(a) * -1, yy + (hh / n / 2) * Math.sin(a) * .9] as P2; }), colour, 4); poly(Array.from({length: 13}, (_, j) => { const a = Math.PI * j / 12; return [x - wide * Math.cos(a) * -1, yy - (hh / n / 2) * Math.sin(a) * .9] as P2; }), colour, 4); } return {top: yc - hh / 2, bot: yc + hh / 2}; };
    const xP = same ? x0 + cw / 2 : x0, xS = same ? x0 + cw / 2 : x0 + cw;
    if (same) rect(x0 + cw / 2 - th / 2, y0, th, ch, 'muted', {layer: 1});
    const pc = coil(xP, Np, 'accent', th * (same ? .9 : .9)); const sc = coil(xS, Ns, 'cool', th * (same ? 1.45 : .9));
    const yS = y0 + ch + bh * .13;
    if (!same) { line([xP - th, pc.top], [x0 - bw * .05, pc.top], 'accent', 3); line([xP - th, pc.bot], [x0 - bw * .05, pc.bot], 'accent', 3); line([xS + th, sc.top], [x0 + cw + bw * .05, sc.top], 'cool', 3); line([xS + th, sc.bot], [x0 + cw + bw * .05, sc.bot], 'cool', 3); }
    label(xP - (same ? th * 2.2 : 0), y0 - th / 2 - 14 * k, num ? `Np = ${Np}` : 'Np', 'accent', 26, same ? {align: 'end'} : {}); label(xS + (same ? th * 2.2 : 0), y0 - th / 2 - 14 * k, num ? `Ns = ${Ns}` : 'Ns', 'cool', 26, same ? {align: 'start'} : {});
    anchors.primary = [xP, y0 + ch / 2]; anchors.secondary = [xS, y0 + ch / 2]; anchors.core = [x0 + cw / 2, y0 + (same ? 0 : ch)];
    if (!same) { for (let i = 0; i < 8; i++) { const on = i % 2 === 0; arrow([x0 + cw * .32, y0], [x0 + cw * .68, y0], 'ink', 6, {show: [i * period / 2, (i + 1) * period / 2], ...(on ? {} : {x1: x0 + cw * .68, x2: x0 + cw * .32})}); } label(x0 + cw / 2, y0 + 44 * k, 'Φ alternates in the core', 'ink', 24); }
    const gx = bx + bw * .64, gw = bw * .3, gh = bh * .2, yP = by + bh * .28, ySc = by + bh * .74, turns = 2, h = (V: number) => gh * V / full;
    axes(gx, yP, gw, gh, turns, false); traced(gx, yP, gw, h(Vp), turns, a => Math.sin(a), 'accent', dur, 0); label(gx + 8 * k, yP - gh * 1.2, num ? `Vp = ${sig(Vp, 'V')}` : 'Vp', 'accent', 26, {align: 'start'});
    axes(gx, ySc, gw, gh, turns, false); traced(gx, ySc, gw, h(f.Vs), turns, a => Math.sin(a), 'cool', dur, 0); label(gx + 8 * k, ySc - gh * 1.2, num ? `Vs = ${sig(f.Vs, 'V')}` : 'Vs', 'cool', 26, {align: 'start'});
    anchors.vp = [gx + gw / 8, yP - h(Vp)]; anchors.vpbase = [gx + gw / 8, yP]; anchors.vs = [gx + gw / 8, ySc - h(f.Vs)]; anchors.vsbase = [gx + gw / 8, ySc];
    label(x0 + cw / 2, yS, up ? 'step-up: more turns on the secondary' : Ns === Np ? 'equal turns: the same voltage' : 'step-down: fewer turns on the secondary', 'ink', 26);
    if (s.losses) { label(x0 + cw / 2, yS + 46 * k, 'Real losses: flux leakage, winding heat,', 'bad', 22); label(x0 + cw / 2, yS + 76 * k, 'eddy currents, hysteresis', 'bad', 22); }
    story = 'The same changing flux threads both coils: each turn gets the same emf, so Vs/Vp = Ns/Np'; second = same ? 'Both coils on one limb of a soft-iron core: less flux is lost' : 'An ideal transformer loses no power: Vs Is = Vp Ip. More voltage, less current';
    facts.push(`Vs = Vp Ns/Np = ${sig(f.Vs, 'V')}`, ...(f.Is !== undefined ? [`Is = Ip Np/Ns = ${sig(f.Is, 'A')}`, `P = ${sig(Vp * s.Ip!, 'W')} on both sides`] : []));
  }
  return finish('ac', s as never, dur, story, second, facts, anchors, s.illustrative);
}
