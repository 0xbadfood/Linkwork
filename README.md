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

See [DESIGN.md](DESIGN.md) for the model (rigs, solver, skins, tracks, props, verbs and checks), the use cases it is
built for and the plan. MIT licence.
