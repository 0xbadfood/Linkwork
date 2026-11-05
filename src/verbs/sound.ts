// sound: ICSE Class 10 Sound (Selina Ch. 7, icph1-07; 2026-11-05), computed. Kinds:
//   echo        a sharp sound from a person goes to a wall (cliff, hill) at d and back: t = 2d/v. A time line beside it
//               shows the first sound lasting about 0.1 s in the ear (persistence of hearing): the echo is distinct only
//               when it comes back later, so d ≥ v × 0.1 / 2 (17 m in air at 340 m/s, 70 m in water at 1400 m/s).
//               Any two of d, t, v give the third; `minimum` gives the least distance.
//   sonar       a ship's pulse of ultrasound down to the sea bed (a sunken ship, a submarine, a shoal of fish) and back:
//               depth d = vt/2.
//   vibrations  natural (constant amplitude at the natural frequency), damped (amplitude dying away) and forced (driven
//               at the driver's frequency, small and steady) vibrations of a block on a spring, each with its
//               displacement–time trace drawn by a pen beside it; one, two or all three, one row each.
//   resonance   Barton's pendulums (the book's Fig. 7.9): A swung, B of the same length picks up a large swing (resonance),
//               C shorter and D longer only sway a little (forced vibrations); coupled through the string PQ, simulated.
// Distances in echo and sonar are not to scale (a person beside a 1450 m depth); the sound is slowed to be seen.
import type {Key} from '../keys.ts';
import {toScene, type Plane} from '../plane.ts';
import type {Prop, Scene} from '../scene.ts';
import {textWidth, wrapText} from '../svg.ts';
import type {Vec} from '../vec.ts';
import {panel, scene} from './calculus.ts';
import {frame} from './vectors.ts';

export const SOUND_KINDS = ['echo', 'sonar', 'vibrations', 'resonance'] as const;
export const VIBRATION_TYPES = ['natural', 'damped', 'forced'] as const;
const REFLECTORS = ['wall', 'cliff', 'hill', 'building'] as const;
const TARGETS = ['sea_bed', 'sunken_ship', 'submarine', 'fish'] as const;
const MEDIA = ['air', 'water'] as const;
export type SoundSpec = {verb: 'sound'; kind: (typeof SOUND_KINDS)[number];
  /** echo, sonar: distance (depth) d in m, echo time t in s, speed v in m/s; any two give the third (v defaults to the
   * medium's: 340 in air, 1400 in water) */
  d?: number; t?: number; v?: number; medium?: (typeof MEDIA)[number];
  /** echo: the least distance for a distinct echo, from v and the persistence of hearing (default 0.1 s) */
  minimum?: boolean; persistence?: number; reflector?: (typeof REFLECTORS)[number];
  /** sonar: what the pulse reflects from */
  target?: (typeof TARGETS)[number];
  /** vibrations: which, one row each (default all three); the natural frequency and the driver's (Hz) */
  types?: (typeof VIBRATION_TYPES)[number][]; f0?: number; driver?: number;
  /** resonance: length of A and B (m), of the shorter C and the longer D; the classic examples in the panel */
  L?: number; short?: number; long?: number; examples?: boolean;
  seconds?: number; title?: string; illustrative?: boolean; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
/** Three significant figures, as the book gives its answers (0.143 s, 17 m, 1450 m). */
const fm = (v: number) => String(Number(v.toPrecision(3))).replace('-', '−');
const MEDIUM_V = {air: 340, water: 1400} as const;

/** The echo's d, t and v from whichever the spec gives; `solved` is the one computed. */
export function echoSolve(s: SoundSpec) {
  const P = s.persistence ?? 0.1, vm = MEDIUM_V[s.medium ?? (s.kind === 'sonar' ? 'water' : 'air')];
  let d: number, t: number, v: number, solved: 'd' | 't' | 'v';
  if (s.minimum) { v = s.v ?? vm; t = P; d = v * P / 2; solved = 'd'; }
  else if (s.d !== undefined && s.t !== undefined && s.v === undefined) { d = s.d; t = s.t; v = 2 * d / t; solved = 'v'; }
  else if (s.d !== undefined) { d = s.d; v = s.v ?? vm; t = 2 * d / v; solved = 't'; }
  else if (s.t !== undefined) { t = s.t; v = s.v ?? vm; d = v * t / 2; solved = 'd'; }
  else { v = s.v ?? vm; d = s.kind === 'sonar' ? v : 2 * v * P / 2; t = 2 * d / v; solved = 't'; }   // illustrative: an echo twice the least time
  return {d, t, v, P, solved, dmin: v * P / 2, vDefault: s.v === undefined && solved !== 'v'};
}

export function soundErrors(s: SoundSpec): string[] {
  const e: string[] = [], S = 'sound';
  if (!SOUND_KINDS.includes(s.kind)) return [`${S}: kind is one of ${SOUND_KINDS.join(', ')}`];
  for (const n of ['d', 't', 'v', 'f0', 'driver', 'L', 'short', 'long', 'persistence'] as const)
    if (s[n] !== undefined && !(isNum(s[n]) && s[n]! > 0)) e.push(`${S}: ${n} is a number above 0`);
  for (const n of ['minimum', 'examples'] as const) if (s[n] !== undefined && typeof s[n] !== 'boolean') e.push(`${S}: ${n} is true or false`);
  if (s.seconds !== undefined && !(isNum(s.seconds) && s.seconds >= 6 && s.seconds <= 30)) e.push(`${S}: seconds is the scene length, 6 to 30`);
  const echoish = s.kind === 'echo' || s.kind === 'sonar';
  const only = (names: (keyof SoundSpec)[], kinds: string) => { for (const n of names) if (s[n] !== undefined) e.push(`${S}: ${String(n)} is for kind ${kinds}`); };
  if (!echoish) only(['d', 't', 'v', 'medium', 'minimum', 'persistence', 'reflector', 'target'], 'echo or sonar');
  if (s.kind !== 'vibrations') only(['types', 'f0', 'driver'], 'vibrations');
  if (s.kind !== 'resonance') only(['L', 'short', 'long', 'examples'], 'resonance');
  if (s.kind === 'sonar') only(['minimum', 'persistence', 'reflector'], 'echo');
  if (s.kind === 'echo') only(['target'], 'sonar');
  if (echoish) {
    if (s.medium !== undefined && !MEDIA.includes(s.medium)) e.push(`${S}: medium is air or water (it sets the default v: 340 or 1400 m/s)`);
    if (s.reflector !== undefined && !REFLECTORS.includes(s.reflector)) e.push(`${S}: reflector is ${REFLECTORS.join(', ')}`);
    if (s.target !== undefined && !TARGETS.includes(s.target)) e.push(`${S}: target is ${TARGETS.join(', ')}`);
    if (isNum(s.v) && (s.v < 200 || s.v > 6500)) e.push(`${S}: v is the speed of sound, 200 to 6500 m/s (about 340 in air, 1400 to 1500 in sea water); radar's radio waves (3 × 10⁸ m/s) are not sound, no verb draws them yet`);
    if (isNum(s.persistence) && (s.persistence < 0.05 || s.persistence > 0.3)) e.push(`${S}: persistence is the time a sound lasts in the ear, 0.05 to 0.3 s (the book's 0.1 s, the default)`);
    if (isNum(s.t) && s.t > 60) e.push(`${S}: t is the echo time, at most 60 s`);
    if (s.minimum && (s.d !== undefined || s.t !== undefined)) e.push(`${S}: minimum computes d = v × persistence / 2 itself: leave out d and t (give v or medium)`);
    const given = [s.d, s.t, s.v].filter(x => x !== undefined).length;
    if (given === 3 && isNum(s.d) && isNum(s.t) && isNum(s.v) && Math.abs(2 * s.d / s.t - s.v) > 0.01 * s.v)
      e.push(`${S}: 2d / t = ${fm(2 * s.d / s.t)} m/s disagrees with v = ${fm(s.v)} m/s; give any two of d, t and v`);
    if (!s.illustrative && !s.minimum && s.d === undefined && s.t === undefined)
      e.push(`${S}: give d (m) or t (s), with v or the medium's default speed${s.kind === 'echo' ? ', or minimum: true for the least distance for an echo' : ''}; or, when the narration states no numbers, set illustrative: true`);
  }
  if (s.kind === 'vibrations') {
    if (s.types !== undefined && !(Array.isArray(s.types) && s.types.length >= 1 && s.types.length <= 3 && s.types.every(x => VIBRATION_TYPES.includes(x)) && new Set(s.types).size === s.types.length))
      e.push(`${S}: types is 1 to 3 of ${VIBRATION_TYPES.join(', ')}, each once (one row each, top to bottom)`);
    const types = s.types ?? [...VIBRATION_TYPES];
    if (s.driver !== undefined && Array.isArray(types) && !types.includes('forced')) e.push(`${S}: driver is the forced vibration's frequency: add 'forced' to types`);
    if (isNum(s.f0) && isNum(s.driver) && (s.driver / s.f0 < 0.25 || s.driver / s.f0 > 4)) e.push(`${S}: driver is 0.25 to 4 times f0, so both can be drawn on one time axis`);
    if (isNum(s.driver) && s.f0 === undefined) e.push(`${S}: driver needs f0, the natural frequency it is compared with`);
  }
  if (s.kind === 'resonance') {
    const L = s.L ?? 1;
    if (isNum(s.L) && (s.L < 0.1 || s.L > 5)) e.push(`${S}: L is the length of pendulums A and B, 0.1 to 5 m`);
    if (isNum(s.short) && !(s.short < 0.85 * L && s.short >= 0.3 * L)) e.push(`${S}: short is pendulum C, shorter than A and B: 0.3 to 0.85 times L`);
    if (isNum(s.long) && !(s.long > 1.15 * L && s.long <= 2 * L)) e.push(`${S}: long is pendulum D, longer than A and B: 1.15 to 2 times L`);
  }
  return e;
}

export function sound(s: SoundSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080;
  if (s.kind === 'echo' || s.kind === 'sonar') return echoScene(s, W, H, k);
  if (s.kind === 'vibrations') return vibrationsScene(s, W, H, k);
  return resonanceScene(s, W, H, k);
}

// ---------------------------------------------------------------------------------------------------------------
// shared drawing

/** An equal-scale plane fitting the world box [x0, x1] × [y0, y1] into the frame's box, centred. */
function fit(box: [number, number, number, number], x0: number, x1: number, y0: number, y1: number): {plane: Plane; per: number} {
  const bw = box[2] - box[0], bh = box[3] - box[1], per = Math.max((x1 - x0) / bw, (y1 - y0) / bh), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return {plane: {id: 'p', x: [cx - per * bw / 2, cx + per * bw / 2], y: [cy - per * bh / 2, cy + per * bh / 2], box}, per};
}

function kit(props: Prop[], k: number) {
  const line = (id: string, x1: number, y1: number, x2: number, y2: number, stroke = 'muted', width = 3, extra: Record<string, unknown> = {}) =>
    props.push({id, type: 'line', plane: 'p', x1, y1, x2, y2, style: {stroke, width: width * k}, ...extra} as Prop);
  const arrow = (id: string, x1: number, y1: number, x2: number, y2: number, stroke = 'muted', width = 3, extra: Record<string, unknown> = {}) =>
    props.push({id, type: 'arrow', plane: 'p', x1, y1, x2, y2, head: 14 * k, style: {stroke, width: width * k}, ...extra} as Prop);
  const label = (id: string, x: number, y: number, t: string, fill = 'muted', size = 26, align = 'middle', extra: Record<string, unknown> = {}) =>
    props.push({id, type: 'text', plane: 'p', x, y, text: t, size: size * k, weight: 700, align, style: {fill, stroke: 'paper', width: 6 * k}, layer: 4, ...extra} as Prop);
  const rect = (id: string, x: number, y: number, w: number, h: number, fill: string, stroke = 'ink', extra: Record<string, unknown> = {}) =>
    props.push({id, type: 'rect', plane: 'p', x, y, w, h, style: {fill, stroke, width: 2 * k}, ...extra} as Prop);
  const poly = (id: string, points: Vec[], fill: string, stroke = 'ink', extra: Record<string, unknown> = {}) =>
    props.push({id, type: 'polyline', plane: 'p', points, closed: true, style: {fill, stroke, width: 2 * k}, ...extra} as Prop);
  return {line, arrow, label, rect, poly};
}

/** The right panel (or below the drawing, when narrow): lines stacked as they appear. */
function sayer(props: Prop[], W: number, k: number, px: number, row0: number, narrow: boolean) {
  const ptext = panel(W, k), size = (narrow ? 25 : 28) * k;
  let row = row0;
  return (id: string, t: string, when: number, extra: Record<string, unknown> = {}) => {
    props.push(ptext(id, px, row, t, size, {show: [when, 1e9], fade: 0.3, ...extra} as never));
    row += wrapText(t, size, W - px - 40 * k).length * 1.28 * size + 8 * k;
  };
}

const keysOf = (t0: number, t1: number, fn: (t: number) => number, per = 24): Key[] => {
  const n = Math.max(1, Math.ceil((t1 - t0) * per));
  return Array.from({length: n + 1}, (_, i) => { const t = t0 + (t1 - t0) * i / n; return (i ? [t, fn(t), 'linear'] : [t, fn(t)]) as Key; });
};

// ---------------------------------------------------------------------------------------------------------------
// echo and sonar

function echoScene(s: SoundSpec, W: number, H: number, k: number): Scene {
  const sol = echoSolve(s), {d, t, v, P, dmin} = sol, sonar = s.kind === 'sonar', ill = !!s.illustrative;
  const fr = frame(W, H, k, s.title), narrow = W < 1.3 * H, props: Prop[] = [...fr.titles], facts: string[] = [];
  const lead = 0.8, out = 2.2, back = 2.2, gap = 0.32, n = 3;
  let world: [number, number, number, number], anchors: Record<string, Vec> = {};
  // the pulse's way out and back, in world units; bars across it are its wavefronts
  let from: Vec, turn: Vec, to: Vec, across: Vec;
  if (!sonar) { world = [-1.5, 10.1, -3.25, 5.1]; from = [0.4, 1.8]; turn = [7.95, 1.8]; to = [0.4, 1.8]; across = [0, 1]; }
  else {
    const deep = s.target === 'submarine' || s.target === 'fish' || s.target === 'sunken_ship';
    world = [-4.6, 4.6, deep ? -8.1 : -7.0, 2.1]; from = [-0.6, -0.55]; turn = [0, -6]; to = [0.6, -0.55]; across = [1, 0];
  }
  const {plane, per} = fit(fr.box, ...world);
  const K = kit(props, k);
  const te = lead + out + back + (n - 1) * gap / ((Math.hypot(turn[0] - from[0], turn[1] - from[1])) / out);   // the last bar home
  const tHome = lead + out + back;                                                                           // the first bar home: the echo heard

  // wavefronts: n bars, each launched gap behind the last, out to the reflector and back; they widen as they spread
  const speed = Math.hypot(turn[0] - from[0], turn[1] - from[1]) / out;
  for (let i = 0; i < n; i++) {
    const t0 = lead + i * gap / speed, t1 = t0 + out, t2 = t1 + back;
    const leg = (id: string, a: Vec, b: Vec, ta: number, tb: number, h0: number, h1: number, stroke: string) => {
      const at = (q: number) => { const u = (q - ta) / (tb - ta); return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, h0 + (h1 - h0) * u]; };
      const end = (sign: number, c: 0 | 1) => keysOf(ta, tb, q => { const p = at(q); return p[c] + sign * p[2] / 2 * across[c]; }, 12);
      props.push({id, type: 'line', plane: 'p', x1: 0, y1: 0, x2: 0, y2: 0, show: [ta, tb], layer: 2,
        keys: {x1: end(-1, 0), y1: end(-1, 1), x2: end(1, 0), y2: end(1, 1)}, style: {stroke, width: 6 * k, cap: 'round'}} as Prop);
    };
    leg(`out${i}`, from, turn, t0, t1, 0.7, 1.3, 'accent');
    leg(`back${i}`, turn, to, t1, t2, 1.3, 1.9, 'cool');
  }

  const name = s.reflector ?? 'wall';
  if (!sonar) {
    // a person at x = 0, the reflector from x = 8, the ground y = 0; a time line below
    K.line('ground', world[0], 0, world[1], 0, 'muted', 3);
    K.line('legL', 0, 0.95, -0.28, 0, 'ink', 6); K.line('legR', 0, 0.95, 0.28, 0, 'ink', 6); K.line('body', 0, 0.95, 0, 1.55, 'ink', 6);
    K.line('armL', 0, 1.45, -0.32, 1.0, 'ink', 5); K.line('armR', 0, 1.45, 0.3, 1.72, 'ink', 5);
    props.push({id: 'head', type: 'circle', plane: 'p', x: 0, y: 1.82, r: 0.24 / per, style: {fill: 'paper', stroke: 'ink', width: 5 * k}, layer: 1} as Prop);
    const wallTop = name === 'wall' || name === 'building' ? 4.3 : 4.6;
    if (name === 'hill' || name === 'cliff') K.poly('reflector', [[8, 0], [8, wallTop], [8.5, wallTop + 0.15], [9.4, wallTop - 0.2], [9.9, 0]], 'faint');
    else K.rect('reflector', 8, 0, 1.4, wallTop, 'faint');
    K.label('lrefl', 8.7, wallTop + 0.45, name, 'ink', 28);
    // the two ways, named on their arrows
    // a label sits in a gap of its line, which is broken round it (a halo alone left the line showing between words)
    const hw = (t: string, size: number) => textWidth(t, size * k) * per / 2 + 10 * k * per;
    const on = {show: [lead, 1e9], fade: 0.3}, onBack = {show: [lead + out, 1e9], fade: 0.3};
    K.line('aout0', 1.1, 3.25, 4.1 - hw('sound', 26), 3.25, 'accent', 3, on); K.arrow('aout', 4.1 + hw('sound', 26), 3.25, 7.1, 3.25, 'accent', 3, on);
    K.label('lout', 4.1, 3.25, 'sound', 'accent', 26, 'middle', on);
    K.line('aback0', 7.1, 0.55, 4.1 + hw('echo', 26), 0.55, 'cool', 3, onBack); K.arrow('aback', 4.1 - hw('echo', 26), 0.55, 1.1, 0.55, 'cool', 3, onBack);
    K.label('lback', 4.1, 0.55, 'echo', 'cool', 26, 'middle', onBack);
    // d, from the person to the reflector
    const dText = ill ? 'd' : `d = ${fm(d)} m`;
    K.arrow('d1', 4 - hw(dText, 28), -0.6, 0, -0.6, 'ink', 3); K.arrow('d2', 4 + hw(dText, 28), -0.6, 8, -0.6, 'ink', 3);
    K.label('ld', 4, -0.6, dText, 'ink', 28);
    // the time line: the first sound lasting P in the ear, the echo arriving at t
    const yT = -2.15, span = 8, tmax = Math.max(t, P) * 1.3, X = (q: number) => span * q / tmax;
    K.arrow('taxis', 0, yT, span + 0.4, yT, 'muted', 3); K.label('ltime', span + 0.55, yT, 'time', 'muted', 24, 'start');
    K.line('t0', 0, yT - 0.18, 0, yT + 0.18, 'muted', 3);
    K.rect('band', 0, yT, X(P), 0.42, 'accent', 'accent', {style: {fill: 'accent', stroke: 'accent', width: 1 * k, opacity: 0.35}, show: [lead, 1e9], fade: 0.3});
    K.label('lband', 0, yT + 0.75, ill ? 'the first sound lasts in the ear' : `the first sound lasts ${fm(P)} s in the ear`, 'accent', 24, 'start', {show: [lead, 1e9], fade: 0.3});
    K.line('techo', X(t), yT - 0.3, X(t), yT + 0.55, 'cool', 5, {show: [tHome, 1e9], fade: 0.2});
    K.label('lecho', Math.max(X(t), 0.9), yT - 0.62, ill ? 'echo heard' : `echo heard at ${fm(t)} s`, 'cool', 24, 'middle', {show: [tHome, 1e9], fade: 0.2});
    props.push({id: 'clock', type: 'circle', plane: 'p', x: 0, y: yT, r: 10 * k, layer: 3, style: {fill: 'ink', stroke: 'paper', width: 2 * k},
      show: [lead, 1e9], keys: {x: [[lead, 0], [tHome, X(t), 'linear']]}} as Prop);
    anchors = {person: toScene(plane, [0, 1.82]), reflector: toScene(plane, [8.7, wallTop]), echo: toScene(plane, [X(t), yT])};
  } else {
    // the sea from y = 0 down, the ship above it, the pulse down to the target and back
    const tgt = s.target ?? 'sea_bed', bed = tgt === 'sea_bed' ? -6 : tgt === 'sunken_ship' ? -6.8 : -7.4;
    K.rect('sea', world[0], bed, world[1] - world[0], -bed, 'cool', 'cool', {style: {fill: 'cool', stroke: 'cool', width: 1 * k, opacity: 0.16}});
    K.line('surface', world[0], 0, world[1], 0, 'cool', 4);
    K.rect('bed', world[0], world[2] + 0.05, world[1] - world[0], bed - world[2] - 0.05, 'faint', 'muted');
    K.poly('hull', [[-2.4, 0.9], [2.4, 0.9], [1.8, -0.3], [-1.8, -0.3]], 'muted');
    K.rect('cabin', -0.9, 0.9, 1.6, 0.6, 'muted');
    K.rect('tx', -0.85, -0.62, 0.5, 0.32, 'accent'); K.rect('rx', 0.35, -0.62, 0.5, 0.32, 'cool');
    K.label('ltx', -1.0, -0.95, 'transmitter', 'accent', 22, 'end'); K.label('lrx', 1.0, -0.95, 'receiver', 'cool', 22, 'start');
    K.label('lship', -2.55, 1.35, 'ship', 'ink', 26, 'end');
    K.label('lsea', world[0] + 0.15, -2.6, 'sea water', 'cool', 24, 'start');
    // every target's top is at y = −6, where the pulse turns back
    if (tgt === 'sunken_ship') K.poly('wreck', [[-1.5, -6.8], [1.2, -6.8], [1.7, -6.1], [-1.2, -5.95]], 'muted');
    if (tgt === 'submarine') K.rect('sub', -1.6, -6.6, 3.2, 0.6, 'muted', 'ink', {r: 0.3 / per});
    if (tgt === 'fish') for (let i = 0; i < 9; i++) props.push({id: `fish${i}`, type: 'circle', plane: 'p', x: -0.9 + (i % 3) * 0.9 + (i % 2) * 0.2, y: -6.2 - Math.floor(i / 3) * 0.32, r: 7 * k, style: {fill: 'muted', stroke: 'ink', width: 1.5 * k}} as Prop);
    const topOf = {sea_bed: -6, sunken_ship: -6, submarine: -6, fish: -6}[tgt];
    K.label('ltgt', world[0] + 0.15, tgt === 'sea_bed' ? -6.5 : -5.4, {sea_bed: 'sea bed', sunken_ship: 'sunken ship', submarine: 'submarine', fish: 'shoal of fish'}[tgt], 'ink', 24, 'start');
    const dh = 24 * k * per;   // the label's half-height: the line is broken round it
    K.arrow('d1', 3.3, topOf / 2 + dh, 3.3, -0.05, 'ink', 3); K.arrow('d2', 3.3, topOf / 2 - dh, 3.3, topOf + 0.05, 'ink', 3);
    K.line('dtop', 2.9, topOf, 3.7, topOf, 'ink', 2, {style: {stroke: 'ink', width: 2 * k, dash: [6 * k, 5 * k]}});
    K.label('ld', 3.3, topOf / 2, ill ? 'd' : `d = ${fm(d)} m`, 'ink', 28);
    anchors = {ship: toScene(plane, [0, 0.9]), target: toScene(plane, [0, topOf]), transmitter: toScene(plane, [-0.6, -0.45]), receiver: toScene(plane, [0.6, -0.45])};
  }

  // the panel
  const say = sayer(props, W, k, fr.px, fr.row, narrow);
  if (!sonar) {
    say('s1', `A sharp sound goes out to the ${name}, reflects and comes back: the echo`, 0.3, {weight: 700});
    say('s2', 'The sensation of a sound lasts about a tenth of a second in the ear (persistence of hearing)', lead + 0.6, {style: {fill: 'muted'}});
    const just = Math.abs(t - P) <= 1e-6 * P;
    say('s3', just ? 'The echo comes back just as the first sound dies away: the least distance for a distinct echo'
      : t > P ? 'The echo comes back after the first sound has died away: a distinct echo'
      : 'The echo comes back while the first sound still lasts in the ear: they merge, no distinct echo', tHome + 0.1, {weight: 700});
  } else {
    const what = {sea_bed: 'sea bed', sunken_ship: 'sunken ship', submarine: 'submarine', fish: 'shoal of fish'}[s.target ?? 'sea_bed'];
    say('s1', `The ship sends a pulse of ultrasound down; it reflects from the ${what} and comes back`, 0.3, {weight: 700});
    say('s2', 'Ultrasound travels far in a narrow beam and is not easily absorbed', lead + 0.6, {style: {fill: 'muted'}});
    say('s3', 'The pulse goes down and back up, so the depth is half the distance it travels in that time', tHome + 0.1, {weight: 700});
  }
  if (!ill) {
    const nums = sol.solved === 'v' ? `v = 2d / t = 2 × ${fm(d)} / ${fm(t)} = ${fm(v)} m/s`
      : sol.solved === 'd' ? `d = vt / 2 = ${fm(v)} × ${fm(t)} / 2 = ${fm(d)} m` : `t = 2d / v = 2 × ${fm(d)} / ${fm(v)} = ${fm(t)} s`;
    say('n1', nums, tHome + 0.6);
    if (!sonar) say('n2', s.minimum ? `the least distance for a distinct echo in ${s.medium ?? 'air'}` : `Least distance for an echo here: v × ${fm(P)} / 2 = ${fm(dmin)} m`, tHome + 1.0, {style: {fill: 'muted'}});
  }
  say('sc', 'Not to scale; the sound slowed down to be seen', 0.3, {style: {fill: 'faint'}});
  facts.push(`${sonar ? 'depth' : 'distance'} d = ${fm(d)} m`, `echo time t = ${fm(t)} s`, `speed of sound v = ${fm(v)} m/s`,
    sol.solved === 'v' ? `v = 2d / t = ${fm(v)} m/s` : sol.solved === 'd' ? `d = vt / 2 = ${fm(d)} m` : `t = 2d / v = ${fm(t)} s`);
  if (!sonar) facts.push(`least distance for a distinct echo, v × ${fm(P)} / 2 = ${fm(dmin)} m`, t >= P * (1 - 1e-6) ? 'the echo is heard distinctly' : 'no distinct echo: it returns within the persistence of hearing');
  const duration = Math.max(te + 3, (ill ? tHome + 0.1 : tHome + 1.0) + 2.5, s.seconds ?? 0);
  return {...scene(s, W, H, duration, plane, props, [], {verb: 'sound', facts, anchors}), planes: [plane]};
}

// ---------------------------------------------------------------------------------------------------------------
// vibrations

/** Displacement (in units of the natural amplitude) against time for each type, ω0 = 2π f (screen), damping γ = ζω0;
 * forced: driven from rest through its support, y_s = Y sin ωt, x'' + 2γx' + ω0²x = ω0² y_s, transient and all. */
export function vibration(type: (typeof VIBRATION_TYPES)[number], f: number, ratio: number, zeta = 0.12, Y = 0.35) {
  const w0 = 2 * Math.PI * f, g = zeta * w0, wd = w0 * Math.sqrt(1 - zeta * zeta), wf = ratio * w0;
  if (type === 'natural') return {x: (t: number) => Math.cos(w0 * t), expr: (T: string) => `cos(${w0.toFixed(6)} * ${T})`, env: undefined, support: undefined, supportExpr: undefined, Y: 0, amp: 1};
  if (type === 'damped') return {x: (t: number) => Math.exp(-g * t) * (Math.cos(wd * t) + g / wd * Math.sin(wd * t)),
    expr: (T: string) => `exp(${(-g).toFixed(6)} * ${T}) * (cos(${wd.toFixed(6)} * ${T}) + ${(g / wd).toFixed(6)} * sin(${wd.toFixed(6)} * ${T}))`,
    env: (T: string) => `exp(${(-g).toFixed(6)} * ${T})`, support: undefined, supportExpr: undefined, Y: 0, amp: 1};
  const den = Math.hypot(w0 * w0 - wf * wf, 2 * g * wf) / (w0 * w0);
  const y = Math.min(Y, den);                                   // at resonance the drive is turned down so the swing fits its row
  const A = y / den, dl = Math.atan2(2 * g * wf, w0 * w0 - wf * wf), C1 = A * Math.sin(dl), C2 = (g * C1 - A * wf * Math.cos(dl)) / wd;
  return {x: (t: number) => A * Math.sin(wf * t - dl) + Math.exp(-g * t) * (C1 * Math.cos(wd * t) + C2 * Math.sin(wd * t)),
    expr: (T: string) => `${A.toFixed(6)} * sin(${wf.toFixed(6)} * ${T} - ${dl.toFixed(6)}) + exp(${(-g).toFixed(6)} * ${T}) * (${C1.toFixed(6)} * cos(${wd.toFixed(6)} * ${T}) + ${C2.toFixed(6)} * sin(${wd.toFixed(6)} * ${T}))`,
    env: undefined, support: (t: number) => y * Math.sin(wf * t), supportExpr: (T: string) => `${y.toFixed(6)} * sin(${wf.toFixed(6)} * ${T})`, Y: y, amp: A};
}

function vibrationsScene(s: SoundSpec, W: number, H: number, k: number): Scene {
  const types = s.types ?? [...VIBRATION_TYPES], rows = types.length, ill = !!s.illustrative;
  const fr = frame(W, H, k, s.title), narrow = W < 1.3 * H, props: Prop[] = [...fr.titles], facts: string[] = [];
  const plane: Plane = {id: 'p', x: [0, 10], y: [0, rows], box: fr.box};
  const K = kit(props, k);
  // on screen the natural frequency is between 0.3 and 1.2 Hz (a real one in that range is shown at its own rate)
  const f0 = s.f0, fs = f0 !== undefined && f0 >= 0.3 && f0 <= 1.2 ? f0 : 0.75, ratio = s.driver !== undefined && f0 !== undefined ? s.driver / f0 : 1.6;
  const lead = 0.8, Tw = 5 / fs, X0 = 2.1, X1 = 9.8, A = 0.22, end = lead + Tw;
  const colour = {natural: 'accent', damped: 'cool', forced: 'good'} as const;
  const heading = {natural: 'Natural (free) vibrations', damped: 'Damped vibrations', forced: "Forced vibrations: at the driver's frequency"};
  let resonant = false;
  types.forEach((type, i) => {
    const yc = rows - i - 0.5, c = colour[type], m = vibration(type, fs, ratio);
    if (type === 'forced' && Math.abs(ratio - 1) < 0.03) resonant = true;
    const T = `((x - ${X0}) * ${(Tw / (X1 - X0)).toFixed(6)})`;
    const xb = (t: number) => (t < lead ? m.x(0) : m.x(t - lead)), ys = (t: number) => (m.support && t >= lead ? m.support(t - lead) : 0);
    const dur = end + 3;
    // the support (moving, for the driven one), the spring as a zigzag between it and the block, the block
    const top = (t: number) => yc + 0.43 + A * ys(t), bot = (t: number) => yc + A * xb(t) + 0.06;
    props.push({id: `sup${i}`, type: 'line', plane: 'p', x1: 0.35, y1: yc + 0.43, x2: 1.45, y2: yc + 0.43, style: {stroke: 'ink', width: 7 * k},
      ...(m.support ? {keys: {y1: keysOf(0, dur, top), y2: keysOf(0, dur, top)}} : {})} as Prop);
    if (m.support) props.push({id: `hand${i}`, type: 'arrow', plane: 'p', x1: 0.2, y1: yc + 0.43, x2: 0.2, y2: yc + 0.43, head: 10 * k, style: {stroke: c, width: 4 * k}, layer: 3,
      keys: {y1: keysOf(0, dur, t => top(t) - 0.12), y2: keysOf(0, dur, t => top(t) + 0.12)}} as Prop);
    const nz = 10, cx = 0.9;
    for (let j = 0; j < nz; j++) {
      const at = (q: number) => (t: number) => top(t) + (bot(t) - top(t)) * q, xo = (q: number) => (q === 0 || q === nz ? cx : cx + (q % 2 ? 0.13 : -0.13));
      props.push({id: `spr${i}_${j}`, type: 'line', plane: 'p', x1: xo(j), y1: 0, x2: xo(j + 1), y2: 0, style: {stroke: 'muted', width: 3 * k},
        keys: {y1: keysOf(0, dur, at(j / nz)), y2: keysOf(0, dur, at((j + 1) / nz))}} as Prop);
    }
    props.push({id: `block${i}`, type: 'rect', plane: 'p', x: 0.6, y: 0, w: 0.6, h: 0.12, layer: 2, style: {fill: c, stroke: 'ink', width: 2 * k},
      keys: {y: keysOf(0, dur, t => yc + A * xb(t) - 0.06)}} as Prop);
    K.line(`rest${i}`, 0.45, yc, 1.35, yc, 'faint', 2, {style: {stroke: 'faint', width: 2 * k, dash: [6 * k, 5 * k]}});
    // the trace: drawn by a pen level with the block, over five natural periods
    K.line(`ax${i}`, X0, yc, X1, yc, 'faint', 2);
    K.line(`ay${i}`, X0, yc - 0.3, X0, yc + 0.3, 'faint', 2);
    if (m.support && m.supportExpr) props.push({id: `drv${i}`, type: 'curve', plane: 'p', expr: `${yc} + ${A} * ${m.supportExpr(T)}`, from: X0, to: X1, samples: 500, draw: 0,
      keys: {draw: [[lead, 0], [end, 1, 'linear']]}, style: {stroke: 'muted', width: 2.5 * k, dash: [7 * k, 6 * k]}} as Prop);
    props.push({id: `tr${i}`, type: 'curve', plane: 'p', expr: `${yc} + ${A} * (${m.expr(T)})`, from: X0, to: X1, samples: 600, draw: 0, layer: 2,
      keys: {draw: [[lead, 0], [end, 1, 'linear']]}, style: {stroke: c, width: 4.5 * k}} as Prop);
    if (m.env) for (const sg of [1, -1]) props.push({id: `env${i}${sg > 0 ? 'p' : 'n'}`, type: 'curve', plane: 'p', expr: `${yc} + ${sg * A} * ${m.env(T)}`, from: X0, to: X1, samples: 200,
      show: [end, 1e9], fade: 0.4, style: {stroke: 'muted', width: 2 * k, dash: [8 * k, 6 * k]}} as Prop);
    const penX = (t: number) => X0 + (X1 - X0) * Math.min(1, Math.max(0, (t - lead) / Tw));
    props.push({id: `pen${i}`, type: 'circle', plane: 'p', x: X0, y: yc, r: 8 * k, layer: 3, style: {fill: c, stroke: 'ink', width: 2 * k}, show: [0, end],
      keys: {x: keysOf(0, end, penX), y: keysOf(0, end, t => yc + A * xb(t))}} as Prop);
    props.push({id: `link${i}`, type: 'line', plane: 'p', x1: 1.2, y1: yc, x2: X0, y2: yc, show: [0, end], style: {stroke: c, width: 1.5 * k, dash: [5 * k, 6 * k], opacity: 0.6},
      keys: {x2: keysOf(0, end, penX), y1: keysOf(0, end, t => yc + A * xb(t)), y2: keysOf(0, end, t => yc + A * xb(t))}} as Prop);
    K.label(`h${i}`, X0 + 0.1, yc + 0.39, type === 'forced' && Math.abs(ratio - 1) < 0.03 ? 'Forced at the natural frequency: resonance' : heading[type], c, rows === 3 && narrow ? 22 : 24, 'start');
    if (m.support) K.label(`ld${i}`, X1, yc - 0.3, 'dashed: the driver', 'muted', 20, 'end');
  });

  const say = sayer(props, W, k, fr.px, fr.row, narrow);
  if (!narrow) say('s0', 'Each trace: displacement against time', 0.3, {style: {fill: 'muted'}});
  const tell = {
    natural: 'Natural: no outside force; its own natural frequency, a constant amplitude (strictly only in a vacuum)',
    damped: "Damped: the medium's resistance takes energy away; the amplitude dies down",
    forced: resonant ? "Forced at its natural frequency: resonance, the amplitude grows large"
      : "Forced: a periodic outside force sets the frequency, not the body's own; the amplitude is small and steady"};
  types.forEach((type, i) => say(`s${i + 1}`, tell[type], lead + (i + 0.5) * Tw / rows, {weight: 700}));
  if (!ill && f0 !== undefined) {
    say('n1', `natural frequency f₀ = ${fm(f0)} Hz${s.driver !== undefined ? `; driver ${fm(s.driver)} Hz` : ''}`, end + 0.2, {style: {fill: 'muted'}});
    facts.push(`natural frequency ${fm(f0)} Hz`);
    if (s.driver !== undefined) facts.push(`driver frequency ${fm(s.driver)} Hz: the forced vibration has this frequency`);
  }
  if (f0 !== undefined && fs !== f0) say('sc', f0 > fs ? 'Slowed down to be seen' : 'Drawn at a watchable rate', 0.3, {style: {fill: 'faint'}});
  const said = {natural: 'natural vibrations: constant amplitude, natural frequency', damped: 'damped vibrations: amplitude decreases with time', forced: "forced vibrations: the driver's frequency, amplitude small unless resonant"};
  facts.push(...types.map(x => said[x]));
  return scene(s, W, H, Math.max(end + 3, s.seconds ?? 0), plane, props, [], {verb: 'sound', facts});
}

// ---------------------------------------------------------------------------------------------------------------
// resonance: Barton's pendulums

/** How strongly the string couples the pendulums: weak enough that C and D sway only a little (about a fifth of A's
 * swing at most), strong enough that B takes A's swing in about 1/(2ε) = 6 of A's periods. */
export const BARTON_EPS = 0.08;

/** Four pendulums A, C, B, D on one elastic string, small swings, coupled weakly through it:
 * θᵢ'' = −ωᵢ²θᵢ − ε Σⱼ≠ᵢ ωⱼ²θⱼ. A starts at θ0, the rest at rest. Returns samples every dt. */
export function barton(lengths: number[], g = 9.8, theta0 = 0.18, eps = BARTON_EPS, tmax = 20, dt = 1 / 120) {
  const w2 = lengths.map(L => g / L);
  let th = lengths.map((_, i) => (i === 0 ? theta0 : 0)), om = lengths.map(() => 0);
  const acc = (q: number[]) => q.map((x, i) => -w2[i] * x - eps * q.reduce((a, y, j) => (j === i ? a : a + w2[j] * y), 0));
  const out: {t: number; th: number[]}[] = [{t: 0, th: [...th]}];
  const sub = 8, h = dt / sub;
  for (let step = 1; step * dt <= tmax + 1e-9; step++) {
    for (let r = 0; r < sub; r++) {
      const a1 = acc(th), q2 = th.map((x, i) => x + h / 2 * om[i]), v2 = om.map((x, i) => x + h / 2 * a1[i]), a2 = acc(q2);
      const q3 = th.map((x, i) => x + h / 2 * v2[i]), v3 = om.map((x, i) => x + h / 2 * a2[i]), a3 = acc(q3);
      const q4 = th.map((x, i) => x + h * v3[i]), v4 = om.map((x, i) => x + h * a3[i]), a4 = acc(q4);
      th = th.map((x, i) => x + h / 6 * (om[i] + 2 * v2[i] + 2 * v3[i] + v4[i]));
      om = om.map((x, i) => x + h / 6 * (a1[i] + 2 * a2[i] + 2 * a3[i] + a4[i]));
    }
    out.push({t: step * dt, th: [...th]});
  }
  return out;
}

function resonanceScene(s: SoundSpec, W: number, H: number, k: number): Scene {
  const L = s.L ?? 1, Lc = s.short ?? 0.5 * L, Ld = s.long ?? 1.8 * L, g = 9.8, ill = !!s.illustrative;
  const fr = frame(W, H, k, s.title), narrow = W < 1.3 * H, props: Prop[] = [...fr.titles], facts: string[] = [];
  // order along the string as the book's Fig. 7.9: A, C, B, D; the motion is A's, B's, C's, D's
  const names = ['A', 'C', 'B', 'D'], lengths = [L, Lc, L, Ld], sp = 0.62 * L, xs = [0, 1, 2, 3].map(i => (i + 0.5) * sp);
  const Lmax = Math.max(...lengths), TA = 2 * Math.PI * Math.sqrt(L / g), lead = 0.8;
  const tEx = TA / (2 * BARTON_EPS), sim = barton(lengths, g, 0.18, BARTON_EPS, Math.max(tEx + 3.5 * TA + 3, (s.seconds ?? 0) + 1));
  // B's swing is largest about 1/(2ε) of A's periods in: find its peak, end a little after
  const amp = (i: number, t0: number, t1: number) => Math.max(...sim.filter(q => q.t >= t0 && q.t <= t1).map(q => Math.abs(q.th[i])));
  let tPeak = tEx, best = 0;
  // (where B's swing most exceeds A's: A is then at its least)
  for (let t = 2 * TA; t <= tEx + 2.5 * TA; t += TA / 4) { const a = amp(2, t - TA / 2, t + TA / 2) - amp(0, t - TA / 2, t + TA / 2); if (a > best) { best = a; tPeak = t; } }
  const duration = Math.max(lead + tPeak + 2.5, s.seconds ?? 0);
  const world: [number, number, number, number] = [-0.25 * L, 4 * sp + 0.25 * L, -Lmax - 0.42 * L, 0.3 * L];
  const {plane, per} = fit(fr.box, ...world);
  const K = kit(props, k);
  // the posts and the string PQ
  K.line('postP', 0, 0, 0, world[2] + 0.05 * L, 'muted', 6); K.line('postQ', 4 * sp, 0, 4 * sp, world[2] + 0.05 * L, 'muted', 6);
  K.line('base', -0.2 * L, world[2] + 0.05 * L, 4 * sp + 0.2 * L, world[2] + 0.05 * L, 'muted', 6);
  K.line('string', 0, 0, 4 * sp, 0, 'ink', 4);
  K.label('lP', -0.08 * L, 0.13 * L, 'P', 'ink', 26, 'end'); K.label('lQ', 4 * sp + 0.08 * L, 0.13 * L, 'Q', 'ink', 26, 'start');
  const at = (q: number, i: number): Vec => { const sq = sim[Math.min(sim.length - 1, Math.max(0, Math.round(q / (sim[1].t - sim[0].t))))]; const th = sq.th[i]; return [xs[i] + lengths[i] * Math.sin(th), -lengths[i] * Math.cos(th)]; };
  const T = (t: number) => Math.max(0, t - lead);   // they keep swinging to the end: B's swing is plain well before it
  const colour = ['accent', 'cool', 'accent', 'cool'];
  names.forEach((nm, i) => {
    const kx = keysOf(0, duration, t => at(T(t), i)[0], 30), ky = keysOf(0, duration, t => at(T(t), i)[1], 30);
    props.push({id: `thread${nm}`, type: 'line', plane: 'p', x1: xs[i], y1: 0, x2: xs[i], y2: -lengths[i], style: {stroke: 'ink', width: 2.5 * k}, keys: {x2: kx, y2: ky}} as Prop);
    props.push({id: `bob${nm}`, type: 'circle', plane: 'p', x: xs[i], y: -lengths[i], r: 20 * k, layer: 3, style: {fill: colour[i], stroke: 'ink', width: 2 * k}, keys: {x: kx, y: ky}} as Prop);
    const off = 20 * k * per + 0.11 * L;
    props.push({id: `l${nm}`, type: 'text', plane: 'p', x: xs[i], y: -lengths[i] - off, text: nm, size: 28 * k, weight: 700, align: 'middle', layer: 4,
      style: {fill: 'ink', stroke: 'paper', width: 6 * k}, keys: {x: kx, y: ky.map(q => [q[0], q[1] - off, ...q.slice(2)] as Key)}} as Prop);
  });
  // two significant figures, as the book gives a 1.0 m pendulum's 0.5 Hz
  const f = (len: number) => Number((Math.sqrt(g / len) / (2 * Math.PI)).toPrecision(2));
  const say = sayer(props, W, k, fr.px, fr.row, narrow);
  say('s1', 'Pendulum A is set swinging; the string PQ passes its swings on to the others', 0.3, {weight: 700});
  say('s2', 'C, shorter, and D, longer, only sway a little: forced vibrations', lead + 1.6 * TA, {style: {fill: 'muted'}});
  say('s3', 'B, the same length as A, has the same natural frequency: it swings wider and wider. This is resonance', lead + Math.min(tPeak - TA, 2.5 * TA), {weight: 700});
  say('s4', 'A slows down as B takes its energy; then they swap back', lead + tPeak - 0.2 * TA, {style: {fill: 'muted'}});
  if (s.examples) say('s5', 'Also resonance: a fork on a sound box setting an equal fork ringing, an air column over a tuning fork, soldiers breaking step on a bridge, tuning a radio', lead + tPeak + 0.3, {style: {fill: 'muted'}});
  if (!ill) say('n1', `f = (1/2π)√(g/l): A and B ${fm(f(L))} Hz, C ${fm(f(Lc))} Hz, D ${fm(f(Ld))} Hz`, lead + tPeak + (s.examples ? 0.6 : 0.3), {style: {fill: 'muted'}});
  facts.push(`A and B: length ${fm(L)} m, natural frequency ${fm(f(L))} Hz`, `C: ${fm(Lc)} m, ${fm(f(Lc))} Hz`, `D: ${fm(Ld)} m, ${fm(f(Ld))} Hz`,
    'B resonates with A (equal natural frequencies); C and D show small forced vibrations');
  const anchors: Record<string, Vec> = Object.fromEntries(names.map((nm, i) => [nm, toScene(plane, [xs[i], -lengths[i]])]));
  anchors.P = toScene(plane, [0, 0]); anchors.Q = toScene(plane, [4 * sp, 0]);
  return {...scene(s, W, H, duration, plane, props, [], {verb: 'sound', facts, anchors}), planes: [plane]};
}
