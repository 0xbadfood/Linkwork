// Rigs: a tree of bones from a root joint, plus extra constraints. Forward kinematics turns a pose (bone angles,
// each relative to its parent bone) into joint positions.
import {add, dir, mul, type Vec} from './vec.ts';

export type Bone = {id: string; from: string; to: string; length: number; angle: number; stretch?: boolean};
/** Bone angles (degrees, relative to the parent bone) and, for stretchy bones, lengths as "bone:length". */
export type Pose = Record<string, number>;
export type Link = {a: string; b: string; length?: number};
export type Pin = {joint: string; at?: Vec};
export type Slider = {joint: string; through: [Vec, Vec]};
export type Rig = {
  id: string; version: 1; root: string; bones: Bone[];
  contacts?: string[]; poses?: Record<string, Pose>;
  links?: Link[]; pins?: Pin[]; sliders?: Slider[];
  /** chain: only IK chains move and the root stays (figures); all: every joint not pinned moves (mechanisms). */
  solve?: 'chain' | 'all';
};

export type Placed = {
  joints: Map<string, Vec>;
  /** World angle of every bone after placing (degrees). */
  angles: Map<string, number>;
  lengths: Map<string, number>;
};

export function rigErrors(rig: Rig): string[] {
  const errors: string[] = [];
  const ids = new Set<string>(), tos = new Set<string>();
  const joints = new Set([rig.root]);
  for (const b of rig.bones ?? []) {
    if (ids.has(b.id)) errors.push(`${rig.id}: bone ${b.id} twice`);
    ids.add(b.id);
    if (tos.has(b.to) || b.to === rig.root) errors.push(`${rig.id}: joint ${b.to} ends two bones; use a link to close a loop`);
    tos.add(b.to);
    if (!(b.length > 0)) errors.push(`${rig.id}: bone ${b.id} needs a positive length`);
  }
  const order = boneOrder(rig);
  if (order.length !== rig.bones.length) errors.push(`${rig.id}: every bone must hang from the root through other bones`);
  for (const b of order) joints.add(b.to);
  const known = (j: string, where: string) => { if (!joints.has(j)) errors.push(`${rig.id}: ${where} names unknown joint ${j}`); };
  (rig.contacts ?? []).forEach(j => known(j, 'contacts'));
  (rig.links ?? []).forEach(l => { known(l.a, 'a link'); known(l.b, 'a link'); });
  (rig.pins ?? []).forEach(p => known(p.joint, 'a pin'));
  (rig.sliders ?? []).forEach(s => known(s.joint, 'a slider'));
  for (const [name, pose] of Object.entries(rig.poses ?? {})) errors.push(...poseErrors(rig, pose, `pose ${name}`));
  return errors;
}

export function poseErrors(rig: Rig, pose: Pose, where: string): string[] {
  const bones = new Map(rig.bones.map(b => [b.id, b]));
  const errors: string[] = [];
  for (const [key, value] of Object.entries(pose)) {
    const [id, field] = key.split(':');
    const bone = bones.get(id);
    if (!bone) errors.push(`${where}: unknown bone ${id}`);
    else if (field && (field !== 'length' || !bone.stretch)) errors.push(`${where}: ${key}: only a stretchy bone takes :length`);
    if (typeof value !== 'number' || !Number.isFinite(value)) errors.push(`${where}: ${key} must be a number`);
  }
  return errors;
}

/** Bones ordered so every parent comes before its children. */
export function boneOrder(rig: Rig): Bone[] {
  const placed = new Set([rig.root]), out: Bone[] = [];
  let left = [...rig.bones];
  while (left.length) {
    const ready = left.filter(b => placed.has(b.from));
    if (!ready.length) break;
    for (const b of ready) { out.push(b); placed.add(b.to); }
    left = left.filter(b => !ready.includes(b));
  }
  return out;
}

export function parentOf(rig: Rig): Map<string, Bone | undefined> {
  const byEnd = new Map(rig.bones.map(b => [b.to, b]));
  return new Map(rig.bones.map(b => [b.id, byEnd.get(b.from)]));
}

/** Forward kinematics. The rig's root goes at `root`; `turn` rotates the whole rig; `facing` -1 mirrors it. */
export function place(rig: Rig, pose: Pose, root: Vec, scale = 1, turn = 0, facing: 1 | -1 = 1): Placed {
  const parents = parentOf(rig);
  const joints = new Map<string, Vec>([[rig.root, root]]);
  const angles = new Map<string, number>(), lengths = new Map<string, number>();
  for (const b of boneOrder(rig)) {
    const parent = parents.get(b.id);
    const local = pose[b.id] ?? b.angle;
    const world = (parent ? angles.get(parent.id)! : turn) + local;
    angles.set(b.id, world);
    const length = (b.stretch ? pose[`${b.id}:length`] ?? b.length : b.length) * scale;
    lengths.set(b.id, length);
    const d = dir(world);
    joints.set(b.to, add(joints.get(b.from)!, mul([d[0] * facing, d[1]], length)));
  }
  if (facing === -1) for (const [id, a] of angles) angles.set(id, 180 - a);
  return {joints, angles, lengths};
}

/** Merge poses: later ones override earlier ones bone by bone (so a partial pose can stack on a full one). */
export const mergePoses = (...poses: (Pose | undefined)[]): Pose => Object.assign({}, ...poses.filter(Boolean));
