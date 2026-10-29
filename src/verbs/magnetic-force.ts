// magnetic_force: the force on a current in a magnetic field (Class 10 Magnetic Effects of Electric Current, C6,
// 2026-10-29). The force is I L × B, computed: on a rod hung between a horseshoe magnet's poles it swings one way, the
// other way when the current or the field is reversed, further for a larger current (Activity 12.7); Fleming's
// left-hand rule sets field, current and force at right angles and finds the third from any two (a moving charge's
// current is along its motion if positive, against it if negative); a charge moving across a field curves at constant
// speed; and the force is largest with current and field at right angles, zero when they are parallel (F ∝ sin θ).
import type {Key} from '../keys.ts';
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {round, type Vec} from '../vec.ts';

type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};
type Way = 'north' | 'south' | 'east' | 'west' | 'up' | 'down';
export type ForceSpec = Common & {
  verb: 'magnetic_force';
  /** rod: a rod between a horseshoe magnet's poles (seen end-on); rule: Fleming's left-hand rule; particle: a charge
   * moving across a field; angle: a rod in the page, the field at an angle to it. */
  scene: 'rod' | 'rule' | 'particle' | 'angle';
  /** rod: the current out of or into the page; rule: a direction (north, south, east, west, up, down). */
  current?: 'out' | 'in' | Way;
  /** rod: up (N pole below) or down; rule: a direction; particle: in or out of the page. */
  field?: 'up' | 'down' | 'in' | 'out' | Way;
  /** rule: the force's direction, to find the field or the current from it. */
  force?: Way;
  /** rule, particle: a moving charge instead of a current; rule: its motion is given as current. */
  charge?: 'positive' | 'negative';
  /** rod: half-way, the current or the field is reversed. */
  reverse?: 'current' | 'field';
  /** rod: currents in A shown in turn (a larger current, a larger swing; 0: no current, the rod hangs still). */
  currents?: number[];
  /** rod: the equal and opposite force on the magnet beside the force on the rod (Ampère's suggestion). */
  reaction?: boolean;
  /** angle: angles between the rod and the field shown in turn, in degrees (default 90, 45, 0). */
  angles?: number[];
  panel?: boolean;
  seconds?: number;
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const WAYS: Record<Way, [number, number, number]> = {east: [1, 0, 0], west: [-1, 0, 0], north: [0, 1, 0], south: [0, -1, 0], up: [0, 0, 1], down: [0, 0, -1]};
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const named = (v: number[]) => (Object.keys(WAYS) as Way[]).find(w => WAYS[w].every((c, i) => Math.abs(c - v[i]) < 1e-9));
/** Fleming's left-hand rule: the third of field, current and force from the other two (null if they are parallel). */
export function fleming(s: {current?: Way; field?: Way; force?: Way}): {current: Way; field: Way; force: Way} | null {
  const c = s.current && WAYS[s.current], b = s.field && WAYS[s.field], f = s.force && WAYS[s.force];
  if (c && b) { const w = named(cross(c, b)); return w ? {current: s.current!, field: s.field!, force: w} : null; }
  if (c && f) { const w = named(cross(f, c)); return w ? {current: s.current!, field: w, force: s.force!} : null; }        // F = I × B, so B = F × I
  if (b && f) { const w = named(cross(b, f)); return w ? {current: w, field: s.field!, force: s.force!} : null; }        // and I = B × F
  return null;
}

export function forceErrors(s: ForceSpec): string[] {
  const e: string[] = [], ways = Object.keys(WAYS);
  if (!['rod', 'rule', 'particle', 'angle'].includes(s.scene)) return ['magnetic_force: scene is rod, rule, particle or angle'];
  if (s.scene === 'rod') {
    if (s.current !== undefined && !['out', 'in'].includes(s.current)) e.push('magnetic_force: rod: current is out or in (of the page)');
    if (s.field !== undefined && !['up', 'down'].includes(s.field)) e.push('magnetic_force: rod: field is up (N pole below) or down');
    if (s.reverse !== undefined && !['current', 'field'].includes(s.reverse)) e.push('magnetic_force: reverse is current or field');
    if (s.currents !== undefined && (!Array.isArray(s.currents) || s.currents.length < 1 || s.currents.length > 3 || s.currents.some(c => !(isNum(c) && c >= 0 && c <= 10)) || s.currents.every(c => c === 0)))
      e.push('magnetic_force: currents is a list of 1 to 3 currents, each 0 (none: the rod hangs still) up to 10 A, not all 0');
    if (s.reaction !== undefined && typeof s.reaction !== 'boolean') e.push('magnetic_force: reaction is true or false');
    if (s.reverse && (s.currents?.length ?? 1) > 1) e.push('magnetic_force: reverse with one current, or currents without reverse');
  } else {
    if (s.reverse !== undefined || s.currents !== undefined || s.reaction !== undefined) e.push('magnetic_force: reverse, currents and reaction are for scene rod');
  }
  if (s.scene === 'rule') {
    const given = (['current', 'field', 'force'] as const).filter(f => s[f] !== undefined);
    if (given.length !== 2) e.push('magnetic_force: rule: give two of current, field and force; the third is found');
    for (const f of given) if (!ways.includes(s[f] as string)) e.push(`magnetic_force: rule: ${f} is north, south, east, west, up or down`);
    if (given.length === 2 && given.every(f => ways.includes(s[f] as string)) && !fleming(s as {current?: Way; field?: Way; force?: Way}))
      e.push('magnetic_force: rule: the two directions given are parallel or opposite: they must be at right angles');
  } else if (s.force !== undefined) e.push('magnetic_force: force is for scene rule');
  if (s.scene === 'particle' && s.field !== undefined && !['in', 'out'].includes(s.field)) e.push('magnetic_force: particle: field is in or out (of the page)');
  if (s.charge !== undefined && (!['positive', 'negative'].includes(s.charge) || !['rule', 'particle'].includes(s.scene))) e.push('magnetic_force: charge is positive or negative, for scene rule or particle');
  if (s.angles !== undefined && (s.scene !== 'angle' || !Array.isArray(s.angles) || s.angles.length < 1 || s.angles.length > 4 || s.angles.some(a => !(isNum(a) && a >= 0 && a <= 90))))
    e.push('magnetic_force: angles (scene angle) is a list of 1 to 4 angles, 0 to 90 degrees');
  if (s.panel !== undefined && typeof s.panel !== 'boolean') e.push('magnetic_force: panel is true or false');
  if (s.seconds !== undefined && !(isNum(s.seconds) && s.seconds >= 4 && s.seconds <= 20)) e.push('magnetic_force: seconds is 4 to 20');
  return e;
}

export function magneticForce(s: ForceSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, panel = s.panel !== false;
  const left = 0.04 * W, right = panel ? 0.62 * W : 0.96 * W, top = (panel ? 0.13 : s.title ? 0.23 : 0.14) * H, bottom = 0.94 * H;
  const T = s.seconds ?? 10, props: Prop[] = [], facts: string[] = [], anchors: Record<string, Vec> = {}, lines: string[] = [];
  const cx = (left + right) / 2, cy = (top + bottom) / 2;
  const text = (id: string, value: string, [x, y]: Vec, fill = 'ink', size = 28, show: [number, number] = [0, 1e9], align: 'start' | 'middle' | 'end' = 'middle') =>
    props.push({id, type: 'text', x: round(x, 2), y: round(y, 2), text: value, size: size * k, align, weight: 700, show, fade: 0.3, style: {fill, stroke: 'paper', width: 6 * k}, layer: 9});
  const arrow = (id: string, a: Vec, b: Vec, stroke: string, show: [number, number] = [0, 1e9], width = 6) =>
    props.push({id, type: 'arrow', x1: round(a[0], 2), y1: round(a[1], 2), x2: round(b[0], 2), y2: round(b[1], 2), head: (16 + 3 * width) * k, show, fade: 0.25, style: {stroke, width: width * k}, layer: 7});
  /** A dot (out of the page) or cross (into it) in a ring, its x keyed when it moves. */
  const mark = (id: string, [x, y]: Vec, out: boolean, r: number, show: [number, number], fill: string, xs?: Key[]) => {
    const dx = (d: number): Key[] | undefined => xs?.map(([t, v, e]) => [t, round(v + d, 2), e] as Key);
    props.push({id, type: 'circle', x, y, r, show, fade: 0.25, ...(xs ? {keys: {x: dx(0)!}} : {}), style: {stroke: fill, width: 3 * k}, layer: 8});
    if (out) props.push({id: `${id}-dot`, type: 'circle', x, y, r: 0.3 * r, show, fade: 0.25, ...(xs ? {keys: {x: dx(0)!}} : {}), style: {fill}, layer: 8});
    else [[1, 1], [1, -1]].forEach(([a, b], j) => props.push({id: `${id}-x${j}`, type: 'line', x1: round(x - 0.6 * r * a, 2), y1: round(y - 0.6 * r * b, 2), x2: round(x + 0.6 * r * a, 2), y2: round(y + 0.6 * r * b, 2),
      show, fade: 0.25, ...(xs ? {keys: {x1: dx(-0.6 * r * a)!, x2: dx(0.6 * r * a)!}} : {}), style: {stroke: fill, width: 3 * k}, layer: 8}));
  };

  if (s.scene === 'rod') {
    // Phases: currents in turn, or the current or field reversed half-way.
    const I0 = s.currents?.[0] ?? 1, out0 = s.current !== 'in', up0 = s.field !== 'down';
    const phases = s.reverse === 'current' ? [{I: I0, out: out0, up: up0}, {I: I0, out: !out0, up: up0}]
      : s.reverse === 'field' ? [{I: I0, out: out0, up: up0}, {I: I0, out: out0, up: !up0}] : (s.currents ?? [I0]).map(I => ({I, out: out0, up: up0}));
    const Imax = Math.max(...phases.map(p => p.I)), span = T / phases.length, at = (i: number): [number, number] => [i * span, i === phases.length - 1 ? 1e9 : (i + 1) * span];
    // Seen along the rod: current out of the page (+z), field up (+y): F = I × B points left (−x).
    const gap = 150 * k, pw = 320 * k, ph = 70 * k, hang: Vec = [cx, top + 40 * k], rodY = cy;
    const shift = phases.map(p => (p.out === p.up ? -1 : 1) * 95 * k * p.I / Imax);
    const xs: Key[] = [[0, cx]];
    phases.forEach((_, i) => { const t = at(i)[0] + 0.8; xs.push([t, xs.at(-1)![1]], [t + 1.0, round(cx + shift[i], 2), 'out']); });
    props.push({id: 'stand', type: 'line', x1: round(cx - 200 * k, 2), y1: hang[1], x2: round(cx + 200 * k, 2), y2: hang[1], style: {stroke: 'muted', width: 10 * k}, layer: 2},
      {id: 'thread', type: 'line', x1: hang[0], y1: hang[1], x2: cx, y2: rodY, keys: {x2: xs}, style: {stroke: 'muted', width: 3 * k}, layer: 3},
      {id: 'yoke', type: 'polyline', points: [[cx + pw / 2, rodY - gap - ph / 2], [cx + pw / 2 + 90 * k, rodY - gap - ph / 2], [cx + pw / 2 + 90 * k, rodY + gap + ph / 2], [cx + pw / 2, rodY + gap + ph / 2]].map(([x, y]) => [round(x, 2), round(y, 2)] as Vec),
        style: {stroke: 'muted', width: 34 * k}, layer: 1},
      {id: 'rod', type: 'circle', x: cx, y: rodY, r: 26 * k, keys: {x: xs}, style: {fill: '#b8c2cc', stroke: 'ink', width: 2 * k}, layer: 6});
    phases.forEach((p, i) => {
      const show = at(i), [lo, hi] = p.up ? ['N', 'S'] : ['S', 'N'];
      [[lo, rodY + gap], [hi, rodY - gap]].forEach(([name, y], j) => {
        props.push({id: `pole${i}-${j}`, type: 'rect', x: round(cx - pw / 2, 2), y: round((y as number) - ph / 2, 2), w: round(pw, 2), h: round(ph, 2), r: 8 * k, show, style: {fill: name === 'N' ? '#e5484d' : '#3b7bff', opacity: 0.85}, layer: 2});
        text(`pole${i}-${j}-name`, name as string, [cx - pw / 2 + 40 * k, (y as number) + 14 * k], 'ink', 40, show);
      });
      for (let j = -2; j <= 2; j++) if (j) {
        const x = cx + j * 60 * k, [y1, y2] = p.up ? [rodY + gap - ph / 2 - 8 * k, rodY - gap + ph / 2 + 8 * k] : [rodY - gap + ph / 2 + 8 * k, rodY + gap - ph / 2 - 8 * k];
        arrow(`field${i}${j + 2}`, [x, y1], [x, y2], 'cool', show, 2.5);
      }
      if (!p.I) { text(`current${i}-label`, 'no current: no force', [cx, rodY + 70 * k], 'ink', 24, show); return; }
      mark(`current${i}`, [cx, rodY], p.out, 15 * k, show, 'ink', xs);
      const f = shift[i] / Math.abs(shift[i]), L = 70 * k + 60 * k * p.I / Imax;
      if (s.reaction) {
        // On the lower pole, the other way: the current pushes the magnet as hard as the magnet pushes the current.
        const y = rodY + gap, t: [number, number] = [at(i)[0] + 2.6, at(i)[1]];
        arrow(`reaction${i}`, [cx, y], [cx - f * L, y], 'accent', t);
        text(`reaction${i}-label`, 'force on the magnet', [cx - f * L / 2, y + ph / 2 + 30 * k], 'accent', 24, t);
      }
      arrow(`force${i}`, [cx + shift[i] + f * 34 * k, rodY], [cx + shift[i] + f * (34 * k + L), rodY], 'good', [at(i)[0] + 1.8, at(i)[1]]);
      text(`force${i}-label`, 'force', [cx + shift[i] + f * (34 * k + L / 2), rodY - 26 * k], 'good', 26, [at(i)[0] + 1.8, at(i)[1]]);
      text(`current${i}-label`, `current ${p.out ? 'out of' : 'into'} the page${phases.length > 1 && s.currents ? `: ${p.I} A` : ''}`, [cx, rodY + 70 * k], 'ink', 24, show);
    });
    text('field-label', 'magnetic field', [cx - pw / 2 - 16 * k, rodY + 0.55 * gap], 'cool', 24, [0, 1e9], 'end');
    anchors.rod = [cx, rodY]; anchors.north = [cx, round(rodY + (up0 ? gap : -gap), 2)]; anchors.south = [cx, round(rodY - (up0 ? gap : -gap), 2)];
    lines.push('A current in a magnetic field feels a force: the rod is pushed sideways');
    if (s.reverse === 'current') lines.push('Reverse the current: the force reverses');
    if (s.reverse === 'field') lines.push('Reverse the field (swap the poles): the force reverses');
    if ((s.currents?.length ?? 0) > 1) lines.push(s.currents!.includes(0) ? 'The rod moves only while the current flows' : 'A larger current: a larger force, a larger swing');
    if (s.reaction) {
      lines.push('The magnet feels an equal and opposite force (Ampère\'s suggestion)');
      facts.push('Ampère suggested that the magnet also experiences an equal and opposite force from the current-carrying conductor');
    }
    lines.push('The force is at right angles to both the current and the field (Fleming\'s left-hand rule)');
    facts.push('a current-carrying rod placed in a magnetic field experiences a force and is displaced: the magnet exerts a force on the current (Ampere)',
      'the direction of the force reverses when the direction of the current is reversed, and also when the direction of the field is reversed',
      'the force is largest when the current is at right angles to the field; it is larger for a larger current, a stronger magnet or a longer rod');
  } else if (s.scene === 'rule') {
    // Fleming's left-hand rule in a 3-D sketch: east to the right, north into the page (drawn up and to the right), up.
    // A negative charge moving one way is a current the other way.
    const neg = s.charge === 'negative', motion = s.charge ? s.current as Way : undefined;
    const given = s.current && neg ? named(WAYS[s.current as Way].map(c => -c)) : s.current as Way | undefined;
    const solved = fleming({current: given, field: s.field as Way | undefined, force: s.force})!;
    const iso = ([x, y, z]: number[]): Vec => [round(cx + 260 * k * (x + 0.55 * y), 2), round(cy + 40 * k - 260 * k * (z + 0.4 * y), 2)];
    const o = iso([0, 0, 0]);
    // The ground's directions, faint.
    ([['E', [1, 0, 0]], ['W', [-1, 0, 0]], ['N', [0, 1, 0]], ['S', [0, -1, 0]]] as [string, number[]][]).forEach(([n, v], j) => {
      const e = iso(v.map(c => c * 1.4));
      props.push({id: `ground${j}`, type: 'line', x1: o[0], y1: o[1], x2: e[0], y2: e[1], style: {stroke: 'faint', width: 2 * k, dash: [8 * k, 8 * k]}, layer: 1});
      text(`ground${j}-name`, n, [e[0] + 18 * k * (v[0] + 0.6 * v[1]), e[1] + 10 * k - 12 * k * v[1]], 'muted', 26);
    });
    const known = (['field', 'current', 'force'] as const).filter(f => s[f] !== undefined);
    const order = [...known, ...(['field', 'current', 'force'] as const).filter(f => !known.includes(f))];
    const look: Record<string, [string, string]> = {field: ['cool', 'field (forefinger)'], current: ['accent', 'current (middle finger)'], force: ['good', 'force (thumb)']};
    const dir = solved as Record<string, Way>;
    order.forEach((f, j) => {
      const e = iso(WAYS[dir[f]]), t = 0.6 + 1.6 * j;
      arrow(`${f}-arrow`, o, e, look[f][0], [t, 1e9], 7);
      const off: Vec = [e[0] - o[0], e[1] - o[1]], m = Math.hypot(...off) || 1;
      const u: Vec = [off[0] / m, off[1] / m], align = u[0] > 0.3 ? 'start' : u[0] < -0.3 ? 'end' : 'middle';
      text(`${f}-label`, `${look[f][1]}: ${dir[f]}`, [e[0] + u[0] * 24 * k, e[1] + u[1] * 34 * k + (u[1] > 0.3 ? 18 : u[1] < -0.3 ? -4 : 9) * k], look[f][0], 26, [t, 1e9], align);
      anchors[f] = e;
    });
    if (motion) text('motion-label', `${neg ? 'negative' : 'positive'} charge moving ${motion}${neg ? `: current ${solved.current}` : ''}`, [cx, bottom - 30 * k], 'accent', 26, [0.3, 1e9]);
    anchors.origin = o;
    lines.push('Left hand: thumb, forefinger and middle finger at right angles', 'Forefinger: field. Middle finger: current. Thumb: force (motion)');
    const unknown = order[2];
    lines.push(`Given the ${order[0]} and the ${order[1]}, the ${unknown} is ${dir[unknown]}`);
    facts.push('Fleming\'s left-hand rule: stretch the thumb, forefinger and middle finger of the left hand mutually perpendicular; the forefinger points along the field, the middle finger along the current, and the thumb gives the direction of motion or force on the conductor',
      `here the field is ${dir.field}, the current ${dir.current} and the force ${dir.force}`);
    if (motion) facts.push(neg ? `a negative charge (an electron) moving ${motion} is a current flowing ${solved.current}, opposite to its motion` : `a positive charge moving ${motion} is a current in that direction`);
  } else if (s.scene === 'particle') {
    // A charge enters a field into the page (crosses) moving right; the force, at right angles to its velocity, bends it
    // into a circle at constant speed.
    const into = s.field !== 'out', pos = s.charge !== 'negative', bend = (into === pos ? -1 : 1);   // −1: curves up the page
    const x0 = left + 0.32 * (right - left), r = 0.22 * (bottom - top), y0 = cy + (bend < 0 ? 0.25 : -0.25) * (bottom - top) * 0.6;
    for (let a = 0; a < 7; a++) for (let b = 0; b < 6; b++) {
      const p: Vec = [round(x0 + 30 * k + a * (right - x0 - 40 * k) / 6.5, 2), round(top + 30 * k + b * (bottom - top - 60 * k) / 5, 2)];
      mark(`b${a}${b}`, p, !into, 12 * k, [0, 1e9], 'cool');
    }
    props.push({id: 'region', type: 'rect', x: round(x0, 2), y: round(top, 2), w: round(right - x0, 2), h: round(bottom - top, 2), style: {fill: 'cool', opacity: 0.06, stroke: 'cool', width: 2 * k}, layer: 0});
    // Path: straight to the edge, then a half circle at constant speed, then straight back out.
    const tEnter = 1.5, tTurn = tEnter + 4, tEnd = Math.min(T - 0.5, tTurn + 1.5), centre: Vec = [x0, y0 + bend * r];
    const at = (t: number): {p: Vec; v: Vec} => {
      if (t <= tEnter) return {p: [left + 20 * k + (x0 - left - 20 * k) * t / tEnter, y0], v: [1, 0]};
      if (t <= tTurn) { const a = Math.PI * (t - tEnter) / (tTurn - tEnter); return {p: [centre[0] + r * Math.sin(a), centre[1] - bend * r * Math.cos(a)], v: [Math.cos(a), bend * Math.sin(a)]}; }
      const u = (t - tTurn) / (tEnd - tTurn); return {p: [x0 - u * (x0 - left - 20 * k), y0 + 2 * bend * r], v: [-1, 0]};
    };
    const xs: Key[] = [], ys: Key[] = [], path: Vec[] = [];
    for (let j = 0; j <= 80; j++) { const t = tEnd * j / 80, {p} = at(t); xs.push([round(t, 3), round(p[0], 2), 'linear']); ys.push([round(t, 3), round(p[1], 2), 'linear']); path.push([round(p[0], 2), round(p[1], 2)]); }
    props.push({id: 'path', type: 'polyline', points: path, draw: 0, keys: {draw: [[0, 0], [tEnd, 1, 'linear']]}, style: {stroke: 'accent', width: 3 * k, dash: [10 * k, 8 * k]}, layer: 3},
      {id: 'charge', type: 'circle', x: path[0][0], y: path[0][1], r: 20 * k, keys: {x: xs, y: ys}, style: {fill: pos ? '#e5484d' : '#3b7bff'}, layer: 8});
    text('charge-sign', pos ? '+' : '−', path[0], 'paper', 34);
    (props.at(-1) as {keys?: unknown}).keys = {x: xs, y: ys.map(([t, v, e]) => [t, round(v + 12 * k, 2), e] as Key)};
    // Velocity and force arrows at three moments on the curve.
    [0.2, 0.5, 0.8].forEach((f, j) => {
      const t = tEnter + f * (tTurn - tEnter), {p, v} = at(t), toC: Vec = [centre[0] - p[0], centre[1] - p[1]], m = Math.hypot(...toC);
      arrow(`v${j}`, p, [p[0] + v[0] * 90 * k, p[1] + v[1] * 90 * k], 'accent', [t, 1e9], 4);
      arrow(`f${j}`, p, [p[0] + toC[0] / m * 80 * k, p[1] + toC[1] / m * 80 * k], 'good', [t, 1e9], 4);
    });
    text('v-label', 'velocity', [left + 0.15 * (right - left), y0 - 40 * k], 'accent', 26);
    text('f-label', 'force: towards the centre', [centre[0] + r + 30 * k, centre[1]], 'good', 24, [tEnter + 2, 1e9], 'start');
    anchors.centre = [round(centre[0], 2), round(centre[1], 2)]; anchors.entry = [round(x0, 2), round(y0, 2)];
    lines.push(`A ${pos ? 'positive' : 'negative'} charge moving across a field ${into ? 'into' : 'out of'} the page`, 'The force is always at right angles to its velocity', 'It turns the charge round: its speed stays the same, its velocity and momentum change');
    facts.push('a charged particle moving at right angles to a magnetic field feels a force at right angles to its velocity, so it moves in a circle',
      'the force does no work: the speed (and mass) stay the same, while the velocity and momentum change direction', `a ${pos ? 'positive' : 'negative'} charge here curves ${bend < 0 ? 'up' : 'down'} the page; the opposite charge would curve the other way`);
  } else {
    // A rod in the page carrying current to the right; the field at θ to it. The force (out of the page) is I L B sin θ.
    const angles = s.angles ?? [90, 45, 0], span = T / angles.length, at = (i: number): [number, number] => [i * span, i === angles.length - 1 ? 1e9 : (i + 1) * span];
    const x1 = left + 0.12 * (right - left), x2 = right - 0.12 * (right - left);
    props.push({id: 'rod', type: 'line', x1: round(x1, 2), y1: round(cy, 2), x2: round(x2, 2), y2: round(cy, 2), style: {stroke: '#b8c2cc', width: 16 * k}, layer: 5});
    arrow('current', [cx - 120 * k, cy - 40 * k], [cx + 120 * k, cy - 40 * k], 'accent', [0, 1e9], 5);
    text('current-label', 'current', [cx, cy - 66 * k], 'accent', 24);
    angles.forEach((deg, i) => {
      const a = deg * Math.PI / 180, show = at(i), L = 0.6 * (right - left);
      for (let j = -3; j <= 3; j++) {
        const o: Vec = [cx + j * 110 * k * Math.sin(a), cy + j * 110 * k * Math.cos(a)];   // spaced at right angles to the field
        // Each field line runs across the drawing, clipped to it.
        const d: Vec = [Math.cos(a), -Math.sin(a)], lim = (lo: number, hi: number, o: number, d: number) => d > 1e-9 ? [(lo - o) / d, (hi - o) / d] : d < -1e-9 ? [(hi - o) / d, (lo - o) / d] : [-1e9, 1e9];
        const [ax, bx] = lim(left, right, o[0], d[0]), [ay, by] = lim(top, bottom, o[1], d[1]), t0 = Math.max(ax, ay, -L), t1 = Math.min(bx, by, L);
        if (t1 - t0 < 60 * k) continue;
        arrow(`field${i}${j + 3}`, [o[0] + d[0] * t0, o[1] + d[1] * t0], [o[0] + d[0] * t1, o[1] + d[1] * t1], 'cool', show, 2.5);
      }
      const f = Math.sin(a), r = 10 * k + 40 * k * f;
      if (f > 0.01) {
        mark(`force${i}`, [cx, cy + 0.33 * (bottom - top)], true, r, [show[0] + 0.6, show[1]], 'good');
        text(`force-note${i}`, 'force: out of the page', [cx + 60 * k, cy + 0.33 * (bottom - top) + 8 * k], 'good', 22, [show[0] + 0.6, show[1]], 'start');
      }
      text(`angle${i}`, `θ = ${deg}°: force ${f > 0.999 ? 'largest' : f < 0.001 ? 'zero' : `${Math.round(f * 100)}% of the largest`}`, [cx, bottom - 20 * k], 'good', 28, [show[0] + 0.6, show[1]]);
    });
    anchors.rod = [round(cx, 2), round(cy, 2)];
    lines.push('The force depends on the angle between current and field', 'Largest at right angles (θ = 90°); zero when they are parallel', 'F = I L B sin θ, at right angles to both');
    facts.push('the force on a current-carrying conductor is largest when the current is at right angles to the magnetic field and zero when it is along the field',
      ...angles.map(d => `at ${d}° the force is ${Math.round(Math.sin(d * Math.PI / 180) * 100)}% of its largest value (F ∝ sin θ)`));
  }
  if (panel) {
    const px = 0.66 * W, pw = W - px - 40 * k;
    let row = 0.14 * H;
    if (s.title) { props.push({id: 'title', type: 'text', x: px, y: row, text: s.title, size: 44 * k, weight: 700, width: pw}); row += wrapText(s.title, 44 * k, pw).length * 1.25 * 44 * k + 18 * k; }
    lines.forEach((value, j) => { props.push({id: `say${j}`, type: 'text', x: px, y: row, text: value, size: 30 * k, width: pw, weight: j ? 400 : 700, show: [0.8 + 1.6 * j, 1e9], fade: 0.3}); row += wrapText(value, 30 * k, pw).length * 1.3 * 30 * k + 12 * k; });
  } else if (s.title) props.push({id: 'title', type: 'text', x: left, y: 0.16 * H, text: s.title, size: 44 * k, weight: 700, width: 0.92 * W});
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: T, theme: s.theme ?? 'dark', props, actors: [], meta: {verb: 'magnetic_force', facts, anchors}};
}
