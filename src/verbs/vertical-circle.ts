// A bob on a string in a vertical circle, computed: the speed from energy conservation, v² = v₀² − 2gL(1 − cos θ),
// and the tension from the radial equation, T − mg cos θ = mv²/L (θ from the lowest point A). The bob leaves A moving
// to the right, passes B (the string level) and reaches the top C moving to the left, as in NCERT Fig. 5.6. With
// v₀ = √(5gL) (the book's Example 5.7, the default) T falls to zero just at C, where v = √(gL), the least speed at the
// top for the string to stay taut. Slower, the string goes slack before C and the bob falls inside the circle as a
// projectile; slower than √(2gL), it only swings. Shows: circle (the motion with live θ, h, v and T), top (the instant
// at C: string slack, velocity horizontal) and forces (the bob held at an angle with mg, T and mg's parts).
// (2026-11-05: keph1-05 C8 S22 "Bob at Point C" was left blank; no verb could draw a bob at the top of its circle.)
import type {Key} from '../keys.ts';
import {toScene, type Plane} from '../plane.ts';
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {round, type Vec} from '../vec.ts';
import {n2, panel, scene, text} from './calculus.ts';
import {frame} from './vectors.ts';

export const VC_SHOWS = ['circle', 'top', 'forces'] as const;
const POINTS = ['A', 'B', 'C'] as const;
export type VerticalCircleSpec = {verb: 'vertical_circle'; show?: (typeof VC_SHOWS)[number];
  /** string length (m), the bob's speed at the lowest point A (m/s; default √(5gL), the book's case), mass (kg), g */
  L?: number; v0?: number; mass?: number; g?: number;
  /** forces: the angle from A where the bob is held (degrees) */
  at?: number;
  /** top: false starts at C (no climb to it) */
  approach?: boolean;
  /** the points named on the circle (default all three) */
  points?: (typeof POINTS)[number][];
  /** draw the weight mg (default true), the velocity v (default true) */
  weight?: boolean; velocity?: boolean;
  seconds?: number; title?: string; illustrative?: boolean; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const f = (v: number, p = 2) => n2(round(v, 9), Math.abs(v) >= 100 ? 0 : p);
const DEG = Math.PI / 180;

type Sample = {t: number; p: Vec; v: Vec; T: number; taut: boolean; th: number};

/** The motion from A, sampled: on the circle while the string is taut, then a projectile once T would go negative, until
 * the string is taut again (or `stop` says the show has seen enough). Positions are from O, y up. */
export function vcMotion(L: number, v0: number, g: number, stop: (s: Sample) => boolean, tmax = 60): Sample[] {
  const out: Sample[] = [], h = Math.min(1e-3, 0.002 * Math.sqrt(L / g));
  let th = 0, w = v0 / L, t = 0;
  const on = (th: number, w: number): Sample => {
    const v = w * L, T = v * v / L + g * Math.cos(th);           // per unit mass
    return {t, p: [L * Math.sin(th), -L * Math.cos(th)], v: [v * Math.cos(th), v * Math.sin(th)], T, taut: T >= -1e-6 * g, th};
  };
  let s = on(th, w);
  out.push(s);
  // on the circle: θ'' = −(g/L) sin θ, RK4
  while (t < tmax && s.taut && !stop(s)) {
    const acc = (a: number) => -(g / L) * Math.sin(a);
    const k1 = [w, acc(th)], k2 = [w + h / 2 * k1[1], acc(th + h / 2 * k1[0])], k3 = [w + h / 2 * k2[1], acc(th + h / 2 * k2[0])], k4 = [w + h * k3[1], acc(th + h * k3[0])];
    th += h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); w += h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]); t += h;
    s = on(th, w);
    out.push(s);
  }
  if (!s.taut && !stop(s)) {
    // slack: a projectile from where the tension reached zero, inside the circle until the string is taut again
    // or the bob has fallen to O's level
    const p0 = s.p, u = s.v, t0 = t;
    for (;;) {
      t += h;
      const d = t - t0, p: Vec = [p0[0] + u[0] * d, p0[1] + u[1] * d - g * d * d / 2], v: Vec = [u[0], u[1] - g * d];
      const r = Math.hypot(...p), a = Math.atan2(p[0], -p[1]), q: Sample = {t, p, v, T: 0, taut: false, th: a < 0 ? a + 2 * Math.PI : a};
      if (r >= L && d > 0.05 * Math.sqrt(L / g)) { out.push({...q, taut: true}); break; }
      if (p[1] <= 0 && v[1] < 0) { out.push(q); break; }                  // fallen to O's level: enough seen
      out.push(q);
      if (t > tmax || stop(q)) break;
    }
  }
  return out;
}

export function verticalCircleErrors(s: VerticalCircleSpec): string[] {
  const e: string[] = [];
  const show = s.show ?? 'circle';
  if (!VC_SHOWS.includes(show)) return [`vertical_circle: show is ${VC_SHOWS.join(', ')}`];
  if (s.L !== undefined && !(isNum(s.L) && s.L > 0 && s.L <= 100)) e.push('vertical_circle: L is the string length in metres, above 0 and at most 100');
  if (s.g !== undefined && !(isNum(s.g) && s.g > 0 && s.g <= 30)) e.push('vertical_circle: g is in m/s², above 0 (default 9.8)');
  if (s.mass !== undefined && !(isNum(s.mass) && s.mass > 0)) e.push('vertical_circle: mass is in kg, above 0 (leave it out to give T in units of mg)');
  if (s.v0 !== undefined && !(isNum(s.v0) && s.v0 > 0)) e.push('vertical_circle: v0 is the speed at the lowest point A in m/s, above 0 (leave it out for the book\'s √(5gL))');
  if (s.seconds !== undefined && !(isNum(s.seconds) && s.seconds >= 4 && s.seconds <= 30)) e.push('vertical_circle: seconds is the scene length, 4 to 30');
  for (const p of s.points ?? []) if (!POINTS.includes(p)) e.push('vertical_circle: points are A (lowest), B (string level) and C (top)');
  if (s.at !== undefined && show !== 'forces') e.push('vertical_circle: at belongs to show forces');
  if (s.approach !== undefined && show !== 'top') e.push('vertical_circle: approach belongs to show top');
  if (e.length) return e;
  const L = s.L ?? 1, g = s.g ?? 9.8, v0 = s.v0 ?? Math.sqrt(5 * g * L), least = Math.sqrt(5 * g * L);
  if (v0 > Math.sqrt(30 * g * L)) e.push(`vertical_circle: v0 is at most √(30gL) = ${f(Math.sqrt(30 * g * L))} m/s, or the bob's motion is a blur`);
  if (show === 'top' && v0 < least * (1 - 1e-6))
    e.push(`vertical_circle: top needs the bob to reach C with the string taut, so v0 at least √(5gL) = ${f(least)} m/s; leave v0 out for the book's case (just slack at C)`);
  if (show === 'forces') {
    if (s.at !== undefined && !(isNum(s.at) && s.at >= 0 && s.at <= 180)) e.push('vertical_circle: at is the angle from A in degrees, 0 to 180');
    else {
      const th = (s.at ?? 60) * DEG, v2 = v0 * v0 - 2 * g * L * (1 - Math.cos(th)), T = v2 / L + g * Math.cos(th);
      if (v2 < 0 || T < -1e-9) e.push(`vertical_circle: the bob never reaches ${f(s.at ?? 60, 0)}° on a taut string with v0 = ${f(v0)} m/s; lower at or raise v0 (√(5gL) = ${f(least)} m/s goes all the way round)`);
    }
  }
  return e;
}

export function verticalCircle(s: VerticalCircleSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, show = s.show ?? 'circle';
  const L = s.L ?? 1, g = s.g ?? 9.8, least = Math.sqrt(5 * g * L), v0 = s.v0 ?? least, m = s.mass;
  const just = Math.abs(v0 - least) < 1e-6 * least, named = new Set(s.points ?? (show === 'circle' ? POINTS : show === 'top' ? ['C'] : ['A']));
  const fr = frame(W, H, k, s.title), narrow = W < 1.3 * H, box = fr.box, lineSize = (narrow ? 25 : 30) * k;
  // the window: the circle with room round it for the names and arrows, one scale across and up
  const half = 1.32 * L, bw = box[2] - box[0], bh = box[3] - box[1], per = Math.max(2 * half / bw, 2 * half / bh);
  const plane: Plane = {id: 'p', x: [-per * bw / 2, per * bw / 2], y: [-per * bh / 2, per * bh / 2], box};
  const props: Prop[] = [...fr.titles], facts: string[] = [], px = fr.px, ptext = panel(W, k);
  let row = fr.row;
  const line = (id: string, t: string, at: number, extra: Partial<Prop> = {}, until = 1e9) => {
    props.push(ptext(id, px, row, t, lineSize, {show: [at, until], ...extra}));
    row += wrapText(t, lineSize, W - px - 40 * k).length * 1.3 * lineSize + 6 * k;
  };
  const tension = (T: number) => (m ? `${f(m * T)} N` : `${f(T / g)} mg`);   // T per unit mass in, as the panel says it

  // the motion this show needs, from A
  const cTime = (() => { const r = vcMotion(L, v0, g, q => q.th >= Math.PI || !q.taut); return r[r.length - 1].t; })();
  let samples: Sample[];
  if (show === 'circle') {
    // once round (or until the string is taut again after going slack); a swing below B: out and back once
    const swing = v0 * v0 <= 2 * g * L;
    samples = vcMotion(L, v0, g, q => (swing ? q.t > 0.05 && q.th <= 0 : q.th >= 2 * Math.PI));
  } else if (show === 'top') {
    samples = vcMotion(L, v0, g, q => q.th >= Math.PI - 1e-9);
    const start = s.approach === false ? samples.length - 1 : samples.findIndex(q => q.th >= 0.62 * Math.PI);
    samples = samples.slice(Math.max(0, start));
  } else {
    // the bob comes to rest in the picture exactly at the angle asked, with the speed and tension there
    const th = (s.at ?? 60) * DEG, v = Math.sqrt(Math.max(0, v0 * v0 - 2 * g * L * (1 - Math.cos(th))));
    samples = vcMotion(L, v0, g, q => q.th >= th);
    const t = samples[samples.length - 1].t;
    samples[samples.length - 1] = {t, th, taut: true, p: [L * Math.sin(th), -L * Math.cos(th)], v: [v * Math.cos(th), v * Math.sin(th)], T: v * v / L + g * Math.cos(th)};
  }
  const last = samples[samples.length - 1];
  // on screen: the motion is slowed to fill a few seconds, every part at one rate (so it is fastest where it is fastest)
  const lead = 0.8, phys = last.t - samples[0].t;
  const D = show === 'circle' ? Math.min(12, Math.max(6, (s.seconds ?? 12) - 3.5)) : show === 'top' ? (phys > 0 ? 2.2 : 0) : 2.5;
  const tau = (t: number) => lead + (phys > 0 ? (t - samples[0].t) * D / phys : 0);
  const motionEnd = tau(last.t);
  const n = Math.max(2, Math.ceil(D * 20)), keyedAt = Array.from({length: n + 1}, (_, i) => samples[Math.round(i * (samples.length - 1) / n)]);
  const keyed = (g: (q: Sample) => number): Key[] => keyedAt.map((q, i) => (i ? [tau(q.t), g(q), 'linear'] : [tau(q.t), g(q)]) as Key);
  const pxl = per;                                                        // plane units per pixel

  // the circle, O and the named points
  props.push({id: 'path', type: 'circle', plane: 'p', x: 0, y: 0, r: L / pxl, style: {stroke: 'muted', width: 3 * k, dash: [10 * k, 8 * k], opacity: 0.7, fill: 'none'}} as Prop);
  props.push({id: 'O', type: 'circle', plane: 'p', x: 0, y: 0, r: 7 * k, style: {fill: 'ink'}} as Prop);
  const [ox, oy] = toScene(plane, [0, 0]);
  props.push(text('lO', ox - 16 * k, oy + 26 * k, 'O', 30 * k, {weight: 700, align: 'end'}));
  const anchors: Record<string, Vec> = {O: [ox, oy]};
  const place: Record<string, Vec> = {A: [0, -L], B: [L, 0], C: [0, L]};
  const nameAt: Record<string, Vec> = {A: [-0.2 * L, -L - 0.12 * L], B: [L + 0.2 * L, -0.12 * L], C: [0.2 * L, L + 0.13 * L]};
  for (const p of POINTS) {
    anchors[p] = toScene(plane, place[p]);
    if (!named.has(p)) continue;
    props.push({id: `pt${p}`, type: 'circle', plane: 'p', x: place[p][0], y: place[p][1], r: 6 * k, style: {fill: 'muted'}} as Prop);
    const [x, y] = toScene(plane, nameAt[p]);
    props.push(text(`l${p}`, x, y, p, 32 * k, {weight: 700, align: 'middle'}));
  }

  // the string: 12 short pieces, straight while taut, bowed once slack (its length kept), wavy at C in the top show
  const PIECES = 12, wiggleFrom = show === 'top' ? motionEnd : 1e9;
  const stringPoint = (q: Sample, i: number, wiggle: number): Vec => {
    const d = Math.hypot(...q.p), u: Vec = [q.p[0] / (d || 1), q.p[1] / (d || 1)], nrm: Vec = [-u[1], u[0]], a = i / PIECES;
    const bow = q.taut || d >= L ? 0 : (2 / Math.PI) * Math.sqrt(Math.max(0, d * (L - d)));
    const off = bow * Math.sin(Math.PI * a) + wiggle * 0.06 * L * Math.sin(2 * Math.PI * a);
    return [u[0] * d * a + nrm[0] * off, u[1] * d * a + nrm[1] * off];
  };
  for (let i = 0; i < PIECES; i++) {
    const keys: Record<string, Key[]> = {x1: keyed(q => stringPoint(q, i, 0)[0]), y1: keyed(q => stringPoint(q, i, 0)[1]),
      x2: keyed(q => stringPoint(q, i + 1, 0)[0]), y2: keyed(q => stringPoint(q, i + 1, 0)[1])};
    if (wiggleFrom < 1e9) {
      // after the bob arrives the string loosens: straight to wavy in half a second
      for (const [fld, j, c] of [['x1', i, 0], ['y1', i, 1], ['x2', i + 1, 0], ['y2', i + 1, 1]] as const)
        keys[fld].push([wiggleFrom + 0.6, stringPoint(last, j, 1)[c], 'inOut']);
    }
    const [a, b] = [stringPoint(samples[0], i, 0), stringPoint(samples[0], i + 1, 0)];
    props.push({id: `string${i}`, type: 'line', plane: 'p', x1: a[0], y1: a[1], x2: b[0], y2: b[1], keys, style: {stroke: 'ink', width: 3 * k}} as Prop);
  }
  // the bob
  const bobR = 22 * k;
  props.push({id: 'bob', type: 'circle', plane: 'p', x: samples[0].p[0], y: samples[0].p[1], r: bobR, layer: 3,
    keys: {x: keyed(q => q.p[0]), y: keyed(q => q.p[1])}, style: {fill: 'accent', stroke: 'ink', width: 2 * k}} as Prop);
  anchors.bob = toScene(plane, last.p);

  // arrows: v along the tangent, T along the string to O, mg down; to one scale each over the whole motion
  const vmax = Math.max(...samples.map(q => Math.hypot(...q.v)), 1e-9), Tmax = Math.max(...samples.map(q => q.T), g);
  // the forces show is to one scale at its angle only: the largest force there spans most of the string
  const Fhere = Math.max(last.T, g), vs = (show === 'circle' ? 0.5 : 0.6) * L / vmax, fs = show === 'circle' ? 0.6 * L / Tmax : show === 'forces' ? 0.75 * L / Fhere : 0.45 * L / Tmax;
  const wantV = s.velocity !== false, wantW = s.weight !== false;
  const nameGap = 30 * k * pxl;
  // a name beyond the arrow's tip, or (side) beside its middle, clear of what lies at its tip (T points at O)
  const arrow = (id: string, from: (q: Sample) => Vec, to: (q: Sample) => Vec, stroke: string, label: string, on: number, off = 1e9, width = 5, side = false,
    seen?: (q: Sample) => number) => {
    const fadeKeys = seen ? {opacity: keyed(seen)} : {};
    const q0 = samples[0], tip = (q: Sample): Vec => { const a = from(q), b = to(q), d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, u: Vec = [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
      return side ? [(a[0] + b[0]) / 2 + u[1] * nameGap, (a[1] + b[1]) / 2 - u[0] * nameGap] : [b[0] + u[0] * nameGap, b[1] + u[1] * nameGap]; };
    props.push({id, type: 'arrow', plane: 'p', x1: from(q0)[0], y1: from(q0)[1], x2: to(q0)[0], y2: to(q0)[1], head: 16 * k, layer: 2,
      keys: {x1: keyed(q => from(q)[0]), y1: keyed(q => from(q)[1]), x2: keyed(q => to(q)[0]), y2: keyed(q => to(q)[1]), ...fadeKeys},
      style: {stroke, width: width * k}, show: [on, off], fade: 0.25} as Prop);
    props.push({id: `l${id}`, type: 'text', plane: 'p', x: tip(q0)[0], y: tip(q0)[1], text: label, size: 30 * k, weight: 700, align: 'middle', layer: 4,
      keys: {x: keyed(q => tip(q)[0]), y: keyed(q => tip(q)[1]), ...fadeKeys}, style: {fill: stroke, stroke: 'paper', width: 7 * k}, show: [on, off], fade: 0.25} as Prop);
  };
  const edge = (q: Sample, d: Vec): Vec => { const l = Math.hypot(...d) || 1, r = bobR * pxl; return [q.p[0] + d[0] / l * r, q.p[1] + d[1] / l * r]; };
  const plus = (a: Vec, d: Vec, sc: number): Vec => [a[0] + d[0] * sc, a[1] + d[1] * sc];
  const toO = (q: Sample): Vec => { const d = Math.hypot(...q.p) || 1; return [-q.p[0] / d, -q.p[1] / d]; };
  const legend: [string, string][] = [];
  const forcesOn = show === 'circle' ? lead : motionEnd + 0.3;
  if (wantV) {
    arrow('v', q => edge(q, q.v), q => plus(edge(q, q.v), q.v, vs), 'cool', 'v', show === 'top' ? motionEnd + 0.6 : lead);
    legend.push(['v: velocity, along the tangent', 'cool']);
  }
  if (show !== 'top' || !just) {
    // the tension, while there is any (none at C in the book's case, so the top show draws none)
    const tl = (q: Sample) => Math.max(0, q.T) * fs;
    arrow('T', q => edge(q, toO(q)), q => plus(edge(q, toO(q)), toO(q), Math.max(tl(q), 1e-6)), 'good', 'T', forcesOn, 1e9, 5, true,
      q => Math.min(1, Math.max(0, q.T / (0.15 * g))));   // it fades as the tension falls to zero
    legend.push(['T: tension, along the string towards O', 'good']);
  }
  if (wantW) {
    arrow('mg', q => edge(q, [0, -1]), q => plus(edge(q, [0, -1]), [0, -1], g * fs), 'bad', 'mg', forcesOn);
    legend.push(['mg: the weight, straight down', 'bad']);
  }
  // a half-width part has its panel under the drawing, short of room: the arrows' own names say enough there
  // (the top show says it in a sentence: the bob moving horizontally)
  if (!narrow && show !== 'top') legend.forEach(([t, c], i) => line(`legend${i}`, t, lead, {style: {fill: c}}));
  row += 6 * k;

  // the book's numbers, every case
  const vAt = (th: number) => Math.sqrt(Math.max(0, v0 * v0 - 2 * g * L * (1 - Math.cos(th)))), TAt = (th: number) => vAt(th) ** 2 / L + g * Math.cos(th);
  facts.push(`string length L = ${f(L)} m`, `speed at A v0 = ${f(v0)} m/s`, `tension at A = ${tension(TAt(0))}`,
    `least speed at the top for a taut string √(gL) = ${f(Math.sqrt(g * L))} m/s`, `least speed at A to go round √(5gL) = ${f(least)} m/s`);
  if (v0 * v0 > 2 * g * L) facts.push(`speed at B = ${f(vAt(Math.PI / 2))} m/s`, `tension at B = ${tension(TAt(Math.PI / 2))}`);
  if (v0 >= least * (1 - 1e-6)) facts.push(`speed at C = ${f(vAt(Math.PI))} m/s`, `tension at C = ${tension(Math.max(0, TAt(Math.PI)))}`,
    `KB/KC = ${f(vAt(Math.PI / 2) ** 2 / vAt(Math.PI) ** 2)}`);
  let end = motionEnd + 2.5;

  if (show === 'circle') {
    const ro = (id: string, t: string, measures: Record<string, Key[]>, decimals = 2) => {
      props.push({id, type: 'readout', x: px, y: row, size: lineSize, text: t, decimals, show: [lead, 1e9],
        measures: Object.fromEntries(Object.entries(measures).map(([nm, keys]) => [nm, {kind: 'keys', keys}]))} as Prop);
      row += 1.35 * lineSize;
    };
    ro('ro-th', 'θ from A = {a}°', {a: keyed(q => q.th / DEG)}, 0);
    ro('ro-h', 'height above A, h = {h} m', {h: keyed(q => q.p[1] + L)});
    ro('ro-v', 'speed v = {v} m/s', {v: keyed(q => Math.hypot(...q.v))});
    ro('ro-T', m ? 'tension T = {T} N' : 'tension T = {T} × mg', {T: keyed(q => Math.max(0, q.T) * (m ?? 1 / g))});
    row += 6 * k;
    line('eq1', 'Energy: v² = v₀² − 2gh', lead + 0.6, {style: {fill: 'muted'}});
    line('eq2', 'Along the string: T − mg cos θ = mv²/L', lead + 0.6, {style: {fill: 'muted'}});
    const slack = samples.findIndex(q => !q.taut);
    if (v0 * v0 <= 2 * g * L) {
      line('w-out', 'Too slow to reach B: the bob swings to and fro below B, the string taut', motionEnd);
    } else if (slack >= 0) {
      const q = samples[slack], at = tau(q.t);
      props.push({id: 'slackPt', type: 'circle', plane: 'p', x: q.p[0], y: q.p[1], r: 8 * k, style: {fill: 'bad'}, show: [at, 1e9]} as Prop);
      // the free fall from there, drawn behind the bob as it goes (a parabola: the string no longer holds it)
      const fall = samples.slice(slack), pts = fall.filter((_, i) => i % Math.max(1, Math.floor(fall.length / 60)) === 0).map(q => q.p);
      pts.push(fall[fall.length - 1].p);
      const drawKeys = (qs: Sample[], from: number): Key[] => {
        const cum = [0]; for (let i = 1; i < qs.length; i++) cum.push(cum[i - 1] + Math.hypot(qs[i].p[0] - qs[i - 1].p[0], qs[i].p[1] - qs[i - 1].p[1]));
        const total = cum[cum.length - 1] || 1, step = Math.max(1, Math.floor(qs.length / 40));
        return [[from, 0] as Key, ...qs.map((q, i) => [tau(q.t), cum[i] / total, 'linear'] as Key).filter((_, i) => i && (i % step === 0 || i === qs.length - 1))];
      };
      props.push({id: 'fall', type: 'polyline', plane: 'p', points: pts, draw: 0, keys: {draw: drawKeys(fall, at)},
        style: {stroke: 'bad', width: 3 * k, dash: [8 * k, 6 * k], opacity: 0.8}, show: [at, 1e9]} as Prop);
      line('w-out', 'Too slow for the top: the tension falls to zero before C, the string goes slack and the bob falls inside the circle', at);
      line('n-out', `slack at θ = ${f(q.th / DEG, 0)}°, where T = 0 and v = ${f(Math.hypot(...q.v))} m/s`, at, {style: {fill: 'muted'}});
      facts.push(`the string goes slack at ${f(q.th / DEG, 0)}° from A, speed ${f(Math.hypot(...q.v))} m/s`);
    } else {
      const atC = tau(cTime);
      line('w-out', just ? 'At C the tension falls to zero: the weight alone pulls the bob round, the least speed for a taut string'
        : 'Fast enough: the string stays taut all the way round, the tension least at C', atC);
      line('n-out', `at C: v = ${f(vAt(Math.PI))} m/s${just ? ' = √(gL)' : ''}, T = ${tension(Math.max(0, TAt(Math.PI)))}; at A: T = ${tension(TAt(0))}`, atC, {style: {fill: 'muted'}});
    }
    end = motionEnd + 2;
  } else if (show === 'top') {
    const vC = vAt(Math.PI), TC = Math.max(0, TAt(Math.PI)), on = motionEnd + 0.3;
    if (just) {
      line('w1', 'At C the string goes slack: there is no tension', on);
      if (wantV) line('w2', 'The bob is moving horizontally at that instant', motionEnd + 0.6, {style: {fill: 'cool'}});
      line('n1', `T = 0, so mg = m v²/L: v = √(gL) = ${f(vC)} m/s`, motionEnd + 1, {style: {fill: 'muted'}});
    } else {
      line('w1', 'At C the string is still taut: the tension and the weight both pull towards O', on);
      if (wantV) line('w2', 'The bob is moving horizontally at that instant', motionEnd + 0.6, {style: {fill: 'cool'}});
      line('n1', `v = ${f(vC)} m/s, T = ${tension(TC)}`, motionEnd + 1, {style: {fill: 'muted'}});
    }
    end = motionEnd + 3.2;
  } else {
    // forces: the bob held at θ, with mg's part along the string (mg cos θ, outwards), θ marked at O
    const th = last.th, on = motionEnd + 0.3, out: Vec = [Math.sin(th), -Math.cos(th)];
    if (wantW && Math.abs(Math.cos(th)) > 0.1) {
      // only the part along the string, which the radial equation uses; named past its tip, on the side away from mg
      // outwards it runs on from the bob, named past its tip; inwards (above B) it would lie on T, so it runs beside it
      const size = g * Math.cos(th) * fs, up: Vec = out[0] >= 0 ? [-out[1], out[0]] : [out[1], -out[0]];
      // (on the side between T and mg: T's own name is on the other side)
      const base = size < 0 ? plus(edge(last, toO(last)), up, -0.6 * nameGap) : edge(last, out), tip = plus(base, out, size);
      const lab: Vec = size > 0 ? [tip[0] + out[0] * nameGap * 2.4 + up[0] * nameGap * 0.7, tip[1] + out[1] * nameGap * 2.4 + up[1] * nameGap * 0.7]
        : [(base[0] + tip[0]) / 2 - up[0] * nameGap * 2.2, (base[1] + tip[1]) / 2 - up[1] * nameGap * 2.2];
      props.push({id: 'mgcos', type: 'arrow', plane: 'p', x1: base[0], y1: base[1], x2: tip[0], y2: tip[1], head: 14 * k, style: {stroke: 'bad', width: 3 * k, dash: [8 * k, 6 * k]}, show: [on, 1e9], fade: 0.3} as Prop,
        {id: 'lmgcos', type: 'text', plane: 'p', x: lab[0], y: lab[1], text: 'mg cos θ', size: 28 * k, weight: 700, align: 'middle', style: {fill: 'bad', stroke: 'paper', width: 6 * k}, show: [on, 1e9], fade: 0.3} as Prop);
    }
    // the angle θ at O from OA to the string
    const rr = 0.28 * L, arc: Vec[] = Array.from({length: 25}, (_, i) => { const a = th * i / 24; return [rr * Math.sin(a), -rr * Math.cos(a)] as Vec; });
    props.push({id: 'arcTh', type: 'polyline', plane: 'p', points: arc, style: {stroke: 'accent', width: 3 * k}, show: [on, 1e9]} as Prop,
      {id: 'OA', type: 'line', plane: 'p', x1: 0, y1: 0, x2: 0, y2: -L, style: {stroke: 'muted', width: 2 * k, dash: [6 * k, 6 * k]}} as Prop);
    const mid = rr + 0.13 * L;
    props.push({id: 'lth', type: 'text', plane: 'p', x: mid * Math.sin(th / 2), y: -mid * Math.cos(th / 2), text: 'θ', size: 30 * k, weight: 700, align: 'middle', style: {fill: 'accent'}, show: [on, 1e9]} as Prop);
    const v = vAt(th), T = TAt(th);
    line('w1', 'Along the string, T and the part of mg along it give the centripetal force', on);
    line('eq1', 'T − mg cos θ = mv²/L', on + 0.4, {weight: 700});
    line('eq2', 'v² = v₀² − 2gL(1 − cos θ)', on + 0.8, {style: {fill: 'muted'}});
    line('n1', `at θ = ${f(th / DEG, 0)}°: v = ${f(v)} m/s, T = ${tension(T)}`, on + 1.2, {style: {fill: 'muted'}});
    facts.push(`at ${f(th / DEG, 0)}° from A: v = ${f(v)} m/s, T = ${tension(T)}`);
    end = motionEnd + 3.5;
  }
  const duration = Math.max(end, s.seconds ?? 0);
  return {...scene(s, W, H, duration, plane, props, [], {verb: 'vertical_circle', facts, anchors}), planes: [plane]};
}
