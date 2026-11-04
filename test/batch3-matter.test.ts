// Blank beats of batch 3 (2026-11-05): keph2-01 elasticity, keph2-04 thermodynamics, keph2-05 kinetic theory. Each new
// show is checked against the book's physics and its own errors, and each beat's spec is drawn clean at full and half width.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {check, compile, frame, type Scene} from '../src/index.ts';

const made = (o: object) => { const r = compile(o as never); assert.deepEqual(r.errors, [], JSON.stringify(o)); return r.scene! as Scene; };
const errs = (o: object) => compile(o as never).errors.join(' | ');
const shown = (s: Scene, t: number) => (frame(s, t).props as any[]).filter(p => (p.opacity ?? 1) > 0.05);
const texts = (s: Scene, t: number) => shown(s, t).filter(p => p.type === 'text').map(p => p.text as string);
const prop = (s: Scene, t: number, id: string) => (frame(s, t).props as any[]).find(p => p.id === id);

// The beats' specs, as handed back for the films
export const BEATS: Record<string, object> = {
  'keph2-01 C9 S08': {verb: 'elastic', title: 'A wire under tensile pull', kind: 'tension', material: 'steel', L: 1, d: 0.001, F: 100, show: ['graph'], illustrative: true},
  'keph2-01 C2 S20': {verb: 'elastic', title: 'Restoring Forces Oppose the Fluid', kind: 'hydraulic', shape: 'cube', p: 2000000, stage: 'restoring', illustrative: true},
  'keph2-01 C2 S21': {verb: 'elastic', title: 'Shape and Size Restored', kind: 'hydraulic', shape: 'cube', p: 2000000, stage: 'removed', illustrative: true},
  'keph2-04 C8 S10': {verb: 'gas_process', title: 'Small Pressure Changes', kind: 'steps', P: 100000, P2: 160000, steps: 6, illustrative: true},
  'keph2-04 C8 S16': {verb: 'gas_process', title: 'A Dashed Teaching Convention', kind: 'sudden', mu: 1, T: 300, V1: 0.002, V2: 0.005, illustrative: true},
  'keph2-04 C13 S04': {verb: 'heat_engine', title: 'Kelvin-Planck Statement', kind: 'kelvin_planck', illustrative: true},
  'keph2-04 C15 S36': {verb: 'heat_engine', title: 'Testing the Efficiency Assumption', kind: 'carnot_theorem', illustrative: true},
  'keph2-05 C4 S26': {verb: 'kinetic_gas', title: 'Inspired Oxygen', kind: 'partial', total: 760, vapour: 47, fractions: {oxygen: 0.21}, highlight: 'oxygen', numbers: 'highlight'},
};

test('every batch 3 beat compiles and draws clean, full frame and half width, its motion done a second before the end', async () => {
  const {MIN_TEXT} = await import('../src/check.ts');
  for (const [beat, spec] of Object.entries(BEATS)) {
    const s = made(spec);
    assert.deepEqual(check(s, {every: 3}), [], beat);
    for (const width of [1920, 960]) {
      const {scene, errors} = compile({compound: true, parts: [{id: 'a', box: [0, 0, width, 1080], spec}]} as never);
      assert.deepEqual(errors, [], `${beat} at ${width}`);
      assert.deepEqual(check(scene!, {every: 3}), [], `${beat} at ${width}`);
      const part = scene!.parts![0];
      const small = part.scene.props.filter(p => p.type === 'text' && ((p as {size?: number}).size ?? 32) * part.scale < MIN_TEXT - 1e-6);
      assert.deepEqual(small.map(p => (p as {text?: string}).text), [], `${beat} at ${width}: small text`);
    }
    // nothing still moving in the last second: the frame a second before the end is the end's
    const at = (t: number) => JSON.stringify(shown(s, t).map(p => [p.id, Math.round(p.x ?? p.x1 ?? 0), Math.round(p.y ?? p.y1 ?? 0), Math.round(p.y2 ?? 0), Math.round(p.h ?? p.r ?? 0), Math.round(10 * p.opacity)]));
    assert.equal(at(s.duration - 1), at(s.duration - 0.01), `${beat}: still moving in its last second`);
    if ((spec as {illustrative?: boolean}).illustrative)
      for (const t of texts(s, s.duration - 0.01)) assert.ok(t === (spec as {title: string}).title || !/\d/.test(t.replace(/[A-Z][₀-₉]*/g, '')), `${beat}: '${t}' shows a number`);
  }
});

test('elastic tension graph: the pull rises steadily from zero with the stretch, ΔL = FL/AY, and no area or ½ F l yet', () => {
  const spec = {verb: 'elastic', kind: 'tension', material: 'steel', L: 1, d: 0.001, F: 100, show: ['graph']};
  const s = made(spec), l = 100 * 1 / (Math.PI * 0.0005 ** 2 * 2e11);
  assert.ok(Math.abs((s.meta as any).extension - l) < 1e-9 && Math.abs(l - 6.366e-4) < 1e-6);
  // halfway through the stretch: the arrow and the traced point are both at half their final reach
  const len = (t: number) => { const a = prop(s, t, 'F'); return a.y2 - a.y1; }, x = (t: number) => prop(s, t, 'fpt').x;
  const full = len(3.6), x0 = x(1.4), x1 = x(3.6);
  assert.ok(Math.abs(len(2.5) / full - 0.5) < 0.03, `arrow ${len(2.5) / full}`);
  assert.ok(Math.abs((x(2.5) - x0) / (x1 - x0) - 0.5) < 0.01);
  assert.ok(Math.abs(len(1.95) / full - 0.25) < 0.03);              // steadily: linear in time
  const said = texts(s, 6).join(' ');
  assert.match(said, /rises steadily from 0 to F = 100 N/);
  assert.doesNotMatch(said, /½|area|stress|Young/);
  assert.ok(!(s.props as any[]).some(p => /area|shade|tri/.test(p.id)));
  assert.match(errs({...spec, show: ['graph', 'lateral']}), /'graph' and 'lateral'/);
  assert.match(errs({...spec, compress: true}), /'graph' draws a hanging wire/);
  assert.match(errs({verb: 'elastic', kind: 'tension', wires: [{material: 'steel', L: 1, d: 0.001, load: 5}], show: ['graph']}), /'graph' .* one wire/);
  assert.match(errs({...spec, kind: 'shear', A: 0.01, show: ['graph']}), /a shear scene shows nothing extra/);
});

test('elastic hydraulic stages each show only their own step', () => {
  const base = {verb: 'elastic', kind: 'hydraulic', shape: 'cube', p: 2e6, illustrative: true};
  const restoring = made({...base, stage: 'restoring'}), end = restoring.duration - 0.01;
  const said = texts(restoring, end).join(' ');
  assert.match(said, /restoring forces arise, equal and opposite/); assert.match(said, /per unit area = the hydraulic pressure/);
  assert.doesNotMatch(said, /strain|Bulk|modulus|compressib|ΔV/);
  assert.ok(!texts(restoring, end).includes('V'));
  // equal and opposite: every restoring arrow as long as a push and pointing the other way
  const arrows = (pre: string) => shown(restoring, end).filter(p => p.id.startsWith(pre)).map(p => [p.x2 - p.x1, p.y2 - p.y1]);
  const push = arrows('push'), back = arrows('restore');
  assert.equal(push.length, 12); assert.equal(back.length, 12);
  push.forEach(([dx, dy], i) => { assert.ok(Math.abs(dx + back[i][0]) < 1e-6 && Math.abs(dy + back[i][1]) < 1e-6, `arrow ${i}`); });
  // removed: out of the fluid, back to the original outline
  const removed = made({...base, stage: 'removed'}), was = prop(removed, 0, 'was');
  const body = (t: number) => prop(removed, t, 'body');
  assert.ok(body(0.5).w < was.w - 1);
  assert.ok(Math.abs(body(removed.duration).w - was.w) < 1e-6 && Math.abs(body(removed.duration).x - was.x) < 1e-6);
  assert.ok(!shown(removed, removed.duration - 0.01).some(p => p.id === 'fluid' || p.id.startsWith('push')));
  assert.match(texts(removed, removed.duration).join(' '), /regains its original shape and size/);
  assert.doesNotMatch(texts(removed, removed.duration).join(' '), /strain|modulus|restoring/);
  // squeeze and strain: no B
  assert.doesNotMatch(texts(made({...base, stage: 'squeeze'}), 6).join(' '), /strain|modulus/);
  const strain = texts(made({...base, stage: 'strain'}), 6).join(' ');
  assert.match(strain, /volume strain/); assert.doesNotMatch(strain, /Bulk|modulus|compressib/);
  // a stage given with a numeric scene: the volume strain p/B for water at 1 atm (B = 2.2 GPa)
  assert.ok(Math.abs((made({verb: 'elastic', kind: 'hydraulic', material: 'water', p: 1.013e5, stage: 'strain'}).meta as any).strain - 1.013e5 / 2.2e9) < 1e-12);
  assert.match(errs({...base, stage: 'later'}), /stage is squeeze, restoring, removed, strain/);
  assert.match(errs({verb: 'elastic', kind: 'shear', L: 1, A: 0.01, F: 10, G: 8e10, stage: 'squeeze'}), /stage goes with kind hydraulic/);
  assert.match(errs({...base, stage: 'restoring', compare: ['water', 'steel']}), /compare goes with the full hydraulic scene/);
  assert.match(errs({...base, stage: 'restoring', V: 0.001}), /V \(for ΔV\) is shown at stage strain only/);
  // the full scene is unchanged: it still names B
  assert.match(texts(made(base), 8).join(' '), /Bulk modulus/);
});

test('gas_process steps: a staircase of small pressure steps, each equalised, V = μRT/P', () => {
  const s = made({verb: 'gas_process', kind: 'steps', mu: 1, P: 1e5, P2: 1.6e5, steps: 6, T: 300});
  const m = s.meta as any;
  assert.equal(m.steps, 6);
  assert.ok(Math.abs(m.V1 - 8.31 * 300 / 1e5) < 1e-12 && Math.abs(m.V2 - 8.31 * 300 / 1.6e5) < 1e-12);
  assert.equal((s.props as any[]).filter(p => /^ext\d$/.test(p.id)).length, 6);
  assert.equal((s.props as any[]).filter(p => /^grain\d$/.test(p.id)).length, 6);
  // a weight goes on at each step: after the third step's start, three are on the piston
  assert.equal(shown(s, 0.9 + 2 * 1.0 + 0.5).filter(p => /^grain/.test(p.id)).length, 3);
  // the piston settles within each step and holds until the next
  const piston = (t: number) => prop(s, t, 'piston').y;
  assert.ok(Math.abs(piston(0.9 + 0.65) - piston(0.9 + 0.95)) < 1e-6);
  assert.ok(piston(0.9 + 1.6) > piston(0.9 + 0.95));             // compressed: the piston moves down (larger y)
  const said = texts(s, s.duration).join(' ');
  assert.match(said, /very small amount/); assert.match(said, /equalise/); assert.match(said, /P′, T′/);
  assert.match(errs({verb: 'gas_process', kind: 'steps', P: 1e5, P2: 1e5}), /differs from P/);
  assert.match(errs({verb: 'gas_process', kind: 'steps', P: 1e5}), /steps needs P .* and P2/);
  assert.match(errs({verb: 'gas_process', kind: 'steps', P: 1e5, P2: 2e5, steps: 20}), /3 to 10/);
  assert.match(errs({verb: 'gas_process', kind: 'steps', P: 1e5, P2: 2e5, V1: 0.01}), /leave V1 out/);
  assert.match(errs({verb: 'gas_process', kind: 'isothermal', P2: 2e5}), /P2 and steps belong to kind steps/);
});

test('gas_process sudden: the dashed line joins two states on one isotherm, and is called a convention', () => {
  const s = made({verb: 'gas_process', kind: 'sudden', mu: 1, T: 300, V1: 0.002, V2: 0.005});
  const m = s.meta as any;
  assert.ok(Math.abs(m.P2 / m.P1 - 0.002 / 0.005) < 1e-12);       // a free expansion ends at its starting temperature
  const dashed = (s.props as any[]).find(p => p.id === 'dashed');
  assert.ok(dashed.style.dash && dashed.points.length === 2);
  const said = texts(s, s.duration).join(' ');
  assert.match(said, /teaching convention, not a path of equilibrium states/); assert.match(said, /cannot be plotted as points/);
  assert.equal(texts(s, s.duration).filter(t => t === '?').length, 3);
  assert.match(errs({verb: 'gas_process', kind: 'sudden', V1: 0.005, V2: 0.002}), /sudden is an expansion/);
  assert.match(errs({verb: 'gas_process', kind: 'sudden', T2: 200}), /leave T2 out/);
  assert.match(errs({verb: 'gas_process', kind: 'sudden', V1: 0.002, V2: 0.005, window: {V: 0.004, P: 2e6}}), /leaves the window/);
});

test('heat_engine kelvin_planck: one reservoir, all of Q to W, no cold reservoir, crossed', () => {
  const s = made({verb: 'heat_engine', kind: 'kelvin_planck', Q1: 500, T1: 600});
  const ids = (s.props as any[]).map(p => p.id);
  assert.ok(!ids.includes('cold') && !ids.includes('q2'));
  assert.ok(ids.includes('x1') && ids.includes('x2'));
  assert.ok(!shown(s, 2).some(p => p.id === 'x1'));                // crossed only once the statement is read
  const q = (s.props as any[]).find(p => p.id === 'q1'), w = (s.props as any[]).find(p => p.id === 'w');
  assert.equal(q.style.width, w.style.width);                     // all of the heat becomes work
  assert.match(texts(s, s.duration).join(' '), /W = Q = 500 J/);
  assert.match(texts(s, s.duration).join(' '), /reservoir, 600 K/);
  assert.match(errs({verb: 'heat_engine', kind: 'kelvin_planck', Q2: 10}), /leave Q2 out/);
});

test("heat_engine carnot_theorem: the coupled pair nets W_I − W_R from the cold reservoir (Fig. 11.10)", () => {
  const s = made({verb: 'heat_engine', kind: 'carnot_theorem', T1: 500, T2: 300, eta_I: 0.55, Q1: 1000});
  const m = s.meta as any;
  assert.ok(Math.abs(m.etaR - 0.4) < 1e-12);
  assert.ok(Math.abs(m.WI - 550) < 1e-9 && Math.abs(m.WR - 400) < 1e-9 && Math.abs(m.net - 150) < 1e-9);
  // the hot reservoir: what I takes, R returns
  const band = (id: string) => (s.props as any[]).find(p => p.id === id).style.width;
  assert.equal(band('q1I'), band('q1R'));
  // cold: I rejects Q₁ − W_I, R takes Q₁ − W_R; the difference is the net work out
  assert.ok(Math.abs((band('q2R') - band('q2I')) - band('wnet')) < 1e-9);
  assert.ok(!shown(s, 5).some(p => p.id === 'pair') && shown(s, s.duration).some(p => p.id === 'pair'));
  assert.match(texts(s, s.duration).join(' '), /contradicts the Kelvin-Planck statement/);
  assert.match(errs({verb: 'heat_engine', kind: 'carnot_theorem', T1: 500, T2: 300, eta_I: 0.3}), /eta_I above eta_R/);
  assert.match(errs({verb: 'heat_engine', kind: 'carnot_theorem', T1: 500, T2: 300, eta_R: 0.3}), /eta_R is 1 − T2\/T1/);
  assert.match(errs({verb: 'heat_engine', kind: 'carnot_theorem', eta_I: 1.2}), /eta_I is an efficiency/);
  assert.match(errs({verb: 'heat_engine', kind: 'engine', Q1: 100, W: 40, eta_I: 0.5}), /belong to kind carnot_theorem/);
});

test("kinetic_gas partial: inspired oxygen, 0.21 × (760 − 47) = 149.7 mmHg, the only number on screen", () => {
  const s = made(BEATS['keph2-05 C4 S26']);
  assert.ok(Math.abs((s.meta as any).partial.oxygen - 0.21 * (760 - 47)) < 1e-9);
  assert.ok(Math.abs((s.meta as any).partial.oxygen - 149.73) < 1e-9);
  const said = texts(s, s.duration).join(' ');
  assert.match(said, /oxygen, ≈ 150 mmHg/);
  assert.doesNotMatch(said, /760|47|713|563|21/);
  assert.ok((s.meta as any).facts.some((f: string) => /water vapour 47 mmHg/.test(f)));
  // every number when asked: the sum on the panel
  assert.match(texts(made({...BEATS['keph2-05 C4 S26'], numbers: 'all'}), 5).join(' '), /p = 0\.21 × \(760 − 47\) ≈ 150 mmHg/);
  // the bar to one scale: oxygen's share of the whole height is 149.7 / 760
  const bar = (s.props as any[]).find(p => p.id === 'frame'), o2 = prop(s, s.duration, 'gas0');
  assert.ok(Math.abs(o2.h / bar.h - 149.73 / 760) < 1e-9);
  const k = {verb: 'kinetic_gas', kind: 'partial'};
  assert.match(errs({...k, fractions: {oxygen: 0.7, nitrogen: 0.6}}), /add up to more than 1/);
  assert.match(errs({...k, highlight: 'argon'}), /highlight is one of the gases/);
  assert.match(errs({...k, vapour: 800}), /below total/);
  assert.match(errs({...k, unit: 'torr'}), /unit is mmHg/);
  assert.match(errs({verb: 'kinetic_gas', kind: 'mixture', vapour: 47}), /vapour belongs to kind partial/);
});
