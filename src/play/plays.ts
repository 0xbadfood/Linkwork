// Plays: a verb a student can drive (2026-10-31). A play names a chapter, the verb's controls and the range each may take,
// then asks for a prediction and sets challenges. Only pictures true to their numbers qualify: one fixed scale over the
// whole range, nothing drawn larger than real, no refit to the frame. A verb that refits or enlarges (capillary, the rod's
// expansion, mixing's bars) does not get a play until it can draw without that; test/plays.test.ts sweeps every control and
// fails on a changing scale or a check() problem. This file imports no verbs, so a studio can list plays without loading them.
type P2 = [number, number];
export type Values = Record<string, number | string>;
export type Control =
  | {id: string; label: string; kind: 'slider'; min: number; max: number; step: number; unit: string; start: number}
  | {id: string; label: string; kind: 'choice'; options: string[]; start: string};
export type Challenge = {text: string; start?: Values; hit: (v: Values) => boolean; hint: (v: Values) => string};
export type Play = {
  id: string; chapter: string; title: string; intro: string; controls: Control[];
  /** The verb's spec for these values. */
  spec: (v: Values) => Record<string, unknown>;
  /** The time of the frame shown while aiming: the set-up, before the answer appears. */
  setup: number;
  /** What the run found, computed from the same formulas as the verb. */
  reading: (v: Values) => [string, string][];
  /** A lasting mark per run, in the picture's plane (a shot's landing); earlier runs stay on screen. */
  mark?: (v: Values) => P2;
  /** A target drawn in the picture's plane. */
  target?: (c: Challenge) => {x: number; half: number} | undefined;
  predict: {question: string; options: {text: string; right?: boolean}[]; runs: Values[]; why: string};
  challenges: Challenge[];
  /** For the test: a drawn length and the real quantity it stands for; the ratio must not change across the range. */
  probe: (v: Values, scene: any) => [number, number][];
};

const n = (v: Values, id: string) => v[id] as number;
const fixed = (x: number, d = 1) => x.toFixed(d);

// Projectile: range and height from v and the angle, in a window that never moves
const G = 9.8, rad = (a: number) => a * Math.PI / 180;
const range = (v: Values) => n(v, 'speed') ** 2 * Math.sin(2 * rad(n(v, 'angle'))) / G;
const peak = (v: Values) => (n(v, 'speed') * Math.sin(rad(n(v, 'angle')))) ** 2 / (2 * G);
const flight = (v: Values) => 2 * n(v, 'speed') * Math.sin(rad(n(v, 'angle'))) / G;
const near = (v: Values, x: number) => { const r = range(v); return `It landed at ${fixed(r)} m, ${fixed(Math.abs(r - x))} m ${r < x ? 'short' : 'too far'}.`; };

// Conduction: two bars, 1 m in all, 100 °C and 0 °C at the ends (Table 10.6)
const K: Record<string, number> = {copper: 385, aluminium: 205, brass: 109, steel: 50.2};
const METALS = Object.keys(K);
const bars = (v: Values) => { const L1 = n(v, 'L1'); return [{material: v.first as string, L: L1}, {material: v.second as string, L: +(1 - L1).toFixed(2)}]; };
const resist = (v: Values) => bars(v).map(b => b.L / K[b.material]);
const junction = (v: Values) => { const [a, b] = resist(v); return 100 * b / (a + b); };

// A convex lens, f = 10 cm, the object 12 to 40 cm away: always a real image, in a window that holds the farthest
const F = 10, HEIGHT = 5, across = (v: Values) => F * n(v, 'd') / (n(v, 'd') - F), times = (v: Values) => F / (n(v, 'd') - F);

export const PLAYS: Play[] = [
  {
    id: 'projectile', chapter: 'keph1-03', title: 'Land the shot',
    intro: 'A ball leaves the ground at the speed and angle you set. Air is ignored, and the picture is to one scale.',
    controls: [
      {id: 'speed', label: 'Speed', kind: 'slider', min: 5, max: 24, step: 1, unit: 'm/s', start: 15},
      {id: 'angle', label: 'Angle', kind: 'slider', min: 15, max: 75, step: 1, unit: '°', start: 30},
    ],
    spec: v => { const a = rad(n(v, 'angle')), s = n(v, 'speed'); return {verb: 'plane_motion', title: 'Projectile', show: [], hide_path: true, x: [-2, 62], y: [-2, 34],
      accelerate: {v0: [+(s * Math.cos(a)).toFixed(4), +(s * Math.sin(a)).toFixed(4)], a: [0, -G], t: [0, flight(v)]}}; },
    setup: 0,
    reading: v => [['Landed at', `${fixed(range(v))} m`], ['Highest point', `${fixed(peak(v))} m`], ['Time in the air', `${fixed(flight(v))} s`]],
    mark: v => [range(v), 0],
    target: c => { const t = (c as Challenge & {at?: number}).at; return t === undefined ? undefined : {x: t, half: 1}; },
    predict: {
      question: 'Two shots at 20 m/s, one at 30° and one at 60°. Which lands further?',
      options: [{text: '30°: it goes more forward'}, {text: '60°: it stays up longer'}, {text: 'They land at the same place', right: true}],
      runs: [{speed: 20, angle: 30}, {speed: 20, angle: 60}],
      why: 'Range is v² sin 2θ / g, and sin 60° = sin 120°. The steep shot stays up longer but moves forward more slowly, and the two effects balance exactly.',
    },
    challenges: [
      Object.assign({text: 'Land on the target at 30 m.', start: {speed: 15, angle: 30}, hit: (v: Values) => Math.abs(range(v) - 30) <= 1, hint: (v: Values) => near(v, 30)}, {at: 30}),
      Object.assign({text: 'Land on the target at 40 m, at a speed of no more than 20 m/s.', start: {speed: 20, angle: 20},
        hit: (v: Values) => Math.abs(range(v) - 40) <= 1 && n(v, 'speed') <= 20,
        hint: (v: Values) => (n(v, 'speed') > 20 ? 'That is faster than 20 m/s. Which angle goes furthest for a given speed?' : near(v, 40))}, {at: 40}),
    ],
    probe: (v, s) => { const p = s.planes[0], end = s.actors[0].base.at(-1).at, zero = p.box[0] + (0 - p.x[0]) / (p.x[1] - p.x[0]) * (p.box[2] - p.box[0]);
      return [[p.box[2] - p.box[0], p.x[1] - p.x[0]], [end[0] - zero, range(v)]]; },
  },
  {
    id: 'two-bars', chapter: 'keph2-03', title: 'Move the junction',
    intro: 'Two metal bars joined end to end, 1 m in all. One end is held at 100 °C, the other at 0 °C, and the heat flow has settled.',
    controls: [
      {id: 'first', label: 'Hot-end bar', kind: 'choice', options: METALS, start: 'copper'},
      {id: 'second', label: 'Cold-end bar', kind: 'choice', options: METALS, start: 'steel'},
      {id: 'L1', label: 'Length of the hot-end bar', kind: 'slider', min: 0.3, max: 0.7, step: 0.01, unit: 'm', start: 0.5},
    ],
    spec: v => ({verb: 'heat_transfer', kind: 'conduction', title: 'Two bars in the steady state', T1: 100, T2: 0, bars: bars(v)}),
    setup: 0.2,
    reading: v => { const [a, b] = resist(v); return [['Junction', `${fixed(junction(v))} °C`], ['Heat current', `${Math.round(100 / (a + b)).toLocaleString('en-IN')} W per m²`]]; },
    predict: {
      question: 'Copper at the hot end and steel at the cold end, 0.5 m each. Where does the junction settle?',
      options: [{text: 'Close to 100 °C', right: true}, {text: 'About 50 °C'}, {text: 'Close to 0 °C'}],
      runs: [{first: 'copper', second: 'steel', L1: 0.5}],
      why: 'The same heat current passes through both bars, and steel conducts far worse, so nearly all the temperature drop happens in the steel.',
    },
    challenges: [
      {text: 'Bring the junction to 50 °C, within one degree.', start: {first: 'copper', second: 'steel', L1: 0.5}, hit: v => Math.abs(junction(v) - 50) <= 1,
        hint: v => `The junction is at ${fixed(junction(v))} °C. Each bar's share of the drop goes as L / K.`},
      {text: 'Bring the junction below 10 °C.', start: {first: 'copper', second: 'brass', L1: 0.5}, hit: v => junction(v) < 10,
        hint: v => `The junction is at ${fixed(junction(v))} °C. The cold-end bar must take very little of the drop.`},
    ],
    probe: (v, s) => { const a = s.meta.anchors; return [[a.junction[0] - a.hot[0], n(v, 'L1')], [a.profile_junction[1] - a.profile_hot[1], 100 - junction(v)]]; },
  },
  {
    id: 'lens', chapter: 'jesc1-09', title: 'Size the image',
    intro: 'A convex lens of focal length 10 cm. Move the object along the axis and see where its image forms. Lengths and heights are to the same scale.',
    controls: [{id: 'd', label: 'Object distance', kind: 'slider', min: 12, max: 40, step: 0.1, unit: 'cm', start: 30}],
    spec: v => ({verb: 'ray_diagram', device: 'convex_lens', focal_length: F, objects: [n(v, 'd')], object_height: HEIGHT, formula: true, window: {x: [-44, 64], y: 28}}),
    setup: 1.1,
    reading: v => [['Image distance', `${fixed(across(v))} cm`], ['Image size', `${fixed(times(v), 2)} × the object`]],
    predict: {
      question: 'The object starts far away and moves in towards F, from 40 cm to 15 cm. What does its image do?',
      options: [{text: 'It grows and moves away from the lens', right: true}, {text: 'It shrinks and moves towards the lens'}, {text: 'It stays the same size at F'}],
      runs: [{d: 40}, {d: 15}],
      why: '1/v = 1/f − 1/u: as u falls towards f, v grows quickly, and the size goes as v / u. At 15 cm the image is at 30 cm and twice the object\'s size.',
    },
    challenges: [
      {text: 'Make the image exactly the same size as the object.', start: {d: 30}, hit: v => Math.abs(times(v) - 1) <= 0.02, hint: v => `The image is ${fixed(times(v), 2)} × the object.`},
      {text: 'Make the image 3 times the size of the object.', start: {d: 20}, hit: v => Math.abs(times(v) - 3) <= 0.05, hint: v => `The image is ${fixed(times(v), 2)} × the object.`},
    ],
    probe: (v, s) => { const a = s.meta.anchors, axis = s.meta.units.oy; return [[a.image[0] - a.object[0], n(v, 'd') + across(v)], [a.image[1] - axis, times(v) * HEIGHT], [axis - a.object[1], HEIGHT]]; },
  },
];

export const playsFor = (chapter: string) => PLAYS.filter(p => p.chapter === chapter);
export const startValues = (p: Play): Values => Object.fromEntries(p.controls.map(c => [c.id, c.start]));
