// Batch 4 (2026-11-05): ICSE Class 10 Electro-magnetism (icph1-10) and Household Circuits (icph1-09): em_device's
// electromagnet, bell, d.c. motor and a.c. generator, and domestic_circuit's staircase wiring, ring main and MCB.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {check, compile, frame, type Scene} from '../src/index.ts';
import {bellRun, electromagnetNorth, generatorEmf, motorCurrent, motorRun, pinsLifted, sideEmf} from '../src/verbs/em-device.ts';
import {ringShares, staircaseLamp} from '../src/verbs/domestic.ts';

const made = (o: object) => { const r = compile(o as never); assert.deepEqual(r.errors, [], JSON.stringify(o)); return r.scene! as Scene; };
const texts = (s: Scene, t: number) => (frame(s, t).props as any[]).filter(p => p.type === 'text' && (p.opacity ?? 1) > 0.05).map(p => p.text as string);
const errs = (o: object) => compile(o as never).errors.join(' ');
const near = (a: number, b: number, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);
const RAD = Math.PI / 180;

test('electromagnet: clock rule poles, and the pins lifted follow nI', () => {
  assert.equal(electromagnetNorth(), 'left'); assert.equal(electromagnetNorth(true), 'right');
  assert.equal(pinsLifted(100, 50, 3), 6); assert.equal(pinsLifted(25, 50, 3), 2);
  const s = made({verb: 'em_device', kind: 'electromagnet', then: {turns: 100}});
  const hanging = (t: number) => (frame(s, t).props as any[]).filter(p => /^pin\d/.test(p.id) && Math.abs(p.x2 - p.x1) < Math.abs(p.y2 - p.y1)).length;
  assert.equal(hanging(3), 3); assert.equal(hanging(5.5), 0); assert.equal(hanging(8), 6);   // on, off (dropped), on with twice the turns
  assert.ok(texts(s, 3).includes('N') && texts(s, 3).includes('anticlockwise'));
  assert.ok((s.meta!.facts as string[]).some(f => /2 times as strong/.test(f)));
  const last = Math.max(...s.props.flatMap(p => Object.values(p.keys ?? {}).flatMap(ks => ks.map(q => q[0]))));
  assert.ok(last <= s.duration - 1, `motion ends ${last}, scene ${s.duration}`);
});

test('bell: it makes and breaks its own circuit, striking again and again while the push is held', () => {
  const {samples, strikes, release} = bellRun(5);
  assert.equal(strikes.length, 5);
  const gaps = strikes.slice(1).map((t, i) => t - strikes[i]);
  assert.ok(Math.max(...gaps) - Math.min(...gaps) < 0.1 * Math.min(...gaps), `regular strikes ${gaps}`);
  for (const q of samples) if (q.on) assert.ok(q.x < 0.25 && q.t >= 1 && q.t < release, `current only with the strip on the screw: ${JSON.stringify(q)}`);
  for (let i = 1; i < strikes.length; i++) {   // between two strikes the circuit is broken, then made again
    const between = samples.filter(q => q.t > strikes[i - 1] && q.t < strikes[i]);
    assert.ok(between.some(q => !q.on) && between.some(q => q.on));
  }
  assert.ok(samples[samples.length - 1].x < 0.01, 'back at rest on the screw after the push is released');
  const s = made({verb: 'em_device', kind: 'bell', rings: 3});
  assert.ok(texts(s, 0.5).includes('contact screw') && texts(s, 0.5).includes('gong') && texts(s, 0.5).includes('soft-iron armature'));
});

test('d.c. motor: the split ring reverses the current as the coil passes the vertical; it turns one way', () => {
  assert.equal(motorCurrent(80 * RAD), 1); assert.equal(motorCurrent(100 * RAD), -1);
  assert.equal(motorCurrent(90 * RAD), 0);                                   // brushes on the gaps
  assert.equal(motorCurrent(260 * RAD), -1); assert.equal(motorCurrent(280 * RAD), 1);
  assert.equal(motorCurrent(100 * RAD, false), 1);                           // slip rings never reverse it
  // the couple s cos φ never turns it back with the split ring
  for (let d = 0; d < 360; d += 5) assert.ok(motorCurrent(d * RAD) * Math.cos(d * RAD) >= 0, `couple at ${d}°`);
  const run = motorRun({tOn: 0.8, T: 12}), late = run.filter(q => q.t > 2);
  assert.ok(late.every(q => q.w > 0), 'anticlockwise all the way'); assert.ok(run[run.length - 1].phi > 4 * Math.PI, 'two turns and more');
  const back = motorRun({tOn: 0.8, T: 12, reverse: true});
  assert.ok(back[back.length - 1].phi < -4 * Math.PI, 'reversed: the other way');
  const slip = motorRun({tOn: 0.8, T: 30, commutator: false});
  near(slip[slip.length - 1].phi, Math.PI / 2, 0.05);                        // settles vertical
  const stuck = motorRun({tOn: 0.8, T: 5, start: 90});
  assert.ok(stuck.every(q => q.phi === Math.PI / 2), 'vertical at the start: no couple, it cannot start');
  const s = made({verb: 'em_device', kind: 'dc_motor', B: 0.2, A: 0.01, current: 2, turns: 50});
  assert.ok((s.meta!.facts as string[]).some(f => /nBIA = 50 × 0.2 T × 2 A × 0.01 m² = 0.2 N m/.test(f)), (s.meta!.facts as string[]).join('; '));
  // the force arrows: the side nearer S (right) is pushed up, nearer N down, whenever current flows
  for (const t of [2, 3.5, 5, 7, 9]) for (const p of frame(s, t).props as any[]) if (p.type === 'arrow' && p.style?.stroke === 'good' && (p.opacity ?? 1) > 0.5) {
    const right = p.x1 > (s.meta!.anchors as Record<string, number[]>).coil[0];
    assert.ok(right ? p.y2 < p.y1 : p.y2 > p.y1, `force at t = ${t}`);
  }
  assert.ok(texts(s, 6).some(t => /reverses the current in the coil every half turn/.test(t)));
});

test('a.c. generator: ε zero with the coil across the field, largest along it, reversing each half turn', () => {
  near(generatorEmf(0), 0); near(generatorEmf(90), 1); near(generatorEmf(180), 0, 1e-12); near(generatorEmf(270), -1);
  // side AB from v × B: none when the coil is across the field (AB moving along B), largest along it
  assert.equal(sideEmf(Math.PI / 2), 0);
  assert.equal(sideEmf(Math.PI), 1);                 // AB on the N side moving down: current toward the viewer (right-hand rule)
  assert.equal(sideEmf(0), -1);                      // half a turn later it has reversed
  const s = made({verb: 'em_device', kind: 'ac_generator', B: 0.1, A: 0.02, turns: 100, nu: 50});
  const read = (t: number) => Number(String((frame(s, t).props as any[]).find(p => p.id === 'emf-read').text).match(/(−?\d+)/)![1].replace('−', '-'));
  assert.equal(read(1 + 1), 63);                     // θ = 90°: ε₀ = NBAω = 100 × 0.1 × 0.02 × 2π50 = 62.8 V
  assert.equal(read(1 + 2), 0); assert.equal(read(1 + 3), -63);
  assert.ok((s.meta!.facts as string[]).some(f => /62.8 V/.test(f)) && (s.meta!.facts as string[]).some(f => /reverses 100 times a second/.test(f)));
  assert.ok(s.duration - (1 + 2 * 4) >= 1, 'the coil stops a second and more before the end');
});

test('em_device: every kind compiles and checks, full and half width; illustrative keeps words, drops numbers', () => {
  for (const kind of ['electromagnet', 'bell', 'dc_motor', 'ac_generator']) for (const width of [1920, 960]) {
    const s = made({verb: 'em_device', kind, width, ...(kind === 'ac_generator' ? {B: 0.1, A: 0.02} : {})});
    assert.deepEqual(check(s, {every: 3}), [], `${kind} ${width}`);
    const ill = made({verb: 'em_device', kind, width, illustrative: true, ...(kind === 'ac_generator' ? {B: 0.1, A: 0.02} : {})});
    const all = ill.props.filter(p => p.type === 'text').map(p => (p as {text: string}).text);
    assert.ok(all.every(t => !/\d/.test(t.replace(/(?<![\w.])[A-Z][₀-₉0-9]*(?![\w.])/g, ''))), `${kind}: ${all.filter(t => /\d/.test(t))}`);
    assert.ok(all.filter(t => t.length > 40).length >= 2, `${kind}: captions stay`);
  }
});

test('em_device errors name the field and the fix', () => {
  assert.match(errs({verb: 'em_device', kind: 'motor'}), /kind is one of electromagnet, bell, dc_motor, ac_generator/);
  assert.match(errs({verb: 'em_device', kind: 'bell', turns: 50}), /turns is for kind electromagnet or dc_motor or ac_generator, not bell/);
  assert.match(errs({verb: 'em_device', kind: 'electromagnet', then: {turns: 55}}), /changes nI too little/);
  assert.match(errs({verb: 'em_device', kind: 'electromagnet', then: {current: 9}}), /keep it within 0.3 to 3.3 times/);
  assert.match(errs({verb: 'em_device', kind: 'electromagnet', then: {}}), /then is \{turns\?, current\?\}/);
  assert.match(errs({verb: 'em_device', kind: 'bell', rings: 1}), /rings is the number of strikes, 2 to 8/);
  assert.match(errs({verb: 'em_device', kind: 'dc_motor', start: 120}), /start is the coil plane's angle/);
  assert.match(errs({verb: 'em_device', kind: 'ac_generator', rotations: 5}), /rotations is 1 to 3/);
  assert.match(errs({verb: 'em_device', kind: 'dc_motor', commutator: 'no'}), /commutator is true or false/);
});

test('staircase wiring: the truth table, all four combinations, either switch toggles the lamp', () => {
  assert.equal(staircaseLamp('up', 'up'), true); assert.equal(staircaseLamp('down', 'down'), true);
  assert.equal(staircaseLamp('up', 'down'), false); assert.equal(staircaseLamp('down', 'up'), false);
  const s = made({verb: 'domestic_circuit', show: 'staircase'});
  assert.deepEqual(check(s, {every: 3}), []);
  const lit = (t: number) => (frame(s, t).props as any[]).some(p => /^lamp-on/.test(p.id) && p.opacity > 0.5);
  assert.deepEqual([1, 2.5, 4.7, 6.9].map(lit), [false, true, false, true]);   // start up/down, S1, S2, S1
  const rows = texts(s, s.duration).filter(t => /^(up|down|on|off)$/.test(t));
  assert.equal(rows.length, 12, 'four rows of S1, S2, lamp');
  assert.ok(texts(s, 3).some(t => /S1 flipped at the bottom: the lamp comes on/.test(t)));
  assert.match(errs({verb: 'domestic_circuit', show: 'staircase', toggles: ['S3']}), /toggles is 1 to 6 flips/);
  assert.match(errs({verb: 'domestic_circuit', show: 'staircase', circuits: []}), /circuits is for show house, not staircase/);
});

test('ring main: a socket is fed both ways round, the shorter way carrying more', () => {
  const {I1, I2} = ringShares(2, 0.25); near(I1, 1.5); near(I2, 0.5); near(I1 + I2, 2);
  const s = made({verb: 'domestic_circuit', show: 'ring', sockets: [{name: 'lamp', watts: 60}, {name: 'iron', watts: 1100}, {name: 'TV', watts: 120}, {name: 'fan', watts: 75}], at: 1});
  assert.deepEqual(check(s, {every: 3}), []);
  assert.ok((s.meta!.facts as string[]).some(f => /takes I = P\/V = 5 A; it arrives both ways round the ring/.test(f)), (s.meta!.facts as string[]).join('; '));
  const w0 = s.props.find(p => p.id === 'way0') as any, w1 = s.props.find(p => p.id === 'way1') as any;
  assert.ok(w0.style.width > w1.style.width, 'the shorter way is drawn thicker');
  const last = Math.max(...s.props.filter(p => /^flow/.test(p.id)).map(p => (p.show as [number, number])[1]));
  assert.ok(last <= s.duration - 1, 'the flow stops a second before the end');
  assert.match(errs({verb: 'domestic_circuit', show: 'ring', sockets: [{name: 'lamp', watts: 60}]}), /sockets is a list of 2 to 6/);
  assert.match(errs({verb: 'domestic_circuit', show: 'ring', sockets: [{name: 'a', watts: 60}, {name: 'b', watts: 9000}], at: 1, rating: 30}), /over the 30 A MCB/);
});

test('MCB: trips on overload or a short circuit, and is switched on again once the fault is removed', () => {
  const circuits = [{rating: 5, appliances: [{name: 'bulb', watts: 60}, {name: 'fan', watts: 75}, {name: 'iron', watts: 1000}]}];
  const s = made({verb: 'domestic_circuit', protect: 'mcb', reset: true, fault: 'overload', circuits});
  assert.deepEqual(check(s, {every: 3}), []);
  const lever = (t: number) => (frame(s, t).props as any[]).find(p => p.id === 'c0-mcb-lever');
  const cut = 1.2 + 0.7 * 2 + 0.6;                    // the iron pushes it past 5 A: 1135 W / 220 V = 5.16 A
  assert.ok(lever(cut - 0.1).y2 < lever(cut - 0.1).y1, 'on: lever up'); assert.ok(lever(cut + 0.5).y2 > lever(cut + 0.5).y1, 'tripped: lever down');
  assert.ok(lever(cut + 2.6).y2 < lever(cut + 2.6).y1, 'reset: lever up again');
  const amps = (t: number) => Number(String((frame(s, t).props as any[]).find(p => p.id === 'c0-current').text).match(/[\d.]+/)![0]);
  assert.equal(amps(cut + 0.5), 0); assert.equal(amps(cut + 2.8), 0.61);   // the iron left off: 135 W / 220 V
  assert.ok(texts(s, cut + 0.5).includes('MCB trips: circuit off'));
  assert.ok(texts(s, s.duration).some(t => /exceeds the MCB rating, the MCB trips/.test(t)));
  const sc = made({verb: 'domestic_circuit', protect: 'mcb', fault: 'short', at: [0, 1], circuits: [{rating: 5, appliances: circuits[0].appliances.slice(0, 2)}]});
  assert.ok(texts(sc, sc.duration).includes('MCB trips: circuit off'));
  assert.match(errs({verb: 'domestic_circuit', reset: true, fault: 'overload', circuits}), /reset needs protect mcb/);
  assert.match(errs({verb: 'domestic_circuit', protect: 'mcb', reset: true, circuits: [{rating: 5, appliances: [{name: 'bulb', watts: 60}]}]}), /reset needs a fault/);
  assert.match(errs({verb: 'domestic_circuit', protect: 'breaker', circuits}), /protect is fuse or mcb/);
  // the house view as before when nothing new is asked for
  const plain = made({verb: 'domestic_circuit', circuits: [{rating: 5, appliances: [{name: 'bulb', watts: 60}]}]});
  assert.equal(plain.duration, 12); assert.ok(plain.props.some(p => p.id === 'c0-fuse'));
});

test('motor and generator: the corner labels A to D stay apart all through, and each scene ends with the coil open', () => {
  // 2026-11-05 review: the coil read as a sliver with A–D piled on one line; the view now looks down at about 32° and a
  // turning scene stops with the coil's plane 30–42° from the field.
  for (const spec of [{kind: 'dc_motor'}, {kind: 'dc_motor', reverse: true}, {kind: 'dc_motor', commutator: false}, {kind: 'ac_generator'}, {kind: 'ac_generator', rotations: 1}])
    for (const width of [1920, 960]) {
      const s = made({verb: 'em_device', ...spec, width}), k = 1;
      let min = Infinity;
      for (let t = 0; t <= s.duration; t += 0.05) {
        const ps = (frame(s, t).props as any[]).filter(p => /^name-[ABCD]$/.test(p.id));
        assert.equal(ps.length, 4);
        for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) min = Math.min(min, Math.hypot(ps[i].x - ps[j].x, ps[i].y - ps[j].y));
      }
      assert.ok(min >= 40 * k, `${JSON.stringify(spec)} at ${width}: labels ${min.toFixed(1)} px apart`);
      // the last frame: the coil's four corners spread out, not edge-on (its quadrilateral has real area)
      const at = (id: string) => (frame(s, s.duration).props as any[]).find(p => p.id === id);
      const [A, B, C] = ['name-A', 'name-B', 'name-C'].map(n => at(n));
      const area = Math.abs((B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y));
      if ((spec as {commutator?: boolean}).commutator !== false) assert.ok(area > 0.15 * (width / 1920) ** 2 * 300 * 300, `${JSON.stringify(spec)} ${width}: open at the end (${area.toFixed(0)})`);
    }
  // the generator stops 55° past whole turns: its plane 35° from the field, and ε back to zero
  const g = made({verb: 'em_device', kind: 'ac_generator', B: 0.1, A: 0.02});
  const e = (t: number) => String((frame(g, t).props as any[]).find(p => p.id === 'emf-read').text);
  assert.match(e(g.duration), /ε = 0 V/);
  const run = motorRun({tOn: 0.8, T: 18}), end = made({verb: 'em_device', kind: 'dc_motor'}).duration, phi = run[Math.round(end * 120)].phi / RAD % 180;
  assert.ok((phi >= 29.9 && phi <= 42.1) || (phi >= 137.9 && phi <= 150.1), `motor ends at ${phi.toFixed(1)}° from the field`);
});

test('staircase: the truth table keeps clear of the stairs, full and half width', () => {
  for (const width of [1920, 960]) {
    const s = made({verb: 'domestic_circuit', show: 'staircase', width}), k = 1080 / 1080;
    const stairs = (s.props.find(p => p.id === 'stairs') as any).points as [number, number][];
    const cells = (frame(s, s.duration).props as any[]).filter(p => p.type === 'text' && /^(S1|S2|lamp|up|down|on|off)$/.test(p.text) && p.size <= 22 * k);
    assert.ok(cells.length >= 15);
    for (const c of cells) {
      const w = c.text.length * c.size * 0.62, x0 = c.align === 'start' ? c.x : c.align === 'end' ? c.x - w : c.x - w / 2, box = [x0 - 4, c.y - c.size - 4, x0 + w + 4, c.y + 6];
      for (let i = 1; i < stairs.length; i++) {
        const [[ax, ay], [bx, by]] = [stairs[i - 1], stairs[i]];   // the stairs are horizontal and vertical runs
        const hit = ay === by ? ay >= box[1] && ay <= box[3] && Math.max(ax, bx) >= box[0] && Math.min(ax, bx) <= box[2]
          : ax >= box[0] && ax <= box[2] && Math.max(ay, by) >= box[1] && Math.min(ay, by) <= box[3];
        assert.ok(!hit, `${width}: "${c.text}" at ${c.x.toFixed(0)},${c.y.toFixed(0)} meets the stairs`);
      }
    }
  }
});
