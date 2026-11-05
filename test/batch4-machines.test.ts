// Batch 4 machines verbs (2026-11-05, ICSE Class 10 Machines, icph1-03): pulley (fixed, movable, block and tackle, one
// fixed with n movable) and moments' levers by class, checked against the book's worked numbers.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {check, compile, frame, type Scene} from '../src/index.ts';
import {pulleyNumbers} from '../src/verbs/pulley.ts';
import {leverNumbers} from '../src/verbs/moments.ts';

const made = (o: object) => { const r = compile(o as never); assert.deepEqual(r.errors, [], JSON.stringify(o)); return r.scene! as Scene; };
const texts = (s: Scene, t: number) => (frame(s, t).props as any[]).filter(p => p.type === 'text' && (p.opacity ?? 1) > 0.05).map(p => p.text as string);
const near = (a: number, b: number, tol = 1e-3) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} vs ${b}`);
const errs = (o: object) => compile(o as never).errors.join(' ');
const lastKey = (s: Scene) => Math.max(...(s.props as any[]).flatMap(p => Object.values(p.keys ?? {}).flat().map((k: any) => k[0])));
const facts = (s: Scene) => s.meta!.facts as string[];

test("pulley numbers: the book's worked examples and exercises", () => {
  // Example: a fixed pulley, a 400 N load raised with 480 N: VR 1, MA 0.83, η 83.3%
  let q = pulleyNumbers({kind: 'fixed', load: 400, effort: 480});
  assert.equal(q.VR, 1); near(q.MA!, 400 / 480); near(q.eta!, 400 / 480);
  near(pulleyNumbers({kind: 'fixed', load: 60, effort: 70}).MA!, 0.857);                    // a bucket of 6 kg, 70 N
  // block and tackle: 3 pulleys, 75 kgf with 25 kgf: MA 3, VR 3, 100%; 5 pulleys, 4500 N with 1000 N: 4.5, 5, 90%
  q = pulleyNumbers({kind: 'tackle', n: 3, load: 75, effort: 25}); assert.equal(q.VR, 3); near(q.MA!, 3); near(q.eta!, 1);
  q = pulleyNumbers({kind: 'tackle', n: 5, load: 4500, effort: 1000}); assert.equal(q.VR, 5); near(q.MA!, 4.5); near(q.eta!, 0.9);
  // VR 4, 150 kgf with 50 kgf: MA 3, η 75%
  q = pulleyNumbers({kind: 'tackle', n: 4, load: 150, effort: 50}); near(q.MA!, 3); near(q.eta!, 0.75);
  // VR 3 at 80%: MA 2.4, effort for 300 N is 125 N; a man pulling 200 kgf at 60% raises 360 kgf
  q = pulleyNumbers({kind: 'tackle', n: 3, load: 300, efficiency: 0.8}); near(q.MA!, 2.4); near(q.E!, 125);
  q = pulleyNumbers({kind: 'tackle', n: 3, effort: 200, efficiency: 0.6}); near(q.L!, 360);
  // a movable pulley's own weight: (100 + 10)/2 = 55 N, MA 1.82; a tackle's lower block: E = (L + w)/n
  q = pulleyNumbers({kind: 'movable', load: 100, w: 10}); near(q.E!, 55); near(q.MA!, 100 / 55);
  q = pulleyNumbers({kind: 'tackle', n: 4, load: 1000, w: 40}); near(q.E!, 260); near(q.eta!, 1 - 40 / (4 * 260));   // η = 1 − w/nE
  near(pulleyNumbers({kind: 'tackle', n: 4, load: 1000, w: 40, friction: 0.9}).E!, 260 / 0.9);
  // one fixed with n movable: VR = MA = 2ⁿ ideally (3 movable: 8; 2 movable: L = 4T1); each string's tension halves
  q = pulleyNumbers({kind: 'chain', n: 3, load: 800}); assert.equal(q.VR, 8); near(q.MA!, 8); assert.deepEqual(q.T, [400, 200, 100]);
  assert.equal(pulleyNumbers({kind: 'chain', n: 2}).VR, 4);
  assert.equal(pulleyNumbers({kind: 'movable'}).VR, 2);
});

test('pulley scenes: the effort end moves VR times as far as the load, drawn; motion ends a second before the end', () => {
  const cases: [object, number][] = [[{kind: 'fixed'}, 1], [{kind: 'movable'}, 2], [{kind: 'movable', with_fixed: true}, 2],
    ...[2, 3, 4, 5, 6].map(n => [{kind: 'tackle', n}, n] as [object, number]), ...[1, 2, 3].map(n => [{kind: 'chain', n}, 2 ** n] as [object, number])];
  for (const [spec, VR] of cases) {
    const s = made({verb: 'pulley', ...spec}), at = (t: number, id: string) => (frame(s, t).props as any[]).find(p => p.id === id);
    const dE = Math.abs(at(s.duration, 'grip').y - at(0, 'grip').y), dL = at(0, 'load').y - at(s.duration, 'load').y;
    assert.ok(dL > 5, `${JSON.stringify(spec)}: the load rises`);
    near(dE / dL, VR, 1e-2);
    assert.ok(s.duration - lastKey(s) >= 1, `${JSON.stringify(spec)}: ${s.duration} vs ${lastKey(s)}`);
  }
  // the fixed pulley's effort pulls down, the lone movable pulley's up
  const fx = made({verb: 'pulley', kind: 'fixed'}), mv = made({verb: 'pulley', kind: 'movable'});
  const g = (s: Scene, t: number) => (frame(s, t).props as any[]).find(p => p.id === 'grip').y;
  assert.ok(g(fx, fx.duration) > g(fx, 0) && g(mv, mv.duration) < g(mv, 0));
});

test("pulley facts and panel: the book's block and tackle (VR 4, 150 kgf, 50 kgf, 20 m, g = 10)", () => {
  const s = made({verb: 'pulley', kind: 'tackle', n: 4, load: 150, effort: 50, unit: 'kgf', rise: 20, g: 10});
  const fs = facts(s).join('; ');
  for (const want of ['velocity ratio VR = 4', 'mechanical advantage MA = 3', 'efficiency η = 75%', 'load rises 20 m while the effort end moves 80 m', 'work put in 40000 J, work done on the load 30000 J'])
    assert.ok(fs.includes(want), `${want} in ${fs}`);
  const shown = texts(s, s.duration).join(' | ');
  assert.match(shown, /The effort end moves four times as far as the load/); assert.match(shown, /η = MA \/ VR = 3 \/ 4 = 75%/);
  // four strands marked T hold the lower block; the effort strand is the fifth
  assert.equal(texts(s, s.duration).filter(t => t === 'T').length, 4);
  const w = made({verb: 'pulley', kind: 'tackle', n: 4, load: 1000, w: 40, friction: 0.9});
  assert.match(texts(w, w.duration).join(' | '), /E = \(L \+ w\) \/ 4 = \(1000 \+ 40\) \/ 4 = 260 N/);
  const ch = made({verb: 'pulley', kind: 'chain', n: 3, load: 800});
  for (const t of ['T1', 'T2', 'T3']) assert.ok(texts(ch, 2).includes(t), t);
});

test('pulley illustrative: words and names, no numbers', () => {
  for (const spec of [{kind: 'fixed'}, {kind: 'movable', load: 100, w: 10}, {kind: 'tackle', n: 5, load: 4500, effort: 1000, rise: 1}, {kind: 'chain', n: 2}]) {
    const s = made({verb: 'pulley', title: 'Pulleys', ...spec, illustrative: true});
    const shown = texts(s, s.duration);
    assert.ok(!shown.some(t => t !== 'Pulleys' && /\d/.test(t.replace(/\bT\d\b/g, ''))), shown.join(' | '));
    assert.ok(shown.some(t => /The effort end moves/.test(t)) && shown.includes('L') && shown.includes('E') && shown.includes('dE'), shown.join(' | '));
    assert.deepEqual(facts(s), []);
  }
});

test('pulley errors name the field and the fix', () => {
  assert.match(errs({verb: 'pulley', kind: 'crane'}), /kind is fixed .* movable .* tackle .* chain/);
  assert.match(errs({verb: 'pulley', kind: 'tackle', n: 9}), /2 to 6/);
  assert.match(errs({verb: 'pulley', kind: 'chain', n: 4}), /1 to 3/);
  assert.match(errs({verb: 'pulley', kind: 'fixed', n: 2}), /n belongs to kind tackle or chain/);
  assert.match(errs({verb: 'pulley', kind: 'fixed', load: 10, w: 2}), /leave out w/);
  assert.match(errs({verb: 'pulley', with_fixed: true}), /belongs to kind movable/);
  assert.match(errs({verb: 'pulley', efficiency: 80}), /80% is 0.8/);
  assert.match(errs({verb: 'pulley', kind: 'tackle', n: 4, load: 100, effort: 20}), /η = 1.25, more than 1.*at least L \/ VR = 25/);
  assert.match(errs({verb: 'pulley', load: 100, effort: 120, efficiency: 0.8}), /over-fix/);
  assert.match(errs({verb: 'pulley', load: 100, effort: 120, w: 3}), /measured effort already includes/);
  assert.match(errs({verb: 'pulley', effort: 120}), /needs the load/);
  assert.match(errs({verb: 'pulley', kind: 'movable', w: 3}), /need the load/);
});

test("levers by class: MA = effort arm / load arm, η lowers MA, the book's numbers", () => {
  near(leverNumbers(2, 10, 4).MA, 2.5); near(leverNumbers(2, 10, 4, 0.6).MA, 1.5); near(leverNumbers(2, 10, 4, 0.6).VR, 2.5);
  near(leverNumbers(3, 2.5, 10).MA, 0.25); near(leverNumbers(3, 2.5, 10, 0.6).MA, 0.15);
  near(leverNumbers(1, 60, 4).MA, 15);                                         // effort arm 60 cm, load arm 4 cm
  near(leverNumbers(2, 20, 2, 1, 40).E!, 4);                                   // a nutcracker: 40 kgf, 20 cm, 2 cm
  near(leverNumbers(3, 7, 28, 1, 2.5).E!, 10);                                 // fire tongs 28 cm, effort at 7 cm, 250 g coal
  near(leverNumbers(1, 1.9, 0.1, 1, 100).E!, 100 / 19);                        // a 2 m crowbar pivoted 10 cm from its tip
  const s = made({verb: 'moments', title: 'A nutcracker', lever: {class: 2, effort_arm: 20, load_arm: 2, load: 40, unit: 'kgf', examples: true}});
  const shown = texts(s, s.duration).join(' | ');
  for (const want of ['L = 40 kgf', 'E = 4 kgf', 'MA = 20 / 2 = 10', 'Class II lever', 'Examples: a nutcracker']) assert.ok(shown.includes(want), `${want} in ${shown}`);
  const t = made({verb: 'moments', lever: {class: 3, effort_arm: 2.5, load_arm: 10, efficiency: 0.6}});
  assert.match(texts(t, t.duration).join(' | '), /MA = 0.60 × 0.25 = 0.15/);
});

test('levers: F, L and E placed by class; the class named; the lever turns about F and stops a second before the end', () => {
  for (const c of [1, 2, 3]) {
    const s = made({verb: 'moments', lever: {class: c}}), p = frame(s, 0).props as any[];
    const xF = p.find(q => q.id === 'wedge').points[0][0], xL = p.find(q => q.id === 'L').x1, xE = p.find(q => q.id === 'E').x1;
    const between = (m: number, a: number, b: number) => m > Math.min(a, b) && m < Math.max(a, b);
    if (c === 1) assert.ok(between(xF, xE, xL), 'class I: F between');
    if (c === 2) assert.ok(between(xL, xF, xE), 'class II: L between');
    if (c === 3) assert.ok(between(xE, xF, xL), 'class III: E between');
    assert.ok(texts(s, s.duration).some(t => t.startsWith(`Class ${['I', 'II', 'III'][c - 1]} lever`)));
    assert.ok(s.duration - lastKey(s) >= 1);
    // the bar turns about F: F's point of the bar stays put
    const bar = (t: number) => (frame(s, t).props as any[]).find(q => q.id === 'bar');
    const b0 = bar(0), b1 = bar(s.duration), at = (b: any) => b.y1 + (b.y2 - b.y1) * (xF - b.x1) / (b.x2 - b.x1);
    near(at(b1), at(b0), 1e-2);
    assert.ok(Math.max(Math.abs(b1.y1 - b0.y1), Math.abs(b1.y2 - b0.y2)) > 5, 'it turned');
    const ill = texts(made({verb: 'moments', title: 'Levers', lever: {class: c, effort_arm: c === 3 ? 1 : 4, load_arm: c === 3 ? 4 : 1, load: 10}, illustrative: true}), 9);
    assert.ok(!ill.some(t => t !== 'Levers' && /\d/.test(t)), ill.join(' | '));
    assert.ok(ill.some(t => /MA = effort arm \/ load arm/.test(t)));
  }
  const all = made({verb: 'moments', title: 'Three classes of lever', lever: {class: 'all', examples: true}});
  const shown = texts(all, all.duration);
  for (const want of ['Class I', 'Class II', 'Class III', 'MA always more than one: a force multiplier', 'MA always less than one: a gain in speed']) assert.ok(shown.includes(want), want);
  assert.ok(shown.some(t => /e\.g\. a nutcracker/.test(t)) && shown.some(t => /fire tongs/.test(t)));
  assert.ok(all.duration - lastKey(all) >= 1);
});

test('lever errors name the field and the fix', () => {
  assert.match(errs({verb: 'moments', lever: {class: 4}}), /lever.class is 1/);
  assert.match(errs({verb: 'moments', lever: {class: 2, effort_arm: 2, load_arm: 5}}), /class II .* effort_arm > load_arm/);
  assert.match(errs({verb: 'moments', lever: {class: 3, effort_arm: 5, load_arm: 2}}), /class III .* effort_arm < load_arm/);
  assert.match(errs({verb: 'moments', lever: {class: 1, effort_arm: 5}}), /give both/);
  assert.match(errs({verb: 'moments', lever: {class: 'all', load: 5}}), /leave out load/);
  assert.match(errs({verb: 'moments', lever: {class: 1, load: 5}}), /need the arms/);
  assert.match(errs({verb: 'moments', lever: {class: 1}, forces: []}), /leave out forces/);
  assert.match(errs({verb: 'moments', lever: {class: 1, examples: ['2 jacks']}}), /without digits/);
});

test('every new show passes the scene checks, full frame and half', () => {
  const specs = [{verb: 'pulley', kind: 'fixed', load: 400, effort: 480, rise: 5}, {verb: 'pulley', kind: 'movable', load: 100, w: 10, rise: 1},
    {verb: 'pulley', kind: 'movable', with_fixed: true, load: 20, unit: 'kgf'}, {verb: 'pulley', kind: 'tackle', n: 6, load: 1000, w: 40, friction: 0.9, rise: 2, title: 'A block and tackle of six'},
    {verb: 'pulley', kind: 'tackle', n: 2, effort: 200, efficiency: 0.6, unit: 'kgf'}, {verb: 'pulley', kind: 'chain', n: 3, load: 800, w: 5, rise: 1},
    {verb: 'moments', title: 'A nutcracker', lever: {class: 2, effort_arm: 20, load_arm: 2, load: 40, unit: 'kgf', examples: true}},
    {verb: 'moments', lever: {class: 3, effort_arm: 2.5, load_arm: 10, efficiency: 0.6, load: 5, examples: true}}, {verb: 'moments', lever: {class: 1, effort_arm: 1, load_arm: 1}},
    {verb: 'moments', title: 'Three classes of lever', lever: {class: 'all', examples: true}}];
  for (const spec of specs) for (const width of [1920, 960]) {
    const r = width === 1920 ? compile(spec as never) : compile({compound: true, parts: [{id: 'a', box: [0, 0, width, 1080], spec}]} as never);
    assert.deepEqual(r.errors, [], JSON.stringify(spec));
    assert.deepEqual(check(r.scene!, {every: 3}), [], `${JSON.stringify(spec)} at ${width}`);
  }
});
