// Batch 4 sound verbs (2026-11-05, ICSE Class 10 Physics, Selina Ch. 7 Sound, icph1-07): sound (echo, sonar, natural,
// damped and forced vibrations, resonance with Barton's pendulums) and wave's compare (loudness, pitch, quality),
// checked against the book's own worked examples and exercises.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {check, compile, frame, type Scene} from '../src/index.ts';
import {barton, echoSolve, vibration, type SoundSpec} from '../src/verbs/sound.ts';

const made = (o: object) => { const r = compile(o as never); assert.deepEqual(r.errors, [], JSON.stringify(o)); return r.scene! as Scene; };
const texts = (s: Scene, t: number) => (frame(s, t).props as any[]).filter(p => p.type === 'text' && (p.opacity ?? 1) > 0.05).map(p => p.text as string);
const near = (a: number, b: number, tol = 1e-3) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} vs ${b}`);
const errs = (o: object) => compile(o as never).errors.join(' ');
const facts = (o: object) => made(o).meta!.facts as string[];
const lastKey = (s: Scene, skip: RegExp = /^$/) => Math.max(...(s.props as any[]).filter(p => !skip.test(p.id)).flatMap(p => Object.values(p.keys ?? {}).flat().map((k: any) => k[0])));
const solve = (o: Partial<SoundSpec>) => echoSolve({verb: 'sound', kind: 'echo', ...o} as SoundSpec);

test("echo: the least distance is v × 0.1 / 2: 17 m in air (340 m/s), 17.5 m at 350 m/s, 70 m in sea water (1400 m/s)", () => {
  near(solve({minimum: true}).d, 17);
  near(solve({minimum: true, v: 350}).d, 17.5);                    // Exercise 7.1 Q2
  near(solve({minimum: true, medium: 'water'}).d, 70);             // B20, Exercise 7.1 Q3
  const f = facts({verb: 'sound', kind: 'echo', minimum: true});
  assert.ok(f.includes('distance d = 17 m') && f.includes('echo time t = 0.1 s') && f.includes('the echo is heard distinctly'), f.join('; '));
  const s = made({verb: 'sound', kind: 'echo', minimum: true});
  const end = texts(s, s.duration - 0.05).join(' | ');
  assert.match(end, /d = vt \/ 2 = 340 × 0\.1 \/ 2 = 17 m/); assert.match(end, /just as the first sound dies away/);
  assert.deepEqual(check(s, {every: 3}), []);
});

test("echo: any two of d, t, v give the third (the book's Examples 3, 5, 7 and Exercise 7.1)", () => {
  near(solve({t: 1, v: 350}).d, 175);                               // Example 3: a hill 175 m away
  near(solve({d: 85, t: 0.5}).v, 340);                              // Example 5: claps coinciding with echoes
  near(solve({d: 495, t: 3}).v, 330);                               // Example 7 (a)
  near(solve({d: 25, v: 350}).t, 0.142857, 1e-4);                   // Exercise 7.1 Q4: 0.143 s, a distinct echo
  near(solve({d: 48, v: 320}).t, 0.3);                              // Exercise 7.1 Q6: 0.30 s
  near(solve({t: 8 / 5, v: 340}).d, 272);                           // Exercise 7.1 Q8: 8 swings of a 5 Hz pendulum
  const q4 = facts({verb: 'sound', kind: 'echo', d: 25, v: 350});
  assert.ok(q4.includes('echo time t = 0.143 s') && q4.includes('the echo is heard distinctly'), q4.join('; '));
  const ex5 = facts({verb: 'sound', kind: 'echo', d: 85, t: 0.5});
  assert.ok(ex5.includes('v = 2d / t = 340 m/s'), ex5.join('; '));
  // Exercise 7(A) Q7: 12 m from a cliff, no clear echo (it comes back in 0.07 s, within the persistence of hearing)
  const close = made({verb: 'sound', kind: 'echo', d: 12, reflector: 'cliff'});
  assert.ok((close.meta!.facts as string[]).some(f => /no distinct echo/.test(f)));
  assert.match(texts(close, close.duration - 0.05).join(' | '), /they merge, no distinct echo/);
  assert.deepEqual(check(close, {every: 3}), []);
});

test('echo: the pulse goes out and back and the echo is marked when it returns; motion ends a second before the end', () => {
  const s = made({verb: 'sound', kind: 'echo', d: 34});
  const tEcho = (s.props as any[]).find(p => p.id === 'techo').show[0];
  assert.ok(!texts(s, tEcho - 0.2).some(t => /echo heard/.test(t)) && texts(s, tEcho + 0.3).some(t => /echo heard at 0\.2 s/.test(t)));
  // the first bar out reaches the reflector half way; the first bar back is home at the echo
  const out0 = (s.props as any[]).find(p => p.id === 'out0'), back0 = (s.props as any[]).find(p => p.id === 'back0');
  assert.ok(Math.abs(back0.show[1] - tEcho) < 1e-9 && out0.show[1] === back0.show[0]);
  assert.ok(s.duration - lastKey(s) >= 1, `${s.duration} vs ${lastKey(s)}`);
});

test("sonar: depth = vt / 2 (Example 9: 1450 m; Exercise 7.1 Q7: 2.9 km; Q11: 1050 m)", () => {
  assert.ok(facts({verb: 'sound', kind: 'sonar', v: 1450, t: 2}).includes('depth d = 1450 m'));
  assert.ok(facts({verb: 'sound', kind: 'sonar', v: 1450, t: 4, target: 'submarine'}).includes('depth d = 2900 m'));
  assert.ok(facts({verb: 'sound', kind: 'sonar', v: 1400, t: 1.5}).includes('depth d = 1050 m'));
  // the default speed in sea water is the book's 1400 m/s
  near(echoSolve({verb: 'sound', kind: 'sonar', t: 1} as SoundSpec).d, 700);
  for (const target of ['sea_bed', 'sunken_ship', 'submarine', 'fish']) {
    const s = made({verb: 'sound', kind: 'sonar', v: 1450, t: 2, target});
    assert.deepEqual(check(s, {every: 3}), [], target);
    assert.ok(s.duration - lastKey(s) >= 1);
  }
  const shown = texts(made({verb: 'sound', kind: 'sonar', v: 1450, t: 2}), 20).join(' | ');
  assert.match(shown, /d = vt \/ 2 = 1450 × 2 \/ 2 = 1450 m/);
});

test('echo and sonar illustrative: words stay, no digits anywhere but the title', () => {
  for (const o of [{kind: 'echo', minimum: true}, {kind: 'echo', illustrative: true}, {kind: 'sonar', illustrative: true, target: 'fish'}]) {
    const s = made({verb: 'sound', title: 'Echo 1', ...o, illustrative: true});
    const shown = texts(s, s.duration - 0.05).filter(t => t !== 'Echo 1');
    assert.ok(shown.some(t => /echo|pulse/.test(t)) && shown.includes('d'), shown.join(' | '));
    assert.ok(!shown.some(t => /\d/.test(t)), shown.join(' | '));
    assert.deepEqual(s.meta!.facts, []);
  }
});

test('vibrations: natural keeps its amplitude, damped dies away, forced settles at the driver\'s frequency', () => {
  const f = 0.75, T = 1 / f;
  const nat = vibration('natural', f, 1.6), dmp = vibration('damped', f, 1.6), frc = vibration('forced', f, 1.6);
  near(nat.x(5 * T), 1);
  assert.ok(Math.abs(dmp.x(5 * T)) < 0.05 && dmp.x(T) < 1 && dmp.x(T) > 0.3);
  // late on, the forced body crosses zero at the driver's rate (1.6 f), not its own
  const crossings = (g: (t: number) => number, a: number, b: number) => { let c = 0; for (let t = a; t < b; t += 1e-3) if (Math.sign(g(t)) !== Math.sign(g(t + 1e-3))) c++; return c; };
  const span = 8 * T, rate = crossings(frc.x, 12 * T, 12 * T + span) / 2 / span;
  near(rate, 1.6 * f, 0.05);
  assert.ok(frc.amp < 0.35 && frc.amp > 0.1, `small amplitude ${frc.amp}`);
  // driven at its natural frequency: resonance, the largest amplitude
  const res = vibration('forced', f, 1);
  for (const r of [0.5, 0.8, 1.25, 2]) assert.ok(vibration('forced', f, r).amp < res.amp, `${r}`);
  // the scene: three rows, the pen done a second and more before the end, illustrative without digits
  const s = made({verb: 'sound', kind: 'vibrations', title: 'Three kinds of vibration', illustrative: true});
  assert.deepEqual(check(s, {every: 3}), []);
  const penEnd = Math.max(...(s.props as any[]).filter(p => /^tr\d/.test(p.id)).map(p => p.keys.draw.at(-1)[0]));
  assert.ok(s.duration - penEnd >= 1, `${s.duration} vs ${penEnd}`);
  const shown = texts(s, s.duration - 0.05);
  for (const w of [/Natural \(free\)/, /Damped vibrations/, /Forced vibrations/, /amplitude dies down/]) assert.ok(shown.some(t => w.test(t)), String(w));
  assert.ok(!shown.some(t => /\d/.test(t)), shown.join(' | '));
  // one or two rows; numbers when f0 and driver are given
  made({verb: 'sound', kind: 'vibrations', types: ['damped']});
  const two = facts({verb: 'sound', kind: 'vibrations', types: ['natural', 'forced'], f0: 0.5, driver: 0.8});
  assert.ok(two.includes('natural frequency 0.5 Hz') && two.some(f => /driver frequency 0.8 Hz/.test(f)), two.join('; '));
  const r = made({verb: 'sound', kind: 'vibrations', types: ['forced'], f0: 256, driver: 256});
  assert.ok(texts(r, r.duration - 0.05).some(t => /resonance/.test(t)));
});

test("resonance, Barton's pendulums: B (A's length) takes up A's swing; C and D only sway a little", () => {
  const L = 1, sim = barton([L, 0.5 * L, L, 1.8 * L], 9.8, 0.18, undefined, 30);
  const TA = 2 * Math.PI * Math.sqrt(L / 9.8);
  const amp = (i: number, t0: number, t1: number) => Math.max(...sim.filter(q => q.t >= t0 && q.t <= t1).map(q => Math.abs(q.th[i]))) / 0.18;
  let bBest = 0, aThen = 1;
  for (let t = 0; t < 10 * TA; t += TA) { const b = amp(2, t, t + TA); if (b > bBest) { bBest = b; aThen = amp(0, t, t + TA); } }
  assert.ok(bBest > 0.95 && aThen < 0.3, `B ${bBest}, A then ${aThen}`);
  assert.ok(amp(1, 0, 10 * TA) < 0.3 && amp(3, 0, 10 * TA) < 0.3, 'C and D small');
  const s = made({verb: 'sound', kind: 'resonance'});
  const f = s.meta!.facts as string[];
  assert.ok(f.includes('A and B: length 1 m, natural frequency 0.5 Hz'), f.join('; '));   // B77: a 1.0 m pendulum, 0.5 Hz
  assert.deepEqual(check(s, {every: 3}), []);
  const il = made({verb: 'sound', kind: 'resonance', illustrative: true, examples: true, title: 'Resonance'});
  const shown = texts(il, il.duration - 0.05);
  assert.ok(shown.some(t => /This is resonance/.test(t)) && shown.some(t => /soldiers breaking step/.test(t)) && ['A', 'B', 'C', 'D', 'P', 'Q'].every(n => shown.includes(n)));
  assert.ok(!shown.some(t => /\d/.test(t)), shown.join(' | '));
  // B is at its widest swing in the last seconds: its bob is well off its rest line then
  const bob = (t: number) => (frame(il, t).props as any[]).find(p => p.id === 'bobB');
  const xs = Array.from({length: 40}, (_, i) => bob(il.duration - 2.4 + i * 0.05).x), rest = (il.meta!.anchors as any).B[0];
  assert.ok(Math.max(...xs.map(x => Math.abs(x - rest))) > 40, 'B swings wide at the end');
});

test("wave compare: loudness (amplitude), pitch (frequency), quality (wave form), drawn and labelled; book's numbers", () => {
  const loud = made({verb: 'wave', show: 'compare', compare: 'loudness', amplitudes: [8, 14]});
  assert.ok((loud.meta!.facts as string[]).includes('loudness ratio (14 / 8)² = 3.06'));   // the book's ≈ 3 : 1
  const pitch = made({verb: 'wave', show: 'compare', compare: 'pitch', frequencies: [256, 512]});
  const shown = texts(pitch, pitch.duration - 0.05).join(' | ');
  assert.match(shown, /lower pitch \(grave\): lower frequency, 256 Hz/); assert.match(shown, /higher pitch \(shrill\): higher frequency, 512 Hz/);
  // the 512 Hz trace has twice the waves: its expression's wave number is twice the other's
  const k = (s: Scene, id: string) => Number(/sin\(([\d.]+) \* x\)/.exec((s.props as any[]).find(p => p.id === id).expr)![1]);
  near(k(pitch, 'w1') / k(pitch, 'w0'), 2);
  for (const compare of ['loudness', 'pitch', 'quality']) {
    const s = made({verb: 'wave', show: 'compare', compare, illustrative: true, title: 'Sound'});
    assert.deepEqual(check(s, {every: 3}), [], compare);
    const words = texts(s, s.duration - 0.05).filter(t => t !== 'Sound');
    assert.ok(!words.some(t => /\d/.test(t)), words.join(' | '));
    assert.ok(words.some(t => ({loudness: /louder: larger amplitude/, pitch: /higher pitch \(shrill\)/, quality: /different quality/})[compare]!.test(t)), words.join(' | '));
    assert.ok(s.duration - lastKey(s) >= 1);
  }
});

test('quality wave forms share one peak and one period', async () => {
  const s = made({verb: 'wave', show: 'compare', compare: 'quality', waveforms: ['sine', 'triangle', 'piano']});
  const {evaluate, parse} = await import('../src/expr.ts');
  const peaks = [0, 1, 2].map(i => { const p = (s.props as any[]).find(q => q.id === `w${i}`), n = parse(p.expr), c = 1 - (i + 0.5) / 3;
    let m = 0; for (let x = 0; x <= 1; x += 1e-4) m = Math.max(m, Math.abs(evaluate(n, {x}) - c)); return m; });
  near(peaks[1], peaks[0], 1e-3); near(peaks[2], peaks[0], 1e-3);
});

test('sound and wave compare errors name the field and the fix', () => {
  assert.match(errs({verb: 'sound', kind: 'thunder'}), /kind is one of echo, sonar, vibrations, resonance/);
  assert.match(errs({verb: 'sound', kind: 'echo'}), /give d \(m\) or t \(s\).*minimum: true/);
  assert.match(errs({verb: 'sound', kind: 'echo', d: 17, t: 1, v: 340}), /2d \/ t = 34 m\/s disagrees with v = 340/);
  assert.match(errs({verb: 'sound', kind: 'echo', minimum: true, d: 17}), /minimum computes d .* leave out d and t/);
  assert.match(errs({verb: 'sound', kind: 'echo', v: 3e8, t: 2e-5}), /radar's radio waves .* are not sound/);
  assert.match(errs({verb: 'sound', kind: 'echo', d: 20, target: 'fish'}), /target is for kind sonar/);
  assert.match(errs({verb: 'sound', kind: 'sonar', t: 2, minimum: true}), /minimum is for kind echo/);
  assert.match(errs({verb: 'sound', kind: 'echo', d: -3}), /d is a number above 0/);
  assert.match(errs({verb: 'sound', kind: 'vibrations', types: ['natural', 'wobbly']}), /types is 1 to 3 of natural, damped, forced/);
  assert.match(errs({verb: 'sound', kind: 'vibrations', types: ['natural'], driver: 2, f0: 1}), /add 'forced' to types/);
  assert.match(errs({verb: 'sound', kind: 'vibrations', f0: 1, driver: 9}), /driver is 0.25 to 4 times f0/);
  assert.match(errs({verb: 'sound', kind: 'vibrations', driver: 9}), /driver needs f0/);
  assert.match(errs({verb: 'sound', kind: 'resonance', short: 1.2}), /short is pendulum C, shorter/);
  assert.match(errs({verb: 'sound', kind: 'resonance', long: 5}), /long is pendulum D, longer .* 1.15 to 2 times L/);
  assert.match(errs({verb: 'sound', kind: 'resonance', d: 5}), /d is for kind echo or sonar/);
  assert.match(errs({verb: 'wave', show: 'compare'}), /compare is loudness, pitch, quality/);
  assert.match(errs({verb: 'wave', show: 'compare', compare: 'pitch'}), /compare pitch needs frequencies/);
  assert.match(errs({verb: 'wave', show: 'compare', compare: 'pitch', frequencies: [256, 256]}), /frequencies must differ/);
  assert.match(errs({verb: 'wave', show: 'compare', compare: 'pitch', frequencies: [100, 1000]}), /at most 6 times the smallest/);
  assert.match(errs({verb: 'wave', show: 'compare', compare: 'loudness', amplitudes: [8, 14], frequencies: [256, 512]}), /varies only amplitudes; leave out frequencies/);
  assert.match(errs({verb: 'wave', show: 'compare', compare: 'quality', waveforms: ['sine', 'kazoo']}), /waveforms is 2 or 3 different ones of sine/);
  assert.match(errs({verb: 'wave', show: 'travelling', compare: 'pitch', wavelength: 1, frequency: 2}), /compare is for show compare/);
});
