// Published films' scenes that drew text on text (2026-11-05; ~/film-tools/logs/clash-specs.json): a planner's note on a
// verb's own name, a moving label, a field's × or the title; gas_process's V₁ on V₂ (or V₂ on the axis's V); kinetic_gas's
// last bar value on "3R = 24.9"; the compound microscope's "first image (real)" on "eye". Each spec as published.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {check, compile, type Scene} from '../src/index.ts';
import {addMarks} from '../src/verbs/marks.ts';

const PUBLISHED: [verb: string, key: string, spec: object][] = [
  ["prism", "jesc1-10:C5|scene-05", {"verb": "prism", "setup": "prism", "light": "white", "angle": 60, "incidence": 55, "glass": "glass", "spread": 4, "illustrative": true, "seconds": 10, "title": "Different colours, different bending", "annotate": [{"text": "Red bends least", "at": "red", "colour": "ink"}, {"text": "Violet bends most", "at": "violet", "colour": "accent"}]}],
  ["atmosphere", "jesc1-10:C7|scene-08", {"verb": "atmosphere", "title": "Star and planet compared", "scene": "star", "planet": true, "twinkle": false, "seconds": 9, "annotate": [{"text": "planet: a visible disc", "at": "planet", "colour": "ink"}]}],
  ["elastic", "keph2-01:C8|scene-13", {"verb": "elastic", "title": "Nearly constant volume", "kind": "tension", "material": "steel", "L": 1, "d": 0.02, "F": 100000, "show": ["lateral"], "illustrative": true, "annotate": [{"text": "volume ≈ constant", "at": "wire"}]}],
  ["fluid_pressure", "keph2-02:C3|scene-24", {"verb": "fluid_pressure", "kind": "hydraulic", "title": "Force gained, distance lost", "illustrative": true, "F1": 10, "d1": 0.01, "d2": 0.03, "push": 0.06, "annotate": [{"text": "small piston moves farther", "at": "small"}, {"text": "large piston moves less", "at": "large"}]}],
  ["orbit", "keph1-07:C8|scene-24", {"verb": "orbit", "kind": "satellite", "title": "The Moon orbiting Earth", "planet": {"name": "Earth"}, "body": "Moon", "h": 370000, "show": ["energy"], "illustrative": true, "annotate": [{"text": "Moon's period and radius", "at": [0, 0], "colour": "ink"}]}],
  ["circuit", "leph1-04:C10|scene-32", {"verb": "circuit", "title": "With a 0.02 Ω Shunt", "volts": 3, "items": [{"id": "R", "kind": "resistor", "R": 3}, {"id": "pg", "parallel": [[{"id": "galv", "kind": "resistor", "R": 60}], [{"id": "shunt", "kind": "resistor", "R": 0.02}]]}], "key": "closed", "ammeter": true, "flow": true, "currents": true, "annotate": [{"text": "shunt, 0.02 Ω", "at": "shunt", "colour": "accent"}, {"text": "galvanometer, 60 Ω", "at": "galv", "colour": "muted"}]}],
  ["plane_motion", "keph1-04:C6|scene-06", {"verb": "plane_motion", "title": "Centripetal force is a role", "circle": {"radius": 1, "speed": 1, "turns": 1}, "show": ["velocity", "delta_v"], "annotate": [{"text": "centripetal force (a role)", "at": [0, 0.5], "colour": "accent"}], "illustrative": true}],
  ["induction", "leph1-06:C8|scene-02", {"verb": "induction", "show": "generator", "N": 100, "B": 0.5, "A": 0.1, "nu": 0.5, "illustrative": true, "annotate": [{"text": "electromagnetic induction", "at": "coil", "t": 2, "colour": "accent"}]}],
  ["ac", "leph1-07:C2|scene-17", {"verb": "ac", "title": "Resistor phasors at a single frequency", "show": "waves", "element": "R", "illustrative": true, "annotate": [{"text": "single frequency ω", "at": "phasors", "colour": "accent"}, {"text": "phase angle zero", "at": "v", "colour": "ink"}]}],
  ["semiconductor", "leph2-06:C4|scene-22", {"verb": "semiconductor", "title": "Heavier doping, narrower depletion", "show": "junction", "illustrative": true, "annotate": [{"text": "narrower with heavier doping", "at": "junction", "colour": "accent"}]}],
  ["gas_process", "keph2-04:C6|scene-01", {"compound": true, "parts": [{"id": "a", "box": [0, 0, 960, 1080], "spec": {"verb": "gas_process", "title": "Constant volume", "kind": "isochoric", "mu": 1, "T": 300, "T2": 310, "V1": 0.025, "V2": 0.025, "gamma": 1.4, "illustrative": true}}, {"id": "b", "box": [960, 0, 960, 1080], "spec": {"verb": "gas_process", "title": "Constant pressure", "kind": "isobaric", "mu": 1, "T": 300, "T2": 310, "V1": 0.025, "V2": 0.026, "gamma": 1.4, "illustrative": true}}]}],
  ["gas_process", "keph2-04:C8|scene-08", {"verb": "gas_process", "title": "Almost balanced", "kind": "isothermal", "mu": 1, "T": 300, "V1": 0.002, "V2": 0.00199, "window": {"V": 0.004, "P": 1800000}, "illustrative": true}],
  ["gas_process", "keph2-04:C11|scene-16", {"verb": "gas_process", "kind": "isobaric", "mu": 1, "T": 300, "T2": 600, "V1": 0.0246, "V2": 0.0492, "window": {"V": 0.05, "P": 250000}, "illustrative": true, "annotate": [{"text": "extra heat for work", "at": "area", "colour": "accent"}]}],
  ["kinetic_gas", "keph2-05:C9|scene-23", {"verb": "kinetic_gas", "title": "Solids Against the 3R Line", "kind": "solid", "solids": ["aluminium", "carbon", "copper", "lead", "silver", "tungsten"], "annotate": [{"text": "3R, the classical line", "at": "line3R", "colour": "accent", "t": 2}, {"text": "Carbon: quantum effects", "at": "bar1", "colour": "bad", "t": 6}]}],
  ["optical_instrument", "leph2-01:C8|scene-30", {"verb": "optical_instrument", "show": "compound_microscope", "fo": 1.0, "fe": 2.0, "L": 20, "illustrative": true}],
];

for (const [verb, key, spec] of PUBLISHED) test(`published ${verb} ${key}: no text drawn on text, every note kept`, () => {
  const r = compile(spec as never);
  assert.deepEqual(r.errors, [], key);
  assert.deepEqual(check(r.scene!).filter(e => e.includes('drawn on each other')), [], key);
  const asked = ((spec as {annotate?: {text?: string}[]}).annotate ?? []).filter(m => m.text).length;
  assert.equal(r.scene!.props.filter(p => /^note\d+-label$/.test(p.id)).length, asked, `${key}: a note was left out though room was found before`);
});

const bare = (props: Scene['props'], anchors: Record<string, [number, number]>): Scene =>
  ({linkwork: 1, width: 1920, height: 1080, fps: 30, duration: 6, props, actors: [], meta: {anchors}});

test('a note keeps clear of a label that moves through its spot later, not only of where texts start', () => {
  // 'Moon' starts far off and rides through the note's asked spot from 3 s to the end
  const moving = {id: 'lmoon', type: 'text', x: 200, y: 300, text: 'Moon', size: 30, keys: {x: [[0, 200], [3, 900]], y: [[0, 300], [3, 485]]}} as never;
  const s = addMarks(bare([moving], {p: [900, 500]}), [{text: 'the Moon here', at: 'p'}], 'test').scene!;
  assert.deepEqual(check(s).filter(e => e.includes('drawn on each other')), []);
  const note = s.props.find(p => p.id === 'note0-label') as {y: number};
  assert.ok(Math.abs(note.y - 484) > 30, `moved off the label's path (y ${note.y})`);
});

test('a note with no clear room anywhere near its point is left out; the verb\'s own labels stay', () => {
  // a field of × marks filling the whole picture
  const marks = [] as Scene['props'];
  for (let x = 30; x < 1900; x += 40) for (let y = 40; y < 1060; y += 40) marks.push({id: `x${x}-${y}`, type: 'text', x, y, text: '×', size: 30, align: 'middle'} as never);
  const s = addMarks(bare(marks, {p: [960, 540]}), [{text: 'uniform field', at: 'p', point: true}], 'test').scene!;
  assert.ok(!s.props.some(p => p.id === 'note0-label'));
  assert.ok(s.props.some(p => p.id === 'note0-point'), 'the dot asked for stays');
  assert.equal(s.props.filter(p => p.id.startsWith('x')).length, marks.length);
});
