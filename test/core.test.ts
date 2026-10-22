import assert from 'node:assert/strict';
import {test} from 'node:test';
import {check, compile, dist, frame, ladderFacts, place, poseAt, RIGS, solve, svg, valueAt, wavelengthColour,
  type Rig, type Scene} from '../src/index.ts';

const figure = RIGS.figure;

test('the figure rig is valid and 176 units tall standing', async () => {
  const {rigErrors} = await import('../src/rig.ts');
  assert.deepEqual(rigErrors(figure), []);
  const p = place(figure, poseAt(figure, [{t: 0, pose: 'stand'}], 0), [0, 0]);
  const top = p.joints.get('crown')![1], bottom = Math.max(p.joints.get('foot_l')![1], p.joints.get('foot_r')![1]);
  assert.ok(Math.abs(bottom - top - 176) < 3, `height ${bottom - top}`);
});

test('poses ease angles the short way round and keep bone lengths', () => {
  const keys = [{t: 0, pose: 'stand'}, {t: 1, pose: 'cheer'}];
  for (const t of [0, 0.3, 0.5, 0.9, 1]) {
    const p = place(figure, poseAt(figure, keys, t), [0, 0]);
    for (const b of figure.bones) assert.ok(Math.abs(dist(p.joints.get(b.from)!, p.joints.get(b.to)!) - b.length) < 1e-6);
  }
  const mid = poseAt(figure, [{t: 0, pose: {spine: 170}}, {t: 1, pose: {spine: -170}}], 0.5);
  assert.ok(Math.abs(Math.abs(mid.spine) - 180) < 1e-6, 'goes through 180, not 0');
});

test('two-bone IK reaches a target and keeps the root', () => {
  const placed = place(figure, poseAt(figure, undefined, 0), [100, 100]);
  const target: [number, number] = [150, 60];
  const s = solve(figure, placed, [{joint: 'hand_l', at: target}]);
  assert.ok(s.residual < 0.5, `residual ${s.residual}`);
  assert.deepEqual(s.joints.get('hip'), [100, 100]);
  assert.ok(dist(s.joints.get('hand_l')!, target) < 0.5);
});

test('a closed loop: a ladder sliding between a wall and the floor keeps its length', () => {
  const ladder: Rig = {id: 'ladder', version: 1, root: 'foot', solve: 'all',
    bones: [{id: 'rails', from: 'foot', to: 'top', length: 300, angle: 60}],
    sliders: [{joint: 'foot', through: [[0, 0], [1, 0]]}, {joint: 'top', through: [[-200, 0], [-200, -1]]}]};
  const placed = place(ladder, {}, [0, 0]);
  const s = solve(ladder, placed, [], {sliders: [{joint: 'foot', through: [[0, 0], [1, 0]]}, {joint: 'top', through: [[-200, 0], [-200, -1]]}]}, 200);
  assert.ok(s.residual < 0.5, `residual ${s.residual}`);
  assert.ok(Math.abs(s.joints.get('top')![0] + 200) < 0.5 && Math.abs(s.joints.get('foot')![1]) < 0.5);
});

test('keys ease and hold', () => {
  assert.equal(valueAt([[0, 0], [1, 10, 'linear']], 0.5), 5);
  assert.equal(valueAt([[0, 0], [1, 10, 'hold']], 0.99), 0);
  assert.equal(valueAt([[0, 0], [1, 10]], 2), 10);
});

test('the energy ladder gets hydrogen right', () => {
  const facts = ladderFacts({verb: 'energy_ladder', events: [{at: 2, kind: 'absorb', from: 1, to: 3}, {at: 5, kind: 'emit', from: 3, to: 2}]});
  assert.equal(facts[0].energy_ev, 12.089);
  assert.equal(facts[0].band, 'ultraviolet');
  assert.equal(facts[1].wavelength_nm, 656.4);             // H-alpha, the red Balmer line
  assert.equal(facts[1].colour_name, 'red');
  assert.equal(wavelengthColour(656.4), '#ff0000');
});

test('the energy ladder refuses impossible events', () => {
  const bad = compile({verb: 'energy_ladder', events: [{at: 2, kind: 'absorb', from: 2, to: 1}, {at: 3, kind: 'emit', from: 1, to: 9}]} as any);
  assert.equal(bad.scene, undefined);
  const text = bad.errors.join('\n');
  assert.match(text, /the electron is on level 1, not 2/);
  assert.match(text, /absorbing a photon moves the electron up/);
  assert.match(text, /less than 2.5 s after/);
  assert.match(text, /level 9 is not one of the levels/);
});

test('the number line refuses hops off the line and hops that overlap', () => {
  const bad = compile({verb: 'number_line', range: [-3, 3], start: 0, hops: [{at: 1, by: 2}, {at: 1.5, by: 4}]} as any);
  assert.match(bad.errors.join('\n'), /before the previous hop has landed/);
  assert.match(bad.errors.join('\n'), /lands on 6, off the line/);
});

test('the examples compile, pass every check and draw', async () => {
  const {readFileSync, readdirSync} = await import('node:fs');
  for (const f of readdirSync('examples').filter(x => x.endsWith('.json'))) {
    const {scene, errors} = compile(JSON.parse(readFileSync(`examples/${f}`, 'utf8')));
    assert.deepEqual(errors, [], f);
    assert.deepEqual(check(scene!), [], f);
    assert.match(svg(scene!, scene!.duration / 2), /^<svg /);
  }
});

test('the checks catch an unmeant jump, leaving the frame and sinking through a floor', () => {
  const scene: Scene = {linkwork: 1, width: 400, height: 300, fps: 10, duration: 1, surfaces: [{x0: 0, x1: 400, y: 250}], props: [],
    actors: [{id: 'a', rig: 'figure', at: [100, 250], base: [{t: 0, at: [100, 250]}, {t: 0.5, at: [100, 250]}, {t: 0.6, at: [390, 290], ease: 'linear'}]}]};
  const errors = check(scene).join('\n');
  assert.match(errors, /moves too fast to follow/);
  assert.match(errors, /leaves the frame/);
  assert.match(errors, /sinks through the surface/);
  scene.actors[0].blink = [[0.45, 0.65]];
  assert.doesNotMatch(check(scene).join('\n'), /too fast/);
});

test('frame is pure: the same time gives the same drawing', () => {
  const {scene} = compile({verb: 'number_line', range: [-2, 4], start: 0, hops: [{at: 0.6, by: 3}]} as any);
  assert.equal(svg(scene!, 1.1), svg(scene!, 1.1));
  assert.equal(frame(scene!, 1.1).actors.length, 1);
});

test('the sliding ladder keeps its length and its top on the wall, and its readouts match the geometry', async () => {
  const {scene} = compile({verb: 'sliding_ladder', length: 5, from_angle: 70, to_angle: 30, start: 1, slide_time: 4} as any);
  const wall = 0.16 * scene!.width, perM = 0.66 * scene!.height / 5;
  for (const t of [0, 1.5, 3, 5, 6]) {
    const f = frame(scene!, t), lad = f.actors[0];
    const foot = lad.joints.get('foot')!, top = lad.joints.get('top')!;
    assert.ok(Math.abs(dist(foot, top) - 5 * perM) < 1, `length at ${t}`);
    assert.ok(Math.abs(top[0] - wall) < 1, `top on the wall at ${t}`);
    const x = (foot[0] - wall) / perM, y = (0.84 * scene!.height - top[1]) / perM;
    const text = (f.props.find(p => p.id === 'ro-x') as any).text as string;
    assert.equal(text, `base   x = ${x.toFixed(2)} m`);
    assert.ok(Math.abs(x * x + y * y - 25) < 0.05);
  }
});

test('the pendulum keeps time: the bob is back where it started after each period', () => {
  const {scene} = compile({verb: 'pendulum', length: 1, amplitude: 10, swings: 2, release: 1} as any);
  const T = (scene!.meta as any).period_s;
  assert.ok(Math.abs(T - 2 * Math.PI * Math.sqrt(1 / 9.8)) < 1e-3);
  const bob = (t: number) => frame(scene!, t).actors[0].joints.get('bob')!;
  assert.ok(dist(bob(1), bob(1 + T)) < 0.5 && dist(bob(1), bob(1 + 2 * T)) < 0.5);
  assert.ok(dist(bob(1), bob(1 + T / 2)) > 50, 'half a period later it is on the other side');
});

test('the compass draws at its radius all the way round', () => {
  const {scene} = compile({verb: 'compass_arc', radius: 4, sweep: 360, start: 1, draw_time: 3} as any);
  const perCm = (scene!.meta as any).px_per_cm;
  const f = frame(scene!, 4.5);
  const arc = f.props.find(p => p.id === 'arc') as any;
  const centre = f.actors[0].joints.get('needle')!;
  assert.ok(arc.points.length > 80);
  for (const p of arc.points) assert.ok(Math.abs(dist(p, centre) / perCm - 4) < 0.02);
  assert.ok(dist(arc.points[0], arc.points[arc.points.length - 1]) < 1, 'the circle closes');
});

test('the slider-crank piston follows x = r cos θ + √(l² − r² sin² θ)', async () => {
  const {pistonX} = await import('../src/verbs/mechanisms.ts');
  const {scene} = compile({verb: 'slider_crank', crank: 5, rod: 15, rpm: 20, turns: 1, start: 1} as any);
  const perCm = (scene!.meta as any).px_per_cm;
  for (const t of [1, 1.4, 2.2, 2.9, 3.7]) {
    const j = frame(scene!, t).actors[0].joints;
    const theta = 120 * (t - 1);
    const x = (j.get('piston')![0] - j.get('center')![0]) / perCm;
    assert.ok(Math.abs(x - pistonX(5, 15, theta)) < 0.02, `t ${t}: ${x} vs ${pistonX(5, 15, theta)}`);
  }
});

test('joint limits: a backwards knee is refused', () => {
  const scene: Scene = {linkwork: 1, width: 600, height: 400, fps: 10, duration: 0.2, props: [],
    actors: [{id: 'a', rig: 'figure', at: [300, 350], pose: [{t: 0, pose: {shin_l: 60}}]}]};
  assert.match(check(scene).join('\n'), /shin_l bends to 60°, outside/);
});

test('every verb has a valid card whose example compiles and passes every check', async () => {
  const {CARDS, cardErrors, VERBS} = await import('../src/index.ts');
  for (const name of Object.keys(VERBS)) {
    assert.deepEqual(cardErrors(name, CARDS[name]), [], name);
    const {scene, errors} = compile(CARDS[name].example as {verb: string});
    assert.deepEqual(errors, [], `${name} example`);
    assert.deepEqual(check(scene!, {every: 3}), [], `${name} example checks`);
  }
});
