// potential and capacitor: electrostatic potential and capacitance, computed (NCERT Class 12 Physics, Ch. 2; 2026-11-02).
// potential
//   work          a test charge brought in against the field: V = W/q; `paths` shows two routes, the same work
//   curves        V ∝ 1/r and E ∝ 1/r² on one axis
//   dipole        V = p cos θ / 4πε₀r² at a point; without theta, the point sweeps from the axis to the equator
//   system        V at a point adds, with signs, over the charges
//   equipotentials surfaces traced from V itself, crossed at right angles by the field lines; `uniform` for planes
//   gradient      two close surfaces: E = −δV/δl, pointing to lower potential
//   assemble      charges brought in one at a time; U sums over pairs
//   external      a charge through a potential difference: ΔU = qΔV, the electron volt
//   dipole_energy a dipole turned in a uniform field: U = −pE cos θ, on its graph
// capacitor
//   conductor     case equilibrium, external, cavity or pillbox: E = 0 inside, charge on the surface, E normal to it
//   dielectric    polar or non-polar molecules in a field; surface charge reduces E by K, it does not cancel it
//   plates        C = ε₀A/d, with σ, E and V; `d2` moves a plate of an isolated capacitor
//   insert        a slab of constant K slid in, battery kept on or disconnected
//   combine       series, parallel or a series branch with one across it: C, Q and V of each
//   charging      charge moved across plate by plate; V against Q; U = Q²/2C and u = ½ε₀E²
import type {Key} from '../keys.ts';
import type {Plane} from '../plane.ts';
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {panel, scene} from './calculus.ts';
import {fieldAt, sci, traceLines, windowPieces} from './electric.ts';
import {frame} from './vectors.ts';

type P2 = [number, number];
type Charge = {q: number; x: number; y: number; name?: string};
export const POTENTIAL_SHOWS = ['work', 'curves', 'dipole', 'system', 'equipotentials', 'gradient', 'assemble', 'external', 'dipole_energy'] as const;
export const CAPACITOR_SHOWS = ['conductor', 'dielectric', 'plates', 'insert', 'combine', 'charging'] as const;
export type PotentialSpec = {verb: 'potential'; show: (typeof POTENTIAL_SHOWS)[number]; q?: number; test?: number; r?: number; start?: number; paths?: boolean; a?: number; theta?: number; charges?: Charge[]; at?: P2; reach?: number; uniform?: boolean; lines?: boolean; E?: number; V?: number; dV?: number; dl?: number; particle?: 'electron' | 'proton'; p?: number; from?: number; to?: number;
  span?: number; dl0?: number; title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};
export type CapacitorSpec = {verb: 'capacitor'; show: (typeof CAPACITOR_SHOWS)[number]; case?: 'equilibrium' | 'external' | 'cavity' | 'pillbox'; molecules?: 'polar' | 'nonpolar'; K?: number; A?: number; d?: number; d2?: number; Q?: number; V?: number; C?: number; battery?: boolean; kind?: 'series' | 'parallel'; caps?: number[]; across?: number; sigma?: number;
  span?: number; thickness?: number; reduce?: boolean; title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};

const K0 = 8.988e9, EPS0 = 8.854e-12, QE = 1.602e-19;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const hyp = Math.hypot, rad = (d: number) => d * Math.PI / 180;
export const potentialAt = (cs: Charge[], x: number, y: number) => cs.reduce((a, c) => a + K0 * c.q / Math.max(hyp(x - c.x, y - c.y), 1e-12), 0);
export const pairEnergy = (cs: Charge[]) => cs.reduce((a, c, i) => a + cs.slice(i + 1).reduce((b, o) => b + K0 * c.q * o.q / hyp(c.x - o.x, c.y - o.y), 0), 0);
export const seriesC = (cs: number[]) => 1 / cs.reduce((a, c) => a + 1 / c, 0);
/** μF and pF as the book writes them. */
export function farad(c: number) { const a = Math.abs(c); return a >= 1e-3 ? sci(c, 'F') : a >= 1e-6 * .999 ? `${+(c * 1e6).toPrecision(3)} μF` : a >= 1e-9 ? `${+(c * 1e9).toPrecision(3)} nF` : `${+(c * 1e12).toPrecision(3)} pF`; }

/** Contours of f on a grid, joined into polylines (marching squares). */
export function contour(f: (x: number, y: number) => number, level: number, xr: number, yr: number, n = 120): P2[][] {
  const nx = n, ny = Math.max(8, Math.round(n * yr / xr)), X = (i: number) => -xr + 2 * xr * i / nx, Y = (j: number) => -yr + 2 * yr * j / ny;
  const grid = Array.from({length: nx + 1}, (_, i) => Array.from({length: ny + 1}, (_, j) => f(X(i), Y(j))));
  const cross = (a: number, b: number, pa: P2, pb: P2): P2 => { const u = (level - a) / (b - a); return [pa[0] + u * (pb[0] - pa[0]), pa[1] + u * (pb[1] - pa[1])]; };
  const key = (p: P2) => `${p[0].toFixed(7)},${p[1].toFixed(7)}`, segs: [P2, P2][] = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const c: [number, P2][] = [[grid[i][j], [X(i), Y(j)]], [grid[i + 1][j], [X(i + 1), Y(j)]], [grid[i + 1][j + 1], [X(i + 1), Y(j + 1)]], [grid[i][j + 1], [X(i), Y(j + 1)]]];
    const hits: P2[] = [];
    for (let e = 0; e < 4; e++) { const [a, pa] = c[e], [b, pb] = c[(e + 1) % 4]; if ((a < level) !== (b < level) ) hits.push(cross(a, b, pa, pb)); }
    if (hits.length === 2) segs.push([hits[0], hits[1]]); else if (hits.length === 4) segs.push([hits[0], hits[1]], [hits[2], hits[3]]);
  }
  const at = new Map<string, number[]>(); segs.forEach((s, i) => s.forEach(p => at.set(key(p), [...(at.get(key(p)) ?? []), i])));
  const used = new Set<number>(), out: P2[][] = [];
  for (let i = 0; i < segs.length; i++) {
    if (used.has(i)) continue;
    used.add(i); const path: P2[] = [...segs[i]];
    for (const atEnd of [true, false]) for (;;) {
      const end = atEnd ? path[path.length - 1] : path[0], next = (at.get(key(end)) ?? []).find(n => !used.has(n));
      if (next === undefined) break;
      used.add(next); const [a, b] = segs[next], p = key(a) === key(end) ? b : a;
      if (atEnd) path.push(p); else path.unshift(p);
    }
    if (path.length > 5) out.push(path);
  }
  return out;
}

export function potentialErrors(s: PotentialSpec): string[] {
  const e: string[] = [], W = 'potential';
  if (!POTENTIAL_SHOWS.includes(s.show)) return [`${W}: show is one of ${POTENTIAL_SHOWS.join(', ')}`];
  for (const n of ['r', 'start', 'a', 'E', 'dl', 'reach', 'p'] as const) if (s[n] !== undefined && !(isNum(s[n]) && s[n]! > 0)) e.push(`${W}: ${n} is above 0, in SI units`);
  for (const n of ['q', 'test', 'V', 'dV', 'theta', 'from', 'to'] as const) if (s[n] !== undefined && !isNum(s[n])) e.push(`${W}: ${n} is a number`);
  if (s.charges !== undefined && (!Array.isArray(s.charges) || !s.charges.length || s.charges.length > 6 || s.charges.some(c => !isNum(c?.q) || !isNum(c?.x) || !isNum(c?.y) || c.q === 0))) e.push(`${W}: charges is 1 to 6 of {q (C, not 0), x (m), y (m), name}`);
  if ((s.show === 'system' || s.show === 'assemble' || (s.show === 'equipotentials' && !s.uniform)) && !s.charges) e.push(`${W}: ${s.show} needs charges: [{q, x, y}]`);
  if (s.show === 'assemble' && s.charges && s.charges.length < 2) e.push(`${W}: assemble needs at least two charges`);
  if (s.show === 'assemble' && s.charges?.some((c, i) => s.charges!.slice(i + 1).some(o => o.x === c.x && o.y === c.y))) e.push(`${W}: two charges at one place; move one`);
  if (s.show === 'system' && !(Array.isArray(s.at) && isNum(s.at[0]) && isNum(s.at[1]))) e.push(`${W}: system needs at: [x, y] (m)`);
  if (s.show === 'system' && s.charges && s.at && s.charges.some(c => c.x === s.at![0] && c.y === s.at![1])) e.push(`${W}: at is on a charge, where V has no meaning`);
  if (s.show === 'work' && s.start !== undefined && s.start <= (s.r ?? 0.1)) e.push(`${W}: start is farther than r: the charge is brought in from start to r`);
  if (s.show === 'dipole' && s.a !== undefined && s.r !== undefined && s.r <= s.a) e.push(`${W}: r must be more than a, outside the dipole`);
  if (s.show === 'dipole_energy') for (const n of ['from', 'to'] as const) if (s[n] !== undefined && !(s[n]! >= 0 && s[n]! <= 180)) e.push(`${W}: ${n} is 0 to 180 degrees`);
  if (s.particle !== undefined && !['electron', 'proton'].includes(s.particle)) e.push(`${W}: particle is electron or proton`);
  return e;
}

export function capacitorErrors(s: CapacitorSpec): string[] {
  const e: string[] = [], W = 'capacitor';
  if (!CAPACITOR_SHOWS.includes(s.show)) return [`${W}: show is one of ${CAPACITOR_SHOWS.join(', ')}`];
  for (const n of ['A', 'd', 'd2', 'Q', 'V', 'C', 'sigma'] as const) if (s[n] !== undefined && !(isNum(s[n]) && s[n]! > 0)) e.push(`${W}: ${n} is above 0, in SI units`);
  if (s.K !== undefined && !(isNum(s.K) && s.K > 1)) e.push(`${W}: K, the dielectric constant, is above 1`);
  if (s.case !== undefined && !['equilibrium', 'external', 'cavity', 'pillbox'].includes(s.case)) e.push(`${W}: case is equilibrium, external, cavity or pillbox`);
  if (s.molecules !== undefined && !['polar', 'nonpolar'].includes(s.molecules)) e.push(`${W}: molecules is polar or nonpolar`);
  if (s.show === 'combine') {
    if (!['series', 'parallel'].includes(s.kind as string)) e.push(`${W}: combine needs kind: series or parallel`);
    if (!Array.isArray(s.caps) || s.caps.length < 2 || s.caps.length > 4 || s.caps.some(c => !(isNum(c) && c > 0))) e.push(`${W}: caps is 2 to 4 capacitances in F`);
    if (s.across !== undefined && !(isNum(s.across) && s.across > 0)) e.push(`${W}: across is one more capacitance (F), across the whole series branch`);
    if (s.across !== undefined && s.kind !== 'series') e.push(`${W}: across goes with kind: series`);
    if (!s.illustrative && s.V === undefined) e.push(`${W}: combine needs V (volts) across it; or set illustrative: true`);
  }
  if ((s.show === 'plates' || s.show === 'insert') && !s.illustrative && (s.A === undefined || s.d === undefined)) e.push(`${W}: ${s.show} needs A (m²) and d (m); or set illustrative: true`);
  if (s.show === 'insert' && s.thickness !== undefined && !(s.thickness > 0 && s.thickness < (s.d ?? 1e-3))) e.push(`${W}: insert thickness is a slab thinner than the gap d`);
  if (s.show === 'insert' && !s.illustrative && s.K === undefined) e.push(`${W}: insert needs K, the dielectric constant; or set illustrative: true`);
  if (s.show === 'charging' && !s.illustrative && (s.C === undefined || s.V === undefined)) e.push(`${W}: charging needs C (F) and V (volts); or set illustrative: true`);
  return e;
}

/** The drawing helpers both verbs share. */
export function kit(s: {width?: number; height?: number; title?: string}) {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, fr = frame(W, H, k, s.title), box = fr.box, props: Prop[] = [...fr.titles];
  const bx = box[0], by = box[1], bw = box[2] - box[0], bh = box[3] - box[1], cx = bx + bw / 2, cy = by + bh / 2, S = Math.min(bw, bh);
  let n = 0; const id = (p: string) => `${p}${n++}`;
  const on = (t0: number, t1 = t0 + 0.9) => ({draw: 0, keys: {draw: [[t0, 0], [t1, 1, 'inOut']]}});
  const arrow = (p: P2, q: P2, stroke = 'accent', width = 5, extra: Record<string, unknown> = {}) => props.push({id: id('a'), type: 'arrow', x1: p[0], y1: p[1], x2: q[0], y2: q[1], head: 15 * k, style: {stroke, width: width * k}, layer: 2, ...extra} as Prop);
  const line = (p: P2, q: P2, stroke = 'muted', width = 3, extra: Record<string, unknown> = {}, dash = false) => props.push({id: id('l'), type: 'line', x1: p[0], y1: p[1], x2: q[0], y2: q[1], style: {stroke, width: width * k, ...(dash ? {dash: [10 * k, 8 * k]} : {})}, ...extra} as Prop);
  const poly = (points: P2[], stroke = 'muted', width = 3, extra: Record<string, unknown> = {}, dash = false) => props.push({id: id('c'), type: 'polyline', points, style: {stroke, width: width * k, ...(dash ? {dash: [10 * k, 8 * k]} : {})}, ...extra} as Prop);
  const label = (x: number, y: number, t: string, fill = 'ink', size = 26, extra: Record<string, unknown> = {}) => props.push({id: id('t'), type: 'text', x, y, text: t, size: size * k, weight: 700, align: 'middle', style: {fill}, layer: 3, ...extra} as Prop);
  const ring = (c: P2, rx: number, ry = rx, stroke = 'muted', width = 3, dash = false, extra: Record<string, unknown> = {}) => poly(Array.from({length: 73}, (_, i) => [c[0] + rx * Math.cos(i * Math.PI / 36), c[1] + ry * Math.sin(i * Math.PI / 36)] as P2), stroke, width, extra, dash);
  const charge = (x: number, y: number, q: number, r = 22, name?: string, extra: Record<string, unknown> = {}) => {
    props.push({id: id('q'), type: 'circle', x, y, r: r * k, style: {fill: q > 0 ? 'bad' : 'cool', stroke: 'ink', width: 2 * k}, layer: 3, ...extra} as Prop);
    label(x, y + r * 0.42 * k, q > 0 ? '+' : '−', 'paper', r * 1.3, extra);
    if (name) label(x, y - (r + 14) * k, name, 'ink', 26, extra);
  };
  const keysOf = (end: number, fn: (t: number) => number, per = 24): Key[] => { const m = Math.ceil(end * per); return Array.from({length: m + 1}, (_, i) => { const t = end * i / m; return (i ? [t, fn(t), 'linear'] : [t, fn(t)]) as Key; }); };
  const finish = (verb: string, spec: never, dur: number, story: string, second: string, facts: string[], anchors: Record<string, P2>, illustrative?: boolean, extra: Record<string, unknown> = {}): Scene => {
    const px = fr.px, ptext = panel(W, k); let row = fr.row;
    const say = (i: string, t: string, when: number, extra: Record<string, unknown> = {}) => { props.push(ptext(i, px, row, t, 28 * k, {show: [when, 1e9], ...extra} as never)); row += wrapText(t, 28 * k, W - px - 40 * k).length * 1.28 * 28 * k + 8 * k; };
    say('s1', story, 0.3, {weight: 700});
    if (second) say('s2', second, 1.3, {style: {fill: 'muted'}});
    if (!illustrative) facts.filter(t => /\d/.test(t)).slice(0, 3).forEach((t, i) => say(`f${i}`, t, 2.3 + i * 0.5));
    const plane: Plane = {id: 'p', x: [0, 1], y: [0, 1], box};
    return scene(spec, W, H, dur, plane, props, [], {verb, facts, anchors, ...extra});
  };
  return {k, props, bx, by, bw, bh, cx, cy, S, on, arrow, line, poly, label, ring, charge, keysOf, finish};
}

export function potential(s: PotentialSpec): Scene {
  const {k, props, bx, by, bw, bh, cx, cy, S, on, arrow, line, poly, label, ring, charge, keysOf, finish} = kit(s);
  const facts: string[] = [], anchors: Record<string, P2> = {}; let dur = 8, story = '', second = '';
  const show = s.illustrative ? () => {} : (x: number, y: number, t: string, a: number, b = 1e9, fill = 'accent') => label(x, y, t, fill, 28, {show: [a, b]});

  if (s.show === 'work') {
    const Q = s.q ?? 1e-9, q0 = s.test ?? 1e-9, r = s.r ?? 0.1, far = s.start ?? 4 * r, V = K0 * Q / r, W0 = q0 * (K0 * Q / r - K0 * Q / far); dur = s.paths ? 9 : 8;
    const x0 = bx + bw * .14, ppm = bw * .72 / far, y = s.paths ? cy + bh * .18 : cy, xf = x0 + far * ppm, xr = x0 + r * ppm; charge(x0, y, Q, 26, 'Q');
    if (s.paths) {
      const bend = (h: number, t0: number) => poly(Array.from({length: 41}, (_, i) => { const u = i / 40; return [xf + (xr - xf) * u, y - h * Math.sin(Math.PI * u)] as P2; }), h ? 'cool' : 'accent', 4, on(t0, t0 + 1.4), h === 0);
      bend(0, .8); bend(bh * .3, 2.3); bend(bh * .55, 3.8);
      charge(xf, y, q0, 15, 'R'); charge(xr, y, q0, 15, 'P'); facts.push(`W = ${sci(W0, 'J')} by every path`);
      story = 'Every route from R to P takes the same work'; second = 'The electrostatic force is conservative: work depends only on the two ends';
    } else {
      const u = (t: number) => { const f = Math.min(1, Math.max(0, (t - 1) / 4.5)); return f * f * (3 - 2 * f); }, X = (t: number) => xf + (xr - xf) * u(t), R = (t: number) => (X(t) - x0) / ppm, F = (d: number) => K0 * Math.abs(Q * q0) / (d * d), len = bw * .14 / F(r);
      props.push({id: 'tq', type: 'circle', x: xf, y, r: 15 * k, style: {fill: q0 > 0 ? 'bad' : 'cool', stroke: 'ink', width: 2 * k}, layer: 3, keys: {x: keysOf(dur, X)}} as Prop);
      props.push({id: 'tq-s', type: 'text', x: xf, y: y + 7 * k, text: q0 > 0 ? '+' : '−', size: 20 * k, weight: 700, align: 'middle', style: {fill: 'paper'}, layer: 4, keys: {x: keysOf(dur, X)}} as Prop);
      const dir = Q * q0 > 0 ? 1 : -1;
      props.push({id: 'Fe', type: 'arrow', x1: xf, y1: y, x2: xf, y2: y, head: 14 * k, style: {stroke: 'cool', width: 5 * k}, layer: 2, keys: {x1: keysOf(dur, X), x2: keysOf(dur, t => X(t) + dir * F(R(t)) * len)}} as Prop);
      line([xf, y + 56 * k], [xr, y + 56 * k], 'faint', 2); label(xf, y + 92 * k, 'from far', 'muted', 24); label(xr, y + 92 * k, 'P', 'ink', 26);
      facts.push(`V = kQ/r = ${sci(V, 'V')} at r = ${sci(r, 'm')}`, `W = q(V_P − V_R) = ${sci(W0, 'J')}`); anchors.P = [xr, y]; anchors.Q = [x0, y];
      story = 'Bringing the charge in takes work against the field, and it grows as the charge nears'; second = 'V at P is the work per unit charge to bring it in from infinity';
    }
  } else if (s.show === 'curves') {
    const x0 = bx + bw * .08, y0 = by + bh * .92, xw = bw * .88, yh = bh * .84, top = 2.2, rmax = 5, X = (r: number) => x0 + r / rmax * xw, Y = (v: number) => y0 - v / top * yh; dur = 7;
    line([x0, y0], [x0 + xw, y0], 'ink', 3); line([x0, y0], [x0, y0 - yh], 'ink', 3); label(x0 + xw - 8 * k, y0 + 38 * k, 'r', 'muted', 30);
    const curve = (f: (r: number) => number, c: string, t0: number) => { const rs = Array.from({length: 120}, (_, i) => .4 + i * (rmax - .4) / 119).filter(r => f(r) <= top); poly(rs.map(r => [X(r), Y(f(r))] as P2), c, 5, on(t0, t0 + 2)); };
    curve(r => 1 / r, 'accent', .6); curve(r => 1 / (r * r), 'cool', 2.8);
    label(X(3.2), Y(1 / 3.2) - 26 * k, 'V ∝ 1/r', 'accent', 30, {show: [1.8, 1e9]}); label(X(1.25), Y(1 / 1.56) + 4 * k, 'E ∝ 1/r²', 'cool', 30, {show: [4, 1e9], align: 'end'});
    facts.push('at twice the distance V is halved and E falls to a quarter');
    story = 'V falls as 1/r, E faster, as 1/r²'; second = 'Both vanish far away, but near the charge E rises more steeply';
  } else if (s.show === 'dipole') {
    const q = s.q ?? 1e-9, a = s.a ?? 0.01, r = s.r ?? 0.1, p = 2 * q * a, sweep = s.theta === undefined, c: P2 = [cx, cy + bh * .05], R = S * .38, ga = Math.max(30 * k, Math.min(R * .3, R * a / r)); dur = sweep ? 9 : 7;
    const Vof = (d: number) => K0 * p * Math.cos(rad(d)) / (r * r), TH = (t: number) => sweep ? Math.min(180, Math.max(0, (t - 1.5) / 6) * 180) : s.theta!;
    line([cx - bw * .46, c[1]], [cx + bw * .46, c[1]], 'faint', 2); charge(c[0] + ga, c[1], q, 18, '+q'); charge(c[0] - ga, c[1], -q, 18, '−q');
    if (sweep) ring(c, R, R, 'faint', 2, true);
    const px = (t: number) => c[0] + R * Math.cos(rad(TH(t))), py = (t: number) => c[1] - R * Math.sin(rad(TH(t)));
    props.push({id: 'P', type: 'circle', x: px(0), y: py(0), r: 9 * k, style: {fill: 'ink'}, layer: 3, keys: {x: keysOf(dur, px), y: keysOf(dur, py)}} as Prop);
    props.push({id: 'rl', type: 'line', x1: c[0], y1: c[1], x2: px(0), y2: py(0), style: {stroke: 'accent', width: 3 * k}, keys: {x2: keysOf(dur, px), y2: keysOf(dur, py)}} as Prop);
    if (sweep) for (const [d, tag] of [[0, 'axis: V largest'], [90, 'equator: V = 0'], [180, 'other side: V negative']] as [number, string][]) label(c[0] + (R + 10 * k) * Math.cos(rad(d)) * (d === 90 ? 0 : .72), c[1] - (R + 30 * k) * Math.sin(rad(d)) + (d === 90 ? 0 : 54 * k), tag, 'muted', 24, {show: [1.5 + d / 30, 1e9]});
    else show(c[0], by + bh * .96, `V = ${sci(Vof(s.theta!), 'V')}`, 2);
    facts.push(`p = 2qa = ${sci(p, 'C m')}`, `on the axis V = p/4πε₀r² = ${sci(Vof(0), 'V')}`, 'on the equator V = 0'); if (!sweep) facts.unshift(`at θ = ${s.theta}°, V = ${sci(Vof(s.theta!), 'V')}`);
    story = 'V = p cos θ / 4πε₀r²: it falls as 1/r² and depends on the direction'; second = 'Largest on the axis, zero on the equator, negative beyond it';
  } else if (s.show === 'system') {
    const cs = s.charges!, P = s.at!, far = Math.max(...[...cs.flatMap(c => [c.x, c.y]), ...P].map(Math.abs)), reach = Math.max(s.reach ?? 0, far * 1.4), ppm = S / 2 / reach, to = (x: number, y: number): P2 => [cx + x * ppm, cy - y * ppm], p = to(P[0], P[1]);
    const vs = cs.map(c => K0 * c.q / hyp(c.x - P[0], c.y - P[1])); dur = Math.max(7, 2 + cs.length * 1.2 + 2); let sum = 0;
    cs.forEach((c, i) => { const a = to(c.x, c.y), t0 = 1 + i * 1.2; charge(a[0], a[1], c.q, 20, c.name); line(a, p, 'faint', 3, on(t0)); sum += vs[i]; facts.push(`V from ${c.name ?? `charge ${i + 1}`} = ${sci(vs[i], 'V')}`); show(cx, by + bh * .97, `V = ${sci(sum, 'V')}`, t0 + .9, i === cs.length - 1 ? 1e9 : t0 + 2.1); });
    props.push({id: 'P', type: 'circle', x: p[0], y: p[1], r: 9 * k, style: {fill: 'ink'}, layer: 3} as Prop); label(p[0] + 20 * k, p[1] - 14 * k, 'P', 'ink', 26);
    facts.unshift(`V at P = ${sci(sum, 'V')}`); anchors.P = p; anchors.O = to(0, 0);
    story = 'Potentials add as plain numbers, each with its sign'; second = 'V is a scalar: no arrows to resolve, unlike the field';
  } else if (s.show === 'equipotentials') {
    dur = 7;
    if (s.uniform) {
      const E0 = s.E ?? 100, gap = s.dl ?? 0.5, xs = [.2, .5, .8].map(f => bx + bw * f);
      for (let i = 0; i < 7; i++) { const y = by + bh * (.08 + i * .14); arrow([bx, y], [bx + bw, y], 'accent', 3, on(.5, 2)); }
      xs.forEach((x, i) => { line([x, by], [x, by + bh], 'cool', 4, on(2 + i * .4)); if (!s.illustrative) label(x, by - 8 * k, `V${i ? ` − ${+(i * E0 * gap).toPrecision(3)}` : ''}`, 'cool', 26, {show: [2.5, 1e9]}); });
      facts.push(`δV = E δl = ${sci(E0 * gap, 'V')} across ${sci(gap, 'm')}`);
      story = 'In a uniform field the equipotentials are parallel planes, across the field'; second = 'Equally spaced surfaces step down by equal potentials';
    } else {
      const cs = s.charges!, far = Math.max(...cs.flatMap(c => [Math.abs(c.x), Math.abs(c.y)])), reach = Math.max(s.reach ?? 0, far ? far * 2.2 : .1), ppm = S / 2 / reach, xr = bw / 2 / ppm, yr = bh / 2 / ppm, to = (p: P2): P2 => [cx + p[0] * ppm, cy - p[1] * ppm];
      const V = (x: number, y: number) => potentialAt(cs, x, y), big = Math.max(...cs.map(c => K0 * Math.abs(c.q))) / reach, mixed = cs.some(c => c.q > 0) && cs.some(c => c.q < 0);
      const levels = [1.5, 2.3, 3.5, 6].map(f => f * big).flatMap(l => mixed ? [l, -l] : [cs[0].q > 0 ? l : -l]);
      if (mixed && Math.abs(cs.reduce((a, c) => a + c.q, 0)) < 1e-15) levels.push(1e-9 * big);
      levels.forEach(l => contour(V, l, xr, yr).forEach(path => poly(path.map(to), 'cool', 3, on(2.6, 4), false)));
      if (s.lines !== false) for (const path of traceLines(cs, reach, 12)) for (const inside of windowPieces(path, xr, yr)) { poly(inside.map(to), 'accent', 3, on(.5, 2.4)); const m = Math.floor(inside.length * .55); arrow(to(inside[m]), to(inside[Math.min(m + 2, inside.length - 1)]), 'accent', 3, {show: [2.4, 1e9]}); }
      cs.forEach(c => { const a = to([c.x, c.y]); charge(a[0], a[1], c.q, 20, c.name); });
      facts.push('no work is done moving a charge along an equipotential', 'field lines cross equipotentials at right angles');
      story = 'Each blue curve joins points of one potential; the field lines cross them at right angles'; second = 'Where the surfaces crowd, the field is strong';
    }
  } else if (s.show === 'gradient') {
    const dl = s.dl ?? 0.01, dV = Math.abs(s.dV ?? 10), V = s.V ?? 100, E0 = dV / dl, half = s.span ? Math.max(.05, .25 * dl / s.span) : .14, x1 = cx + bw * half, x2 = cx - bw * half; dur = 7;
    const surface = (x: number, c: string) => poly(Array.from({length: 41}, (_, i) => [x + bw * .05 * Math.sin(i / 40 * Math.PI), by + bh * (.05 + .9 * i / 40)] as P2), c, 5);
    surface(x1, 'cool'); surface(x2, 'bad');
    if (!s.illustrative) { label(Math.min(x2, cx - 110 * k), by + 4 * k, `V + δV = ${sci(V + dV, 'V')}`, 'bad', 26); label(Math.max(x1, cx + 110 * k), by + 4 * k, `V = ${sci(V, 'V')}`, 'cool', 26); }
    else { label(Math.min(x2, cx - 50 * k), by + 4 * k, 'V + δV', 'bad', 26); label(Math.max(x1, cx + 40 * k), by + 4 * k, 'V', 'cool', 26); }
    const mid = cy + bh * .02; line([x2 + bw * .05, mid + 64 * k], [x1 + bw * .05, mid + 64 * k], 'muted', 2); label(cx + bw * .05, mid + 100 * k, 'δl', 'muted', 28);
    arrow([x2 + bw * .05, mid], [x1 + bw * .05, mid], 'accent', s.span ? 3 + 6 * (s.dl0 ?? dl) / dl : 7, on(1.5, 2.6)); label(cx + bw * .05, mid - 22 * k, 'E', 'accent', 34, {show: [2.6, 1e9]});
    facts.push(`|E| = δV/δl = ${sci(E0, 'V/m')}`);
    story = 'E points from higher to lower potential, along the steepest drop'; second = 'E = −δV/δl: the closer the surfaces, the stronger the field';
  } else if (s.show === 'assemble') {
    const cs = s.charges!, far = Math.max(...cs.flatMap(c => [Math.abs(c.x), Math.abs(c.y)])), reach = Math.max(s.reach ?? 0, (far || .1) * 1.5), ppm = S / 2 / reach, to = (c: Charge): P2 => [cx + c.x * ppm, cy - c.y * ppm]; dur = 2 + cs.length * 2 + 2; let sum = 0;
    cs.forEach((c, i) => {
      const a = to(c), t0 = .6 + i * 2, fromX = bx + bw - 20 * k, xf = (t: number) => { const u = i === 0 ? 1 : Math.min(1, Math.max(0, (t - t0) / 1.2)); return fromX + (a[0] - fromX) * u * u * (3 - 2 * u); }, keys = {x: keysOf(dur, xf)};
      props.push({id: `c${i}`, type: 'circle', x: xf(0), y: a[1], r: 20 * k, style: {fill: c.q > 0 ? 'bad' : 'cool', stroke: 'ink', width: 2 * k}, layer: 3, show: [i ? t0 : 0, 1e9], keys} as Prop);
      props.push({id: `c${i}s`, type: 'text', x: xf(0), y: a[1] + 9 * k, text: c.q > 0 ? '+' : '−', size: 26 * k, weight: 700, align: 'middle', style: {fill: 'paper'}, layer: 4, show: [i ? t0 : 0, 1e9], keys} as Prop);
      if (c.name) label(a[0], a[1] - 34 * k, c.name, 'ink', 26, {show: [t0 + 1.2, 1e9]});
      cs.slice(0, i).forEach((o, j) => { const u = K0 * c.q * o.q / hyp(c.x - o.x, c.y - o.y); sum += u; line(a, to(o), u > 0 ? 'bad' : 'cool', 3, on(t0 + 1.2)); facts.push(`pair ${j + 1}-${i + 1}: ${sci(u, 'J')}`); });
      if (i) show(cx, by + bh * .97, `U = ${sci(sum, 'J')}`, t0 + 1.4, i === cs.length - 1 ? 1e9 : t0 + 2);
    });
    facts.unshift(`U = ${sci(sum, 'J')}${sum < 0 ? ': negative, the system is bound' : ''}`);
    story = 'Each new charge adds one term for every charge already there'; second = 'U sums over pairs, and the order of assembly does not matter';
  } else if (s.show === 'external') {
    const part = s.particle ?? 'electron', V = Math.abs(s.V ?? 1), q = part === 'electron' ? -QE : QE, dU = QE * V, tp = cx - bw * .36, bt = cx + bw * .36; dur = 7;
    const hiX = part === 'electron' ? bt : tp, loX = part === 'electron' ? tp : bt;
    line([hiX, by], [hiX, by + bh], 'bad', 12); line([loX, by], [loX, by + bh], 'cool', 12);
    if (!s.illustrative) { label(hiX, by - 8 * k, `+${sci(V, 'V')}`, 'bad', 26); label(loX, by - 8 * k, '0 V', 'cool', 26); }
    const u = (t: number) => { const f = Math.min(1, Math.max(0, (t - 1) / 4)); return f * f; }, X = (t: number) => loX + (hiX - loX) * u(t) * .94 + (hiX - loX) * .03;
    props.push({id: 'pt', type: 'circle', x: X(0), y: cy, r: 16 * k, style: {fill: q > 0 ? 'bad' : 'cool', stroke: 'ink', width: 2 * k}, layer: 3, keys: {x: keysOf(dur, X)}} as Prop);
    props.push({id: 'pts', type: 'text', x: X(0), y: cy + 7 * k, text: q > 0 ? '+' : '−', size: 22 * k, weight: 700, align: 'middle', style: {fill: 'paper'}, layer: 4, keys: {x: keysOf(dur, X)}} as Prop);
    facts.push(`gains ${sci(V, 'eV')} = ${sci(dU, 'J')}`, '1 eV = 1.6 × 10⁻¹⁹ J');
    story = `The ${part} falls through the potential difference and gains kinetic energy`; second = 'ΔU = qΔV; one electron volt is what an electron gains through one volt';
  } else {
    const p = s.p ?? 1e-29, E0 = s.E ?? 1e5, from = s.from ?? 180, to = s.to ?? 0, U = (d: number) => -p * E0 * Math.cos(rad(d)); dur = 8;
    const TH = (t: number) => from + (to - from) * (u => u * u * (3 - 2 * u))(Math.min(1, Math.max(0, (t - 1.2) / 5)));
    const lc: P2 = [bx + bw * .25, cy], L = S * .22; for (let i = 0; i < 6; i++) { const y = by + bh * (.08 + i * .17); arrow([bx, y], [bx + bw * .5, y], 'faint', 2.5); }
    label(bx + bw * .47, by + 10 * k, 'E', 'muted', 30);
    const px = (t: number, side: number) => lc[0] + side * L * Math.cos(rad(TH(t))), py = (t: number, side: number) => lc[1] - side * L * Math.sin(rad(TH(t)));
    props.push({id: 'rod', type: 'line', x1: px(0, -1), y1: py(0, -1), x2: px(0, 1), y2: py(0, 1), style: {stroke: 'ink', width: 4 * k}, layer: 2, keys: {x1: keysOf(dur, t => px(t, -1)), y1: keysOf(dur, t => py(t, -1)), x2: keysOf(dur, t => px(t, 1)), y2: keysOf(dur, t => py(t, 1))}} as Prop);
    for (const [side, f, id2] of [[1, 'bad', 'pos'], [-1, 'cool', 'neg']] as [number, string, string][]) props.push({id: id2, type: 'circle', x: px(0, side), y: py(0, side), r: 18 * k, style: {fill: f, stroke: 'ink', width: 2 * k}, layer: 3, keys: {x: keysOf(dur, t => px(t, side)), y: keysOf(dur, t => py(t, side))}} as Prop);
    const gx = bx + bw * .58, gw = bw * .4, gy = cy, gh = bh * .36, GX = (d: number) => gx + d / 180 * gw, GY = (d: number) => gy + Math.cos(rad(d)) * gh; // U = −pE cos θ: lowest at 0°
    line([gx, gy], [gx + gw, gy], 'ink', 2); line([gx, gy - gh], [gx, gy + gh], 'ink', 2); label(gx + gw, gy + 34 * k, 'θ', 'muted', 26); label(gx - 18 * k, gy - gh, 'U', 'muted', 26); label(gx + 2 * k, gy + gh + 30 * k, '0°', 'muted', 22); label(gx + gw, gy - gh - 10 * k, '180°', 'muted', 22);
    poly(Array.from({length: 61}, (_, i) => [GX(i * 3), GY(i * 3)] as P2), 'accent', 4);
    props.push({id: 'dot', type: 'circle', x: GX(TH(0)), y: GY(TH(0)), r: 10 * k, style: {fill: 'ink'}, layer: 3, keys: {x: keysOf(dur, t => GX(TH(t))), y: keysOf(dur, t => GY(TH(t)))}} as Prop);
    facts.push(`U = −pE cos θ: ${sci(U(from), 'J')} at ${from}°, ${sci(U(to), 'J')} at ${to}°`, `work to turn it from ${to}° to ${from}° = ${sci(U(from) - U(to), 'J')}`);
    story = 'U = −pE cos θ: least when p lies along E'; second = 'The dipole turns downhill on this curve, toward θ = 0';
  }
  return finish('potential', s as never, dur, story, second, facts, anchors, s.illustrative);
}

/** Compared gradients share one drawn gap, so surfaces further apart look further apart and their field thinner. */
export function sharePotentialScale(specs: unknown[]) {
  const pairs = (specs as PotentialSpec[]).filter(s => s?.verb === 'potential' && s.show === 'gradient');
  const gaps = pairs.map(s => s.dl ?? 0.01);
  if (new Set(gaps).size < 2) return;
  for (const s of pairs) { s.span = Math.max(...gaps); s.dl0 = Math.min(...gaps); }
}

/** Compared capacitors share one drawn gap, so a wider gap looks wider. */
export function shareCapacitorScale(specs: unknown[]) {
  const plates = (specs as CapacitorSpec[]).filter(s => s?.verb === 'capacitor' && (s.show === 'plates' || s.show === 'insert'));
  if (plates.length < 2) return;
  const span = Math.max(...plates.map(s => Math.max(s.d ?? 1e-3, s.d2 ?? 0)));
  for (const s of plates) s.span = span;
}

export function capacitor(s: CapacitorSpec): Scene {
  const {k, props, bx, by, bw, bh, cx, cy, S, on, arrow, line, poly, label, ring, keysOf, finish} = kit(s);
  const facts: string[] = [], anchors: Record<string, P2> = {}; let dur = 8, story = '', second = '';
  const signs = (x: number, y0: number, y1: number, n: number, sign: string, c: string, extra: Record<string, unknown> = {}) => { for (let i = 0; i < n; i++) label(x, y0 + (y1 - y0) * (i + .5) / n + 9 * k, sign, c, 28, extra); };

  if (s.show === 'conductor') {
    const kind = s.case ?? 'equilibrium', Rx = S * .42, Ry = S * .33, blob = (f = 1) => Array.from({length: 73}, (_, i) => { const a = i * Math.PI / 36, w = 1 + .13 * Math.sin(3 * a); return [cx + f * Rx * w * Math.cos(a), cy + f * Ry * w * Math.sin(a)] as P2; });
    if (kind === 'external') {
      const R = S * .3, E0 = 7; dur = 8; ring([cx, cy], R, R, 'ink', 5);
      for (let i = 0; i < E0; i++) { const y = cy + (i - 3) * bh * .13, h = Math.abs(y - cy), gap = h < R ? Math.sqrt(R * R - h * h) : -1; if (gap > 0) { arrow([bx, y], [cx - gap, y], 'accent', 3, on(.5, 2)); arrow([cx + gap, y], [bx + bw, y], 'accent', 3, on(.5, 2)); label(cx - gap + 18 * k, y + 9 * k, '−', 'cool', 30, {show: [2.2, 1e9]}); label(cx + gap - 18 * k, y + 9 * k, '+', 'bad', 30, {show: [2.2, 1e9]}); } else arrow([bx, y], [bx + bw, y], 'accent', 3, on(.5, 2)); }
      label(cx, cy + 10 * k, 'E = 0', 'good', 34, {show: [3.5, 1e9]});
      facts.push('inside a conductor in a field, E = 0', 'the induced charge sits on the surface and its field cancels the outside one');
      story = 'Charges move until their own field cancels the outside one inside'; second = 'The field lines end on the surface and start again beyond it, at right angles';
    } else if (kind === 'cavity') {
      poly(blob(), 'ink', 5); poly(blob(.45), 'muted', 4); label(cx, cy + 10 * k, 'E = 0', 'good', 34, {show: [2.5, 1e9]});
      const o = blob(); for (let i = 0; i < 12; i++) { const p = o[i * 6]; label(p[0], p[1] + 9 * k, '+', 'bad', 28, {show: [1, 1e9]}); }
      for (let i = 0; i < 12; i++) { const a = o[i * 6], d = hyp(a[0] - cx, a[1] - cy), u = [(a[0] - cx) / d, (a[1] - cy) / d]; arrow([a[0] + u[0] * 22 * k, a[1] + u[1] * 22 * k], [a[0] + u[0] * 74 * k, a[1] + u[1] * 74 * k], 'accent', 3, on(1.5)); }
      facts.push('E = 0 inside a cavity with no charge in it, whatever the field outside', 'this is electrostatic shielding');
      story = 'All the charge stays on the outer surface; the cavity feels no field'; second = 'Electrostatic shielding: a sensitive instrument inside a metal box is protected';
    } else if (kind === 'pillbox') {
      const sigma = s.sigma ?? 1e-6, y = cy + bh * .12, w = bw * .13, hh = bh * .16; dur = 7;
      props.push({id: 'metal', type: 'rect', x: bx, y, w: bw, h: by + bh - y, style: {fill: 'faint', stroke: 'ink', width: 3 * k}} as Prop);
      for (let i = 0; i < 12; i++) label(bx + bw * (i + .5) / 12, y + 2 * k, '+', 'bad', 28);
      props.push({id: 'pill', type: 'rect', x: cx - w, y: y - hh, w: 2 * w, h: 2 * hh, style: {stroke: 'good', width: 3 * k, fill: 'none', dash: [10 * k, 8 * k]}, show: [1, 1e9]} as Prop);
      arrow([cx, y - hh], [cx, y - hh - bh * .24], 'accent', 6, on(2)); label(cx + 28 * k, y - hh - bh * .2, 'E', 'accent', 32, {show: [2.8, 1e9]}); label(cx, y + hh + 34 * k, 'E = 0', 'good', 28, {show: [3, 1e9]});
      facts.push(`E = σ/ε₀ = ${sci(sigma / EPS0, 'N/C')} at the surface`);
      story = 'Only the outer face of the pill box carries flux'; second = 'E δS = σ δS/ε₀, so E = σ/ε₀, normal to the surface';
    } else {
      poly(blob(), 'ink', 5); const o = blob(); dur = 7;
      for (let i = 0; i < 12; i++) { const a = o[i * 6], d = hyp(a[0] - cx, a[1] - cy), u = [(a[0] - cx) / d, (a[1] - cy) / d]; label(a[0], a[1] + 9 * k, '+', 'bad', 28, {show: [1, 1e9]}); arrow([a[0] + u[0] * 22 * k, a[1] + u[1] * 22 * k], [a[0] + u[0] * 80 * k, a[1] + u[1] * 80 * k], 'accent', 3, on(2)); }
      label(cx, cy - 20 * k, 'E = 0, no net charge', 'good', 30, {show: [3, 1e9]}); label(cx, cy + 28 * k, 'V is the same throughout', 'muted', 26, {show: [4, 1e9]});
      facts.push('inside: E = 0 and no net charge', 'all excess charge is on the surface; E is normal to it', 'the whole conductor is one equipotential');
      story = 'In equilibrium a conductor has no field inside and its charge on the surface'; second = 'E leaves the surface at right angles, and V is the same everywhere in it';
    }
  } else if (s.show === 'dielectric') {
    const polar = s.molecules !== 'nonpolar', K = s.K ?? 3, x0 = bx + bw * .14, x1 = bx + bw * .86, y0 = by + bh * .14, y1 = by + bh * .86, cols = 6, rows = 5, on0 = 2.5; dur = 8;
    props.push({id: 'block', type: 'rect', x: x0, y: y0, w: x1 - x0, h: y1 - y0, r: 8 * k, style: {fill: 'faint', stroke: 'muted', width: 3 * k}} as Prop);
    for (let i = 0; i < 7; i++) { const y = by + bh * (.05 + i * .15); arrow([bx, y], [bx + bw, y], 'accent', 3, on(on0, on0 + 1)); }
    label(bx + 26 * k, by - 6 * k, 'E₀', 'accent', 30, {show: [on0, 1e9]});
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const mx = x0 + (x1 - x0) * (i + .5) / cols, my = y0 + (y1 - y0) * (j + .5) / rows, L = S * .045, ang0 = ((i * 7 + j * 13) % 12) * 30, ang = (t: number) => { const u = Math.min(1, Math.max(0, (t - on0) / 2)); return ang0 * (1 - u); };
      const sep = (t: number) => polar ? L : L * Math.min(1, Math.max(0, (t - on0) / 2));
      const ex = (t: number, side: number) => mx + side * sep(t) * Math.cos(rad(polar ? ang(t) : 0)), ey = (t: number, side: number) => my - side * sep(t) * Math.sin(rad(polar ? ang(t) : 0));
      for (const [side, f] of [[1, 'bad'], [-1, 'cool']] as [number, string][]) props.push({id: `m${i}_${j}_${side}`, type: 'circle', x: ex(0, side), y: ey(0, side), r: 9 * k, style: {fill: f}, layer: 3, keys: {x: keysOf(dur, t => ex(t, side), 12), y: keysOf(dur, t => ey(t, side), 12)}} as Prop);
    }
    signs(x0 - 22 * k, y0, y1, 6, '−', 'cool', {show: [on0 + 2.2, 1e9]}); signs(x1 + 22 * k, y0, y1, 6, '+', 'bad', {show: [on0 + 2.2, 1e9]});
    facts.push(`E = E₀/K: with K = ${K}, ${+(100 / K).toPrecision(3)}% of it survives`, 'polarisation P = χₑE');
    story = polar ? 'Polar molecules have dipoles already: a field lines them up' : 'Non-polar molecules have none: a field pulls charge apart and makes them'; second = 'Only the surfaces end up charged, and that reduces the field without cancelling it';
  } else if (s.show === 'plates' || s.show === 'insert') {
    const A = s.A ?? 1e-2, d = s.d ?? 1e-3, C0 = EPS0 * A / d, V0 = s.V ?? (s.Q ? s.Q / C0 : 100), Q0 = s.Q ?? C0 * V0, insert = s.show === 'insert', K = s.K ?? 3, battery = s.battery ?? true, d2 = insert ? undefined : s.d2, t = insert ? s.thickness : undefined, part = t ? t / d : 1;
    const span = s.span ?? Math.max(d, d2 ?? 0), gapOf = (x: number) => bw * .62 * x / span, gap = gapOf(d), gap2 = d2 ? gapOf(d2) : gap, xm = cx, ph = bh * .78, y0 = cy - ph / 2, moved = (t: number) => d2 ? gap + (gap2 - gap) * Math.min(1, Math.max(0, (t - 3) / 2)) : gap; dur = insert || d2 ? 9 : 7;
    const lx = (t: number) => xm - moved(t) / 2, rx = (t: number) => xm + moved(t) / 2;
    const plate = (name: string, xf: (t: number) => number, c: string) => props.push({id: name, type: 'rect', x: xf(0) - 7 * k, y: y0, w: 14 * k, h: ph, style: {fill: c}, layer: 3, keys: {x: keysOf(dur, t => xf(t) - 7 * k)}} as Prop);
    plate('plus', lx, 'bad'); plate('minus', rx, 'cool');
    for (let i = 0; i < 7; i++) { const y = y0 + ph * (i + .5) / 7; props.push({id: `ps${i}`, type: 'text', x: lx(0) - 26 * k, y: y + 9 * k, text: '+', size: 28 * k, weight: 700, align: 'middle', style: {fill: 'bad'}, layer: 3, keys: {x: keysOf(dur, t => lx(t) - 26 * k)}} as Prop); props.push({id: `ns${i}`, type: 'text', x: rx(0) + 26 * k, y: y + 9 * k, text: '−', size: 28 * k, weight: 700, align: 'middle', style: {fill: 'cool'}, layer: 3, keys: {x: keysOf(dur, t => rx(t) + 26 * k)}} as Prop); }
    const arrows = (a: number, width: number, stroke: string, show: [number, number]) => { for (let i = 0; i < 5; i++) { const y = y0 + ph * (i + .75) / 6; props.push({id: `E${a}_${i}${width}`, type: 'arrow', x1: lx(0) + 12 * k, y1: y, x2: rx(0) - 12 * k, y2: y, head: 14 * k, style: {stroke, width: width * k}, show, layer: 2, keys: {x1: keysOf(dur, t => lx(t) + 12 * k), x2: keysOf(dur, t => rx(t) - 12 * k)}} as Prop); } };
    if (insert) {
      const end = lx(0) + 10 * k, slabW = (gap - 20 * k) * part, H = (t: number) => ph * .96 * (u => u * u * (3 - 2 * u))(Math.min(1, Math.max(0, (t - 2.5) / 2.2))); // slides down between the plates
      props.push({id: 'slab', type: 'rect', x: end, y: y0 + ph * .02, w: slabW, h: 0, r: 6 * k, style: {fill: 'faint', stroke: 'muted', width: 3 * k}, layer: 1, keys: {h: keysOf(dur, H)}} as Prop);
      if (t) { // a slab thinner than the gap: E is K times less in the slab than in the air, and the gap's own field depends on the battery
        arrows(1, battery ? 4 : 6, 'accent', [.8, 4.7]);
        for (let i = 0; i < 5; i++) { const y = y0 + ph * (i + .75) / 6, edge = end + slabW; arrow([lx(0) + 12 * k, y], [edge, y], 'accent', 2, {show: [4.7, 1e9], head: 10 * k}); arrow([edge, y], [rx(0) - 12 * k, y], 'accent', battery ? 7 : 6, {show: [4.7, 1e9]}); }
      } else if (battery) arrows(1, 5, 'accent', [.8, 1e9]); else { arrows(1, 6, 'accent', [.8, 4.7]); arrows(2, 2.5, 'accent', [4.7, 1e9]); } // V/d is held with the battery on; alone, E falls K times
      label(end + slabW / 2, y0 - 10 * k, `K${s.illustrative ? '' : ` = ${K}`}`, 'muted', 28, {show: [4.7, 1e9]});
      const C = t ? EPS0 * A / (d - t + t / K) : K * C0, Q = battery ? C * V0 : Q0, V = battery ? V0 : Q0 / C;
      if (t) { anchors.slab = [end + slabW / 2, cy]; anchors.air = [(end + slabW + rx(0)) / 2, y0 + ph + 34 * k]; facts.push(`C = ε₀A/(d − t + t/K): ${farad(C0)} rises to ${farad(C)}`, `E in the air ${sci(V / (d - t + t / K), 'V/m')}, in the slab ${sci(V / (d - t + t / K) / K, 'V/m')}`, battery ? `V held at ${sci(V0, 'V')}` : `Q held at ${sci(Q0, 'C')}: V falls from ${sci(V0, 'V')} to ${sci(V, 'V')}`); }
      else facts.push(`C = Kε₀A/d: ${farad(C0)} rises to ${farad(C)}`, battery ? `V held at ${sci(V0, 'V')}: Q rises from ${sci(Q0, 'C')} to ${sci(Q, 'C')}` : `Q held at ${sci(Q0, 'C')}: V falls from ${sci(V0, 'V')} to ${sci(V, 'V')}`, battery ? `E between the plates stays V/d = ${sci(V0 / d, 'V/m')}` : `E falls by a factor of ${K}`);
      story = battery ? 'With the battery on, V stays and more charge flows on' : 'Disconnected, Q stays and the potential difference falls'; second = t ? 'E is K times less in the slab than in the air; C grows, by less than K' : battery ? 'E stays V/d; the extra charge makes up for the slab. C grows K times' : 'E falls K times with V. C grows K times';
    } else {
      arrows(1, 4, 'accent', [.8, 1e9]);
      label(xm, y0 + ph + 34 * k, 'E', 'accent', 30, {show: [1.2, 1e9]});
      facts.push(`C = ε₀A/d = ${farad(C0)}`, `E = σ/ε₀ = V/d = ${sci(V0 / d, 'V/m')}`, `σ = Q/A = ${sci(Q0 / A, 'C/m²')}`);
      if (d2) { const C2 = EPS0 * A / d2; facts.push(`at d = ${sci(d2, 'm')}: C = ${farad(C2)}, V = ${sci(Q0 / C2, 'V')}, E unchanged`); }
      story = d2 ? 'With Q fixed, moving the plate changes V and C, not E' : 'Q on the plates, V across them: C = Q/V depends only on the shape, here ε₀A/d'; second = 'The field is uniform between the plates and vanishes outside';
    }
    anchors.plus = [lx(0), cy]; anchors.minus = [rx(0), cy];
  } else if (s.show === 'combine') {
    const caps = s.caps ?? [1e-6, 2e-6], series = s.kind === 'series', V = s.V ?? 100, n = caps.length, branch = series ? seriesC(caps) : caps.reduce((a, c) => a + c, 0), Ceq = branch + (s.across ?? 0); dur = 9;
    const symbol = (x: number, y: number, c: string, show: [number, number] = [0, 1e9], tag?: string, tall = 34 * k, beside = false) => { line([x - 10 * k, y - tall], [x - 10 * k, y + tall], c, 6, {show}); line([x + 10 * k, y - tall], [x + 10 * k, y + tall], c, 6, {show}); if (tag) label(beside ? x + 80 * k : x, beside ? y - 16 * k : y + 66 * k, tag, 'ink', 24, {show}); };
    const x0 = bx + bw * .08, x1 = bx + bw * .92, last: [number, number] = s.reduce ? [0, 4.8] : [0, 1e9], yt = cy - bh * .26, yb = cy + bh * .3, wire = (p: P2, q: P2, show: [number, number] = last) => line(p, q, 'muted', 3, {show});
    line([x0, yb], [cx - 34 * k, yb], 'muted', 3); line([cx + 34 * k, yb], [x1, yb], 'muted', 3); line([cx - 12 * k, yb - 26 * k], [cx - 12 * k, yb + 26 * k], 'ink', 4); line([cx + 12 * k, yb - 14 * k], [cx + 12 * k, yb + 14 * k], 'ink', 4);
    if (!s.illustrative) label(cx, yb + 62 * k, sci(V, 'V'), 'muted', 26);
    wire([x0, yb], [x0, yt], [0, 1e9]); wire([x1, yb], [x1, yt], [0, 1e9]);
    if (series) {
      const step = (x1 - x0) / n; let xp = x0, y = s.across ? cy - bh * .36 : yt;
      caps.forEach((c, i) => { const x = x0 + step * (i + .5); symbol(x, y, 'accent', last, s.illustrative ? `C${i + 1}` : farad(c)); wire([xp, y], [x - 10 * k, y]); xp = x + 10 * k; });
      wire([xp, y], [x1, y]);
      if (s.across) { const y2 = cy - bh * .02; wire([x0, y2], [cx - 10 * k, y2]); wire([cx + 10 * k, y2], [x1, y2]); symbol(cx, y2, 'cool', last, s.illustrative ? 'C' : farad(s.across)); wire([x0, y2], [x0, y]); wire([x1, y2], [x1, y]); }
      const Q = branch * V; caps.forEach((c, i) => facts.push(`C${i + 1}: Q = ${sci(Q, 'C')}, V = ${sci(Q / c, 'V')}`)); if (s.across) facts.push(`across the branch: Q = ${sci(s.across * V, 'C')}`);
      story = 'In series every capacitor carries the same charge; the voltages add'; second = '1/C = 1/C₁ + 1/C₂ + ...: less than the smallest';
    } else {
      const pitch = (bh * .7 - 48 * k) / Math.max(n - 1, 1) * (n > 1 ? .9 : 1), ys = caps.map((_, i) => cy - bh * .4 + pitch * i), tall = Math.min(34 * k, pitch * .36); // rows stay clear of each other and of the battery
      ys.forEach((y, i) => { symbol(cx, y, 'accent', last, s.illustrative ? `C${i + 1}` : farad(caps[i]), tall, true); wire([x0, y], [cx - 10 * k, y]); wire([cx + 10 * k, y], [x1, y]); }); wire([x0, ys[0]], [x0, ys[n - 1]]); wire([x1, ys[0]], [x1, ys[n - 1]]);
      caps.forEach((c, i) => facts.push(`C${i + 1}: Q = ${sci(c * V, 'C')}, V = ${sci(V, 'V')}`));
      story = 'In parallel every capacitor has the same voltage; the charges add'; second = 'C = C₁ + C₂ + ...: more than the largest';
    }
    if (s.reduce) { const after: [number, number] = [4.8, 1e9]; wire([x0, yt], [cx - 10 * k, yt], after); wire([cx + 10 * k, yt], [x1, yt], after); symbol(cx, yt, 'good', after, s.illustrative ? 'C equivalent' : `C = ${farad(Ceq)}`); }
    facts.unshift(`equivalent C = ${farad(Ceq)}`);
  } else {
    const C = s.C ?? 1e-9, V = s.V ?? 100, Q = C * V, U = .5 * C * V * V, d = s.d ?? 1e-3, u = .5 * EPS0 * (V / d) ** 2, T0 = .8, T1 = 6, frac = (t: number) => Math.min(1, Math.max(0, (t - T0) / (T1 - T0))); dur = 8;
    const lx = bx + bw * .1, rx = bx + bw * .34, y0 = by + bh * .1, ph = bh * .8; line([lx, y0], [lx, y0 + ph], 'bad', 12); line([rx, y0], [rx, y0 + ph], 'cool', 12);
    for (let i = 0; i < 6; i++) { const t0 = T0 + i * (T1 - T0) / 6, t1 = t0 + (T1 - T0) / 6, y = y0 + ph * (i + .5) / 6, X = (t: number) => { const f = Math.min(1, Math.max(0, (t - t0) / (t1 - t0))); return rx + (lx - rx) * f; };
      props.push({id: `dq${i}`, type: 'circle', x: rx, y, r: 11 * k, style: {fill: 'bad'}, layer: 3, show: [t0, 1e9], keys: {x: keysOf(dur, X)}} as Prop); props.push({id: `ne${i}`, type: 'text', x: rx + 26 * k, y: y + 9 * k, text: '−', size: 28 * k, weight: 700, align: 'middle', style: {fill: 'cool'}, show: [t1, 1e9]} as Prop); }
    const gx = bx + bw * .5, gy = by + bh * .9, gw = bw * .44, gh = bh * .72; line([gx, gy], [gx + gw, gy], 'ink', 3); line([gx, gy], [gx, gy - gh], 'ink', 3); label(gx + gw, gy + 36 * k, 'Q', 'muted', 28); label(gx - 20 * k, gy - gh, 'V', 'muted', 28);
    props.push({id: 'tri', type: 'line', x1: gx, y1: gy, x2: gx, y2: gy, style: {stroke: 'accent', width: 5 * k}, layer: 2, keys: {x2: keysOf(dur, t => gx + frac(t) * gw), y2: keysOf(dur, t => gy - frac(t) * gh)}} as Prop);
    poly([[gx, gy], [gx + gw, gy - gh], [gx + gw, gy], [gx, gy]], 'accent', 2, {show: [T1, 1e9], style: {stroke: 'accent', width: 2 * k, fill: 'faint'}});
    label(gx + gw * .68, gy - 30 * k, '½QV', 'accent', 32, {show: [T1 + .2, 1e9]});
    facts.push(`U = Q²/2C = ½CV² = ${sci(U, 'J')}`, `Q = CV = ${sci(Q, 'C')}`, `u = ½ε₀E² = ${sci(u, 'J/m³')} at d = ${sci(d, 'm')}`);
    story = 'Each new bit of charge is moved against a larger V, so the work is ½QV, not QV'; second = 'The energy lives in the field between the plates: u = ½ε₀E²';
  }
  return finish('capacitor', s as never, dur, story, second, facts, anchors, s.illustrative);
}
