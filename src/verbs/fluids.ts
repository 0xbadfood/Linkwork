// Fluids (NCERT Class 11 Physics, Ch. 9, Mechanical Properties of Fluids; 2026-10-30). Three verbs, every number
// computed from the book's formulas and tables:
// - fluid_pressure: a liquid at rest. depth: pressure growing with depth, P = Pa + ρgh, at marked points, the push on the
//   walls normal to them, the force on a window (gauge pressure × area); paradox: vessels of different shapes joined at
//   the bottom fill to one level; barometer: a column held up by the air, h = Pa / ρg; manometer: a U-tube reading a
//   gas's gauge pressure, or two liquids balanced on mercury, ρ₁h₁ = ρ₂h₂; hydraulic: two pistons, F₂ = F₁ A₂ / A₁, the
//   large one moving A₁ / A₂ as far.
// - fluid_flow: a liquid moving. continuity: a pipe narrowing, Av constant, the flow faster where streamlines crowd;
//   bernoulli: the same pipe (and a rise) with each section's P, ½ρv² and ρgh adding to one constant; torricelli: a
//   jet from a hole h below the surface, v = √(2gh); lift: streamlines past a ball, a spinning ball, a wing, crowded
//   above; layers: liquid between a fixed and a moving plate, or in a pipe, η = (F/A) / (v/l); stokes: a sphere falling
//   through a liquid to its terminal velocity, vt = 2a²(ρ − σ)g / 9η.
// - surface_tension: molecules inside and at the surface; film: a soap film pulling a slider, S = F / 2l; contact: a
//   drop on a surface, its angle of contact and the three tensions; drop: excess pressure in a drop, cavity or bubble,
//   2S/r or 4S/r; capillary: rise (or fall) in a narrow tube, h = 2S cos θ / ρga.
import type {Prop, Scene} from '../scene.ts';
import type {Plane} from '../plane.ts';
import type {Ease} from '../ease.ts';
import {wrapText} from '../svg.ts';
import {round} from '../vec.ts';
import {n2, panel, scene, text} from './calculus.ts';
import {frame} from './vectors.ts';
import {sci} from './gravitation.ts';

type P2 = [number, number];
type Key = [number, number, Ease];
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
/** Three significant figures, in powers of ten when large or small */
const num = (v: number) => (v !== 0 && (Math.abs(v) < 1e-3 || Math.abs(v) >= 1e5) ? sci(v) : n2(+v.toPrecision(3), Math.max(0, 2 - Math.floor(Math.log10(Math.abs(v) || 1)))));
/** A length in the unit that reads best: km, m, cm or mm */
const len = (v: number) => (Math.abs(v) >= 1000 ? `${num(v / 1000)} km` : Math.abs(v) >= 1 ? `${num(v)} m` : Math.abs(v) >= 0.01 ? `${num(v * 100)} cm` : `${num(v * 1000)} mm`);
const atm = (p: number, Pa: number) => `${num(p)} Pa${p >= 0.5 * Pa ? ` (${num(p / Pa)} atm)` : ''}`;

// The book's values (Tables 9.2, 9.3 and the examples): density kg/m³, surface tension S (liquid-air) N/m, viscosity
// η Pa s, angle of contact with clean glass (degrees, typical)
export const LIQUIDS: Record<string, {rho: number; S?: number; eta?: number; glass?: number}> = {
  water: {rho: 1000, S: 0.073, eta: 1.0e-3, glass: 0}, 'sea water': {rho: 1030}, mercury: {rho: 13600, S: 0.465, eta: 1.55e-3, glass: 140},
  'soap solution': {rho: 1000, S: 0.025}, glycerine: {rho: 1300, S: 0.063, eta: 0.83}, blood: {rho: 1060, eta: 2.7e-3},
  'machine oil': {rho: 900, eta: 0.113}, oil: {rho: 900}, kerosene: {rho: 800, S: 0.026, glass: 0}, alcohol: {rho: 790, S: 0.022, eta: 1.2e-3, glass: 0},
  'methylated spirit': {rho: 800}, wine: {rho: 984}, honey: {rho: 1400, eta: 10}, air: {rho: 1.29, eta: 1.8e-5},
};
const liquidOf = (s: {liquid?: string; rho?: number}) => (s.liquid ? LIQUIDS[s.liquid.toLowerCase()] : undefined);
const rhoOf = (s: {liquid?: string; rho?: number}) => s.rho ?? liquidOf(s)?.rho;
const liquidError = (s: {liquid?: string}, field = 'liquid') => (s.liquid !== undefined && !(typeof s.liquid === 'string' && LIQUIDS[s.liquid.toLowerCase()])
  ? `${field} is one the book uses (${Object.keys(LIQUIDS).join(', ')}); for another, give rho (kg/m³)` : undefined);
const colour = (name?: string) => (name?.toLowerCase() === 'mercury' ? 'muted' : 'cool');

type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};

/** The pieces every fluid scene uses: the frame, the panel's lines, labels, rectangles and the scene's end. */
function kit(s: Common) {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080;
  const fr = frame(W, H, k, s.title), box = fr.box, props: Prop[] = [...fr.titles], facts: string[] = [];
  const [bx0, by0, bx1, by1] = box, bw = bx1 - bx0, bh = by1 - by0, narrow = W < 1.3 * H, ptext = panel(W, k), ill = !!s.illustrative;
  let row = fr.row;
  const line = (id: string, t: string, when: number, extra: Partial<Prop> = {}) => {
    const h = wrapText(t, 30 * k, W - fr.px - 40 * k).length * 1.3 * 30 * k;
    if (row + h > H - 24 * k) return;          // a half-width part keeps the lines that fit: the main ones come first
    props.push(ptext(id, fr.px, row, t, 30 * k, {show: [when, 1e9], ...extra}));
    row += h + 6 * k;
  };
  const label = (id: string, x: number, y: number, t: string, extra: Partial<Prop> = {}) =>
    props.push(text(id, x, y, t, 26 * k, {weight: 700, style: {fill: 'ink'}, layer: 6, ...extra}));
  const rect = (id: string, x: number, y: number, w: number, h: number, style: Prop['style'], extra: Partial<Prop> = {}) =>
    props.push({id, type: 'rect', x, y, w, h, style, layer: 3, ...extra} as Prop);
  const seg = (id: string, x1: number, y1: number, x2: number, y2: number, style: Prop['style'], extra: Partial<Prop> = {}) =>
    props.push({id, type: 'line', x1, y1, x2, y2, style, layer: 3, ...extra} as Prop);
  const arrow = (id: string, x1: number, y1: number, x2: number, y2: number, fill = 'accent', extra: Partial<Prop> = {}) =>
    props.push({id, type: 'arrow', x1, y1, x2, y2, head: 14 * k, style: {stroke: fill, width: 4 * k}, layer: 5, ...extra} as Prop);
  const dot = (id: string, x: number, y: number, fill = 'accent', extra: Partial<Prop> = {}) =>
    props.push({id, type: 'circle', x, y, r: 8 * k, style: {fill, stroke: 'ink', width: 2 * k}, layer: 6, ...extra} as Prop);
  // Marks go at named points only: the plane is the drawing's box (see marks.ts)
  const anchors: Record<string, P2> = {};
  const plane: Plane = {id: 'p', x: [0, 1], y: [0, 1], box};
  const end = (verb: string, duration: number, meta: Record<string, unknown> = {}): Scene =>
    scene(s, W, H, duration, plane, props, [], {verb, facts, anchors, anchorsOnly: true, ...meta});
  return {W, H, k, box, bx0, by0, bx1, by1, bw, bh, narrow, ill, props, facts, line, label, rect, seg, arrow, dot, anchors, end};
}
const pos = (s: Record<string, unknown>, key: string, what: string, e: string[], verb: string) => {
  if (s[key] !== undefined && !(isNum(s[key]) && (s[key] as number) > 0)) e.push(`${verb}: ${key} is ${what}`);
};
const gOf = (s: {g?: number}) => s.g ?? 9.8;
const gError = (s: {g?: number}, verb: string) => (s.g !== undefined && !(isNum(s.g) && s.g >= 9 && s.g <= 10.5) ? `${verb}: g is 9.8 (or 10, as some examples take it)` : undefined);
const PA = 1.013e5;

// ───────────────────────────── fluid_pressure ─────────────────────────────
export const PRESSURE_KINDS = ['depth', 'paradox', 'barometer', 'manometer', 'hydraulic'] as const;
type Column = {liquid?: string; rho?: number; h?: number};
export type FluidPressureSpec = Common & {verb: 'fluid_pressure'; kind: (typeof PRESSURE_KINDS)[number]; liquid?: string; rho?: number;
  g?: number; Pa?: number; depth?: number; points?: number[]; window?: number; P?: number; gauge?: number; left?: Column; right?: Column;
  d1?: number; d2?: number; A1?: number; A2?: number; F1?: number; load?: number; push?: number};

export function fluidPressureErrors(s: FluidPressureSpec): string[] {
  const e: string[] = [], v = 'fluid_pressure';
  if (!PRESSURE_KINDS.includes(s.kind)) return [`${v}: kind is one of ${PRESSURE_KINDS.join(', ')}`];
  const le = liquidError(s); if (le) e.push(`${v}: ${le}`);
  pos(s as never, 'rho', 'a density in kg/m³ (water 1000)', e, v);
  const ge = gError(s, v); if (ge) e.push(ge);
  if (s.Pa !== undefined && !(isNum(s.Pa) && s.Pa >= 5e4 && s.Pa <= 1.2e5)) e.push(`${v}: Pa is the atmosphere's pressure, about 1.01e5 Pa`);
  const liquidNeeded = () => { if (rhoOf(s) === undefined && !s.illustrative) e.push(`${v}: give liquid (water, sea water, mercury ...) or rho`); };
  if (s.kind === 'depth') {
    if (!(isNum(s.depth) && s.depth > 0 && s.depth <= 12000)) e.push(`${v}: depth is the liquid's depth in m (the ocean's 1000, a tank's 2)`);
    if (s.points !== undefined && !(Array.isArray(s.points) && s.points.length >= 1 && s.points.length <= 4 && s.points.every(p => isNum(p) && p >= 0 && p <= (s.depth ?? Infinity))))
      e.push(`${v}: points is 1 to 4 depths in m, from 0 to depth, where the pressure is read`);
    if (s.window !== undefined && !(isNum(s.window) && s.window > 0 && s.window <= 100)) e.push(`${v}: window is a window's area in m² at the bottom (20 cm by 20 cm is 0.04), on which the gauge pressure pushes`);
    liquidNeeded();
  }
  if (s.kind === 'paradox') liquidNeeded();
  if (s.kind === 'barometer') { if (s.liquid === undefined && s.rho === undefined) { /* mercury */ } }
  if (s.kind === 'manometer') {
    const two = s.left !== undefined || s.right !== undefined;
    if (two) {
      for (const [side, c] of [['left', s.left], ['right', s.right]] as const) {
        if (!c || typeof c !== 'object') { e.push(`${v}: ${side} is {liquid or rho, h}: a column standing on the mercury in that arm`); continue; }
        const l = liquidError(c, `${side}.liquid`); if (l) e.push(`${v}: ${l}`);
        if (c.h !== undefined && !(isNum(c.h) && c.h > 0 && c.h <= 2)) e.push(`${v}: ${side}.h is the column's height in m (10 cm is 0.1)`);
      }
      const known = [s.left, s.right].filter(c => c && c.h !== undefined && rhoOf(c) !== undefined).length;
      const unknowns = [s.left, s.right].map(c => (c ? (c.h === undefined ? 1 : 0) + (rhoOf(c) === undefined ? 1 : 0) : 0)).reduce((a, b) => a + b, 0);
      if (s.left && s.right && !(known >= 1 && unknowns === 1)) e.push(`${v}: give both columns' liquids and heights but one: the height or the density left out is solved (ρ₁h₁ = ρ₂h₂)`);
    } else {
      if ((s.gauge === undefined) === (s.P === undefined)) e.push(`${v}: give gauge (the gas's gauge pressure, Pa) or P (its absolute pressure, Pa)`);
      if (s.gauge !== undefined && !(isNum(s.gauge) && Math.abs(s.gauge) > 0 && Math.abs(s.gauge) <= 5e5)) e.push(`${v}: gauge is P − Pa in Pa, up to 5e5`);
      if (s.P !== undefined && !(isNum(s.P) && s.P > 0 && s.P <= 6e5)) e.push(`${v}: P is the gas's absolute pressure in Pa`);
    }
  }
  if (s.kind === 'hydraulic') {
    for (const i of [1, 2] as const) {
      const d = s[`d${i}`], A = s[`A${i}`];
      if ((d === undefined) === (A === undefined)) e.push(`${v}: give d${i} (piston ${i}'s diameter, m) or A${i} (its area, m²)`);
      if (d !== undefined && !(isNum(d) && d > 0 && d <= 10)) e.push(`${v}: d${i} is a diameter in m (1 cm is 0.01)`);
      if (A !== undefined && !(isNum(A) && A > 0 && A <= 50)) e.push(`${v}: A${i} is an area in m² (425 cm² is 0.0425)`);
    }
    const a1 = s.A1 ?? (isNum(s.d1) ? Math.PI * s.d1 ** 2 / 4 : NaN), a2 = s.A2 ?? (isNum(s.d2) ? Math.PI * s.d2 ** 2 / 4 : NaN);
    if (a1 >= a2) e.push(`${v}: piston 1 is the small one (the force is applied there), piston 2 the large one`);
    if ((s.F1 === undefined) === (s.load === undefined)) e.push(`${v}: give F1 (N, pushing the small piston) or load (kg on the large piston, F1 is solved)`);
    pos(s as never, 'F1', 'a force in N', e, v); pos(s as never, 'load', 'a mass in kg', e, v);
    if (s.push !== undefined && !(isNum(s.push) && s.push > 0 && s.push <= 2)) e.push(`${v}: push is how far the small piston goes in, m (6 cm is 0.06)`);
  }
  return e;
}

export function fluidPressure(s: FluidPressureSpec): Scene {
  const c = kit(s), {k, bx0, by0, bx1, by1, bw, bh, narrow, ill, props, facts, line, label, rect, seg, arrow, dot, anchors} = c;
  const g = gOf(s), Pa = s.Pa ?? PA, liq = s.liquid ?? (s.kind === 'barometer' ? 'mercury' : 'water'), rho = rhoOf(s) ?? LIQUIDS[liq.toLowerCase()]?.rho ?? 1000;
  const fill = colour(liq), t0 = 0.6;

  if (s.kind === 'depth') {
    const D = s.depth!, pts = s.points ?? [D];
    const x0 = bx0 + 0.12 * bw, x1 = bx0 + (narrow ? 0.88 : 0.78) * bw, top = by0 + 0.12 * bh, bot = by1 - 0.06 * bh, Y = (d: number) => top + (bot - top) * d / D;
    rect('liquid', x0, top, x1 - x0, bot - top, {fill, opacity: 0.35}, {layer: 1, keys: {h: [[0, 0], [t0 + 0.8, bot - top, 'out']], y: [[0, bot], [t0 + 0.8, top, 'out']]} as never});
    seg('wl', x0, top, x0, bot, {stroke: 'ink', width: 4 * k}); seg('wr', x1, top, x1, bot, {stroke: 'ink', width: 4 * k}); seg('wb', x0, bot, x1, bot, {stroke: 'ink', width: 4 * k});
    label('lsurf', x0 + 12 * k, top - 14 * k, `surface: Pa`, {style: {fill: 'muted'}, show: [t0 + 0.8, 1e9]});
    // the walls are pushed outward, normal to them, harder with depth
    const P0 = rho * g * D;
    for (let i = 1; i <= 5; i++) {
      const d = D * i / 5.5, y = Y(d), L = 20 * k + 90 * k * d / D, when = t0 + 1 + 0.15 * i;
      arrow(`pl${i}`, x0 + 4 * k, y, x0 - L, y, 'accent', {show: [when, 1e9], fade: 0.3});
      arrow(`pr${i}`, x1 - 4 * k, y, x1 + L, y, 'accent', {show: [when, 1e9], fade: 0.3});
    }
    pts.forEach((d, i) => {
      const y = Y(d), when = t0 + 2 + 0.6 * i, x = x0 + (x1 - x0) * (0.3 + 0.2 * i);
      dot(`pt${i}`, x, y, 'accent', {show: [when, 1e9], fade: 0.3});
      seg(`hd${i}`, x, top, x, y, {stroke: 'muted', width: 2 * k, dash: [6 * k, 6 * k]}, {show: [when, 1e9], fade: 0.3});
      label(`lpt${i}`, x + 14 * k, y - (d > 0.9 * D ? 30 : 10) * k, ill ? `h${pts.length > 1 ? '₁₂₃₄'[i] : ''}` : `h = ${len(d)}`, {show: [when, 1e9]});
      anchors[`point${pts.length > 1 ? i + 1 : ''}`] = [x, y];
      facts.push(`at depth ${len(d)}: gauge pressure ρgh = ${atm(rho * g * d, Pa)}; absolute P = Pa + ρgh = ${atm(Pa + rho * g * d, Pa)}`);
    });
    if (s.window !== undefined) {
      const wy = bot - 0.12 * (bot - top), wh = 0.08 * (bot - top);
      rect('window', x1 - 6 * k, wy - wh / 2, 12 * k, wh, {fill: 'paper', stroke: 'accent', width: 3 * k}, {layer: 4});
      label('lwin', x1 + 20 * k, wy + 50 * k, 'window', {style: {fill: 'accent'}});
      anchors.window = [x1, wy];
      facts.push(`force on the window (gauge pressure at the bottom × area ${num(s.window)} m²): F = ${num(P0 * s.window)} N`);
    }
    Object.assign(anchors, {surface: [(x0 + x1) / 2, top], bottom: [(x0 + x1) / 2, bot]});
    line('l1', 'The liquid pushes on every surface at right angles to it, harder deeper down', t0 + 1, {style: {fill: 'accent'}});
    line('l2', ill ? 'P = Pa + ρgh: the pressure grows with the depth h' : `P = Pa + ρgh, ρ = ${num(rho)} kg/m³ (${liq})`, t0 + 2, {weight: 700});
    if (!ill) pts.forEach((d, i) => line(`lp${i}`, `h = ${len(d)}: ρgh = ${atm(rho * g * d, Pa)}, P = ${atm(Pa + rho * g * d, Pa)}`, t0 + 2.2 + 0.6 * i, {style: {fill: 'cool'}}));
    line('l3', 'Gauge pressure P − Pa = ρgh: what a gauge reads', t0 + 2.4 + 0.6 * pts.length, {style: {fill: 'muted'}});
    if (s.window !== undefined && !ill) line('l4', `Window: F = ρgh × A = ${num(P0 * s.window)} N`, t0 + 3 + 0.6 * pts.length, {weight: 700, style: {fill: 'accent'}});
    return c.end('fluid_pressure', t0 + 5 + 0.6 * pts.length, {P: pts.map(d => Pa + rho * g * d), gauge: pts.map(d => rho * g * d)});
  }

  if (s.kind === 'paradox') {
    // three vessels of different shapes joined by a pipe at the bottom, filling to one level
    const bot = by1 - 0.12 * bh, top = by0 + 0.18 * bh, lvl = by0 + 0.38 * bh, xs = [0.18, 0.5, 0.82].map(u => bx0 + u * bw), wv = 0.18 * bw;
    const shapes: P2[][] = [
      [[xs[0] - wv / 2, top], [xs[0] + wv / 2, top], [xs[0] + wv / 2, bot], [xs[0] - wv / 2, bot]],
      [[xs[1] - wv * 0.9, top], [xs[1] + wv * 0.9, top], [xs[1] + wv * 0.18, bot], [xs[1] - wv * 0.18, bot]],
      [[xs[2] - wv * 0.12, top], [xs[2] + wv * 0.12, top], [xs[2] + wv * 0.12, (top + bot) / 2], [xs[2] + wv * 0.55, bot], [xs[2] - wv * 0.55, bot], [xs[2] - wv * 0.12, (top + bot) / 2]]];
    const fillT = t0 + 0.4, full = t0 + 3;
    shapes.forEach((sh, i) => {
      // the water: the vessel's shape cut at the level, rising as one
      const cut = (y: number): P2[] => {
        const out: P2[] = [];
        for (let j = 0; j < sh.length; j++) {
          const a = sh[j], b = sh[(j + 1) % sh.length];
          if (a[1] >= y) out.push(a);
          if ((a[1] - y) * (b[1] - y) < 0) out.push([a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]), y]);
        }
        return out;
      };
      const frames = [0, 0.25, 0.5, 0.75, 1].map(u => bot - (bot - lvl) * u);
      props.push({id: `w${i}`, type: 'polyline', points: cut(frames[frames.length - 1]), closed: true, style: {fill, opacity: 0.4}, layer: 1, show: [full, 1e9]} as Prop);
      frames.slice(0, -1).forEach((y, j) => props.push({id: `w${i}-${j}`, type: 'polyline', points: cut(y), closed: true, style: {fill, opacity: 0.4}, layer: 1,
        show: [fillT + (full - fillT) * j / 4, fillT + (full - fillT) * (j + 1) / 4]} as Prop));
      props.push({id: `v${i}`, type: 'polyline', points: [...sh.slice(1), sh[0]], style: {stroke: 'ink', width: 4 * k}, layer: 3} as Prop);
      label(`lv${i}`, xs[i], top - 16 * k, 'ABC'[i], {align: 'middle'});
      anchors['ABC'[i]] = [xs[i], lvl];
    });
    rect('pipe', xs[0] - wv / 2, bot, xs[2] + wv * 0.55 - (xs[0] - wv / 2), 30 * k, {fill, opacity: 0.4, stroke: 'ink', width: 3 * k}, {layer: 1});
    seg('level', bx0, lvl, bx1, lvl, {stroke: 'accent', width: 2 * k, dash: [10 * k, 8 * k]}, {show: [full, 1e9], fade: 0.3, layer: 4});
    label('llevel', bx1 - 8 * k, lvl - 12 * k, 'one level', {align: 'end', style: {fill: 'accent'}, show: [full, 1e9]});
    anchors.pipe = [xs[1], bot + 15 * k];
    line('l1', 'Vessels of different shapes, joined at the bottom', 0.3, {weight: 700});
    line('l2', 'They fill to the same level, though they hold different amounts', full, {style: {fill: 'accent'}});
    line('l3', 'The pressure at the bottom is ρgh under each: only the height counts, not the shape or the base area', full + 0.6, {style: {fill: 'cool'}});
    facts.push('hydrostatic paradox: connected vessels of different shapes fill to one level; the pressure at a depth depends only on h (P = Pa + ρgh)');
    return c.end('fluid_pressure', full + 3);
  }

  if (s.kind === 'barometer') {
    // a tube filled with the liquid, inverted in a trough: the column falls until ρgh = Pa
    const h = Pa / (rho * g), tubeL = h * 1.12, trough = by1 - 0.14 * bh, top = by0 + 0.06 * bh, sc = (trough - top) / (tubeL * 1.05);
    const cx = bx0 + 0.45 * bw, tw = 40 * k, tubeTop = trough + 0.25 * (by1 - trough) - tubeL * sc, colTop = trough - h * sc;
    rect('trough', cx - 0.3 * bw, trough, 0.6 * bw, by1 - trough - 6 * k, {fill, opacity: 0.4, stroke: 'ink', width: 3 * k}, {layer: 1});
    rect('col', cx - tw / 2, tubeTop, tw, trough + 0.25 * (by1 - trough) - tubeTop, {fill, opacity: 0.6}, {layer: 2,
      keys: {y: [[t0, tubeTop], [t0 + 1.6, colTop, 'out']], h: [[t0, trough + 0.25 * (by1 - trough) - tubeTop], [t0 + 1.6, trough + 0.25 * (by1 - trough) - colTop, 'out']]} as never});
    rect('tube', cx - tw / 2, tubeTop, tw, trough + 0.25 * (by1 - trough) - tubeTop, {stroke: 'ink', width: 3 * k}, {layer: 3});
    label('lvac', cx + tw / 2 + 14 * k, tubeTop + 30 * k, liq.toLowerCase() === 'mercury' ? 'A: vacuum (mercury vapour), P ≈ 0' : 'A: P ≈ 0', {show: [t0 + 1.6, 1e9], style: {fill: 'muted'}});
    seg('hdim', cx - tw / 2 - 40 * k, colTop, cx - tw / 2 - 40 * k, trough, {stroke: 'accent', width: 3 * k}, {show: [t0 + 1.8, 1e9], fade: 0.3});
    label('lh', cx - tw / 2 - 52 * k, (colTop + trough) / 2, ill ? 'h' : `h = ${len(h)}`, {align: 'end', style: {fill: 'accent'}, show: [t0 + 1.8, 1e9]});
    for (const [i, x] of [cx - 0.22 * bw, cx + 0.22 * bw].entries()) arrow(`air${i}`, x, trough - 90 * k, x, trough - 6 * k, 'accent', {show: [t0 + 1.8, 1e9], fade: 0.3});
    label('lair', cx + 0.22 * bw + 16 * k, trough - 50 * k, 'Pa', {style: {fill: 'accent'}, show: [t0 + 1.8, 1e9]});
    dot('B', cx, trough, 'accent', {show: [t0 + 2.4, 1e9], fade: 0.3}); dot('C', cx + 0.12 * bw, trough, 'accent', {show: [t0 + 2.4, 1e9], fade: 0.3});
    label('lB', cx - 22 * k, trough + 34 * k, 'B', {align: 'end', show: [t0 + 2.4, 1e9]}); label('lC', cx + 0.12 * bw, trough + 34 * k, 'C', {align: 'middle', show: [t0 + 2.4, 1e9]});
    Object.assign(anchors, {A: [cx, tubeTop + 20 * k], B: [cx, trough], C: [cx + 0.12 * bw, trough], top: [cx, colTop]});
    line('l1', `A tube full of ${liq.toLowerCase()}, turned upside down in a trough`, 0.3, {weight: 700});
    line('l2', 'The column falls until its weight balances the air pressing on the trough', t0 + 1.6, {style: {fill: 'cool'}});
    line('l3', ill ? 'B and C are at one level: Pa = ρgh' : `B and C at one level: Pa = ρgh, so h = Pa / ρg = ${len(h)}`, t0 + 2.4, {weight: 700, style: {fill: 'accent'}});
    if (!ill && liq.toLowerCase() === 'mercury') line('l4', '76 cm of mercury is 1 atm; 1 mm of Hg is 1 torr = 133 Pa', t0 + 3, {style: {fill: 'muted'}});
    facts.push(`barometer of ${liq} (ρ = ${num(rho)} kg/m³): column height h = Pa/ρg = ${len(h)} for Pa = ${num(Pa)} Pa`);
    return c.end('fluid_pressure', t0 + 5, {h});
  }

  if (s.kind === 'manometer') {
    const two = s.left !== undefined || s.right !== undefined;
    const armL = bx0 + 0.3 * bw, armR = bx0 + 0.62 * bw, tw = 46 * k, bot = by1 - 0.08 * bh, top = by0 + 0.08 * bh;
    const tube = (id: string, x: number, y0: number, y1: number) => seg(id, x, y0, x, y1, {stroke: 'ink', width: 3 * k}, {layer: 4});
    const ubend = (y: number) => props.push({id: 'bend', type: 'polyline', points: Array.from({length: 19}, (_, i) => {
      const a = Math.PI * i / 18, r = (armR - armL) / 2, rr = r + tw / 2; return [(armL + armR) / 2 - rr * Math.cos(a), y + rr * Math.sin(a)] as P2; }),
      style: {stroke: 'ink', width: 3 * k}, layer: 4} as Prop,
      {id: 'bendi', type: 'polyline', points: Array.from({length: 19}, (_, i) => {
        const a = Math.PI * i / 18, r = (armR - armL) / 2 - tw / 2; return [(armL + armR) / 2 - r * Math.cos(a), y + r * Math.sin(a)] as P2; }),
      style: {stroke: 'ink', width: 3 * k}, layer: 4} as Prop);
    const bendY = bot - (armR - armL) / 2 - tw / 2;
    for (const x of [armL, armR]) { tube(`${x}a`, x - tw / 2, top, bendY); tube(`${x}b`, x + tw / 2, top, bendY); }
    ubend(bendY);
    if (!two) {
      // a gas bulb on the left arm; the liquid stands h higher in the open right arm (gauge = ρgh)
      const Pg = s.gauge ?? s.P! - Pa, h = Pg / (rho * g), mid = (top + bendY) / 2 + 0.05 * bh;
      const span = Math.min(0.32 * bh, (bendY - top) * 0.45), shift = Math.sign(h) * span / 2;
      const fillTo = (id: string, x: number, y: number, when: [number, number]) => rect(id, x - tw / 2 + 2 * k, y, tw - 4 * k, bendY - y, {fill, opacity: 0.55}, {layer: 2,
        keys: {y: [[when[0], mid], [when[1], y, 'out']], h: [[when[0], bendY - mid], [when[1], bendY - y, 'out']]} as never});
      props.push({id: 'base', type: 'polyline', points: Array.from({length: 19}, (_, i) => { const a = Math.PI * i / 18, r = (armR - armL) / 2;
        return [(armL + armR) / 2 - r * Math.cos(a), bendY + r * Math.sin(a)] as P2; }), style: {stroke: fill, width: tw - 6 * k, opacity: 0.55}, layer: 1} as Prop);
      fillTo('liqL', armL, mid + shift, [t0, t0 + 1.6]); fillTo('liqR', armR, mid - shift, [t0, t0 + 1.6]);
      props.push({id: 'bulb', type: 'circle', x: armL, y: top - 10 * k, r: 70 * k, style: {fill: 'faint', stroke: 'ink', width: 3 * k}, layer: 3} as Prop);
      label('lgas', armL, top + 0 * k, 'gas, P', {align: 'middle'});
      label('lopen', armR, top - 16 * k, 'open: Pa', {align: 'middle', style: {fill: 'muted'}});
      seg('hdim', armR + tw / 2 + 30 * k, mid - shift, armR + tw / 2 + 30 * k, mid + shift, {stroke: 'accent', width: 3 * k}, {show: [t0 + 1.8, 1e9], fade: 0.3});
      seg('hlev', armL - tw / 2, mid + shift, armR + tw / 2 + 40 * k, mid + shift, {stroke: 'muted', width: 2 * k, dash: [6 * k, 6 * k]}, {show: [t0 + 1.8, 1e9], fade: 0.3, layer: 5});
      label('lh', armR + tw / 2 + 44 * k, mid + 8 * k, ill ? 'h' : `h = ${len(Math.abs(h))}`, {style: {fill: 'accent'}, show: [t0 + 1.8, 1e9]});
      dot('A', armL, mid + shift, 'accent', {show: [t0 + 2.4, 1e9], fade: 0.3}); dot('B', armR, mid + shift, 'accent', {show: [t0 + 2.4, 1e9], fade: 0.3});
      label('lA', armL - tw / 2 - 12 * k, mid + shift + 8 * k, 'A', {align: 'end', show: [t0 + 2.4, 1e9]}); label('lB', armR - tw / 2 - 12 * k, mid + shift + 8 * k, 'B', {align: 'end', show: [t0 + 2.4, 1e9]});
      Object.assign(anchors, {A: [armL, mid + shift], B: [armR, mid + shift], gas: [armL, top - 10 * k], open: [armR, mid - shift]});
      line('l1', 'A U-tube of liquid: one arm to the gas, the other open to the air', 0.3, {weight: 700});
      line('l2', 'A and B are at one level, so at one pressure', t0 + 2.4, {style: {fill: 'cool'}});
      line('l3', ill ? 'Gauge pressure P − Pa = ρgh: the height difference reads it' : `P − Pa = ρgh: h = ${len(Math.abs(h))} of ${liq.toLowerCase()} reads ${num(Pg)} Pa`, t0 + 2.8, {weight: 700, style: {fill: 'accent'}});
      facts.push(`open-tube manometer with ${liq} (ρ = ${num(rho)} kg/m³): gauge pressure ${num(Pg)} Pa gives a height difference h = ${len(Math.abs(h))}`, `absolute pressure of the gas P = ${atm(Pa + Pg, Pa)}`);
      return c.end('fluid_pressure', t0 + 5, {h});
    }
    // two liquids standing on mercury, its surfaces level: ρ₁h₁ = ρ₂h₂, the missing one solved
    const L = {...s.left!}, R = {...s.right!}, rL = rhoOf(L), rR = rhoOf(R);
    let solved = '';
    if (L.h === undefined) { L.h = R.h! * rR! / rL!; solved = `left column h = ${len(L.h)}`; }
    else if (R.h === undefined) { R.h = L.h * rL! / rR!; solved = `right column h = ${len(R.h)}`; }
    const rhoL = rL ?? R.h! * rR! / L.h!, rhoR = rR ?? L.h! * rL! / R.h!;
    if (rL === undefined) solved = `left liquid's density ρ = ${num(rhoL)} kg/m³ (specific gravity ${num(rhoL / 1000)})`;
    if (rR === undefined) solved = `right liquid's density ρ = ${num(rhoR)} kg/m³ (specific gravity ${num(rhoR / 1000)})`;
    const hmax = Math.max(L.h!, R.h!), hg = (bendY - top) * 0.45, sc = (bendY - top - hg - 30 * k) / hmax, lvl = bendY - hg;
    props.push({id: 'base', type: 'polyline', points: Array.from({length: 19}, (_, i) => { const a = Math.PI * i / 18, r = (armR - armL) / 2;
      return [(armL + armR) / 2 - r * Math.cos(a), bendY + r * Math.sin(a)] as P2; }), style: {stroke: 'muted', width: tw - 6 * k, opacity: 0.7}, layer: 1} as Prop);
    for (const [x, col, side, id] of [[armL, L, 'left', 'L'], [armR, R, 'right', 'R']] as const) {
      rect(`hg${id}`, x - tw / 2 + 2 * k, lvl, tw - 4 * k, bendY - lvl, {fill: 'muted', opacity: 0.7}, {layer: 2});
      const hpx = col.h! * sc, name = col.liquid ?? (side === 'left' ? 'liquid 1' : 'liquid 2');
      rect(`c${id}`, x - tw / 2 + 2 * k, lvl - hpx, tw - 4 * k, hpx, {fill: side === 'left' ? 'cool' : 'figure', opacity: 0.6}, {layer: 2, show: [t0 + 0.4 * (side === 'left' ? 0 : 1), 1e9], fade: 0.4});
      label(`n${id}`, side === 'left' ? x - tw / 2 - 14 * k : x + tw / 2 + 14 * k, lvl - hpx / 2, name, {align: side === 'left' ? 'end' : 'start', style: {fill: side === 'left' ? 'cool' : 'figure'}});
      label(`h${id}`, side === 'left' ? x - tw / 2 - 14 * k : x + tw / 2 + 14 * k, lvl - hpx / 2 + 34 * k, ill ? `h${side === 'left' ? '₁' : '₂'}` : len(col.h!),
        {align: side === 'left' ? 'end' : 'start', style: {fill: 'muted'}, show: [t0 + 1, 1e9]});
      anchors[side] = [x, lvl - hpx / 2];
    }
    seg('level', armL - tw, lvl, armR + tw, lvl, {stroke: 'accent', width: 2 * k, dash: [8 * k, 6 * k]}, {show: [t0 + 1.4, 1e9], fade: 0.3, layer: 5});
    label('lhg', (armL + armR) / 2, bot + 6 * k, 'mercury', {align: 'middle', style: {fill: 'muted'}});
    anchors.mercury = [(armL + armR) / 2, bot - 20 * k];
    line('l1', 'Two liquids on mercury, its surfaces level in both arms', 0.3, {weight: 700});
    line('l2', ill ? 'Equal pressure at that level: ρ₁gh₁ = ρ₂gh₂' : `ρ₁h₁ = ρ₂h₂: ${num(rhoL)} × ${len(L.h!)} = ${num(rhoR)} × ${len(R.h!)}`, t0 + 1.4, {style: {fill: 'accent'}});
    if (solved && !ill) line('l3', `So the ${solved}`, t0 + 2, {weight: 700});
    line('l4', 'The less dense liquid stands taller', t0 + 2.6, {style: {fill: 'muted'}});
    facts.push(`U-tube: ${L.liquid ?? 'left liquid'} ${len(L.h!)} (ρ ${num(rhoL)}) balances ${R.liquid ?? 'right liquid'} ${len(R.h!)} (ρ ${num(rhoR)}) on mercury: ρ₁h₁ = ρ₂h₂`, ...(solved ? [solved] : []));
    return c.end('fluid_pressure', t0 + 4.6, {rho: [rhoL, rhoR], h: [L.h, R.h]});
  }

  // hydraulic: a small piston pushed in, a large one rising, the pressure the same throughout
  const A1 = s.A1 ?? Math.PI * s.d1! ** 2 / 4, A2 = s.A2 ?? Math.PI * s.d2! ** 2 / 4, ratio = A2 / A1;
  const F1 = s.F1 ?? s.load! * g / ratio, F2 = F1 * ratio, P = F1 / A1, push = s.push ?? 0, rise = push / ratio;
  const w1 = Math.max(36 * k, 0.5 * bw * Math.sqrt(A1 / A2) * 0.9), w2 = Math.min(0.42 * bw, Math.max(w1 * 1.6, 0.42 * bw));
  const x1 = bx0 + 0.18 * bw, x2 = bx0 + 0.66 * bw, bot = by1 - 0.1 * bh, top1 = by0 + 0.3 * bh, top2 = by0 + 0.36 * bh, pipe = bot - 60 * k;
  const travel = 0.18 * bh, d1px = travel, d2px = travel / Math.min(ratio, 50) * (push ? 1 : 0) || 0, tA = t0 + 1, tB = t0 + 3;
  const dd1 = push ? d1px : 0.12 * bh, dd2 = push ? Math.max(4 * k, dd1 / ratio) : Math.max(4 * k, dd1 / ratio);
  rect('fluid', x1 - w1 / 2, top1, x2 + w2 / 2 - (x1 - w1 / 2), bot - top1, {fill, opacity: 0}, {layer: 0});
  rect('liq1', x1 - w1 / 2, top1, w1, pipe - top1, {fill, opacity: 0.45}, {layer: 1, keys: {y: [[tA, top1], [tB, top1 + dd1]], h: [[tA, pipe - top1], [tB, pipe - top1 - dd1]]} as never});
  rect('liq2', x2 - w2 / 2, top2, w2, pipe - top2, {fill, opacity: 0.45}, {layer: 1, keys: {y: [[tA, top2], [tB, top2 - dd2]], h: [[tA, pipe - top2], [tB, pipe - top2 + dd2]]} as never});
  rect('liqp', x1 - w1 / 2, pipe, x2 + w2 / 2 - (x1 - w1 / 2), bot - pipe, {fill, opacity: 0.45}, {layer: 1});
  for (const [x, w, t] of [[x1, w1, top1 - 0.14 * bh], [x2, w2, top2 - 0.2 * bh]] as const) {
    seg(`wl${x}`, x - w / 2, t, x - w / 2, pipe, {stroke: 'ink', width: 4 * k}); seg(`wr${x}`, x + w / 2, t, x + w / 2, x === x1 ? pipe : bot, {stroke: 'ink', width: 4 * k});
  }
  seg('wb', x1 - w1 / 2, bot, x2 + w2 / 2, bot, {stroke: 'ink', width: 4 * k}); seg('wl0', x1 - w1 / 2, pipe, x1 - w1 / 2, bot, {stroke: 'ink', width: 4 * k});
  seg('wt', x1 + w1 / 2, pipe, x2 - w2 / 2, pipe, {stroke: 'ink', width: 4 * k});
  rect('p1', x1 - w1 / 2 + 3 * k, top1 - 18 * k, w1 - 6 * k, 18 * k, {fill: 'figure', stroke: 'ink', width: 2 * k}, {layer: 4, keys: {y: [[tA, top1 - 18 * k], [tB, top1 - 18 * k + dd1]]} as never});
  rect('p2', x2 - w2 / 2 + 3 * k, top2 - 18 * k, w2 - 6 * k, 18 * k, {fill: 'figure', stroke: 'ink', width: 2 * k}, {layer: 4, keys: {y: [[tA, top2 - 18 * k], [tB, top2 - 18 * k - dd2]]} as never});
  if (s.load !== undefined) {
    rect('load', x2 - w2 * 0.35, top2 - 18 * k - 70 * k, w2 * 0.7, 70 * k, {fill: 'faint', stroke: 'ink', width: 2 * k}, {layer: 4, keys: {y: [[tA, top2 - 88 * k], [tB, top2 - 88 * k - dd2]]} as never});
    label('lload', x2, top2 - 44 * k, ill ? 'load' : `${num(s.load)} kg`, {align: 'middle', keys: {y: [[tA, top2 - 44 * k], [tB, top2 - 44 * k - dd2]]} as never});
  }
  arrow('F1', x1, top1 - 130 * k, x1, top1 - 24 * k, 'accent', {show: [t0, 1e9], fade: 0.3, keys: {y1: [[tA, top1 - 130 * k], [tB, top1 - 130 * k + dd1]], y2: [[tA, top1 - 24 * k], [tB, top1 - 24 * k + dd1]]} as never});
  label('lF1', x1 + 18 * k, top1 - 100 * k, 'F₁', {style: {fill: 'accent'}, keys: {y: [[tA, top1 - 100 * k], [tB, top1 - 100 * k + dd1]]} as never});
  const up = s.load !== undefined ? 108 * k : 24 * k;
  arrow('F2', x2, top2 - up, x2, top2 - up - 120 * k, 'good', {show: [t0 + 0.6, 1e9], fade: 0.3, keys: {y1: [[tA, top2 - up], [tB, top2 - up - dd2]], y2: [[tA, top2 - up - 120 * k], [tB, top2 - up - 120 * k - dd2]]} as never});
  label('lF2', x2 + 18 * k, top2 - up - 90 * k, 'F₂', {style: {fill: 'good'}, show: [t0 + 0.6, 1e9], keys: {y: [[tA, top2 - up - 90 * k], [tB, top2 - up - 90 * k - dd2]]} as never});
  label('lA1', x1, bot + 34 * k, 'A₁', {align: 'middle', style: {fill: 'muted'}}); label('lA2', x2, bot + 34 * k, 'A₂', {align: 'middle', style: {fill: 'muted'}});
  Object.assign(anchors, {small: [x1, top1], large: [x2, top2], liquid: [(x1 + x2) / 2, (pipe + bot) / 2]});
  line('l1', ill ? 'Pressure P = F₁ / A₁ on the small piston' : `P = F₁ / A₁ = ${num(P)} Pa${P > 0.5 * Pa ? ` (${num(P / Pa)} atm)` : ''}`, t0, {style: {fill: 'accent'}});
  line('l2', 'Transmitted undiminished through the liquid (Pascal\'s law)', t0 + 0.6, {style: {fill: 'cool'}});
  line('l3', ill ? 'F₂ = P A₂ = F₁ A₂ / A₁: the force multiplied by A₂ / A₁' : `F₂ = F₁ × A₂ / A₁: ${num(F1)} N × ${num(ratio)} = ${num(F2)} N`, t0 + 1.2, {weight: 700, style: {fill: 'good'}});
  line('l4', ill ? 'The large piston moves A₁ / A₂ as far: the same volume' : (push ? `Pushed in ${len(push)}, the large piston rises ${len(rise)} (L₁A₁ = L₂A₂)` : `Mechanical advantage A₂ / A₁ = ${num(ratio)}; it moves 1/${num(ratio)} as far`), tB, {style: {fill: 'muted'}});
  facts.push(`piston areas A₁ = ${num(A1)} m², A₂ = ${num(A2)} m² (ratio ${num(ratio)})`, `pressure transmitted P = F₁/A₁ = ${num(P)} Pa`,
    `${s.load !== undefined ? `load ${num(s.load)} kg needs` : 'force on the small piston'} F₁ = ${num(F1)} N; force on the large piston F₂ = ${num(F2)} N`,
    ...(push ? [`small piston pushed ${len(push)}: large piston moves ${len(rise)}`] : []));
  return c.end('fluid_pressure', tB + 2.4, {F1, F2, P, rise});
}

// ───────────────────────────── fluid_flow ─────────────────────────────
export const FLOW_KINDS = ['continuity', 'bernoulli', 'torricelli', 'lift', 'layers', 'stokes'] as const;
export type FluidFlowSpec = Common & {verb: 'fluid_flow'; kind: (typeof FLOW_KINDS)[number]; liquid?: string; rho?: number; g?: number;
  d1?: number; d2?: number; A1?: number; A2?: number; v1?: number; outlets?: number; h1?: number; h2?: number; P1?: number;
  h?: number; y?: number; body?: 'ball' | 'spin' | 'wing'; mass?: number; area?: number; v?: number; v_top?: number; v_bottom?: number;
  profile?: 'plates' | 'pipe'; eta?: number; F?: number; hang?: number; gap?: number; a?: number; density?: number; vt?: number; material?: string};
const SOLIDS: Record<string, number> = {copper: 8900, steel: 7800, iron: 7870, lead: 11300, aluminium: 2700, glass: 2500, water: 1000};

export function fluidFlowErrors(s: FluidFlowSpec): string[] {
  const e: string[] = [], v = 'fluid_flow';
  if (!FLOW_KINDS.includes(s.kind)) return [`${v}: kind is one of ${FLOW_KINDS.join(', ')}`];
  const le = liquidError(s); if (le) e.push(`${v}: ${le}`);
  const ge = gError(s, v); if (ge) e.push(ge);
  for (const [key, what] of [['rho', 'a density in kg/m³'], ['v1', 'a speed in m/s'], ['eta', 'a viscosity in Pa s (water 1.0e-3)'], ['a', "the sphere's radius in m (2 mm is 0.002)"],
    ['density', "the sphere's density in kg/m³ (copper 8900)"], ['vt', 'a terminal speed in m/s (6.5 cm/s is 0.065)'], ['mass', 'a mass in kg'], ['area', 'an area in m²'],
    ['v', 'a speed in m/s'], ['F', 'a force in N'], ['hang', 'a hanging mass in kg'], ['gap', 'the liquid film\'s thickness in m (0.30 mm is 3e-4)']] as const)
    pos(s as never, key, what, e, v);
  if (s.kind === 'continuity' || s.kind === 'bernoulli') {
    for (const i of [1, 2] as const) {
      const d = s[`d${i}`], A = s[`A${i}`];
      if ((d === undefined) === (A === undefined)) e.push(`${v}: give d${i} (the pipe's diameter at section ${i}, m) or A${i} (its area, m²)`);
      if (d !== undefined && !(isNum(d) && d > 0 && d <= 20)) e.push(`${v}: d${i} is a diameter in m`);
      if (A !== undefined && !(isNum(A) && A > 0 && A <= 300)) e.push(`${v}: A${i} is an area in m² (8 cm² is 8e-4)`);
    }
    if (s.v1 === undefined && !s.illustrative) e.push(`${v}: v1 is the speed at section 1, m/s`);
    if (s.outlets !== undefined && !(Number.isInteger(s.outlets) && s.outlets >= 1 && s.outlets <= 200)) e.push(`${v}: outlets is how many holes of d2 the flow leaves by (a spray's 40)`);
    if (s.kind === 'bernoulli') {
      for (const key of ['h1', 'h2'] as const) if (s[key] !== undefined && !(isNum(s[key]) && s[key]! >= 0 && s[key]! <= 100)) e.push(`${v}: ${key} is section's height in m, 0 to 100`);
      if (s.P1 !== undefined && !(isNum(s.P1) && s.P1 > 0 && s.P1 <= 1e7)) e.push(`${v}: P1 is the pressure at section 1, Pa`);
    }
  }
  if (s.kind === 'torricelli') {
    if (!(isNum(s.h) && s.h > 0 && s.h <= 100)) e.push(`${v}: h is the hole's depth below the surface, m`);
    if (s.y !== undefined && !(isNum(s.y) && s.y >= 0 && s.y <= 100)) e.push(`${v}: y is the hole's height above the ground, m (the jet lands at x = 2√(hy))`);
  }
  if (s.kind === 'lift') {
    if (!['ball', 'spin', 'wing'].includes(s.body ?? '')) e.push(`${v}: body is 'ball' (no spin: no lift), 'spin' (Magnus effect) or 'wing' (an aerofoil)`);
    const byMass = s.mass !== undefined || s.area !== undefined, bySpeeds = s.v_top !== undefined || s.v_bottom !== undefined;
    if (byMass && !(isNum(s.mass) && isNum(s.area))) e.push(`${v}: mass (kg) and area (the wings', m²) go together: ΔP = mg / A`);
    if (bySpeeds && !(isNum(s.v_top) && isNum(s.v_bottom) && s.v_top > s.v_bottom)) e.push(`${v}: v_top and v_bottom go together, the faster above (lift = ½ρ(v_top² − v_bottom²) A)`);
    if (bySpeeds && s.area === undefined) e.push(`${v}: area (m²) gives the lift from the two speeds`);
  }
  if (s.kind === 'layers') {
    if (s.profile !== undefined && !['plates', 'pipe'].includes(s.profile)) e.push(`${v}: profile is 'plates' (a moving plate over a fixed one) or 'pipe'`);
    const exp = [s.hang ?? s.F, s.area, s.v, s.gap].filter(x => x !== undefined).length;
    if (exp > 0 && exp < 4 && s.eta === undefined) e.push(`${v}: for η from the experiment give hang (kg) or F (N), area (m²), v (m/s) and gap (m)`);
  }
  if (s.kind === 'stokes') {
    if (!isNum(s.a)) e.push(`${v}: a is the sphere's radius in m`);
    if (s.density === undefined && !SOLIDS[(s.material ?? '').toLowerCase()]) e.push(`${v}: give the sphere's material (${Object.keys(SOLIDS).join(', ')}) or density (kg/m³)`);
    if ((s.eta === undefined) === (s.vt === undefined) && !(s.liquid && LIQUIDS[s.liquid.toLowerCase()]?.eta !== undefined && s.vt === undefined && s.eta === undefined))
      e.push(`${v}: give eta (the liquid's viscosity, vt is computed) or vt (the measured terminal speed, η is computed)`);
    if (rhoOf(s) === undefined) e.push(`${v}: give liquid or rho (the liquid's density, kg/m³)`);
    const rs = s.density ?? SOLIDS[(s.material ?? '').toLowerCase()], rl = rhoOf(s);
    if (isNum(rs) && isNum(rl) && rs <= rl) e.push(`${v}: the sphere must be denser than the liquid to fall`);
  }
  return e;
}

export function fluidFlow(s: FluidFlowSpec): Scene {
  const c = kit(s), {k, bx0, by0, bx1, by1, bw, bh, narrow, ill, props, facts, line, label, rect, seg, arrow, dot, anchors} = c;
  const g = gOf(s), liq = s.liquid ?? (s.kind === 'lift' ? 'air' : 'water'), rho = rhoOf(s) ?? LIQUIDS[liq.toLowerCase()]?.rho ?? 1000, fill = colour(liq);

  if (s.kind === 'continuity' || s.kind === 'bernoulli') {
    const bern = s.kind === 'bernoulli', n = s.outlets ?? 1;
    const A1 = s.A1 ?? Math.PI * s.d1! ** 2 / 4, A2 = (s.A2 ?? Math.PI * s.d2! ** 2 / 4) * n, v1 = s.v1 ?? 1, v2 = v1 * A1 / A2;
    const h1 = s.h1 ?? 0, h2 = s.h2 ?? 0, rise = bern && h2 !== h1;
    // the pipe: wide on the left, narrowing, then narrow (raised when h2 > h1); its half-width from the areas
    const xa = bx0 + 0.02 * bw, xb = bx0 + 0.38 * bw, xc = bx0 + 0.6 * bw, xd = bx0 + 0.98 * bw;
    const mid = by0 + (bern ? 0.7 : 0.5) * bh, lift = rise ? Math.sign(h2 - h1) * 0.16 * bh : 0;
    const r1 = Math.min(bern ? 0.14 * bh : 0.2 * bh, 0.16 * bw), r2 = Math.max(16 * k, r1 * Math.sqrt(Math.min(1, A2 / n / A1)) * (n > 1 ? 1.6 : 1));
    const yc = (x: number) => (x <= xb ? mid : x >= xc ? mid - lift : mid - lift * (x - xb) / (xc - xb));
    const rr = (x: number) => (x <= xb ? r1 : x >= xc ? r2 : r1 + (r2 - r1) * (0.5 - 0.5 * Math.cos(Math.PI * (x - xb) / (xc - xb))));
    const xsamp = Array.from({length: 41}, (_, i) => xa + (xd - xa) * i / 40);
    props.push({id: 'pipe', type: 'polyline', closed: true, points: [...xsamp.map(x => [x, yc(x) - rr(x)] as P2), ...xsamp.slice().reverse().map(x => [x, yc(x) + rr(x)] as P2)], style: {fill, opacity: 0.22}, layer: 1} as Prop);
    props.push({id: 'wtop', type: 'polyline', points: xsamp.map(x => [x, yc(x) - rr(x)] as P2), style: {stroke: 'ink', width: 4 * k}, layer: 3} as Prop,
      {id: 'wbot', type: 'polyline', points: xsamp.map(x => [x, yc(x) + rr(x)] as P2), style: {stroke: 'ink', width: 4 * k}, layer: 3} as Prop);
    // streamlines: they crowd where the pipe narrows; particles ride them, faster there (speed ∝ 1 / area)
    const lanes = [-0.6, 0, 0.6], dur = 8, speed = (x: number) => (rr(x) / r1) ** -2;
    lanes.forEach((u, li) => {
      props.push({id: `sl${li}`, type: 'polyline', points: xsamp.map(x => [x, yc(x) + u * rr(x)] as P2), style: {stroke: 'muted', width: 2 * k, dash: [6 * k, 8 * k]}, layer: 2} as Prop);
      // the time to reach each sample, at a drawn speed that keeps the narrow part readable
      const base = (xd - xa) / 5.2, tt = [0];
      for (let i = 1; i < xsamp.length; i++) tt.push(tt[i - 1] + (xsamp[i] - xsamp[i - 1]) / (base * Math.min(6, Math.sqrt(speed((xsamp[i] + xsamp[i - 1]) / 2)))));
      for (let j = 0; j < 5; j++) {
        const start = 0.4 + j * 1.2 + li * 0.4, keysX: Key[] = [], keysY: Key[] = [];
        xsamp.forEach((x, i) => { keysX.push([start + tt[i], x, 'linear']); keysY.push([start + tt[i], yc(x) + u * rr(x), 'linear']); });
        if (start > dur) continue;
        props.push({id: `pp${li}-${j}`, type: 'circle', x: xa, y: yc(xa) + u * r1, r: 7 * k, style: {fill: 'accent'}, layer: 4, show: [start, start + tt[tt.length - 1]], keys: {x: keysX, y: keysY}} as Prop);
      }
    });
    const s1x = (xa + xb) / 2, s2x = (xc + xd) / 2;
    for (const [i, x, A, vv] of [[1, s1x, A1, v1], [2, s2x, A2 / n, v2]] as const) {
      seg(`cs${i}`, x, yc(x) - rr(x), x, yc(x) + rr(x), {stroke: 'accent', width: 3 * k}, {layer: 4});
      label(`lA${i}`, x, yc(x) + rr(x) + 34 * k, ill ? `A${'₁₂'[i - 1]}, v${'₁₂'[i - 1]}` : `v${'₁₂'[i - 1]} = ${num(vv)} m/s`, {align: 'middle', style: {fill: 'accent'}});
      anchors[`section${i}`] = [x, yc(x)];
      void A;
    }
    if (bern) {
      // each section's pressure as a column in a vertical tube; the sum P + ½ρv² + ρgh the same
      const P1 = s.P1 ?? PA + 0.5 * rho * Math.max(v2 * v2 - v1 * v1, 0) + rho * g * Math.max(h2 - h1, 0) + 2e4;
      const P2 = P1 + 0.5 * rho * (v1 * v1 - v2 * v2) + rho * g * (h1 - h2);
      const tot = P1 + 0.5 * rho * v1 * v1 + rho * g * h1, rest = Math.max(0.5 * rho * v1 * v1 + rho * g * h1, 0.5 * rho * v2 * v2 + rho * g * h2);
      // P dwarfs ½ρv² and ρgh (2 × 10⁵ Pa beside 500): the bars start from a cut-off base, marked, so the trade shows
      const base = Math.min(P1, P2) > 3 * rest ? Math.min(P1, P2) - 2 * rest : 0;
      const bars = [[P1 - base, 0.5 * rho * v1 * v1, rho * g * h1], [P2 - base, 0.5 * rho * v2 * v2, rho * g * h2]];
      const bw2 = 46 * k, bt = by0 + 0.02 * bh, bmax = 0.3 * bh, totD = tot - base;
      bars.forEach((b, i) => {
        const x = (i ? s2x : s1x) + (i ? -1 : 1) * (0.06 * bw), ttop = bt;
        let y = ttop + bmax;
        b.forEach((val, j) => {
          const hh = bmax * val / totD;
          rect(`bar${i}${j}`, x - bw2 / 2, y - hh, bw2, hh, {fill: ['cool', 'accent', 'good'][j], opacity: 0.8}, {show: [2 + 0.4 * j, 1e9], fade: 0.3, layer: 4});
          y -= hh;
        });
        label(`lbar${i}`, x, ttop + bmax + 30 * k, `${i + 1}`, {align: 'middle', size: 22 * k, style: {fill: 'muted'}});
        if (base) props.push({id: `cut${i}`, type: 'polyline', points: [[x - bw2 / 2 - 6 * k, ttop + bmax - 4 * k], [x - 8 * k, ttop + bmax - 12 * k], [x + 8 * k, ttop + bmax + 4 * k], [x + bw2 / 2 + 6 * k, ttop + bmax - 4 * k]],
          style: {stroke: 'paper', width: 5 * k}, layer: 5, show: [2, 1e9]} as Prop);
      });
      seg('const', s1x + 0.06 * bw - bw2, bt, s2x - 0.06 * bw + bw2, bt, {stroke: 'ink', width: 2 * k, dash: [8 * k, 6 * k]}, {show: [3.4, 1e9], fade: 0.3, layer: 5});
      label('lconst', (s1x + s2x) / 2, bt - 10 * k, 'the same sum', {align: 'middle', style: {fill: 'ink'}, show: [3.4, 1e9], size: 22 * k});
      line('l1', 'P + ½ρv² + ρgh is the same at every point of a streamline', 0.4, {weight: 700});
      line('l2', 'Pressure P', 2, {style: {fill: 'cool'}}); line('l3', 'Kinetic energy per unit volume ½ρv²', 2.4, {style: {fill: 'accent'}});
      line('l4', 'Potential energy per unit volume ρgh', 2.8, {style: {fill: 'good'}});
      line('l5', ill ? (v2 > v1 ? 'Where it flows faster, the pressure is lower' : 'Where it flows slower, the pressure is higher')
        : `P₂ = ${num(P2)} Pa: ${P2 < P1 ? 'lower' : 'higher'} than P₁ = ${num(P1)} Pa`, 3.6, {style: {fill: 'cool'}});
      line('l6', base ? 'Steady, incompressible flow without viscosity; the bars start from a cut-off base' : 'Steady, incompressible flow without viscosity', 4.2, {style: {fill: 'muted'}});
      facts.push(`section 1: P₁ = ${num(P1)} Pa, v₁ = ${num(v1)} m/s, h₁ = ${num(h1)} m; section 2: P₂ = ${num(P2)} Pa, v₂ = ${num(v2)} m/s, h₂ = ${num(h2)} m`,
        `P + ½ρv² + ρgh = ${num(tot)} Pa at both (ρ = ${num(rho)} kg/m³)`);
      return c.end('fluid_flow', dur, {v2, P2});
    }
    line('l1', 'Steady flow: the same volume passes every section each second', 0.4, {weight: 700});
    line('l2', ill ? 'A₁v₁ = A₂v₂: narrower, faster' : `A₁v₁ = A₂v₂: ${num(A1)} m² × ${num(v1)} m/s = ${num(A2)} m² × ${num(v2)} m/s`, 1.6, {style: {fill: 'accent'}});
    if (!ill) line('l3', `Flow rate Av = ${num(A1 * v1)} m³/s`, 2.2, {style: {fill: 'cool'}});
    line('l4', 'Where the streamlines crowd, the liquid moves faster', 2.8, {style: {fill: 'muted'}});
    facts.push(`A₁ = ${num(A1)} m², v₁ = ${num(v1)} m/s; ${n > 1 ? `${n} outlets, total area ${num(A2)} m²` : `A₂ = ${num(A2)} m²`}: v₂ = A₁v₁ / A₂ = ${num(v2)} m/s`, `volume flow rate ${num(A1 * v1)} m³/s`);
    return c.end('fluid_flow', dur, {v2});
  }

  if (s.kind === 'torricelli') {
    const h = s.h!, y = s.y ?? h, v = Math.sqrt(2 * g * h), tf = Math.sqrt(2 * y / g), x = v * tf;
    const ground = by1 - 0.04 * bh, top = by0 + 0.06 * bh, sc = Math.min((ground - top) / ((h + y) * 1.1), 0.62 * bw / Math.max(x, 1e-6) * 0.9, 0.3 * bw / Math.max(h * 0.5, 1e-6));
    const tx0 = bx0 + 0.05 * bw, tw = Math.min(0.28 * bw, sc * h * 0.8 + 80 * k), holeY = ground - y * sc, surf = holeY - h * sc;
    seg('ground', bx0, ground, bx1, ground, {stroke: 'muted', width: 4 * k});
    rect('stand', tx0 + 10 * k, holeY + 30 * k, tw - 20 * k, ground - holeY - 30 * k, {fill: 'faint'}, {layer: 1});
    rect('water', tx0, surf, tw, holeY + 30 * k - surf, {fill, opacity: 0.45}, {layer: 1});
    seg('tl', tx0, surf - 40 * k, tx0, holeY + 30 * k, {stroke: 'ink', width: 4 * k}); seg('tr', tx0 + tw, surf - 40 * k, tx0 + tw, holeY - 8 * k, {stroke: 'ink', width: 4 * k});
    seg('tr2', tx0 + tw, holeY + 8 * k, tx0 + tw, holeY + 30 * k, {stroke: 'ink', width: 4 * k}); seg('tb', tx0, holeY + 30 * k, tx0 + tw, holeY + 30 * k, {stroke: 'ink', width: 4 * k});
    // the jet: a parabola from the hole, drawn on
    const pts: P2[] = Array.from({length: 31}, (_, i) => { const t = tf * i / 30; return [tx0 + tw + v * t * sc, holeY + 0.5 * g * t * t * sc]; });
    props.push({id: 'jet', type: 'polyline', points: pts, draw: 1, style: {stroke: fill, width: 9 * k}, layer: 2, keys: {draw: [[0.8, 0], [2.4, 1, 'out']]}} as Prop);
    seg('hdim', tx0 + tw + 30 * k, surf, tx0 + tw + 30 * k, holeY, {stroke: 'accent', width: 3 * k}, {show: [1.2, 1e9], fade: 0.3});
    label('lh', tx0 + tw + 44 * k, (surf + holeY) / 2, ill ? 'h' : `h = ${len(h)}`, {style: {fill: 'accent'}, show: [1.2, 1e9]});
    arrow('vjet', tx0 + tw + 4 * k, holeY, tx0 + tw + 110 * k, holeY, 'good', {show: [1.6, 1e9], fade: 0.3});
    label('lv', tx0 + tw + 60 * k, holeY - 18 * k, 'v', {align: 'middle', style: {fill: 'good'}, show: [1.6, 1e9]});
    if (s.y !== undefined) label('lx', pts[30][0], ground + 34 * k, ill ? 'lands here' : `x = ${len(x)}`, {align: 'middle', style: {fill: 'muted'}, show: [2.4, 1e9]});
    Object.assign(anchors, {surface: [tx0 + tw / 2, surf], hole: [tx0 + tw, holeY], landing: pts[30]});
    line('l1', 'A hole h below the surface of an open tank', 0.3, {weight: 700});
    line('l2', ill ? 'Bernoulli between the surface and the hole: v = √(2gh)' : `v = √(2gh) = ${num(v)} m/s`, 1.6, {style: {fill: 'good'}});
    line('l3', 'The speed of a body falling freely through h (Torricelli\'s law)', 2.2, {style: {fill: 'muted'}});
    if (s.y !== undefined && !ill) line('l4', `From ${len(y)} up, the jet lands ${len(x)} away`, 2.6, {style: {fill: 'cool'}});
    facts.push(`speed of efflux v = √(2gh) = ${num(v)} m/s for h = ${len(h)}`, ...(s.y !== undefined ? [`the jet from a hole ${len(y)} above the ground lands ${len(x)} away (x = 2√(hy))`] : []));
    return c.end('fluid_flow', 5.4, {v, x});
  }

  if (s.kind === 'lift') {
    const body = s.body!, cx = bx0 + 0.48 * bw, cy = by0 + 0.5 * bh, R = Math.min(0.16 * bh, 0.12 * bw);
    // streamlines from the left; above the body they bunch when it spins or is a wing, symmetric for a still ball
    const crowd = body === 'ball' ? 0 : 0.5, lanes = [-3, -2, -1, 1, 2, 3], x0 = bx0 + 0.02 * bw, x1 = bx0 + 0.98 * bw;
    const shape = (x: number) => Math.exp(-(((x - cx) / (1.6 * R)) ** 2));
    const yOf = (lane: number, x: number) => {
      const base = cy + lane * 0.42 * R * 1.3, push = (lane > 0 ? 1 : -1) * R * 1.05 * shape(x) / Math.abs(lane) ** 0.6;
      const squeeze = lane < 0 ? crowd * 0.35 * R * shape(x) * (4 - Math.abs(lane)) / 3 : -crowd * 0.15 * R * shape(x);
      return base + push + squeeze;
    };
    lanes.forEach((ln, i) => {
      const pts: P2[] = Array.from({length: 61}, (_, j) => { const x = x0 + (x1 - x0) * j / 60; return [x, yOf(ln, x)]; });
      props.push({id: `sl${i}`, type: 'polyline', points: pts, style: {stroke: 'cool', width: 3 * k, opacity: 0.8}, layer: 2, draw: 1, keys: {draw: [[0.2 + 0.1 * i, 0], [1.6 + 0.1 * i, 1, 'linear']]}} as Prop);
    });
    if (body === 'wing') {
      const pts: P2[] = Array.from({length: 41}, (_, i) => { const u = i / 40, xx = cx - 1.8 * R + 3.6 * R * u, th = 0.55 * R * (2.97 * Math.sqrt(u) - 1.26 * u - 3.52 * u * u + 2.84 * u ** 3 - 1.0 * u ** 4); return [xx, cy - th - 0.12 * R * Math.sin(Math.PI * u)]; });
      const low: P2[] = pts.slice().reverse().map(([x, y2]) => [x, cy + 0.1 * R * Math.sin(Math.PI * (x - (cx - 1.8 * R)) / (3.6 * R))]);
      props.push({id: 'body', type: 'polyline', closed: true, points: [...pts, ...low], style: {fill: 'figure', stroke: 'ink', width: 3 * k}, layer: 3} as Prop);
    } else {
      props.push({id: 'body', type: 'circle', x: cx, y: cy, r: R * 0.7, style: {fill: 'figure', stroke: 'ink', width: 3 * k}, layer: 3} as Prop);
      if (body === 'spin') {
        // clockwise: the top moves with the air (left to right), dragging it faster over the top (Fig. 9.11 b)
        const arc: P2[] = Array.from({length: 16}, (_, i) => { const a = 2.4 - 2.7 * i / 15; return [cx + 0.45 * R * Math.cos(a), cy - 0.45 * R * Math.sin(a)]; });
        props.push({id: 'spinarc', type: 'polyline', points: arc, style: {stroke: 'bad', width: 5 * k}, layer: 4} as Prop);
        arrow('spinhead', arc[14][0], arc[14][1], arc[15][0], arc[15][1], 'bad', {head: 18 * k} as never);
      }
    }
    arrow('wind', bx0 + 0.04 * bw, by0 + 0.08 * bh, bx0 + 0.2 * bw, by0 + 0.08 * bh, 'muted');
    label('lwind', bx0 + 0.04 * bw, by0 + 0.08 * bh - 18 * k, body === 'wing' ? 'air, relative to the wing' : 'air, relative to the ball', {size: 22 * k, style: {fill: 'muted'}});
    if (body !== 'ball') {
      arrow('lift', cx, cy - 0.8 * R, cx, cy - 0.8 * R - 0.75 * R - 60 * k, 'good', {show: [2.2, 1e9], fade: 0.3, layer: 6});
      label('llift', cx + 18 * k, cy - 1.5 * R - 40 * k, 'lift', {style: {fill: 'good'}, show: [2.2, 1e9]});
    }
    label('lfast', cx + 2 * R, cy - 1.75 * R, body === 'ball' ? 'same speed above' : 'faster: lower pressure', {style: {fill: body === 'ball' ? 'muted' : 'accent'}, show: [1.8, 1e9], size: 22 * k});
    label('lslow', cx + 2 * R, cy + 1.95 * R, body === 'ball' ? 'and below' : 'slower: higher pressure', {style: {fill: 'muted'}, show: [1.8, 1e9], size: 22 * k});
    Object.assign(anchors, {body: [cx, cy], above: [cx, cy - 1.3 * R], below: [cx, cy + 1.3 * R]});
    const names = {ball: 'A ball moving without spin', spin: 'A spinning ball (Magnus effect)', wing: 'An aerofoil: a wing\'s cross-section'};
    line('l1', names[body], 0.3, {weight: 700});
    line('l2', body === 'ball' ? 'Streamlines are symmetric: no pressure difference, no lift' : 'Streamlines crowd above it: air flows faster there', 1.8, {style: {fill: 'cool'}});
    if (body !== 'ball') line('l3', 'By Bernoulli, faster flow means lower pressure: a net upward force, dynamic lift', 2.2, {style: {fill: 'good'}});
    let dP: number | undefined, L: number | undefined;
    if (isNum(s.mass) && isNum(s.area)) { dP = s.mass * g / s.area; L = s.mass * g; }
    if (isNum(s.v_top) && isNum(s.v_bottom)) { dP = 0.5 * rho * (s.v_top ** 2 - s.v_bottom ** 2); L = isNum(s.area) ? dP * s.area : undefined; }
    if (dP !== undefined && !ill) {
      line('l4', `ΔP = ${isNum(s.mass) ? 'mg / A' : '½ρ(v_top² − v_bottom²)'} = ${num(dP)} Pa${L !== undefined ? `; lift ${num(L)} N` : ''}`, 2.8, {weight: 700, style: {fill: 'accent'}});
      facts.push(`pressure difference across the wing ΔP = ${num(dP)} Pa`, ...(L !== undefined ? [`lift ${num(L)} N`] : []));
      if (isNum(s.v) && isNum(s.mass)) {
        const frac = dP / (rho * s.v * s.v);
        line('l5', `At v = ${num(s.v)} m/s: (v_top − v_bottom) / v ≈ ΔP / ρv² = ${num(frac)}`, 3.2, {style: {fill: 'muted'}});
        facts.push(`fractional increase in the speed of air above the wing ≈ ΔP/(ρv²) = ${num(frac)} (${num(100 * frac)} %)`);
      }
    }
    facts.push(body === 'ball' ? 'no spin: streamlines symmetric, no lift' : `${body === 'spin' ? 'spinning ball: the Magnus effect' : 'aerofoil'}: faster air above, lower pressure there, upward dynamic lift`);
    return c.end('fluid_flow', 5, {...(dP !== undefined ? {dP} : {})});
  }

  if (s.kind === 'layers') {
    const pipeProfile = s.profile === 'pipe';
    const x0 = bx0 + 0.08 * bw, x1 = bx0 + 0.92 * bw, top = by0 + 0.22 * bh, bot = by1 - 0.2 * bh, n = 6, L = 0.28 * bw;
    if (!pipeProfile) {
      rect('fixed', x0, bot, x1 - x0, 24 * k, {fill: 'faint', stroke: 'ink', width: 2 * k});
      rect('plate', x0 + 0.1 * bw, top - 24 * k, 0.5 * (x1 - x0), 24 * k, {fill: 'figure', stroke: 'ink', width: 2 * k}, {keys: {x: [[0.8, x0 + 0.1 * bw], [4.8, x0 + 0.1 * bw + L, 'linear']]} as never});
      arrow('F', x0 + 0.1 * bw + 0.5 * (x1 - x0), top - 12 * k, x0 + 0.1 * bw + 0.5 * (x1 - x0) + 100 * k, top - 12 * k, 'accent', {keys: {x1: [[0.8, x0 + 0.1 * bw + 0.5 * (x1 - x0)], [4.8, x0 + 0.1 * bw + 0.5 * (x1 - x0) + L, 'linear']], x2: [[0.8, x0 + 0.1 * bw + 0.5 * (x1 - x0) + 100 * k], [4.8, x0 + 0.1 * bw + 0.5 * (x1 - x0) + 100 * k + L, 'linear']]} as never});
      label('lfixed', x1, bot + 60 * k, 'fixed', {align: 'end', style: {fill: 'muted'}});
      rect('liquid', x0, top, x1 - x0, bot - top, {fill, opacity: 0.22}, {layer: 1});
      // a liquid element ABCD sheared into AEFD: each layer slides in proportion to its height
      const ex = x0 + 0.15 * bw, ew = 0.12 * bw;
      props.push({id: 'elem', type: 'polyline', closed: true, points: [[ex, bot], [ex + ew, bot], [ex + ew, top], [ex, top]], style: {stroke: 'accent', width: 3 * k}, layer: 4,
        keys: {}} as Prop);
      for (let i = 1; i < n; i++) {
        const y = bot - (bot - top) * i / n, sh = L * i / n;
        arrow(`v${i}`, x0 + 0.62 * bw, y, x0 + 0.62 * bw + 30 * k + 1.2 * sh * 0.6, y, 'cool', {show: [1.4 + 0.1 * i, 1e9], fade: 0.3});
      }
      props.push({id: 'sheared', type: 'polyline', closed: true, points: [[ex, bot], [ex + ew, bot], [ex + ew + L * 0.35, top], [ex + L * 0.35, top]], style: {stroke: 'bad', width: 3 * k, dash: [8 * k, 6 * k]}, layer: 4, show: [3, 1e9], fade: 0.4} as Prop);
      label('lv', x0 + 0.62 * bw + 30 * k + 1.2 * L * 0.6 + 14 * k, top + 10 * k, 'v', {style: {fill: 'cool'}, show: [1.9, 1e9]});
      label('l0', x0 + 0.62 * bw + 30 * k, bot - 14 * k, '0', {style: {fill: 'cool'}, show: [1.4, 1e9]});
      seg('ldim', x1 - 20 * k, top, x1 - 20 * k, bot, {stroke: 'muted', width: 2 * k}); label('ll', x1 - 32 * k, (top + bot) / 2, 'l', {align: 'end', style: {fill: 'muted'}});
      Object.assign(anchors, {plate: [x0 + 0.35 * bw, top - 12 * k], fixed: [(x0 + x1) / 2, bot + 12 * k], element: [ex + ew / 2, (top + bot) / 2]});
      line('l1', 'Liquid between a fixed plate and one moving at v', 0.3, {weight: 700});
      line('l2', 'Each layer is pulled forward by the one above and back by the one below: the speed grows evenly from 0 to v', 1.4, {style: {fill: 'cool'}});
      line('l3', 'The shear strain keeps growing: stress depends on the strain rate v / l', 3, {style: {fill: 'bad'}});
      line('l4', 'η = (F / A) / (v / l), in Pa s (poiseuille)', 3.6, {weight: 700, style: {fill: 'accent'}});
    } else {
      // a pipe: fastest along the axis, zero at the walls
      const cy = (top + bot) / 2, r = (bot - top) / 2;
      seg('wt', x0, top, x1, top, {stroke: 'ink', width: 4 * k}); seg('wb', x0, bot, x1, bot, {stroke: 'ink', width: 4 * k});
      rect('liquid', x0, top, x1 - x0, bot - top, {fill, opacity: 0.22}, {layer: 1});
      for (let i = -4; i <= 4; i++) {
        const y = cy + r * i / 4.6, u = 1 - (i / 4.6) ** 2, xs = x0 + 0.3 * bw;
        arrow(`v${i}`, xs, y, xs + 20 * k + 0.36 * bw * u, y, 'cool', {show: [0.8 + 0.08 * (i + 4), 1e9], fade: 0.3});
      }
      Object.assign(anchors, {axis: [x0 + 0.66 * bw, cy], wall: [x0 + 0.3 * bw, top]});
      line('l1', 'Laminar flow in a pipe', 0.3, {weight: 700});
      line('l2', 'Fastest along the axis, slowing to zero at the walls', 1.6, {style: {fill: 'cool'}});
      line('l3', 'Each cylindrical layer moves at one speed', 2.2, {style: {fill: 'muted'}});
    }
    const F = s.F ?? (isNum(s.hang) ? s.hang * g : undefined);
    if (isNum(F) && isNum(s.area) && isNum(s.v) && isNum(s.gap)) {
      const eta = (F / s.area) / (s.v / s.gap);
      if (!ill) line('l5', `F = ${num(F)} N, A = ${num(s.area)} m², v = ${num(s.v)} m/s, l = ${len(s.gap)}: η = ${num(eta)} Pa s`, 4.2, {style: {fill: 'accent'}});
      facts.push(`shear stress F/A = ${num(F / s.area)} Pa, strain rate v/l = ${num(s.v / s.gap)} s⁻¹, viscosity η = ${num(eta)} Pa s`);
      return c.end('fluid_flow', 6.4, {eta});
    }
    facts.push(pipeProfile ? 'laminar flow in a pipe: fastest on the axis, zero at the walls' : 'the layers\' speed grows evenly from 0 at the fixed plate to v; η = (F/A)/(v/l)');
    return c.end('fluid_flow', 6);
  }

  // stokes: a sphere released in a liquid speeds up until the drag and the buoyancy balance its weight
  const a = s.a!, rs = s.density ?? SOLIDS[(s.material ?? '').toLowerCase()]!, rl = rho;
  const eta = s.eta ?? (s.vt !== undefined ? 2 * a * a * (rs - rl) * g / (9 * s.vt) : LIQUIDS[liq.toLowerCase()]!.eta!), vt = s.vt ?? 2 * a * a * (rs - rl) * g / (9 * eta);
  const W = (4 / 3) * Math.PI * a ** 3 * rs * g, U = (4 / 3) * Math.PI * a ** 3 * rl * g, tau = vt / (g * (1 - rl / rs));
  const top = by0 + 0.06 * bh, bot = by1 - 0.04 * bh, cx = bx0 + 0.3 * bw, tank = 0.32 * bw, dur = 7;
  rect('liquid', cx - tank / 2, top + 40 * k, tank, bot - top - 40 * k, {fill, opacity: 0.3}, {layer: 1});
  seg('tl', cx - tank / 2, top, cx - tank / 2, bot, {stroke: 'ink', width: 4 * k}); seg('tr', cx + tank / 2, top, cx + tank / 2, bot, {stroke: 'ink', width: 4 * k});
  seg('tb', cx - tank / 2, bot, cx + tank / 2, bot, {stroke: 'ink', width: 4 * k});
  // the drawn fall: speeding up over the first stretch, then steady (the drawing's time, not real time)
  const T = 5.4, t0 = 0.8, tauD = T / 5, yAt = (t: number) => { const u = Math.max(0, t - t0); return u - tauD * (1 - Math.exp(-u / tauD)); };
  const yEnd = yAt(t0 + T), ys = Array.from({length: 28}, (_, i) => t0 + T * i / 27), y0 = top + 80 * k, y1 = bot - 170 * k;
  const yk: Key[] = ys.map(t => [t, y0 + (y1 - y0) * yAt(t) / yEnd, 'linear']);
  const rpx = 22 * k;
  props.push({id: 'ball', type: 'circle', x: cx, y: y0, r: rpx, style: {fill: 'figure', stroke: 'ink', width: 2 * k}, layer: 4, keys: {y: [[0, y0], ...yk]}} as Prop);
  const frac = (t: number) => 1 - Math.exp(-Math.max(0, t - t0) / tauD);
  const fk = (scale: number, off: number, sign: number) => ys.map(t => [t, 0, 'linear'] as Key).map(([t], i) => [t, y0 + (y1 - y0) * yAt(t) / yEnd + sign * (off + scale * (sign > 0 ? 1 : frac(t))), 'linear'] as Key);
  const Wpx = 120 * k, upx = Wpx * U / W, dpx = Wpx * (1 - U / W);
  props.push({id: 'fW', type: 'arrow', x1: cx, y1: y0 + rpx, x2: cx, y2: y0 + rpx + Wpx, head: 14 * k, style: {stroke: 'bad', width: 4 * k}, layer: 5,
    keys: {y1: ys.map(t => [t, y0 + (y1 - y0) * yAt(t) / yEnd + rpx, 'linear']), y2: ys.map(t => [t, y0 + (y1 - y0) * yAt(t) / yEnd + rpx + Wpx, 'linear'])}} as Prop);
  props.push({id: 'fU', type: 'arrow', x1: cx - 14 * k, y1: y0 - rpx, x2: cx - 14 * k, y2: y0 - rpx - upx, head: 14 * k, style: {stroke: 'cool', width: 4 * k}, layer: 5,
    keys: {y1: ys.map(t => [t, y0 + (y1 - y0) * yAt(t) / yEnd - rpx, 'linear']), y2: ys.map(t => [t, y0 + (y1 - y0) * yAt(t) / yEnd - rpx - upx, 'linear'])}} as Prop);
  props.push({id: 'fD', type: 'arrow', x1: cx + 14 * k, y1: y0 - rpx, x2: cx + 14 * k, y2: y0 - rpx, head: 14 * k, style: {stroke: 'accent', width: 4 * k}, layer: 5,
    keys: {y1: ys.map(t => [t, y0 + (y1 - y0) * yAt(t) / yEnd - rpx, 'linear']), y2: ys.map(t => [t, y0 + (y1 - y0) * yAt(t) / yEnd - rpx - dpx * frac(t), 'linear'])}} as Prop);
  void fk;
  const lx = cx + tank / 2 + 20 * k;
  label('lW', lx, y0 + 60 * k, 'weight', {style: {fill: 'bad'}, size: 22 * k}); label('lU', lx, y0 + 90 * k, 'buoyancy', {style: {fill: 'cool'}, size: 22 * k});
  label('lD', lx, y0 + 120 * k, 'viscous drag 6πηav', {style: {fill: 'accent'}, size: 22 * k});
  // the speed against time, rising to vt
  // half width: the graph sits below the force names, which sat on its top (2026-10-30)
  const gx0 = bx0 + 0.56 * bw, gx1 = bx0 + 0.98 * bw, gy0 = narrow ? y0 + 170 * k : by0 + 0.55 * bh, gy1 = by1 - 0.06 * bh;
  arrow('ax', gx0, gy1, gx1, gy1, 'muted', {head: 12 * k} as never); arrow('ay', gx0, gy1, gx0, gy0 - 20 * k, 'muted', {head: 12 * k} as never);
  label('lax', gx1, gy1 + 30 * k, 't', {align: 'end', style: {fill: 'muted'}, size: 22 * k}); label('lay', gx0 + 12 * k, gy0 - 16 * k, 'v', {style: {fill: 'muted'}, size: 22 * k});
  const vy = (t: number) => gy1 - (gy1 - gy0) * 0.85 * frac(t), vx = (t: number) => gx0 + (gx1 - gx0) * (t - t0) / T;
  props.push({id: 'vcurve', type: 'polyline', points: ys.map(t => [vx(t), vy(t)] as P2), draw: 1, style: {stroke: 'good', width: 4 * k}, layer: 3, keys: {draw: [[t0, 0], [t0 + T, 1, 'linear']]}} as Prop);
  seg('vt', gx0, gy1 - (gy1 - gy0) * 0.85, gx1, gy1 - (gy1 - gy0) * 0.85, {stroke: 'good', width: 2 * k, dash: [8 * k, 6 * k]}, {show: [t0 + 2, 1e9], fade: 0.3});
  label('lvt', gx1, gy1 - (gy1 - gy0) * 0.85 - 14 * k, 'terminal velocity', {align: 'end', style: {fill: 'good'}, size: 22 * k, show: [t0 + 2, 1e9]});
  Object.assign(anchors, {ball: [cx, y1], top: [cx, y0], graph: [(gx0 + gx1) / 2, (gy0 + gy1) / 2]});
  line('l1', 'A sphere falling through a liquid', 0.3, {weight: 700});
  line('l2', 'The drag grows with its speed (Stokes: F = 6πηav) until drag and buoyancy balance its weight', t0 + 1, {style: {fill: 'accent'}});
  line('l3', ill ? 'Then it falls at a steady terminal velocity vt = 2a²(ρ − σ)g / 9η' : `Terminal velocity vt = 2a²(ρ − σ)g / 9η = ${num(vt)} m/s`, t0 + 2.6, {weight: 700, style: {fill: 'good'}});
  if (s.vt !== undefined && !ill) line('l4', `Measured vt = ${num(s.vt)} m/s gives η = ${num(eta)} Pa s`, t0 + 3.2, {style: {fill: 'cool'}});
  facts.push(`sphere radius ${len(a)}, density ${num(rs)} kg/m³ in ${s.liquid ?? 'the liquid'} (density ${num(rl)} kg/m³, η = ${num(eta)} Pa s)`,
    `terminal velocity vt = 2a²(ρ − σ)g/(9η) = ${num(vt)} m/s`, `weight ${num(W)} N, buoyancy ${num(U)} N, drag at vt 6πηa·vt = ${num(6 * Math.PI * eta * a * vt)} N`);
  void tau;
  return c.end('fluid_flow', dur, {vt, eta});
}

// ───────────────────────────── surface_tension ─────────────────────────────
export const SURFACE_KINDS = ['molecules', 'film', 'contact', 'drop', 'capillary'] as const;
export type SurfaceSpec = Common & {verb: 'surface_tension'; kind: (typeof SURFACE_KINDS)[number]; liquid?: string; rho?: number; S?: number; g?: number;
  l?: number; F?: number; weight?: number; d?: number; theta?: number; surface?: string; shape?: 'drop' | 'cavity' | 'bubble'; r?: number;
  depth?: number; Pa?: number; a?: number; radii?: number[]; compare?: string[]};
const SURFACES: Record<string, number> = {glass: 0, 'clean glass': 0, plastic: 30, wax: 107, 'lotus leaf': 160, 'waxed paper': 107};

export function surfaceErrors(s: SurfaceSpec): string[] {
  const e: string[] = [], v = 'surface_tension';
  if (!SURFACE_KINDS.includes(s.kind)) return [`${v}: kind is one of ${SURFACE_KINDS.join(', ')}`];
  const le = liquidError(s); if (le) e.push(`${v}: ${le}`);
  const ge = gError(s, v); if (ge) e.push(ge);
  if (s.S !== undefined && !(isNum(s.S) && s.S > 0 && s.S <= 1)) e.push(`${v}: S is a surface tension in N/m (water 0.073)`);
  const Sneeded = () => { if (s.S === undefined && liquidOf(s)?.S === undefined && !s.illustrative) e.push(`${v}: give liquid (water, mercury, soap solution ...) or S (N/m)`); };
  if (s.kind === 'film') {
    if (!(isNum(s.l) && s.l > 0 && s.l <= 2)) e.push(`${v}: l is the slider's length in m (30 cm is 0.3)`);
    if (s.F !== undefined && s.weight !== undefined) e.push(`${v}: give F or weight, not both`);
    if (s.F === undefined && s.weight === undefined && s.S === undefined && liquidOf(s)?.S === undefined && !s.illustrative) e.push(`${v}: give weight (N, what the film holds up; S is solved) or S or a liquid (the force is solved)`);
  }
  if (s.kind === 'contact') {
    if (s.theta !== undefined && !(isNum(s.theta) && s.theta >= 0 && s.theta <= 180)) e.push(`${v}: theta is the angle of contact in degrees, 0 to 180`);
    if (s.surface !== undefined && SURFACES[s.surface.toLowerCase()] === undefined) e.push(`${v}: surface is one of ${Object.keys(SURFACES).join(', ')}, or give theta`);
    if (s.theta === undefined && s.surface === undefined && liquidOf(s)?.glass === undefined) e.push(`${v}: give theta (degrees) or surface (glass, wax, lotus leaf ...) for the liquid`);
  }
  if (s.kind === 'drop') {
    if (!['drop', 'cavity', 'bubble'].includes(s.shape ?? 'drop')) e.push(`${v}: shape is 'drop' (liquid in air), 'cavity' (air in a liquid) or 'bubble' (a soap bubble: two surfaces)`);
    if (!(isNum(s.r) && s.r > 0 && s.r <= 0.5)) e.push(`${v}: r is the radius in m (3 mm is 0.003)`);
    if (s.depth !== undefined && !(isNum(s.depth) && s.depth >= 0 && s.depth <= 100 && s.shape === 'cavity')) e.push(`${v}: depth (m) is for an air cavity under a liquid's surface`);
    Sneeded();
  }
  if (s.kind === 'capillary') {
    const radii = s.radii ?? (s.a !== undefined ? [s.a] : []);
    if (!radii.length || radii.length > 3 || !radii.every(r => isNum(r) && r > 0 && r <= 0.01)) e.push(`${v}: a is the tube's radius in m (0.05 cm is 5e-4), or radii: 2 or 3 radii to compare`);
    if (s.theta !== undefined && !(isNum(s.theta) && s.theta >= 0 && s.theta <= 180)) e.push(`${v}: theta is the angle of contact in degrees`);
    Sneeded();
  }
  if (s.kind === 'molecules' && s.compare !== undefined) e.push(`${v}: molecules takes no compare`);
  return e;
}

export function surfaceTension(s: SurfaceSpec): Scene {
  const c = kit(s), {k, bx0, by0, bx1, by1, bw, bh, narrow, ill, props, facts, line, label, rect, seg, arrow, dot, anchors} = c;
  const g = gOf(s), liq = s.liquid ?? (s.kind === 'film' ? 'soap solution' : 'water'), L = LIQUIDS[liq.toLowerCase()] ?? {rho: 1000};
  const S = s.S ?? L.S ?? 0.073, rho = s.rho ?? L.rho, fill = colour(liq);

  if (s.kind === 'molecules') {
    const surf = by0 + 0.34 * bh, x0 = bx0 + 0.04 * bw, x1 = bx0 + 0.96 * bw;
    rect('liquid', x0, surf, x1 - x0, by1 - surf, {fill, opacity: 0.25}, {layer: 1});
    seg('surf', x0, surf, x1, surf, {stroke: 'ink', width: 3 * k});
    const mol = (id: string, x: number, y: number, hot = false) => props.push({id, type: 'circle', x, y, r: 16 * k, style: {fill: hot ? 'accent' : 'figure', stroke: 'ink', width: 2 * k}, layer: 4} as Prop);
    for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) {
      const x = x0 + 60 * k + i * 0.13 * bw, y = surf + 24 * k + j * 0.15 * bh;
      if (!((i === 1 && j === 2) || (i === 5 && j === 0))) mol(`m${i}${j}`, x, y);
    }
    const inX = x0 + 60 * k + 0.13 * bw, inY = surf + 24 * k + 0.3 * bh, upX = x0 + 60 * k + 5 * 0.13 * bw, upY = surf + 24 * k;
    mol('inside', inX, inY, true); mol('atsurf', upX, upY, true);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; arrow(`in${i}`, inX + 22 * k * Math.cos(a), inY + 22 * k * Math.sin(a), inX + 80 * k * Math.cos(a), inY + 80 * k * Math.sin(a), 'cool', {show: [1, 1e9], fade: 0.3}); }
    for (let i = 0; i < 5; i++) { const a = i * Math.PI / 4; arrow(`up${i}`, upX + 22 * k * Math.cos(a), upY + 22 * k * Math.sin(a), upX + 80 * k * Math.cos(a), upY + 80 * k * Math.sin(a), 'cool', {show: [2, 1e9], fade: 0.3}); }
    arrow('net', upX + 40 * k, upY, upX + 40 * k, upY + 110 * k, 'bad', {show: [2.8, 1e9], fade: 0.3});
    label('lnet', upX + 56 * k, upY + 90 * k, 'net pull inward', {style: {fill: 'bad'}, size: 22 * k, show: [2.8, 1e9]});
    label('lin', inX, surf + 24 * k + 0.45 * bh + 46 * k, 'pulled equally all round', {align: 'middle', size: 22 * k, style: {fill: 'cool'}, show: [1, 1e9]});
    Object.assign(anchors, {inside: [inX, inY], surface: [upX, upY]});
    line('l1', 'A molecule inside is attracted equally on every side', 1, {style: {fill: 'cool'}});
    line('l2', 'At the surface, only the liquid below pulls it: a net pull inward, and less negative potential energy', 2, {style: {fill: 'bad'}});
    line('l3', 'Surface molecules carry extra energy, so a liquid takes the least surface area it can', 2.8, {weight: 700});
    facts.push('a molecule at the surface has extra energy (roughly half the energy to remove it, half the heat of evaporation); a liquid tends to the least surface area');
    return c.end('surface_tension', 5);
  }

  if (s.kind === 'film') {
    // a U-shaped wire and a slider of length l, the film pulling the slider in with 2Sl (two surfaces)
    const l = s.l!, weight = s.weight ?? s.F, Sx = weight !== undefined ? weight / (2 * l) : S, F = 2 * Sx * l;
    const x0 = bx0 + 0.16 * bw, x1 = bx0 + (narrow ? 0.84 : 0.7) * bw, top = by0 + 0.12 * bh, y0 = by0 + 0.48 * bh, dpx = 0.14 * bh;
    seg('uL', x0, top, x0, y0 + dpx + 60 * k, {stroke: 'ink', width: 6 * k}); seg('uR', x1, top, x1, y0 + dpx + 60 * k, {stroke: 'ink', width: 6 * k}); seg('uT', x0, top, x1, top, {stroke: 'ink', width: 6 * k});
    rect('film', x0, top, x1 - x0, y0 - top, {fill: 'cool', opacity: 0.3}, {layer: 1, keys: {h: [[1.2, y0 - top], [3.2, y0 - top + dpx, 'inOut']]} as never});
    rect('slider', x0 - 10 * k, y0 - 6 * k, x1 - x0 + 20 * k, 12 * k, {fill: 'figure', stroke: 'ink', width: 2 * k}, {layer: 4, keys: {y: [[1.2, y0 - 6 * k], [3.2, y0 - 6 * k + dpx, 'inOut']]} as never});
    arrow('Fpull', (x0 + x1) / 2, y0 + 12 * k, (x0 + x1) / 2, y0 + 120 * k, 'accent', {keys: {y1: [[1.2, y0 + 12 * k], [3.2, y0 + 12 * k + dpx, 'inOut']], y2: [[1.2, y0 + 120 * k], [3.2, y0 + 120 * k + dpx, 'inOut']]}} as never);
    label('lF', (x0 + x1) / 2 + 16 * k, y0 + 90 * k, weight !== undefined ? 'W' : 'F', {style: {fill: 'accent'}, keys: {y: [[1.2, y0 + 90 * k], [3.2, y0 + 90 * k + dpx, 'inOut']]} as never});
    arrow('Sin', x0 + 0.25 * (x1 - x0), y0 - 14 * k, x0 + 0.25 * (x1 - x0), y0 - 90 * k, 'cool', {keys: {y1: [[1.2, y0 - 14 * k], [3.2, y0 - 14 * k + dpx, 'inOut']], y2: [[1.2, y0 - 90 * k], [3.2, y0 - 90 * k + dpx, 'inOut']]}} as never);
    label('lS', x0 + 0.25 * (x1 - x0) + 14 * k, y0 - 60 * k, 'film pulls: 2Sl', {style: {fill: 'cool'}, size: 22 * k, keys: {y: [[1.2, y0 - 60 * k], [3.2, y0 - 60 * k + dpx, 'inOut']]}} as never);
    seg('ldim', x0, top - 30 * k, x1, top - 30 * k, {stroke: 'muted', width: 2 * k}); label('ll', (x0 + x1) / 2, top - 44 * k, ill ? 'l' : `l = ${len(l)}`, {align: 'middle', style: {fill: 'muted'}});
    seg('dd', x1 + 30 * k, y0, x1 + 30 * k, y0 + dpx, {stroke: 'bad', width: 3 * k}, {show: [3.2, 1e9], fade: 0.3}); label('ld', x1 + 44 * k, y0 + dpx / 2 + 8 * k, 'd', {style: {fill: 'bad'}, show: [3.2, 1e9]});
    Object.assign(anchors, {slider: [(x0 + x1) / 2, y0 + dpx], film: [(x0 + x1) / 2, (top + y0) / 2], frame: [(x0 + x1) / 2, top]});
    line('l1', 'A soap film on a U-shaped wire, held by a slider of length l', 0.3, {weight: 700});
    line('l2', 'Pulled down by d, the film gains area 2ld: it has two surfaces', 3.2, {style: {fill: 'bad'}});
    line('l3', 'Work Fd is stored as surface energy S × 2ld, so S = F / 2l', 3.8, {style: {fill: 'cool'}});
    if (!ill) line('l4', weight !== undefined ? `S = ${num(weight)} N / (2 × ${len(l)}) = ${num(Sx)} N/m` : `S = ${num(Sx)} N/m: F = 2Sl = ${num(F)} N`, 4.4, {weight: 700, style: {fill: 'accent'}});
    line('l5', 'Surface tension: force per unit length, or surface energy per unit area', 5, {style: {fill: 'muted'}});
    facts.push(`slider length l = ${len(l)}; force ${num(F)} N = 2Sl; surface tension S = F/(2l) = ${num(Sx)} N/m`);
    return c.end('surface_tension', 7, {S: Sx, F});
  }

  if (s.kind === 'contact') {
    const theta = s.theta ?? (s.surface ? SURFACES[s.surface.toLowerCase()] : undefined) ?? L.glass ?? 0, th = theta * Math.PI / 180;
    const surfY = by0 + 0.62 * bh, cx = bx0 + 0.42 * bw, R = 0.24 * bw;
    // the drop as a circular cap meeting the surface at θ (a puddle with a small θ, a bead past 90°)
    // a circle of radius rc whose centre sits rc cos θ below the solid's surface: it meets the surface at θ
    const thd = Math.max(th, 6 * Math.PI / 180), rc = Math.min(0.45 * bh / (1 - Math.cos(thd)), 0.3 * bw / (thd < Math.PI / 2 ? Math.sin(thd) : 1), R * 4), cyc = surfY + rc * Math.cos(thd);
    const capPts: P2[] = [];
    for (let i = 0; i <= 40; i++) { const a = -Math.PI / 2 - thd + 2 * thd * i / 40; capPts.push([cx + rc * Math.cos(a), cyc + rc * Math.sin(a)]); }
    rect('solid', bx0, surfY, bw, 40 * k, {fill: 'faint', stroke: 'ink', width: 2 * k});
    props.push({id: 'drop', type: 'polyline', closed: true, points: capPts, style: {fill, opacity: 0.5, stroke: 'ink', width: 3 * k}, layer: 3} as Prop);
    // at the right edge: the tangent to the liquid, θ measured inside the liquid from the solid
    const ex = capPts[40][0], ey = surfY, tx = -Math.cos(th), ty = -Math.sin(th);
    arrow('Sla', ex, ey, ex + tx * 150 * k, ey + ty * 150 * k, 'cool', {show: [1, 1e9], fade: 0.3});
    arrow('Ssl', ex, ey, ex - 150 * k, ey, 'accent', {show: [1.4, 1e9], fade: 0.3});
    arrow('Ssa', ex, ey, ex + 150 * k, ey, 'good', {show: [1.8, 1e9], fade: 0.3});
    label('lSla', ex + tx * 160 * k + (tx > 0 ? 10 : -10) * k, ey + ty * 160 * k - 10 * k, 'S_la', {align: tx > 0 ? 'start' : 'end', style: {fill: 'cool'}, show: [1, 1e9]});
    label('lSsl', ex - 160 * k, ey + 36 * k, 'S_sl', {style: {fill: 'accent'}, show: [1.4, 1e9]});
    label('lSsa', ex + 110 * k, ey + 36 * k, 'S_sa', {style: {fill: 'good'}, show: [1.8, 1e9]});
    const arc: P2[] = Array.from({length: 13}, (_, i) => { const a = Math.PI + th * i / 12; return [ex + 60 * k * Math.cos(a), ey + 60 * k * Math.sin(a)]; });
    props.push({id: 'arc', type: 'polyline', points: arc, style: {stroke: 'ink', width: 3 * k}, layer: 5, show: [2.2, 1e9], fade: 0.3} as Prop);
    label('ltheta', ex - 80 * k * Math.cos(th / 2), ey - 80 * k * Math.sin(th / 2), 'θ', {align: 'middle', show: [2.2, 1e9]});
    Object.assign(anchors, {edge: [ex, ey], drop: [cx, (surfY + capPts[20][1]) / 2], solid: [bx0 + 0.15 * bw, surfY + 20 * k]});
    const wets = theta < 90;
    line('l1', `${s.liquid ?? 'A liquid'} on ${s.surface ?? (s.theta === undefined ? 'glass' : 'a solid')}: angle of contact θ${ill ? '' : ` = ${num(theta)}°`}`, 0.3, {weight: 700});
    line('l2', 'At the edge three surface tensions balance: S_la cos θ + S_sl = S_sa', 1.8, {style: {fill: 'cool'}});
    line('l3', wets ? 'θ acute (S_sl < S_la): the liquid is drawn to the solid and spreads: it wets it' : 'θ obtuse (S_sl > S_la): the liquid keeps to itself and forms drops: it does not wet the solid', 2.6, {style: {fill: wets ? 'good' : 'bad'}});
    facts.push(`angle of contact θ = ${num(theta)}° (${wets ? 'acute: wets the surface, spreads' : 'obtuse: does not wet, forms drops'})`, 'S_la cos θ + S_sl = S_sa at the line of contact');
    return c.end('surface_tension', 5, {theta});
  }

  if (s.kind === 'drop') {
    const shape = s.shape ?? 'drop', r = s.r!, two = shape === 'bubble', dP = (two ? 4 : 2) * S / r, Pa = s.Pa ?? PA;
    const Pout = Pa + (shape === 'cavity' && s.depth ? rho * g * s.depth : 0), Pin = Pout + dP;
    const cx = bx0 + 0.42 * bw, cy = by0 + 0.5 * bh, R = Math.min(0.3 * bh, 0.26 * bw);
    if (shape === 'cavity') rect('liquid', bx0, by0, bw, by1 - by0, {fill, opacity: 0.3}, {layer: 0});
    props.push({id: 'body', type: 'circle', x: cx, y: cy, r: R, style: {fill: shape === 'drop' ? fill : 'paper', opacity: shape === 'drop' ? 0.5 : shape === 'bubble' ? 0.08 : 1, stroke: 'ink', width: 3 * k}, layer: 2} as Prop);
    if (two) props.push({id: 'inner', type: 'circle', x: cx, y: cy, r: R - 12 * k, style: {stroke: 'cool', width: 3 * k}, layer: 2} as Prop);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      arrow(`in${i}`, cx + (R + 70 * k) * Math.cos(a), cy + (R + 70 * k) * Math.sin(a), cx + (R + 6 * k) * Math.cos(a), cy + (R + 6 * k) * Math.sin(a), 'muted', {show: [0.8, 1e9], fade: 0.3});
      arrow(`out${i}`, cx + (R - 80 * k) * Math.cos(a + 0.4), cy + (R - 80 * k) * Math.sin(a + 0.4), cx + (R - 16 * k) * Math.cos(a + 0.4), cy + (R - 16 * k) * Math.sin(a + 0.4), 'accent', {show: [1.6, 1e9], fade: 0.3});
    }
    label('lin', cx, cy + 10 * k, 'Pᵢ', {align: 'middle', style: {fill: 'accent'}, show: [1.6, 1e9]});
    label('lout', cx + R + 90 * k, cy - R, 'Pₒ', {style: {fill: 'muted'}, show: [0.8, 1e9]});
    label('lr', cx + 10 * k, cy - R / 2, 'r', {style: {fill: 'muted'}}); seg('rdim', cx, cy, cx, cy - R, {stroke: 'muted', width: 2 * k, dash: [6 * k, 6 * k]});
    Object.assign(anchors, {centre: [cx, cy], surface: [cx + R, cy], outside: [cx + R + 90 * k, cy - R]});
    const what = {drop: 'A liquid drop in air', cavity: 'An air cavity inside a liquid', bubble: 'A soap bubble: a film with two surfaces'}[shape];
    line('l1', what, 0.3, {weight: 700});
    line('l2', 'The curved surface pulls inward, so the pressure inside is higher (the concave side)', 1.6, {style: {fill: 'accent'}});
    line('l3', ill ? `Pᵢ − Pₒ = ${two ? '4S / r (two surfaces)' : '2S / r'}: smaller, higher` : `Pᵢ − Pₒ = ${two ? '4S / r' : '2S / r'} = ${num(dP)} Pa (S = ${num(S)} N/m, r = ${len(r)})`, 2.4, {weight: 700});
    // to enough figures that the excess shows: 1.01 × 10⁵ + 310 is 1.0131 × 10⁵ Pa, not 1.01 × 10⁵
    const fine = (p: number) => { const e = Math.floor(Math.log10(p)), digits = Math.min(6, Math.max(3, e - Math.floor(Math.log10(dP)) + 2)); return sci(p, digits - 1); };
    if (!ill && (shape === 'cavity' && s.depth || s.Pa !== undefined || shape === 'drop')) line('l4', `Pressure inside ${fine(Pin)} Pa`, 3, {style: {fill: 'cool'}});
    facts.push(`excess pressure ${two ? '4S/r' : '2S/r'} = ${num(dP)} Pa (S = ${num(S)} N/m, r = ${len(r)})`, `pressure outside ${fine(Pout)} Pa, inside ${fine(Pin)} Pa`);
    return c.end('surface_tension', 5, {dP, Pin});
  }

  // capillary: tubes of radius a dipped in the liquid; it rises (θ acute) or falls (θ obtuse) by h = 2S cos θ / ρga
  const theta = s.theta ?? L.glass ?? 0, cos = Math.cos(theta * Math.PI / 180), radii = s.radii ?? [s.a!];
  const hs = radii.map(a => 2 * S * cos / (rho * g * a)), hmax = Math.max(...hs.map(Math.abs));
  const surf = by0 + (cos >= 0 ? 0.66 : 0.4) * bh, room = cos >= 0 ? surf - by0 - 0.08 * bh : by1 - surf - 0.14 * bh, sc = room / hmax;
  rect('liquid', bx0, surf, bw, by1 - surf, {fill, opacity: 0.4}, {layer: 1});
  seg('surf', bx0, surf, bx1, surf, {stroke: 'ink', width: 2 * k});
  const amax = Math.max(...radii);
  radii.forEach((a, i) => {
    const x = bx0 + (radii.length === 1 ? 0.45 : radii.length === 2 ? 0.15 + 0.45 * i : 0.12 + 0.32 * i) * bw, w = 24 * k + 70 * k * a / amax, top = by0 + 0.04 * bh, botT = Math.min(by1 - 0.06 * bh, surf + 0.22 * bh);
    const lvl = surf - hs[i] * sc;
    rect(`col${i}`, x - w / 2, Math.min(lvl, surf), w, Math.abs(surf - lvl) + 0.001, {fill, opacity: 0.6}, {layer: 2,
      keys: {y: [[0.8, surf], [2.6, Math.min(lvl, surf), 'out']], h: [[0.8, 0.001], [2.6, Math.abs(surf - lvl) + 0.001, 'out']]} as never});
    if (cos < 0) rect(`gap${i}`, x - w / 2, surf, w, lvl - surf, {fill: 'paper'}, {layer: 2, keys: {h: [[0.8, 0.001], [2.6, lvl - surf, 'out']]} as never});
    seg(`tl${i}`, x - w / 2, top, x - w / 2, botT, {stroke: 'ink', width: 3 * k}, {layer: 4}); seg(`tr${i}`, x + w / 2, top, x + w / 2, botT, {stroke: 'ink', width: 3 * k}, {layer: 4});
    // the meniscus: concave for a wetting liquid, convex otherwise
    const men: P2[] = Array.from({length: 11}, (_, j) => { const u = j / 10 * 2 - 1; return [x + u * w / 2, lvl + (cos >= 0 ? -1 : 1) * 0.35 * w * (1 - u * u) * -1]; });
    props.push({id: `men${i}`, type: 'polyline', points: men, style: {stroke: 'ink', width: 3 * k}, layer: 5, show: [2.6, 1e9], fade: 0.3} as Prop);
    seg(`h${i}`, x + w / 2 + 20 * k, surf, x + w / 2 + 20 * k, lvl, {stroke: 'accent', width: 3 * k}, {show: [2.8, 1e9], fade: 0.3});
    label(`lh${i}`, x + w / 2 + 32 * k, (surf + lvl) / 2 + 8 * k, ill ? 'h' : `h = ${len(Math.abs(hs[i]))}`, {style: {fill: 'accent'}, show: [2.8, 1e9]});
    if (radii.length > 1) label(`la${i}`, x, botT + 34 * k, ill ? (a === amax ? 'wider' : 'narrower') : `a = ${len(a)}`, {align: 'middle', style: {fill: 'muted'}});
    anchors[radii.length > 1 ? `tube${i + 1}` : 'tube'] = [x, lvl];
  });
  anchors.surface = [bx0 + 0.9 * bw, surf];
  line('l1', `A narrow tube in ${liq.toLowerCase()}: the liquid ${cos >= 0 ? 'rises' : 'falls'} in it`, 0.3, {weight: 700});
  line('l2', cos >= 0 ? 'θ acute: a concave meniscus, the pressure under it less than Pa' : 'θ obtuse: a convex meniscus, the liquid pushed down', 2.6, {style: {fill: 'cool'}});
  line('l3', ill ? 'h = 2S cos θ / ρga: the narrower the tube, the higher' : `h = 2S cos θ / ρga = ${hs.map(h => len(Math.abs(h))).join(', ')}`, 2.8, {weight: 700, style: {fill: 'accent'}});
  if (radii.length > 1) line('l4', 'Halve the radius, double the rise', 3.4, {style: {fill: 'muted'}});
  facts.push(...radii.map((a, i) => `tube radius ${len(a)}: ${hs[i] >= 0 ? 'rise' : 'fall'} h = 2S cos θ/(ρga) = ${len(Math.abs(hs[i]))}`), `S = ${num(S)} N/m, θ = ${num(theta)}°, ρ = ${num(rho)} kg/m³`);
  void round;
  return c.end('surface_tension', 5.4, {h: hs});
}
