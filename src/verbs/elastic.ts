// Elasticity (NCERT Class 11 Physics, Ch. 8, Mechanical Properties of Solids; 2026-10-30). One verb, every number
// computed from the book's moduli. A steel wire stretches by a thousandth of its length, so every deformation is drawn
// larger than real, the same factor for every part of one scene, and the scene says so:
// - tension: a wire (or 2-3 wires end to end, a load at each end) stretched by a hanging load, ΔL = FL / AY, or a rod
//   pressed from above (compress); the wire thinning (Poisson's ratio) and the energy it stores, ½ F ΔL;
// - shear: a block fixed at its base, a tangential force sliding its top face by Δx: θ ≈ Δx / L, G = (F/A) / θ;
// - hydraulic: a body in a fluid under pressure p shrinking on every side, its shape kept: ΔV/V = p / B, k = 1 / B;
// - curve: a metal's stress-strain curve traced beside the wire it describes (proportional limit, yield point, ultimate
//   strength, fracture), the elastic and plastic regions, unloading to a permanent set, the energy ½ σ ε as an area;
//   or a rubber-like curve with no straight part that still returns along itself;
// - beam: a beam on two supports sagging under a central load, δ = W l³ / (4 b d³ Y), and the same beam on its edge;
// - recover: a spring pulled and let go springs back; putty pulled stays stretched (elastic and plastic).
import type {Prop, Scene} from '../scene.ts';
import type {Plane} from '../plane.ts';
import {toScene} from '../plane.ts';
import {wrapText} from '../svg.ts';
import {round} from '../vec.ts';
import {n2, panel, scene, text} from './calculus.ts';
import {frame} from './vectors.ts';
import {nameError} from './names.ts';
import {sci} from './gravitation.ts';


type P2 = [number, number];
/** Three significant figures, in powers of ten when large or small: 1.34 % not 0.01, 2.50 × 10⁷ */
const num = (v: number) => (v !== 0 && (Math.abs(v) < 1e-3 || Math.abs(v) >= 1e5) ? sci(v) : n2(+v.toPrecision(3), Math.max(0, 2 - Math.floor(Math.log10(Math.abs(v) || 1)))));
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const f = (v: number, p = 2) => n2(round(v, 9), Number.isInteger(round(v, 9)) ? 0 : p);
/** A small length in mm, or in powers of ten of a metre when under a hundredth of a mm. */
const mm = (v: number) => (Math.abs(v) * 1000 >= 0.01 ? `${f(v * 1000, Math.abs(v) * 1000 < 1 ? 3 : 2)} mm` : `${num(v)} m`);
export const ELASTIC_KINDS = ['tension', 'shear', 'hydraulic', 'curve', 'beam', 'recover'] as const;

// The book's Tables 8.1-8.3, in Pa (brass Y is the exercises' 0.91 × 10¹¹); sigma is Poisson's ratio where the book gives it
export const MATERIALS: Record<string, {Y?: number; G?: number; B?: number; sigma?: number}> = {
  steel: {Y: 2.0e11, G: 8.4e10, B: 1.6e11, sigma: 0.29}, iron: {Y: 1.9e11, G: 7.0e10, B: 1.0e11}, copper: {Y: 1.1e11, G: 4.2e10, B: 1.4e11},
  brass: {Y: 0.91e11, G: 3.6e10, B: 6.1e10}, aluminium: {Y: 7.0e10, G: 2.5e10, B: 7.2e10, sigma: 0.33}, glass: {Y: 6.5e10, G: 2.3e10, B: 3.7e10},
  lead: {G: 5.6e9}, tungsten: {G: 1.5e11}, nickel: {G: 7.7e10, B: 2.6e11}, wood: {Y: 1.3e10, G: 1.0e10}, bone: {Y: 9.4e9}, concrete: {Y: 3.0e10},
  water: {B: 2.2e9}, mercury: {B: 2.5e10}, glycerine: {B: 4.76e9}, ethanol: {B: 0.9e9}, air: {B: 1.0e5},
};
/** A ratio in words: 73 times, 1.6 million times, a fifth of */
const times = (r: number) => (r >= 1e6 ? `${num(r / 1e6)} million times` : r >= 1 ? `${num(r)} times` : `${num(r)} of`);
const listed = (m: 'Y' | 'G' | 'B') => Object.entries(MATERIALS).filter(([, v]) => v[m] !== undefined).map(([k]) => k).join(', ');

type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};
type Wire = {material?: string; Y?: number; L: number; d?: number; A?: number; load?: number};
export type ElasticSpec = Common & {verb: 'elastic'; kind: (typeof ELASTIC_KINDS)[number]; material?: string;
  Y?: number; G?: number; B?: number; sigma?: number; L?: number; d?: number; A?: number; F?: number; load?: number;
  wires?: Wire[]; dL?: number; compress?: boolean; w?: number; p?: number; depth?: number; V?: number; shape?: 'sphere' | 'cube';
  compare?: string[]; curve?: 'metal' | 'rubber'; g?: number; l?: number; b?: number; names?: [string, string];
  show?: ('lateral' | 'energy' | 'regions' | 'unload' | 'edge')[];
  /** Drawn px per real metre of deformation: set by a compound scene so side-by-side parts share one factor (a stiffer
   * beam beside a softer one sagged alike when each part fitted its own sag, C9 of keph2-01). Not a planner field. */
  deform_scale?: number};

// Words for things that spring back and things that stay deformed: names is [the elastic one, the plastic one], and a
// plan once named ['body', 'spring'], so the screen said 'Plastic: the spring has no tendency to regain it' (keph2-01 C1).
const SPRINGY = /\b(spring|rubber|elastic|steel|wire|ball|band|bow|trampoline)\b/i;
const DOUGHY = /\b(putty|clay|plasticine|dough|wax|mud|play-?doh|lead shot)\b/i;

const SHOWS: Record<string, string[]> = {tension: ['lateral', 'energy'], curve: ['regions', 'unload', 'energy'], beam: ['edge'],
  shear: [], hydraulic: [], recover: []};

/** A modulus from the spec or the material's table entry; undefined when neither gives it. */
const modulus = (s: {material?: string; Y?: number; G?: number; B?: number}, m: 'Y' | 'G' | 'B') =>
  s[m] ?? (s.material ? MATERIALS[s.material.toLowerCase()]?.[m] : undefined);
const gOf = (s: ElasticSpec) => s.g ?? 9.8;   // the book takes g = 10 in some examples (the ocean's depth, Ex. 8.5)
const force = (s: ElasticSpec) => s.F ?? (isNum(s.load) ? s.load * gOf(s) : undefined);

export function elasticErrors(s: ElasticSpec): string[] {
  const e: string[] = [];
  if (!ELASTIC_KINDS.includes(s.kind)) return [`elastic: kind is one of ${ELASTIC_KINDS.join(', ')}`];
  for (const x of s.show ?? []) if (!SHOWS[s.kind].includes(x))
    e.push(`elastic: a ${s.kind} scene shows ${SHOWS[s.kind].length ? SHOWS[s.kind].map(v => `'${v}'`).join(', ') : 'nothing extra (leave show out)'}`);
  if (s.material !== undefined && !(typeof s.material === 'string' && MATERIALS[s.material.toLowerCase()]))
    e.push(`elastic: material is one the book's tables list (${Object.keys(MATERIALS).join(', ')}); for another, give its modulus (Y, G or B in Pa)`);
  for (const m of ['Y', 'G', 'B'] as const) if (s[m] !== undefined && !(isNum(s[m]) && s[m]! >= 1e4 && s[m]! <= 1e13))
    e.push(`elastic: ${m} is a modulus in Pa (steel's Y is 2e11)`);
  const pos = (k: keyof ElasticSpec, what: string) => { if (s[k] !== undefined && !(isNum(s[k]) && (s[k] as number) > 0)) e.push(`elastic: ${String(k)} is ${what}`); };
  if (s.g !== undefined && !(isNum(s.g) && s.g >= 9 && s.g <= 10.5)) e.push('elastic: g is 9.8 m/s² (default) or the book\'s 10');
  pos('F', 'a force in N (above 0)'); pos('load', 'a hanging mass in kg (above 0)');
  if (s.F !== undefined && s.load !== undefined) e.push('elastic: give F (N) or load (kg), not both');
  const needForce = () => { if (force(s) === undefined) e.push(`elastic: a ${s.kind} scene needs F in N or load in kg`); };
  const needModulus = (m: 'Y' | 'G' | 'B') => { if (!s.illustrative && modulus(s, m) === undefined)
    e.push(`elastic: give ${m} in Pa or a material the book lists with it (${listed(m)}); an illustrative scene may leave it out`); };

  if (s.kind === 'tension') {
    if (s.wires !== undefined) {
      if (!(Array.isArray(s.wires) && s.wires.length >= 1 && s.wires.length <= 3)) return [...e, 'elastic: wires is 1 to 3 {material or Y, L (m), d (m) or A (m²), load? (kg at its lower end)}, top first'];
      s.wires.forEach((w, i) => {
        const at = `elastic: wires ${i + 1}`;
        if (!(isNum(w?.L) && w.L > 0 && w.L <= 100)) e.push(`${at}: L is its length in m`);
        if (!((isNum(w?.d) && w.d > 0 && w.d < 1) || (isNum(w?.A) && w.A > 0 && w.A < 1))) e.push(`${at}: give d (diameter, m) or A (cross-section, m²)`);
        if (w?.material !== undefined && !MATERIALS[String(w.material).toLowerCase()]?.Y) e.push(`${at}: material is one with a Young's modulus in the book (${listed('Y')}), or give Y`);
        if (!s.illustrative && modulus({...w, Y: w?.Y ?? s.Y}, 'Y') === undefined && modulus(s, 'Y') === undefined) e.push(`${at}: give Y in Pa or a material (${listed('Y')})`);
        if (w?.load !== undefined && !(isNum(w.load) && w.load > 0)) e.push(`${at}: load is a mass in kg hung at its lower end`);
        const bad = w?.material ? nameError(`${at}: material`, w.material, 12, 'steel, brass') : ''; if (bad) e.push(bad);
      });
      if (s.compress) e.push('elastic: compress is for one rod (L, d or A, a load on top); leave wires out');
      if (s.dL !== undefined) {
        if (!(isNum(s.dL) && s.dL > 0 && s.dL < 0.5)) e.push('elastic: dL is the measured total elongation in m (0.70 mm is 0.0007)');
        if (force(s) !== undefined || s.wires.some(w => w?.load !== undefined)) e.push('elastic: with dL the load is solved; leave F, load and the wires\' loads out');
      } else if (force(s) === undefined && !s.wires.some(w => isNum(w?.load))) e.push('elastic: give the wires loads (kg), or F or load at the bottom, or dL to solve the load');
      if ((s.show ?? []).includes('lateral')) e.push("elastic: 'lateral' thinning is shown for one wire; leave wires out");
    } else {
      if (!(isNum(s.L) && s.L > 0 && s.L <= 100)) e.push('elastic: L is the wire or rod length in m');
      if (!((isNum(s.d) && s.d > 0 && s.d < 2) || (isNum(s.A) && s.A > 0 && s.A < 4))) e.push('elastic: give d (diameter, m) or A (cross-section, m²)');
      needForce(); needModulus('Y');
      if (s.sigma !== undefined && !(isNum(s.sigma) && s.sigma > 0 && s.sigma < 0.5)) e.push("elastic: sigma is Poisson's ratio, 0 to 0.5 (steel about 0.29)");
    }
  }
  if (s.kind === 'shear') {
    if (!(isNum(s.L) && s.L > 0 && s.L <= 100)) e.push('elastic: L is the block\'s height in m (the side the force acts across)');
    if (s.w !== undefined && !(isNum(s.w) && s.w > 0 && s.w <= 10 * (s.L ?? 1) && s.w >= 0.2 * (s.L ?? 1))) e.push('elastic: w is the block\'s width in m, 0.2 to 10 times L');
    if (!(isNum(s.A) && s.A > 0)) e.push('elastic: A is the area of the face the force slides, in m² (a 50 cm by 10 cm face is 0.05)');
    needForce(); needModulus('G');
  }
  if (s.kind === 'hydraulic') {
    if (s.p !== undefined && s.depth !== undefined) e.push('elastic: give p (Pa) or depth (m of water), not both');
    if (!(isNum(s.p) && s.p > 0) && !(isNum(s.depth) && s.depth > 0)) e.push('elastic: give p, the pressure in Pa (1 atm = 1.013e5), or depth in m of water');
    if (s.V !== undefined && !(isNum(s.V) && s.V > 0)) e.push('elastic: V is the volume in m³ (a litre is 0.001)');
    if (s.shape !== undefined && !['sphere', 'cube'].includes(s.shape)) e.push("elastic: shape is 'sphere' or 'cube'");
    needModulus('B');
    if (s.compare !== undefined) {
      if (!(Array.isArray(s.compare) && s.compare.length >= 2 && s.compare.length <= 4)) e.push(`elastic: compare is 2 to 4 materials (${listed('B')})`);
      else for (const m of s.compare) if (!MATERIALS[String(m).toLowerCase()]?.B) e.push(`elastic: compare: ${m} has no bulk modulus in the book; one of ${listed('B')}`);
    }
  }
  if (s.kind === 'curve') {
    if (s.curve !== undefined && !['metal', 'rubber'].includes(s.curve)) e.push("elastic: curve is 'metal' (straight part, yield, fracture) or 'rubber' (no straight part, still elastic)");
    if (s.curve === 'rubber' && (s.show ?? []).some(x => x !== 'energy' && x !== 'regions')) e.push("elastic: a rubber curve returns along itself: no 'unload'");
  }
  if (s.kind === 'beam') {
    for (const [k, what] of [['l', 'the span between the supports'], ['b', 'the breadth (across)'], ['d', 'the depth (up and down)']] as const)
      if (!(isNum(s[k]) && s[k]! > 0 && s[k]! <= 200)) e.push(`elastic: ${k} is ${what} in m`);
    if (isNum(s.l) && isNum(s.b) && isNum(s.d) && Math.max(s.b, s.d) > 0.5 * s.l) e.push('elastic: a beam is long and thin: b and d at most half of l');
    needForce(); needModulus('Y');
  }
  if (s.kind === 'recover' && s.names !== undefined)
    (Array.isArray(s.names) && s.names.length === 2 ? s.names : [undefined, undefined]).forEach((n, i) => {
      const bad = nameError(`elastic: names ${i + 1}`, n, 14, 'spring, putty, rubber band'); if (bad) e.push(bad); });
  if (s.kind === 'recover' && Array.isArray(s.names) && s.names.length === 2) {
    const [a, b] = s.names.map(String);
    if (SPRINGY.test(b) || DOUGHY.test(a) || a.trim().toLowerCase() === b.trim().toLowerCase())
      e.push(`elastic: names is [the one that springs back, the one that stays deformed], such as ['spring', 'putty']; ${JSON.stringify(s.names)} has them the wrong way round or the same`);
  }
  if (s.deform_scale !== undefined && !(isNum(s.deform_scale) && s.deform_scale > 0)) e.push('elastic: deform_scale is set by a compound scene, px per metre');
  return e;
}

export function elastic(s: ElasticSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080;
  const fr = frame(W, H, k, s.title), box = fr.box, props: Prop[] = [...fr.titles], facts: string[] = [];
  const [bx0, by0, bx1, by1] = box, bw = bx1 - bx0, bh = by1 - by0, narrow = W < 1.3 * H;
  const g = gOf(s), px = fr.px, ptext = panel(W, k), ill = !!s.illustrative, show = new Set(s.show ?? []);
  const plane: Plane = {id: 'p', x: [0, 1], y: [0, 1], box};
  let row = fr.row;
  const line = (id: string, t: string, when: number, extra: Partial<Prop> = {}) => {
    const h = wrapText(t, 30 * k, W - px - 40 * k).length * 1.3 * 30 * k;
    if (row + h > H - 24 * k) return;          // a half-width part keeps the lines that fit: the main ones come first
    props.push(ptext(id, px, row, t, 30 * k, {show: [when, 1e9], ...extra}));
    row += h + 6 * k;
  };
  const label = (id: string, x: number, y: number, t: string, extra: Partial<Prop> = {}) =>
    props.push(text(id, x, y, t, 26 * k, {weight: 700, style: {fill: 'ink'}, layer: 6, ...extra}));
  const rect = (id: string, x: number, y: number, w: number, h: number, style: Prop['style'], extra: Partial<Prop> = {}) =>
    props.push({id, type: 'rect', x, y, w, h, style, layer: 3, ...extra} as Prop);
  const hatch = (id: string, x0: number, x1: number, y: number, down: boolean) => {
    props.push({id, type: 'line', x1: x0, y1: y, x2: x1, y2: y, style: {stroke: 'muted', width: 5 * k}, layer: 2} as Prop);
    for (let x = x0 + 6 * k, i = 0; x < x1 - 10 * k; x += 22 * k, i++)
      props.push({id: `${id}${i}`, type: 'line', x1: x, y1: y + (down ? 3 : -3) * k, x2: x + 14 * k, y2: y + (down ? 17 : -17) * k, style: {stroke: 'muted', width: 2.5 * k}, layer: 2} as Prop);
  };
  const key = (t0: number, t1: number, v0: number, v1: number): [number, number][] => [[t0, v0], [t1, v1]];
  const lead = 0.6, t0 = 1.4, t1 = 3.6;          // the load is put on at lead + 0.4 and the deformation grows from t0 to t1
  const larger = () => line('lnote', 'The deformation is drawn larger than real', t1 + 0.3, {style: {fill: 'muted'}});
  // Marks go at named points only: the plane is the drawing's box, so [x, y] in it landed beside the block, not on it
  // (keph2-01 C2, 'Δx' and 'θ' floating in the corner). shared: the deformation factor, for a compound to share.
  const anchors: Record<string, [number, number]> = {};
  const pin = (perMetre?: number, kind?: string) => ({anchors, anchorsOnly: true, ...(perMetre && kind ? {shared_scale: {key: `elastic-${kind}`, value: perMetre}} : {})});

  if (s.kind === 'tension') {
    const one = !s.wires, comp = !!s.compress && one;
    const wires: Wire[] = s.wires ?? [{material: s.material, Y: s.Y, L: s.L!, d: s.d, A: s.A}];
    const ws = wires.map(w => ({...w, A: w.A ?? Math.PI * w.d! ** 2 / 4, Y: w.Y ?? modulus(w, 'Y') ?? modulus(s, 'Y') ?? 1e11,
      name: w.material ?? (one ? s.material : undefined)}));
    // tensions: each wire holds every load hung at or below its lower end; dL given: the bottom load is solved
    let Fb = force(s) ?? 0;
    if (s.dL !== undefined) Fb = s.dL / ws.reduce((a, w) => a + w.L / (w.A * w.Y), 0);
    const T = ws.map((_, i) => Fb + g * ws.slice(i).reduce((a, w) => a + (w.load ?? 0), 0));
    const dL = ws.map((w, i) => T[i] * w.L / (w.A * w.Y)), total = dL.reduce((a, v) => a + v, 0), sumL = ws.reduce((a, w) => a + w.L, 0);
    const lateral = one && show.has('lateral'), stretch = lateral ? 0.25 : 0.12;   // drawn stretch, as a share of the length
    const blocks = ws.map((w, i) => (w.load !== undefined || (i === ws.length - 1 && s.load !== undefined)));
    const blockH = 56 * k, arrowL = 80 * k, top = by0 + 24 * k;
    const sc = (bh - 40 * k - blocks.filter(Boolean).length * blockH - (s.F !== undefined || s.dL !== undefined ? arrowL + 30 * k : 0) - (blocks[ws.length - 1] ? arrowL : 0)) / ((1 + stretch) * sumL);
    const ex = s.deform_scale ? s.deform_scale / sc : stretch * sumL / total;   // drawn metres per real metre of stretch, one factor for all
    const dmax = Math.max(...ws.map(w => Math.sqrt(w.A)));
    const wpx = ws.map(w => (lateral ? 80 * k : 14 * k + 22 * k * Math.sqrt(w.A) / dmax));
    const cx = bx0 + (narrow ? 0.4 : 0.45) * bw;
    facts.push(...ws.map((w, i) => `${w.name ?? `wire ${i + 1}`}: L = ${f(w.L)} m, A = ${num(w.A)} m², Y = ${num(w.Y)} Pa, tension ${f(T[i], 1)} N, stress ${num(T[i] / w.A)} Pa, strain ${num(dL[i] / w.L)}, elongation ΔL = ${mm(dL[i])}`));
    if (comp) {
      // a rod standing on the ground, a load pressed on its top: it shortens
      const w = ws[0], ground = by1 - 30 * k, h0 = w.L * sc, h1 = h0 - dL[0] * ex * sc, x = cx - wpx[0] / 2;
      hatch('ground', cx - 160 * k, cx + 160 * k, ground, true);
      rect('rod', x, ground - h0, wpx[0], h0, {fill: 'cool', stroke: 'ink', width: 2 * k}, {keys: {y: key(t0, t1, ground - h0, ground - h1), h: key(t0, t1, h0, h1)}});
      rect('load', cx - 60 * k, ground - h0 - blockH, 120 * k, blockH, {fill: 'figure', stroke: 'ink', width: 2 * k}, {show: [lead + 0.4, 1e9], fade: 0.3, keys: {y: key(t0, t1, ground - h0 - blockH, ground - h1 - blockH)}});
      props.push({id: 'F', type: 'arrow', x1: cx, y1: ground - h0 - blockH - 90 * k, x2: cx, y2: ground - h0 - blockH - 8 * k, head: 16 * k, style: {stroke: 'accent', width: 5 * k}, show: [lead + 0.4, 1e9], fade: 0.3, layer: 5,
        keys: {y1: key(t0, t1, ground - h0 - blockH - 90 * k, ground - h1 - blockH - 90 * k), y2: key(t0, t1, ground - h0 - blockH - 8 * k, ground - h1 - blockH - 8 * k)}} as Prop);
      label('lF', cx + 16 * k, ground - h0 - blockH - 60 * k, 'F', {style: {fill: 'accent'}, show: [lead + 0.4, 1e9]});
      props.push({id: 'was', type: 'line', x1: cx + wpx[0] / 2 + 10 * k, y1: ground - h0, x2: cx + wpx[0] / 2 + 110 * k, y2: ground - h0, style: {stroke: 'muted', width: 2 * k, dash: [8 * k, 6 * k]}, layer: 2} as Prop);
      label('ldL', cx + wpx[0] / 2 + 120 * k, ground - h0 + 18 * k, 'ΔL', {show: [t1, 1e9], style: {fill: 'bad'}});
      props.push({id: 'Ldim', type: 'line', x1: x - 40 * k, y1: ground, x2: x - 40 * k, y2: ground - h0, style: {stroke: 'muted', width: 2 * k}, layer: 2} as Prop);
      label('lL', x - 52 * k, ground - h0 / 2, 'L', {align: 'end', style: {fill: 'muted'}});
      Object.assign(anchors, {top: [cx, ground - h1], bottom: [cx, ground], rod: [cx, ground - h1 / 2], load: [cx, ground - h1 - blockH / 2]});
    } else {
      hatch('ceiling', cx - 150 * k, cx + 150 * k, top, false);
      let y0 = top, y1 = top;                       // the running top of the next wire: unloaded and loaded
      anchors.top = [cx, top];
      ws.forEach((w, i) => {
        const h0 = w.L * sc, h1 = h0 + dL[i] * ex * sc, x = cx - wpx[i] / 2;
        anchors[ws.length > 1 ? `wire${i + 1}` : 'wire'] = [cx, y1 + h1 / 2];
        anchors.bottom = [cx, y1 + h1];
        const thin = lateral ? wpx[i] * (1 - Math.min(0.4, (s.sigma ?? MATERIALS[(s.material ?? '').toLowerCase()]?.sigma ?? 0.3) * stretch)) : wpx[i];
        rect(`wire${i}`, x, y0, wpx[i], h0, {fill: ['cool', 'figure', 'good'][i], stroke: 'ink', width: 2 * k},
          {keys: {y: key(t0, t1, y0, y1), h: key(t0, t1, h0, h1), ...(lateral ? {x: key(t0, t1, x, cx - thin / 2), w: key(t0, t1, wpx[i], thin)} : {})}});
        props.push({id: `Ldim${i}`, type: 'line', x1: cx - 70 * k, y1: y0, x2: cx - 70 * k, y2: y0 + h0, style: {stroke: 'muted', width: 2 * k}, layer: 2} as Prop);
        label(`lL${i}`, cx - 82 * k, y0 + h0 / 2, ws.length > 1 ? `L${'₁₂₃'[i]}` : 'L', {align: 'end', style: {fill: 'muted'}});
        if (w.name) label(`name-${i}`, cx + Math.max(...wpx) / 2 + 16 * k, y0 + h0 / 2, w.name, {style: {fill: ['cool', 'figure', 'good'][i]}, keys: {y: key(t0, t1, y0 + h0 / 2, y1 + h1 / 2)}});
        y0 += h0; y1 += h1;
        if (i === ws.length - 1)                     // the unloaded bottom, dashed; ΔL is the gap that opens below it
          props.push({id: 'was', type: 'line', x1: cx + 30 * k, y1: y0, x2: cx + 150 * k, y2: y0, style: {stroke: 'muted', width: 2 * k, dash: [8 * k, 6 * k]}, layer: 2} as Prop,
            {id: 'dLdim', type: 'line', x1: cx + 140 * k, y1: y0, x2: cx + 140 * k, y2: y0, keys: {y2: key(t0, t1, y0, y1)}, style: {stroke: 'bad', width: 3 * k}, layer: 4} as Prop);
        if (i === ws.length - 1) label('ldL', cx + 156 * k, (y0 + y1) / 2 + 10 * k, ws.length > 1 ? 'total ΔL' : 'ΔL', {show: [t1 - 0.6, 1e9], style: {fill: 'bad'}});
        if (blocks[i]) {
          const kg = w.load ?? s.load!;
          anchors[ws.length > 1 ? `load${i + 1}` : 'load'] = [cx, y1 + blockH / 2];
          rect(`load${i}`, cx - 55 * k, y0, 110 * k, blockH, {fill: 'faint', stroke: 'ink', width: 2 * k}, {show: [lead + 0.4, 1e9], fade: 0.3, keys: {y: key(t0, t1, y0, y1)}});
          label(`lload${i}`, cx, y0 + blockH / 2 + 9 * k, `${f(kg)} kg`, {align: 'middle', show: [lead + 0.4, 1e9], keys: {y: key(t0, t1, y0 + blockH / 2 + 9 * k, y1 + blockH / 2 + 9 * k)}});
          y0 += blockH; y1 += blockH;
        }
      });
      if (s.F !== undefined || s.dL !== undefined || blocks[ws.length - 1]) {
        props.push({id: 'F', type: 'arrow', x1: cx, y1: y0 + 6 * k, x2: cx, y2: y0 + arrowL, head: 16 * k, style: {stroke: 'accent', width: 5 * k}, show: [lead + 0.4, 1e9], fade: 0.3, layer: 5,
          keys: {y1: key(t0, t1, y0 + 6 * k, y1 + 6 * k), y2: key(t0, t1, y0 + arrowL, y1 + arrowL)}} as Prop);
        label('lF', cx + 16 * k, y0 + arrowL - 10 * k, blocks[ws.length - 1] ? 'F = mg' : 'F', {style: {fill: 'accent'}, show: [lead + 0.4, 1e9], keys: {y: key(t0, t1, y0 + arrowL - 10 * k, y1 + arrowL - 10 * k)}});
      }
      if (lateral) label('ld', cx, top + 40 * k, 'd', {align: 'middle', style: {fill: 'paper'}, layer: 7});
    }
    const w = ws[0], stress = T[0] / w.A, strain = dL[0] / w.L;
    if (ws.length === 1) {
      line('l1', ill ? 'Stress: the restoring force per unit area, F / A' : `Stress = F / A = ${num(stress)} Pa`, lead + 0.4, {style: {fill: 'accent'}});
      line('l2', ill ? (comp ? 'Strain: the shortening per unit length, ΔL / L' : 'Strain: the stretch per unit length, ΔL / L') : `Strain = ΔL / L = ${num(strain)}`, t0 + 0.6, {style: {fill: 'bad'}});
      line('l3', ill ? "Young's modulus Y = stress / strain" : `ΔL = FL / AY = ${mm(dL[0])}${w.name ? ` (${w.name}, Y = ${num(w.Y)} Pa)` : ''}`, t1, {weight: 700});
    } else {
      if (s.dL !== undefined) line('l0', ill ? 'The load that gives the measured stretch' : `Load F = ΔL / Σ(L / AY) = ${f(Fb, 1)} N`, lead + 0.4, {weight: 700, style: {fill: 'accent'}});
      ws.forEach((v, i) => line(`w${i}`, ill ? `${v.name ?? 'wire'}: holds every load below it` : `${v.name ?? `wire ${i + 1}`}: T = ${f(T[i], 1)} N, ΔL = ${mm(dL[i])}`, t0 + 0.4 * i, {style: {fill: ['cool', 'figure', 'good'][i]}}));
      line('lt', ill ? 'The stretches add up' : `Total ΔL = ${mm(total)}`, t1, {weight: 700});
      facts.push(...(s.dL !== undefined ? [`load solved from the measured elongation: F = ${f(Fb, 1)} N`] : []), `total elongation ${mm(total)}`);
    }
    if (lateral) {
      const sg = s.sigma ?? MATERIALS[(s.material ?? '').toLowerCase()]?.sigma ?? 0.3;
      line('l4', ill ? "It also grows thinner: lateral strain Δd / d; Poisson's ratio = (Δd / d) / (ΔL / L)" : `Thinner too: Δd / d = σ ΔL / L = ${num(sg * strain)} (Poisson's ratio σ = ${f(sg)})`, t1 + 0.4, {style: {fill: 'cool'}});
      facts.push(`Poisson's ratio ${f(sg)}${s.sigma === undefined && !MATERIALS[(s.material ?? '').toLowerCase()]?.sigma ? ' (typical)' : ''}`, `lateral strain Δd/d = ${num(sg * strain)}`,
        ...(isNum(s.d) ? [`the diameter shrinks by ${mm(sg * strain * s.d)}`] : []));
    }
    if (show.has('energy')) {
      const U = ws.reduce((a, v, i) => a + T[i] * dL[i] / 2, 0);
      line('l5', ill ? 'The work done is stored: U = ½ F ΔL = ½ × stress × strain × volume' : `Energy stored U = ½ F ΔL = ${num(U)} J`, t1 + 0.8, {style: {fill: 'good'}});
      facts.push(`elastic potential energy stored ${num(U)} J (u = ½ σ ε = ${num(stress * strain / 2)} J/m³)`);
    }
    larger();
    return scene(s, W, H, t1 + 2.4, plane, props, [], {verb: 'elastic', facts, dL, T, ...(s.dL !== undefined ? {F: Fb} : {}), ...pin(ex * sc, `tension`)});
  }

  if (s.kind === 'shear') {
    const L = s.L!, w = s.w ?? L, F = force(s)!, A = s.A!, G = modulus(s, 'G') ?? 3e10;
    const dx = F * L / (A * G), theta = dx / L;
    const hpx = Math.min(0.62 * bh, 0.5 * bw * L / w), wpx = hpx * w / L, D = s.deform_scale ? s.deform_scale * dx : 0.22 * hpx;
    const base = by1 - 40 * k, x0 = bx0 + 0.18 * bw, top = base - hpx;
    hatch('ground', x0 - 40 * k, x0 + wpx + 60 * k, base, true);
    props.push({id: 'was', type: 'rect', x: x0, y: top, w: wpx, h: hpx, style: {stroke: 'muted', width: 2 * k, dash: [8 * k, 6 * k]}, layer: 2} as Prop);
    // the block as a lattice: each line keeps its base and slides by its height's share of Δx
    for (let i = 0; i <= 4; i++) {
      const x = x0 + wpx * i / 4, edge = i === 0 || i === 4;
      props.push({id: `v${i}`, type: 'line', x1: x, y1: base, x2: x, y2: top, keys: {x2: key(t0, t1, x, x + D)}, style: {stroke: edge ? 'ink' : 'cool', width: (edge ? 4 : 2) * k}, layer: 3} as Prop);
    }
    for (let j = 1; j <= 4; j++) {
      const y = base - hpx * j / 4, edge = j === 4;
      props.push({id: `h${j}`, type: 'line', x1: x0, y1: y, x2: x0 + wpx, y2: y, keys: {x1: key(t0, t1, x0, x0 + D * j / 4), x2: key(t0, t1, x0 + wpx, x0 + wpx + D * j / 4)},
        style: {stroke: edge ? 'ink' : 'cool', width: (edge ? 4 : 2) * k}, layer: 3} as Prop);
    }
    const ax = x0 + wpx + 12 * k;
    props.push({id: 'F', type: 'arrow', x1: ax, y1: top, x2: ax + 120 * k, y2: top, head: 16 * k, keys: {x1: key(t0, t1, ax, ax + D), x2: key(t0, t1, ax + 120 * k, ax + 120 * k + D)},
      style: {stroke: 'accent', width: 5 * k}, show: [lead + 0.4, 1e9], fade: 0.3, layer: 5} as Prop,
    {id: 'Fb', type: 'arrow', x1: x0 + wpx, y1: base + 30 * k, x2: x0 + wpx - 120 * k, y2: base + 30 * k, head: 16 * k, style: {stroke: 'accent', width: 4 * k, opacity: 0.8}, show: [lead + 0.4, 1e9], fade: 0.3, layer: 5} as Prop);
    label('lF', ax + 60 * k, top - 16 * k, 'F', {align: 'middle', style: {fill: 'accent'}, show: [lead + 0.4, 1e9], keys: {x: key(t0, t1, ax + 60 * k, ax + 60 * k + D)}});
    props.push({id: 'Ldim', type: 'line', x1: x0 - 30 * k, y1: base, x2: x0 - 30 * k, y2: top, style: {stroke: 'muted', width: 2 * k}, layer: 2} as Prop);
    label('lL', x0 - 42 * k, base - hpx / 2, 'L', {align: 'end', style: {fill: 'muted'}});
    props.push({id: 'dx', type: 'line', x1: x0, y1: top - 26 * k, x2: x0 + D, y2: top - 26 * k, style: {stroke: 'bad', width: 4 * k}, show: [t1, 1e9], fade: 0.3, layer: 4} as Prop);
    label('ldx', x0 + D / 2, top - 40 * k, 'Δx', {align: 'middle', style: {fill: 'bad'}, show: [t1, 1e9]});
    const th = Math.atan2(D, hpx), arc: P2[] = Array.from({length: 13}, (_, i) => { const a = -Math.PI / 2 + th * i / 12; return [x0 + 90 * k * Math.cos(a), base + 90 * k * Math.sin(a)]; });
    props.push({id: 'arc', type: 'polyline', points: arc, style: {stroke: 'good', width: 3 * k}, show: [t1, 1e9], fade: 0.3, layer: 4} as Prop);
    label('ltheta', x0 + 22 * k, base - 104 * k, 'θ', {style: {fill: 'good'}, show: [t1, 1e9]});
    line('l1', ill ? 'Shearing stress: the tangential force per unit area, F / A' : `Shearing stress F / A = ${num(F / A)} Pa`, lead + 0.4, {style: {fill: 'accent'}});
    line('l2', ill ? 'The top face slides by Δx; the base is held' : `Δx = FL / (AG) = ${mm(dx)}`, t0 + 0.6, {style: {fill: 'bad'}});
    line('l3', ill ? 'Shearing strain = Δx / L = tan θ ≈ θ' : `Shearing strain Δx / L = tan θ ≈ θ = ${num(theta)} rad`, t1, {style: {fill: 'good'}});
    line('l4', ill ? 'Shear modulus G = (F / A) / θ' : `G = (F / A) / θ = ${num(G)} Pa${s.material ? ` (${s.material})` : ''}`, t1 + 0.4, {weight: 700});
    larger();
    facts.push(`shearing stress F/A = ${num(F / A)} Pa`, `displacement of the top face Δx = ${mm(dx)}`, `shearing strain θ = ${num(theta)} rad (${num(theta * 180 / Math.PI)}°)`, `shear modulus G = ${num(G)} Pa`);
    Object.assign(anchors, {top_left: [x0 + D, top], top_right: [x0 + wpx + D, top], top_face: [x0 + wpx / 2 + D, top], base_left: [x0, base],
      base_right: [x0 + wpx, base], base: [x0 + wpx / 2, base], block: [x0 + wpx / 2 + D / 2, base - hpx / 2]});
    return scene(s, W, H, t1 + 2.4, plane, props, [], {verb: 'elastic', facts, dx, theta, ...pin(D / dx, 'shear')});
  }

  if (s.kind === 'hydraulic') {
    const B = modulus(s, 'B') ?? 1e10, p = s.p ?? 1000 * g * s.depth!, strain = p / B;
    const cx = bx0 + bw / 2, cy = by0 + bh / 2, r0 = 0.3 * Math.min(bw, bh), r1 = r0 * 0.86, cube = s.shape === 'cube';
    rect('fluid', bx0 + 10 * k, by0 + 10 * k, bw - 20 * k, bh - 20 * k, {fill: 'cool', opacity: 0.16}, {layer: 1});
    label('lfluid', bx0 + 30 * k, by0 + 50 * k, s.depth !== undefined ? 'water, deep down' : 'fluid at pressure p', {style: {fill: 'cool'}});
    if (cube) {
      props.push({id: 'was', type: 'rect', x: cx - r0, y: cy - r0, w: 2 * r0, h: 2 * r0, style: {stroke: 'muted', width: 2 * k, dash: [8 * k, 6 * k]}, layer: 2} as Prop);
      rect('body', cx - r0, cy - r0, 2 * r0, 2 * r0, {fill: 'figure', stroke: 'ink', width: 3 * k}, {keys: {x: key(t0, t1, cx - r0, cx - r1), y: key(t0, t1, cy - r0, cy - r1), w: key(t0, t1, 2 * r0, 2 * r1), h: key(t0, t1, 2 * r0, 2 * r1)}});
    } else {
      props.push({id: 'was', type: 'circle', x: cx, y: cy, r: r0, style: {stroke: 'muted', width: 2 * k, dash: [8 * k, 6 * k]}, layer: 2} as Prop,
        {id: 'body', type: 'circle', x: cx, y: cy, r: r0, keys: {r: key(t0, t1, r0, r1)}, style: {fill: 'figure', stroke: 'ink', width: 3 * k}, layer: 3} as Prop);
    }
    // pushes along the normal at every point of the surface, moving in with it
    const dirs: P2[] = cube ? [-0.5, 0, 0.5].flatMap(q => [[q, -1], [q, 1], [-1, q], [1, q]] as P2[]) : Array.from({length: 12}, (_, i) => [Math.cos(i * Math.PI / 6), Math.sin(i * Math.PI / 6)] as P2);
    dirs.forEach(([ux, uy], i) => {
      const n: P2 = cube ? (Math.abs(ux) === 1 ? [ux, 0] : [0, uy]) : [ux, uy];
      const at = (r: number): P2 => (cube ? [cx + ux * r, cy + uy * r] : [cx + ux * r, cy + uy * r]);
      const [a0, a1] = [at(r0), at(r1)];
      props.push({id: `push${i}`, type: 'arrow', x1: a0[0] + n[0] * 80 * k, y1: a0[1] + n[1] * 80 * k, x2: a0[0] + n[0] * 8 * k, y2: a0[1] + n[1] * 8 * k, head: 14 * k,
        keys: {x1: key(t0, t1, a0[0] + n[0] * 80 * k, a1[0] + n[0] * 80 * k), y1: key(t0, t1, a0[1] + n[1] * 80 * k, a1[1] + n[1] * 80 * k),
          x2: key(t0, t1, a0[0] + n[0] * 8 * k, a1[0] + n[0] * 8 * k), y2: key(t0, t1, a0[1] + n[1] * 8 * k, a1[1] + n[1] * 8 * k)},
        style: {stroke: 'accent', width: 4 * k}, show: [lead + 0.4, 1e9], fade: 0.3, layer: 4} as Prop);
    });
    label('lV', cx, cy + 9 * k, 'V', {align: 'middle', style: {fill: 'paper'}, layer: 7});
    line('l1', ill ? 'The fluid presses equally, at right angles to every part of the surface' : `Hydraulic stress = pressure p = ${num(p)} Pa${s.depth !== undefined ? ` (ρgh at ${f(s.depth)} m)` : ''}`, lead + 0.4, {style: {fill: 'accent'}});
    line('l2', ill ? 'The volume shrinks, the shape stays: volume strain ΔV / V' : `Volume strain ΔV / V = p / B = ${num(strain)}`, t0 + 0.6, {style: {fill: 'bad'}});
    if (isNum(s.V) && !ill) line('l3', `ΔV = ${num(s.V * strain)} m³ of ${num(s.V)} m³`, t1, {style: {fill: 'bad'}});
    line('l4', ill ? 'Bulk modulus B = p / (ΔV / V); compressibility k is its reciprocal' : `B = ${num(B)} Pa${s.material ? ` (${s.material})` : ''}, compressibility k = 1 / B = ${num(1 / B)} Pa⁻¹`, t1 + 0.4, {weight: 700});
    facts.push(`pressure p = ${num(p)} Pa`, `volume strain ΔV/V = ${num(strain)} (${num(100 * strain)} %)`, `bulk modulus B = ${num(B)} Pa, compressibility ${num(1 / B)} Pa⁻¹`,
      ...(isNum(s.V) ? [`volume change ΔV = ${num(s.V * strain)} m³`] : []));
    if (s.compare?.length) {
      const first = s.compare[0].toLowerCase(), Bf = MATERIALS[first].B!;
      s.compare.forEach((m, i) => {
        const Bm = MATERIALS[m.toLowerCase()].B!;
        line(`c${i}`, ill ? `${m}: ${i === 0 ? 'the least compressible of these' : Bm < Bf / 1e3 ? 'far more compressible' : Bm < Bf ? 'more compressible' : 'less compressible'}`
          : `${m}: k = ${num(1 / Bm)} Pa⁻¹${i ? ` (${times(Bf / Bm)} ${first}'s)` : ''}`, t1 + 0.9 + 0.4 * i, {style: {fill: ['cool', 'figure', 'good', 'accent'][i]}});
        facts.push(`${m}: B = ${num(Bm)} Pa, k = ${num(1 / Bm)} Pa⁻¹`);
      });
    }
    larger();
    Object.assign(anchors, {body: [cx, cy], surface: [cx, cy - r1], fluid: [bx0 + 30 * k, by0 + 80 * k]});
    return scene(s, W, H, t1 + 2.6 + 0.4 * (s.compare?.length ?? 0), plane, props, [], {verb: 'elastic', facts, strain, ...pin()});
  }

  if (s.kind === 'curve') {
    const rubber = s.curve === 'rubber', unload = show.has('unload') && !rubber;
    // the graph on the left of the drawing, the wire it describes on the right; the curve's shape is the book's,
    // not to scale (a metal's straight part ends below 1 % strain)
    const gb: [number, number, number, number] = [bx0 + 50 * k, by0 + 60 * k, bx0 + 0.68 * bw, by1 - 40 * k];
    const gp: Plane = {id: 'g', x: [0, 1], y: [0, 1.12], box: gb};
    props.push({id: 'axes', type: 'axes', plane: 'g', grid: false, numbers: false, names: ['strain', 'stress'], size: 22 * k} as Prop);
    type Pt = {x: number; y: number};
    const O = {x: 0, y: 0}, A = {x: 0.08, y: 0.55}, Bp = {x: 0.11, y: 0.62}, C = {x: 0.16, y: 0.63}, D = {x: 0.7, y: 0.95}, E = {x: 0.88, y: 0.82};
    const seg = (n: number, fn: (u: number) => Pt) => Array.from({length: n + 1}, (_, i) => fn(i / n));
    const metal: Pt[][] = [seg(8, u => ({x: A.x * u, y: A.y * u})),
      seg(8, u => ({x: A.x + (Bp.x - A.x) * u, y: A.y + (Bp.y - A.y) * (1 - (1 - u) ** 2)})),
      seg(8, u => ({x: Bp.x + (C.x - Bp.x) * u, y: Bp.y + (C.y - Bp.y) * u})),
      seg(30, u => ({x: C.x + (D.x - C.x) * u, y: C.y + (D.y - C.y) * (1 - (1 - u) ** 2)})),
      seg(14, u => ({x: D.x + (E.x - D.x) * u, y: D.y - (D.y - E.y) * u * u}))];
    const rub = (x: number) => 0.15 * x + 1.05 * x ** 3;
    let path: Pt[] = [], times: number[] = [];
    const add = (pts: Pt[], dur: number) => { const t = times.length ? times[times.length - 1] : lead; pts.forEach((q, i) => { if (i || !path.length) { path.push(q); times.push(t + dur * i / (pts.length - 1)); } }); };
    let set = 0;
    if (rubber) { add(seg(40, u => ({x: u, y: rub(u)})), 4); add(seg(40, u => ({x: 1 - u, y: rub(1 - u)})), 3); }
    else {
      add(metal[0], 1.6); add(metal[1], 0.7); add(metal[2], 0.6);
      if (unload) {
        const U = metal[3][12]; add(metal[3].slice(0, 13), 1.6);
        set = U.x - U.y * A.x / A.y;                         // back down parallel to OA
        add(seg(16, u => ({x: U.x + (set - U.x) * u, y: U.y * (1 - u)})), 1.6);
      } else { add(metal[3], 2.6); add(metal[4], 1.2); }
    }
    const end = times[times.length - 1];
    const whenAt = (q: Pt) => times[path.findIndex(p => p.x === q.x && p.y === q.y)] ?? lead;
    // the whole curve faint, then the traced part bright behind the moving point
    const full = rubber ? seg(40, u => ({x: u, y: rub(u)})) : metal.flat();
    props.push({id: 'ghost', type: 'polyline', plane: 'g', points: full.map(q => [q.x, q.y]), style: {stroke: 'muted', width: 2 * k, dash: [6 * k, 6 * k], opacity: 0.6}, layer: 1} as Prop);
    const dot = {id: 'd-pt', rig: 'dot', at: toScene(gp, [0, 0]), opacity: [[0, 0]], layer: 5, blink: [],
      base: path.map((q, i) => ({t: times[i], at: toScene(gp, [q.x, q.y]), ...(i ? {ease: 'linear' as const} : {})}))};
    props.push({id: 'trace', type: 'trail', of: {actor: 'd-pt', joint: 'p'}, t0: lead, step: 0.03, style: {stroke: 'cool', width: 5 * k}, layer: 3} as Prop,
      {id: 'pt', type: 'circle', x: 0, y: 0, r: 10 * k, anchor: {actor: 'd-pt', joint: 'p'}, style: {fill: 'accent', stroke: 'ink', width: 2 * k}, layer: 6} as Prop);
    const mark = (id: string, q: Pt, name: string, note: string, when: number, dx = 14, dy = -14, align: 'start' | 'end' = 'start') => {
      const [x, y] = toScene(gp, [q.x, q.y]);
      props.push({id, type: 'circle', x, y, r: 7 * k, style: {fill: 'ink'}, layer: 4, show: [when, 1e9], fade: 0.3} as Prop);
      label(`l${id}`, x + dx * k, y + dy * k, note ? `${name} ${note}` : name, {align, show: [when, 1e9], style: {fill: 'ink'}});
    };
    // the wire the curve describes: it stretches as the strain grows (drawn far larger than real) and breaks at E
    const wx = bx0 + (narrow ? 0.86 : 0.84) * bw, wtop = by0 + 40 * k, wl = 0.36 * bh, grow = 0.4 * bh;
    const len = (x: number) => wl + grow * x;
    hatch('ceiling', wx - 50 * k, wx + 50 * k, wtop, false);
    const wkeys = path.map((q, i) => [times[i], len(q.x), 'linear'] as [number, number, 'linear']);
    rect('wire', wx - 9 * k, wtop, 18 * k, wl, {fill: 'cool', stroke: 'ink', width: 2 * k}, {keys: {h: wkeys}, ...(rubber || unload ? {} : {show: [0, end] as [number, number]})});
    rect('wload', wx - 30 * k, wtop + wl, 60 * k, 40 * k, {fill: 'faint', stroke: 'ink', width: 2 * k}, {keys: {y: wkeys.map(([t, v]) => [t, wtop + v, 'linear'] as [number, number, 'linear'])}, ...(rubber || unload ? {} : {show: [0, end] as [number, number]})});
    if (!rubber && !unload) {                        // broken: the top part stays, the lower part and the load fall away
      const L = len(E.x), cut = 0.55 * L;
      rect('wtop', wx - 9 * k, wtop, 18 * k, cut, {fill: 'cool', stroke: 'ink', width: 2 * k}, {show: [end, 1e9]});
      rect('wbot', wx - 9 * k, wtop + cut + 16 * k, 18 * k, L - cut - 16 * k, {fill: 'cool', stroke: 'ink', width: 2 * k}, {show: [end, end + 0.9], fade: 0.3, keys: {y: [[end, wtop + cut + 16 * k], [end + 0.9, wtop + cut + 120 * k, 'in']]}});
      label('lbreak', wx - 24 * k, wtop + cut + 12 * k, 'breaks', {align: 'end', style: {fill: 'bad'}, show: [end, 1e9]});
    }
    if (rubber) {
      line('l1', 'Rubber-like: stress and strain are never proportional, no straight part', lead + 0.4, {style: {fill: 'cool'}});
      line('l2', 'Stretched to many times its length, it still returns: elastic, but Hooke\'s law does not hold', lead + 2.5, {weight: 700});
      line('l3', 'Unloaded, it comes back along the same curve, to zero strain', lead + 4.5, {style: {fill: 'good'}});
      facts.push('elastomer (rubber, the aorta\'s elastic tissue): no region where stress ∝ strain; it returns to its length when unloaded');
    } else {
      mark('mA', A, 'A', 'proportional limit', whenAt(A), 18, 34);
      mark('mB', Bp, 'B', 'yield point', whenAt(Bp), 16, 24);
      if (!unload) { mark('mD', D, 'D', 'ultimate strength', whenAt(D), -10, 44, 'end'); mark('mE', E, 'E', 'fracture', whenAt(E), 14, 30); }
      const Y = modulus(s, 'Y');
      line('l1', ill || Y === undefined ? "O to A: stress ∝ strain (Hooke's law); the slope is Young's modulus" : `O to A: stress ∝ strain; the slope is Y = ${num(Y)} Pa${s.material ? ` (${s.material})` : ''}`, lead + 0.4, {style: {fill: 'cool'}});
      line('l2', 'A to B: not proportional, but it still springs back when unloaded', whenAt(A));
      line('l3', 'Past the yield point B, it flows: plastic deformation', whenAt(Bp) + 0.3, {style: {fill: 'bad'}});
      if (unload) line('l4', 'Unloaded past B, it comes back along a line parallel to OA and keeps a permanent set', whenAt(path[path.length - 17]), {weight: 700, style: {fill: 'accent'}});
      else line('l4', 'D: the ultimate tensile strength; past it the wire thins and breaks at E', whenAt(D), {weight: 700, style: {fill: 'accent'}});
      if (unload) {
        const [x, y] = toScene(gp, [set, 0]);
        props.push({id: 'mset', type: 'circle', x, y, r: 8 * k, style: {fill: 'bad'}, layer: 4, show: [end, 1e9], fade: 0.3} as Prop);
        // under the strain axis, where the set is read: above it, it sat on the plastic region's label (keph2-01 C3)
        label('lset', x, y + 34 * k, 'permanent set', {align: 'middle', style: {fill: 'bad'}, show: [end, 1e9]});
        anchors.set = [x, y];
      }
      facts.push('O to A: stress proportional to strain (Hooke\'s law); A: proportional limit', 'B: yield point (elastic limit); past it, plastic deformation',
        ...(unload ? ['unloaded beyond B, the wire returns along a line parallel to OA and keeps a permanent set'] : ['D: ultimate tensile strength; E: fracture point']),
        ...(Y !== undefined ? [`Young's modulus (slope of OA) ${num(Y)} Pa`] : []));
    }
    if (show.has('regions') && !rubber) {
      const [ex0, ey0] = toScene(gp, [0, 1.08]), [ex1, ey1] = toScene(gp, [Bp.x, 0]), [qx] = toScene(gp, [unload ? set + 0.25 : E.x, 0]);
      rect('elastic', ex0, ey0, ex1 - ex0, ey1 - ey0, {fill: 'good', opacity: 0.14}, {layer: 1, show: [whenAt(Bp), 1e9], fade: 0.4});
      rect('plastic', ex1, ey0, qx - ex1, ey1 - ey0, {fill: 'bad', opacity: 0.1}, {layer: 1, show: [whenAt(Bp) + 0.4, 1e9], fade: 0.4});
      label('lelastic', ex0 + 8 * k, ey0 + 28 * k, 'elastic region', {style: {fill: 'good'}, show: [whenAt(Bp), 1e9], size: 22 * k});
      // at the top of its band, after the elastic label: at the bottom the unloading line came down through it (keph2-01 C3)
      label('lplastic', Math.max(ex1 + 16 * k, ex0 + 8 * k + 'elastic region'.length * 22 * k * 0.56 + 28 * k), ey0 + 28 * k, 'plastic region', {style: {fill: 'bad'}, show: [whenAt(Bp) + 0.4, 1e9], size: 22 * k});
    }
    if (show.has('energy')) {
      const top = rubber ? {x: 0.6, y: rub(0.6)} : A;
      const under = rubber ? [[0, 0], ...seg(20, u => [0.6 * u, rub(0.6 * u)] as never), [0.6, 0]] : [[0, 0], [A.x, A.y], [A.x, 0]];
      props.push({id: 'energy', type: 'polyline', plane: 'g', points: under, closed: true, style: {fill: 'good', stroke: 'good', width: 2 * k, opacity: 0.45}, show: [rubber ? lead + 2.4 : whenAt(A), 1e9], fade: 0.4, layer: 2} as Prop);
      line('l6', rubber ? 'The area under the curve is the energy stored per unit volume' : 'The area under the curve is the energy stored per unit volume: u = ½ σ ε on the straight part', rubber ? lead + 2.4 : whenAt(A) + 0.2, {style: {fill: 'good'}});
      void top;
    }
    line('lnote', rubber ? 'The shape is the book\'s, not to scale' : (ill ? 'Not to scale: the straight part is really very short' : 'Not to scale: the straight part really ends below 1 % strain'), end + 0.2, {style: {fill: 'muted'}});
    if (!rubber) for (const [n, q] of Object.entries({O, A, B: Bp, C, D, E})) anchors[n] = toScene(gp, [q.x, q.y]);
    else Object.assign(anchors, {O: toScene(gp, [0, 0]), top: toScene(gp, [1, rub(1)])});
    anchors.wire = [wx, wtop + wl / 2];
    return scene(s, W, H, end + 2.2, gp, props, [dot as never], {verb: 'elastic', facts, ...(unload ? {set} : {}), ...pin(),
      labelled: rubber ? [] : ['A', 'B', ...(unload ? ['set'] : ['D', 'E'])]});
  }

  if (s.kind === 'beam') {
    const l = s.l!, b = s.b!, d = s.d!, F = force(s)!, Y = modulus(s, 'Y') ?? 1e11;
    const sag = (bb: number, dd: number) => F * l ** 3 / (4 * bb * dd ** 3 * Y);
    const rows: {b: number; d: number; y: number}[] = show.has('edge') ? [{b, d, y: by0 + 0.3 * bh}, {b: d, d: b, y: by0 + 0.76 * bh}] : [{b, d, y: by0 + 0.45 * bh}];
    const deltas = rows.map(r => sag(r.b, r.d)), big = Math.max(...deltas);
    const xl = bx0 + 0.2 * bw, xr = bx1 - 0.06 * bw, span = xr - xl, maxSag = (show.has('edge') ? 0.12 : 0.2) * bh, n = 24;
    const thick = (dd: number) => 10 * k + 28 * k * dd / Math.max(b, d);
    const shape = (u: number) => { const v = u <= 0.5 ? u : 1 - u; return 3 * v - 4 * v ** 3; };   // central load, both ends free to turn
    rows.forEach((r, ri) => {
      const ds = (s.deform_scale ?? maxSag / big) * deltas[ri], th = thick(r.d), y = r.y;
      for (const [i, x] of [[0, xl], [1, xr]] as const)
        props.push({id: `sup${ri}${i}`, type: 'polyline', points: [[x, y + th / 2], [x - 22 * k, y + th / 2 + 36 * k], [x + 22 * k, y + th / 2 + 36 * k]], closed: true, style: {fill: 'muted', stroke: 'ink', width: 2 * k}, layer: 2} as Prop);
      props.push({id: `was${ri}`, type: 'line', x1: xl, y1: y, x2: xr, y2: y, style: {stroke: 'muted', width: 2 * k, dash: [8 * k, 6 * k]}, layer: 1} as Prop);
      for (let i = 0; i < n; i++) {
        const u0 = i / n, u1 = (i + 1) / n;
        props.push({id: `b${ri}-${i}`, type: 'line', x1: xl + span * u0, y1: y, x2: xl + span * u1, y2: y, style: {stroke: ri ? 'figure' : 'cool', width: th, cap: 'round'}, layer: 3,
          keys: {y1: key(t0, t1, y, y + ds * shape(u0)), y2: key(t0, t1, y, y + ds * shape(u1))}} as Prop);
      }
      const cxm = xl + span / 2, sfx = ri ? '2' : '';
      Object.assign(anchors, {[`centre${sfx}`]: [cxm, y + ds], [`left${sfx}`]: [xl, y], [`right${sfx}`]: [xr, y], [`load${sfx}`]: [cxm, y + th / 2 + 52 * k + ds]});
      rect(`w${ri}`, cxm - 40 * k, y + th / 2 + 30 * k, 80 * k, 44 * k, {fill: 'faint', stroke: 'ink', width: 2 * k}, {show: [lead + 0.4, 1e9], fade: 0.3, keys: {y: key(t0, t1, y + th / 2 + 30 * k, y + th / 2 + 30 * k + ds)}});
      props.push({id: `hang${ri}`, type: 'line', x1: cxm, y1: y + th / 2, x2: cxm, y2: y + th / 2 + 30 * k, keys: {y1: key(t0, t1, y + th / 2, y + th / 2 + ds), y2: key(t0, t1, y + th / 2 + 30 * k, y + th / 2 + 30 * k + ds)}, style: {stroke: 'ink', width: 2 * k}, show: [lead + 0.4, 1e9], layer: 3} as Prop);
      label(`lW${ri}`, cxm + 50 * k, y + th / 2 + 62 * k, 'W', {show: [lead + 0.4, 1e9], keys: {y: key(t0, t1, y + th / 2 + 62 * k, y + th / 2 + 62 * k + ds)}});
      if (ds > th) label(`ld${ri}`, cxm + 90 * k, y + ds / 2 + 6 * k, 'δ', {style: {fill: 'bad'}, show: [t1, 1e9]});   // a barely bent beam hides it
      // the cross-section, breadth across and depth up
      const sb = 70 * k * r.b / Math.max(b, d), sd = 70 * k * r.d / Math.max(b, d), sx = bx0 + 0.02 * bw;
      rect(`sec${ri}`, sx, y - sd / 2, sb, sd, {fill: ri ? 'figure' : 'cool', stroke: 'ink', width: 2 * k});
      label(`lsec${ri}`, sx, y + Math.max(sd, 30 * k) / 2 + 30 * k, r.d > r.b ? 'on its edge' : r.d < r.b ? 'laid flat' : 'square', {size: 22 * k, style: {fill: 'muted'}});
    });
    line('l1', ill ? 'A beam on two supports, loaded at the centre, sags by δ ∝ W l³ / (b d³ Y)' : 'A beam on two supports, loaded at the centre, sags by δ = W l³ / (4 b d³ Y)', lead + 0.4, {weight: 700});
    if (!ill) line('l2', `l = ${f(l)} m, b = ${f(b * 100)} cm, d = ${f(d * 100)} cm, W = ${f(F, 0)} N: δ = ${mm(deltas[0])}`, t1, {style: {fill: 'cool'}});
    if (rows.length > 1) {
      const ratio = deltas[0] / deltas[1];
      line('l3', ill ? `Turned ${rows[1].d > rows[1].b ? 'on its edge, it sags far less' : 'flat, it sags far more'}: depth counts as d³, breadth only as b`
        : `Turned: δ = ${mm(deltas[1])}, ${ratio > 1 ? `${f(ratio, 1)} times less` : `${f(1 / ratio, 1)} times more`} (δ ∝ 1 / (b d³))`, t1 + 0.5, {style: {fill: 'figure'}});
    } else line('l3', 'Deeper sags far less (d³); a stiffer material (larger Y) and a shorter span help too', t1 + 0.5, {style: {fill: 'muted'}});
    larger();
    facts.push(...rows.map((r, i) => `b = ${f(r.b * 100)} cm, d = ${f(r.d * 100)} cm: sag δ = ${mm(deltas[i])}`), `load W = ${f(F, 1)} N, span l = ${f(l)} m, Y = ${num(Y)} Pa`);
    return scene(s, W, H, t1 + 2.4, plane, props, [], {verb: 'elastic', facts, deltas, ...pin(maxSag / big, 'beam')});
  }

  // recover: a spring and a lump of putty pulled the same way, then let go
  const [n1, n2] = s.names ?? ['spring', 'putty'], top = by0 + 30 * k, L0 = 0.36 * bh, L1 = 0.6 * bh, pull = 1.4, hold = 2.8, back = 3.8;
  const xs = [bx0 + 0.28 * bw, bx0 + 0.72 * bw];
  xs.forEach((x, i) => hatch(`ceil${i}`, x - 70 * k, x + 70 * k, top, false));
  // the spring: a zigzag whose corners move down with the stretch; the putty: a block that thins as it lengthens
  const coils = 10, zig = (j: number, L: number): P2 => [xs[0] + (j === 0 || j === coils * 2 ? 0 : (j % 2 ? 26 : -26) * k), top + 20 * k + (L - 40 * k) * j / (coils * 2)];
  for (let j = 0; j < coils * 2; j++) {
    const [a0, b0] = [zig(j, L0), zig(j + 1, L0)], [a1, b1] = [zig(j, L1), zig(j + 1, L1)];
    props.push({id: `z${j}`, type: 'line', x1: a0[0], y1: a0[1], x2: b0[0], y2: b0[1], style: {stroke: 'cool', width: 4 * k}, layer: 3,
      keys: {y1: [[pull, a0[1]], [hold, a1[1]], [hold + 0.2, a1[1]], [back, a0[1], 'outBack']], y2: [[pull, b0[1]], [hold, b1[1]], [hold + 0.2, b1[1]], [back, b0[1], 'outBack']]}} as Prop);
  }
  props.push({id: 'zt', type: 'line', x1: xs[0], y1: top, x2: xs[0], y2: top + 20 * k, style: {stroke: 'cool', width: 4 * k}, layer: 3} as Prop);
  const hookY = (L: number) => top + L - 20 * k;
  const springEnd: [number, number, string?][] = [[pull, hookY(L0)], [hold, hookY(L1)], [hold + 0.2, hookY(L1)], [back, hookY(L0), 'outBack']];
  props.push({id: 'zb', type: 'line', x1: xs[0], y1: hookY(L0), x2: xs[0], y2: hookY(L0) + 20 * k, style: {stroke: 'cool', width: 4 * k}, layer: 3,
    keys: {y1: springEnd as never, y2: springEnd.map(([t, v, e]) => [t, v + 20 * k, ...(e ? [e] : [])]) as never}} as Prop);
  const pw0 = 120 * k, pw1 = pw0 * Math.sqrt(L0 / L1);
  rect('putty', xs[1] - pw0 / 2, top, pw0, L0, {fill: 'figure', stroke: 'ink', width: 2 * k}, {r: 30 * k,
    keys: {h: [[pull, L0], [hold, L1]], x: [[pull, xs[1] - pw0 / 2], [hold, xs[1] - pw1 / 2]], w: [[pull, pw0], [hold, pw1]]}} as Partial<Prop>);
  for (const [i, x] of xs.entries()) {
    const yEnd = (L: number) => top + L + 4 * k;
    props.push({id: `pull${i}`, type: 'arrow', x1: x, y1: yEnd(L0), x2: x, y2: yEnd(L0) + 90 * k, head: 16 * k, style: {stroke: 'accent', width: 5 * k}, show: [pull - 0.3, hold], fade: 0.2, layer: 5,
      keys: {y1: [[pull, yEnd(L0)], [hold, yEnd(L1)]], y2: [[pull, yEnd(L0) + 90 * k], [hold, yEnd(L1) + 90 * k]]}} as Prop);
    label(`name-${i}`, x, by1 - 20 * k, i ? n2 : n1, {align: 'middle', style: {fill: i ? 'figure' : 'cool'}});
  }
  label('lpull', xs[1] + 20 * k, top + L0 + 60 * k, 'pulled', {style: {fill: 'accent'}, show: [pull - 0.3, hold], keys: {y: [[pull, top + L0 + 60 * k], [hold, top + L1 + 60 * k]]}});
  label('lback', xs[0], by1 - 64 * k, 'springs back', {align: 'middle', style: {fill: 'good'}, show: [back, 1e9]});
  label('lstays', xs[1], by1 - 64 * k, 'stays stretched', {align: 'middle', style: {fill: 'bad'}, show: [back, 1e9]});
  line('l1', 'A force changes a solid\'s shape and size', 0.3, {weight: 700});
  line('l2', `Elastic: the ${n1} regains its shape and size when the force is removed`, back, {style: {fill: 'good'}});
  line('l3', `Plastic: the ${n2} has no tendency to regain it, it stays deformed`, back + 0.5, {style: {fill: 'bad'}});
  line('l4', 'Real solids are elastic only up to a limit', back + 1.1, {style: {fill: 'muted'}});
  facts.push(`${n1}: elastic, returns to its length`, `${n2}: plastic, keeps its new shape`);
  Object.assign(anchors, {[`left`]: [xs[0], top + L0 / 2], right: [xs[1], top + L0 / 2]});
  return scene(s, W, H, back + 2.6, plane, props, [], {verb: 'elastic', facts, ...pin()});
}
