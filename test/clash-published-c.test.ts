// Text on text in published films (2026-11-05): check()'s textClashes found these scenes of circuit, magnetic_force,
// ac, semiconductor, bohr and nucleus drawing two texts on each other. Each spec is copied from a published film
// (film-tools/logs/clash-specs.json); a planner's annotation (noteN-label) is marks.ts's and is not judged here.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {check, compile, frame, type Scene} from '../src/index.ts';

const made = (o: object) => { const r = compile(o as never); assert.deepEqual(r.errors, [], JSON.stringify(o)); return r.scene! as Scene; };
const clashes = (s: Scene) => check(s).filter(m => m.includes('drawn on each other') && !/note\d+-label/.test(m));

const CASES: [string, object][] = [
  ["circuit jesc1-12:C4|scene-09: one cell: + and − on their own plates", {"verb": "circuit", "title": "Conventional current: + to −", "cells": 1, "items": [{"id": "R", "kind": "resistor", "R": 4}], "key": "closed", "ammeter": false, "flow": true, "power": false, "panel": false, "seconds": 12, "illustrative": true, "annotate": [{"text": "Positive terminal", "at": "battery", "colour": "accent"}]}],
  ["circuit jesc1-11:C8|scene-19: a device's power under its name", {"verb": "circuit", "title": "Iron at Maximum Heating", "source": "mains", "items": [{"id": "iron", "kind": "resistor", "R": 57.6}], "ammeter": true, "power": true, "flow": true}],
  ["circuit jesc1-11:C2|scene-16: compound of two one-cell circuits", {"compound": true, "parts": [{"id": "a", "box": [0, 0, 960, 1080], "spec": {"verb": "circuit", "title": "Parallel voltmeter", "cells": 1, "items": [{"id": "lamp", "kind": "bulb", "R": 10}], "voltmeters": ["lamp"], "panel": false, "illustrative": true}}, {"id": "b", "box": [960, 0, 960, 1080], "spec": {"verb": "circuit", "title": "Series connection breaks path", "cells": 1, "items": [{"id": "lamp", "kind": "bulb", "R": 10}], "key": "open", "panel": false, "illustrative": true}}]}],
  ["magnetic_force jesc1-12:C6|scene-10: ground name gives way to the arrow along it (E, current east)", {"verb": "magnetic_force", "scene": "rule", "current": "east", "field": "up", "panel": false, "seconds": 12, "title": "Fleming's left-hand rule", "illustrative": true}],
  ["magnetic_force jesc1-12:C6|scene-16: ground name gives way to the arrow along it (E, field east)", {"verb": "magnetic_force", "title": "Electron current reversed", "scene": "rule", "current": "down", "field": "east", "charge": "negative", "panel": false, "seconds": 12, "illustrative": true}],
  ["ac leph1-07:C6|scene-09: phasors at resonance: V below the axis, I above", {"verb": "ac", "show": "phasors", "R": 100, "L": 0.001, "C": 1e-09, "V": 10, "illustrative": true, "nu": 159155}],
  ["semiconductor leph2-06:C6|scene-24: full-wave in a half frame: wave names clear of B", {"compound": true, "parts": [{"id": "a", "box": [0, 0, 960, 1080], "spec": {"verb": "semiconductor", "title": "Half-wave", "show": "rectifier", "kind": "half", "illustrative": true}}, {"id": "b", "box": [960, 0, 960, 1080], "spec": {"verb": "semiconductor", "title": "Full-wave", "show": "rectifier", "kind": "full", "illustrative": true}}]}],
  ["bohr leph2-04:C5|scene-29: Lyman in a third of the frame: crowded line values thinned", {"compound": true, "parts": [{"id": "lyman", "box": [0, 0, 640, 1080], "spec": {"verb": "bohr", "show": "spectrum", "series": "lyman", "annotate": [{"text": "121.6 nm", "at": "line1", "colour": "accent"}]}}, {"id": "balmer", "box": [640, 0, 640, 1080], "spec": {"verb": "bohr", "show": "spectrum", "series": "balmer", "annotate": [{"text": "H-alpha, 656.3 nm", "at": "line1", "colour": "accent"}]}}, {"id": "paschen", "box": [1280, 0, 640, 1080], "spec": {"verb": "bohr", "show": "spectrum", "series": "paschen", "annotate": [{"text": "1875 nm", "at": "line1", "colour": "accent"}]}}]}],
  ["nucleus leph2-05:C6|scene-11: nuclear force in a third of the frame: caption under r₀", {"compound": true, "parts": [{"id": "a", "box": [0, 0, 640, 1080], "spec": {"verb": "nucleus", "show": "force", "illustrative": true, "annotate": [{"text": "neutron-neutron", "at": "well", "colour": "accent"}]}}, {"id": "b", "box": [640, 0, 640, 1080], "spec": {"verb": "nucleus", "show": "force", "illustrative": true, "annotate": [{"text": "proton-neutron", "at": "well", "colour": "accent"}]}}, {"id": "c", "box": [1280, 0, 640, 1080], "spec": {"verb": "nucleus", "show": "force", "illustrative": true, "annotate": [{"text": "proton-proton", "at": "well", "colour": "accent"}]}}]}],
];

for (const [name, spec] of CASES) test(`published clash fixed: ${name}`, () => assert.deepEqual(clashes(made(spec)), []));

test('circuit: + sits above − for any number of cells; a power label sits under its name', () => {
  for (const cells of [1, 2, 3, 8]) {
    const s = made({verb: 'circuit', cells, items: [{id: 'R', kind: 'resistor', R: 4}], power: true});
    const at = (id: string) => (s.props as any[]).find(p => p.id === id);
    assert.ok(at('minus').y - at('plus').y >= 30, `cells ${cells}`);
    assert.ok(at('R-P0').y - at('R-name').y >= 24, `cells ${cells}`);
    assert.deepEqual(clashes(s), [], `cells ${cells}`);
  }
});

test('magnetic_force rule: a ground name is hidden once an arrow lies along its line, and kept otherwise', () => {
  const s = made({verb: 'magnetic_force', scene: 'rule', current: 'east', field: 'up', seconds: 10});
  const shown = (t: number) => (frame(s, t).props as any[]).filter(p => p.type === 'text' && p.opacity > 0.3).map(p => p.text as string);
  assert.ok(shown(0.2).includes('E'));
  assert.ok(!shown(9).includes('E') && shown(9).includes('W') && shown(9).includes('N'));
});
