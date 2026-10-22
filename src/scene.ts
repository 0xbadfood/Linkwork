// Scenes: actors (rigs with tracks) and props (shapes with keyed fields). frame(scene, t) is a pure function that
// gives every joint position and every prop's values at time t.
import {ease, type Ease} from './ease.ts';
import {pulseAt, shown, valueAt, type Key} from './keys.ts';
import {mergePoses, place, type Pose, type Rig, type SkinOptions} from './rig.ts';
import {RIGS} from './rigs/index.ts';
import {solve, type Target} from './solve.ts';
import {add, angleOf, dir, dist, lerp, lerpVec, mul, sub, turnBetween, type Vec} from './vec.ts';

export type Face = 'neutral' | 'smile' | 'grin' | 'surprise' | 'focus' | 'sad' | 'none';
export type PoseKey = {t: number; pose: string | Pose; ease?: Ease};
export type BaseKey = {t: number; at: Vec; ease?: Ease};
export type Driver =
  | {t0: number; t1: number; driver: 'arc'; from: Vec; to: Vec; height: number}
  | {t0: number; t1: number; driver: 'projectile'; from: Vec; speed: number; angle: number; g: number}
  | {t0: number; t1: number; driver: 'sine'; from: Vec; axis: 'x' | 'y'; amplitude: number; period: number};
export type JointRef = {actor: string; joint: string};
export type IK = {t0: number; t1: number; joint: string; target: Vec | JointRef; chain?: number; fade?: number};
/** A bone's angle (relative to its parent) driven over time, on top of the pose. pendulum and sine swing about
 * `center`; spin turns at `rate` degrees a second from `from`; keys follows keyed values. */
export type AngleDriver = {bone: string; t0?: number; t1?: number} & (
  | {kind: 'pendulum' | 'sine'; center: number; amplitude: number; period: number; phase?: number}
  | {kind: 'spin'; from: number; rate: number}
  | {kind: 'keys'; keys: Key[]}
);
/** A point: fixed, or a joint of an actor (with an offset in scene units). */
export type EndRef = JointRef & {offset?: Vec};
export type Ref = Vec | EndRef;
/** A quantity measured from the drawing itself, so a readout always agrees with what is shown. Lengths are
 * multiplied by `scale` (units per scene unit); dy is measured upwards. */
export type Measure =
  | {kind: 'distance' | 'dx' | 'dy'; a: Ref; b: Ref; scale?: number}
  | {kind: 'angle'; a: Ref; b: Ref; c: Ref}
  | {kind: 'heading'; a: Ref; b: Ref}
  | {kind: 'time'; from?: number; scale?: number};
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
  | {type: 'text'; x: number; y: number; text: string; size?: number; align?: 'start' | 'middle' | 'end'; weight?: number; font?: 'sans' | 'serif' | 'mono'}
  | {type: 'wave'; x1: number; y1: number; x2: number; y2: number; progress: number; wavelength: number; amplitude: number; length: number}
  /** The path a joint has drawn from t0 up to now (a pen, a pendulum bob). Drawn as a polyline. */
  | {type: 'trail'; of: EndRef; t0: number; t1?: number; step?: number}
  /** Text with measured values: "x = {x} m" with measures {x: ...}. Drawn as text. */
  | {type: 'readout'; x: number; y: number; text: string; measures: Record<string, Measure>; decimals?: number | Record<string, number>;
     size?: number; align?: 'start' | 'middle' | 'end'; weight?: number; font?: 'sans' | 'serif' | 'mono'}
);

export type Scene = {
  linkwork: 1; width: number; height: number; fps: number; duration: number;
  theme?: 'dark' | 'light' | Record<string, string>;
  /** Surfaces things stand on, for the contact check. */
  surfaces?: {x0: number; x1: number; y: number}[];
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

function driverAt(d: Driver, t: number): Vec {
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
    case 'sine': {
      const off = d.amplitude * Math.sin(2 * Math.PI * s / d.period);
      return d.axis === 'x' ? [d.from[0] + off, d.from[1]] : [d.from[0], d.from[1] + off];
    }
  }
}

/** Where the actor stands at t: a driver in its interval wins, else the base keys, else `at`. */
export function baseAt(actor: Actor, t: number): Vec {
  const d = (actor.drivers ?? []).find(x => t >= x.t0 && t <= x.t1);
  if (d) return driverAt(d, t);
  const keys = actor.base;
  if (!keys?.length) {
    const before = (actor.drivers ?? []).filter(x => x.t1 < t).sort((a, b) => b.t1 - a.t1)[0];
    return before ? driverAt(before, before.t1) : actor.at;
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

function angleDriven(d: AngleDriver, t: number): number | undefined {
  if ((d.t0 !== undefined && t < d.t0) || (d.t1 !== undefined && t > d.t1)) return undefined;
  const s = t - (d.t0 ?? 0);
  switch (d.kind) {
    case 'pendulum': case 'sine': {
      const wave = d.kind === 'pendulum' ? Math.cos : Math.sin;
      return d.center + d.amplitude * wave(2 * Math.PI * s / d.period + (d.phase ?? 0));
    }
    case 'spin': return d.from + d.rate * s;
    case 'keys': return valueAt(d.keys, t);
  }
}

/** A skin is the rig's default with the actor's merged over it (bone and joint styles merged by name). */
export function skinOf(rig: Rig, skin: SkinOptions | undefined): SkinOptions {
  const base = rig.skin ?? {};
  return {...base, ...skin, bones: {...base.bones, ...skin?.bones}, joints: {...base.joints, ...skin?.joints}};
}

export function actorFrame(actor: Actor, t: number, others: Map<string, ActorFrame>): ActorFrame {
  const rig = rigOf(actor.rig);
  if (!rig) throw new Error(`actor ${actor.id}: unknown rig ${String(actor.rig)}`);
  const scale = actor.scale ?? 1, facing = facingAt(actor, t);
  const turn = Array.isArray(actor.turn) ? valueAt(actor.turn, t) : actor.turn ?? 0;
  const pose = poseAt(rig, actor.pose, t);
  for (const d of actor.angles ?? []) {
    const a = angleDriven(d, t);
    if (a !== undefined) pose[d.bone] = a;
  }
  const base = baseAt(actor, t);
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
    for (const a of scene.actors) actors.set(a.id, actorFrame(a, t, actors));
    if (byTime.size > 20000) byTime.clear();
    byTime.set(key, actors);
  }
  return actors;
}

export function pointOf(ref: Ref, actors: Map<string, ActorFrame>): Vec | undefined {
  if (Array.isArray(ref)) return ref;
  const j = actors.get(ref.actor)?.joints.get(ref.joint);
  return j && add(j, ref.offset ?? [0, 0]);
}

export function measure(m: Measure, t: number, actors: Map<string, ActorFrame>): number {
  if (m.kind === 'time') return (t - (m.from ?? 0)) * (m.scale ?? 1);
  const a = pointOf(m.a, actors), b = pointOf(m.b, actors);
  if (!a || !b) return NaN;
  switch (m.kind) {
    case 'distance': return dist(a, b) * (m.scale ?? 1);
    case 'dx': return (b[0] - a[0]) * (m.scale ?? 1);
    case 'dy': return (a[1] - b[1]) * (m.scale ?? 1);
    case 'heading': return ((angleOf(sub(b, a)) % 360) + 360) % 360;
    case 'angle': {
      const c = pointOf(m.c, actors);
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
  const out = {...prop} as Record<string, unknown>;
  for (const [field, keys] of Object.entries(prop.keys ?? {})) out[field] = valueAt(keys, t);
  if (prop.anchor) {
    const j = actors.get(prop.anchor.actor)?.joints.get(prop.anchor.joint);
    if (j) {
      const [ox, oy] = prop.anchor.offset ?? [0, 0];
      out.x = j[0] + ox; out.y = j[1] + oy;
    }
  }
  if ((prop.type === 'line' || prop.type === 'arrow') && prop.ends) {
    const [a, b] = prop.ends.map(e => (e ? pointOf(e, actors) : undefined));
    if (a) { out.x1 = a[0]; out.y1 = a[1]; }
    if (b) { out.x2 = b[0]; out.y2 = b[1]; }
  }
  if (prop.type === 'trail') {
    const points: Vec[] = [];
    if (scene && t >= prop.t0) {
      const step = prop.step ?? 1 / scene.fps, end = Math.min(t, prop.t1 ?? Infinity);
      for (let s = prop.t0; s < end - 1e-9; s += step) {
        const p = pointOf(prop.of, actorsAt(scene, s));
        if (p) points.push(p);
      }
      const p = pointOf(prop.of, end === t ? actors : actorsAt(scene, end));
      if (p) points.push(p);
    }
    Object.assign(out, {type: 'polyline', points});
  }
  if (prop.type === 'readout') {
    const places = (name: string) => (typeof prop.decimals === 'number' ? prop.decimals : prop.decimals?.[name] ?? 2);
    const text = prop.text.replace(/\{(\w+)\}/g, (_, name: string) =>
      prop.measures[name] ? fixed(measure(prop.measures[name], t, actors), places(name)) : `{${name}}`);
    Object.assign(out, {type: 'text', text});
  }
  const base = typeof out.opacity === 'number' ? out.opacity : (prop.style?.opacity ?? 1);
  return {...(out as Prop), opacity: base * shown(prop.show, t, prop.fade), glow: pulseAt(prop.pulse, t), layer: prop.layer ?? 0};
}

export function frame(scene: Scene, t: number): Frame {
  const actors = actorsAt(scene, t);
  const props = scene.props.map(p => propFrame(p, t, actors, scene));
  return {t, width: scene.width, height: scene.height, actors: [...actors.values()], props};
}
