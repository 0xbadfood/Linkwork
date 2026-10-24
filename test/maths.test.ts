import assert from 'node:assert/strict';
import {test} from 'node:test';
import {check, claimErrors, compile, criticalPoints, derivative, dfOf, evaluate, exprErrors, fOf, frame, integrate, parse, riemann, show} from '../src/index.ts';

test('expressions parse safely and refuse anything else', () => {
  assert.deepEqual(exprErrors('2x^2 - 3(x + 1) + sin(x)/x'), []);
  for (const bad of ['process.exit()', 'x; 1', 'constructor', '__proto__', 'x +', 'sin x', '2xy']) assert.equal(exprErrors(bad).length, 1, bad);
  assert.equal(evaluate(parse('-x^2'), {x: 3}), -9);
  assert.equal(evaluate(parse('2^-1'), {}), 0.5);
  assert.ok(Number.isNaN(evaluate(parse('sqrt(x)'), {x: -1})) && Number.isNaN(evaluate(parse('1/x'), {x: 0})));
});

test('derivatives are exact: they match finite differences everywhere they are defined', () => {
  for (const src of ['x^3 - 3x', 'sin(x) * exp(-x)', 'ln(x^2 + 1)', 'sqrt(x)', '1/x', 'tan(x)', 'x^x', '2^x', 'abs(x - 1)', 'cos(2x)^2', 'log(x)']) {
    const f = fOf(src), df = dfOf(src);
    for (const x of [0.3, 0.7, 1.4, 2.2]) {
      const h = 1e-6, num = (f(x + h) - f(x - h)) / (2 * h);
      if (Number.isFinite(num)) assert.ok(Math.abs(df(x) - num) < 1e-4 * Math.max(1, Math.abs(num)), `${src} at ${x}: ${df(x)} vs ${num}`);
    }
  }
  assert.equal(show(derivative(parse('x^3 - 3x'))), '3x² − 3');
});

test('domain and range claims are checked against the function', () => {
  assert.deepEqual(claimErrors('sqrt(x)', -4, 9, 'x >= 0', 'y >= 0'), []);
  assert.deepEqual(claimErrors('1/x', -5, 5, 'x != 0', 'y != 0'), []);
  assert.deepEqual(claimErrors('x^2', -3, 3, 'all', 'y >= 0'), []);
  assert.match(claimErrors('sqrt(x)', -4, 9, 'all')[0], /includes x = .* not defined/);
  assert.match(claimErrors('sqrt(x - 1)', -4, 9, 'x >= 0')[0], /not defined/);
  assert.match(claimErrors('x^2', -3, 3, undefined, 'y >= 1')[0], /leaves out y/);
  assert.match(claimErrors('x^2 + 1', -3, 3, undefined, 'y >= 0')[0], /only gets down to 1/);
});

test('critical points and integrals', () => {
  const cps = criticalPoints(fOf('x^3 - 3x'), dfOf('x^3 - 3x'), -2.4, 2.4);
  assert.deepEqual(cps.map(c => [Math.round(c.x * 1e6) / 1e6, c.kind]), [[-1, 'maximum'], [1, 'minimum']]);
  assert.equal(criticalPoints(fOf('x^3'), dfOf('x^3'), -2, 2)[0]?.kind, 'flat');   // f′(0) = 0, but no maximum or minimum
  assert.ok(Math.abs(integrate(fOf('x^2'), 0, 2) - 8 / 3) < 1e-9);
  assert.ok(Math.abs(riemann(fOf('x^2'), 0, 2, 4, 'mid') - 2.625) < 1e-12);
});

test('extrema: the rod is level, reads slope 0, exactly at the maximum and the minimum', () => {
  const {scene} = compile({verb: 'extrema', expr: 'x^3 - 3x', x: [-2.4, 2.4], y: [-7, 7]} as any);
  const crit = (scene!.meta as any).critical;
  assert.deepEqual(crit.map((c: any) => c.kind), ['maximum', 'minimum']);
  // Find the pauses: the times the hinge sits at each critical x.
  const driver = scene!.actors[0].drivers![0] as any;
  for (const c of crit) {
    const key = driver.x.find((k: number[]) => Math.abs(k[1] - c.x) < 1e-9);
    const f = frame(scene!, key[0] + 0.3);
    const ro = f.props.find(p => p.id === 'ro-s') as any;
    assert.equal(ro.text, 'slope of the rod = 0.00', `at ${c.kind}`);
  }
});

test('secant to tangent: the slope of PQ approaches f′(a)', () => {
  const {scene} = compile({verb: 'secant_to_tangent', expr: 'x^2', at: 1, h: 2, x: [-1, 4], y: [-1, 10]} as any);
  const slope = (t: number) => Number(((frame(scene!, t).props.find(p => p.id === 'ro-m') as any).text as string).split('= ')[1]);
  assert.ok(Math.abs(slope(1) - 4) < 0.01, 'h = 2: slope (9 − 1) / 2 = 4');
  assert.ok(Math.abs(slope(scene!.duration - 0.5) - 2) < 0.03, 'h → 0: slope → 2');
});

test('the maths examples compile and pass every check', async () => {
  const {readFileSync} = await import('node:fs');
  const {check} = await import('../src/index.ts');
  for (const f of ['domain-sqrt', 'domain-reciprocal', 'extrema-cubic', 'secant', 'area', 'vectors', 'graph-vt', 'graph-boyle', 'graph-ionisation', 'graph-heating']) {
    const {scene, errors} = compile(JSON.parse(readFileSync(`examples/${f}.json`, 'utf8')));
    assert.deepEqual(errors, [], f);
    assert.deepEqual(check(scene!, {every: 3}), [], f);
  }
});

test('graph: facts are computed, readouts measured from the drawing, and data stays shaped as given', async () => {
  const {smooth, niceStep} = await import('../src/verbs/graph.ts');
  const spec = {verb: 'graph', x: {name: 't', unit: 's', range: [0, 6]}, y: {name: 'v', unit: 'm/s', range: [0, 22]},
    series: [{label: 'v', expr: '2 + 3t'}], trace: {series: 0, from: 0, to: 5, at: 1, time: 4},
    shade: {series: 0, from: 0, to: 5, unit: 'm'}, tangent: {series: 0, x: 3}};
  const {scene, errors} = compile(spec as any);
  assert.deepEqual(errors, []);
  const meta = scene!.meta as any;
  assert.equal(meta.area.value, 47.5);                                   // ∫₀⁵ (2 + 3t) dt
  assert.equal(meta.tangent.slope, 3);
  assert.ok(meta.facts.some((f: string) => f.includes('3 m/s²')));
  const ro = (id: string, t: number) => Number(((frame(scene!, t).props.find(p => p.id === id) as any).text as string).split('= ')[1].split(' ')[0]);
  assert.ok(Math.abs(ro('ro-x', 5.5) - 5) < 0.05 && Math.abs(ro('ro-y', 5.5) - 17) < 0.15, 'the tracer ends at (5, 17)');
  // Monotone smoothing never overshoots: between rising points the curve keeps rising.
  const s = smooth([[0, 0], [1, 1], [2, 1], [3, 5]]);
  for (let i = 1; i < s.length; i++) assert.ok(s[i][1] >= s[i - 1][1] - 1e-9 && s[i][1] <= 5 + 1e-9);
  assert.equal(niceStep(0, 2600), 500);
  assert.equal(niceStep(0, 6), 1);
});

test('graph: refuses specs a planner might get wrong', () => {
  const base = {verb: 'graph', x: {name: 'V', unit: 'L', range: [0, 12]}, y: {name: 'P', unit: 'atm', range: [0, 30]}};
  const err = (extra: object) => compile({...base, ...extra} as any).errors.join('; ');
  assert.match(err({series: [{label: 'a', expr: '24/x'}]}), /expr/);                                    // the variable is V, not x
  assert.match(err({series: [{label: 'a', expr: '240/V'}]}), /outside the y range/);
  assert.match(err({series: [{label: 'a', points: [[1, 5], [13, 2]]}]}), /outside the graph/);
  assert.match(err({series: [{label: 'a', points: [[4, 5], [2, 2]]}]}), /left to right/);
  assert.match(err({series: [{label: 'a', expr: '24/V'}], trace: {series: 0, from: 0.2, to: 10}}), /trace leaves/);
  assert.match(err({series: [{label: 'a', points: [[1, 5], [2, 2]]}], tangent: {series: 0, x: 1.5}}), /formula series/);
  assert.match(err({series: [{label: 'a', expr: '24/V'}], marks: [{series: 0, x: 0.5, label: 'too high'}]}), /outside the graph/);
  assert.match(err({series: [{label: 'a', expr: '24/V'}], x: {name: 'V', range: [0, 0.01], step: 0.0005}}), /rescale/);
});

test("secant_to_tangent in physics words reproduces NCERT's Table 2.1 (x = 0.08t³, centred on t = 4 s)", () => {
  const out = compile({verb: 'secant_to_tangent', quantity: 'velocity', centred: true, expr: '0.08*x^3', at: 4, h: 2,
    steps: [2, 1, 0.5, 0.1, 0.01], x: [0, 7], y: [0, 20], step: [1, 5]} as never);
  assert.deepEqual(out.errors, []);
  const facts = (out.scene!.meta as {facts: string[]}).facts.join('\n');
  for (const v of ['3.92', '3.86', '3.845', '3.8402', '3.840002']) assert.match(facts, new RegExp(`Δx/Δt = ${v.replace('.', '\\.')} m/s`));
  assert.match(facts, /instantaneous velocity is 3\.84 m\/s/);
  assert.deepEqual(check(out.scene!, {every: 3}), []);
  const texts = out.scene!.props.filter(p => p.type === 'text').map(p => (p as {text: string}).text).join(' | ');
  assert.match(texts, /x = 0\.08t³/);
  assert.doesNotMatch(texts, /f′|slope of PQ/);
});

test('physics formulas may be written in t', () => {
  const v = compile({verb: 'secant_to_tangent', quantity: 'velocity', expr: '0.08*t^3', at: 4, h: 2, x: [0, 7], y: [0, 20]} as never);
  assert.deepEqual(v.errors, []);
  assert.match((v.scene!.meta as {facts: string[]}).facts[0], /3\.84 m\/s/);
  assert.deepEqual(compile({verb: 'motion_on_line', axis: {range: [0, 20]}, formula: {expr: '0.5*t^2', t: [0, 6]}} as never).errors, []);
});
