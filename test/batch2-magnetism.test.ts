// Batch 2 beats (2026-11-04): a solenoid's turns close up, B, H and M kept apart, a source losing the energy its waves
// carry, and Hertz's apparatus built in the narration's order.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {check, compile, frame, type Scene} from '../src/index.ts';
import {fieldAt} from '../src/verbs/magnetism.ts';
import {GAUSS_PER_TESLA} from '../src/verbs/matter.ts';
import {energyLeft, hertzCues} from '../src/verbs/em-waves.ts';
import {MIN_TEXT} from '../src/check.ts';

const make = (spec: Record<string, unknown>): Scene => {
  const {scene, errors} = compile(spec as never);
  assert.deepEqual(errors, []);
  assert.deepEqual(check(scene!, {every: 3}), []);
  return scene!;
};
const errorsOf = (spec: Record<string, unknown>) => compile(spec as never).errors.join(' ');
const texts = (scene: Scene) => scene.props.filter(p => p.type === 'text').map(p => (p as {text: string}).text);
const at = (scene: Scene, id: string, t: number) => frame(scene, t).props.find(p => p.id === id) as never as Record<string, number>;

test('solenoid turns close up: neighbouring turns\' fields cancel midway between them; inside they add along the axis', () => {
  // Two neighbouring wires of a coil, current out of the page: midway between them their fields are equal and opposite.
  const pair = [{x: -0.5, y: 0, I: 1}, {x: 0.5, y: 0, I: 1}], each = Math.hypot(...fieldAt([pair[0]], [0, 0]));
  assert.ok(Math.hypot(...fieldAt(pair, [0, 0])) < 1e-12 * each);
  // A long solenoid (40 turns each way): across its wall between two turns the net field is nothing beside the field inside.
  const R = 1.3, long = Array.from({length: 80}, (_, j) => j - 39.5).flatMap(x => [{x, y: R, I: 1}, {x, y: -R, I: -1}]);
  assert.ok(Math.abs(fieldAt(long, [0, R])[1]) < 1e-9 * Math.abs(fieldAt(long, [0, 0])[0]));
  const [bxa, bxb] = [fieldAt([{x: -0.5, y: R, I: 1}], [0, R - 0.6])[0], fieldAt([{x: 0.5, y: R, I: 1}], [0, R - 0.6])[0]];
  assert.ok(bxa > 0 && Math.abs(bxa - bxb) < 1e-12, 'below the row both turns push the field the same way, along the axis');

  const spec = {verb: 'magnetic_field', title: 'Loops between turns cancel', source: 'solenoid', view: 'turns', seconds: 8};
  const scene = make(spec);
  assert.ok((scene.meta!.facts as string[]).some(f => /sum is 0% of either/.test(f)) && (scene.meta!.facts as string[]).some(f => /net field is 0% of the field inside/.test(f)));
  // the pair's arrows: equal and opposite once shown, both shrunk to nothing after the cancel
  const len = (p: Record<string, number>) => Math.hypot(p.x2 - p.x1, p.y2 - p.y1);
  const [a, b] = [at(scene, 'pair-top1-0', 4), at(scene, 'pair-top1-1', 4)];
  assert.ok(Math.abs(len(a) - len(b)) < 0.5 && len(a) > 20 && (a.y2 - a.y1) * (b.y2 - b.y1) < 0);
  assert.ok(len(at(scene, 'pair-top1-0', 5.6)) < 1);
  assert.ok(!scene.props.some(p => p.id.startsWith('net')), 'no summed lines unless net: true');
  // illustrative keeps every word (none has a digit)
  const ill = compile({...spec, illustrative: true} as never).scene!;
  assert.ok(texts(ill).includes('They cancel: no field between the turns') && texts(ill).includes('Between neighbouring turns: opposite ways'));
  // net: lines inside, straight along the axis
  const net = make({...spec, net: true, seconds: 10});
  const lines = net.props.filter(p => p.type === 'polyline' && p.id.startsWith('net')) as {points: [number, number][]}[];
  assert.ok(lines.length >= 3);
  for (const l of lines) assert.ok(Math.max(...l.points.map(p => p[1])) - Math.min(...l.points.map(p => p[1])) < 5);   // a ripple of a few px by the wires, as computed
});

test('solenoid turns close up: its errors', () => {
  const base = {verb: 'magnetic_field', source: 'solenoid', view: 'turns'};
  assert.match(errorsOf({...base, turns: 8}), /turns is 3 to 6 for a solenoid's turns view/);
  assert.match(errorsOf({...base, compare: 'spread'}), /view turns is a close-up of a few turns with one current/);
  assert.match(errorsOf({...base, lines: false}), /lines false would leave only the wires/);
  assert.match(errorsOf({...base, net: 'yes'}), /net is true or false/);
  assert.match(errorsOf({verb: 'magnetic_field', source: 'solenoid', net: true}), /net goes with source solenoid, view turns/);
  assert.match(errorsOf({verb: 'magnetic_field', source: 'loop', view: 'turns'}), /view is section or face for a loop/);
  assert.equal(errorsOf({...base, turns: 3, north: 'left'}), '');
});

test('B, H and M kept apart: three named vectors, no sum, B\'s unit with the book\'s 1 T = 10⁴ G', () => {
  assert.equal(GAUSS_PER_TESLA, 1e4);
  const scene = make({verb: 'magnetic_matter', title: 'Keep B, H and M apart', show: 'vectors', units: 'B'});
  const all = texts(scene);
  for (const t of ['B', 'H', 'M', 'magnetic field', 'magnetic intensity', 'magnetisation', 'tesla, T', '1 T = 10⁴ gauss']) assert.ok(all.includes(t), t);
  assert.ok(!all.some(t => /[+=]/.test(t) && /[BHM].*[+=].*[BHM]/.test(t)), 'no relation between them is written');
  assert.ok(!all.includes('ampere per metre, A/m'), 'units B gives only B\'s unit');
  assert.ok(frame(scene, 4).props.every(p => !(p.type === 'text' && /gauss/.test((p as never as {text: string}).text)) || p.opacity < 0.05), 'the gauss comes after the names');
  // three arrows, each in its own box, all one way for a paramagnet; M turned round in a diamagnet
  const dirs = (s: Scene) => s.props.filter(p => p.type === 'arrow').map(p => Math.sign((p as never as {x2: number; x1: number}).x2 - (p as never as {x1: number}).x1));
  assert.deepEqual(dirs(scene), [1, 1, 1]);
  assert.deepEqual(dirs(make({verb: 'magnetic_matter', show: 'vectors', kind: 'diamagnetic'})), [1, 1, -1]);
  assert.ok(texts(make({verb: 'magnetic_matter', show: 'vectors'})).includes('ampere per metre, A/m'));
  // illustrative: the names stay, the gauss line (a number) goes
  const ill = texts(compile({verb: 'magnetic_matter', show: 'vectors', units: 'B', illustrative: true} as never).scene!);
  assert.ok(ill.includes('B') && ill.includes('magnetisation') && !ill.some(t => /10/.test(t)));
  assert.match(errorsOf({verb: 'magnetic_matter', show: 'core', units: 'B'}), /units goes with show vectors/);
  assert.match(errorsOf({verb: 'magnetic_matter', show: 'vectors', units: 'cgs'}), /units goes with show vectors/);
  assert.match(errorsOf({verb: 'magnetic_matter', show: 'vectors', n: 1000}), /vectors draws B, H and M by name, not by value: leave out n/);
  assert.match(errorsOf({verb: 'magnetic_matter', show: 'vectors', kind: 'hard'}), /vectors takes kind paramagnetic, diamagnetic, ferromagnetic/);
});

test('an oscillating source loses the energy its waves carry away: the two bars always add to the whole', () => {
  const T = 12, scene = make({verb: 'em_waves', title: 'Energy supplied by the source', show: 'source', energy: true, seconds: T, illustrative: true});
  assert.equal(scene.duration, T);
  const w = (id: string, t: number) => at(scene, id, t).w, whole = w('bar-bad', 0);
  let last = Infinity;
  for (const t of [0, 1, 3, 6, 9, 11.9]) {
    assert.ok(Math.abs(w('bar-bad', t) + Math.max(0, w('bar-cool', t)) - whole) < whole * 0.01 + 2, `t ${t}`);
    assert.ok(w('bar-bad', t) <= last + 1e-9); last = w('bar-bad', t);
  }
  assert.ok(energyLeft(T, T) < 0.25 && energyLeft(0.5, T) === 1);
  // the swing shrinks with √(energy left): the charge's widest excursion late is smaller than early
  const charge = scene.props.find(p => p.type === 'circle' && (p as never as {keys?: {y?: unknown}}).keys?.y) as never as {id: string; y: number};
  const swing = (t0: number) => Math.max(...[0, .25, .5, .75, 1, 1.25, 1.5, 1.75].map(d => Math.abs(at(scene, charge.id, t0 + d).y - charge.y)));
  assert.ok(swing(10) < 0.6 * swing(0.5));
  // the plain oscillating source passes check() too: its rings fade before the frame's edge (they used to leave it)
  make({verb: 'em_waves', show: 'source'});
  make({verb: 'em_waves', show: 'source', antenna: true, seconds: 14});
  assert.match(errorsOf({verb: 'em_waves', show: 'source', motion: 'steady', energy: true}), /energy \(true or false\) goes with show source, motion oscillating/);
  assert.match(errorsOf({verb: 'em_waves', show: 'source', antenna: true, energy: true}), /a lone charge \(no antenna\)/);
  assert.match(errorsOf({verb: 'em_waves', show: 'plane', seconds: 12}), /seconds is for show source or hertz/);
  assert.match(errorsOf({verb: 'em_waves', show: 'source', seconds: 60}), /seconds is 4 to 40/);
});

test('Hertz staged: rods, coil, spark, receiver and its spark in the narration\'s order; the receiver sparks as a wave arrives', () => {
  const T = 24, spec = {verb: 'em_waves', title: 'Hertz’s spark-gap experiment', show: 'hertz', staged: true, seconds: T, illustrative: true};
  const scene = make(spec), cue = hertzCues(T), anchors = scene.meta!.anchors as Record<string, [number, number]>;
  const visible = (t: number, text: string) => frame(scene, t).props.some(p => p.type === 'text' && (p as never as {text: string}).text === text && p.opacity > 0.5);
  assert.ok(visible(1, 'transmitter') && visible(1, 'spark gap') && !visible(1, 'induction coil') && !visible(1, 'receiver'));
  assert.ok(visible(cue.coil + 0.5, 'induction coil') && !visible(cue.coil - 0.2, 'induction coil'));
  assert.ok(!visible(cue.receiver - 0.2, 'receiver') && visible(cue.receiver + 0.5, 'receiver'));
  assert.ok(!visible(cue.arrival - 0.2, 'spark: a wave has arrived') && visible(cue.arrival + 0.5, 'spark: a wave has arrived'));
  // sparks: zigzags at the transmitter's gap from the spark cue; at the receiver's gap first exactly at the arrival cue
  const sparks = (x: number) => scene.props.filter(p => p.type === 'polyline' && p.show && Math.abs((p as never as {points: [number, number][]}).points[0][0] - (x - 12)) < 1).map(p => p.show![0]);
  const sent = sparks(anchors.gap[0]), got = sparks(anchors.receiver_gap[0]);
  assert.ok(Math.abs(Math.min(...sent) - cue.spark) < 1e-9 && got.length >= 2 && Math.abs(Math.min(...got) - cue.arrival) < 1e-9);
  // every receiver spark is a transmitter spark plus the same computed travel time, and no wave is on screen when the receiver appears
  const travel = Math.min(...got) - Math.max(...sent.filter(t => t < Math.min(...got)));
  for (const t of got) assert.ok(sent.some(s => Math.abs(s + travel - t) < 1e-9));
  const rings = (t: number) => frame(scene, t).props.filter(p => p.type === 'circle' && p.opacity > 0.05 && (p as never as {style: {fill: string}}).style.fill === 'none');
  assert.equal(rings(cue.receiver).length, 0);
  // cues of the planner's own
  const own = make({...spec, cues: {coil: 3, spark: 6, receiver: 10, arrival: 16}});
  assert.ok(own.props.some(p => p.show && Math.abs(p.show[0] - 16) < 1e-9));
  make({verb: 'em_waves', show: 'hertz'});   // unstaged passes check() now (its waves left the frame)
  assert.match(errorsOf({...spec, cues: {coil: 8, spark: 6}}), /cues come in order: coil, then spark, then receiver, then arrival/);
  assert.match(errorsOf({...spec, cues: {spark: 9, receiver: 10}}), /give the waves 1.6 s between spark and receiver/);
  assert.match(errorsOf({...spec, cues: {arrival: 30}}), /must be within the scene's seconds/);
  assert.match(errorsOf({...spec, cues: {flash: 3}}), /cues is \{coil\?, spark\?, receiver\?, arrival\?\}/);
  assert.match(errorsOf({verb: 'em_waves', show: 'hertz', cues: {coil: 3}}), /cues go with staged: true/);
  assert.match(errorsOf({verb: 'em_waves', show: 'source', staged: true}), /staged \(true or false\) is for show hertz/);
});

test('the new shows draw legible text in a full frame and half a frame', () => {
  const specs = [{verb: 'magnetic_field', title: 'Loops between turns cancel', source: 'solenoid', view: 'turns', net: true},
    {verb: 'magnetic_matter', title: 'Keep B, H and M apart', show: 'vectors', units: 'B'},
    {verb: 'em_waves', title: 'Energy supplied by the source', show: 'source', energy: true},
    {verb: 'em_waves', title: 'Hertz’s spark-gap experiment', show: 'hertz', staged: true}];
  for (const spec of specs) for (const width of [1920, 960]) {
    const {scene, errors} = compile({compound: true, parts: [{id: 'a', box: [0, 0, width, 1080], spec}]} as never);
    assert.deepEqual(errors, []);
    assert.deepEqual(check(scene!, {every: 6}), [], `${spec.verb} at ${width}`);
    const part = scene!.parts![0];
    const small = part.scene.props.filter(p => (p.type === 'text' || p.type === 'readout') && ((p as {size?: number}).size ?? 32) * part.scale < MIN_TEXT - 1e-6);
    assert.deepEqual(small.map(p => (p as {text?: string}).text), [], `${spec.verb} at ${width}`);
  }
});
