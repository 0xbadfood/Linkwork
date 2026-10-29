// Verbs compile a short, meaningful spec into a low-level scene, and check the spec first.
import type {Scene} from '../scene.ts';
import {compose, type CompoundSpec} from '../compose.ts';
import {CARDS, type Card} from './cards.ts';
import {energyLadder, ladderErrors, type LadderSpec} from './energy-ladder.ts';
import {compassArc, compassErrors, crankErrors, ladderSlideErrors, pendulum, pendulumErrors, sliderCrank, slidingLadder,
  type CompassSpec, type CrankSpec, type LadderSlideSpec, type PendulumSpec} from './mechanisms.ts';
import {graph, graphErrors, type GraphSpec} from './graph.ts';
import {motionErrors, motionOnLine, scaleCompare, scaleErrors, type MotionSpec, type ScaleSpec} from './motion.ts';
import {stage, stageErrors, type StageSpec} from './stage.ts';
import {pathErrors, pathLength, type PathSpec} from './path.ts';
import {addMarks, markable, marksErrors, type Mark} from './marks.ts';
import {prism, prismErrors, type PrismSpec} from './prism.ts';
import {eye, eyeErrors, type EyeSpec} from './eye.ts';
import {atmosphere, atmosphereErrors, type AtmosphereSpec} from './atmosphere.ts';
import {scattering, scatteringErrors, type ScatteringSpec} from './scattering.ts';
import {circuit, circuitErrors, type CircuitSpec} from './circuit.ts';
import {energyUseErrors, energyUseScene, type EnergyUseSpec} from './energy-use.ts';
import {fieldErrors, magneticField, type FieldSpec} from './magnetism.ts';
import {forceErrors, magneticForce, type ForceSpec} from './magnetic-force.ts';
import {domesticCircuit, domesticErrors, type DomesticSpec} from './domestic.ts';
import {dimensionsErrors, dimensionsScene, type DimensionsSpec} from './dimensions.ts';
import {sigFigsErrors, sigFigsScene, type SigFigsSpec} from './sig-figs.ts';
import {angleErrors, angleMeasure, type AngleSpec} from './angle-measure.ts';
import {rayDiagram, rayDiagramErrors, refraction, refractionErrors, type RaySpec, type RefractionSpec} from './optics.ts';
import {numberLine, numberLineErrors, type NumberLineSpec} from './number-line.ts';
import {areaErrors, areaUnder, domainErrors, domainRange, extrema, extremaErrors, secantErrors, secantToTangent, vectorAdd, vectorErrors,
  type AreaSpec, type DomainSpec, type ExtremaSpec, type SecantSpec, type VectorSpec} from './calculus.ts';

export type Spec = LadderSpec | NumberLineSpec | LadderSlideSpec | PendulumSpec | CompassSpec | CrankSpec
  | DomainSpec | ExtremaSpec | SecantSpec | AreaSpec | VectorSpec | GraphSpec | MotionSpec | ScaleSpec | StageSpec | PathSpec
  | RaySpec | RefractionSpec | PrismSpec | EyeSpec | AtmosphereSpec | ScatteringSpec | CircuitSpec | EnergyUseSpec | FieldSpec | ForceSpec | DomesticSpec
  | DimensionsSpec | SigFigsSpec | AngleSpec;
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
  path_length: {errors: pathErrors, compile: pathLength,
    about: 'distance along a route against displacement, seen from above: a walker on a winding trail or a round trip; path covered and the straight start-to-here arrow measured as it goes, then average speed beside the size of average velocity'} as Verb<PathSpec>,
  stage: {errors: stageErrors, compile: stage,
    about: 'a small mechanics world laid out in metres (ground, tables, wedges, walls, a cannon) where things move by computed physics: a mover at constant speed, a ball launched as a projectile, a block sliding or a ball rolling down a wedge, two things colliding; ranges, times and speeds are computed and shown'} as Verb<StageSpec>,
  ray_diagram: {errors: rayDiagramErrors, compile: rayDiagram,
    about: 'a plane, concave or convex mirror or a convex or concave lens: an object at one distance after another (or a parallel beam), principal rays drawn to the image found by the mirror or lens formula, and the image described as the book does (where, real or virtual, inverted or erect, size); also each ray rule on its own (one ray, no image), a plane mirror\'s i = r and equal distances, a wide beam traced exactly off the sphere (spherical aberration: large against small aperture), and two mirrors or lenses side by side'} as Verb<RaySpec>,
  refraction: {errors: refractionErrors, compile: refraction,
    about: "a ray entering another medium (or crossing a glass slab and coming out): bent by Snell's law with the book's refractive indices, i and r from the normal, sin i ÷ sin r for each angle, the speed of light in each medium, the lateral shift through a slab, total internal reflection; and apparent depth: a coin, a pencil tip or a tank's bottom under water seen from above looks raised (its rays bend away from the normal and, traced back, meet nearer the surface)"} as Verb<RefractionSpec>,
  prism: {errors: prismErrors, compile: prism,
    about: 'light through a triangular glass prism, traced colour by colour: one ray with the angles of incidence, refraction and emergence, the prism angle A and the deviation D; white light split into its spectrum (VIBGYOR, dispersion); a second prism upside down joining the colours again (Newton); a raindrop refracting, reflecting once inside and refracting sunlight into the colours of a rainbow'} as Verb<PrismSpec>,
  eye: {errors: eyeErrors, compile: eye,
    about: "the eye as a lens and a screen: the eye lens changing its power to focus near and far objects on the retina (accommodation, 25 cm to infinity); myopia (a distant object's image in front of the retina) and hypermetropia or presbyopia (a near object's image behind it), and the concave or convex lens, of computed power, that corrects each"} as Verb<EyeSpec>,
  atmosphere: {errors: atmosphereErrors, compile: atmosphere,
    about: "atmospheric refraction: starlight bending through layers of air of rising refractive index, so a star is seen higher than it is and twinkles (a planet does not); and sunlight bending round the Earth's curve, so the Sun is seen above the horizon about 2 minutes before it rises and after it sets"} as Verb<AtmosphereSpec>,
  scattering: {errors: scatteringErrors, compile: scattering,
    about: "the scattering of light: a beam's path showing in a colloid but not clear water (Tyndall effect); air molecules scattering blue about 6 times more than red (1/λ⁴), so the sky is blue; the Sun white overhead and red at sunrise and sunset after a long path through air (colours computed); red signal lights carrying farthest through fog"} as Verb<ScatteringSpec>,
  circuit: {errors: circuitErrors, compile: circuit,
    about: "an electric circuit with the book's symbols, solved by Ohm's law: a battery of cells, plug key and ammeter; resistors, bulbs, nichrome wires (R = ρl/A) and rheostats in series and in parallel groups; voltmeters across items, every branch current, power and bulbs glowing by it; charges moving faster where the current is larger; a list of cell counts shown in turn (Activity 11.1)"} as Verb<CircuitSpec>,
  energy_use: {errors: energyUseErrors, compile: energyUseScene,
    about: 'electrical energy used at home: appliances by rated power and hours of use, E = P × t counted on an energy meter in kWh (1 kWh = 3.6 × 10⁶ J), the bill at a rate per unit, a cycling appliance (a refrigerator) by its duty, and the current I = P/V set against a fuse'} as Verb<EnergyUseSpec>,
  magnetic_field: {errors: fieldErrors, compile: magneticField,
    about: "magnetic fields, computed: a bar magnet's field lines (N to S outside, S to N inside), iron filings and compasses, a compass traced along a line; a straight wire's concentric circles (right-hand thumb rule), a wire in the page with the field out of and into the page; a loop and a solenoid (like a bar magnet, uniform inside, an electromagnet with a core); a compass deflected when the key is plugged in or the current reversed; a uniform field"} as Verb<FieldSpec>,
  magnetic_force: {errors: forceErrors, compile: magneticForce,
    about: "the force on a current in a magnetic field, computed as I × B: a rod between a horseshoe magnet's poles pushed sideways, reversed with the current or the field, further for a larger current; Fleming's left-hand rule finding field, current or force from the other two (an electron's current against its motion); a charge curving at constant speed across a field; the force largest at right angles, zero along the field"} as Verb<ForceSpec>,
  domestic_circuit: {errors: domesticErrors, compile: domesticCircuit,
    about: "a house's wiring: the 220 V mains on live (red) and neutral (black) wires through the meter, main fuse and distribution box to separate 15 A and 5 A circuits with their fuses; appliances in parallel with their own switches, currents I = P/V added per circuit; the earth wire (green) from metal bodies to a plate in the ground; overloading, a short circuit or a live wire touching a metal body, and the fuse melting"} as Verb<DomesticSpec>,
  dimensions: {errors: dimensionsErrors, compile: dimensionsScene,
    about: 'dimensions of physical quantities, computed: a dimensional formula built factor by factor ([M L T⁻²] for force), an equation checked term by term for consistency, a relation deduced by matching powers (a pendulum\'s period T = k √(l/g)), and a value converted between unit systems (1 J = 10⁷ erg)'} as Verb<DimensionsSpec>,
  sig_figs: {errors: sigFigsErrors, compile: sigFigsScene,
    about: 'significant figures, digit by digit: each digit of a measured number marked significant or not by the book\'s rules, a product or quotient cut to the fewest significant figures and a sum or difference to the fewest decimal places, and rounding off (a dropped 5: an even digit stays, an odd one rises)'} as Verb<SigFigsSpec>,
  angle_measure: {errors: angleErrors, compile: angleMeasure,
    about: 'the plane angle and the solid angle as defined: an arc growing on a circle, θ = s/r in radians (1 rad when the arc equals the radius, 2π for the circle), or a patch spreading on a sphere seen from its centre, Ω = A/r² in steradians (4π for the sphere)'} as Verb<AngleSpec>,
};

/** Each verb with its card, for a planner choosing among them (statuses below `trusted` only when asked). */
export function cards(statuses: Card['status'][] = ['trusted']): Record<string, Card & {about: string}> {
  return Object.fromEntries(Object.entries(VERBS).filter(([name]) => statuses.includes(CARDS[name]?.status))
    .map(([name, verb]) => [name, {about: verb.about, ...withMarks(name, CARDS[name])}]));
}

const MARKABLE = new Map<string, ReturnType<typeof markable> | null>();
/** A card with the optional annotate field, worded from what its example scene offers (named points, units). */
function withMarks(name: string, card: Card): Card {
  if (!MARKABLE.has(name)) {
    let found: ReturnType<typeof markable> | null = null;
    try { const scene = VERBS[name].compile(card.example); found = markable(scene); } catch { /* an example that throws offers nothing */ }
    MARKABLE.set(name, found && (found.anchors.length || found.units) ? found : null);
  }
  const m = MARKABLE.get(name);
  if (!m) return card;
  const where = [card.anchors ? `a named point (${card.anchors})` : m.anchors.length ? `a named point (${m.anchors.join(', ')})` : '', m.units ? `[x, y] in ${m.units}` : ''].filter(Boolean).join(' or ');
  return {...card, fields: {...card.fields, annotate: `optional labels, points and measuring lines of your own, up to 8 (text is words for the viewer, never a point's id; points the verb already names, such as P, F, C, are not labelled again): {text?, at: ${where}, to?: a second point the same way (a measuring line from at to it, text at its middle: a distance such as f, R or an aperture), point?: true for a dot, t?: second it appears, colour?: accent | ink | good | bad | cool | muted}; leave out when the verb's own labels say enough`}};
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
  const picked = scored.filter(s => s.score >= 1).sort((a, b) => b.score - a.score).slice(0, limit);
  // The general props' verb comes with every film of its subjects, after the verbs the concept itself calls for.
  return [...picked, ...scored.filter(s => s.card.always && !picked.includes(s))];
}

/** Compile a verb spec. A spec with errors gives no scene. Any spec may say `illustrative: true`: its values only
 * shape the picture (a car speeding up, a curve bending upwards) when the narration states no numbers, so every
 * number is hidden (user, 2026-10-25: a plan for a definitions-only concept could neither paint the car nor give it
 * numbers the narration never states). */
export function compile(spec: {verb: string; illustrative?: boolean} | CompoundSpec): {scene?: Scene; errors: string[]} {
  if ((spec as CompoundSpec)?.compound === true) return compose(spec as CompoundSpec, compile);
  if ('compound' in (spec ?? {})) return {errors: ['compound: write "compound": true']};
  spec = spec as {verb: string; illustrative?: boolean};
  const verb = VERBS[spec?.verb];
  if (!verb) return {errors: [`unknown verb ${JSON.stringify(spec?.verb)}; known: ${Object.keys(VERBS).join(', ')}`]};
  if (spec.illustrative !== undefined && typeof spec.illustrative !== 'boolean') return {errors: [`${spec.verb}: illustrative is true or false`]};
  if (spec.illustrative && CARDS[spec.verb]?.numeric)
    return {errors: [`${spec.verb}: its numbers are the picture, so it is never illustrative (that hides every number): use the numbers the narration says`]};
  const notes = (spec as {annotate?: Mark[]}).annotate;
  const errors = [...verb.errors(spec), ...marksErrors(notes).map(e => `${spec.verb}: ${e}`)];
  if (errors.length) return {errors};
  const marked = addMarks(verb.compile(spec), notes, spec.verb);
  if (!marked.scene) return {errors: marked.errors};
  return {scene: spec.illustrative ? illustrate(marked.scene) : marked.scene, errors: []};
}

// Point names (2F₁, F₂, P1, 2F2) are not numbers: they are taken out before looking for digits.
const NAMES = /(?<![\w.])\d?[A-Z][₀-₉0-9]*(?![\w.])/g;

/** The scene with its numbers hidden: no readouts, no axis numbers, no text with a figure in it (but the title), dials
 * and watches without their digits; no facts for the narration to quote. */
export function illustrate(scene: Scene): Scene {
  // annotate's labels (note…) are the planner's own words, such as R = 2f: they stay.
  const props = scene.props.filter(p => p.type !== 'readout' && !(p.type === 'text' && p.id !== 'title' && !p.id.startsWith('note') && /\d/.test(p.text.replace(NAMES, ''))))
    .map(p => (p.type === 'axes' ? {...p, numbers: false}
      : p.type === 'object' && ['speedometer', 'stopwatch'].includes(p.name) ? {...p, params: {...p.params, digits: 'none'}} : p));
  return {...scene, props, meta: {...scene.meta, facts: [], illustrative: true}};
}
