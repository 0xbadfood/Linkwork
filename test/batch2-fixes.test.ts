// Faults the batch 2 rebeat showed in published films (2026-11-04), each fixed for every verb.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {compile, frame, type Scene} from '../src/index.ts';
import {repeats} from '../src/verbs/marks.ts';

const made = (o: object) => { const r = compile(o as never); assert.deepEqual(r.errors, [], JSON.stringify(o)); return r.scene! as Scene; };
const texts = (s: Scene, t: number) => (frame(s, t).props as any[]).filter(p => p.type === 'text' && (p.opacity ?? 1) > 0.05).map(p => p.text as string);

test('compared area elements must cut different numbers of lines', () => {
  // leph1-01 C5 S13 as filled: R and S each cut by one line, so "more lines at R" showed nothing
  const filled = {verb: 'electric', title: 'More Lines Cross at R', show: 'lines', charges: [{q: 1e-6, x: 0, y: 0, name: 'Q'}], per: 16,
    elements: [{at: [0.8, 0], name: 'R'}, {at: [0, -1.6], name: 'S'}], size: 0.3, reach: 2, illustrative: true};
  assert.match(compile(filled as never).errors.join(' '), /R 1, S 1 lines: equal counts/);
  // larger elements on the same layout: R cuts more than S, and the caption says so
  const s = made({...filled, size: 0.9});
  assert.ok(texts(s, 20).some(t => /more lines cut the one at R than at S/.test(t)));
});

test("a planner's label that repeats the verb's own words is left out", () => {
  const own = (...t: string[]) => t.map(x => new Set((x.toLowerCase().match(/[a-z]+/g) ?? []).map(w => (w.length > 3 ? w.replace(/s$/, '') : w))));
  assert.ok(repeats('fields cancel here', own('They cancel: no field between the turns')));
  assert.ok(!repeats('central rays', own('P', 'F', 'C')));            // a panel sentence is not counted: see marks.ts
  assert.ok(repeats('two identical slabs, end to end', own('Two identical slabs placed end to end: a series arrangement')));
  assert.ok(!repeats('image', own('the image forms here')));             // one word: kept, it may name a point
  assert.ok(!repeats('fields add inside', own('They cancel: no field between the turns')));
  // in a real scene: the solenoid close-up as filled (leph1-04 C7 S07) draws no "fields cancel here", only its dot
  const s = made({verb: 'magnetic_field', title: 'Loops Between Neighbouring Turns Cancel', source: 'solenoid', view: 'turns', turns: 4, seconds: 10,
    illustrative: true, annotate: [{text: 'fields cancel here', at: 'gap', point: true, colour: 'accent'}]});
  assert.ok(!texts(s, 30).includes('fields cancel here'));
  assert.ok((s.props as any[]).some(p => p.id.startsWith('note0-point')));
});

test('illustrative scenes keep lowercase names with subscripts, but not numbers', () => {
  // leph1-01 C2 S26: vector_add's r2 and r1 vanished, leaving three unnamed arrows
  const s = made({verb: 'vector_add', title: 'Position vectors and separation', mode: 'subtract', a: [0.1, 0.05], b: [-0.1, 0], names: ['r2', 'r1'], illustrative: true});
  const shown = texts(s, 30).join(' ');
  assert.match(shown, /r2/); assert.match(shown, /r1/);
  assert.ok(!/\d\.\d/.test(shown), shown);
});
