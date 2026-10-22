import type {Rig} from '../rig.ts';
import {figure} from './figure.ts';
import {compass, crank, dot, ladder, pendulum, tangent} from './mechanisms.ts';

export const RIGS: Record<string, Rig> = {figure, ladder, pendulum, compass, crank, tangent, dot};
export {crankRig} from './mechanisms.ts';
