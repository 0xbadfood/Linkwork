// The solver: position-based iterations from the forward-kinematics guess. One method covers IK targets, pins,
// sliders, closed loops and bone lengths, so no rig needs its own code.
import {add, dist, mul, project, sub, type Vec} from './vec.ts';
import {type Placed, type Rig} from './rig.ts';

export type Target = {joint: string; at: Vec; chain?: number};
export type Solved = {joints: Map<string, Vec>; residual: number};

/** The joints a target may move: the joint and those up its chain, stopping before the chain's top joint. */
function chainJoints(rig: Rig, joint: string, chain: number): string[] {
  const byEnd = new Map(rig.bones.map(b => [b.to, b]));
  const out = [joint];
  let j = joint;
  for (let i = 1; i < chain; i++) {
    const b = byEnd.get(j);
    if (!b || b.from === rig.root) break;
    out.push(b.from);
    j = b.from;
  }
  return out;
}

export function solve(rig: Rig, placed: Placed, targets: Target[], world: {pins?: Map<string, Vec>; sliders?: {joint: string; through: [Vec, Vec]}[]} = {},
  iterations = 60): Solved {
  const joints = new Map([...placed.joints].map(([k, v]) => [k, [...v] as Vec]));
  const pins = world.pins ?? new Map<string, Vec>();
  const sliders = world.sliders ?? [];
  const links = (rig.links ?? []).map(l => ({a: l.a, b: l.b, length: l.length ?? dist(joints.get(l.a)!, joints.get(l.b)!)}));
  if (!targets.length && !pins.size && !sliders.length && !links.length) return {joints, residual: 0};

  const mode = rig.solve ?? 'chain';
  let free: Set<string>;
  if (mode === 'all') free = new Set((rig.free ?? [...joints.keys()].filter(j => j !== rig.root)).filter(j => !pins.has(j)));
  else free = new Set(targets.flatMap(t => chainJoints(rig, t.joint, t.chain ?? 2)));
  for (const t of targets) free.delete(t.joint);          // a target holds its joint where it is put

  const rods = [...rig.bones.map(b => ({a: b.from, b: b.to, length: placed.lengths.get(b.id)!})), ...links];
  const hold = () => {
    for (const t of targets) joints.set(t.joint, [...t.at] as Vec);
    for (const [j, at] of pins) joints.set(j, [...at] as Vec);
    for (const s of sliders) joints.set(s.joint, project(joints.get(s.joint)!, s.through[0], s.through[1]));
  };
  for (let i = 0; i < iterations; i++) {
    hold();
    for (const r of rods) {
      const wa = free.has(r.a) ? 1 : 0, wb = free.has(r.b) ? 1 : 0;
      if (!wa && !wb) continue;
      const pa = joints.get(r.a)!, pb = joints.get(r.b)!;
      const d = sub(pb, pa), l = Math.hypot(d[0], d[1]) || 1e-9;
      const k = (l - r.length) / l / (wa + wb);
      joints.set(r.a, add(pa, mul(d, k * wa)));
      joints.set(r.b, sub(pb, mul(d, k * wb)));
    }
    for (const s of sliders) joints.set(s.joint, project(joints.get(s.joint)!, s.through[0], s.through[1]));
  }
  hold();
  // Joints hanging below a moved joint (a hand below a wrist target, say) follow it rigidly.
  carryChildren(rig, placed, joints, free);
  let residual = 0;
  for (const r of rods) residual = Math.max(residual, Math.abs(dist(joints.get(r.a)!, joints.get(r.b)!) - r.length));
  for (const t of targets) residual = Math.max(residual, dist(joints.get(t.joint)!, t.at));
  for (const s of sliders) residual = Math.max(residual, dist(joints.get(s.joint)!, project(joints.get(s.joint)!, s.through[0], s.through[1])));
  return {joints, residual};
}

/** Children of moved joints that the solver did not move keep their offset from their moved parent. */
function carryChildren(rig: Rig, placed: Placed, joints: Map<string, Vec>, free: Set<string>) {
  const order = rig.bones;
  const moved = new Set<string>([...joints.keys()].filter(j => dist(joints.get(j)!, placed.joints.get(j)!) > 1e-9));
  let changed = true;
  while (changed) {
    changed = false;
    for (const b of order) {
      if (moved.has(b.from) && !moved.has(b.to) && !free.has(b.to)) {
        const offset = sub(placed.joints.get(b.to)!, placed.joints.get(b.from)!);
        joints.set(b.to, add(joints.get(b.from)!, offset));
        moved.add(b.to);
        changed = true;
      }
    }
  }
}
