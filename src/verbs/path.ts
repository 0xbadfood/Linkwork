// path_length: distance travelled along a route against displacement (user, 2026-10-24). A walker (or a dot) goes
// along a route drawn on the ground, seen from above: a winding trail, a road with turns, there and back again. The
// path it has covered draws itself and is measured as it goes (an odometer), while a straight arrow from the start to
// where it is now shows the displacement, measured from the drawing. At the end the average speed (path length over
// time) and the size of the average velocity (displacement over time) are set side by side: equal only for a straight
// one-way trip, and a round trip has zero displacement whatever the path.
import type {Key} from '../keys.ts';
import {toScene, type Plane} from '../plane.ts';
import type {Actor, Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {dist, round, type Vec} from '../vec.ts';
import {n2, walking} from './calculus.ts';

type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};
export type PathSpec = Common & {
  verb: 'path_length';
  /** The ground's size in metres (width, depth); the route's points are in metres on it, (0, 0) at the lower left. */
  area: [number, number];
  /** 2–30 points the route passes through, in order; smooth: a curving trail through them, not straight legs. */
  route: Vec[]; smooth?: boolean;
  /** Back to the start along the same route after reaching the end (a round trip). */
  back?: boolean;
  /** Seconds the animation takes, at a steady speed. */
  duration: number;
  /** The trip's real time in seconds (a 15-minute walk is 900), for the clock and the averages; default: duration. */
  trip_seconds?: number;
  mover?: 'figure' | 'dot';
  labels?: {start?: string; end?: string};
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const fmt = (v: number) => n2(Number(v.toFixed(2)), 2).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');

/** The route as a fine polyline: straight legs, or a Catmull-Rom curve through the points. */
function trace(s: PathSpec): Vec[] {
  const p = s.route;
  if (!s.smooth || p.length < 3) return p.map(q => [...q] as Vec);
  const out: Vec[] = [];
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], d = p[Math.min(p.length - 1, i + 2)];
    for (let j = 0; j < 16; j++) {
      const t = j / 16, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(k => 0.5 * (2 * b[k] + (-a[k] + c[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t3)) as Vec);
    }
  }
  out.push([...p.at(-1)!] as Vec);
  return out;
}

export function pathErrors(s: PathSpec): string[] {
  const e: string[] = [];
  const [w, h] = s.area ?? [NaN, NaN];
  if (!(isNum(w) && isNum(h) && w > 0 && h > 0 && w <= 1e6 && h <= 1e6)) return ['path_length: area is [width, depth] in metres'];
  if (h > w * 0.75) e.push('path_length: the area is drawn wide: keep its depth at most 3/4 of its width');
  if (!Array.isArray(s.route) || s.route.length < 2 || s.route.length > 30) return [...e, 'path_length: route is 2 to 30 points [x, y] in metres'];
  s.route.forEach((q, i) => {
    if (!Array.isArray(q) || !isNum(q[0]) || !isNum(q[1])) e.push(`path_length: route point ${i + 1} is [x, y]`);
    else if (q[0] < 0 || q[0] > w || q[1] < 0 || q[1] > h) e.push(`path_length: route point ${i + 1} is off the area (0 to ${w}, 0 to ${h} m)`);
  });
  if (!(isNum(s.duration) && s.duration >= 2 && s.duration <= 60)) e.push('path_length: duration is 2 to 60 seconds');
  if (s.trip_seconds !== undefined && !(isNum(s.trip_seconds) && s.trip_seconds > 0 && s.trip_seconds <= 1e6)) e.push('path_length: trip_seconds is the real time of the trip, in seconds');
  if (s.mover !== undefined && !['figure', 'dot'].includes(s.mover)) e.push('path_length: mover is figure or dot');
  for (const k of ['start', 'end'] as const) {
    const l = s.labels?.[k];
    if (l !== undefined && (typeof l !== 'string' || l.length > 24)) e.push(`path_length: labels.${k} is a short name (24 characters)`);
  }
  return e;
}

export function pathLength(s: PathSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080;
  const [w, h] = s.area;
  const left = 0.05 * W, right = 0.6 * W, unit = (right - left) / w, top = 0.55 * H - (h * unit) / 2;
  const plane: Plane = {id: 'g', x: [0, w], y: [0, h], box: [left, Math.max(0.12 * H, top), right, Math.max(0.12 * H, top) + h * unit]};
  const P = (q: Vec) => toScene(plane, q);
  const out = trace(s), legs = s.back ? [...out, ...out.slice(0, -1).reverse()] : out;
  const cum = [0];
  for (let i = 1; i < legs.length; i++) cum.push(cum[i - 1] + dist(legs[i - 1], legs[i]));
  const total = cum.at(-1)!, T0 = 1.2, T = s.duration, trip = s.trip_seconds ?? T, speed = total / trip;
  // Constant speed: each point is reached at the time its share of the path takes.
  const times = cum.map(c => T0 + T * c / total);
  const base = legs.map((q, i) => ({t: round(times[i], 4), at: P(q), ...(i ? {ease: 'linear' as const} : {})}));
  const props: Prop[] = [
    {id: 'ground', type: 'rect', x: plane.box[0], y: plane.box[1], w: right - left, h: h * unit, style: {fill: 'faint', stroke: 'muted', width: 2 * k, opacity: 0.35}},
    {id: 'route', type: 'polyline', points: out.map(P), style: {stroke: 'muted', width: 10 * k, opacity: 0.45, cap: 'round'}},
    {id: 'covered', type: 'trail', of: {actor: 'm', joint: 'p'}, t0: T0, step: 1 / 15, style: {stroke: 'accent', width: 6 * k}, layer: 2},
    {id: 'start', type: 'circle', x: P(out[0])[0], y: P(out[0])[1], r: 10 * k, style: {fill: 'cool'}, layer: 3},
    {id: 'end', type: 'circle', x: P(out.at(-1)!)[0], y: P(out.at(-1)!)[1], r: 10 * k, style: {fill: 'cool'}, layer: 3},
    {id: 'disp', type: 'arrow', x1: P(out[0])[0], y1: P(out[0])[1], x2: P(out[0])[0], y2: P(out[0])[1], head: 20 * k, show: [T0, 1e9],
      ends: [null, {actor: 'm', joint: 'p'}], style: {stroke: 'cool', width: 5 * k, dash: [14 * k, 8 * k]}, layer: 4},
  ];
  for (const [key, at, dy] of [['start', out[0], 34], ['end', out.at(-1)!, 34]] as const) {
    const text = s.labels?.[key];
    if (text) props.push({id: `${key}-label`, type: 'text', x: P(at)[0], y: P(at)[1] + dy * k, text, size: 26 * k, align: 'middle', weight: 700, style: {fill: 'cool'}});
  }
  const actors: Actor[] = [{id: 'm', rig: 'dot', at: P(out[0]), base, scale: 1.3 * k, layer: 5, blink: [],
    ...(s.mover === 'figure' ? {opacity: [[0, 0]] as Key[]} : {})}];
  if (s.mover === 'figure') {
    const facings = legs.slice(1).flatMap((q, i) => (Math.abs(q[0] - legs[i][0]) > 1e-9 ? [{t: times[i], facing: (q[0] > legs[i][0] ? 1 : -1) as 1 | -1}] : []))
      .filter((x, i, all) => !i || x.facing !== all[i - 1].facing);
    actors.push({id: 'walker', rig: 'figure', at: P(out[0]), base, scale: 0.55 * k, facing: facings[0]?.facing ?? 1, facings,
      pose: [{t: 0, pose: 'stand'}, ...walking(T0, T0 + T)], layer: 5});
  }
  // The panel: path covered (computed from the route), displacement (measured from the drawing), then the averages.
  const px = 0.66 * W, pw = W - px - 40 * k;
  let row = 0.16 * H;
  if (s.title) {
    props.push({id: 'title', type: 'text', x: px, y: row, text: s.title, size: 44 * k, weight: 700, width: pw});
    row += wrapText(s.title, 44 * k, pw).length * 1.25 * 44 * k + 24 * k;
  }
  const covered: Key[] = cum.map((c, i) => [round(times[i], 4), c, 'linear'] as Key);
  props.push({id: 'ro-t', type: 'readout', x: px, y: row, size: 34 * k, text: 't = {t} s', decimals: 1, measures: {t: {kind: 'keys', keys: [[T0, 0], [T0 + T, trip, 'linear']]}}},
    {id: 'ro-s', type: 'readout', x: px, y: row + 1.35 * 34 * k, size: 34 * k, text: 'path length = {s} m', decimals: 1, measures: {s: {kind: 'keys', keys: covered}}, style: {fill: 'accent'}},
    {id: 'ro-d', type: 'readout', x: px, y: row + 2.7 * 34 * k, size: 34 * k, text: 'displacement = {d} m', decimals: 1,
      measures: {d: {kind: 'distance', a: P(out[0]), b: {actor: 'm', joint: 'p'}, scale: 1 / unit}}, style: {fill: 'cool'}});
  row += 4.4 * 34 * k;
  const net = dist(legs[0], legs.at(-1)!), end = T0 + T + 0.3;
  props.push({id: 'avg-speed', type: 'text', x: px, y: row, width: pw, size: 32 * k, weight: 700, show: [end, 1e9], style: {fill: 'accent'},
      text: `average speed = ${fmt(total)} m ÷ ${fmt(trip)} s = ${fmt(speed)} m/s`},
    {id: 'avg-vel', type: 'text', x: px, y: row + 2.6 * 32 * k, width: pw, size: 32 * k, weight: 700, show: [end + 0.8, 1e9], style: {fill: 'cool'},
      text: `size of average velocity = ${fmt(net)} m ÷ ${fmt(trip)} s = ${fmt(net / trip)} m/s`});
  const facts = [`the path is ${fmt(total)} m long${s.back ? ' (there and back)' : ''}, covered in ${fmt(trip)} s at ${fmt(speed)} m/s`,
    `displacement from start to finish: ${fmt(net)} m`, `average speed ${fmt(speed)} m/s; size of average velocity ${fmt(net / trip)} m/s`];
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: end + 2.5, theme: s.theme ?? 'dark', planes: [plane], props, actors,
    meta: {verb: 'path_length', facts, path: round(total, 6), displacement: round(net, 6)}};
}
