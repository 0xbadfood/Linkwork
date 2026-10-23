// Verb cards: what each verb is for, written for the planner that chooses one for a point of a film. Kinds and
// motions use the visual-needs registry's vocabulary (manim repo, kb_research/visual_needs.py), so registry
// entries can be matched to verbs by code.

export const KINDS = ['structure', 'process', 'flow', 'apparatus', 'circuit', 'ray_diagram', 'graph', 'map', 'molecule',
  'reaction', 'model', 'comparison', 'schematic'] as const;
export const MOTIONS = ['highlight', 'labels', 'stages', 'flow', 'rotate', 'translate', 'draw_on', 'value_change', 'zoom'] as const;
export const SUBJECTS = ['physics', 'chemistry', 'biology', 'maths'] as const;

export type Card = {
  subjects: (typeof SUBJECTS)[number][];
  /** Ideas it explains, as a teacher or a book would name them. */
  concepts: string[];
  kinds: (typeof KINDS)[number][];
  motions: (typeof MOTIONS)[number][];
  use_when: string;
  not_when: string;
  /** What each field of the spec means, for the planner. */
  fields: Record<string, string>;
  /** A spec that compiles and passes every check. */
  example: Record<string, unknown>;
  /** candidate → trial (studios only) → trusted (anywhere). */
  status: 'candidate' | 'trial' | 'trusted';
};

const window = {x: '[low, high] x window', y: '[low, high] y window', step: 'optional [x step, y step] for the grid'};

export const CARDS: Record<string, Card> = {
  energy_ladder: {
    subjects: ['chemistry', 'physics'],
    concepts: ["Bohr's model", 'stationary states', 'energy levels of hydrogen', 'line spectrum', 'Balmer series',
      'Lyman series', 'absorption and emission', 'quantised energy', 'photon energy and wavelength'],
    kinds: ['model', 'process'], motions: ['stages', 'flow', 'labels'],
    use_when: "an electron in hydrogen changes level; a photon is absorbed or emitted; its energy, wavelength or colour matters; why hydrogen's spectrum has lines",
    not_when: 'orbital shapes, many-electron atoms, quantum numbers beyond n, or the photoelectric effect',
    fields: {start: 'level the electron starts on (default 1)', levels: 'levels drawn, default [1..6]',
      events: 'list of {at seconds, kind: absorb|emit, from, to}; from is the current level; absorb goes up, emit down; ≥ 2.5 s apart; first at ≥ 1.4 s',
      spectrum: 'true to show the visible strip where emitted lines appear', title: 'short title'},
    example: {verb: 'energy_ladder', title: 'Hydrogen: absorb, then emit', start: 1, spectrum: true,
      events: [{at: 1.6, kind: 'absorb', from: 1, to: 3}, {at: 5.5, kind: 'emit', from: 3, to: 2}]},
    status: 'trusted',
  },
  number_line: {
    subjects: ['maths'],
    concepts: ['integers', 'adding and subtracting integers', 'negative numbers', 'number line', 'additive inverse'],
    kinds: ['model'], motions: ['translate', 'draw_on', 'labels'],
    use_when: 'adding or subtracting whole numbers, especially with negatives; showing that subtracting is moving left',
    not_when: 'fractions or decimals, multiplication, or numbers beyond a span of 20',
    fields: {range: '[low, high] whole numbers, span ≤ 20', start: 'starting number',
      hops: 'list of {at seconds, by: signed whole number}; each starts after the previous lands', title: 'short title'},
    example: {verb: 'number_line', title: '3 + (−5)', range: [-5, 5], start: 0, hops: [{at: 1.0, by: 3}, {at: 3.6, by: -5}]},
    status: 'trusted',
  },
  sliding_ladder: {
    subjects: ['maths', 'physics'],
    concepts: ['Pythagoras theorem', 'related rates', 'rates of change', 'heights and distances', 'trigonometric ratios'],
    kinds: ['model', 'process'], motions: ['translate', 'value_change'],
    use_when: 'a ladder (or rod) against a wall slides; base, height and angle change while x² + y² = L² stays true; related-rates problems',
    not_when: 'a ladder that stays still (use a diagram), or forces and friction on the ladder',
    fields: {length: 'metres', from_angle: 'starting angle with the floor (degrees)', to_angle: 'final angle, at least 5° less',
      start: 'seconds before it starts sliding', slide_time: 'seconds the slide takes (the foot moves at a steady speed)'},
    example: {verb: 'sliding_ladder', title: 'A ladder sliding down a wall', length: 5, from_angle: 72, to_angle: 28, start: 1, slide_time: 5},
    status: 'trusted',
  },
  pendulum: {
    subjects: ['physics'],
    concepts: ['simple pendulum', 'oscillation', 'time period', 'periodic motion', 'T = 2π√(L/g)'],
    kinds: ['apparatus', 'process'], motions: ['rotate', 'value_change'],
    use_when: 'a simple pendulum swings; its period, length or g matters; timing oscillations',
    not_when: 'large swings over 20° (the formula fails), energy bar charts, or damped and driven oscillation',
    fields: {length: 'metres', amplitude: 'degrees, 2–20', g: 'm/s², default 9.8', swings: 'full swings to show, 1–8', release: 'seconds before release'},
    example: {verb: 'pendulum', title: 'A simple pendulum', length: 1, amplitude: 15, swings: 3, release: 1},
    status: 'trusted',
  },
  compass_arc: {
    subjects: ['maths'],
    concepts: ['circle', 'radius', 'constructions', 'arc', 'locus of points at a fixed distance'],
    kinds: ['process', 'apparatus'], motions: ['rotate', 'draw_on'],
    use_when: 'drawing a circle or an arc with compasses; why every point of a circle is the same distance from the centre',
    not_when: 'multi-step constructions such as bisectors (not yet a verb)',
    fields: {radius: 'centimetres, 1–8', from: 'starting angle (degrees)', sweep: 'degrees to draw, 10–360', start: 'seconds', draw_time: 'seconds'},
    example: {verb: 'compass_arc', title: 'A circle of radius 4 cm', radius: 4, from: -30, sweep: 360, start: 1, draw_time: 4},
    status: 'trusted',
  },
  slider_crank: {
    subjects: ['physics'],
    concepts: ['rotational to linear motion', 'piston and crank', 'engines', 'simple harmonic motion (approximately)', 'stroke'],
    kinds: ['apparatus', 'process'], motions: ['rotate', 'translate', 'value_change'],
    use_when: 'turning motion becomes sliding motion (engines, pumps); the piston position as the crank turns',
    not_when: 'the thermodynamics of an engine cycle, or forces in the mechanism',
    fields: {crank: 'crank length, cm', rod: 'rod length, cm, at least 1.5 × crank', rpm: '5–60', turns: '1–5'},
    example: {verb: 'slider_crank', title: 'Turning into sliding', crank: 5, rod: 15, rpm: 20, turns: 2},
    status: 'trusted',
  },
  domain_range: {
    subjects: ['maths'],
    concepts: ['functions', 'domain', 'range', 'where a function is defined', 'square root function', 'reciprocal function'],
    kinds: ['graph'], motions: ['draw_on', 'translate', 'highlight'],
    use_when: 'which x values are allowed and which values f(x) takes; why √x or 1/x excludes some x',
    not_when: 'the shape of the graph is the point (use extrema or a curve), or relations that are not functions',
    fields: {expr: 'f(x), e.g. "sqrt(x)", "1/x"', ...window,
      domain: 'claim checked against f: "x >= 0", "x != 0", "all"', range: 'claim checked against f: "y >= 0", "-1 <= y <= 1"'},
    example: {verb: 'domain_range', title: 'Domain and range of √x', expr: 'sqrt(x)', x: [-4, 9], y: [-1, 4], domain: 'x >= 0', range: 'y >= 0'},
    status: 'trusted',
  },
  extrema: {
    subjects: ['maths'],
    concepts: ['maxima and minima', 'turning points', 'first derivative test', 'increasing and decreasing functions', 'slope of a tangent'],
    kinds: ['graph'], motions: ['translate', 'rotate', 'labels'],
    use_when: "where a function is highest or lowest; why the slope is zero there; rising and falling with f′'s sign",
    not_when: 'global extrema on unbounded windows, or second-derivative tests as the main point',
    fields: {expr: 'f(x), defined across the whole window', ...window, pause: 'seconds to rest at each turning point'},
    example: {verb: 'extrema', title: 'Highest and lowest points', expr: 'x^3 - 3x', x: [-2.4, 2.4], y: [-7, 7], step: [1, 2]},
    status: 'trusted',
  },
  secant_to_tangent: {
    subjects: ['maths'],
    concepts: ['derivative as a limit', 'slope of a tangent', 'secant line', 'limits', 'first principles'],
    kinds: ['graph'], motions: ['translate', 'value_change'],
    use_when: 'the derivative at a point as the limit of secant slopes; differentiation from first principles',
    not_when: 'differentiation rules or computing derivatives symbolically',
    fields: {expr: 'f(x)', at: 'x of the point P', h: 'starting gap to Q', ...window, time: 'seconds for Q to slide in'},
    example: {verb: 'secant_to_tangent', title: 'The slope at a point', expr: 'x^2', at: 1, h: 2, x: [-1, 4], y: [-1, 10], step: [1, 2]},
    status: 'trusted',
  },
  area_under: {
    subjects: ['maths', 'physics'],
    concepts: ['definite integral', 'area under a curve', 'Riemann sums', 'integration as a sum', 'distance from a velocity-time graph'],
    kinds: ['graph'], motions: ['draw_on', 'value_change', 'stages'],
    use_when: 'the area under a curve as a definite integral; rectangles closing in on it; distance as the area under v–t',
    not_when: 'integration techniques, or areas between two curves (not yet)',
    fields: {expr: 'f(x)', from: 'lower limit', to: 'upper limit', ...window, riemann: 'optional rectangle counts, e.g. [4, 8, 16, 32]', rule: 'left | right | mid'},
    example: {verb: 'area_under', title: 'Area under y = x²', expr: 'x^2', from: 0, to: 2, x: [-0.5, 2.5], y: [-0.5, 5], riemann: [4, 8, 16, 32], rule: 'mid'},
    status: 'trusted',
  },
  vector_add: {
    subjects: ['maths', 'physics'],
    concepts: ['vector addition', 'triangle law', 'parallelogram law', 'resultant', 'components', 'magnitude of a vector'],
    kinds: ['model'], motions: ['draw_on', 'translate', 'labels'],
    use_when: 'adding two vectors head to tail; the resultant and its magnitude; order does not matter',
    not_when: 'three-dimensional vectors, products of vectors, or relative velocity as a story (not yet)',
    fields: {a: '[x, y]', b: '[x, y]', x: 'optional x window', y: 'optional y window'},
    example: {verb: 'vector_add', title: 'Adding two vectors', a: [4, 1], b: [1, 3]},
    status: 'trusted',
  },
  graph: {
    subjects: ['physics', 'chemistry', 'maths', 'biology'],
    concepts: ['motion graphs (x–t, v–t, a–t)', 'distance as the area under v–t', 'acceleration as the slope of v–t', "Boyle's law",
      "Charles' law", "Hooke's law", 'stress–strain curve', 'heating and cooling curves', 'periodic trends (ionisation enthalpy, atomic radius)',
      'rate of reaction from a concentration–time graph', 'first-order and zero-order kinetics', 'Arrhenius plot', 'Maxwell–Boltzmann distribution',
      "Raoult's law", "Henry's law", 'V–I characteristics', 'photoelectric effect graphs', 'any quantity plotted against another'],
    kinds: ['graph'], motions: ['draw_on', 'value_change', 'highlight', 'labels'],
    use_when: "one quantity is plotted against another: from a formula (v = 2 + 3t, P = 24/V) or from the book's own data; reading a value off the curve, its slope, the area under it, or comparing up to 4 curves",
    not_when: 'the derivative as a limit (use secant_to_tangent), Riemann sums (area_under), domain and range (domain_range), turning points of a function (extrema), bar or pie charts, or 3-D plots',
    fields: {x: '{name: one letter for a formula ("t", "V", "T"), unit, range: [low, high], step?}', y: '{name, unit, range, step?}',
      series: "1–4 curves, each {label, expr: formula in x's name} or {label, points: [[x, y], ...] from the book, join: line | smooth | none, names?: one per point}",
      trace: '{series, from, to, time?}: a dot runs along the curve with live readouts', tangent: '{series, x}: the tangent and its slope (formula series)',
      shade: '{series, from, to, label?, unit?}: the area under a formula series, computed', marks: 'list of {series?, x, y?, label}: points to point out',
      at: 'optional time (seconds) on any series, trace, shade, tangent or mark, to place it on a word of the narration'},
    example: {verb: 'graph', title: 'Distance is the area under v–t', x: {name: 't', unit: 's', range: [0, 6]}, y: {name: 'v', unit: 'm/s', range: [0, 22], step: 4},
      series: [{label: 'uniform acceleration', expr: '2 + 3t'}], trace: {series: 0, from: 0, to: 5},
      shade: {series: 0, from: 0, to: 5, label: 'distance travelled', unit: 'm'}, tangent: {series: 0, x: 3}},
    status: 'trial',
  },
};

export function cardErrors(name: string, card: Card | undefined): string[] {
  if (!card) return [`${name}: has no card`];
  const errors: string[] = [];
  if (!card.subjects.length || card.subjects.some(s => !SUBJECTS.includes(s))) errors.push(`${name}: subjects from ${SUBJECTS.join(', ')}`);
  if (card.kinds.some(k => !KINDS.includes(k))) errors.push(`${name}: kinds from the registry's vocabulary`);
  if (card.motions.some(m => !MOTIONS.includes(m))) errors.push(`${name}: motions from the registry's vocabulary`);
  if (!card.concepts.length || !card.use_when || !card.not_when) errors.push(`${name}: concepts, use_when and not_when are needed`);
  if ((card.example as {verb?: string}).verb !== name) errors.push(`${name}: its example must use verb "${name}"`);
  return errors;
}
