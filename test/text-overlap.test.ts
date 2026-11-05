// Text drawn on text (2026-11-05): plane_motion with show [limit, delta_v] wrote both constructions' sentences into the
// same panel rows, so from 27 s to the end of a published film two sentences sat on two others, and check() said nothing.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {check, compile, frame, textClashes, type Scene} from '../src/index.ts';

const made = (o: object) => { const r = compile(o as never); assert.deepEqual(r.errors, [], JSON.stringify(o)); return r.scene! as Scene; };
const REPRO = {verb: 'plane_motion', title: 'The limit of a short interval', circle: {radius: 3, speed: 2, turns: 1},
  show: ['limit', 'delta_v'], at: 1, dt: 0.8, illustrative: true};

test('plane_motion limit + delta_v: the constructions take turns, no text on text at any moment', () => {
  for (const extra of [{}, {width: 960, height: 1080}, {illustrative: false}, {show: ['delta_v'], width: 960, height: 1080}]) {
    const s = made({...REPRO, ...extra});
    assert.deepEqual(check(s), [], JSON.stringify(extra));
    for (let t = 0; t <= s.duration; t += 0.25) assert.deepEqual(textClashes(frame(s, t)), [], `${JSON.stringify(extra)} at ${t} s`);
  }
  // the Δt sentence has gone when the triangles' sentence shows, and the end keeps only the Δv conclusion
  const s = made(REPRO), shown = (t: number) => (frame(s, t).props as any[]).filter(p => p.type === 'text' && p.opacity > 0.3).map(p => p.text as string);
  assert.ok(!shown(s.duration).some(x => /Δt halves|Δr\/Δt becomes/.test(x)));
  assert.ok(shown(s.duration).some(x => /Δv points at the centre/.test(x)));
});

const scene = (props: object[]): Scene => ({linkwork: 1, width: 1920, height: 1080, fps: 30, duration: 2, actors: [], props} as never);

test('check() flags two visible texts drawn at one spot, in the panel or in the drawing', () => {
  const panel = check(scene([{id: 'a', type: 'text', x: 1270, y: 500, text: 'The first sentence of the panel', size: 30, width: 600},
    {id: 'b', type: 'text', x: 1270, y: 505, text: 'A second sentence written into the same row', size: 30, width: 600}]));
  assert.equal(panel.length, 1);
  assert.match(panel[0], /props a and b: texts .* are drawn on each other/);
  assert.match(check(scene([{id: 'p', type: 'text', x: 400, y: 400, text: 'P', size: 30}, {id: 'q', type: 'text', x: 405, y: 402, text: 'Q', size: 30}]))[0], /props p and q/);
});

test('check() passes a crossfade, a faint text, stacked rows and a halo copy', () => {
  // one fades out as the other fades in at the same place: never both above the threshold
  assert.deepEqual(check(scene([{id: 'a', type: 'text', x: 1270, y: 500, text: 'First step', size: 30, show: [0, 1]},
    {id: 'b', type: 'text', x: 1270, y: 500, text: 'Second step', size: 30, show: [1, 2]}])), []);
  assert.deepEqual(check(scene([{id: 'a', type: 'text', x: 1270, y: 500, text: 'Shown', size: 30},
    {id: 'b', type: 'text', x: 1270, y: 500, text: 'A ghost', size: 30, style: {opacity: 0.2}}])), []);
  assert.deepEqual(check(scene([{id: 'a', type: 'text', x: 1270, y: 500, text: 'Row one', size: 30},
    {id: 'b', type: 'text', x: 1270, y: 539, text: 'Row two', size: 30}])), []);
  assert.deepEqual(check(scene([{id: 'a', type: 'text', x: 400, y: 400, text: 'P', size: 30, style: {stroke: 'paper'}},
    {id: 'b', type: 'text', x: 400, y: 400, text: 'P', size: 30}])), []);
});

test('every card example and shortest: no text on text, full frame and half', async () => {
  const {CARDS} = await import('../src/verbs/cards.ts');
  const bad: string[] = [];
  for (const [name, card] of Object.entries(CARDS)) for (const spec of [card.example, card.shortest]) {
    if (!spec) continue;
    for (const extra of [{}, {width: 960, height: 1080}]) {
      const r = compile({...spec, ...extra} as never);
      if (r.errors.length) continue;
      for (let t = 0; t <= r.scene!.duration; t += 0.25) {
        const c = textClashes(frame(r.scene!, t));
        if (c.length) { bad.push(`${name} ${JSON.stringify(extra)} at ${t} s: ${c[0][1]}`); break; }
      }
    }
  }
  assert.deepEqual(bad, []);
});
