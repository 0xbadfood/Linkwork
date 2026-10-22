import type {Rig} from '../rig.ts';
import {figure} from './figure.ts';
import {compass, crank, ladder, pendulum} from './mechanisms.ts';

export const RIGS: Record<string, Rig> = {figure, ladder, pendulum, compass, crank};
export {crankRig} from './mechanisms.ts';
