// Kinetic theory (NCERT Class 11 Physics, Ch. 12; 2026-10-31). kinetic_gas, every number computed from the book's formulas:
// - box: molecules flying and bouncing, their speeds scattered about v_rms = √(3k_BT/m), drawn to one scale (`window`).
// - pressure: one molecule between walls; Δp = 2mv, P = ⅓nm⟨v²⟩ (N₂ at 300 K: 516 m/s).
// - speeds: v_rms of several gases at T as bars, lighter is faster (Ar : Cl₂ = 1.33).
// - freedom: a molecule's degrees of freedom, ½k_BT each; Cᵥ, Cₚ, γ (Table 12.1: 12.5, 20.8, 1.67; 20.8, 29.1, 1.40; 24.93, 33.24, 1.33).
// - solid: atoms vibrating in a lattice, U = 3RT, C = 3R against Table 12.3.
// - mixture: two gases in one box; Dalton's law, P = (μ₁ + μ₂)RT/V.
// - free_path: a zigzag among molecules; l = 1/(√2 nπd²), τ = l/⟨v⟩. The book's estimate of 2.9 × 10⁻⁷ m uses l = 1/(nπd²): `simple` gives it.
// Molecules can't be drawn to size or at their real speed, so the panel says what is to scale; a box's speeds keep one ratio.
import type {Prop, Scene} from '../scene.ts';
import {kit} from './fluids.ts';
import {num} from './thermal.ts';

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const R_GAS = 8.31, KB = 1.38e-23, NA = 6.02e23;
type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};

/** Molar mass, g/mol (the book's: N₂ 28, Ar 39.9, Cl₂ 70.9). */
export const GASES: Record<string, number> = {hydrogen: 2.02, helium: 4, neon: 20.2, nitrogen: 28, oxygen: 32, air: 28.8, argon: 39.9, 'carbon dioxide': 44, chlorine: 70.9, 'uranium-235 hexafluoride': 349, 'uranium-238 hexafluoride': 352};
/** Table 12.3, J mol⁻¹ K⁻¹. */
export const SOLIDS: Record<string, number> = {aluminium: 24.4, carbon: 6.1, copper: 24.5, lead: 26.5, silver: 25.5, tungsten: 24.9};
export const KINETIC_KINDS = ['box', 'pressure', 'speeds', 'freedom', 'solid', 'mixture', 'free_path'] as const;
export type KineticSpec = Common & {verb: 'kinetic_gas'; kind: (typeof KINETIC_KINDS)[number]; gas?: string; gases?: string[]; M?: number; T?: number; n?: number; P?: number;
  /** The speed that fills the scale, m/s: fixed, so temperatures and gases can be compared. */
  window?: number; atoms?: 'mono' | 'di' | 'poly'; vibration?: number; solids?: string[]; mu?: [number, number]; V?: number; d?: number; v?: number; simple?: boolean};

const molar = (s: KineticSpec, name = s.gas) => (name ? GASES[name.toLowerCase()] : undefined) ?? s.M ?? 28;
const rms = (T: number, M: number) => Math.sqrt(3 * R_GAS * T / (M * 1e-3));

export function kineticErrors(s: KineticSpec): string[] {
  const e: string[] = [], v = 'kinetic_gas';
  if (!KINETIC_KINDS.includes(s.kind)) return [`${v}: kind is one of ${KINETIC_KINDS.join(', ')}`];
  const known = (g: unknown) => typeof g === 'string' && g.toLowerCase() in GASES;
  if (s.gas !== undefined && !known(s.gas)) e.push(`${v}: gas is one of ${Object.keys(GASES).join(', ')}, or give M, the molar mass in g/mol`);
  if (s.T !== undefined && !(isNum(s.T) && s.T > 0)) e.push(`${v}: T is the absolute temperature in K, above 0`);
  if (s.M !== undefined && !(isNum(s.M) && s.M > 0)) e.push(`${v}: M is the molar mass in g/mol`);
  if (s.window !== undefined && !(isNum(s.window) && s.window > 0)) e.push(`${v}: window is the top speed of the scale, m/s`);
  if (s.kind === 'speeds') {
    if (s.gases !== undefined && (!Array.isArray(s.gases) || !s.gases.length || s.gases.length > 5 || !s.gases.every(known))) e.push(`${v}: gases is a list of up to 5 from ${Object.keys(GASES).join(', ')}`);
    if (s.window !== undefined && (s.gases ?? ['nitrogen', 'oxygen']).some(g => rms(s.T ?? 300, GASES[g.toLowerCase()] ?? 28) > s.window!)) e.push(`${v}: a gas's speed passes window: widen it`);
  }
  if (s.kind === 'freedom') {
    if (s.atoms !== undefined && !['mono', 'di', 'poly'].includes(s.atoms)) e.push(`${v}: atoms is mono, di or poly`);
    if (s.vibration !== undefined && !(Number.isInteger(s.vibration) && s.vibration >= 0 && s.vibration <= 6)) e.push(`${v}: vibration is the number of vibrational modes, 0 to 6`);
    if (s.atoms === 'mono' && s.vibration) e.push(`${v}: a single atom has no vibrational mode`);
  }
  if (s.kind === 'solid' && s.solids !== undefined && (!Array.isArray(s.solids) || !s.solids.length || s.solids.length > 6 || !s.solids.every(g => typeof g === 'string' && g.toLowerCase() in SOLIDS))) e.push(`${v}: solids is a list from ${Object.keys(SOLIDS).join(', ')}`);
  if (s.kind === 'mixture' && s.mu !== undefined && !(Array.isArray(s.mu) && s.mu.length === 2 && s.mu.every(m => isNum(m) && m > 0))) e.push(`${v}: mu is [moles of the first gas, moles of the second]`);
  if (s.V !== undefined && !(isNum(s.V) && s.V > 0)) e.push(`${v}: V is the volume in m³`);
  if (s.d !== undefined && !(isNum(s.d) && s.d > 0 && s.d < 1e-8)) e.push(`${v}: d is the molecular diameter in m, such as 2e-10`);
  if (s.n !== undefined && !(isNum(s.n) && s.n > 0)) e.push(`${v}: n is the number of molecules per m³`);
  return e;
}

/** A repeatable random number: a scene must draw the same every time. */
function lcg(seed: number) { let x = seed; return () => (x = (x * 16807) % 2147483647) / 2147483647; }

/** Keys for a point flying at (vx, vy) and bouncing inside the box. */
function bounce(x0: number, y0: number, vx: number, vy: number, box: [number, number, number, number], T: number) {
  const xs: [number, number][] = [[0, x0]], ys: [number, number][] = [[0, y0]];
  let x = x0, y = y0, t = 0, ax = vx, ay = vy, guard = 0;
  while (t < T && guard++ < 200) {
    const tx = ax > 0 ? (box[2] - x) / ax : ax < 0 ? (box[0] - x) / ax : Infinity, ty = ay > 0 ? (box[3] - y) / ay : ay < 0 ? (box[1] - y) / ay : Infinity, dt = Math.min(tx, ty, T - t);
    x += ax * dt; y += ay * dt; t += dt;
    xs.push([t, x]); ys.push([t, y]);
    if (dt === tx) ax = -ax;
    if (dt === ty) ay = -ay;
  }
  return {x: xs, y: ys};
}

/** Molecules in a box: speeds scattered about rms px/s, one scale; returns nothing, draws in place. */
function swarm(c: ReturnType<typeof kit>, id: string, box: [number, number, number, number], count: number, rmsPx: number, T: number, fill: string, seed: number, r: number) {
  const rand = lcg(seed), inner: [number, number, number, number] = [box[0] + r, box[1] + r, box[2] - r, box[3] - r];
  for (let i = 0; i < count; i += 1) {
    const u = Math.sqrt(-2 * Math.log(Math.max(rand(), 1e-6))) * 0.82, a = rand() * 2 * Math.PI;
    const k = bounce(inner[0] + rand() * (inner[2] - inner[0]), inner[1] + rand() * (inner[3] - inner[1]), Math.cos(a) * u * rmsPx, Math.sin(a) * u * rmsPx, inner, T);
    c.props.push({id: `${id}${i}`, type: 'circle', x: k.x[0][1], y: k.y[0][1], r, style: {fill}, layer: 4, keys: {x: k.x, y: k.y}} as unknown as Prop);
  }
}

function bars(c: ReturnType<typeof kit>, rows: [string, number, string][], top: number, x0: number, x1: number, base: number, ceil: number, unit: (v: number) => string) {
  const {k, rect, label} = c, w = (x1 - x0) / rows.length, h = (v: number) => (base - top) * v / ceil;
  rows.forEach(([name, v, fill], i) => {
    const bx = x0 + w * (i + 0.2), bw = w * 0.6;
    rect(`bar${i}`, bx, base - h(v), bw, h(v), {fill, opacity: 0.85}, {show: [0.4 + i * 0.5, 1e9], fade: 0.4} as never);
    label(`barn${i}`, bx + bw / 2, base + 34 * k, name, {align: 'middle', style: {fill: 'ink'}});
    if (!c.ill) label(`barv${i}`, bx + bw / 2, base - h(v) - 14 * k, unit(v), {align: 'middle', style: {fill}, show: [0.4 + i * 0.5, 1e9]});
    c.anchors[`bar${i}`] = [bx + bw / 2, base - h(v)];
  });
  c.seg('base', x0, base, x1, base, {stroke: 'ink', width: 3 * k});
  return h;
}

export function kineticGas(s: KineticSpec): Scene {
  const c = kit(s), {k, bx0, bx1, by0, by1, bw, bh, ill, facts, line, label, rect, seg, arrow, anchors, end} = c;
  const T = s.T ?? 300, M = molar(s), name = s.gas ?? (s.M ? 'the gas' : 'nitrogen'), note: [number, number] = c.narrow ? [bx0 + 0.1 * bw, c.H - 60 * k] : [bx1 + 20 * k, by1 - 60 * k];
  const box: [number, number, number, number] = [bx0 + 0.08 * bw, by0 + 0.06 * bh, bx0 + 0.92 * bw, by1 - 0.06 * bh];
  const walls = (b = box) => rect('walls', b[0], b[1], b[2] - b[0], b[3] - b[1], {stroke: 'ink', width: 4 * k});
  const m = M * 1e-3 / NA;

  if (s.kind === 'box') {
    const v = rms(T, M), scale = (s.window ?? Math.max(v, 516) * 1.25), px = 0.32 * bw * v / scale, dur = 6;
    walls();
    swarm(c, 'm', box, 28, px, dur, 'cool', 7, 9 * k);
    anchors.box = [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
    line('l1', `${name[0].toUpperCase()}${name.slice(1)} at ${ill ? 'temperature T' : `${num(T)} K`}`, 0.3, {weight: 700});
    line('l2', 'Molecules fly straight between collisions, in every direction, at many speeds', 1.0);
    if (!ill) line('l3', `v_rms = √(3k_BT/m) = ${num(v)} m/s`, 2.2, {weight: 700, style: {fill: 'accent'}});
    line('l4', 'Average kinetic energy: (3/2)k_BT, whatever the gas', 3.0, {style: {fill: 'cool'}});
    line('l5', 'Speeds are to one scale, far slower than real; size not to scale', 3.8, {style: {fill: 'muted'}});
    facts.push(`v_rms = ${num(v)} m/s at ${num(T)} K`, `average kinetic energy per molecule = ${num(1.5 * KB * T)} J`, `mass of a molecule = ${num(m)} kg`);
    return end('kinetic_gas', dur, {v_rms: v, KE: 1.5 * KB * T, m, labelAt: {box: note}});
  }

  if (s.kind === 'pressure') {
    const v = rms(T, M), P0 = s.P ?? 1.013e5, n = s.n ?? P0 / (KB * T), P = n * m * v * v / 3, cy = (box[1] + box[3]) / 2, x0 = box[0] + 40 * k, x1 = box[2] - 40 * k, per = 1.6, r = 22 * k;
    walls();
    rect('wall', box[2] - 8 * k, box[1], 16 * k, box[3] - box[1], {fill: 'accent', opacity: 0.7});
    const xs: [number, number][] = [];
    for (let i = 0; i <= 4; i += 1) xs.push([i * per, i % 2 ? x1 - r : x0]);
    c.props.push({id: 'mol', type: 'circle', x: x0, y: cy, r, style: {fill: 'cool', stroke: 'ink', width: 2 * k}, layer: 5, keys: {x: xs}} as unknown as Prop);
    arrow('in', x1 - 190 * k, cy - 60 * k, x1 - 40 * k, cy - 60 * k, 'cool', {show: [0.4, 1e9], fade: 0.3}); label('lin', x1 - 190 * k, cy - 76 * k, '+mv before', {style: {fill: 'cool'}, show: [0.4, 1e9]});
    arrow('out', x1 - 40 * k, cy + 60 * k, x1 - 190 * k, cy + 60 * k, 'bad', {show: [1.8, 1e9], fade: 0.3}); label('lout', x1 - 190 * k, cy + 96 * k, '−mv after', {style: {fill: 'bad'}, show: [1.8, 1e9]});
    Object.assign(anchors, {wall: [box[2], cy], molecule: [(x0 + x1) / 2, cy], box: [(box[0] + box[2]) / 2, box[1] + 50 * k]});
    line('l1', 'Each elastic hit: the molecule\'s momentum changes by 2mv', 0.4, {weight: 700});
    line('l2', 'The wall takes 2mv; many hits a second make a steady force', 2.0);
    line('l3', 'P = (1/3) n m ⟨v²⟩', 3.0, {weight: 700, style: {fill: 'accent'}});
    if (!ill) line('l4', `${name}, ${num(T)} K: v_rms = ${num(v)} m/s, n = ${num(n)} m⁻³, P = ${num(P)} Pa`, 3.8, {style: {fill: 'cool'}});
    facts.push(`m = ${num(m)} kg, v_rms = ${num(v)} m/s, n = ${num(n)} per m³`, `P = ${num(P)} Pa`, `momentum change per hit at v_rms: ${num(2 * m * v)} kg m/s`);
    return end('kinetic_gas', 6.4, {v_rms: v, n, P, labelAt: {wall: [box[2] - 330 * k, box[1] + 50 * k]}});
  }

  if (s.kind === 'speeds') {
    const list = s.gases ?? (s.gas ? [s.gas] : ['nitrogen', 'oxygen']), vals = list.map(g => rms(T, GASES[g.toLowerCase()])), ceil = s.window ?? Math.max(...vals) * 1.15, tints = ['cool', 'accent', 'good', 'bad', 'figure'];
    const base = by1 - 0.14 * bh;
    bars(c, list.map((g, i) => [g, vals[i], tints[i % 5]] as [string, number, string]), by0 + 0.08 * bh, bx0 + 0.06 * bw, bx0 + 0.94 * bw, base, ceil, v => `${num(v)} m/s`);
    line('l1', `v_rms = √(3RT/M)${ill ? '' : `, at ${num(T)} K`}`, 0.2, {weight: 700});
    line('l2', 'Same temperature, same average kinetic energy: lighter molecules move faster', 1.6, {style: {fill: 'cool'}});
    if (!ill && vals.length > 1) line('l3', `${list[0]} : ${list[1]} = ${num(vals[0] / vals[1])}`, 2.8, {weight: 700, style: {fill: 'accent'}});
    facts.push(...list.map((g, i) => `${g}: v_rms = ${num(vals[i])} m/s at ${num(T)} K`));
    return end('kinetic_gas', 4.6, {speeds: Object.fromEntries(list.map((g, i) => [g, vals[i]])), labelEnd: bx1});
  }

  if (s.kind === 'freedom') {
    const atoms = s.atoms ?? 'di', vib = atoms === 'mono' ? 0 : s.vibration ?? 0, trans = 3, rot = atoms === 'mono' ? 0 : atoms === 'di' ? 2 : 3;
    const f = trans + rot + 2 * vib, Cv = f / 2 * R_GAS, Cp = Cv + R_GAS, g = Cp / Cv;
    const cx = bx0 + 0.3 * bw, cy = by0 + 0.34 * bh, r = 30 * k;
    const dots: [number, number][] = atoms === 'mono' ? [[cx, cy]] : atoms === 'di' ? [[cx - 60 * k, cy], [cx + 60 * k, cy]] : [[cx - 70 * k, cy + 40 * k], [cx + 70 * k, cy + 40 * k], [cx, cy - 70 * k]];
    dots.forEach((d, i) => {
      if (i) {
        const a = dots[i - 1];
        if (vib) { const pts: [number, number][] = [a]; for (let j = 1; j < 10; j += 1) { const t = j / 10, n: [number, number] = [-(d[1] - a[1]), d[0] - a[0]], L = Math.hypot(n[0], n[1]) || 1; pts.push([a[0] + (d[0] - a[0]) * t + (j % 2 ? 1 : -1) * n[0] / L * 12 * k, a[1] + (d[1] - a[1]) * t + (j % 2 ? 1 : -1) * n[1] / L * 12 * k]); } pts.push(d); c.props.push({id: `bond${i}`, type: 'polyline', points: pts, style: {stroke: 'ink', width: 3 * k}, layer: 3} as unknown as Prop); }
        else seg(`bond${i}`, a[0], a[1], d[0], d[1], {stroke: 'ink', width: 6 * k});
      }
      if (atoms === 'poly' && i === 2 && !vib) seg('bond3', d[0], d[1], dots[0][0], dots[0][1], {stroke: 'ink', width: 6 * k});
      c.props.push({id: `atom${i}`, type: 'circle', x: d[0], y: d[1], r, style: {fill: 'cool', stroke: 'ink', width: 2 * k}, layer: 5} as unknown as Prop);
    });
    arrow('tx', cx + 130 * k, cy, cx + 240 * k, cy, 'accent', {show: [0.6, 1e9], fade: 0.3}); arrow('ty', cx, cy - 110 * k, cx, cy - 190 * k, 'accent', {show: [0.6, 1e9], fade: 0.3}); arrow('tz', cx - 130 * k, cy + 70 * k, cx - 200 * k, cy + 120 * k, 'accent', {show: [0.6, 1e9], fade: 0.3});
    const base = by1 - 0.09 * bh;
    bars(c, [['Cᵥ', Cv, 'cool'], ['Cₚ', Cp, 'accent']], by0 + 0.6 * bh, bx0 + 0.1 * bw, bx0 + 0.7 * bw, base, 50, v => `${num(v)}`);
    Object.assign(anchors, {molecule: [cx, cy]});
    line('l1', `${{mono: 'Monatomic', di: 'Diatomic', poly: 'Polyatomic'}[atoms]}: ${trans} translational, ${rot} rotational${vib ? `, ${vib} vibrational (counts twice)` : ''}`, 0.3, {weight: 700});
    line('l2', 'Equipartition: each quadratic energy term holds ½k_BT', 1.4);
    if (!ill) { line('l3', `U = (${f}/2)RT per mole; Cᵥ = ${num(Cv)}, Cₚ = ${num(Cp)} J mol⁻¹ K⁻¹`, 2.4, {style: {fill: 'cool'}}); line('l4', `γ = Cₚ/Cᵥ = ${num(g)}`, 3.2, {weight: 700, style: {fill: 'accent'}}); }
    facts.push(`energy terms f = ${f}`, `Cv = ${num(Cv)} J/(mol K), Cp = ${num(Cp)} J/(mol K)`, `gamma = ${num(g)}`);
    return end('kinetic_gas', 4.6, {f, Cv, Cp, gamma: g, labelAt: {molecule: note}});
  }

  if (s.kind === 'solid') {
    const list = s.solids ?? ['aluminium', 'copper', 'lead', 'silver', 'tungsten', 'carbon'], base = by1 - 0.09 * bh, top = by0 + 0.48 * bh, x0 = bx0 + 0.04 * bw, x1 = bx0 + 0.96 * bw, ceil = 32;
    const rand = lcg(11), gx = 6, gy = 3, lx = bx0 + 0.12 * bw, ly = by0 + 0.06 * bh, dx = 0.76 * bw / (gx - 1), dy = 0.26 * bh / (gy - 1);
    for (let i = 0; i < gx; i += 1) for (let j = 0; j < gy; j += 1) {
      const x = lx + i * dx, y = ly + j * dy, a = 8 * k, ph = rand() * 6.28, keys = Array.from({length: 25}, (_, q) => [q * 0.2, x + a * Math.sin(q * 0.2 * 9 + ph)]), keysY = Array.from({length: 25}, (_, q) => [q * 0.2, y + a * Math.cos(q * 0.2 * 7 + ph)]);
      if (i < gx - 1) seg(`hb${i}${j}`, x, y, x + dx, y, {stroke: 'muted', width: 2 * k});
      if (j < gy - 1) seg(`vb${i}${j}`, x, y, x, y + dy, {stroke: 'muted', width: 2 * k});
      c.props.push({id: `at${i}${j}`, type: 'circle', x, y, r: 13 * k, style: {fill: 'cool'}, layer: 5, keys: {x: keys, y: keysY}} as unknown as Prop);
    }
    const h = bars(c, list.map(n => [n, SOLIDS[n.toLowerCase()], 'accent'] as [string, number, string]), top, x0, x1, base, ceil, v => `${num(v)}`);
    const yR = base - h(3 * R_GAS);
    seg('three', x0, yR, x1, yR, {stroke: 'good', width: 3 * k, dash: [10 * k, 8 * k]} as never);
    label('l3r', x1, yR - 12 * k, ill ? '3R' : `3R = ${num(3 * R_GAS)}`, {align: 'end', style: {fill: 'good'}});
    Object.assign(anchors, {lattice: [lx + 2 * dx, ly + dy], line3R: [x1 - 40 * k, yR]});
    line('l1', 'Each atom vibrates in 3 directions: 3k_BT of energy', 0.3, {weight: 700});
    line('l2', 'U = 3RT per mole, so C = 3R, for any solid', 1.4, {style: {fill: 'cool'}});
    line('l4', 'Most metals agree; carbon falls far short, and the rule fails at low temperature', 2.6);
    facts.push(`3R = ${num(3 * R_GAS)} J/(mol K)`, ...list.map(n => `${n}: ${SOLIDS[n.toLowerCase()]} J/(mol K)`));
    return end('kinetic_gas', 4.8, {C: 3 * R_GAS, labelAt: {lattice: note}});
  }

  if (s.kind === 'mixture') {
    const [m1, m2] = s.mu ?? [2, 1], V = s.V ?? 0.1, P1 = m1 * R_GAS * T / V, P2 = m2 * R_GAS * T / V, P = P1 + P2, split = bx0 + 0.52 * bw, b2: [number, number, number, number] = [bx0 + 0.04 * bw, by0 + 0.06 * bh, split, by1 - 0.06 * bh], total = 36, n1 = Math.max(1, Math.round(total * m1 / (m1 + m2)));
    walls(b2);
    swarm(c, 'a', b2, n1, 0.2 * bw, 5, 'cool', 3, 8 * k); swarm(c, 'b', b2, total - n1, 0.2 * bw, 5, 'accent', 5, 8 * k);
    const base = by1 - 0.12 * bh, top = by0 + 0.08 * bh, x0 = split + 0.1 * bw, x1 = bx0 + 0.96 * bw, h = (v: number) => (base - top) * v / (P * 1.1), bw2 = x1 - x0;
    rect('p1', x0, base - h(P1), bw2 * 0.6, h(P1), {fill: 'cool', opacity: 0.85}, {show: [1, 1e9], fade: 0.4} as never);
    rect('p2', x0, base - h(P), bw2 * 0.6, h(P2), {fill: 'accent', opacity: 0.85}, {show: [2, 1e9], fade: 0.4} as never);
    seg('pb', x0 - 10 * k, base, x1, base, {stroke: 'ink', width: 3 * k});
    label('lp1', x0 + bw2 * 0.3, base - h(P1) / 2, 'P₁', {align: 'middle', style: {fill: 'ink'}, show: [1, 1e9]}); label('lp2', x0 + bw2 * 0.3, base - h(P1) - h(P2) / 2, 'P₂', {align: 'middle', style: {fill: 'ink'}, show: [2, 1e9]});
    anchors.box = [(b2[0] + b2[2]) / 2, (b2[1] + b2[3]) / 2];
    line('l1', 'Each gas fills the whole box and pushes as if it were alone', 0.3, {weight: 700});
    line('l2', "Dalton's law: P = P₁ + P₂ = (μ₁ + μ₂)RT/V", 1.6, {style: {fill: 'cool'}});
    if (!ill) line('l3', `μ₁ = ${num(m1)}, μ₂ = ${num(m2)} mol: P₁ = ${num(P1)} Pa, P₂ = ${num(P2)} Pa, P = ${num(P)} Pa`, 2.8, {weight: 700, style: {fill: 'accent'}});
    facts.push(`P1 = ${num(P1)} Pa, P2 = ${num(P2)} Pa, P = ${num(P)} Pa at ${num(T)} K in ${num(V)} m³`);
    return end('kinetic_gas', 5, {P1, P2, P, labelAt: {box: note}});
  }

  // free_path: to no scale in the drawing; the panel holds the numbers
  const n = s.n ?? 2.7e25, d = s.d ?? 2e-10, v = s.v ?? 485, l = s.simple ? 1 / (n * Math.PI * d * d) : 1 / (Math.SQRT2 * n * Math.PI * d * d), tau = l / v;
  walls();
  const rand = lcg(19), r = 16 * k, pts: [number, number][] = [[box[0] + 70 * k, box[1] + 90 * k]], stops = 7;
  for (let i = 1; i <= stops; i += 1) pts.push([box[0] + (i + 0.3) * (box[2] - box[0]) / (stops + 1) + (rand() - 0.5) * 60 * k, box[1] + 60 * k + rand() * (box[3] - box[1] - 120 * k)]);
  const seconds = 0.7, xs = pts.map((p, i) => [i * seconds, p[0]]), ys = pts.map((p, i) => [i * seconds, p[1]]);
  pts.slice(1).forEach((p, i) => {
    const a = pts[i], u = [p[0] - a[0], p[1] - a[1]], L = Math.hypot(u[0], u[1]) || 1;
    seg(`leg${i}`, a[0], a[1], p[0], p[1], {stroke: 'accent', width: 3 * k}, {show: [(i + 1) * seconds, 1e9], fade: 0.15} as never);
    c.props.push({id: `other${i}`, type: 'circle', x: p[0] + u[0] / L * r * 2, y: p[1] + u[1] / L * r * 2, r, style: {fill: 'muted'}, layer: 3} as unknown as Prop);
  });
  c.props.push({id: 'mol', type: 'circle', x: pts[0][0], y: pts[0][1], r, style: {fill: 'cool', stroke: 'ink', width: 2 * k}, layer: 6, keys: {x: xs, y: ys}} as unknown as Prop);
  Object.assign(anchors, {start: pts[0], end: pts[pts.length - 1], leg: [(pts[3][0] + pts[4][0]) / 2, (pts[3][1] + pts[4][1]) / 2]});
  line('l1', s.simple ? 'Mean free path: l = 1/(nπd²)' : 'Mean free path: l = 1/(√2 nπd²)', 0.3, {weight: 700});
  line('l2', 'High speed, but a very short straight run: it goes nowhere fast', 1.6, {style: {fill: 'cool'}});
  if (!ill) { line('l3', `n = ${num(n)} m⁻³, d = ${num(d)} m, ⟨v⟩ = ${num(v)} m/s`, 2.8); line('l4', `l = ${num(l)} m, about ${num(l / d)} d; τ = ${num(tau)} s`, 3.4, {weight: 700, style: {fill: 'accent'}}); }
  line('l5', 'The drawing is not to scale', 4.2, {style: {fill: 'muted'}});
  facts.push(`l = ${num(l)} m, l/d = ${num(l / d)}`, `time between collisions = ${num(tau)} s`, `collisions per second = ${num(1 / tau)}`);
  return end('kinetic_gas', stops * seconds + 0.8, {l, tau, labelAt: {start: note, end: note, leg: note}});
}
