// Scenes: actors (rigs with tracks) and props (shapes with keyed fields). frame(scene, t) is a pure function that
// gives every joint position and every prop's values at time t.
import {ease, type Ease} from './ease.ts';
import {pulseAt, shown, valueAt, type Key} from './keys.ts';
import {mergePoses, place, type Pose, type Rig} from './rig.ts';
import {RIGS} from './rigs/index.ts';
import {solve, type Target} from './solve.ts';
import {add, dir, lerp, lerpVec, mul, turnBetween, type Vec} from './vec.ts';

export type Face = 'neutral' | 'smile' | 'grin' | 'surprise' | 'focus' | 'sad' | 'none';
export type PoseKey = {t: number; pose: string | Pose; ease?: Ease};
export type BaseKey = {t: number; at: Vec; ease?: Ease};
export type Driver =
  | {t0: number; t1: number; driver: 'arc'; from: Vec; to: Vec; height: number}
  | {t0: number; t1: number; driver: 'projectile'; from: Vec; speed: number; angle: number; g: number}
  | {t0: number; t1: number; driver: 'sine'; from: Vec; axis: 'x' | 'y'; amplitude: number; period: number};
export type JointRef = {actor: string; joint: string};
export type IK = {t0: number; t1: number; joint: string; target: Vec | JointRef; chain?: number; fade?: number};
export type SkinOptions = {width?: number; color?: string; back?: string[]; face?: boolean; head?: string};
export type Actor = {
  id: string; rig: string | Rig; skin?: SkinOptions;
  /** Where the actor stands: the point under its lowest contact (or its root if it has no contacts). */
  at: Vec; scale?: number; facing?: 1 | -1; turn?: number;
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
  | {type: 'line'; x1: number; y1: number; x2: number; y2: number; draw?: number}
  | {type: 'arrow'; x1: number; y1: number; x2: number; y2: number; draw?: number; head?: number}
  | {type: 'polyline'; points: Vec[]; draw?: number; closed?: boolean}
  | {type: 'rect'; x: number; y: number; w: number; h: number; r?: number}
  | {type: 'circle'; x: number; y: number; r: number}
  | {type: 'text'; x: number; y: number; text: string; size?: number; align?: 'start' | 'middle' | 'end'; weight?: number; font?: 'sans' | 'serif' | 'mono'}
  | {type: 'wave'; x1: number; y1: number; x2: number; y2: number; progress: number; wavelength: number; amplitude: number; length: number}
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

export function actorFrame(actor: Actor, t: number, others: Map<string, ActorFrame>): ActorFrame {
  const rig = rigOf(actor.rig);
  if (!rig) throw new Error(`actor ${actor.id}: unknown rig ${String(actor.rig)}`);
  const scale = actor.scale ?? 1, facing = facingAt(actor, t), turn = actor.turn ?? 0;
  const pose = poseAt(rig, actor.pose, t);
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
    let goal: Vec | undefined;
    if (Array.isArray(ik.target)) goal = ik.target;
    else goal = others.get(ik.target.actor)?.joints.get(ik.target.joint);
    if (!goal) continue;
    const fade = ik.fade ?? 0.25;
    const w = Math.min(1, (t - ik.t0) / Math.max(1e-9, fade), (ik.t1 - t) / Math.max(1e-9, fade));
    targets.push({joint: ik.joint, at: lerpVec(fk, goal, ease('inOut', w)), chain: ik.chain});
  }
  const pins = new Map((rig.pins ?? []).map(p => [p.joint, p.at ? toWorld(p.at) : placed.joints.get(p.joint)!] as [string, Vec]));
  const sliders = (rig.sliders ?? []).map(s => ({joint: s.joint, through: [toWorld(s.through[0]), toWorld(s.through[1])] as [Vec, Vec]}));
  const solved = solve(rig, placed, targets, {pins, sliders});

  const opacity = shown(actor.show, t) * (actor.opacity ? valueAt(actor.opacity, t) : 1);
  return {id: actor.id, rig, joints: solved.joints, scale, facing, opacity, face: faceAt(actor, t), glow: pulseAt(actor.pulse, t),
    residual: solved.residual, skin: actor.skin ?? {}, layer: actor.layer ?? 1};
}

export function propFrame(prop: Prop, t: number, actors: Map<string, ActorFrame>): PropFrame {
  const out = {...prop} as Record<string, unknown>;
  for (const [field, keys] of Object.entries(prop.keys ?? {})) out[field] = valueAt(keys, t);
  if (prop.anchor) {
    const j = actors.get(prop.anchor.actor)?.joints.get(prop.anchor.joint);
    if (j) {
      const [ox, oy] = prop.anchor.offset ?? [0, 0];
      out.x = j[0] + ox; out.y = j[1] + oy;
    }
  }
  const base = typeof out.opacity === 'number' ? out.opacity : (prop.style?.opacity ?? 1);
  return {...(out as Prop), opacity: base * shown(prop.show, t, prop.fade), glow: pulseAt(prop.pulse, t), layer: prop.layer ?? 0};
}

export function frame(scene: Scene, t: number): Frame {
  const actors = new Map<string, ActorFrame>();
  for (const a of scene.actors) actors.set(a.id, actorFrame(a, t, actors));
  const props = scene.props.map(p => propFrame(p, t, actors));
  return {t, width: scene.width, height: scene.height, actors: [...actors.values()], props};
}
