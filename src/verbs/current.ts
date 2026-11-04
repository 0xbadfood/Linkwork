// current: Class 12 Current Electricity, computed (leph1-03, 2026-11-02). What circuit (Class 10) has no room for.
//   drift         electrons wandering, then drifting when a field comes on: v = eEτ/m = I/(neA), μ = v/E
//   wire          R = ρl/A, a slab of material: J = I/A = E/ρ, σ = 1/ρ
//   iv            V against I: ohmic, nonlinear, diode, gaas (double valued)
//   resistivity   ρ against T: metal, alloy, semiconductor; ρ = ρ₀[1 + α(T − T₀)]
//   transmission  a town fed through cables: Pc = P²Rc/V², at two line voltages
//   cell          emf, internal resistance: V = ε − Ir, V against I
//   cells         series and parallel cells and the one cell that replaces them
//   kirchhoff     three branches between two junctions, solved: junction sum, loop walk
//   bridge        Wheatstone: the galvanometer current, zero at balance
import type {Prop, Scene} from '../scene.ts';
import {kit} from './potential.ts';
import {sci} from './electric.ts';

type P2 = [number, number];
export const CURRENT_SHOWS = ['drift', 'wire', 'iv', 'resistivity', 'transmission', 'cell', 'cells', 'kirchhoff', 'bridge'] as const;
export type Branch = {e?: number; R: number; name?: string};
export type Cell = {e: number; r: number};
export type CurrentSpec = {verb: 'current'; show: (typeof CURRENT_SHOWS)[number]; E?: number; tau?: number; I?: number; A?: number; n?: number; rho?: number; l?: number; V?: number;
  kind?: string; alpha?: number; T?: number; T0?: number; P?: number; Rc?: number; V2?: number; emf?: number; r?: number; R?: number; cells?: Cell[]; branches?: Branch[]; equivalent?: boolean;
  currents?: boolean; join?: 'end' | 'side'; field?: boolean; R1?: number; R2?: number; R3?: number; R4?: number; Rg?: number; gmax?: number; lspan?: number; aspan?: number;
  title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};

const QE = 1.602e-19, ME = 9.11e-31, isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const IV_KINDS = ['ohmic', 'nonlinear', 'diode', 'gaas'], RHO_KINDS = ['metal', 'alloy', 'semiconductor'];
const fmt = (x: number, unit: string) => sci(x, unit);

/** The cell that replaces cells in series (a negative e is a cell turned round) or in parallel. */
export function combineCells(cells: Cell[], kind: string): Cell {
  if (kind === 'series') return {e: cells.reduce((a, c) => a + c.e, 0), r: cells.reduce((a, c) => a + c.r, 0)};
  const g = cells.reduce((a, c) => a + 1 / c.r, 0);
  return {e: cells.reduce((a, c) => a + c.e / c.r, 0) / g, r: 1 / g};
}

/** Currents up each branch, from the lower junction to the upper, and the upper junction's potential. */
export function solveBranches(b: Branch[]) {
  const V = b.reduce((a, x) => a + (x.e ?? 0) / x.R, 0) / b.reduce((a, x) => a + 1 / x.R, 0);
  return {V, I: b.map(x => ((x.e ?? 0) - V) / x.R)};
}

/** The book's arms: A at emf, C at 0; R2 A–B, R4 B–C, R3 C–D, R1 D–A; Rg B–D. Ig runs from B to D. */
export function solveBridge(emf: number, R1: number, R2: number, R3: number, R4: number, Rg: number) {
  const a = 1 / R2 + 1 / R4 + 1 / Rg, b = -1 / Rg, c = -1 / Rg, d = 1 / R1 + 1 / R3 + 1 / Rg, e1 = emf / R2, e2 = emf / R1, det = a * d - b * c;
  const VB = (e1 * d - b * e2) / det, VD = (a * e2 - c * e1) / det;
  return {VB, VD, Ig: (VB - VD) / Rg, I2: (emf - VB) / R2, I1: (emf - VD) / R1};
}

export function currentErrors(s: CurrentSpec): string[] {
  const e: string[] = [], W = 'current';
  if (!CURRENT_SHOWS.includes(s.show)) return [`${W}: show is one of ${CURRENT_SHOWS.join(', ')}`];
  for (const n of ['E', 'tau', 'I', 'A', 'n', 'rho', 'l', 'V', 'P', 'Rc', 'V2', 'emf', 'R', 'R1', 'R2', 'R3', 'R4', 'Rg', 'gmax'] as const) if (s[n] !== undefined && !(isNum(s[n]) && s[n]! > 0)) e.push(`${W}: ${n} is above 0, in SI units`);
  if (s.r !== undefined && !(isNum(s.r) && s.r >= 0)) e.push(`${W}: r, the internal resistance, is 0 or more`);
  for (const n of ['alpha', 'T', 'T0'] as const) if (s[n] !== undefined && !isNum(s[n])) e.push(`${W}: ${n} is a number`);
  if (s.show === 'iv' && s.kind !== undefined && !IV_KINDS.includes(s.kind)) e.push(`${W}: iv kind is ${IV_KINDS.join(', ')}`);
  if (s.show === 'resistivity' && s.kind !== undefined && !RHO_KINDS.includes(s.kind)) e.push(`${W}: resistivity kind is ${RHO_KINDS.join(', ')}`);
  if (s.show === 'cells') {
    if (!['series', 'parallel'].includes(s.kind as string)) e.push(`${W}: cells needs kind: series or parallel`);
    if (!Array.isArray(s.cells) || s.cells.length < 2 || s.cells.length > 6 || s.cells.some(c => !isNum(c?.e) || !isNum(c?.r) || c.r <= 0)) e.push(`${W}: cells is 2 to 6 of {e (V; negative for a cell turned round), r (Ω, above 0)}`);
    if (s.equivalent !== undefined && typeof s.equivalent !== 'boolean') e.push(`${W}: equivalent is true or false`);
  }
  if (s.show === 'kirchhoff' && s.branches !== undefined && (!Array.isArray(s.branches) || s.branches.length !== 3 || s.branches.some(b => !isNum(b?.R) || b.R <= 0 || (b.e !== undefined && !isNum(b.e))))) e.push(`${W}: kirchhoff needs branches: exactly 3 of {e (V, driving up), R (Ω), name}`);
  if (s.field !== undefined && (s.show !== 'drift' || typeof s.field !== 'boolean')) e.push(`${W}: field goes with show drift: false keeps the field off (random motion only)`);
  if (s.join !== undefined && (s.show !== 'wire' || !['end', 'side'].includes(s.join))) e.push(`${W}: join goes with show wire: end (two identical slabs end to end, in series) or side (side by side, in parallel)`);
  if (s.show === 'transmission' && s.V !== undefined && s.V2 !== undefined && s.V === s.V2) e.push(`${W}: V and V2 are two different line voltages`);
  return e;
}

export function current(s: CurrentSpec): Scene {
  const {k, props, bx, by, bw, bh, cx, cy, on, arrow, line, poly, label, keysOf, finish} = kit(s);
  const facts: string[] = [], anchors: Record<string, P2> = {}; let dur = 8, story = '', second = '';
  const num = !s.illustrative;
  // a resistor's zigzag from p to q, with its name beside it
  const zig = (p: P2, q: P2, name = '', c = 'ink', extra: Record<string, unknown> = {}) => {
    const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, teeth = 6, tooth = Math.min(16 * k, L * .12), lead = L * .22, pts: P2[] = [p];
    for (let i = 0; i <= teeth; i++) { const f = lead + (L - 2 * lead) * i / teeth, off = i === 0 || i === teeth ? 0 : (i % 2 ? tooth : -tooth); pts.push([p[0] + ux * f - uy * off, p[1] + uy * f + ux * off]); }
    pts.push(q); poly(pts, c, 4, extra);
    if (name) label((p[0] + q[0]) / 2 - uy * 44 * k, (p[1] + q[1]) / 2 + ux * 44 * k + 8 * k, name, 'ink', 24, extra);
  };
  // a cell across a wire from p to q (long plate toward q, the + side)
  const cell = (p: P2, q: P2, c = 'ink', extra: Record<string, unknown> = {}) => {
    const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, m: P2 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], g = 9 * k;
    const a: P2 = [m[0] - ux * g, m[1] - uy * g], b: P2 = [m[0] + ux * g, m[1] + uy * g];
    line(p, a, 'muted', 3, extra); line(b, q, 'muted', 3, extra);
    line([a[0] - uy * 15 * k, a[1] + ux * 15 * k], [a[0] + uy * 15 * k, a[1] - ux * 15 * k], c, 6, extra);
    line([b[0] - uy * 30 * k, b[1] + ux * 30 * k], [b[0] + uy * 30 * k, b[1] - ux * 30 * k], c, 4, extra);
  };
  const axes = (x0: number, y0: number, w: number, h: number, xn: string, yn: string, mid = false) => {
    line([x0, mid ? y0 - h / 2 : y0], [x0 + w, mid ? y0 - h / 2 : y0], 'ink', 3); line([mid ? x0 + w / 2 : x0, y0], [mid ? x0 + w / 2 : x0, y0 - h], 'ink', 3);
    label(x0 + w, (mid ? y0 - h / 2 : y0) + 36 * k, xn, 'muted', 26); label((mid ? x0 + w / 2 : x0) - 30 * k, y0 - h + 8 * k, yn, 'muted', 26);
  };

  if (s.show === 'drift') {
    const hasI = s.I !== undefined && s.A !== undefined && s.n !== undefined, tau = s.tau ?? 2.5e-14, E0 = s.E ?? 1;
    // field: false (2026-11-04, leph1-03 C2: "with no field the average velocity is zero" was drawn with the field
    // switching on): the random motion only, for as long as the beat lasts
    const off = s.field === false;
    const vd = hasI ? s.I! / (s.n! * QE * s.A!) : QE * E0 * tau / ME, x0 = bx + bw * .04, x1 = bx + bw * .96, y0 = cy - bh * .3, y1 = cy + bh * .3, T1 = off ? 1e9 : 3; dur = off ? 7 : 10;
    line([x0, y0], [x1, y0], 'muted', 4); line([x0, y1], [x1, y1], 'muted', 4);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 12; i++) {
      const X0 = x0 + bw * .1 + rnd() * bw * .7, Y0 = y0 + 20 * k + rnd() * (y1 - y0 - 40 * k), a = 6 + rnd() * 4, b = 5 + rnd() * 3, p = rnd() * 6, q = rnd() * 6, ax = bw * .05, ay = (y1 - y0) * .16;
      const after = (t: number) => Math.max(0, t - T1) * bw * .018;   // the drift, drawn far larger than it is
      const X = (t: number) => Math.min(x1 - 12 * k, X0 + ax * Math.sin(t * a + p) - after(t)), Y = (t: number) => Math.min(y1 - 12 * k, Math.max(y0 + 12 * k, Y0 + ay * Math.sin(t * b + q)));
      props.push({id: `e${i}`, type: 'circle', x: X(0), y: Y(0), r: 9 * k, style: {fill: 'cool'}, layer: 3, keys: {x: keysOf(dur, X, 12), y: keysOf(dur, Y, 12)}} as Prop);
    }
    if (!off) {
      arrow([x0 + bw * .3, y1 + 40 * k], [x0 + bw * .7, y1 + 40 * k], 'accent', 5, {show: [T1, 1e9], id: 'field0'});
      label(cx, y1 + 78 * k, 'E', 'accent', 30, {show: [T1, 1e9]});
      label(cx, y0 - 22 * k, 'Electrons drift against E', 'cool', 26, {show: [T1, 1e9]});
    }
    label(cx, y0 - 22 * k, 'No field: random directions, average velocity zero', 'muted', 26, {show: [0, T1]});
    if (off) { facts.push('with no electric field the electrons move in random directions after each collision, so their average velocity is zero: no net flow of charge, no current'); story = 'With no field, each electron leaves a collision in a random direction'; second = 'Their velocities cancel on average: no net drift, no current'; anchors.wire = [cx, cy]; }
    else if (hasI) facts.push(`v = I/(neA) = ${fmt(vd, 'm/s')}`, `at n = ${fmt(s.n!, 'm⁻³')}, A = ${fmt(s.A!, 'm²')}, I = ${fmt(s.I!, 'A')}`);
    else facts.push(`v = eEτ/m = ${fmt(vd, 'm/s')}`, `mobility μ = v/E = eτ/m = ${fmt(QE * tau / ME, 'm²/Vs')}`, `at E = ${fmt(E0, 'V/m')}, τ = ${fmt(tau, 's')}`);
    if (!off) { story = 'Collisions keep undoing the speed gained, so the field adds only a small steady drift'; second = 'Drift drawn far larger than it is: only about a millimetre a second'; anchors.wire = [cx, cy]; }
  } else if (s.show === 'wire' && s.join) {
    // Two identical slabs joined (2026-11-04, leph1-03 C2: "two identical slabs end to end, a series arrangement" had no
    // picture): end to end the length doubles, so R doubles (series); side by side the area doubles, so R halves (parallel).
    const rho = s.rho ?? 1.7e-8, l = s.l ?? 1, A = s.A ?? 1e-6, R = rho * l / A, end = s.join === 'end', T1 = 2.4; dur = 8;
    const w = end ? bw * .4 : bw * .6, h = end ? bh * .26 : bh * .2, gap = end ? 0 : 6 * k;
    const x0 = cx - (end ? w : w / 2), y0 = cy - (end ? h / 2 : h + gap / 2);
    const slab = (x: number, y: number, tag: string, from: number) => props.push({id: tag, type: 'rect', x, y, w, h, r: 6 * k, style: {fill: 'faint', stroke: 'muted', width: 3 * k}, show: [from, 1e9], fade: 0.4} as Prop);
    // the first slab, then its twin slides in beside it
    slab(x0, y0, 'slab1', 0);
    const x2 = end ? x0 + w : x0, y2 = end ? y0 : y0 + h + gap;
    props.push({id: 'slab2', type: 'rect', x: x2, y: y2, w, h, r: 6 * k, style: {fill: 'faint', stroke: 'muted', width: 3 * k}, show: [0.8, 1e9], fade: 0.4,
      keys: end ? {x: [[0.8, x2 + bw * .12], [1.8, x2, 'inOut']]} : {y: [[0.8, y2 + bh * .12], [1.8, y2, 'inOut']]}} as Prop);
    // each slab's R off the slab, clear of the current's arrows: above (end to end) or to the left (side by side)
    const tag = (x: number, y: number, from: number) => label(end ? x + w / 2 : x - 110 * k, end ? y - 22 * k : y + h / 2 + 9 * k, num ? `R = ${fmt(R, 'Ω')}` : 'R', 'ink', 26, {show: [from, 1e9]});
    tag(x0, y0, 0); tag(x2, y2, 1.8);
    const bx0 = x0, bx1 = end ? x0 + 2 * w : x0 + w, byB = end ? y0 + h : y2 + h;
    const count = end ? 4 : 6;
    for (let i = 0; i < count; i++) { const y = end ? y0 + h * (i + .5) / count : y0 + (2 * h + gap) * (i + .5) / count; arrow([bx0 + 12 * k, y], [bx1 - 12 * k, y], 'accent', 3, on(T1, T1 + 1.2)); }
    label((bx0 + bx1) / 2, byB + 44 * k, end ? 'twice the length, the same area' : 'the same length, twice the area', 'muted', 26, {show: [T1, 1e9]});
    label((bx0 + bx1) / 2, byB + 84 * k, end ? 'in series: R + R = 2R' : 'in parallel: 1/R + 1/R, so R/2', 'accent', 28, {show: [T1 + .6, 1e9]});
    facts.push(end ? `two identical slabs end to end: R = ρ(2l)/A = 2 × ${fmt(R, 'Ω')} = ${fmt(2 * R, 'Ω')} (in series)` : `two identical slabs side by side: R = ρl/(2A) = ${fmt(R, 'Ω')} ÷ 2 = ${fmt(R / 2, 'Ω')} (in parallel)`,
      `each slab alone: R = ρl/A = ${fmt(R, 'Ω')}`);
    story = end ? 'Joined end to end, the slabs are one slab twice as long: in series, R doubles' : 'Joined side by side, the slabs are one slab with twice the area: in parallel, R halves';
    second = 'R = ρl/A: resistance grows with length and falls with area'; anchors.slab = [cx, cy];
  } else if (s.show === 'wire') {
    const rho = s.rho ?? 1.7e-8, l = s.l ?? 1, A = s.A ?? 1e-6, R = rho * l / A, V = s.V ?? 1, I = V / R, J = I / A, ls = s.lspan ?? l, as = s.aspan ?? A;
    const w = bw * .78 * l / ls, h = bh * .5 * Math.sqrt(A / as), x0 = cx - w / 2, y0 = cy - h / 2; dur = 8;
    props.push({id: 'slab', type: 'rect', x: x0, y: y0, w, h, r: 6 * k, style: {fill: 'faint', stroke: 'muted', width: 3 * k}} as Prop);
    const count = Math.max(2, Math.min(10, Math.round(h / (24 * k))));
    for (let i = 0; i < count; i++) { const y = y0 + h * (i + .5) / count; arrow([x0 + w * .08, y], [x0 + w * .92, y], 'accent', 3, on(1, 2)); }
    label(cx, y0 + h + 40 * k, 'l', 'muted', 28); label(x0 - 28 * k, cy + 8 * k, 'A', 'muted', 28);
    facts.push(`R = ρl/A = ${fmt(R, 'Ω')}`, `J = I/A = ${fmt(J, 'A/m²')}, E = ρJ = ${fmt(rho * J, 'V/m')}`, `σ = 1/ρ = ${fmt(1 / rho, 'S/m')}`);
    story = 'R grows with the length and falls with the area; ρ belongs to the material'; second = 'J = σE: the same law, point by point inside the material'; anchors.slab = [cx, cy]; anchors.end = [x0 + w, cy];
  } else if (s.show === 'iv') {
    const kind = s.kind ?? 'ohmic', x0 = cx - bw * .4, W = bw * .8, y0 = cy + bh * .4, h = bh * .8, mid = kind === 'diode'; dur = 7;
    axes(x0, y0, W, h, kind === 'gaas' ? 'V' : 'V', 'I', mid);
    const f: Record<string, (u: number) => number> = {ohmic: u => u, nonlinear: u => u < .6 ? u : .6 + (1 - Math.exp(-(u - .6) * 3)) * .25, diode: u => u < 0 ? -.015 : .01 * (Math.exp(u * 4.6) - 1), gaas: u => .7 * u + .2 * Math.sin(2.5 * Math.PI * u)};
    const pts: P2[] = Array.from({length: 81}, (_, i) => { const u = mid ? -1 + 2 * i / 80 : i / 80, v = f[kind](u); return mid ? [x0 + W / 2 + u * W / 2, y0 - h / 2 - v * h / 2] : [x0 + u * W * .95, y0 - v * h * .92] as P2; });
    poly(pts, 'accent', 5, on(.8, 3.2));
    const words: Record<string, [string, string]> = {ohmic: ['A straight line through the origin: V/I is one R for every V', 'Metals at steady temperature behave like this'], nonlinear: ['At large currents the wire heats, and the line bends', 'V/I now depends on V: the dashed law fails'], diode: ['The current depends on the sign of V: forward it flows, reverse almost none', 'A diode: a one-way valve, and no single R describes it'], gaas: ['One current can come at more than one V: V is not fixed by I', 'Gallium arsenide: a falling stretch, more V and less I']};
    if (kind === 'nonlinear') poly([[x0, y0], [x0 + W * .95, y0 - h * .92]], 'muted', 2, {}, true);
    [story, second] = words[kind]; facts.push(`V–I curve: ${kind}`);
  } else if (s.show === 'resistivity') {
    const kind = s.kind ?? 'metal', x0 = cx - bw * .4, W = bw * .8, y0 = cy + bh * .38, h = bh * .76, T0 = s.T0 ?? 27, T = s.T ?? 300; dur = 7;
    axes(x0, y0, W, h, 'T', 'ρ');
    const alpha = s.alpha ?? (kind === 'metal' ? 3.9e-3 : 1.7e-4), rho0 = s.rho ?? (kind === 'metal' ? 1.7e-8 : kind === 'alloy' ? 1e-6 : 0.46);
    const f = kind === 'semiconductor' ? (u: number) => .9 * Math.exp(-3.5 * u) + .03 : kind === 'alloy' ? (u: number) => .55 + .08 * u : (u: number) => (u < .15 ? .05 + .02 * u : .05 + .75 * (u - .12));
    poly(Array.from({length: 61}, (_, i) => [x0 + W * i / 60 * .95, y0 - f(i / 60) * h] as P2), 'accent', 5, on(.8, 3));
    label(x0 + W * .42, y0 - f(.5) * h - 44 * k, kind === 'metal' ? 'metal' : kind === 'alloy' ? 'nichrome' : 'semiconductor', 'accent', 26, {show: [3, 1e9]});
    if (kind !== 'semiconductor') facts.push(`ρ at ${T} °C = ρ₀[1 + α(T − T₀)] = ${fmt(rho0 * (1 + alpha * (T - T0)), 'Ω m')}`, `α = ${fmt(alpha, '/°C')}, ρ₀ = ${fmt(rho0, 'Ω m')} at ${T0} °C`);
    else facts.push(`ρ = ${fmt(rho0, 'Ω m')} near ${T0} °C, and it falls as T rises`);
    [story, second] = kind === 'metal' ? ['Hotter ions scatter electrons more often: ρ rises almost in a line', 'Only near absolute zero does the curve flatten'] : kind === 'alloy' ? ['An alloy changes very little with temperature', 'Why standard resistors are made of nichrome and manganin'] : ['More carriers are freed as T rises, so ρ falls fast', 'The opposite of a metal: here α is negative'];
  } else if (s.show === 'transmission') {
    const P = s.P ?? 6e5, Rc = s.Rc ?? 4, V1 = s.V ?? 220, V2 = s.V2 ?? 22000, loss = (v: number) => P * P * Rc / (v * v), both = [V1, V2], top = Math.max(...both.map(loss)); dur = 8;
    both.forEach((v, i) => {
      const y = by + bh * (.22 + i * .46), x0 = bx + bw * .05, x1 = bx + bw * .95, pc = loss(v), I = P / v, wd = 2 + 10 * Math.min(1, pc / top), bar = (x1 - x0) * .6 * Math.min(1, pc / P);
      line([x0, y], [x1, y], 'accent', wd, on(.6 + i, 1.6 + i));
      label(x0 + 40 * k, y - 22 * k, `${num ? fmt(v, 'V') : (i ? 'high V' : 'low V')}`, 'ink', 26);
      if (num) label(x1 - 110 * k, y - 22 * k, `I = ${fmt(I, 'A')}`, 'muted', 24);
      props.push({id: `bar${i}`, type: 'rect', x: x0, y: y + 22 * k, w: Math.max(2 * k, bar), h: 26 * k, style: {fill: 'bad'}, show: [1.4 + i, 1e9]} as Prop);
      label(x0 + Math.max(2 * k, bar) + 130 * k, y + 44 * k, 'lost in the cables', 'muted', 22, {show: [1.8 + i, 1e9]});
      facts.push(`at ${fmt(v, 'V')}: I = P/V = ${fmt(I, 'A')}, Pc = I²Rc = ${fmt(pc, 'W')}`);
    });
    facts.push(`P = ${fmt(P, 'W')}, Rc = ${fmt(Rc, 'Ω')}`);
    story = 'The same power at a higher voltage needs less current, and cable loss goes as I²'; second = 'Pc = P²Rc/V²: the loss falls as the square of the line voltage';
  } else if (s.show === 'cell') {
    const emf = s.emf ?? 1.5, r = s.r ?? .5, R = s.R ?? 2.5, I = emf / (R + r), V = emf - I * r, Imax = emf / Math.max(r, 1e-6); dur = 8;
    const lw = bw * .46, x0 = bx + bw * .02, x1 = x0 + lw, yt = cy - bh * .24, yb = cy + bh * .24;
    cell([x0, yb], [x0 + lw * .4, yb]); zig([x0 + lw * .4, yb], [x1, yb], 'r', 'bad'); line([x1, yb], [x1, yt], 'muted', 3); line([x0, yb], [x0, yt], 'muted', 3); zig([x0, yt], [x1, yt], 'R', 'accent');
    props.push({id: 'dashed', type: 'rect', x: x0 - 8 * k, y: yb - 46 * k, w: lw + 16 * k, h: 92 * k, r: 8 * k, style: {stroke: 'muted', width: 2 * k, fill: 'none', dash: [10 * k, 8 * k]}} as Prop);
    label(x0 + lw / 2, yb + 94 * k, 'inside the cell', 'muted', 22); arrow([x0 + lw * .3, yt - 44 * k], [x0 + lw * .7, yt - 44 * k], 'good', 4, on(1, 2)); label(x0 + lw / 2, yt - 58 * k, 'I', 'good', 26, {show: [1.6, 1e9]});
    const gx = bx + bw * .58, gw = bw * .38, gy = cy + bh * .36, gh = bh * .68, top = emf * 1.05, reach = Math.min(1, I / Imax);
    axes(gx, gy, gw, gh, 'I', 'V');
    const PX = (x: number) => gx + gw * x, PY = (v: number) => gy - gh * v / top;
    line([PX(0), PY(emf)], [PX(.95), PY(emf * .05)], 'accent', 4, on(1.5, 3));
    label(gx + 34 * k, PY(emf) - 12 * k, 'ε', 'accent', 28, {show: [2, 1e9]});
    const dot = (t: number) => Math.min(1, Math.max(0, (t - 3) / 2)) * reach * .95 / (.95);
    props.push({id: 'op', type: 'circle', x: PX(0), y: PY(emf), r: 11 * k, style: {fill: 'ink'}, layer: 3, show: [3, 1e9], keys: {x: keysOf(dur, t => PX(dot(t))), y: keysOf(dur, t => PY(emf * (1 - dot(t))))}} as Prop);
    anchors.point = [PX(reach), PY(V)]; anchors.origin = [PX(0), PY(0)];
    facts.push(`I = ε/(R + r) = ${fmt(I, 'A')}`, `V = ε − Ir = ${fmt(V, 'V')}`, `lost inside the cell: Ir = ${fmt(I * r, 'V')}`);
    story = 'Current through the cell drops some of the emf inside it: V = ε − Ir'; second = 'V equals ε only when no current flows; the line meets I = ε/r at a short circuit';
  } else if (s.show === 'cells') {
    // equivalent false: only the joined cells, for a passage that has not yet replaced them by one (2026-11-03: the
    // Class 12 cells film had nothing that showed two cells joined at A, B and C without the answer)
    const cs = s.cells ?? [{e: 1.5, r: .5}, {e: 1.5, r: .5}], kind = s.kind ?? 'series', eq = combineCells(cs, kind), n = cs.length, x0 = bx + bw * .08, x1 = bx + bw * .92;
    const whole = s.equivalent ?? true, T1 = whole ? 4.8 : 1e9; dur = whole ? 9 : 5;
    const early = {show: [0, T1] as [number, number]}, late = {show: [T1, 1e9] as [number, number]};
    const dot = (p: P2, name: string, dy: number) => { props.push({id: `j-${name}`, type: 'circle', x: p[0], y: p[1], r: 8 * k, style: {fill: 'accent'}, layer: 4, ...early} as Prop); label(p[0], p[1] + dy * k, name, 'accent', 26, early); anchors[name] = p; };
    if (kind === 'series') {
      const y = cy, step = (x1 - x0) / n;
      cs.forEach((c, i) => { const a: P2 = [x0 + step * i, y], b: P2 = [x0 + step * (i + 1), y]; c.e >= 0 ? cell(a, b, 'ink', early) : cell(b, a, 'bad', early); label((a[0] + b[0]) / 2, y + 76 * k, num ? `${+c.e.toPrecision(3)} V, ${+c.r.toPrecision(3)} Ω` : `ε${i + 1}, r${i + 1}`, 'ink', 24, early); });
      for (let i = 0; i <= n; i++) dot([x0 + step * i, y], String.fromCharCode(65 + i), -40);
    } else {
      const pitch = bh * .62 / Math.max(n - 1, 1), ys = cs.map((_, i) => cy - bh * .31 + pitch * i);
      ys.forEach((y, i) => { cs[i].e >= 0 ? cell([x0, y], [x1, y], 'ink', early) : cell([x1, y], [x0, y], 'bad', early); label(cx + 130 * k, y - 16 * k, num ? `${+cs[i].e.toPrecision(3)} V, ${+cs[i].r.toPrecision(3)} Ω` : `ε${i + 1}, r${i + 1}`, 'ink', 24, early); });
      line([x0, ys[0]], [x0, ys[n - 1]], 'muted', 3, early); line([x1, ys[0]], [x1, ys[n - 1]], 'muted', 3, early);
      dot([x1, ys[0]], 'B₁', -24); dot([x0, ys[0]], 'B₂', -24);   // the long plate, +, faces x1: the book's B₁ joins the positives
    }
    if (whole) cell([x0, cy], [x1, cy], 'good', late);
    if (whole) label(cx, cy + 76 * k, num ? `ε = ${+eq.e.toPrecision(3)} V, r = ${+eq.r.toPrecision(3)} Ω` : 'one equivalent cell', 'good', 28, late);
    if (whole) facts.push(`εeq = ${fmt(eq.e, 'V')}`, `req = ${fmt(eq.r, 'Ω')}`);
    else facts.push(`${n} cells joined in ${kind}`);
    [story, second] = !whole ? (kind === 'series' ? ['Cells joined end to end: the negative of one to the positive of the next', 'The junctions A, B, C… mark where each cell starts and ends'] : (cs.some(c => c.e < 0) ? ['Cells side by side between B₁ and B₂, one turned round: its negative end meets the others\' positive ends at B₁', 'Each cell is its own branch between the same two points'] : ['Cells side by side: their positive ends joined at B₁, their negative ends at B₂', 'Each cell is its own branch between the same two points'])) : kind === 'series' ? ['In series the emfs add with their signs, and so do the internal resistances', 'A cell turned round takes its emf away, but its r still adds'] : ['In parallel: εeq/req is the sum of ε/r, and req is smaller than any one r',   // no digit: an illustrative scene keeps it
      cs.every(c => c.e === cs[0].e && c.r === cs[0].r) ? 'Equal cells keep ε and share the current, with a smaller r'
        : cs.some(c => c.e < 0) ? 'A cell turned round counts with its sign: the pair\'s emf falls' : 'Unequal cells: εeq lies between their emfs, nearer that of the cell with the smaller r'];
    anchors.cell = [cx, cy];
  } else if (s.show === 'kirchhoff') {
    const bs = s.branches ?? [{e: 10, R: 2}, {R: 4}, {e: 5, R: 2}], {V, I} = solveBranches(bs), xs = [cx - bw * .36, cx, cx + bw * .36], yt = cy - bh * .36, yb = cy + bh * .36, top = Math.max(...I.map(Math.abs)); dur = 10;
    line([xs[0], yt], [xs[2], yt], 'muted', 3); line([xs[0], yb], [xs[2], yb], 'muted', 3);
    bs.forEach((b, i) => {
      const x = xs[i], m = cy + bh * .02, name = b.name ?? `R${i + 1}`, up = I[i] >= 0;
      if (b.e) { cell([x, yb], [x, m + 40 * k]); zig([x, m + 40 * k], [x, yt + 50 * k], '', 'ink'); line([x, yt + 50 * k], [x, yt], 'muted', 3); label(x + 54 * k, m + 96 * k, num ? `${+b.e.toPrecision(3)} V` : `ε${i + 1}`, 'ink', 24); }
      else { line([x, yb], [x, m + 40 * k], 'muted', 3); zig([x, m + 40 * k], [x, yt + 50 * k], '', 'ink'); line([x, yt + 50 * k], [x, yt], 'muted', 3); }
      label(x + 62 * k, m - 40 * k, num ? `${+b.R.toPrecision(3)} Ω` : name, 'ink', 24);
      const a0 = yt + 34 * k, a1 = yt + 4 * k + 0, wd = 2 + 6 * Math.abs(I[i]) / (top || 1);
      arrow([x - 34 * k, up ? a0 + 40 * k : a0], [x - 34 * k, up ? a0 : a0 + 40 * k], 'good', wd, {show: [2, 1e9]});
      label(x - 76 * k, a0 + 30 * k, num ? `${+Math.abs(I[i]).toPrecision(3)} A` : `I${i + 1}`, 'good', 24, {show: [2.2, 1e9]}); void a1;
    });
    props.push({id: 'junction', type: 'circle', x: xs[1], y: yt, r: 12 * k, style: {fill: 'accent'}, layer: 3, show: [3, 1e9]} as Prop);
    label(xs[1], yt - 24 * k, 'in = out', 'accent', 26, {show: [3.2, 1e9]});
    const route: P2[] = [[xs[0], yb], [xs[0], yt], [xs[1], yt], [xs[1], yb], [xs[0], yb]], T0 = 5, T1 = 9.2, walk = (t: number, c: 0 | 1) => { const f = Math.min(1, Math.max(0, (t - T0) / (T1 - T0))) * 4, i = Math.min(3, Math.floor(f)), u = f - i; return route[i][c] + (route[i + 1][c] - route[i][c]) * u; };
    props.push({id: 'walker', type: 'circle', x: route[0][0], y: route[0][1], r: 11 * k, style: {fill: 'bad', stroke: 'ink', width: 2 * k}, layer: 4, show: [T0, 1e9], keys: {x: keysOf(dur, t => walk(t, 0)), y: keysOf(dur, t => walk(t, 1))}} as Prop);
    anchors.junction = [xs[1], yt]; anchors.left = [xs[0], cy]; anchors.middle = [xs[1], cy]; anchors.right = [xs[2], cy];
    facts.push(...I.map((x, i) => `I${i + 1} = ${fmt(Math.abs(x), 'A')} ${x >= 0 ? 'up' : 'down'}`), `V across the junctions = ${fmt(V, 'V')}`);
    story = 'Junction rule: the current in equals the current out. Charge does not pile up'; second = 'Loop rule: walking any closed loop, the rises and drops add to zero';
  } else {
    const R1 = s.R1 ?? 100, R2 = s.R2 ?? 10, R3 = s.R3 ?? 300, R4 = s.R4 ?? 30, Rg = s.Rg ?? 50, emf = s.emf ?? 10, sol = solveBridge(emf, R1, R2, R3, R4, Rg), Ig = sol.Ig, gmax = s.gmax ?? Math.max(Math.abs(Ig), 1e-6) * 1.2, balanced = Math.abs(Ig) < 1e-9; dur = 8;
    const a = Math.min(bw * .4, bh * .4 * 1.2), h = bh * .38, A: P2 = [cx - a, cy], C: P2 = [cx + a, cy], B: P2 = [cx, cy - h], D: P2 = [cx, cy + h], R = 34 * k;
    const arm = (p: P2, q: P2, ohms: number, n: string) => {
      zig(p, q, num ? `${+ohms.toPrecision(3)} Ω` : `R${n}`);
      if (s.currents) { const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy); label((p[0] + q[0]) / 2 + dy / L * 44 * k, (p[1] + q[1]) / 2 - dx / L * 44 * k + 8 * k, `I${n}`, 'good', 24); }
    };
    arm(A, B, R2, '₂'); arm(B, C, R4, '₄'); arm(C, D, R3, '₃'); arm(D, A, R1, '₁');
    const G: P2 = [cx, cy]; line(B, [cx, cy - R], 'muted', 3); line([cx, cy + R], D, 'muted', 3);
    props.push({id: 'gal', type: 'circle', x: G[0], y: G[1], r: R, style: {fill: 'paper', stroke: 'ink', width: 3 * k}, layer: 3} as Prop);
    const reach = Math.max(-1, Math.min(1, Ig / gmax)), Lg = R * .8, angle = (t: number) => reach * Math.min(1, Math.max(0, (t - 1) / 1.2)) * 1.1;
    props.push({id: 'needle', type: 'line', x1: G[0], y1: G[1] + R * .4, x2: G[0], y2: G[1] - Lg, style: {stroke: balanced ? 'good' : 'bad', width: 4 * k}, layer: 4, keys: {x2: keysOf(dur, t => G[0] + Lg * Math.sin(angle(t))), y2: keysOf(dur, t => G[1] + R * .4 - (Lg + R * .4) * Math.cos(angle(t)))}} as Prop);
    label(G[0] + R + 26 * k, G[1] + 8 * k, 'G', 'muted', 26);
    const ey = cy + h + 54 * k; line([A[0], A[1]], [A[0], ey], 'muted', 3); line([C[0], C[1]], [C[0], ey], 'muted', 3); cell([C[0], ey], [A[0], ey]);
    label(A[0] - 24 * k, A[1] + 8 * k, 'A', 'ink', 24); label(C[0] + 24 * k, C[1] + 8 * k, 'C', 'ink', 24); label(B[0], B[1] - 18 * k, 'B', 'ink', 24); label(D[0] + 24 * k, D[1] + 24 * k, 'D', 'ink', 24);
    label(cx - R - 76 * k, cy + 8 * k, balanced ? 'no current' : s.currents ? 'Ig' : '', balanced ? 'good' : 'accent', 22, {show: [2.4, 1e9]});
    anchors.G = G; anchors.needle = [G[0] + Lg * reach, G[1]];
    facts.push(balanced ? 'Balanced: no current through G' : `Ig = ${fmt(Math.abs(Ig), 'A')} from ${Ig > 0 ? 'B to D' : 'D to B'}`, `balance needs R₄ = R₂R₃/R₁ = ${fmt(R2 * R3 / R1, 'Ω')}`, `VB = ${fmt(sol.VB, 'V')}, VD = ${fmt(sol.VD, 'V')}`);
    story = 'B and D at one potential: no current through the galvanometer'; second = 'Balance: R₂/R₁ = R₄/R₃, whatever the cell and whatever G';
    if (!balanced) story = 'B and D differ in potential, so a current crosses the galvanometer';
  }
  return finish('current', s as never, dur, story, second, facts, anchors, s.illustrative);
}

/** Compared wires share one length and area scale, so a longer wire looks longer. */
export function shareCurrentScale(specs: unknown[]) {
  const wires = (specs as CurrentSpec[]).filter(s => s?.verb === 'current' && s.show === 'wire');
  if (wires.length < 2) return;
  const ls = Math.max(...wires.map(s => s.l ?? 1)), as = Math.max(...wires.map(s => s.A ?? 1e-6));
  for (const s of wires) { s.lspan = ls; s.aspan = as; }
}
