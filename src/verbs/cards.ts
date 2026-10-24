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
    subjects: ['maths', 'physics'],
    concepts: ['derivative as a limit', 'slope of a tangent', 'secant line', 'limits', 'first principles',
      'instantaneous velocity', 'velocity as the slope of the position-time graph', 'limit of average velocity', 'instantaneous acceleration'],
    kinds: ['graph'], motions: ['translate', 'value_change'],
    use_when: "the derivative at a point as the limit of secant slopes; differentiation from first principles; in physics (quantity: velocity) instantaneous velocity as the limit of average velocity Δx/Δt on an x–t graph as Δt → 0, with the book's table of Δt values as steps (acceleration likewise on a v–t graph)",
    not_when: 'differentiation rules or computing derivatives symbolically',
    fields: {expr: 'f(x) (in physics, position or velocity as a formula in x standing for time t)', at: 'x (or t) of the point P', h: 'starting gap to Q', ...window, time: 'seconds for Q to slide in (without steps)',
      quantity: 'velocity | acceleration: physics words and units (t in s, x in m, Δx/Δt in m/s); omit for maths',
      steps: "2–6 values of h (Δt) Q stops at, largest first, the first no more than h; each adds a table row (Δt, Δx, Δx/Δt), e.g. the book's table",
      centred: "true: the chord spans at − h/2 to at + h/2 (as NCERT's Table 2.1, t₁ = 4 − Δt/2, t₂ = 4 + Δt/2); match the book"},
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
  motion_on_line: {
    subjects: ['physics'],
    concepts: ['position', 'reference point and origin', 'frame of reference', 'rest and motion', 'displacement', 'distance travelled',
      'uniform motion', 'velocity and speed', 'average velocity', 'position–time graph', 'motion in a straight line', 'rectilinear motion'],
    kinds: ['model', 'graph'], motions: ['translate', 'value_change', 'draw_on', 'labels'],
    use_when: "something moves (or stays at rest) along a straight line: where it is, which way, how far, how fast; position, displacement against distance; the x–t graph of that motion; a car whose position follows a formula (the book's x = 0.08t³), with its velocity read live and a speedometer; average velocity over a stretch",
    not_when: 'motion in a plane or along a curved path (use path_length), a graph alone (use graph), forces',
    fields: {axis: '{range: [low, high], unit?: "m", step?}', object: 'dot | figure | car | bus | train | bicycle | ball | block (default dot)',
      object_length: 'optional real length in axis units, to draw the object to scale',
      moves: 'list of {t seconds, x}: positions at times, increasing t; between them it moves at constant velocity; equal x = at rest',
      formula: "instead of moves: {expr: x as a formula of time written in the variable x, e.g. '0.08*x^3', t: [t0, t1] seconds}; v is its exact rate",
      speedometer: '{max?}: a speedometer showing its speed',
      marks: 'optional {x, label} points on the axis (P, Q, home)', graph: 'true to draw the x–t graph as it moves',
      readouts: 'any of t, x, displacement, v, distance (default t and x)', title: 'short title'},
    example: {verb: 'motion_on_line', title: 'Going and coming back', axis: {range: [-4, 8], unit: 'm'}, object: 'car',
      moves: [{t: 0, x: 0}, {t: 3, x: 6}, {t: 4, x: 6}, {t: 7, x: -3}], marks: [{x: 6, label: 'P'}], graph: true,
      readouts: ['t', 'x', 'displacement', 'v', 'distance']},
    status: 'trial',
  },
  scale_compare: {
    subjects: ['physics'],
    concepts: ['point object', 'particle approximation', 'size compared with distance', 'scale', 'order of magnitude'],
    kinds: ['comparison', 'model'], motions: ['zoom', 'value_change', 'labels'],
    use_when: "whether a moving object can be treated as a point: its length against the distance it moves, drawn to scale, with L/D shown; the same object in two situations (a train beside a platform and on a long route; a bus on a route and turning into a parking bay) belongs in ONE beat as two cases, so the contrast is seen",
    not_when: 'comparing sizes of things that do not move apart (use a diagram), or astronomical scales beyond 3 cases',
    fields: {object: 'car | bus | train | bicycle | ball | block', length: 'its length in metres',
      cases: "1–3 {label, distance in metres, setting: route | platform | road | parking}; each at least the length; the setting draws the distance as the narration names it (a platform beside the train, a road, a parking bay, or a route)",
      title: 'short title'},
    example: {verb: 'scale_compare', title: 'Is a train a point?', object: 'train', length: 25,
      cases: [{label: 'Beside a 100 m platform', distance: 100, setting: 'platform'}, {label: 'Delhi to Agra, about 200 km', distance: 200000, setting: 'route'}]},
    status: 'trial',
  },
  path_length: {
    subjects: ['physics', 'maths'],
    concepts: ['path length', 'distance travelled', 'displacement', 'average speed', 'average velocity', 'round trip',
      'average speed and average velocity', 'distance and displacement'],
    kinds: ['comparison', 'process'], motions: ['translate', 'draw_on', 'value_change'],
    use_when: 'path length (distance travelled) against displacement, or average speed against the size of average velocity: a walker on a winding route seen from above, a road with turns, or a round trip back to the start (zero displacement)',
    not_when: 'motion along one straight line with positions on an axis (use motion_on_line)',
    fields: {area: '[width, depth] in metres of the ground seen from above (depth at most 3/4 of width)',
      route: '2–30 points [x, y] in metres on it, in order', smooth: 'true for a curving trail through the points, false for straight legs',
      back: 'true: return to the start along the same route (round trip)', duration: 'seconds the animation takes (2–60), steady speed', trip_seconds: 'the real time of the trip in seconds (a 10-minute walk: 600), for the clock and the averages',
      mover: 'figure | dot', labels: '{start, end}: short place names', title: 'short title'},
    example: {verb: 'path_length', title: 'Path length or displacement?', area: [400, 240], smooth: true, duration: 8, trip_seconds: 600, mover: 'figure',
      route: [[20, 40], [110, 200], [200, 60], [290, 190], [380, 80]], labels: {start: 'Home', end: 'School'}},
    status: 'trial',
  },
  stage: {
    subjects: ['physics'],
    concepts: ['projectile motion', 'range', 'time of flight', 'inclined plane', 'friction', 'rolling motion', 'collision',
      'conservation of momentum', 'elastic collision', 'inelastic collision', 'uniform motion', 'acceleration down a slope'],
    kinds: ['process', 'apparatus', 'model'], motions: ['translate', 'rotate', 'labels', 'value_change'],
    use_when: 'general props in any scene: a person thinking with a bulb lighting up over the head (a new idea, a question), a stopwatch running, a speedometer reading a moving car; and a mechanics situation acted out with real objects: a ball fired from a cannon or thrown off a table (projectile), a block sliding or a ball, cylinder or ring rolling down a wedge, carts or blocks colliding (elastic or sticking), a cart at constant speed; the motion is computed from the numbers, so ranges, times and speeds are exact',
    not_when: 'a motion only along a marked x-axis with position readouts (use motion_on_line), a graph (use graph), or a situation with forces that vary in time (springs oscillating, circular motion)',
    fields: {width_m: 'the stage width in metres (things must stay on it)', ground: 'floor | grass | none',
      items: "{id, object (from the props list, or figure: a person), x in metres (the base's middle), on: id of a support it rests on (table, block, plank, wall), or of a figure for a bulb over its head, or y, size in metres, facing 1 | -1, a (a wedge's angle, a cannon's barrel angle), label, mass in kg, pose (a figure's first pose), follows (a speedometer: the mover whose speed it shows; params {max, unit: m/s | km/h})}",
      events: "{t in seconds, item, kind} and: move {to, duration, ease?} (a figure walks); pose {pose: think | point | cheer | shrug | stand} for a figure; light {on} for a bulb; run {duration} for a stopwatch; launch {speed m/s, angle°, from: cannon id?}; slide {on: wedge id, friction μ?, then: seconds along the ground after}; roll {on: wedge id, then?}; collide {with, speed m/s, elastic true|false, after: seconds}",
      arrows: '{item, dx, dy in metres, kind: velocity | force | direction, label, t0, t1}', labels: '{text, x, y in metres, t0, t1}',
      readouts: "{item, show: ['x', 'height']}", title: 'short title'},
    example: {verb: 'stage', title: 'A ball fired from a cannon', width_m: 40, ground: 'grass',
      items: [{id: 'cannon', object: 'cannon', x: 2, size: 2, a: 40}, {id: 'ball', object: 'ball', x: 2, size: 0.5}],
      events: [{t: 0.5, item: 'ball', kind: 'launch', from: 'cannon', speed: 18}], readouts: [{item: 'ball', show: ['x', 'height']}]},
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
