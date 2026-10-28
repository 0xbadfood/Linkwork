import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {check, compile, dist, frame, toPlane, ladderFacts, place, poseAt, RIGS, solve, svg, valueAt, wavelengthColour, type Key,
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

test('objects draw, check and roll as far as they move', async () => {
  const {OBJECTS, objectItems, check, frame} = await import('../src/index.ts');
  for (const name of Object.keys(OBJECTS)) assert.ok(objectItems({name, x: 400, y: 400}, {t: 1, travel: 0, speed: 0}, name).length > 0, name);
  const bad = {linkwork: 1, width: 800, height: 600, fps: 30, duration: 1, actors: [], props: [{id: 'o', type: 'object', name: 'rocket', x: 1, y: 1}]};
  assert.match(check(bad as never).join(' '), /unknown object "rocket"/);
  // A car keyed 0 → 2πR along the ground: its wheels turn exactly once, so the spokes come back where they started.
  const R = 22, scene = {linkwork: 1, width: 1920, height: 1080, fps: 30, duration: 2, actors: [],
    props: [{id: 'car', type: 'object', name: 'car', x: 300, y: 500, keys: {x: [[0, 300], [2, 300 + 2 * Math.PI * R, 'linear']]}}]};
  const spokes = (t: number) => (frame(scene as never, t).props[0] as unknown as {items: {type: string; x1?: number; y1?: number}[]}).items
    .filter(p => p.type === 'line').map(p => [Math.round(p.x1! - 0), Math.round(p.y1!)]);
  const start = spokes(0), end = spokes(2).map(([x, y]) => [x - Math.round(2 * Math.PI * R), y]);
  assert.deepEqual(end, start);
});

test('motion_on_line computes velocities and distance; scale_compare its ratios', async () => {
  const {compile} = await import('../src/index.ts');
  const {scene} = compile({verb: 'motion_on_line', axis: {range: [-4, 8]}, moves: [{t: 0, x: 0}, {t: 3, x: 6}, {t: 4, x: 6}, {t: 7, x: -3}]} as never);
  assert.deepEqual((scene!.meta as {segments: {v: number}[]}).segments.map(g => g.v), [2, 0, -3]);
  assert.equal(scene!.meta!.displacement, -3);
  assert.equal(scene!.meta!.distance, 15);
  assert.match(compile({verb: 'motion_on_line', axis: {range: [0, 5]}, moves: [{t: 0, x: 0}, {t: 1, x: 9}]} as never).errors.join(' '), /off the axis/);
  const sc = compile({verb: 'scale_compare', object: 'bus', length: 12, cases: [{label: 'route', distance: 10000}, {label: 'parking', distance: 15}]} as never).scene!;
  assert.deepEqual((sc.meta as {cases: {ratio: number}[]}).cases.map(c => c.ratio), [0.0012, 0.8]);
});

test('stage: a projectile lands where the formula says, a slider and a roller take their times, collisions keep momentum', async () => {
  const {stageErrors} = await import('../src/verbs/stage.ts');
  const shot = compile({verb: 'stage', width_m: 60, items: [{id: 'b', object: 'ball', x: 1, y: 0, size: 0.5}],
    events: [{t: 0, item: 'b', kind: 'launch', speed: 20, angle: 45}]} as never);
  assert.deepEqual(shot.errors, []);
  const R = 20 * 20 / 9.8, T = 2 * 20 * Math.SQRT1_2 / 9.8;
  assert.match((shot.scene!.meta as {facts: string[]}).facts[0], new RegExp(`lands at x = ${(1 + R).toFixed(2)} m .* after ${T.toFixed(2)} s`));
  const slope = compile({verb: 'stage', width_m: 12, items: [{id: 'w', object: 'wedge', x: 4, size: 4, a: 30},
    {id: 'k', object: 'block', x: 4, size: 0.5}, {id: 'v', object: 'wedge', x: 9, size: 4, a: 30}, {id: 'r', object: 'ring', x: 9, size: 0.5}],
  events: [{t: 0, item: 'k', kind: 'slide', on: 'w'}, {t: 0, item: 'r', kind: 'roll', on: 'v'}]} as never);
  assert.deepEqual(slope.errors, []);
  const [slide, roll] = (slope.scene!.meta as {facts: string[]}).facts;
  assert.match(slide, /a = 4\.9 m\/s²/);
  assert.match(roll, /a = 2\.45 m\/s²/);                       // a ring: g sin θ / 2
  const hit = compile({verb: 'stage', width_m: 12, items: [{id: 'a', object: 'cart', x: 2, mass: 2}, {id: 'c', object: 'cart', x: 6, mass: 2}],
    events: [{t: 0, item: 'a', kind: 'collide', with: 'c', speed: 4, elastic: false, after: 1}]} as never);
  assert.deepEqual(hit.errors, []);
  assert.ok((hit.scene!.meta as {facts: string[]}).facts.some(f => /a moves at 2 m\/s and c at 2 m\/s/.test(f)));
  assert.deepEqual(check(hit.scene!, {every: 3}), []);
  // Roles are enforced, and a shot that leaves the stage is refused.
  assert.ok(stageErrors({verb: 'stage', items: [{id: 'w', object: 'wedge', x: 2}, {id: 't', object: 'table', x: 5}],
    events: [{t: 0, item: 't', kind: 'roll', on: 'w'}]}).some(e => /only a roller/.test(e)));
  assert.ok(stageErrors({verb: 'stage', width_m: 20, items: [{id: 'b', object: 'ball', x: 1}],
    events: [{t: 0, item: 'b', kind: 'launch', speed: 30, angle: 45}]}).some(e => /off the stage/.test(e)));
});

test('general props: a thinker poses, a bulb lights over the head, a stopwatch runs, a speedometer reads its car', () => {
  const out = compile({verb: 'stage', width_m: 24, items: [{id: 'kid', object: 'figure', x: 2}, {id: 'idea', object: 'bulb', x: 2.3, on: 'kid'},
    {id: 'car', object: 'car', x: 7}, {id: 'meter', object: 'speedometer', x: 15, y: 3, follows: 'car', params: {max: 20}},
    {id: 'watch', object: 'stopwatch', x: 20, y: 3}],
  events: [{t: 0.3, item: 'kid', kind: 'pose', pose: 'think'}, {t: 1.6, item: 'idea', kind: 'light'},
    {t: 2, item: 'car', kind: 'move', to: 21, duration: 4}, {t: 2, item: 'watch', kind: 'run', duration: 4}]} as never);
  assert.deepEqual(out.errors, []);
  const scene = out.scene!, keyOf = (id: string) => scene.props.find(p => p.id === id)!.keys!.a as Key[];
  assert.equal(valueAt(keyOf('o-idea'), 1), 0);
  assert.equal(valueAt(keyOf('o-idea'), 2.5), 1);
  assert.ok(Math.abs(valueAt(keyOf('o-watch'), 4) - 2) < 1e-9);               // ran from t = 2: 2 s shown at t = 4
  assert.ok(Math.abs(valueAt(keyOf('o-meter'), 4) - 14 / 4) < 0.05);           // 14 m in 4 s at constant speed
  assert.ok(scene.actors.some(a => a.rig === 'figure'));
  assert.deepEqual(check(scene, {every: 3}), []);
  assert.ok(compile({verb: 'stage', items: [{id: 't', object: 'table', x: 2}], events: [{t: 0, item: 't', kind: 'light'}]} as never).errors.some(e => /only a bulb/.test(e)));
});

test('motion_on_line follows a formula exactly; path_length measures path against displacement', () => {
  const car = compile({verb: 'motion_on_line', axis: {range: [0, 20]}, object: 'car', formula: {expr: '0.08*x^3', t: [0, 6]}, readouts: ['t', 'x', 'v'], speedometer: {max: 10}} as never);
  assert.deepEqual(car.errors, []);
  assert.match((car.scene!.meta as {facts: string[]}).facts.join(' '), /at t = 3 s, v = 2\.16 m\/s/);
  assert.ok(compile({verb: 'motion_on_line', axis: {range: [0, 10]}, formula: {expr: '0.08*x^3', t: [0, 6]}} as never).errors.some(e => /leaves the axis/.test(e)));
  const trip = compile({verb: 'path_length', area: [200, 120], duration: 8, trip_seconds: 240, back: true, route: [[10, 60], [190, 60]]} as never);
  assert.deepEqual(trip.errors, []);
  const meta = trip.scene!.meta as {path: number; displacement: number; facts: string[]};
  assert.equal(meta.path, 360);
  assert.equal(meta.displacement, 0);
  assert.match(meta.facts.join(' '), /average speed 1\.5 m\/s; size of average velocity 0 m\/s/);
  assert.deepEqual(check(trip.scene!, {every: 3}), []);
});

test('an illustrative scene shows shape and motion with every number hidden', () => {
  const spec = {verb: 'motion_on_line', title: 'Speeding up', axis: {range: [0, 20]}, object: 'car', formula: {expr: '0.5*t^2', t: [0, 6]},
    readouts: ['t', 'x', 'v'], speedometer: {max: 10}, graph: true, illustrative: true};
  const out = compile(spec as never);
  assert.deepEqual(out.errors, []);
  const scene = out.scene!;
  assert.ok(!scene.props.some(p => p.type === 'readout'));
  assert.ok(!scene.props.some(p => p.type === 'text' && p.id !== 'title' && /\d/.test(p.text)));
  assert.ok(scene.props.filter(p => p.type === 'axes').every(p => (p as {numbers?: boolean}).numbers === false));
  assert.deepEqual((scene.meta as {facts: string[]}).facts, []);
  assert.ok(!/>\s*[\d.]+ m\/s\s*</.test(svg(scene, 3)));                     // the speedometer shows no digits
  assert.deepEqual(check(scene, {every: 3}), []);
});

test('motion_on_line: a ball thrown up from a building on an upright axis; a drop marked every second', () => {
  // 2026-10-26: the free-fall film's scene plan failed: stage cannot throw straight up, and a 45 m peak left its frame.
  const spec = {verb: 'motion_on_line', axis: {range: [0, 50], unit: 'm', vertical: true}, object: 'ball',
    accelerate: {x0: 25, v0: 20, a: -10, t: [0, 5]}, ground: 0, building: {top: 25, label: '25 m building'}, readouts: ['t', 'y', 'v'], graph: true};
  const {scene, errors} = compile(spec as never);
  assert.deepEqual(errors, []);
  assert.ok((scene!.meta!.facts as string[]).some(f => /turns back at t = 2 s, at y = 45 m/.test(f)));
  assert.ok(scene!.props.some(p => p.id === 'building'));
  const drop = compile({verb: 'motion_on_line', axis: {range: [0, 50], vertical: true}, object: 'ball', accelerate: {x0: 45, v0: 0, a: -9.8, t: [0, 3]}, ground: 0, every: 1} as never);
  assert.deepEqual((drop.scene!.meta as {intervals: {distance: number}[]}).intervals.map(g => g.distance), [4.9, 14.7, 24.5]);
  const errs = (s: object) => compile({...spec, ...s} as never).errors.join(' ');
  assert.match(errs({accelerate: {x0: 25, v0: 20, a: -10, t: [0, 6]}}), /leaves the axis/);
  assert.match(errs({object: 'car'}), /upright axis the object is one of/);
  assert.match(errs({moves: [{t: 0, x: 0}, {t: 1, x: 1}]}), /one of moves, formula or accelerate/);
  assert.match(errs({axis: {range: [0, 50]}}), /ground and building need an upright axis/);
});

test('compound: parts in boxes on one clock; a linked graph traces the mover; sequences, overlaps and small text', () => {
  // docs/compound-scenes.md, 2026-10-26: the smoke tests that decided the design (geometry-based parts).
  const load = (name: string) => JSON.parse(readFileSync(`examples/${name}`, 'utf8'));
  const {scene} = compile(load('compound-side-by-side.json'));
  assert.deepEqual(check(scene!, {every: 3}), []);
  // The graph's tracer reads the ball's height at every moment: one clock, one formula.
  const throwPart = scene!.parts!.find(p => p.id === 'throw')!, graphPart = scene!.parts!.find(p => p.id === 'graph')!;
  for (const t of [3, 4, 4.6, 6, 7.5]) {
    const f = frame(scene!, t), local = (id: string) => f.parts!.find(p => p.id === id)!.frame;
    const ball = local('throw').actors.find(a => a.id === 'mover')!.joints.get('p')!;
    const dot = local('graph').actors.find(a => a.id === 'tracer')!.joints.get('p')!;
    const y = (part: typeof throwPart, plane: string, p: [number, number]) => toPlane(part.scene.planes!.find(q => q.id === plane)!, p)[1];
    assert.ok(Math.abs(y(throwPart, 'axis', ball as [number, number]) - y(graphPart, 'p', dot as [number, number])) < 0.05, `at ${t} s`);
  }
  assert.match(svg(scene!, 4), /clipPath id="lw-part-throw"/);
  assert.ok(frame(scene!, 0.5).parts!.some(p => p.id === 'throw'));            // a linked part waits on screen
  // A sequence: the arrows start half a second after the number line ends, and the line gives way.
  const seq = compile(load('compound-sequence.json')).scene!;
  const [line, arrows] = seq.parts!;
  assert.equal(arrows.start, line.scene.duration + 0.5);
  assert.equal(line.until, arrows.start);
  // Overlapping boxes on one layer, and a 2×2 grid whose type would be too small to read, are refused.
  const part = (id: string, box: number[]) => ({id, box, spec: {verb: 'vector_add', a: [4, 1], b: [1, 3]}});
  assert.match(compile({compound: true, parts: [part('a', [0, 0, 1200, 1080]), part('b', [900, 0, 1020, 1080])]} as never).errors.join(' '), /overlap on layer 0/);
  const grid = compile({compound: true, parts: [part('a', [0, 0, 960, 540]), part('b', [960, 0, 960, 540]), part('c', [0, 540, 960, 540]), part('d', [960, 540, 960, 540])]} as never);
  assert.equal(check(grid.scene!, {every: 10}).filter(e => /text is drawn at \d+ px/.test(e)).length, 4);
});

test('stage velocity arrows follow the computed velocity: vₓ unchanged, vᵧ zero at the top (the book\'s cricket ball)', () => {
  // 2026-10-26, before the projectile film: keph1 Fig. 3.16 draws v and its components along the path.
  const {scene, errors} = compile({verb: 'stage', width_m: 80, ground: 'grass', items: [{id: 'ball', object: 'ball', x: 3, size: 0.8}],
    events: [{t: 0.5, item: 'ball', kind: 'launch', speed: 28, angle: 30}], velocity: [{item: 'ball', every: 0.7}]} as never);
  assert.deepEqual(errors, []);
  assert.deepEqual(check(scene!, {every: 3}), []);
  const read = (t: number, id: string) => Number(/(−?[\d.]+) m\/s/.exec(String((frame(scene!, t).props.find(p => p.id === id) as {text?: string}).text))![1].replace('−', '-'));
  for (const t of [0.6, 1.4, 2.5, 3.2]) assert.ok(Math.abs(read(t, 'vel0-vx-ro') - 24.25) < 0.01);
  assert.ok(Math.abs(read(0.5 + 14 / 9.8, 'vel0-vy-ro')) < 0.02);                    // the top: tₘ = v₀ sin θ / g
  assert.ok(Math.abs(read(1.5, 'vel0-vy-ro') - (14 - 9.8)) < 0.02);
  assert.ok((scene!.meta!.facts as string[]).some(f => /vₓ = 24.25 m\/s.*vᵧ = 14 m\/s/.test(f)));
  assert.match(compile({verb: 'stage', items: [{id: 'b', object: 'ball', x: 2}], velocity: [{item: 'b'}]} as never).errors.join(' '), /never moves/);
});

test('a stage list written as one object is an error, not a crash (projectile film, 2026-10-26)', () => {
  const spec = {verb: 'stage', width_m: 40, items: [{id: 'b', object: 'ball', x: 2}], events: [{t: 0.5, item: 'b', kind: 'launch', speed: 15, angle: 40}],
    velocity: {item: 'b'}};
  assert.match(compile(spec as never).errors.join(' '), /velocity is a list/);
});

test('a stage too narrow for a tall setup says how wide it must be (the 490 m cliff)', () => {
  const cliff = (w: number) => compile({verb: 'stage', width_m: w, ground: 'grass', items: [{id: 'cliff', object: 'wall', x: 20, size: 81.7},
    {id: 'stone', object: 'ball', x: 60, size: 2, on: 'cliff'}], events: [{t: 1, item: 'stone', kind: 'launch', speed: 10, angle: 0}]} as never);
  const e = cliff(200).errors.join(' ');
  assert.match(e, /set width_m to at least (\d+)/);
  const wide = Number(/at least (\d+)/.exec(e)![1]);
  const fitted = cliff(wide);
  assert.deepEqual(fitted.errors, []);
  assert.deepEqual(check(fitted.scene!, {every: 3}), []);
});

test('a ball dropped and one flicked off a table at the same moment land together', () => {
  const two = (dropX: number) => compile({verb: 'stage', width_m: 15, ground: 'floor', items: [{id: 'table', object: 'table', x: 7, size: 5},
    {id: 'dropped', object: 'ball', x: dropX, on: 'table', size: 0.3}, {id: 'flicked', object: 'ball', x: 9.3, on: 'table', size: 0.3}],
    events: [{t: 0.5, item: 'dropped', kind: 'launch', speed: 0, from: 'table'}, {t: 0.5, item: 'flicked', kind: 'launch', speed: 3}],
    velocity: [{item: 'flicked', show: ['vx', 'vy']}]} as never);
  const c = two(9.0);
  assert.deepEqual(c.errors, []);
  assert.deepEqual(check(c.scene!, {every: 3}), []);
  const facts = c.scene!.meta!.facts as string[];
  const drop = facts.find(f => f.startsWith('dropped'))!, flick = facts.find(f => f.startsWith('flicked is launched'))!;
  assert.match(drop, /dropped from rest/);
  assert.match(flick, /off the table's edge/);
  assert.equal(/after ([\d.]+) s/.exec(drop)![1], /after ([\d.]+) s/.exec(flick)![1]);
  assert.match(two(7.5).errors.join(' '), /put it at the edge: x = 9\.\d+/);
  const down = compile({verb: 'stage', width_m: 15, items: [{id: 'table', object: 'table', x: 7, size: 5}, {id: 'b', object: 'ball', x: 9.3, on: 'table'}],
    events: [{t: 0, item: 'b', kind: 'launch', speed: 2, angle: 270}]} as never);
  assert.match(down.errors.join(' '), /give speed 0, not a downward angle/);
});

test('ray_diagram: images by the mirror and lens formulas, worded as the book does', async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const {imageOf} = await import('../src/verbs/optics.ts');
  // NCERT Class 10 Example 9.2: a 4 cm tall object 25 cm from a concave mirror of f 15 cm: v = −37.5 cm, m = −1.5.
  const a = imageOf('concave_mirror', 15, 25);
  assert.ok(Math.abs(a.v + 37.5) < 1e-9 && Math.abs(a.m + 1.5) < 1e-9 && a.real);
  // Example 9.1: a convex mirror of R 3.00 m, a bus 5.00 m away: v = +1.15 m, m = +0.23.
  const b = imageOf('convex_mirror', 150, 500);
  assert.ok(Math.abs(b.v - 115.38) < 0.01 && Math.abs(b.m - 0.23) < 0.005 && !b.real);
  // Example 9.4: a 2 cm object 15 cm from a convex lens of f 10 cm: v = +30 cm, m = −2.
  const c = imageOf('convex_lens', 10, 15);
  assert.ok(Math.abs(c.v - 30) < 1e-9 && Math.abs(c.m + 2) < 1e-9 && c.real);
  // Example 9.3: a concave lens of f 15 cm forming an image 10 cm away: object 30 cm away, m = +1/3.
  const d = imageOf('concave_lens', 15, 30);
  assert.ok(Math.abs(d.v + 10) < 1e-9 && Math.abs(d.m - 1 / 3) < 1e-9 && !d.real);
  assert.ok(imageOf('concave_mirror', 10, 10).atInfinity && imageOf('convex_lens', 10, 10).atInfinity);
  const {scene, errors} = compile({verb: 'ray_diagram', device: 'concave_mirror', focal_length: 10, objects: ['infinity', 30, 20, 15, 10, 5]} as any);
  assert.deepEqual(errors, []);
  const facts = (scene!.meta as any).facts.join('\n');
  for (const said of ['(at F), real and inverted, highly diminished, point-sized', '(beyond C): image 15 cm in front of the mirror (between F and C), real and inverted, diminished',
    '(at C), real and inverted, same size', '(between F and C): image 30 cm in front of the mirror (beyond C), real and inverted, enlarged',
    '(at F): image at infinity', '(between F and P): image 10 cm behind the mirror, virtual and erect, enlarged']) assert.ok(facts.includes(said), said);
  // The rays meet at the image: every reflected ray of a real image passes through its top.
  assert.deepEqual(check(scene!, {every: 3}), []);
  const lens = compile({verb: 'ray_diagram', device: 'convex_lens', focal_length: 10, objects: [15], power: true} as any).scene!;
  assert.ok((lens.meta as any).facts.some((f: string) => f.includes('+10 dioptre')));
});

test('ray_diagram: errors name the field and the fix', async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const errs = (s: object) => compile({verb: 'ray_diagram', ...s} as any).errors.join(' | ');
  assert.match(errs({device: 'periscope', objects: [10]}), /device is one of/);
  assert.match(errs({device: 'convex_lens', objects: [10]}), /focal_length is the size of f/);
  assert.match(errs({device: 'plane_mirror', focal_length: 10, objects: [10]}), /no focal_length/);
  assert.match(errs({device: 'plane_mirror', objects: ['infinity']}), /needs a distance/);
  assert.match(errs({device: 'concave_mirror', focal_length: 10, objects: [11]}), /too near F.*put it at F exactly/);
  assert.match(errs({device: 'concave_mirror', focal_length: 10, objects: [70]}), /more than 6 f/);
  assert.match(errs({device: 'convex_lens', focal_length: 10, objects: [20], rays: ['pole', 'parallel']}), /a lens has no pole/);
  assert.match(errs({device: 'convex_lens', focal_length: 10, objects: [20], angles: true}), /angles is for a plane mirror/);
  assert.match(errs({device: 'concave_mirror', focal_length: 10, objects: [20], power: true}), /power is for a lens/);
});

test('refraction: Snell\'s law with the book\'s indices, the slab\'s shift, and total internal reflection', async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const {scene, errors} = compile({verb: 'refraction', from: 'air', to: 'water', angles: [30, 60], speeds: true} as any);
  assert.deepEqual(errors, []);
  const facts = (scene!.meta as any).facts.join('\n');
  // sin r = 1.0003 sin 30° / 1.33 → r = 22.08°; n of water relative to air = 1.33 / 1.0003.
  assert.ok(facts.includes('angle of refraction 22.1°'), facts);
  assert.ok(Math.abs((scene!.meta as any).n21 - 1.33 / 1.0003) < 1e-6);
  assert.ok(facts.includes('2.26 × 10^8 m/s in water'));
  const slab = compile({verb: 'refraction', from: 'air', to: 'glass', angles: [40], slab: 5} as any).scene!;
  const r = Math.asin(1.0003 * Math.sin(40 * Math.PI / 180) / 1.5), shift = 5 * Math.sin(40 * Math.PI / 180 - r) / Math.cos(r);
  assert.ok((slab.meta as any).facts.some((f: string) => f.includes(`shifted sideways by ${Number(shift.toFixed(2))} cm`)));
  const tir = compile({verb: 'refraction', from: 'glass', to: 'air', angles: [50]} as any).scene!;
  assert.ok((tir.meta as any).facts.some((f: string) => f.includes('totally reflected') && f.includes('41.8°')));
  const errs = (s: object) => compile({verb: 'refraction', ...s} as any).errors.join(' | ');
  assert.match(errs({from: 'air', to: 'unobtainium', angles: [30]}), /to is a refractive index or one of/);
  assert.match(errs({from: 'air', to: 'glass', angles: [95]}), /0 to 85 degrees/);
  assert.match(errs({from: 'glass', to: 'air', angles: [30], slab: 4}), /slab is of the optically denser medium/);
});

test('ray_diagram: a picture without numbers still names i and r and says where the image is', async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const {scene, errors} = compile({verb: 'ray_diagram', device: 'plane_mirror', objects: [10], rays: ['parallel', 'pole'], angles: true, distances: true, illustrative: true} as any);
  assert.deepEqual(errors, []);
  const texts = scene!.props.filter(p => p.type === 'text').map(p => (p as any).text);
  for (const t of ['i', 'r', 'normal', 'Object: in front of the mirror', 'Image: behind the mirror, as far behind as the object is in front']) assert.ok(texts.includes(t), t);
  assert.ok(!texts.some(t => /\d/.test(t)), 'no numbers');
  assert.ok(scene!.props.some(p => p.id === 'p0-dist-o') && scene!.props.some(p => p.id === 'p0-ray2-in'), 'distances and the ray along the normal');
  assert.match(compile({verb: 'ray_diagram', device: 'convex_lens', focal_length: 10, objects: [20], distances: true} as any).errors.join(), /distances is for a plane mirror/);
});

test('annotate: labels and points at a verb\'s named points or in its own units, optional for every verb', async () => {
  const {compile, cards} = await import('../src/verbs/index.ts');
  const base = {verb: 'ray_diagram', device: 'concave_mirror', focal_length: 10, objects: [30]};
  const plain = compile(base as any).scene!, noted = compile({...base, annotate: [{text: 'centre of curvature', at: 'C', point: true}, {text: 'pole', at: [0, -4]}]} as any).scene!;
  assert.equal(noted.props.length, plain.props.length + 3, 'a dot and two labels, nothing else changed');
  const anchors = (plain.meta as any).anchors, dot = noted.props.find(p => p.id === 'note0-point') as any;
  assert.deepEqual([dot.x, dot.y], anchors.C.map((v: number) => Math.round(v * 100) / 100));
  const units = (plain.meta as any).units, pole = noted.props.find(p => p.id === 'note1-label') as any;
  assert.ok(Math.abs(pole.x - 14 * 1 - (units.ox + units.sx * 0)) < 0.01 && Math.abs(pole.y + 16 - (units.oy + units.sy * 4)) < 0.01);
  // A plane's own coordinates (graph), and errors that name the field and the fix.
  const g = compile({verb: 'graph', x: {name: 't', unit: 's', range: [0, 6]}, y: {name: 'v', unit: 'm/s', range: [0, 22]}, series: [{label: 'v', expr: '2 + 3t'}],
    annotate: [{text: 'start', at: [0, 2], point: true}]} as any);
  assert.deepEqual(g.errors, []);
  const err = (s: object) => compile(s as any).errors.join(' | ');
  assert.match(err({...base, annotate: [{text: 'x', at: 'Q'}]}), /no point named "Q"; named points: P, F, C, object, image, incidence/);
  assert.match(err({...base, annotate: [{at: 'C'}]}), /give text, point: true, or both/);
  assert.match(err({...base, annotate: [{text: 'x', at: 'C', colour: 'pink'}]}), /colour is one of/);
  assert.match(err({verb: 'pendulum', length: 1, annotate: [{text: 'x', at: [1, 1]}]}), /takes named points only/);
  // Without numbers a point's name stays (2F₂ is not a number), and so do the place words that use one.
  const lens = compile({verb: 'ray_diagram', device: 'convex_lens', focal_length: 10, objects: [15], illustrative: true, annotate: [{text: '2F2', at: '2F2', point: true}]} as any).scene!;
  const texts = lens.props.filter(p => p.type === 'text').map(p => (p as any).text);
  for (const t of ['2F₂', '2F2', 'Object: between F₁ and 2F₁', 'Image: beyond 2F₂']) assert.ok(texts.includes(t), t);
  assert.ok(!texts.some(t => /cm/.test(t)));
  const all = cards(['trusted', 'trial']);
  assert.match(all.ray_diagram.fields.annotate, /lenses: O, F1, F2, 2F1, 2F2/);
  assert.match(all.graph.fields.annotate, /\[x, y\] in the drawing's own x and y/);
  assert.equal(all.pendulum.fields.annotate, undefined, 'a verb with nowhere to put a mark offers none');
});
