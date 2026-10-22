// Verbs compile a short, meaningful spec into a low-level scene, and check the spec first.
import type {Scene} from '../scene.ts';
import {energyLadder, ladderErrors, type LadderSpec} from './energy-ladder.ts';
import {numberLine, numberLineErrors, type NumberLineSpec} from './number-line.ts';

export type Spec = LadderSpec | NumberLineSpec;
type Verb<S> = {errors: (spec: S) => string[]; compile: (spec: S) => Scene; about: string};

export const VERBS: Record<string, Verb<any>> = {
  energy_ladder: {errors: ladderErrors, compile: energyLadder,
    about: "an electron on hydrogen's energy levels: photons absorbed and emitted, energies, wavelengths and colours"} as Verb<LadderSpec>,
  number_line: {errors: numberLineErrors, compile: numberLine,
    about: 'hops along a number line for adding and subtracting, negatives included'} as Verb<NumberLineSpec>,
};

/** Compile a verb spec. A spec with errors gives no scene. */
export function compile(spec: {verb: string}): {scene?: Scene; errors: string[]} {
  const verb = VERBS[spec?.verb];
  if (!verb) return {errors: [`unknown verb ${JSON.stringify(spec?.verb)}; known: ${Object.keys(VERBS).join(', ')}`]};
  const errors = verb.errors(spec);
  return errors.length ? {errors} : {scene: verb.compile(spec), errors: []};
}
