// Verbs compile a short, meaningful spec into a low-level scene, and check the spec first.
import type {Scene} from '../scene.ts';
import {energyLadder, ladderErrors, type LadderSpec} from './energy-ladder.ts';
import {compassArc, compassErrors, crankErrors, ladderSlideErrors, pendulum, pendulumErrors, sliderCrank, slidingLadder,
  type CompassSpec, type CrankSpec, type LadderSlideSpec, type PendulumSpec} from './mechanisms.ts';
import {numberLine, numberLineErrors, type NumberLineSpec} from './number-line.ts';
import {areaErrors, areaUnder, domainErrors, domainRange, extrema, extremaErrors, secantErrors, secantToTangent, vectorAdd, vectorErrors,
  type AreaSpec, type DomainSpec, type ExtremaSpec, type SecantSpec, type VectorSpec} from './calculus.ts';

export type Spec = LadderSpec | NumberLineSpec | LadderSlideSpec | PendulumSpec | CompassSpec | CrankSpec
  | DomainSpec | ExtremaSpec | SecantSpec | AreaSpec | VectorSpec;
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
  domain_range: {errors: domainErrors, compile: domainRange,
    about: "domain and range: a figure walks the x-axis, stopped by walls where f is undefined; the curve's shadow fills the range"} as Verb<DomainSpec>,
  extrema: {errors: extremaErrors, compile: extrema,
    about: 'maxima and minima: a tangent rod on a hinge tied to the curve, level exactly at each'} as Verb<ExtremaSpec>,
  secant_to_tangent: {errors: secantErrors, compile: secantToTangent,
    about: "the derivative as a limit: Q slides into P and the secant's slope approaches f′(a)"} as Verb<SecantSpec>,
  area_under: {errors: areaErrors, compile: areaUnder,
    about: 'the area under a curve, swept and measured, then Riemann sums closing in on it'} as Verb<AreaSpec>,
  vector_add: {errors: vectorErrors, compile: vectorAdd,
    about: 'adding vectors head to tail, with components and the magnitude of the sum'} as Verb<VectorSpec>,
};

/** Compile a verb spec. A spec with errors gives no scene. */
export function compile(spec: {verb: string}): {scene?: Scene; errors: string[]} {
  const verb = VERBS[spec?.verb];
  if (!verb) return {errors: [`unknown verb ${JSON.stringify(spec?.verb)}; known: ${Object.keys(VERBS).join(', ')}`]};
  const errors = verb.errors(spec);
  return errors.length ? {errors} : {scene: verb.compile(spec), errors: []};
}
