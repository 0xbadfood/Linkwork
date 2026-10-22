// Verbs compile a short, meaningful spec into a low-level scene, and check the spec first.
import type {Scene} from '../scene.ts';
import {energyLadder, ladderErrors, type LadderSpec} from './energy-ladder.ts';
import {compassArc, compassErrors, crankErrors, ladderSlideErrors, pendulum, pendulumErrors, sliderCrank, slidingLadder,
  type CompassSpec, type CrankSpec, type LadderSlideSpec, type PendulumSpec} from './mechanisms.ts';
import {numberLine, numberLineErrors, type NumberLineSpec} from './number-line.ts';

export type Spec = LadderSpec | NumberLineSpec | LadderSlideSpec | PendulumSpec | CompassSpec | CrankSpec;
type Verb<S> = {errors: (spec: S) => string[]; compile: (spec: S) => Scene; about: string};

export const VERBS: Record<string, Verb<any>> = {
  energy_ladder: {errors: ladderErrors, compile: energyLadder,
    about: "an electron on hydrogen's energy levels: photons absorbed and emitted, energies, wavelengths and colours"} as Verb<LadderSpec>,
  number_line: {errors: numberLineErrors, compile: numberLine,
    about: 'hops along a number line for adding and subtracting, negatives included'} as Verb<NumberLineSpec>,
  sliding_ladder: {errors: ladderSlideErrors, compile: slidingLadder,
    about: 'a ladder sliding down a wall: base, height and angle measured live; x² + y² = L²'} as Verb<LadderSlideSpec>,
  pendulum: {errors: pendulumErrors, compile: pendulum,
    about: 'a simple pendulum swinging with T = 2π√(L/g), timed swing by swing'} as Verb<PendulumSpec>,
  compass_arc: {errors: compassErrors, compile: compassArc,
    about: 'a pair of compasses drawing an arc or circle of a given radius'} as Verb<CompassSpec>,
  slider_crank: {errors: crankErrors, compile: sliderCrank,
    about: 'a crank, connecting rod and piston: turning motion into sliding motion'} as Verb<CrankSpec>,
};

/** Compile a verb spec. A spec with errors gives no scene. */
export function compile(spec: {verb: string}): {scene?: Scene; errors: string[]} {
  const verb = VERBS[spec?.verb];
  if (!verb) return {errors: [`unknown verb ${JSON.stringify(spec?.verb)}; known: ${Object.keys(VERBS).join(', ')}`]};
  const errors = verb.errors(spec);
  return errors.length ? {errors} : {scene: verb.compile(spec), errors: []};
}
