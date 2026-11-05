// pulley: pulleys as machines, computed (ICSE Class 10 Machines §3.8–3.11; 2026-11-05). A single fixed pulley (VR = 1:
// it only turns the effort's direction), a single movable pulley (VR = 2, the effort pulls up; with_fixed adds a fixed
// pulley above so it pulls down), a block and tackle of n pulleys (VR = n strands holding the lower block), and one
// fixed pulley with n movable pulleys each on its own string (VR = 2ⁿ). The effort end is pulled and the load rises,
// both drawn from one rope model, so the distance ratio on screen is the VR. A real machine: a measured effort, an
// efficiency, or friction in the bearings and the moving pulleys' own weight w; E = (L + w)/n for a frictionless tackle,
// MA = L/E, η = MA/VR, all computed here. (No verb drew a pulley system: icph1-03 had only the connector object.)
import type {Key} from '../keys.ts';
import type {Plane} from '../plane.ts';
import type {Prop, Scene} from '../scene.ts';
import {textWidth, wrapText} from '../svg.ts';
import {round} from '../vec.ts';
import {n2, panel, scene, text} from './calculus.ts';

const KINDS = ['fixed', 'movable', 'tackle', 'chain'] as const;
export type PulleySpec = {verb: 'pulley';
  /** fixed | movable | tackle (block and tackle) | chain (one fixed with n movable pulleys) */
  kind?: (typeof KINDS)[number];
  /** tackle: pulleys in both blocks (= strands holding the lower block), 2 to 6; chain: movable pulleys, 1 to 3 */
  n?: number;
  /** movable: a fixed pulley above turns the effort downward (VR stays 2) */
  with_fixed?: boolean;
  /** forces in `unit`: the load, a measured effort; the efficiency (0 to 1); friction: the bearings' share kept (0 to 1);
   * w: the weight of the movable pulley(s) or the lower block */
  load?: number; effort?: number; efficiency?: number; friction?: number; w?: number; unit?: 'N' | 'kgf'; g?: number;
  /** how far the load rises, m (for the distances and the work) */
  rise?: number;
  /** false: no T on the strands */
  tension?: boolean;
  seconds?: number; title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const f = (v: number, p = 2) => n2(round(v, 9), Math.abs(v) >= 100 ? 0 : p);
const pct = (v: number) => `${n2(round(v * 100, 9), 1)}%`;
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
const word = (n: number) => WORDS[n] ?? String(n);
const times = (n: number) => (n === 1 ? 'as far as' : n === 2 ? 'twice as far as' : `${word(n)} times as far as`);

/** VR from the arrangement; then the effort (measured, from an efficiency, or from w and friction), MA = L/E, η = MA/VR;
 * the tensions T (chain: T1…Tn) without friction. Without a load (and no effort with efficiency) only VR is known. */
export function pulleyNumbers(s: Pick<PulleySpec, 'kind' | 'n' | 'load' | 'effort' | 'efficiency' | 'friction' | 'w'>) {
  const kind = s.kind ?? 'fixed', n = s.n ?? (kind === 'tackle' ? 4 : kind === 'chain' ? 2 : 1);
  const VR = kind === 'fixed' ? 1 : kind === 'movable' ? 2 : kind === 'tackle' ? n : 2 ** n;
  const w = s.w ?? 0, fr = s.friction ?? 1;
  let L = s.load, E: number | undefined, E0: number | undefined, how: 'measured' | 'efficiency' | 'computed' | 'none';
  const T: number[] = [];
  if (s.effort !== undefined && s.efficiency !== undefined && L === undefined) { E = s.effort; L = s.efficiency * VR * E; how = 'efficiency'; }
  else if (s.effort !== undefined) { E = s.effort; how = 'measured'; }
  else if (s.efficiency !== undefined) { E = L === undefined ? undefined : L / (s.efficiency * VR); how = L === undefined ? 'none' : 'efficiency'; }
  else if (L === undefined) how = 'none';
  else {
    how = 'computed';
    if (kind === 'chain') { let t = L; for (let j = 0; j < n; j++) { t = (t + w) / 2; T.push(t); } E0 = t; }
    else { E0 = kind === 'fixed' ? L : (L + w) / VR; T.push(E0); }
    E = E0 / fr;
  }
  const MA = L !== undefined && E !== undefined ? L / E : undefined, eta = MA !== undefined ? MA / VR : undefined;
  return {kind, n, VR, L, E, E0, MA, eta, T, how, w, friction: fr};
}

export function pulleyErrors(s: PulleySpec): string[] {
  const e: string[] = [], kind = s.kind ?? 'fixed';
  if (!KINDS.includes(kind)) return ['pulley: kind is fixed (a single fixed pulley), movable (a single movable pulley), tackle (a block and tackle) or chain (one fixed pulley with n movable pulleys)'];
  if (s.n !== undefined) {
    if (kind === 'tackle' && !(Number.isInteger(s.n) && s.n >= 2 && s.n <= 6)) e.push('pulley: n is the number of pulleys in both blocks of the tackle (= the strands holding the lower block), a whole number 2 to 6');
    else if (kind === 'chain' && !(Number.isInteger(s.n) && s.n >= 1 && s.n <= 3)) e.push('pulley: n is the number of movable pulleys under the fixed one, a whole number 1 to 3 (VR = 2ⁿ)');
    else if (kind === 'fixed' || kind === 'movable') e.push('pulley: n belongs to kind tackle or chain; a single pulley has none');
  }
  if (s.with_fixed !== undefined && (typeof s.with_fixed !== 'boolean' || kind !== 'movable')) e.push('pulley: with_fixed (true or false) belongs to kind movable: a fixed pulley above to pull downward');
  for (const q of ['load', 'effort'] as const) if (s[q] !== undefined && !(isNum(s[q]) && s[q]! > 0)) e.push(`pulley: ${q} is a force in ${s.unit ?? 'N'}, above 0`);
  if (s.efficiency !== undefined && !(isNum(s.efficiency) && s.efficiency > 0 && s.efficiency <= 1))
    e.push(`pulley: efficiency is a fraction above 0 and at most 1${isNum(s.efficiency) && s.efficiency > 1 && s.efficiency <= 100 ? ` (${s.efficiency}% is ${s.efficiency / 100})` : ''}`);
  if (s.friction !== undefined && !(isNum(s.friction) && s.friction > 0 && s.friction <= 1)) e.push("pulley: friction is the share of the effort the bearings let through, above 0 and at most 1 (0.9: a tenth is lost); leave out for none");
  if (s.w !== undefined) {
    if (!(isNum(s.w) && s.w >= 0)) e.push(`pulley: w is the weight of the moving pulley(s) in ${s.unit ?? 'N'}, 0 or more`);
    else if (kind === 'fixed') e.push("pulley: a fixed pulley's weight is held by its support, not the effort: leave out w (use friction or effort for a real fixed pulley)");
  }
  if (s.unit !== undefined && !['N', 'kgf'].includes(s.unit)) e.push('pulley: unit is N (default) or kgf');
  if (s.g !== undefined && !(isNum(s.g) && s.g > 0)) e.push('pulley: g is in N/kg, above 0 (default 9.8; the book often takes 10)');
  if (s.rise !== undefined && !(isNum(s.rise) && s.rise > 0 && s.rise <= 1000)) e.push('pulley: rise is how far the load rises, m, above 0');
  if (s.tension !== undefined && typeof s.tension !== 'boolean') e.push('pulley: tension is true or false');
  if (s.seconds !== undefined && !(isNum(s.seconds) && s.seconds >= 8 && s.seconds <= 30)) e.push('pulley: seconds is the scene length, 8 to 30');
  const real = (['efficiency', 'friction', 'w'] as const).filter(q => s[q] !== undefined);
  if (s.effort !== undefined) {
    if (s.friction !== undefined || s.w !== undefined) e.push('pulley: a measured effort already includes friction and the pulleys\' weight: give effort, or friction and w (to compute it), not both');
    if (s.efficiency !== undefined && s.load !== undefined) e.push('pulley: load, effort and efficiency together over-fix the machine (η = L / (E × VR)): give two of them');
    if (s.load === undefined && s.efficiency === undefined) e.push('pulley: an effort needs the load it lifts (load), or an efficiency to find the load from');
  } else if (s.efficiency !== undefined && real.length > 1) e.push('pulley: give efficiency (the whole loss) or friction and w (its causes), not both');
  if (e.length) return e;
  const q = pulleyNumbers(s);
  if (q.how === 'measured' && q.eta! > 1 + 1e-9)
    e.push(`pulley: an effort of ${f(q.E!)} ${s.unit ?? 'N'} would give η = ${f(q.eta!)}, more than 1 (more work out than in): with VR ${q.VR} the effort is at least L / VR = ${f(q.L! / q.VR)} ${s.unit ?? 'N'}`);
  if ((s.friction !== undefined || s.w !== undefined) && s.load === undefined && !s.illustrative) e.push('pulley: friction and w need the load (load) to compute the effort from');
  return e;
}

// ---- the rope model, in design units (a box 840 high; ceiling at y = 0, y down) --------------------------------------
type Strand = {id: string; x: number; y1: number; y2: number; T?: string};
type Wheel = {id: string; x: number; y: number; r: number; over: boolean; fixed: boolean};
type Rig = {ropes: (Strand | Wheel)[][]; straps: [number, number, number, number][]; bars: [number, number, number][];
  load: [number, number]; effort: [number, number, 1 | -1]; tags: {id: string; text: string; x: number; y: number; align: 'start' | 'end'}[]; DE: number};
const isWheel = (p: Strand | Wheel): p is Wheel => 'r' in p;

/** The arrangement with the load raised by s (design units). DE is the effort end's full travel. */
function rig(kind: string, n: number, withFixed: boolean, s: number, VR: number): Rig {
  const straps: Rig['straps'] = [], bars: Rig['bars'] = [], tags: Rig['tags'] = [];
  if (kind === 'fixed') {
    const r = 48, P: Wheel = {id: 'P', x: 0, y: 110, r, over: true, fixed: true};
    straps.push([0, 0, 0, 110]);
    tags.push({id: 'tag-fixed', text: 'fixed pulley', x: r + 18, y: 110 - 0.8 * r, align: 'start'});
    return {ropes: [[{id: 'A', x: -r, y1: 640 - s, y2: 110, T: 'T'}, P, {id: 'B', x: r, y1: 110, y2: 300 + s, T: 'T'}]],
      straps, bars, load: [-r, 640 - s], effort: [r, 300 + s, 1], tags, DE: 320};
  }
  if (kind === 'movable') {
    const r = 45, M: Wheel = {id: 'M', x: 0, y: 600 - s, r, over: false, fixed: false};
    straps.push([0, M.y, 0, M.y + r + 30]);
    tags.push({id: 'tag-movable', text: 'movable pulley', x: -r - 22, y: M.y, align: 'end'});
    if (!withFixed) return {ropes: [[{id: 'A', x: -r, y1: 0, y2: M.y, T: 'T'}, M, {id: 'B', x: r, y1: M.y, y2: 480 - 2 * s, T: 'T'}]],
      straps, bars, load: [0, M.y + r + 30], effort: [r, 480 - 2 * s, -1], tags, DE: 240};
    const F: Wheel = {id: 'F', x: 2 * r, y: 110, r, over: true, fixed: true};
    straps.push([2 * r, 0, 2 * r, 110]);
    tags.push({id: 'tag-fixed', text: 'fixed pulley', x: 3 * r + 18, y: 110 - 0.8 * r, align: 'start'});
    return {ropes: [[{id: 'A', x: -r, y1: 0, y2: M.y, T: 'T'}, M, {id: 'B', x: r, y1: M.y, y2: 110, T: 'T'}, F, {id: 'C', x: 3 * r, y1: 110, y2: 300 + 2 * s, T: 'T'}]],
      straps, bars, load: [0, M.y + r + 30], effort: [3 * r, 300 + 2 * s, 1], tags, DE: 320};
  }
  if (kind === 'tackle') {
    // the pulleys in a row, upper and lower by turns, the last one upper: strands between neighbours are vertical; the
    // rope is tied to the lower block (n odd) or the upper (n even) at the left, and the effort leaves the last pulley
    const r = 34, yU = 140, yL = 440 - s, ws: Wheel[] = Array.from({length: n}, (_, i) => {
      const up = (n - 1 - i) % 2 === 0;
      return {id: `P${i}`, x: 2 * r * i, y: up ? yU : yL, r, over: up, fixed: up};
    });
    const ups = ws.filter(p => p.fixed).map(p => p.x), lows = ws.filter(p => !p.fixed).map(p => p.x), odd = n % 2 === 1;
    const ub: [number, number, number] = [Math.min(...ups, odd ? Infinity : -r) - 14, Math.max(...ups) + 14, yU - r - 26];
    const lb: [number, number, number] = [Math.min(...lows, odd ? -r : Infinity) - 14, Math.max(...lows) + 14, yL + r + 22];
    bars.push(ub, lb);
    straps.push([(ub[0] + ub[1]) / 2, 0, (ub[0] + ub[1]) / 2, ub[2]], ...ws.map(p => [p.x, p.fixed ? ub[2] : p.y, p.x, p.fixed ? p.y : lb[2]] as [number, number, number, number]));
    const cl = (lb[0] + lb[1]) / 2;
    straps.push([cl, lb[2], cl, lb[2] + 30]);
    const rope: (Strand | Wheel)[] = [{id: 'S0', x: -r, y1: odd ? lb[2] : ub[2], y2: ws[0].y, T: 'T'}];
    ws.forEach((p, i) => {
      rope.push(p);
      if (i < n - 1) rope.push({id: `S${i + 1}`, x: p.x + r, y1: p.y, y2: ws[i + 1].y, T: 'T'});
    });
    const xe = ws[n - 1].x + r;
    rope.push({id: 'SE', x: xe, y1: yU, y2: 420 + VR * s});
    tags.push({id: 'tag-fixed', text: 'fixed block', x: ub[0] - 16, y: ub[2], align: 'end'},
      {id: 'tag-movable', text: 'movable block', x: lb[0] - 16, y: lb[2], align: 'end'});
    return {ropes: [rope], straps, bars, load: [cl, lb[2] + 30], effort: [xe, 420 + VR * s, 1], tags, DE: 300};
  }
  // chain: movable pulleys P1…Pn up and to the right, each string tied to the ceiling and to the next pulley's hook; the
  // last string goes over the fixed pulley D
  const r = 48, ys = Array.from({length: n}, (_, j) => 360 + (n - 1 - j) * 150 - 2 ** j * s);
  const ws: Wheel[] = ys.map((y, j) => ({id: `P${j + 1}`, x: j * r, y, r, over: false, fixed: false}));
  const D: Wheel = {id: 'D', x: (n - 1) * r + 2 * r, y: 80, r, over: true, fixed: true};
  straps.push([D.x, 0, D.x, D.y], ...ws.map(p => [p.x, p.y, p.x, p.y + r + 16] as [number, number, number, number]));
  straps.push([0, ys[0] + r + 16, 0, ys[0] + r + 30]);
  const ropes: (Strand | Wheel)[][] = ws.map((p, j) => {
    const t = n > 1 ? `T${j + 1}` : 'T';
    const rope: (Strand | Wheel)[] = [{id: `a${j + 1}`, x: p.x - r, y1: 0, y2: p.y, T: t}, p];
    if (j < n - 1) rope.push({id: `b${j + 1}`, x: p.x + r, y1: p.y, y2: ws[j + 1].y + r + 16, T: t});
    else rope.push({id: `b${j + 1}`, x: p.x + r, y1: p.y, y2: D.y, T: t}, D, {id: 'c', x: D.x + r, y1: D.y, y2: 360 + VR * s, T: t});
    return rope;
  });
  tags.push({id: 'tag-fixed', text: 'fixed pulley', x: D.x + r + 18, y: D.y - 0.8 * r, align: 'start'},
    {id: 'tag-movable', text: n > 1 ? 'movable pulleys' : 'movable pulley', x: -r - 22, y: ys[0], align: 'end'});
  return {ropes, straps, bars, load: [0, ys[0] + r + 30], effort: [D.x + r, 360 + VR * s, 1], tags, DE: 280};
}

/** Each pulley's turn (radians, clockwise on screen) from the rope that has passed over it since s = 0. */
function spins(now: Rig, start: Rig): Map<string, number> {
  const out = new Map<string, number>(), len = (q: Strand) => Math.abs(q.y2 - q.y1);
  now.ropes.forEach((rope, i) => {
    let before = 0;
    rope.forEach((p, j) => {
      if (isWheel(p)) out.set(p.id, (p.over ? 1 : -1) * -before / p.r);   // rope moving away from the tie turns an
      else before += len(p) - len(start.ropes[i][j] as Strand);          // over-top pulley clockwise
    });
  });
  return out;
}

export function pulley(s: PulleySpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, narrow = W < 1.3 * H;
  const kind = s.kind ?? 'fixed', withFixed = !!s.with_fixed, u = s.unit ?? 'N', g = s.g ?? 9.8;
  const q = pulleyNumbers(s), {VR, n} = q, nums = q.L !== undefined;
  const top = narrow ? 0.1 * H + 44 * k : 0.155 * H, px = narrow ? 0.5 * W : 0.64 * W, pw = W - px - 40 * k;
  const titleSize = (narrow ? 36 : 44) * k, lineSize = (narrow ? 24 : 29) * k;
  const props: Prop[] = [], facts: string[] = [];
  let row = top;
  if (s.title) { props.push({id: 'title', type: 'text', x: px, y: top, size: titleSize, weight: 700, text: s.title, width: pw} as Prop); row += wrapText(s.title, titleSize, pw).length * 1.25 * titleSize + 20 * k; }
  const box: [number, number, number, number] = narrow ? [0.03 * W, top, 0.47 * W, 0.95 * H] : [0.06 * W, 0.14 * H, 0.6 * W, 0.95 * H];
  const plane: Plane = {id: 'p', x: [0, 1], y: [0, 1], box};

  // the scale: the whole drawing, labels and all, inside the box
  const R0 = rig(kind, n, withFixed, 0, VR), S = R0.DE / VR, R1 = rig(kind, n, withFixed, S, VR);
  const strands = (R: Rig) => R.ropes.flat().filter(p => !isWheel(p)) as Strand[];
  // text is drawn no smaller than 0.7 of its full size; in a narrow part a tag goes one word to a line
  const tagW = (t: string) => (narrow ? Math.max(...t.split(' ').map(w => textWidth(w, 28))) : textWidth(t, 28));
  const fit = (grow: number) => {
    const xs = [...strands(R0).map(p => p.x), ...R0.tags.map(t => t.x + (t.align === 'end' ? -1 : 1) * tagW(t.text) * grow),
      R0.load[0] - 60, R0.load[0] + 60, R0.effort[0] + 34 + 60 * grow];
    return [Math.min(...xs) - 20, Math.max(...xs) + 20];
  };
  const ymin = -24, ymax = 850, scaleOf = ([a, b]: number[]) => Math.min((box[3] - box[1]) / (ymax - ymin), (box[2] - box[0]) / (b - a));
  const Q0 = scaleOf(fit(1)), TQ = Math.max(Q0, 0.7 * k), [xmin, xmax] = fit(TQ / Q0), Q = scaleOf([xmin, xmax]), Tz = Math.max(Q, 0.7 * k);
  const ox = (box[0] + box[2]) / 2 - Q * (xmin + xmax) / 2, oy = box[1] - Q * ymin;
  const X = (x: number) => round(ox + Q * x, 2), Y = (y: number) => round(oy + Q * y, 2), z = (v: number) => round(Q * v, 2), zt = (v: number) => round(Tz * v, 2);
  const lead = 0.6, t0 = 2.2, t1 = t0 + 3.2, tension = s.tension !== false;

  // the ceiling, hatched
  props.push({id: 'ceiling', type: 'line', x1: X(xmin), y1: Y(0), x2: X(xmax), y2: Y(0), style: {stroke: 'muted', width: z(5)}} as Prop);
  for (let x = xmin + 10, i = 0; x < xmax - 6; x += 26, i++) props.push({id: `hatch${i}`, type: 'line', x1: X(x), y1: Y(0), x2: X(x + 16), y2: Y(-18), style: {stroke: 'muted', width: z(2.5)}} as Prop);

  // what moves: built at a raise s, then sampled into keys
  const LW = 120, LH = 90;
  const build = (R: Rig): Prop[] => {
    const out: Prop[] = [], spin = spins(R, R0);
    R.straps.forEach(([x1, y1, x2, y2], i) => out.push({id: `strap${i}`, type: 'line', x1: X(x1), y1: Y(y1), x2: X(x2), y2: Y(y2), style: {stroke: 'muted', width: z(6)}, layer: 1} as Prop));
    R.bars.forEach(([x1, x2, y], i) => out.push({id: `bar${i}`, type: 'rect', x: X(x1), y: Y(y - 9), w: z(x2 - x1), h: z(18), r: z(6), style: {fill: 'muted', stroke: 'ink', width: z(2)}, layer: 2} as Prop));
    for (const rope of R.ropes) for (const p of rope) {
      if (!isWheel(p)) {
        out.push({id: `rope-${p.id}`, type: 'line', x1: X(p.x), y1: Y(p.y1), x2: X(p.x), y2: Y(p.y2), style: {stroke: 'ink', width: z(4.5)}, layer: 3} as Prop);
        continue;
      }
      out.push({id: `wheel-${p.id}`, type: 'circle', x: X(p.x), y: Y(p.y), r: z(p.r - 3), style: {fill: 'faint', stroke: 'cool', width: z(5)}, layer: 2} as Prop);
      const a = spin.get(p.id) ?? 0;
      for (const [i, b] of [0, Math.PI / 2].entries()) {
        const c = Math.cos(a + b) * (p.r - 8), d = Math.sin(a + b) * (p.r - 8);
        out.push({id: `spoke-${p.id}-${i}`, type: 'line', x1: X(p.x - c), y1: Y(p.y - d), x2: X(p.x + c), y2: Y(p.y + d), style: {stroke: 'cool', width: z(3)}, layer: 2} as Prop);
      }
      out.push({id: `axle-${p.id}`, type: 'circle', x: X(p.x), y: Y(p.y), r: z(6), style: {fill: 'ink'}, layer: 4} as Prop);
      // the rope round its half of the rim
      for (let i = 0; i < 10; i++) {
        const a1 = Math.PI * i / 10, a2 = Math.PI * (i + 1) / 10, sg = p.over ? -1 : 1;
        out.push({id: `wrap-${p.id}-${i}`, type: 'line', x1: X(p.x - p.r * Math.cos(a1)), y1: Y(p.y + sg * p.r * Math.sin(a1)), x2: X(p.x - p.r * Math.cos(a2)), y2: Y(p.y + sg * p.r * Math.sin(a2)),
          style: {stroke: 'ink', width: z(4.5)}, layer: 3} as Prop);
      }
    }
    // the load, hanging at R.load (its top)
    const [lx, ly] = R.load;
    out.push({id: 'load', type: 'rect', x: X(lx - LW / 2), y: Y(ly), w: z(LW), h: z(LH), r: z(6), style: {fill: 'muted', stroke: 'ink', width: z(3)}, layer: 4} as Prop,
      text('lL', X(lx), Y(ly + LH / 2), 'L', zt(38), {weight: 700, align: 'middle', style: {fill: 'paper'}, layer: 5}));
    // the effort: a grip on the free end and the pull
    const [ex, ey, dir] = R.effort, al = 80;
    out.push({id: 'grip', type: 'circle', x: X(ex), y: Y(ey), r: z(9), style: {fill: 'accent'}, layer: 5} as Prop,
      {id: 'E', type: 'arrow', x1: X(ex), y1: Y(ey), x2: X(ex), y2: Y(ey + dir * al), head: z(20), style: {stroke: 'accent', width: z(6)}, layer: 5} as Prop,
      text('lE', X(ex), Y(ey + dir * (al + 28)), 'E', zt(34), {weight: 700, align: 'middle', style: {fill: 'accent'}, layer: 5}));
    // T beside each strand, in its upper part (clear of the effort's start mark)
    if (tension) for (const rope of R.ropes) rope.forEach((p, i) => {
      if (isWheel(p) || !p.T) return;
      // a strand starts at the element before it (y1) and ends at the one after (y2); a pulley there takes its radius
      const pad = (q: Strand | Wheel | undefined) => (q && isWheel(q) ? q.r + 14 : 16);
      const [a, b] = p.y1 < p.y2 ? [p.y1 + pad(rope[i - 1]), p.y2 - pad(rope[i + 1])] : [p.y2 + pad(rope[i + 1]), p.y1 - pad(rope[i - 1])];
      out.push(text(`lT-${p.id}`, X(p.x - 8), Y((a + b) / 2), p.T, zt(26), {weight: 700, align: 'end', style: {fill: 'good', stroke: 'paper', width: z(5)}, layer: 5, show: [lead + 0.8, 1e9]}));
    });
    for (const t of R.tags) {
      const lines = narrow ? t.text.split(' ').length : 1;
      out.push(text(t.id, X(t.x), Y(t.y) - (lines - 1) * 0.625 * zt(28), t.text, zt(28), {align: t.align, style: {fill: 'muted'}, layer: 5, show: [lead, 1e9],
        ...(narrow ? {width: Math.ceil(Math.max(...t.text.split(' ').map(w => textWidth(w, zt(28))))) + 2} : {})}));
    }
    // the distances, from where each end started: the load's under the load, the effort's beside its strand
    const [lx0, ly0] = R0.load, [ex0, ey0] = R0.effort, yb = ly0 + LH, yb1 = ly + LH, xd = ex0 + 34;
    out.push({id: 'dL', type: 'arrow', x1: X(lx0), y1: Y(yb), x2: X(lx0), y2: Y(yb1), head: z(14), style: {stroke: 'cool', width: z(4), dash: [z(8), z(6)]}, layer: 4, show: [t0, 1e9]} as Prop,
      {id: 'dL-tick', type: 'line', x1: X(lx0 - 22), y1: Y(yb), x2: X(lx0 + 22), y2: Y(yb), style: {stroke: 'cool', width: z(3)}, show: [t0, 1e9]} as Prop,
      text('ldL', X(lx0 + 12), Y((yb + yb1) / 2), 'dL', zt(26), {weight: 700, style: {fill: 'cool', stroke: 'paper', width: z(5)}, layer: 5, show: [t0 + 1, 1e9]}),
      {id: 'dE', type: 'arrow', x1: X(xd), y1: Y(ey0), x2: X(xd), y2: Y(ey), head: z(14), style: {stroke: 'accent', width: z(4)}, layer: 4, show: [t0, 1e9]} as Prop,
      {id: 'dE-tick', type: 'line', x1: X(ex0 + 2), y1: Y(ey0), x2: X(xd + 12), y2: Y(ey0), style: {stroke: 'accent', width: z(3), dash: [z(6), z(5)]}, show: [t0, 1e9]} as Prop,
      text('ldE', X(xd + 12), Y((ey0 + ey) / 2), 'dE', zt(26), {weight: 700, style: {fill: 'accent', stroke: 'paper', width: z(5)}, layer: 5, show: [t0 + 0.6, 1e9]}));
    return out;
  };
  // sampled with a smooth start and stop; a value that never changes gets no keys
  const N = 40, us = Array.from({length: N + 1}, (_, i) => i / N), frames = us.map(v => build(rig(kind, n, withFixed, S * (3 * v * v - 2 * v * v * v), VR)));
  frames[0].forEach((p, j) => {
    const keys: Record<string, Key[]> = {};
    for (const [field, v] of Object.entries(p)) {
      if (typeof v !== 'number' || field === 'size' || field === 'head') continue;
      const vals = frames.map(fr => (fr[j] as unknown as Record<string, number>)[field]);
      if (vals.some(x => Math.abs(x - v) > 0.01)) keys[field] = [[0, v], [t0, v], ...vals.slice(1).map((x, i) => [round(t0 + (t1 - t0) * us[i + 1], 3), x, 'linear'] as Key)];
    }
    props.push(Object.keys(keys).length ? {...p, keys} as Prop : p);
  });

  // the panel
  const ptext = panel(W, k);
  const row0 = row, first = props.length;
  const line = (id: string, t: string, when: number, extra: Partial<Prop> = {}) => {
    props.push(ptext(id, px, row, t, lineSize, {show: [when, 1e9], fade: 0.3, ...extra}));
    row += wrapText(t, lineSize, pw).length * 1.3 * lineSize + 6 * k;
  };
  const F = (v: number) => `${f(v)} ${u}`;
  const what = kind === 'fixed' ? 'A single fixed pulley: its axle stays put, it only turns'
    : kind === 'movable' ? `A single movable pulley rises with the load, held up by two strands${withFixed ? '; a fixed pulley above turns the pull downward' : ''}`
    : kind === 'tackle' ? `A block and tackle: ${word(n)} pulleys in two blocks, ${word(n)} strands holding the lower block`
    : `One fixed pulley and ${word(n)} movable pulley${n > 1 ? 's' : ''}, each on its own string`;
  line('k1', what, lead, {weight: 700});
  if (kind === 'fixed' || kind === 'movable') line('k2', kind === 'fixed' ? 'The effort pulls down to lift the load up: a more convenient way to pull'
    : withFixed ? 'The effort pulls the free end down' : 'The effort pulls the free end up', lead + 0.6, {style: {fill: 'muted'}});
  const tN = lead + 1.2;
  if (nums) {
    const L = q.L!, E = q.E!;
    if (q.how === 'efficiency' && s.load === undefined) {
      line('n1', `Effort E = ${F(E)}, efficiency η = ${pct(s.efficiency!)}`, tN);
      line('n2', `Load L = η × VR × E = ${f(s.efficiency!)} × ${VR} × ${f(E)} = ${F(L)}`, tN + 0.6, {weight: 700});
    } else {
      line('n1', `Load L = ${F(L)}`, tN);
      if (q.how === 'measured') line('n2', `Effort E = ${F(E)} (measured)`, tN + 0.6, {weight: 700});
      else if (q.how === 'efficiency') line('n2', `Efficiency ${pct(s.efficiency!)}: E = L / (η × VR) = ${f(L)} / (${f(s.efficiency!)} × ${VR}) = ${F(E)}`, tN + 0.6, {weight: 700});
      else {
        const by = kind === 'chain' ? `2${['', '', '²', '³'][n]}` : String(VR);
        const ideal = kind === 'fixed' ? `E = T = L = ${F(q.E0!)}`
          : kind === 'chain' && q.w ? `each string halves the pull plus w: E = T${n > 1 ? n : ''} = ${F(q.E0!)}`
          : q.w ? `E = (L + w) / ${by} = (${f(L)} + ${f(q.w)}) / ${by} = ${F(q.E0!)}` : `E = L / ${by} = ${f(L)} / ${by} = ${F(q.E0!)}`;
        const whose = kind === 'tackle' ? 'Lower block' : kind === 'movable' || n === 1 ? 'Pulley' : 'Each movable pulley';
        line('n2', `${q.w ? `${whose} weighs w = ${F(q.w)}: ` : 'No friction, light pulleys: '}${ideal}`, tN + 0.6, {weight: q.friction < 1 ? 500 : 700});
        if (q.friction < 1) line('n3', `Friction lets ${pct(q.friction)} through: E = ${f(q.E0!)} / ${f(q.friction)} = ${F(E)}`, tN + 1.2, {weight: 700});
      }
    }
  } else if (!s.illustrative) line('n1', kind === 'fixed' ? 'Ideal: E = L' : `Ideal: E = L / ${VR}`, tN);
  // live distances, while the effort pulls
  const dL = s.rise, dE = dL !== undefined ? dL * VR : undefined;
  if (dL !== undefined) {
    const prog = us.map((v, i) => [round(t0 + (t1 - t0) * v, 3), 3 * v * v - 2 * v * v * v, ...(i ? ['linear'] : [])] as Key);
    const ro = (id: string, t: string, scale: number, fill: string) => {
      props.push({id, type: 'readout', x: px, y: row, size: lineSize, text: t, decimals: 2, show: [t0, 1e9], style: {fill},
        measures: {d: {kind: 'keys', keys: [[0, 0], ...prog.map(([tt, v, e]) => (e ? [tt, v * scale, e] : [tt, v * scale]) as Key)]}}} as Prop);
      row += 1.3 * lineSize + 6 * k;
    };
    ro('ro-dE', 'effort end moves dE = {d} m', dE!, 'accent');
    ro('ro-dL', 'load rises dL = {d} m', dL, 'cool');
  }
  // after the pull
  line('r1', VR === 1 ? 'The effort end moves down as far as the load rises' : `The effort end moves ${times(VR)} the load`, t1 + 0.3, {weight: 700});
  line('r2', dL !== undefined ? `VR = dE / dL = ${f(dE!)} / ${f(dL)} = ${VR}` : `VR = dE / dL = ${VR}`, t1 + 0.9);
  if (nums) {
    line('r3', `MA = L / E = ${f(q.L!)} / ${f(q.E!)} = ${f(q.MA!)}`, t1 + 1.5);
    line('r4', `η = MA / VR = ${f(q.MA!)} / ${VR} = ${pct(q.eta!)}`, t1 + 2.1, {weight: 700, style: {fill: 'good'}});
  } else line('r3', `MA = VR = ${VR} for an ideal pulley${VR > 1 ? ' system' : ''}`, t1 + 1.5);
  const lossy = nums && q.eta! < 1 - 1e-9;
  const cause = kind === 'fixed' ? 'friction at the axle' : q.w && q.friction === 1 && q.how === 'computed' ? 'lifting the moving pulleys'
    : 'friction and lifting the moving pulleys';
  line('r5', lossy ? `η is below one: work is lost to ${cause}`
    : kind === 'fixed' ? 'No gain in force or speed: it only changes the direction of the effort'
    : 'A force multiplier: less effort, moved farther; no gain in work', t1 + 2.7, {style: {fill: 'muted'}});
  let last = t1 + 2.7;
  if (nums && dL !== undefined) {
    const toJ = u === 'kgf' ? g : 1;
    line('r6', `Work in E × dE = ${f(q.E! * dE! * toJ)} J; work out L × dL = ${f(q.L! * dL * toJ)} J`, t1 + 3.3, {style: {fill: 'muted'}});
    last = t1 + 3.3;
  }
  // a long panel (a title, w, friction and the distances) is set smaller to fit; smaller text only wraps less
  const pan = props.slice(first) as (Prop & {y: number; size: number; text: string})[];
  for (let fit = 0.95; row > 0.97 * H && fit > 0.6; fit -= 0.05) {
    row = row0;
    for (const p of pan) {
      p.size = round(lineSize * fit, 2); p.y = round(row, 2);
      row += (p.type === 'readout' ? 1 : wrapText(p.text, p.size, pw).length) * 1.3 * p.size + 6 * k * fit;
    }
  }
  facts.push(`velocity ratio VR = ${VR}`, ...(nums ? [`load L = ${F(q.L!)}`, `effort E = ${F(q.E!)}`, `mechanical advantage MA = ${f(q.MA!)}`, `efficiency η = ${pct(q.eta!)}`] : [`ideal MA = ${VR}`]),
    ...(dL !== undefined ? [`load rises ${f(dL)} m while the effort end moves ${f(dE!)} m`] : []),
    ...(nums && dL !== undefined ? [`work put in ${f(q.E! * dE! * (u === 'kgf' ? g : 1))} J, work done on the load ${f(q.L! * dL * (u === 'kgf' ? g : 1))} J`] : []),
    ...(q.T.length > 1 ? q.T.map((t, i) => `tension T${i + 1} = ${F(t)}`) : []));
  const anchors: Record<string, [number, number]> = {load: [X(R1.load[0]), Y(R1.load[1] + LH / 2)], effort: [X(R1.effort[0]), Y(R1.effort[1])]};
  return {...scene(s, W, H, Math.max(last + 2.2, s.seconds ?? 0), plane, props, [], {verb: 'pulley', facts, anchors})};
}
