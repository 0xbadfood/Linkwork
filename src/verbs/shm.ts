// shm: simple harmonic motion, computed (NCERT Class 11 Physics, Ch. 13 Oscillations; 2026-11-01). One oscillator
// x = A cos(ωt + φ), with ω from T or from √(k/m), seen four ways; every number and curve comes from that one line.
//   spring  a block on a spring (or between two: k → 2k), the restoring force F = −kx arrow always towards the middle,
//           and its x–t curve drawn underneath; `damping` lets it die away
//   circle  the reference circle: P goes round at ω, its projection P′ on the diameter does SHM and draws x against t;
//           `vectors` shows P's velocity or acceleration and the part of it P′ has
//   graphs  x, v and a stacked on one time axis, one cursor across them, so the quarter-period phase differences are
//           read off; `compare` lays a second motion (other A, T or φ) over x
//   energy  K, U and K + U against time and against x, with a dot on each
import type {Key} from '../keys.ts';
import type {Plane} from '../plane.ts';
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {round} from '../vec.ts';
import {n2, panel, scene, text} from './calculus.ts';
import {frame} from './vectors.ts';

type P2 = [number, number];
export const SHM_SHOWS = ['spring', 'circle', 'graphs', 'energy'] as const;
export type ShmSpec = {verb: 'shm'; show: (typeof SHM_SHOWS)[number]; A?: number; T?: number; k?: number; mass?: number; phase?: number;
  springs?: 1 | 2; damping?: number; sense?: 'anticlockwise' | 'clockwise'; vectors?: 'none' | 'velocity' | 'acceleration';
  compare?: {A?: number; T?: number; phase?: number}; cycles?: number; at?: number; reach?: number; label?: string;
  title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const f = (v: number) => { const r = round(v, 9); return n2(r, Math.abs(r) >= 100 || Number.isInteger(r) ? 0 : Math.abs(r) < 0.1 ? 3 : 2); };

export function shmErrors(s: ShmSpec): string[] {
  const e: string[] = [], v = 'shm';
  if (!SHM_SHOWS.includes(s.show)) return [`${v}: show is one of ${SHM_SHOWS.join(', ')}`];
  for (const n of ['A', 'T', 'k', 'mass', 'reach'] as const) if (s[n] !== undefined && !(isNum(s[n]) && s[n]! > 0)) e.push(`${v}: ${n} is above 0`);
  if (s.T !== undefined && s.k !== undefined) e.push(`${v}: give T, or k and mass (T then follows from them), not both`);
  if (s.k !== undefined && s.mass === undefined) e.push(`${v}: k needs mass: ω = √(k/m)`);
  if (!s.illustrative) {
    if (s.A === undefined) e.push(`${v}: give A, the amplitude in m; or, when the narration states no numbers, set illustrative: true`);
    if (s.T === undefined && s.k === undefined) e.push(`${v}: give T (s), or k (N/m) and mass (kg); or set illustrative: true`);
    if (s.show === 'energy' && s.mass === undefined) e.push(`${v}: energy needs mass (kg): E = ½mω²A²`);
  }
  if (s.phase !== undefined && !(isNum(s.phase) && Math.abs(s.phase) <= 360)) e.push(`${v}: phase is φ in degrees, −360 to 360`);
  if (s.springs !== undefined && ![1, 2].includes(s.springs)) e.push(`${v}: springs is 1, or 2 for a block between two springs`);
  if (s.springs === 2 && s.show !== 'spring' && s.show !== 'energy') e.push(`${v}: springs: 2 is for show spring or energy`);
  if (s.damping !== undefined) {
    if (s.show !== 'spring') e.push(`${v}: damping is for show spring`);
    if (!(isNum(s.damping) && s.damping >= 0)) e.push(`${v}: damping is a decay rate in 1/s, 0 or above`);
  }
  if (s.sense !== undefined && !['anticlockwise', 'clockwise'].includes(s.sense)) e.push(`${v}: sense is anticlockwise or clockwise`);
  if (s.vectors !== undefined) {
    if (!['none', 'velocity', 'acceleration'].includes(s.vectors)) e.push(`${v}: vectors is none, velocity or acceleration`);
    if (s.show !== 'circle') e.push(`${v}: vectors is for show circle`);
  }
  if (s.compare !== undefined) {
    if (s.show !== 'graphs') e.push(`${v}: compare is for show graphs`);
    for (const n of ['A', 'T'] as const) if (s.compare?.[n] !== undefined && !(isNum(s.compare[n]) && s.compare[n]! > 0)) e.push(`${v}: compare.${n} is above 0`);
    if (s.compare?.phase !== undefined && !isNum(s.compare.phase)) e.push(`${v}: compare.phase is in degrees`);
    if (s.compare && s.compare.A === undefined && s.compare.T === undefined && s.compare.phase === undefined) e.push(`${v}: compare changes at least one of A, T, phase`);
  }
  if (s.cycles !== undefined && !(isNum(s.cycles) && s.cycles >= 1 && s.cycles <= 6)) e.push(`${v}: cycles is how many periods to show, 1 to 6`);
  if (s.at !== undefined && !(isNum(s.at) && s.at >= 0)) e.push(`${v}: at is a time in s, 0 or above`);
  if (e.length) return e;
  const o = model(s);
  if (s.damping !== undefined && s.damping >= o.w / 3) e.push(`${v}: damping must stay under ω/3 = ${f(o.w / 3)} per second, so it still oscillates`);
  if (s.reach !== undefined && o.A > s.reach) e.push(`${v}: A leaves the fixed reach: widen reach or lower A`);
  return e;
}

function model(s: ShmSpec) {
  const n = s.springs ?? 1, kEff = s.k !== undefined ? n * s.k : undefined;
  const m = s.mass ?? 1, A = s.A ?? 1, T = kEff !== undefined ? 2 * Math.PI * Math.sqrt(m / kEff) : s.T ?? 2;
  const w = 2 * Math.PI / T, phi = (s.phase ?? 0) * Math.PI / 180, g = s.damping ?? 0, sg = s.sense === 'clockwise' ? -1 : 1;
  const x = (t: number) => A * Math.exp(-g * t) * Math.cos(w * t + phi);
  const v = (t: number) => A * Math.exp(-g * t) * (-g * Math.cos(w * t + phi) - w * Math.sin(w * t + phi));
  const a = (t: number) => -(w * w + g * g) * x(t) - 2 * g * v(t);
  return {A, T, w, phi, m, g, sg, kEff: kEff ?? m * w * w, x, v, a};
}

export function shm(s: ShmSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080;
  const fr = frame(W, H, k, s.title), box = fr.box, props: Prop[] = [...fr.titles];
  const plane: Plane = {id: 'p', x: [0, 1], y: [0, 1], box};
  const o = model(s), {A, T, w, x, v, a, m} = o, E0 = m * w * w * A * A / 2;
  const cycles = s.cycles ?? (s.damping ? 5 : 2), span = cycles * T;
  // a period on screen stays between 1 and 5 s; outside that the film says it is slowed or sped up
  const shown = Math.max(1, Math.min(5, T)), rate = shown / T, lead = 1, end = lead + span * rate;
  const steps = Math.min(240, Math.round(48 * cycles));
  const when = (i: number) => span * i / steps, at = (i: number) => lead + when(i) * rate;
  const key = (fn: (t: number) => number): Key[] => Array.from({length: steps + 1}, (_, i) => (i ? [at(i), fn(when(i)), 'linear'] : [at(i), fn(when(i))]) as Key);
  const bw = box[2] - box[0], bh = box[3] - box[1];
  const line = (id: string, x1: number, y1: number, x2: number, y2: number, stroke = 'muted', width = 3, dash = false, extra = {}) =>
    props.push({id, type: 'line', x1, y1, x2, y2, style: {stroke, width: width * k, ...(dash ? {dash: [8 * k, 6 * k]} : {})}, ...extra} as Prop);
  const label = (id: string, X: number, Y: number, t: string, fill = 'muted', align = 'middle', size = 26) =>
    props.push(text(id, X, Y, t, size * k, {weight: 700, align, style: {fill}}));
  /** A curve that draws itself as the motion runs: short segments, each from its moment on. */
  const trace = (id: string, pt: (t: number) => P2, stroke: string) => {
    for (let i = 0; i < steps; i++) { const p = pt(when(i)), q = pt(when(i + 1)); line(`${id}${i}`, p[0], p[1], q[0], q[1], stroke, 4, false, {show: [at(i), 1e9]}); }
  };
  const dot = (id: string, X: Key[] | number, Y: Key[] | number, fill = 'accent', r = 11) =>
    props.push({id, type: 'circle', x: typeof X === 'number' ? X : 0, y: typeof Y === 'number' ? Y : 0, r: r * k, style: {fill, stroke: 'ink', width: 2 * k}, layer: 3,
      keys: {...(typeof X === 'number' ? {} : {x: X}), ...(typeof Y === 'number' ? {} : {y: Y})}} as Prop);
  /** One chart: value 0 at `zero`, ±peak filling half-height; time or any x across. */
  const chart = (id: string, top: number, h: number, name: string, peak: number, curves: [string, (t: number) => number, boolean?][], base = false) => {
    const y0 = base ? top + h : top + h / 2, sy = (base ? h * 0.92 : h * 0.46) / peak;
    const X = (t: number) => box[0] + 0.07 * bw + (t / span) * 0.9 * bw, Y = (val: number) => y0 - val * sy;
    line(`${id}ax`, box[0] + 0.07 * bw, y0, box[0] + 0.98 * bw, y0); line(`${id}ay`, box[0] + 0.07 * bw, top, box[0] + 0.07 * bw, top + h);
    label(`${id}n`, box[0] + 0.055 * bw, top + 0.5 * h + 9 * k, name, 'ink', 'end', 30);
    curves.forEach(([col, fn, dashed], c) => props.push({id: `${id}c${c}`, type: 'polyline', points: Array.from({length: steps * 2 + 1}, (_, i) => { const t = span * i / (steps * 2); return [X(t), Y(fn(t))] as P2; }),
      style: {stroke: col, width: 4 * k, ...(dashed ? {dash: [12 * k, 8 * k]} : {})}} as Prop));
    return {X, Y, y0};
  };
  const ticks = (y: number, y2: number) => { for (let c = 1; c <= cycles; c++) { const X = box[0] + 0.07 * bw + (c / cycles) * 0.9 * bw;
    line(`tk${c}`, X, y, X, y2, 'faint', 2, true); label(`tkl${c}`, X, y2 + 30 * k, c === 1 ? 'T' : `${c}T`); } };

  const anchors: Record<string, P2> = {};
  if (s.show === 'spring') {
    const two = s.springs === 2, damped = (s.damping ?? 0) > 0, reach = s.reach ?? A, cx = box[0] + 0.5 * bw, floor = box[1] + 0.40 * bh;
    const side = 0.12 * bw, ppm = 0.24 * bw / reach, wallL = box[0] + 0.02 * bw, wallR = box[0] + 0.98 * bw, cy = floor - side / 2, zig = 0.2 * side, bodyX = (t: number) => cx + x(t) * ppm;
    anchors.O = [cx, floor]; anchors.plus_A = [cx + A * ppm, floor];
    line('floor', box[0], floor, box[2], floor, 'muted', 4);
    props.push({id: 'wall', type: 'rect', x: wallL - 20 * k, y: floor - 1.5 * side, w: 20 * k, h: 1.5 * side, style: {fill: 'faint', stroke: 'muted', width: 3 * k}} as Prop);
    if (two) props.push({id: 'wall2', type: 'rect', x: wallR, y: floor - 1.5 * side, w: 20 * k, h: 1.5 * side, style: {fill: 'faint', stroke: 'muted', width: 3 * k}} as Prop);
    const coil = (id: string, fixed: number, end: (t: number) => number) => { const coils = 14;
      for (let i = 0; i < coils; i++) {
        const ya = i === 0 ? cy : cy + (i % 2 ? -zig : zig), yb = i === coils - 1 ? cy : cy + ((i + 1) % 2 ? -zig : zig);
        props.push({id: `${id}${i}`, type: 'line', x1: 0, y1: ya, x2: 0, y2: yb, style: {stroke: 'ink', width: 3 * k},
          keys: {x1: key(t => fixed + (end(t) - fixed) * i / coils), x2: key(t => fixed + (end(t) - fixed) * (i + 1) / coils)}} as Prop);
      } };
    coil('coil', wallL, t => bodyX(t) - side / 2);
    if (two) coil('coilr', wallR, t => bodyX(t) + side / 2);
    props.push({id: 'body', type: 'object', name: 'block', x: 0, y: floor, size: side, layer: 2, label: s.label, keys: {x: key(bodyX)}} as Prop);
    // the marks: the middle and the two extremes, on the floor
    const tick = (id: string, X: number, t2: string, col = 'muted') => { line(id, X, floor + 6 * k, X, floor + 26 * k, col, 3); label(`${id}l`, X, floor + 56 * k, t2, col); };
    tick('mo', cx, 'O', 'ink'); tick('ma', cx + A * ppm, '+A'); tick('mb', cx - A * ppm, '−A');
    // the restoring force, always towards O, its length following x
    const yF = floor - 1.28 * side, sF = 0.2 * bw / A;
    props.push({id: 'force', type: 'arrow', x1: 0, y1: yF, x2: 0, y2: yF, head: 16 * k, style: {stroke: 'bad', width: 6 * k}, layer: 3,
      keys: {x1: key(bodyX), x2: key(t => bodyX(t) - x(t) * sF)}} as Prop);
    props.push(text('lF', 0, yF - 18 * k, 'F', 30 * k, {weight: 700, align: 'middle', style: {fill: 'bad'}, keys: {x: key(bodyX)}} as never));
    // underneath, x against t, drawn as it moves
    const top = floor + 90 * k, h = box[3] - top - 40 * k;
    const c = chart('xt', top, h, 'x', A, []);
    if (damped) props.push({id: 'env', type: 'polyline', points: Array.from({length: 61}, (_, i) => { const t = span * i / 60; return [c.X(t), c.Y(A * Math.exp(-o.g * t))] as P2; }), style: {stroke: 'faint', width: 2 * k, dash: [8 * k, 6 * k]}} as Prop);
    trace('tr', t => [c.X(t), c.Y(x(t))], 'accent');
    dot('dt', key(c.X), key(t => c.Y(x(t))));
    ticks(top, top + h);
  } else if (s.show === 'circle') {
    const R = Math.min(0.23 * bh, 0.3 * bw), cx = box[0] + 0.5 * bw, cy = box[1] + 0.03 * bh + R, sg = o.sg;
    const th = (t: number) => sg * (w * t + o.phi), Px = (t: number) => cx + R * Math.cos(th(t)), Py = (t: number) => cy - R * Math.sin(th(t));
    props.push({id: 'ring', type: 'circle', x: cx, y: cy, r: R, style: {stroke: 'muted', width: 3 * k, fill: 'none'}} as Prop);
    line('diam', cx - 1.2 * R, cy, cx + 1.2 * R, cy); label('lx', cx + 1.26 * R, cy + 9 * k, 'x', 'muted', 'start', 30); dot('oo', cx, cy, 'muted', 6); label('lo', cx - 14 * k, cy + 34 * k, 'O', 'muted', 'end');
    props.push({id: 'rad', type: 'line', x1: cx, y1: cy, x2: 0, y2: 0, style: {stroke: 'ink', width: 3 * k}, keys: {x2: key(Px), y2: key(Py)}} as Prop,
      {id: 'drop', type: 'line', x1: 0, y1: 0, x2: 0, y2: cy, style: {stroke: 'cool', width: 3 * k, dash: [8 * k, 6 * k]}, keys: {x1: key(Px), y1: key(Py), x2: key(Px)}} as Prop);
    dot('P', key(Px), key(Py), 'cool', 13); dot('Pp', key(Px), cy, 'accent', 14);
    props.push(text('lP', 0, 0, 'P', 30 * k, {weight: 700, align: 'middle', style: {fill: 'cool'}, keys: {x: key(t => Px(t) + 34 * k * Math.cos(th(t))), y: key(t => Py(t) - 34 * k * Math.sin(th(t)) + 10 * k)}} as never),
      text('lPp', 0, cy + 46 * k, 'P′', 30 * k, {weight: 700, align: 'middle', style: {fill: 'accent'}, keys: {x: key(Px)}} as never));
    if (s.vectors && s.vectors !== 'none') {
      const vel = s.vectors === 'velocity', L = 0.75 * R;
      const dx = (t: number) => (vel ? -Math.sin(th(t)) * sg : -Math.cos(th(t))) * L, dy = (t: number) => (vel ? Math.cos(th(t)) * sg : -Math.sin(th(t))) * L;
      props.push({id: 'vecP', type: 'arrow', x1: 0, y1: 0, x2: 0, y2: 0, head: 16 * k, style: {stroke: 'cool', width: 5 * k}, layer: 2, keys: {x1: key(Px), y1: key(Py), x2: key(t => Px(t) + dx(t)), y2: key(t => Py(t) - dy(t))}} as Prop,
        {id: 'vecQ', type: 'arrow', x1: 0, y1: cy, x2: 0, y2: cy, head: 16 * k, style: {stroke: 'accent', width: 6 * k}, layer: 2, keys: {x1: key(Px), x2: key(t => Px(t) + dx(t))}} as Prop);
    }
    // below the circle, time running downwards: P′ draws its own cosine, straight under where it is
    const top = cy + R + 0.09 * bh, bot = box[3] - 10 * k, Y = (t: number) => top + (t / span) * (bot - top);
    line('tax', cx, top - 16 * k, cx, bot); label('lt', cx + 16 * k, bot, 't', 'muted', 'start', 30);
    line('tlA', cx - R, top - 16 * k, cx - R, bot, 'faint', 2, true); line('tlB', cx + R, top - 16 * k, cx + R, bot, 'faint', 2, true);
    trace('tr', t => [Px(t), Y(t)], 'accent');
    dot('dt', key(Px), key(Y), 'accent', 10);
  } else if (s.show === 'graphs') {
    const c2 = s.compare, oc = c2 ? model({...s, A: c2.A ?? A, T: c2.T ?? T, phase: c2.phase ?? s.phase, damping: 0, k: undefined}) : undefined;
    const top = box[1] + 0.02 * bh, gap = 0.035 * bh;
    if (oc) {
      const h = 0.86 * bh, peak = Math.max(A, oc.A), c = chart('cx', top, h, 'x', peak, [['accent', x], ['cool', oc.x, true]]);
      dot('d0', key(c.X), key(t => c.Y(x(t)))); dot('d1', key(c.X), key(t => c.Y(oc.x(t))), 'cool');
      ticks(top, top + h);
    } else {
      const h = (0.86 * bh - 2 * gap) / 3;
      const rows: [string, string, string, number, (t: number) => number][] = [['cx', 'x', 'accent', A, x], ['cv', 'v', 'cool', w * A, v], ['ca', 'a', 'bad', w * w * A, a]];
      let X = (_: number) => 0;
      rows.forEach(([id, name, col, peak, fn], i) => { const ty = top + i * (h + gap), c = chart(id, ty, h, name, peak, [[col, fn]]); X = c.X; dot(`d${id}`, key(c.X), key(t => c.Y(fn(t))), col); });
      props.push({id: 'cursor', type: 'line', x1: 0, y1: top, x2: 0, y2: top + 3 * h + 2 * gap, style: {stroke: 'ink', width: 2 * k, dash: [6 * k, 6 * k]}, layer: 2, keys: {x1: key(X), x2: key(X)}} as Prop);
      ticks(top, top + 3 * h + 2 * gap);
    }
  } else {
    const top = box[1] + 0.02 * bh, h = 0.4 * bh, gap = 0.12 * bh, K = (t: number) => m * v(t) ** 2 / 2, U = (t: number) => o.kEff * x(t) ** 2 / 2;
    const c = chart('et', top, h, 'E', E0 * 1.08, [['accent', K], ['cool', U], ['ink', () => E0, true]], true);
    dot('dK', key(c.X), key(t => c.Y(K(t)))); dot('dU', key(c.X), key(t => c.Y(U(t))), 'cool');
    ticks(top, top + h);
    // against x: the parabola U = ½kx² and K, its mirror, under one flat E
    const t2 = top + h + gap, h2 = 0.86 * bh - h - gap, y0 = t2 + h2, sy = 0.92 * h2 / (E0 * 1.08), cx = box[0] + 0.52 * bw, sx = 0.4 * bw / A, Y = (e: number) => y0 - e * sy;
    const par = (fn: (X: number) => number): P2[] => Array.from({length: 81}, (_, i) => { const X = -A + 2 * A * i / 80; return [cx + X * sx, Y(fn(X))]; });
    line('ex', cx - 1.15 * A * sx, y0, cx + 1.15 * A * sx, y0); line('ey', cx, t2, cx, y0);
    props.push({id: 'pU', type: 'polyline', points: par(X => o.kEff * X * X / 2), style: {stroke: 'cool', width: 4 * k}} as Prop,
      {id: 'pK', type: 'polyline', points: par(X => E0 - o.kEff * X * X / 2), style: {stroke: 'accent', width: 4 * k}} as Prop,
      {id: 'pE', type: 'polyline', points: par(() => E0), style: {stroke: 'ink', width: 4 * k, dash: [12 * k, 8 * k]}} as Prop);
    label('lxa', cx + A * sx, y0 + 32 * k, '+A'); label('lxb', cx - A * sx, y0 + 32 * k, '−A'); label('lxo', cx, y0 + 32 * k, 'O'); label('lxx', cx + 1.2 * A * sx, y0 + 9 * k, 'x', 'muted', 'start', 30);
    dot('dxU', key(t => cx + x(t) * sx), key(t => Y(U(t))), 'cool'); dot('dxK', key(t => cx + x(t) * sx), key(t => Y(K(t))));
    label('kK', box[0] + 0.2 * bw, top - 2 * k + h + 44 * k, 'K', 'accent', 'middle', 30); label('kU', box[0] + 0.3 * bw, top - 2 * k + h + 44 * k, 'U', 'cool', 'middle', 30); label('kE', box[0] + 0.4 * bw, top - 2 * k + h + 44 * k, 'K + U', 'ink', 'middle', 30);
  }

  // readouts, live, then the story
  const px = fr.px, ptext = panel(W, k);
  let row = fr.row;
  const ro = (id: string, t: string, fn: (t: number) => number, name: string, decimals = 2) => {
    props.push({id, type: 'readout', x: px, y: row, size: 28 * k, text: t, decimals, show: [0.3, 1e9], measures: {[name]: {kind: 'keys', keys: key(fn)}}} as Prop);
    row += 1.35 * 28 * k;
  };
  const dec = A < 0.5 ? 3 : 2;
  ro('rot', 't = {t} s', t => t, 't');
  if (s.show === 'energy') {
    ro('rox', 'x = {x} m', x, 'x', dec);
    ro('rok', 'K = {K} J', t => m * v(t) ** 2 / 2, 'K', E0 < 1 ? 3 : 2); ro('rou', 'U = {U} J', t => o.kEff * x(t) ** 2 / 2, 'U', E0 < 1 ? 3 : 2); ro('roe', 'K + U = {E} J', () => E0, 'E', E0 < 1 ? 3 : 2);
  } else {
    ro('rox', 'x = {x} m', x, 'x', dec); ro('rov', 'v = {v} m/s', v, 'v', dec); ro('roa', 'a = {a} m/s²', a, 'a', dec);
    if (s.show === 'spring' && !s.damping) ro('rof', 'F = −kx = {F} N', t => -o.kEff * x(t), 'F', o.kEff * A < 1 ? 3 : 2);
  }
  row += 8 * k;
  const say = (id: string, t: string, when: number, extra: Record<string, unknown> = {}) => {
    props.push(ptext(id, px, row, t, 27 * k, {show: [when, 1e9], ...extra} as never));
    row += wrapText(t, 27 * k, W - px - 40 * k).length * 1.28 * 27 * k + 5 * k;
  };
  const story = {
    spring: s.damping ? 'Damping takes energy away: the swings shrink, the rhythm hardly changes' : s.springs === 2 ? 'Both springs push the same way, towards the middle: F = −2kx' : 'The force always points back to the middle, and grows with x: F = −kx',
    circle: s.vectors === 'velocity' ? "P′'s velocity is the part of P's velocity along the diameter" : s.vectors === 'acceleration' ? "P's acceleration points to the centre; P′ has the part along the diameter: a = −ω²x" : 'P goes round steadily; its shadow P′ on the diameter does simple harmonic motion',
    graphs: s.compare ? 'Same form, x = A cos(ωt + φ): A sets the height, T the spacing, φ the shift' : 'Same period, different phase: each curve leads the one above it by a quarter period',
    energy: 'K and U trade places twice in each period; their sum stays ½kA²',
  }[s.show];
  say('s1', story, lead, {weight: 700});
  // every number a narration may quote
  const facts = [`A = ${f(A)} m`, `period T = ${f(T)} s`, `frequency ν = 1/T = ${f(1 / T)} Hz`, `angular frequency ω = 2π/T = ${f(w)} rad/s`,
    `greatest speed ωA = ${f(w * A)} m/s, at x = 0`, `greatest acceleration ω²A = ${f(w * w * A)} m/s², at the extremes`];
  if (s.k !== undefined) facts.push(`${s.springs === 2 ? `two springs act as k = 2 × ${f(s.k)} = ${f(o.kEff)} N/m; ` : ''}ω = √(k/m) = ${f(w)} rad/s`, `greatest force kA = ${f(o.kEff * A)} N`);
  if (s.mass !== undefined) facts.push(`total energy E = ½kA² = ${f(E0)} J`);
  if (s.at !== undefined) facts.push(`at t = ${f(s.at)} s: x = ${f(x(s.at))} m, v = ${f(v(s.at))} m/s, a = ${f(a(s.at))} m/s²`);
  if (s.compare) { const oc = model({...s, A: s.compare.A ?? A, T: s.compare.T ?? T, phase: s.compare.phase ?? s.phase, damping: 0, k: undefined}); facts.push(`the dashed curve: A = ${f(oc.A)} m, T = ${f(oc.T)} s, φ = ${f((s.compare.phase ?? s.phase ?? 0))}°`); }
  if (!s.illustrative) {
    say('f0', `T = ${f(T)} s, ω = ${f(w)} rad/s`, lead + 0.8, {style: {fill: 'muted'}});
    if (s.at !== undefined) say('f1', facts[facts.length - (s.compare ? 2 : 1)], end + 0.2);
    if (rate < 0.95 || rate > 1.05) say('f2', rate < 1 ? 'Slowed down to watch' : 'Sped up to watch', lead, {style: {fill: 'muted'}});
  }
  return scene(s, W, H, end + 2.4, plane, props, [], {verb: 'shm', facts, anchors});
}
