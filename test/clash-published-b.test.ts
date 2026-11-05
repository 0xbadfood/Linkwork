// Text on text in published films (2026-11-05): check()'s new textClashes guard, run over the specs of our published
// films, found names drawn on names. One representative spec per verb, copied from those films.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {check, compile, frame, type Scene} from '../src/index.ts';

const made = (o: object) => { const r = compile(o as never); assert.deepEqual(r.errors, [], JSON.stringify(o)); return r.scene! as Scene; };
const clashes = (s: Scene) => check(s).filter(m => m.includes('drawn on each other'));
const SPECS: Record<string, object> = {
  // the planet's name rides over aphelion, the other focus, perihelion and the Sun (keph1-07 C1, C8, C9)
  orbit: {compound: true, parts: [
    {id: 'a', box: [0, 0, 960, 1080], spec: {verb: 'orbit', kind: 'kepler', a: 1, e: 0.6, show: ['areas'], star: 'Sun', body: 'planet', title: 'Kepler orbit', illustrative: true, panel: false}},
    {id: 'b', box: [960, 0, 960, 1080], spec: {verb: 'orbit', kind: 'kepler', a: 1, e: 0.5, show: [], star: 'Earth', body: 'satellite', title: "Kepler's ellipse", illustrative: true, panel: false}}]},
  'orbit full': {verb: 'orbit', kind: 'kepler', a: 1, e: 0.5, show: ['areas', 'speeds'], star: 'Sun', body: 'Planet', title: 'Law of areas', illustrative: true},
  // P′ runs through O along the diameter (keph2-06, 20 scenes); half width, P passes x too
  shm: {verb: 'shm', title: 'Circle and its projection', show: 'circle', A: 1, cycles: 2, vectors: 'none', illustrative: true},
  'shm half': {compound: true, parts: [
    {id: 'a', box: [0, 0, 960, 1080], spec: {verb: 'shm', title: 'Reference circle', show: 'circle', A: 1, T: 2, phase: 0, vectors: 'none', illustrative: true}},
    {id: 'b', box: [960, 0, 960, 1080], spec: {verb: 'shm', title: 'x, v and a: shared period', show: 'graphs', A: 1, T: 2, phase: 0, cycles: 2, illustrative: true}}]},
  // thrown up from a building: 1 s and 3 s, 0 s and 4 s, at one height (keph1-02 C6)
  motion_on_line: {verb: 'motion_on_line', title: 'Ball thrown up from a 25 m building', axis: {range: [-2, 50], unit: 'm', vertical: true}, object: 'ball', ground: 0,
    building: {top: 25, label: '25 m'}, accelerate: {x0: 25, v0: 20, a: -10, t: [0, 5]}, every: 1, readouts: ['t', 'y', 'v']},
  // "vb" on "vb + vc" (keph1-03 C6), "A" and "−B" on "A − B" (C4), "dl" on "dl cos θ" (leph1-04 C6)
  vector_add: {verb: 'vector_add', mode: 'add', a: {magnitude: 25, angle: 90}, b: {magnitude: 10, angle: -30}, method: 'triangle', names: ['vb', 'vc'], unit: 'km/h', title: 'Boat and current velocities', illustrative: true},
  'vector_add subtract': {compound: true, parts: [
    {id: 'a', box: [0, 0, 960, 1080], spec: {verb: 'vector_add', title: 'R2: A minus B', mode: 'subtract', a: [4, 1], b: [1, 3], method: 'parallelogram', names: ['A', 'B'], illustrative: true}},
    {id: 'b', box: [960, 0, 960, 1080], spec: {verb: 'vector_add', title: 'R1: A plus B', mode: 'add', a: [4, 1], b: [1, 3], method: 'parallelogram', names: ['A', 'B'], illustrative: true}}]},
  'vector_add dot': {verb: 'vector_add', title: 'Tangential field and path element', mode: 'dot', a: {magnitude: 1, angle: 0}, b: {magnitude: 1, angle: 0}, names: ['B', 'dl'], seconds: 10, illustrative: true},
  // two carts closing: "v" on "v" (keph1-05 C12); a neutron reaching a target at rest, name on name (C12 scene 25)
  stage: {verb: 'stage', title: 'Motion along one straight line', width_m: 40, ground: 'grass', items: [{id: 'cart_a', object: 'cart', x: 8, facing: 1, label: 'A'},
    {id: 'cart_b', object: 'cart', x: 30, facing: -1, label: 'B'}], events: [{t: 0.5, item: 'cart_a', kind: 'move', to: 16, duration: 4}, {t: 0.5, item: 'cart_b', kind: 'move', to: 24, duration: 4}],
    velocity: [{item: 'cart_a', show: ['v']}, {item: 'cart_b', show: ['v']}], illustrative: true},
  'stage names': {verb: 'stage', title: 'Repeated head-on collisions', width_m: 40, ground: 'none', items: [{id: 'neutron', object: 'ball', x: 4, label: 'neutron'},
    {id: 't1', object: 'ball', x: 14, label: 'stationary target'}, {id: 't2', object: 'ball', x: 26, label: 'stationary target'}],
    events: [{t: 2.5, item: 'neutron', kind: 'collide', with: 't1', speed: 4, elastic: true, after: 0}, {t: 7.5, item: 'neutron', kind: 'collide', with: 't2', speed: 2.4, elastic: true, after: 0}], illustrative: true},
  // m₁, m₂ and CM leave one point at the break, m₂ then flies by the CM (keph1-06 C3)
  centre_of_mass: {verb: 'centre_of_mass', title: 'Centre of mass through breakup', explode: {v0: 20, angle: 45, pieces: [1, 2], v1: [10, 5]}, unit: 'm', illustrative: true},
  'centre_of_mass numbers': {verb: 'centre_of_mass', title: 'Explosion', explode: {v0: 20, angle: 45, pieces: [1, 2], v1: [10, 5]}, unit: 'm'},
  // a couple's rod swung its forces' names into a half-width part's title and sentences (keph1-06 C8)
  moments: {compound: true, parts: [
    {id: 'a', box: [0, 0, 960, 1080], spec: {verb: 'moments', title: 'Couple: net force zero', couple: {magnitude: 10, d: 1}, illustrative: true}},
    {id: 'b', box: [960, 0, 960, 1080], spec: {verb: 'moments', title: 'Single force: net force present', length: 1, pivot: 0.5, forces: [{name: 'F', magnitude: 10, x: 0.8}], illustrative: true}}]},
};

for (const [name, spec] of Object.entries(SPECS)) test(`published ${name}: no text drawn on text`, () => assert.deepEqual(clashes(made(spec)), []));

test('the fixes keep the names: faded only while passing, joined, or moved, never dropped', () => {
  // orbit: aphelion fades as the planet passes and is back after
  const o = made(SPECS['orbit full']), op = (t: number) => (frame(o, t).props.find(p => p.id === 'lA') as {opacity: number}).opacity;
  assert.equal(op(1), 1); assert.equal(op(o.duration), 1);
  assert.ok(Array.from({length: 100}, (_, i) => op(o.duration * i / 100)).some(x => x < 0.3));
  // motion_on_line: the stamp at 3 s joins the one at 1 s
  const m = made(SPECS.motion_on_line), texts = (frame(m, m.duration).props as {type: string; text?: string; opacity: number}[]).filter(p => p.type === 'text' && p.opacity > 0.3).map(p => p.text);
  assert.ok(texts.includes('1, 3 s') && texts.includes('0, 4 s'), JSON.stringify(texts));
  // centre_of_mass: both piece names show by the end
  const c = made(SPECS.centre_of_mass), end = frame(c, c.duration).props as {id: string; opacity: number}[];
  for (const id of ['lp1', 'lp2', 'lcm']) assert.ok(end.find(p => p.id === id)!.opacity > 0.9, id);
});
