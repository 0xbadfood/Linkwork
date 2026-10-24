// Scenes: actors (rigs with tracks) and props (shapes with keyed fields). frame(scene, t) is a pure function that
// gives every joint position and every prop's values at time t.
import {ease, type Ease} from './ease.ts';
import {pulseAt, shown, valueAt, type Key} from './keys.ts';
import {mergePoses, place, type Pose, type Rig, type SkinOptions} from './rig.ts';
import {dfOf, fOf} from './expr.ts';
import {integrate, slopeAngle, toPlane, toScene, unitsOf, type Plane} from './plane.ts';
import {objectItems} from './objects.ts';
import {RIGS} from './rigs/index.ts';
import {solve, type Target} from './solve.ts';
import {add, angleOf, dir, dist, lerp, lerpVec, mul, sub, turnBetween, type Vec} from './vec.ts';

export type Face = 'neutral' | 'smile' | 'grin' | 'surprise' | 'focus' | 'sad' | 'none';
export type PoseKey = {t: number; pose: string | Pose; ease?: Ease};
export type BaseKey = {t: number; at: Vec; ease?: Ease};
export type Driver =
  | {t0: number; t1: number; driver: 'arc'; from: Vec; to: Vec; height: number}
  | {t0: number; t1: number; driver: 'projectile'; from: Vec; speed: number; angle: number; g: number}
  | {t0: number; t1: number; driver: 'sine'; from: Vec; axis: 'x' | 'y'; amplitude: number; period: number}
  /** Along a curve y = f(x) on a plane, with x keyed over time. */
  | {t0: number; t1: number; driver: 'curve'; plane: string; expr: string; x: Key[]; clamp?: boolean};
export type JointRef = {actor: string; joint: string};
export type IK = {t0: number; t1: number; joint: string; target: Vec | JointRef; chain?: number; fade?: number};
/** A bone's angle (relative to its parent) driven over time, on top of the pose. pendulum and sine swing about
 * `center`; spin turns at `rate` degrees a second from `from`; keys follows keyed values. */
export type AngleDriver = {bone: string; t0?: number; t1?: number} & (
  | {kind: 'pendulum' | 'sine'; center: number; amplitude: number; period: number; phase?: number}
  | {kind: 'spin'; from: number; rate: number}
  | {kind: 'keys'; keys: Key[]}
  /** The angle of the tangent to y = f(x) on a plane, at the x where the actor stands (plus `offset`). */
  | {kind: 'slope'; plane: string; expr: string; offset?: number}
);
/** A point: fixed, or a joint of an actor (with an offset in scene units). */
/** A joint of an actor, moved by `offset` and then with x or y replaced by `pin` (to project it onto an axis). */
export type EndRef = JointRef & {offset?: Vec; pin?: {x?: number; y?: number}};
/** A point in a plane's maths coordinates. */
export type PlaneRef = {plane: string; at: Vec};
export type Ref = Vec | EndRef | PlaneRef;
/** A quantity measured from the drawing itself, so a readout always agrees with what is shown. Lengths are
 * multiplied by `scale` (units per scene unit); dy is measured upwards. */
export type Measure =
  | {kind: 'distance' | 'dx' | 'dy'; a: Ref; b: Ref; scale?: number}
  | {kind: 'angle'; a: Ref; b: Ref; c: Ref}
  | {kind: 'heading'; a: Ref; b: Ref}
  | {kind: 'time'; from?: number; scale?: number}
  /** A quantity that is a formula of time, x(t) in the variable x: its value (or its rate, with `rate`), at the time
   * since `from`, held at its value at `until` afterwards; with `abs`, its size (a speed from a velocity). */
  | {kind: 'of_time'; expr: string; rate?: boolean; from?: number; until?: number; abs?: boolean; scale?: number}
  /** A value keyed over time (a stage's computed speed), so the readout agrees with the motion drawn from it. */
  | {kind: 'keys'; keys: Key[]}
  /** Measured on a plane, in its maths units: a coordinate, the run (dx) or slope between two points, the value of an
   * expression at a point's x, or the integral of an expression from a fixed x to a point's x. */
  | {kind: 'coord'; of: Ref; plane: string; axis: 'x' | 'y'}
  | {kind: 'run' | 'slope'; a: Ref; b: Ref; plane: string}
  | {kind: 'expr'; expr: string; at: Ref; plane: string}
  | {kind: 'integral'; expr: string; from: number; to: Ref; plane: string};
export type Actor = {
  id: string; rig: string | Rig; skin?: SkinOptions;
  /** Where the actor stands: the point under its lowest contact (or its root if it has no contacts). */
  at: Vec; scale?: number; facing?: 1 | -1;
  /** The whole rig's rotation (degrees): a number, or keys to turn it over time. */
  turn?: number | Key[];
  angles?: AngleDriver[];
  /** Pins and sliders in scene coordinates (a rig's own pins and sliders are in its units). */
  world?: {pins?: {joint: string; at?: Vec}[]; sliders?: {joint: string; through: [Vec, Vec]}[]};
  facings?: {t: number; facing: 1 | -1}[];
  pose?: PoseKey[]; base?: BaseKey[]; drivers?: Driver[]; ik?: IK[];
  /** Intervals where a jump in position is meant (a quantum jump, a cut); the speed check skips them. */
  blink?: [number, number][];
  expression?: {t: number; face: Face}[];
  opacity?: Key[]; show?: [number, number]; pulse?: number[]; layer?: number;
};

export type Style = {stroke?: string; fill?: string; width?: number; opacity?: number; dash?: number[]; cap?: 'round' | 'butt'};
type PropBase = {id: string; style?: Style; show?: [number, number]; fade?: number; keys?: Record<string, Key[]>;
  anchor?: JointRef & {offset?: Vec}; pulse?: number[]; layer?: number};
export type Prop = PropBase & (
  | {type: 'line'; x1: number; y1: number; x2: number; y2: number; draw?: number; ends?: [EndRef | null, EndRef | null]}
  | {type: 'arrow'; x1: number; y1: number; x2: number; y2: number; draw?: number; head?: number; ends?: [EndRef | null, EndRef | null]}
  | {type: 'polyline'; points: Vec[]; draw?: number; closed?: boolean}
  | {type: 'rect'; x: number; y: number; w: number; h: number; r?: number}
  | {type: 'circle'; x: number; y: number; r: number}
  /** `width` wraps the text onto several lines (each 1.25 sizes below the last). */
  | {type: 'text'; x: number; y: number; text: string; size?: number; align?: 'start' | 'middle' | 'end'; weight?: number; font?: 'sans' | 'serif' | 'mono'; width?: number}
  | {type: 'wave'; x1: number; y1: number; x2: number; y2: number; progress: number; wavelength: number; amplitude: number; length: number}
  /** The path a joint has drawn from t0 up to now (a pen, a pendulum bob). Drawn as a polyline. */
  | {type: 'trail'; of: EndRef; t0: number; t1?: number; step?: number}
  /** Text with measured values: "x = {x} m" with measures {x: ...}. Drawn as text. */
  | {type: 'readout'; x: number; y: number; text: string; measures: Record<string, Measure>; decimals?: number | Record<string, number>;
     size?: number; align?: 'start' | 'middle' | 'end'; weight?: number; font?: 'sans' | 'serif' | 'mono'; width?: number}
  /** A plane's axes, with an optional grid, ticks every `step` and numbers. */
  | {type: 'axes'; plane: string; grid?: boolean; step?: [number, number]; numbers?: boolean; names?: [string, string]; size?: number}
  /** y = f(x) on a plane, broken where f is undefined; `draw` (0 to 1) draws it from left to right. */
  | {type: 'curve'; plane: string; expr: string; from?: number; to?: number; draw?: number; samples?: number}
  /** The region between y = f(x) and y = lower(x) (default 0) from `from` to `to`. */
  | {type: 'region'; plane: string; expr: string; lower?: string; from: number; to: number}
  /** n rectangles under y = f(x) from `from` to `to`. */
  | {type: 'riemann'; plane: string; expr: string; from: number; to: number; n: number; rule?: 'left' | 'right' | 'mid'}
  /** The straight line through two points, extended to the plane's box (or by `extend` scene units). */
  | {type: 'through'; a: Ref; b: Ref; plane?: string; extend?: number}
  | {type: 'group'; items: Prop[]}
  /** A common object of physics problems (objects.ts): car, bus, train, bicycle, block, wedge, pulley, sling, ball.
   * Key x (or anchor it to an actor) to move it; its wheels, smoke and pulley turn follow from the motion. */
  | {type: 'object'; name: string; x: number; y: number; size?: number; facing?: number; angle?: number; a?: number; b?: number;
     label?: string; params?: Record<string, number | string>}
) & {
  /** Coordinates (x, y, x1, y1, x2, y2, points; rect corners and sizes) are in this plane's maths units. */
  plane?: string;
};

export type Scene = {
  linkwork: 1; width: number; height: number; fps: number; duration: number;
  theme?: 'dark' | 'light' | Record<string, string>;
  /** Surfaces things stand on, for the contact check. */
  surfaces?: {x0: number; x1: number; y: number}[];
  planes?: Plane[];
  props: Prop[]; actors: Actor[];
  meta?: Record<string, unknown>;
};

export type ActorFrame = {
  id: string; rig: Rig; joints: Map<string, Vec>; scale: number; facing: 1 | -1; opacity: number; face: Face;
  glow: number; residual: number; skin: SkinOptions; layer: number;
};
export type PropFrame = Prop & {opacity: number; glow: number; layer: number};
export type Frame = {t: number; width: number; height: number; actors: ActorFrame[]; props: PropFrame[]};

export const rigOf = (rig: string | Rig): Rig | undefined => (typeof rig === 'string' ? RIGS[rig] : rig);

/** The full pose at time t: poses are resolved in order (each merged onto the last), then angles eased between. */
export function poseAt(rig: Rig, keys: PoseKey[] | undefined, t: number): Pose {
  const rest: Pose = Object.fromEntries(rig.bones.map(b => [b.id, b.angle]));
  const named = (p: string | Pose) => (typeof p === 'string' ? rig.poses?.[p] ?? {} : p);
  if (!keys?.length) return rest;
  const full: Pose[] = [];
  keys.forEach((k, i) => full.push(mergePoses(i ? full[i - 1] : rest, named(k.pose))));
  if (t <= keys[0].t) return full[0];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i].t) {
      const k = keys[i].t === keys[i - 1].t ? 1 : ease(keys[i].ease, (t - keys[i - 1].t) / (keys[i].t - keys[i - 1].t));
      const a = full[i - 1], b = full[i], out: Pose = {};
      for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) {
        const va = a[name] ?? b[name], vb = b[name] ?? a[name];
        out[name] = name.includes(':') ? lerp(va, vb, k) : va + turnBetween(va, vb) * k;
      }
      return out;
    }
  }
  return full[full.length - 1];
}

type Planes = Map<string, Plane>;
const PLANES = new WeakMap<Scene, Planes>();
export function planesOf(scene: Scene): Planes {
  let m = PLANES.get(scene);
  if (!m) PLANES.set(scene, m = new Map((scene.planes ?? []).map(p => [p.id, p])));
  return m;
}
const planeNamed = (planes: Planes, id: string): Plane => {
  const p = planes.get(id);
  if (!p) throw new Error(`unknown plane ${id}`);
  return p;
};

function driverAt(d: Driver, t: number, planes: Planes = new Map()): Vec {
  const s = Math.min(Math.max(t - d.t0, 0), d.t1 - d.t0);
  const k = s / Math.max(1e-9, d.t1 - d.t0);
  switch (d.driver) {
    case 'arc': {                                         // a hop: straight in x, a parabola of the given height in y
      const p = lerpVec(d.from, d.to, k);
      return [p[0], p[1] - 4 * d.height * k * (1 - k)];
    }
    case 'projectile': {
      const v = mul(dir(d.angle), d.speed);
      return [d.from[0] + v[0] * s, d.from[1] + v[1] * s + 0.5 * d.g * s * s];
    }
    case 'curve': {
      const x = valueAt(d.x, t), plane = planeNamed(planes, d.plane);
      const y = fOf(d.expr)(x);
      return toScene(plane, [x, d.clamp ? Math.max(plane.y[0], Math.min(plane.y[1], y)) : y]);
    }
    case 'sine': {
      const off = d.amplitude * Math.sin(2 * Math.PI * s / d.period);
      return d.axis === 'x' ? [d.from[0] + off, d.from[1]] : [d.from[0], d.from[1] + off];
    }
  }
}

/** Where the actor stands at t: a driver in its interval wins, else the base keys, else `at`. */
export function baseAt(actor: Actor, t: number, planes: Planes = new Map()): Vec {
  const d = (actor.drivers ?? []).find(x => t >= x.t0 && t <= x.t1);
  if (d) return driverAt(d, t, planes);
  const keys = actor.base;
  if (!keys?.length) {
    const before = (actor.drivers ?? []).filter(x => x.t1 < t).sort((a, b) => b.t1 - a.t1)[0];
    return before ? driverAt(before, before.t1, planes) : actor.at;
  }
  if (t <= keys[0].t) return keys[0].at;
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i].t) {
      const k = ease(keys[i].ease, (t - keys[i - 1].t) / Math.max(1e-9, keys[i].t - keys[i - 1].t));
      return lerpVec(keys[i - 1].at, keys[i].at, k);
    }
  }
  return keys[keys.length - 1].at;
}

function facingAt(actor: Actor, t: number): 1 | -1 {
  let f = actor.facing ?? 1;
  for (const k of actor.facings ?? []) if (k.t <= t) f = k.facing;
  return f;
}

function faceAt(actor: Actor, t: number): Face {
  let f: Face = 'neutral';
  for (const k of actor.expression ?? []) if (k.t <= t) f = k.face;
  return f;
}

function angleDriven(d: AngleDriver, t: number, base: Vec, planes: Planes): number | undefined {
  if ((d.t0 !== undefined && t < d.t0) || (d.t1 !== undefined && t > d.t1)) return undefined;
  const s = t - (d.t0 ?? 0);
  switch (d.kind) {
    case 'pendulum': case 'sine': {
      const wave = d.kind === 'pendulum' ? Math.cos : Math.sin;
      return d.center + d.amplitude * wave(2 * Math.PI * s / d.period + (d.phase ?? 0));
    }
    case 'spin': return d.from + d.rate * s;
    case 'keys': return valueAt(d.keys, t);
    case 'slope': {
      const plane = planeNamed(planes, d.plane), x = toPlane(plane, base)[0];
      return slopeAngle(plane, dfOf(d.expr)(x)) + (d.offset ?? 0);
    }
  }
}

/** A skin is the rig's default with the actor's merged over it (bone and joint styles merged by name). */
export function skinOf(rig: Rig, skin: SkinOptions | undefined): SkinOptions {
  const base = rig.skin ?? {};
  return {...base, ...skin, bones: {...base.bones, ...skin?.bones}, joints: {...base.joints, ...skin?.joints}};
}

export function actorFrame(actor: Actor, t: number, others: Map<string, ActorFrame>, planes: Planes = new Map()): ActorFrame {
  const rig = rigOf(actor.rig);
  if (!rig) throw new Error(`actor ${actor.id}: unknown rig ${String(actor.rig)}`);
  const scale = actor.scale ?? 1, facing = facingAt(actor, t);
  const turn = Array.isArray(actor.turn) ? valueAt(actor.turn, t) : actor.turn ?? 0;
  const base = baseAt(actor, t, planes);
  const pose = poseAt(rig, actor.pose, t);
  for (const d of actor.angles ?? []) {
    const a = angleDriven(d, t, base, planes);
    if (a !== undefined) pose[d.bone] = a;
  }
  // Place at the origin first to find how far the lowest contact hangs below the root.
  const probe = place(rig, pose, [0, 0], scale, turn, facing);
  const lowest = Math.max(...(rig.contacts?.length ? rig.contacts : [rig.root]).map(j => probe.joints.get(j)![1]));
  const root: Vec = rig.contacts?.length ? [base[0], base[1] - lowest] : base;
  const placed = place(rig, pose, root, scale, turn, facing);
  const toWorld = (p: Vec): Vec => add(root, [p[0] * scale * facing, p[1] * scale]);

  const targets: Target[] = [];
  for (const ik of actor.ik ?? []) {
    if (t < ik.t0 || t > ik.t1) continue;
    const fk = placed.joints.get(ik.joint);
    if (!fk) continue;
    const goal = Array.isArray(ik.target) ? ik.target : others.get(ik.target.actor)?.joints.get(ik.target.joint);
    if (!goal) continue;
    const fade = ik.fade ?? 0.25;
    const w = Math.min(1, (t - ik.t0) / Math.max(1e-9, fade), (ik.t1 - t) / Math.max(1e-9, fade));
    targets.push({joint: ik.joint, at: lerpVec(fk, goal, ease('inOut', w)), chain: ik.chain});
  }
  const pins = new Map<string, Vec>();
  for (const p of rig.pins ?? []) pins.set(p.joint, p.at ? toWorld(p.at) : placed.joints.get(p.joint)!);
  for (const p of actor.world?.pins ?? []) pins.set(p.joint, p.at ?? placed.joints.get(p.joint)!);
  const sliders = [...(rig.sliders ?? []).map(s => ({joint: s.joint, through: [toWorld(s.through[0]), toWorld(s.through[1])] as [Vec, Vec]})),
    ...(actor.world?.sliders ?? [])];
  const solved = solve(rig, placed, targets, {pins, sliders}, rig.solve === 'all' ? 120 : 60);

  const opacity = shown(actor.show, t) * (actor.opacity ? valueAt(actor.opacity, t) : 1);
  return {id: actor.id, rig, joints: solved.joints, scale, facing, opacity, face: faceAt(actor, t), glow: pulseAt(actor.pulse, t),
    residual: solved.residual, skin: skinOf(rig, actor.skin), layer: actor.layer ?? 1};
}

// Actor frames are cached per scene and time: trails look back over earlier times on every frame.
const CACHE = new WeakMap<Scene, Map<number, Map<string, ActorFrame>>>();

export function actorsAt(scene: Scene, t: number): Map<string, ActorFrame> {
  let byTime = CACHE.get(scene);
  if (!byTime) CACHE.set(scene, byTime = new Map());
  const key = Math.round(t * 1e4);
  let actors = byTime.get(key);
  if (!actors) {
    actors = new Map();
    const planes = planesOf(scene);
    for (const a of scene.actors) actors.set(a.id, actorFrame(a, t, actors, planes));
    if (byTime.size > 20000) byTime.clear();
    byTime.set(key, actors);
  }
  return actors;
}

export function pointOf(ref: Ref, actors: Map<string, ActorFrame>, planes: Planes = new Map()): Vec | undefined {
  if (Array.isArray(ref)) return ref;
  if ('plane' in ref) { const p = planes.get(ref.plane); return p && toScene(p, ref.at); }
  const j = actors.get(ref.actor)?.joints.get(ref.joint);
  if (!j) return undefined;
  const q = add(j, ref.offset ?? [0, 0]);
  return [ref.pin?.x ?? q[0], ref.pin?.y ?? q[1]];
}

export function measure(m: Measure, t: number, actors: Map<string, ActorFrame>, planes: Planes = new Map()): number {
  if (m.kind === 'time') return (t - (m.from ?? 0)) * (m.scale ?? 1);
  if (m.kind === 'keys') return valueAt(m.keys, t);
  if (m.kind === 'of_time') {
    const s = Math.min(Math.max(0, t - (m.from ?? 0)), m.until ?? Infinity), v = (m.rate ? dfOf(m.expr) : fOf(m.expr))(s) * (m.scale ?? 1);
    return m.abs ? Math.abs(v) : v;
  }
  const at = (ref: Ref) => pointOf(ref, actors, planes);
  if (m.kind === 'coord' || m.kind === 'expr' || m.kind === 'integral') {
    const p = at(m.kind === 'coord' ? m.of : m.kind === 'expr' ? m.at : m.to), plane = planes.get(m.plane);
    if (!p || !plane) return NaN;
    const q = toPlane(plane, p);
    if (m.kind === 'coord') return m.axis === 'x' ? q[0] : q[1];
    if (m.kind === 'expr') return fOf(m.expr)(q[0]);
    return integrate(fOf(m.expr), m.from, q[0]);
  }
  if (m.kind === 'run' || m.kind === 'slope') {
    const plane = planes.get(m.plane), a = at(m.a), b = at(m.b);
    if (!plane || !a || !b) return NaN;
    const pa = toPlane(plane, a), pb = toPlane(plane, b);
    return m.kind === 'run' ? pb[0] - pa[0] : (pb[1] - pa[1]) / (pb[0] - pa[0]);
  }
  const a = at(m.a), b = at(m.b);
  if (!a || !b) return NaN;
  switch (m.kind) {
    case 'distance': return dist(a, b) * (m.scale ?? 1);
    case 'dx': return (b[0] - a[0]) * (m.scale ?? 1);
    case 'dy': return (a[1] - b[1]) * (m.scale ?? 1);
    case 'heading': return ((angleOf(sub(b, a)) % 360) + 360) % 360;
    case 'angle': {
      const c = at(m.c);
      if (!c) return NaN;
      return Math.abs(turnBetween(angleOf(sub(a, b)), angleOf(sub(c, b))));
    }
  }
}

const fixed = (x: number, places: number) => {
  const s = x.toFixed(places);
  return /^-0(\.0+)?$/.test(s) ? s.slice(1) : s.replace('-', '−');
};

export function propFrame(prop: Prop, t: number, actors: Map<string, ActorFrame>, scene?: Scene): PropFrame {
  const planes = scene ? planesOf(scene) : new Map<string, Plane>();
  const out = {...prop} as Record<string, unknown>;
  for (const [field, keys] of Object.entries(prop.keys ?? {})) out[field] = valueAt(keys, t);
  const at = (ref: Ref) => pointOf(ref, actors, planes);
  // Plane coordinates first, so anchors and ends (already in scene units) override them.
  if (prop.plane && !['axes', 'curve', 'region', 'riemann', 'through', 'group'].includes(prop.type)) {
    const plane = planeNamed(planes, prop.plane), [ux, uy] = unitsOf(plane);
    const conv = (x: unknown, y: unknown) => toScene(plane, [x as number, y as number]);
    if (prop.type === 'rect') {
      const [x, y] = conv(out.x, (out.y as number) + (out.h as number));
      Object.assign(out, {x, y, w: (out.w as number) * ux, h: (out.h as number) * uy});
    } else if (prop.type === 'polyline') out.points = (out.points as Vec[]).map(q => conv(q[0], q[1]));
    else {
      if ('x' in out && 'y' in out) [out.x, out.y] = conv(out.x, out.y);
      if ('x1' in out) [out.x1, out.y1] = conv(out.x1, out.y1);
      if ('x2' in out) [out.x2, out.y2] = conv(out.x2, out.y2);
    }
  }
  if (prop.anchor) {
    const j = actors.get(prop.anchor.actor)?.joints.get(prop.anchor.joint);
    if (j) {
      const [ox, oy] = prop.anchor.offset ?? [0, 0];
      out.x = j[0] + ox; out.y = j[1] + oy;
    }
  }
  if ((prop.type === 'line' || prop.type === 'arrow') && prop.ends) {
    const [a, b] = prop.ends.map(e => (e ? at(e) : undefined));
    if (a) { out.x1 = a[0]; out.y1 = a[1]; }
    if (b) { out.x2 = b[0]; out.y2 = b[1]; }
  }
  switch (prop.type) {
    case 'object': {
      // The motion is read from where the object is now, a moment ago and at the start, so wheels roll exactly as far
      // as it has moved and smoke knows how fast it goes. Keyed travel (rolling down a slope) overrides it.
      const xAt = (s: number) => objectX(prop, s, scene);
      const dt = 1 / (scene?.fps ?? 30), now = out.x as number;
      const motion = {t, travel: typeof out.travel === 'number' ? out.travel : now - xAt(0), speed: (now - xAt(Math.max(0, t - dt))) / (t > 0 ? Math.min(dt, t) : dt)};
      Object.assign(out, {type: 'group', items: objectItems(out as never, motion, prop.id)});
      break;
    }
    case 'trail': {
      const points: Vec[] = [];
      if (scene && t >= prop.t0) {
        const step = prop.step ?? 1 / scene.fps, end = Math.min(t, prop.t1 ?? Infinity);
        for (let s = prop.t0; s < end - 1e-9; s += step) {
          const q = pointOf(prop.of, actorsAt(scene, s), planes);
          if (q) points.push(q);
        }
        const q = pointOf(prop.of, end === t ? actors : actorsAt(scene, end), planes);
        if (q) points.push(q);
      }
      Object.assign(out, {type: 'polyline', points});
      break;
    }
    case 'readout': {
      const places = (name: string) => (typeof prop.decimals === 'number' ? prop.decimals : prop.decimals?.[name] ?? 2);
      const text = prop.text.replace(/\{(\w+)\}/g, (_, name: string) =>
        prop.measures[name] ? fixed(measure(prop.measures[name], t, actors, planes), places(name)) : `{${name}}`);
      Object.assign(out, {type: 'text', text});
      break;
    }
    case 'axes': Object.assign(out, {type: 'group', items: axesItems(prop as Prop & {type: 'axes'}, planeNamed(planes, prop.plane))}); break;
    case 'curve': {
      const plane = planeNamed(planes, prop.plane), from = prop.from ?? plane.x[0], to = prop.to ?? plane.x[1];
      const draw = Math.max(0, Math.min(1, (out.draw as number | undefined) ?? 1));
      const items = curvePaths(plane, prop.expr, from, from + (to - from) * draw, prop.samples ?? 600)
        .map((points, i) => ({id: `${prop.id}.${i}`, type: 'polyline', points, style: prop.style} as Prop));
      Object.assign(out, {type: 'group', items});
      break;
    }
    case 'region': {
      const plane = planeNamed(planes, prop.plane);
      const items = regionPaths(plane, prop.expr, prop.lower ?? '0', out.from as number, out.to as number)
        .map((points, i) => ({id: `${prop.id}.${i}`, type: 'polyline', points, closed: true, style: prop.style} as Prop));
      Object.assign(out, {type: 'group', items});
      break;
    }
    case 'riemann': {
      const plane = planeNamed(planes, prop.plane), f = fOf(prop.expr);
      const n = Math.max(1, Math.round(out.n as number)), a = out.from as number, b = out.to as number, w = (b - a) / n;
      const rule = prop.rule ?? 'mid';
      const items: Prop[] = [];
      for (let i = 0; i < n; i++) {
        const x0 = a + w * i, h = f(x0 + w * (rule === 'left' ? 0 : rule === 'right' ? 1 : 0.5));
        if (!Number.isFinite(h)) continue;
        const p0 = toScene(plane, [x0, Math.max(h, 0)]), p1 = toScene(plane, [x0 + w, Math.min(h, 0)]);
        items.push({id: `${prop.id}.${i}`, type: 'rect', x: p0[0], y: p0[1], w: p1[0] - p0[0], h: p1[1] - p0[1], style: prop.style});
      }
      Object.assign(out, {type: 'group', items});
      break;
    }
    case 'through': {
      const a = at(prop.a), b = at(prop.b);
      let items: Prop[] = [];
      if (a && b && dist(a, b) > 1e-6) {
        const u = mul(sub(b, a), 1 / dist(a, b));
        let p0: Vec, p1: Vec;
        if (prop.plane) {
          const box = planeNamed(planes, prop.plane).box;
          [p0, p1] = clipLine(a, u, box);
        } else { const e = prop.extend ?? 200; p0 = sub(a, mul(u, e)); p1 = add(b, mul(u, e)); }
        items = [{id: `${prop.id}.0`, type: 'line', x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1], style: prop.style}];
      }
      Object.assign(out, {type: 'group', items});
      break;
    }
  }
  const base = typeof out.opacity === 'number' ? out.opacity : (prop.style?.opacity ?? 1);
  return {...(out as Prop), opacity: base * shown(prop.show, t, prop.fade), glow: pulseAt(prop.pulse, t), layer: prop.layer ?? 0};
}

/** An object's x at time s: its anchor's joint, or its keyed or fixed x. */
function objectX(prop: Prop, s: number, scene?: Scene): number {
  if (prop.anchor && scene) {
    const j = actorsAt(scene, s).get(prop.anchor.actor)?.joints.get(prop.anchor.joint);
    if (j) return j[0] + (prop.anchor.offset?.[0] ?? 0);
  }
  const keys = prop.keys?.x, x = keys ? valueAt(keys, s) : (prop as {x: number}).x;
  if (prop.plane && scene) return toScene(planeNamed(planesOf(scene), prop.plane), [x, 0])[0];
  return x;
}

/** The part of the line through `a` with direction `u` that lies in the box [left, top, right, bottom]. */
function clipLine(a: Vec, u: Vec, box: [number, number, number, number]): [Vec, Vec] {
  let lo = -1e9, hi = 1e9;
  for (const [axis, min, max] of [[0, box[0], box[2]], [1, box[1], box[3]]] as const) {
    if (Math.abs(u[axis]) < 1e-12) continue;
    const t1 = (min - a[axis]) / u[axis], t2 = (max - a[axis]) / u[axis];
    lo = Math.max(lo, Math.min(t1, t2)); hi = Math.min(hi, Math.max(t1, t2));
  }
  return [add(a, mul(u, lo)), add(a, mul(u, hi))];
}

/** y = f(x) as polylines in scene units, cut where f is undefined and clipped to the plane's y range. */
export function curvePaths(plane: Plane, expr: string, from: number, to: number, samples = 600): Vec[][] {
  const f = fOf(expr), [y0, y1] = plane.y, span = y1 - y0;
  const paths: Vec[][] = [];
  let cur: Vec[] = [];
  const cut = () => { if (cur.length > 1) paths.push(cur); cur = []; };
  const n = Math.max(2, Math.ceil(samples * (to - from) / (plane.x[1] - plane.x[0])));
  let px = from, py = f(from);
  const inside = (y: number) => y >= y0 && y <= y1;
  const edgeY = (ya: number, yb: number) => (yb > y1 || ya > y1 ? y1 : y0);
  if (Number.isFinite(py) && inside(py)) cur.push(toScene(plane, [px, py]));
  for (let i = 1; i <= n; i++) {
    const x = from + (to - from) * i / n, y = f(x);
    const okA = Number.isFinite(py), okB = Number.isFinite(y);
    if (!okB) cut();
    else if (!okA) { if (inside(y)) cur.push(toScene(plane, [x, y])); }
    else if (Math.sign(py) !== Math.sign(y) && Math.abs(y - py) > span * 0.8) { cut(); if (inside(y)) cur.push(toScene(plane, [x, y])); }
    else if (inside(py) && inside(y)) cur.push(toScene(plane, [x, y]));
    else if (inside(py) && !inside(y)) {                         // leaving the window: stop at its edge
      const e = edgeY(py, y), k = (e - py) / (y - py);
      cur.push(toScene(plane, [px + (x - px) * k, e])); cut();
    } else if (!inside(py) && inside(y)) {                       // entering the window
      const e = edgeY(py, y), k = (e - py) / (y - py);
      cut(); cur.push(toScene(plane, [px + (x - px) * k, e]), toScene(plane, [x, y]));
    }
    px = x; py = y;
  }
  cut();
  return paths;
}

/** The region between f and lower from a to b, one closed polygon per stretch where both are defined. */
export function regionPaths(plane: Plane, expr: string, lower: string, a: number, b: number, samples = 400): Vec[][] {
  if (!(b > a)) return [];
  const f = fOf(expr), g = fOf(lower), [y0, y1] = plane.y;
  const clamp = (y: number) => Math.max(y0, Math.min(y1, y));
  const out: Vec[][] = [];
  let top: Vec[] = [], bottom: Vec[] = [];
  const flush = () => { if (top.length > 1) out.push([...top, ...bottom.reverse()]); top = []; bottom = []; };
  const n = Math.max(2, Math.ceil(samples * (b - a) / (plane.x[1] - plane.x[0])));
  for (let i = 0; i <= n; i++) {
    const x = a + (b - a) * i / n, y = f(x), l = g(x);
    if (!Number.isFinite(y) || !Number.isFinite(l)) { flush(); continue; }
    top.push(toScene(plane, [x, clamp(y)])); bottom.push(toScene(plane, [x, clamp(l)]));
  }
  flush();
  return out;
}

function axesItems(p: Prop & {type: 'axes'}, plane: Plane): Prop[] {
  const items: Prop[] = [];
  const [step, stepY] = p.step ?? [1, 1];
  const size = p.size ?? 24;
  const ox = Math.min(Math.max(0, plane.x[0]), plane.x[1]), oy = Math.min(Math.max(0, plane.y[0]), plane.y[1]);
  const o = toScene(plane, [ox, oy]);
  const [l, top, r, bottom] = plane.box;
  const ticks = (lo: number, hi: number, s: number) => {
    const out: number[] = [];
    for (let v = Math.ceil(lo / s - 1e-9) * s; v <= hi + 1e-9; v += s) out.push(Math.round(v / s) * s);
    return out;
  };
  const label = (v: number) => {
    const r = Math.round(v * 1000) / 1000;
    return r < 0 ? `−${-r}` : `${r}`;
  };
  if (p.grid !== false) {
    for (const v of ticks(plane.x[0], plane.x[1], step)) {
      const x = toScene(plane, [v, 0])[0];
      items.push({id: `${p.id}.gx${v}`, type: 'line', x1: x, y1: top, x2: x, y2: bottom, style: {stroke: 'faint', width: 1.5}});
    }
    for (const v of ticks(plane.y[0], plane.y[1], stepY)) {
      const y = toScene(plane, [0, v])[1];
      items.push({id: `${p.id}.gy${v}`, type: 'line', x1: l, y1: y, x2: r, y2: y, style: {stroke: 'faint', width: 1.5}});
    }
  }
  items.push({id: `${p.id}.x`, type: 'arrow', x1: l, y1: o[1], x2: r + size * 0.8, y2: o[1], head: size * 0.6, style: {stroke: 'muted', width: 3}},
    {id: `${p.id}.y`, type: 'arrow', x1: o[0], y1: bottom, x2: o[0], y2: top - size * 0.8, head: size * 0.6, style: {stroke: 'muted', width: 3}});
  const [nx, ny] = p.names ?? ['x', 'y'];
  items.push({id: `${p.id}.nx`, type: 'text', x: r + size * 1.3, y: o[1], text: nx, size: size * 1.2, style: {fill: 'muted'}},
    {id: `${p.id}.ny`, type: 'text', x: o[0], y: top - size * 1.6, text: ny, size: size * 1.2, align: 'middle', style: {fill: 'muted'}});
  if (p.numbers !== false) {
    for (const v of ticks(plane.x[0], plane.x[1], step)) {
      if (Math.abs(v - ox) < 1e-9) continue;
      const x = toScene(plane, [v, 0])[0];
      items.push({id: `${p.id}.tx${v}`, type: 'line', x1: x, y1: o[1] - 6, x2: x, y2: o[1] + 6, style: {stroke: 'muted', width: 2}},
        {id: `${p.id}.lx${v}`, type: 'text', x, y: o[1] + size * 1.1, text: label(v), size, align: 'middle', style: {fill: 'muted'}});
    }
    for (const v of ticks(plane.y[0], plane.y[1], stepY)) {
      if (Math.abs(v - oy) < 1e-9) continue;
      const y = toScene(plane, [0, v])[1];
      items.push({id: `${p.id}.ty${v}`, type: 'line', x1: o[0] - 6, y1: y, x2: o[0] + 6, y2: y, style: {stroke: 'muted', width: 2}},
        {id: `${p.id}.ly${v}`, type: 'text', x: o[0] - size * 0.6, y, text: label(v), size, align: 'end', style: {fill: 'muted'}});
    }
    if (ox === 0 && oy === 0) items.push({id: `${p.id}.o`, type: 'text', x: o[0] - size * 0.6, y: o[1] + size * 1.1, text: '0', size, align: 'end', style: {fill: 'muted'}});
  }
  return items;
}

export function frame(scene: Scene, t: number): Frame {
  const actors = actorsAt(scene, t);
  const props = scene.props.map(p => propFrame(p, t, actors, scene));
  return {t, width: scene.width, height: scene.height, actors: [...actors.values()], props};
}
