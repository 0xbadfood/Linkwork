// electric: electrostatics, computed (NCERT Class 12 Physics, Ch. 1 Electric Charges and Fields; 2026-11-02). Every arrow and
// field line comes from Coulomb's law; numbers are read from the same calculation, in SI.
//   rubbing      electrons pass from one body to the other: equal and opposite charge, none made (conservation)
//   pith         two hung charged balls: like repel, unlike attract
//   electroscope a charged rod touches the knob; the leaves diverge with the charge
//   induction    a charged rod near a neutral sphere: the sphere's charges separate, near side opposite
//   coulomb      two charges and the equal, opposite forces; `r2` moves them to another distance, arrows to one scale
//   superposition the force or field at a point from each charge, and their vector sum; `arrows: false` only sets the charges out
//   resultants   the net force on every charge of a system, then those forces placed tip to tail: they close, sum zero
//   share        Coulomb's method: a charged sphere touched by identical uncharged ones, q → q/2 → q/4
//   lines        field lines traced from the charges; count ∝ charge; `rings` shows them thinning with distance;
//                `elements` sets small areas normal to the lines and marks each line that cuts them
//   plates       uniform field between plates and a charged particle released in it
//   flux         a flat area in a uniform field: only its part across the field counts, φ = EA cos θ
//   dipole       field of a dipole at a point on its axis and on its equator
//   torque       dipole in a uniform field turns to align (τ = pE sin θ); `nonuniform` shows the net force
//   gauss        a Gaussian surface round a point, wire, plane, shell or a cylinder in a uniform field
//   profile      E against r for a point, wire, plane or shell
//   density      λ, σ, ρ: a small element of a line, a surface, a volume
import type {Key} from '../keys.ts';
import type {Plane} from '../plane.ts';
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {panel, scene} from './calculus.ts';
import {frame} from './vectors.ts';

type P2 = [number, number];
type Charge = {q: number; x: number; y: number; name?: string};
export const ELECTRIC_SHOWS = ['rubbing', 'pith', 'electroscope', 'induction', 'coulomb', 'superposition', 'lines', 'plates', 'flux', 'dipole', 'torque', 'gauss', 'profile', 'density', 'resultants', 'share'] as const;
export type ElectricSpec = {verb: 'electric'; show: (typeof ELECTRIC_SHOWS)[number]; q?: number; q1?: number; q2?: number; r?: number; r2?: number; charges?: Charge[];
  at?: [number, number]; quantity?: 'force' | 'field'; test?: number; on?: number; reach?: number; full?: number; rings?: boolean;
  E?: number; d?: number; particle?: 'electron' | 'proton'; field?: 'up' | 'down' | 'uniform' | 'nonuniform'; v0?: number; A?: number; theta?: number; a?: number; place?: 'axis' | 'equator' | 'both';
  system?: 'point' | 'wire' | 'plane' | 'shell' | 'cylinder'; R?: number; lambda?: number; sigma?: number; inside?: boolean; outside?: boolean; kind?: 'line' | 'surface' | 'volume'; sign?: 1 | -1; like?: boolean;
  arrows?: boolean; close?: boolean; touches?: number; elements?: {at: [number, number]; name?: string}[]; size?: number; per?: number;
  title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean;
  span?: number; closest?: number}; // set by shareElectricScale: the largest distance or radius among compared panels, and the closest unlike pair

const K = 8.988e9, EPS0 = 8.854e-12, QE = 1.602e-19, ME = 9.11e-31, MP = 1.673e-27;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
/** 3.2 × 10⁻⁷ for the very large and small, otherwise plain; three figures. */
export function sci(v: number, unit = ''): string {
  const a = Math.abs(v), u = unit ? ' ' + unit : '';
  if (a === 0) return `0${u}`;
  if (a >= 0.01 && a < 10000) return `${+v.toPrecision(3)}${u}`;
  const e = Math.floor(Math.log10(a)), m = +(v / 10 ** e).toPrecision(3);
  const pow = (e < 0 ? '⁻' : '') + String(Math.abs(e)).split('').map(d => SUP[+d]).join('');
  return `${m} × 10${pow}${u}`;
}
const hyp = (x: number, y: number) => Math.sqrt(x * x + y * y);

/** The field of the charges at (x, y), by Coulomb's law. */
export function fieldAt(cs: Charge[], x: number, y: number): P2 {
  let ex = 0, ey = 0;
  for (const c of cs) { const dx = x - c.x, dy = y - c.y, r = hyp(dx, dy); if (r < 1e-12) continue; const m = K * c.q / (r * r * r); ex += m * dx; ey += m * dy; }
  return [ex, ey];
}

/** Lines start on positive charges in number ∝ q and run with the field; with only negative charges, they run in to them. */
/** A traced line cut to the window: a line leaving it and coming back is two pieces, not a chord across the gap. */
export function windowPieces(line: P2[], xr: number, yr: number): P2[][] {
  const pieces: P2[][] = [[]];
  for (const p of line) { if (Math.abs(p[0]) <= xr && Math.abs(p[1]) <= yr) pieces[pieces.length - 1].push(p); else if (pieces[pieces.length - 1].length) pieces.push([]); }
  return pieces.filter(p => p.length >= 3);
}

export function traceLines(cs: Charge[], reach: number, per = 12): P2[][] {
  const pos = cs.filter(c => c.q > 0), reversed = !pos.length, starts = reversed ? cs : pos, top = Math.max(...cs.map(c => Math.abs(c.q)));
  const step = reach / 90, near = reach * 0.035, out: P2[][] = [];
  for (const c of starts) {
    const n = Math.max(2, Math.round(per * Math.abs(c.q) / top));
    for (let i = 0; i < n; i++) {
      const th = 2 * Math.PI * i / n;
      let x = c.x + near * Math.cos(th), y = c.y + near * Math.sin(th); const line: P2[] = [[x, y]];
      for (let s = 0; s < 700; s++) {
        const dir = (px: number, py: number): P2 => { const [ex, ey] = fieldAt(cs, px, py), m = hyp(ex, ey) || 1; return [(reversed ? -1 : 1) * ex / m, (reversed ? -1 : 1) * ey / m]; };
        const a = dir(x, y), b = dir(x + a[0] * step / 2, y + a[1] * step / 2);
        x += b[0] * step; y += b[1] * step; line.push([x, y]);
        if (Math.abs(x) > 1.35 * reach || Math.abs(y) > 1.35 * reach) break;
        if (cs.some(o => o.q < 0 && hyp(x - o.x, y - o.y) < near)) break;
      }
      out.push(reversed ? line.reverse() : line);
    }
  }
  // with both signs, lines also come in from afar to a negative charge: traced back from it, dropped if they reach a positive one (already drawn)
  if (!reversed) for (const c of cs.filter(o => o.q < 0)) {
    const n = Math.max(2, Math.round(per * Math.abs(c.q) / top));
    for (let i = 0; i < n; i++) {
      const th = 2 * Math.PI * i / n; let x = c.x + near * Math.cos(th), y = c.y + near * Math.sin(th), hit = false; const line: P2[] = [[x, y]];
      for (let s = 0; s < 700 && !hit; s++) {
        const [ex, ey] = fieldAt(cs, x, y), m = hyp(ex, ey) || 1; x -= step * ex / m; y -= step * ey / m; line.push([x, y]);
        if (Math.abs(x) > 1.35 * reach || Math.abs(y) > 1.35 * reach) break;
        hit = pos.some(o => hyp(x - o.x, y - o.y) < near);
      }
      if (!hit) out.push(line.reverse());
    }
  }
  return out;
}

/** The net Coulomb force on each charge from all the others (N). */
export function netForces(cs: Charge[]): P2[] {
  return cs.map(c => { const [ex, ey] = fieldAt(cs.filter(o => o !== c), c.x, c.y); return [c.q * ex, c.q * ey] as P2; });
}
/** Does segment ab cross segment cd? */
const crosses = (a: P2, b: P2, c: P2, d: P2) => { const o = (p: P2, q: P2, r: P2) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b); };
/** Where segment ab meets cd (they cross). */
const meet = (a: P2, b: P2, c: P2, d: P2): P2 => { const r: P2 = [b[0] - a[0], b[1] - a[1]], q: P2 = [d[0] - c[0], d[1] - c[1]], den = r[0] * q[1] - r[1] * q[0], u = ((c[0] - a[0]) * q[1] - (c[1] - a[1]) * q[0]) / den; return [a[0] + u * r[0], a[1] + u * r[1]]; };
const SUB = '₀₁₂₃₄₅₆₇₈₉';

export function electricErrors(s: ElectricSpec): string[] {
  const e: string[] = [], W = 'electric';
  if (!ELECTRIC_SHOWS.includes(s.show)) return [`${W}: show is one of ${ELECTRIC_SHOWS.join(', ')}`];
  for (const n of ['r', 'r2', 'E', 'd', 'A', 'a', 'R', 'reach', 'full', 'v0', 'size'] as const) if (s[n] !== undefined && !(isNum(s[n]) && s[n]! > 0)) e.push(`${W}: ${n} is above 0, in SI units`);
  for (const n of ['q', 'q1', 'q2', 'test', 'lambda', 'sigma'] as const) if (s[n] !== undefined && !(isNum(s[n]) && s[n] !== 0)) e.push(`${W}: ${n} is a number in SI units, not 0; its sign is the charge's`);
  if (s.theta !== undefined && !(isNum(s.theta) && s.theta >= 0 && s.theta <= 180)) e.push(`${W}: theta is 0 to 180 degrees`);
  if (s.charges !== undefined) {
    if (!Array.isArray(s.charges) || s.charges.length < 1 || s.charges.length > 6 || s.charges.some(c => !isNum(c?.q) || c.q === 0 || !isNum(c?.x) || !isNum(c?.y))) e.push(`${W}: charges is 1 to 6 of {q (C, not 0), x (m), y (m), name}`);
    else for (let i = 0; i < s.charges.length; i++) for (let j = 0; j < i; j++) if (hyp(s.charges[i].x - s.charges[j].x, s.charges[i].y - s.charges[j].y) === 0) e.push(`${W}: two charges at one point`);
  }
  if (s.show === 'superposition' || s.show === 'lines') { if (!s.charges) e.push(`${W}: ${s.show} needs charges: [{q, x, y}]`); }
  if (s.show === 'superposition' && s.charges && !e.length) {
    if (s.on !== undefined && !(Number.isInteger(s.on) && s.on >= 0 && s.on < s.charges.length)) e.push(`${W}: on is the index of one of the charges`);
    if (s.on === undefined && s.arrows !== false && !(Array.isArray(s.at) && isNum(s.at[0]) && isNum(s.at[1]))) e.push(`${W}: superposition needs at: [x, y] (m), or on: the index of a charge`);
    if (s.on === undefined && s.at && s.charges.some(c => hyp(c.x - s.at![0], c.y - s.at![1]) === 0)) e.push(`${W}: at is on a charge, where the field has no meaning; use on`);
    if (s.on !== undefined && s.charges.length < 2) e.push(`${W}: the force on a charge needs another charge`);
  }
  if (s.show === 'coulomb' && !s.illustrative && (s.q1 === undefined || s.q2 === undefined || s.r === undefined)) e.push(`${W}: coulomb needs q1, q2 (C) and r (m); or set illustrative: true`);
  if (s.show === 'coulomb' && s.r !== undefined && s.r2 !== undefined && Math.max(s.r / s.r2, s.r2 / s.r) > 4) e.push(`${W}: r2 within 4 times r, or the smaller force's arrow cannot be seen`);
  if (s.show === 'plates' && s.particle !== undefined && !['electron', 'proton'].includes(s.particle)) e.push(`${W}: particle is electron or proton`);
  if (s.show === 'plates' && !s.illustrative && (s.E === undefined || s.d === undefined)) e.push(`${W}: plates needs E (N/C) and d, the distance it falls (m); or set illustrative: true`);
  if (s.show === 'dipole' && !s.illustrative && (s.q === undefined || s.a === undefined || s.r === undefined)) e.push(`${W}: dipole needs q (C), a (half the separation, m) and r (m); or set illustrative: true`);
  if (s.show === 'dipole' && s.a !== undefined && s.r !== undefined && s.r <= s.a) e.push(`${W}: r must be more than a, outside the dipole`);
  if (s.show === 'torque' && s.field === 'nonuniform' && s.theta !== undefined && s.theta !== 0 && s.theta !== 180) e.push(`${W}: in a nonuniform field theta is 0 (along it) or 180 (against it)`);
  if (s.system !== undefined && !['point', 'wire', 'plane', 'shell', 'cylinder'].includes(s.system)) e.push(`${W}: system is point, wire, plane, shell or cylinder`);
  if ((s.show === 'gauss' || s.show === 'profile') && !s.system) e.push(`${W}: ${s.show} needs system: point, wire, plane or shell`);
  if (s.show === 'profile' && s.system === 'cylinder') e.push(`${W}: profile has no cylinder; use point, wire, plane or shell`);
  for (const n of ['arrows', 'close'] as const) if (s[n] !== undefined && typeof s[n] !== 'boolean') e.push(`${W}: ${n} is true or false`);
  if (s.arrows !== undefined && s.show !== 'superposition') e.push(`${W}: arrows goes with show superposition (false sets out the charges with no arrows yet)`);
  if (s.close !== undefined && s.show !== 'resultants') e.push(`${W}: close goes with show resultants`);
  if (s.show === 'resultants') { if (!s.charges) e.push(`${W}: resultants needs charges: 2 to 6 of {q, x, y, name}`); else if (Array.isArray(s.charges) && s.charges.length < 2) e.push(`${W}: resultants needs at least two charges: one alone feels no force`); }
  if (s.touches !== undefined && (s.show !== 'share' || !(Number.isInteger(s.touches) && s.touches >= 1 && s.touches <= 3))) e.push(`${W}: touches is 1 to 3 (show share): how many identical uncharged spheres touch the charged one in turn`);
  if (s.per !== undefined && (s.show !== 'lines' || !(Number.isInteger(s.per) && s.per >= 4 && s.per <= 36))) e.push(`${W}: per is 4 to 36 (show lines): the lines leaving the largest charge`);
  if (s.size !== undefined && s.elements === undefined) e.push(`${W}: size is the length of the elements (m); give elements`);
  if (s.elements !== undefined) {
    if (s.show !== 'lines') e.push(`${W}: elements goes with show lines`);
    else if (!Array.isArray(s.elements) || s.elements.length < 1 || s.elements.length > 4 || s.elements.some(el => !Array.isArray(el?.at) || !isNum(el.at[0]) || !isNum(el.at[1]) || (el.name !== undefined && typeof el.name !== 'string')))
      e.push(`${W}: elements is 1 to 4 of {at: [x, y] (m), name}: small areas set normal to the lines`);
    else if (s.charges && !e.length) for (const el of s.elements) {
      const [ex, ey] = fieldAt(s.charges, el.at[0], el.at[1]);
      if (s.charges.some(c => hyp(c.x - el.at[0], c.y - el.at[1]) < 1e-9) || hyp(ex, ey) === 0) e.push(`${W}: element ${el.name ?? JSON.stringify(el.at)} sits where the field has no direction (on a charge, or where it cancels); move it`);
    }
  }
  if (s.show === 'density' && s.kind !== undefined && !['line', 'surface', 'volume'].includes(s.kind)) e.push(`${W}: kind is line, surface or volume`);
  return e;
}

// Panels side by side are compared, so they share one scale: near and far, or small and large charges, must not come out identical.
export function shareElectricScale(specs: unknown[]) {
  const all = (specs as ElectricSpec[]).filter(s => s?.verb === 'electric');
  const pairs = all.filter(s => s.show === 'coulomb');
  if (pairs.length > 1) {
    const small = (s: ElectricSpec) => Math.min(s.r ?? 0.1, s.r2 ?? s.r ?? 0.1), force = (s: ElectricSpec) => K * Math.abs((s.q1 ?? 1e-6) * (s.q2 ?? 1e-6)) / small(s) ** 2;
    const full = Math.max(...pairs.map(force)), span = Math.max(...pairs.map(s => Math.max(s.r ?? 0.1, s.r2 ?? s.r ?? 0.1))), unlike = pairs.filter(s => (s.q1 ?? 1e-6) * (s.q2 ?? 1e-6) < 0);
    for (const s of pairs) { s.full = Math.max(s.full ?? 0, full); s.span = span; if (unlike.length) s.closest = Math.min(...unlike.map(small)); }
  }
  const pictured = all.filter(s => (s.show === 'superposition' || s.show === 'lines') && s.charges?.length);
  if (pictured.length > 1) {
    const needed = (s: ElectricSpec) => { const far = Math.max(...[...s.charges!.map(c => [c.x, c.y]), ...(s.at ? [s.at] : [])].flat().map(Math.abs)); return Math.max(s.reach ?? 0, far * (s.reach === undefined ? 1.7 : 1.15)); };
    const reach = Math.max(...pictured.map(needed));
    for (const s of pictured) s.reach = reach;
  }
  for (const force of [false, true]) {
    const arrows = all.filter(s => s.show === 'superposition' && s.charges?.length && (s.on !== undefined || s.at) && ((s.on !== undefined || (s.quantity ?? 'field') === 'force') === force));
    if (arrows.length < 2) continue;
    const top = (s: ElectricSpec) => {
      const target = s.on !== undefined ? s.charges![s.on] : undefined, others = target ? s.charges!.filter(c => c !== target) : s.charges!, P = target ? [target.x, target.y] : s.at!;
      const q0 = target ? target.q : force ? s.test ?? 1 : 1, each = others.map(c => fieldAt([c], P[0], P[1]).map(v => q0 * v));
      return Math.max(Math.hypot(each.reduce((a, v) => a + v[0], 0), each.reduce((a, v) => a + v[1], 0)), ...each.map(v => Math.hypot(v[0], v[1])));
    };
    const full = Math.max(...arrows.map(s => Math.max(s.full ?? 0, top(s))));
    for (const s of arrows) s.full = full;
  }
  for (const system of ['point', 'shell'] as const) {
    const closed = all.filter(s => s.show === 'gauss' && s.system === system), size = (s: ElectricSpec) => system === 'point' ? s.r ?? 0.1 : s.R ?? 0.1;
    if (closed.length > 1) { const span = Math.max(...closed.map(size)); for (const s of closed) s.span = span; }
  }
}

export function electric(s: ElectricSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080;
  const fr = frame(W, H, k, s.title), box = fr.box, props: Prop[] = [...fr.titles];
  const plane: Plane = {id: 'p', x: [0, 1], y: [0, 1], box};
  const bx = box[0], by = box[1], bw = box[2] - box[0], bh = box[3] - box[1], cx = bx + bw / 2, cy = by + bh / 2, S = Math.min(bw, bh);
  const facts: string[] = [], anchors: Record<string, P2> = {};
  let dur = 8, story = '', second = '', n = 0;
  const id = (p: string) => `${p}${n++}`;
  const on = (t0: number, t1 = t0 + 0.9) => ({draw: 0, keys: {draw: [[t0, 0], [t1, 1, 'inOut']]}});
  const arrow = (p: P2, q: P2, stroke = 'accent', width = 5, extra: Record<string, unknown> = {}) => props.push({id: id('a'), type: 'arrow', x1: p[0], y1: p[1], x2: q[0], y2: q[1], head: 15 * k, style: {stroke, width: width * k}, layer: 2, ...extra} as Prop);
  const line = (p: P2, q: P2, stroke = 'muted', width = 3, extra: Record<string, unknown> = {}) => props.push({id: id('l'), type: 'line', x1: p[0], y1: p[1], x2: q[0], y2: q[1], style: {stroke, width: width * k}, ...extra} as Prop);
  const poly = (points: P2[], stroke = 'muted', width = 3, extra: Record<string, unknown> = {}) => props.push({id: id('c'), type: 'polyline', points, style: {stroke, width: width * k}, ...extra} as Prop);
  const label = (x: number, y: number, t: string, fill = 'ink', size = 26, extra: Record<string, unknown> = {}) => props.push({id: id('t'), type: 'text', x, y, text: t, size: size * k, weight: 700, align: 'middle', style: {fill}, layer: 3, ...extra} as Prop);
  const ring = (c: P2, rx: number, ry = rx, stroke = 'muted', width = 3, dash = false, extra: Record<string, unknown> = {}) =>
    poly(Array.from({length: 73}, (_, i) => [c[0] + rx * Math.cos(i * Math.PI / 36), c[1] + ry * Math.sin(i * Math.PI / 36)] as P2), stroke, width, {style: {stroke, width: width * k, ...(dash ? {dash: [10 * k, 8 * k]} : {})}, ...extra});
  const charge = (x: number, y: number, q: number, r = 24, name?: string, extra: Record<string, unknown> = {}) => {
    props.push({id: id('q'), type: 'circle', x, y, r: r * k, style: {fill: q > 0 ? 'bad' : 'cool', stroke: 'ink', width: 2 * k}, layer: 3, ...extra} as Prop);
    label(x, y + r * 0.42 * k, q > 0 ? '+' : '−', 'paper', r * 1.3, extra);
    if (name) label(x, y - (r + 14) * k, name, 'ink', 26, extra);
  };
  const keysOf = (end: number, fn: (t: number) => number, per = 24): Key[] => { const m = Math.ceil(end * per); return Array.from({length: m + 1}, (_, i) => { const t = end * i / m; return (i ? [t, fn(t), 'linear'] : [t, fn(t)]) as Key; }); };

  if (s.show === 'rubbing') {
    const left = cx - bw * 0.26, right = cx + bw * 0.26, count = 6;
    props.push({id: 'glass', type: 'rect', x: left - bw * 0.1, y: by + bh * 0.12, w: bw * 0.2, h: bh * 0.76, r: 16 * k, style: {fill: 'figure', stroke: 'ink', width: 3 * k}} as Prop);
    props.push({id: 'silk', type: 'rect', x: right - bw * 0.1, y: by + bh * 0.12, w: bw * 0.2, h: bh * 0.76, r: 16 * k, style: {fill: 'faint', stroke: 'ink', width: 3 * k}} as Prop);
    label(left, by + bh * 0.08, 'glass'); label(right, by + bh * 0.08, 'silk');
    for (let i = 0; i < count; i++) {
      const y = by + bh * (0.2 + 0.6 * i / (count - 1)), t0 = 1.2 + i * 0.7;
      charge(left, y, 1, 15, undefined, {show: [t0 + 0.6, 1e9]});
      props.push({id: id('e'), type: 'circle', x: left, y, r: 15 * k, style: {fill: 'cool', stroke: 'ink', width: 2 * k}, layer: 4, keys: {x: [[t0, left], [t0 + 0.7, right, 'inOut']]}} as Prop);
    }
    story = 'Rubbing moves electrons from one body to the other: the glass is left positive, the silk negative'; second = 'No charge is made: the total stays what it was';
    facts.push('charge is conserved: the two bodies gain equal and opposite charges', `charge comes in whole numbers of e = ${sci(QE, 'C')}`);
  } else if (s.show === 'pith') {
    const like = s.like ?? true, top = by + bh * 0.06, L = bh * 0.72, gap = bw * 0.2, swing = like ? 0.24 : -0.17;
    line([bx + bw * 0.1, top], [bx + bw * 0.9, top], 'ink', 6);
    for (const side of [-1, 1]) {
      const hx = cx + side * gap, ang = (t: number) => swing * Math.min(1, Math.max(0, (t - 1) / 2)) * side;
      const ex = (t: number) => hx + L * Math.sin(ang(t)), ey = (t: number) => top + L * Math.cos(ang(t));
      props.push({id: `th${side}`, type: 'line', x1: hx, y1: top, x2: hx, y2: top + L, style: {stroke: 'muted', width: 2.5 * k}, keys: {x2: keysOf(dur, ex), y2: keysOf(dur, ey)}} as Prop);
      props.push({id: `b${side}`, type: 'circle', x: hx, y: top + L, r: 30 * k, style: {fill: side > 0 && !like ? 'cool' : 'bad', stroke: 'ink', width: 2 * k}, layer: 3, keys: {x: keysOf(dur, ex), y: keysOf(dur, ey)}} as Prop);
    }
    story = like ? 'Like charges repel: the balls swing apart' : 'Unlike charges attract: the balls swing together'; second = 'Each pulls or pushes the other alike';
    facts.push(like ? 'like charges repel' : 'unlike charges attract');
  } else if (s.show === 'electroscope') {
    const kx = cx, kt = by + bh * 0.2, jar = by + bh * 0.42, foot = by + bh * 0.98, L = bh * 0.34, sign = s.sign ?? 1;
    props.push({id: 'jar', type: 'rect', x: cx - bw * 0.26, y: jar, w: bw * 0.52, h: foot - jar, r: 12 * k, style: {stroke: 'muted', width: 3 * k, fill: 'none'}} as Prop);
    props.push({id: 'knob', type: 'circle', x: kx, y: kt, r: 24 * k, style: {fill: 'figure', stroke: 'ink', width: 2 * k}, layer: 2} as Prop);
    line([kx, kt], [kx, jar + bh * 0.1], 'ink', 6); label(kx + 62 * k, kt + 8 * k, 'knob', 'muted', 24);
    const hinge: P2 = [kx, jar + bh * 0.1], open = (t: number) => 0.52 * Math.min(1, Math.max(0, (t - 3) / 1.8));
    for (const side of [-1, 1]) {
      const tip = (t: number): P2 => [hinge[0] + side * L * Math.sin(open(t)), hinge[1] + L * Math.cos(open(t))];
      props.push({id: `leaf${side}`, type: 'line', x1: hinge[0], y1: hinge[1], x2: hinge[0], y2: hinge[1] + L, style: {stroke: 'accent', width: 7 * k}, layer: 2, keys: {x2: keysOf(dur, t => tip(t)[0]), y2: keysOf(dur, t => tip(t)[1])}} as Prop);
    }
    const rodY = kt - 42 * k, rx = (t: number) => bx + bw * (0.02 + 0.46 * Math.min(1, t / 2.6));
    props.push({id: 'rod', type: 'line', x1: 0, y1: rodY, x2: 0, y2: rodY, style: {stroke: 'bad', width: 20 * k}, layer: 3, keys: {x1: keysOf(dur, t => rx(t) - bw * 0.22), x2: keysOf(dur, rx)}} as Prop);
    label(bx + bw * 0.22, rodY - 34 * k, 'charged rod', 'muted', 24);
    for (const side of [-1, 1]) charge(hinge[0] + side * L * 0.74 * Math.sin(0.52), hinge[1] + L * 0.74 * Math.cos(0.52), sign, 13, undefined, {show: [4.9, 1e9]});
    story = 'Charge flows from the rod down to the leaves'; second = 'Both leaves carry the same charge and repel: the more charge, the wider they open';
    facts.push('an electroscope detects charge: like-charged leaves diverge');
  } else if (s.show === 'induction') {
    const sign = s.sign ?? 1, sr = S * 0.26, c: P2 = [cx + bw * 0.14, cy], rod = bx + bw * 0.04;
    ring(c, sr, sr, 'ink', 4); label(c[0], c[1] + sr + 44 * k, 'neutral sphere', 'muted', 24);
    const tipX = (t: number) => rod + bw * 0.2 * Math.min(1, t / 2);
    props.push({id: 'rod', type: 'line', x1: rod, y1: cy, x2: rod, y2: cy, style: {stroke: sign > 0 ? 'bad' : 'cool', width: 28 * k}, layer: 2, keys: {x1: keysOf(dur, t => tipX(t) - bw * 0.18), x2: keysOf(dur, tipX)}} as Prop);
    for (let i = 0; i < 5; i++) {
      const y = cy + (i - 2) * sr * 0.32, inner = Math.sqrt(1 - ((i - 2) * 0.32) ** 2) * sr * 0.72, t0 = 2 + i * 0.1;
      for (const [side, q] of [[-1, -sign], [1, sign]] as const) {
        const mid = c[0] + side * sr * 0.2 * (i % 2 ? 1 : -1), end = c[0] + side * inner;
        props.push({id: id('q'), type: 'circle', x: mid, y, r: 13 * k, style: {fill: q > 0 ? 'bad' : 'cool', stroke: 'ink', width: 2 * k}, layer: 3, keys: {x: [[t0, mid], [t0 + 1.8, end, 'inOut']]}} as Prop);
      }
    }
    story = 'The rod pulls the opposite charge to the near side and pushes the like charge to the far side'; second = 'The sphere stays neutral overall, but the nearer charge is pulled harder: it is attracted';
    facts.push('electrostatic induction separates charge without contact', 'a neutral body is attracted to a charged one');
  } else if (s.show === 'coulomb') {
    const q1 = s.q1 ?? 1e-6, q2 = s.q2 ?? 1e-6, r = s.r ?? 0.1, r2 = s.r2, like = q1 * q2 > 0, big = Math.max(r, r2 ?? r), small = Math.min(r, r2 ?? r);
    const F = (d: number) => K * Math.abs(q1 * q2) / (d * d), ppm = bw * 0.62 / (s.span ?? big), rad = 24 * k;
    const closest = s.closest ?? (like ? undefined : small), longest = closest === undefined ? bw * 0.17 : Math.min(bw * 0.17, closest * ppm / 2 - rad - 8 * k), scale = longest / (s.full ?? F(small));
    dur = r2 ? 9 : 6;
    const dist = (t: number) => (!r2 ? r : t < 3.5 ? r : t > 5.5 ? r2 : r + (r2 - r) * (t - 3.5) / 2);
    const x1 = (t: number) => cx - dist(t) * ppm / 2, x2 = (t: number) => cx + dist(t) * ppm / 2;
    const dir = like ? 1 : -1, y = cy - bh * 0.05;
    anchors.q1 = [x1(0), y]; anchors.q2 = [x2(0), y];
    const body = (name: string, xf: (t: number) => number, q: number) => {
      props.push({id: name, type: 'circle', x: xf(0), y, r: rad, style: {fill: q > 0 ? 'bad' : 'cool', stroke: 'ink', width: 2 * k}, layer: 3, keys: {x: keysOf(dur, xf)}} as Prop);
      props.push({id: `${name}s`, type: 'text', x: xf(0), y: y + 10 * k, text: q > 0 ? '+' : '−', size: 32 * k, weight: 700, align: 'middle', style: {fill: 'paper'}, layer: 4, keys: {x: keysOf(dur, xf)}} as Prop);
    };
    body('q1', x1, q1); body('q2', x2, q2);
    const force = (name: string, xf: (t: number) => number, side: number) => {
      const start = (t: number) => xf(t) + side * dir * (rad + 4 * k), end = (t: number) => start(t) + side * dir * F(dist(t)) * scale;
      props.push({id: name, type: 'arrow', x1: start(0), y1: y, x2: start(0), y2: y, head: 15 * k, style: {stroke: 'accent', width: 7 * k}, layer: 2, keys: {x1: keysOf(dur, start), x2: keysOf(dur, t => t < 1 ? start(t) : t < 2 ? start(t) + (end(t) - start(t)) * (t - 1) : end(t))}} as Prop);
    };
    force('F1', x1, -1); force('F2', x2, 1);
    facts.push(`F = k q₁q₂/r² = ${sci(F(r), 'N')} at r = ${sci(r, 'm')}, ${like ? 'repulsive' : 'attractive'}`);
    if (r2) facts.push(`at r = ${sci(r2, 'm')}, F = ${sci(F(r2), 'N')}: ${+(F(r2) / F(r)).toPrecision(3)} times as much`);
    if (!s.illustrative) { label(cx, y + bh * 0.2, sci(F(r), 'N'), 'accent', 28, r2 ? {show: [0, 3.5]} : {}); if (r2) label(cx, y + bh * 0.2, sci(F(r2), 'N'), 'accent', 28, {show: [5.5, 1e9]}); }
    story = like ? 'Like charges push apart, each with the same force' : 'Unlike charges pull together, each with the same force';
    second = r2 ? 'Change the distance and the force goes as 1/r²' : 'F = k q₁q₂/r²: equal and opposite, even when the charges differ';
    facts.push(`k = 1/4πε₀ = ${sci(K, 'N m²/C²')}`);
  } else if (s.show === 'superposition' || s.show === 'lines') {
    const cs = s.charges!, pts: P2[] = cs.map(c => [c.x, c.y]); if (s.at) pts.push(s.at); for (const el of s.elements ?? []) pts.push(el.at);
    // a reach too small for its own charges or point would draw them off the canvas: it widens to hold them
    const far = Math.max(...pts.map(p => Math.max(Math.abs(p[0]), Math.abs(p[1])))), reach = Math.max(s.reach ?? 0, far * (s.reach === undefined ? 1.7 : 1.15)) || 1, ppm = S / 2 / reach;
    const to = (p: P2): P2 => [cx + p[0] * ppm, cy - p[1] * ppm];
    if (s.show === 'lines') {
      const traced = traceLines(cs, reach, s.per ?? 12);
      for (const pts_ of traced) {
        for (const inside of windowPieces(pts_, reach * bw / S, reach * bh / S)) {
          poly(inside.map(to), 'accent', 3, {layer: 1, ...on(0.6, 3)});
          const mid = Math.floor(inside.length * 0.55), g = to(inside[mid]), h = to(inside[Math.min(mid + 2, inside.length - 1)]);
          arrow(g, h, 'accent', 3, {show: [3, 1e9]});
        }
      }
      cs.forEach(c => { const p = to([c.x, c.y]); charge(p[0], p[1], c.q, 24, c.name); });
      if (s.rings && cs.length === 1) { const p = to([cs[0].x, cs[0].y]); for (const f of [0.3, 0.6]) ring(p, S * f * 0.75, S * f * 0.75, 'cool', 3, true, {show: [3.5, 1e9]}); }
      story = cs.length === 1 ? (cs[0].q > 0 ? 'Lines leave a positive charge' : 'Lines enter a negative charge') : 'Lines start on positive charges and end on negative ones, and never cross';
      second = s.rings ? 'The same lines spread over a larger area: they thin out, and the field weakens as 1/r²' : 'Where lines crowd, the field is strong';
      facts.push('field lines never cross; their density shows the strength of the field', 'the number of lines is proportional to the charge');
      if (s.elements?.length) {
        // equal small areas set normal to the field (edge on, a short bar); every traced line that cuts one is marked where it cuts
        const size = s.size ?? reach * 0.25, counts: number[] = [];
        s.elements.forEach((el, i) => {
          const [ex, ey] = fieldAt(cs, el.at[0], el.at[1]), m = hyp(ex, ey), nx = -ey / m, ny = ex / m, t0 = 3.6 + i * 1.6;
          const a: P2 = [el.at[0] - nx * size / 2, el.at[1] - ny * size / 2], b: P2 = [el.at[0] + nx * size / 2, el.at[1] + ny * size / 2], hits: P2[] = [];
          for (const path of traced) for (let j = 1; j < path.length; j++) if (crosses(path[j - 1], path[j], a, b)) { hits.push(meet(path[j - 1], path[j], a, b)); break; }
          counts.push(hits.length);
          const A = to(a), B = to(b), c = to(el.at);
          line(A, B, 'good', 10, {layer: 2, show: [t0, 1e9]}); anchors[el.name ?? `element${i + 1}`] = c;
          // the name sits past the bar's end, clear of the lines it is cut by
          const ux = (B[0] - A[0]) / hyp(B[0] - A[0], B[1] - A[1]), uy = (B[1] - A[1]) / hyp(B[0] - A[0], B[1] - A[1]), side = uy < 0 ? 1 : -1;
          if (el.name) label(c[0] + side * ux * (hyp(B[0] - A[0], B[1] - A[1]) / 2 + 26 * k), c[1] + side * uy * (hyp(B[0] - A[0], B[1] - A[1]) / 2 + 26 * k) + 9 * k, el.name, 'good', 30, {show: [t0, 1e9]});
          hits.forEach(h => { const p = to(h); props.push({id: id('x'), type: 'circle', x: p[0], y: p[1], r: 7 * k, style: {fill: 'ink'}, layer: 3, show: [t0 + 0.7, 1e9]} as Prop); });
          facts.push(`${hits.length} of the drawn lines cut the element at ${el.name ?? `point ${i + 1}`}`);
        });
        dur = 3.6 + s.elements.length * 1.6 + 2.4;
        const names = s.elements.map((el, i) => el.name ?? `point ${i + 1}`), most = counts.indexOf(Math.max(...counts)), least = counts.indexOf(Math.min(...counts));
        if (s.elements.length > 1 && counts[most] > counts[least]) { story = `Equal areas across the lines: more lines cut the one at ${names[most]} than at ${names[least]}`; second = `So the field is stronger at ${names[most]}`; }
        else { story = 'Equal small areas set across the lines'; second = 'The number of lines through each shows how strong the field is there'; }
      }
    } else if (s.arrows === false) {
      // the set-up only: the charges, the one the question is about ringed, no arrows yet
      const target = s.on !== undefined ? cs[s.on] : undefined;
      cs.forEach(c => { const a = to([c.x, c.y]); charge(a[0], a[1], c.q, 22, c.name); });
      if (target) { const a = to([target.x, target.y]); anchors.on = a; ring(a, 31 * k, 31 * k, 'good', 3, true, on(1.2, 2)); }
      if (s.at) { const p = to(s.at); anchors.P = p; props.push({id: 'P', type: 'circle', x: p[0], y: p[1], r: 9 * k, style: {fill: 'ink'}, layer: 3} as Prop); label(p[0] + 22 * k, p[1] - 14 * k, 'P', 'ink', 26); }
      anchors.O = to([0, 0]); dur = 6;
      story = target ? `${target.name ?? 'One charge'} among several other charges` : 'Several charges around a point';
      second = 'Each of them pushes or pulls on it';
      facts.push(`${cs.length} charges`);
    } else {
      const field = (s.quantity ?? 'field') === 'field' && s.on === undefined, target = s.on !== undefined ? cs[s.on] : undefined;
      const others = target ? cs.filter(c => c !== target) : cs, P: P2 = target ? [target.x, target.y] : s.at!, q0 = target ? target.q : field ? 1 : s.test ?? 1;
      const each = others.map(c => { const [ex, ey] = fieldAt([c], P[0], P[1]); return [q0 * ex, q0 * ey] as P2; });
      const net: P2 = [each.reduce((a, v) => a + v[0], 0), each.reduce((a, v) => a + v[1], 0)];
      const top = s.full ?? Math.max(hyp(net[0], net[1]), ...each.map(v => hyp(v[0], v[1]))), unit = field ? 'N/C' : 'N', p = to(P);
      // every arrow shares one scale, short enough that the longest stays inside the frame
      const room = (v: P2) => Math.min(v[0] > 0 ? (bx + bw - p[0]) / v[0] : v[0] < 0 ? (bx - p[0]) / v[0] : Infinity, v[1] > 0 ? (p[1] - by) / v[1] : v[1] < 0 ? (p[1] - by - bh) / v[1] : Infinity);
      const len = Math.min(S * 0.32 / top, ...[net, ...each].map(room));
      anchors.P = p; anchors.O = to([0, 0]);
      cs.forEach(c => { const a = to([c.x, c.y]); charge(a[0], a[1], c.q, 22, c.name); });
      if (!target) { props.push({id: 'P', type: 'circle', x: p[0], y: p[1], r: 9 * k, style: {fill: 'ink'}, layer: 3} as Prop); label(p[0] + 22 * k, p[1] - 14 * k, 'P', 'ink', 26); }
      each.forEach((v, i) => { arrow(p, [p[0] + v[0] * len, p[1] - v[1] * len], 'cool', 4, on(1 + i * 1.2)); facts.push(`${field ? 'E' : 'F'} from ${others[i].name ?? `charge ${i + 1}`} = ${sci(hyp(v[0], v[1]), unit)}`); });
      const tn = 1.2 + each.length * 1.2, mag = hyp(net[0], net[1]);
      if (mag * len > 4 * k) arrow(p, [p[0] + net[0] * len, p[1] - net[1] * len], 'accent', 7, on(tn));
      facts.unshift(`net ${field ? 'E' : 'F'} = ${sci(mag, unit)}`);
      dur = Math.max(7, tn + 3);
      story = mag * len <= 4 * k ? 'The separate pulls cancel: the sum is zero here' : `Each charge acts on its own; the net ${field ? 'field' : 'force'} is their vector sum`;
      second = 'Each arrow is what that one charge would give, as if the others were not there';
    }
  } else if (s.show === 'plates') {
    const down = (s.field ?? 'down') === 'down', p = s.particle ?? 'electron', E0 = s.E ?? 2e4, d = s.d ?? 0.015, m = p === 'electron' ? ME : MP, acc = QE * E0 / m, T = Math.sqrt(2 * d / acc);
    const tp = by + bh * 0.1, bt = by + bh * 0.9, xl = bx + bw * 0.08, xr = bx + bw * 0.92;
    line([xl, tp], [xr, tp], down ? 'bad' : 'cool', 12); line([xl, bt], [xr, bt], down ? 'cool' : 'bad', 12);
    for (let i = 0; i < 8; i++) { const x = xl + (i + .5) * (xr - xl) / 8; label(x, tp - 16 * k, down ? '+' : '−', down ? 'bad' : 'cool', 30); label(x, bt + 40 * k, down ? '−' : '+', down ? 'cool' : 'bad', 30); }
    for (let i = 0; i < 6; i++) { const x = xl + (i + .5) * (xr - xl) / 6; arrow(down ? [x, tp + 14 * k] : [x, bt - 14 * k], down ? [x, bt - 14 * k] : [x, tp + 14 * k], 'faint', 2.5); }
    label(xr - 34 * k, cy, 'E', 'muted', 34);
    // a positive charge goes with the field, an electron against it
    const goesDown = (p === 'proton') === down, y0 = goesDown ? tp + 24 * k : bt - 24 * k, y1 = goesDown ? bt - 24 * k : tp + 24 * k; dur = 7;
    const shown = 4.5, frac = (t: number) => { const u = Math.min(1, Math.max(0, (t - 1.2) / shown)); return u * u; };
    const lim = (s.v0 ?? 0) * T, xs = (t: number) => lim ? xl + (xr - xl) * 0.1 + (xr - xl) * 0.8 * Math.min(1, Math.max(0, (t - 1.2) / shown)) : cx - bw * 0.1, ys = (t: number) => y0 + (y1 - y0) * frac(t);
    props.push({id: 'part', type: 'circle', x: xs(0), y: y0, r: 16 * k, style: {fill: p === 'electron' ? 'cool' : 'bad', stroke: 'ink', width: 2 * k}, layer: 3, keys: {x: keysOf(dur, xs), y: keysOf(dur, ys)}} as Prop);
    anchors.start = [xs(0), y0]; anchors.end = [xs(dur), y1];
    facts.push(`a = qE/m = ${sci(acc, 'm/s²')} for a ${p}`, `time to cross ${sci(d, 'm')} from rest: ${sci(T, 's')}`, `E = ${sci(E0, 'N/C')}`);
    if (lim) facts.push(`sideways in that time: ${sci(lim, 'm')}, so the path is a parabola`);
    story = p === 'electron' ? 'An electron is pushed against the field' : 'A proton is pushed along the field'; second = 'A uniform field gives a constant force, so a constant acceleration: F = qE';
    if (!s.illustrative) second += `. Slowed from ${sci(T, 's')} to be seen`;
  } else if (s.show === 'flux') {
    const E0 = s.E ?? 1, A = s.A ?? 1, th = s.theta, half = S * 0.32, deg = Math.PI / 180; dur = th === undefined ? 10 : 7;
    const ang = (t: number) => (th !== undefined ? th * Math.min(1, t / 2.5) : 90 * (t < 1 ? 0 : t > 8 ? 1 : (t - 1) / 7)) * deg;
    for (let i = 0; i < 8; i++) { const y = by + bh * (0.08 + 0.84 * i / 7); arrow([bx, y], [bx + bw, y], 'faint', 2.5); }
    label(bx + bw - 28 * k, by + 14 * k, 'E', 'muted', 32);
    const end = (t: number, side: number): P2 => [cx + side * half * Math.sin(ang(t)), cy - side * half * Math.cos(ang(t))];
    props.push({id: 'area', type: 'line', x1: cx, y1: cy - half, x2: cx, y2: cy + half, style: {stroke: 'accent', width: 11 * k}, layer: 2, keys: {x1: keysOf(dur, t => end(t, 1)[0]), y1: keysOf(dur, t => end(t, 1)[1]), x2: keysOf(dur, t => end(t, -1)[0]), y2: keysOf(dur, t => end(t, -1)[1])}} as Prop);
    props.push({id: 'normal', type: 'arrow', x1: cx, y1: cy, x2: cx, y2: cy, head: 15 * k, style: {stroke: 'cool', width: 5 * k}, layer: 3, keys: {x2: keysOf(dur, t => cx + S * 0.22 * Math.cos(ang(t))), y2: keysOf(dur, t => cy + S * 0.22 * Math.sin(ang(t)))}} as Prop);
    // the width across the field: what the lines actually cross
    const bar = bx + bw * 0.08;
    props.push({id: 'across', type: 'line', x1: bar, y1: cy - half, x2: bar, y2: cy + half, style: {stroke: 'good', width: 9 * k}, layer: 3, keys: {y1: keysOf(dur, t => cy - half * Math.cos(ang(t))), y2: keysOf(dur, t => cy + half * Math.cos(ang(t)))}} as Prop);
    label(bar, by + bh - 4 * k, 'width across the field', 'good', 22, {align: 'start'});
    const flux = (d: number) => E0 * A * Math.cos(d * deg);
    if (th !== undefined) facts.push(`φ = EA cos θ = ${sci(flux(th), 'N m²/C')} at θ = ${th}°`);
    else facts.push(`φ = EA at θ = 0°`, `φ = ${+Math.cos(60 * deg).toFixed(2)} EA at θ = 60°`, `φ = 0 at θ = 90°`);
    story = 'Flux counts the lines through the area: only its part across the field catches them'; second = 'φ = E·ΔS = EA cos θ, θ between the field and the normal';
  } else if (s.show === 'dipole') {
    const q = s.q ?? 1e-9, a = s.a ?? 0.01, r = s.r ?? 0.05, place = s.place ?? 'both', p = 2 * q * a;
    const eax = K * q * 4 * a * r / (r * r - a * a) ** 2, eeq = 2 * K * q * a / (r * r + a * a) ** 1.5;
    const ppm = Math.min(bw * 0.3, bh * 0.5) / r, sep = Math.max(a * ppm, 55 * k), ox = bx + bw * 0.34, oy = by + bh * 0.72;
    const minus: P2 = [ox - sep, oy], plus: P2 = [ox + sep, oy]; charge(minus[0], minus[1], -1, 22, '−q'); charge(plus[0], plus[1], 1, 22, '+q');
    arrow([ox - sep * 0.5, oy], [ox + sep * 0.5, oy], 'good', 5); label(ox, oy + 58 * k, 'p', 'good', 28);
    const ea = K * q / (r - a) ** 2, eb = K * q / (r + a) ** 2, side = K * q / (r * r + a * a), top = Math.max(ea, side), len = bw * 0.2 / top;
    if (place !== 'equator') {
      const P: P2 = [ox + sep + r * ppm, oy]; props.push({id: 'Pa', type: 'circle', x: P[0], y: P[1], r: 8 * k, style: {fill: 'ink'}, layer: 3} as Prop); label(P[0], P[1] + 62 * k, 'on the axis', 'muted', 22);
      arrow([P[0], P[1] - 16 * k], [P[0] + ea * len, P[1] - 16 * k], 'bad', 4, on(1)); arrow([P[0], P[1] + 16 * k], [P[0] - eb * len, P[1] + 16 * k], 'cool', 4, on(1.8)); arrow(P, [P[0] + (ea - eb) * len, P[1]], 'accent', 7, on(3));
      anchors.axis = P;
    }
    if (place !== 'axis') {
      const P: P2 = [ox, oy - r * ppm], cosb = a / hyp(r, a), sinb = r / hyp(r, a), L = side * len;
      props.push({id: 'Pe', type: 'circle', x: P[0], y: P[1], r: 8 * k, style: {fill: 'ink'}, layer: 3} as Prop); label(P[0] + 96 * k, P[1] + 6 * k, 'on the equator', 'muted', 22);
      // away from +q on the right, toward −q on the left: their upward and downward parts cancel, the sum runs against p
      arrow(P, [P[0] - L * cosb, P[1] - L * sinb], 'bad', 4, on(4)); arrow(P, [P[0] - L * cosb, P[1] + L * sinb], 'cool', 4, on(4.8)); arrow(P, [P[0] - eeq * len, P[1]], 'accent', 7, on(6)); anchors.equator = P;
    }
    dur = 9;
    facts.push(`p = q × 2a = ${sci(p, 'C m')}, from −q to +q`, `on the axis, E = ${sci(eax, 'N/C')}, along p; for r ≫ a, 2kp/r³`, `on the equator, E = ${sci(eeq, 'N/C')}, against p; for r ≫ a, kp/r³`);
    story = 'The two charges nearly cancel: the field falls as 1/r³, faster than a single charge'; second = 'On the axis it runs along p; on the equator, against p and half as strong';
  } else if (s.show === 'torque') {
    const nonuni = s.field === 'nonuniform', th0 = (s.theta ?? (nonuni ? 0 : 60)) * Math.PI / 180, q = s.q ?? 1e-6, a = s.a ?? 0.01, E0 = s.E ?? 1e5, p = 2 * q * a, half = S * 0.2, F = S * 0.2;
    // field lines crowd where the field is strong
    for (let i = 0; i < 7; i++) { const u = (i - 3) / 3; arrow([bx, cy + u * bh * 0.42], [bx + bw, cy + u * bh * (nonuni ? 0.16 : 0.42)], 'faint', 2.5); }
    label(bx + bw - 28 * k, by + 14 * k, nonuni ? 'E grows to the right' : 'E', 'muted', nonuni ? 24 : 32, nonuni ? {align: 'end'} : {});
    if (nonuni) {
      const aligned = th0 === 0, sgn = aligned ? 1 : -1, Fplus = F * 1.3, Fminus = F * 0.7, xp = cx + sgn * half, xm = cx - sgn * half; dur = 6;
      charge(xp, cy, 1, 22, '+q'); charge(xm, cy, -1, 22, '−q'); line([xm, cy], [xp, cy], 'ink', 4);
      // the charge on the stronger side (right) feels more
      const onPlus = aligned ? Fplus : Fminus, onMinus = aligned ? Fminus : Fplus;
      arrow([xp, cy - 44 * k], [xp + onPlus, cy - 44 * k], 'accent', 5, on(1)); arrow([xm, cy + 44 * k], [xm - onMinus, cy + 44 * k], 'accent', 5, on(1));
      arrow([cx, cy + bh * 0.3], [cx + sgn * (Fplus - Fminus) * 1.6, cy + bh * 0.3], 'good', 8, on(2.6)); label(cx, cy + bh * 0.3 + 44 * k, 'net force', 'good', 24);
      story = aligned ? 'Along an increasing field, the dipole is pulled toward the stronger field' : 'Against an increasing field, it is pushed toward the weaker field';
      second = 'In a nonuniform field the two forces differ, so a net force remains';
      facts.push('in a nonuniform field a dipole feels a net force; along the field it moves to the stronger field');
    } else {
      const ang = (t: number) => th0 * Math.exp(-Math.max(0, t - 2) / 2.2); dur = 10;
      const px = (t: number) => cx + half * Math.cos(ang(t)), py = (t: number) => cy - half * Math.sin(ang(t)), mx = (t: number) => cx - half * Math.cos(ang(t)), my = (t: number) => cy + half * Math.sin(ang(t));
      props.push({id: 'bar', type: 'line', x1: mx(0), y1: my(0), x2: px(0), y2: py(0), style: {stroke: 'ink', width: 5 * k}, layer: 2, keys: {x1: keysOf(dur, mx), y1: keysOf(dur, my), x2: keysOf(dur, px), y2: keysOf(dur, py)}} as Prop);
      for (const [nm, xf, yf, fill, side] of [['qp', px, py, 'bad', 1], ['qm', mx, my, 'cool', -1]] as const) {
        props.push({id: nm, type: 'circle', x: xf(0), y: yf(0), r: 22 * k, style: {fill, stroke: 'ink', width: 2 * k}, layer: 3, keys: {x: keysOf(dur, xf), y: keysOf(dur, yf)}} as Prop);
        props.push({id: `F${nm}`, type: 'arrow', x1: xf(0), y1: yf(0), x2: xf(0) + side * F, y2: yf(0), head: 15 * k, style: {stroke: 'accent', width: 6 * k}, layer: 2, keys: {x1: keysOf(dur, xf), y1: keysOf(dur, yf), x2: keysOf(dur, t => xf(t) + side * F), y2: keysOf(dur, yf)}} as Prop);
      }
      anchors.O = [cx, cy];
      facts.push(`p = q × 2a = ${sci(p, 'C m')}`, `τ = pE sin θ = ${sci(p * E0 * Math.sin(th0), 'N m')} at θ = ${s.theta ?? 60}°`, 'net force in a uniform field is zero');
      story = 'Equal and opposite forces make no net force, but they turn the dipole'; second = 'τ = p × E: largest across the field, zero when aligned';
    }
  } else if (s.show === 'gauss') {
    const sys = s.system!, q = s.q ?? 1e-9, r = s.r ?? 0.1, R = s.R ?? 0.1; dur = 8;
    const dash = {dash: [10 * k, 8 * k]};
    const radial = (c: P2, r0: number, r1: number, count: number, t0 = 1.5) => { for (let i = 0; i < count; i++) { const th = 2 * Math.PI * i / count, a: P2 = [c[0] + r0 * Math.cos(th), c[1] + r0 * Math.sin(th)], b: P2 = [c[0] + r1 * Math.cos(th), c[1] + r1 * Math.sin(th)]; q > 0 ? arrow(a, b, 'accent', 4, on(t0)) : arrow(b, a, 'accent', 4, on(t0)); } };
    if (sys === 'point' && s.outside) {
      const G = S * 0.26, x0 = cx - bw * 0.1, qx = x0 + G + bw * 0.14; charge(qx, cy, q, 22); ring([x0, cy], G, G, 'good', 3, true);
      for (const f of [-0.45, 0, 0.45]) { const y = cy + f * G, half = Math.sqrt(G * G - (f * G) ** 2), a: P2 = [x0 + half + bw * 0.03, y], b: P2 = [x0 - half - bw * 0.03, y]; q > 0 ? arrow(a, b, 'accent', 4, on(1.5)) : arrow(b, a, 'accent', 4, on(1.5)); }
      facts.push('flux through the surface from a charge outside is 0: what enters also leaves');
      story = 'Field from a charge outside crosses the surface, in on one side and out on the other'; second = 'It adds nothing to the total flux: q/ε₀ counts only the charge enclosed';
    } else if (sys === 'point') {
      const G = S * 0.3 * (s.span ? Math.max(0.25, r / s.span) : 1); charge(cx, cy, q, 22); ring([cx, cy], G, G, 'good', 3, true); radial([cx, cy], G, G + S * 0.13, 12);
      const E0 = K * q / (r * r); facts.push(`E = kq/r² = ${sci(Math.abs(E0), 'N/C')} at r = ${sci(r, 'm')}`, `φ = q/ε₀ = ${sci(q / EPS0, 'N m²/C')}, whatever the radius`);
      story = `E is the same all over a sphere round the charge and ${q > 0 ? 'leaves' : 'enters'} it at right angles`; second = 'E × 4πr² = q/ε₀';
    } else if (sys === 'wire') {
      const l = s.lambda ?? 1e-9, G = bw * 0.24, ry = 34 * k, h = bh * 0.3;
      const c = l > 0 ? 'bad' : 'cool'; line([cx, by], [cx, by + bh], c, 9); label(cx + 44 * k, by + 22 * k, 'λ', c, 30);
      ring([cx, cy - h], G, ry, 'good', 3, true); ring([cx, cy + h], G, ry, 'good', 3, true); line([cx - G, cy - h], [cx - G, cy + h], 'good', 3, {style: {stroke: 'good', width: 3 * k, ...dash}}); line([cx + G, cy - h], [cx + G, cy + h], 'good', 3, {style: {stroke: 'good', width: 3 * k, ...dash}});
      for (const f of [-0.5, 0, 0.5]) for (const side of [-1, 1]) { const a: P2 = [cx + side * G, cy + f * h], b: P2 = [cx + side * (G + bw * 0.15), cy + f * h]; l > 0 ? arrow(a, b, 'accent', 4, on(1.5)) : arrow(b, a, 'accent', 4, on(1.5)); }
      facts.push(`E = λ/(2πε₀r) = ${sci(Math.abs(l) / (2 * Math.PI * EPS0 * r), 'N/C')} at r = ${sci(r, 'm')}`, 'no flux through the end caps: E runs along them');
      story = `E points straight ${l > 0 ? 'out from' : 'in to'} the wire, through the curved side only`; second = 'E × 2πrl = λl/ε₀, so E falls as 1/r';
    } else if (sys === 'plane') {
      const g = s.sigma ?? 1e-9, wb = bw * 0.26, hb = bh * 0.2;
      const c = g > 0 ? 'bad' : 'cool'; line([cx, by], [cx, by + bh], c, 9); for (let i = 0; i < 8; i++) label(cx + 26 * k, by + bh * (i + .6) / 8, g > 0 ? '+' : '−', c, 26);
      props.push({id: 'box', type: 'rect', x: cx - wb, y: cy - hb, w: 2 * wb, h: 2 * hb, style: {stroke: 'good', width: 3 * k, fill: 'none', ...dash}} as Prop);
      for (const f of [-0.6, 0, 0.6]) for (const side of [-1, 1]) { const a: P2 = [cx + side * wb, cy + f * hb], b: P2 = [cx + side * (wb + bw * 0.14), cy + f * hb]; g > 0 ? arrow(a, b, 'accent', 4, on(1.5)) : arrow(b, a, 'accent', 4, on(1.5)); }
      facts.push(`E = σ/2ε₀ = ${sci(Math.abs(g) / (2 * EPS0), 'N/C')}, the same at every distance`, `flux ${g > 0 ? 'leaves' : 'enters'} through both faces, none through the sides`);
      story = `Flux ${g > 0 ? 'leaves' : 'enters'} through both flat faces of the box`; second = 'E × 2A = σA/ε₀: E does not depend on the distance';
    } else if (sys === 'shell') {
      const Rp = S * 0.26 * (s.span ? Math.max(0.25, R / s.span) : 1), inside = s.inside === true, G = inside ? Rp * 0.55 : Rp * 1.35;
      ring([cx, cy], Rp, Rp, 'bad', 7);
      for (let i = 0; i < 12; i++) { const th = i * Math.PI / 6; label(cx + (Rp + 2 * k) * Math.cos(th), cy + (Rp + 2 * k) * Math.sin(th) + 8 * k, q > 0 ? '+' : '−', 'paper', 22); }
      ring([cx, cy], G, G, 'good', 3, true);
      if (!inside) radial([cx, cy], G, G + S * 0.1, 12);
      facts.push(inside ? 'inside the shell E = 0: the surface encloses no charge' : `outside, E = kq/r² = ${sci(K * Math.abs(q) / (r * r), 'N/C')} at r = ${sci(r, 'm')}, as if all charge were at the centre`, `R = ${sci(R, 'm')}`);
      story = inside ? 'A surface inside the shell encloses no charge, so E = 0 there' : 'Outside, the shell acts as if all its charge were at the centre'; second = 'q/ε₀ counts only the charge enclosed';
    } else {
      const ww = bw * 0.26, hh = bh * 0.2, ex = 40 * k;
      for (let i = 0; i < 7; i++) { const y = by + bh * (0.1 + 0.8 * i / 6); arrow([bx, y], [bx + bw, y], 'faint', 2.5); }
      line([cx - ww, cy - hh], [cx + ww, cy - hh], 'good', 3); line([cx - ww, cy + hh], [cx + ww, cy + hh], 'good', 3); ring([cx - ww, cy], ex, hh, 'good', 3); ring([cx + ww, cy], ex, hh, 'good', 3);
      arrow([cx - ww - bw * 0.14, cy], [cx - ww, cy], 'bad', 6, on(1.5)); arrow([cx + ww, cy], [cx + ww + bw * 0.14, cy], 'accent', 6, on(2.6));
      label(cx - ww, cy + hh + 44 * k, '−EA', 'bad', 28); label(cx + ww, cy + hh + 44 * k, '+EA', 'accent', 28); label(cx, cy - hh - 16 * k, '0 on the side', 'muted', 24);
      facts.push('flux in through one end, out through the other, none through the curved side: total 0');
      story = 'What enters one end leaves the other: the total flux is zero'; second = 'A closed surface enclosing no charge has no net flux';
    }
  } else if (s.show === 'profile') {
    const sys = s.system!, x0 = bx + bw * 0.08, y0 = by + bh * 0.92, xw = bw * 0.88, yh = bh * 0.82; dur = 5;
    line([x0, y0], [x0 + xw, y0], 'ink', 3); line([x0, y0], [x0, y0 - yh], 'ink', 3); label(x0 + xw - 10 * k, y0 + 40 * k, 'r', 'muted', 30); label(x0 - 26 * k, y0 - yh + 8 * k, 'E', 'muted', 30);
    const rs = Array.from({length: 121}, (_, i) => (i + 1) / 121), R = 0.3, f = sys === 'plane' ? () => 0.5 : sys === 'wire' ? (u: number) => Math.min(1, 0.06 / u) : sys === 'point' ? (u: number) => Math.min(1, 0.012 / (u * u)) : (u: number) => u < R ? 0 : Math.min(1, 0.09 / (u * u));
    if (sys === 'shell') { line([x0 + R * xw, y0], [x0 + R * xw, y0 - yh], 'faint', 2, {style: {stroke: 'faint', width: 2 * k, dash: [8 * k, 6 * k]}}); label(x0 + R * xw, y0 + 40 * k, 'R', 'muted', 28); const seg1 = rs.filter(u => u < R), seg2 = rs.filter(u => u >= R); poly(seg1.map(u => [x0 + u * xw, y0 - f(u) * yh] as P2), 'accent', 5, on(.5, 1.5)); poly(seg2.map(u => [x0 + u * xw, y0 - f(u) * yh] as P2), 'accent', 5, on(1.5, 3)); }
    else poly(rs.map(u => [x0 + u * xw, y0 - f(u) * yh] as P2), 'accent', 5, on(.5, 3));
    story = {plane: 'A plane: E is the same at every distance', wire: 'A wire: E falls as 1/r', point: 'A point charge: E falls as 1/r²', shell: 'A shell: zero inside, 1/r² outside, with a jump at R'}[sys as 'plane']; second = 'The shape of the charge sets the fall-off';
    facts.push(story);
  } else if (s.show === 'resultants') {
    // the net force on each charge, by Coulomb's law; then the same arrows, one scale, placed tip to tail
    const cs = s.charges!, F = netForces(cs), close = s.close ?? true, mags = F.map(v => hyp(v[0], v[1])), top = Math.max(...mags) || 1, nC = cs.length;
    const sys = [bx, by, close ? bx + bw * .56 : bx + bw, by + bh], sw = sys[2] - sys[0], sh = sys[3] - sys[1], scx = sys[0] + sw / 2, scy = sys[1] + sh / 2;
    const mx = cs.reduce((a, c) => a + c.x, 0) / nC, my = cs.reduce((a, c) => a + c.y, 0) / nC, ext = Math.max(...cs.map(c => hyp(c.x - mx, c.y - my))) || 1, ppm = Math.min(sw, sh) * .3 / ext;
    const at = cs.map(c => [scx + (c.x - mx) * ppm, scy - (c.y - my) * ppm] as P2), rad = 22 * k;
    const scr = (v: P2): P2 => [v[0], -v[1]], unit = (v: P2): P2 => { const m = hyp(v[0], v[1]) || 1; return [v[0] / m, v[1] / m]; };
    const room = (p: P2, v: P2, box: number[]) => Math.min(v[0] > 0 ? (box[2] - p[0]) / v[0] : v[0] < 0 ? (box[0] - p[0]) / v[0] : Infinity, v[1] > 0 ? (box[3] - p[1]) / v[1] : v[1] < 0 ? (box[1] - p[1]) / v[1] : Infinity);
    const chain: P2[] = [[0, 0]]; F.forEach(v => chain.push([chain[chain.length - 1][0] + v[0], chain[chain.length - 1][1] + v[1]]));
    const cxs = chain.map(p => p[0]), cys = chain.map(p => p[1]), cw = Math.max(...cxs) - Math.min(...cxs) || 1, ch = Math.max(...cys) - Math.min(...cys) || 1;
    const reg = [sys[2] + bw * .05, by + bh * .08, bx + bw, by + bh * .84];
    let len = Math.min(Math.min(sw, sh) * .4 / top, ...F.map((v, i) => mags[i] ? (room(at[i], scr(unit(v)), [sys[0] + 30 * k, sys[1] + 30 * k, sys[2] - 30 * k, sys[3] - 30 * k]) - rad - 4 * k) / mags[i] : Infinity));
    if (close) len = Math.min(len, (reg[2] - reg[0]) * .8 / cw, (reg[3] - reg[1]) * .8 / ch);
    const colours = ['accent', 'good', 'cool', 'bad', 'muted', 'ink'], fname = (i: number) => `F${SUB[(i + 1) % 10]}`;
    const tail = (i: number): P2 => { const u = scr(unit(F[i])); return [at[i][0] + u[0] * (rad + 4 * k), at[i][1] + u[1] * (rad + 4 * k)]; };
    const head = (i: number): P2 => { const t = tail(i); return [t[0] + F[i][0] * len, t[1] - F[i][1] * len]; };
    if (nC >= 3) poly([...at, at[0]], 'faint', 2, {style: {stroke: 'faint', width: 2 * k, dash: [8 * k, 7 * k]}});
    cs.forEach((c, i) => {
      charge(at[i][0], at[i][1], c.q, 22); anchors[c.name ?? `q${i + 1}`] = at[i];
      // the charge's name sits opposite its force (or away from the middle), clear of the arrow
      const away = mags[i] ? scr(unit([-F[i][0], -F[i][1]])) : unit([at[i][0] - scx, at[i][1] - scy]);
      if (c.name) label(at[i][0] + away[0] * 50 * k, at[i][1] + away[1] * 50 * k + 9 * k, c.name, 'ink', 28);
    });
    const t1 = 1, tc = t1 + nC * .9 + .8;
    F.forEach((v, i) => {
      if (!mags[i] || mags[i] * len < 6 * k) return;
      const a = tail(i), b = head(i), u = scr(unit(v)), col = colours[i % colours.length];
      arrow(a, b, col, 6, on(t1 + i * .9)); label(b[0] + u[0] * 30 * k, b[1] + u[1] * 30 * k + 9 * k, fname(i), col, 28, {show: [t1 + i * .9 + .8, 1e9]});
      facts.push(`net force on ${cs[i].name ?? `charge ${i + 1}`}: ${fname(i)} = ${sci(mags[i], 'N')}`);
    });
    if (close) {
      const ox = (reg[0] + reg[2]) / 2 - (Math.min(...cxs) + Math.max(...cxs)) / 2 * len, oy = (reg[1] + reg[3]) / 2 + (Math.min(...cys) + Math.max(...cys)) / 2 * len;
      const V = (p: P2): P2 => [ox + p[0] * len, oy - p[1] * len], mid: P2 = [ox + (Math.min(...cxs) + Math.max(...cxs)) / 2 * len, (reg[1] + reg[3]) / 2];
      const corners = chain.slice(0, -1).map(V), centroid: P2 = [corners.reduce((a, p) => a + p[0], 0) / corners.length, corners.reduce((a, p) => a + p[1], 0) / corners.length];
      F.forEach((v, i) => {
        if (!mags[i] || mags[i] * len < 6 * k) return;
        const a0 = tail(i), b0 = head(i), a1 = V(chain[i]), b1 = V(chain[i + 1]), m0 = tc + i * 1.1, m1 = m0 + 1, col = colours[i % colours.length];
        const go = (p: number, q: number): Key[] => [[m0, p], [m1, q, 'inOut']];
        props.push({id: `chain${i}`, type: 'arrow', x1: a0[0], y1: a0[1], x2: b0[0], y2: b0[1], head: 15 * k, style: {stroke: col, width: 6 * k}, layer: 4, show: [m0, 1e9],
          keys: {x1: go(a0[0], a1[0]), y1: go(a0[1], a1[1]), x2: go(b0[0], b1[0]), y2: go(b0[1], b1[1])}} as Prop);
        // its name outside the closed figure, beside the arrow's middle
        const c: P2 = [(a1[0] + b1[0]) / 2, (a1[1] + b1[1]) / 2], nrm = unit([b1[1] - a1[1], a1[0] - b1[0]]), out = (c[0] - centroid[0]) * nrm[0] + (c[1] - centroid[1]) * nrm[1] < 0 ? -1 : 1, o: P2 = [out * nrm[0], out * nrm[1]];
        label(c[0] + o[0] * 34 * k, c[1] + o[1] * 34 * k + 9 * k, fname(i), col, 28, {show: [m1, 1e9]});
      });
      const tend = tc + nC * 1.1;
      label(mid[0], Math.min(oy - Math.min(...cys) * len + 70 * k, by + bh - 4 * k), 'tip to tail, they close', 'muted', 26, {show: [tend, 1e9]});
      anchors.chain = mid; dur = tend + 2.6;
      const sum = F.reduce((a, v) => [a[0] + v[0], a[1] + v[1]] as P2, [0, 0] as P2);
      facts.unshift(`${F.map((_, i) => fname(i)).join(' + ')} = 0 (computed: ${sci(hyp(sum[0], sum[1]), 'N')})`);
      story = 'Each charge feels a net force, yet the forces placed tip to tail close'; second = 'Their sum is zero: the forces of each pair are equal and opposite';
    } else { dur = tc + 2; story = 'The net force on each charge, from all the others'; second = 'Each is the vector sum of the forces from the other charges'; }
  } else if (s.show === 'share') {
    // Coulomb's way to known fractions of a charge: identical spheres share it equally on touching
    const n = s.touches ?? 2, q = s.q ?? 1e-9, sr = Math.min(bw * .9 / (4 + n * 2.6), bh * .16), pitch = 2.6 * sr;
    const x0 = bx + (bw - (4 * sr + n * pitch)) / 2 + sr, y = cy + bh * .1, touchX = x0 + 2 * sr, high = y - Math.min(bh * .4, 3.4 * sr), step = 3.2, T = (i: number) => .8 + (i - 1) * step;
    const frac = (f: number) => f === 1 ? 'q' : `q/${1 / f}`, sign = q > 0 ? '+' : '−';
    dur = T(n) + step + .6;
    const sphere = (name: string, xf: (t: number) => number, yf: (t: number) => number, held: [number, number, number][], from = 0) => {
      props.push({id: name, type: 'circle', x: xf(0), y: yf(0), r: sr, style: {fill: 'faint', stroke: 'ink', width: 3 * k}, layer: 2, show: [from, 1e9], keys: {x: keysOf(dur, xf), y: keysOf(dur, yf)}} as Prop);
      held.forEach(([t0, t1, f], j) => {
        const m = Math.round(8 * f), r0 = m > 1 ? sr * .55 : 0;
        for (let i = 0; i < m; i++) { const th = 2 * Math.PI * i / m + .4, dx = r0 * Math.cos(th), dy = r0 * Math.sin(th) + sr * .16;
          props.push({id: id('sg'), type: 'text', x: xf(t0) + dx, y: yf(t0) + dy, text: sign, size: sr * .46, weight: 700, align: 'middle', style: {fill: q > 0 ? 'bad' : 'cool'}, layer: 3, show: [t0, t1], keys: {x: keysOf(dur, t => xf(t) + dx), y: keysOf(dur, t => yf(t) + dy)}} as Prop); }
        // the charge it holds: a symbol (q/2), kept when numbers are hidden
        props.push({id: `name-${name}-${j}`, type: 'text', x: xf(t0), y: yf(t0) + sr + 40 * k, text: f ? frac(f) : 'uncharged', size: (f ? 30 : 24) * k, weight: 700, align: 'middle', style: {fill: f ? 'ink' : 'muted'}, layer: 3, show: [t0, t1], keys: {x: keysOf(dur, xf), y: keysOf(dur, t => yf(t) + sr + 40 * k)}} as Prop);
      });
    };
    const shared = (i: number) => T(i) + 1.4;
    sphere('A', () => x0, () => y, Array.from({length: n + 1}, (_, i) => [i ? shared(i) : 0, i < n ? shared(i + 1) : 1e9, 1 / 2 ** i] as [number, number, number]));
    anchors.A = [x0, y]; anchors.touch = [touchX, y];
    for (let i = 1; i <= n; i++) {
      const t0 = T(i), slot = touchX + (n - i + 1) * pitch, ease = (u: number) => { const v = Math.min(1, Math.max(0, u)); return v * v * (3 - 2 * v); };
      const xf = (t: number) => touchX + (slot - touchX) * ease((t - t0 - 2) / .9), yf = (t: number) => high + (y - high) * ease((t - t0) / 1.1);
      sphere(`S${i}`, xf, yf, [[t0, shared(i), 0], [shared(i), 1e9, 1 / 2 ** i]], t0);
    }
    facts.push(`touching identical spheres share the charge equally: ${[0, ...Array.from({length: n}, (_, i) => i + 1)].map(i => frac(1 / 2 ** i)).join(' → ')}`);
    if (!s.illustrative && s.q !== undefined) facts.push(`q = ${sci(q, 'C')}: then ${Array.from({length: n}, (_, i) => sci(q / 2 ** (i + 1), 'C')).join(', ')}`);
    story = 'An identical uncharged sphere touches the charged one: they share its charge equally'; second = 'Each touch halves it, so the charges are known fractions of q, though q itself is not known';
  } else {
    const kind = s.kind ?? 'line', sym = {line: 'λ = Δq/Δl', surface: 'σ = Δq/ΔS', volume: 'ρ = Δq/ΔV'}[kind]; dur = 6;
    if (kind === 'line') { poly(Array.from({length: 61}, (_, i) => [bx + bw * (0.08 + 0.84 * i / 60), cy + bh * 0.12 * Math.sin(i / 60 * 3.6)] as P2), 'bad', 8); poly(Array.from({length: 7}, (_, i) => [bx + bw * (0.44 + 0.08 * i / 6), cy + bh * 0.12 * Math.sin((0.36 + 0.08 * i / 6) / 0.84 * 3.6)] as P2), 'accent', 16, {show: [1.5, 1e9]}); }
    else if (kind === 'surface') { poly([[bx + bw * .1, by + bh * .75], [bx + bw * .3, by + bh * .2], [bx + bw * .92, by + bh * .2], [bx + bw * .72, by + bh * .75], [bx + bw * .1, by + bh * .75]], 'bad', 4); poly([[cx - 40 * k, cy + 34 * k], [cx - 10 * k, cy - 34 * k], [cx + 70 * k, cy - 34 * k], [cx + 40 * k, cy + 34 * k], [cx - 40 * k, cy + 34 * k]], 'accent', 6, {show: [1.5, 1e9]}); }
    else { ring([cx, cy], S * .36, S * .3, 'bad', 4); props.push({id: 'dv', type: 'rect', x: cx - 40 * k, y: cy - 40 * k, w: 80 * k, h: 80 * k, style: {stroke: 'accent', width: 6 * k, fill: 'none'}, show: [1.5, 1e9]} as Prop); }
    label(cx, by + bh * 0.96, sym, 'accent', 34, {show: [2, 1e9]});
    story = 'Charge is far too fine-grained to count: we take a small element with many charges in it'; second = sym;
    facts.push(sym, 'the element is small to us, large to the atoms');
  }

  const px = fr.px, ptext = panel(W, k); let row = fr.row;
  const say = (i: string, t: string, when: number, extra: Record<string, unknown> = {}) => { props.push(ptext(i, px, row, t, 28 * k, {show: [when, 1e9], ...extra} as never)); row += wrapText(t, 28 * k, W - px - 40 * k).length * 1.28 * 28 * k + 8 * k; };
  say('s1', story, 0.3, {weight: 700});
  if (second) say('s2', second, 1.3, {style: {fill: 'muted'}});
  if (!s.illustrative) facts.filter(t => /\d/.test(t)).slice(0, 3).forEach((t, i) => say(`f${i}`, t, 2.3 + i * 0.5));
  return scene(s, W, H, dur, plane, props, [], {verb: 'electric', facts, anchors});
}
