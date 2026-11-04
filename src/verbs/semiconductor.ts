// Class 12 Semiconductor Electronics (leph2-06, 2026-11-04): one verb, its numbers from the book (Eg of C, Si, Ge and Sn
// 5.4, 1.1, 0.7 and 0 eV; donor ionisation about 0.05 eV in Si and 0.01 eV in Ge; cut-in about 0.7 V for Si and 0.2 V
// for Ge; Example 14.2 and Example 14.4).
//
// semiconductor  bands: Fig. 14.2, the valence and conduction bands of a metal, an insulator and a semiconductor (or of
//                C, Si, Ge, Sn) on one energy scale, with a few electrons lifted across a small gap at room temperature.
//                lattice: Fig. 14.4 and 14.5, Si cores and their covalent bonds; a bond breaks, leaving a hole, and a
//                neighbouring bond's electron fills it, so the hole moves (field: electrons drift one way, holes the
//                other); or a dopant: a pentavalent As whose fifth electron goes free, a trivalent B whose missing
//                electron is a hole. doped: Fig. 14.7(b) and 14.8(b), fixed ions and their carriers, majority and
//                minority (Example 14.2: nₑ = 5 × 10²² m⁻³, nₕ = nᵢ²/nₑ = 4.5 × 10⁹ m⁻³). levels: Fig. 14.9, the donor
//                level just below E_C or the acceptor level just above E_V, to the scale of the gap. junction: Fig. 14.10
//                and 14.11, diffusion across a p-n junction, the depletion layer of uncovered ions, its field, drift,
//                and the barrier potential. bias: Fig. 14.13 to 14.15, a battery across the junction, the depletion
//                layer and barrier V₀ − V (forward) or V₀ + V (reverse). iv: Fig. 14.16(c) and 14.17, forward current in
//                mA and reverse in μA, the cut-in voltage, and Example 14.4's resistances (10 Ω and 1.0 × 10⁷ Ω).
//                rectifier: Fig. 14.18 to 14.20, a half-wave or centre-tap full-wave rectifier with its input and
//                output, and a capacitor filter.
import {kit} from './potential.ts';
import {sci} from './electric.ts';
import type {Key} from '../keys.ts';
import type {Prop, Scene} from '../scene.ts';

type P2 = [number, number];
type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const sig = (v: number, p = 3) => String(+v.toPrecision(p));
/** A current in A as mA, μA or nA. */
const current = (I: number) => I >= 1e-3 ? `${sig(I * 1e3)} mA` : I >= 1e-6 ? `${sig(I * 1e6)} μA` : `${sig(I * 1e9, 2)} nA`;

/** The book's band gaps in eV (B41): C (diamond), Si, Ge, and Sn, a metal. */
export const GAP: Record<string, number> = {C: 5.4, Si: 1.1, Ge: 0.7, Sn: 0};
/** The energy to free a donor's fifth electron (B33), in eV. */
export const DONOR_EV: Record<string, number> = {Si: .05, Ge: .01};
/** The cut-in (threshold) voltage of a diode (B67), in V. */
export const CUT_IN: Record<string, number> = {Si: .7, Ge: .2};

/** A diode's current in A at V volts: almost none below the cut-in, then rising to Example 14.4's 10 mA at 0.7 V and
 * 20 mA at 0.8 V (a slope of 10 Ω) for Si (0.5 V lower for Ge); in reverse, a saturation current of about 1 μA. */
export function diodeCurrent(V: number, material: 'Si' | 'Ge' = 'Si') {
  const on = CUT_IN[material] - .1, s = .02, r = 10;
  if (V < 0) return -1e-6 * (1 - Math.exp(V / .026));
  const u = (V - on) / s;
  return s / r * (u > 30 ? u : Math.log1p(Math.exp(u)));
}
/** The dynamic resistance ΔV/ΔI at V, in Ω (B69). */
export const dynamicResistance = (V: number, material: 'Si' | 'Ge' = 'Si') => 2e-4 / (diodeCurrent(V + 1e-4, material) - diodeCurrent(V - 1e-4, material));
/** Example 14.2: donors from a doping in ppm of a crystal of `atoms` m⁻³; nₑ ≈ N_D and nₕ = nᵢ²/nₑ. */
export function carriers(atoms: number, ppm: number, ni: number) {
  const N = atoms * ppm * 1e-6, ne = N + ni * ni / N;      // nₑ = N_D plus the intrinsic share, which is negligible
  return {N, ne, nh: ni * ni / ne};
}
/** A rectifier's output at time t (in periods) for a sine of peak `peak`: half or full wave, less a diode drop. */
export function rectified(t: number, kind: 'half' | 'full', peak: number, drop = 0) {
  const v = peak * Math.sin(2 * Math.PI * t), out = kind === 'full' ? Math.abs(v) : v;
  return Math.max(0, out - drop);
}
/** The filtered output: the capacitor charges with the rising pulse and discharges through R_L (time constant tau, in
 * periods) until the next pulse overtakes it. Samples from t = 0 to `periods`. */
export function filtered(kind: 'half' | 'full', peak: number, tau: number, periods: number, drop = 0, per = 200): P2[] {
  const out: P2[] = []; let v = 0, dt = 1 / per;
  for (let i = 0; i <= periods * per; i++) {
    const t = i * dt, r = rectified(t, kind, peak, drop);
    v = i ? Math.max(r, v * Math.exp(-dt / tau)) : r;
    out.push([t, v]);
  }
  return out;
}

export const SEMICONDUCTOR_SHOWS = ['bands', 'lattice', 'doped', 'levels', 'junction', 'bias', 'iv', 'rectifier'] as const;
const MATERIALS = ['metal', 'insulator', 'semiconductor', 'C', 'Si', 'Ge', 'Sn'] as const;
const DOPANTS = {As: 5, P: 5, Sb: 5, B: 3, Al: 3, In: 3} as const;
export type SemiconductorSpec = Common & {verb: 'semiconductor'; show: (typeof SEMICONDUCTOR_SHOWS)[number];
  /** bands: one to four of 'metal', 'insulator', 'semiconductor', 'C', 'Si', 'Ge', 'Sn'. */
  materials?: (typeof MATERIALS)[number][];
  /** bands: 'zero' (0 K, no electron lifted) or 'room' (default). */
  temperature?: 'zero' | 'room';
  /** lattice: how far the story goes: 'intact' (0 K), 'broken' (a bond breaks), 'moving' (the hole moves; default). */
  stage?: 'intact' | 'broken' | 'moving';
  /** lattice: an impurity at the centre: pentavalent As, P, Sb (n-type) or trivalent B, Al, In (p-type). */
  dopant?: keyof typeof DOPANTS;
  /** lattice: an electric field to the right: the free electron drifts left and the hole moves right. */
  field?: boolean;
  /** doped, levels: 'n' or 'p'. */
  type?: 'n' | 'p';
  /** levels, lattice (with a dopant), bias, iv: 'Si' (default) or 'Ge'. */
  material?: 'Si' | 'Ge';
  /** doped: Example 14.2's crystal: atoms per m³, doping in ppm, and nᵢ in m⁻³. */
  atoms?: number; ppm?: number; ni?: number;
  /** bias: 'forward' (default) or 'reverse'. */
  bias?: 'forward' | 'reverse';
  /** bias: the battery's voltage (forward up to below V₀, reverse up to 20 V); iv: a point on the curve, −20 to 1 V. */
  V?: number;
  /** iv: Example 14.4's resistances drawn on the curve (Si). */
  resistance?: boolean;
  /** rectifier: 'half' (default) or 'full' (centre tap, two diodes). */
  kind?: 'half' | 'full';
  /** rectifier: a capacitor across the load; tau = CR_L in periods of the input (default 2). */
  filter?: boolean; tau?: number;
  /** rectifier: the input's peak voltage (full: from A to the centre tap; default 10 V), and drop: true takes off a
   * silicon diode's 0.7 V. */
  peak?: number; drop?: boolean};
const FIELDS = ['materials', 'temperature', 'stage', 'dopant', 'field', 'type', 'material', 'atoms', 'ppm', 'ni', 'bias', 'V', 'resistance', 'kind', 'filter', 'tau', 'peak', 'drop'];
const USES: Record<string, string[]> = {bands: ['materials', 'temperature'], lattice: ['stage', 'dopant', 'field', 'material'], doped: ['type', 'atoms', 'ppm', 'ni'],
  levels: ['type', 'material'], junction: [], bias: ['bias', 'V', 'material'], iv: ['material', 'V', 'resistance'], rectifier: ['kind', 'filter', 'tau', 'peak', 'drop']};

export function semiconductorErrors(s: SemiconductorSpec): string[] {
  const W = 'semiconductor', e: string[] = [];
  if (!SEMICONDUCTOR_SHOWS.includes(s.show)) return [`${W}: show is one of ${SEMICONDUCTOR_SHOWS.join(', ')}`];
  e.push(...FIELDS.filter(f => (s as never)[f] !== undefined && !USES[s.show].includes(f)).map(f => `${W}: ${f} is not used by show ${s.show}; leave it out`));
  if (s.materials !== undefined && !(Array.isArray(s.materials) && s.materials.length >= 1 && s.materials.length <= 4 && s.materials.every(m => MATERIALS.includes(m))))
    e.push(`${W}: materials is a list of 1 to 4 of ${MATERIALS.join(', ')}`);
  if (s.temperature !== undefined && !['zero', 'room'].includes(s.temperature)) e.push(`${W}: temperature is 'zero' or 'room'`);
  if (s.stage !== undefined && !['intact', 'broken', 'moving'].includes(s.stage)) e.push(`${W}: stage is 'intact', 'broken' or 'moving'`);
  if (s.dopant !== undefined && !(s.dopant in DOPANTS)) e.push(`${W}: dopant is pentavalent As, P or Sb (n-type) or trivalent B, Al or In (p-type)`);
  if (s.dopant !== undefined && s.stage !== undefined) e.push(`${W}: stage tells the pure crystal's story; with a dopant leave stage out`);
  if (s.field !== undefined && typeof s.field !== 'boolean') e.push(`${W}: field is true or false`);
  if (s.show === 'lattice' && s.field && s.stage === 'intact') e.push(`${W}: an intact lattice has no carrier for the field to move; use stage 'broken' or 'moving'`);
  if (s.type !== undefined && !['n', 'p'].includes(s.type)) e.push(`${W}: type is 'n' or 'p'`);
  if (s.material !== undefined && !['Si', 'Ge'].includes(s.material)) e.push(`${W}: material is 'Si' or 'Ge'`);
  for (const [f, lo, hi, what] of [['atoms', 1e26, 1e30, 'atoms per m³ (Si has 5 × 10²⁸)'], ['ppm', 1e-4, 1e3, 'the doping in parts per million'], ['ni', 1e10, 1e20, 'the intrinsic concentration in m⁻³ (Si: 1.5 × 10¹⁶)']] as const)
    if ((s as never)[f] !== undefined && !(isNum((s as never)[f]) && (s as never as Record<string, number>)[f] >= lo && (s as never as Record<string, number>)[f] <= hi)) e.push(`${W}: ${f} is ${what}, ${sci(lo)} to ${sci(hi)}`);
  if (s.show === 'doped' && s.type === 'p' && (s.atoms !== undefined || s.ppm !== undefined || s.ni !== undefined))
    e.push(`${W}: Example 14.2's numbers are for an n-type crystal (pentavalent As); use type 'n' with atoms, ppm and ni`);
  if (s.bias !== undefined && !['forward', 'reverse'].includes(s.bias)) e.push(`${W}: bias is 'forward' or 'reverse'`);
  if (s.show === 'bias' && s.V !== undefined) {
    const V0 = CUT_IN[s.material ?? 'Si'];
    if (!isNum(s.V) || s.V < 0) e.push(`${W}: V is the battery's voltage, 0 or more; bias gives its direction`);
    else if ((s.bias ?? 'forward') === 'forward' && s.V >= V0 * .9) e.push(`${W}: a forward V near V₀ (about ${V0} V) leaves no barrier to draw; keep V below ${sig(V0 * .9, 2)} V, or use show iv for the current beyond it`);
    else if (s.bias === 'reverse' && s.V > 20) e.push(`${W}: a reverse V up to 20 V; beyond it a general-purpose diode may break down`);
  }
  if (s.show === 'iv' && s.V !== undefined && !(isNum(s.V) && s.V >= -20 && s.V <= 1)) e.push(`${W}: V is a point on the curve, −20 to 1 V`);
  if (s.resistance !== undefined && typeof s.resistance !== 'boolean') e.push(`${W}: resistance is true or false`);
  if (s.resistance && s.material === 'Ge') e.push(`${W}: Example 14.4's curve is a silicon diode's; leave material out`);
  if (s.kind !== undefined && !['half', 'full'].includes(s.kind)) e.push(`${W}: kind is 'half' or 'full'`);
  if (s.filter !== undefined && typeof s.filter !== 'boolean') e.push(`${W}: filter is true or false`);
  if (s.tau !== undefined && !(isNum(s.tau) && s.tau >= .2 && s.tau <= 20)) e.push(`${W}: tau is CR_L in periods of the input, 0.2 to 20`);
  if (s.tau !== undefined && !s.filter) e.push(`${W}: tau is the filter's time constant; set filter: true or leave tau out`);
  if (s.peak !== undefined && !(isNum(s.peak) && s.peak >= 1 && s.peak <= 400)) e.push(`${W}: peak is the input's peak voltage, 1 to 400 V`);
  if (s.drop !== undefined && typeof s.drop !== 'boolean') e.push(`${W}: drop is true or false`);
  if (s.drop && (s.peak ?? 10) <= 1.4) e.push(`${W}: a 0.7 V drop leaves almost nothing of a ${s.peak} V peak; raise peak`);
  return e;
}

export function semiconductor(s: SemiconductorSpec): Scene {
  const {k, props, bx, by, bw, bh, cx, cy, arrow, line, poly, label, finish} = kit(s);
  const num = !s.illustrative, facts: string[] = [], anchors: Record<string, P2> = {};
  let dur = 7, story = '', second = '', n = 0;
  const id = (p: string) => `${p}${n++}`;
  const ELECTRON = 'cool', HOLE = 'bad';
  const rect = (x: number, y: number, w: number, h: number, style: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
    props.push({id: id('r'), type: 'rect', x, y, w, h, style, layer: 1, ...extra} as Prop);
  const electron = (x: number, y: number, extra: Record<string, unknown> = {}, r = 8) =>
    props.push({id: id('e'), type: 'circle', x, y, r: r * k, style: {fill: ELECTRON, stroke: 'paper', width: 1.5 * k}, layer: 4, ...extra} as Prop);
  const hole = (x: number, y: number, extra: Record<string, unknown> = {}, r = 8) =>
    props.push({id: id('h'), type: 'circle', x, y, r: r * k, style: {fill: 'paper', stroke: HOLE, width: 3 * k}, layer: 4, ...extra} as Prop);
  // a fixed ion: a ringed + (donor) or − (acceptor), as the book draws them
  const ion = (x: number, y: number, q: 1 | -1, extra: Record<string, unknown> = {}, r = 13) => {
    props.push({id: id('i'), type: 'circle', x, y, r: r * k, style: {fill: q > 0 ? 'bad' : 'cool', opacity: .85, stroke: 'paper', width: 2 * k}, layer: 3, ...extra} as Prop);
    label(x, y + r * .55 * k, q > 0 ? '+' : '−', 'paper', r * 1.7, {layer: 3, ...extra});
  };
  const move = (from: P2, to: P2, t0: number, t1: number) => ({keys: {x: [[t0, from[0]], [t1, to[0], 'inOut']], y: [[t0, from[1]], [t1, to[1], 'inOut']]}});
  const path = (pts: [number, P2][]) => ({keys: {x: pts.map(([t, p], i) => (i ? [t, p[0], 'inOut'] : [t, p[0]])), y: pts.map(([t, p], i) => (i ? [t, p[1], 'inOut'] : [t, p[1]]))}});
  const legend = (y: number, items: [string, 'e' | 'h' | '+' | '-'][], from = bx + 14 * k) => {
    let x = from;
    for (const [t, what] of items) {
      if (what === 'e') electron(x, y - 8 * k); else if (what === 'h') hole(x, y - 8 * k); else ion(x, y - 8 * k, what === '+' ? 1 : -1, {}, 10);
      label(x + 20 * k, y, t, 'muted', 22, {align: 'start'}); x += (t.length * 13 + 60) * k;
    }
  };

  if (s.show === 'bands') {
    const list = s.materials ?? ['metal', 'insulator', 'semiconductor'], m = list.length, warm = (s.temperature ?? 'room') === 'room';
    // one energy scale for every panel: 2 eV thick bands, the widest gap 5.4 eV
    const gapOf = (x: string) => x === 'metal' ? -.6 : x === 'insulator' ? GAP.C : x === 'semiconductor' ? GAP.Si : GAP[x];
    const span = 2 + Math.max(...list.map(x => Math.max(0, gapOf(x)))) + 2, per = bh * .74 / Math.max(span, 6), slot = bw / m, w = Math.min(slot * .62, 220 * k);
    const base = by + bh * .86;
    line([bx, base + 10 * k], [bx, by + bh * .06], 'muted', 2); label(bx + 12 * k, by + bh * .05, 'energy', 'muted', 22, {align: 'start'});
    list.forEach((x, i) => {
      const xc = bx + slot * (i + .5), g = gapOf(x), t = .3 + i * .5, vTop = base - 2 * per, cBot = vTop - g * per, cTop = cBot - 2 * per;
      const kind = x === 'metal' || x === 'Sn' ? 'metal' : g >= 3 ? 'insulator' : 'semiconductor';
      rect(xc - w / 2, vTop, w, 2 * per, {fill: 'cool', opacity: .55, stroke: 'cool', width: 2 * k}, {show: [t, 1e9], fade: .4});
      rect(xc - w / 2, cTop, w, 2 * per, {fill: 'paper', stroke: 'accent', width: 2.5 * k}, {show: [t, 1e9], fade: .4});
      if (kind === 'metal') {                                    // overlapping bands, filled part-way up (Fig. 14.2a)
        if (g < 0) rect(xc - w / 2, cBot, w, vTop - cBot, {fill: 'cool', opacity: .55}, {show: [t + .2, 1e9], fade: .4});
        label(xc, cTop - 18 * k, g < 0 ? 'bands overlap' : 'no gap', 'ink', 24, {show: [t + .2, 1e9]});
      } else {
        line([xc + w / 2 + 14 * k, vTop], [xc + w / 2 + 14 * k, cBot], 'ink', 2, {show: [t + .3, 1e9]});
        label(xc + w / 2 + 22 * k, (vTop + cBot) / 2 + 9 * k, 'Eg', 'ink', 26, {align: 'start', show: [t + .3, 1e9]});
        if (num) label(xc, (vTop + cBot) / 2 + 9 * k, x === 'insulator' ? 'Eg > 3 eV' : x === 'semiconductor' ? 'Eg < 3 eV' : `${g} eV`, 'accent', 24, {show: [t + .5, 1e9]});
      }
      label(xc, base + 44 * k, x === 'C' ? 'C (diamond)' : x, 'ink', 30, {show: [t, 1e9]});
      if (x !== kind) label(xc, base + 78 * k, kind === 'metal' ? 'a metal' : kind === 'insulator' ? 'an insulator' : 'a semiconductor', 'muted', 22, {show: [t, 1e9]});
      label(xc - w / 2 - 8 * k, vTop + per + 8 * k, 'VB', 'muted', 20, {align: 'end', show: [t, 1e9]});
      label(xc - w / 2 - 8 * k, cTop + per + 8 * k, 'CB', 'muted', 20, {align: 'end', show: [t, 1e9]});
      if (warm && kind === 'semiconductor') {                    // a few electrons lifted across, holes left behind (Fig. 14.6b)
        for (let j = 0; j < 3; j++) {
          const ex = xc - w * .3 + j * w * .3, t0 = 2.4 + j * .5 + i * .2, from: P2 = [ex, vTop + 10 * k], to: P2 = [ex, cBot - 12 * k];
          electron(from[0], from[1], {show: [t0, 1e9], ...move(from, to, t0, t0 + .8)});
          hole(ex, vTop + 10 * k, {show: [t0 + .3, 1e9], fade: .3});
        }
      }
      anchors[`vb${i + 1}`] = [xc, vTop + per]; anchors[`cb${i + 1}`] = [xc, cTop + per]; anchors[`gap${i + 1}`] = [xc, (vTop + cBot) / 2];
      facts.push(kind === 'metal' ? `${x}: the bands ${g < 0 ? 'overlap' : 'touch'}, so electrons move freely` : `${x}: Eg ${x === 'insulator' ? '> 3 eV' : x === 'semiconductor' ? '< 3 eV' : `= ${g} eV`}`);
    });
    if (warm && list.some(x => gapOf(x) > 0 && gapOf(x) < 3)) legend(by + bh * .05, [['electron', 'e'], ['hole', 'h']], bx + bw * .62);
    dur = warm ? 6 : 5;
    story = 'A wide gap keeps every electron bound; a small one lets heat lift a few across';
    second = warm ? 'Each lifted electron leaves a hole in the valence band (not to scale: there are far more)' : 'At 0 K no electron is lifted: a pure semiconductor is an insulator';
  } else if (s.show === 'lattice') {
    const cols = 5, rows = 4, d = Math.min(bw / (cols + .2), bh * .9 / (rows + .4)), x0 = cx - d * (cols - 1) / 2, y0 = by + bh * .48 - d * (rows - 1) / 2;
    const at = (c: number, r: number): P2 => [x0 + c * d, y0 + r * d], off = d * .07, coreR = d * .2;
    const dopant = s.dopant, valency = dopant ? DOPANTS[dopant] : 4, dc = 2, dr = 1, mat = s.material ?? 'Si';
    // electron spots: each bond (and each stub at the edge) holds two, either side of its line
    type Spot = {p: P2; bond: string};
    const spots: Spot[] = [];
    const bond = (a: P2, b: P2, key: string) => {
      const h = Math.abs(a[1] - b[1]) < 1, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      for (const sgn of [-1, 1]) {
        const o = h ? [0, sgn * off] : [sgn * off, 0];
        line([a[0] + o[0], a[1] + o[1]], [b[0] + o[0], b[1] + o[1]], 'muted', 2.5, {layer: 1});
        spots.push({p: [mx + o[0], my + o[1]], bond: key});
      }
    };
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const p = at(c, r);
      if (c + 1 < cols) bond(p, at(c + 1, r), `${c},${r}-h`); else bond(p, [p[0] + d * .5, p[1]], `${c},${r}-e`);
      if (r + 1 < rows) bond(p, at(c, r + 1), `${c},${r}-v`); else bond(p, [p[0], p[1] + d * .5], `${c},${r}-s`);
      if (c === 0) bond(p, [p[0] - d * .5, p[1]], `${c},${r}-w`);
      if (r === 0) bond(p, [p[0], p[1] - d * .5], `${c},${r}-n`);
    }
    const spot = (key: string, i: 0 | 1) => spots.filter(x => x.bond === key)[i].p;
    const moving = new Set<string>();                           // spots whose electron the story moves
    const fieldOn = !!s.field, story3: string[] = [];
    const cell = (c: number, r: number): P2 => [x0 + (c + .5) * d, y0 + (r + .5) * d];
    if (fieldOn) {
      arrow([bx + bw * .3, by + 10 * k], [bx + bw * .7, by + 10 * k], 'accent', 5, {show: [.5, 1e9]});
      label(bx + bw * .72, by + 18 * k, 'E', 'accent', 30, {align: 'start', show: [.5, 1e9]});
    }
    dur = 8;
    if (!dopant) {
      const stage = s.stage ?? 'moving', site1 = '1,1-h', p1 = spot(site1, 0);
      if (stage !== 'intact') {
        moving.add(`${site1}:0`);
        const free = cell(1, 0), wander: [number, P2][] = [[2, p1], [3, free]];
        if (fieldOn) wander.push([dur, [free[0] - d * 1.6, free[1]]]);
        else wander.push([4.5, cell(0, 0)], [6, [cell(0, 0)[0] + d * .2, cell(0, 0)[1] + d * .9]], [dur, cell(0, 1)]);
        electron(p1[0], p1[1], path(wander), 11);
        label(p1[0], p1[1] - 34 * k, '1', 'accent', 24, {show: [2.4, 1e9]});
        label(free[0], free[1] - 24 * k, 'free electron', 'cool', 22, {show: [3, 4.2], fade: .3});
        anchors.free = free; anchors.site1 = p1;
        facts.push('thermal energy frees an electron and leaves a hole of charge +q');
        story3.push('Heat frees an electron from one bond; the empty place left behind is a hole');
      }
      if (stage === 'moving') {
        // the hole moves: the next bond's electron fills it (to the right along E with a field; else the book's
        // lower-left bond), and the hole is now where that electron was
        const hops = fieldOn ? ['2,1-h', '3,1-h'] : ['1,1-v'];
        let prev = p1, t = 4.3;
        hole(p1[0], p1[1], {show: [2.2, t + .5], fade: .3}, 11);
        hops.forEach((key, j) => {
          const q = spot(key, 0); moving.add(`${key}:0`);
          electron(q[0], q[1], move(q, prev, t, t + .6));
          hole(q[0], q[1], {show: [t + .5, j === hops.length - 1 ? 1e9 : t + 1.9], fade: .3}, 11);
          label(q[0] + (fieldOn ? 0 : 28 * k), q[1] - (fieldOn ? 34 : -8) * k, String(j + 2), 'accent', 24, {show: [t, 1e9]});
          prev = q; t += 1.5;
        });
        anchors.site2 = spot(hops[0], 0); anchors.hole = prev;
        story3.push(fieldOn ? 'In the field the free electron drifts against E while bound electrons hop the other way, so the hole moves along E' : 'An electron from a neighbouring bond fills it: the hole has moved from site 1 to site 2');
        facts.push('I = Iₑ + Iₕ: free electrons and holes both carry current');
      } else if (stage === 'broken') hole(p1[0], p1[1], {show: [2.2, 1e9], fade: .3}, 11);
      story = stage === 'intact' ? 'At low temperature every covalent bond is intact: no carrier is free' : story3[story3.length - 1];
      second = stage === 'intact' ? 'Each Si or Ge core (+4) shares one electron with each of its four neighbours' : 'In a pure crystal electrons and holes come in pairs: nₑ = nₕ = nᵢ';
      if (stage === 'intact') dur = 5;
    } else {
      const p = at(dc, dr);
      if (valency === 5) {
        const orbit: P2 = [p[0] + d * .3, p[1] - d * .3], free = cell(dc, dr - 1);
        const go: [number, P2][] = [[2.2, orbit], [3.2, free]];
        if (fieldOn) go.push([dur, [free[0] - d * 1.6, free[1]]]); else go.push([5, cell(dc + 1, dr - 1)], [dur, cell(dc + 1, dr)]);
        electron(orbit[0], orbit[1], {show: [.8, 1e9], fade: .3, ...path(go)}, 11);
        props.push({id: 'orbit', type: 'polyline', points: Array.from({length: 49}, (_, i) => [p[0] + d * .42 * Math.cos(i * Math.PI / 24), p[1] + d * .42 * Math.sin(i * Math.PI / 24)] as P2), style: {stroke: 'accent', width: 2 * k, dash: [6 * k, 6 * k]}, layer: 2, show: [.8, 2.4], fade: .3} as Prop);
        label(free[0], free[1] - 26 * k, 'free', 'accent', 22, {show: [3.2, 1e9]});
        anchors.extra = orbit; anchors.free = free;
        if (num) facts.push(`freeing the fifth electron takes about ${DONOR_EV[mat]} eV in ${mat}, against Eg ≈ ${mat === 'Si' ? 1.1 : .72} eV`);
        facts.push('the donor gives one electron; it stays a fixed positive ion');
        story = `Pentavalent ${dopant}: four electrons bond, the fifth is barely held and goes free`;
        second = 'A donor: electrons become the majority carriers, an n-type semiconductor';
      } else {
        const key = `${dc},${dr}-h`, q = spot(key, 0), nxt = spot(`${dc + 1},${dr}-h`, 0); moving.add(`${key}:0`); moving.add(`${dc + 1},${dr}-h:0`);
        hole(q[0], q[1], {show: [.8, 3.4], fade: .3}, 11);
        electron(nxt[0], nxt[1], move(nxt, q, 2.8, 3.4));
        hole(nxt[0], nxt[1], {show: [3.3, 1e9], fade: .3}, 11);
        label(p[0] - coreR - 14 * k, p[1] - coreR - 4 * k, '−', 'cool', 34, {show: [3.4, 1e9], align: 'end'});
        anchors.hole = q; anchors.next = nxt;
        facts.push('the acceptor takes an electron: it becomes a fixed negative ion, and the hole moves on');
        story = `Trivalent ${dopant}: one bond is short of an electron, a hole that a neighbour's electron fills`;
        second = 'An acceptor: holes become the majority carriers, a p-type semiconductor';
      }
      anchors.dopant = p;
    }
    // the bonding electrons not moved by the story, then the cores on top
    spots.forEach((x, i) => { const key = `${x.bond}:${spots.filter(y => y.bond === x.bond).indexOf(x)}`; if (!moving.has(key) && !(dopant && valency === 3 && key === `${dc},${dr}-h:0`)) electron(x.p[0], x.p[1], {}, 6); void i; });
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const p = at(c, r), dope = dopant && c === dc && r === dr;
      props.push({id: id('core'), type: 'circle', x: p[0], y: p[1], r: coreR, style: {fill: dope ? 'accent' : 'faint', stroke: 'ink', width: 2 * k}, layer: 3} as Prop);
      label(p[0], p[1] + 9 * k, dope ? `+${valency}` : '+4', dope ? 'paper' : 'ink', 26, {layer: 3});
      if (dope) label(p[0] - coreR * .9, p[1] + coreR * 1.6, dopant!, 'accent', 26, {layer: 3, align: 'end'});
    }
    legend(by + bh * .995, [['bonding or free electron', 'e'], ['hole', 'h']]);
  } else if (s.show === 'doped') {
    const tp = s.type ?? 'n', q = tp === 'n' ? 1 : -1, cols = 6, rows = 4, x0 = bx + bw * .08, w = bw * .84, y0 = by + bh * .12, h = bh * .62;
    rect(x0, y0, w, h, {fill: 'faint', opacity: .35, stroke: 'muted', width: 2.5 * k});
    label(x0 + w / 2, y0 - 18 * k, `${tp}-type`, 'ink', 32);
    const dxs = w / cols, dys = h / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = x0 + dxs * (c + .5), y = y0 + dys * (r + .5), j = (c * 7 + r * 3) % 5, t0 = .4 + (c + r) * .08;
      ion(x, y, q as 1 | -1, {show: [t0, 1e9], fade: .3});
      // each ion's carrier wanders near it (thermal motion), never far
      const pts: [number, P2][] = [0, 1, 2, 3, 4].map(i => [1.2 + i * 1.4, [x + Math.cos(i * 2.1 + j) * dxs * .3, y + Math.sin(i * 1.7 + j) * dys * .3] as P2]);
      if (tp === 'n') electron(pts[0][1][0], pts[0][1][1], {show: [t0 + .3, 1e9], fade: .3, ...path(pts)});
      else hole(pts[0][1][0], pts[0][1][1], {show: [t0 + .3, 1e9], fade: .3, ...path(pts)});
    }
    // one minority carrier, thermally made
    const mx = x0 + dxs * 3, my = y0 + dys * 2;
    if (tp === 'n') hole(mx, my, {show: [2.4, 1e9], fade: .3}); else electron(mx, my, {show: [2.4, 1e9], fade: .3});
    label(mx, my - 24 * k, 'minority', 'accent', 22, {show: [2.6, 1e9]});
    anchors.slab = [x0 + w / 2, y0 + h / 2]; anchors.minority = [mx, my];
    legend(by + bh * .86, tp === 'n' ? [['donor ion', '+'], ['electron (majority)', 'e'], ['hole (minority)', 'h']] : [['acceptor ion', '-'], ['hole (majority)', 'h'], ['electron (minority)', 'e']]);
    if (tp === 'n' && (s.atoms !== undefined || s.ppm !== undefined || s.ni !== undefined)) {
      const atoms = s.atoms ?? 5e28, ppm = s.ppm ?? 1, ni = s.ni ?? 1.5e16, c = carriers(atoms, ppm, ni);
      facts.push(`N_D = ${ppm} ppm × ${sci(atoms, 'm⁻³')} = ${sci(c.N, 'm⁻³')}`, `nₑ ≈ N_D = ${sci(c.ne, 'm⁻³')}`, `nₕ = nᵢ²/nₑ = ${sci(c.nh, 'm⁻³')}`);
      if (num) label(x0 + w / 2, by + bh * .97, `drawn one minority carrier; truly nₑ/nₕ ≈ ${sci(c.ne / c.nh)}`, 'muted', 22, {show: [3, 1e9]});
    } else facts.push(tp === 'n' ? 'nₑ ≫ nₕ: electrons are the majority carriers' : 'nₕ ≫ nₑ: holes are the majority carriers', 'nₑnₕ = nᵢ²');
    facts.push('the crystal stays neutral: each carrier balances its fixed ion');
    dur = 6;
    story = tp === 'n' ? 'n-type: each donor is a fixed positive ion with its free electron' : 'p-type: each acceptor is a fixed negative ion with its hole';
    second = 'Thermal pairs add a few minority carriers, and recombination with the majority keeps them few';
  } else if (s.show === 'levels') {
    const tp = s.type ?? 'n', mat = s.material ?? 'Si', Eg = mat === 'Si' ? 1.1 : .72, x0 = bx + bw * .12, w = bw * .66;
    const gapH = bh * .44, per = gapH / Eg, band = bh * .18, cBot = by + bh * .2, cTop = cBot - band, vTop = cBot + gapH;
    rect(x0, cTop, w, band, {fill: 'paper', stroke: 'accent', width: 2.5 * k});
    rect(x0, vTop, w, band, {fill: 'cool', opacity: .55, stroke: 'cool', width: 2 * k});
    label(x0 + w + 14 * k, cBot + 8 * k, 'E_C', 'ink', 26, {align: 'start'}); label(x0 + w + 14 * k, vTop + 8 * k, 'E_V', 'ink', 26, {align: 'start'});
    label(x0 - 12 * k, cTop + band * .7 + 8 * k, 'CB', 'muted', 22, {align: 'end'}); label(x0 - 12 * k, vTop + band * .7 + 8 * k, 'VB', 'muted', 22, {align: 'end'});
    if (num) label(x0 + w + 14 * k, (cBot + vTop) / 2 + 8 * k, `Eg ≈ ${Eg} eV`, 'muted', 24, {align: 'start'});
    const level = tp === 'n' ? cBot + DONOR_EV[mat] * per : vTop - DONOR_EV[mat] * per, xs = [0, 1, 2, 3, 4].map(i => x0 + w * (.14 + i * .18));
    line([x0, level], [x0 + w, level], tp === 'n' ? 'bad' : 'cool', 3, {}, true);
    label(x0 - 12 * k, level + 9 * k, tp === 'n' ? 'E_D' : 'E_A', tp === 'n' ? 'bad' : 'cool', 26, {align: 'end'});
    xs.forEach((x, i) => {
      const t0 = 1.6 + i * .35;
      if (tp === 'n') {                                          // donor electrons lifted into the band, ions left on E_D
        electron(x, level, move([x, level], [x, cBot - band * .35], t0, t0 + .7));
        ion(x, level, 1, {show: [t0 + .6, 1e9], fade: .3}, 10);
      } else {                                                   // valence electrons lifted onto E_A, holes left below
        electron(x, vTop + 10 * k, {show: [0, t0 + .75], ...move([x, vTop + 10 * k], [x, level], t0, t0 + .7)});
        hole(x, vTop + 10 * k, {show: [t0 + .4, 1e9], fade: .3});
        ion(x, level, -1, {show: [t0 + .7, 1e9], fade: .3}, 10);
      }
    });
    // one intrinsic pair, across the whole gap
    const xi = x0 + w * .92;
    electron(xi, vTop + 10 * k, move([xi, vTop + 10 * k], [xi, cBot - band * .35], 3.8, 4.8)); hole(xi, vTop + 10 * k, {show: [4.2, 1e9], fade: .3});
    label(xi, (cBot + vTop) / 2, 'rare', 'muted', 20, {show: [4.4, 1e9]});
    anchors.level = [x0 + w / 2, level]; anchors.cb = [x0 + w / 2, cTop + band / 2]; anchors.vb = [x0 + w / 2, vTop + band / 2];
    if (num && tp === 'n') facts.push(`E_D lies about ${DONOR_EV[mat]} eV below E_C in ${mat}, drawn to scale with Eg ≈ ${Eg} eV`);
    facts.push(tp === 'n' ? 'at room temperature most donors are ionised; very few Si atoms are' : 'at room temperature most acceptors are ionised, leaving holes in the valence band');
    dur = 6;
    story = tp === 'n' ? 'The donor level sits just below the conduction band: a tiny energy lifts its electrons in' : 'The acceptor level sits just above the valence band: a tiny energy lifts electrons onto it';
    second = tp === 'n' ? 'So the conduction electrons come mostly from the donors' : 'Each leaves a hole, so the valence band holes come mostly from the acceptors';
  } else if (s.show === 'junction' || s.show === 'bias') {
    const mat = s.material ?? 'Si', V0 = CUT_IN[mat], fwd = (s.bias ?? 'forward') === 'forward', V = s.V ?? (fwd ? .3 : 5);
    const biased = s.show === 'bias', x0 = bx + bw * .04, w = bw * .92, y0 = by + bh * .06, h = bh * .36, xj = x0 + w / 2;
    const W0 = w * .09, Wd = biased ? W0 * Math.sqrt(Math.max(.02, (fwd ? V0 - V : V0 + V) / V0)) : W0;
    rect(x0, y0, w / 2, h, {fill: 'bad', opacity: .12, stroke: 'muted', width: 2.5 * k}); rect(xj, y0, w / 2, h, {fill: 'cool', opacity: .12, stroke: 'muted', width: 2.5 * k});
    label(x0 + 4 * k, y0 - 14 * k, 'p', 'ink', 34, {align: 'start'}); label(x0 + w - 4 * k, y0 - 14 * k, 'n', 'ink', 34, {align: 'end'});
    const cols = 10, rows = 4, dxs = (w / 2) / cols, dys = h / rows, tD = biased ? 0 : 1.4, tE = biased ? .3 : 3.4;
    for (let side = 0; side < 2; side++) for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const x = side ? xj + dxs * (c + .5) : x0 + dxs * (c + .5), y = y0 + dys * (r + .5), dist = Math.abs(x - xj), inside = dist < Wd;
      ion(x, y, side ? 1 : -1, {}, 10);
      const cx0 = x + (side ? -1 : 1) * dxs * .28, cy0 = y + dys * .26;
      if (!inside) { if (side) electron(cx0, cy0, {}, 7); else hole(cx0, cy0, {}, 7); continue; }
      // carriers near the junction cross it and are lost to recombination: the ions they leave form the depletion layer
      const to: P2 = [xj + (side ? -1 : 1) * (Wd + dxs * (.3 + (r % 2) * .5)), cy0], t0 = biased ? -1 : tD + (cols - c) * .05 + r * .08;
      if (biased) continue;
      const extra = {...move([cx0, cy0], to, t0, t0 + 1.2), show: [0, t0 + 1.6], fade: .4};
      if (side) electron(cx0, cy0, extra, 7); else hole(cx0, cy0, extra, 7);
    }
    rect(xj - Wd, y0, 2 * Wd, h, {fill: 'accent', opacity: .14, stroke: 'accent', width: 2 * k, dash: [8 * k, 6 * k]}, {show: [tE, 1e9], fade: .5});
    label(xj, y0 + h + 30 * k, 'depletion layer', 'accent', 24, {show: [tE, 1e9]});
    arrow([xj + Wd * .8, y0 - 22 * k], [xj - Wd * .8, y0 - 22 * k], 'accent', 4, {show: [tE + .4, 1e9]});
    label(xj + Wd * .8 + 10 * k, y0 - 14 * k, 'E', 'accent', 26, {align: 'start', show: [tE + .4, 1e9]});
    anchors.junction = [xj, y0 + h / 2]; anchors.left = [xj - Wd, y0 + h / 2]; anchors.right = [xj + Wd, y0 + h / 2];
    if (!biased) {
      arrow([xj - W0 * 2.6, y0 + h + 72 * k], [xj - W0 * .6, y0 + h + 72 * k], 'bad', 4, {show: [tD, 1e9]}); label(xj - W0 * 2.7, y0 + h + 80 * k, 'holes diffuse p → n', 'bad', 22, {align: 'end', show: [tD, 1e9]});
      arrow([xj + W0 * 2.6, y0 + h + 72 * k], [xj + W0 * .6, y0 + h + 72 * k], 'cool', 4, {show: [tD, 1e9]}); label(xj + W0 * 2.7, y0 + h + 80 * k, 'electrons diffuse n → p', 'cool', 22, {align: 'start', show: [tD, 1e9]});
      label(xj, y0 + h + 112 * k, 'the field drives drift back the other way', 'muted', 22, {show: [tE + .8, 1e9]});
    }
    // the potential across the junction: low on p, V₀ higher on n (forward: V₀ − V; reverse: V₀ + V)
    const gy = by + bh * .97, gh = bh * .3, top = biased ? (fwd ? V0 - V : V0 + V) : V0, scale = Math.max(V0, top), tG = biased ? 1 : 4.6;
    const shape = (u: number) => u <= -1 ? 0 : u >= 1 ? 1 : u < 0 ? (u + 1) ** 2 / 2 : 1 - (1 - u) ** 2 / 2;
    const curve = (height: number, wd: number) => Array.from({length: 121}, (_, i) => { const x = x0 + w * i / 120; return [x, gy - shape((x - xj) / wd) * height / scale * gh] as P2; });
    line([x0, gy], [x0 + w, gy], 'muted', 2, {show: [tG, 1e9]}); label(x0, gy - gh - 18 * k, 'potential', 'muted', 22, {align: 'start', show: [tG, 1e9]});
    if (biased) poly(curve(V0, W0), 'muted', 3, {show: [tG, 1e9]}, true);
    poly(curve(top, Wd), 'accent', 4, {show: [tG, 1e9], draw: 0, keys: {draw: [[tG, 0], [tG + 1.2, 1, 'inOut']]}});
    const yTop = gy - top / scale * gh;
    line([xj + Wd + 30 * k, gy], [xj + Wd + 30 * k, yTop], 'ink', 2, {show: [tG + 1.2, 1e9]});
    label(xj + Wd + 42 * k, (gy + yTop) / 2 + 10 * k, biased ? (fwd ? 'V₀ − V' : 'V₀ + V') : 'V₀', 'ink', 28, {align: 'start', show: [tG + 1.2, 1e9]});
    anchors.barrier = [xj + Wd + 30 * k, yTop];
    if (!biased) {
      facts.push('diffusion current equals drift current: no net current', 'n is left positive and p negative: the barrier potential V₀');
      dur = 7;
      story = 'Holes and electrons diffuse across and recombine, uncovering fixed ions: the depletion layer';
      second = 'Its field drives a drift current back; when drift balances diffusion, a barrier V₀ remains';
    } else {
      // the battery under the diode, and the current it drives
      const yb = y0 + h + 150 * k, bxm = xj, I = diodeCurrent(fwd ? V : -V, mat), pPlus = fwd;
      line([x0, y0 + h / 2], [x0 - 26 * k, y0 + h / 2], 'ink', 3); line([x0 - 26 * k, y0 + h / 2], [x0 - 26 * k, yb], 'ink', 3); line([x0 - 26 * k, yb], [bxm - 22 * k, yb], 'ink', 3);
      line([x0 + w, y0 + h / 2], [x0 + w + 26 * k, y0 + h / 2], 'ink', 3); line([x0 + w + 26 * k, y0 + h / 2], [x0 + w + 26 * k, yb], 'ink', 3); line([x0 + w + 26 * k, yb], [bxm + 22 * k, yb], 'ink', 3);
      const long = pPlus ? -1 : 1;                               // the long plate is +: on the p side for forward bias
      line([bxm + long * 12 * k, yb - 34 * k], [bxm + long * 12 * k, yb + 34 * k], 'ink', 4); line([bxm - long * 12 * k, yb - 18 * k], [bxm - long * 12 * k, yb + 18 * k], 'ink', 8);
      line([bxm - 22 * k, yb], [bxm - 12 * k, yb], 'ink', 3); line([bxm + 12 * k, yb], [bxm + 22 * k, yb], 'ink', 3);
      label(bxm + long * 12 * k + long * 20 * k, yb - 40 * k, '+', 'ink', 28); label(bxm - long * 12 * k - long * 22 * k, yb - 40 * k, '−', 'ink', 28);
      if (num) label(bxm + 44 * k, yb + 40 * k, `V = ${V} V`, 'ink', 26, {align: 'start'});
      anchors.battery = [bxm, yb];
      if (fwd) {                                                 // minority carrier injection: holes into n, electrons into p
        for (let j = 0; j < 3; j++) {
          const yy = y0 + dys * (j + .7), t0 = 1.2 + j * .6;
          hole(xj - Wd - dxs, yy, {...move([xj - Wd - dxs, yy], [xj + Wd + dxs * 1.5, yy], t0, t0 + 1.6), show: [t0, t0 + 2.2], fade: .3}, 7);
          electron(xj + Wd + dxs, yy + dys * .35, {...move([xj + Wd + dxs, yy + dys * .35], [xj - Wd - dxs * 1.5, yy + dys * .35], t0 + .3, t0 + 1.9), show: [t0 + .3, t0 + 2.5], fade: .3}, 7);
        }
      }
      facts.push(`depletion layer ${fwd ? 'narrower' : 'wider'}: barrier ${fwd ? 'V₀ − V' : 'V₀ + V'}`);
      if (num) facts.push(`I ≈ ${current(Math.abs(I))}${fwd ? '' : ', in reverse'}`, `V₀ taken as about ${V0} V, the ${mat} cut-in`);
      dur = 6;
      story = fwd ? 'Forward bias: the battery opposes the barrier, the depletion layer narrows and carriers cross' : 'Reverse bias: the battery adds to the barrier, the depletion layer widens';
      second = fwd ? 'Holes enter n and electrons enter p: the current grows quickly past the cut-in voltage' : 'Only minority carriers drift across: a tiny current, about a microampere, that hardly changes with V';
    }
  } else if (s.show === 'iv') {
    const mat = s.material ?? 'Si', ox = bx + bw * .44, oy = by + bh * .56, fw = bw * .5, rw = bw * .4, up = bh * .5, down = bh * .36;
    const Imax = 40e-3, Vmax = 1, Vrev = 20, Irev = 2e-6;      // one fixed window: forward 0–1 V, 0–40 mA; reverse to −20 V, −2 μA
    const X = (v: number) => v >= 0 ? ox + v / Vmax * fw : ox + v / Vrev * rw, Y = (i: number) => i >= 0 ? oy - i / Imax * up : oy - i / Irev * down;
    line([ox - rw - 10 * k, oy], [ox + fw + 20 * k, oy], 'ink', 2.5); line([ox, oy + down + 10 * k], [ox, oy - up - 10 * k], 'ink', 2.5);
    label(ox + fw + 26 * k, oy + 8 * k, 'V (V)', 'muted', 22, {align: 'start'}); label(ox + 10 * k, oy - up - 18 * k, 'I (mA)', 'muted', 22, {align: 'start'});
    label(ox + 10 * k, oy + down + 30 * k, 'I (μA)', 'muted', 22, {align: 'start'});
    if (num) {
      for (const v of [.2, .4, .6, .8, 1]) { line([X(v), oy - 6 * k], [X(v), oy + 6 * k], 'muted', 2); label(X(v), oy + 30 * k, String(v), 'muted', 20); }
      for (const v of [-5, -10, -15, -20]) { line([X(v), oy - 6 * k], [X(v), oy + 6 * k], 'muted', 2); label(X(v), oy - 14 * k, `−${-v}`, 'muted', 20); }
      for (const i of [10, 20, 30, 40]) { line([ox - 6 * k, Y(i * 1e-3)], [ox + 6 * k, Y(i * 1e-3)], 'muted', 2); label(ox - 12 * k, Y(i * 1e-3) + 7 * k, String(i), 'muted', 20, {align: 'end'}); }
      for (const i of [-1, -2]) { line([ox - 6 * k, Y(i * 1e-6)], [ox + 6 * k, Y(i * 1e-6)], 'muted', 2); label(ox - 12 * k, Y(i * 1e-6) + 7 * k, `−${-i}`, 'muted', 20, {align: 'end'}); }
    }
    const fwdPts = Array.from({length: 161}, (_, i) => i / 160 * Vmax).map(v => [X(v), Y(Math.min(diodeCurrent(v, mat), Imax))] as P2).filter(p => p[1] >= oy - up - 1);
    const revPts = Array.from({length: 81}, (_, i) => -i / 80 * Vrev).map(v => [X(v), Y(diodeCurrent(v, mat))] as P2);
    poly(fwdPts, 'accent', 5, {draw: 0, keys: {draw: [[.6, 0], [2.4, 1, 'inOut']]}});
    poly(revPts, 'cool', 5, {draw: 0, keys: {draw: [[2.6, 0], [3.8, 1, 'inOut']]}});
    label(X(.5), Y(30e-3), 'forward bias', 'accent', 24, {show: [1.6, 1e9]}); label(X(-12), Y(-1.6e-6), 'reverse bias', 'cool', 24, {show: [3.2, 1e9]});
    const Vc = CUT_IN[mat];
    line([X(Vc), oy], [X(Vc), oy - up], 'muted', 2, {show: [2.2, 1e9]}, true);
    label(X(Vc) - 10 * k, oy - up + 14 * k, num ? `cut-in ≈ ${Vc} V` : 'cut-in', 'muted', 22, {align: 'end', show: [2.2, 1e9]});
    anchors.origin = [ox, oy]; anchors.cutin = [X(Vc), oy];
    facts.push(`cut-in voltage about ${Vc} V for ${mat === 'Si' ? 'silicon' : 'germanium'}`, 'reverse current about 1 μA, nearly constant');
    dur = 6;
    if (s.resistance) {
      const a: P2 = [X(.7), Y(10e-3)], b: P2 = [X(.8), Y(20e-3)], r: P2 = [X(-10), Y(-1e-6)];
      for (const [p, t0] of [[a, 4.2], [b, 4.2], [r, 5.6]] as [P2, number][]) props.push({id: id('pt'), type: 'circle', x: p[0], y: p[1], r: 8 * k, style: {fill: 'ink', stroke: 'paper', width: 2 * k}, layer: 4, show: [t0, 1e9], fade: .3} as Prop);
      line(a, [b[0], a[1]], 'ink', 2, {show: [4.6, 1e9]}); line([b[0], a[1]], b, 'ink', 2, {show: [4.6, 1e9]});
      label((a[0] + b[0]) / 2, a[1] + 28 * k, 'ΔV = 0.1 V', 'ink', 22, {show: [4.8, 1e9]}); label(b[0] + 12 * k, (a[1] + b[1]) / 2 + 8 * k, 'ΔI = 10 mA', 'ink', 22, {align: 'start', show: [4.8, 1e9]});
      label(r[0], r[1] + 34 * k, '−10 V, −1 μA', 'ink', 22, {show: [5.8, 1e9]});
      facts.unshift('r_fb = ΔV/ΔI = 0.1 V / 10 mA = 10 Ω', 'r_rb = 10 V / 1 μA = 1.0 × 10⁷ Ω');
      anchors.forward = b; anchors.reverse = r; dur = 8;
    }
    if (s.V !== undefined) {
      const I = diodeCurrent(s.V, mat), p: P2 = [X(s.V), Y(Math.max(-Irev, Math.min(I, Imax)))], t0 = s.resistance ? 6.5 : 4.2;
      props.push({id: 'point', type: 'circle', x: p[0], y: p[1], r: 10 * k, style: {fill: 'good', stroke: 'paper', width: 2 * k}, layer: 5, show: [t0, 1e9], fade: .3} as Prop);
      line([p[0], oy], p, 'good', 2, {show: [t0, 1e9]}, true);
      anchors.point = p;
      const txt = `${I < 0 ? '−' : ''}${current(Math.abs(I))}`;
      if (num) facts.unshift(`at V = ${s.V} V, I ≈ ${txt}${s.V > Vc - .15 && s.V > 0 ? `, r_d ≈ ${sig(dynamicResistance(s.V, mat), 2)} Ω` : ''}`);
      dur = Math.max(dur, t0 + 2);
    }
    story = 'Forward, the current is almost nothing until the cut-in voltage, then rises steeply';
    second = 'Reverse, only a tiny saturation current flows: note the μA scale below the axis';
  } else {
    // rectifier (Fig. 14.18 to 14.20): the circuit above, the input and output below on one time axis
    const kind = s.kind ?? 'half', full = kind === 'full', peak = s.peak ?? 10, drop = s.drop ? .7 : 0, filt = !!s.filter, tau = s.tau ?? 2, periods = 2;
    const top = by + bh * .04, ch = bh * .4, coilX = bx + bw * .2, coilY = top + ch * .5;
    const coil = (x: number, y0c: number, y1c: number, side: 1 | -1) => {
      const m = 6, step = (y1c - y0c) / m;
      poly(Array.from({length: m * 12 + 1}, (_, i) => { const a = (i % 12) / 12 * Math.PI, j = Math.floor(i / 12); return i === m * 12 ? [x, y1c] as P2 : [x + side * Math.sin(a) * 18 * k, y0c + j * step + (1 - Math.cos(a)) / 2 * step] as P2; }), 'ink', 3);
    };
    const diode = (p: P2, dir: P2, name: string, glow: [number, number][]) => {
      const L = 26 * k, u = dir, v: P2 = [-u[1], u[0]], tip: P2 = [p[0] + u[0] * L / 2, p[1] + u[1] * L / 2], back: P2 = [p[0] - u[0] * L / 2, p[1] - u[1] * L / 2];
      const tri: P2[] = [[back[0] + v[0] * L * .6, back[1] + v[1] * L * .6], [back[0] - v[0] * L * .6, back[1] - v[1] * L * .6], tip];
      props.push({id: id('d'), type: 'polyline', points: tri, closed: true, style: {stroke: 'ink', fill: 'ink', width: 2 * k}, layer: 3} as Prop);
      line([tip[0] + v[0] * L * .6, tip[1] + v[1] * L * .6], [tip[0] - v[0] * L * .6, tip[1] - v[1] * L * .6], 'ink', 4);
      // lit while it conducts
      const lit: Key[] = [[0, 0], ...glow.flatMap(([a, b]) => [[a - .01, 0], [a, .35], [b, .35], [b + .01, 0]] as Key[])];
      props.push({id: id('dg'), type: 'circle', x: p[0], y: p[1], r: 30 * k, style: {fill: 'good'}, layer: 2, keys: {opacity: lit}} as Prop);
      label(p[0] + v[0] * 46 * k, p[1] + v[1] * 46 * k + 8 * k, name, 'ink', 24);
    };
    const resistor = (x: number, y0r: number, y1r: number, name: string) => {
      const m = 8, step = (y1r - y0r) / m;
      poly([[x, y0r], ...Array.from({length: m}, (_, i) => [x + (i % 2 ? -1 : 1) * 14 * k, y0r + (i + .5) * step] as P2), [x, y1r]], 'ink', 3);
      label(x + 26 * k, (y0r + y1r) / 2 + 8 * k, name, 'ink', 24, {align: 'start'});
    };
    // timing: the input is drawn first, then a cursor sweeps the output; the conducting diode is lit in step
    const t0 = 1.6, sweep = 6, T = sweep / periods, ty = (u: number) => t0 + u * T;
    const halves = (pos: boolean) => Array.from({length: periods}, (_, j) => [ty(j + (pos ? 0 : .5)), ty(j + (pos ? .5 : 1))] as [number, number]);
    coil(coilX, coilY - ch * .35, coilY + ch * .35, 1); coil(coilX + 44 * k, coilY - ch * .35, coilY + ch * .35, -1);
    line([coilX + 20 * k, coilY - ch * .4], [coilX + 20 * k, coilY + ch * .4], 'muted', 2); line([coilX + 25 * k, coilY - ch * .4], [coilX + 25 * k, coilY + ch * .4], 'muted', 2);
    label(coilX - 34 * k, coilY + 8 * k, 'ac in', 'muted', 22, {align: 'end'});
    const A: P2 = [coilX + 44 * k, coilY - ch * .35], B: P2 = [coilX + 44 * k, coilY + ch * .35], C: P2 = [coilX + 44 * k, coilY];
    const xl = bx + bw * .68, yTopR = coilY - ch * .35, yBotR = full ? coilY : coilY + ch * .35;
    label(A[0] - 8 * k, A[1] - 10 * k, 'A', 'ink', 24, {align: 'end'}); label(B[0] - 8 * k, B[1] + 28 * k, 'B', 'ink', 24, {align: 'end'});
    if (!full) {
      const dp: P2 = [bx + bw * .44, A[1]];
      line(A, [dp[0] - 16 * k, A[1]], 'ink', 3); line([dp[0] + 16 * k, A[1]], [xl, A[1]], 'ink', 3);
      diode(dp, [1, 0], 'D', halves(true));
      line(B, [xl, B[1]], 'ink', 3); anchors.diode = dp;
    } else {
      const dp1: P2 = [bx + bw * .44, A[1]], dp2: P2 = [bx + bw * .44, B[1]], node = bx + bw * .56;
      line(A, [dp1[0] - 16 * k, A[1]], 'ink', 3); line([dp1[0] + 16 * k, A[1]], [node, A[1]], 'ink', 3);
      line(B, [dp2[0] - 16 * k, B[1]], 'ink', 3); line([dp2[0] + 16 * k, B[1]], [node, B[1]], 'ink', 3);
      line([node, A[1]], [node, B[1]], 'ink', 3); line([node, A[1]], [xl, A[1]], 'ink', 3);
      diode(dp1, [1, 0], 'D₁', halves(true)); diode(dp2, [1, 0], 'D₂', halves(false));
      line(C, [xl, C[1]], 'ink', 3); label(C[0] + 14 * k, C[1] - 12 * k, 'centre tap', 'muted', 20, {align: 'start'});
      anchors.diode1 = dp1; anchors.diode2 = dp2;
    }
    resistor(xl, yTopR, yBotR, 'R_L');
    if (filt) {
      const xc = xl + bw * .12;
      line([xl, yTopR], [xc, yTopR], 'ink', 3); line([xl, yBotR], [xc, yBotR], 'ink', 3);
      const ym = (yTopR + yBotR) / 2;
      line([xc, yTopR], [xc, ym - 8 * k], 'ink', 3); line([xc, ym + 8 * k], [xc, yBotR], 'ink', 3);
      line([xc - 22 * k, ym - 8 * k], [xc + 22 * k, ym - 8 * k], 'ink', 4); line([xc - 22 * k, ym + 8 * k], [xc + 22 * k, ym + 8 * k], 'ink', 4);
      label(xc + 30 * k, ym + 8 * k, 'C', 'ink', 24, {align: 'start'}); anchors.capacitor = [xc, ym];
    }
    anchors.load = [xl, (yTopR + yBotR) / 2];
    // the waveforms
    const gx = bx + bw * .08, gw = bw * .86, inY = by + bh * .58, outY = by + bh * .92, amp = bh * .12;
    const vin = (u: number) => Math.sin(2 * Math.PI * u);
    const wave = (y: number, f: (u: number) => number, stroke: string, extra: Record<string, unknown>) => poly(Array.from({length: 241}, (_, i) => [gx + gw * i / 240, y - f(i / 240 * periods) * amp] as P2), stroke, 4, extra);
    for (const [y, name] of [[inY, full ? 'input (A to centre tap)' : 'input'], [outY, 'output across R_L']] as [number, string][]) {
      line([gx, y], [gx + gw, y], 'muted', 2); label(gx, y - amp - 14 * k, name, 'muted', 22, {align: 'start'});
    }
    wave(inY, vin, 'muted', {draw: 0, keys: {draw: [[.6, 0], [t0, 1, 'inOut']]}});
    const outF = filt ? (() => { const pts = filtered(kind, 1, tau, periods, drop / peak); return (u: number) => pts[Math.min(pts.length - 1, Math.round(u * 200))][1]; })()
      : (u: number) => rectified(u, kind, 1, drop / peak);
    const outScale = 1;
    poly(Array.from({length: 241}, (_, i) => [gx + gw * i / 240, outY - outF(i / 240 * periods) * outScale * amp] as P2), 'accent', 4, {draw: 0, keys: {draw: [[t0, 0], [t0 + sweep, 1, 'linear']]}});
    if (filt) wave(outY, u => rectified(u, kind, 1, drop / peak) * outScale, 'faint', {show: [t0, 1e9]});
    props.push({id: 'cursor', type: 'line', x1: gx, y1: inY - amp - 4 * k, x2: gx, y2: outY + 10 * k, style: {stroke: 'good', width: 2 * k}, layer: 5, show: [t0, t0 + sweep], keys: {x1: [[t0, gx], [t0 + sweep, gx + gw, 'linear']], x2: [[t0, gx], [t0 + sweep, gx + gw, 'linear']]}} as Prop);
    anchors.input = [gx + gw * .125 / periods * 2, inY - amp * (full ? .5 : 1)]; anchors.output = [gx + gw * .5, outY];
    const Vout = peak - drop;
    if (num) facts.push(`output peak ${sig(Vout)} V${drop ? ' (less the 0.7 V across the diode)' : ''}`);
    facts.push(full ? 'D₁ conducts in one half-cycle and D₂ in the other: output in both' : 'the diode conducts only in the positive half-cycle');
    if (filt) {
      const pts = filtered(kind, Vout + drop, tau, periods, drop).filter(([t]) => t >= 1);
      const lo = Math.min(...pts.map(p => p[1])), hi = Math.max(...pts.map(p => p[1]));
      if (num) facts.push(`ripple ${sig(hi - lo, 2)} V with CR_L = ${tau} periods`);
      facts.push('a larger C (longer CR_L) gives a smaller ripple');
    }
    dur = t0 + sweep + 1;
    story = full ? 'Full-wave: one diode or the other conducts, so both halves of the ac reach the load the same way' : 'Half-wave: the diode passes the positive half-cycles and blocks the negative ones';
    second = filt ? 'The capacitor charges to the peak and discharges slowly through R_L, smoothing the output' : 'The output is one-way but not steady: pulses, the shape of half sines';
  }
  return finish('semiconductor', s as never, dur, story, second, facts, anchors, s.illustrative);
}
