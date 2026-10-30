import assert from 'node:assert/strict';
import {test} from 'node:test';
import {check, compile} from '../src/index.ts';
import {PLAYS, startValues, type Play, type Values} from '../src/play/plays.ts';

/** Every control across its range, the others at their starts, then every pair of a slider's ends. */
function sweep(p: Play): Values[] {
  const out: Values[] = [], base = startValues(p);
  const spots = (c: Play['controls'][number]) => (c.kind === 'choice' ? c.options : Array.from({length: 9}, (_, i) => +(c.min + (c.max - c.min) * i / 8).toFixed(4)));
  for (const c of p.controls) for (const x of spots(c)) out.push({...base, [c.id]: x});
  const [a, b] = p.controls;
  if (b) for (const x of spots(a)) for (const y of spots(b)) out.push({...base, [a.id]: x, [b.id]: y});
  for (const r of p.predict.runs) out.push({...base, ...r});
  return out;
}

for (const p of PLAYS) {
  test(`play ${p.id}: one scale and a clean picture over the whole range`, () => {
    const ratios: number[][] = [];
    for (const v of sweep(p)) {
      const r: any = compile(p.spec(v) as never);
      assert.ok(r.scene, `${p.id} ${JSON.stringify(v)}: ${r.errors}`);
      const bad = check(r.scene);
      assert.deepEqual(bad, [], `${p.id} ${JSON.stringify(v)}`);
      ratios.push(p.probe(v, r.scene).map(([drawn, real]) => drawn / real));
    }
    ratios[0].forEach((_, i) => {
      const all = ratios.map(x => x[i]).filter(Number.isFinite), lo = Math.min(...all), hi = Math.max(...all);
      assert.ok(Math.abs(hi - lo) <= 0.01 * Math.abs(hi), `${p.id} probe ${i}: scale runs from ${lo} to ${hi}`);
    });
  });

  test(`play ${p.id}: exactly one right prediction, and each challenge can be won from its start`, () => {
    assert.equal(p.predict.options.filter(o => o.right).length, 1);
    for (const ch of p.challenges) {
      const base = {...startValues(p), ...ch.start};
      assert.ok(!ch.hit(base), `${ch.text}: already won at its start`);
      const lists = p.controls.map(c => (c.kind === 'choice' ? c.options : Array.from({length: Math.round((c.max - c.min) / c.step) + 1}, (_, i) => +(c.min + i * c.step).toFixed(4))));
      const won = (i: number, v: Values): boolean => (i === lists.length ? ch.hit(v) : lists[i].some(x => won(i + 1, {...v, [p.controls[i].id]: x})));
      assert.ok(won(0, base), `${ch.text}: no setting wins`);
    }
  });
}

test('a play reads what its verb computes', () => {
  const facts = (p: Play, v: Values) => ((compile(p.spec(v) as never) as any).scene.meta.facts as string[]).join(' | ');
  const [shot, bars, lens] = ['projectile', 'two-bars', 'lens'].map(id => PLAYS.find(p => p.id === id)!);
  const shotV = {speed: 20, angle: 30};
  assert.match(facts(shot, shotV), /at t = 2\.04 s: r = \(35\.3/);
  assert.equal(shot.reading(shotV)[0][1], '35.3 m');
  const barV = {first: 'copper', second: 'steel', L1: 0.5};
  assert.match(facts(bars, barV), /junction temperature 88\.5/);
  assert.equal(bars.reading(barV)[0][1], '88.5 °C');
  assert.match(facts(lens, {d: 15}), /v = \+30 cm, m = −2/);
  assert.equal(lens.reading({d: 15})[0][1], '30.0 cm');
});

test('the scale probe catches a verb that refits: the lens without its fixed window fails', () => {
  const lens = PLAYS.find(p => p.id === 'lens')!;
  const ratio = (d: number) => { const {window: _, ...spec} = lens.spec({d}) as Record<string, unknown>; const v = {d};
    return lens.probe(v, (compile(spec as never) as any).scene).map(([drawn, real]) => drawn / real)[0]; };
  assert.ok(Math.abs(ratio(12) - ratio(40)) > 0.05 * ratio(40));
});
