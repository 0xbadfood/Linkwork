// kirchhoff: a network of resistors and cells of any shape, solved by Kirchhoff's rules (Class 12 Current Electricity,
// 2026-11-04). current's kirchhoff show holds three branches between two junctions; Example 3.6 (Fig. 3.17: a 10 V and
// a 5 V battery, resistors of 4, 2, 1, 4 and 2 Ω, branch CD at zero) and Fig. 3.15 (points h, b, c, g, f, e along
// three branches) found no verb, and four beats of the Kirchhoff film fell to blank backdrops.
// Nodes are placed by the planner on a grid; each branch runs between two nodes (straight, or through corners) and
// carries resistors, cells and named points in order from its `from` end. Code solves the network exactly (modified
// nodal analysis: a cell with no resistance is its own unknown current), draws every branch current at its true
// direction, checks a junction (in = out) and walks a loop, adding the change in potential across each part to zero.
import type {Key} from '../keys.ts';
import type {Prop, Scene} from '../scene.ts';
import {textWidth, wrapText} from '../svg.ts';
import {round, type Vec} from '../vec.ts';
import {frame} from './vectors.ts';

export type NetPart = {R: number} | {emf: number; plus: 'from' | 'to'; r?: number} | {point: string};
export type NetBranch = {from: string; to: string; via?: Vec[]; parts?: NetPart[]; name?: string};
export type KirchhoffSpec = {verb: 'kirchhoff'; nodes: {id: string; at: Vec}[]; branches: NetBranch[];
  /** values: every branch current solved (default); names: the book's labels (I1, I2 + I3) as assumed; none */
  currents?: 'values' | 'names' | 'none';
  /** a node whose currents are added: in = out */
  junction?: string;
  /** a closed loop walked, as stations (nodes or points) in order: the change in potential across each part, summed */
  loop?: string[];
  title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isR = (p: NetPart): p is {R: number} => 'R' in p;
const isCell = (p: NetPart): p is {emf: number; plus: 'from' | 'to'; r?: number} => 'emf' in p;
const isPoint = (p: NetPart): p is {point: string} => 'point' in p;
const ID = /^[A-Za-z][A-Za-z0-9₀-₉']{0,3}$/;

/** A value as the book writes it: a small fraction when it is one (5/8), else three figures. */
export function frac(x: number): string {
  const sign = x < -1e-12 ? '−' : '', a = Math.abs(x);
  if (a < 1e-9) return '0';
  for (let d = 1; d <= 16; d++) { const n = Math.round(a * d); if (Math.abs(a * d - n) < 1e-7 * d) return sign + (d === 1 ? `${n}` : `${n}/${d}`); }
  return sign + (+a.toPrecision(3)).toString();
}
const dec = (x: number) => (Math.abs(x) < 1e-9 ? '0' : (+x.toPrecision(3)).toString().replace('-', '−'));

/** Branch totals: series resistance and the rise in potential (emf) going from `from` to `to`. */
const totals = (b: NetBranch) => ({R: (b.parts ?? []).reduce((a, p) => a + (isR(p) ? p.R : isCell(p) ? p.r ?? 0 : 0), 0),
  E: (b.parts ?? []).reduce((a, p) => a + (isCell(p) ? (p.plus === 'to' ? p.emf : -p.emf) : 0), 0)});

/** The network solved: node potentials (the first node at 0) and each branch's current from `from` to `to`; null when
 * the network has no single solution (a part left floating, or cells with no resistance in a closed loop). */
export function solveNetwork(nodes: string[], branches: NetBranch[]): {V: Record<string, number>; I: number[]} | null {
  const idx = new Map(nodes.slice(1).map((n, i) => [n, i])), short = branches.map((b, i) => [b, i] as const).filter(([b]) => totals(b).R === 0);
  const m = nodes.length - 1, size = m + short.length, A = Array.from({length: size}, () => new Array(size + 1).fill(0));
  const add = (r: number, c: number, v: number) => { if (r >= 0 && c >= 0) A[r][c] += v; };
  const at = (n: string) => idx.get(n) ?? -1;
  branches.forEach((b, i) => {
    const {R, E} = totals(b), a = at(b.from), c = at(b.to);
    if (R > 0) {                                       // I = (Va − Vb + E)/R leaves a, enters b
      add(a, a, 1 / R); add(a, c, -1 / R); if (a >= 0) A[a][size] -= E / R;
      add(c, a, -1 / R); add(c, c, 1 / R); if (c >= 0) A[c][size] += E / R;
    } else {
      const k = m + short.findIndex(([, j]) => j === i);
      add(a, k, 1); add(c, k, -1);                     // its own current, out of a and into b
      add(k, a, 1); add(k, c, -1); A[k][size] = -E;    // Va − Vb = −E
    }
  });
  for (let col = 0; col < size; col++) {               // Gaussian elimination, partial pivoting
    let p = col; for (let r = col + 1; r < size; r++) if (Math.abs(A[r][col]) > Math.abs(A[p][col])) p = r;
    if (Math.abs(A[p][col]) < 1e-12) return null;
    [A[col], A[p]] = [A[p], A[col]];
    for (let r = 0; r < size; r++) if (r !== col) { const f = A[r][col] / A[col][col]; for (let c = col; c <= size; c++) A[r][c] -= f * A[col][c]; }
  }
  const x = A.map((row, i) => row[size] / row[i]);
  const V: Record<string, number> = {[nodes[0]]: 0}; nodes.slice(1).forEach((n, i) => (V[n] = x[i]));
  const I = branches.map((b, i) => { const {R, E} = totals(b); return R > 0 ? (V[b.from] - V[b.to] + E) / R : x[m + short.findIndex(([, j]) => j === i)]; });
  return {V, I};
}

/** Stations along each branch (from, its points, to) with the parts between each pair. */
const chain = (b: NetBranch) => {
  const st: string[] = [b.from], between: NetPart[][] = [[]];
  for (const p of b.parts ?? []) if (isPoint(p)) { st.push(p.point); between.push([]); } else between[between.length - 1].push(p);
  st.push(b.to); return {st, between};
};

/** The loop as steps: each a branch, the stretch of it walked and the direction. */
function loopSteps(s: KirchhoffSpec): {steps: {b: number; i: number; fwd: boolean}[]; error?: string} {
  const L = s.loop!, stops = L[0] === L[L.length - 1] ? L : [...L, L[0]], steps: {b: number; i: number; fwd: boolean}[] = [];
  for (let j = 0; j + 1 < stops.length; j++) {
    const [p, q] = [stops[j], stops[j + 1]], found: {b: number; i: number; fwd: boolean}[] = [];
    s.branches.forEach((b, bi) => { const {st} = chain(b); for (let i = 0; i + 1 < st.length; i++) {
      if (st[i] === p && st[i + 1] === q) found.push({b: bi, i, fwd: true});
      if (st[i] === q && st[i + 1] === p) found.push({b: bi, i, fwd: false});
    } });
    if (!found.length) return {steps, error: `kirchhoff: loop goes from ${p} to ${q}, but no branch joins them next to each other: list every node and point on the way`};
    if (found.length > 1) return {steps, error: `kirchhoff: more than one branch joins ${p} and ${q}: name a point on the branch the loop takes ({point: 'h'}) and list it in loop`};
    steps.push(found[0]);
  }
  return {steps};
}

export function kirchhoffErrors(s: KirchhoffSpec): string[] {
  const e: string[] = [], W = 'kirchhoff';
  if (!Array.isArray(s.nodes) || s.nodes.length < 2 || s.nodes.length > 8) return [`${W}: nodes is 2 to 8 junctions {id, at: [x, y]} (grid units, y downward as on the page)`];
  const ids = new Set<string>();
  s.nodes.forEach((n, i) => {
    if (typeof n?.id !== 'string' || !ID.test(n.id) || ids.has(n.id)) e.push(`${W}: nodes[${i}] needs a unique short id (A, B, a, d): up to 4 characters`);
    ids.add(n?.id);
    if (!Array.isArray(n?.at) || n.at.length !== 2 || !n.at.every(isNum)) e.push(`${W}: nodes[${i}].at is [x, y] in grid units`);
  });
  if (!Array.isArray(s.branches) || s.branches.length < 2 || s.branches.length > 10) return [...e, `${W}: branches is 2 to 10 of {from, to, parts?, via?, name?}`];
  const stations = new Set(ids);
  s.branches.forEach((b, i) => {
    const w = `${W}: branches[${i}]`;
    if (!ids.has(b?.from) || !ids.has(b?.to)) e.push(`${w}: from and to are node ids (${[...ids].join(', ')})`);
    if (b?.from === b?.to) e.push(`${w}: from and to are two different nodes`);
    if (b?.via !== undefined && (!Array.isArray(b.via) || b.via.length > 3 || b.via.some(v => !Array.isArray(v) || v.length !== 2 || !v.every(isNum)))) e.push(`${w}: via is up to 3 corners [x, y] the wire turns at`);
    if (b?.name !== undefined && (typeof b.name !== 'string' || b.name.length > 14)) e.push(`${w}: name is the current's label (I1, I2 + I3), up to 14 characters`);
    const parts = b?.parts ?? [];
    if (!Array.isArray(parts) || parts.length > 8) { e.push(`${w}: parts is up to 8 of {R}, {emf, plus}, {point}`); return; }
    parts.forEach((p, j) => {
      const at = `${w}.parts[${j}]`;
      if (p && isR(p)) { if (!(isNum(p.R) && p.R > 0 && p.R <= 1e6)) e.push(`${at}: R is a resistance in ohms, above 0`); }
      else if (p && isCell(p)) {
        if (!(isNum(p.emf) && p.emf > 0 && p.emf <= 1000)) e.push(`${at}: emf is the cell's emf in volts, above 0`);
        if (p.plus !== 'from' && p.plus !== 'to') e.push(`${at}: plus is from or to: the end of the branch its + (long) plate faces`);
        if (p.r !== undefined && !(isNum(p.r) && p.r >= 0)) e.push(`${at}: r, the internal resistance, is 0 or more ohms`);
      } else if (p && isPoint(p)) {
        if (typeof p.point !== 'string' || !ID.test(p.point) || stations.has(p.point)) e.push(`${at}: point is a unique short name (h, b), not a node's id`);
        stations.add(p.point);
      } else e.push(`${at}: a part is {R: ohms}, {emf: volts, plus: 'from' | 'to', r?}, or {point: 'h'}`);
    });
  });
  if (s.currents !== undefined && !['values', 'names', 'none'].includes(s.currents)) e.push(`${W}: currents is values, names or none`);
  if (e.length) return e;
  // A wire may not run through another junction or along another wire (2026-11-04, leph1-03 C9 S31: B, C and D in a
  // line and the 5 V branch drawn straight from D to B, through C: the cell looked as if it sat at C).
  const at = Object.fromEntries(s.nodes.map(n => [n.id, n.at])) as Record<string, Vec>;
  const segs = s.branches.map(b => { const pts = [at[b.from], ...(b.via ?? []), at[b.to]]; return pts.slice(1).map((q, i) => [pts[i], q] as [Vec, Vec]); });
  const onSeg = (p: Vec, [a, b]: [Vec, Vec]) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), cross = ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / (L || 1);
    const f = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / ((L * L) || 1);
    return Math.abs(cross) < 0.02 * L + 1e-9 && f > 0.02 && f < 0.98;
  };
  // two stretches on one line that share more than a point
  const alongside = ([a, b]: [Vec, Vec], [c, d]: [Vec, Vec]) => {
    const L2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2, L = Math.sqrt(L2);
    const off = (p: Vec) => Math.abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / (L || 1);
    if (off(c) > 0.02 * L || off(d) > 0.02 * L) return false;
    const f = (p: Vec) => ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / (L2 || 1);
    return Math.min(1, Math.max(f(c), f(d))) - Math.max(0, Math.min(f(c), f(d))) > 0.02;
  };
  s.branches.forEach((b, i) => {
    for (const n of s.nodes) if (n.id !== b.from && n.id !== b.to && segs[i].some(sg => onSeg(n.at, sg)))
      e.push(`${W}: branches[${i}] (${b.from} to ${b.to}) runs straight through junction ${n.id}: give it a via corner to go round, or place the nodes so it doesn't`);
    s.branches.forEach((_, j) => { if (j > i && segs[i].some(sg => segs[j].some(sh => alongside(sg, sh))))
      e.push(`${W}: branches[${i}] and branches[${j}] run along the same line: give one a via corner`); });
  });
  if (e.length) return e;
  if (!solveNetwork(s.nodes.map(n => n.id), s.branches)) e.push(`${W}: the network has no single solution: every node must connect to the rest, and cells with no resistance must not form a loop on their own`);
  if (s.junction !== undefined && !ids.has(s.junction)) e.push(`${W}: junction is a node id (${[...ids].join(', ')})`);
  if (s.loop !== undefined) {
    if (!Array.isArray(s.loop) || s.loop.length < 2 || s.loop.length > 13 || s.loop.some(x => !stations.has(x))) e.push(`${W}: loop is 2 to 12 stations in order (node ids or point names), back to the start`);
    else { const {error} = loopSteps(s); if (error) e.push(error); }
  }
  return e;
}

export function kirchhoff(s: KirchhoffSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, fr = frame(W, H, k, s.title), props: Prop[] = [...fr.titles];
  const [bx0, by0, bx1, by1] = fr.box, mode = s.currents ?? 'values';
  const sol = solveNetwork(s.nodes.map(n => n.id), s.branches)!;
  // the grid fitted to the box, one scale both ways, with room round the edge for labels
  const all: Vec[] = [...s.nodes.map(n => n.at), ...s.branches.flatMap(b => b.via ?? [])];
  const gx0 = Math.min(...all.map(p => p[0])), gx1 = Math.max(...all.map(p => p[0])), gy0 = Math.min(...all.map(p => p[1])), gy1 = Math.max(...all.map(p => p[1]));
  const pad = 70 * k, per = Math.min((bx1 - bx0 - 2 * pad) / Math.max(gx1 - gx0, 1e-9), (by1 - by0 - 2 * pad) / Math.max(gy1 - gy0, 1e-9));
  const ox = (bx0 + bx1) / 2 - per * (gx0 + gx1) / 2, oy = (by0 + by1) / 2 - per * (gy0 + gy1) / 2;
  const P = (g: Vec): Vec => [round(ox + per * g[0], 2), round(oy + per * g[1], 2)];
  const pos = Object.fromEntries(s.nodes.map(n => [n.id, P(n.at)])) as Record<string, Vec>;
  const mid: Vec = [s.nodes.reduce((a, n) => a + pos[n.id][0], 0) / s.nodes.length, s.nodes.reduce((a, n) => a + pos[n.id][1], 0) / s.nodes.length];
  let n = 0; const id = (p: string) => `${p}${n++}`;
  const line = (a: Vec, b: Vec, stroke = 'ink', width = 4, extra: Record<string, unknown> = {}) =>
    props.push({id: id('w'), type: 'line', x1: round(a[0], 2), y1: round(a[1], 2), x2: round(b[0], 2), y2: round(b[1], 2), style: {stroke, width: width * k}, layer: 2, ...extra} as Prop);
  const text = (x: number, y: number, t: string, fill = 'ink', size = 26, extra: Record<string, unknown> = {}) =>
    props.push({id: id('t'), type: 'text', x: round(x, 2), y: round(y, 2), text: t, size: size * k, weight: 700, align: 'middle', style: {fill, stroke: 'paper', width: 6 * k}, layer: 6, ...extra} as Prop);
  const draw = {show: [0.2, 1e9] as [number, number], fade: 0.6};
  const facts: string[] = [], anchors: Record<string, Vec> = {...pos};

  // Each branch: its path, the parts spread along it (a symbol stays inside one straight stretch), the current's arrow
  // in the widest free gap, labels on the side away from the middle of the network.
  type Spot = {at: Vec; u: Vec; side: Vec};
  const paths = s.branches.map(b => [pos[b.from], ...(b.via ?? []).map(P), pos[b.to]]);
  const lengths = paths.map(pts => pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1])));
  const spotAt = (bi: number, d: number, half = 0): Spot => {
    const pts = paths[bi], segs = lengths[bi];
    let i = 0; while (i < segs.length - 1 && d > segs[i]) { d -= segs[i]; i++; }
    d = Math.min(Math.max(d, Math.min(half, segs[i] / 2)), Math.max(segs[i] - half, segs[i] / 2));
    const u: Vec = [(pts[i + 1][0] - pts[i][0]) / segs[i], (pts[i + 1][1] - pts[i][1]) / segs[i]], at: Vec = [pts[i][0] + u[0] * d, pts[i][1] + u[1] * d];
    let side: Vec = [-u[1], u[0]]; if ((at[0] - mid[0]) * side[0] + (at[1] - mid[1]) * side[1] < 0) side = [-side[0], -side[1]];
    return {at, u, side};
  };
  // Labels go where they clear every wire and every label already placed: the side away from the middle first, then
  // the other side, then further out, then slid along the wire (2026-11-04: Example 3.6's I2 sat on the 10 V cell's
  // label where four branches meet at A).
  const taken: [number, number, number, number][] = s.nodes.map(nd => [pos[nd.id][0] - 14 * k, pos[nd.id][1] - 14 * k, pos[nd.id][0] + 14 * k, pos[nd.id][1] + 14 * k]);
  const hits = (b: [number, number, number, number]) => taken.some(o => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])
    || paths.some(pts => pts.slice(1).some((q, i) => { for (let f = 0; f <= 1; f += 0.02) { const x = pts[i][0] + (q[0] - pts[i][0]) * f, y = pts[i][1] + (q[1] - pts[i][1]) * f; if (x > b[0] && x < b[2] && y > b[1] && y < b[3]) return true; } return false; }));
  const place = (t: string, size: number, at: Vec, u: Vec, side: Vec, gap: number): Vec => {
    const w = textWidth(t, size * k) / 2 + 4 * k, h = 0.55 * size * k;
    const tries: Vec[] = [];
    for (const sd of [1, -1]) for (const far of [1, 1.5, 2]) tries.push([side[0] * sd * (gap * far + Math.abs(side[0]) * w), side[1] * sd * (gap * far + Math.abs(side[1]) * w)]);
    for (const along of [60, -60, 110, -110]) for (const sd of [1, -1]) tries.push([u[0] * along * k + side[0] * sd * (gap + Math.abs(side[0]) * w), u[1] * along * k + side[1] * sd * (gap + Math.abs(side[1]) * w)]);
    for (const [dx, dy] of tries) {
      const c: Vec = [at[0] + dx, at[1] + dy], b: [number, number, number, number] = [c[0] - w, c[1] - h, c[0] + w, c[1] + h];
      if (!hits(b)) { taken.push(b); return c; }
    }
    const c: Vec = [at[0] + side[0] * (gap + w), at[1] + side[1] * (gap + h)]; taken.push([c[0] - w, c[1] - h, c[0] + w, c[1] + h]); return c;
  };
  const label = (t: string, at: Vec, u: Vec, side: Vec, gap: number, fill: string, size: number, extra: Record<string, unknown>) => {
    const c = place(t, size, at, u, side, gap); text(c[0], c[1] + 0.35 * size * k, t, fill, size, extra);
  };
  // every symbol's room is taken before any label is placed
  const halfOf = (bi: number) => Math.min(58 * k, 0.16 * lengths[bi].reduce((a, x) => a + x, 0));
  const spotsOf = s.branches.map((b, bi) => {
    const total = lengths[bi].reduce((a, x) => a + x, 0), parts = b.parts ?? [];
    return parts.map((_, j) => spotAt(bi, total * (j + 1) / (parts.length + 1), isPoint(parts[j]) ? 0 : halfOf(bi)));
  });
  spotsOf.forEach((spots, bi) => spots.forEach(({at, u}, j) => {
    if (isPoint((s.branches[bi].parts ?? [])[j])) { taken.push([at[0] - 10 * k, at[1] - 10 * k, at[0] + 10 * k, at[1] + 10 * k]); return; }
    const h = halfOf(bi), ex = Math.abs(u[0]) * h + Math.abs(u[1]) * 32 * k, ey = Math.abs(u[1]) * h + Math.abs(u[0]) * 32 * k;
    taken.push([at[0] - ex, at[1] - ey, at[0] + ex, at[1] + ey]);
  }));
  s.nodes.forEach(nd => {
    const p = pos[nd.id], away: Vec = [p[0] - mid[0], p[1] - mid[1]], m = Math.hypot(...away) || 1, d: Vec = [away[0] / m, away[1] / m];
    props.push({id: `node-${nd.id}`, type: 'circle', x: p[0], y: p[1], r: 10 * k, style: {fill: 'cool'}, layer: 5} as Prop);
    label(nd.id, p, [-d[1], d[0]], d, 30 * k, 'cool', 32, {});
  });
  const stationAt: Record<string, Vec> = {...pos}, partSpots: Spot[][] = [];
  s.branches.forEach((b, bi) => {
    const pts = paths[bi], parts = b.parts ?? [], half = halfOf(bi), spots = spotsOf[bi];
    for (let i = 1; i < pts.length; i++) line(pts[i - 1], pts[i], 'ink', 4, {draw: 0, keys: {draw: [[0.1, 0], [1.1, 1, 'inOut']]}, layer: 1});
    partSpots.push(spots);
    parts.forEach((p, j) => {
      const {at, u, side} = spots[j];
      if (isPoint(p)) {
        props.push({id: id('pt'), type: 'circle', x: round(at[0], 2), y: round(at[1], 2), r: 8 * k, style: {fill: 'cool'}, layer: 5, ...draw} as Prop);
        label(p.point, at, u, side, 14 * k, 'cool', 28, draw);
        stationAt[p.point] = at; anchors[p.point] = [round(at[0], 2), round(at[1], 2)];
        return;
      }
      // a gap in the wire under the symbol (paper over ink), then the symbol
      const a: Vec = [at[0] - u[0] * half, at[1] - u[1] * half], c: Vec = [at[0] + u[0] * half, at[1] + u[1] * half];
      line(a, c, 'paper', 10, {layer: 3, ...draw});
      if (isR(p)) {
        const pts2: Vec[] = [a];
        for (let q = 0; q <= 6; q++) { const f = -0.7 * half + 1.4 * half * q / 6, off = q === 0 || q === 6 ? 0 : (q % 2 ? 13 : -13) * k; pts2.push([at[0] + u[0] * f - u[1] * off, at[1] + u[1] * f + u[0] * off]); }
        pts2.push(c);
        props.push({id: id('R'), type: 'polyline', points: pts2.map(q => [round(q[0], 2), round(q[1], 2)] as Vec), style: {stroke: 'ink', width: 4 * k}, layer: 4, ...draw} as Prop);
        label(`${dec(p.R)} Ω`, at, u, side, 22 * k, 'ink', 26, draw);
      } else {
        // + (long, thin) plate toward the end it faces, − (short, thick) plate toward the other
        const g = 9 * k, s1 = p.plus === 'to' ? 1 : -1, plus: Vec = [at[0] + u[0] * g * s1, at[1] + u[1] * g * s1], minus: Vec = [at[0] - u[0] * g * s1, at[1] - u[1] * g * s1];
        line(a, minus, 'ink', 4, {layer: 4, ...draw}); line(plus, c, 'ink', 4, {layer: 4, ...draw});
        line([plus[0] - u[1] * 30 * k, plus[1] + u[0] * 30 * k], [plus[0] + u[1] * 30 * k, plus[1] - u[0] * 30 * k], 'accent', 4, {layer: 4, ...draw});
        line([minus[0] - u[1] * 15 * k, minus[1] + u[0] * 15 * k], [minus[0] + u[1] * 15 * k, minus[1] - u[0] * 15 * k], 'accent', 9, {layer: 4, ...draw});
        label(`${dec(p.emf)} V${p.r ? `, ${dec(p.r)} Ω` : ''}`, at, u, side, 36 * k, 'accent', 26, draw);
      }
    });
  });

  // Branch currents: an arrow on the wire in the widest gap between parts, pointing the way the current really flows
  // (values) or the way the book assumes (names); a branch carrying none says 0 A.
  const T1 = 1.6, step = Math.min(0.3, 2.4 / s.branches.length);
  const names = s.branches.map((b, i) => b.name ?? `I${i + 1}`);
  if (mode !== 'none') s.branches.forEach((b, bi) => {
    const total = lengths[bi].reduce((a, x) => a + x, 0), parts = b.parts ?? [], marks = [0, ...parts.map((_, j) => total * (j + 1) / (parts.length + 1)), total];
    let best = 0; for (let j = 1; j + 1 < marks.length; j++) if (marks[j + 1] - marks[j] > marks[best + 1] - marks[best]) best = j;
    const {at, u, side} = spotAt(bi, (marks[best] + marks[best + 1]) / 2), I = sol.I[bi], when = {show: [T1 + bi * step, 1e9] as [number, number], fade: 0.3};
    const dir = mode === 'values' && I < 0 ? -1 : 1, zero = mode === 'values' && Math.abs(I) < 1e-9, L = 26 * k;
    if (!zero) props.push({id: `I-${bi}`, type: 'arrow', x1: round(at[0] - u[0] * L * dir, 2), y1: round(at[1] - u[1] * L * dir, 2), x2: round(at[0] + u[0] * L * dir, 2), y2: round(at[1] + u[1] * L * dir, 2),
      head: 16 * k, style: {stroke: 'good', width: 5 * k}, layer: 5, ...when} as Prop);
    const value = `${frac(Math.abs(I))} A`, t = mode === 'names' ? names[bi] : zero ? '0 A' : b.name ? `${b.name} = ${value}` : value;
    label(t, at, u, [-side[0], -side[1]], 18 * k, zero ? 'muted' : 'good', 26, when);
    facts.push(`branch ${b.from}${b.to}${b.name ? ` (${b.name})` : ''}: ${zero ? 'no current' : `${frac(Math.abs(I))} A (${dec(Math.abs(I))} A) from ${I >= 0 ? b.from : b.to} to ${I >= 0 ? b.to : b.from}`}`);
  });
  let t = T1 + s.branches.length * step + 0.6;

  // The side panel: what the scene says, then the junction and loop as they happen.
  let row = fr.row;
  const say = (str: string, when: number, fill = 'ink', bold = false) => {
    props.push({id: id('p'), type: 'text', x: fr.px, y: row, text: str, size: 28 * k, width: fr.width, weight: bold ? 700 : 400, show: [when, 1e9], fade: 0.3, style: {fill}} as Prop);
    row += wrapText(str, 28 * k, fr.width).length * 1.28 * 28 * k + 8 * k;
  };
  say(s.loop ? 'Round any closed loop, the changes in potential add up to zero' : s.junction ? 'At a junction, the current flowing in equals the current flowing out'
    : mode === 'values' ? 'Every branch current, found from the junction and loop rules' : mode === 'names' ? 'Each branch has its own current, labelled with an arrow'
    : 'Cells and resistors joined in loops: series and parallel rules alone cannot find these currents', 0.3, 'ink', true);

  if (s.junction) {
    const j = s.junction, ins: string[] = [], outs: string[] = [];
    let total = 0;
    s.branches.forEach((b, bi) => {
      if (b.from !== j && b.to !== j) return;
      // names: the book's arrows as assumed; values (and the fact): the way the current really flows
      const I = sol.I[bi], out = (b.from === j) === (mode === 'names' || I >= 0);
      if ((b.from === j) === (I >= 0)) total += Math.abs(I);
      if (mode === 'values' && Math.abs(I) < 1e-9) return;
      (out ? outs : ins).push(mode === 'names' ? names[bi] : frac(Math.abs(I)));
    });
    const p = pos[j];
    props.push({id: 'junction-ring', type: 'circle', x: p[0], y: p[1], r: 30 * k, style: {stroke: 'accent', width: 5 * k, fill: 'none'}, layer: 6, show: [t, 1e9], fade: 0.3} as Prop);
    const unit = mode === 'names' ? '' : ' A';
    say(mode === 'names' ? `At ${j}: ${ins.join(' + ') || '0'} = ${outs.join(' + ') || '0'}` : `At ${j}: in ${ins.join(' + ')}${unit} = out ${outs.join(' + ')}${unit}`, t, 'accent');
    facts.push(`at junction ${j}, current in = current out = ${frac(total)} A`);
    t += 1.6;
  }

  let dur = t + 1.2;
  if (s.loop) {
    // The walker goes round the loop at a steady pace; each part's change in potential appears as it is crossed.
    const {steps} = loopSteps(s), route: Vec[] = [], terms: {text: string; dv: number; at: number}[] = [];
    const speed = 260 * k;
    let d = 0;
    const where: {d: number; dv: number; text: string; key?: string; coef?: number}[] = [];
    for (const st of steps) {
      const b = s.branches[st.b], parts = b.parts ?? [], pts = paths[st.b];
      // the path between the two stations, in the walk's direction
      const total = lengths[st.b].reduce((a, x) => a + x, 0), stationD = [0, ...parts.map((p, j) => (isPoint(p) ? total * (j + 1) / (parts.length + 1) : NaN)).filter(x => !Number.isNaN(x)), total];
      const d0 = stationD[st.i], d1 = stationD[st.i + 1], cum = [0]; lengths[st.b].forEach(x => cum.push(cum.at(-1)! + x));
      const ptAt = (q: number): Vec => { let i = 0; while (i < cum.length - 2 && q > cum[i + 1]) i++; const f = (q - cum[i]) / (cum[i + 1] - cum[i] || 1); return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]; };
      const inner = cum.filter(q => q > d0 && q < d1), seq = [d0, ...inner, d1];
      const walk = st.fwd ? seq : [...seq].reverse();
      walk.forEach((q, i) => { const p = ptAt(q); if (route.length && i === 0) return; if (route.length) d += Math.hypot(p[0] - route.at(-1)![0], p[1] - route.at(-1)![1]); route.push(p); });
      // the parts crossed on this stretch, in walking order, at their place along the route
      const I = sol.I[st.b], startD = d - Math.abs(d1 - d0);
      const crossed = parts.map((p, j) => ({p, q: total * (j + 1) / (parts.length + 1)})).filter(x => !isPoint(x.p) && x.q > d0 && x.q < d1);
      if (!st.fwd) crossed.reverse();
      for (const {p, q} of crossed) {
        const along = startD + (st.fwd ? q - d0 : d1 - q), sgn = st.fwd ? 1 : -1;
        // −IR walking along the branch's current, +IR against it: with values the sign is the true one (a current
        // flowing against the book's arrow turns it round); with names it is written as the book would, −30 I1
        const drop = (R: number) => (mode === 'names' ? {dv: -sgn * I * R, text: '', key: names[st.b], coef: -sgn * R}
          : {dv: -sgn * I * R, text: `${-sgn * I < 0 ? '−' : '+'}${dec(R)} × ${frac(Math.abs(I))}`});
        if (isR(p)) where.push({d: along, ...drop(p.R)});
        if (isCell(p)) {
          const rise = (p.plus === 'to') === st.fwd;
          where.push({d: along, dv: rise ? p.emf : -p.emf, text: `${rise ? '+' : '−'}${dec(p.emf)}`});
          if (p.r) where.push({d: along + 1e-6, ...drop(p.r)});
        }
      }
    }
    route.push(route[0]); d += Math.hypot(route[0][0] - route.at(-2)![0], route[0][1] - route.at(-2)![1]);
    const T0 = t, Tw = Math.max(3, d / speed), tAt = (q: number) => T0 + Tw * q / d;
    const cum2 = [0]; for (let i = 1; i < route.length; i++) cum2.push(cum2[i - 1] + Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]));
    const kx: Key[] = [[T0, round(route[0][0], 2)]], ky: Key[] = [[T0, round(route[0][1], 2)]];
    for (let i = 1; i < route.length; i++) { kx.push([round(tAt(cum2[i]), 3), round(route[i][0], 2), 'linear']); ky.push([round(tAt(cum2[i]), 3), round(route[i][1], 2), 'linear']); }
    props.push({id: 'walker', type: 'circle', x: kx[0][1], y: ky[0][1], r: 13 * k, style: {fill: 'bad', stroke: 'paper', width: 3 * k}, layer: 7, show: [T0 - 0.3, 1e9], fade: 0.3, keys: {x: kx, y: ky}} as Prop);
    say(`Walking the loop ${[...s.loop, ...(s.loop[0] === s.loop.at(-1) ? [] : [s.loop[0]])].join(' → ')}${s.illustrative ? '' : ':'}`, T0 - 0.3, 'cool');
    let sum = 0;
    const sumKeys: Key[] = [[T0, 0]];
    where.sort((a, b) => a.d - b.d);
    // the book adds a branch's resistors into one term (−41 I3, not −1 I3 − 40 I3)
    for (let i = where.length - 1; i > 0; i--) if (where[i].key && where[i].key === where[i - 1].key) {
      where[i - 1] = {...where[i - 1], dv: where[i - 1].dv + where[i].dv, coef: where[i - 1].coef! + where[i].coef!}; where.splice(i, 1);
    }
    for (const w of where) if (w.key) w.text = `${w.coef! < 0 ? '−' : '+'}${dec(Math.abs(w.coef!))} ${w.key}`;
    where.forEach(w => { sum += w.dv; const at = tAt(w.d); terms.push({text: w.text, dv: w.dv, at}); sumKeys.push([round(at - 0.01, 3), round(sum - w.dv, 6)], [round(at, 3), round(sum, 6)]); });
    // the terms on lines of their own as they are crossed, then the sum
    let lineText = '';
    terms.forEach((tm, i) => { lineText += (i ? ' ' : '') + tm.text; });
    const unitNote = mode === 'names' ? '' : ' V';
    if (terms.length) {
      // shown one at a time: each new term joins the line already written
      let acc = '';
      terms.forEach((tm, i) => {
        acc += (i ? ' ' : '') + tm.text;
        props.push({id: `loop-terms${i}`, type: 'text', x: fr.px, y: row, text: acc, size: 28 * k, width: fr.width, weight: 700, show: [tm.at, i + 1 < terms.length ? terms[i + 1].at : 1e9], style: {fill: 'ink'}} as Prop);
      });
      row += wrapText(lineText, 28 * k, fr.width).length * 1.28 * 28 * k + 8 * k;
    }
    say(`= ${mode === 'names' ? '0' : `${frac(Math.abs(sum) < 1e-9 ? 0 : sum)}${unitNote}`}: the potential is back where it started`, T0 + Tw, 'good', true);
    if (mode !== 'names') props.push({id: 'loop-sum', type: 'readout', x: round(bx0 + 10 * k, 2), y: round(by1 + 10 * k, 2), size: 30 * k, text: 'change in potential so far: {v} V', decimals: 2,
      measures: {v: {kind: 'keys', keys: sumKeys}}, show: [T0 - 0.3, 1e9], style: {fill: 'cool'}} as Prop);
    facts.push(`round the loop ${s.loop.join('')}: ${lineText} = ${frac(Math.abs(sum) < 1e-9 ? 0 : sum)}${mode === 'names' ? '' : ' V'} (the loop rule)`);
    dur = T0 + Tw + 2;
  }
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: round(dur, 2), theme: s.theme ?? 'dark', props, actors: [],
    meta: {verb: 'kirchhoff', facts, anchors, currents: sol.I.map(x => round(x, 9)), potentials: Object.fromEntries(Object.entries(sol.V).map(([a, v]) => [a, round(v, 9)]))}};
}
