# Linkwork: design

Linkwork draws and animates jointed things (figures, mechanisms and molecules) from plain data. It runs without a GPU
or an image model, and it draws every frame exactly the same each time.

A thing is a **rig**: points joined by bones, with rules about how they may move. A stick figure is one rig. A
pendulum, a ladder sliding down a wall, a compass, a crank, an arm with its muscles and a ball-and-stick molecule are
others. Motion is data (poses, targets and physical formulas), so a scene is a JSON file a person or an LLM can write
and code can check before anything is drawn.

Licence: MIT. Started 2026-10-23 for NCERT explainer films; meant from the start as a library others can use.

## Objectives

1. **One core for every jointed thing.** No special code per rig; figures, linkages and molecules differ only in
   their data (bones, constraints and skins).
2. **Data in, frames out.** A scene is versioned JSON. `frame(scene, t)` is a pure function, and `svg(scene, t)`
   draws it. The same scene gives the same pixels on every machine.
3. **True motion.** Where physics or maths decides a motion (a projectile's arc, a pendulum's swing, an electron's
   energy levels and photon colours), it comes from a formula in code, not from keyframes someone guessed.
4. **Checked before drawn.** `check(scene)` returns plain-language errors: unknown parts, a pose the rig can't
   reach, feet sinking into the floor, parts leaving the frame, motion too fast to follow, and the physics checks
   of each verb.
5. **High-level verbs for writers and LLMs.** "Hop from rung 1 to rung 3 when the photon arrives" compiles to a
   low-level scene. Writers rarely touch joint angles.
6. **Runs everywhere a browser or node does.** It is plain TypeScript with no dependencies: in Remotion for films,
   in a web page for interactive notes and quizzes, and in node for the command line and checks. Python pipelines
   call the command line and never re-implement anything.
7. **Fits the explainer films.** It uses the theme tokens, places labels on named joints, and gives a highlight
   pulse at a time, so narration-timed labels work as they do for the diagram figures.

## Not goals (deliberately)

- **3D.** It is 2D with a drawing order; facing left is a mirror.
- **Physics simulation.** It never integrates forces over time. Motion is formulas plus keyframes, so every frame
  is exact and can be checked.
- **Character art.** Skins are geometric (lines, capsules, circles, SVG paths per bone). Painted characters belong
  to the image pipeline.
- **Soft bodies, ropes and cloth.** These can come later as chains of short bones.

## Use cases it must allow (these decided the design)

| Area | Examples | Needs |
|---|---|---|
| Physics | electron on an energy ladder; push, pull and friction; walking for speed; throwing for projectiles; a seesaw; pulleys; a pendulum; a spring and mass; a crank and piston; a skater pushing off | formula drivers; an object handed from a hand to a path; springs |
| Maths | hops on a number line; a ladder sliding down a wall; heights and distances; a compass drawing an arc; angles and clock hands; reflecting a figure; fun characters | sliders and closed loops; pen trails; expressions |
| Chemistry | bond stretching and bending; rotation about a bond; chair and boat cyclohexane | bones of fixed length with angle limits; atoms as joints |
| Biology | the elbow as a lever with the biceps and triceps; earthworm, fish and bird motion; insect legs; heart valves as hinges; plants bending towards light | bones that change length; SVG art on bones; long chains |
| Solutions | the people and objects in word problems (a boat crossing a river, a lift, a train) | several actors, props, checked motion |
| Notes and quizzes | drag an angle, pose an arm | the same core, interactive in a browser |

### Maths on a plane (user, 2026-10-23: "vectors, calculus and what not")

Much of school maths is motion on a coordinate plane, so a **plane** is a core layer, not a verb:

- **Axes:** a mapping between maths coordinates and the scene, with ticks, a grid and labels. Props and rigs can be
  placed in maths units.
- **Curves:** drawn from expressions, using a small, safe expression language (numbers, x and t, + − × ÷ ^, sin,
  cos, exp, log, sqrt, abs, and named parameters). It is parsed, never evaluated as code. The same language drives
  formulas everywhere else.
- **Sliders on a path:** a joint can slide along a curve, not only a line. A tangent is then a rod on a point that
  slides along the curve, and a secant turning into a tangent is two points with one moving in.
- **Regions:** the area under a curve, between curves, or Riemann rectangles that refine, all computed from the
  curve.
- **Vectors:** arrows with components, joined head to tail, the resultant, resolving along axes. A figure can walk
  each vector in turn.

Use cases added by the user (2026-10-23): **domain and range** shown by walls on the x-axis where f is undefined,
and **maxima and minima** by a hinge tied to the curve whose tangent rod goes level at each.

Verbs built on it: `domain_range`, `extrema`, `vector_add`, `components`, `river_crossing` (relative velocity), `tangent_slope`,
`secant_to_tangent`, `area_under`, `riemann_sum`, `graph_walk` (a figure walking a graph: rising, falling, turning
points). Every number shown is computed and checked: slopes from derivatives found by exact differentiation of the
expression, areas by integration with an error bound.

**Where manim fits:** manim (MIT) is already in the pipeline for LLM-written animation code. Linkwork verbs cover
the common, repeated explanations as checked data specs: cheaper and more reliable, with no code generation and no
sandbox. manim stays the tool for one-off animations that no verb covers.

## Concepts

Coordinates are scene units with y pointing down, as in SVG. Angles in data are degrees, counter-clockwise as you
look at the screen, with 0 pointing right. A rig has its own units (the figure uses centimetres, so it is 174 tall),
and an actor's `scale` maps them to the scene.

### Rig

A tree of bones from a root joint, plus extra constraints.

```json
{"id": "figure", "version": 1, "root": "hip",
 "bones": [{"id": "spine", "from": "hip", "to": "neck", "length": 62, "angle": 90},
           {"id": "shin_l", "from": "knee_l", "to": "foot_l", "length": 44, "angle": 0, "stretch": false}],
 "contacts": ["foot_l", "foot_r"],
 "poses": {"stand": {"spine": 90, "...": 0}},
 "links": [], "pins": [], "sliders": []}
```

- A bone's `angle` is relative to its parent bone (the bone that ends at its `from` joint); a bone at the root is
  relative to the actor's turn. Forward kinematics turns angles into joint positions.
- **Links** are extra distance constraints between two joints, which close loops (a four-bar linkage, a ladder
  between a wall and a floor). **Pins** fix a joint to the world. **Sliders** keep a joint on a line.
- **Contacts** are the joints that may rest on a surface (feet, hands, the ends of a ladder).
- Named **poses** live in the rig. A pose may be partial (only the arms), so poses can stack.

### Solver

1. Forward kinematics from the pose angles gives a first guess that already has knees and elbows bent the right
   way.
2. Then a fixed number of position-based iterations satisfy, in order: IK targets, pins, sliders, links and bone
   lengths. The root is fixed unless a constraint needs it to move.
3. If the residual stays above a tolerance, the solve has failed and `check` reports it.

This one solver covers IK (a hand on a box), closed loops and sliders, so no rig needs its own code.

### Skin

How a rig is drawn: a style per bone (`line`, `capsule`, `head` circle, or `svg` art placed along the bone), a
drawing order and a line weight. A skin uses theme tokens, never raw colours. Expressions (eyes and mouth states)
are part of the figure's skin. One rig can wear several skins (a stick figure, a bone diagram, a molecule).

### Actor and timeline

An actor is a rig with a skin, a place, a scale and a facing, plus tracks:

- `pose`: keys `{t, pose, ease}`. Angles are interpolated (never positions, so limbs keep their length). Named and
  inline poses mix.
- `root`: keys `{t, at:[x,y], ease}`, or a **driver** over an interval: `arc` (a hop), `projectile` (v and angle
  under g), `pendulum` and `sine`. Drivers are named functions with numeric parameters, so data never contains code.
- `ground`: the surface each contact stands on over time. While planted, the solver shifts the root so the lowest
  contact sits on it, and `check` reports a sinking or floating foot.
- `ik`: `{t0, t1, joint, target}`, where a target is a point or another element's point (a prop's handle, another
  actor's hand).
- `blink`: intervals where a jump is meant (a quantum jump, a cut). The speed check skips them.
- `expression`, `opacity`, and `pulse` times.

### Props and effects

Simple shapes with timelines: `line`, `polyline`, `rect`, `circle`, `text`, `arrow`, `wave` (a photon or a sound
wave that travels), and `group`.

- Any numeric field can be keyed: `keys: {"x": [[0, 100], [1.5, 400, "inOut"]], "opacity": [...]}`.
- `draw` (0 to 1) draws a line or path progressively.
- `show: [t0, t1]` fades it in and out.
- A text label can be anchored to an actor's joint.

### Scene

```json
{"linkwork": 1, "width": 1920, "height": 1080, "fps": 30, "duration": 8, "theme": "dark",
 "props": [], "actors": []}
```

`frame(scene, t)` gives every joint position, prop and style at time t. `svg(scene, t)` draws that as an SVG
string.

### Verbs

A verb compiles a short, meaningful spec into a low-level scene, and adds its own checks. Examples:

- `energy_ladder`: levels from the physics, photon wavelength and colour from the energy gap, and quantum jumps
  drawn as jumps with no in-between.
- `number_line`: hops of signed length that add up.

Verbs are where subjects live. The core knows nothing about electrons or numbers.

### Checks

`check(scene)` samples every frame and reports:

- references to unknown rigs, bones, poses or joints;
- solver failures (bone lengths or constraints not met);
- contacts sinking into or floating above their ground while planted;
- joints or props leaving the frame (with a margin);
- joint speeds above a readable limit outside `blink` intervals;
- each verb's own errors (an energy that doesn't match its level, a photon colour that doesn't match its
  wavelength, hops that don't add up).

## Shape of the package

```
src/
  vec.ts  ease.ts  keys.ts      maths, easing, keyed values
  rig.ts  solve.ts              rig types, forward kinematics, the solver
  scene.ts                      frame(scene, t): actors, tracks, drivers, props
  svg.ts                        frame to SVG; skins; theme
  check.ts                      the checks
  rigs/                         built-in rigs (figure; more later)
  verbs/                        energy_ladder, number_line; more later
  physics/                      light (wavelength to colour), units
  cli.ts                        linkwork check | svg | frames | compile
  index.ts                      the public API
test/                           node --test
examples/                       example scenes and verb specs
```

TypeScript is erasable-only (node 24 runs it directly; bundlers such as Remotion's import it as source). There are
no runtime dependencies.

## Integration with the film pipeline

- **Remotion:** a component calls `svg(scene, frame / fps)` and inlines the result.
- **The planner:** writes a verb spec. The pipeline runs `linkwork compile` and then `linkwork check`, and returns
  any errors to the planner as it does for other figure kinds.
- **Labels and highlights:** come from narration timing, as for the biology figures.

## v2: choosing Linkwork in a film, and growing the library (agreed 2026-10-23)

**Scope: science (physics, chemistry, biology) and maths only.** Humanities keep today's flow. Geography keeps its
own map kit.

**Why:** chapter films and key-idea films are a known, finite set. Question and solution videos are where most new
films will come from, and questions repeat a limited set of shapes: projectiles, inclined planes, pulleys,
collisions, ray diagrams, circuits, graphs and rates, areas, titration and equilibrium curves, constructions. Every
verb built during chapter work is one less thing to invent when a student asks a question, and it makes those films
faster and cheaper (no GPU, no image model).

### Verb cards

Every verb carries a card the planner reads:

- the subjects and concepts it fits;
- the registry kinds and motions it covers;
- "use when" and "not when".

The visual-needs registry is matched to verbs once per chapter, after its digest (the LLM proposes, code checks the
proposal against the card). An entry that fits is tagged with its verb, for example Fig. 2.11 "transitions of the
electron in the hydrogen atom" → `energy_ladder`.

### Per point, in order

The planner chooses for each point that needs motion. The rule of thumb: Linkwork when what changes on screen *is*
the explanation; images for how something looks or where it happens.

1. **An existing verb fits** → write its spec.
2. **It can be composed from the core** → write a low-level scene as data (plane, curves, rigs, drivers, readouts,
   events). There is no new code, and the same checks apply.
3. **A new verb can be built** (general and likely to recur) → request it from the verb build queue. Whether the
   film waits is a setting, `verb_build`, set per run and per profile:
   - `async` (the default, and always in production): the film falls back now, and the next film gets the verb;
   - `sync`: the film waits for the build, up to `verb_build_timeout` (default 20 minutes), then falls back. For
     studio experiments;
   - `off`: no builds are requested; misses are only logged.
4. **Otherwise** → manim, then images, as today.

**Code has the final say.** A spec must compile, pass every check, and the narration's numbers must match the verb's
computed facts. After one retry with the errors shown, the point falls back to the next option. A Linkwork scene can
never break a film; at worst it becomes an image scene. Every choice and every fallback is logged, and the most
frequent unmet needs become the next verbs.

### Verb lifecycle: candidate → trial → trusted

- **Built by a strong model** (Opus-class) from a queued request. Before writing, it checks that no existing verb
  nearly fits and could take one more parameter instead. Verbs must be general ("a block on an inclined plane with
  friction, given angle, μ and mass"), never written for one question.
- **A candidate ships with:**
  - its spec type and its own checks;
  - tests that prove its physics or maths against formulas;
  - an example, and rendered frames looked over by a vision model.
- **Trial:** used only in the internal studios.
- **Trusted:** after the user's review it is merged into the public repo as a pull request, and becomes usable on
  madesimple.in. It runs sandboxed until merged.
- **Each build adds what went wrong to LEARNINGS.md,** which the planner and the next verb writer both read.

**Measure:** the share of question points served by steps 1 and 2 without new code.

## Build order

1. **v0 (done 2026-10-23):** the core (rig, FK, solver, keys, drivers, props, SVG, checks, command line), the figure rig, and two
   verbs (`energy_ladder`, `number_line`). A test clip is rendered through Remotion.
2. **v1 (done 2026-10-23):** sliders, pins and closed loops in use: a ladder sliding down a wall, a compass drawing an arc, a
   pendulum, a slider-crank. Pen trails. Angle limits.
3. **v1.5, the plane (done 2026-10-23):** axes, the expression language, curves, sliders on a path, regions and vectors, with the
   first maths verbs (vector_add, tangent_slope, secant_to_tangent, area_under).
4. **v2 (see "v2: choosing Linkwork" above):** verb cards, composed scenes as data, the verb build queue and lifecycle, then film integration (planner, verb specs, checks in the loop), a clip library (walk, hop, push, throw,
   point, cheer) and more expressions.
5. **Later:** molecules, the biology arm with muscles, interactive use in the browser, and a published package.
