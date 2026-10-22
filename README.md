# Linkwork

Jointed figures and mechanisms from plain data. A stick figure, a pendulum, a ladder sliding down a wall or a
ball-and-stick molecule is a **rig**: points joined by bones, with rules about how they may move. You write a scene
as JSON (poses over time, IK targets, motion from physical formulas, simple props), and Linkwork checks it and draws
any moment of it as SVG. It needs no GPU and no image model, and the same scene always gives the same frames.

It was made for school explainer films (NCERT physics, chemistry, biology and maths), so it puts truth first: where
physics decides a motion or a number, code computes it, and the checks refuse scenes that break it.

```sh
node src/cli.ts verbs                                  # what it can compile
node src/cli.ts check examples/balmer.json             # plain-language errors, exit 1 if any
node src/cli.ts svg examples/balmer.json --t 6 -o f.svg
node src/cli.ts frames examples/add-negative.json --out frames/
```

Node 23.6 or later runs the TypeScript directly; there are no runtime dependencies. In a bundler (Remotion, Vite)
import `src/index.ts`.

## Verbs

A verb turns a short spec into a full scene and checks the spec first.

- `energy_ladder`: an electron (the figure) on hydrogen's energy levels, drawn as ladder rungs at their true heights.
  Photons are absorbed and emitted, each with its energy gap, wavelength (λ = hc/ΔE) and true colour. Jumps are
  quantum jumps, with no in-between.
- `number_line`: hops along a number line for adding and subtracting, negatives included.
- `sliding_ladder`: a ladder sliding down a wall, its base, height and angle measured live (x² + y² = L²).
- `pendulum`: a simple pendulum, T = 2π√(L/g), timed swing by swing.
- `compass_arc`: a pair of compasses drawing an arc or a circle of a given radius.
- `slider_crank`: a crank, connecting rod and piston; the piston follows x = r cos θ + √(l² − r² sin² θ).

- `domain_range`: a figure walks the x-axis and is stopped by walls where f is undefined; the curve's shadow on the
  y-axis fills the range. The domain and range you claim ("x >= 0", "y != 0") are checked against f.
- `extrema`: a tangent rod on a hinge tied to the curve; it is level, slope 0, exactly at each maximum and minimum.
- `secant_to_tangent`: Q slides into P and the slope of PQ approaches f′(a).
- `area_under`: the area swept and measured, then Riemann sums closing in on the exact integral.
- `vector_add`: two vectors head to tail, the sum, its components and its length.

Functions are written in a small, safe expression language (`"x^3 - 3x"`, `"sqrt(x)"`, `"sin(x)/x"`): parsed, never
run as code, and differentiated exactly.

Numbers on screen are **readouts measured from the drawing** (a distance, an angle, a time), so they always agree
with what is shown.

```json
{"verb": "energy_ladder", "start": 1,
 "events": [{"at": 1.6, "kind": "absorb", "from": 1, "to": 3}, {"at": 5.5, "kind": "emit", "from": 3, "to": 2}]}
```

## In a film (Remotion)

```tsx
import {svg, type Scene} from 'linkwork';
const Frame = ({scene}: {scene: Scene}) => {
  const frame = useCurrentFrame(), {fps} = useVideoConfig();
  return <AbsoluteFill dangerouslySetInnerHTML={{__html: svg(scene, frame / fps)}}/>;
};
```

Planning a scene with a model? Put [LEARNINGS.md](LEARNINGS.md) in its system prompt.

See [DESIGN.md](DESIGN.md) for the model (rigs, solver, skins, tracks, props, verbs and checks), the use cases it is
built for and the plan. MIT licence.
