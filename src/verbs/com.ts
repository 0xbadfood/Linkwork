// centre_of_mass: the centre of mass of a system, computed (NCERT Class 11 System of Particles and Rotational Motion,
// §6.2–6.4; 2026-10-30). Three cases:
// - masses: point masses on a line or in a plane; X = Σmx / Σm (and Y), the CM drawn where it falls, nearer the heavier;
// - bodies: uniform rods, rectangles, discs, rings and triangles; one body shows its lines of symmetry (or a triangle's
//   medians) meeting at its CM; several (an L-shaped lamina of squares) each show their own CM, then the combined one;
// - explode: a projectile breaks into two pieces in flight; the pieces fly apart (momentum conserved: the second
//   piece's velocity is computed) while their CM keeps to the unbroken parabola, until a piece lands.
import type {Actor, Prop, Scene} from '../scene.ts';
import type {Plane} from '../plane.ts';
import {toScene} from '../plane.ts';
import {wrapText} from '../svg.ts';
import {round} from '../vec.ts';
import {n2, panel, scene, text} from './calculus.ts';
import {frame} from './vectors.ts';

type P2 = [number, number];
export const COM_SHAPES = ['rod', 'rectangle', 'disc', 'ring', 'triangle'] as const;
type Body = {shape: (typeof COM_SHAPES)[number]; at?: P2; length?: number; angle?: number; w?: number; h?: number; r?: number; vertices?: P2[]; m?: number; label?: string};
export type ComSpec = {verb: 'centre_of_mass'; masses?: {m: number; x: number; y?: number; label?: string}[]; bodies?: Body[];
  explode?: {v0: number; angle: number; g?: number; at?: number; pieces: [number, number]; v1: P2};
  unit?: string; title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};

const DEG = Math.PI / 180;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isP = (v: unknown): v is P2 => Array.isArray(v) && v.length === 2 && v.every(isNum);
const f = (v: number) => n2(round(v, 9), Number.isInteger(round(v, 9)) ? 0 : 2);
const SUB = '₀₁₂₃₄₅₆₇₈₉';
const sub = (i: number) => String(i).split('').map(d => SUB[+d]).join('');

/** A body's CM, its "mass" when none is given (area for a lamina; length for a rod or ring) and its outline points. */
function bodyOf(b: Body): {c: P2; size: number; pts: P2[]} {
  const [x, y] = b.at ?? [0, 0];
  switch (b.shape) {
    case 'rod': { const L = b.length ?? 1, a = (b.angle ?? 0) * DEG, d: P2 = [Math.cos(a) * L / 2, Math.sin(a) * L / 2];
      return {c: [x, y], size: L, pts: [[x - d[0], y - d[1]], [x + d[0], y + d[1]]]}; }
    case 'rectangle': { const w = b.w ?? 1, h = b.h ?? 1;
      return {c: [x, y], size: w * h, pts: [[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2]]}; }
    case 'disc': case 'ring': { const r = b.r ?? 1;
      return {c: [x, y], size: b.shape === 'disc' ? Math.PI * r * r : 2 * Math.PI * r, pts: [[x - r, y - r], [x + r, y + r]]}; }
    case 'triangle': { const v = b.vertices ?? [[0, 0], [1, 0], [0.5, 0.87]];
      const area = Math.abs((v[1][0] - v[0][0]) * (v[2][1] - v[0][1]) - (v[2][0] - v[0][0]) * (v[1][1] - v[0][1])) / 2;
      return {c: [(v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3], size: area, pts: v}; }
  }
}

type Flight = {tb: number; T: number; v2: P2; at: (t: number) => {cm: P2; p1: P2; p2: P2}; errors: string[]};
/** The break-up: the CM's parabola, the pieces after the break, and when the first piece lands. */
function flight(e: NonNullable<ComSpec['explode']>): Flight {
  const g = e.g ?? 9.8, u: P2 = [e.v0 * Math.cos(e.angle * DEG), e.v0 * Math.sin(e.angle * DEG)], top = u[1] / g, land = 2 * u[1] / g;
  const tb = e.at ?? top, [m1, m2] = e.pieces, M = m1 + m2;
  const cm = (t: number): P2 => [u[0] * t, u[1] * t - g * t * t / 2];
  const vb: P2 = [u[0], u[1] - g * tb], pb = cm(tb);
  const v2: P2 = [(M * vb[0] - m1 * e.v1[0]) / m2, (M * vb[1] - m1 * e.v1[1]) / m2];
  const piece = (v: P2, t: number): P2 => (t <= tb ? cm(t) : [pb[0] + v[0] * (t - tb), pb[1] + v[1] * (t - tb) - g * (t - tb) ** 2 / 2]);
  const lands = (v: P2) => tb + (v[1] + Math.sqrt(v[1] * v[1] + 2 * g * pb[1])) / g;
  const errors: string[] = [];
  if (tb <= 0 || tb >= land) errors.push(`centre_of_mass: explode.at is a time in flight, between 0 and ${f(land)} s (it lands then); leave it out to break at the top (${f(top)} s)`);
  return {tb, T: Math.min(lands(e.v1), lands(v2)), v2, at: t => ({cm: cm(t), p1: piece(e.v1, t), p2: piece(v2, t)}), errors};
}

export function comErrors(s: ComSpec): string[] {
  const e: string[] = [], cases = [s.masses, s.bodies, s.explode].filter(x => x !== undefined).length;
  if (cases !== 1) return ['centre_of_mass: give exactly one of masses (point masses), bodies (uniform shapes) or explode (a projectile breaking up)'];
  if (s.masses) {
    if (!Array.isArray(s.masses) || s.masses.length < 2 || s.masses.length > 8) e.push('centre_of_mass: masses is a list of 2 to 8 {m, x, y?}');
    else for (const [i, p] of s.masses.entries()) {
      if (!(isNum(p?.m) && p.m > 0)) e.push(`centre_of_mass: masses ${i + 1}: m is above 0 (kg)`);
      if (!isNum(p?.x) || (p.y !== undefined && !isNum(p.y))) e.push(`centre_of_mass: masses ${i + 1}: x (and y in a plane) are numbers`);
    }
  }
  if (s.bodies) {
    if (!Array.isArray(s.bodies) || s.bodies.length < 1 || s.bodies.length > 6) return ['centre_of_mass: bodies is a list of 1 to 6 shapes'];
    for (const [i, b] of s.bodies.entries()) {
      const at = `centre_of_mass: bodies ${i + 1}`;
      if (!COM_SHAPES.includes(b?.shape)) { e.push(`${at}: shape is one of ${COM_SHAPES.join(', ')}`); continue; }
      if (b.at !== undefined && !isP(b.at)) e.push(`${at}: at is its centre [x, y]`);
      for (const k of ['length', 'w', 'h', 'r'] as const) if (b[k] !== undefined && !(isNum(b[k]) && b[k]! > 0)) e.push(`${at}: ${k} is above 0`);
      if (b.shape === 'triangle' && !(Array.isArray(b.vertices) && b.vertices.length === 3 && b.vertices.every(isP))) e.push(`${at}: a triangle gives vertices [[x, y], [x, y], [x, y]]`);
      if (b.m !== undefined && !(isNum(b.m) && b.m > 0)) e.push(`${at}: m is above 0`);
    }
    // without masses, mass goes with area: only for flat sheets of one material
    if (s.bodies.length > 1 && s.bodies.some(b => b.m === undefined) && s.bodies.some(b => ['rod', 'ring'].includes(b.shape)))
      e.push('centre_of_mass: a rod or ring with other bodies needs m for every body (without m, mass is taken as area, for flat sheets of one material)');
  }
  if (s.explode) {
    const x = s.explode;
    if (!(isNum(x.v0) && x.v0 > 0) || !(isNum(x.angle) && x.angle > 0 && x.angle < 90)) e.push('centre_of_mass: explode needs v0 (m/s, above 0) and angle (degrees, 0 to 90)');
    if (!(Array.isArray(x.pieces) && x.pieces.length === 2 && x.pieces.every(m => isNum(m) && m > 0))) e.push('centre_of_mass: explode.pieces is the two masses [m1, m2] in kg');
    if (!isP(x.v1)) e.push("centre_of_mass: explode.v1 is piece 1's velocity just after the break, [vx, vy] in m/s (piece 2's is computed)");
    if (x.at !== undefined && !(isNum(x.at) && x.at > 0)) e.push('centre_of_mass: explode.at is the time of the break in s');
    if (!e.length) e.push(...flight(x).errors);
  }
  return e;
}

/** A window with equal units across and up, holding every point with a margin. */
function fit(ps: P2[], boxW: number, boxH: number, floor = false): {x: P2; y: P2} {
  let x0 = Math.min(...ps.map(p => p[0])), x1 = Math.max(...ps.map(p => p[0])), y0 = Math.min(...ps.map(p => p[1])), y1 = Math.max(...ps.map(p => p[1]));
  const m = 0.15 * Math.max(x1 - x0, y1 - y0, 1e-9);
  x0 -= m; x1 += m; y1 += m; y0 = floor ? Math.min(0, y0) - 0.05 * m : y0 - m;
  const per = Math.max((x1 - x0) / boxW, (y1 - y0) / boxH), cx = (x0 + x1) / 2;
  return floor ? {x: [cx - per * boxW / 2, cx + per * boxW / 2], y: [y0, y0 + per * boxH]}
    : {x: [cx - per * boxW / 2, cx + per * boxW / 2], y: [(y0 + y1) / 2 - per * boxH / 2, (y0 + y1) / 2 + per * boxH / 2]};
}

export function centreOfMass(s: ComSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, u = s.unit ?? 'm';
  const fr = frame(W, H, k, s.title), box = fr.box, props: Prop[] = [...fr.titles], actors: Actor[] = [], facts: string[] = [];
  const px = fr.px, ptext = panel(W, k);
  let row = fr.row, end = 6;
  const line = (id: string, t: string, when: number, extra: Partial<Prop> = {}) => {
    props.push(ptext(id, px, row, t, 30 * k, {show: [when, 1e9], ...extra}));
    row += wrapText(t, 30 * k, W - px - 40 * k).length * 1.3 * 30 * k + 6 * k;
  };
  // the CM's mark: a ring round a dot, labelled CM, at plane point c
  const mark = (plane: Plane, c: P2, when: number) => {
    const [x, y] = toScene(plane, c);
    props.push({id: 'cm', type: 'circle', x, y, r: 16 * k, style: {fill: 'paper', stroke: 'accent', width: 4 * k}, show: [when, 1e9], fade: 0.3, layer: 5} as Prop,
      {id: 'cm-dot', type: 'circle', x, y, r: 5 * k, style: {fill: 'accent'}, show: [when, 1e9], fade: 0.3, layer: 5} as Prop,
      text('lcm', x + 24 * k, y - 18 * k, 'CM', 30 * k, {weight: 700, style: {fill: 'accent'}, show: [when, 1e9], fade: 0.3, layer: 5}));
  };

  if (s.masses) {
    const ms = s.masses, M = ms.reduce((a, p) => a + p.m, 0), flat = ms.every(p => p.y === undefined);
    const X = ms.reduce((a, p) => a + p.m * p.x, 0) / M, Y = ms.reduce((a, p) => a + p.m * (p.y ?? 0), 0) / M;
    const win = fit([...ms.map(p => [p.x, p.y ?? 0] as P2), [X, Y]], box[2] - box[0], box[3] - box[1]);
    const plane: Plane = {id: 'p', x: win.x, y: win.y, box};
    const span = win.x[1] - win.x[0], step = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100].find(v => span / v <= 14) ?? 200;
    props.push(flat ? {id: 'axis', type: 'arrow', plane: 'p', x1: win.x[0], y1: 0, x2: win.x[1], y2: 0, head: 16 * k, style: {stroke: 'muted', width: 3 * k}} as Prop
      : {id: 'axes', type: 'axes', plane: 'p', step: [step, step], size: 22 * k, grid: true} as Prop);
    const big = Math.max(...ms.map(p => p.m));
    for (const [i, p] of ms.entries()) {
      const r = (12 + 16 * Math.sqrt(p.m / big)) * k, name = p.label ?? (s.illustrative ? `m${sub(i + 1)}` : `${f(p.m)} kg`);
      props.push({id: `m${i}`, type: 'circle', plane: 'p', x: p.x, y: p.y ?? 0, r, style: {fill: 'cool', stroke: 'ink', width: 3 * k}, show: [0.4 + 0.3 * i, 1e9], fade: 0.3, layer: 3} as Prop);
      const [sx, sy] = toScene(plane, [p.x, p.y ?? 0]);
      props.push(text(`lm${i}`, sx, sy - r - 12 * k, name, 28 * k, {weight: 700, align: 'middle', show: [0.4 + 0.3 * i, 1e9]}));
      if (flat && !s.illustrative) props.push(text(`lx${i}`, sx, sy + r + 34 * k, `${f(p.x)} ${u}`, 24 * k, {align: 'middle', style: {fill: 'muted'}, show: [0.4 + 0.3 * i, 1e9]}));
    }
    mark(plane, [X, Y], 3);
    if (!flat) props.push({id: 'dx', type: 'line', plane: 'p', x1: X, y1: Y, x2: X, y2: win.y[0], style: {stroke: 'accent', width: 2 * k, dash: [6 * k, 6 * k]}, show: [3.4, 1e9], fade: 0.3} as Prop,
      {id: 'dy', type: 'line', plane: 'p', x1: X, y1: Y, x2: win.x[0], y2: Y, style: {stroke: 'accent', width: 2 * k, dash: [6 * k, 6 * k]}, show: [3.4, 1e9], fade: 0.3} as Prop);
    const sum = (c: (p: typeof ms[0]) => number) => ms.length <= 4 ? `(${ms.map(p => `${f(p.m)} × ${f(c(p))}`).join(' + ')}) / ${f(M)}` : `Σ / ${f(M)}`;
    line('l1', 'The centre of mass: each position weighted by its mass', 1.2);
    line('l2', `X = Σ mᵢxᵢ / Σ mᵢ${flat ? '' : ',  Y = Σ mᵢyᵢ / Σ mᵢ'}`, 1.8, {weight: 700});
    line('l3', `X = ${sum(p => p.x)} = ${f(X)} ${u}`, 3, {style: {fill: 'accent'}});
    if (!flat) line('l4', `Y = ${sum(p => p.y ?? 0)} = ${f(Y)} ${u}`, 3.4, {style: {fill: 'accent'}});
    const equal = ms.every(p => Math.abs(p.m - ms[0].m) < 1e-9);
    if (ms.length === 2 && flat) {
      const [a, b] = ms, da = Math.abs(X - a.x), db = Math.abs(X - b.x);
      line('l5', equal ? 'Equal masses: the centre of mass is midway between them'
        : `It lies nearer the heavier mass: distances ${f(da)} : ${f(db)} = ${f(b.m)} : ${f(a.m)}, the masses the other way round`, 4.4, {style: {fill: 'muted'}});
    } else if (equal) line('l5', 'Equal masses: the centre of mass is at their average position', 4.4, {style: {fill: 'muted'}});
    facts.push(`total mass = ${f(M)} kg`, `centre of mass X = ${f(X)} ${u}`, ...(flat ? [] : [`centre of mass Y = ${f(Y)} ${u}`]));
    end = 6;
    return scene(s, W, H, end + 1.2, plane, props, actors, {verb: 'centre_of_mass', facts, cm: [round(X, 6), round(Y, 6)]});
  }

  if (s.bodies) {
    const bs = s.bodies.map(bodyOf), Ms = s.bodies.map((b, i) => b.m ?? bs[i].size), M = Ms.reduce((a, b) => a + b, 0);
    const X = bs.reduce((a, b, i) => a + Ms[i] * b.c[0], 0) / M, Y = bs.reduce((a, b, i) => a + Ms[i] * b.c[1], 0) / M;
    const win = fit(bs.flatMap(b => b.pts), box[2] - box[0], box[3] - box[1]);
    const plane: Plane = {id: 'p', x: win.x, y: win.y, box};
    const span = win.x[1] - win.x[0], step = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100].find(v => span / v <= 14) ?? 200;
    props.push({id: 'axes', type: 'axes', plane: 'p', step: [step, step], size: 22 * k, grid: true} as Prop);
    const dash = (id: string, p: P2, q: P2, when: number) => props.push({id, type: 'line', plane: 'p', x1: p[0], y1: p[1], x2: q[0], y2: q[1],
      style: {stroke: 'muted', width: 2.5 * k, dash: [8 * k, 7 * k]}, show: [when, 1e9], fade: 0.4, layer: 2} as Prop);
    const one = s.bodies.length === 1;
    for (const [i, b] of s.bodies.entries()) {
      const g = bs[i], fill = {fill: 'faint', stroke: 'ink', width: 3 * k};
      if (b.shape === 'rod') props.push({id: `b${i}`, type: 'line', plane: 'p', x1: g.pts[0][0], y1: g.pts[0][1], x2: g.pts[1][0], y2: g.pts[1][1], style: {stroke: 'ink', width: 14 * k}, layer: 1} as Prop);
      else if (b.shape === 'disc' || b.shape === 'ring') {
        const r = (b.r ?? 1) * (box[2] - box[0]) / span;
        props.push({id: `b${i}`, type: 'circle', plane: 'p', x: g.c[0], y: g.c[1], r, style: b.shape === 'ring' ? {stroke: 'ink', width: 10 * k} : fill, layer: 1} as Prop);
      } else props.push({id: `b${i}`, type: 'polyline', plane: 'p', points: g.pts, closed: true, style: fill, layer: 1} as Prop);
      if (one) {
        // symmetry lines (a triangle's medians) appear one by one and meet at the CM
        const [cx, cy] = g.c, h = (b.h ?? 1) / 2, w = (b.w ?? 1) / 2, r = b.r ?? 1;
        const lines: [P2, P2][] = b.shape === 'rectangle' ? [[[cx - w, cy], [cx + w, cy]], [[cx, cy - h], [cx, cy + h]]]
          : b.shape === 'rod' ? [[[cx - 0.12 * (b.length ?? 1) * Math.sin((b.angle ?? 0) * DEG), cy + 0.12 * (b.length ?? 1) * Math.cos((b.angle ?? 0) * DEG)], [cx + 0.12 * (b.length ?? 1) * Math.sin((b.angle ?? 0) * DEG), cy - 0.12 * (b.length ?? 1) * Math.cos((b.angle ?? 0) * DEG)]]]
          : b.shape === 'triangle' ? g.pts.map((v, j) => { const o = g.pts.filter((_, q) => q !== j); return [v, [(o[0][0] + o[1][0]) / 2, (o[0][1] + o[1][1]) / 2]] as [P2, P2]; })
          : [[[cx - r, cy], [cx + r, cy]], [[cx, cy - r], [cx, cy + r]]];
        lines.forEach(([p, q], j) => dash(`sym${j}`, p, q, 1.2 + 0.6 * j));
      } else {
        props.push({id: `c${i}`, type: 'circle', plane: 'p', x: g.c[0], y: g.c[1], r: 8 * k, style: {fill: 'cool'}, show: [1.2 + 0.4 * i, 1e9], fade: 0.3, layer: 3} as Prop);
        const [sx, sy] = toScene(plane, g.c);
        props.push(text(`lc${i}`, sx, sy - 16 * k, b.label ?? `m${sub(i + 1)}`, 26 * k, {weight: 700, align: 'middle', style: {fill: 'cool'}, show: [1.2 + 0.4 * i, 1e9], layer: 3}));
      }
    }
    mark(plane, [X, Y], one ? 3 : 3.6);
    if (one) {
      const b = s.bodies[0];
      line('l1', b.shape === 'triangle' ? "A uniform triangle: its medians meet at one point, the centroid" : `A uniform ${b.shape}: its lines of symmetry`, 1.2);
      line('l2', b.shape === 'triangle' ? 'The centre of mass is at the centroid, a third of the way up each median' : 'The centre of mass lies on every line of symmetry, so it is where they cross: the geometric centre', 3, {weight: 700, style: {fill: 'accent'}});
      if (b.shape === 'ring') line('l3', 'No mass sits there: the centre of mass need not lie in the body', 4.2, {style: {fill: 'muted'}});
      if (!s.illustrative) line('l4', `CM at (${f(X)}, ${f(Y)}) ${u}`, 4.8);
    } else {
      line('l1', "Each part's centre of mass, by symmetry, carries that part's mass", 1.2);
      line('l2', s.bodies.every(b => b.m === undefined) ? 'Of one material and thickness, mass goes with area' : `Masses: ${s.bodies.map((b, i) => `${b.label ?? `m${sub(i + 1)}`} = ${f(Ms[i])} kg`).join(', ')}`, 2, {style: {fill: 'cool'}});
      line('l3', 'Then the parts are treated as point masses: X = Σ mᵢxᵢ / Σ mᵢ', 3, {weight: 700});
      if (!s.illustrative) line('l4', `CM at (${f(X)}, ${f(Y)}) ${u}`, 3.6, {style: {fill: 'accent'}});
    }
    facts.push(`centre of mass at (${f(X)}, ${f(Y)}) ${u}`, ...bs.map((b, i) => `${s.bodies![i].label ?? `part ${i + 1}`}: own centre at (${f(b.c[0])}, ${f(b.c[1])}) ${u}${s.bodies![i].m === undefined ? '' : `, ${f(Ms[i])} kg`}`));
    return scene(s, W, H, 6.4, plane, props, actors, {verb: 'centre_of_mass', facts, cm: [round(X, 6), round(Y, 6)]});
  }

  // explode: screen time runs the flight in 3 to 7 s; the pieces land, the CM held to its parabola till then
  const e = s.explode!, fl = flight(e), g = e.g ?? 9.8, [m1, m2] = e.pieces, n = 90;
  const samples = Array.from({length: n + 1}, (_, i) => fl.T * i / n), pts = samples.map(fl.at);
  const landCM = 2 * e.v0 * Math.sin(e.angle * DEG) / g, path = Array.from({length: 41}, (_, i) => fl.at(landCM * i / 40).cm);
  const win = fit([...pts.flatMap(p => [p.cm, p.p1, p.p2]), ...path], box[2] - box[0], box[3] - box[1], true);
  const plane: Plane = {id: 'p', x: win.x, y: win.y, box};
  const lead = 1, Ts = Math.min(7, Math.max(3.5, fl.T)), at = (i: number) => lead + Ts * i / n, tb = lead + Ts * fl.tb / fl.T;
  props.push({id: 'ground', type: 'line', plane: 'p', x1: win.x[0], y1: 0, x2: win.x[1], y2: 0, style: {stroke: 'muted', width: 4 * k}} as Prop,
    {id: 'path', type: 'polyline', plane: 'p', points: path, style: {stroke: 'accent', width: 3 * k, dash: [10 * k, 9 * k], opacity: 0.6}, show: [0.3, 1e9], layer: 1} as Prop);
  const mover = (id: string, get: (q: typeof pts[0]) => P2) => {
    actors.push({id: `d-${id}`, rig: 'dot', at: toScene(plane, get(pts[0])), opacity: [[0, 0]], layer: 1, blink: [],
      base: pts.map((q, i) => ({t: at(i), at: toScene(plane, get(q)), ...(i ? {ease: 'linear' as const} : {})}))} as Actor);
  };
  mover('p1', q => q.p1); mover('p2', q => q.p2); mover('cm', q => q.cm);
  const R1 = (10 + 12 * Math.sqrt(m1 / Math.max(m1, m2))) * k, R2 = (10 + 12 * Math.sqrt(m2 / Math.max(m1, m2))) * k, Rw = 22 * k;
  props.push({id: 'whole', type: 'circle', x: 0, y: 0, r: Rw, style: {fill: 'cool', stroke: 'ink', width: 3 * k}, show: [0, tb], layer: 4, anchor: {actor: 'd-cm', joint: 'p'}} as Prop);
  for (const [id, r, fill] of [['p1', R1, 'good'], ['p2', R2, 'bad']] as const) {
    props.push({id, type: 'circle', x: 0, y: 0, r, style: {fill, stroke: 'ink', width: 3 * k}, show: [tb, 1e9], layer: 4, anchor: {actor: `d-${id}`, joint: 'p'}} as Prop,
      {id: `trail-${id}`, type: 'trail', of: {actor: `d-${id}`, joint: 'p'}, t0: tb, step: 0.05, style: {stroke: fill, width: 3 * k}, layer: 2} as Prop,
      text(`l${id}`, 0, 0, s.illustrative ? (id === 'p1' ? 'm₁' : 'm₂') : `${f(id === 'p1' ? m1 : m2)} kg`, 26 * k, {weight: 700, align: 'middle', style: {fill}, show: [tb, 1e9], layer: 4,
        anchor: {actor: `d-${id}`, joint: 'p', offset: [0, -r - 12 * k]}}));
  }
  props.push({id: 'boom', type: 'circle', plane: 'p', x: fl.at(fl.tb).cm[0], y: fl.at(fl.tb).cm[1], r: 40 * k, style: {stroke: 'accent', width: 4 * k}, show: [tb, tb + 0.5], fade: 0.25, layer: 3} as Prop);
  props.push({id: 'cm', type: 'circle', x: 0, y: 0, r: 13 * k, style: {fill: 'paper', stroke: 'accent', width: 4 * k}, show: [tb, 1e9], layer: 5, anchor: {actor: 'd-cm', joint: 'p'}} as Prop,
    text('lcm', 0, 0, 'CM', 28 * k, {weight: 700, style: {fill: 'accent'}, show: [tb, 1e9], layer: 5, anchor: {actor: 'd-cm', joint: 'p', offset: [20 * k, 34 * k]}}));
  end = at(n);
  line('l1', s.illustrative ? 'A projectile breaks into two pieces in flight' : `A ${f(m1 + m2)} kg projectile, ${f(e.v0)} m/s at ${f(e.angle)}°, breaks into ${f(m1)} kg and ${f(m2)} kg`, 0.4);
  line('l2', 'The explosion\'s forces are internal: they cancel in pairs', tb + 0.3, {style: {fill: 'muted'}});
  line('l3', 'Only gravity acts on the system, so its centre of mass keeps to the same parabola', tb + 1, {weight: 700, style: {fill: 'accent'}});
  if (!s.illustrative) line('l4', `Momentum is conserved at the break: piece 2 moves off at (${f(fl.v2[0])}, ${f(fl.v2[1])}) m/s`, tb + 1.8);
  line('l5', 'Once a piece lands, the ground pushes on it: an external force, and the CM leaves the parabola', end, {style: {fill: 'muted'}});
  facts.push(`breaks at t = ${f(fl.tb)} s`, `piece 1 (${f(m1)} kg) just after: (${f(e.v1[0])}, ${f(e.v1[1])}) m/s`, `piece 2 (${f(m2)} kg) just after: (${f(fl.v2[0])}, ${f(fl.v2[1])}) m/s (momentum conserved)`,
    `first piece lands at t = ${f(fl.T)} s`, `CM at that moment (${f(fl.at(fl.T).cm[0])}, ${f(fl.at(fl.T).cm[1])}) m, on the unbroken parabola`, `unbroken range = ${f(e.v0 ** 2 * Math.sin(2 * e.angle * DEG) / g)} m`);
  return scene(s, W, H, end + 2.4, plane, props, actors, {verb: 'centre_of_mass', facts});
}
