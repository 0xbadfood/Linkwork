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
  assert.match(errs({from: 'air', to: 'unobtainium', angles: [30]}), /to "unobtainium" is a refractive index, \{name, n\}/);
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
  assert.match(err({...base, annotate: [{text: 'x', at: 'Q'}]}), /annotate\[0\]\.at: no point named "Q"; named points: P, F, C, edge_top, edge_bottom, object, image, incidence/);
  assert.match(err({...base, annotate: [{at: 'C'}]}), /give text, point: true, or both/);
  assert.match(err({...base, annotate: [{text: 'x', at: 'C', colour: 'pink'}]}), /colour is one of/);
  assert.match(err({verb: 'pendulum', length: 1, annotate: [{text: 'x', at: [1, 1]}]}), /takes named points only/);
  // Without numbers a point's name stays (2F₂ is not a number), and so do the place words that use one.
  const lens = compile({verb: 'ray_diagram', device: 'convex_lens', focal_length: 10, objects: [15], illustrative: true, annotate: [{text: '2F2', at: '2F2', point: true}]} as any).scene!;
  const texts = lens.props.filter(p => p.type === 'text').map(p => (p as any).text);
  for (const t of ['2F₂', 'Object: between F₁ and 2F₁', 'Image: beyond 2F₂']) assert.ok(texts.includes(t), t);
  assert.ok(!texts.includes('2F2'), 'the verb already names 2F₂: not again');
  assert.ok(!texts.some(t => /cm/.test(t)));
  const all = cards(['trusted', 'trial']);
  assert.match(all.ray_diagram.fields.annotate, /lenses: O, F1, F2, 2F1, 2F2/);
  assert.match(all.graph.fields.annotate, /\[x, y\] in the drawing's own x and y/);
  assert.equal(all.pendulum.fields.annotate, undefined, 'a verb with nowhere to put a mark offers none');
});

test('annotate: a measuring line between two points, labelled at its middle; the planner\'s own words survive illustrative', async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const {scene, errors} = compile({verb: 'ray_diagram', device: 'concave_mirror', focal_length: 10, objects: ['infinity'], illustrative: true,
    annotate: [{text: 'R = 2f', at: [-20, -3], to: [0, -3]}, {text: 'aperture', at: 'edge_top', to: 'edge_bottom'}]} as any);
  assert.deepEqual(errors, []);
  const ids = scene!.props.map(p => p.id);
  for (const id of ['note0-a', 'note0-b', 'note0-bar-a', 'note0-bar-b', 'note0-label', 'note1-label']) assert.ok(ids.includes(id), id);
  assert.equal((scene!.props.find(p => p.id === 'note0-label') as any).text, 'R = 2f', 'kept although it holds a digit');
  const anchors = (scene!.meta as any).anchors, a = scene!.props.find(p => p.id === 'note1-a') as any;
  assert.deepEqual([a.x2, a.y2], anchors.edge_top.map((v: number) => Math.round(v * 100) / 100));
  assert.match(compile({verb: 'ray_diagram', device: 'concave_mirror', focal_length: 10, objects: [30], annotate: [{at: 'P', to: 'nowhere'}]} as any).errors.join(), /annotate\[0\]\.to: no point named "nowhere"/);
});

test('optics: panel false fills the box for a side-by-side compound; media keep their names without numbers', async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const pair = compile({compound: true, parts: [
    {id: 'concave', box: [0, 0, 960, 1080], spec: {verb: 'ray_diagram', title: 'Concave', device: 'concave_mirror', focal_length: 10, objects: ['infinity'], illustrative: true, panel: false}},
    {id: 'convex', box: [960, 0, 960, 1080], spec: {verb: 'ray_diagram', title: 'Convex', device: 'convex_mirror', focal_length: 10, objects: ['infinity'], illustrative: true, panel: false}}]} as any);
  assert.deepEqual(pair.errors, []);
  const alone = compile({verb: 'ray_diagram', device: 'concave_mirror', focal_length: 10, objects: [30], panel: false} as any).scene!;
  assert.ok(!alone.props.some(p => /-line\d|^device$/.test(p.id)), 'no panel lines');
  assert.ok(Math.max(...alone.props.filter(p => p.type === 'line').map(p => Math.max((p as any).x1, (p as any).x2))) > 0.9 * 1920, 'the drawing spans the width');
  const r = compile({verb: 'refraction', from: 'air', to: 'glass', angles: [40], illustrative: true, panel: false} as any).scene!;
  const texts = r.props.filter(p => p.type === 'text').map(p => (p as any).text);
  assert.ok(texts.includes('air') && texts.includes('glass') && !texts.some(t => /\d/.test(t)));
  assert.match(compile({verb: 'refraction', from: 'air', to: 'glass', angles: [40], panel: 'no'} as any).errors.join(), /panel is true or false/);
});

test('ray_diagram exact: rays reflect off the true sphere, so edge rays cross nearer the mirror (spherical aberration)', async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const {scene, errors} = compile({verb: 'ray_diagram', device: 'concave_mirror', focal_length: 10, objects: ['infinity'], exact: true, aperture: 0.6} as any);
  assert.deepEqual(errors, []);
  // A ray at height y = 0.6 R meets the sphere at incidence θ with sin θ = 0.6; it crosses the axis R/(2 cos θ) = 12.5 cm
  // from C, so 7.5 cm from P; the innermost ray (0.15 × 0.6 R) crosses 9.96 cm from P, next to the paraxial focus.
  const fact = (scene!.meta as any).facts.find((f: string) => f.includes('traced exactly'));
  assert.match(fact, /edge rays cross the axis 7\.5 cm from P and the central ones 10 cm, against the small-aperture focus at 10 cm/);
  assert.ok(!scene!.props.some(p => p.id === 'p0-image'), 'no single image point');
  const anchors = (scene!.meta as any).anchors;
  assert.ok(anchors.focus_edge[0] > anchors.focus_centre[0], 'the edge focus is nearer P (to the right)');
  const err = (x: object) => compile({verb: 'ray_diagram', focal_length: 10, ...x} as any).errors.join(' | ');
  assert.match(err({device: 'convex_lens', objects: ['infinity'], exact: true}), /exact is for a concave or convex mirror/);
  assert.match(err({device: 'concave_mirror', objects: [30], exact: true}), /exact traces a parallel beam/);
  assert.match(err({device: 'concave_mirror', objects: ['infinity'], aperture: 0.5}), /aperture \(with exact\)/);
});

test('annotate: a label that would overlap another moves until both read', async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const s = compile({verb: 'ray_diagram', device: 'concave_mirror', focal_length: 10, objects: ['infinity'], exact: true,
    annotate: [{text: 'central rays', at: 'focus_centre', point: true}, {text: 'edge rays', at: 'focus_edge', point: true}]} as any).scene!;
  const [a, b] = ['note0-label', 'note1-label'].map(id => s.props.find(p => p.id === id) as any);
  assert.ok(Math.abs(a.y - b.y) >= 36, `labels ${a.y} and ${b.y} apart`);
});

test('ray_diagram: one ray alone shows a ray rule, with image: false', async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const one = (device: string, ray: string) => compile({verb: 'ray_diagram', device, focal_length: 10, objects: [25], rays: [ray], image: false} as any);
  const parallel = one('convex_mirror', 'parallel');
  assert.deepEqual(parallel.errors, []);
  assert.ok(!parallel.scene!.props.some(p => p.id === 'p0-image'), 'no image');
  // A parallel ray off a convex mirror seems to come from F: its dashed line runs back to F on the axis.
  const back = parallel.scene!.props.find(p => p.id === 'p0-ray0-back') as any, F = (parallel.scene!.meta as any).anchors.F;
  // (within a few pixels: the ray leaves the curved surface, a little off the plane through P)
  assert.ok(Math.abs(back.x2 - F[0]) < 4 && Math.abs(back.y2 - F[1]) < 0.5, 'back to F');
  // Aimed at C behind a convex mirror: the aim is drawn on, dashed, to C.
  const centre = one('convex_mirror', 'centre').scene!, aim = centre.props.find(p => p.id === 'p0-ray0-aim') as any, C = (centre.meta as any).anchors.C;
  assert.ok(Math.abs(aim.x2 - C[0]) < 4 && Math.abs(aim.y2 - C[1]) < 0.5, 'aim to C');
  // Through F, a concave mirror sends it back parallel: no dashed line at all.
  assert.ok(!one('concave_mirror', 'focus').scene!.props.some(p => /-back$/.test(p.id)));
  assert.match(compile({verb: 'ray_diagram', device: 'convex_lens', focal_length: 10, objects: [25], rays: []} as any).errors.join(), /rays is 1 to 3/);
});

test('refraction: apparent depth, a coin in water seen from air', async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const {scene, errors} = compile({verb: 'refraction', from: 'water', to: 'air', object_depth: 12, object: 'coin'} as any);
  assert.deepEqual(errors, []);
  assert.ok(Math.abs((scene!.meta as any).apparent_depth - 12 * 1.0003 / 1.33) < 1e-5);
  assert.match((scene!.meta as any).facts[0], /seems about 9 cm deep/);
  const anchors = (scene!.meta as any).anchors;
  assert.ok(anchors.image[1] < anchors.object[1], 'seen nearer the surface');
  const err = (x: object) => compile({verb: 'refraction', ...x} as any).errors.join(' | ');
  assert.match(err({from: 'air', to: 'water', object_depth: 10}), /object is in the denser medium/);
  assert.match(err({from: 'water', to: 'air', object_depth: 10, slab: 3}), /do not go together/);
  assert.match(err({from: 'diamond', to: 'air', object_depth: 10, angles: [30]}), /past the critical angle/);
});

test('annotate: no point named twice, no point ids as words; a part without its panel keeps its title clear of a film header', async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const base = {verb: 'ray_diagram', device: 'concave_mirror', focal_length: 10, objects: ['infinity'], exact: true};
  const s = compile({...base, annotate: [{text: 'C', at: 'C', point: true}, {text: 'F', at: 'F'}, {text: 'centre', at: 'C'}]} as any).scene!;
  assert.ok(s.props.some(p => p.id === 'note0-point') && !s.props.some(p => p.id === 'note0-label'), 'C: the dot, not a second C');
  assert.ok(!s.props.some(p => p.id.startsWith('note1')), 'F alone: nothing to add');
  assert.equal((s.props.find(p => p.id === 'note2-label') as any).text, 'centre');
  assert.match(compile({...base, annotate: [{text: 'focus_edge', at: 'focus_edge'}]} as any).errors.join(), /is a point's name: write the words to show, such as "focus edge"/);
  const part = compile({...base, title: 'Large aperture', panel: false} as any).scene!;
  assert.ok((part.props.find(p => p.id === 'title') as any).y >= 0.15 * 1080, 'below the header strip');
});

test('ray_diagram exact: one scale for every aperture, so a small one looks small', async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const top = (aperture: number) => (compile({verb: 'ray_diagram', device: 'concave_mirror', focal_length: 10, objects: ['infinity'], exact: true, aperture} as any).scene!.meta as any).anchors;
  const wide = top(0.6), small = top(0.25);
  const half = (a: any) => a.edge_bottom[1] - a.edge_top[1];
  assert.ok(Math.abs(half(small) / half(wide) - 0.25 / 0.6) < 0.02, `${half(small)} vs ${half(wide)}`);
});

test('prism: a ray through a prism, dispersion, Newton\'s two prisms and a raindrop, each traced', async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const one = compile({verb: 'prism', angle: 60, incidence: 40} as any);
  assert.deepEqual(one.errors, []);
  // crown glass at 589 nm: n = 1.5046 + 0.0042/0.589² = 1.5167; r1 = 25.1°, r2 = 34.9°, e = 60.3°, D = 40.3°.
  assert.match((one.scene!.meta as any).facts[0], /refracted at 25\.1°, leaves at 60\.3° and is deviated by D = i \+ e − A = 40\.3°/);
  const white = compile({verb: 'prism', light: 'white'} as any).scene!;
  const a = (white.meta as any).anchors;
  assert.ok(a.violet[1] > a.red[1], 'violet deviated more: lower on the screen');
  assert.ok(white.props.some(p => p.id === 'spread-note'), 'says the spread is drawn wider');
  const two = compile({verb: 'prism', setup: 'two_prisms'} as any);
  assert.deepEqual(two.errors, []);
  const drop = compile({verb: 'prism', setup: 'raindrop', light: 'white'} as any).scene!;
  const f = (drop.meta as any).facts.join(' ');
  const angle = (name: string) => Number(f.match(new RegExp(`${name} light leaves at about ([\\d.]+)°|and ${name} at about ([\\d.]+)°`))?.slice(1).find(Boolean));
  assert.ok(Math.abs(angle('red') - 42.4) < 0.3 && Math.abs(angle('violet') - 40.7) < 0.4, f);
  const err = (x: object) => compile({verb: 'prism', ...x} as any).errors.join(' | ');
  assert.match(err({incidence: 10}), /totally reflected inside at the second face/);
  assert.match(err({setup: 'raindrop', angle: 60}), /a raindrop has no angle/);
  assert.match(err({setup: 'two_prisms', light: 'ray'}), /two_prisms shows white light/);
});

test('refraction: wavefronts, several media compared, and labels that fit a half-frame', async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const w = compile({verb: 'refraction', from: 'air', to: 'water', angles: [40], wavefronts: true} as any).scene!;
  assert.ok(w.props.filter(p => p.id.startsWith('front')).length >= 6);
  assert.ok((w.meta as any).facts.some((t: string) => /wavefronts are 0\.75 times as far apart in water/.test(t)));
  const m = compile({verb: 'refraction', from: 'air', to: ['water', 'kerosene', 'turpentine', 'glass', 'plastic'], angles: [50]} as any);
  assert.deepEqual(m.errors, []);
  const facts = (m.scene!.meta as any).facts.join(' ');
  assert.match(facts, /turpentine \(n = 1\.47\)/); assert.match(facts, /plastic \(n = 1\.49, a typical value: the book gives none\)/);
  const half = compile({verb: 'refraction', from: 'water', to: 'air', object_depth: 10, object: 'tank bottom', panel: false, width: 960} as any).scene!;
  const label = half.props.find(p => p.id === 'image-label') as any;
  assert.ok(label.align === 'end' ? label.x - label.text.length * 28 * 0.58 >= 0 : label.x + label.text.length * 28 * 0.58 <= 960, 'inside the half-frame');
  assert.match(compile({verb: 'refraction', from: 'air', to: ['water'], angles: [40]} as any).errors.join(), /compares 2 to 6 media/);
});

test('eye: accommodation, myopia and hypermetropia with their corrective lenses', async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const {correction, eyeRange} = await import('../src/verbs/eye.ts');
  assert.deepEqual(eyeRange({verb: 'eye', objects: []} as any), [40, 44]);
  // NCERT: the far point of a myopic eye at 80 cm needs a concave lens of power −1.25 D; a near point of 1 m, +3 D.
  assert.equal(correction({verb: 'eye', condition: 'myopia', far_point: 80, objects: []} as any), -1.25);
  assert.equal(correction({verb: 'eye', condition: 'hypermetropia', near_point: 100, objects: []} as any), 3);
  const facts = (spec: object) => (compile({verb: 'eye', ...spec} as any).scene!.meta as any).facts.join(' | ');
  assert.match(facts({objects: ['infinity', 25]}), /at infinity\): the eye focuses at 40 D and the image falls on the retina.*25 cm away: the eye focuses at 44 D and the image falls on the retina/);
  assert.match(facts({condition: 'myopia', far_point: 80, objects: ['infinity']}), /falls in front of the retina \(blurred\)/);
  assert.match(facts({condition: 'myopia', far_point: 80, objects: ['infinity'], correct: true}), /through the lens: .* on the retina \(sharp\)/);
  assert.match(facts({condition: 'hypermetropia', near_point: 100, objects: [25]}), /falls behind the retina \(blurred\)/);
  assert.match(facts({condition: 'presbyopia', near_point: 100, objects: [25], correct: true}), /on the retina \(sharp\)/);
  const err = (x: object) => compile({verb: 'eye', objects: ['infinity'], ...x} as any).errors.join(' | ');
  assert.match(err({correct: true}), /a normal eye needs no correction/);
  assert.match(err({far_point: 80}), /far_point .* is for myopia/);
});

test('atmosphere: a star seen higher than it is, and the Sun seen above the horizon before it rises', async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const star = compile({verb: 'atmosphere', scene: 'star', twinkle: true, planet: true} as any).scene!;
  const a = (star.meta as any).anchors;
  // Seen along the light's last direction: nearer overhead than the star (smaller angle from the vertical at the eye).
  const fromVertical = (p: number[]) => Math.atan2(Math.abs(p[0] - a.eye[0]), a.eye[1] - p[1]);
  assert.ok(fromVertical(a.apparent) < fromVertical(a.star), 'seen higher');
  assert.ok(star.props.some(p => p.id === 'twinkle') && star.props.some(p => p.id === 'planet'));
  const sun = compile({verb: 'atmosphere', scene: 'sunrise'} as any).scene!, b = (sun.meta as any).anchors;
  assert.ok(b.sun[1] > b.eye[1], 'the Sun is below the observer\'s horizon') ;
  assert.ok(b.apparent[1] < b.eye[1], 'it is seen above it');
  assert.deepEqual(compile({verb: 'atmosphere', scene: 'sunrise'} as any).errors, []);
  assert.match(compile({verb: 'atmosphere', scene: 'sunrise', twinkle: true} as any).errors.join(), /twinkle and planet go with scene star/);
});

test('scattering: the Tyndall effect, a blue sky, a red sunset and red signals, with colours from the 1/λ⁴ law', async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const {transmitted, versusRed} = await import('../src/verbs/scattering.ts');
  assert.ok(Math.abs(versusRed(450) - (700 / 450) ** 4) < 1e-12 && versusRed(450) > 5.8 && versusRed(450) < 5.9);
  const hex = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const [nr, ng, nb] = hex(transmitted(0.098)), [sr, sg, sb] = hex(transmitted(0.098 * 38));
  assert.ok(nb > 200 && ng > 220, `noon near white: ${transmitted(0.098)}`);
  assert.ok(sr === 255 && sg < 120 && sb < 30, `sunset red: ${transmitted(0.098 * 38)}`); void nr; void sg;
  for (const scene of ['tyndall', 'sky', 'sunset', 'fog', 'sizes']) assert.deepEqual(compile({verb: 'scattering', scene} as any).errors, [], scene);
  const fog = (compile({verb: 'scattering', scene: 'fog'} as any).scene!.meta as any).facts.join(' ');
  assert.match(fog, /about 50% of the red light gets through against 3% of the blue/);
  assert.match(compile({verb: 'scattering', scene: 'rainbow'} as any).errors.join(), /scene is tyndall, sky, sunset, fog or sizes/);
});

test('ray_diagram: lenses in contact act as one lens of power P1 + P2; without a panel, power shows beside the lens', async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const pair = compile({verb: 'ray_diagram', device: 'convex_lens', focal_length: 10, objects: ['infinity'], with: {device: 'concave_lens', focal_length: 25}} as any);
  assert.deepEqual(pair.errors, []);
  // NCERT Class 10 (power of lenses in contact): +10 D and −4 D make +6 D, a convex lens of f = 100/6 cm.
  assert.equal((pair.scene!.meta as any).power, 6);
  assert.match((pair.scene!.meta as any).facts[0], /act as one convex lens of power P = P1 \+ P2 = \+6 D, focal length 16\.67 cm/);
  const ids = pair.scene!.props.map(p => p.id);
  for (const id of ['lens1', 'lens2', 'lens1-power', 'lens2-power', 'combined']) assert.ok(ids.includes(id), id);
  assert.match(compile({verb: 'ray_diagram', device: 'convex_lens', focal_length: 20, objects: ['infinity'], with: {device: 'concave_lens', focal_length: 20}} as any).errors.join(), /cancel/);
  assert.match(compile({verb: 'ray_diagram', device: 'concave_mirror', focal_length: 20, objects: ['infinity'], with: {device: 'concave_lens', focal_length: 20}} as any).errors.join(), /goes with a convex or concave lens/);
  const alone = compile({verb: 'ray_diagram', device: 'concave_lens', focal_length: 25, objects: ['infinity'], power: true, panel: false} as any).scene!;
  assert.equal((alone.props.find(p => p.id === 'lens-power') as any).text, 'P = −4 D (f = −25 cm)');
});

test('refraction: vacuum is exactly 1, so air relative to vacuum is 1.0003', async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const facts = (compile({verb: 'refraction', from: 'vacuum', to: 'air', angles: [30]} as any).scene!.meta as any).facts.join(' ');
  assert.match(facts, /refractive index of air relative to vacuum: 1\.0003 \(absolute indices 1 and 1\.0003\)/);
  assert.equal((compile({verb: 'refraction', from: 'vacuum', to: 'air', angles: [30]} as any).scene!.meta as any).n21, 1.0003);
});

test("prism: Newton's first test passes one colour into a second prism, and white light can show each colour's speed", async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const t = compile({verb: 'prism', setup: 'newton_test', colour: 'green'} as any);
  assert.deepEqual(t.errors, []);
  assert.match((t.scene!.meta as any).facts[0], /one colour \(green\) .* split into no further colours/);
  assert.ok(t.scene!.props.some(p => p.id === 'prism2') && t.scene!.props.some(p => p.id === 'one-colour'));
  const sp = compile({verb: 'prism', light: 'white', glass: 'glass', speeds: true} as any).scene!;
  // crown glass: n(410 nm) = 1.5046 + 0.0042/0.41² = 1.530, v = 3/1.530 = 1.961 (×10⁸ m/s)
  assert.ok((sp.meta as any).facts.some((f: string) => /violet slows the most in the glass: 1\.961 × 10\^8 m\/s against 1\.981/.test(f)));
  assert.match(compile({verb: 'prism', setup: 'newton_test', colour: 'pink'} as any).errors.join(), /colour \(for newton_test\) is one of/);
  assert.deepEqual(compile({verb: 'prism', glass: 'glass'} as any).errors, [], 'glass alone is crown glass, and the check does not throw');
});

test('refraction: a named medium {name, n}, and a bare index is named once', async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const s = compile({verb: 'refraction', from: {name: 'air', n: 1}, to: {name: 'cornea', n: 1.38}, angles: [40]} as any).scene!;
  const texts = s.props.filter(p => p.type === 'text').map(p => (p as any).text);
  assert.ok(texts.includes('cornea') && texts.includes('n = 1.38'));
  const bare = compile({verb: 'refraction', from: 1, to: 1.38, angles: [40]} as any).scene!.props.filter(p => p.type === 'text').map(p => (p as any).text);
  assert.equal(bare.filter(t => t === 'n = 1').length, 1, 'not twice');
  assert.match(compile({verb: 'refraction', from: {name: 'cornea'}, to: 'air', angles: [40]} as any).errors.join(), /\{name, n\}/);
});

test("circuit: solved by Ohm's law, as in the book's examples", async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const sol = (spec: object) => (compile({verb: 'circuit', ...spec} as any).scene!.meta as any).solution;
  // Example 11.7: a 20 Ω lamp and a 4 Ω conductor on 6 V: 24 Ω, 0.25 A.
  assert.deepEqual(sol({volts: 6, items: [{id: 'lamp', kind: 'bulb', R: 20}, {id: 'R', kind: 'resistor', R: 4}]}), [{V: 6, R: 24, I: 0.25}]);
  // Example 11.8: 5, 10 and 30 Ω in parallel on 12 V: 3 Ω, 4 A (2.4 + 1.2 + 0.4).
  const par = compile({verb: 'circuit', volts: 12, items: [{id: 'P', parallel: [[{id: 'R1', kind: 'resistor', R: 5}], [{id: 'R2', kind: 'resistor', R: 10}], [{id: 'R3', kind: 'resistor', R: 30}]]}]} as any).scene!;
  assert.deepEqual((par.meta as any).solution, [{V: 12, R: 3, I: 4}]);
  assert.match((par.meta as any).facts[0], /R1: 5 Ω, 2\.4 A, 12 V; R2: 10 Ω, 1\.2 A, 12 V; R3: 30 Ω, 0\.4 A, 12 V/);
  // Example 11.9: (10 ∥ 40) + (30 ∥ 20 ∥ 60) on 12 V: 8 + 10 = 18 Ω, 0.667 A.
  assert.equal(sol({volts: 12, items: [{id: 'A', parallel: [[{id: 'R1', kind: 'resistor', R: 10}], [{id: 'R2', kind: 'resistor', R: 40}]]},
    {id: 'B', parallel: [[{id: 'R3', kind: 'resistor', R: 30}], [{id: 'R4', kind: 'resistor', R: 20}], [{id: 'R5', kind: 'resistor', R: 60}]]}]})[0].R, 18);
  // R = ρl/A: 1 m of nichrome, 0.5 mm²: 1e-4 × 1 / 0.5e-6 = 200 Ω; four cells shown in turn.
  assert.deepEqual(sol({cells: [1, 2, 3, 4], items: [{id: 'XY', kind: 'wire', material: 'nichrome', length: 1, area: 0.5}]}).map((x: any) => [x.V, x.R]), [[1.5, 200], [3, 200], [4.5, 200], [6, 200]]);
  assert.deepEqual(sol({volts: 6, key: 'open', items: [{id: 'R', kind: 'resistor', R: 4}]})[0].I, 0);
  const err = (x: object) => compile({verb: 'circuit', ...x} as any).errors.join(' | ');
  assert.match(err({items: [{id: 'R', kind: 'resistor', R: 4}]}), /give the battery/);
  assert.match(err({volts: 6, items: [{id: 'W', kind: 'wire', material: 'unobtainium'}]}), /material is one of/);
  assert.match(err({volts: 6, items: [{id: 'R', kind: 'resistor', R: 4}], voltmeters: ['Q']}), /no item "Q"/);
});

test('circuit: a wire close-up counts charge against time (I = Q/t), a key that closes, and current in mA and µA', async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const wire = compile({verb: 'circuit', view: 'wire', current: 0.5, seconds_each: 4} as any);
  assert.deepEqual(wire.errors, []);
  assert.match((wire.scene!.meta as any).facts[0], /0\.5 A carries 2 C across the cross-section in 4 s/);
  assert.deepEqual(check(wire.scene!, {every: 3}), [], 'charges stay inside the frame');
  const closes = compile({verb: 'circuit', cells: 2, items: [{id: 'bulb', kind: 'bulb', R: 10}], key: 'closes', units: true, flow: true} as any).scene!;
  const plug = closes.props.find(p => p.id === 'key-plug') as any;
  assert.ok(plug.show[0] > 1, 'the key closes after the start');
  assert.equal((closes.props.find(p => p.id === 'ammeter-zero') as any).text, 'I = 0 A');
  assert.equal((closes.props.find(p => p.id === 'ammeter-read0') as any).text, 'I = 300 mA');
  assert.match(compile({verb: 'circuit', view: 'wire', volts: 6} as any).errors.join(), /leave out items, cells and volts/);
});

test('circuit: electrons move from − to +, against conventional current', async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const spec = {verb: 'circuit', cells: 2, items: [{id: 'bulb', kind: 'bulb', R: 10}]};
  const pos = (flow: unknown) => { const sc = compile({...spec, flow} as any).scene!, d = sc.props.find(p => p.id === 'main-charge0') as any; return [d.keys.x[1][1] - d.keys.x[0][1], d.keys.y[1][1] - d.keys.y[0][1]]; };
  const conv = pos(true), elec = pos('electrons');
  assert.ok(conv[0] * elec[0] + conv[1] * elec[1] < 0, 'opposite directions');
  const both = compile({...spec, flow: 'both'} as any).scene!;
  assert.ok(both.props.some(p => p.id === 'conv-arrow0') && (both.props.find(p => p.id === 'main-charge0') as any).style.fill === 'cool');
  assert.match(compile({...spec, flow: 'sideways'} as any).errors.join(), /flow is true \(conventional current\), electrons, or both/);
});

test('circuit: the mains as a supply, and the supply\'s label inside a half-frame', async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const half = compile({compound: true, parts: [
    {id: 'led', box: [0, 0, 960, 1080], spec: {verb: 'circuit', title: 'LED', source: 'mains', items: [{id: 'led', kind: 'bulb', R: 3235}], panel: false}},
    {id: 'kettle', box: [960, 0, 960, 1080], spec: {verb: 'circuit', title: 'Kettle', source: 'mains', items: [{id: 'kettle', kind: 'resistor', R: 32.35}], panel: false}}]} as any);
  assert.deepEqual(half.errors, []);
  assert.deepEqual(check(half.scene!, {every: 3}), []);
  const one = compile({verb: 'circuit', source: 'mains', items: [{id: 'kettle', kind: 'resistor', R: 32.35}]} as any).scene!;
  assert.ok(Math.abs((one.meta as any).solution[0].I - 220 / 32.35) < 1e-3, '220 V by default');
  assert.equal((one.props.find(p => p.id === 'battery-v0') as any).text, '220 V mains');
});

test('circuit: potential difference as work per unit charge, a voltmeter across the battery with the key open, the cell\'s energy', async () => {
  const {compile} = await import('../src/verbs/index.ts');
  const w = compile({verb: 'circuit', view: 'work', volts: 12, charge: 2} as any);
  assert.deepEqual(w.errors, []);
  // NCERT Example 11.2: moving 2 C across 12 V takes 24 J.
  assert.match((w.scene!.meta as any).facts[0], /moving 2 C from A to B across a potential difference of 12 V takes 24 J of work/);
  const open = compile({verb: 'circuit', cells: 2, items: [{id: 'lamp', kind: 'bulb', R: 10}], key: 'open', voltmeters: ['battery'], energy: true} as any).scene!;
  assert.equal((open.props.find(p => p.id === 'vm-battery-read0') as any).text, '3 V');
  assert.ok(open.props.some(p => p.type === 'text' && (p as any).text === 'V across battery = 3 V'));
  assert.equal((open.props.find(p => p.id === 'energy-level') as any).keys, undefined, 'no drain with the key open');
  const closed = compile({verb: 'circuit', cells: 2, items: [{id: 'lamp', kind: 'bulb', R: 10}], energy: true} as any).scene!;
  assert.ok((closed.props.find(p => p.id === 'energy-level') as any).keys.w.length === 2, 'runs down while current flows');
  assert.ok((closed.meta as any).anchors.lamp_left && (closed.meta as any).anchors.lamp_right);
});

test('energy_use: the book\'s refrigerator bill, a cycling compressor, and the current against a fuse', async () => {
  // NCERT Class 10 Example 11.13: a 400 W refrigerator 8 hours a day for 30 days uses 96 kWh; at Rs 3.00 a unit, Rs 288
  const {energyUse} = await import('../src/verbs/energy-use.ts');
  assert.equal(energyUse({appliances: [{name: 'refrigerator', watts: 400, hours: 8}], days: 30}).kwh, 96);
  assert.equal(energyUse({appliances: [{name: 'refrigerator', watts: 400, hours: 24, duty: 0.4}]}).kwh, 3.84);
  const bill = compile({verb: 'energy_use', appliances: [{name: 'refrigerator', watts: 400, hours: 8}], days: 30, rate: 3, units: true} as any);
  assert.deepEqual(bill.errors, []);
  const facts = (bill.scene!.meta as any).facts.join(' ');
  assert.match(facts, /96,000 Wh = 96 kWh/);
  assert.match(facts, /Rs 288/);
  const texts = bill.scene!.props.map(p => (p as any).text).join(' ');
  assert.match(texts, /3\.46 × 10⁸ J/);
  const house = compile({verb: 'energy_use', appliances: [{name: 'heater', watts: 2000}, {name: 'iron', watts: 1000}], volts: 220, fuse: 10} as any);
  assert.match((house.scene!.meta as any).facts.join(' '), /13\.64 A exceeds the fuse's 10 A rating/);
  // a meter under one unit counts watt-hours
  const one = compile({verb: 'energy_use', appliances: [{name: 'bulb', watts: 1}]} as any).scene!;
  assert.equal((one.props.find(p => p.id === 'meter-reading') as any).text, '{e} Wh');
  const errors = (spec: object) => compile({verb: 'energy_use', ...spec} as any).errors.join(' | ');
  assert.match(errors({appliances: []}), /appliances is a list of 1 to 5/);
  assert.match(errors({appliances: [{name: 'fan', watts: 75, hours: 30}]}), /hours is hours of use a day/);
  assert.match(errors({appliances: [{name: 'fan', watts: 75, duty: 1.5}]}), /duty is the fraction/);
  assert.match(errors({appliances: [{name: 'fan', watts: 75}], fuse: 5}), /a fuse needs volts/);
});

test('magnetic_field: computed field lines of a wire, loop, solenoid and bar magnet; the right-hand rule; Oersted\'s compass', async () => {
  const {fieldAt, fieldLines} = await import('../src/verbs/magnetism.ts');
  // a current out of the page: anticlockwise field, falling as 1/r
  const [bx, by] = fieldAt([{x: 0, y: 0, I: 1}], [1, 0]);
  assert.ok(Math.abs(bx) < 1e-9 && by > 0);
  assert.ok(Math.abs(Math.hypot(...fieldAt([{x: 0, y: 0, I: 1}], [2, 0])) * 2 - by) < 1e-9);
  // field lines round a wire close on themselves (circles), and a larger current draws more of them
  const circles = (I: number) => fieldLines([{x: 0, y: 0, I}], [[0.35, 0], [3.8, 0]], 0.35, [4, 3]);
  const one = circles(1);
  assert.ok(one.length >= 5);
  for (const l of one) { const r = l.map(p => Math.hypot(...p)); assert.ok(Math.max(...r) - Math.min(...r) < 0.02, 'a circle'); }
  assert.ok(circles(2).length > one.length);
  // a solenoid's field inside is along its axis, from S to N; outside at the middle it runs back
  const sol = (compile({verb: 'magnetic_field', source: 'solenoid', north: 'right'} as any));
  assert.deepEqual(sol.errors, []);
  assert.ok(sol.scene!.props.some(p => (p as any).text === 'N' && (p as any).x > 960 * 0.6));
  // Oersted: with no current the needle points north (up); with current it turns
  const oe = compile({verb: 'magnetic_field', source: 'wire', key: 'closes', compasses: 1} as any).scene!;
  const n = oe.props.find(p => p.id === 'compass0-n') as any, c = oe.props.find(p => p.id === 'compass0-case') as any;
  assert.ok(Math.abs(n.x2 - c.x) < 0.5 && n.y2 < c.y, 'north before the current');
  assert.ok(n.keys.x2.at(-1)[1] < c.x - 5, 'west after: a current out of the page, compass north of the wire');
  const facts = (compile({verb: 'magnetic_field', source: 'wire', direction: 'in'} as any).scene!.meta as any).facts.join(' ');
  assert.match(facts, /clockwise as seen here \(right-hand thumb rule\)/);
  const errors = (spec: object) => compile({verb: 'magnetic_field', ...spec} as any).errors.join(' | ');
  assert.match(errors({source: 'coil'}), /source is bar_magnet, wire, loop, solenoid or uniform/);
  assert.match(errors({source: 'wire', direction: 'up'}), /direction is out or in here/);
  assert.match(errors({source: 'bar_magnet', key: 'closes'}), /a bar_magnet has no current or key/);
  assert.match(errors({source: 'loop', turns: 60}), /turns is 2 to 16 for a solenoid, 1 to 50/);
  assert.match(errors({source: 'wire', trace: true}), /trace .* is for a bar_magnet/);
  // 2026-10-29, the loop and solenoid film: why a coil's turns add up needs packed same-way turns against spread or
  // reversed ones; the reviewer rejected two identical drawings titled differently
  const centre = (c: string) => Number(((compile({verb: 'magnetic_field', source: 'solenoid', compare: c} as any).scene!.props.find(p => p.id === 'centre-field1') as any).text).match(/(\d+)%/)![1]);
  for (const c of ['spread', 'reversed']) assert.ok(centre(c) > 10 && centre(c) < 80, `${c}: a smaller field at the centre, not none`);
  const lines = (c: string, i: number) => compile({verb: 'magnetic_field', source: 'solenoid', compare: c} as any).scene!.props.filter(p => p.id.startsWith('line') && !p.id.includes('arrow') && (p as any).show[0] < (i ? 1e9 : 5) && (p as any).show[0] >= (i ? 5 : 0)).length;
  assert.ok(lines('spread', 1) < lines('spread', 0), 'fewer lines once spread');
  assert.match(errors({source: 'loop', compare: 'spread'}), /compare .* is for a solenoid/);
  assert.match(errors({source: 'solenoid', compare: 'spread', key: 'closes'}), /compare shows one current/);
});

test('magnetic_force: I × B on a rod, Fleming\'s left-hand rule from any two directions, a charge curving, F ∝ sin θ', async () => {
  const {fleming} = await import('../src/verbs/magnetic-force.ts');
  assert.deepEqual(fleming({field: 'down', current: 'east'}), {current: 'east', field: 'down', force: 'north'});
  assert.equal(fleming({current: 'east', force: 'north'})!.field, 'down');
  assert.equal(fleming({field: 'down', force: 'north'})!.current, 'east');
  assert.equal(fleming({field: 'up', current: 'up'}), null);
  // 2026-10-29, the force-on-a-conductor film: Ampère's equal and opposite force on the magnet, and no current, no swing
  const rx = compile({verb: 'magnetic_force', scene: 'rod', currents: [0, 2], reaction: true} as any);
  assert.deepEqual(rx.errors, []);
  const on = rx.scene!.props.find(p => p.id === 'force1') as any, back = rx.scene!.props.find(p => p.id === 'reaction1') as any;
  assert.ok(Math.sign(on.x2 - on.x1) === -Math.sign(back.x2 - back.x1), 'the magnet is pushed the other way');
  assert.ok(!rx.scene!.props.some(p => p.id === 'force0'), 'no current, no force');
  assert.match(compile({verb: 'magnetic_force', scene: 'rule', current: 'east', field: 'up', reaction: true} as any).errors.join(), /reaction are for scene rod/);
  // NCERT Exercise: an alpha particle (positive) moving west is deflected north: the field is upward
  assert.equal(fleming({current: 'west', force: 'north'})!.field, 'up');
  // an electron beam moving north is a current flowing south
  const beam = compile({verb: 'magnetic_force', scene: 'rule', current: 'north', charge: 'negative', force: 'east'} as any);
  assert.deepEqual(beam.errors, []);
  assert.match((beam.scene!.meta as any).facts.join(' '), /field is down, the current south and the force east/);
  // the rod: current out of the page, field up, pushed to the left (−x); reversed current, to the right
  const rod = compile({verb: 'magnetic_force', scene: 'rod', reverse: 'current'} as any).scene!;
  const xs = (rod.props.find(p => p.id === 'rod') as any).keys.x, cx = (rod.props.find(p => p.id === 'rod') as any).x;
  assert.ok(xs[2][1] < cx && xs.at(-1)[1] > cx);
  const facts = (compile({verb: 'magnetic_force', scene: 'angle'} as any).scene!.meta as any).facts.join(' ');
  assert.match(facts, /at 45° the force is 71%/);
  const errors = (spec: object) => compile({verb: 'magnetic_force', ...spec} as any).errors.join(' | ');
  assert.match(errors({scene: 'rule', field: 'up'}), /give two of current, field and force/);
  assert.match(errors({scene: 'rule', field: 'up', current: 'down'}), /parallel or opposite/);
  assert.match(errors({scene: 'rod', current: 'east'}), /rod: current is out or in/);
  assert.match(errors({scene: 'angle', angles: [120]}), /0 to 90 degrees/);
});

test('domestic_circuit: appliances in parallel, I = P/V against each fuse; overload, short circuit and earthing', () => {
  const home = compile({verb: 'domestic_circuit', circuits: [{rating: 15, appliances: [{name: 'geyser', watts: 2000, earth: true}]}, {rating: 5, appliances: [{name: 'bulb', watts: 60}, {name: 'fan', watts: 75}]}]} as any);
  assert.deepEqual(home.errors, []);
  assert.match((home.scene!.meta as any).facts.join(' '), /geyser 2,000 W takes 9\.09 A; together 9\.09 A/);
  // NCERT Exercise 12: a 2 kW oven on a 5 A circuit at 220 V draws 9.09 A: the fuse melts
  const oven = compile({verb: 'domestic_circuit', circuits: [{rating: 5, appliances: [{name: 'oven', watts: 2000, earth: true}]}], fault: 'overload', at: 0} as any).scene!;
  assert.ok(oven.props.some(p => p.id === 'c0-fuse-blown'));
  // with an earth wire a leak blows the fuse; without one the body stays live
  const leak = (earth: boolean) => compile({verb: 'domestic_circuit', circuits: [{rating: 15, appliances: [{name: 'iron', watts: 1000, earth}]}], fault: 'leak', at: [0, 0]} as any).scene!;
  assert.ok(leak(true).props.some(p => p.id === 'c0-fuse-blown') && leak(true).props.some(p => p.id === 'earth-path'));
  assert.ok(!leak(false).props.some(p => p.id === 'c0-fuse-blown') && leak(false).props.some(p => p.id === 'shock'));
  const errors = (spec: object) => compile({verb: 'domestic_circuit', ...spec} as any).errors.join(' | ');
  assert.match(errors({circuits: [{rating: 5, appliances: [{name: 'heater', watts: 2000}]}]}), /take 9\.09 A, over its 5 A fuse/);
  assert.match(errors({circuits: [{rating: 15, appliances: [{name: 'bulb', watts: 60}]}], fault: 'overload'}), /within its 15 A fuse/);
  assert.match(errors({circuits: [{rating: 15, appliances: [{name: 'bulb', watts: 60}]}], fault: 'short', at: 0}), /at is \[circuit, appliance\]/);
});

test('no verb writes into the film\'s header strip (the top 9.5%: the film\'s title, up to two lines, and the scene count)', async () => {
  // 2026-10-29: a graph's y-axis name sat under the header of the Factors Affecting Resistance film
  const {CARDS} = await import('../src/verbs/cards.ts');
  const texts = (items: any[]): any[] => items.flatMap(p => p.type === 'group' ? texts(p.items) : p.type === 'text' ? [p] : []);
  // and a half-width part of a compound, which is compiled at its box's size (its own title once sat in the strip)
  for (const [name, card] of Object.entries(CARDS)) for (const spec of [card.example, card.shortest].filter(Boolean)) for (const half of [false, true]) {
    if (half && !['vector_add', 'forces', 'plane_motion'].includes(name)) continue;    // the verbs with a narrow layout (frame())
    const r = compile(half ? {...(spec as any), width: 960, height: 1080} : spec as any);
    if (!r.scene) continue;
    const scene = r.scene, f = frame(scene, scene.duration - 0.01) as any;
    const high = texts(f.props).filter(t => t.y - (t.size ?? 24) < 0.095 * scene.height);
    assert.deepEqual(high.map(t => t.id), [], `${name}${half ? ' (half width)' : ''}`);
    // the film fits a scene's 9.5%–96% above its captions (renderer LINKWORK_FIT): no text below 96%
    const low = texts(f.props).filter(t => t.y > 0.96 * scene.height);
    assert.deepEqual(low.map(t => t.id), [], `${name}${half ? ' (half width)' : ''}`);
  }
});

test('dimensions: formulas, consistency, a deduced relation and a unit conversion, all computed', async () => {
  // 2026-10-29, Class 11 Units and Measurement (keph1-01 C5–C8)
  const {deduce, convert, dimText, product} = await import('../src/verbs/dimensions.ts');
  assert.equal(dimText(product([['mass', 1], ['acceleration', 1]])), '[M L T⁻²]');
  assert.equal(dimText(product([['angle', 1]])), '[M⁰ L⁰ T⁰]');
  assert.deepEqual(deduce('period', ['length', 'mass', 'g']), [0.5, 0, -0.5]);          // T = k √(l/g)
  assert.equal(deduce('force', ['length', 'time']), null);                                 // no mass: cannot be built
  assert.ok(Math.abs(convert('energy', {M: 'kg', L: 'm', T: 's'}, {M: 'g', L: 'cm', T: 's'}).factor - 1e7) < 1e-3);   // 1 J = 10⁷ erg
  assert.ok(Math.abs(convert('force', {M: 'kg', L: 'm', T: 's'}, {M: 'g', L: 'cm', T: 's'}).factor - 1e5) < 1e-6);   // 1 N = 10⁵ dyne
  const check = (right: any[]) => compile({verb: 'dimensions', mode: 'check', left: {label: 'x', factors: [['distance', 1]]}, right} as any).scene!;
  const good = check([{label: 'v₀t', factors: [['velocity', 1], ['time', 1]]}, {label: '½at²', factors: [['acceleration', 1], ['time', 2]]}]);
  assert.match((good.props.find(p => p.id === 'verdict') as any).text, /dimensionally consistent/);
  const bad = check([{label: 'v₀t²', factors: [['velocity', 1], ['time', 2]]}]);
  assert.match((bad.props.find(p => p.id === 'verdict') as any).text, /Not consistent: v₀t²/);
  const errors = (spec: object) => compile({verb: 'dimensions', ...spec} as any).errors.join(' | ');
  assert.match(errors({mode: 'formula', quantity: 'force', factors: [['mass', 1], ['velocity', 1]]}), /force is \[M L T⁻²\] but its factors give \[M L T⁻¹\]/);
  assert.match(errors({mode: 'deduce', quantity: 'force', depends: ['length', 'time']}), /cannot be built from length, time/);
  assert.match(errors({mode: 'formula', quantity: 'speed', factors: [['velocty', 1]]}), /'velocty' is not a known quantity/);
});

test('motion_on_line: a ruler dropped between the fingers falls to scale beside an upright axis (reaction time)', () => {
  const spec = {verb: 'motion_on_line', axis: {range: [-0.25, 0.35], unit: 'm', vertical: true}, object: 'ruler', object_length: 0.3,
    accelerate: {x0: 0, v0: 0, a: -9.8, t: [0, 0.207]}, marks: [{x: 0, label: 'fingers'}]};
  const {scene, errors} = compile(spec as any);
  assert.deepEqual(errors, []);
  const axis = scene!.props.find(p => p.id === 'axis') as any, ruler = scene!.props.find(p => p.id === 'object') as any;
  const label = scene!.props.find(p => p.id === 'mark0-label') as any;
  // 0.3 m of a 0.6 m axis drawn from top to bottom: half of it
  const span = (axis.y1 - 30 * scene!.height / 1080) - (axis.y2 + 40 * scene!.height / 1080);
  assert.ok(Math.abs(ruler.size - span / 2) < 1, `${ruler.size} vs ${span / 2}`);
  assert.ok(label.x > axis.x1 + 44 / 300 * ruler.size, 'the label is clear of the ruler');
});

test('vector_add: the book\'s rain and wind, resolving, subtracting and multiplying are computed', () => {
  const facts = (spec: object) => (compile({verb: 'vector_add', ...spec} as any).scene!.meta!.facts as string[]).join(' | ');
  // NCERT Class 11 Example 3.1: rain 35 m/s down, wind 12 m/s east: 37 m/s at about 19° to the vertical
  const rain = facts({a: {magnitude: 35, angle: -90}, b: {magnitude: 12, angle: 0}, names: ['vr', 'vw'], unit: 'm/s'});
  assert.match(rain, /\|vr \+ vw\| = 37 m\/s/); assert.match(rain, /makes 18\.92° with vr/);
  assert.match(facts({mode: 'resolve', a: {magnitude: 5, angle: 37}, names: ['A', 'B']}), /Ax = 3\.99 \| Ay = 3\.01/);
  assert.match(facts({mode: 'subtract', a: [4, 1], b: [1, 3], names: ['A', 'B']}), /A − B = \(3, −2\)/);
  assert.match(facts({mode: 'scale', a: [3, 4], factors: [-1], names: ['A', 'B']}), /\|−A\| = 5/);
  assert.match(facts({mode: 'components', a: [3, 1], b: [1, 3], names: ['A', 'B']}), /Rx = 4 \| Ry = 4/);
  assert.match(compile({verb: 'vector_add', mode: 'add', a: [1, 1]} as any).errors.join(' '), /needs b/);
  assert.match(compile({verb: 'vector_add', a: [9, 9], b: [1, 1], x: [0, 5]} as any).errors.join(' '), /outside the window/);
  // a vector on screen is drawn to scale: equal units across and up
  const sc = compile({verb: 'vector_add', a: [4, 1], b: [1, 3]} as any).scene!, p = sc.planes![0];
  assert.ok(Math.abs((p.box[2] - p.box[0]) / (p.x[1] - p.x[0]) - (p.box[3] - p.box[1]) / (p.y[1] - p.y[0])) < 1e-6);
});

test('plane_motion: velocity along the tangent, constant acceleration and uniform circular motion, from the book', () => {
  const facts = (spec: object) => (compile({verb: 'plane_motion', ...spec} as any).scene!.meta!.facts as string[]).join(' | ');
  // NCERT Example 3.3: r = 3.0t î + 2.0t² ĵ: v = 3.0 î + 4.0 ĵ at t = 1.0 s, speed 5 m/s
  assert.match(facts({formula: {x: '3*t', y: '2*t^2', t: [0, 2]}, show: ['limit'], at: 1}), /at t = 1 s the velocity is \(3, 4\) m\/s, speed 5 m\/s/);
  // NCERT Example 3.4: from the origin with v0 = 10 ĵ and a = 8.0 î + 2.0 ĵ; at t = 2 s, x = 16 m, y = 24 m
  assert.match(facts({accelerate: {v0: [0, 10], a: [8, 2], t: [0, 2]}}), /r = \(16, 24\) m, v = \(16, 14\) m\/s/);
  // NCERT Example 3.8: an insect in a 12 cm groove, 7 turns in 100 s: ω = 0.44 rad/s, v = 5.3 cm/s, a = 2.3 cm/s²
  const insect = facts({circle: {radius: 12, speed: 12 * 2 * Math.PI * 7 / 100}, unit: 'cm', show: ['delta_v']});
  assert.match(insect, /ω = 0\.44 rad\/s/); assert.match(insect, /a = v²\/R = 2\.32 cm\/s²/); assert.match(insect, /ν = 0\.07 per second/);
  assert.match(compile({verb: 'plane_motion', circle: {radius: 1, speed: 1}, accelerate: {v0: [1, 0], a: [0, 0], t: [0, 1]}} as any).errors.join(' '), /exactly one path/);
  assert.match(compile({verb: 'plane_motion', accelerate: {v0: [1, 0], a: [0, 0], t: [0, 1]}, show: ['delta_v']} as any).errors.join(' '), /delta_v is for a circle/);
  // three side by side (a recap): each part's text fits its narrow box (2026-10-29: a recap's text ran off its parts)
  const part = (id: string, x: number, spec: object) => ({id, box: [x, 0, 640, 1080], spec});
  const tri = compile({compound: true, parts: [part('p', 0, {verb: 'plane_motion', title: 'Position vector', accelerate: {r0: [1, 1], v0: [2, 1], a: [0, 0], t: [0, 2]}, show: ['position']}),
    part('e', 640, {verb: 'vector_add', mode: 'equal', title: 'Equal vectors', a: [3, 2], at: [[4, -1]]}),
    part('r', 1280, {verb: 'vector_add', mode: 'resolve', title: 'Resolving a vector', a: {magnitude: 5, angle: 37}, names: ['A', 'B'], unit: 'N'})]} as any);
  assert.deepEqual(tri.errors, []);
  assert.deepEqual(check(tri.scene!, {every: 3}), []);
});

test('vector_add: the unit vector â = a / |a| beside a; a factor of 1 is refused', () => {
  // 2026-10-29, Resolution of Vectors: a plan for "a unit vector" drew a of length 1 times 1, two arrows both named a
  const unit = compile({verb: 'vector_add', mode: 'unit', a: [3, 4], illustrative: true} as any).scene!;
  const texts = unit.props.filter(q => q.type === 'text').map(q => (q as any).text as string);
  assert.ok(texts.includes('â'));
  assert.ok(texts.some(t => /â = a \/ \|a\|.*length one/.test(t)), 'the words survive an illustrative scene');
  const hat = unit.props.find(q => q.id === 'k0') as any;
  assert.ok(Math.abs(Math.hypot(hat.x2 - hat.x1, hat.y2 - hat.y1) - 1) < 1e-9);
  assert.match((compile({verb: 'vector_add', mode: 'unit', a: [3, 4]} as any).scene!.meta!.facts as string[]).join(' | '), /â = \(0\.60, 0\.80\), length 1/);
  assert.match(compile({verb: 'vector_add', mode: 'scale', a: [1, 0], factors: [1]} as any).errors.join(' '), /factor of 1 draws a again.*mode 'unit'/);
  assert.match(compile({verb: 'vector_add', mode: 'unit', a: {magnitude: 1, angle: 0}} as any).errors.join(' '), /length other than 1/);
});

test('plane_motion delta_v: both triangles, named, beside each other, in a half-width illustrative part', () => {
  // 2026-10-29, Uniform Circular Motion: the Δv triangle was drawn at P at the motion's arrow scale, specks in a
  // half-width part, and an illustrative scene hid every line about it
  const both = compile({compound: true, parts: [{id: 'v', box: [960, 0, 960, 1080], spec: {verb: 'plane_motion', title: 'Velocity vectors',
    circle: {radius: 3, speed: 2}, show: ['delta_v'], illustrative: true}}]} as any);
  assert.deepEqual(both.errors, []);
  const sc = both.scene!.parts![0].scene, texts = sc.props.filter(q => q.type === 'text').map(q => (q as any).text as string);
  for (const name of ['r', 'r′', 'Δr', 'v', 'v′', 'Δv', 'P', 'P′', 'a']) assert.ok(texts.includes(name), name);
  assert.ok(texts.some(t => /triangle of r, r′, Δr and the triangle of v, v′, Δv are similar/.test(t)));
  assert.ok(texts.some(t => /Δv points at the centre/.test(t)));
  // the velocity triangle is big: v is drawn at least half the radius long, and beside the circle, inside the window
  const p = sc.planes![0], v1 = sc.props.find(q => q.id === 'v1') as any;
  assert.ok(Math.hypot(v1.x2 - v1.x1, v1.y2 - v1.y1) >= 1.5);
  assert.ok(v1.x1 > 3 && v1.x1 < p.x[1]);
  for (const q of sc.props.filter(q => /^(v2|dv)-/.test(q.id)) as any[]) assert.ok(q.x2 < p.x[1] && q.y2 < p.y[1] && q.y2 > p.y[0], q.id);
  assert.deepEqual(check(both.scene!, {every: 3}), []);
  // limit: an illustrative scene keeps the words
  const lim = compile({verb: 'plane_motion', formula: {x: '3*t', y: '2*t^2', t: [0, 2]}, show: ['limit'], illustrative: true} as any).scene!;
  assert.ok(lim.props.some(q => q.type === 'text' && /Δr\/Δt becomes the velocity v/.test((q as any).text)));
});

test('forces: free-body diagrams solved by the second law, from the book', () => {
  // 2026-10-29: Class 11 Laws of Motion had no verb for the forces on a body
  const facts = (spec: object) => (compile({verb: 'forces', ...spec} as any).scene!.meta!.facts as string[]).join(' | ');
  // Example 4.4 (Fig. 4.8): point P of the rope, 60 N down, 50 N across: T1 = 78 N
  assert.match(facts({body: 'point', forces: [{name: 'T2', kind: 'tension', magnitude: 60, direction: 'down'}, {name: 'F', magnitude: 50, direction: 'right'}, {name: 'T1', kind: 'tension'}], a: [0, 0]}), /T1 = 78\.10 N, solved/);
  // Exercise 4.15: 70 kg in a lift, g = 10: up with 5 m/s² the scale reads 1050 N, down with 5 m/s² 350 N
  const lift = (ay: number) => facts({mass: 70, g: 10, surface: 'floor', forces: [{name: 'mg', kind: 'weight'}, {name: 'N', kind: 'normal'}], a: [0, ay]});
  assert.match(lift(5), /N = 1050 N/); assert.match(lift(-5), /N = 350 N/);
  // a block at rest on a 15° slope: friction mg sin θ up the slope, N = mg cos θ
  const slope = facts({mass: 4, surface: 'incline', angle: 15, forces: [{name: 'mg', kind: 'weight'}, {name: 'N', kind: 'normal'}, {name: 'f', kind: 'friction', direction: 'up_slope'}], a: [0, 0]});
  assert.match(slope, /N = 37\.86 N/); assert.match(slope, /f = 10\.15 N/); assert.match(slope, /net force is zero/);
  // Example 4.10: a banked road at its optimum speed needs no friction: N alone gives a = g tan θ towards the centre
  assert.match(facts({body: 'car', mass: 1000, surface: 'incline', angle: 15, forces: [{name: 'mg', kind: 'weight'}, {name: 'N', kind: 'normal'}], a: [-9.8 * Math.tan(15 * Math.PI / 180), 0]}), /N = 10146 N/);
  // without a, the normal force is solved and the net force gives a = F/m
  assert.match(facts({mass: 2, surface: 'floor', forces: [{name: 'W', kind: 'weight'}, {name: 'N', kind: 'normal'}, {name: 'F', kind: 'applied', magnitude: 6, direction: 'right'}], show: ['net']}), /net force is 6 N; a = 3 m\/s²/);
  // friction at work: a push slips the block at µs N; a tilted plane at tan θ = µs (Example 4.6: 15°)
  assert.match(facts({mass: 5, ramp: {kind: 'push', mu_s: 0.5, mu_k: 0.4, to: 40}}), /slips when the push passes 24\.50 N/);
  assert.match(facts({mass: 4, ramp: {kind: 'tilt', mu_s: Math.tan(15 * Math.PI / 180)}}), /θ = 15°/);
  const err = (spec: object) => compile({verb: 'forces', ...spec} as any).errors.join(' ');
  assert.match(err({forces: [{name: 'A'}, {name: 'B', direction: 'up'}, {name: 'C', direction: 0}, {name: 'D', direction: 90}], a: [0, 0]}), /unknown in size and direction, so every other force needs its magnitude/);
  assert.match(err({mass: 1, forces: [{name: 'W', kind: 'weight'}, {name: 'N', kind: 'normal', magnitude: 9.8}], a: [0, 2]}), /add to .* but m a is/);
  assert.match(err({forces: [{name: 'A', direction: 'up'}, {name: 'B', direction: 'down'}, {name: 'C', magnitude: 3, direction: 0}], a: [0, 0]}), /parallel/);
  assert.match(err({mass: 1, forces: [{name: 'W', kind: 'weight'}, {name: 'T', kind: 'tension', direction: 90}]}), /T has no magnitude.*give a/);
  assert.match(err({mass: 1, ramp: {kind: 'push', mu_s: 0.5, to: 10}, forces: [{name: 'W', kind: 'weight'}]}), /leave forces out/);
  assert.match(err({forces: [{name: 'f', kind: 'friction', magnitude: 1, direction: 'up_slope'}]}), /surface is incline/);
  // drawn inside the frame, in a narrow part too
  for (const spec of [{body: 'car', mass: 1000, surface: 'incline', angle: 15, forces: [{name: 'mg', kind: 'weight'}, {name: 'N', kind: 'normal'}, {name: 'f', kind: 'friction', direction: 'down_slope'}], a: [-10, 0], show: ['net', 'components']},
    {mass: 4, ramp: {kind: 'tilt', mu_s: 0.27, mu_k: 0.2}}, {mass: 5, ramp: {kind: 'push', mu_s: 0.5, mu_k: 0.4, to: 40}}]) {
    assert.deepEqual(check(compile({verb: 'forces', ...spec} as any).scene!, {every: 3}), []);
    assert.deepEqual(check(compile({compound: true, parts: [{id: 'a', box: [0, 0, 960, 1080], spec: {verb: 'forces', ...spec}}]} as any).scene!, {every: 3}), []);
  }
});

test('stage: a passenger rides a bus, thrown back as it starts and forward as it stops (inertia)', () => {
  // 2026-10-29, Force and Inertia: no passenger could stand in the book's bus; every plan for it was refused or rejected
  const sc = compile({verb: 'stage', width_m: 40, ground: 'floor', items: [{id: 'bus', object: 'bus', x: 6}, {id: 'p', object: 'figure', x: 7, on: 'bus'}],
    events: [{t: 1, item: 'bus', kind: 'move', to: 30, duration: 5, ease: 'linear'}]} as any);
  assert.deepEqual(sc.errors, []);
  const p = sc.scene!.actors.find(a => a.id === 'f-p')!, poses = p.pose!.map(k => k.pose);
  assert.ok(poses.indexOf('lean_back') >= 0 && poses.indexOf('lean_forward') > poses.indexOf('lean_back'));
  // the feet go with the bus
  const bus = sc.scene!.actors.find(a => a.id === 'd-bus')!;
  assert.ok(p.base!.length > 2 && Math.abs((p.base!.at(-1)!.at[0] - p.base![0].at[0]) - (bus.base!.at(-1)!.at[0] - bus.base![0].at[0])) < 1e-6);
  assert.deepEqual(check(sc.scene!, {every: 3}), []);
  assert.match(compile({verb: 'stage', items: [{id: 'bus', object: 'bus', x: 3}, {id: 'p', object: 'figure', x: 3, on: 'bus'}],
    events: [{t: 0, item: 'p', kind: 'move', to: 8, duration: 2}]} as any).errors.join(' '), /moves with its bus; move the bus/);
});

test('forces: an illustrative diagram needs no mass', () => {
  assert.deepEqual(compile({verb: 'forces', surface: 'floor', illustrative: true, forces: [{name: 'W', kind: 'weight'}, {name: 'N', kind: 'normal'}]} as any).errors, []);
  assert.match(compile({verb: 'forces', surface: 'floor', forces: [{name: 'W', kind: 'weight'}, {name: 'N', kind: 'normal'}]} as any).errors.join(' '), /give mass.*illustrative: true/);
});

test('stage: in a scene where nothing moves, every item is big enough to see', () => {
  // 2026-10-29, Scalars and Vectors: a 1 m block and a marker on a 30 m stage were specks under their labels
  const still = compile({verb: 'stage', width_m: 30, ground: 'floor', items: [{id: 'b', object: 'block', x: 10}, {id: 'm', object: 'marker', x: 20}]} as any);
  // the block is a mover, drawn at least 8% of the stage since 2026-10-30, so it is big enough by itself; the marker is not
  assert.doesNotMatch(still.errors.join(' '), /b is drawn only/);
  assert.match(still.errors.join(' '), /m is drawn only/);
  assert.deepEqual(compile({verb: 'stage', width_m: 10, ground: 'none', items: [{id: 't', object: 'figure', x: 5}, {id: 'bulb', object: 'bulb', x: 5, on: 't', a: 1}]} as any).errors, []);
});

test('a verb whose numbers are the picture is never illustrative', () => {
  const digits = compile({verb: 'sig_figs', mode: 'count', numbers: ['0.0025'], illustrative: true} as any);
  assert.equal(digits.scene, undefined);
  assert.match(digits.errors.join(' '), /never illustrative/);
  assert.match(compile({verb: 'dimensions', mode: 'formula', quantity: 'force', factors: [['mass', 1], ['acceleration', 1]], illustrative: true} as any).errors.join(' '), /never illustrative/);
  assert.deepEqual(compile({verb: 'sig_figs', mode: 'count', numbers: ['0.0025']} as any).errors, []);
});

test('sig_figs: the book\'s rules for significant figures, operations and rounding', async () => {
  // 2026-10-29, Class 11 Units and Measurement (keph1-01 C3–C4)
  const {sigCount, roundSig, operate} = await import('../src/verbs/sig-figs.ts');
  assert.deepEqual(['0.0025', '4.700', '4700', '2.308', '0.200', '2.64e24', '6.032'].map(sigCount), [2, 4, 2, 4, 3, 3, 4]);
  // a dropped 5: an even digit stays, an odd one rises (the book's 2.745 → 2.74, 2.735 → 2.74)
  assert.equal(roundSig('2.745', 3), '2.74');
  assert.equal(roundSig('2.735', 3), '2.74');
  assert.equal(roundSig('2.746', 3), '2.75');
  assert.equal(operate('divide', ['4.237', '2.51']).result, '1.69');               // density 1.69 g cm⁻³
  assert.equal(operate('add', ['436.32', '227.2', '0.301']).result, '663.8');      // the book's 663.8 g
  assert.equal(operate('subtract', ['0.307', '0.304']).result, '0.003');
  const errors = (spec: object) => compile({verb: 'sig_figs', ...spec} as any).errors.join(' | ');
  assert.match(errors({mode: 'count', numbers: [4.7]}), /is a string, so its zeros keep/);
  assert.match(errors({mode: 'round', numbers: ['2.745'], figures: 4}), /figures is how many significant figures to keep, 1 to 3/);
});

test('angle_measure: θ = s/r and Ω = A/r², counted from the drawing\'s measures', () => {
  // 2026-10-29, Class 11 Units and Measurement (keph1-01 C2, Fig. 1.1)
  const facts = (spec: object) => (compile({verb: 'angle_measure', ...spec} as any).scene!.meta as any).facts.join(' ');
  assert.match(facts({kind: 'plane', radius: 2, arc: 2}), /θ = s\/r = 1 rad \(57\.3°\)/);
  assert.match(facts({kind: 'plane', radius: 1, arc: 2 * Math.PI}), /= 6\.283 rad \(360°\)/);
  assert.match(facts({kind: 'solid', radius: 2, area: 4}), /Ω = A\/r² = 1 sr/);
  const errors = (spec: object) => compile({verb: 'angle_measure', ...spec} as any).errors.join(' | ');
  assert.match(errors({kind: 'plane', radius: 1, arc: 7}), /up to the whole circle \(2πr = 6\.28 m\)/);
  assert.match(errors({kind: 'plane', area: 1}), /area is for kind solid/);
});

test('forces: arrows start at the body, the net stays clear of them, and one line of forces makes no triangle', () => {
  // Laws of Motion C1 (2026-10-29): N ran through "1 kg", the net ran down the weight, and a balanced N and W drew a
  // stray "triangle" stroke between two panels
  const scene = compile({verb: 'forces', mass: 2, surface: 'floor', show: ['net'], forces: [{name: 'W', kind: 'weight'},
    {name: 'N', kind: 'normal'}, {name: 'F', kind: 'applied', magnitude: 6, direction: 'right'}]} as any).scene!;
  const by = (id: string) => scene.props.find((p: any) => p.id === id) as any;
  const body = by('body'), side = body.size;
  for (const id of ['F0', 'F1', 'F2']) assert.ok(Math.hypot(by(id).x1 - body.x, by(id).y1 - (body.y - 0.35 * side)) > 0.3 * side, `${id} starts at the edge`);
  const net = by('net'), W = by('F0');
  assert.ok(net.y1 < body.y - 0.35 * side && net.y2 < body.y - 0.35 * side, 'a sideways net is drawn above the centre, off the weight');
  assert.ok(Math.min(net.x1, net.x2) > W.x1, 'and right of the weight');
  const two = compile({verb: 'forces', mass: 2, surface: 'floor', forces: [{name: 'W', kind: 'weight'}, {name: 'C', kind: 'other', magnitude: 4, direction: 'down'}, {name: 'N', kind: 'normal'}], a: [0, 0]} as any).scene!;
  const w = two.props.find((p: any) => p.id === 'F0') as any, c = two.props.find((p: any) => p.id === 'F1') as any;
  assert.ok(Math.abs(w.x1 - c.x1) > 30, 'two forces pointing down are drawn side by side');
  assert.match(compile({verb: 'forces', surface: 'floor', illustrative: true, show: ['triangle'], forces: [{name: 'W', kind: 'weight'}, {name: 'N', kind: 'normal'}]} as any).errors.join(' '), /along one line.*leave 'triangle' out/);
  assert.deepEqual(compile({verb: 'forces', body: 'point', show: ['triangle'], forces: [{name: 'T2', kind: 'tension', magnitude: 60, direction: 'down'}, {name: 'F', magnitude: 50, direction: 'right'}, {name: 'T1', kind: 'tension'}], a: [0, 0]} as any).errors, []);
});

test('annotate: a label near a drawing\'s right edge reads leftwards, clear of the panel and its wrapped title', () => {
  // Circular Motion C6 (2026-10-30): "straight without inward force" ran out of the circle into the panel's title
  const scene = compile({verb: 'plane_motion', title: 'Ground view of a turning car', circle: {radius: 1, speed: 1, turns: 1}, show: ['velocity', 'acceleration'],
    annotate: [{text: 'straight without inward force', at: [1.2, 1.1], colour: 'muted'}], illustrative: true} as any).scene!;
  const label = scene.props.find((p: any) => p.id === 'note0-label') as any, box = (scene.planes![0] as any).box;
  assert.equal(label.align, 'end');
  assert.ok(label.x <= box[2], 'it ends inside the drawing');
});

test('work: W = F d cos θ, friction −f d, and the net work equals ΔK, from the book', () => {
  // 2026-10-30, Class 11 Work, Energy and Power: no verb computed the work done on a moving body
  const facts = (spec: object) => (compile({verb: 'work', ...spec} as any).scene!.meta!.facts as string[]).join(' | ');
  // Example 5.2: a cyclist skids to a stop in 10 m against 200 N from the road: the road does −2000 J of work
  assert.match(facts({mass: 100, v0: Math.sqrt(40), friction: {magnitude: 200}}), /d = 10 m.*\| .*net work = −2000 J/s);
  assert.match(facts({mass: 100, v0: Math.sqrt(40), friction: {magnitude: 200}}), /work done by friction = −f d = −2000 J/);
  // a rope at 30°: N = mg − F sin θ, only F cos θ does work, net work 28.70 J = ½mv²
  const rope = facts({mass: 2, force: {magnitude: 10, angle: 30}, friction: {mu: 0.2}, d: 5, show: ['power']});
  assert.match(rope, /work done by F = F d cos θ = 43.30 J \(positive\)/);
  assert.match(rope, /N = 14.60 N/);
  assert.match(rope, /kinetic energy 0 J → 28.70 J/);
  assert.match(rope, /average power of F = 23.20 W/);
  assert.match(facts({mass: 1, v0: 2, force: {magnitude: 5, angle: 90}, d: 3}), /= 0 J \(zero\)/);
  assert.match(facts({mass: 1, v0: 4, force: {magnitude: 2, angle: 180}, d: 3}), /= −6 J \(negative\)/);
  const err = (spec: object) => compile({verb: 'work', ...spec} as any).errors.join(' ');
  assert.match(err({mass: 1, force: {magnitude: 20, angle: 90}, d: 1}), /lifts the body off the floor|never moves/);
  assert.match(err({mass: 2, force: {magnitude: 1}, friction: {mu: 0.5}, d: 1}), /never moves/);
  assert.match(err({mass: 1, v0: 2, friction: {mu: 0.5}, d: 10}), /stops after 0.41 m/);
  assert.match(err({mass: 1, force: {magnitude: 3}}), /give d/);
  assert.match(err({force: {magnitude: 3}, d: 2}), /give mass.*illustrative: true/);
  assert.deepEqual(compile({verb: 'work', illustrative: true, force: {magnitude: 3, angle: 20}, d: 2} as any).errors, []);
});

test('vector_add dot: A·B = AB cos θ, the projection, by components; negative past 90°', () => {
  const facts = (spec: object) => (compile({verb: 'vector_add', mode: 'dot', ...spec} as any).scene!.meta!.facts as string[]).join(' | ');
  assert.match(facts({a: [4, 0], b: [3, 4]}), /a·b = 12 \| angle between a and b = 53.13° .* projection of b on a = b cos θ = 3/);
  assert.match(facts({a: [4, 1], b: [-2, 3]}), /a·b = −5/);
  // Example 5.1 (in the plane of F and d): |F| = |d| = √50, F·d = 16, cos θ = 0.32
  assert.match(facts({a: {magnitude: Math.sqrt(50), angle: 0}, b: {magnitude: Math.sqrt(50), angle: Math.acos(0.32) * 180 / Math.PI}, names: ['F', 'd']}), /F·d = 16 \|.*cos θ = 0.32/);
  assert.match(compile({verb: 'vector_add', mode: 'dot', a: [1, 2]} as any).errors.join(' '), /dot needs b/);
});

test('stage collide: kinetic energy kept when elastic, partly lost when the bodies stick', () => {
  const facts = (elastic: boolean) => (compile({verb: 'stage', width_m: 20, ground: 'floor', items: [{id: 'a', object: 'cart', x: 3, mass: 2}, {id: 'b', object: 'cart', x: 10, mass: 2}],
    events: [{t: 0.5, item: 'a', kind: 'collide', with: 'b', speed: 3, elastic}]} as any).scene!.meta!.facts as string[]).join(' | ');
  assert.match(facts(true), /kinetic energy before: 9 J; after: 9 J \(conserved: elastic\)/);
  assert.match(facts(false), /kinetic energy before: 9 J; after: 4.5 J; 4.5 J \(50%\) is lost/);
});

test('energy: kinetic and potential energy trade, the total kept or lost to heat, from the book', () => {
  // 2026-10-30, Class 11 Work, Energy and Power: no verb kept energy bars for a moving body
  const facts = (spec: object) => (compile({verb: 'energy', ...spec} as any).scene!.meta!.facts as string[]).join(' | ');
  assert.match(facts({system: 'drop', mass: 0.5, h: 5}), /v = √\(2gh\) = 9.90 m\/s/);
  // Example 5.8: a 1000 kg car at 18 km/h into a spring of k = 6.25 × 10³ N/m: 2.00 m; with µ = 0.5, 1.35 m
  assert.match(facts({system: 'spring', mass: 1000, k: 6250, v0: 5}), /greatest compression x = v√\(m\/k\) = 2 m/);
  assert.match(facts({system: 'spring', mass: 1000, k: 6250, v0: 5, mu: 0.5, g: 10}), /greatest compression x = 1.35 m/);
  const slope = facts({system: 'slope', mass: 2, h: 3, angle: 35, mu: 0.3});
  assert.match(slope, /mgh = K \+ heat: 58.80 = 33.6\d \+ 25.1\d J/);
  const two = facts({system: 'slope', mass: 1, h: 2, paths: 'two'});
  assert.match(two, /v = √\(2gh\) = 6.26 m\/s: the same speed by either path/);
  const [ts, tc] = two.match(/straight track: ([\d.]+) s; down the curve: ([\d.]+) s/)!.slice(1).map(Number);
  assert.ok(tc < ts, 'the curve, steeper at first, gets there sooner');
  assert.match(facts({system: 'pendulum', mass: 0.2, length: 1, amplitude: 60}), /at the bottom: v = √\(2gh\) = 3.13 m\/s/);
  // the bars keep the total: K + U (+ heat) never drifts from the start
  const scene = compile({verb: 'energy', system: 'pendulum', mass: 1, length: 2, amplitude: 50} as any).scene!;
  const total = (scene.props.find((p: any) => p.id === 'bE') as any).keys.h.map((k: any) => k[1]);
  assert.ok(Math.max(...total) - Math.min(...total) < 0.01 * Math.max(...total), 'the total bar stays level');
  const err = (spec: object) => compile({verb: 'energy', ...spec} as any).errors.join(' ');
  assert.match(err({system: 'slope', mass: 1, h: 1, angle: 20, mu: 0.5}), /does not slide/);
  assert.match(err({system: 'spring', mass: 1, k: 10, v0: 1, x0: 0.1}), /not both/);
  assert.match(err({system: 'slope', mass: 1, h: 1, paths: 'two', mu: 0.1}), /frictionless/);
  assert.match(err({system: 'drop', h: 2}), /give mass.*illustrative: true/);
  assert.deepEqual(compile({verb: 'energy', system: 'drop', h: 2, illustrative: true} as any).errors, []);
});

test('stage: a mover along the ground is drawn big enough to see; a projectile stays small', () => {
  // Kinetic Energy (2026-10-30): a cart crossing a 20 m floor was a speck at 2% of the stage
  const cart = compile({verb: 'stage', width_m: 20, ground: 'floor', items: [{id: 'cart', object: 'cart', x: 2, size: 1}],
    events: [{t: 0.5, item: 'cart', kind: 'move', to: 16, duration: 8}]} as any).scene!;
  const drawn = cart.props.find((p: any) => p.id === 'o-cart') as any;
  assert.ok(drawn.size >= 0.07 * 1920, `the cart is drawn ${drawn.size} px wide (it was 86)`);
});

test('stage: every item\'s name is drawn, readable, inside the frame and kept in an illustrative scene', () => {
  // Elastic Collisions (2026-10-30): balls drew no name, "equal mass m1" was crammed onto a small cart, a marker's
  // "x = 0.10 m" ran off the left edge, and an illustrative scene dropped names with a digit (m1)
  const names = (spec: object) => {
    const scene = compile({verb: 'stage', ...spec} as any).scene!;
    return new Map(scene.props.filter((p: any) => p.type === 'text' && p.id.startsWith('name-')).map((p: any) => [p.id.slice(5), p]));
  };
  const balls = names({width_m: 40, ground: 'grass', illustrative: true, items: [{id: 'n', object: 'ball', x: 6, label: 'fast neutron m1'},
    {id: 'c', object: 'ball', x: 26, label: 'light nucleus'}], events: [{t: 0.5, item: 'n', kind: 'collide', with: 'c', speed: 3, elastic: true, after: 0}]});
  assert.deepEqual([...balls.keys()], ['n', 'c']);
  assert.ok(balls.get('n').y !== balls.get('c').y, 'two names on the ground are on opposite sides of it, so they never meet');
  const carts = names({width_m: 40, items: [{id: 'a', object: 'cart', x: 6, label: 'equal mass m1'}, {id: 'b', object: 'cart', x: 26, label: 'B'}],
    events: [{t: 0.5, item: 'a', kind: 'move', to: 20, duration: 4}]});
  assert.ok(carts.has('a') && !carts.has('b'), 'a long name leaves the cart; a short one stays on it');
  const marker = names({width_m: 4, items: [{id: 'm', object: 'marker', x: 0.1, label: 'x = 0.10 m'}, {id: 'k', object: 'block', x: 2, size: 0.5}]}).get('m');
  assert.ok(marker.x - 0.3 * marker.size * marker.text.length >= 0, `the marker's name starts at ${marker.x} px, off the left edge`);
  const drawn = compile({verb: 'stage', width_m: 40, items: [{id: 'n', object: 'ball', x: 6}, {id: 'c', object: 'ball', x: 26}],
    events: [{t: 0.5, item: 'n', kind: 'collide', with: 'c', speed: 3, elastic: true, after: 0}]} as any).scene!.props.find((p: any) => p.id === 'o-n') as any;
  assert.ok(drawn.size >= 0.045 * 1920, `a colliding ball is drawn ${drawn.size} px wide`);
});

test('vector_add cross: the parallelogram\'s area, out of the page anticlockwise, reversed order reverses it', () => {
  const r = compile({verb: 'vector_add', mode: 'cross', a: [3, 0], b: [1, 2]} as any);
  assert.equal((r.scene!.meta as any).cross, 6);
  assert.ok((r.scene!.meta as any).facts.some((x: string) => /out of the page/.test(x)));
  assert.equal((compile({verb: 'vector_add', mode: 'cross', a: [1, 2], b: [3, 0]} as any).scene!.meta as any).cross, -6);
  assert.match(compile({verb: 'vector_add', mode: 'cross', a: [1, 2]} as any).errors.join(), /cross needs b/);
});

test('centre_of_mass reproduces the book: Example 6.1 particles, the L-shaped lamina, a burst keeps to the parabola', () => {
  // Example 6.1: 100 g, 150 g, 200 g at the corners of a 0.5 m equilateral triangle
  const tri = compile({verb: 'centre_of_mass', masses: [{m: 100, x: 0, y: 0}, {m: 150, x: 0.5, y: 0}, {m: 200, x: 0.25, y: 0.25 * Math.sqrt(3)}]} as any).scene!;
  const [X, Y] = (tri.meta as any).cm;
  assert.ok(Math.abs(X - 5 / 18) < 1e-6 && Math.abs(Y - Math.sqrt(3) / 9) < 1e-6, `CM (${X}, ${Y})`);
  // Example 6.3: three 1 m squares in an L: (5/6, 5/6) m
  const L = compile({verb: 'centre_of_mass', bodies: [{shape: 'rectangle', at: [0.5, 0.5]}, {shape: 'rectangle', at: [1.5, 0.5]}, {shape: 'rectangle', at: [0.5, 1.5]}]} as any).scene!;
  assert.ok((L.meta as any).cm.every((v: number) => Math.abs(v - 5 / 6) < 1e-6), `L-shape CM ${(L.meta as any).cm}`);
  // a burst at the top: piece 2's velocity from momentum; the CM stays on the parabola
  const b = compile({verb: 'centre_of_mass', explode: {v0: 30, angle: 60, pieces: [1, 2], v1: [0, 10]}} as any).scene!;
  const facts = (b.meta as any).facts.join(' | ');
  assert.match(facts, /piece 2 \(2 kg\) just after: \(22\.50, −5\) m\/s/);
  const err = (spec: object) => compile({verb: 'centre_of_mass', ...spec} as any).errors.join(' ');
  assert.match(err({masses: [{m: 1, x: 0}], bodies: [{shape: 'disc'}]}), /exactly one/);
  assert.match(err({bodies: [{shape: 'rod'}, {shape: 'disc'}]}), /needs m for every body/);
  assert.match(err({explode: {v0: 10, angle: 45, pieces: [1, 1], v1: [0, 0], at: 9}}), /time in flight/);
  // the centre of gravity: one point however the body is turned; below the CM where g weakens upwards
  const turned = compile({verb: 'centre_of_mass', bodies: [{shape: 'triangle', vertices: [[0, 0], [2, 0], [0.6, 1.5]]}], turns: [0, 60, 150]} as any).scene!;
  assert.equal(turned.props.filter(p => /^plumb/.test(p.id)).length, 3);
  const uni = compile({verb: 'centre_of_mass', bodies: [{shape: 'rectangle', w: 1, h: 2}], gravity: 'uniform'} as any).scene!;
  assert.ok(!(uni.meta as any).cg && (uni.meta as any).facts.join(' ').includes('centre of gravity at the centre of mass'));
  const vary = compile({verb: 'centre_of_mass', bodies: [{shape: 'rod', length: 3, angle: 90}], gravity: 'varying'} as any).scene!;
  const [cgx, cgy] = (vary.meta as any).cg, [cmx, cmy] = (vary.meta as any).cm;
  assert.ok(Math.abs(cgx - cmx) < 1e-6 && cgy < cmy - 0.1, `CG (${cgx}, ${cgy}) below CM (${cmx}, ${cmy})`);
  assert.match(err({bodies: [{shape: 'disc'}], turns: [0, 90]}), /looks the same turned/);
  assert.match(err({bodies: [{shape: 'rectangle'}, {shape: 'rectangle', at: [2, 0]}], gravity: 'uniform'}), /for one body/);
});

test('orbit reproduces the book: equal areas, T² ∝ a³, Newton\'s cannon, a satellite\'s speed, period and energies', () => {
  const meta = (spec: object) => compile({verb: 'orbit', ...spec} as any).scene!.meta as any;
  const kep = meta({kind: 'kepler', e: 0.5, show: ['areas', 'speeds']});
  assert.ok(Math.abs(kep.areas[0] - kep.areas[1]) < 0.002 * kep.areas[0], `areas ${kep.areas}`);
  assert.ok(Math.abs(kep.ratio - 3) < 1e-9);                           // vP / vA = (1 + e) / (1 − e)
  assert.ok(meta({kind: 'periods', planets: [{name: 'Earth', a: 1}, {name: 'Mars', a: 1.524}]}).ratios.every((r: number) => Math.abs(r - 1) < 1e-9));
  const cannon = meta({kind: 'launch', speeds: [6, 7.91, 9.5, 11.2]});
  assert.ok(Math.abs(cannon.v1 - 7.91) < 0.01 && Math.abs(cannon.ve - 11.18) < 0.01, `v1 ${cannon.v1}, ve ${cannon.ve}`);
  assert.deepEqual(cannon.kinds, ['falls back', 'circular orbit', 'elliptical orbit', 'escapes']);
  // a satellite 400 km up: about 7.67 km/s, 92 minutes; E = −KE, PE = −2 KE
  const sat = compile({verb: 'orbit', kind: 'satellite', h: 400, m: 400, show: ['energy']} as any).scene!.meta as any;
  assert.ok(Math.abs(sat.v - 7.67) < 0.01 && Math.abs(sat.T * 60 - 92.4) < 0.2, `v ${sat.v}, T ${sat.T}`);
  assert.match(sat.facts.join(' | '), /KE = 1\.18 × 10¹⁰ J \| PE = −2\.35 × 10¹⁰ J \| total energy E = −1\.18 × 10¹⁰ J/);
  // geostationary: 35 900 km up turns once a day
  assert.ok(Math.abs(meta({kind: 'satellite', h: 35900}).T - 24) < 0.2);
  const err = (spec: object) => compile({verb: 'orbit', ...spec} as any).errors.join(' ');
  assert.match(err({kind: 'kepler', e: 1.2}), /eccentricity/);
  assert.match(err({kind: 'launch', speeds: []}), /1 to 5 launch speeds/);
  assert.match(err({kind: 'warp'}), /kind is one of/);
});

test('gravity_law: F = G m1 m2 / r², a quarter at twice the distance; g inside and outside the Earth', () => {
  const law = compile({verb: 'gravity_law', m1: 100, m2: 50, rs: [1, 2]} as any).scene!.meta as any;
  assert.ok(Math.abs(law.F[0] - 6.67e-11 * 5000) < 1e-15 && Math.abs(law.F[0] / law.F[1] - 4) < 1e-9);
  const g = (compile({verb: 'gravity_law', profile: true, altitude: 3200, depth: 2000} as any).scene!.meta as any).facts.join(' | ');
  assert.match(g, /g at height 3200 km = 4\.35 m\/s² \| g at depth 2000 km = 6\.73 m\/s²/);
  const err = (spec: object) => compile({verb: 'gravity_law', ...spec} as any).errors.join(' ');
  assert.match(err({m1: 1, m2: 1, rs: [2, 1]}), /each farther than the last/);
  assert.match(err({profile: true, depth: 9000}), /depth is at most the radius/);
});

test('a name too long says its length and the limit, so a planner can shorten it', () => {
  // C9 of keph1-06 (2026-10-30): "name is short" alone, and the planner lengthened the names four tries running
  const err = (spec: object) => compile(spec as any).errors.join(' ');
  assert.equal(err({verb: 'moments', length: 1, forces: [{name: 'heavier child', mass: 30, x: 0.2}, {name: 'lighter child', mass: 20, x: 0.9}]}), '');
  assert.match(err({verb: 'moments', length: 1, forces: [{name: 'heavier child on the seesaw', mass: 30, x: 0.2}]}), /has 27 characters, at most 16/);
  assert.match(err({verb: 'work', mass: 2, force: {name: 'pull force', magnitude: 10}, d: 5}), /has 10 characters, at most 4/);
  assert.match(err({verb: 'vector_add', mode: 'add', a: [1, 0], b: [0, 1], names: ['Alpha', 'B']}), /has 5 characters, at most 3/);
});

test('moments reproduces the book: reactions on two knife edges, a see-saw balanced, a lever\'s advantage, tipping', () => {
  const facts = (spec: object) => (compile({verb: 'moments', ...spec} as any).scene!.meta as any).facts.join(' | ');
  // Example 6.6 (g = 9.8): a 70 cm, 4 kg bar on knife edges 10 cm from each end, 6 kg at 30 cm: R1 ≈ 55 N, R2 ≈ 43 N
  assert.match(facts({length: 0.7, supports: [0.1, 0.6], beam_mass: 4, forces: [{name: 'load', mass: 6, x: 0.3}]}), /support 1 .* = 54\.88 N.*support 2 .* = 43\.12 N/);
  assert.match(facts({length: 4, pivot: 2, forces: [{name: 'W1', mass: 30, x: 0.5}, {name: 'W2', mass: 45, x: '?'}]}), /W2 = 3 m from the left end/);
  assert.match(facts({length: 1.2, pivot: 0.2, forces: [{name: 'load', magnitude: 600, x: 0}, {name: 'effort', magnitude: '?', x: 1.2}], effort: 'effort', load: 'load'}),
    /mechanical advantage = 5.*effort = 120 N/);
  const tipped = compile({verb: 'moments', length: 2, pivot: 1, forces: [{name: 'A', mass: 2, x: 0.2}, {name: 'B', mass: 1, x: 1.9}]} as any).scene!;
  assert.ok(tipped.props.find((p: any) => p.id === 'beam')!.keys, 'an unbalanced beam tips');
  const err = (spec: object) => compile({verb: 'moments', ...spec} as any).errors.join(' ');
  assert.match(err({length: 1.2, pivot: 0.2, forces: [{name: 'load', magnitude: 600, x: 0, dir: 'up'}, {name: 'effort', magnitude: '?', x: 1.2}]}), /turns the beam the same way/);
  assert.match(err({length: 1, forces: [{name: 'a', magnitude: '?', x: 0.2}, {name: 'b', magnitude: 1, x: '?'}]}), /one thing at a time/);
  assert.match(err({length: 1, supports: [0.4, 0.5], forces: [{name: 'a', magnitude: 10, x: 0}]}), /tips off/);
  assert.equal(err({couple: {magnitude: 10, d: 0.5}}), '');
});

test('rotation reproduces the book: a flywheel pulled by a cord, and angular momentum conserved as masses slide in', () => {
  // Example 6.13: 20 kg, 20 cm flywheel, 25 N pull: I = 0.4 kg m², α = 12.5 rad/s²; 2 m of cord (θ = 10 rad): 50 J
  const fw = (compile({verb: 'rotation', body: 'disc', mass: 20, r: 0.2, torque: {F: 25}, t: Math.sqrt(20 / 12.5)} as any).scene!.meta as any).facts.join(' | ');
  assert.match(fw, /I = 0\.40 kg m²/); assert.match(fw, /α = 12\.50 rad\/s²/); assert.match(fw, /τθ = 50 J/); assert.match(fw, /ω = 15\.81 rad\/s/);
  const sl = (compile({verb: 'rotation', body: 'rod', length: 2, mass: 1, omega0: 2, slide: {m: 1, r1: 0.9, r2: 0.3}} as any).scene!.meta as any).facts.join(' | ');
  // I = 1/3 + 2 r²: 1.953 → 0.513 kg m²; ω₂ = I₁ω₁ / I₂
  assert.match(sl, /ω before = 2 rad\/s, after = 7\.61 rad\/s/);
  const err = (spec: object) => compile({verb: 'rotation', ...spec} as any).errors.join(' ');
  assert.match(err({body: 'disc', mass: 1}), /something must turn it/);
  assert.match(err({body: 'disc', mass: 1, omega0: 2, alpha: -1, t: 5}), /it stops after 2 s/);
  assert.match(err({body: 'disc', mass: 1, omega0: 2, slide: {m: 1, r1: 0.4, r2: 0.1}}), /set body rod/);
  assert.match(err({body: 'disc', axis: 'end', mass: 1, omega0: 1}), /axis end is for a rod/);
});

test("no verb's own field shares a name with a scene's size or style (width, height, fps, theme)", async () => {
  // 2026-10-30: gravity_law's height in km became the scene's pixel height
  const {CARDS} = await import('../src/verbs/cards.ts');
  for (const [name, card] of Object.entries(CARDS))
    for (const field of ['width', 'height', 'fps', 'theme']) assert.ok(!(field in (card.fields ?? {})), `${name} has a field named ${field}`);
});
