// angle_measure: the plane angle and the solid angle as the book defines them (Class 11 Units and Measurement C2,
// 2026-10-29). A plane angle is an arc's length over its radius, θ = s/r, in radians (an arc as long as the radius
// is 1 rad, about 57.3°; the whole circle 2π rad); a solid angle is a patch of a sphere's surface over the radius
// squared, Ω = A/r², in steradians (a patch of area r² is 1 sr; the whole sphere 4π sr). The arc grows, or the
// patch spreads, and the angle is counted from its measures.
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {round, type Vec} from '../vec.ts';

type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};
export type AngleSpec = Common & {
  verb: 'angle_measure';
  /** plane: an arc on a circle, θ = s/r; solid: a patch on a sphere seen from its centre, Ω = A/r². */
  kind: 'plane' | 'solid';
  /** The radius, in metres (default 2). */
  radius?: number;
  /** plane: the arc's length in metres (up to the whole circle, 2πr; default r: one radian). */
  arc?: number;
  /** solid: the patch's area in square metres (up to a hemisphere, 2πr²; default r²: one steradian). */
  area?: number;
  panel?: boolean;
  seconds?: number;
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const fmt = (x: number, d = 2) => String(round(x, d));
const TILT = 0.45;                                   // the solid angle's cap axis, out of the page (rad)

export function angleErrors(s: AngleSpec): string[] {
  const e: string[] = [];
  if (!['plane', 'solid'].includes(s.kind)) return ['angle_measure: kind is plane or solid'];
  const r = s.radius ?? 2;
  if (s.radius !== undefined && !(isNum(s.radius) && s.radius > 0 && s.radius <= 100)) e.push('angle_measure: radius is in metres, above 0 and up to 100');
  if (s.arc !== undefined && (s.kind !== 'plane' || !(isNum(s.arc) && s.arc > 0 && s.arc <= 2 * Math.PI * r + 1e-9)))
    e.push(`angle_measure: arc is for kind plane: its length in metres, above 0 and up to the whole circle (2πr = ${fmt(2 * Math.PI * r)} m)`);
  if (s.area !== undefined && (s.kind !== 'solid' || !(isNum(s.area) && s.area > 0 && s.area <= 2 * Math.PI * r * r + 1e-9)))
    e.push(`angle_measure: area is for kind solid: the patch in m², above 0 and up to a hemisphere (2πr² = ${fmt(2 * Math.PI * r * r)} m²)`);
  if (s.panel !== undefined && typeof s.panel !== 'boolean') e.push('angle_measure: panel is true or false');
  if (s.seconds !== undefined && !(isNum(s.seconds) && s.seconds >= 4 && s.seconds <= 20)) e.push('angle_measure: seconds is 4 to 20');
  return e;
}

export function angleMeasure(s: AngleSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, panel = s.panel !== false;
  const left = 0.04 * W, right = panel ? 0.62 * W : 0.96 * W, top = (panel ? 0.14 : s.title ? 0.24 : 0.14) * H, bottom = 0.94 * H;
  const T = s.seconds ?? 10, props: Prop[] = [], facts: string[] = [], anchors: Record<string, Vec> = {}, lines: string[] = [];
  const r = s.radius ?? 2, c: Vec = [left + 0.42 * (right - left), (top + bottom) / 2], R = Math.min(0.36 * (right - left), 0.36 * (bottom - top));
  const t0 = 1.0, t1 = Math.min(T - 2.5, t0 + 4);
  const text = (id: string, value: string, [x, y]: Vec, t: number, fill = 'ink', size = 30, align: 'start' | 'middle' | 'end' = 'start', weight = 700) =>
    props.push({id, type: 'text', x: round(x, 2), y: round(y, 2), text: value, size: size * k, align, weight, show: [t, 1e9], fade: 0.3, style: {fill, stroke: 'paper', width: 6 * k}, layer: 8});
  const at = (a: number, rr = R): Vec => [round(c[0] + rr * Math.cos(a), 2), round(c[1] - rr * Math.sin(a), 2)];
  if (s.kind === 'plane') {
    const sLen = s.arc ?? r, theta = sLen / r, N = 72;
    props.push({id: 'circle', type: 'circle', x: c[0], y: c[1], r: round(R, 2), style: {stroke: 'faint', width: 3 * k}, layer: 1},
      {id: 'centre', type: 'circle', x: c[0], y: c[1], r: 6 * k, style: {fill: 'ink'}, layer: 5});
    // The arc, drawn on from the first radius; the second radius turns with its end.
    const arcPts = Array.from({length: N + 1}, (_, i) => at(theta * i / N));
    props.push({id: 'arc', type: 'polyline', points: arcPts, draw: 0, keys: {draw: [[t0, 0], [t1, 1, 'linear']]}, style: {stroke: 'accent', width: 8 * k}, layer: 4},
      {id: 'radius0', type: 'line', x1: c[0], y1: c[1], x2: at(0)[0], y2: at(0)[1], style: {stroke: 'cool', width: 4 * k}, layer: 3});
    const steps = Array.from({length: 25}, (_, i) => t0 + (t1 - t0) * i / 24);
    props.push({id: 'radius1', type: 'line', x1: c[0], y1: c[1], x2: at(0)[0], y2: at(0)[1], keys: {x2: steps.map(t => [t, at(theta * (t - t0) / (t1 - t0))[0], 'linear'] as [number, number, 'linear']), y2: steps.map(t => [t, at(theta * (t - t0) / (t1 - t0))[1], 'linear'] as [number, number, 'linear'])}, style: {stroke: 'cool', width: 4 * k}, layer: 3});
    text('r-label', `r = ${fmt(r)} m`, [(c[0] + at(0)[0]) / 2, c[1] + 34 * k], 0.3, 'cool', 28, 'middle');
    text('s-label', `s = ${fmt(sLen)} m`, at(theta / 2, R + 46 * k), t1, 'accent', 28, 'middle');
    // A small mark of the angle at the centre.
    props.push({id: 'theta-mark', type: 'polyline', points: Array.from({length: 25}, (_, i) => at(Math.min(theta, 2 * Math.PI) * i / 24, 0.18 * R)), show: [t1, 1e9], fade: 0.3, style: {stroke: 'ink', width: 3 * k}, layer: 5});
    text('theta-label', 'θ', at(Math.min(theta, 2 * Math.PI) / 2, 0.28 * R), t1, 'ink', 30, 'middle');
    const deg = theta * 180 / Math.PI, whole = Math.abs(theta - 2 * Math.PI) < 1e-6;
    text('reading', `θ = s / r = ${fmt(sLen)} / ${fmt(r)} = ${fmt(theta, 3)} rad`, [left, bottom - 70 * k], t1 + 0.4, 'accent', 32);
    text('degrees', whole ? 'the whole circle: 2π rad = 360°' : `= ${fmt(deg, 1)}°${Math.abs(theta - 1) < 1e-9 ? '   (1 rad: an arc as long as the radius)' : ''}`, [left, bottom - 28 * k], t1 + 0.9, 'muted', 28, 'start', 500);
    anchors.centre = c; anchors.arc_end = at(theta);
    lines.push('A plane angle: arc length over radius', 'θ = s / r, in radians (rad)', 'An arc as long as the radius makes 1 rad ≈ 57.3°', 'The whole circle: 2πr / r = 2π rad');
    facts.push(`an arc of ${fmt(sLen)} m on a circle of radius ${fmt(r)} m subtends θ = s/r = ${fmt(theta, 3)} rad (${fmt(deg, 1)}°) at the centre`, 'the radian is the SI unit of plane angle; a full circle is 2π rad');
  } else {
    const A = s.area ?? r * r, omega = A / (r * r);
    // The cap whose area is A: half-angle α with A = 2πr²(1 − cos α).
    const alpha = Math.acos(1 - A / (2 * Math.PI * r * r)), axis = Math.PI / 4, ry = 0.32;   // the cap's axis up-right; the equator seen at a slant
    props.push({id: 'sphere', type: 'circle', x: c[0], y: c[1], r: round(R, 2), style: {stroke: 'faint', width: 3 * k}, layer: 1},
      {id: 'equator', type: 'polyline', points: Array.from({length: 61}, (_, i) => { const a = 2 * Math.PI * i / 60; return [round(c[0] + R * Math.cos(a), 2), round(c[1] + ry * R * Math.sin(a), 2)] as Vec; }), closed: true, style: {stroke: 'faint', width: 2 * k, opacity: 0.6}, layer: 1},
      {id: 'centre', type: 'circle', x: c[0], y: c[1], r: 6 * k, style: {fill: 'ink'}, layer: 5});
    // The rim of the cap: a circle of radius R sin α at distance R cos α along the axis, drawn as an ellipse across it.
    const u: Vec = [Math.cos(axis), -Math.sin(axis)], v: Vec = [Math.sin(axis), Math.cos(axis)];
    const rimAt = (a: number, grow: number): Vec => {
      const al = alpha * grow, d = R * Math.cos(al), w = R * Math.sin(al);
      // The cap's axis tilted β out of the page: its rim, projected, stays on the sphere's disc.
      const along = d * Math.cos(TILT) - w * Math.sin(a) * Math.sin(TILT);
      return [round(c[0] + u[0] * along + v[0] * w * Math.cos(a), 2), round(c[1] + u[1] * along + v[1] * w * Math.cos(a), 2)];
    };
    const frames = 5;
    for (let f = 1; f <= frames; f++) {
      const g = f / frames, t = t0 + (t1 - t0) * (f - 1) / frames, last = f === frames;
      const rim = Array.from({length: 49}, (_, i) => rimAt(2 * Math.PI * i / 48, g));
      props.push({id: `cap${f}`, type: 'polyline', points: rim, closed: true, show: [t, last ? 1e9 : t + (t1 - t0) / frames + 0.2], fade: 0.2, style: {stroke: 'accent', width: 5 * k, fill: 'accent', opacity: 0.35}, layer: 4});
      const [p1, p2] = [rimAt(0, g), rimAt(Math.PI, g)];
      props.push({id: `cone${f}a`, type: 'line', x1: c[0], y1: c[1], x2: p1[0], y2: p1[1], show: [t, last ? 1e9 : t + (t1 - t0) / frames + 0.2], fade: 0.2, style: {stroke: 'cool', width: 3 * k}, layer: 3},
        {id: `cone${f}b`, type: 'line', x1: c[0], y1: c[1], x2: p2[0], y2: p2[1], show: [t, last ? 1e9 : t + (t1 - t0) / frames + 0.2], fade: 0.2, style: {stroke: 'cool', width: 3 * k}, layer: 3});
    }
    const edge = at(Math.PI + 0.35);
    props.push({id: 'radius', type: 'line', x1: c[0], y1: c[1], x2: edge[0], y2: edge[1], style: {stroke: 'cool', width: 4 * k}, layer: 3});
    text('r-label', `r = ${fmt(r)} m`, [(c[0] + edge[0]) / 2, (c[1] + edge[1]) / 2 + 34 * k], 0.3, 'cool', 28, 'middle');
    const capC: Vec = [round(c[0] + u[0] * R * Math.cos(TILT), 2), round(c[1] + u[1] * R * Math.cos(TILT), 2)];
    text('a-label', `A = ${fmt(A)} m²`, [capC[0] + 60 * k, capC[1] - 40 * k], t1, 'accent', 28, 'start');
    const whole = Math.abs(omega - 2 * Math.PI) < 1e-6;
    text('reading', `Ω = A / r² = ${fmt(A)} / ${fmt(r * r)} = ${fmt(omega, 3)} sr`, [left, bottom - 70 * k], t1 + 0.4, 'accent', 32);
    text('note', whole ? 'a hemisphere: 2π sr; the whole sphere 4π sr' : Math.abs(omega - 1) < 1e-9 ? '1 sr: a patch of area r²; the whole sphere is 4π sr' : `the whole sphere: 4πr² / r² = 4π sr`, [left, bottom - 28 * k], t1 + 0.9, 'muted', 28, 'start', 500);
    anchors.centre = c; anchors.patch = capC;
    lines.push('A solid angle: a patch of a sphere over r²', 'Ω = A / r², in steradians (sr)', 'A patch of area r² makes 1 sr', 'The whole sphere: 4πr² / r² = 4π sr');
    facts.push(`a patch of ${fmt(A)} m² on a sphere of radius ${fmt(r)} m subtends Ω = A/r² = ${fmt(omega, 3)} sr at the centre`, 'the steradian is the SI unit of solid angle; a whole sphere is 4π sr');
  }
  if (panel) {
    const px = 0.66 * W, pw = W - px - 40 * k;
    let row = 0.14 * H;
    if (s.title) { props.push({id: 'title', type: 'text', x: px, y: row, text: s.title, size: 44 * k, weight: 700, width: pw}); row += wrapText(s.title, 44 * k, pw).length * 1.25 * 44 * k + 18 * k; }
    lines.forEach((value, j) => { props.push({id: `say${j}`, type: 'text', x: px, y: row, text: value, size: 30 * k, width: pw, weight: j ? 400 : 700, show: [0.6 + 1.2 * j, 1e9], fade: 0.3}); row += wrapText(value, 30 * k, pw).length * 1.3 * 30 * k + 12 * k; });
  } else if (s.title) props.push({id: 'title', type: 'text', x: left, y: 0.16 * H, text: s.title, size: 44 * k, weight: 700, width: 0.92 * W});
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: T, theme: s.theme ?? 'dark', props, actors: [], meta: {verb: 'angle_measure', facts, anchors}};
}
