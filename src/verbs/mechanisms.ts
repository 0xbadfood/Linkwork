// Mechanism verbs: a ladder sliding down a wall, a simple pendulum, a pair of compasses drawing an arc, and a
// slider-crank. Each is drawn by the core solver from its rig and constraints; every number on screen is a readout
// measured from the drawing, so it always agrees with what is shown.
import {crankRig} from '../rigs/mechanisms.ts';
import type {Actor, Prop, Scene} from '../scene.ts';
import {round, type Vec} from '../vec.ts';

type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};
const between = (x: unknown, lo: number, hi: number) => typeof x === 'number' && x >= lo && x <= hi;
const deg = (r: number) => r * 180 / Math.PI, rad = (d: number) => d * Math.PI / 180;
const panelText = (id: string, x: number, y: number, text: string, size: number, extra: Partial<Prop> = {}): Prop =>
  ({id, type: 'text', x, y, text, size, ...extra} as Prop);
const titleOf = (spec: Common, W: number, H: number, k: number): Prop[] =>
  spec.title ? [{id: 'title', type: 'text', x: 0.6 * W, y: 0.155 * H, size: 46 * k, weight: 700, text: spec.title}] : [];

// ---------------------------------------------------------------------------------------------------------------
export type LadderSlideSpec = Common & {verb: 'sliding_ladder'; length?: number; from_angle?: number; to_angle?: number;
  start?: number; slide_time?: number};

export function ladderSlideErrors(s: LadderSlideSpec): string[] {
  const e: string[] = [];
  const L = s.length ?? 5, a0 = s.from_angle ?? 70, a1 = s.to_angle ?? 30;
  if (!between(L, 1, 20)) e.push('sliding_ladder: length is in metres, 1 to 20');
  if (!between(a0, 10, 85) || !between(a1, 10, 85)) e.push('sliding_ladder: angles with the floor are between 10° and 85°');
  else if (!(a0 >= a1 + 5)) e.push('sliding_ladder: the ladder slides down, so from_angle must be at least 5° more than to_angle');
  if (!between(s.start ?? 1, 0.3, 10)) e.push('sliding_ladder: start is 0.3 to 10 s');
  if (!between(s.slide_time ?? 4, 1, 15)) e.push('sliding_ladder: slide_time is 1 to 15 s');
  return e;
}

export function slidingLadder(s: LadderSlideSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080;
  const L = s.length ?? 5, a0 = s.from_angle ?? 70, a1 = s.to_angle ?? 30, t0 = s.start ?? 1, T = s.slide_time ?? 4;
  const floor = 0.84 * H, wall = 0.16 * W, Lpx = 0.66 * H, perM = Lpx / L;
  const foot = (a: number): Vec => [wall + Lpx * Math.cos(rad(a)), floor];
  const v = L * (Math.cos(rad(a1)) - Math.cos(rad(a0))) / T;
  const actor: Actor = {id: 'ladder', rig: 'ladder', at: foot(a0), scale: Lpx / 100,
    base: [{t: 0, at: foot(a0)}, {t: t0, at: foot(a0)}, {t: t0 + T, at: foot(a1), ease: 'linear'}],
    angles: [{bone: 'ladder', kind: 'keys', keys: [[0, 180 - a0], [t0, 180 - a0], [t0 + T, 180 - a1, 'linear']]}],
    world: {sliders: [{joint: 'top', through: [[wall, 0], [wall, 1]]}]}, layer: 2};
  const x = 0.6 * W, y0 = 0.32 * H, m = 1 / perM;
  const corner: Vec = [wall, floor];
  const props: Prop[] = [
    {id: 'wall', type: 'rect', x: 0.1 * W, y: 0.08 * H, w: wall - 0.1 * W, h: floor - 0.08 * H, style: {fill: 'faint'}},
    {id: 'floor', type: 'line', x1: 0.1 * W, y1: floor, x2: 0.56 * W, y2: floor, style: {stroke: 'muted', width: 5 * k}},
    {id: 'dim-x', type: 'line', x1: wall, y1: floor + 34 * k, x2: 0, y2: 0, ends: [null, {actor: 'ladder', joint: 'foot', offset: [0, 34 * k]}], style: {stroke: 'accent', width: 4 * k}},
    {id: 'dim-y', type: 'line', x1: wall - 30 * k, y1: floor, x2: 0, y2: 0, ends: [null, {actor: 'ladder', joint: 'top', offset: [-30 * k, 0]}], style: {stroke: 'cool', width: 4 * k}},
    ...titleOf(s, W, H, k),
    {id: 'ro-x', type: 'readout', x, y: y0, size: 38 * k, text: 'base   x = {x} m', measures: {x: {kind: 'dx', a: corner, b: {actor: 'ladder', joint: 'foot'}, scale: m}}, style: {fill: 'accent'}},
    {id: 'ro-y', type: 'readout', x, y: y0 + 60 * k, size: 38 * k, text: 'height y = {y} m', measures: {y: {kind: 'dy', a: corner, b: {actor: 'ladder', joint: 'top'}, scale: m}}, style: {fill: 'cool'}},
    {id: 'ro-a', type: 'readout', x, y: y0 + 120 * k, size: 38 * k, text: 'angle  θ = {a}°', decimals: 1,
      measures: {a: {kind: 'angle', a: {actor: 'ladder', joint: 'top'}, b: {actor: 'ladder', joint: 'foot'}, c: {actor: 'ladder', joint: 'foot', offset: [-100, 0]}}}},
    panelText('law', x, y0 + 210 * k, `x² + y² = ${L}² = ${round(L * L, 2)} m², at every moment`, 32 * k, {style: {fill: 'muted'}}),
    panelText('rate', x, y0 + 290 * k, `The foot moves out at a steady ${v.toFixed(2)} m/s.`, 32 * k, {show: [t0 + 0.3 * T, 1e9]}),
    panelText('rate2', x, y0 + 340 * k, 'The top falls slowly at first, then faster.', 32 * k, {show: [t0 + 0.6 * T, 1e9]}),
  ];
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: t0 + T + 2, theme: s.theme ?? 'dark', props, actors: [actor],
    meta: {verb: 'sliding_ladder', length_m: L, foot_speed_m_s: round(v, 4)}};
}

// ---------------------------------------------------------------------------------------------------------------
export type PendulumSpec = Common & {verb: 'pendulum'; length?: number; amplitude?: number; g?: number; swings?: number; release?: number};

export const pendulumPeriod = (L: number, g: number) => 2 * Math.PI * Math.sqrt(L / g);

export function pendulumErrors(s: PendulumSpec): string[] {
  const e: string[] = [];
  if (!between(s.length ?? 1, 0.1, 5)) e.push('pendulum: length is in metres, 0.1 to 5');
  if (!between(s.amplitude ?? 12, 2, 20)) e.push('pendulum: amplitude is 2° to 20°; T = 2π√(L/g) holds only for small swings');
  if (!between(s.g ?? 9.8, 1, 30)) e.push('pendulum: g is 1 to 30 m/s²');
  if (!between(s.swings ?? 3, 1, 8) || !Number.isInteger(s.swings ?? 3)) e.push('pendulum: swings is a whole number, 1 to 8');
  if (!between(s.release ?? 1, 0.3, 10)) e.push('pendulum: release is 0.3 to 10 s');
  return e;
}

export function pendulum(s: PendulumSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080;
  const L = s.length ?? 1, A = s.amplitude ?? 12, g = s.g ?? 9.8, n = s.swings ?? 3, t0 = s.release ?? 1;
  const T = pendulumPeriod(L, g);
  const pivot: Vec = [0.3 * W, 0.14 * H], Lpx = 0.64 * H;
  const actor: Actor = {id: 'pendulum', rig: 'pendulum', at: pivot, scale: Lpx / 100, layer: 2,
    angles: [{bone: 'string', kind: 'keys', keys: [[0, -90 + A]], t1: t0}, {bone: 'string', kind: 'pendulum', t0, center: -90, amplitude: A, period: T}]};
  const x = 0.56 * W, y0 = 0.3 * H;
  const props: Prop[] = [
    {id: 'ceiling', type: 'rect', x: pivot[0] - 0.09 * W, y: pivot[1] - 0.05 * H, w: 0.18 * W, h: 0.05 * H, style: {fill: 'faint'}},
    {id: 'rest', type: 'line', x1: pivot[0], y1: pivot[1], x2: pivot[0], y2: pivot[1] + Lpx, style: {stroke: 'faint', width: 3 * k, dash: [8 * k, 10 * k]}},
    {id: 'path', type: 'trail', of: {actor: 'pendulum', joint: 'bob'}, t0, t1: t0 + T, style: {stroke: 'muted', width: 3 * k, dash: [3 * k, 9 * k]}},
    ...titleOf(s, W, H, k),
    panelText('law', x, y0, 'T = 2π √(L / g)', 44 * k, {weight: 700}),
    panelText('sub', x, y0 + 64 * k, `= 2π √(${L.toFixed(2)} m / ${g} m/s²) = ${T.toFixed(2)} s`, 34 * k),
    {id: 'ro-t', type: 'readout', x, y: y0 + 150 * k, size: 36 * k, text: 'time since release  {t} s', measures: {t: {kind: 'time', from: t0}}, show: [t0, 1e9], fade: 0.05},
    {id: 'ro-a', type: 'readout', x, y: y0 + 205 * k, size: 36 * k, text: 'angle θ = {a}°', decimals: 1,
      measures: {a: {kind: 'angle', a: {actor: 'pendulum', joint: 'bob'}, b: pivot, c: [pivot[0], pivot[1] + 100]}}},
  ];
  for (let i = 1; i <= n; i++) {
    props.push(panelText(`swing${i}`, x, y0 + 290 * k, `${i} full swing${i > 1 ? 's' : ''}: back at the start, ${(i * T).toFixed(2)} s`, 34 * k,
      {show: [t0 + i * T, i < n ? t0 + (i + 1) * T : 1e9], fade: 0.12, style: {fill: 'accent'}}));
  }
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: t0 + n * T + 1.5, theme: s.theme ?? 'dark', props, actors: [actor],
    meta: {verb: 'pendulum', period_s: round(T, 4)}};
}

// ---------------------------------------------------------------------------------------------------------------
export type CompassSpec = Common & {verb: 'compass_arc'; radius?: number; from?: number; sweep?: number; start?: number; draw_time?: number};

export function compassErrors(s: CompassSpec): string[] {
  const e: string[] = [];
  if (!between(s.radius ?? 4, 1, 8)) e.push('compass_arc: radius is in centimetres, 1 to 8');
  if (!between(s.sweep ?? 360, 10, 360)) e.push('compass_arc: sweep is 10° to 360°');
  if (!between(s.from ?? 0, -360, 360)) e.push('compass_arc: from is an angle in degrees');
  if (!between(s.start ?? 1, 0.3, 10)) e.push('compass_arc: start is 0.3 to 10 s');
  if (!between(s.draw_time ?? 3, 1, 10)) e.push('compass_arc: draw_time is 1 to 10 s');
  return e;
}

export function compassArc(s: CompassSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080;
  const r = s.radius ?? 4, from = s.from ?? 0, sweep = s.sweep ?? 360, t0 = s.start ?? 1, T = s.draw_time ?? 3;
  const perCm = Math.min(0.065 * H, 0.38 * H / r), rpx = r * perCm;
  const leg = Math.max(0.3 * H, 0.6 * rpx), alpha = deg(Math.acos(rpx / (2 * leg)));
  const c: Vec = [0.3 * W, 0.53 * H];
  const actor: Actor = {id: 'compass', rig: 'compass', at: c, scale: leg / 100, layer: 2,
    pose: [{t: 0, pose: {leg_a: alpha, leg_b: -2 * alpha}}],
    turn: [[0, from], [t0, from], [t0 + T, from + sweep, 'inOut']]};
  const x = 0.6 * W, y0 = 0.34 * H;
  const props: Prop[] = [
    {id: 'arc', type: 'trail', of: {actor: 'compass', joint: 'pencil'}, t0, t1: t0 + T, style: {stroke: 'accent', width: 5 * k}, layer: 1},
    {id: 'centre-a', type: 'line', x1: c[0] - 12 * k, y1: c[1], x2: c[0] + 12 * k, y2: c[1], style: {stroke: 'muted', width: 3 * k}},
    {id: 'centre-b', type: 'line', x1: c[0], y1: c[1] - 12 * k, x2: c[0], y2: c[1] + 12 * k, style: {stroke: 'muted', width: 3 * k}},
    ...titleOf(s, W, H, k),
    {id: 'ro-r', type: 'readout', x, y: y0, size: 40 * k, text: 'radius r = {r} cm', decimals: 1,
      measures: {r: {kind: 'distance', a: {actor: 'compass', joint: 'needle'}, b: {actor: 'compass', joint: 'pencil'}, scale: 1 / perCm}}},
    panelText('keep', x, y0 + 70 * k, 'The needle stays at the centre and the', 32 * k, {style: {fill: 'muted'}}),
    panelText('keep2', x, y0 + 115 * k, 'spread never changes, so every point', 32 * k, {style: {fill: 'muted'}}),
    panelText('keep3', x, y0 + 160 * k, 'of the circle is r from the centre.', 32 * k, {style: {fill: 'muted'}}),
  ];
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: t0 + T + 1.5, theme: s.theme ?? 'dark', props, actors: [actor],
    meta: {verb: 'compass_arc', radius_cm: r, px_per_cm: round(perCm, 3)}};
}

// ---------------------------------------------------------------------------------------------------------------
export type CrankSpec = Common & {verb: 'slider_crank'; crank?: number; rod?: number; rpm?: number; turns?: number; start?: number};

/** Piston distance from the crank centre: x = r cos θ + √(l² − r² sin² θ). */
export const pistonX = (r: number, l: number, theta: number) =>
  r * Math.cos(rad(theta)) + Math.sqrt(l * l - (r * Math.sin(rad(theta))) ** 2);

export function crankErrors(s: CrankSpec): string[] {
  const e: string[] = [];
  const r = s.crank ?? 5, l = s.rod ?? 15;
  if (!between(r, 1, 20)) e.push('slider_crank: crank is in centimetres, 1 to 20');
  if (!between(l, 1, 80)) e.push('slider_crank: rod is in centimetres, 1 to 80');
  else if (l < 1.5 * r) e.push('slider_crank: the rod must be at least 1.5 times the crank, or the mechanism jams');
  if (!between(s.rpm ?? 20, 5, 60)) e.push('slider_crank: rpm is 5 to 60 (faster is too quick to follow)');
  if (!between(s.turns ?? 2, 1, 5)) e.push('slider_crank: turns is 1 to 5');
  if (!between(s.start ?? 1, 0.3, 10)) e.push('slider_crank: start is 0.3 to 10 s');
  return e;
}

export function sliderCrank(s: CrankSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080;
  const r = s.crank ?? 5, l = s.rod ?? 15, rpm = s.rpm ?? 20, turns = s.turns ?? 2, t0 = s.start ?? 1;
  const omega = rpm * 6, perCm = 0.5 * W / (r + l), rpx = r * perCm, lpx = l * perCm;
  const c: Vec = [0.12 * W + rpx, 0.42 * H];
  const scale = rpx / 100;
  const actor: Actor = {id: 'crank', rig: crankRig(l / r), at: c, scale, layer: 2,
    skin: {width: 9 / scale * k, joints: {center: {style: 'pivot', size: 24 / scale * k}, pin: {style: 'pivot', size: 18 / scale * k},
      piston: {style: 'block', size: 34 / scale * k}}},
    angles: [{bone: 'crank', kind: 'spin', t0, from: 0, rate: omega}, {bone: 'rod', kind: 'spin', t0, from: 0, rate: -omega}],
    world: {sliders: [{joint: 'piston', through: [c, [c[0] + 1, c[1]]]}]}};
  const near = c[0] + lpx - rpx, far = c[0] + lpx + rpx, half = 34 * k * 0.9 + 6 * k;
  const x = 0.12 * W, y0 = 0.68 * H;
  const props: Prop[] = [
    {id: 'circle', type: 'polyline', points: Array.from({length: 73}, (_, i) => [c[0] + rpx * Math.cos(rad(i * 5)), c[1] - rpx * Math.sin(rad(i * 5))] as Vec),
      style: {stroke: 'faint', width: 3 * k, dash: [6 * k, 8 * k]}},
    {id: 'bore-top', type: 'line', x1: near - 60 * k, y1: c[1] - half, x2: far + 60 * k, y2: c[1] - half, style: {stroke: 'muted', width: 4 * k}},
    {id: 'bore-bottom', type: 'line', x1: near - 60 * k, y1: c[1] + half, x2: far + 60 * k, y2: c[1] + half, style: {stroke: 'muted', width: 4 * k}},
    {id: 'stroke-near', type: 'line', x1: near, y1: c[1] + half + 14 * k, x2: near, y2: c[1] + half + 44 * k, style: {stroke: 'accent', width: 3 * k}},
    {id: 'stroke-far', type: 'line', x1: far, y1: c[1] + half + 14 * k, x2: far, y2: c[1] + half + 44 * k, style: {stroke: 'accent', width: 3 * k}},
    panelText('stroke', (near + far) / 2, c[1] + half + 70 * k, `stroke = 2r = ${2 * r} cm`, 30 * k, {align: 'middle', style: {fill: 'accent'}}),
    ...(s.title ? [panelText('title', 0.5 * W, 0.155 * H, s.title, 46 * k, {weight: 700, align: 'middle'})] : []),
    {id: 'ro-theta', type: 'readout', x, y: y0, size: 38 * k, text: 'crank angle θ = {a}°', decimals: 0,
      measures: {a: {kind: 'heading', a: {actor: 'crank', joint: 'center'}, b: {actor: 'crank', joint: 'pin'}}}},
    {id: 'ro-x', type: 'readout', x, y: y0 + 60 * k, size: 38 * k, text: 'piston at x = {x} cm from the centre', decimals: 2,
      measures: {x: {kind: 'dx', a: {actor: 'crank', joint: 'center'}, b: {actor: 'crank', joint: 'piston'}, scale: 1 / perCm}}, style: {fill: 'accent'}},
    panelText('law', x, y0 + 130 * k, `x = r cos θ + √(l² − r² sin² θ),   r = ${r} cm, l = ${l} cm`, 32 * k, {style: {fill: 'muted'}}),
  ];
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: t0 + turns * 60 / rpm + 1, theme: s.theme ?? 'dark', props, actors: [actor],
    meta: {verb: 'slider_crank', px_per_cm: round(perCm, 4), period_s: 60 / rpm}};
}
