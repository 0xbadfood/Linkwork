// Batch 3 (2026-11-05): blank beats in the Class 11 films for forces, work, centre_of_mass, dimensions and rotation,
// each drawn by a new show or option and checked against the book's own numbers.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {check, compile, frame, type Scene} from '../src/index.ts';
import {siUnit} from '../src/verbs/dimensions.ts';

const made = (o: object) => { const r = compile(o as never); assert.deepEqual(r.errors, [], JSON.stringify(o)); return r.scene! as Scene; };
const errs = (o: object) => compile(o as never).errors.join(' ');
const texts = (s: Scene, t: number) => (frame(s, t).props as any[]).filter(p => (p.type === 'text' || p.type === 'readout') && (p.opacity ?? 1) > 0.05).map(p => p.text as string);
const facts = (s: Scene) => (s.meta!.facts as string[]).join(' | ');
const clean = (s: Scene) => { assert.deepEqual(check(s, {every: 3}), []); return s; };

test('forces hang: a rope pulled sideways at P leans at tan θ = F / mg, whatever its length or where F acts', () => {
  // keph1-04 C4 S24: 6 kg, 50 N at the midpoint, g = 10: tan θ = 5/6, θ = 39.8°
  const spec = {verb: 'forces', title: 'Same angle, this setup only', mass: 6, g: 10, hang: {F: 50, cases: [{length: 2, at: 0.5}, {length: 3, at: 0.5}, {length: 3, at: 0.25}]}};
  const s = clean(made(spec));
  assert.ok(Math.abs((s.meta!.theta as number) - 39.806) < 0.01);
  assert.match(facts(s), /θ = 39\.8° from the vertical/);
  // every rope's upper part leans at the same angle from the vertical
  for (let i = 0; i < 3; i++) {
    const p = s.props.find(q => q.id === `upper${i}`) as any;
    assert.ok(Math.abs(Math.atan2(p.x2 - p.x1, p.y2 - p.y1) * 180 / Math.PI - 39.806) < 0.01, `rope ${i}`);
  }
  const shown = texts(s, s.duration - 0.1).join(' | ');
  assert.match(shown, /A longer rope: the same θ/);
  assert.match(shown, /The same rope, F acting higher up: the same θ/);
  assert.match(shown, /θ = 39\.8°/);
  // illustrative: no mass written on the blocks, no numbers, but θ and the words stay
  const il = clean(made({...spec, illustrative: true}));
  assert.ok(!(il.props as any[]).some(p => p.type === 'object' && /\d/.test(p.label ?? '')));
  const ishown = texts(il, il.duration - 0.1).join(' ');
  assert.ok(!/\d/.test(ishown.replace(/Same angle, this setup only/, '')), ishown);
  assert.match(ishown, /θ depends neither on its length nor on where along it F acts/);
  // the errors name the fix
  assert.match(errs({...spec, hang: {cases: [{length: 2, at: 0.5}]}}), /hang\.F is the horizontal force/);
  assert.match(errs({...spec, hang: {F: 50, cases: [{length: 2, at: 1}]}}), /at is where F acts.*0\.1 to 0\.9/);
  assert.match(errs({...spec, hang: {F: 50, cases: []}}), /hang\.cases is 1 to 3 ropes/);
  assert.match(errs({...spec, forces: [{name: 'W', kind: 'weight'}]}), /leave out ramp, forces and show/);
  assert.match(errs({verb: 'forces', hang: {F: 50, cases: [{length: 2, at: 0.5}]}}), /hang needs the hanging mass/);
  assert.match(errs({...spec, hang: {F: 500, cases: [{length: 2, at: 0.5}]}}), /over 70°/);
});

test('work fall: the raindrop of Example 5.3, gravity +10 J, resistance −8.75 J, ΔK 1.25 J', () => {
  const spec = {verb: 'work', title: 'Friction Does Negative Work', body: 'ball', mass: 0.001, g: 10, fall: {h: 1000, v: 50}};
  const s = clean(made(spec));
  const fx = facts(s);
  assert.match(fx, /work done by gravity = mgh = 10 J/);
  assert.match(fx, /work done by the resistive force = −8\.75 J/);
  assert.match(fx, /ΔK = 1\.25 J/);
  const shown = texts(s, s.duration - 0.1).join(' | ');
  assert.match(shown, /mgh = 0\.001 × 10 × 1000 = 10 J/);
  assert.match(shown, /Its work = ΔK − mgh = 1\.25 − 10 = −8\.75 J/);
  // the caption fits the geometry: a falling body's weight does work
  assert.ok(!/N and mg do no work/.test(shown));
  assert.match(shown, /Gravity acts along the fall: its work is positive/);
  // the bars' lengths are in the ratio of the works: 10 : 8.75 : 1.25
  const w = (id: string) => (frame(s, s.duration - 0.1).props.find(p => p.id === id) as any).w as number;
  assert.ok(Math.abs(w('br') / w('bg') - 0.875) < 1e-3 && Math.abs(w('bk') / w('bg') - 0.125) < 1e-3);
  // a constant resistive force instead: −R h
  const r = made({...spec, fall: {h: 1000, resist: 0.00875}});
  assert.match(facts(r), /resistive force = −8\.75 J/);
  // the errors
  assert.match(errs({...spec, fall: {h: 1000, v: 200}}), /reaches only 141 m\/s with no resistance/);
  assert.match(errs({...spec, fall: {h: 1000, v: 50, resist: 0.001}}), /not both/);
  assert.match(errs({...spec, fall: {h: 10, resist: 0.02}}), /at least its weight/);
  assert.match(errs({...spec, force: {magnitude: 1}}), /leave out force, friction, d, show and body/);
});

test("work on a level floor still says N and mg do no work, and says why: it is the floor's geometry", () => {
  const s = made({verb: 'work', mass: 2, force: {magnitude: 10, angle: 30}, friction: {mu: 0.2}, d: 5});
  assert.ok(texts(s, s.duration - 0.1).some(t => t === 'On the level floor N and mg do no work: they act across the motion'));
});

test('work climb: equal masses, the same height, the same work mgh; the stopwatches stop at the climbing times', () => {
  const spec = {verb: 'work', title: 'Same Climb, Different Times', mass: 60, climb: {h: 12, climbers: [{t: 20}, {t: 35}]}};
  const s = clean(made(spec));
  assert.match(facts(s), /each climber does work mgh = 7056 J/);
  const shown = texts(s, s.duration - 0.1).join(' | ');
  assert.match(shown, /A reaches the top first: the same work in less time/);
  assert.ok(!/power/i.test(shown), 'power is the next beat');
  // the watches run in true proportion and stop at 20 s and 35 s
  const a = (id: string) => (s.props.find(p => p.id === id) as any).keys.a as [number, number][];
  const [wa, wb] = [a('watch0'), a('watch1')];
  assert.equal(wa.at(-1)![1], 20); assert.equal(wb.at(-1)![1], 35);
  assert.ok(Math.abs((wa.at(-1)![0] - wa[0][0]) / (wb.at(-1)![0] - wb[0][0]) - 20 / 35) < 1e-9);
  assert.ok(s.duration - wb.at(-1)![0] >= 1, 'the result holds a second before the end');
  // illustrative: the watches lose their digits, the words stay
  const il = made({...spec, illustrative: true});
  assert.ok((il.props as any[]).filter(p => p.name === 'stopwatch').every(p => p.params?.digits === 'none'));
  assert.ok(!texts(il, il.duration - 0.1).some(t => /\d/.test(t)));
  assert.match(errs({...spec, climb: {h: 12, climbers: [{t: 20}]}}), /2 or 3 people/);
  assert.match(errs({...spec, climb: {h: 12, climbers: [{t: 20}, {t: -1}]}}), /climbers 2: t is the time/);
  assert.match(errs({...spec, fall: {h: 1}}), /fall or climb, not both/);
});

const lamina = {shape: 'polygon', vertices: [[0, 0], [3, 0], [3.6, 1.4], [1.6, 2.6], [0, 1.8]]};
const centroid = (v: number[][]) => {
  let A = 0, x = 0, y = 0;
  v.forEach((p, i) => { const q = v[(i + 1) % v.length], c = p[0] * q[1] - q[0] * p[1]; A += c; x += (p[0] + q[0]) * c; y += (p[1] + q[1]) * c; });
  return [x / (3 * A), y / (3 * A)];
};

test('centre_of_mass hang: hung from A and B, each plumb line passes through the CM; the lines cross at the CG', () => {
  const s = clean(made({verb: 'centre_of_mass', title: 'Finding the CG', bodies: [lamina], hang: {from: [[0, 1.8], [3, 0]], cross: true}}));
  const [cx, cy] = centroid(lamina.vertices);
  assert.deepEqual(s.meta!.cm, [Math.round(cx * 1e6) / 1e6, Math.round(cy * 1e6) / 1e6]);
  for (const i of [0, 1]) {
    // the hung copy's own centroid lies on the plumb line through the pivot, straight below it
    const body = s.props.find(p => p.id === `b${i}`) as any, plumb = s.props.find(p => p.id === `plumb${i}`) as any;
    const [hx, hy] = centroid(body.points);
    assert.ok(Math.abs(hx - plumb.x1) < 1e-9 && hy < plumb.y1, `copy ${i}`);
  }
  assert.ok(s.props.some(p => p.id === 'cg'));
  assert.match(texts(s, s.duration - 0.1).join(' | '), /That point is the centre of gravity/);
});

test('centre_of_mass hang guesses: "?" along each vertical line and no point marked (the misconception)', () => {
  const s = clean(made({verb: 'centre_of_mass', title: 'Possible Points on One Line', bodies: [lamina], hang: {from: [[0, 1.8], [3, 0]], guesses: true}, illustrative: true}));
  assert.ok(!s.props.some(p => ['cg', 'cm'].includes(p.id)));
  const shown = texts(s, s.duration - 0.1);
  assert.equal(shown.filter(t => t === '?').length, 6);
  assert.ok(shown.includes('That is not right'));
  assert.match(shown.join(' '), /A common misconception: the CG is just some point on one of these lines/);
  // the errors
  const base = {verb: 'centre_of_mass', bodies: [lamina]};
  assert.match(errs({...base, hang: {from: [[0, 1.8]], cross: true}}), /cross needs two or more points/);
  assert.match(errs({...base, hang: {from: [[9, 9]]}}), /is not on the body/);
  assert.match(errs({...base, hang: {from: [[1.63, 1.1]]}}), /is at the CM/);
  assert.match(errs({...base, hang: {from: [[0, 1.8], [3, 0]], cross: true, guesses: true}}), /give one/);
  assert.match(errs({verb: 'centre_of_mass', bodies: [{shape: 'rod', length: 2}], hang: {from: [[1, 0]]}}), /a rod hangs straight down/);
  assert.match(errs({...base}), /a polygon has no lines of symmetry/);
});

test('dimensions: moment of inertia built factor by factor, [M L²], SI unit kg m²; more rotational quantities', () => {
  assert.equal(siUnit([1, 2, 0, 0, 0]), 'kg m²');
  assert.equal(siUnit([1, 2, -1, 0, 0]), 'kg m² s⁻¹');
  assert.equal(siUnit([1, 2, -2, 0, 0]), 'kg m² s⁻²');
  const s = clean(made({verb: 'dimensions', title: 'Dimensions and SI Unit', mode: 'formula', quantity: 'moment of inertia', factors: [['mass', 1], ['radius', 2]], si: true}));
  const shown = texts(s, s.duration - 0.1);
  assert.ok(shown.includes('[M]') && shown.includes('[L²]'));
  assert.ok(shown.includes('moment of inertia = mass × radius²  →  [M L²]'));
  assert.ok(shown.includes('SI unit: kg m²'));
  made({verb: 'dimensions', mode: 'formula', quantity: 'angular momentum', factors: [['moment of inertia', 1], ['angular velocity', 1]], si: true});
  made({verb: 'dimensions', mode: 'formula', quantity: 'torque', factors: [['moment of inertia', 1], ['angular acceleration', 1]]});
  assert.match(errs({verb: 'dimensions', mode: 'formula', quantity: 'moment of inertia', factors: [['mass', 1], ['radius', 1]]}), /is \[M L²\] but its factors give \[M L\]/);
  assert.match(errs({verb: 'dimensions', mode: 'deduce', quantity: 'period', depends: ['length', 'g'], si: true}), /si .* goes with mode formula/);
});

test('rotation rpm: a motor wheel from 1200 to 3120 rpm in 16 s (Example 6.11), α = 4π rad/s², rpm read live', () => {
  const spec = {verb: 'rotation', title: 'A Motor Wheel Speeds Up', body: 'wheel', rpm: [1200, 3120], t: 16};
  const s = clean(made(spec));
  assert.ok(Math.abs((s.meta!.alpha as number) - 4 * Math.PI) < 1e-9);
  assert.match(facts(s), /ω0 = 2π × 1200 \/ 60 = 40π rad\/s/);
  assert.match(facts(s), /104π rad\/s/);
  assert.match(facts(s), /α = \(ω − ω0\) \/ t = 4π rad\/s²/);
  // the readouts: halfway through, 8 s and 2160 rpm; at the end 16 s and 3120 rpm
  const read = (t: number, id: string) => (frame(s, t).props.find(p => p.id === id) as any).text as string;
  const ends = s.props.find(p => p.id === 'rorpm') as any, keys = ends.measures.v.keys as [number, number][];
  const mid = (keys[1][0] + keys.at(-1)![0]) / 2;
  assert.equal(read(mid, 'rot'), 't = 8.0 s');
  assert.equal(read(mid, 'rorpm'), 'speed = 2160 rpm');
  assert.equal(read(s.duration - 0.05, 'rorpm'), 'speed = 3120 rpm');
  assert.ok(s.duration - keys.at(-1)![0] >= 1);
  // nothing the beat does not say: no ω, α or I on screen
  const shown = texts(s, s.duration - 0.05).join(' | ');
  assert.ok(!/[ωαI] =|rad/.test(shown), shown);
  assert.match(shown, /1200 rpm to 3120 rpm in 16 s/);
  // the errors
  assert.match(errs({...spec, omega0: 2}), /leave out omega0, alpha, torque and slide/);
  assert.match(errs({verb: 'rotation', body: 'wheel', rpm: [1200, 3120]}), /with rpm give t/);
  assert.match(errs({...spec, rpm: [1200, 1200]}), /two different speeds/);
  assert.match(errs({...spec, show: ['energy']}), /show takes only 'particles'/);
});
