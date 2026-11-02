// induction: electromagnetic induction, computed (NCERT Class 12 Physics, Ch. 6; 2026-11-03).
//   experiment a magnet or a current coil moved at a coil: flux from the dipole's own formula, the pointer follows its rate, the coil's face and current oppose it
//   key        tapping a key on a neighbouring coil: a kick on press, none while held, the opposite kick on release
//   flux       Φ = BA cos θ: a plate turned in a uniform field, the lines through it counted
//   faraday    Φ against t and ε = −N dΦ/dt beneath it, with I = ε/R
//   region     a loop entering or leaving a field: current only while the flux changes, its sense from Lenz's law; `shape` for other loops, `curve` for ε against t
//   open       a coil with a gap: no continuous current; charges pile up at the ends until the forces balance; a voltmeter reads ε
//   motional   a rod on rails: ε = Blv, I, and the force that opposes the motion; `lorentz` shows the charge pushed along the rod
//   spin       a rod or spokes turning about one end: ε = ½Bωl², the same however many spokes
//   mutual     coaxial solenoids (or concentric coils): M, and a changing current in one, an emf in the other
//   self       a coil's own back emf as the current rises, holds and falls; U = ½LI²
//   generator  a coil turning in a field: Φ = BA cos θ, ε = NBAω sin θ traced, the current's sense in each side
import {kit} from './potential.ts';
import {sci} from './electric.ts';
import type {Prop, Scene} from '../scene.ts';

type P2 = [number, number];
export const INDUCTION_SHOWS = ['experiment', 'key', 'flux', 'faraday', 'region', 'motional', 'spin', 'mutual', 'self', 'generator', 'open'] as const;
export const OPEN_STAGES = ['gap', 'charge', 'balance', 'meter'] as const;
export const LOOP_SHAPES = ['rectangle', 'triangle', 'irregular', 'circle'] as const;
export type InductionSpec = {verb: 'induction'; show: (typeof INDUCTION_SHOWS)[number]; source?: 'magnet' | 'coil'; motion?: 'toward' | 'away' | 'still'; pole?: 'N' | 'S'; fast?: boolean; iron?: boolean; work?: boolean; stage?: (typeof OPEN_STAGES)[number]; shape?: (typeof LOOP_SHAPES)[number]; curve?: boolean;
  B?: number; B2?: number; A?: number; angle?: number; angle2?: number; sweep?: boolean; dt?: number; N?: number; R?: number; move?: 'into' | 'out'; field?: 'into' | 'out'; l?: number; v?: number; lorentz?: boolean;
  nu?: number; spokes?: number; coils?: 'solenoids' | 'concentric'; from?: 1 | 2; n1?: number; n2?: number; r1?: number; r2?: number; I?: number; M?: number; L?: number; n?: number; mur?: number;
  title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};

const MU = 4 * Math.PI * 1e-7, RAD = Math.PI / 180;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const sig = (x: number, unit: string, d: number) => { const a = Math.abs(x); return a !== 0 && (a >= 1000 || a < .1) ? sci(+x.toPrecision(d), unit) : `${+x.toPrecision(d)} ${unit}`; };
const two = (x: number, unit: string) => sig(x, unit, 2);

export const fluxOf = (B: number, A: number, deg: number) => B * A * Math.cos(deg * RAD);
export const faradayOf = (s: {B: number; B2?: number; A: number; angle?: number; angle2?: number; dt: number; N?: number; R?: number}) => {
  const p0 = fluxOf(s.B, s.A, s.angle ?? 0), p1 = fluxOf(s.B2 ?? s.B, s.A, s.angle2 ?? s.angle ?? 0), emf = (s.N ?? 1) * Math.abs(p1 - p0) / s.dt;
  return {p0, p1, emf, I: s.R ? emf / s.R : undefined};
};
export const motionalOf = (B: number, l: number, v: number, R: number) => { const e = B * l * v, I = e / R; return {e, I, F: B * I * l, P: e * I}; };
export const spinOf = (B: number, l: number, nu: number) => .5 * B * 2 * Math.PI * nu * l * l;
export const solenoidM = (n1: number, n2: number, r1: number, l: number) => MU * n1 * n2 * Math.PI * r1 * r1 * l;
export const concentricM = (r1: number, r2: number) => MU * Math.PI * r1 * r1 / (2 * r2);
export const selfL = (n: number, A: number, l: number, mur = 1) => mur * MU * n * n * A * l;
export const peakEmf = (N: number, B: number, A: number, nu: number) => N * B * A * 2 * Math.PI * nu;
/** Which way the coil's face answers: +1 its face toward the source is N (anticlockwise seen from the source). */
export const faceSign = (pole: 'N' | 'S', motion: 'toward' | 'away') => (pole === 'N' ? 1 : -1) * (motion === 'toward' ? 1 : -1);
/** Sense of a loop's induced current, seen by the reader: +1 anticlockwise. Field into the page, flux rising: anticlockwise. */
/** A loop's outline, 0 to 1 across its box. */
export const loopOutline = (shape: (typeof LOOP_SHAPES)[number]): P2[] => shape === 'triangle' ? [[0, 0], [1, .5], [0, 1]] : shape === 'irregular' ? [[0, .25], [.4, 0], [1, .3], [.8, .85], [.3, 1]] : shape === 'circle' ? Array.from({length: 48}, (_, i) => [.5 + .5 * Math.cos(i * Math.PI / 24), .5 + .5 * Math.sin(i * Math.PI / 24)] as P2) : [[0, 0], [1, 0], [1, 1], [0, 1]];
/** How much of the loop the field's edge cuts at u across it, 0 to 1: ε follows this at steady speed. */
export const chordAt = (outline: P2[], u: number) => { const ys: number[] = []; outline.forEach((p, i) => { const q = outline[(i + 1) % outline.length]; if ((p[0] <= u && q[0] > u) || (q[0] <= u && p[0] > u)) ys.push(p[1] + (q[1] - p[1]) * (u - p[0]) / (q[0] - p[0])); }); return ys.length < 2 ? 0 : Math.max(...ys) - Math.min(...ys); };
/** Which open end gathers the positive charge: the far end when the coil's face answers N (the would-be current runs up the near side, over, and down to the far end). */
export const openPlusEnd = (pole: 'N' | 'S', motion: 'toward' | 'away') => faceSign(pole, motion) > 0 ? 'far' : 'near';
export const regionSense = (field: 'into' | 'out', move: 'into' | 'out') => (field === 'into' ? 1 : -1) * (move === 'into' ? 1 : -1);

export function inductionErrors(s: InductionSpec): string[] {
  const e: string[] = [], W = 'induction';
  if (!INDUCTION_SHOWS.includes(s.show)) return [`${W}: show is one of ${INDUCTION_SHOWS.join(', ')}`];
  for (const n of ['B', 'A', 'dt', 'N', 'R', 'l', 'v', 'nu', 'spokes', 'n1', 'n2', 'r1', 'r2', 'I', 'M', 'L', 'n', 'mur'] as const) if (s[n] !== undefined && !(isNum(s[n]) && (s[n] as number) > 0)) e.push(`${W}: ${n} is a number above 0`);
  if (s.B2 !== undefined && !(isNum(s.B2) && s.B2 >= 0)) e.push(`${W}: B2 is a number, 0 or above`);
  for (const n of ['angle', 'angle2'] as const) if (s[n] !== undefined && !(isNum(s[n]) && (s[n] as number) >= 0 && (s[n] as number) <= (s.show === 'generator' ? 360 : 180))) e.push(`${W}: ${n} is 0 to ${s.show === 'generator' ? 360 : 180} degrees`);
  if (s.source !== undefined && !['magnet', 'coil'].includes(s.source)) e.push(`${W}: source is magnet or coil`);
  if (s.motion !== undefined && !['toward', 'away', 'still'].includes(s.motion)) e.push(`${W}: motion is toward, away or still`);
  if (s.pole !== undefined && !['N', 'S'].includes(s.pole)) e.push(`${W}: pole is N or S`);
  if (s.move !== undefined && !['into', 'out'].includes(s.move)) e.push(`${W}: move is into or out`);
  if (s.field !== undefined && !['into', 'out'].includes(s.field)) e.push(`${W}: field is into or out`);
  if (s.stage !== undefined && !OPEN_STAGES.includes(s.stage)) e.push(`${W}: stage is one of ${OPEN_STAGES.join(', ')}`);
  if (s.shape !== undefined && !LOOP_SHAPES.includes(s.shape)) e.push(`${W}: shape is one of ${LOOP_SHAPES.join(', ')}`);
  if (s.show === 'open' && s.motion === 'still') e.push(`${W}: an open coil needs the flux changing: motion toward or away`);
  if (s.coils !== undefined && !['solenoids', 'concentric'].includes(s.coils)) e.push(`${W}: coils is solenoids or concentric`);
  if (s.from !== undefined && ![1, 2].includes(s.from)) e.push(`${W}: from is 1 or 2`);
  if (s.spokes !== undefined && !(Number.isInteger(s.spokes) && s.spokes <= 12)) e.push(`${W}: spokes is a whole number up to 12`);
  return e;
}

export function induction(s: InductionSpec): Scene {
  const {k, props, bx, by, bw, bh, cx, cy, S, arrow, line, poly, label, ring, keysOf, finish} = kit(s);
  const facts: string[] = [], anchors: Record<string, P2> = {}; let dur = 8, story = '', second = '', c = 0;
  const id = (p: string) => `i${p}${c++}`;
  const rect = (x: number, y: number, w: number, h: number, fill: string, extra: Record<string, unknown> = {}, stroke = 'ink') => props.push({id: id('r'), type: 'rect', x, y, w, h, style: {fill, stroke, width: 2 * k}, layer: 2, ...extra} as Prop);
  const dot = (x: number, y: number, r: number, fill: string, extra: Record<string, unknown> = {}) => props.push({id: id('o'), type: 'circle', x, y, r: r * k, style: {fill, stroke: 'ink', width: 2 * k}, layer: 4, ...extra} as Prop);
  /** A strip chart: fn(t) drawn from t0 to t1, with a dot that follows the time. */
  const strip = (x0: number, y0: number, w: number, h: number, name: string, tmax: number, fn: (t: number) => number, top: number, colour = 'accent', tick?: string) => {
    line([x0, y0], [x0 + w, y0], 'ink', 3); line([x0, y0 - h], [x0, y0 + h], 'ink', 3); label(x0 - 6 * k, y0 - h - 12 * k, name, colour, 26); label(x0 + w + 16 * k, y0 + 9 * k, 't', 'muted', 24);
    if (tick) label(x0 + w - 30 * k, y0 + 34 * k, tick, 'muted', 22);
    const X = (t: number) => x0 + w * t / tmax, Y = (t: number) => y0 - h * fn(t) / top;
    props.push({id: id('p'), type: 'polyline', points: Array.from({length: 241}, (_, i) => { const t = tmax * i / 240; return [X(t), Y(t)] as P2; }), style: {stroke: colour, width: 4 * k}, draw: 0, keys: {draw: [[0, 0], [tmax, 1, 'linear']]}, layer: 2} as Prop);
    props.push({id: id('d'), type: 'circle', x: X(0), y: Y(0), r: 9 * k, style: {fill: colour, stroke: 'ink', width: 2 * k}, layer: 4, keys: {x: keysOf(tmax, X), y: keysOf(tmax, Y)}} as Prop);
  };
  /** A galvanometer: its needle leans right for positive rate; `rate` runs from −1 to 1. */
  const dial = (c0: P2, r: number, rate: (t: number) => number, name = 'G', anchor = 'galvanometer') => {
    poly(Array.from({length: 41}, (_, i) => { const a = (150 - 120 * i / 40) * RAD; return [c0[0] + r * Math.cos(a), c0[1] - r * Math.sin(a)] as P2; }), 'muted', 3);
    line([c0[0], c0[1] - r * .92], [c0[0], c0[1] - r * 1.04], 'muted', 3); label(c0[0], c0[1] + 34 * k, name, 'ink', 28); dot(c0[0], c0[1], 7, 'ink');
    const ang = (t: number) => (90 - 55 * Math.max(-1, Math.min(1, rate(t)))) * RAD;
    props.push({id: 'pointer', type: 'line', x1: c0[0], y1: c0[1], x2: c0[0] + r * .9 * Math.cos(ang(0)), y2: c0[1] - r * .9 * Math.sin(ang(0)), style: {stroke: 'bad', width: 5 * k}, layer: 3, keys: {x2: keysOf(dur, t => c0[0] + r * .9 * Math.cos(ang(t))), y2: keysOf(dur, t => c0[1] - r * .9 * Math.sin(ang(t)))}} as Prop);
    anchors[anchor] = c0;
  };
  /** A coil seen from the side, axis across the page. Its right half is the near half. */
  const coil = (x: number, y: number, a: number, b: number, turns = 4, colour = 'accent') => {
    for (let i = 0; i < turns; i++) { const X = x + (i - (turns - 1) / 2) * 16 * k;
      poly(Array.from({length: 25}, (_, j) => { const f = Math.PI / 2 + Math.PI * j / 24; return [X + a * Math.cos(f), y + b * Math.sin(f)] as P2; }), 'faint', 3);
      poly(Array.from({length: 25}, (_, j) => { const f = -Math.PI / 2 + Math.PI * j / 24; return [X + a * Math.cos(f), y + b * Math.sin(f)] as P2; }), colour, 4); }
  };

  /** A bar magnet, `pole` foremost and facing right; front(t) is its front face. */
  const magnet = (front: (t: number) => number, y: number, mw: number, mh: number, pole: 'N' | 'S') => {
    const backX = (t: number) => front(t) - mw, midX = (t: number) => front(t) - mw / 2, back = pole === 'N' ? 'S' : 'N', col = (q: string) => q === 'N' ? 'bad' : 'cool';
    rect(backX(0), y - mh / 2, mw / 2, mh, col(back), {keys: {x: keysOf(dur, backX)}}); rect(midX(0), y - mh / 2, mw / 2, mh, col(pole), {keys: {x: keysOf(dur, midX)}});
    label(backX(0) + mw / 4, y + mh * .18, back, 'paper', 30, {keys: {x: keysOf(dur, t => backX(t) + mw / 4)}}); label(midX(0) + mw / 4, y + mh * .18, pole, 'paper', 30, {keys: {x: keysOf(dur, t => midX(t) + mw / 4)}});
    anchors.source = [midX(dur), y];
  };

  if (s.show === 'experiment') {
    const motion = s.motion ?? 'toward', pole = s.pole ?? 'N', fast = !!s.fast, isCoil = s.source === 'coil'; dur = 9;
    const coilX = bx + bw * .72, cyy = cy - bh * .08, a = S * .05, b = S * .17, near = coilX - bw * .14, far = coilX - bw * .42, mw = bw * .24, mh = S * .1, t0 = 2, span = fast ? 1.5 : 3;
    const sign = motion === 'still' ? 0 : faceSign(pole, motion), start = motion === 'away' ? near : far, end = motion === 'away' ? far : near;
    const ease = (t: number) => { const f = Math.min(1, Math.max(0, (t - t0) / span)); return f * f * (3 - 2 * f); };
    const pos = (t: number) => motion === 'still' ? (near + far) / 2 : start + (end - start) * ease(t);   // the magnet's front face
    const flux = (x: number) => { const d = (coilX - x) / S; return 1 / (.09 + d * d) ** 1.5; };          // on-axis dipole: Φ ∝ a²/(a² + d²)^3/2
    const rawRate = (t: number) => (flux(pos(t + .02)) - flux(pos(t - .02))) / .04;
    const slowAt = (u: number) => { const f = Math.min(1, u) ** 2 * (3 - 2 * Math.min(1, u)); return far + (near - far) * f; };
    const slowPeak = Math.max(...Array.from({length: 300}, (_, i) => Math.abs(flux(slowAt((i + 1) / 300)) - flux(slowAt(i / 300))) / (3 / 300)));
    const rate = (t: number) => sign === 0 ? 0 : Math.sign(sign) * Math.abs(rawRate(t)) / (slowPeak * 2);  // a fast push reads twice a slow one
    if (isCoil) { const kx = (t: number) => pos(t) - a * .5; const X0 = kx(0);
      for (let i = 0; i < 3; i++) props.push({id: `C2-${i}`, type: 'rect', x: X0 - i * 14 * k, y: cyy - b * .7, w: a * .5, h: b * 1.4, style: {stroke: 'cool', width: 4 * k}, layer: 2, keys: {x: keysOf(dur, t => kx(t) - i * 14 * k)}} as Prop);
      label(X0, cyy - b * .7 - 16 * k, 'C2: steady current', 'cool', 24, {keys: {x: keysOf(dur, kx)}}); anchors.source = [X0, cyy];
    } else {
      magnet(pos, cyy, mw, mh, pole);
    }
    coil(coilX, cyy, a, b); anchors.coil = [coilX, cyy];
    const mov: [number, number] = [t0, t0 + span], ax = coilX + a + 40 * k, A = b * .55;
    if (sign) {
      // near half of the coil: seen from the source, anticlockwise is upward on the near side
      const up = sign > 0; arrow([ax, cyy + (up ? A : -A)], [ax, cyy + (up ? -A : A)], 'good', 6, {show: mov}); label(ax + 62 * k, cyy + 9 * k, 'I', 'good', 30, {show: mov});
      label(coilX - a - 40 * k, cyy - b - 22 * k, `this face: ${sign > 0 ? 'N' : 'S'}`, 'good', 26, {show: mov});
      label(coilX + 10 * k, cyy + b + 40 * k, sign > 0 ? 'anticlockwise, seen from the left' : 'clockwise, seen from the left', 'good', 24, {show: mov});
    }
    if (s.work && sign && !isCoil) {   // the hand's force and the coil's force on the magnet, equal at steady speed
      const dir = end > start ? 1 : -1, L = bw * .09, mx = (t: number) => pos(t) - mw / 2, upY = cyy - mh / 2 - 26 * k, dnY = cyy + mh / 2 + 26 * k;
      const push = (y: number, d: number, colour: string, id: string) => props.push({id, type: 'arrow', x1: mx(0), y1: y, x2: mx(0) + d * L, y2: y, head: 15 * k, style: {stroke: colour, width: 6 * k}, layer: 4, show: mov, keys: {x1: keysOf(dur, mx), x2: keysOf(dur, t => mx(t) + d * L)}} as Prop);
      push(upY, dir, 'good', 'push'); label(mx(0), upY - 18 * k, 'your force: you do work', 'good', 24, {show: mov, keys: {x: keysOf(dur, mx)}});
      push(dnY, -dir, 'bad', 'oppose'); label(mx(0), dnY + 36 * k, sign === (dir > 0 ? 1 : -1) ? 'the coil repels' : 'the coil attracts', 'bad', 24, {show: mov, keys: {x: keysOf(dur, mx)}});
      label(coilX + 10 * k, cyy + b + 80 * k, 'that work becomes Joule heat', 'bad', 24, {show: [t0 + .5, 1e9]}); anchors.push = [mx(dur), upY]; anchors.heat = [coilX + 10 * k, cyy + b + 80 * k];
    }
    dial([bx + bw * .3, by + bh * .92], S * .13, rate);
    facts.push(`Φ grows as the source comes closer: ${motion}, ${pole} pole`);
    story = motion === 'still' ? 'Nothing moves, nothing changes: no current, however strong the magnet' : `The flux through the coil is ${motion === 'toward' ? 'growing' : 'falling'}: the current's own field opposes that`;
    second = motion === 'still' ? 'The deflection lasts only as long as the flux changes' : `${fast ? 'Faster: a larger deflection' : 'Move it faster and the deflection is larger'}. It stops the moment the motion stops`;
  } else if (s.show === 'key') {
    const iron = !!s.iron, gain = iron ? 1 : .35, press = 2, rel = 7, tmax = 10; dur = tmax;
    const I = (t: number) => (t < press ? 0 : 1 - Math.exp(-(t - press) * 6)) * (t < rel ? 1 : Math.exp(-(t - rel) * 6));
    const rate = (t: number) => (t < press ? 0 : t < rel ? Math.exp(-(t - press) * 6) : -Math.exp(-(t - rel) * 6)) * gain;
    const yy = cy - bh * .14, a = S * .045, b = S * .15, x1 = bx + bw * .16, x2 = bx + bw * .42;
    coil(x1, yy, a, b, 3, 'accent'); coil(x2, yy, a, b, 3, 'cool'); label(x1, yy - b - 18 * k, 'C1, to G', 'accent', 24); label(x2, yy - b - 18 * k, 'C2, with key', 'cool', 24);
    if (iron) { rect(x1 - a * 1.8, yy - S * .018, x2 - x1 + a * 3.6, S * .036, 'muted', {layer: 1}); label((x1 + x2) / 2, yy + S * .075, 'iron rod', 'muted', 22); }
    dial([x1 + bw * .08, by + bh * .94], S * .12, rate); anchors.coil = [x1, yy]; anchors.c2 = [x2, yy];
    label(x2 + 10 * k, by + bh * .84, 'key pressed', 'good', 24, {show: [press, rel]}); label(x2 + 10 * k, by + bh * .84, 'key released', 'bad', 24, {show: [rel, 1e9]});
    const gx = bx + bw * .6, gw = bw * .36;
    strip(gx, cy - bh * .18, gw, bh * .16, 'I in C2', tmax, I, 1, 'cool'); strip(gx, cy + bh * .24, gw, bh * .2, 'deflection', tmax, rate, 1, 'bad');
    anchors.press = [gx + gw * press / tmax, cy + bh * .24]; anchors.release = [gx + gw * rel / tmax, cy + bh * .24];
    story = 'A kick when the key is pressed, nothing while it is held, the opposite kick when it is released';
    second = iron ? 'An iron rod through the coils makes the deflection far larger. Nothing here moves: only the current changes' : 'Nothing moves: only the current changes. A steady current induces nothing';
  } else if (s.show === 'flux') {
    const B = s.B ?? .5, A = s.A ?? .02, th = s.angle ?? 0, sweep = !!s.sweep, L = S * .5, c0: P2 = [bx + bw * .46, cy]; dur = sweep ? 10 : 8;
    const ang = (t: number) => (sweep ? Math.min(90, 90 * Math.max(0, (t - 2) / 6)) : th) * RAD;
    const rows = 11, gap = S * .075, x0 = bx + bw * .04, x1 = bx + bw * .9;
    for (let i = 0; i < rows; i++) {
      const y = cy + (i - (rows - 1) / 2) * gap, off = Math.abs(y - cy) / (L / 2), lost = off >= 1 ? -1 : Math.acos(off) / RAD;   // angle past which the plate no longer catches this line
      const always = off < 1 && !sweep && Math.abs(Math.cos(th * RAD)) > off, tOut = sweep && off < 1 ? 2 + 6 * lost / 90 : 0;
      if (sweep && off < 1) { arrow([x0, y], [x1, y], 'accent', 4, {show: [0, tOut]}); arrow([x0, y], [x1, y], 'faint', 2.5, {show: [tOut, 1e9]}); }
      else arrow([x0, y], [x1, y], always ? 'accent' : 'faint', always ? 4 : 2.5);
    }
    label(x1 + 30 * k, cy - (rows - 1) / 2 * gap + 8 * k, 'B', 'muted', 30);
    const ex = (t: number) => (L / 2) * Math.sin(ang(t)), ey = (t: number) => (L / 2) * Math.cos(ang(t)), nx = (t: number) => S * .26 * Math.cos(ang(t)), ny = (t: number) => S * .26 * Math.sin(ang(t));
    const anim = (kk: Record<string, (t: number) => number>) => sweep ? {keys: Object.fromEntries(Object.entries(kk).map(([q, f]) => [q, keysOf(dur, f)]))} : {};
    props.push({id: 'plate', type: 'line', x1: c0[0] - ex(0), y1: c0[1] - ey(0), x2: c0[0] + ex(0), y2: c0[1] + ey(0), style: {stroke: 'ink', width: 10 * k}, layer: 3, ...anim({x1: t => c0[0] - ex(t), y1: t => c0[1] - ey(t), x2: t => c0[0] + ex(t), y2: t => c0[1] + ey(t)})} as Prop);
    props.push({id: 'normal', type: 'arrow', x1: c0[0], y1: c0[1], x2: c0[0] + nx(0), y2: c0[1] - ny(0), head: 16 * k, style: {stroke: 'good', width: 6 * k}, layer: 4, ...anim({x2: t => c0[0] + nx(t), y2: t => c0[1] - ny(t)})} as Prop);
    label(c0[0] + nx(0) + 26 * k, c0[1] - ny(0) - 8 * k, 'A', 'good', 30, sweep ? {show: [0, 1.5]} : {});
    if (!sweep) { label(bx + bw * .12, by + bh * .06, `θ = ${th}°`, 'ink', 28); }
    anchors.plate = c0; anchors.normal = [c0[0] + nx(0), c0[1] - ny(0)];
    if (!sweep) facts.push(`Φ = BA cos θ = ${two(fluxOf(B, A, th), 'Wb')}`, `B = ${two(B, 'T')}, A = ${two(A, 'm²')}, θ = ${th}°`);
    story = sweep ? 'Turn the plate edge-on and fewer lines pass through it, until none do' : th === 90 ? 'Edge-on: no lines pass through, and Φ = 0' : th > 90 ? 'The lines pass through from the other side: Φ is negative' : th === 0 ? 'Face-on: the most lines pass through' : 'Φ = BA cos θ, and θ is measured from the area vector A, not from the plate';
    second = 'Flux is a scalar: it can be positive, negative or zero. Unit: the weber, 1 Wb = 1 T m²';
  } else if (s.show === 'faraday') {
    const f = faradayOf({B: s.B ?? .1, B2: s.B2 ?? 0, A: s.A ?? .01, angle: s.angle ?? 45, angle2: s.angle2, dt: s.dt ?? .7, N: s.N, R: s.R ?? .5}), tmax = 8, t0 = 2, t1 = 6; dur = tmax;
    const big = Math.max(Math.abs(f.p0), Math.abs(f.p1)) || 1, phi = (t: number) => t <= t0 ? f.p0 : t >= t1 ? f.p1 : f.p0 + (f.p1 - f.p0) * (t - t0) / (t1 - t0);
    const emf = (t: number) => t > t0 && t < t1 ? -Math.sign(f.p1 - f.p0) : 0, gx = bx + bw * .08, gw = bw * .82;
    strip(gx, cy - bh * .2, gw, bh * .2, 'Φ', tmax, phi, big, 'cool'); strip(gx, cy + bh * .26, gw, bh * .18, 'ε', tmax, emf, 1, 'bad');
    label(gx + gw * (t0 + t1) / 2 / tmax, cy + bh * .26 + (f.p1 > f.p0 ? 44 * k : -bh * .22), `Δt = ${two(s.dt ?? .7, 's')}`, 'muted', 24);
    anchors.flux = [gx + gw * t0 / tmax, cy - bh * .2]; anchors.emf = [gx + gw * (t0 + t1) / 2 / tmax, cy + bh * .26 - bh * .18 * emf(4)];
    facts.push(`|ΔΦ| = ${two(Math.abs(f.p1 - f.p0), 'Wb')} in ${two(s.dt ?? .7, 's')}`, `ε = N|ΔΦ|/Δt = ${two(f.emf, 'V')}`, ...(f.I !== undefined ? [`I = ε/R = ${two(f.I, 'A')}`] : []));
    story = 'ε = −N dΦ/dt: the emf depends on how fast the flux changes, not on how large it is';
    second = 'While Φ is steady, even at a large value, there is no emf. N turns give N times the emf';
  } else if (s.show === 'region') {
    const move = s.move ?? 'out', field = s.field ?? 'into', sense = regionSense(field, move), edge = bx + bw * .46, top = by + bh * .12, h = bh * .76, lw = bw * .26, lh = bh * .34, ly = cy - lh / 2, in0 = edge - lw - bw * .12, out0 = edge + bw * .1; dur = 9;
    rect(bx, top, edge - bx, h, 'paper', {layer: 1}, 'faint');
    for (let i = 0; i < 6; i++) for (let j = 0; j < 7; j++) label(bx + (i + .5) * (edge - bx) / 6, top + (j + .5) * h / 7 + 8 * k, field === 'into' ? '×' : '•', 'muted', 28, {layer: 1});
    label(bx + 60 * k, top - 14 * k, 'B', 'muted', 28);
    const a0 = move === 'out' ? in0 : out0, a1 = move === 'out' ? out0 : in0, t0 = 1.5, t1 = 7.5, X = (t: number) => a0 + (a1 - a0) * Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
    const shape = s.shape ?? 'rectangle', outline = loopOutline(shape);
    if (shape === 'rectangle') props.push({id: 'loop', type: 'rect', x: X(0), y: ly, w: lw, h: lh, style: {stroke: 'ink', width: 6 * k}, layer: 3, keys: {x: keysOf(dur, X)}} as Prop);
    else outline.forEach((p, i) => { const q = outline[(i + 1) % outline.length]; line([X(0) + p[0] * lw, ly + p[1] * lh], [X(0) + q[0] * lw, ly + q[1] * lh], 'ink', 6, {layer: 3, keys: {x1: keysOf(dur, t => X(t) + p[0] * lw), x2: keysOf(dur, t => X(t) + q[0] * lw)}}); });
    const tA = t0 + (t1 - t0) * (move === 'out' ? (edge - lw - a0) / (a1 - a0) : (edge - a0) / (a1 - a0)), tB = t0 + (t1 - t0) * (move === 'out' ? (edge - a0) / (a1 - a0) : (edge - lw - a0) / (a1 - a0));
    const win: [number, number] = [tA, tB], midX = (t: number) => X(t) + lw / 2, topA = sense > 0 ? -1 : 1;              // anticlockwise: the top side runs leftward
    props.push({id: 'current', type: 'arrow', x1: midX(0) - topA * 50 * k, y1: ly - 26 * k, x2: midX(0) + topA * 50 * k, y2: ly - 26 * k, head: 15 * k, style: {stroke: 'good', width: 6 * k}, layer: 4, show: win, keys: {x1: keysOf(dur, t => midX(t) - topA * 50 * k), x2: keysOf(dur, t => midX(t) + topA * 50 * k)}} as Prop);
    label(midX(0), ly + lh + 44 * k, sense > 0 ? 'I anticlockwise' : 'I clockwise', 'good', 28, {show: win, keys: {x: keysOf(dur, midX)}});
    label(midX(0), ly - 58 * k, 'no current: Φ steady', 'muted', 24, {show: [0, tA], keys: {x: keysOf(dur, midX)}}); label(midX(0), ly - 58 * k, 'no current: Φ steady', 'muted', 24, {show: [tB, 1e9], keys: {x: keysOf(dur, midX)}});
    anchors.loop = [midX(0), cy]; anchors.edge = [edge, cy];
    if (s.curve) {   // ε at steady speed follows how much of the loop the edge cuts
      const uAt = (t: number) => (edge - X(t)) / lw, emf = (t: number) => { const u = uAt(t); return u <= 0 || u >= 1 ? 0 : chordAt(outline, u); };
      strip(edge + bw * .1, by + bh * .86, bw * .36, bh * .12, 'ε', dur, emf, 1, 'bad'); anchors.curve = [edge + bw * .28, by + bh * .86];
    }
    story = `The flux through the loop is ${move === 'out' ? 'falling' : 'growing'}: the current's field ${move === 'out' ? 'keeps it up, along B' : 'holds it down, against B'}`;
    second = s.curve ? (shape === 'rectangle' ? 'The edge cuts the same width all the way: ε stays constant while the loop crosses' : "The edge cuts a changing width: ε changes as the loop crosses") : 'Current flows only while part of the loop is outside: fully in or fully out, the flux is steady';
  } else if (s.show === 'motional') {
    const B = s.B ?? .5, l = s.l ?? .5, v = s.v ?? 2, R = s.R ?? 1, m = motionalOf(B, l, v, R), lor = !!s.lorentz; dur = 9;
    const x0 = bx + bw * .08, x1 = bx + bw * .9, top = cy - S * .25, bot = cy + S * .25, vmax = 4, speed = bw * .06 * v, start = x1 - bw * .06, xr = (t: number) => start - speed * Math.min(1, Math.max(0, (t - 1.5) / 6.5));
    const sh = (fn: (t: number) => number) => ({keys: {x: keysOf(dur, fn)}});
    for (let i = 0; i < 8; i++) for (let j = 0; j < 5; j++) label(x0 + (i + .5) * (x1 - x0) / 8, top - S * .08 + (j + .5) * (bot - top + S * .16) / 5 + 8 * k, '×', 'faint', 26, {layer: 1});
    label(x1 + 24 * k, top - S * .06, 'B', 'muted', 28);
    props.push({id: 'area', type: 'rect', x: x0, y: top, w: xr(0) - x0, h: bot - top, style: {fill: 'cool', opacity: .18}, layer: 1, keys: {w: keysOf(dur, t => xr(t) - x0)}} as Prop);
    line([x0, top], [x1, top], 'ink', 5); line([x0, bot], [x1, bot], 'ink', 5);
    const rm = (top + bot) / 2; line([x0, top], [x0, rm - 44 * k], 'ink', 5); line([x0, rm + 44 * k], [x0, bot], 'ink', 5);
    rect(x0 - 16 * k, rm - 44 * k, 32 * k, 88 * k, 'paper'); label(x0 - 44 * k, rm + 9 * k, 'R', 'ink', 28);
    props.push({id: 'rod', type: 'line', x1: xr(0), y1: top - 18 * k, x2: xr(0), y2: bot + 18 * k, style: {stroke: 'accent', width: 10 * k}, layer: 3, keys: {x1: keysOf(dur, xr), x2: keysOf(dur, xr)}} as Prop);
    label(xr(0), top - 28 * k, 'P', 'accent', 28, sh(xr)); label(xr(0), bot + 50 * k, 'Q', 'accent', 28, sh(xr));
    const va = S * .3 * v / vmax, vy = top + (bot - top) * .3;
    props.push({id: 'v', type: 'arrow', x1: xr(0), y1: vy, x2: xr(0) - va, y2: vy, head: 16 * k, style: {stroke: 'good', width: 6 * k}, layer: 4, keys: {x1: keysOf(dur, xr), x2: keysOf(dur, t => xr(t) - va)}} as Prop);
    label(xr(0) - va - 22 * k, vy + 9 * k, 'v', 'good', 30, sh(t => xr(t) - va - 22 * k));
    anchors.vbase = [xr(0), vy]; anchors.vtip = [xr(0) - va, vy]; anchors.rod = [xr(0), rm]; anchors.top = [xr(0), top]; anchors.bottom = [xr(0), bot]; anchors.area = [(x0 + xr(0)) / 2, rm];
    if (lor) {
      const charge = (t: number) => top + (bot - top) * (((t * .35) % 1 + 1) % 1), fy = rm + (bot - top) * .1;
      props.push({id: 'q', type: 'circle', x: xr(0), y: charge(0), r: 12 * k, style: {fill: 'bad', stroke: 'ink', width: 2 * k}, layer: 5, keys: {x: keysOf(dur, xr), y: keysOf(dur, charge)}} as Prop);
      props.push({id: 'qF', type: 'arrow', x1: xr(0) + 34 * k, y1: fy - 44 * k, x2: xr(0) + 34 * k, y2: fy + 44 * k, head: 15 * k, style: {stroke: 'bad', width: 5 * k}, layer: 4, keys: {x1: keysOf(dur, t => xr(t) + 34 * k), x2: keysOf(dur, t => xr(t) + 34 * k)}} as Prop);
      label(xr(0) + 92 * k, fy + 9 * k, 'qvB', 'bad', 26, sh(t => xr(t) + 92 * k));
      story = 'Each positive charge rides with the rod at v, so B pushes it along the rod, toward Q: ε = W/q = Blv';
      second = 'The same force on every charge, wherever it is in the rod. The result matches Faraday\'s law';
    } else {
      const iy = bot - (bot - top) * .22, fa = S * .16;
      props.push({id: 'I', type: 'arrow', x1: xr(0) + 30 * k, y1: rm - 60 * k, x2: xr(0) + 30 * k, y2: rm + 60 * k, head: 15 * k, style: {stroke: 'cool', width: 6 * k}, layer: 4, show: [1.5, 1e9], keys: {x1: keysOf(dur, t => xr(t) + 30 * k), x2: keysOf(dur, t => xr(t) + 30 * k)}} as Prop);
      label(xr(0) + 60 * k, rm + 9 * k, 'I', 'cool', 30, {show: [1.5, 1e9], ...sh(t => xr(t) + 60 * k)});
      props.push({id: 'F', type: 'arrow', x1: xr(0), y1: iy, x2: xr(0) + fa, y2: iy, head: 16 * k, style: {stroke: 'bad', width: 6 * k}, layer: 4, show: [3, 1e9], keys: {x1: keysOf(dur, xr), x2: keysOf(dur, t => xr(t) + fa)}} as Prop);
      label(xr(0) + fa + 24 * k, iy + 9 * k, 'F', 'bad', 30, {show: [3, 1e9], ...sh(t => xr(t) + fa + 24 * k)});
      facts.push(`ε = Blv = ${two(m.e, 'V')}`, `I = ε/R = ${two(m.I, 'A')}`, `F = BIl = ${two(m.F, 'N')}; Fv = I²R = ${two(m.P, 'W')}`);
      story = 'The loop\'s area shrinks as the rod moves, so the flux Blx falls: ε = Blv, and the current runs from P to Q';
      second = 'The current puts a force on the rod that opposes the motion: you must do work to keep it moving';
    }
  } else if (s.show === 'spin') {
    const B = s.B ?? 1, l = s.l ?? 1, nu = s.nu ?? 50, sp = s.spokes ?? 1, e = spinOf(B, l, nu), c0: P2 = [bx + bw * .42, cy], R = S * .4, turn = .16; dur = 10;
    ring(c0, R, R, 'ink', 5);
    for (let i = 0; i < 9; i++) for (let j = 0; j < 7; j++) label(bx + (i + .5) * bw * .84 / 9, by + (j + .5) * bh / 7 + 8 * k, '×', 'faint', 24, {layer: 1});
    label(bx + bw * .86, by + bh * .06, 'B', 'muted', 28);
    for (let i = 0; i < sp; i++) { const a = (t: number) => 2 * Math.PI * (turn * t + i / sp), hx = (t: number) => c0[0] + R * Math.cos(a(t)), hy = (t: number) => c0[1] - R * Math.sin(a(t));
      props.push({id: `rod${i}`, type: 'line', x1: c0[0], y1: c0[1], x2: hx(0), y2: hy(0), style: {stroke: 'accent', width: 8 * k}, layer: 3, keys: {x2: keysOf(dur, hx), y2: keysOf(dur, hy)}} as Prop); if (i === 0) anchors.rim = [hx(0), hy(0)]; }
    dot(c0[0], c0[1], 12, 'good'); label(c0[0] + 34 * k, c0[1] - 22 * k, '+', 'good', 38); label(c0[0] + R + 34 * k, c0[1] + 10 * k, '−', 'cool', 42);
    anchors.centre = c0;
    facts.push(`ε = ½Bωl² = ${sig(e, 'V', 3)}`, `B = ${two(B, 'T')}, l = ${two(l, 'm')}, ν = ${two(nu, 'rev/s')}`, ...(sp > 1 ? [`${sp} spokes: still ${sig(e, 'V', 3)}: they are in parallel`] : []));
    story = 'Each piece of the rod moves at v = ωr, and the rim moves fastest: ε = ½Bωl²';
    second = (sp > 1 ? 'The spokes are in parallel: more of them do not raise the emf. ' : '') + 'Electrons are driven to the outer end, leaving the centre positive. Shown slowed down';
  } else if (s.show === 'mutual') {
    const concentric = s.coils === 'concentric', from = s.from ?? 2, n1 = s.n1 ?? 1000, n2 = s.n2 ?? 500, r1 = s.r1 ?? (concentric ? .01 : .02), r2 = s.r2 ?? (concentric ? .2 : .04), len = s.l ?? .5;
    const M = s.M ?? (concentric ? concentricM(r1, r2) : solenoidM(n1, n2, r1, len)), dI = s.I ?? 1, dt = s.dt ?? .5, emf = M * dI / dt, tmax = 9, t0 = 2, t1 = 6; dur = tmax;
    const pic = bw * .46, X = bx + pic * .1, W2 = pic * .84, yy = cy;
    if (concentric) {
      const c0: P2 = [bx + pic * .52, cy]; ring(c0, S * .28, S * .28, 'cool', 6); ring(c0, S * .06, S * .06, 'accent', 6); label(c0[0], c0[1] - S * .28 - 16 * k, 'large coil r₂', 'cool', 24); label(c0[0], c0[1] + S * .06 + 34 * k, 'small coil r₁', 'accent', 24); dot(c0[0], c0[1], 5, 'muted'); anchors.inner = c0;
      story = 'The large coil\'s field at its centre is nearly uniform across the small coil: M = μ₀πr₁²/2r₂';
    } else {
      const ho = S * .3, hi = S * .15, wi = (h: number, col: string) => { for (let i = 0; i < 13; i++) { const x = X + W2 * (i + .5) / 13; label(x, yy - h + 8 * k, '×', col, 22); label(x, yy + h + 8 * k, '•', col, 22); } };
      wi(ho, 'cool'); wi(hi, 'accent'); label(X - 34 * k, yy - ho + 8 * k, 'S₂', 'cool', 26); label(X - 34 * k, yy - hi + 8 * k, 'S₁', 'accent', 26);
      const fh = from === 2 ? ho : hi, rows = from === 2 ? [-.75, -.4, 0, .4, .75] : [-.6, 0, .6];
      rows.forEach(f => arrow([X + 10 * k, yy + f * fh], [X + W2 - 10 * k, yy + f * fh], 'good', 3, {show: [t0, 1e9]})); label(X + W2 + 26 * k, yy + 8 * k, 'B', 'good', 26, {show: [t0, 1e9]});
      props.push({id: 'core', type: 'rect', x: X, y: yy - hi, w: W2, h: 2 * hi, style: {fill: 'accent', opacity: .12}, layer: 1} as Prop);
      anchors.inner = [X + W2 / 2, yy]; anchors.outer = [X + W2 / 2, yy - ho];
      story = from === 2 ? 'S₂\'s field fills S₁, but only the area πr₁² of S₁ carries flux: M = μ₀n₁n₂πr₁²l' : 'S₁\'s field stays inside S₁, so again only πr₁² counts: the same M. M₁₂ = M₂₁';
    }
    const gx = bx + pic + bw * .06, gw = bw * .42, I = (t: number) => Math.min(1, Math.max(0, (t - t0) / (t1 - t0))), em = (t: number) => t > t0 && t < t1 ? -1 : 0;
    strip(gx, cy - bh * .14, gw, bh * .22, concentric || from === 2 ? 'I₂' : 'I₁', tmax, I, 1, 'cool'); strip(gx, cy + bh * .28, gw, bh * .16, concentric || from === 2 ? 'ε₁' : 'ε₂', tmax, em, 1, 'bad');
    facts.push(`M = ${two(M, 'H')}`, `ε = M dI/dt = ${two(emf, 'V')} for ${two(dI, 'A')} in ${two(dt, 's')}`, `Change in flux linkage M ΔI = ${two(M * dI, 'Wb')}`);
    second = 'An emf appears only while the current changes. M depends on the coils\' geometry, separation and orientation';
  } else if (s.show === 'self') {
    const L = s.L ?? (s.n ? selfL(s.n, s.A ?? 1e-3, s.l ?? .5, s.mur) : .5), Im = s.I ?? 2, dt = s.dt ?? 1, tmax = 10, a = 1.5, b = 4, c0 = 6, d = 8.5; dur = tmax;
    const I = (t: number) => t < a ? 0 : t < b ? (t - a) / (b - a) : t < c0 ? 1 : t < d ? 1 - (t - c0) / (d - c0) : 0, e = (t: number) => t > a && t < b ? -1 : t > c0 && t < d ? 1 : 0;
    const gx = bx + bw * .1, gw = bw * .52;
    strip(gx, cy - bh * .14, gw, bh * .24, 'I', tmax, I, 1, 'cool'); strip(gx, cy + bh * .28, gw, bh * .16, 'ε', tmax, e, 1, 'bad');
    label(gx + gw * (a + b) / 2 / tmax, cy + bh * .28 + 40 * k, 'opposes the rise', 'bad', 22); label(gx + gw * (c0 + d) / 2 / tmax, cy + bh * .28 - bh * .16 - 12 * k, 'opposes the fall', 'bad', 22);
    const barx = bx + bw * .78, barw = bw * .13, base = cy + bh * .32, barh = bh * .55, U = (t: number) => I(t) ** 2;
    line([barx - 16 * k, base], [barx + barw + 16 * k, base], 'ink', 3); label(barx + barw / 2, base + 38 * k, 'U = ½LI²', 'good', 24);
    props.push({id: 'U', type: 'rect', x: barx, y: base, w: barw, h: 0, style: {fill: 'good'}, layer: 2, keys: {y: keysOf(dur, t => base - barh * U(t)), h: keysOf(dur, t => barh * U(t))}} as Prop);
    anchors.U = [barx + barw / 2, base - barh]; anchors.Ubase = [barx + barw / 2, base]; anchors.current = [gx + gw * b / tmax, cy - bh * .38];
    facts.push(`L = ${two(L, 'H')}`, `Back emf = L dI/dt = ${two(L * Im / dt, 'V')} for ${two(Im, 'A')} in ${two(dt, 's')}`, `U = ½LI² = ${two(.5 * L * Im * Im, 'J')} at ${two(Im, 'A')}`);
    story = 'The back emf opposes any change in the current, rise or fall. L acts as electrical inertia, as mass does for motion';
    second = 'While the current is steady there is no back emf. The energy ½LI² goes in as it rises, and comes back as it falls, like ½mv²';
  } else if (s.show === 'generator') {
    const N = s.N ?? 100, B = s.B ?? .01, A = s.A ?? .1, nu = s.nu ?? .5, e0 = peakEmf(N, B, A, nu), fixed = s.angle, turns = 2, spinT = 11, start = .5; dur = fixed !== undefined ? 8 : 12;
    const th = (t: number) => fixed !== undefined ? fixed * RAD : 2 * Math.PI * turns * Math.max(0, t - start) / spinT, U = Math.min(S, bw * .58), c0: P2 = [bx + bw * .25, cy - bh * .02], R = U * .21;
    rect(c0[0] - U * .4, c0[1] - U * .2, U * .1, U * .4, 'bad'); rect(c0[0] + U * .3, c0[1] - U * .2, U * .1, U * .4, 'cool'); label(c0[0] - U * .35, c0[1] + 10 * k, 'N', 'paper', 30); label(c0[0] + U * .35, c0[1] + 10 * k, 'S', 'paper', 30);
    [-.14, 0, .14].forEach(f => arrow([c0[0] - U * .29, c0[1] + S * f], [c0[0] + U * .29, c0[1] + S * f], 'faint', 2.5));
    const ax = (t: number) => -Math.sin(th(t)) * R, ay = (t: number) => Math.cos(th(t)) * R;                    // side A, at 90° ahead of the area vector
    const kk = fixed === undefined;
    props.push({id: 'coil', type: 'line', x1: c0[0] + ax(0), y1: c0[1] - ay(0), x2: c0[0] - ax(0), y2: c0[1] + ay(0), style: {stroke: 'ink', width: 7 * k}, layer: 3, ...(kk ? {keys: {x1: keysOf(dur, t => c0[0] + ax(t)), y1: keysOf(dur, t => c0[1] - ay(t)), x2: keysOf(dur, t => c0[0] - ax(t)), y2: keysOf(dur, t => c0[1] + ay(t))}} : {})} as Prop);
    const nl = R * .85; props.push({id: 'area', type: 'arrow', x1: c0[0], y1: c0[1], x2: c0[0] + nl * Math.cos(th(0)), y2: c0[1] - nl * Math.sin(th(0)), head: 15 * k, style: {stroke: 'good', width: 5 * k}, layer: 4, ...(kk ? {keys: {x2: keysOf(dur, t => c0[0] + nl * Math.cos(th(t))), y2: keysOf(dur, t => c0[1] - nl * Math.sin(th(t)))}} : {})} as Prop);
    dot(c0[0], c0[1], 6, 'ink');
    const windows: [number, number, number][] = [];   // [from, to, sign of sin θ]
    if (kk) { const half = spinT / (2 * turns); for (let i = 0; i < 2 * turns + 1; i++) windows.push([i ? start + half * i : 0, i === 2 * turns ? 1e9 : start + half * (i + 1), i % 2 ? -1 : 1]); } else windows.push([0, 1e9, Math.sin(th(0)) >= 0 ? 1 : -1]);
    const quiet = kk ? false : Math.abs(Math.sin(th(0))) < .05;
    if (!quiet) for (const [w0, w1, sg] of windows) for (const side of [1, -1]) {     // side A: current out of the page while sin θ > 0
      const X = (t: number) => c0[0] + side * ax(t), Y = (t: number) => c0[1] - side * ay(t) + 10 * k, out = side * sg > 0;
      label(X(0), Y(0), out ? '•' : '×', out ? 'good' : 'bad', 40, {show: [w0, w1], layer: 5, ...(kk ? {keys: {x: keysOf(dur, X), y: keysOf(dur, Y)}} : {})});
    }
    const gx = bx + bw * .54, gw = bw * .42, gy = cy, gh = bh * .3, deg = (t: number) => th(t) / RAD, maxDeg = 720, X = (d: number) => gx + gw * d / maxDeg, Ye = (d: number) => gy - gh * Math.sin(d * RAD), Yf = (d: number) => gy - gh * Math.cos(d * RAD);
    line([gx, gy], [gx + gw, gy], 'ink', 3); line([gx, gy - gh * 1.1], [gx, gy + gh * 1.1], 'ink', 3); label(gx + gw + 16 * k, gy + 34 * k, 'θ', 'muted', 26); label(gx + 34 * k, gy - gh * 1.14, 'ε', 'bad', 28); label(gx + 90 * k, gy - gh * 1.14, 'Φ', 'cool', 28);
    for (const d of [180, 360, 540, 720]) label(X(d), gy + 36 * k, `${d}°`, 'muted', 20);
    poly(Array.from({length: 145}, (_, i) => [X(i * 5), Yf(i * 5)] as P2), 'cool', 3, {}, true); poly(Array.from({length: 145}, (_, i) => [X(i * 5), Ye(i * 5)] as P2), 'bad', 4);
    const d0 = kk ? 0 : fixed!; props.push({id: 'state', type: 'circle', x: X(d0), y: Ye(d0), r: 12 * k, style: {fill: 'bad', stroke: 'ink', width: 2 * k}, layer: 4, ...(kk ? {keys: {x: keysOf(dur, t => X(deg(t))), y: keysOf(dur, t => Ye(deg(t)))}} : {})} as Prop);
    props.push({id: 'stateF', type: 'circle', x: X(d0), y: Yf(d0), r: 9 * k, style: {fill: 'cool', stroke: 'ink', width: 2 * k}, layer: 4, ...(kk ? {keys: {x: keysOf(dur, t => X(deg(t))), y: keysOf(dur, t => Yf(deg(t)))}} : {})} as Prop);
    anchors.coil = c0; anchors.state = [X(d0), Ye(d0)]; anchors.flux = [X(d0), Yf(d0)]; anchors.zero = [X(d0), gy]; anchors.peak = [X(90), Ye(90)];
    facts.push(`ε₀ = NBAω = ${two(e0, 'V')}`, `N = ${N}, B = ${two(B, 'T')}, A = ${two(A, 'm²')}, ν = ${two(nu, 'Hz')}`, ...(fixed !== undefined ? [`at θ = ${fixed}°: ε = ${two(e0 * Math.sin(fixed * RAD), 'V')}`] : []));
    story = fixed !== undefined && Math.abs(Math.sin(fixed * RAD)) < .05 ? 'The coil is face-on to B: the most flux, but it is not changing, so ε = 0' : fixed !== undefined && Math.abs(Math.cos(fixed * RAD)) < .05 ? 'The coil is edge-on: no flux, but it is changing fastest, so ε is largest' : 'ε = NBAω sin ωt: largest when the flux is zero, zero when the flux is largest';
    second = 'Each half-turn the current reverses in each side: alternating current. In India ν = 50 Hz. Drawn slowed down';
  }
  if (s.show === 'open') {
    const stage = s.stage ?? 'meter', at = OPEN_STAGES.indexOf(stage), motion = s.motion === 'away' ? 'away' : 'toward', pole = s.pole ?? 'N'; dur = 12;
    const side = at === 2, coilX = bx + bw * (side ? .36 : .54), cyy = cy - bh * .14, a = S * .1, b = S * .19, gapD = 24 * RAD, mw = bw * .17, mh = S * .1, near = coilX - a - bw * .03, far = near - bw * .1;
    const f0 = motion === 'toward' ? far : near, f1 = motion === 'toward' ? near : far, front = (t: number) => f0 + (f1 - f0) * t / dur;
    magnet(front, cyy, mw, mh, pole);
    const pt = (f: number): P2 => [coilX + a * Math.cos(f), cyy + b * Math.sin(f)];
    const FAR = Math.PI / 2 + gapD, NEAR = Math.PI / 2 - gapD;
    poly(Array.from({length: 41}, (_, i) => pt(FAR + (3 * Math.PI / 2 - FAR) * i / 40)), 'faint', 4);
    poly(Array.from({length: 41}, (_, i) => pt(-Math.PI / 2 + (NEAR + Math.PI / 2) * i / 40)), 'accent', 5);
    const endF = pt(FAR), endN = pt(NEAR), ty = cyy + b + S * .07, tF: P2 = [endF[0], ty], tN: P2 = [endN[0], ty];
    line(endF, tF, 'accent', 4); line(endN, tN, 'accent', 4); dot(tF[0], tF[1], 7, 'paper'); dot(tN[0], tN[1], 7, 'paper');
    anchors.coil = [coilX, cyy]; anchors.gap = [coilX, ty]; anchors.farEnd = tF; anchors.nearEnd = tN;
    const plus = openPlusEnd(pole, motion), pEnd = plus === 'far' ? tF : tN, mEnd = plus === 'far' ? tN : tF, out = (e: P2) => e[0] < coilX ? -1 : 1;
    anchors.plus = pEnd; anchors.minus = mEnd;
    const fx = (t: number) => 1 - Math.exp(-t / 2.4);   // the charge at the ends, as a fraction of its final amount
    const T0 = .8, N = 5, arrive = (i: number) => T0 + i * 1.5 + 1.4;
    if (at === 0) {
      label(coilX, ty + 44 * k, 'open ends: ε across the gap', 'bad', 26); label(coilX, by + bh * .94, 'no closed path: no continuous current', 'muted', 26);
    } else {
      for (let i = 0; i < N; i++) {
        const start = T0 + i * 1.5, path = (t: number) => { const u = Math.max(0, Math.min(1, (t - start) / 1.4)); return plus === 'far' ? FAR + (2 * Math.PI - 2 * gapD) * (1 - u) : FAR + (2 * Math.PI - 2 * gapD) * u; };
        label(pt(path(0))[0], pt(path(0))[1] + 8 * k, '+', 'bad', 28, {layer: 5, show: [start, start + 1.4], keys: {x: keysOf(dur, t => pt(path(t))[0]), y: keysOf(dur, t => pt(path(t))[1] + 8 * k)}});
        const row = (i % 3), col = Math.floor(i / 3), off = 26 * k + row * 24 * k;
        label(pEnd[0] + out(pEnd) * (off), pEnd[1] + 8 * k - col * 26 * k, '+', 'bad', 30, {show: [arrive(i), 1e9]});
        label(mEnd[0] + out(mEnd) * (off), mEnd[1] + 8 * k - col * 26 * k, '−', 'cool', 34, {show: [arrive(i), 1e9]});
      }
    }
    if (at === 2) {    // the two forces on a charge in the wire, and what follows from them
      const px = bx + bw * .62, pw = bw * .36, wy = by + bh * .2, q: P2 = [px + pw / 2, wy], L = pw * .4, dir = 1;
      line([px, wy], [px + pw, wy], 'accent', 4); label(q[0], wy + 9 * k, '+', 'bad', 34, {layer: 5}); label(px, wy - 72 * k, 'A charge in the wire', 'muted', 24);
      arrow(q, [q[0] + dir * L, wy], 'good', 6, {}); label(q[0] + L * .55, wy - 22 * k, 'induced force', 'good', 22);
      props.push({id: 'Fes', type: 'arrow', x1: q[0], y1: wy + 2 * k, x2: q[0] - dir * L * fx(0), y2: wy + 2 * k, head: 15 * k, style: {stroke: 'cool', width: 6 * k}, layer: 4, keys: {x2: keysOf(dur, t => q[0] - dir * L * fx(t))}} as Prop);
      label(q[0] - L * .55, wy + 40 * k, 'electrostatic force', 'cool', 22);
      strip(px, by + bh * .5, pw, bh * .12, 'I', dur, t => 1 - fx(t), 1, 'good'); strip(px, by + bh * .86, pw, bh * .17, 'V', dur, fx, 1, 'cool');
      anchors.force = q; anchors.current = [px + pw, by + bh * .5]; anchors.voltage = [px + pw, by + bh * .69];
    }
    if (at === 3) {
      const c0: P2 = [coilX, by + bh * .94], r = S * .1; line(tF, [c0[0] - r * 1.1, c0[1]], 'ink', 3); line(tN, [c0[0] + r * 1.1, c0[1]], 'ink', 3); line([c0[0] - r * 1.1, c0[1]], [c0[0] - 10 * k, c0[1]], 'ink', 3); line([c0[0] + r * 1.1, c0[1]], [c0[0] + 10 * k, c0[1]], 'ink', 3);
      dial(c0, r, t => fx(t) * .85, 'V', 'voltmeter'); label(c0[0] + r * 1.3, c0[1] + 8 * k, 'ideal: takes no current', 'muted', 22, {align: 'start'}); label(c0[0] - r * 1.3, c0[1] + 8 * k, 'reads ε', 'bad', 26, {align: 'end', show: [6, 1e9]});
    }
    story = ['A gap in the coil: the emf is still there, across the two ends, but no current can keep flowing', 'The changing flux pushes charge round the wire: it can only pile up at the two ends', 'The piled-up charge pushes back harder and harder: when the forces balance, the current stops and the voltage stays', 'An ideal voltmeter across the gap reads the emf, because no current flows to drop any of it'][at];
    second = 'Drawn much slowed: in a real coil the charge settles almost at once. It holds while the flux keeps changing';
  }
  return finish('induction', s as never, dur, story, second, facts, anchors, s.illustrative);
}
