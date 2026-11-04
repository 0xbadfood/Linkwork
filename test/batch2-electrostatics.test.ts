// Batch 2 electrostatics (2026-11-04): beats of the leph1-01 and leph1-02 films that no verb could draw.
import {netForces} from '../src/verbs/electric.ts';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {check, compile, frame, type Scene} from '../src/index.ts';

const K = 8.988e9;
const made = (o: object) => { const r = compile(o as never); assert.deepEqual(r.errors, [], JSON.stringify(o)); return r.scene! as Scene; };
const errs = (o: object) => compile(o as never).errors.join(' | ');
const texts = (s: Scene, t: number) => (frame(s, t).props as any[]).filter(p => p.type === 'text' && (p.opacity ?? 1) > 0.05).map(p => p.text as string);

// the six beats' specs, as offered to the films
export const BEATS = {
  S07: {verb: 'electric', show: 'share', title: 'Charge shared between identical spheres', touches: 2, illustrative: true},
  S13: {verb: 'electric', show: 'lines', title: 'More Lines Cross at R', charges: [{q: 1e-9, x: 0, y: 0}], per: 24, reach: 1,
    elements: [{at: [0.3, 0.08], name: 'R'}, {at: [0.82, 0.22], name: 'S'}], illustrative: true},
  S03: {verb: 'electric', show: 'superposition', title: 'Charges Around q₁', on: 0, arrows: false, illustrative: true,
    charges: [{q: 1e-9, x: 0, y: 0, name: 'q₁'}, {q: 2e-9, x: 0.12, y: 0.06, name: 'q₂'}, {q: -1e-9, x: -0.09, y: 0.1, name: 'q₃'}, {q: 1.5e-9, x: -0.06, y: -0.11, name: 'q₄'}]},
  S31: {verb: 'electric', show: 'resultants', title: 'Three Resultants Close the Triangle', illustrative: true,
    charges: [{q: 1e-6, x: 0, y: 0.0866, name: 'A'}, {q: 1e-6, x: -0.05, y: 0, name: 'B'}, {q: -1e-6, x: 0.05, y: 0, name: 'C'}]},
  S17: {verb: 'potential', show: 'conductor', title: 'Constant potential through the conductor', illustrative: true},
  S04: {verb: 'potential', show: 'gradient', title: 'Positive Charge Moves from B to A', V: 100, dV: -20, dl: 0.5, names: true, move: true, illustrative: true},
};

test('batch 2 electrostatics: every beat spec compiles, checks clean and stays legible at full and half width', async () => {
  const {MIN_TEXT} = await import('../src/check.ts');
  for (const [beat, spec] of Object.entries(BEATS)) {
    assert.deepEqual(check(made(spec), {every: 3}), [], beat);
    for (const width of [1920, 960]) {
      const c = compile({compound: true, parts: [{id: 'a', box: [0, 0, width, 1080], spec}]} as never);
      assert.deepEqual(c.errors, [], `${beat} at ${width}`);
      assert.deepEqual(check(c.scene!, {every: 3}), [], `${beat} at ${width}`);
      const part = c.scene!.parts![0], small = part.scene.props.filter(p => p.type === 'text' && ((p as any).size ?? 32) * part.scale < MIN_TEXT - 1e-6);
      assert.deepEqual(small.map(p => (p as any).text), [], `${beat} at ${width}`);
    }
  }
});

test('electric share: identical spheres halve the charge at each touch, and the fractions survive illustrative', () => {
  const s = made(BEATS.S07), end = texts(s, s.duration - 0.01);
  // after two touches: the first sphere keeps q/4, the first helper q/2, the second q/4
  assert.deepEqual(end.filter(t => /^q/.test(t)).sort(), ['q/2', 'q/4', 'q/4']);
  assert.deepEqual(texts(s, 0.1).filter(t => /^q/.test(t)), ['q']);
  assert.match((made({...BEATS.S07, illustrative: false}).meta as any).facts[0], /q → q\/2 → q\/4/);
  assert.match((made({verb: 'electric', show: 'share', touches: 3}).meta as any).facts[0], /q\/4 → q\/8/);
  // only the sharing: no force arrows, no Coulomb's law yet
  assert.ok(!s.props.some(p => p.type === 'arrow'));
  assert.match(errs({verb: 'electric', show: 'share', touches: 4}), /touches is 1 to 3/);
  assert.match(errs({verb: 'electric', show: 'coulomb', touches: 2, illustrative: true}), /touches is 1 to 3 \(show share\)/);
});

test('electric lines with elements: equal areas normal to the lines, more lines cut the nearer one', () => {
  const facts = (made({...BEATS.S13, illustrative: false}).meta as any).facts.join(' ');
  const n = (name: string) => Number(new RegExp(`(\\d+) of the drawn lines cut the element at ${name}`).exec(facts)![1]);
  assert.ok(n('R') > n('S') && n('S') >= 1, facts);
  // 24 radial lines, 15° apart: an element of length 0.25 at r ≈ 0.31 spans about 45°, three lines; at r ≈ 0.85, about 17°, one
  assert.equal(n('R'), 3); assert.equal(n('S'), 1);
  const s = made(BEATS.S13);
  assert.match(texts(s, s.duration - 0.01).join(' '), /more lines cut the one at R than at S/);
  assert.ok(s.meta!.anchors && 'R' in (s.meta!.anchors as object) && 'S' in (s.meta!.anchors as object));
  assert.match(errs({verb: 'electric', show: 'lines', charges: [{q: 1e-9, x: 0, y: 0}], elements: [{at: [0, 0], name: 'R'}]}), /element R sits where the field has no direction/);
  assert.match(errs({verb: 'electric', show: 'lines', charges: [{q: 1e-9, x: -0.1, y: 0}, {q: 1e-9, x: 0.1, y: 0}], elements: [{at: [0, 0]}]}), /where it cancels/);
  assert.match(errs({verb: 'electric', show: 'coulomb', elements: [{at: [0.1, 0]}], illustrative: true}), /elements goes with show lines/);
  assert.match(errs({verb: 'electric', show: 'lines', charges: [{q: 1e-9, x: 0, y: 0}], elements: [{at: 'R'}]}), /elements is 1 to 4 of/);
  assert.match(errs({verb: 'electric', show: 'lines', charges: [{q: 1e-9, x: 0, y: 0}], size: 0.1}), /give elements/);
  assert.match(errs({verb: 'electric', show: 'lines', charges: [{q: 1e-9, x: 0, y: 0}], per: 50}), /per is 4 to 36/);
});

test('electric superposition arrows: false sets out q1 among the charges with no force yet', () => {
  const s = made(BEATS.S03);
  assert.ok(!s.props.some(p => p.type === 'arrow'));
  assert.deepEqual(texts(s, 5).filter(t => /^q.$/.test(t)).sort(), ['q₁', 'q₂', 'q₃', 'q₄']);
  assert.ok((s.meta!.anchors as any).on);
  assert.match(texts(s, 5).join(' '), /q₁ among several other charges/);
  // no point or charge needed for the set-up alone; arrows belongs to superposition
  assert.deepEqual(errs({verb: 'electric', show: 'superposition', arrows: false, charges: [{q: 1e-9, x: 0, y: 0}, {q: 1e-9, x: 0.1, y: 0}]}), '');
  assert.match(errs({verb: 'electric', show: 'lines', arrows: false, charges: [{q: 1e-9, x: 0, y: 0}]}), /arrows goes with show superposition/);
  assert.match(errs({verb: 'electric', show: 'superposition', arrows: 'no', charges: [{q: 1e-9, x: 0, y: 0}], on: 0}), /arrows is true or false/);
});

test('electric resultants: NCERT Example 1.7, q, q and −q on an equilateral triangle: F, F and √3 F, summing to zero', () => {
  const l = 0.1, q = 1e-6, F = K * q * q / (l * l), cs = BEATS.S31.charges;
  const [fA, fB, fC] = netForces(cs), mag = (v: number[]) => Math.hypot(v[0], v[1]);
  assert.ok(Math.abs(mag(fA) - F) / F < 1e-3, `F at A ${mag(fA)} vs ${F}`);
  assert.ok(Math.abs(mag(fB) - F) / F < 1e-3);
  assert.ok(Math.abs(mag(fC) - Math.sqrt(3) * F) / F < 1e-3, 'the resultant at C is √3 F');
  // F₁ along BC (the book's r̂₁), F₃ along the bisector of angle BCA, toward the side AB
  const BC = [cs[2].x - cs[1].x, cs[2].y - cs[1].y];
  assert.ok(Math.abs(fA[0] * BC[1] - fA[1] * BC[0]) < 1e-3 * mag(fA) * mag(BC) && fA[0] * BC[0] + fA[1] * BC[1] > 0);
  const mid = [(cs[0].x + cs[1].x) / 2 - cs[2].x, (cs[0].y + cs[1].y) / 2 - cs[2].y];
  assert.ok(Math.abs(fC[0] * mid[1] - fC[1] * mid[0]) < 1e-3 * mag(fC) * mag(mid) && fC[0] * mid[0] + fC[1] * mid[1] > 0);
  assert.ok(mag([fA[0] + fB[0] + fC[0], fA[1] + fB[1] + fC[1]]) < 1e-9 * F);
  // drawn: the tip-to-tail chain closes, the last arrow's head on the first one's tail
  const s = made(BEATS.S31), end = frame(s, s.duration - 0.01).props as any[], ch = (i: number) => end.find(p => p.id === `chain${i}`);
  assert.ok(Math.hypot(ch(2).x2 - ch(0).x1, ch(2).y2 - ch(0).y1) < 1, 'the chain closes');
  for (const i of [0, 1]) assert.ok(Math.hypot(ch(i).x2 - ch(i + 1).x1, ch(i).y2 - ch(i + 1).y1) < 1, 'tip to tail');
  // one scale: the chain's arrow at C is √3 times the one at A
  const len = (p: any) => Math.hypot(p.x2 - p.x1, p.y2 - p.y1);
  assert.ok(Math.abs(len(ch(2)) / len(ch(0)) - Math.sqrt(3)) < 0.01);
  assert.match((made({...BEATS.S31, illustrative: false}).meta as any).facts.join(' '), /F₁ \+ F₂ \+ F₃ = 0.*F₁ = 0\.899 N.*F₂ = 0\.899 N.*F₃ = 1\.56 N/);
  assert.ok(texts(s, s.duration - 0.01).includes('F₃'), 'force names stay when numbers are hidden');
  assert.ok(!made({...BEATS.S31, close: false}).props.some(p => p.id.startsWith('chain')));
  assert.match(errs({verb: 'electric', show: 'resultants', charges: [{q: 1e-9, x: 0, y: 0}]}), /at least two charges/);
  assert.match(errs({verb: 'electric', show: 'resultants'}), /resultants needs charges/);
  assert.match(errs({verb: 'electric', show: 'superposition', close: true, charges: [{q: 1e-9, x: 0, y: 0}], at: [1, 0]}), /close goes with show resultants/);
});

test('potential conductor: one potential kQ/R inside and on the surface, E normal outside', () => {
  const s = made({verb: 'potential', show: 'conductor', q: 1e-9, R: 0.1});
  assert.match((s.meta as any).facts[0], /V = kQ\/R = 89\.9 V everywhere inside and on the surface/);
  // with q given: its sign on the surface, E normal outside, and no field drawn inside the metal
  const sig = frame(s, s.duration - 0.01).props as any[], metal = sig.find(p => p.id === 'metal'), arrows = sig.filter(p => p.type === 'arrow');
  assert.ok(arrows.length && sig.some(p => p.type === 'text' && p.text === '+'));
  for (const a of arrows) assert.ok(Math.hypot(a.x1 - metal.x, a.y1 - metal.y) > metal.r && Math.hypot(a.x2 - metal.x, a.y2 - metal.y) > metal.r);
  // with no q (leph1-02 C9 S17, refused five times): no sign, no field, no 'no work'; one plain V inside and on the surface
  const ill = made(BEATS.S17), at = frame(ill, ill.duration - 0.01).props as any[], words = texts(ill, ill.duration - 0.01);
  assert.equal(words.filter(t => t === 'V').length, 5, 'the same V at three points inside and two on the surface');
  assert.ok(!words.some(t => /V₀|^[+−]$|work|leaves|E = /.test(t)), words.join(' | '));
  assert.ok(!at.some(p => p.type === 'arrow') && !at.some(p => p.type === 'polyline'), 'no field and no outside equipotentials');
  assert.deepEqual((made({...BEATS.S17, illustrative: false}).meta as any).facts, ['the potential has one value throughout the conductor and on its surface']);
  assert.match(errs({verb: 'potential', show: 'conductor', q: 0}), /needs a charge q/);
  assert.match(errs({verb: 'potential', show: 'curves', R: 0.1}), /R is the conductor's radius/);
});

test('potential gradient: E points to the lower surface whatever the sign of dV; move carries the charge against it', () => {
  const arrowE = (s: Scene) => (frame(s, s.duration - 0.01).props as any[]).find(p => p.type === 'arrow');
  const anchors = (s: Scene) => s.meta!.anchors as any;
  // the book: B is at V + δV with δV along E, so negative: E points from A to B (2026-11-04: it had pointed to A)
  const book = made({verb: 'potential', show: 'gradient', V: 100, dV: -20, dl: 0.5, illustrative: true}), e = arrowE(book), A = anchors(book).A, B = anchors(book).B;
  assert.ok(Math.abs(e.x2 - B[0]) < Math.abs(e.x2 - A[0]), 'E ends at B');
  const rise = made({verb: 'potential', show: 'gradient', V: 100, dV: 20, dl: 0.5, illustrative: true}), e2 = arrowE(rise);
  assert.ok(Math.abs(e2.x2 - anchors(rise).A[0]) < Math.abs(e2.x2 - anchors(rise).B[0]), 'with B higher, E ends at A');
  assert.match((made({verb: 'potential', show: 'gradient', V: 100, dV: -20, dl: 0.5}).meta as any).facts[0], /\|E\| = \|δV\|\/δl = 40 V\/m/);
  assert.ok(texts(made({verb: 'potential', show: 'gradient', V: 100, dV: -20, dl: 0.5}), 6).some(t => /V \+ δV = 80 V/.test(t)), 'B at 80 V');
  // the unit positive charge goes from B to A: against E
  const s = made(BEATS.S04), x = (t: number) => (frame(s, t).props as any[]).find(p => p.id === 'unit').x, eS = arrowE(s);
  assert.ok(Math.abs(x(0) - anchors(s).B[0]) < 1 && Math.abs(x(s.duration - 0.01) - anchors(s).A[0]) < 1);
  assert.ok(Math.sign(x(s.duration - 0.01) - x(0)) === -Math.sign(eS.x2 - eS.x1), 'against the field');
  assert.ok(texts(s, 6).includes('B: V + δV') && texts(s, 6).includes('A: V') && texts(s, 6).includes('P'));
  assert.match(texts(s, 6).join(' '), /from B to A, against the field/);
  assert.match(errs({verb: 'potential', show: 'curves', move: true}), /move is true or false, with show gradient/);
  assert.match(errs({verb: 'potential', show: 'gradient', dV: 0}), /not 0/);
});
