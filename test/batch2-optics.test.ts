// Batch 2 optics extensions (2026-11-04): blank beats in leph2-01 and leph2-02 drawn by new shows and options on
// diffraction (fresnel), optical_instrument (lens_chain), tir (fibre bend, losses) and polaroid (unpolarised, one).
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {check, compile, frame} from '../src/index.ts';

const near = (a: number, b: number, tol = .005) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} vs ${b}`);
const facts = (spec: object) => ((compile(spec as never).scene!.meta as {facts: string[]}).facts).join(' | ');
const err = (spec: object) => compile(spec as never).errors.join(' | ');
const texts = (spec: object) => compile(spec as never).scene!.props.filter(p => p.type === 'text' && p.id !== 'title').map(p => (p as {text: string}).text);

// The specs offered for the seven beats: each must compile, pass check, and stay legible beside another part.
const BEATS: Record<string, object> = {
  'leph2-01 C1 S07 Scale Separation': {verb: 'diffraction', title: 'Scale separation', show: 'fresnel', stage: 'compare', illustrative: true},
  'leph2-01 C1 S09 Small Aperture Setup': {verb: 'diffraction', title: 'A 0.1 mm aperture', show: 'fresnel', stage: 'setup', a: 0.1, lambda: 500, L: 1},
  'leph2-01 C1 S11 Larger Aperture: Rays Valid': {verb: 'diffraction', title: 'A 1 cm aperture: rays hold', show: 'fresnel', stage: 'result', a: 5, a_is: 'radius', lambda: 500, L: 1},
  'leph2-01 C6 S26 One lens forms an image': {verb: 'optical_instrument', title: 'One lens forms an image', show: 'lens_chain', focal: [10, 10], gaps: [45], u: -15, images: 1, illustrative: true},
  'leph2-01 C4 S27 Light Leaks from the Fibre': {verb: 'tir', title: 'Light leaks from the fibre', show: 'fibre', bend: 2, losses: true, illustrative: true},
  'leph2-02 C7 S11 Transverse vibration': {verb: 'polaroid', title: 'Transverse vibration', show: 'unpolarised', illustrative: true},
  'leph2-02 C7 S16 One polaroid halves the light': {verb: 'polaroid', title: 'One polaroid halves the light', show: 'one', illustrative: true},
};

test('the beats\' specs compile cleanly, full frame and in half a frame, at a legible size', async () => {
  const {MIN_TEXT} = await import('../src/check.ts');
  for (const [beat, spec] of Object.entries(BEATS)) {
    const r = compile(spec as never);
    assert.deepEqual(r.errors, [], beat);
    assert.deepEqual(check(r.scene!, {every: 3}), [], beat);
    const half = compile({compound: true, parts: [{id: 'a', box: [0, 0, 960, 1080], spec}, {id: 'b', box: [960, 0, 960, 1080], spec: {verb: 'polaroid', show: 'malus'}}]} as never);
    assert.deepEqual(half.errors, [], beat);
    assert.deepEqual(check(half.scene!, {every: 3}), [], `${beat} at half width`);
    const part = half.scene!.parts![0];
    const small = part.scene.props.filter(p => p.type === 'text' && ((p as {size?: number}).size ?? 32) * part.scale < MIN_TEXT - 1e-6);
    assert.deepEqual(small.map(p => (p as {text?: string}).text), [], beat);
    // illustrative scenes keep their words: a caption without digits still says what happens
    if ((spec as {illustrative?: boolean}).illustrative) assert.ok(texts(spec).length >= 2, `${beat} keeps its labels`);
  }
});

test('diffraction fresnel: the book\'s Fresnel distance and the film\'s Fresnel numbers (leph2-01 C1)', async () => {
  const wo = await import('../src/verbs/wave-optics.ts');
  // Example: a = 3 mm, λ = 500 nm gives z_F = 18 m; radius 0.05 mm or 5 mm at 1 m: N_F 0.005 and 50
  near(wo.fresnelDistance(3, 500), 18); near(wo.fresnelNumber(.05, 500, 1), .005); near(wo.fresnelNumber(5, 500, 1), 50);
  assert.match(facts({verb: 'diffraction', show: 'fresnel'}), /z_F = a²\/λ = 18 m/);
  assert.match(facts({verb: 'diffraction', show: 'fresnel', a: .05, a_is: 'radius', lambda: 500, L: 1}), /Fresnel number a²\/λL is about 0\.005: diffraction dominates/);
  assert.match(facts({verb: 'diffraction', show: 'fresnel', a: 5, a_is: 'radius', lambda: 500, L: 1}), /Fresnel number a²\/λL is about 50: ray optics holds/);
  // with L the result says only N_F and its verdict: no z_F, no a, no spread, no P (2026-11-04 rebeat)
  const s11 = {verb: 'diffraction', show: 'fresnel', a: 5, a_is: 'radius', lambda: 500, L: 1};
  assert.doesNotMatch(facts(s11), /z_F|radius|rad\b/); assert.doesNotMatch(texts(s11).join(' | '), /z_F|Fresnel distance|500 nm|\bP\b|L = /);
  assert.deepEqual(texts({...s11, illustrative: true}).filter(t => !/^(a|λ)$/.test(t) && !/^The |^Rays /.test(t)), ['a straight beam: rays hold']);
  // the compare stage does not overstate: diffraction dominates, not 'no ray'
  assert.ok(texts({verb: 'diffraction', show: 'fresnel', stage: 'compare'}).includes('spreads out: diffraction dominates'));
  // the drawn beam: its far edge is far wider than the gap when N_F is small, the same width when it is large
  const spread = (a: number) => { const sc = compile({verb: 'diffraction', show: 'fresnel', a, a_is: 'radius', lambda: 500, L: 1} as never).scene!; const pts = (sc.props.find(p => p.id === 'beam') as unknown as {points: [number, number][]}).points; return (pts[80][1] - pts[81][1]) / (pts[0][1] - pts[161][1]); };
  near(spread(.05), Math.hypot(.05, 5e-4 / .1 * 1e3) / .05, .01); near(spread(5), 1, .001);
  // setup draws no beam and says no result
  const setup = compile({verb: 'diffraction', show: 'fresnel', stage: 'setup', a: .05, a_is: 'radius', lambda: 500, L: 1} as never).scene!;
  assert.ok(!setup.props.some(p => p.id === 'beam')); assert.doesNotMatch(texts({verb: 'diffraction', show: 'fresnel', stage: 'setup', a: .05, a_is: 'radius', L: 1}).join(' '), /Fresnel|N_F|rays hold|dominates/);
  // leph2-01 C1 S09 says "a 0.1 millimetre aperture" and defines a as the radius (its N_F of 0.005 needs a = 0.05 mm):
  // the label gives the size across, as said, and names the radius a
  const s09 = texts({verb: 'diffraction', show: 'fresnel', stage: 'setup', a: .05, a_is: 'radius', lambda: 500, L: 1}).join(' | ');
  assert.match(s09, /aperture 0\.1 mm across, radius a/); assert.match(s09, /λ = 500 nm/); assert.match(s09, /L = 1 m/);
  // a given as the width is labelled as given
  assert.match(texts({verb: 'diffraction', show: 'fresnel', stage: 'setup', a: .1, lambda: 500, L: 1}).join(' '), /aperture a = 0\.1 mm/);
  // errors
  assert.match(err({verb: 'diffraction', show: 'fresnel', stage: 'later'}), /stage is one of compare, setup, result/);
  assert.match(err({verb: 'diffraction', show: 'fresnel', stage: 'compare', a: 1}), /a is not used by show fresnel, stage compare/);
  assert.match(err({verb: 'diffraction', show: 'pattern', L: 1}), /stage, L and a_is belong to show fresnel/);
  assert.match(err({verb: 'diffraction', show: 'fresnel', a: 100}), /a is the aperture in mm, 0\.01 to 50/);
  assert.match(err({verb: 'diffraction', show: 'fresnel', L: 0}), /L is the distance to the point observed/);
  assert.match(err({verb: 'diffraction', show: 'fresnel', a_is: 'diameter'}), /a_is is width/);
  assert.match(err({verb: 'diffraction', show: 'fresnel', D: 1}), /D is not used by show fresnel/);
});

test('optical_instrument lens_chain: each image the next lens\'s object, m = m1 × m2 (leph2-01 C6)', async () => {
  const ro = await import('../src/verbs/ray-optics.ts');
  // the book's example: 10, −10 and 30 cm lenses, 5 and 10 cm apart, object 30 cm away: the final image 30 cm beyond the third
  const b = ro.lensChain([10, -10, 30], [5, 10], -30);
  near(b.lenses[0].v, 15); assert.equal(b.lenses[1].v, Infinity); near(b.lenses[2].v, 30);
  assert.match(facts({verb: 'optical_instrument', show: 'lens_chain'}), /final image is 30 cm beyond the last lens/);
  // two convex lenses: m1 = m2 = −2, m = 4; the traced rays put the final image's top at 4 × the object's height
  const two = ro.lensChain([10, 10], [45], -15); near(two.lenses[0].m, -2); near(two.lenses[1].m, -2); near(two.m, 4);
  const sc = compile({verb: 'optical_instrument', show: 'lens_chain', focal: [10, 10], gaps: [45], u: -15} as never).scene!;
  const an = (sc.meta as {anchors: Record<string, [number, number]>}).anchors, axis = an.lens1[1];
  near((an.image2[1] - axis) / (an.object[1] - axis), 4, .01); near((an.image1[1] - axis) / (an.object[1] - axis), -2, .01);
  assert.match(facts({verb: 'optical_instrument', show: 'lens_chain', focal: [10, 10], gaps: [45], u: -15}), /m = m1 × m2 = 4/);
  // images 1: only the first lens's image, the second lens drawn but its image not
  const first = compile({verb: 'optical_instrument', show: 'lens_chain', focal: [10, 10], gaps: [45], u: -15, images: 1} as never).scene!;
  const fa = (first.meta as {anchors: Record<string, unknown>}).anchors;
  assert.ok(fa.image1 && !fa.image2 && fa.lens2);
  assert.ok(!texts({verb: 'optical_instrument', show: 'lens_chain', focal: [10, 10], gaps: [45], u: -15, images: 1}).some(t => /I₂/.test(t)));
  // errors
  assert.match(err({verb: 'optical_instrument', show: 'lens_chain', focal: [10]}), /focal is a list of 2 or 3/);
  assert.match(err({verb: 'optical_instrument', show: 'lens_chain', focal: [10, 10], gaps: [5, 5]}), /gaps lists the 1 distance/);
  assert.match(err({verb: 'optical_instrument', show: 'lens_chain', focal: [10, 10], gaps: [20], u: 15}), /u is the object's distance from the first lens in cm, negative/);
  assert.match(err({verb: 'optical_instrument', show: 'lens_chain', focal: [10, 10], gaps: [30], u: -20}), /final image is at infinity/);
  assert.match(err({verb: 'optical_instrument', show: 'lens_chain', focal: [10, 10], gaps: [45], u: -15, images: 3}), /images is how many lenses' images to draw, 1 to 2/);
  assert.match(err({verb: 'optical_instrument', show: 'simple_microscope', gaps: [5]}), /gaps is not used by show simple_microscope/);
});

test('tir fibre bent too tightly leaks at the bend; gently bent it does not (leph2-01 C4)', async () => {
  const ro = await import('../src/verbs/ray-optics.ts');
  // the book's light pipe, 1.68 in 1.44: critical angle 59°, every ray safe only when the bend's radius is over 6.5 core widths
  near(ro.criticalAngle(1.68, 1.44), 59.0, .002); near(ro.safeBend(1.68, 1.44), 6.5, .01);
  // Fresnel at normal incidence, glass 1.5 to air: 4 %; past the critical angle all of it
  near(ro.reflectance(1.5, 1, 0), .04, .01); assert.equal(ro.reflectance(1.68, 1.44, 70), 1);
  const tight = facts({verb: 'tir', show: 'fibre', bend: 2});
  assert.match(tight, /ic = 59°/); assert.match(tight, /bend radius 2 core widths: at the outer wall the light meets it at [\d.]+°, within ic: it leaks/);
  const angle = Number(/meets it at ([\d.]+)°/.exec(tight)![1]); assert.ok(angle < 59, `${angle}`);
  assert.match(facts({verb: 'tir', show: 'fibre', bend: 8}), /least angle at the walls is [\d.]+°, beyond ic/);
  const sc = compile({verb: 'tir', show: 'fibre', bend: 2} as never).scene!;
  assert.ok(sc.props.some(p => p.id.startsWith('leak')), 'leaks drawn');
  assert.ok(!compile({verb: 'tir', show: 'fibre', bend: 8} as never).scene!.props.some(p => p.id.startsWith('leak')), 'a gentle bend leaks nothing');
  // losses: the light dims along the way and scattered strokes leave it
  const lossy = compile({verb: 'tir', show: 'fibre', losses: true} as never).scene!;
  const ray = lossy.props.filter(p => p.id.startsWith('ray0-')).map(p => (p.style as {opacity: number}).opacity);
  assert.ok(ray.at(-1)! < ray[0], 'fainter at the far end'); assert.ok(lossy.props.some(p => p.id.startsWith('scat')));
  // the straight fibre is unchanged
  assert.match(facts({verb: 'tir', show: 'fibre', n_core: 1.5, n_clad: 1.45, incidence: 40}), /escapes/);
  // errors
  assert.match(err({verb: 'tir', show: 'fibre', bend: 20}), /bend is the bend's radius in core widths, 1\.5/);
  assert.match(err({verb: 'tir', show: 'prism_90', bend: 2}), /bend is not used by show prism_90/);
  assert.match(err({verb: 'tir', show: 'fibre', losses: 'yes'}), /losses is true or false/);
  assert.match(err({verb: 'tir', show: 'fibre', bend: 3, incidence: 70}), /keep incidence to 60 degrees or less/);
});

test('polaroid: an unpolarised wave\'s plane changes at random; one polaroid passes half at every angle (leph2-02 C7)', async () => {
  const wo = await import('../src/verbs/wave-optics.ts');
  // Malus averaged over every plane of vibration: I0/2 at every angle of the one polaroid
  for (const th of [0, 17, 45, 90, 133, 180]) near(wo.throughOne(th), .5, 1e-9);
  assert.match(facts({verb: 'polaroid', show: 'one'}), /I = I0\/2, whatever its angle/);
  // the light-through bar stays at half while P1 turns
  const one = compile({verb: 'polaroid', show: 'one'} as never).scene!;
  const bar = (t: number) => (frame(one, t).props.find(p => p.id === 'bar') as unknown as {h: number}).h;
  const axis = (t: number) => { const p = frame(one, t).props.find(p => p.id === 'axis-P1') as unknown as {x1: number; x2: number}; return p.x2 - p.x1; };
  near(bar(1), bar(5)); near(bar(5), bar(9)); assert.ok(Math.abs(axis(1) - axis(5)) > 5, 'P1 turns');
  // unpolarised: the end-on vibration's direction jumps about; held to one plane, it does not
  const dirs = (spec: object) => { const sc = compile(spec as never).scene!; return [.3, 1.5, 2.7, 3.9].map(t => { const p = frame(sc, t).props.find(p => p.id === 'endon1') as unknown as {x1: number; y1: number; x2: number; y2: number}; return Math.round(Math.atan2(p.y2 - p.y1, p.x2 - p.x1) * 180 / Math.PI); }); };
  assert.ok(new Set(dirs({verb: 'polaroid', show: 'unpolarised'})).size >= 3);
  assert.equal(new Set(dirs({verb: 'polaroid', show: 'unpolarised', plane: 30})).size, 1);
  // every E arrow stays across the beam: the beam is horizontal and the arrows' feet sit on it
  const un = compile({verb: 'polaroid', show: 'unpolarised'} as never).scene!;
  const feet = un.props.filter(p => /^E\d+$/.test(p.id)).map(p => (p as unknown as {y1: number}).y1);
  assert.equal(new Set(feet).size, 1);
  // errors
  assert.match(err({verb: 'polaroid', show: 'unpolarised', angle: 30}), /show unpolarised has no polaroid, so no angle/);
  assert.match(err({verb: 'polaroid', show: 'malus', plane: 30}), /plane belongs to show unpolarised/);
  assert.match(err({verb: 'polaroid', show: 'unpolarised', plane: 200}), /plane is the plane of vibration's angle/);
  assert.match(err({verb: 'polaroid', show: 'sideways'}), /show is one of malus, crossed, unpolarised, one/);
});

test('lens_chain fits everything it draws below the header band and inside the frame (leph2-01 C6 S26, published)', () => {
  // 2026-11-04: the scale ignored the final image and the rays' heights at the lenses: lenses ran up into the header band,
  // rays left the top of the frame and I₂'s label sat on a ray at the top edge.
  for (const [gap, u] of [[35, -20], [45, -15]]) for (const illustrative of [true, false]) for (const width of [1920, 960]) {
    const spec = {verb: 'optical_instrument', title: 'Magnifications multiply', show: 'lens_chain', focal: [10, 10], gaps: [gap], u, images: 2, illustrative, width, height: 1080};
    const r = compile(spec as never); assert.deepEqual(r.errors, []); assert.deepEqual(check(r.scene!), []);
    const top = .14 * 1080, name = `gaps ${gap}, u ${u}, ${width} px${illustrative ? ', illustrative' : ''}`;
    for (const p of r.scene!.props) {
      if (p.id === 'title') continue;
      const q = p as unknown as {x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number; points?: [number, number][]; size?: number; text?: string};
      const pts: [number, number][] = [...(q.points ?? []), ...(q.x1 !== undefined ? [[q.x1, q.y1!], [q.x2!, q.y2!]] as [number, number][] : []), ...(q.x !== undefined ? [[q.x, q.y! - (p.type === 'text' ? q.size! : 0)]] as [number, number][] : [])];
      for (const [x, y] of pts) assert.ok(y >= top - 1e-6 && y <= 1080 && x >= 0 && x <= width, `${name}: ${p.id} ${q.text ?? ''} at (${x.toFixed(0)}, ${y.toFixed(0)})`);
    }
    // the image labels sit clear of the rays: no ray passes through the middle of one
    const rays = r.scene!.props.filter(p => /^ray\d$/.test(p.id)).map(p => (p as unknown as {points: [number, number][]}).points);
    for (const t of r.scene!.props.filter(p => p.type === 'text' && /^I[₁₂]/.test((p as unknown as {text: string}).text))) {
      const q = t as unknown as {x: number; y: number; size: number; text: string; align?: string}, w = q.text.length * q.size * .5;
      const x0 = q.align === 'start' ? q.x : q.align === 'end' ? q.x - w : q.x - w / 2, y0 = q.y - q.size * .8, y1 = q.y;
      const crossed = rays.some(seg => seg.some((pt, m) => m > 0 && Array.from({length: 81}, (_, j) => j / 80).some(f => {
        const x = seg[m - 1][0] + f * (pt[0] - seg[m - 1][0]), y = seg[m - 1][1] + f * (pt[1] - seg[m - 1][1]);
        return x > x0 + w * .2 && x < x0 + w * .8 && y > y0 && y < y1;
      })));
      assert.ok(!crossed, `${name}: a ray crosses the label ${q.text}`);
    }
  }
});
