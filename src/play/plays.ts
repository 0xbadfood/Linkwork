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

// A block on a spring, T = 2π√(m/k), every period shown in true time so two runs can be compared by eye
const period = (v: Values) => 2 * Math.PI * Math.sqrt(n(v, 'mass') / n(v, 'k'));

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
  {
    id: 'spring-period', chapter: 'keph2-06', title: 'Tune the spring',
    intro: 'A block on a spring, in true time. Change its mass, the stiffness of the spring and how far you pull it, then let go.',
    controls: [
      {id: 'mass', label: 'Mass', kind: 'slider', min: 1, max: 4, step: 0.1, unit: 'kg', start: 1},
      {id: 'k', label: 'Spring constant', kind: 'slider', min: 10, max: 36, step: 1, unit: 'N/m', start: 20},
      {id: 'A', label: 'Pull', kind: 'slider', min: 0.05, max: 0.2, step: 0.01, unit: 'm', start: 0.1},
    ],
    spec: v => ({verb: 'shm', show: 'spring', title: 'A block on a spring', mass: n(v, 'mass'), k: n(v, 'k'), A: n(v, 'A'), reach: 0.2}),
    setup: 0.9,
    reading: v => [['Period', `${fixed(period(v), 2)} s`], ['Greatest speed', `${fixed(2 * Math.PI / period(v) * n(v, 'A'), 2)} m/s`]],
    predict: {
      question: 'You pull the block twice as far before letting go. What happens to the time of one swing?',
      options: [{text: 'It stays the same', right: true}, {text: 'It doubles'}, {text: 'It halves'}],
      runs: [{A: 0.1}, {A: 0.2}],
      why: 'T = 2π√(m/k) has no A in it. Pulled twice as far, the force is twice as large, so the block moves twice as fast and covers twice the distance in the same time.',
    },
    challenges: [
      {text: 'Make one swing take exactly 2 seconds.', start: {mass: 1, k: 30, A: 0.1}, hit: v => Math.abs(period(v) - 2) <= 0.03, hint: v => `One swing takes ${fixed(period(v), 2)} s.`},
      {text: 'Keep k at 30 N/m, and match the period of 1 kg on a 10 N/m spring.', start: {mass: 2, k: 30, A: 0.1},
        hit: v => n(v, 'k') === 30 && Math.abs(period(v) - 2 * Math.PI * Math.sqrt(0.1)) <= 0.02, hint: v => `This one takes ${fixed(period(v), 2)} s; the other takes ${fixed(2 * Math.PI * Math.sqrt(0.1), 2)} s.`},
    ],
    probe: (v, s) => { const a = s.meta.anchors; return [[a.plus_A[0] - a.O[0], n(v, 'A')]]; },
  },
  {
    id: 'beats', chapter: 'keph2-07', title: 'Tune by beats',
    intro: 'A note of 12 Hz and a second note you can tune, over one second. Tuners listen for exactly this: the swells in the sum.',
    controls: [{id: 'nu2', label: 'Second note', kind: 'slider', min: 12.5, max: 20, step: 0.5, unit: 'Hz', start: 16}],
    spec: v => ({verb: 'wave', show: 'beats', title: 'Beats in one second', nu1: 12, nu2: n(v, 'nu2'), window: 1}),
    setup: 0.9,
    reading: v => [['Beats in a second', fixed(n(v, 'nu2') - 12, 1)]],
    predict: {
      question: 'You tune the second note from 16 Hz down to 13 Hz, closer to the first. What happens to the swells?',
      options: [{text: 'They come slower, wider apart', right: true}, {text: 'They come faster'}, {text: 'They stay the same'}],
      runs: [{nu2: 16}, {nu2: 13}],
      why: 'Beats per second = ν₁ − ν₂: 4 at 16 Hz, 1 at 13 Hz. As the notes come into tune, the swells slow down and vanish at exact unison.',
    },
    challenges: [
      {text: 'Make exactly 2 beats in the second.', start: {nu2: 18}, hit: v => n(v, 'nu2') === 14, hint: v => `Now ${fixed(n(v, 'nu2') - 12, 1)} beats.`},
      {text: 'Get as close to unison as this slider allows.', start: {nu2: 16}, hit: v => n(v, 'nu2') === 12.5, hint: v => `Still ${fixed(n(v, 'nu2') - 12, 1)} beats a second.`},
    ],
    probe: (_v, s) => { const a = s.meta.anchors; return [[a.end[0] - a.start[0], 1]]; },
  },
  {
    id: 'null-point', chapter: 'leph1-01', title: 'Find where the field vanishes',
    intro: 'Two positive charges, +4 nC and +1 nC, 30 cm apart. Move the point P between them. Each charge sends a field arrow; somewhere they cancel.',
    controls: [{id: 'x', label: 'P from the +4 nC charge', kind: 'slider', min: 6, max: 26, step: 1, unit: 'cm', start: 10}],
    spec: v => ({verb: 'electric', show: 'superposition', title: 'Field on the line', charges: [{q: 4e-9, x: -0.15, y: 0, name: '+4 nC'}, {q: 1e-9, x: 0.15, y: 0, name: '+1 nC'}], at: [n(v, 'x') / 100 - 0.15, 0], reach: 0.2, full: 12000}),
    setup: 1,
    reading: v => { const x = n(v, 'x') / 100, e = 8.988e9 * (4e-9 / (x * x) - 1e-9 / ((0.3 - x) ** 2)); return [['Net field', `${fixed(Math.abs(e), 0)} N/C`]]; },
    predict: {
      question: 'Where do the two fields cancel?',
      options: [{text: 'Nearer the +1 nC charge', right: true}, {text: 'Exactly halfway'}, {text: 'Nearer the +4 nC charge'}],
      runs: [{x: 15}, {x: 20}],
      why: 'E goes as q/r². Four times the charge needs twice the distance to give the same field: 20 cm from +4 nC, 10 cm from +1 nC.',
    },
    challenges: [
      {text: 'Put P where the net field is zero.', start: {x: 10}, hit: v => n(v, 'x') === 20, hint: v => (n(v, 'x') < 20 ? 'The +4 nC charge still wins: move away from it.' : 'The +1 nC charge wins now: move back.')},
    ],
    probe: (v, s) => { const a = s.meta.anchors; return [[a.P[0] - a.O[0], n(v, 'x') / 100 - 0.15]]; },
  },
  {
    id: 'zero-potential', chapter: 'leph1-02', title: 'Find where the potential vanishes',
    intro: 'A +30 nC and a −20 nC charge, 15 cm apart (the book\'s Example 2.2). Move P along the line between them. V adds with signs, so somewhere it comes to zero, though the field there does not.',
    controls: [{id: 'x', label: 'P from the +30 nC charge', kind: 'slider', min: 3, max: 12, step: 1, unit: 'cm', start: 4}],
    spec: v => ({verb: 'potential', show: 'system', title: 'Potential on the line', charges: [{q: 3e-8, x: -0.075, y: 0, name: '+30 nC'}, {q: -2e-8, x: 0.075, y: 0, name: '−20 nC'}], at: [n(v, 'x') / 100 - 0.075, 0], reach: 0.11}),
    setup: 1,
    reading: v => { const x = n(v, 'x') / 100, V = 8.988e9 * (3e-8 / x - 2e-8 / (0.15 - x)); return [['Potential at P', `${fixed(V, 0)} V`]]; },
    predict: {
      question: 'Where between the charges is V zero?',
      options: [{text: 'Nearer the −20 nC charge', right: true}, {text: 'Exactly halfway'}, {text: 'Nearer the +30 nC charge'}],
      runs: [{x: 7}, {x: 9}],
      why: 'V goes as q/r. The smaller charge needs a smaller distance to match: 30/x = 20/(15 − x) gives x = 9 cm from +30 nC, 6 cm from −20 nC.',
    },
    challenges: [
      {text: 'Put P where the potential is zero.', start: {x: 4}, hit: v => n(v, 'x') === 9, hint: v => (n(v, 'x') < 9 ? 'V is still positive: move toward the negative charge.' : 'V is negative now: move back.')},
    ],
    probe: (v, s) => { const a = s.meta.anchors; return [[a.P[0] - a.O[0], n(v, 'x') / 100 - 0.075]]; },
  },
  {
    id: 'balance-bridge', chapter: 'leph1-03', title: 'Balance the bridge',
    intro: 'A Wheatstone bridge with 100 Ω, 10 Ω and 300 Ω fixed. Change the fourth arm and watch the galvanometer. Its needle tells you which of B and D is at the higher potential.',
    controls: [{id: 'R4', label: 'Fourth arm', kind: 'slider', min: 10, max: 60, step: 5, unit: 'Ω', start: 10}],
    spec: v => ({verb: 'current', show: 'bridge', title: 'Wheatstone bridge', R1: 100, R2: 10, R3: 300, R4: n(v, 'R4'), emf: 10, Rg: 50, gmax: 0.06}),
    setup: 1,
    reading: v => { const r = n(v, 'R4'), R1 = 100, R2 = 10, R3 = 300, Rg = 50, e = 10, a = 1 / R2 + 1 / r + 1 / Rg, d = 1 / R1 + 1 / R3 + 1 / Rg, det = a * d - 1 / (Rg * Rg), VB = (e / R2 * d + e / R1 / Rg) / det, VD = (a * e / R1 + e / R2 / Rg) / det; return [['Galvanometer current', `${fixed((VB - VD) / Rg * 1000, 2)} mA`]]; },
    predict: {
      question: 'R₂/R₁ is 1/10. What fourth arm stops the current through G?',
      options: [{text: '30 Ω', right: true}, {text: '100 Ω, the same as R₁'}, {text: '10 Ω, the same as R₂'}],
      runs: [{R4: 10}, {R4: 30}],
      why: 'The ratio must match on both sides: R₂/R₁ = R₄/R₃, so R₄ = 300/10 = 30 Ω. Then B and D sit at the same potential, whatever the cell.',
    },
    challenges: [
      {text: 'Make the needle stand straight.', start: {R4: 60}, hit: v => n(v, 'R4') === 30, hint: v => (n(v, 'R4') > 30 ? 'B is too high: make the fourth arm smaller.' : 'D is too high now: make the fourth arm larger.')},
    ],
    probe: (v, s) => { const a = s.meta.anchors, r = n(v, 'R4'), R1 = 100, R2 = 10, R3 = 300, Rg = 50, e = 10, A = 1 / R2 + 1 / r + 1 / Rg, d = 1 / R1 + 1 / R3 + 1 / Rg, det = A * d - 1 / (Rg * Rg), VB = (e / R2 * d + e / R1 / Rg) / det, VD = (A * e / R1 + e / R2 / Rg) / det; return r === 30 ? [] : [[a.needle[0] - a.G[0], (VB - VD) / Rg]]; },
  },
  {
    id: 'bend-the-beam', chapter: 'leph1-04', title: 'Bend the beam',
    intro: 'An electron moves at 3 × 10⁷ m/s through a uniform magnetic field going into the page. Change the field and watch its circle. The scale stays fixed, so a smaller circle really is smaller.',
    controls: [{id: 'B', label: 'Field', kind: 'slider', min: 2, max: 12, step: 1, unit: '× 10⁻⁴ T', start: 3}],
    spec: v => ({verb: 'moving_charges', show: 'path', title: 'Electron in a field', charge: 'negative', v: 3e7, B: n(v, 'B') * 1e-4, rspan: 0.84, Tspan: 1.77e-7, field: 'in'}),
    setup: 0,
    reading: v => [['Radius', `${fixed(9e-31 * 3e7 / (1.6e-19 * n(v, 'B') * 1e-4) * 100, 1)} cm`]],
    predict: {
      question: 'You double the field from 3 to 6 × 10⁻⁴ T. What happens to the circle?',
      options: [{text: 'Its radius halves', right: true}, {text: 'Its radius doubles'}, {text: 'It stays the same: the force does no work'}],
      runs: [{B: 3}, {B: 6}],
      why: 'r = mv/qB. The force does no work, so the speed is unchanged, but twice the force bends the path twice as sharply.',
    },
    challenges: [
      {text: 'Make the radius 14 cm.', start: {B: 3}, hit: v => n(v, 'B') === 12, hint: v => 'Too wide: a stronger field draws a tighter circle.'},
      {text: 'Make the radius 42 cm.', start: {B: 12}, hit: v => n(v, 'B') === 4, hint: v => (n(v, 'B') > 4 ? 'Too tight: weaken the field.' : 'Too wide: strengthen the field.')},
    ],
    probe: (v, s) => { const a = s.meta.anchors; return [[a.edge[0] - a.centre[0], 9e-31 * 3e7 / (1.6e-19 * n(v, 'B') * 1e-4)]]; },
  },
  {
    id: 'float-the-wire', chapter: 'leph1-04', title: 'Float the wire',
    intro: 'A straight wire of 1 m and 200 g lies in a field of 0.98 T going into the page. Set the current so that the upward force carries its weight.',
    controls: [{id: 'I', label: 'Current', kind: 'slider', min: 0.5, max: 4, step: 0.5, unit: 'A', start: 1}],
    spec: v => ({verb: 'moving_charges', show: 'wire', title: 'A wire in mid-air', I: n(v, 'I'), L: 1, m: 0.2, B: 0.98, fspan: 3.92}),
    setup: 2,
    reading: v => [['Force', `${fixed(.98 * n(v, 'I'), 2)} N`], ['Weight', '1.96 N']],
    predict: {
      question: 'What current holds the wire in mid-air?',
      options: [{text: '2 A', right: true}, {text: '1 A'}, {text: '4 A'}],
      runs: [{I: 1}, {I: 2}],
      why: 'BIL = mg, so I = mg/BL = 1.96/0.98 = 2 A.',
    },
    challenges: [
      {text: 'Make the forces balance.', start: {I: 4}, hit: v => n(v, 'I') === 2, hint: v => (n(v, 'I') > 2 ? 'The force beats the weight: less current.' : 'The weight wins: more current.')},
    ],
    probe: (v, s) => { const a = s.meta.anchors; return [[a.wire[1] - a.force[1], .98 * n(v, 'I')]]; },
  },
  {
    id: 'turn-the-needle', chapter: 'leph1-05', title: 'Turn the needle',
    intro: 'A needle of moment 0.06 A m² sits in a field of 0.44 T. Turn it and watch its energy move along the curve.',
    controls: [{id: 'angle', label: 'Angle to the field', kind: 'slider', min: 0, max: 180, step: 15, unit: '°', start: 60}],
    spec: v => ({verb: 'magnetic_matter', show: 'needle', title: 'A needle in a field', m: 0.06, B: 0.44, angle: n(v, 'angle')}),
    setup: 0,
    reading: v => [['Torque', `${fixed(.0264 * Math.sin(n(v, 'angle') * Math.PI / 180), 4)} N m`], ['Energy', `${fixed(-.0264 * Math.cos(n(v, 'angle') * Math.PI / 180), 4)} J`]],
    predict: {
      question: 'At which angle does the field twist the needle hardest?',
      options: [{text: '90°', right: true}, {text: '0°'}, {text: '180°'}],
      runs: [{angle: 0}, {angle: 90}],
      why: 'τ = mB sin θ is largest at 90°. At 0° and 180° there is no twist at all, though only 0° is stable.',
    },
    challenges: [
      {text: 'Find the lowest energy.', start: {angle: 90}, hit: v => n(v, 'angle') === 0, hint: v => 'Turn the needle toward the field.'},
      {text: 'Find the angle with no torque and the highest energy.', start: {angle: 45}, hit: v => n(v, 'angle') === 180, hint: v => 'It balances, but one nudge would flip it.'},
      {text: 'Make the torque half its largest value, past 90°.', start: {angle: 90}, hit: v => n(v, 'angle') === 150, hint: v => (n(v, 'angle') < 150 ? 'sin θ is still above a half: turn further.' : 'sin θ is below a half: turn back.')},
    ],
    probe: (v, s) => { const a = s.meta.anchors; return [[a.state[1] - a.highest[1], .0264 * (1 + Math.cos(n(v, 'angle') * Math.PI / 180))]]; },
  },
  {
    id: 'cool-the-sample', chapter: 'leph1-05', title: 'Cool the sample',
    intro: 'A paramagnetic sample sits in a field of 1 T. Cool it or warm it, and watch thermal motion lose to the field.',
    controls: [{id: 'T', label: 'Temperature', kind: 'slider', min: 50, max: 400, step: 50, unit: 'K', start: 300}],
    spec: v => ({verb: 'magnetic_matter', show: 'atoms', title: 'A paramagnet', kind: 'paramagnetic', B: 1, T: n(v, 'T')}),
    setup: 5,
    reading: v => [['M compared with 400 K', `${fixed(400 / n(v, 'T'), 1)} times`]],
    predict: {
      question: 'You cool the sample from 200 K to 100 K. What happens to its magnetisation?',
      options: [{text: 'It doubles', right: true}, {text: 'It halves'}, {text: 'Nothing: the field is the same'}],
      runs: [{T: 200}, {T: 100}],
      why: 'M ∝ B/T, Curie\'s law. Half the thermal motion lets twice as many moments line up.',
    },
    challenges: [
      {text: 'Make M twice what it is at 400 K.', start: {T: 400}, hit: v => n(v, 'T') === 200, hint: v => (n(v, 'T') > 200 ? 'Too warm: cool it.' : 'Too cold: warm it.')},
      {text: 'Make M eight times what it is at 400 K.', start: {T: 400}, hit: v => n(v, 'T') === 50, hint: v => 'Colder still.'},
    ],
    probe: (v, s) => { const a = s.meta.anchors; return [[a.Mbase[1] - a.M[1], Math.min(1, 30 / n(v, 'T'))]]; },
  },
  {
    id: 'push-the-rod', chapter: 'leph1-06', title: 'Push the rod',
    intro: 'A 0.5 m rod slides on rails through a field of 0.5 T, in a circuit of 1 Ω. Push it faster or slower, and see what it costs you.',
    controls: [{id: 'v', label: 'Speed of the rod', kind: 'slider', min: .5, max: 4, step: .5, unit: 'm/s', start: 2}],
    spec: v => ({verb: 'induction', show: 'motional', title: 'A rod on rails', B: .5, l: .5, v: n(v, 'v'), R: 1}),
    setup: 5,
    reading: v => { const e = .25 * n(v, 'v'); return [['emf', `${fixed(e, 3)} V`], ['Force you must apply', `${fixed(e * .25, 4)} N`], ['Power you supply', `${fixed(e * e, 4)} W`]]; },
    predict: {
      question: 'You double the speed of the rod. What happens to the power you must supply?',
      options: [{text: 'It becomes four times', right: true}, {text: 'It doubles'}, {text: 'It stays the same'}],
      runs: [{v: 1}, {v: 2}],
      why: 'Twice the speed gives twice the emf and twice the current, so twice the opposing force. Twice the force at twice the speed is four times the power.',
    },
    challenges: [
      {text: 'Make an emf of 0.5 V.', start: {v: 1}, hit: v => n(v, 'v') === 2, hint: v => (n(v, 'v') < 2 ? 'ε = Blv: push faster.' : 'ε = Blv: slow down.')},
      {text: 'Supply exactly 1 W of power.', start: {v: 1}, hit: v => n(v, 'v') === 4, hint: v => 'Power goes as the square of the speed.'},
    ],
    probe: (v, s) => { const a = s.meta.anchors; return [[a.vbase[0] - a.vtip[0], n(v, 'v')]]; },
  },
  {
    id: 'turn-the-coil', chapter: 'leph1-06', title: 'Turn the coil',
    intro: 'A coil sits between two poles, turning steadily. Stop it at any angle, and find where the flux and the emf are largest. They are not where you might guess.',
    controls: [{id: 'angle', label: 'Angle of the coil', kind: 'slider', min: 0, max: 360, step: 15, unit: '°', start: 30}],
    spec: v => ({verb: 'induction', show: 'generator', title: 'A coil in a field', N: 100, B: .01, A: .1, nu: .5, angle: n(v, 'angle')}),
    setup: 0,
    reading: v => { const a = n(v, 'angle') * Math.PI / 180; return [['Flux through one turn', `${fixed(1e-3 * Math.cos(a), 5)} Wb`], ['emf', `${fixed(.314 * Math.sin(a), 3)} V`]]; },
    predict: {
      question: 'The flux through the coil is at its largest. What is the emf at that moment?',
      options: [{text: 'Zero', right: true}, {text: 'Its largest value'}, {text: 'Half its largest value'}],
      runs: [{angle: 0}, {angle: 90}],
      why: 'The emf follows the rate of change of flux, not the flux. Face-on, the flux has stopped rising and is about to fall, so for that instant it is not changing.',
    },
    challenges: [
      {text: 'Find an angle of largest positive emf.', start: {angle: 0}, hit: v => n(v, 'angle') === 90, hint: v => 'Turn it until the coil lies edge-on to the field.'},
      {text: 'Find the angle where the emf is largest, but reversed.', start: {angle: 90}, hit: v => n(v, 'angle') === 270, hint: v => 'The other edge-on position.'},
      {text: 'Make the emf half its largest value, and positive, with the flux negative.', start: {angle: 90}, hit: v => n(v, 'angle') === 150, hint: v => (n(v, 'angle') < 150 ? 'sin θ is still above a half: turn further.' : 'Turn back.')},
    ],
    probe: (v, s) => { const a = s.meta.anchors; return [[a.state[1] - a.peak[1], 1 - Math.sin(n(v, 'angle') * Math.PI / 180)]]; },
  },
  {
    id: 'tune-the-circuit', chapter: 'leph1-07', title: 'Tune the circuit',
    intro: 'A series circuit of L = 25.48 mH and C = 796 μF on a source of 283 V peak, whose frequency you can turn, like tuning a radio. Find the station.',
    controls: [{id: 'nu', label: 'Frequency', kind: 'slider', min: 20, max: 50, step: 1, unit: 'Hz', start: 50}, {id: 'R', label: 'Resistance', kind: 'slider', min: 2, max: 8, step: 1, unit: 'Ω', start: 3}],
    spec: v => ({verb: 'ac', show: 'resonance', title: 'Tuning a series LCR', L: 25.48e-3, C: 796e-6, R: n(v, 'R'), vm: 283, nu: n(v, 'nu'), full: 141.5}),
    setup: 8,
    reading: v => { const w = 2 * Math.PI * n(v, 'nu'), xl = w * 25.48e-3, xc = 1 / (w * 796e-6), z = Math.hypot(n(v, 'R'), xl - xc); return [['XL', `${fixed(xl, 1)} Ω`], ['XC', `${fixed(xc, 1)} Ω`], ['Impedance', `${fixed(z, 1)} Ω`], ['Peak current', `${fixed(283 / z, 1)} A`]]; },
    predict: {
      question: 'You double the resistance. What happens to the frequency of the peak?',
      options: [{text: 'It stays where it is', right: true}, {text: 'It moves higher'}, {text: 'It moves lower'}],
      runs: [{nu: 35, R: 3}, {nu: 35, R: 6}],
      why: 'The peak is where XL = XC, and that depends only on L and C: ω₀ = 1/√(LC). More resistance lowers the peak and flattens it, but does not move it.',
    },
    challenges: [
      {text: 'Find the resonance: the largest current at R = 3 Ω.', start: {nu: 50, R: 3}, hit: v => n(v, 'nu') === 35 && n(v, 'R') === 3, hint: v => (n(v, 'nu') > 35 ? 'XL is larger than XC: lower the frequency.' : 'XC is larger than XL: raise the frequency.')},
      {text: 'At 50 Hz, the book\'s Example 7.8: make the impedance 5 Ω.', start: {nu: 50, R: 8}, hit: v => n(v, 'nu') === 50 && n(v, 'R') === 3, hint: v => 'XL − XC is 4 Ω here: which R gives a 3-4-5 triangle?'},
      {text: 'Make the peak current more than 100 A.', start: {nu: 35, R: 8}, hit: v => { const w = 2 * Math.PI * n(v, 'nu'); return 283 / Math.hypot(n(v, 'R'), w * 25.48e-3 - 1 / (w * 796e-6)) > 100; }, hint: v => 'Stay at resonance: there the current is limited only by R.'},
    ],
    probe: (v, s) => { const a = s.meta.anchors, w = 2 * Math.PI * n(v, 'nu'); return [[a.base[1] - a.state[1], 283 / Math.hypot(n(v, 'R'), w * 25.48e-3 - 1 / (w * 796e-6))]]; },
  },
  {
    id: 'wind-the-transformer', chapter: 'leph1-07', title: 'Wind the transformer',
    intro: 'A primary of 100 turns takes 10 A at 220 V. Wind the secondary yourself, and see what you get, and what you pay for it.',
    controls: [{id: 'Ns', label: 'Turns on the secondary', kind: 'slider', min: 25, max: 400, step: 25, unit: 'turns', start: 200}],
    spec: v => ({verb: 'ac', show: 'transformer', title: 'Winding a transformer', Np: 100, Ns: n(v, 'Ns'), Vp: 220, Ip: 10, full: 880}),
    setup: 8,
    reading: v => { const r = n(v, 'Ns') / 100; return [['Output voltage', `${fixed(220 * r, 0)} V`], ['Output current', `${fixed(10 / r, 2)} A`], ['Output power', '2200 W']]; },
    predict: {
      question: 'You double the turns on the secondary. What happens to the power you get out?',
      options: [{text: 'It stays the same', right: true}, {text: 'It doubles'}, {text: 'It halves'}],
      runs: [{Ns: 100}, {Ns: 200}],
      why: 'Twice the turns give twice the voltage, but half the current. A transformer cannot make energy: an ideal one hands on all the power it takes, and no more.',
    },
    challenges: [
      {text: 'Make 440 V for a long-distance line.', start: {Ns: 100}, hit: v => n(v, 'Ns') === 200, hint: v => 'Vs/Vp = Ns/Np.'},
      {text: 'Step down to 55 V.', start: {Ns: 200}, hit: v => n(v, 'Ns') === 25, hint: v => 'A quarter of the voltage takes a quarter of the turns.'},
      {text: 'Get 40 A out.', start: {Ns: 200}, hit: v => n(v, 'Ns') === 25, hint: v => 'More current means less voltage: fewer turns.'},
    ],
    probe: (v, s) => { const a = s.meta.anchors; return [[a.vsbase[1] - a.vs[1], 220 * n(v, 'Ns') / 100]]; },
  },
  {
    id: 'tune-the-wave', chapter: 'leph1-08', title: 'Tune the wave',
    intro: 'Every band of the spectrum is the same kind of wave at a different frequency. Turn the frequency and see the band, the wavelength and the energy each photon carries.',
    controls: [{id: 'logf', label: 'Frequency, 10^x Hz', kind: 'slider', min: 5, max: 21, step: .1, unit: '', start: 8}],
    spec: v => ({verb: 'em_waves', show: 'spectrum', title: 'Tuning across the spectrum', mark_nu: 10 ** n(v, 'logf')}),
    setup: 9,
    reading: v => { const nu = 10 ** n(v, 'logf'), lam = 3e8 / nu; return [['Band', bandName(lam)], ['Wavelength', sciText(lam, 'm')], ['Photon energy', sciText(1240e-9 / lam, 'eV')]]; },
    predict: {
      question: 'You double the frequency. What happens to the wavelength?',
      options: [{text: 'It halves', right: true}, {text: 'It doubles'}, {text: 'It stays the same: only the speed changes'}],
      runs: [{logf: 9}, {logf: 9.3}],
      why: 'All these waves travel at c in vacuum, and c = νλ. Twice the frequency must mean half the wavelength.',
    },
    challenges: [
      {text: 'Find light your eyes can see.', start: {logf: 12}, hit: v => bandName(3e8 / 10 ** n(v, 'logf')) === 'visible', hint: v => 'Visible light is 400 to 700 nm: about 4 to 7.5 × 10¹⁴ Hz.'},
      {text: 'Make photons of more than 100 eV, enough to ionise atoms.', start: {logf: 15}, hit: v => 1240e-9 * 10 ** n(v, 'logf') / 3e8 > 100, hint: v => 'E = hν: more energy per photon needs a higher frequency.'},
      {text: 'Find a wave longer than a metre.', start: {logf: 12}, hit: v => 3e8 / 10 ** n(v, 'logf') > 1, hint: v => 'λ = c/ν: a long wave needs a low frequency, below 3 × 10⁸ Hz.'},
    ],
    probe: (v, s) => { const a = s.meta.anchors; return [[a.mark[0] - a.long[0], 4 - Math.log10(3e8 / 10 ** n(v, 'logf'))]]; },
  },
];

/** The book's bands by wavelength, for readings (as the em_waves verb draws them). */
const bandName = (lam: number) => lam >= .1 ? 'radio' : lam >= 1e-3 ? 'microwave' : lam >= 7e-7 ? 'infrared' : lam >= 4e-7 ? 'visible' : lam >= 1e-9 ? 'ultraviolet' : lam >= 1e-12 ? 'X-rays' : 'gamma rays';
const sciText = (x: number, unit: string) => { const e = Math.floor(Math.log10(x)), m = x / 10 ** e; return e >= -2 && e <= 3 ? `${+x.toPrecision(3)} ${unit}` : `${+m.toPrecision(3)} × 10^${e} ${unit}`; };

export const playsFor = (chapter: string) => PLAYS.filter(p => p.chapter === chapter);
export const startValues = (p: Play): Values => Object.fromEntries(p.controls.map(c => [c.id, c.start]));
