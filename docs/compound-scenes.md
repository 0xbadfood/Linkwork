# Compound scenes: more than one verb on a canvas

Status: decided and built (src/compose.ts), with smoke tests passing (2026-10-26). This is the first task of Linkwork Studio. The studio's
second step, animating with verbs, needs several verbs on one canvas, and that has to be part of Linkwork, not the
studio. A film renderer and the studio must play the same compound scenes.

## The question

A verb compiles a spec into one scene: a 1920×1080 drawing whose every frame is a pure function of time, with
readouts measured from its own drawing and checks that know its physics. How should two or more verbs share a canvas?

Real cases this must allow:

1. **Side by side:** a ball thrown up from a building (motion_on_line, upright), next to its y–t graph (graph), on one
   clock.
2. **Overlay:** a scene with a thinker whose bulb lights up in a corner (stage's general props), as a layer on top.
3. **Sequence:** one verb, then another in the same place: adding on a number line, then the same sum as vectors.
4. **Linked:** the graph's tracer is exactly where the ball is, because both are computed from the same motion.
5. **Later, interacting:** a cart from one verb hits a block from another. This is physics between parts.

## Options

**A. Layers only.** Full-frame scenes stacked with a z-order.
- Simple.
- But every verb lays out the whole frame, with its drawing on the left and its panel on the right, so two of them
  collide.
- Overlay (case 3) works; side by side (case 1) doesn't.

**B. Geometry: parts in boxes.** Each part is a verb spec, or a ready scene, placed in a box on the canvas, with its own
start time and a layer.
- The part is compiled at its box's size. Every verb already lays out from `width` and `height`, with `k = H / 1080`
  for type, so a part reflows to its box instead of being shrunk.
- It is drawn translated into the box and clipped to it.
- Each part keeps its own coordinates, ids, readouts and checks, untouched.
- Layers are just parts whose boxes overlap, in z-order. Sequence is just start times.

**C. One merged world.** The parts' actors and props are rewritten into one scene:
- ids get namespaces;
- coordinates are offset;
- every key, driver, `show` and trail is shifted in time.

This is the only option where parts can touch physically (case 5), but:
- the rewriting is wide and fragile: every prop type and every time field;
- a verb's checks no longer run on its own scene;
- a planner can't reason about the result.

## Decision

**B, geometry-based parts, with layers as z-order among them.**

- **A compound is a scene with `parts`.** It can also have its own props, such as a title or captions drawn over
  everything.
- **Parts are drawn by reference.** `frame` gives each part's own frame at its local time, and `svg` draws it inside
  `<g transform="translate(x y) scale(s)" clip-path>`.
- **Old renderers keep working.** Nothing is flattened, so a renderer that calls `svg(scene, t)` and reads
  `scene.duration`, like the film renderer, plays compounds unchanged.

**Links are by clock and by data, never by reaching into another part's drawing.** For case 4, the compound gives
the graph the same motion the ball has, the formula y(t), and starts both on the same clock, so the tracer and the
ball agree because they compute the same function. A link is written once in the compound: a part's spec field is
filled from another part's computed facts (`links`, below). Code checks the link, so they can't drift.

**Case 5 (interacting parts) stays inside a verb.** `stage` already makes carts and blocks collide in one world.
When two things must touch, they belong in one verb's spec, not in two parts. If that ever proves too tight, option
C can come later for actors only; nothing in B blocks it.

## Format

```json
{"linkwork": 1, "compound": true, "width": 1920, "height": 1080, "fps": 30, "theme": "dark",
 "parts": [
   {"id": "throw", "box": [0, 0, 760, 1080], "spec": {"verb": "motion_on_line", "...": "..."}},
   {"id": "graph", "box": [760, 0, 1160, 1080], "start": 0, "spec": {"verb": "graph", "...": "..."}},
   {"id": "idea",  "box": [1500, 40, 380, 380], "start": 2, "layer": 2, "spec": {"verb": "stage", "...": "..."}}
 ],
 "props": [{"id": "caption", "type": "text", "x": 960, "y": 1040, "text": "...", "align": "middle"}]}
```

| Field | Meaning |
|---|---|
| `box` | `[x, y, w, h]` on the canvas; default the whole canvas. |
| `spec` | A verb spec, compiled at `w × h` (so it reflows to the box). |
| `scene` | Alternatively, a ready scene, scaled uniformly to fit the box and centred in it. |
| `start` | When the part's clock starts, in seconds; default 0. Before it, the part is not drawn. |
| `until` | When it disappears; by default it holds its last frame to the end. |
| `layer` | z-order; default 0. A part on a higher layer is drawn without its paper background, so it overlays. |
| `after` | Start when that part ends (plus `start`, as a pause); the earlier part gives way. A sequence in one place. |
| `wait` | Show the first frame before the part's clock starts, instead of nothing. A linked part waits by default. |

The compound's `duration` is the latest `start + part duration`. Parts take the compound's `theme` and `fps`.

## Checks

A compound is checked as:

- **each part, in its own frame:** the scene checks and the motion checks, reported as `part <id>: ...`;
- **every box inside the canvas;**
- **no two boxes on the same layer overlapping** (overlays must be on a higher layer);
- **legibility:** a part's smallest text, as drawn, must be at least 18 px on a 1080-high canvas. A short box
  shrinks a verb's type with `k = H / 1080`, and a 2×2 grid of 960×540 parts breaks this on purpose;
- **links:** the field a link fills must match the source's computed value.

## Smoke tests (they decide whether the design holds)

1. **Side by side:** a throw from a 25 m building, beside its y–t graph, on one clock. Both must pass their checks
   in their boxes, and the graph's tracer must be level with the ball at every frame.
2. **Overlay:** the throw, full canvas, with a thinker and bulb on layer 2 in the top-right corner from t = 2 s.
3. **Sequence:** a number-line sum, then vectors in the same box from when the first ends.
4. **Too small:** four verbs in a 2×2 grid. Legibility must refuse it, naming the parts.

Each smoke is compiled, checked and rendered to PNG at several times, then looked at.

## Smoke results (2026-10-26)

| Smoke | Result |
|---|---|
| Side by side | Passes. The graph's tracer reads the ball's height within 0.05 m at every sampled time. **Found:** `motion_on_line` kept its panel at 0.66 W, so a readout left a 760-wide box; the upright layout now follows its column in narrow boxes. **Found:** a linked part was blank until its clock started, hence `wait`. |
| Overlay | Passes: the thinker and its bulb are drawn over the throw from t = 2 s. **Found:** bold titles overran their panel (the line-wrap estimate was for regular text); wrapping now allows 0.6 of the size per glyph, for every scene. |
| Sequence | Passes: the vectors start 0.5 s after the number line ends, in the same box, and the line gives way. |
| Too small | Refused as designed: all four parts are named (text at 14–17 px). It lives in the tests, not `examples/`. |

The design holds. What the smokes found were verb layouts that assumed a 16:9 frame. Narrow and short boxes will
keep finding these, one verb at a time, and the studio's canvas is where they will show.

## Effects on the rest

- **Film renderer:** none. It calls `svg(scene, t)` and reads `duration`.
- **Planners:** later, a beat may be a compound, so the beat sheet can say "the throw beside its graph". Not yet.
- **Studio:**
  - The canvas edits a compound: boxes are dragged and sized, and each part's spec edited.
  - The timeline shows the parts' start times.
  - Checks run on every edit.
  - Verbs that read badly in narrow or short boxes show up here, and get layout fixes in the verb itself.
