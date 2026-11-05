// The Kepler captions name the scene's own bodies (2026-11-05: an Earth satellite's film read "Near the Sun")
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {compile} from '../src/index.ts';

const texts = (o: object) => compile(o as never).scene!.props.map(p => (p as {text?: string}).text ?? '').join(' | ');

test('a satellite of the Earth is never said to pass near the Sun', () => {
  const t = texts({verb: 'orbit', kind: 'kepler', a: 1, e: 0.5, show: ['areas'], star: 'Earth', body: 'satellite', title: 'Orbit', illustrative: true});
  assert.ok(!t.includes('Sun'), t);
  assert.ok(t.includes('Near the Earth') && t.includes('line to the satellite'), t);
});

test('a planet with no names given still goes round the Sun', () => {
  const t = texts({verb: 'orbit', kind: 'kepler', a: 1, e: 0.5, show: ['areas'], title: 'Orbit', illustrative: true});
  assert.ok(t.includes('Near the Sun') && t.includes('line to the planet'), t);
});
