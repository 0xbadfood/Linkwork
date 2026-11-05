// em_device: electromagnetic devices, each driven by its own mechanism (ICSE Class 10 Electro-magnetism, 2026-11-05).
//   electromagnet  a soft-iron core in a coil: the key closes, the core is magnetised (its N end found by the clock
//                  rule from the current's sense), iron pins jump to its ends; the key opens, they drop. `then` switches
//                  it on again with more (or fewer) turns or current: the pins lifted follow nI.
//   bell           the electric bell: a U-shaped electromagnet, a soft-iron armature on a spring strip, hammer, gong and
//                  contact screw. A small simulation drives it: current flows only while the strip touches the screw,
//                  the magnet pulls the armature, the hammer strikes, the contact opens, the spring brings it back.
//   dc_motor       coil ABCD between N and S, split-ring commutator and brushes: F = I l × B on the sides (Fleming's
//                  left-hand rule), a couple ∝ cos φ, integrated with inertia and friction; the commutator reverses the
//                  current as the coil passes the vertical (no current while the brushes meet the gaps). `commutator:
//                  false` puts slip rings in its place: the couple turns the coil back and it settles vertical.
//   ac_generator   the coil turned from outside at a steady rate, slip rings and brushes: each side's emf from v × B,
//                  ε = NBAω sin θ (θ from the vertical, where the coil is across the field) traced live against time.
// The Class 12 end-on generator is induction's show generator; this is the book's perspective drawing with the rings.
// (2026-11-05: icph1-10 C6, C7, C9, C11 had no verb: the bell's make-and-break and the commutator's reversal could
// only be described.)
import type {Key} from '../keys.ts';
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {round, type Vec} from '../vec.ts';
import {peakEmf} from './induction.ts';
import {frame} from './vectors.ts';

export const EM_KINDS = ['electromagnet', 'bell', 'dc_motor', 'ac_generator'] as const;
export type EmDeviceSpec = {verb: 'em_device'; kind: (typeof EM_KINDS)[number];
  /** electromagnet, dc_motor, ac_generator: turns of the coil; electromagnet, dc_motor: current in A. */
  turns?: number; current?: number;
  /** electromagnet: switched on a second time with these turns and/or current. */
  then?: {turns?: number; current?: number};
  /** electromagnet, dc_motor: the battery the other way round. */
  reverse?: boolean;
  /** bell: strikes of the hammer while the push is held (2 to 8). */
  rings?: number;
  /** dc_motor: false puts slip rings in place of the split ring; start: the coil plane's angle from the field. */
  commutator?: boolean; start?: number;
  /** dc_motor, ac_generator: B in T, the coil's area in m²; ac_generator: ν in Hz (the real one: the drawing is slowed). */
  B?: number; A?: number; nu?: number;
  /** ac_generator: whole turns shown (1 to 3). */
  rotations?: number;
  panel?: boolean; seconds?: number; title?: string; illustrative?: boolean; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const RAD = Math.PI / 180, TAU = 2 * Math.PI;
const fmt = (x: number, d = 3) => `${+x.toPrecision(d)}`;
const FIELDS: Record<string, (typeof EM_KINDS)[number][]> = {turns: ['electromagnet', 'dc_motor', 'ac_generator'], current: ['electromagnet', 'dc_motor'], then: ['electromagnet'],
  reverse: ['electromagnet', 'dc_motor'], rings: ['bell'], commutator: ['dc_motor'], start: ['dc_motor'], B: ['dc_motor', 'ac_generator'], A: ['dc_motor', 'ac_generator'],
  nu: ['ac_generator'], rotations: ['ac_generator']};

// ---- the physics, exported for tests -------------------------------------------------------------------------------

/** Which end of a horizontal coil is N: the current entering at the left end runs up its front strands, anticlockwise
 * seen from the left (clock rule), so the left end is N. */
export const electromagnetNorth = (reverse = false): 'left' | 'right' => (reverse ? 'right' : 'left');
/** Pins an electromagnet lifts: in proportion to its ampere-turns nI against a reference that lifts `base`. */
export const pinsLifted = (nI: number, ref: number, base: number) => Math.max(0, Math.min(10, Math.round(base * nI / ref)));

/** The current's sense in side AB of a motor coil (+1: along the axle toward the viewer, −1 away, 0 none), with AB at
 * angle φ from the field direction. A split ring keeps the side nearer S carrying current toward the viewer (force up,
 * anticlockwise couple); while the brushes meet the gaps (within `gap` degrees of the vertical) no current flows.
 * Slip rings never reverse it. */
export const motorCurrent = (phi: number, commutator = true, gap = 7) => !commutator ? 1 : Math.abs(Math.cos(phi)) < Math.sin(gap * RAD) ? 0 : Math.sign(Math.cos(phi));

/** The motor turned by its couple: J φ'' = s cos φ − b φ' (s the current's sense, a couple nBIA of 1), from rest at
 * `start` degrees; the key closes at tOn. Samples every 1/120 s. */
export function motorRun(o: {commutator?: boolean; reverse?: boolean; start?: number; tOn: number; T: number}) {
  const J = 0.6, b = 0.405, dir = o.reverse ? -1 : 1, dt = 1 / 1200, every = 10, out: {t: number; phi: number; w: number; s: number}[] = [];
  let phi = (o.start ?? 0) * RAD, w = 0;
  for (let i = 0; i <= Math.ceil(o.T / dt); i++) {
    const t = i * dt, s = t >= o.tOn ? dir * motorCurrent(phi, o.commutator !== false) : 0;
    if (i % every === 0) out.push({t, phi, w, s});
    w += (s * Math.cos(phi) - b * w) / J * dt; phi += w * dt;
  }
  return out;
}

/** The generator's emf as a fraction of NBAω, θ the angle turned from the vertical (the coil's plane across the field):
 * sin θ, zero across the field, largest along it. */
export const generatorEmf = (thetaDeg: number) => Math.sin(thetaDeg * RAD);
/** The emf's sense in side AB (+1 toward the viewer) from v × B, AB at angle φ turning anticlockwise in a field along +x. */
export const sideEmf = (phi: number) => { const vy = Math.cos(phi); return Math.abs(vy) < 1e-9 ? 0 : -Math.sign(vy); };

/** The bell: x is the armature's travel (0 against the contact screw, 1 when the hammer meets the gong). The circuit is
 * closed only while the push is held and the strip still touches the screw (x below `contact`); the coil's current
 * then rises (and later falls) over a short time, as an inductance does, and the magnet's pull follows it; the spring
 * brings the strip back to the screw. Without that lag the pull would brake the returning strip as much as it later
 * pushes it, and the strokes would die away. */
export function bellRun(rings: number, tPush = 1) {
  const kS = 9, F = 40, contact = 0.25, e = 0.3, damp = 0.5, tau = 0.06, dt = 1 / 1000, every = 8;
  const out: {t: number; x: number; on: boolean; i: number}[] = [], strikes: number[] = [];
  let x = 0, v = 0, cur = 0, release = 1e9;
  for (let i = 0; ; i++) {
    const t = i * dt, pushed = t >= tPush && t < release, on = pushed && x < contact;
    if (i % every === 0) out.push({t, x, on, i: cur});
    cur += ((on ? 1 : 0) - cur) / tau * dt;
    v += (F * cur - kS * x - damp * v) * dt; x += v * dt;
    if (x >= 1) { x = 1; v = -e * Math.abs(v); strikes.push(t); if (strikes.length === rings) release = t + 0.05; }
    if (x <= 0) { x = 0; v = Math.max(0, v); }
    if (t > release + 1.2 || t > 60) break;
  }
  return {samples: out, strikes, release};
}

export function emDeviceErrors(s: EmDeviceSpec): string[] {
  const e: string[] = [], W = 'em_device';
  if (!EM_KINDS.includes(s.kind)) return [`${W}: kind is one of ${EM_KINDS.join(', ')}`];
  for (const [f, kinds] of Object.entries(FIELDS)) if ((s as Record<string, unknown>)[f] !== undefined && !kinds.includes(s.kind)) e.push(`${W}: ${f} is for kind ${kinds.join(' or ')}, not ${s.kind}`);
  if (s.turns !== undefined && !(Number.isInteger(s.turns) && s.turns >= 1 && s.turns <= 5000)) e.push(`${W}: turns is a whole number of turns, 1 to 5000`);
  if (s.current !== undefined && !(isNum(s.current) && s.current > 0 && s.current <= 50)) e.push(`${W}: current is in A, above 0 and up to 50`);
  for (const f of ['reverse', 'commutator', 'panel'] as const) if (s[f] !== undefined && typeof s[f] !== 'boolean') e.push(`${W}: ${f} is true or false`);
  if (s.then !== undefined) {
    const t = s.then;
    if (typeof t !== 'object' || t === null || (t.turns === undefined && t.current === undefined)) e.push(`${W}: then is {turns?, current?}: the second switching-on with more (or fewer) turns or current`);
    else {
      if (t.turns !== undefined && !(Number.isInteger(t.turns) && t.turns >= 1 && t.turns <= 5000)) e.push(`${W}: then.turns is a whole number, 1 to 5000`);
      if (t.current !== undefined && !(isNum(t.current) && t.current > 0 && t.current <= 50)) e.push(`${W}: then.current is in A, above 0 and up to 50`);
      const r = ((t.turns ?? s.turns ?? 50) * (t.current ?? s.current ?? 1)) / ((s.turns ?? 50) * (s.current ?? 1));
      if (isNum(r) && Math.abs(r - 1) < 0.15) e.push(`${W}: then changes nI too little to see (${fmt(r, 2)} times): change turns or current by a quarter or more`);
      if (isNum(r) && (r > 3.3 || r < 0.3)) e.push(`${W}: then makes it ${fmt(r, 2)} times as strong: keep it within 0.3 to 3.3 times (the pins run out)`);
    }
  }
  if (s.rings !== undefined && !(Number.isInteger(s.rings) && s.rings >= 2 && s.rings <= 8)) e.push(`${W}: rings is the number of strikes, 2 to 8`);
  if (s.start !== undefined && !(isNum(s.start) && s.start >= 0 && s.start <= 90)) e.push(`${W}: start is the coil plane's angle from the field, 0 (along it, the largest couple) to 90 (vertical: no couple, it cannot start)`);
  if (s.B !== undefined && !(isNum(s.B) && s.B > 0 && s.B <= 5)) e.push(`${W}: B is the field in T, above 0 and up to 5`);
  if (s.A !== undefined && !(isNum(s.A) && s.A > 0 && s.A <= 1)) e.push(`${W}: A is the coil's area in m², above 0 and up to 1`);
  if (s.nu !== undefined && !(isNum(s.nu) && s.nu > 0 && s.nu <= 1000)) e.push(`${W}: nu is the turning frequency in Hz (50 for the mains), above 0`);
  if (s.rotations !== undefined && !(Number.isInteger(s.rotations) && s.rotations >= 1 && s.rotations <= 3)) e.push(`${W}: rotations is 1 to 3 whole turns`);
  if (s.seconds !== undefined && !(isNum(s.seconds) && s.seconds >= 6 && s.seconds <= 30)) e.push(`${W}: seconds is 6 to 30`);
  return e;
}

// ---- drawing kit ------------------------------------------------------------------------------------------------------

type Cap = {t: number; text: string; bold?: boolean; fill?: string};
function kit(s: EmDeviceSpec) {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, fr = frame(W, H, k, s.title), [x0, y0, x1, y1] = fr.box;
  const bx = x0, by = y0, bw = x1 - x0, bh = y1 - y0, S = Math.min(bw, bh), props: Prop[] = [...fr.titles];
  let n = 0; const id = (p: string) => `${p}${n++}`;
  const r2 = (v: number) => round(v, 2);
  const line = (p: Vec, q: Vec, stroke = 'ink', width = 3, extra: Record<string, unknown> = {}) =>
    props.push({id: id('l'), type: 'line', x1: r2(p[0]), y1: r2(p[1]), x2: r2(q[0]), y2: r2(q[1]), style: {stroke, width: width * k, cap: 'round'}, layer: 3, ...extra} as Prop);
  const arrow = (p: Vec, q: Vec, stroke = 'accent', width = 4, extra: Record<string, unknown> = {}) =>
    props.push({id: id('a'), type: 'arrow', x1: r2(p[0]), y1: r2(p[1]), x2: r2(q[0]), y2: r2(q[1]), head: 14 * k, style: {stroke, width: width * k}, layer: 6, ...extra} as Prop);
  const poly = (pts: Vec[], stroke = 'ink', width = 3, extra: Record<string, unknown> = {}, fill?: string) =>
    props.push({id: id('p'), type: 'polyline', points: pts.map(([a, b]) => [r2(a), r2(b)] as Vec), ...(fill ? {closed: true} : {}), style: {stroke, width: width * k, ...(fill ? {fill} : {})}, layer: 3, ...extra} as Prop);
  const rect = (x: number, y: number, w: number, h: number, fill: string, stroke = 'ink', extra: Record<string, unknown> = {}) =>
    props.push({id: id('r'), type: 'rect', x: r2(x), y: r2(y), w: r2(w), h: r2(h), r: 3 * k, style: {fill, stroke, width: 2 * k}, layer: 3, ...extra} as Prop);
  const dot = (x: number, y: number, r: number, fill: string, extra: Record<string, unknown> = {}) =>
    props.push({id: id('o'), type: 'circle', x: r2(x), y: r2(y), r: r2(r), style: {fill, stroke: 'ink', width: 2 * k}, layer: 5, ...extra} as Prop);
  const text = (x: number, y: number, t: string, fill = 'ink', size = 24, extra: Record<string, unknown> = {}) =>
    props.push({id: id('t'), type: 'text', x: r2(x), y: r2(y), text: t, size: size * k, weight: 700, align: 'middle', style: {fill, stroke: 'paper', width: 6 * k}, layer: 9, ...extra} as Prop);
  /** Keys for several values sampled together from t0 to t1. */
  const track = (t0: number, t1: number, fn: (t: number) => number[], per = 20): Key[][] => {
    const m = Math.max(1, Math.ceil((t1 - t0) * per)), out: Key[][] = [];
    for (let i = 0; i <= m; i++) { const t = t0 + (t1 - t0) * i / m, v = fn(t); v.forEach((x, j) => { (out[j] ??= []).push(i ? [round(t, 3), round(x, 1), 'linear'] : [round(t, 3), round(x, 1)]); }); }
    return out;
  };
  /** A line whose ends follow P(t) and Q(t) between t0 and t1. */
  const moving = (P: (t: number) => Vec, Q: (t: number) => Vec, t0: number, t1: number, stroke: string, width: number, extra: Record<string, unknown> = {}, type: 'line' | 'arrow' = 'line') => {
    const [a, b, c, d] = track(t0, t1, t => [...P(t), ...Q(t)]), p = P(t0), q = Q(t0);
    props.push({id: id(type === 'line' ? 'm' : 'n'), type, x1: r2(p[0]), y1: r2(p[1]), x2: r2(q[0]), y2: r2(q[1]), ...(type === 'arrow' ? {head: 14 * k} : {}), style: {stroke, width: width * k, cap: 'round'}, layer: 4, keys: {x1: a, y1: b, x2: c, y2: d}, ...extra} as Prop);
  };
  /** A key (switch) on a horizontal wire from x to x + w at y: open, closed between on and off. */
  const key = (x: number, y: number, w: number, spans: [number, number][]) => {
    dot(x, y, 6 * k, 'paper'); dot(x + w, y, 6 * k, 'paper');
    const open: Vec = [x + w * 0.85, y - w * 0.55], shut: Vec = [x + w, y - 3 * k];
    const kx: Key[] = [[0, r2(open[0])]], ky: Key[] = [[0, r2(open[1])]];
    for (const [a, b] of spans) { kx.push([a - 0.2, r2(open[0])], [a, r2(shut[0]), 'in']); ky.push([a - 0.2, r2(open[1])], [a, r2(shut[1]), 'in']); if (b < 1e8) { kx.push([b, r2(shut[0])], [b + 0.2, r2(open[0]), 'out']); ky.push([b, r2(shut[1])], [b + 0.2, r2(open[1]), 'out']); } }
    props.push({id: id('k'), type: 'line', x1: r2(x), y1: r2(y), x2: r2(open[0]), y2: r2(open[1]), style: {stroke: 'ink', width: 4 * k, cap: 'round'}, layer: 6, keys: {x2: kx, y2: ky}} as Prop);
  };
  /** A cell on a horizontal wire centred at x: long plate (+) on the left unless flipped. */
  const cell = (x: number, y: number, h: number, flip = false) => {
    const plus = flip ? 1 : -1;
    props.push({id: id('gap'), type: 'line', x1: r2(x - 9 * k), y1: r2(y), x2: r2(x + 9 * k), y2: r2(y), style: {stroke: 'paper', width: 8 * k}, layer: 4} as Prop);
    line([x + plus * 7 * k, y - h / 2], [x + plus * 7 * k, y + h / 2], 'ink', 4, {layer: 5}); line([x - plus * 7 * k, y - h / 4], [x - plus * 7 * k, y + h / 4], 'ink', 7, {layer: 5});
    text(x + plus * 20 * k, y - h / 2 + 4 * k, '+', 'ink', 24, {layer: 9});
  };
  const caps: Cap[] = [];
  const say = (t: number, value: string, bold = false, fill?: string) => caps.push({t, text: value, bold, fill});
  const finish = (dur: number, facts: string[], anchors: Record<string, Vec>): Scene => {
    if (s.panel !== false) {
      const px = fr.px, pw = W - px - 40 * k, size = 28 * k;
      let row = fr.row;
      const all = [...caps, ...(s.illustrative ? [] : facts.filter(f => /\d/.test(f)).slice(0, 2).map(f => ({t: Math.min(2.5, dur - 2), text: f, fill: 'muted'} as Cap)))];
      all.forEach((c, i) => {
        const h = wrapText(c.text, size, pw).length * 1.28 * size;
        if (row + h > H - 20 * k) return;                  // a narrow frame keeps the captions that fit
        props.push({id: `say${i}`, type: 'text', x: r2(px), y: r2(row), text: c.text, size, width: pw, weight: c.bold ? 700 : 400, show: [c.t, 1e9], fade: 0.3, ...(c.fill ? {style: {fill: c.fill}} : {})} as Prop);
        row += h + 10 * k;
      });
    }
    const rounded = Object.fromEntries(Object.entries(anchors).map(([n, p]) => [n, [r2(p[0]), r2(p[1])] as Vec]));
    return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: dur, theme: s.theme ?? 'dark', props, actors: [], meta: {verb: 'em_device', kind: s.kind, facts, anchors: rounded}};
  };
  return {W, H, k, bx, by, bw, bh, S, props, id, line, arrow, poly, rect, dot, text, track, moving, key, cell, say, finish};
}
type Kit = ReturnType<typeof kit>;

/** Windows of constant value in samples [t, v]: [from, to, v]. */
function windows<T>(samples: {t: number; v: T}[]): [number, number, T][] {
  const out: [number, number, T][] = [];
  samples.forEach((q, i) => { if (!i || q.v !== out[out.length - 1][2]) { if (i) out[out.length - 1][1] = q.t; out.push([q.t, 1e9, q.v]); } });
  return out;
}

export function emDevice(s: EmDeviceSpec): Scene {
  const K = kit(s);
  if (s.kind === 'electromagnet') return electromagnet(s, K);
  if (s.kind === 'bell') return bell(s, K);
  return coil(s, K);
}

// ---- electromagnet ----------------------------------------------------------------------------------------------------

function electromagnet(s: EmDeviceSpec, K: Kit): Scene {
  const {k, bx, by, bw, bh, S, line, arrow, poly, rect, text, key, cell, say, finish, props, id} = K;
  const n1 = s.turns ?? 50, I1 = s.current ?? 1, then = s.then, n2 = then?.turns ?? n1, I2 = then?.current ?? I1, ratio = then ? n2 * I2 / (n1 * I1) : 1;
  const north = electromagnetNorth(s.reverse), base = then ? 3 : 4, lift1 = pinsLifted(n1 * I1, n1 * I1, base), lift2 = then ? pinsLifted(n2 * I2, n1 * I1, base) : 0;
  const on1 = 1, off1 = 4.2, on2 = then ? 6 : 1e9, off2 = then ? 9.2 : 1e9, end = Math.max(s.seconds ?? 0, (then ? off2 : off1) + 2);
  const cx = bx + 0.5 * bw, cy = by + 0.34 * bh, cl = Math.min(0.56 * bw, 1.3 * bh), ch = Math.max(0.085 * S, 30 * k), cl2 = cl / 2;
  const span = 0.25 * cl, xs = cx - span, xe = cx + span, ex = 0.3 * ch, top = cy - ch / 2 - ex, bot = cy + ch / 2 + ex;
  const yf = bot + 0.22 * bh, yw = yf + 0.13 * bh, xbat = (xs + cx) / 2, swW = 0.06 * bw, xsw = (cx + xe) / 2 - swW / 2;
  rect(cx - cl2, cy - ch / 2, cl, ch, 'muted', 'ink', {layer: 3});
  text(cx, bot + 30 * k, 'soft-iron core', 'muted', 22);
  // the coil: front strands over the core, back strands behind it; a second coil when `then` changes the turns
  const loops = (n: number) => Math.max(3, Math.min(16, Math.round(7 * n / n1)));
  const coilDraw = (m: number, show: [number, number]) => {
    const p = (xe - xs) / m;
    for (let i = 0; i < m; i++) {
      line([xs + i * p + p / 2, top], [xs + (i + 1) * p, bot], 'accent', 3, {layer: 2, show, style: {stroke: 'accent', width: 3 * k, opacity: 0.55}});
      line([xs + i * p, bot], [xs + i * p + p / 2, top], 'accent', 5, {layer: 4, show});
    }
  };
  const changeTurns = then?.turns !== undefined && loops(n2) !== loops(n1), tChange = off1 + 0.8;
  coilDraw(loops(n1), [0, changeTurns ? tChange : 1e9]);
  if (changeTurns) coilDraw(loops(n2), [tChange, 1e9]);
  text(cx, top - 16 * k, 'coil', 'accent', 22);
  // the circuit: leads down from the coil's ends to a cell and a key
  const wire = (pts: Vec[]) => poly(pts, 'muted', 4, {layer: 2});
  wire([[xs, bot], [xs, yw], [xe, yw], [xe, bot]]);
  cell(xbat, yw, 0.08 * S, !!s.reverse);
  props.push({id: id('gap'), type: 'line', x1: xsw, y1: yw, x2: xsw + swW, y2: yw, style: {stroke: 'paper', width: 8 * k}, layer: 4} as Prop);
  const spans: [number, number][] = [[on1, off1], ...(then ? [[on2, off2] as [number, number]] : [])];
  key(xsw, yw, swW, spans);
  text(xbat, yw + 0.08 * S / 2 + 30 * k, then?.current !== undefined ? 'cells' : 'cell', 'muted', 22); text(xsw + swW / 2, yw + 34 * k, 'key', 'muted', 22);
  // the current's way while the key is closed: in at the left end unless reversed
  const d = s.reverse ? -1 : 1, mid = (bot + yw) / 2, al = 0.05 * bh;
  for (const sp of spans) {
    const show: [number, number] = [sp[0], sp[1]];
    arrow([xs, mid + d * al / 2], [xs, mid - d * al / 2], 'accent', 4, {show});
    arrow([xe, mid - d * al / 2], [xe, mid + d * al / 2], 'accent', 4, {show});
    arrow([(xsw + swW + xe) / 2 + d * al / 2, yw], [(xsw + swW + xe) / 2 - d * al / 2, yw], 'accent', 4, {show});
    // poles at the core's ends, and the clock rule seen from each end
    const ends: [number, 'N' | 'S'][] = [[cx - cl2, north === 'left' ? 'N' : 'S'], [cx + cl2, north === 'left' ? 'S' : 'N']];
    ends.forEach(([x, pole], j) => {
      const side = j ? 1 : -1, r = Math.max(0.04 * S, 24 * k), c: Vec = [x + side * 0.03 * cl, top - 0.15 * bh], anti = pole === 'N';
      text(x + side * 26 * k, cy + 10 * k, pole, pole === 'N' ? 'bad' : 'cool', 34, {show});
      poly(Array.from({length: 40}, (_, i) => [c[0] + r * Math.cos(i * TAU / 39), c[1] + r * Math.sin(i * TAU / 39)] as Vec), pole === 'N' ? 'bad' : 'cool', 3, {show, layer: 6});
      arrow([c[0] + (anti ? 0.45 : -0.45) * r, c[1] - r], [c[0] + (anti ? -0.55 : 0.55) * r, c[1] - r], pole === 'N' ? 'bad' : 'cool', 3, {show, head: 12 * k});
      text(c[0], c[1] + 9 * k, pole, pole === 'N' ? 'bad' : 'cool', 26, {show});
      if (sp === spans[0]) text(c[0], c[1] - r - 12 * k, anti ? 'anticlockwise' : 'clockwise', 'muted', 19, {show: [sp[0], 1e9]});
    });
    // field lines from N round to S, over the top
    const [xn, xsx] = north === 'left' ? [cx - cl2, cx + cl2] : [cx + cl2, cx - cl2];
    [0.07, 0.12].forEach(hf => {
      const pts = Array.from({length: 31}, (_, i) => { const u = i / 30; return [xn + (xsx - xn) * u, cy - ch / 2 - 4 * k - Math.sin(Math.PI * u) * hf * bh * 1.6 - (hf > 0.1 ? 10 * k : 0)] as Vec; });
      poly(pts, 'faint', 3, {show, style: {stroke: 'muted', width: 2.5 * k, dash: [8 * k, 7 * k]}, layer: 1});
      const m0 = pts[14], m1 = pts[16]; arrow(m0, m1, 'muted', 3, {show, head: 12 * k});
    });
  }
  // the pins: ten on the floor; the lifted ones jump to the core's ends, nearest first, and drop when the key opens
  line([cx - cl2 - 0.05 * bw, yf + 6 * k], [cx + cl2 + 0.05 * bw, yf + 6 * k], 'faint', 3, {layer: 1});
  text(cx, yf - 14 * k, 'iron pins', 'muted', 22);   // above the floor: the cell's + sits below it
  const pl = Math.max(0.06 * S, 24 * k), slots = (end: number, j: number): Vec => [end === 0 ? cx - cl2 + 0.03 * cl + j * 0.035 * cl : cx + cl2 - 0.03 * cl - j * 0.035 * cl, cy + ch / 2 + 2 * k];
  // on the floor in two small heaps under the ends, outside the leads
  const floor = Array.from({length: 10}, (_, i) => { const end = i % 2, j = Math.floor(i / 2), off = 0.03 * cl + j * 0.03 * cl; return {end, j, x: end === 0 ? cx - cl2 + off : cx + cl2 - off, y: yf - (j % 2) * 7 * k}; });
  floor.forEach((p, i) => {
    const lie: [number, number, number, number] = [p.x - pl / 2, p.y, p.x + pl / 2, p.y - 2 * k], sl = slots(p.end, p.j), hang: [number, number, number, number] = [sl[0], sl[1], sl[0] + 2 * k, sl[1] + pl];
    const ks: Key[][] = [[], [], [], []], put = (t: number, v: number[], e?: 'in' | 'out') => v.forEach((x, m) => ks[m].push(e ? [round(t, 3), round(x, 2), e] : [round(t, 3), round(x, 2)]));
    put(0, lie);
    for (const [on, off, lifted] of [[on1, off1, lift1], [on2, off2, lift2]] as [number, number, number][]) if (i < lifted && on < 1e8) {
      const go = on + 0.15 + 0.07 * i; put(go, lie); put(go + 0.3, hang, 'in'); put(off + 0.05, hang); put(off + 0.4, lie, 'in');
    }
    props.push({id: `pin${i}`, type: 'line', x1: round(lie[0], 2), y1: round(lie[1], 2), x2: round(lie[2], 2), y2: round(lie[3], 2), style: {stroke: 'ink', width: 5 * k, cap: 'round'}, layer: 5,
      ...(ks[0].length > 1 ? {keys: {x1: ks[0], y1: ks[1], x2: ks[2], y2: ks[3]}} : {})} as Prop);
  });
  // the words
  const westEast = north === 'left' ? 'the left end N, the right end S' : 'the right end N, the left end S';
  say(0.3, 'Close the key: current in the coil magnetises the soft-iron core', true);
  say(on1 + 0.6, `Clock rule: current anticlockwise seen from an end makes it N, clockwise makes it S: ${westEast}`);
  say(off1, 'Open the key: soft iron loses its magnetism at once, and the pins drop');
  if (then) {
    const more = ratio > 1, what = then.turns !== undefined && then.current !== undefined ? 'turns and current' : then.turns !== undefined ? 'turns' : 'current';
    say(on2, `${more ? 'More' : 'Fewer'} ${what === 'current' ? 'current' : what}: a ${more ? 'stronger' : 'weaker'} electromagnet lifts ${more ? 'more' : 'fewer'} pins`, true);
  }
  const facts = [`the core is magnetised only while current flows: an electromagnet is a temporary magnet`, `with the current as drawn, ${westEast} (clock rule)`,
    `${n1} turns carrying ${fmt(I1)} A: ${fmt(n1 * I1)} ampere-turns`, ...(then ? [`then ${n2} turns carrying ${fmt(I2)} A: ${fmt(n2 * I2)} ampere-turns, ${fmt(ratio, 2)} times as strong`] : []),
    'the strength grows with the number of turns and with the current; a soft-iron core makes it much stronger than the coil alone'];
  return finish(end, facts, {core: [cx, cy], coil: [cx, top], north_end: [north === 'left' ? cx - cl2 : cx + cl2, cy], south_end: [north === 'left' ? cx + cl2 : cx - cl2, cy], pins: [cx, yf], cell: [xbat, yw], key: [xsw + swW / 2, yw]});
}

// ---- electric bell ----------------------------------------------------------------------------------------------------

function bell(s: EmDeviceSpec, K: Kit): Scene {
  const {k, bx, by, bw, bh, S, line, poly, rect, dot, text, track, cell, say, finish, props, id} = K;
  const rings = s.rings ?? 4, run = bellRun(rings), tPush = 1, release = run.release;
  const end = Math.max(s.seconds ?? 0, release + 2.5);
  const yb = by + 0.74 * bh, yw = by + 0.92 * bh, at = Math.max(0.045 * S, 18 * k);
  const xm0 = bx + 0.24 * bw, xm1 = bx + 0.5 * bw, yA1 = by + 0.38 * bh, yA2 = by + 0.58 * bh, aw = Math.max(0.03 * S, 12 * k), g = 0.055 * bw;
  const xa = xm1 + g + aw / 2, P: Vec = [xa, yb], hTop = yb - yA1 + 0.07 * S, hBot = yb - yA2 - 0.07 * S, hh = yb - (by + 0.1 * bh), rb = Math.max(0.03 * S, 13 * k);
  const sinS = 0.7 * g / hTop, aS = Math.asin(sinS), rg = Math.max(0.09 * S, 38 * k);
  const strikeX = xa - hh * Math.sin(aS), yh = yb - hh, gx = strikeX - rb - 0.954 * rg, gy = yh + 0.3 * rg;
  // the frame: base board, U-shaped core with a coil on each arm
  rect(bx + 0.06 * bw, yb, 0.8 * bw, Math.max(0.025 * S, 10 * k), 'faint', 'muted', {layer: 1});
  rect(xm0, yA1 - at / 2, xm1 - xm0, at, 'muted', 'ink', {layer: 2}); rect(xm0, yA2 - at / 2, xm1 - xm0, at, 'muted', 'ink', {layer: 2}); rect(xm0, yA1 - at / 2, at, yA2 - yA1 + at, 'muted', 'ink', {layer: 2});
  const coilX = xm0 + at + 0.03 * bw, coilW = xm1 - coilX - 0.04 * bw, coilH = at * 2;
  for (const y of [yA1, yA2]) {
    rect(coilX, y - coilH / 2, coilW, coilH, 'paper', 'accent', {layer: 3, style: {fill: 'paper', stroke: 'accent', width: 3 * k}});
    for (let i = 1; i < 8; i++) line([coilX + coilW * i / 8, y - coilH / 2], [coilX + coilW * i / 8, y + coilH / 2], 'accent', 2, {layer: 4});
  }
  text((coilX + xm1) / 2 - 0.04 * bw, yA2 + coilH / 2 + 28 * k, 'electromagnet', 'accent', 22);
  // the gong on a stalk from the frame
  line([gx, gy], [gx, yA1 - at / 2], 'muted', 5, {layer: 1});
  poly([...Array.from({length: 25}, (_, i) => { const a = Math.PI * i / 24; return [gx + rg * Math.cos(a), gy - rg * Math.sin(a)] as Vec; }), [gx - rg, gy + 0.06 * rg], [gx + rg, gy + 0.06 * rg]], 'ink', 3, {layer: 3}, 'accent');
  text(gx - rg - 10 * k, gy - rg * 0.6, 'gong', 'ink', 22, {align: 'end'});
  // the armature, spring strip, hammer rod and hammer: one body turning about the strip's fixed end
  const xs = run.samples, alpha = (t: number) => { let i = Math.min(xs.length - 1, Math.max(0, Math.round(t / (xs[1].t - xs[0].t)))); return xs[i].x * aS; };
  const at2 = (h: number, dx = 0) => (t: number): Vec => { const a = alpha(t); return [P[0] + dx * Math.cos(a) - h * Math.sin(a), P[1] - h * Math.cos(a) - dx * Math.sin(a)]; };
  const tEnd = Math.min(end, release + 1.3);
  K.moving(at2(0), at2(hBot), 0, tEnd, 'ink', 3, {layer: 4}, 'line');
  K.moving(at2(hBot), at2(hTop), 0, tEnd, 'muted', aw / k, {layer: 4, style: {stroke: 'muted', width: aw, cap: 'butt'}});
  K.moving(at2(hTop), at2(hh - rb), 0, tEnd, 'ink', 4, {layer: 4});
  const [hx, hy] = track(0, tEnd, t => at2(hh)(t)), h0 = at2(hh)(0);
  props.push({id: 'hammer', type: 'circle', x: round(h0[0], 2), y: round(h0[1], 2), r: round(rb, 2), style: {fill: 'ink', stroke: 'muted', width: 2 * k}, layer: 6, keys: {x: hx, y: hy}} as Prop);
  dot(P[0], P[1], 6 * k, 'muted', {layer: 5});
  text(h0[0] + rb + 12 * k, h0[1] + 8 * k, 'hammer', 'ink', 22, {align: 'start'});
  text(xa + aw / 2 + 12 * k, yb - (hTop + hBot) / 2 - 0.05 * bh, 'soft-iron armature', 'muted', 22, {align: 'start'});
  text(xa + 10 * k, yb - 6 * k, 'spring strip', 'ink', 20, {align: 'start'});
  // the contact screw, touching the strip from behind at height hc
  const hc = 0.95 * hBot, ys = yb - hc, xbk = xa + 0.17 * bw;
  line([xbk, yb], [xbk, ys - 0.04 * S], 'muted', 7, {layer: 2}); line([xa + 2.5 * k, ys], [xbk, ys], 'ink', 6, {layer: 3});
  for (let i = 1; i < 5; i++) line([xa + 0.02 * bw * i + 6 * k, ys - 6 * k], [xa + 0.02 * bw * i + 12 * k, ys + 6 * k], 'muted', 2, {layer: 4});
  text(xbk + 12 * k, ys - 14 * k, 'contact screw', 'ink', 22, {align: 'start'});
  // the poles, while the magnet is on
  const onW = windows(run.samples.map(q => ({t: q.t, v: q.on}))).filter(w => w[2]);
  for (const [a, b] of onW) {
    const show: [number, number] = [a, Math.max(b, a + 0.12)];
    text(xm1 - 18 * k, yA1 - at / 2 - 10 * k, 'N', 'bad', 26, {show, fade: 0.05}); text(xm1 - 18 * k, yA2 + at / 2 + 28 * k, 'S', 'cool', 26, {show, fade: 0.05});
  }
  // the circuit: terminal T1 → coils → strip; screw → T2 → push and cell below the board → T1
  const t1x = xm0 - 0.06 * bw, wires: Vec[][] = [
    [[t1x, yb], [t1x, yA1 - coilH / 2 - 10 * k], [coilX, yA1 - coilH / 2 - 10 * k], [coilX, yA1 - coilH / 2]],
    [[coilX + 4 * k, yA1 + coilH / 2], [coilX + 4 * k, yA2 - coilH / 2]],
    [[coilX + coilW, yA2 + coilH / 2], [coilX + coilW, yb - 8 * k], [P[0], yb - 8 * k]],
    [[xbk, yb], [xbk, yw], [t1x, yw], [t1x, yb]]];
  wires.forEach(w => poly(w, 'muted', 3, {layer: 2}));
  for (const [a, b] of onW) wires.forEach(w => poly(w, 'accent', 4, {layer: 2, show: [a, Math.max(b, a + 0.12)], fade: 0.05}));
  const xc = t1x + 0.3 * (xbk - t1x), xp = t1x + 0.7 * (xbk - t1x), pw = 0.07 * bw;
  cell(xc, yw, 0.07 * S); text(xc, yw + 0.07 * S / 2 + 26 * k, 'cell', 'muted', 22);
  // the bell push: a plunger bridging two contacts while held
  props.push({id: id('gap'), type: 'line', x1: round(xp - pw / 2, 2), y1: round(yw, 2), x2: round(xp + pw / 2, 2), y2: round(yw, 2), style: {stroke: 'paper', width: 8 * k}, layer: 4} as Prop);
  dot(xp - pw / 2, yw, 5 * k, 'paper'); dot(xp + pw / 2, yw, 5 * k, 'paper');
  const up = yw - 0.035 * S - 6 * k, down = yw - 5 * k, pk: Key[] = [[0, round(up, 2)], [tPush - 0.15, round(up, 2)], [tPush, round(down, 2), 'in'], [release, round(down, 2)], [release + 0.15, round(up, 2), 'out']];
  props.push({id: 'push-bar', type: 'line', x1: round(xp - pw / 2, 2), y1: round(up, 2), x2: round(xp + pw / 2, 2), y2: round(up, 2), style: {stroke: 'ink', width: 5 * k}, layer: 6, keys: {y1: pk, y2: pk}} as Prop);
  props.push({id: 'push-stem', type: 'line', x1: round(xp, 2), y1: round(up, 2), x2: round(xp, 2), y2: round(up - 0.03 * S, 2), style: {stroke: 'ink', width: 5 * k}, layer: 6, keys: {y1: pk, y2: pk.map(([t, v, e]) => (e ? [t, round(v - 0.03 * S, 2), e] : [t, round(v - 0.03 * S, 2)]) as Key)}} as Prop);
  text(xp, yw + 30 * k, 'bell push', 'muted', 22);
  // the sound of each strike
  run.strikes.forEach(ts => [1, 2].forEach(j => poly(Array.from({length: 13}, (_, i) => { const a = (150 + 60 * i / 12) * RAD, r = rg + 18 * k * j; return [gx + r * Math.cos(a), gy - 0.4 * rg - r * Math.sin(a) * 0.9 + 0.4 * rg] as Vec; }), 'accent', 3, {show: [ts, ts + 0.35], fade: 0.1, layer: 2})));
  // the words, in the order the mechanism runs
  const first = run.strikes[0];
  say(0.3, 'Press the push: current flows through the coils, the strip and the contact screw', true);
  say(tPush + 0.2, 'The soft-iron core is magnetised and pulls the armature: the hammer strikes the gong');
  say(first + 0.1, 'The strip leaves the contact screw: the circuit breaks, the core loses its magnetism');
  say(first + 0.9, 'The spring strip springs back, touches the screw, the circuit is made again: the bell rings while the push is held', true);
  const period = run.strikes.length > 1 ? (run.strikes[run.strikes.length - 1] - run.strikes[0]) / (run.strikes.length - 1) : 0;
  const facts = ['the bell makes and breaks its own circuit: current flows only while the spring strip touches the contact screw',
    'the core and armature are soft iron: they are magnetised quickly and lose their magnetism as soon as the current stops',
    `${run.strikes.length} strikes, about ${fmt(period, 2)} s apart as drawn (a real bell strikes many times a second)`];
  return finish(end, facts, {electromagnet: [(coilX + xm1) / 2, (yA1 + yA2) / 2], armature: [xa, yb - (hTop + hBot) / 2], hammer: h0, gong: [gx, gy - rg / 2], contact_screw: [xa + 4 * k, ys], push: [xp, yw], cell: [xc, yw]});
}

// ---- dc motor and ac generator: one coil between the poles -------------------------------------------------------------

function coil(s: EmDeviceSpec, K: Kit): Scene {
  const {k, bx, by, bw, bh, line, arrow, poly, rect, dot, text, track, moving, key, cell, say, finish, props} = K;
  const motor = s.kind === 'dc_motor', split = motor && s.commutator !== false;
  const u = motor ? Math.min(0.62 * bw, bh) : Math.min(0.55 * bw, 0.72 * bh), R = 0.2 * u, L = 0.42 * u, ZX = -0.25, ZY = 0.53, CY = 0.85;
  // looked down on at about 32° and a little from the left, so the axle runs down the page to the rings below the coil
  // (as the book draws it). A coil turning about a fixed axis is edge-on to any viewer twice a turn; here that is at
  // about 68° from the field, passed quickly, while a vertical coil (where the slip-ring motor settles) still shows open.
  const O: Vec = [bx + 0.5 * bw, by + (motor ? 0.3 : 0.26) * bh];
  const P3 = (x: number, y: number, z: number): Vec => [O[0] + x + ZX * z, O[1] - CY * y + ZY * z];
  const T = motor ? Math.max(s.seconds ?? 0, 12) : 0, tOn = 0.8;
  // the angle of side AB from the field direction, against time
  let phiAt: (t: number) => number, sAt: (t: number) => number, dur: number, run: ReturnType<typeof motorRun> = [];
  // the generator turns `rotations` whole turns and 55° more: it stops with its plane 35° from the field, open to view
  const rot = s.rotations ?? 2, Tp = 4, t0 = 1, turnsG = rot + 55 / 360;
  if (motor) {
    // a turning motor's scene ends as the coil passes 30–42° from the field, its plane open to the viewer
    run = motorRun({commutator: split, reverse: s.reverse, start: s.start, tOn, T: T + 6});
    const open = (phi: number) => { const d = (((phi / RAD) % 180) + 180) % 180; return (d >= 30 && d <= 42) || (d >= 138 && d <= 150); };
    const turning = Math.abs(run[Math.round(T * 120)].w) > 0.3, stop = turning ? run.find(q => q.t >= T && open(q.phi))?.t ?? T : T;
    run = run.filter(q => q.t <= stop + 1e-9);
    const at = (t: number) => run[Math.min(run.length - 1, Math.max(0, Math.round(t * 120)))];
    phiAt = t => at(t).phi; sAt = t => at(t).s; dur = run[run.length - 1].t;
  } else {
    const th = (t: number) => TAU * Math.min(turnsG, Math.max(0, (t - t0) / Tp));
    phiAt = t => Math.PI / 2 + th(t); sAt = t => (t > t0 && t < t0 + turnsG * Tp ? sideEmf(phiAt(t)) : 0); dur = Math.max(s.seconds ?? 0, t0 + turnsG * Tp + 2.2);
  }
  // the magnet's poles: N on the left, S on the right, as blocks seen from the front, above and the left
  const g = 0.07 * u, mw = 0.17 * u, mh = 0.17 * u, Lm = L / 2 + 0.03 * u;
  const block = (xa: number, xb: number, fill: string, name: string) => {
    const f = (x: number, y: number) => P3(x, y, Lm), b = (x: number, y: number) => P3(x, y, -Lm);
    poly([b(xa, mh), b(xb, mh), f(xb, mh), f(xa, mh)], 'ink', 2, {layer: 1, style: {stroke: 'ink', width: 2 * k, fill, opacity: 0.55}}, fill);
    poly([b(xa, mh), f(xa, mh), f(xa, -mh), b(xa, -mh)], 'ink', 2, {layer: 1, style: {stroke: 'ink', width: 2 * k, fill, opacity: 0.4}}, fill);
    poly([f(xa, mh), f(xb, mh), f(xb, -mh), f(xa, -mh)], 'ink', 2, {layer: 1, style: {stroke: 'ink', width: 2 * k, fill, opacity: 0.9}}, fill);
    const c = f((xa + xb) / 2, 0); text(c[0], c[1] + 14 * k, name, 'paper', 40, {style: {fill: 'paper'}});
  };
  block(-R - g - mw, -R - g, 'bad', 'N'); block(R + g, R + g + mw, 'cool', 'S');
  [-0.55, 0, 0.55].forEach(f => arrow(P3(-R - g + 4 * k, f * mh * 0.8, 0), P3(R + g - 4 * k, f * mh * 0.8, 0), 'muted', 2, {layer: 0, head: 12 * k, style: {stroke: 'muted', width: 2 * k, dash: [8 * k, 7 * k]}}));
  // the axle and the coil ABCD: A and D, its ends, go forward to the rings
  // the rings sit far enough down the axle to clear the turning coil's lowest point
  const zf = L / 2, rc = 0.07 * u, rr = 0.05 * u, zc = (CY * R + ZY * L / 2 + rc + 0.03 * u) / ZY, zr1 = (CY * R + ZY * L / 2 + rr + 0.03 * u) / ZY, zr2 = zr1 + 0.25 * u, zback = -L / 2 - 0.1 * u;
  line(P3(0, 0, zback - 0.04 * u), P3(0, 0, (split ? zc : zr2) + 0.05 * u), 'muted', 6, {layer: 2});
  const side = (r: number, z: number, off = 0) => (t: number): Vec => { const p = phiAt(t) + off; return P3(r * Math.cos(p), r * Math.sin(p), z); };
  const A = side(R, zf), B = side(R, -zf), C = side(R, -zf, Math.PI), D = side(R, zf, Math.PI);
  moving(A, B, 0, dur, 'accent', 7, {layer: 4}); moving(B, C, 0, dur, 'accent', 5, {layer: 3, style: {stroke: 'accent', width: 5 * k, opacity: 0.7, cap: 'round'}}); moving(C, D, 0, dur, 'accent', 7, {layer: 4});
  const name = (f: (t: number) => Vec, letter: string, z: number, off: number) => {
    const P = side(R + 0.06 * u, z + Math.sign(z) * 0.04 * u, off), [x, y] = track(0, dur, t => { const p = P(t); return [p[0], p[1] + 9 * k]; }), p0 = P(0);
    props.push({id: `name-${letter}`, type: 'text', x: round(p0[0], 2), y: round(p0[1] + 9 * k, 2), text: letter, size: 26 * k, weight: 700, align: 'middle', style: {fill: 'ink', stroke: 'paper', width: 6 * k}, layer: 9, keys: {x, y}} as Prop);
    return f;
  };
  name(A, 'A', zf, 0); name(B, 'B', -zf, 0); name(C, 'C', -zf, Math.PI); name(D, 'D', zf, Math.PI);
  const anchors: Record<string, Vec> = {coil: O, north: P3(-R - g - mw / 2, 0, Lm), south: P3(R + g + mw / 2, 0, Lm)};
  // rings at the front: a split ring (two halves turning with the coil) or two slip rings, with brushes
  const yw = by + (motor ? 0.9 : 0.58) * bh;
  let brushL: Vec, brushR: Vec;
  if (split) {
    const gap = 12 * RAD, cc = P3(0, 0, zc);
    const half = (off: number, colour: string) => { for (let i = 0; i < 3; i++) { const a0 = off - Math.PI / 2 + gap + (Math.PI - 2 * gap) * i / 3, a1 = off - Math.PI / 2 + gap + (Math.PI - 2 * gap) * (i + 1) / 3;
      moving(t => P3(rc * Math.cos(phiAt(t) + a0), rc * Math.sin(phiAt(t) + a0), zc), t => P3(rc * Math.cos(phiAt(t) + a1), rc * Math.sin(phiAt(t) + a1), zc), 0, dur, colour, 9, {layer: 5}, 'line'); } };
    half(0, 'accent'); half(Math.PI, 'good');
    moving(A, side(rc, zc), 0, dur, 'accent', 3, {layer: 4}); moving(D, side(rc, zc, Math.PI), 0, dur, 'good', 3, {layer: 4});
    const bwid = 0.07 * u, bht = 0.04 * u;
    brushL = [cc[0] - rc - bwid, cc[1]]; brushR = [cc[0] + rc + bwid, cc[1]];
    rect(cc[0] - rc - bwid, cc[1] - bht / 2, bwid - 4 * k, bht, 'muted', 'ink', {layer: 6}); rect(cc[0] + rc + 4 * k, cc[1] - bht / 2, bwid - 4 * k, bht, 'muted', 'ink', {layer: 6});
    // under the wires, below anywhere the turning coil's corner names reach
    text(brushL[0] - 6 * k, cc[1] + bht / 2 + 26 * k, 'split ring', 'good', 22, {align: 'end'}); text(brushR[0] + 6 * k, cc[1] + bht / 2 + 26 * k, 'brush', 'muted', 22, {align: 'start'});
    anchors.commutator = cc; anchors.brushes = brushR;
  } else {
    const ringAt = (z: number, colour: string, off: number, lead: (t: number) => Vec, right: boolean) => {
      const c = P3(0, 0, z); poly(Array.from({length: 41}, (_, i) => [c[0] + rr * Math.cos(i * TAU / 40), c[1] + rr * Math.sin(i * TAU / 40)] as Vec), colour, 8, {layer: 5});
      moving(lead, side(rr, z, off), 0, dur, colour, 3, {layer: 4});
      const [x, y] = track(0, dur, t => side(rr, z, off)(t)), p0 = side(rr, z, off)(0);
      props.push({id: K.id('mk'), type: 'circle', x: round(p0[0], 2), y: round(p0[1], 2), r: 6 * k, style: {fill: 'ink', stroke: 'paper', width: 2 * k}, layer: 6, keys: {x, y}} as Prop);
      const bwid = 0.07 * u, bht = 0.04 * u, xb = right ? c[0] + rr + 4 * k : c[0] - rr - bwid;
      rect(xb, c[1] - bht / 2, bwid - 4 * k, bht, 'muted', 'ink', {layer: 6});
      return [right ? xb + bwid - 4 * k : xb, c[1]] as Vec;
    };
    const b1 = ringAt(zr1, 'accent', 0, A, true), b2 = ringAt(zr2, 'good', Math.PI, D, false);
    brushL = b2; brushR = b1;
    const c2 = P3(0, 0, zr2); text(b2[0] - 8 * k, c2[1] + 0.02 * u + 26 * k, 'slip rings', 'good', 22, {align: 'end'});
    text(b1[0] + 8 * k, b1[1] + 0.02 * u + 26 * k, 'brush', 'muted', 22, {align: 'start'});
    anchors.rings = c2; anchors.brushes = b1;
  }
  // the external circuit: a cell and key for the motor, a centre-zero meter for the generator
  if (motor) {
    const xl = bx + 0.24 * bw, xr = bx + 0.86 * bw, xc = bx + 0.4 * bw, xk = bx + 0.62 * bw, kw = 0.07 * bw;
    poly([brushL, [xl, brushL[1]], [xl, yw], [xr, yw], [xr, brushR[1]], brushR], 'muted', 4, {layer: 2});
    cell(xc, yw, 0.07 * u, !!s.reverse); text(xc, yw + 0.035 * u + 30 * k, 'battery', 'muted', 22);
    props.push({id: K.id('gap'), type: 'line', x1: xk, y1: yw, x2: xk + kw, y2: yw, style: {stroke: 'paper', width: 8 * k}, layer: 4} as Prop);
    key(xk, yw, kw, [[tOn, 1e9]]); text(xk + kw / 2, yw + 34 * k, 'key', 'muted', 22);
    anchors.battery = [xc, yw];
  } else {
    // a centre-zero galvanometer to the right of the rings: one wire from each brush
    const gr = Math.max(0.07 * u, 34 * k), gc: Vec = [Math.min(bx + bw - gr - 10 * k, brushR[0] + 0.12 * u + gr), brushL[1]], low = brushL[1] + rr + 0.05 * u, xl = brushL[0] - 0.04 * u;
    poly([brushR, [gc[0] - gr - 0.03 * u, brushR[1]], [gc[0] - gr - 0.03 * u, gc[1]], [gc[0] - gr, gc[1]]], 'muted', 4, {layer: 2});
    poly([brushL, [xl, brushL[1]], [xl, low], [gc[0], low], [gc[0], gc[1] + gr]], 'muted', 4, {layer: 2});
    dot(gc[0], gc[1], gr, 'paper', {layer: 3, style: {fill: 'paper', stroke: 'ink', width: 3 * k}});
    poly(Array.from({length: 21}, (_, i) => { const a = (-150 + 120 * i / 20) * RAD; return [gc[0] + 0.78 * gr * Math.cos(a), gc[1] + 0.78 * gr * Math.sin(a)] as Vec; }), 'muted', 2, {layer: 4});
    const th = (t: number) => (t - t0) / Tp * 360, ang = (t: number) => (-90 + 55 * (t > t0 && th(t) < turnsG * 360 ? generatorEmf(th(t)) : 0)) * RAD;
    moving(() => gc, t => [gc[0] + 0.72 * gr * Math.cos(ang(t)), gc[1] + 0.72 * gr * Math.sin(ang(t))], 0, dur, 'bad', 4, {layer: 5});
    text(gc[0] + gr + 10 * k, gc[1] + 8 * k, 'galvanometer', 'muted', 22, {align: 'start'});
    anchors.meter = gc;
    // the driver at the back: a crank turned from outside
    const cb = P3(0, 0, zback), cr = 0.07 * u;
    moving(() => cb, side(cr, zback, Math.PI * 0.75), 0, dur, 'ink', 6, {layer: 2});
    const hd = side(cr, zback, Math.PI * 0.75), [hx, hy] = track(0, dur, t => hd(t)), h0 = hd(0);
    props.push({id: 'crank', type: 'circle', x: round(h0[0], 2), y: round(h0[1], 2), r: 9 * k, style: {fill: 'muted', stroke: 'ink', width: 2 * k}, layer: 2, keys: {x: hx, y: hy}} as Prop);
    anchors.crank = cb;
  }
  // the current in the sides, and (motor) the forces on AB and CD, in windows where its sense holds
  const per = motor ? run.map(q => ({t: q.t, v: q.s})) : Array.from({length: Math.ceil(dur * 120)}, (_, i) => ({t: i / 120, v: sAt(i / 120)}));
  const wins = windows(per).filter(w => w[2] !== 0);
  for (const [a, b0, sg] of wins) {
    const b = Math.min(b0, dur), show: [number, number] = [a, b];
    // sg: AB's current toward the viewer (+1) or away; BC and CD follow round the loop
    const zA = (t: number, f: number) => side(R, f * zf)(t), zC = (t: number, f: number) => side(R, f * zf, Math.PI)(t);
    moving(t => zA(t, -0.25 * sg), t => zA(t, 0.25 * sg), a, b, 'ink', 4, {show, layer: 7}, 'arrow');
    moving(t => zC(t, 0.25 * sg), t => zC(t, -0.25 * sg), a, b, 'ink', 4, {show, layer: 7}, 'arrow');
    moving(t => side(sg > 0 ? 0.1 * R : 0.62 * R, -zf, sg > 0 ? Math.PI : 0)(t), t => side(sg > 0 ? 0.62 * R : 0.1 * R, -zf, sg > 0 ? 0 : Math.PI)(t), a, b, 'ink', 4, {show, layer: 7}, 'arrow');
    if (motor) for (const [off, f] of [[0, sg], [Math.PI, -sg]] as [number, number][]) {
      const base = side(R, 0, off), fl = 0.55 * R;
      moving(base, t => { const p = base(t); return [p[0], p[1] - f * fl]; }, a, b, 'good', 6, {show, layer: 8}, 'arrow');
    }
  }
  const facts: string[] = [], given = s.B !== undefined && s.A !== undefined, n = s.turns ?? (motor ? 50 : 100);
  if (motor) {
    const stalled = split && Math.abs(Math.cos((s.start ?? 0) * RAD)) < Math.sin(7 * RAD), dir = s.reverse ? -1 : 1;
    const turnWord = dir > 0 ? 'anticlockwise' : 'clockwise';
    const vert = run.find(q => q.t > tOn && Math.abs(Math.cos(q.phi)) < 0.02)?.t ?? 1e9;
    const nearN = dir > 0 ? 'down' : 'up', nearS = dir > 0 ? 'up' : 'down';
    say(0.3, `Close the key: by Fleming's left-hand rule the side near N is pushed ${nearN}, the side near S ${nearS} (green arrows, F): a couple turns the coil`, true);
    if (stalled) say(tOn + 0.6, 'The coil starts vertical: the brushes are on the gaps, no current, no couple. The motor cannot start by itself', true, 'bad');
    else if (split) {
      say(Math.min(vert, 4), 'At the vertical the brushes meet the gaps: no current for a moment, and the coil goes on by its inertia');
      say(Math.min(vert + 0.6, 5), `Then the split ring reverses the current in the coil every half turn, so the side near N is always pushed ${nearN}: it keeps turning ${turnWord}`, true);
    } else {
      say(Math.min(vert, 4), 'With slip rings the current in the coil never reverses: past the vertical the couple turns it back', true);
      say(Math.min(vert + 1.5, 6), 'It rocks to and fro and settles with its plane vertical: a d.c. motor needs the split ring', false, 'bad');
    }
    // the sense of turning, once it turns
    if (!stalled && split) {
      const rr = R + 0.1 * u, a0 = (dir > 0 ? 200 : 160) * RAD, a1 = (dir > 0 ? 235 : 125) * RAD, arc = Array.from({length: 13}, (_, i) => { const a = a0 + (a1 - a0) * i / 12; return P3(rr * Math.cos(a), rr * Math.sin(a), zf); });
      poly(arc.slice(0, 12), 'ink', 4, {show: [tOn + 1, 1e9], fade: 0.3, layer: 6}); arrow(arc[10], arc[12], 'ink', 4, {show: [tOn + 1, 1e9], fade: 0.3});
    }
    facts.push('a d.c. motor changes electrical energy into mechanical energy', 'the force on each side is F = BIl, at right angles to the field and the current (Fleming\'s left-hand rule): the couple is largest with the coil along the field and zero when it is vertical',
      split ? 'the split-ring commutator reverses the current in the coil each time it passes the vertical, so it turns continuously one way' : 'with slip rings the current is not reversed and the coil settles with its plane vertical');
    if (given) facts.push(`largest couple = nBIA = ${n} × ${fmt(s.B!)} T × ${fmt(s.current ?? 1)} A × ${fmt(s.A!)} m² = ${fmt(n * s.B! * (s.current ?? 1) * s.A!)} N m`);
    facts.push('the speed rises with the number of turns, the current, the area and the field');
    anchors.coil = O;
    return finish(dur, facts, anchors);
  }
  // generator: ε against time, drawn as the coil turns, beneath the apparatus
  const gx = bx + 0.08 * bw, gw = 0.84 * bw, gy = by + 0.86 * bh, gh = 0.08 * bh, tEnd = t0 + turnsG * Tp;
  const X = (t: number) => gx + gw * (t - t0) / (tEnd - t0), Y = (e: number) => gy - gh * e;
  line([gx, gy], [gx + gw + 12 * k, gy], 'ink', 3, {layer: 2}); line([gx, gy - gh * 1.25], [gx, gy + gh * 1.25], 'ink', 3, {layer: 2});
  text(gx - 18 * k, gy - gh * 1.0, 'ε', 'bad', 28); text(gx + gw + 14 * k, gy + 34 * k, 'time', 'muted', 20, {align: 'end'});
  const trace = Array.from({length: 121 * (rot + 1)}, (_, i) => { const t = t0 + (tEnd - t0) * i / (121 * (rot + 1) - 1); return [X(t), Y(generatorEmf((t - t0) / Tp * 360))] as Vec; });
  props.push({id: 'emf-trace', type: 'polyline', points: trace.map(([a, b]) => [round(a, 2), round(b, 2)] as Vec), draw: 0, style: {stroke: 'bad', width: 4 * k}, layer: 4, keys: {draw: [[t0, 0], [tEnd, 1, 'linear']]}} as Prop);
  const [ex, ey] = track(t0, tEnd, t => [X(t), Y(generatorEmf((t - t0) / Tp * 360))]);
  ey.push([round(tEnd + 0.15, 3), round(gy, 1)]);                    // stopped: no change of flux, ε = 0
  props.push({id: 'emf-now', type: 'circle', x: round(gx, 2), y: round(gy, 2), r: 9 * k, style: {fill: 'bad', stroke: 'ink', width: 2 * k}, layer: 5, keys: {x: ex, y: ey}} as Prop);
  // the coil's plane, seen end-on, under each quarter turn: across the field (|) or along it (—)
  for (let q = 0; q <= 4 * rot; q++) {
    const t = t0 + q * Tp / 4, x = X(t), across = q % 2 === 0, l = 14 * k, y = gy + gh * 1.25 + 22 * k;
    line(across ? [x, y - l] : [x - l, y], across ? [x, y + l] : [x + l, y], across ? 'cool' : 'accent', 4, {layer: 3, show: [t - 0.1, 1e9], fade: 0.2});
  }
  const narrow = K.W < 1.3 * K.H;   // a half-width frame: the two legend lines in fewer words
  text(X(t0 + Tp / 4) - 20 * k, Y(1) - 16 * k, narrow ? 'along the field: ε largest' : 'coil along the field: ε largest', 'accent', 20, {align: 'start', show: [t0 + Tp / 4, 1e9]});
  // the second legend line at the top right, clear of the first (top left) and inside a half-width frame
  text(gx + gw, Y(1) - 16 * k, narrow ? 'across it: ε zero' : 'coil across the field: ε zero', 'cool', 20, {align: 'end', show: [t0 + Tp / 2, 1e9]});
  const e0 = peakEmf(n, s.B ?? 0.1, s.A ?? 0.02, s.nu ?? 50);
  if (given) props.push({id: 'emf-read', type: 'readout', x: round(gx + 12 * k, 2), y: round(gy + 30 * k, 2), size: 22 * k, weight: 700, text: 'ε = {e} V', decimals: 0, align: 'start',
    measures: {e: {kind: 'keys', keys: [...track(t0, tEnd, t => [e0 * generatorEmf((t - t0) / Tp * 360)])[0], [round(tEnd + 0.15, 3), 0]]}}, style: {fill: 'bad'}, layer: 9} as Prop);
  say(0.3, 'The coil is turned in the field from outside (by an engine or a turbine): the flux through it keeps changing, so an emf is induced (Fleming\'s right-hand rule gives the current\'s way)', true);
  say(t0 + Tp / 4, 'Coil along the field: its sides cut the field lines fastest, ε is largest. Across the field: ε is zero');
  say(t0 + Tp / 2, 'Each half turn the sides change places and the emf reverses: alternating current', true);
  say(t0 + Tp / 2 + 1, 'Slip rings turn with the coil, so each brush stays on its own ring and the meter swings both ways');
  say(tEnd, 'The turning stops: the flux no longer changes, and the emf is zero');
  facts.push('an a.c. generator changes mechanical energy into electrical energy by electromagnetic induction', 'ε = ε₀ sin θ: zero with the coil\'s plane across the field (θ = 0°, 180°), largest along it (θ = 90°, 270°); it reverses every half turn',
    ...(given ? [`ε₀ = NBAω = ${n} × ${fmt(s.B!)} T × ${fmt(s.A!)} m² × 2π × ${fmt(s.nu ?? 50)} Hz = ${fmt(e0)} V`] : []),
    `at ${fmt(s.nu ?? 50)} Hz the current reverses ${fmt(2 * (s.nu ?? 50))} times a second; the drawing is slowed down`);
  Object.assign(anchors, {peak: [X(t0 + Tp / 4), Y(1)], zero: [X(t0 + Tp / 2), gy], graph: [gx + gw / 2, gy]});
  return finish(dur, facts, anchors);
}
