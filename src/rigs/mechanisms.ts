// Mechanism rigs. Each is 100 units along its main bone; an actor's scale sets its size in the scene.
import type {Rig} from '../rig.ts';

/** A ladder from its foot to its top. Drive the foot; slide the top on a wall with a world slider. */
export const ladder: Rig = {
  id: 'ladder', version: 1, root: 'foot', solve: 'all', free: ['top'],
  bones: [{id: 'ladder', from: 'foot', to: 'top', length: 100, angle: 120}],
  skin: {width: 2, bones: {ladder: {style: 'ladder'}}},
};

/** A simple pendulum: a string from a pivot to a bob. Swing it with an angle driver on "string". */
export const pendulum: Rig = {
  id: 'pendulum', version: 1, root: 'pivot',
  bones: [{id: 'string', from: 'pivot', to: 'bob', length: 100, angle: -90}],
  skin: {width: 1.5, bones: {string: {style: 'string'}}, joints: {pivot: {style: 'pivot', size: 3}, bob: {style: 'ball', size: 4.3}}},
};

/** A pair of compasses: needle and pencil legs hinged at the top. Pose leg_a and leg_b to set the spread; turn the
 * actor to draw. */
export const compass: Rig = {
  id: 'compass', version: 1, root: 'needle',
  bones: [{id: 'leg_a', from: 'needle', to: 'hinge', length: 100, angle: 70}, {id: 'leg_b', from: 'hinge', to: 'pencil', length: 100, angle: -140}],
  skin: {width: 3.2, joints: {hinge: {style: 'pivot', size: 7}, needle: {style: 'needle', size: 5}, pencil: {style: 'pencil', size: 6}}},
};

/** A slider-crank: a crank turning about its centre, a connecting rod, and a piston that slides. The piston needs a
 * world slider along its line; the rod's length is `rod` crank lengths. */
export function crankRig(rod = 3): Rig {
  return {
    id: 'crank', version: 1, root: 'center', solve: 'all', free: ['piston'],
    bones: [{id: 'crank', from: 'center', to: 'pin', length: 100, angle: 0}, {id: 'rod', from: 'pin', to: 'piston', length: 100 * rod, angle: 0}],
    skin: {width: 7, bones: {crank: {style: 'rod'}, rod: {style: 'rod'}},
      joints: {center: {style: 'pivot', size: 14}, pin: {style: 'pivot', size: 10}, piston: {style: 'block', size: 24}}},
  };
}
export const crank = crankRig(3);

/** A tangent rod on a hinge: two arms from the hinge, set to the tangent's angle with "slope" angle drivers. */
export const tangent: Rig = {
  id: 'tangent', version: 1, root: 'hinge',
  bones: [{id: 'right', from: 'hinge', to: 'r', length: 100, angle: 0}, {id: 'left', from: 'hinge', to: 'l', length: 100, angle: 180}],
  skin: {width: 1.4, bones: {right: {style: 'line'}, left: {style: 'line'}}, joints: {hinge: {style: 'ball', size: 3.2}}},
};

/** A single point, drawn as a ball: a marker that can ride a curve. */
export const dot: Rig = {id: 'dot', version: 1, root: 'p', bones: [], skin: {joints: {p: {style: 'ball', size: 9}}}};
