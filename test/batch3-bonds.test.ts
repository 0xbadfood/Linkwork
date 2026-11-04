// Batch 3 (2026-11-05): the atoms of a solid as balls joined by springs (elastic kind bonds, keph2-01 C9 S13-S14), and
// the slack string at C kept off the weight arrow (vertical_circle top, keph1-05 C8 "Bob at point C").
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {check, compile, frame, type Scene} from '../src/index.ts';

const made = (o: object) => { const r = compile(o as never); assert.deepEqual(r.errors, [], JSON.stringify(o)); return r.scene! as Scene; };
const errs = (o: object) => compile(o as never).errors.join(' ');
const texts = (s: Scene, t: number) => (frame(s, t).props as any[]).filter(p => (p.type === 'text' || p.type === 'readout') && (p.opacity ?? 1) > 0.05).map(p => p.text as string);
const clean = (s: Scene) => { assert.deepEqual(check(s, {every: 3}), []); return s; };
const at = (s: Scene, t: number) => frame(s, t).props as any[];
const byId = (s: Scene, t: number, id: string) => at(s, t).find(p => p.id === id);

const S13 = {verb: 'elastic', kind: 'bonds', stage: 'stretch', title: 'Atoms as balls and springs', illustrative: true};
const S14 = {verb: 'elastic', kind: 'bonds', stage: 'release', title: 'Bonds relax on release', illustrative: true};

/** Spacing of a row's atoms along the pull and of a column's across it, at t. */
const spacing = (s: Scene, t: number) => {
  const a = (j: number, i: number) => byId(s, t, `atom${j}-${i}`);
  return {along: a(0, 1).x - a(0, 0).x, across: a(1, 0).y - a(0, 0).y, total: a(0, 4).x - a(0, 0).x};
};
/** A bond's drawn length along the pull: from its first segment's start to its last segment's end. */
const bondLength = (s: Scene, t: number) => {
  const segs = at(s, t).filter(p => /^h0-0-\d+$/.test(p.id));
  return Math.max(...segs.map(p => Math.max(p.x1, p.x2))) - Math.min(...segs.map(p => Math.min(p.x1, p.x2)));
};

test('elastic bonds stretch: the spacing along the pull grows by one factor, across it stays, the bonds lengthen and glow', () => {
  for (const width of [1920, 960]) {
    const s = clean(made({...S13, width, height: 1080})), end = s.duration;
    const s0 = spacing(s, 0), s1 = spacing(s, end);
    assert.ok(Math.abs(s1.along / s0.along - 1.3) < 1e-6, `along ${s1.along / s0.along}`);
    assert.ok(Math.abs(s1.total / s0.total - 1.3) < 1e-6);
    assert.ok(Math.abs(s1.across - s0.across) < 1e-9);      // across the pull nothing stretches
    assert.ok(bondLength(s, end) > 1.35 * bondLength(s, 0), 'the springs lengthen (more than the spacing: the balls keep their size)');
    assert.ok(byId(s, 0, 'g0-0-0').opacity < 0.01 && byId(s, end, 'g0-0-0').opacity > 0.99, 'the stored energy glows once stretched');
    // the motion is over at least a second before the end
    assert.deepEqual(spacing(s, end - 1), s1);
    // the pull is on while it stretches
    assert.ok(byId(s, 2.5, 'pull0r').opacity > 0.9 && byId(s, 2.5, 'pull0l').opacity > 0.9);
  }
});

test('elastic bonds release: starts stretched with the pull on, the pull goes and the bonds return to their rest length', () => {
  for (const width of [1920, 960]) {
    const s = clean(made({...S14, width, height: 1080})), end = s.duration;
    const st = spacing(s, 0), fin = spacing(s, end), unpulled = spacing(made({...S13, width, height: 1080}), 0);
    assert.ok(Math.abs(st.along / unpulled.along - 1.3) < 1e-6);
    assert.ok(Math.abs(fin.along - unpulled.along) < 1e-6, 'back to rest');
    assert.deepEqual(spacing(s, end - 1), fin);
    assert.ok(byId(s, 0.5, 'pull0r').opacity > 0.9 && byId(s, end, 'pull0r').opacity < 0.01, 'the force is removed');
    assert.ok(byId(s, 0, 'g0-0-0').opacity > 0.99 && byId(s, end, 'g0-0-0').opacity < 0.01, 'the energy is given up');
  }
});

test('elastic bonds: each stage says only its own step; no numbers on screen', () => {
  const a = texts(made(S13), 99).join(' | '), b = texts(made(S14), 99).join(' | ');
  assert.match(a, /Atoms joined by bonds, like springs/);
  assert.match(a, /stored in the bonds as potential energy/);
  assert.doesNotMatch(a, /relax|removed|given up/);
  assert.match(b, /The force is removed/);
  assert.match(b, /relax back to their natural length/);
  assert.match(b, /energy is given up/);
  assert.doesNotMatch(b, /stored in the bonds|Stretching/);
  for (const t of [a, b]) assert.doesNotMatch(t, /\d/);
  // left out: both steps in turn; a row of atoms instead of a grid
  const both = made({verb: 'elastic', kind: 'bonds', title: 'Bonds as springs'}), all = texts(both, 99).join(' | ');
  assert.match(all, /bonds stretch/); assert.match(all, /relax/);
  clean(both);
  const row = clean(made({verb: 'elastic', kind: 'bonds', atoms: 'row', stage: 'stretch', title: 'A row of atoms'}));
  assert.equal(at(row, 0).filter(p => /^atom/.test(p.id)).length, 6);
  assert.equal(at(row, 0).filter(p => /^v\d/.test(p.id)).length, 0, 'a row has no bonds across');
  assert.ok(row.meta!.anchors && (row.meta!.anchors as any).bond);
});

test('elastic bonds: bad input is refused with the fix', () => {
  assert.match(errs({...S13, stage: 'squeeze'}), /bonds stage is stretch .* or release/);
  assert.match(errs({verb: 'elastic', kind: 'hydraulic', p: 1e5, B: 1e10, stage: 'stretch'}), /stage is squeeze/);
  assert.match(errs({verb: 'elastic', kind: 'shear', L: 1, A: 0.01, F: 10, G: 8e10, stage: 'release'}), /stage goes with kind hydraulic .* or kind bonds/);
  assert.match(errs({...S13, atoms: 'cube'}), /atoms is 'grid'.*or 'row'/);
  assert.match(errs({verb: 'elastic', kind: 'tension', L: 1, d: 0.01, F: 100, Y: 2e11, atoms: 'row'}), /atoms goes with kind bonds/);
  assert.match(errs({...S13, F: 100, material: 'steel'}), /no numbers or material; leave out material, F/);
  assert.match(errs({...S13, show: ['energy']}), /a bonds scene shows nothing extra/);
});

// --- vertical_circle top: the slack string and the weight arrow ---

/** Least distance between two segments (sampled finely), in px. */
const segDist = (a: number[], b: number[]) => {
  let best = Infinity;
  for (let i = 0; i <= 60; i++) {
    const p = [a[0] + (a[2] - a[0]) * i / 60, a[1] + (a[3] - a[1]) * i / 60];
    const [x1, y1, x2, y2] = b, dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
    const u = Math.max(0, Math.min(1, ((p[0] - x1) * dx + (p[1] - y1) * dy) / l2));
    best = Math.min(best, Math.hypot(p[0] - x1 - u * dx, p[1] - y1 - u * dy));
  }
  return best;
};

test('vertical_circle top: the slack string at C never runs along the weight arrow', () => {
  for (const spec of [{verb: 'vertical_circle', show: 'top', title: 'Bob at point C', illustrative: true},
    {verb: 'vertical_circle', show: 'top', title: 'Bob at point C', approach: false},
    {verb: 'vertical_circle', show: 'top', title: 'Bob at point C', L: 0.5, mass: 0.2}]) {
    for (const width of [1920, 960]) {
      const s = clean(made({...spec, width, height: 1080}));
      for (const t of [s.duration - 1.5, s.duration]) {
        const ps = at(s, t), mg = ps.find(p => p.id === 'mg'), bob = ps.find(p => p.id === 'bob'), k = 1080 / 1080;
        assert.ok(mg.opacity > 0.9);
        const arrow = [mg.x1, mg.y1, mg.x2, mg.y2];
        for (const piece of ps.filter(p => /^string\d+$/.test(p.id))) {
          // the part of a piece hidden under the bob (and a few px round it) is where the two meet: leave it out
          const pts = Array.from({length: 41}, (_, i) => [piece.x1 + (piece.x2 - piece.x1) * i / 40, piece.y1 + (piece.y2 - piece.y1) * i / 40])
            .filter(([x, y]) => Math.hypot(x - bob.x, y - bob.y) > bob.r + 4 * k);
          for (let i = 0; i + 1 < pts.length; i++) {
            const d = segDist(arrow, [...pts[i], ...pts[i + 1]]);
            assert.ok(d > 10 * k, `${JSON.stringify(spec)} w${width} t${t.toFixed(1)}: ${piece.id} is ${d.toFixed(1)} px from mg`);
          }
        }
      }
    }
  }
});
