// number_line: the figure hops along a number line, one hop per term, so adding and subtracting (and negative
// numbers) become distances walked to the right and to the left. The sum builds at the top as it goes.
import type {Actor, Prop, Scene} from '../scene.ts';
import type {Vec} from '../vec.ts';

export type Hop = {at: number; by: number};
export type NumberLineSpec = {
  verb: 'number_line'; range: [number, number]; start: number; hops: Hop[];
  title?: string; width?: number; height?: number; fps?: number; duration?: number; theme?: 'dark' | 'light';
};

const CROUCH = 0.25, LAND = 0.4;
export const hopTime = (by: number) => 0.45 + 0.08 * Math.abs(by);
const signed = (x: number) => (x < 0 ? `− ${-x}` : `+ ${x}`);
const num = (x: number) => (x < 0 ? `−${-x}` : `${x}`);

export function numberLineErrors(spec: NumberLineSpec): string[] {
  const errors: string[] = [];
  const [a, b] = spec.range ?? [NaN, NaN];
  if (!Number.isInteger(a) || !Number.isInteger(b) || a >= b) errors.push('number_line: range is two whole numbers, low then high');
  else if (b - a > 20) errors.push('number_line: at most 20 steps across, or the numbers get too small to read');
  if (!Number.isInteger(spec.start) || spec.start < a || spec.start > b) errors.push(`number_line: start ${spec.start} must be a whole number in the range`);
  if (!Array.isArray(spec.hops) || !spec.hops.length) return [...errors, 'number_line: give at least one hop'];
  let at = spec.start, free = 0.5;
  spec.hops.forEach((h, i) => {
    const where = `number_line hop ${i + 1} (t = ${h.at} s)`;
    if (!Number.isInteger(h.by) || h.by === 0) errors.push(`${where}: by must be a whole number other than 0`);
    if (h.at < free) errors.push(`${where}: starts before the previous hop has landed (at ${free.toFixed(2)} s)`);
    at += h.by;
    if (at < a || at > b) errors.push(`${where}: lands on ${at}, off the line (${a} to ${b})`);
    free = h.at + CROUCH + hopTime(h.by) + LAND;
  });
  return errors;
}

export function numberLine(spec: NumberLineSpec): Scene {
  const W = spec.width ?? 1920, H = spec.height ?? 1080, k = H / 1080;
  const [a, b] = spec.range;
  const x0 = 0.08 * W, x1 = 0.92 * W, y = 0.7 * H, unit = (x1 - x0) / (b - a);
  const xOf = (n: number) => x0 + (n - a) * unit;
  const props: Prop[] = [
    {id: 'line', type: 'arrow', x1: x0 - 40 * k, y1: y, x2: x1 + 50 * k, y2: y, style: {stroke: 'muted', width: 5 * k}, head: 20 * k},
  ];
  for (let n = a; n <= b; n++) {
    const big = n === 0;
    props.push({id: `tick${n}`, type: 'line', x1: xOf(n), y1: y - (big ? 18 : 12) * k, x2: xOf(n), y2: y + (big ? 18 : 12) * k, style: {stroke: big ? 'ink' : 'muted', width: (big ? 5 : 4) * k}});
    props.push({id: `num${n}`, type: 'text', x: xOf(n), y: y + 50 * k, text: num(n), size: (big ? 36 : 32) * k, weight: big ? 700 : 500, align: 'middle', style: {fill: big ? 'ink' : 'muted'}});
  }
  if (spec.title) props.push({id: 'title', type: 'text', x: W / 2, y: 0.155 * H, size: 46 * k, weight: 700, align: 'middle', text: spec.title});

  const foot = (n: number): Vec => [xOf(n), y - 3 * k];
  const actor: Actor = {id: 'hopper', rig: 'figure', at: foot(spec.start), scale: 0.85 * k, facing: 1, drivers: [],
    pose: [{t: 0, pose: 'stand'}], facings: [], expression: [{t: 0, face: 'smile'}], layer: 2};
  let at = spec.start, sum = `${num(spec.start)}`;
  const stages: {t: number; text: string}[] = [{t: 0, text: sum}];
  spec.hops.forEach((h, i) => {
    const t0 = h.at, lift = t0 + CROUCH, dur = hopTime(h.by), down = lift + dur, to = at + h.by;
    const height = (70 + 18 * Math.abs(h.by)) * k;
    actor.facings!.push({t: t0, facing: h.by > 0 ? 1 : -1});
    actor.pose!.push({t: t0, pose: 'stand'}, {t: lift, pose: 'crouch'}, {t: lift + 0.2, pose: 'leap'},
      {t: lift + dur * 0.55, pose: 'tuck'}, {t: down, pose: 'land'}, {t: down + LAND, pose: 'stand'});
    actor.drivers!.push({t0: lift, t1: down, driver: 'arc', from: foot(at), to: foot(to), height});
    actor.expression!.push({t: lift, face: 'focus'}, {t: down, face: 'grin'});
    // The hop's arc stays behind as a dotted trail with its size on top.
    const pts: Vec[] = [];
    for (let s = 0; s <= 24; s++) {
      const q = s / 24;
      pts.push([xOf(at) + (xOf(to) - xOf(at)) * q, y - 14 * k - 4 * height * q * (1 - q)]);
    }
    props.push({id: `trail${i}`, type: 'polyline', points: pts, draw: 0, keys: {draw: [[lift, 0], [down, 1, 'linear']]},
      style: {stroke: h.by > 0 ? 'accent' : 'cool', width: 5 * k, dash: [2 * k, 12 * k]}, show: [lift, 1e9], fade: 0.01, layer: 1});
    props.push({id: `size${i}`, type: 'text', x: (xOf(at) + xOf(to)) / 2, y: y - 14 * k - height - 34 * k, text: signed(h.by).replace(' ', ''),
      size: 40 * k, weight: 700, align: 'middle', style: {fill: h.by > 0 ? 'accent' : 'cool'}, show: [lift + dur * 0.4, 1e9]});
    props.push({id: `land${i}`, type: 'circle', x: xOf(to), y, r: 10 * k, style: {fill: h.by > 0 ? 'accent' : 'cool'}, show: [down, 1e9], pulse: [down]});
    sum = i === 0 && spec.start === 0 ? num(h.by) : `${sum} ${signed(h.by)}`;
    stages.push({t: down, text: i === 0 && spec.start === 0 ? sum : `${sum} = ${num(to)}`});
    at = to;
  });
  stages.forEach((s, i) => props.push({id: `sum${i}`, type: 'text', x: W / 2, y: 0.26 * H, size: 64 * k, weight: 700, align: 'middle', font: 'sans',
    text: s.text, show: [s.t, stages[i + 1]?.t ?? 1e9], fade: 0.15}));
  const last = spec.hops[spec.hops.length - 1];
  const duration = Math.max(spec.duration ?? 0, last.at + CROUCH + hopTime(last.by) + LAND + 2);
  return {linkwork: 1, width: W, height: H, fps: spec.fps ?? 30, duration, theme: spec.theme ?? 'dark',
    surfaces: [{x0: x0 - 40 * k, x1: x1 + 50 * k, y: y - 3 * k}], props, actors: [actor], meta: {verb: 'number_line', result: at}};
}
