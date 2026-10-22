// The stick figure: 176 units tall (centimetres), facing right. Bones from the hip; angles relative to the parent
// bone. "_l" is the near side (drawn in front), "_r" the far side.
import type {Pose, Rig} from '../rig.ts';

// Poses are written as world angles (what you would measure on paper) and turned into relative angles below.
type World = Record<string, number>;
const PARENT: Record<string, string | null> = {
  spine: null, head: 'spine', upper_arm_l: 'spine', forearm_l: 'upper_arm_l', upper_arm_r: 'spine', forearm_r: 'upper_arm_r',
  thigh_l: null, shin_l: 'thigh_l', thigh_r: null, shin_r: 'thigh_r',
};
const relative = (w: World): Pose => {
  const out: Pose = {};
  for (const [bone, a] of Object.entries(w)) {
    const p = PARENT[bone];
    const base = p ? w[p] ?? 0 : 0;
    out[bone] = ((a - base) % 360 + 540) % 360 - 180;
  }
  return out;
};

const STAND: World = {spine: 90, head: 90, upper_arm_l: -82, forearm_l: -76, upper_arm_r: -98, forearm_r: -94,
  thigh_l: -86, shin_l: -90, thigh_r: -95, shin_r: -92};
const POSES: Record<string, World> = {
  stand: STAND,
  crouch: {spine: 72, head: 80, upper_arm_l: -135, forearm_l: -125, upper_arm_r: -145, forearm_r: -135,
    thigh_l: -38, shin_l: -118, thigh_r: -46, shin_r: -122},
  leap: {spine: 94, head: 96, upper_arm_l: 62, forearm_l: 72, upper_arm_r: 72, forearm_r: 85,
    thigh_l: -78, shin_l: -100, thigh_r: -98, shin_r: -118},
  tuck: {spine: 84, head: 88, upper_arm_l: 40, forearm_l: 60, upper_arm_r: 55, forearm_r: 75,
    thigh_l: -20, shin_l: -110, thigh_r: -30, shin_r: -118},
  land: {spine: 78, head: 84, upper_arm_l: -20, forearm_l: -5, upper_arm_r: -35, forearm_r: -20,
    thigh_l: -52, shin_l: -112, thigh_r: -60, shin_r: -116},
  cheer: {...STAND, upper_arm_l: 58, forearm_l: 70, upper_arm_r: 118, forearm_r: 108},
  point: {...STAND, upper_arm_l: 8, forearm_l: 4},
  shrug: {...STAND, upper_arm_l: -95, forearm_l: 20, upper_arm_r: -85, forearm_r: 30},
  think: {...STAND, upper_arm_l: -62, forearm_l: 104},
  walk_a: {spine: 88, head: 90, upper_arm_l: -112, forearm_l: -100, upper_arm_r: -66, forearm_r: -48,
    thigh_l: -66, shin_l: -84, thigh_r: -112, shin_r: -122},
  walk_b: {spine: 88, head: 90, upper_arm_l: -66, forearm_l: -48, upper_arm_r: -112, forearm_r: -100,
    thigh_l: -112, shin_l: -122, thigh_r: -66, shin_r: -84},
  push: {spine: 70, head: 75, upper_arm_l: 8, forearm_l: 6, upper_arm_r: 0, forearm_r: -2,
    thigh_l: -60, shin_l: -95, thigh_r: -122, shin_r: -120},
};

const BONES: {id: string; from: string; to: string; length: number}[] = [
    {id: 'spine', from: 'hip', to: 'neck', length: 58},
    {id: 'head', from: 'neck', to: 'crown', length: 30},
    {id: 'upper_arm_l', from: 'neck', to: 'elbow_l', length: 30},
    {id: 'forearm_l', from: 'elbow_l', to: 'hand_l', length: 28},
    {id: 'upper_arm_r', from: 'neck', to: 'elbow_r', length: 30},
    {id: 'forearm_r', from: 'elbow_r', to: 'hand_r', length: 28},
    {id: 'thigh_l', from: 'hip', to: 'knee_l', length: 44},
    {id: 'shin_l', from: 'knee_l', to: 'foot_l', length: 44},
    {id: 'thigh_r', from: 'hip', to: 'knee_r', length: 44},
    {id: 'shin_r', from: 'knee_r', to: 'foot_r', length: 44},
];

export const figure: Rig = {
  id: 'figure', version: 1, root: 'hip', solve: 'chain',
  bones: BONES.map(b => ({...b, angle: relative(STAND)[b.id]})),
  contacts: ['foot_l', 'foot_r'],
  // Knees bend backwards and elbows forwards (relative to the parent bone, figure facing right).
  limits: {shin_l: [-165, 8], shin_r: [-165, 8], forearm_l: [-15, 170], forearm_r: [-15, 170]},
  poses: Object.fromEntries(Object.entries(POSES).map(([k, w]) => [k, relative(w)])),
};
