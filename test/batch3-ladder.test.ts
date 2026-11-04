// Batch 3 (2026-11-05): a ladder leaning on a smooth wall with its forces (moments ladder, NCERT Class 11 Example 6.8),
// and two label clashes seen in re-published Class 11 films (vertical_circle top, collision_2d impact).
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {check, compile, frame, type Scene} from '../src/index.ts';
import {textWidth} from '../src/svg.ts';
import {ladderForces} from '../src/verbs/moments.ts';

const made = (o: object) => { const r = compile(o as never); assert.deepEqual(r.errors, [], JSON.stringify(o)); return r.scene! as Scene; };
const errs = (o: object) => compile(o as never).errors.join(' ');
const texts = (s: Scene, t: number) => (frame(s, t).props as any[]).filter(p => (p.type === 'text' || p.type === 'readout') && (p.opacity ?? 1) > 0.05).map(p => p.text as string);
const facts = (s: Scene) => (s.meta!.facts as string[]).join(' | ');
const clean = (s: Scene) => { assert.deepEqual(check(s, {every: 3}), []); return s; };

type Box = [number, number, number, number];
/** A text's box in scene pixels as drawn (y is its middle). */
const boxOf = (p: any): Box => {
  const w = textWidth(p.text, p.size), x0 = p.align === 'middle' ? p.x - w / 2 : p.align === 'end' ? p.x - w : p.x;
  return [x0, p.y - p.size / 2, x0 + w, p.y + p.size / 2];
};
const meet = (a: Box, b: Box) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
/** Does a segment pass through a box (sampled)? */
const crosses = (b: Box, x1: number, y1: number, x2: number, y2: number) =>
  Array.from({length: 41}, (_, i) => [x1 + (x2 - x1) * i / 40, y1 + (y2 - y1) * i / 40]).some(([x, y]) => x > b[0] && x < b[2] && y > b[1] && y < b[3]);
const at = (s: Scene, t: number) => frame(s, t).props as any[];

test('moments ladder: the book\'s ladder (3 m, 20 kg, foot 1 m out) gives F1 = f = 34.6 N and N = 196 N', () => {
  // keph1-06 Example 6.8: N = W; f = F1; moments about A: F1 × BC = W × AC/2, BC = 2√2 m
  const r = ladderForces(3, 1, 20, 9.8);
  assert.ok(Math.abs(r.BC - 2 * Math.SQRT2) < 1e-12);
  assert.ok(Math.abs(r.W - 196) < 1e-9 && Math.abs(r.N - 196) < 1e-9);
  assert.ok(Math.abs(r.F1 - 196 / (4 * Math.SQRT2)) < 1e-9 && Math.abs(r.F1 - 34.6) < 0.06);
  assert.equal(r.f, r.F1);
  assert.ok(Math.abs(r.F2 - 199) < 0.1 && Math.abs(r.alpha - 80) < 0.1);   // F2 = 199 N at α ≈ 80°
  // the moments balance about A (and so about any point: about B, N's and f's moments against W's)
  assert.ok(Math.abs(r.F1 * r.BC - r.W * 0.5) < 1e-9);
  assert.ok(Math.abs(r.N * 1 - r.f * r.BC - r.W * 0.5) < 1e-9);

  const spec = {verb: 'moments', title: 'A ladder against a smooth wall', ladder: {L: 3, foot: 1, mass: 20, solve: true}};
  const s = clean(made(spec));
  assert.match(facts(s), /F1 = 34\.65 N \(horizontal\); friction f = 34\.65 N toward the wall; N = 196 N/);
  assert.match(facts(s), /F2 = 199 N at 79\.98°/);
  const shown = texts(s, s.duration - 0.1).join(' | ');
  assert.match(shown, /Moments about A: F1 × BC = W × AC\/2/);
  assert.match(shown, /F1 = 196 × 0\.50 \/ 2\.83 = 34\.65 N/);
  assert.match(shown, /N = 196 N/);
  // the drawing: A on the floor, B on the wall, D halfway, the arrows the right way
  const ps = at(s, s.duration - 0.1), get = (id: string) => ps.find(p => p.id === id);
  const {A, B, C, D} = s.meta!.anchors as Record<string, [number, number]>;
  assert.equal(A[1], C[1]); assert.equal(B[0], C[0]);
  assert.ok(Math.abs((A[0] - C[0]) / (C[1] - B[1]) - 1 / (2 * Math.SQRT2)) < 1e-9, 'AC : BC as the book');
  assert.ok(Math.abs(D[1] - (A[1] + B[1]) / 2) < 15, 'D at mid-height');
  const W = get('W'), F1 = get('F1'), N = get('N'), f = get('f');
  assert.ok(W.x1 === W.x2 && W.y2 > W.y1, 'W straight down from D');
  assert.ok(F1.y1 === F1.y2 && F1.x2 > F1.x1 && F1.x1 === B[0], 'F1 horizontal at B, away from the wall');
  assert.ok(N.x1 === N.x2 && N.y2 < N.y1 && N.y2 === A[1], 'N up, its head at A');
  assert.ok(f.y1 === f.y2 && f.x2 < f.x1 && f.x2 > C[0], 'f toward the wall, short of it');
  // to one scale: N as long as W
  assert.equal(N.y1 - N.y2, W.y2 - W.y1);
  // no two names overlap, and no name sits on the ladder's rails
  const names = ps.filter(p => p.type === 'text' && p.id !== 'title' && !(p.id as string).match(/^(l\d|s\d)$/) && (p.opacity ?? 1) > 0.05 && p.x < s.width * 0.62);
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) assert.ok(!meet(boxOf(names[i]), boxOf(names[j])), `${names[i].text} / ${names[j].text}`);
  const rails = ps.filter(p => /^rail/.test(p.id));
  for (const n of names) for (const r of rails) assert.ok(!crosses(boxOf(n), r.x1, r.y1, r.x2, r.y2), `${n.text} on ${r.id}`);
});

test('moments ladder, illustrative: the forces named only, as the narration says them', () => {
  // keph1-06 C9 S36 "Forces on the Ladder"
  const s = clean(made({verb: 'moments', title: 'Forces on the Ladder', ladder: {L: 3, foot: 1}, illustrative: true}));
  const shown = texts(s, s.duration - 0.1);
  for (const n of ['A', 'B', 'C', 'D', 'W', 'F1', 'N', 'f']) assert.ok(shown.includes(n), n);
  const all = shown.join(' | ');
  assert.match(all, /centre of gravity D/);
  assert.match(all, /reaction F1 is horizontal/);
  assert.match(all, /friction f, toward the wall/);
  assert.ok(!/Moments about A/.test(all), 'no equation without solve');
  assert.ok(!/\d/.test(all.replace(/\bF1\b/g, '')), all);
  assert.deepEqual(s.meta!.facts, []);
  // the motion (arrows arriving) ends at least a second before the scene does
  const last = Math.max(...s.props.map(p => (p.show ? p.show[0] : 0) + 0.3));
  assert.ok(s.duration - last >= 1, `${last} of ${s.duration}`);
  // a half-width part, and the two ends of the angle range, compile clean
  clean(made({verb: 'moments', title: 'Forces on the Ladder', ladder: {L: 3, foot: 1}, illustrative: true, width: 960, height: 1080}));
  clean(made({verb: 'moments', ladder: {L: 4, foot: 0.7}}));
  clean(made({verb: 'moments', ladder: {L: 5, foot: 4.3, mass: 10, solve: true}}));
  // without a mass the facts are in units of W
  assert.match(facts(made({verb: 'moments', ladder: {L: 3, foot: 1}})), /F1 = 0\.18 W .*N = W/);
});

test('moments ladder: the errors name the fix', () => {
  const ok = {verb: 'moments', ladder: {L: 3, foot: 1}};
  assert.match(errs({...ok, ladder: {L: 0.1, foot: 1}}), /ladder\.L is the ladder's length in m, 0\.5 to 50/);
  assert.match(errs({...ok, ladder: {L: 3, foot: 3}}), /ladder\.foot .* less than L/);
  assert.match(errs({...ok, ladder: {L: 3, foot: 0.1}}), /keep it 30° to 80°: foot between 0\.52 and 2\.60 m/);
  assert.match(errs({...ok, ladder: {L: 3, foot: 1, mass: -2}}), /ladder\.mass is the ladder's mass in kg/);
  assert.match(errs({...ok, ladder: {L: 3, foot: 1, wall: 'rough'}}), /ladder\.wall is smooth/);
  assert.match(errs({...ok, ladder: {L: 3, foot: 1, solve: true}}), /ladder\.solve needs ladder\.mass/);
  assert.equal(errs({...ok, ladder: {L: 3, foot: 1, solve: true}, illustrative: true}), '');
  assert.match(errs({...ok, forces: [{name: 'W', mass: 2, x: 0.5}], pivot: 0.5}), /a ladder is the whole scene: leave out forces, pivot/);
  assert.match(errs({verb: 'moments', ladder: 3}), /ladder is \{L \(m\), foot/);
});

test('vertical_circle top: mg\'s name sits clear of the slack string', () => {
  // keph1-05 C8 "Bob at point C": mg points down the string from C and its name lay on the string's wave
  for (const extra of [{}, {width: 960, height: 1080}, {illustrative: false}]) {
    const s = clean(made({verb: 'vertical_circle', show: 'top', title: 'Bob at point C', illustrative: true, ...extra}));
    const ps = at(s, s.duration - 0.1), lmg = ps.find(p => p.id === 'lmg');
    assert.ok(lmg && (lmg.opacity ?? 1) > 0.5, 'mg named');
    const b = boxOf(lmg), strings = ps.filter(p => /^string\d+$/.test(p.id));
    assert.equal(strings.length, 12);
    for (const q of strings) assert.ok(!crosses(b, q.x1, q.y1, q.x2, q.y2), `${JSON.stringify(extra)}: mg on ${q.id}`);
    const mg = ps.find(p => p.id === 'mg');
    assert.ok(!crosses(b, mg.x1, mg.y1, mg.x2, mg.y2), 'mg\'s name off its own arrow');
    // and every other arrow name too
    for (const id of ['lv', 'lT']) { const p = ps.find(q => q.id === id); if (!p || (p.opacity ?? 1) < 0.05) continue;
      for (const q of strings) assert.ok(!crosses(boxOf(p), q.x1, q.y1, q.x2, q.y2), `${id} on ${q.id}`); }
  }
});

test('collision_2d impact: b is marked on the incoming side, clear of the θ arcs and their names', () => {
  // keph1-05 C13: the θ2 arc name and the b marker sat on each other near the line of motion
  for (const extra of [{}, {width: 960, height: 1080}, {b: 0.7}, {b: 0.1}, {m1: 3, m2: 1}]) {
    const s = clean(made({verb: 'collision_2d', title: 'Off-centre collision', m1: 1, m2: 1, b: 0.3, impact: true, illustrative: true, ...extra}));
    const ps = at(s, s.duration - 0.1), get = (id: string) => ps.find(p => p.id === id);
    const lb = boxOf(get('lb'));
    const marks = ['ltheta1', 'ltheta2'].map(get).filter(Boolean);
    assert.equal(marks.length, 2);
    for (const m of marks) assert.ok(!meet(lb, boxOf(m)), `${JSON.stringify(extra)}: b on ${m.text}`);
    // b's measure and ticks stay clear of both arcs, their reference lines and names
    const bm = ['bmeasure', 'btick0', 'btick1'].map(get);
    for (const m of marks) for (const q of bm) assert.ok(!crosses(boxOf(m), q.x1, q.y1, q.x2, q.y2), `${m.text} on ${q.id}`);
    for (const id of ['reftheta1', 'reftheta2']) { const r = get(id); assert.ok(Math.min(r.x1, r.x2) > get('bmeasure').x1 + 40, `${id} reaches b`); }
    for (const id of ['arctheta1', 'arctheta2']) assert.ok(get(id).points.every((p: number[]) => p[0] > get('bmeasure').x1 + 40), `${id} reaches b`);
    // before the hit too: m1 never passes over the marker
    const ball1 = s.props.find(p => p.id === 'ball1') as any;
    for (const t of [0, 0.6, 1, 2]) { const p = at(s, t).find(q => q.id === 'ball1'); assert.ok(p.x - p.r > get('bmeasure').x1 + 4, `m1 over b at ${t}`); }
    assert.ok(ball1);
  }
});
