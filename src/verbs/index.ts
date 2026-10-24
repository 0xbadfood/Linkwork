// Verbs compile a short, meaningful spec into a low-level scene, and check the spec first.
import type {Scene} from '../scene.ts';
import {CARDS, type Card} from './cards.ts';
import {energyLadder, ladderErrors, type LadderSpec} from './energy-ladder.ts';
import {compassArc, compassErrors, crankErrors, ladderSlideErrors, pendulum, pendulumErrors, sliderCrank, slidingLadder,
  type CompassSpec, type CrankSpec, type LadderSlideSpec, type PendulumSpec} from './mechanisms.ts';
import {graph, graphErrors, type GraphSpec} from './graph.ts';
import {motionErrors, motionOnLine, scaleCompare, scaleErrors, type MotionSpec, type ScaleSpec} from './motion.ts';
import {stage, stageErrors, type StageSpec} from './stage.ts';
import {numberLine, numberLineErrors, type NumberLineSpec} from './number-line.ts';
import {areaErrors, areaUnder, domainErrors, domainRange, extrema, extremaErrors, secantErrors, secantToTangent, vectorAdd, vectorErrors,
  type AreaSpec, type DomainSpec, type ExtremaSpec, type SecantSpec, type VectorSpec} from './calculus.ts';

export type Spec = LadderSpec | NumberLineSpec | LadderSlideSpec | PendulumSpec | CompassSpec | CrankSpec
  | DomainSpec | ExtremaSpec | SecantSpec | AreaSpec | VectorSpec | GraphSpec | MotionSpec | ScaleSpec | StageSpec;
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
  graph: {errors: graphErrors, compile: graph,
    about: "a science or maths graph: curves from a formula or the book's data, a tracer with readouts, a tangent, a shaded area, marked points"} as Verb<GraphSpec>,
  motion_on_line: {errors: motionErrors, compile: motionOnLine,
    about: 'an object moving along an x-axis (origin, direction, positions over time), with time, position, displacement, velocity and distance read off, and optionally its x–t graph drawing itself'} as Verb<MotionSpec>,
  scale_compare: {errors: scaleErrors, compile: scaleCompare,
    about: "an object's length against distances, drawn to scale: it shrinks to its true size beside each distance and L/D is shown (when is it a point?)"} as Verb<ScaleSpec>,
  stage: {errors: stageErrors, compile: stage,
    about: 'a small mechanics world laid out in metres (ground, tables, wedges, walls, a cannon) where things move by computed physics: a mover at constant speed, a ball launched as a projectile, a block sliding or a ball rolling down a wedge, two things colliding; ranges, times and speeds are computed and shown'} as Verb<StageSpec>,
};

/** Each verb with its card, for a planner choosing among them (statuses below `trusted` only when asked). */
export function cards(statuses: Card['status'][] = ['trusted']): Record<string, Card & {about: string}> {
  return Object.fromEntries(Object.entries(VERBS).filter(([name]) => statuses.includes(CARDS[name]?.status))
    .map(([name, verb]) => [name, {about: verb.about, ...CARDS[name]}]));
}

const STOP = new Set(['about', 'their', 'there', 'which', 'where', 'with', 'from', 'that', 'this', 'when', 'what', 'into',
  'between', 'against', 'along', 'shown', 'shows', 'using', 'used', 'other', 'than', 'then', 'them', 'they', 'these', 'those']);
const words = (text: string) => new Set((text.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? []).map(w => w.replace(/s$/, '')).filter(w => !STOP.has(w)));

/** The cards worth showing a planner for this teaching text (a concept's name, summary and coverage): the verbs of the
 * subject whose concepts the text names (a whole concept phrase counts most), best first, at most `limit`. */
export function shortlist(text: string, subject: string, statuses: Card['status'][] = ['trusted'], limit = 6) {
  const lower = ` ${text.toLowerCase()} `, have = words(text);
  const scored = Object.entries(cards(statuses)).filter(([, c]) => c.subjects.includes(subject as never)).map(([name, c]) => {
    let score = 0;
    for (const concept of c.concepts) {
      const phrase = concept.toLowerCase().replace(/\s*\(.*?\)/g, '');
      if (lower.includes(phrase)) score += 3;
      score += [...words(concept)].filter(w => have.has(w)).length * 0.5;
    }
    score += [...words(c.use_when)].filter(w => have.has(w)).length * 0.25;
    return {name, score, card: c};
  });
  return scored.filter(s => s.score >= 1).sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Compile a verb spec. A spec with errors gives no scene. */
export function compile(spec: {verb: string}): {scene?: Scene; errors: string[]} {
  const verb = VERBS[spec?.verb];
  if (!verb) return {errors: [`unknown verb ${JSON.stringify(spec?.verb)}; known: ${Object.keys(VERBS).join(', ')}`]};
  const errors = verb.errors(spec);
  return errors.length ? {errors} : {scene: verb.compile(spec), errors: []};
}
