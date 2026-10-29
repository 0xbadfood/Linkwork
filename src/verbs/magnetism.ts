// magnetic_field: magnetic fields of magnets and currents (Class 10 Magnetic Effects of Electric Current, 2026-10-29).
// Every field here is computed: a wire, a loop, a solenoid and a bar magnet are sets of straight currents at right
// angles to the page (a bar magnet as the currents on its sides, which give the same field as a solenoid), and the
// field lines are level lines of their stream function ψ = −Σ I ln r, traced from seeds spaced evenly in ψ, so the
// lines crowd where the field is strong and a larger current draws more of them. Compass needles point along the
// field (with the Earth's field pointing north, up the page, when a current is switched); iron filings lie along it.
import type {Key} from '../keys.ts';
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {round, type Vec} from '../vec.ts';

type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};
export type FieldSpec = Common & {
  verb: 'magnetic_field';
  /** bar_magnet, wire (straight), loop (circular), solenoid, uniform. */
  source: 'bar_magnet' | 'wire' | 'loop' | 'solenoid' | 'uniform';
  /** wire: end (seen end-on, through a card: circles) or along (in the page, the field out of and into the page on its
   * two sides); loop: section (cut through its middle: lines through the centre) or face (seen face-on). */
  view?: 'end' | 'along' | 'section' | 'face';
  /** The way the current runs: wire end: out | in (of the page); wire along: up | down; loop face: anticlockwise |
   * clockwise; uniform: right | left | up | down | out | in (the field). */
  direction?: 'out' | 'in' | 'up' | 'down' | 'anticlockwise' | 'clockwise' | 'right' | 'left';
  /** bar_magnet, solenoid, loop section: the end the field leaves (its north pole): right or left. */
  north?: 'right' | 'left';
  /** Currents in A shown in turn (a larger current, a stronger field: more lines, a larger deflection). */
  currents?: number[];
  /** closes: no current, then the key is plugged; reverses: the current turns round half-way. */
  key?: 'closes' | 'reverses';
  /** Turns of a solenoid (2 to 16) or of a loop's coil (1 to 50: the field is that many times as large). */
  turns?: number;
  /** solenoid: a soft iron core inside it, an electromagnet. */
  core?: boolean;
  /** solenoid: closely packed turns all carrying the current one way first, then the same turns spread out (spread)
   * or every fourth turn carrying it the other way (reversed): fewer lines and the field at the centre, computed, drop. */
  compare?: 'spread' | 'reversed';
  lines?: boolean;
  filings?: boolean;
  /** Compasses around the source (1 to 12), each pointing along the field where it sits. */
  compasses?: number;
  /** bar_magnet: a compass stepped from the north pole to the south pole, marking a field line (Activity 12.2). */
  trace?: boolean;
  /** wire: the right-hand thumb rule beside it (thumb along the current, fingers curling the field's way). */
  rule?: boolean;
  panel?: boolean;
  seconds?: number;
};

type Wire = {x: number; y: number; I: number};
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const noise = (i: number) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
const RED = '#e5484d';   // a compass needle's north end, red as on a real compass
/** The field at p of straight currents at right angles to the page (current out of the page: I > 0, anticlockwise). */
export function fieldAt(wires: Wire[], [x, y]: Vec): Vec {
  let bx = 0, by = 0;
  for (const w of wires) { const dx = x - w.x, dy = y - w.y, r2 = dx * dx + dy * dy || 1e-9; bx += -w.I * dy / r2; by += w.I * dx / r2; }
  return [bx, by];
}
const psi = (wires: Wire[], [x, y]: Vec) => wires.reduce((s, w) => s - w.I * Math.log(Math.hypot(x - w.x, y - w.y) || 1e-9), 0);

/** The source as straight currents, in world units (the page's y up), with what is drawn about them. */
function model(s: FieldSpec, I: number, alt = false) {
  const sign = s.north === 'left' ? -1 : 1, wires: Wire[] = [];
  if (s.source === 'wire') wires.push({x: 0, y: 0, I: s.direction === 'in' ? -I : I});
  if (s.source === 'loop') { const n = s.turns ?? 1; wires.push({x: 0, y: 1.5, I: sign * I * n}, {x: 0, y: -1.5, I: -sign * I * n}); }
  if (s.source === 'solenoid' || s.source === 'bar_magnet') {
    const magnet = s.source === 'bar_magnet', n = magnet ? 24 : s.turns ?? 8, R = magnet ? 0.7 : 1.1;
    // Compared: closely packed turns (pitch 0.35) against the same turns three times as far apart.
    const L = magnet ? 4 : s.compare ? Math.min(9, 0.35 * n * (alt && s.compare === 'spread' ? 3 : 1)) : 5;
    const each = (magnet ? 8 / n : 1) * I * (s.core ? 3 : 1);
    for (let j = 0; j < n; j++) {
      const x = -L / 2 + L * (j + 0.5) / n, f = alt && s.compare === 'reversed' && j % 4 === 1 ? -1 : 1;
      wires.push({x, y: R, I: f * sign * each}, {x, y: -R, I: -f * sign * each});
    }
    return {wires, L, R};
  }
  return {wires, L: 0, R: 1.5};
}

/** Field lines through seeds spaced evenly in ψ along a segment, each traced both ways until it closes, leaves the
 * box or reaches a wire. Lines are lists of world points, in the field's direction. */
export function fieldLines(wires: Wire[], seg: [Vec, Vec], step: number, box: [number, number]): Vec[][] {
  const N = 400, ps = Array.from({length: N + 1}, (_, i) => psi(wires, [seg[0][0] + (seg[1][0] - seg[0][0]) * i / N, seg[0][1] + (seg[1][1] - seg[0][1]) * i / N]));
  const lo = Math.min(...ps), hi = Math.max(...ps), mid = ps[N / 2], levels: number[] = [];
  for (let k = -200; k <= 200; k++) { const v = mid + k * step; if (v > lo && v < hi) levels.push(v); }
  const seeds = levels.map(v => {
    for (let i = 0; i < N; i++) if ((ps[i] - v) * (ps[i + 1] - v) <= 0) {
      const f = (v - ps[i]) / (ps[i + 1] - ps[i] || 1), u = (i + f) / N;
      return [seg[0][0] + (seg[1][0] - seg[0][0]) * u, seg[0][1] + (seg[1][1] - seg[0][1]) * u] as Vec;
    }
    return null;
  }).filter((p): p is Vec => p !== null);
  const h = box[0] / 160, dir = (p: Vec, sgn: number): Vec => { const b = fieldAt(wires, p), m = Math.hypot(b[0], b[1]) || 1; return [sgn * b[0] / m, sgn * b[1] / m]; };
  const trace = (start: Vec, sgn: number): {pts: Vec[]; closed: boolean} => {
    const pts: Vec[] = [start];
    let p = start, travelled = 0;
    for (let i = 0; i < 4000; i++) {
      const k1 = dir(p, sgn), k2 = dir([p[0] + h / 2 * k1[0], p[1] + h / 2 * k1[1]], sgn), k3 = dir([p[0] + h / 2 * k2[0], p[1] + h / 2 * k2[1]], sgn), k4 = dir([p[0] + h * k3[0], p[1] + h * k3[1]], sgn);
      p = [p[0] + h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), p[1] + h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])];
      travelled += h; pts.push(p);
      if (travelled > 6 * h && Math.hypot(p[0] - start[0], p[1] - start[1]) < 0.8 * h) return {pts: [...pts, start], closed: true};
      if (Math.abs(p[0]) > 1.6 * box[0] || Math.abs(p[1]) > 1.6 * box[1] || wires.some(w => Math.hypot(p[0] - w.x, p[1] - w.y) < 0.08)) break;
    }
    return {pts, closed: false};
  };
  return seeds.map(seed => {
    const ahead = trace(seed, 1);
    if (ahead.closed) return ahead.pts;
    return [...trace(seed, -1).pts.reverse(), ...ahead.pts.slice(1)];
  });
}

export function fieldErrors(s: FieldSpec): string[] {
  const e: string[] = [], src = s.source;
  if (!['bar_magnet', 'wire', 'loop', 'solenoid', 'uniform'].includes(src)) return ['magnetic_field: source is bar_magnet, wire, loop, solenoid or uniform'];
  const views: Record<string, string[]> = {wire: ['end', 'along'], loop: ['section', 'face']};
  if (s.view !== undefined && !(views[src] ?? []).includes(s.view)) e.push(`magnetic_field: view is ${views[src] ? views[src].join(' or ') + ` for a ${src}` : `not used for a ${src}`}`);
  const view = s.view ?? views[src]?.[0];
  const dirs = src === 'uniform' ? ['right', 'left', 'up', 'down', 'out', 'in'] : view === 'end' ? ['out', 'in'] : view === 'along' ? ['up', 'down'] : view === 'face' ? ['anticlockwise', 'clockwise'] : [];
  if (s.direction !== undefined && !dirs.includes(s.direction)) e.push(dirs.length ? `magnetic_field: direction is ${dirs.join(' or ')} here` : `magnetic_field: a ${src} takes north (right or left), not direction`);
  if (s.north !== undefined && (!['right', 'left'].includes(s.north) || !(src === 'bar_magnet' || src === 'solenoid' || (src === 'loop' && view === 'section'))))
    e.push('magnetic_field: north is right or left, for a bar_magnet, a solenoid or a loop section');
  if (s.currents !== undefined && (!Array.isArray(s.currents) || s.currents.length < 1 || s.currents.length > 3 || s.currents.some(c => !(isNum(c) && c > 0 && c <= 20))))
    e.push('magnetic_field: currents is a list of 1 to 3 currents, each above 0 and up to 20 A');
  if ((s.currents || s.key) && (src === 'bar_magnet' || src === 'uniform')) e.push(`magnetic_field: a ${src} has no current or key`);
  if (s.key !== undefined && !['closes', 'reverses'].includes(s.key)) e.push('magnetic_field: key is closes or reverses');
  if (s.key && (s.currents?.length ?? 1) > 1) e.push('magnetic_field: a key with one current, or currents without a key');
  if (s.turns !== undefined && !(src === 'solenoid' ? Number.isInteger(s.turns) && s.turns >= 2 && s.turns <= 16 : src === 'loop' && Number.isInteger(s.turns) && s.turns >= 1 && s.turns <= 50))
    e.push('magnetic_field: turns is 2 to 16 for a solenoid, 1 to 50 for a loop\'s coil');
  if (s.core !== undefined && (typeof s.core !== 'boolean' || src !== 'solenoid')) e.push('magnetic_field: core (true or false) is for a solenoid');
  if (s.compare !== undefined) {
    if (!['spread', 'reversed'].includes(s.compare) || src !== 'solenoid') e.push('magnetic_field: compare (spread or reversed) is for a solenoid; for a loop\'s coil use source solenoid');
    else if (s.key || (s.currents?.length ?? 1) > 1 || s.core || s.filings || s.compasses) e.push('magnetic_field: compare shows one current through two arrangements: no key, currents list, core, filings or compasses with it');
  }
  if (s.compasses !== undefined && !(Number.isInteger(s.compasses) && s.compasses >= 1 && s.compasses <= 12)) e.push('magnetic_field: compasses is 1 to 12');
  if (s.compasses !== undefined && (src === 'uniform' || view === 'face')) e.push('magnetic_field: compasses need a field in the page (not a face view or a uniform field)');
  if (s.trace !== undefined && (typeof s.trace !== 'boolean' || src !== 'bar_magnet')) e.push('magnetic_field: trace (true or false) is for a bar_magnet');
  if (s.rule !== undefined && (typeof s.rule !== 'boolean' || src !== 'wire')) e.push('magnetic_field: rule (true or false) is for a wire');
  for (const f of ['lines', 'filings', 'panel'] as const) if (s[f] !== undefined && typeof s[f] !== 'boolean') e.push(`magnetic_field: ${f} is true or false`);
  if (s.filings && (src === 'uniform' || view === 'face' || view === 'along')) e.push('magnetic_field: filings show a field in the page: not for a uniform field or a face or along view');
  if (s.seconds !== undefined && !(isNum(s.seconds) && s.seconds >= 4 && s.seconds <= 20)) e.push('magnetic_field: seconds is 4 to 20');
  return e;
}

export function magneticField(s: FieldSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, panel = s.panel !== false;
  const left = 0.03 * W, right = panel ? 0.63 * W : 0.97 * W, top = (panel ? 0.12 : s.title ? 0.22 : 0.13) * H, bottom = 0.96 * H;
  const T = s.seconds ?? 10, props: Prop[] = [], facts: string[] = [], anchors: Record<string, Vec> = {}, lines: string[] = [];
  const src = s.source, view = s.view ?? ({wire: 'end', loop: 'section'} as Record<string, string>)[src];
  const X = src === 'wire' && view === 'end' ? 4 : src === 'loop' ? 4.5 : src === 'uniform' ? 4 : s.compare === 'spread' ? 6.2 : 5.6;
  const cx = (left + right) / 2, cy = (top + bottom) / 2, sc = (right - left) / (2 * X), Y = (bottom - top) / 2 / sc;
  const P = ([x, y]: Vec): Vec => [round(cx + x * sc, 2), round(cy - y * sc, 2)];
  const text = (id: string, value: string, [x, y]: Vec, fill = 'ink', size = 28, t = 0, align: 'start' | 'middle' | 'end' = 'middle') =>
    props.push({id, type: 'text', x: round(x, 2), y: round(y, 2), text: value, size: size * k, align, weight: 700, show: [t, 1e9], fade: 0.3, style: {fill, stroke: 'paper', width: 6 * k}, layer: id.startsWith('rule') ? 11 : 8});
  // Phases: the currents in turn; a key that closes starts from none, one that reverses turns the current round.
  const I0 = s.currents?.[0] ?? 1;
  const phases = src === 'bar_magnet' || src === 'uniform' ? [1] : s.key === 'closes' ? [0, I0] : s.key === 'reverses' ? [I0, -I0] : s.compare ? [I0, I0] : (s.currents ?? [1]);
  const mod = (I: number, i: number) => model(s, I, !!s.compare && i === 1);   // a compared solenoid's second arrangement
  const span = T / phases.length, at = (i: number): [number, number] => [i * span, i === phases.length - 1 ? 1e9 : (i + 1) * span];
  const Imax = Math.max(...phases.map(Math.abs));
  const switched = !!s.key, earth = switched && (src === 'wire' || src === 'loop' || src === 'solenoid');
  const geo = model(s, 1);
  const mark = (id: string, [x, y]: Vec, out: boolean, r: number, show: [number, number] = [0, 1e9], fill = 'cool') => {
    props.push({id, type: 'circle', x, y, r, show, fade: 0.25, style: {stroke: fill, width: 2.5 * k}, layer: 6});
    if (out) props.push({id: `${id}-dot`, type: 'circle', x, y, r: 0.3 * r, show, fade: 0.25, style: {fill}, layer: 6});
    else [[1, 1], [1, -1]].forEach(([a, b], j) => props.push({id: `${id}-x${j}`, type: 'line', x1: round(x - 0.6 * r * a, 2), y1: round(y - 0.6 * r * b, 2), x2: round(x + 0.6 * r * a, 2), y2: round(y + 0.6 * r * b, 2), show, fade: 0.25, style: {stroke: fill, width: 2.5 * k}, layer: 6}));
  };
  const arrowAlong = (id: string, pts: Vec[], f: number, show: [number, number], stroke = 'accent') => {
    const i = Math.max(1, Math.min(pts.length - 1, Math.round(f * (pts.length - 1)))), a = pts[i - 1], b = pts[i], m = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const u: Vec = [(b[0] - a[0]) / m, (b[1] - a[1]) / m];
    props.push({id, type: 'arrow', x1: round(b[0] - u[0] * 14 * k, 2), y1: round(b[1] - u[1] * 14 * k, 2), x2: round(b[0] + u[0] * 4 * k, 2), y2: round(b[1] + u[1] * 4 * k, 2), head: 22 * k, show, fade: 0.25, style: {stroke, width: 3 * k}, layer: id.startsWith('rule') ? 11 : 5});
  };
  const inFrame = ([x, y]: Vec) => Math.abs(x) < X * 0.99 && Math.abs(y) < Y * 0.99;
  const draw = (t0: number): {draw: number; keys: {draw: Key[]}} => ({draw: 0, keys: {draw: [[t0, 0], [t0 + 1.4, 1, 'linear']]}});
  const magnet = src === 'bar_magnet', inBody = ([x, y]: Vec) => magnet && Math.abs(x) < geo.L / 2 && Math.abs(y) < geo.R;
  // The sources themselves.
  if (magnet) {
    const nRight = s.north !== 'left', [x0, y0] = P([-geo.L / 2, geo.R]), wpx = geo.L * sc, hpx = 2 * geo.R * sc;
    props.push({id: 'magnet-n', type: 'rect', x: round(nRight ? x0 + wpx / 2 : x0, 2), y: y0, w: round(wpx / 2, 2), h: round(hpx, 2), style: {fill: RED, opacity: 0.8}, layer: 1},
      {id: 'magnet-s', type: 'rect', x: round(nRight ? x0 : x0 + wpx / 2, 2), y: y0, w: round(wpx / 2, 2), h: round(hpx, 2), style: {fill: '#3b7bff', opacity: 0.8}, layer: 1});
    text('pole-n', 'N', [P([(nRight ? 1 : -1) * geo.L / 4, 0])[0], P([0, 0])[1] + 15 * k], 'ink', 44); text('pole-s', 'S', [P([(nRight ? -1 : 1) * geo.L / 4, 0])[0], P([0, 0])[1] + 15 * k], 'ink', 44);
    anchors.north = P([(nRight ? 1 : -1) * geo.L / 2, 0]); anchors.south = P([(nRight ? -1 : 1) * geo.L / 2, 0]); anchors.magnet = P([0, 0]);
  }
  if (src === 'wire' && view === 'end') {
    props.push({id: 'card', type: 'rect', x: round(left, 2), y: round(top, 2), w: round(right - left, 2), h: round(bottom - top, 2), r: 10 * k, style: {fill: 'faint', opacity: 0.18}, layer: 0},
      {id: 'wire', type: 'circle', x: P([0, 0])[0], y: P([0, 0])[1], r: 20 * k, style: {fill: '#c8793a', stroke: 'ink', width: 2 * k}, layer: 6});
    phases.forEach((I, i) => { if (I) mark(`current${i}`, P([0, 0]), (I > 0) === (s.direction !== 'in'), 12 * k, at(i), 'paper'); });
    text('wire-label', s.direction === 'in' ? 'current into the page' : 'current out of the page', [P([0, 0])[0], P([0, 0])[1] + 52 * k], 'accent', 24);
    anchors.wire = P([0, 0]);
  }
  if (src === 'loop' && view === 'section' || src === 'solenoid') {
    const arrangements = s.compare ? [0, 1] : [0], shown = (i: number): [number, number] => s.compare ? at(i) : [0, 1e9];
    const coil: Vec[] = [];
    if (src === 'solenoid') {
      // The coil's front strands, from each turn's top to the next turn's bottom, over its cut ends.
      arrangements.forEach(i => {
        const g = mod(1, i), pitch = g.L / (s.turns ?? 8), tag = i ? `-b` : '';
        for (let j = 0; j < (s.turns ?? 8); j++) {
          const x = -g.L / 2 + pitch * (j + 0.5), [a, b] = [P([x, g.R]), P([x + Math.min(pitch, 0.6) / 2, -g.R])];
          props.push({id: `strand${j}${tag}`, type: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1], show: shown(i), fade: 0.3, style: {stroke: '#c8793a', width: 5 * k, opacity: 0.8}, layer: 3});
          coil.push(a);
        }
      });
      if (s.core) {
        const [x0, y0] = P([-geo.L / 2 - 0.35, 0.6 * geo.R]);
        props.push({id: 'core', type: 'rect', x: x0, y: y0, w: round((geo.L + 0.7) * sc, 2), h: round(1.2 * geo.R * sc, 2), r: 6 * k, style: {fill: 'muted', opacity: 0.55}, layer: 1});
        text('core-label', 'soft iron core', P([0, -geo.R - 0.45]), 'muted', 24);
      }
    } else {
      // The loop in perspective: an upright ellipse through its two cut points.
      const pts = Array.from({length: 61}, (_, j) => { const a = Math.PI * 2 * j / 60; return P([0.45 * Math.sin(a), 1.5 * Math.cos(a)]); });
      props.push({id: 'loop', type: 'polyline', points: pts, closed: true, style: {stroke: '#c8793a', width: 6 * k}, layer: 3});
    }
    arrangements.forEach(i => mod(1, i).wires.forEach((wire, j) => { const p = P([wire.x, wire.y]); props.push({id: `cut${j}${i ? '-b' : ''}`, type: 'circle', x: p[0], y: p[1], r: 11 * k, show: shown(i), fade: 0.3, style: {fill: 'paper', stroke: '#c8793a', width: 3 * k}, layer: 6}); }));
    phases.forEach((I, i) => { if (I) mod(1, i).wires.forEach((wire, j) => mark(`flow${i}-${j}`, P([wire.x, wire.y]), (wire.I > 0) === (I > 0), 8 * k, at(i), 'ink')); });
    if (s.compare) {
      // Each arrangement named under the coil, with its field at the centre against the closely packed coil's.
      const B = (i: number) => Math.hypot(...fieldAt(mod(I0, i).wires, [0, 0])), ratio = Math.round(100 * B(1) / B(0));
      const names = ['Closely packed, current the same way in every turn', s.compare === 'spread' ? 'The same turns spread out' : 'Some turns carrying the current the other way'];
      arrangements.forEach(i => {
        const q = P([0, -Y + 0.75]);   // under the field, clear of the coil
        props.push({id: `arrangement${i}`, type: 'text', x: q[0], y: q[1], text: names[i], size: 28 * k, align: 'middle', weight: 700, show: [at(i)[0] + 0.2, at(i)[1]], fade: 0.3, style: {fill: 'ink', stroke: 'paper', width: 6 * k}, layer: 8},
          {id: `centre-field${i}`, type: 'text', x: q[0], y: round(q[1] + 40 * k, 2), text: `Field at the centre: ${i ? ratio : 100}%${i ? ' of the packed coil\'s' : ''}`, size: 26 * k, align: 'middle', weight: 400, show: [at(i)[0] + 1.6, at(i)[1]], fade: 0.3, style: {fill: 'accent', stroke: 'paper', width: 6 * k}, layer: 8});
      });
    }
    anchors.centre = P([0, 0]); anchors.top = P([0, geo.R]); anchors.bottom = P([0, -geo.R]);
  }
  // Field lines, phase by phase: traced for the computed currents, more of them for a larger current.
  if (s.lines !== false && src !== 'uniform' && view !== 'face' && view !== 'along') {
    const ref = model(s, Imax).wires, seg: [Vec, Vec] = src === 'wire' ? [[0.35, 0], [Math.min(X, Y) * 0.98, 0]] : [[0, -0.85 * geo.R], [0, 0.85 * geo.R]];
    const span0 = (() => { const a = psi(ref, seg[0]), b = psi(ref, seg[1]); return Math.abs(a - b); })();
    const count = src === 'wire' ? 7 : magnet ? 11 : src === 'solenoid' ? 9 : 8, step = span0 / count;
    let made = 0;
    phases.forEach((I, i) => {
      if (!I) return;
      const traced = fieldLines(mod(I, i).wires, seg, step, [X, Y]), t0 = at(i)[0] + 0.3 + (s.trace ? 4.5 : 0);
      traced.forEach(line => {
        // Clip to the frame; a line through a magnet is drawn inside it too (from S to N).
        let piece: Vec[] = [];
        const flush = () => {
          if (piece.length > 3) {
            const pts = piece.filter((_, j) => j % 3 === 0 || j === piece.length - 1).map(P), id = `line${made++}`;
            props.push({id, type: 'polyline', points: pts, ...draw(t0), show: [t0, at(i)[1]], style: {stroke: 'accent', width: 3 * k, opacity: 0.9}, layer: 4});
            const ends = pts.length > 30 ? [0.25, 0.75] : [0.5];
            ends.forEach((f, j) => arrowAlong(`${id}-arrow${j}`, pts, f, [t0 + 1.2, at(i)[1]]));
          }
          piece = [];
        };
        for (const p of line) { if (inFrame(p)) piece.push(p); else flush(); }
        flush();
      });
    });
  }
  // Iron filings: short strokes along the field, fainter where it is weak.
  if (s.filings) {
    const I = phases.find(v => v) ?? 1, wires = model(s, I).wires, t0 = at(phases.findIndex(v => v))[0] + 0.4;
    const ref = Math.hypot(...fieldAt(wires, src === 'wire' ? [1.5, 0] : [geo.L / 2 + 0.8, 0]));
    let made = 0;
    for (let i = 0; i < 900 && made < 520; i++) {
      const p: Vec = [(noise(i) * 2 - 1) * X * 0.97, (noise(i + 1000) * 2 - 1) * Y * 0.97];
      if (inBody(p) || wires.some(w => Math.hypot(p[0] - w.x, p[1] - w.y) < 0.3)) continue;
      const b = fieldAt(wires, p), m = Math.hypot(b[0], b[1]), L = 11 * k, q = P(p);
      props.push({id: `filing${made++}`, type: 'line', x1: round(q[0] - b[0] / m * L, 2), y1: round(q[1] + b[1] / m * L, 2), x2: round(q[0] + b[0] / m * L, 2), y2: round(q[1] - b[1] / m * L, 2),
        show: [t0 + 0.6 * noise(i + 2000), 1e9], fade: 0.4, style: {stroke: 'muted', width: 2.5 * k, opacity: round(Math.min(1, Math.max(0.12, m / ref)), 2)}, layer: 2});
    }
  }
  // Compasses: needles along the field where they sit; with a switched current, along the field plus the Earth's (north,
  // up the page), so a needle points north with no current and swings when the current flows.
  const needle = (id: string, c: Vec, angles: [number, number][], L = 26 * k) => {
    const keys = (sgn: number, axis: 0 | 1): Key[] => angles.map(([t, a]) => [t, round(c[axis] + sgn * L * (axis ? -Math.sin(a) : Math.cos(a)), 2), 'linear'] as Key);
    const a0 = angles[0][1];
    props.push({id: `${id}-case`, type: 'circle', x: c[0], y: c[1], r: L + 8 * k, style: {fill: 'paper', stroke: 'muted', width: 2.5 * k, opacity: 0.9}, layer: 6},
      {id: `${id}-n`, type: 'line', x1: c[0], y1: c[1], x2: round(c[0] + L * Math.cos(a0), 2), y2: round(c[1] - L * Math.sin(a0), 2), keys: {x2: keys(1, 0), y2: keys(1, 1)}, style: {stroke: RED, width: 7 * k}, layer: 7},
      {id: `${id}-s`, type: 'line', x1: c[0], y1: c[1], x2: round(c[0] - L * Math.cos(a0), 2), y2: round(c[1] + L * Math.sin(a0), 2), keys: {x2: keys(-1, 0), y2: keys(-1, 1)}, style: {stroke: 'ink', width: 7 * k}, layer: 7},
      {id: `${id}-pin`, type: 'circle', x: c[0], y: c[1], r: 4 * k, style: {fill: 'muted'}, layer: 8});
  };
  const swing = (angleAt: (I: number) => number): [number, number][] => {
    const out: [number, number][] = [];
    phases.forEach((I, i) => {
      const a = angleAt(I), prev = out.length ? out.at(-1)![1] : a;
      let d = a - prev; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      const t = at(i)[0] + (i ? 0.2 : 0);
      if (!out.length) out.push([0, a]);
      else for (let j = 0; j <= 6; j++) out.push([round(t + 0.1 * j, 3), prev + d * j / 6]);
    });
    return out;
  };
  const Bearth = (() => { if (!earth) return 0; if (view === 'along') return 1; return 0.6 * Math.hypot(...fieldAt(model(s, Imax).wires, [Math.min(X, Y) * 0.55, 0])); })();
  if (s.compasses && view !== 'along') {
    const n = s.compasses, rr = src === 'wire' ? Math.min(X, Y) * 0.55 : magnet ? geo.L / 2 + 1.1 : geo.L / 2 + 1.2;
    for (let j = 0; j < n; j++) {
      const a = (src === 'wire' ? Math.PI / 2 : 0) + 2 * Math.PI * j / n,   // a lone compass by a wire sits north of it, where its field runs across north
        p: Vec = src === 'wire' ? [rr * Math.cos(a), rr * Math.sin(a)] : [rr * Math.cos(a), (magnet || src === 'solenoid' ? 1.6 : 1.3) * Math.sin(a) * (Y * 0.75) / 1.6];
      needle(`compass${j}`, P(p), swing(I => { const b = I ? fieldAt(model(s, I).wires, p) : [0, 0]; return Math.atan2(b[1] + Bearth, b[0]); }));
      anchors[`compass${j}`] = P(p);
    }
  }
  // A wire in the page (Activity 12.3): the field out of the page on one side and into it on the other, smaller marks
  // further off; a compass under the wire turns at right angles to it.
  if (src === 'wire' && view === 'along') {
    const [wx, wy0] = P([0, Y * 0.92]), wy1 = P([0, -Y * 0.92])[1];
    props.push({id: 'wire', type: 'line', x1: wx, y1: wy0, x2: wx, y2: wy1, style: {stroke: '#c8793a', width: 12 * k}, layer: 8});
    phases.forEach((I, i) => {
      if (!I) return;
      const up = (I > 0) === (s.direction !== 'down');
      props.push({id: `current${i}`, type: 'arrow', x1: wx, y1: round(cy + (up ? 1 : -1) * 0.3 * (bottom - top), 2), x2: wx, y2: round(cy - (up ? 1 : -1) * 0.3 * (bottom - top), 2), head: 30 * k, show: at(i), fade: 0.25, style: {stroke: 'accent', width: 5 * k}, layer: 9});
      for (const side of [-1, 1]) for (let r = 1; r <= 3; r++) for (let q = -2; q <= 2; q++) {
        // Thumb up the page: the field comes out of the page on the left and goes into it on the right.
        const m = P([side * r * 1.2, q * Y * 0.36]);
        if (s.rule && m[0] < left + 300 * k && m[1] > bottom - 310 * k) continue;   // under the rule's box
        mark(`f${i}-${side}-${r}-${q}`, m, (side < 0) === up, (16 - 3 * r) * k, [at(i)[0] + 0.4 + 0.15 * r, at(i)[1]]);
      }
    });
    text('current-label', 'current', [wx + 26 * k, round(top + 40 * k, 2)], 'accent', 24, 0, 'start');
    if (s.compasses) {
      const c: Vec = [wx, round(cy, 2)];
      // Under the wire the field is in the page, at right angles to the wire: west for a current going north (up).
      needle('compass0', c, swing(I => { const up = (I > 0) === (s.direction !== 'down'); return Math.atan2(Bearth, I ? (up ? -1 : 1) * Bearth / 0.6 : 0); }), 34 * k);
      text('compass-label', 'compass under the wire', [wx, round(cy + 76 * k, 2)], 'muted', 22);
      anchors.compass0 = c;
    }
    anchors.wire = [wx, round(cy, 2)];
  }
  if (src === 'loop' && view === 'face') {
    const n = 80, pts = Array.from({length: n + 1}, (_, j) => P([2 * Math.cos(2 * Math.PI * j / n), 2 * Math.sin(2 * Math.PI * j / n)]));
    props.push({id: 'loop', type: 'polyline', points: pts, closed: true, style: {stroke: '#c8793a', width: 8 * k}, layer: 3});
    const acw = s.direction !== 'clockwise';
    phases.forEach((I, i) => {
      if (!I) return;
      const way = (I > 0) === acw;
      [0, 0.25, 0.5, 0.75].forEach((f, j) => { const seq = way ? pts : [...pts].reverse(); arrowAlong(`current${i}-${j}`, seq, f + 0.06, at(i)); });
      // Anticlockwise as seen: the field comes out of the page inside the loop and goes in outside it.
      for (let a = -6; a <= 6; a++) for (let b = -5; b <= 5; b++) {
        const p: Vec = [a * 0.66, b * 0.66], r = Math.hypot(...p);
        if (r < 1.6) mark(`in${i}${a}${b}`, P(p), way, 14 * k, [at(i)[0] + 0.5, at(i)[1]]);
        else if (r > 2.5 && inFrame(p) && (a + b) % 2 === 0) mark(`out${i}${a}${b}`, P(p), !way, 9 * k, [at(i)[0] + 0.5, at(i)[1]]);
      }
    });
    anchors.centre = P([0, 0]);
  }
  if (src === 'uniform') {
    const d = s.direction ?? 'right';
    if (d === 'out' || d === 'in') for (let a = -3; a <= 3; a++) for (let b = -2; b <= 2; b++) mark(`b${a}${b}`, P([a * X / 3.6, b * Y / 2.6]), d === 'out', 16 * k, [0.3 + 0.05 * (a + 3), 1e9]);
    else for (let j = -3; j <= 3; j++) {
      const across = j * (d === 'right' || d === 'left' ? Y : X) / 3.6, sgn = d === 'right' || d === 'up' ? 1 : -1;
      const ends: [Vec, Vec] = d === 'right' || d === 'left' ? [[-sgn * X * 0.95, across], [sgn * X * 0.95, across]] : [[across, -sgn * Y * 0.95], [across, sgn * Y * 0.95]];
      const pts = [P(ends[0]), P(ends[1])];
      props.push({id: `line${j + 3}`, type: 'line', x1: pts[0][0], y1: pts[0][1], x2: pts[1][0], y2: pts[1][1], ...draw(0.3), style: {stroke: 'accent', width: 3 * k}, layer: 4});
      arrowAlong(`line${j + 3}-arrow`, [pts[0], [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2], pts[1]], 0.5, [1.5, 1e9]);
    }
  }
  // A bar magnet's field line traced with a compass, step by step from N to S (Activity 12.2).
  if (s.trace && magnet) {
    const all = fieldLines(model(s, 1).wires, [[0, -0.85 * geo.R], [0, 0.85 * geo.R]], Math.abs(psi(model(s, 1).wires, [0, -0.85 * geo.R]) - psi(model(s, 1).wires, [0, 0.85 * geo.R])) / 11, [X, Y]);
    // The widest line that stays in the frame, from the north pole round to the south pole.
    const whole = all.filter(l => l.every(p => inFrame(p) || inBody(p))).map(l => l.filter(p => !inBody(p))).filter(l => l.length > 20);
    const line = whole.sort((a, b) => b.length - a.length)[0];
    if (line) {
      const pts = line.map(P), stepPx = 60 * k, marks: Vec[] = [pts[0]];
      let run = 0;
      for (let j = 1; j < pts.length; j++) { run += Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]); if (run >= stepPx) { marks.push(pts[j]); run = 0; } }
      const used = marks.slice(0, 16), dt = 4.2 / used.length;
      used.forEach((m, j) => {
        const next = used[j + 1] ?? pts.at(-1)!, a = Math.atan2(-(next[1] - m[1]), next[0] - m[0]);
        const c: Vec = [round((m[0] + next[0]) / 2, 2), round((m[1] + next[1]) / 2, 2)];
        const win: [number, number] = [0.3 + j * dt, 0.3 + (j + 1) * dt];
        props.push({id: `step${j}-n`, type: 'line', x1: c[0], y1: c[1], x2: round(c[0] + 24 * k * Math.cos(a), 2), y2: round(c[1] - 24 * k * Math.sin(a), 2), show: win, style: {stroke: RED, width: 7 * k}, layer: 7},
          {id: `step${j}-s`, type: 'line', x1: c[0], y1: c[1], x2: round(c[0] - 24 * k * Math.cos(a), 2), y2: round(c[1] + 24 * k * Math.sin(a), 2), show: win, style: {stroke: 'ink', width: 7 * k}, layer: 7},
          {id: `dot${j}`, type: 'circle', x: m[0], y: m[1], r: 5 * k, show: [win[0], 1e9], style: {fill: 'ink'}, layer: 7});
      });
      props.push({id: 'traced', type: 'polyline', points: pts.filter((_, j) => j % 3 === 0), ...draw(4.6), show: [4.6, 1e9], style: {stroke: 'ink', width: 3.5 * k}, layer: 5});
    }
  }
  // The right-hand thumb rule, in a corner: the thumb along the current, the fingers curling the way the field goes.
  if (s.rule && src === 'wire') {
    const bx = left + 30 * k, by = bottom - 290 * k, base = view === 'end' ? s.direction !== 'in' : s.direction !== 'down';
    props.push({id: 'rule-box', type: 'rect', x: round(bx, 2), y: round(by, 2), w: 250 * k, h: 270 * k, r: 12 * k, style: {fill: 'paper', stroke: 'muted', width: 2 * k}, layer: 9},
      {id: 'rule-wire', type: 'line', x1: round(bx + 125 * k, 2), y1: round(by + 40 * k, 2), x2: round(bx + 125 * k, 2), y2: round(by + 230 * k, 2), style: {stroke: '#c8793a', width: 8 * k}, layer: 9});
    const ell = Array.from({length: 41}, (_, j) => { const a = Math.PI * 2 * j / 40; return [round(bx + 125 * k + 70 * k * Math.cos(a), 2), round(by + 140 * k + 22 * k * Math.sin(a), 2)] as Vec; });
    props.push({id: 'rule-curl', type: 'polyline', points: ell, style: {stroke: 'cool', width: 4 * k}, layer: 10});
    // Seen from where the thumb points the fingers curl anticlockwise: across the front (the ellipse's lower half) they
    // move right for a thumb up. The thumb turns round with the current.
    const front = ell.slice(5, 16);
    phases.forEach((I, i) => {
      const up = (I >= 0) === base;
      if (!I) return;
      props.push({id: `rule-thumb${i}`, type: 'arrow', x1: round(bx + 150 * k, 2), y1: round(by + (up ? 200 : 70) * k, 2), x2: round(bx + 150 * k, 2), y2: round(by + (up ? 70 : 200) * k, 2), head: 22 * k, show: at(i), style: {stroke: 'accent', width: 6 * k}, layer: 10});
      arrowAlong(`rule-curl-arrow${i}`, up ? [...front].reverse() : front, 0.5, at(i), 'cool');
    });
    text('rule-thumb-label', 'thumb: current', [bx + 125 * k, by + 28 * k], 'accent', 20);
    text('rule-curl-label', 'fingers: field', [bx + 125 * k, by + 258 * k], 'cool', 20);
  }
  // Poles of a solenoid, read from the computed field at its ends.
  if (src === 'solenoid' || (src === 'loop' && view === 'section')) {
    const I = phases.find(v => v) ?? 1, end = src === 'solenoid' ? geo.L / 2 + 0.55 : 0.9, bx = fieldAt(model(s, I).wires, [0, 0])[0];
    if (src === 'solenoid' && !s.compare) { text('pole-right', bx > 0 ? 'N' : 'S', P([end, 0]), bx > 0 ? RED : '#3b7bff', 40, at(phases.findIndex(v => v))[0] + 1.5); text('pole-left', bx > 0 ? 'S' : 'N', P([-end, 0]), bx > 0 ? '#3b7bff' : RED, 40, at(phases.findIndex(v => v))[0] + 1.5); }
  }
  // The words for each source: the panel's lines and the facts a narration may use.
  const strength = (s.currents?.length ?? 0) > 1 ? 'A larger current: a stronger field, its lines closer together' : '';
  if (magnet) {
    lines.push('Field lines leave the north pole and enter the south pole', 'Inside the magnet they run from S to N: each line is a closed loop', 'Lines are closest near the poles, where the field is strongest; they never cross');
    facts.push('magnetic field lines emerge from the north pole and merge at the south pole; inside the magnet they run from south to north, so they are closed curves',
      'the field is strongest where the lines are closest, near the poles; no two field lines cross, since a compass at the crossing would point two ways at once');
    if (s.trace) facts.push('a compass moved step by step from the north pole, each new position starting where its north end was, traces a field line (Activity 12.2)');
  } else if (src === 'wire' && view === 'end') {
    lines.push('Around a straight wire the field lines are concentric circles', 'Their direction is given by the right-hand thumb rule', 'The field is weaker further from the wire: the circles spread out');
    facts.push('the magnetic field lines around a straight current-carrying wire are concentric circles centred on the wire',
      `current ${s.direction === 'in' ? 'into' : 'out of'} the page: the field lines go ${s.direction === 'in' ? 'clockwise' : 'anticlockwise'} as seen here (right-hand thumb rule)`,
      'the field at a point is larger for a larger current and smaller further from the wire (it varies inversely with distance)');
  } else if (src === 'wire') {
    lines.push('Thumb along the current, fingers curl the way of the field', 'On one side the field comes out of the page, on the other it goes in', 'Under the wire, a compass needle turns across it');
    facts.push('with the thumb of the right hand along the current, the fingers wrap around the wire the way the field lines go (right-hand thumb rule)',
      'a compass under a wire carrying current from north to south turns its north pole towards the east; reversing the current turns it west');
  } else if (src === 'loop' && view === 'section') {
    lines.push('Near the wire the lines are circles around it', 'At the centre of the loop they are almost straight and all point one way', `${s.turns && s.turns > 1 ? `${s.turns} turns: the field is ${s.turns} times as large` : 'A coil of n turns: n times the field'}`);
    facts.push('near each point of a circular loop the field lines are concentric circles; at the centre of the loop they appear as straight lines',
      'a coil of n turns carrying the same current produces a field n times as large as one turn, since each turn\'s field adds up');
  } else if (src === 'loop') {
    const acw = s.direction !== 'clockwise';
    lines.push(`Current ${acw ? 'anticlockwise' : 'clockwise'} as seen`, `Inside the loop the field points ${acw ? 'out of' : 'into'} the page`, `Outside it, ${acw ? 'into' : 'out of'} the page`);
    facts.push(`a current going ${acw ? 'anticlockwise' : 'clockwise'} round a loop lying in the page makes a field ${acw ? 'out of' : 'into'} the page inside the loop and ${acw ? 'into' : 'out of'} it outside (right-hand rule)`);
  } else if (src === 'solenoid' && s.compare) {
    lines.push('Turns packed close, current the same way in each: their fields add up', s.compare === 'spread' ? 'Spread the same turns out: their fields add less at the centre; fewer lines' : 'Reverse the current in some turns: their fields take away from the rest; fewer lines', 'The field is strongest when the turns are close and the current flows the same way in all of them');
    facts.push('the fields of the turns of a coil add up when the current flows the same way in every turn',
      s.compare === 'spread' ? 'spreading the same turns out over a longer coil makes the field at its centre smaller' : 'turns carrying the current the opposite way make fields that cancel part of the others\' fields: the net field is smaller');
  } else if (src === 'solenoid') {
    lines.push('A solenoid\'s field is like a bar magnet\'s: one end is N, the other S', 'Inside, the lines are parallel straight lines: the field is the same at all points (uniform)', s.core ? 'A soft iron core inside makes an electromagnet' : 'A soft iron rod inside would make an electromagnet');
    facts.push('the field of a current-carrying solenoid is similar to that of a bar magnet: one end behaves as a north pole, the other as a south pole',
      'inside a solenoid the field lines are parallel straight lines: the field is the same at all points inside (uniform)',
      'a soft iron core placed inside a solenoid is magnetised by its strong field: an electromagnet');
  } else {
    const d = s.direction ?? 'right';
    lines.push('A uniform field: the same strength and direction everywhere', d === 'out' || d === 'in' ? `Dots: the field out of the page; crosses: into it` : 'Drawn as parallel, equally spaced straight lines');
    facts.push('a uniform magnetic field is drawn as parallel straight lines, equally spaced, all pointing the same way (or dots and crosses for a field out of or into the page)');
  }
  if (switched) {
    lines.push(s.key === 'closes' ? 'No current: the needle points north. Current: the needle turns' : 'Reverse the current: the needle turns the other way');
    facts.push(s.key === 'closes' ? 'with no current the compass needle points north; when the key is plugged in and current flows, the needle is deflected: the current makes a magnetic field (Oersted, 1820)'
      : 'reversing the direction of the current reverses the field, and the compass needle is deflected the other way');
  }
  if (strength) { lines.push(strength); facts.push('increasing the current increases the magnetic field at a given point: the compass deflects more and the field lines are drawn closer together'); }
  if (panel) {
    const px = 0.66 * W, pw = W - px - 40 * k;
    let row = 0.14 * H;
    if (s.title) { props.push({id: 'title', type: 'text', x: px, y: row, text: s.title, size: 44 * k, weight: 700, width: pw}); row += wrapText(s.title, 44 * k, pw).length * 1.25 * 44 * k + 18 * k; }
    lines.forEach((value, j) => { props.push({id: `say${j}`, type: 'text', x: px, y: row, text: value, size: 30 * k, width: pw, weight: j ? 400 : 700, show: [0.8 + 1.4 * j, 1e9], fade: 0.3}); row += wrapText(value, 30 * k, pw).length * 1.3 * 30 * k + 12 * k; });
  } else if (s.title) props.push({id: 'title', type: 'text', x: left, y: 0.16 * H, text: s.title, size: 44 * k, weight: 700, width: 0.92 * W});
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: T, theme: s.theme ?? 'dark', props, actors: [], meta: {verb: 'magnetic_field', facts, anchors}};
}
