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
- `vector_add`: vectors to scale: adding (head to tail or parallelogram), subtracting, multiplying by a number, equal
  vectors, resolving into components with î and ĵ, adding by components, the scalar product a·b and the vector
  product a × b (the parallelogram's area, ⊙ or ⊗ by the right-hand rule).
- `plane_motion`: a mover in a plane with its position vector, tangent velocity, acceleration and velocity components
- `forces`: a free-body diagram drawn to scale, unknown forces solved by the second law (equilibrium or a given acceleration), components, net force and the closed force triangle; friction building up to slipping under a growing push or a tilting plane; a hung mass's rope pulled sideways at P (hang), the same θ for any rope length or point
- `work`: work done by a constant force on a moving body: W = F d cos θ (positive, zero or negative), −f d for friction, the net work and kinetic energy growing together (the work-energy theorem), final speed and power; a falling body (gravity's +mgh, resistance's negative work from ΔK); equal climbers on the same stairs in different times
- `energy`: mechanical energy as a body moves (a drop, a slope with or without friction, two tracks from one height, a pendulum, a block into a spring): live bars of kinetic, potential, heat and total energy, every speed and compression computed
- `vertical_circle` (trial): a bob on a string in a vertical circle, v from energy and T from T − mg cos θ = mv²/L at every angle; the book's bob (T = 6mg at A, string just slack at the top C with v = √(gL)), slack before C when slower; the instant at C alone; the bob held at an angle with its forces
- `collision_2d` (trial): smooth balls colliding in a plane, m2 at rest, outgoing directions set by the impact parameter (impulse along the line of centres); momentum along x and y, elastic or with restitution; θ1 and θ2, velocity names or values, momentum components; equal masses part at right angles, b = 0 is the 1-D case
- `centre_of_mass`: the CM of point masses (X = Σmx / Σm), of uniform rods, rectangles, discs, rings and triangles (symmetry lines or medians) and laminas built of them; a projectile bursting in flight, its CM keeping to the parabola; a lamina hung from points in turn, plumb lines crossing at the CG (or "?" along them for the misconception)
- `moments`: a beam on a pivot or two supports: clockwise and anticlockwise moments balanced (one unknown force or distance solved) or tipping, both support reactions, a lever's mechanical advantage, a couple turning a free rod, a ladder leaning on a smooth wall with W, the wall's reaction and the floor's N and friction (solved by moments about its foot)
- `rotation`: a rigid body turning about a fixed axis: I from the book's formulas, ω and θ under α or a torque (α = τ / I), v = ωr on particles, L = Iω, ½Iω², work τθ and power τω; masses sliding along a spinning rod with L conserved; a machine's rpm rising in t seconds, read live
- `orbit`: a planet on its Kepler ellipse sweeping equal areas in equal times; planets' periods with T² / a³ the same; Newton's cannon (falls back, circles at v₁, an ellipse, escapes at vₑ); a satellite's speed, period and energies (E = −GMm / 2r)
- `gravity_law`: two masses pulling each other, F = G m₁ m₂ / r², moved apart step by step; g against distance from a planet's centre, at a height or a depth
- `elastic`: solids under stress from the book's moduli, drawn larger than real: a wire (or wires end to end) stretched, ΔL = FL / AY, thinning (Poisson's ratio) and storing ½ F ΔL; a rod pressed; a block sheared (θ ≈ Δx / L); a body squeezed in a fluid (ΔV/V = p / B); a metal's stress-strain curve beside its wire (yield, fracture, permanent set) or a rubber-like one; a beam sagging, flat and on its edge; a spring and putty (elastic and plastic)
- `fluid_pressure`: a liquid at rest: P = Pa + ρgh at depths with the walls pushed normal to them and the force on a window; vessels of different shapes filling to one level; a barometer (h = Pa / ρg); a U-tube manometer, or two liquids balanced on mercury; a hydraulic lift (F₂ = F₁ A₂ / A₁)
- `fluid_flow`: a liquid in motion: continuity in a narrowing pipe (particles faster where streamlines crowd); Bernoulli's three terms at two sections; Torricelli's jet; lift past a ball, a spinning ball, a wing; viscous layers (η = (F/A)/(v/l)); a sphere reaching terminal velocity (Stokes)
- `surface_tension`: molecules at the surface; a soap film pulling a slider (S = F / 2l); a drop's angle of contact and the three tensions; excess pressure in a drop, cavity or bubble (2S/r, 4S/r); capillary rise and fall (h = 2S cos θ / ρga)
  (constant acceleration, x(t) and y(t), or a circle); Δr/Δt becoming the velocity; uniform circular motion with Δv.
- `graph` (trial): any quantity against another, from a formula in the axis's own variable or the book's data; a tracer
  with readouts, a tangent with its slope, a shaded area, marked points (v–t, Boyle's law, periodic trends, heating curves).

- `motion_on_line` (trial): an object (dot, walker, car, bus, train, cyclist, ball, block) moves along an x-axis with its
  origin and direction marked; between given positions it moves at constant velocity. Time, position and displacement are
  read off the drawing; each stretch's velocity and the distance covered are computed; its x–t graph can draw itself.
  The axis can stand upright (the ground and a building drawn) and the motion can be uniformly accelerated
  (`accelerate: {x0, v0, a}`): a ball thrown up from a building, a stone dropped from rest, marked every second so the
  growing distances (1 : 3 : 5) show.
- `scale_compare` (trial): an object's length against distances, drawn to scale: it shrinks to its true size beside each
  distance and L/D is shown (when can a train or a bus be treated as a point?).

- `ray_diagram` (trial): a plane, concave or convex mirror or a convex or concave lens, with an object at one distance
  after another (or a parallel beam from infinity): the image comes from the mirror or lens formula (New Cartesian
  signs), the principal rays are drawn to meet exactly at it (dashed behind for a virtual image), and the image is
  described as the book's tables do; u, v, f, m with signs, the formula with numbers, a lens's power in dioptres.
- `eye` (trial): the eye as a lens and a screen: accommodation (40 to 44 D), myopia and hypermetropia or presbyopia,
  and the concave or convex lens of computed power that corrects each (rays from the far or near point); distances
  outside the eye compressed and the focus's miss drawn 10× wider, as the book's figures do, and said so.
- `atmosphere` (trial): atmospheric refraction traced through air of rising refractive index: a star seen higher than
  it is, twinkling (a planet steady); the Sun seen above the horizon about 2 minutes before it rises.
- `scattering` (trial): the Tyndall effect, a blue sky (1/λ⁴), a white noon Sun and a red sunset (colours computed from
  the air crossed), and red lamps carrying farthest through fog.
- `circuit` (trial): a circuit with the book's symbols solved by Ohm's law: cells, key, ammeter, voltmeters; resistors,
  bulbs, ρl/A wires and rheostats in series and parallel groups; branch currents, power, glowing bulbs, moving charges.
- `prism` (trial): light through a triangular prism, traced colour by colour with Cauchy refractive indices: one ray with
  i, r, e, A and the deviation D; white light dispersed into VIBGYOR (spread drawn wider, and said so); Newton's second
  prism recombining it; a raindrop with one internal reflection (red at 42.4°, violet at 40.7°).
- `refraction` (trial): a ray entering another medium, or crossing a glass slab and coming out, bent by Snell's law with
  the book's refractive indices; i and r from the normal, sin i ÷ sin r for several angles, the speed of light in each
  medium, the slab's lateral shift, and total internal reflection past the critical angle.
- `tir` (trial): total internal reflection at work: an optical fibre, core and cladding, its ray trapped beyond the
  critical angle or leaking out within it, a fibre bent too tightly leaking at the bend (or gently bent and still
  trapped), light lost along it to absorption and scattering, and right-angled prisms turning light through 90° or
  180° or inverting it.
- `refracting_surface` (trial): refraction at one spherical surface (n2/v − n1/u = (n2 − n1)/R), and a thin lens as
  two surfaces in turn, the first's image I1 then F: the lens maker's formula.
- `prism_deviation` (trial): a prism's ray at one angle of incidence after another with each deviation plotted, the
  minimum deviation with the symmetric ray, n = sin[(A + Dm)/2]/sin(A/2), and the prism in water.
- `optical_instrument` (trial): the simple and compound microscope, the refracting and the Cassegrain telescope, true
  to scale, with their magnifying powers; and two or three thin lenses in a line, each image the next lens's object,
  m = m1 × m2.
- `huygens` (trial): secondary wavelets and their envelope from a spherical or plane wavefront, a point source at a
  lens's focus leaving on plane wavefronts, and the book's constructions of refraction and reflection of a plane wave.
- `interference` (trial): two sources' bright and dark lines traced, Young's fringes from 4I0 cos²(πxd/λD) with
  β = λD/d (one or two wavelengths, or white light), and intensity against path difference beside 2I0.
- `diffraction` (trial): the single slit's pattern from (sin β/β)², minima at nλ/a, and the slit cut into halves,
  thirds or quarters that cancel in pairs; and the limit of ray optics: an aperture against λ, the beam straight within
  the Fresnel distance a²/λ and spreading beyond, the Fresnel number a²/λL.
- `polaroid` (trial): Malus' law with the pass axes in perspective and I against θ, a polaroid between crossed ones, an
  unpolarised wave whose plane of vibration changes at random, and one polaroid turned alone, I0/2 at every angle.
- `photoelectric` (trial): the photoelectric effect from h, e and a metal's work function: the energy picture (Kmax = hν − φ₀, or no emission below ν₀), the apparatus with a retarding potential, photocurrent against collector potential, V₀ against ν (slope h/e), and photons.
- `matter_wave` (trial): de Broglie's λ = h/p for an electron, drawn to one scale against a crystal's atoms, and a ruler of lengths placing a ball's λ beside a nucleus.
- `rutherford` (trial): Thomson's and Rutherford's atoms crossed by α-particles, α paths past a gold nucleus integrated under Coulomb repulsion (cot(θ/2) = 2b/d), and a head-on α stopping at the distance of closest approach.
- `bohr` (trial): hydrogen's classical orbit (K, U, E) and its spiral collapse, Bohr's orbits to one scale, de Broglie's standing wave round an orbit, the energy levels with the Lyman to Pfund series, and a series' lines on a wavelength strip.
- `nucleus` (trial): nuclides as protons and neutrons (isotopes, isobars), nuclei to one scale (R = 1.2A^⅓ fm), mass defect and binding energy, the binding energy per nucleon curve with fission and fusion, the nucleon-pair potential, α, β and γ decay, rays bent in a field and stopped by paper, aluminium and lead, U-235 fission, chain reactions, and the book's fusion reactions and p-p cycle, every Q from the masses.
- `semiconductor` (trial): energy bands of metals, insulators and semiconductors (C, Si, Ge, Sn to one scale), the Si lattice with a broken bond and a moving hole, As and B dopants, n- and p-type carriers (nₑnₕ = nᵢ²), donor and acceptor levels, a p-n junction's depletion layer and barrier, forward and reverse bias, the diode's V-I curve with its cut-in and dynamic resistance, and half- and full-wave rectifiers with a capacitor filter.
- `kirchhoff` (trial): a network of resistors and cells of any shape, solved exactly (modified nodal analysis): junctions on a grid, branches with resistors, cells and named points, every branch current at its true direction or the book's labels, a junction's in = out, and a loop walked with each change in potential summed to zero (NCERT Example 3.6, Fig. 3.15).
- `magnetic_field` (trial): field lines traced from computed fields of magnets, wires, loops and solenoids, with
  filings, compasses and the thumb rule; a close-up of a few solenoid turns whose fields cancel between neighbours.
- `magnetic_matter` (trial): a dipole's torque and energy, Gauss's law for magnetism, H, M and B in a core, dia-, para-
  and ferromagnets, domains, hysteresis, and B, H and M kept apart as three named vectors (1 T = 10⁴ G).
- `em_waves` (trial): displacement current, the plane wave, a wave in glass, a charge at rest, moving or oscillating
  (its swing dying as the waves carry its energy off), Hertz's spark gap and receiver built in the narration's order,
  and the spectrum.

- `stage` velocity arrows: v and its components vₓ and vᵧ follow a mover's computed velocity as it flies (vₓ unchanged,
  vᵧ zero at the top), with faint snapshots left along the path: the textbook's projectile figure.

## Labels and points of your own (annotate)

Any verb spec may add `annotate`: up to 8 `{text?, at, point?, t?, colour?}`. `at` is a point the verb names
(ray_diagram: `P`, `F`, `C`, `O`, `F1`, `2F2`, `object`, `image`, `incidence`; refraction: `incidence`, `normal`,
`exit`) or `[x, y]` in the verb's own units (a plane's axis numbers, a stage's metres, ray_diagram's cm). It is
optional, so the same verb serves a teaching film and a worked problem; a label gets a halo so it reads across lines,
and an unknown point is an error listing the ones there are. Without numbers (`illustrative`), a point's name such as
2F₁ is kept.

## Compound scenes

Several verbs on one canvas: each part is a verb spec in a box, compiled at the box's size, on its own clock (`start`,
`after`, `layer`). A `trace` link makes a graph plot and trace another part's motion in step with it. See
`docs/compound-scenes.md` and `examples/compound-*.json`.

## Objects

The common things of physics problems are drawn by code, as an `object` prop: `car`, `bus`, `train` (with carriages and
smoke), `bicycle` (with its rider), `block`, `wedge` (its angle marked), `pulley` (a block on each rope), `sling` (a stone
on a string, with its path and velocity arrow) and `ball`. Only the motion is given; what follows from it is computed:
wheels roll exactly as far as the object moves (no skid), the pedals turn with them, smoke trails a moving engine and
thins when it stops, a pulley's wheel turns with its rope. Key `x` (or anchor the object to an actor) to move it; `a` and
`b` drive a wedge's angle, a pulley's ropes or a sling's angle.

```json
{"id": "engine", "type": "object", "name": "train", "x": 300, "y": 800, "size": 360, "params": {"cars": 2},
 "keys": {"x": [[0, 300], [6, 1500, "inOut"]]}}
```

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
