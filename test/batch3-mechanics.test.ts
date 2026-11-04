// Batch 3 mechanics verbs (2026-11-05): a bob in a vertical circle (keph1-05 C8 S22 "Bob at Point C") and a collision
// in two dimensions (C11 S05 "Two bodies leave at angles", C13 S13 "Off-centre collision"), checked against the book.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {check, compile, frame, type Scene} from '../src/index.ts';
import {vcMotion} from '../src/verbs/vertical-circle.ts';
import {collide2d} from '../src/verbs/collision.ts';

const made = (o: object) => { const r = compile(o as never); assert.deepEqual(r.errors, [], JSON.stringify(o)); return r.scene! as Scene; };
const texts = (s: Scene, t: number) => (frame(s, t).props as any[]).filter(p => p.type === 'text' && (p.opacity ?? 1) > 0.05).map(p => p.text as string);
const near = (a: number, b: number, tol = 1e-3) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} vs ${b}`);
const errs = (o: object) => compile(o as never).errors.join(' ');

test("vertical circle, the book's bob (Example 5.7): v0 = √(5gL), T = 6mg at A, T = 0 and v = √(gL) at C, KB/KC = 3", () => {
  const g = 9.8, L = 1.5, v0 = Math.sqrt(5 * g * L);
  const path = vcMotion(L, v0, g, q => q.th >= Math.PI);
  near(path[0].T, 6 * g);                                         // per unit mass: T = mv0²/L + mg = 6mg
  const top = path[path.length - 1];
  near(Math.hypot(...top.v), Math.sqrt(g * L), 2e-3);
  assert.ok(Math.abs(top.T) < 0.01 * g, `T at C ${top.T}`);
  assert.ok(Math.abs(top.v[1]) < 0.01 * Math.hypot(...top.v) && top.v[0] < 0, 'moving horizontally, to the left, at C');
  const B = path.find(q => q.th >= Math.PI / 2)!;
  near(Math.hypot(...B.v) ** 2 / (g * L), 3, 1e-2);                // vB = √(3gL)
  // the scene's facts, in newtons when a mass is given
  const facts = made({verb: 'vertical_circle', L: 2, mass: 0.5}).meta!.facts as string[];
  assert.ok(facts.includes('tension at A = 29.40 N'), facts.join('; '));
  assert.ok(facts.includes('speed at C = 4.43 m/s') && facts.includes('tension at C = 0 N') && facts.includes('KB/KC = 3'), facts.join('; '));
});

test('vertical circle: slower than √(5gL) the string goes slack before C, where cos θ = (2gL − v0²)/3gL; slower than √(2gL) it only swings', () => {
  const g = 9.8, L = 1, v0 = 6;
  const path = vcMotion(L, v0, g, () => false);
  const slack = path.find(q => !q.taut)!;
  near(Math.cos(slack.th), (2 * g * L - v0 * v0) / (3 * g * L), 5e-3);
  const s = made({verb: 'vertical_circle', v0, L});
  assert.ok(texts(s, s.duration).some(t => /goes slack and the bob falls inside the circle/.test(t)));
  const swing = vcMotion(L, 4, g, q => q.t > 0.05 && q.th <= 0);
  near(Math.max(...swing.map(q => 1 - Math.cos(q.th))), 16 / (2 * g * L), 1e-2);   // h = v0²/2g
  assert.deepEqual(check(s, {every: 3}), []);
});

test('vertical circle top: only the instant at C, string slack, velocity horizontal; illustrative keeps the words, no numbers', () => {
  const s = made({verb: 'vertical_circle', title: 'Bob at Point C', show: 'top', weight: false, illustrative: true});
  const end = frame(s, s.duration - 0.05).props as any[];
  const v = end.find(p => p.id === 'v');
  assert.ok(Math.abs(v.y1 - v.y2) < 1 && v.x2 < v.x1, 'the velocity is horizontal, to the left');
  const bob = end.find(p => p.id === 'bob'), C = (s.meta!.anchors as any).C;
  assert.ok(Math.hypot(bob.x - C[0], bob.y - C[1]) < 2, 'the bob ends at C');
  // the string is no longer straight: its pieces bend
  const pieces = end.filter(p => /^string\d+$/.test(p.id)), dirs = pieces.map(p => Math.atan2(p.y2 - p.y1, p.x2 - p.x1));
  assert.ok(Math.max(...dirs) - Math.min(...dirs) > 0.2, 'slack');
  assert.ok(!end.some(p => p.id === 'T' || p.id === 'mg' || p.id === 'fall'), 'no tension, no weight, no fall drawn');
  const shown = texts(s, s.duration - 0.05).join(' | ');
  assert.match(shown, /string goes slack/); assert.match(shown, /moving horizontally/);
  assert.ok(!/\d/.test(shown.replace('Bob at Point C', '')), shown);
  // the motion is over well before the end
  const lastKey = Math.max(...(s.props as any[]).flatMap(p => Object.values(p.keys ?? {}).flat().map((k: any) => k[0])));
  assert.ok(s.duration - lastKey >= 1, `${s.duration} vs ${lastKey}`);
  assert.deepEqual(check(s, {every: 3}), []);
});

test('vertical circle forces: T − mg cos θ = mv²/L at the angle held', () => {
  const s = made({verb: 'vertical_circle', show: 'forces', at: 60, L: 1});
  const g = 9.8, v0 = Math.sqrt(5 * g), v2 = v0 * v0 - 2 * g * (1 - 0.5);
  assert.ok((s.meta!.facts as string[]).some(f => f === `at 60° from A: v = ${Math.sqrt(v2).toFixed(2)} m/s, T = ${((v2 + g * 0.5) / g).toFixed(2)} mg`), (s.meta!.facts as string[]).join('; '));
  assert.deepEqual(check(s, {every: 3}), []);
});

test('vertical circle errors name the field and the fix', () => {
  assert.match(errs({verb: 'vertical_circle', show: 'loop'}), /show is circle, top, forces/);
  assert.match(errs({verb: 'vertical_circle', L: -1}), /L is the string length/);
  assert.match(errs({verb: 'vertical_circle', show: 'top', v0: 5}), /top needs .* at least √\(5gL\) = 7 m\/s/);
  assert.match(errs({verb: 'vertical_circle', show: 'forces', at: 170, v0: 6}), /never reaches 170°/);
  assert.match(errs({verb: 'vertical_circle', at: 30}), /at belongs to show forces/);
  assert.match(errs({verb: 'vertical_circle', points: ['D']}), /points are A/);
});

test('collision in two dimensions: momentum along x and y, energy when elastic; equal masses part at right angles', () => {
  for (const [m1, m2, b, e] of [[1, 1, 0.3, 1], [1, 1, 0.8, 1], [2, 1, 0.5, 1], [1, 3, 0.5, 0.6]]) {
    const r = collide2d(m1, m2, 2, b, e);
    near(m1 * r.v1f[0] + m2 * r.v2f[0], m1 * 2, 1e-9);
    near(m1 * r.v1f[1] + m2 * r.v2f[1], 0, 1e-9);
    near(r.theta2, Math.asin(b) * 180 / Math.PI, 1e-9);           // m2 leaves along the line of centres
    if (e === 1) near(r.K1, r.K0, 1e-9); else assert.ok(r.K1 < r.K0);
    if (m1 === m2 && e === 1) near(r.theta1 + r.theta2, 90, 1e-9);
  }
  // Example 5.12: the target sent at 37° → the cue at 53°
  const ex = collide2d(1, 1, 2, Math.sin(37 * Math.PI / 180));
  near(ex.theta1, 53, 1e-9);
});

test('collision in two dimensions with b = 0 is the one-dimensional collision (θ1 = θ2 = 0)', () => {
  const eq = collide2d(1, 1, 3, 0);
  near(Math.hypot(...eq.v1f), 0, 1e-9); near(eq.v2f[0], 3, 1e-9); near(eq.theta2, 0, 1e-9);
  const un = collide2d(3, 1, 2, 0);                               // v1f = (m1 − m2)/(m1 + m2) v1i, v2f = 2m1/(m1 + m2) v1i
  near(un.v1f[0], 1, 1e-9); near(un.v2f[0], 3, 1e-9); near(un.v1f[1], 0, 1e-9); near(un.theta1, 0, 1e-9);
  const s = made({verb: 'collision_2d', b: 0, illustrative: true});
  assert.ok(texts(s, s.duration).some(t => /head-on hit/i.test(t)));
  assert.ok(!(s.props as any[]).some(p => /^arctheta/.test(p.id)), 'no angle marks for zero angles');
});

test('collision beats: angles named but no velocity names (C11 S05); an off-centre hit with b marked (C13 S13)', () => {
  const s05 = made({verb: 'collision_2d', title: 'Two bodies leave at angles', m1: 1.5, m2: 1, b: 0.5, explain: false, illustrative: true});
  const shown = texts(s05, s05.duration - 0.05);
  for (const want of ['θ₁', 'θ₂', 'm1', 'm2']) assert.ok(shown.includes(want), `${want} in ${shown.join(' | ')}`);
  assert.ok(!shown.some(t => /v1f|v2f|\d\.\d/.test(t)), shown.join(' | '));
  assert.deepEqual(check(s05, {every: 3}), []);
  const s13 = made({verb: 'collision_2d', title: 'Off-centre collision', b: 0.3, angles: false, names: false, impact: true, explain: false, illustrative: true});
  const t13 = texts(s13, s13.duration - 0.05);
  assert.ok(t13.includes('b') && t13.some(t => /off-centre hit sends the two balls apart at an angle/.test(t)), t13.join(' | '));
  assert.ok(!t13.some(t => /θ|m1|right angles/.test(t)), t13.join(' | '));
  // velocity names survive an illustrative scene; their values do not
  const named = texts(made({verb: 'collision_2d', velocities: 'names', illustrative: true}), 8);
  assert.ok(named.includes('v1f') && named.includes('v2f'), named.join(' | '));
  const valued = texts(made({verb: 'collision_2d', velocities: 'values', illustrative: true}), 8);
  assert.ok(!valued.some(t => /m\/s/.test(t)), valued.join(' | '));
});

test('collision_2d errors name the field and the fix', () => {
  assert.match(errs({verb: 'collision_2d', b: 1}), /1 or more is a miss/);
  assert.match(errs({verb: 'collision_2d', e: 1.5}), /coefficient of restitution, 0 to 1/);
  assert.match(errs({verb: 'collision_2d', components: true}), /give velocities names or values/);
  assert.match(errs({verb: 'collision_2d', velocities: 'arrows'}), /velocities is none, names, values/);
  assert.match(errs({verb: 'collision_2d', m1: 1, m2: 50}), /at most 20 times/);
});

test('every show of both verbs passes the scene checks, full frame and half', () => {
  const specs = [{verb: 'vertical_circle'}, {verb: 'vertical_circle', v0: 6}, {verb: 'vertical_circle', v0: 4}, {verb: 'vertical_circle', show: 'top', v0: 8},
    {verb: 'vertical_circle', show: 'top', approach: false}, {verb: 'vertical_circle', show: 'forces', at: 130},
    {verb: 'collision_2d', velocities: 'values', components: true, impact: true}, {verb: 'collision_2d', m1: 1, m2: 4, b: 0.7, velocities: 'names'},
    {verb: 'collision_2d', m1: 4, m2: 1, b: 0.9, e: 0.5}];
  for (const spec of specs) for (const width of [1920, 960]) {
    const r = width === 1920 ? compile(spec as never) : compile({compound: true, parts: [{id: 'a', box: [0, 0, width, 1080], spec}]} as never);
    assert.deepEqual(r.errors, [], JSON.stringify(spec));
    assert.deepEqual(check(r.scene!, {every: 3}), [], `${JSON.stringify(spec)} at ${width}`);
  }
});
