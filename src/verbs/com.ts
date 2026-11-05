// centre_of_mass: the centre of mass of a system, computed (NCERT Class 11 System of Particles and Rotational Motion,
// §6.2–6.4; 2026-10-30). Three cases:
// - masses: point masses on a line or in a plane; X = Σmx / Σm (and Y), the CM drawn where it falls, nearer the heavier;
// - bodies: uniform rods, rectangles, discs, rings and triangles; one body shows its lines of symmetry (or a triangle's
//   medians) meeting at its CM; several (an L-shaped lamina of squares) each show their own CM, then the combined one;
// - explode: a projectile breaks into two pieces in flight; the pieces fly apart (momentum conserved: the second
//   piece's velocity is computed) while their CM keeps to the unbroken parabola, until a piece lands.
// One body also takes turns (the same body at several orientations, its CG = CM point and the plumb line through it on
// each: one point however it is turned) or gravity: 'uniform' (equal weight arrows; CG at the CM) or 'varying' (g
// weaker higher up, exaggerated: the weights' centre, the CG, sits below the CM; 2026-10-30, C9 of keph1-06), or hang:
// the body hung from one to three points, each copy turned until its CM is straight below the point, a plumb line
// through it; the lines then drawn on the body cross at the CG (the book's way to find an irregular lamina's CG), or
// "?" marks along each line for the wrong idea that the CG is just some point on one line (2026-11-05, C9 S26).
// A polygon (3 to 10 vertices: an irregular lamina) goes with hang, turns, gravity or other bodies.
import type {Actor, Prop, Scene} from '../scene.ts';
import type {Plane} from '../plane.ts';
import {toScene} from '../plane.ts';
import {wrapText} from '../svg.ts';
import {round} from '../vec.ts';
import {n2, panel, scene, text} from './calculus.ts';
import {frame} from './vectors.ts';
import {boxOf, meets} from './dodge.ts';

type P2 = [number, number];
export const COM_SHAPES = ['rod', 'rectangle', 'disc', 'ring', 'triangle', 'polygon'] as const;
type Body = {shape: (typeof COM_SHAPES)[number]; at?: P2; length?: number; angle?: number; w?: number; h?: number; r?: number; vertices?: P2[]; m?: number; label?: string};
export type ComSpec = {verb: 'centre_of_mass'; masses?: {m: number; x: number; y?: number; label?: string}[]; bodies?: Body[];
  explode?: {v0: number; angle: number; g?: number; at?: number; pieces: [number, number]; v1: P2};
  turns?: number[]; gravity?: 'uniform' | 'varying'; hang?: {from: P2[]; cross?: boolean; guesses?: boolean};
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
    case 'polygon': { const v = b.vertices ?? [[0, 0], [1, 0], [0.5, 0.87]];
      // the shoelace centroid of a simple polygon
      let A = 0, cx = 0, cy = 0;
      v.forEach((p, i) => { const q = v[(i + 1) % v.length], c = p[0] * q[1] - q[0] * p[1]; A += c; cx += (p[0] + q[0]) * c; cy += (p[1] + q[1]) * c; });
      return {c: [cx / (3 * A), cy / (3 * A)], size: Math.abs(A) / 2, pts: v}; }
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
      if (b.shape === 'polygon' && !(Array.isArray(b.vertices) && b.vertices.length >= 3 && b.vertices.length <= 10 && b.vertices.every(isP))) e.push(`${at}: a polygon gives 3 to 10 vertices [[x, y], ...] in order round its edge`);
      else if (b.shape === 'polygon' && bodyOf(b).size < 1e-9) e.push(`${at}: the polygon's vertices enclose no area`);
      if (b.m !== undefined && !(isNum(b.m) && b.m > 0)) e.push(`${at}: m is above 0`);
    }
    // without masses, mass goes with area: only for flat sheets of one material
    if (s.bodies.length > 1 && s.bodies.some(b => b.m === undefined) && s.bodies.some(b => ['rod', 'ring'].includes(b.shape)))
      e.push('centre_of_mass: a rod or ring with other bodies needs m for every body (without m, mass is taken as area, for flat sheets of one material)');
    if ((s.turns !== undefined || s.gravity !== undefined || s.hang !== undefined) && s.bodies.length !== 1) e.push('centre_of_mass: turns, gravity and hang are for one body');
    if (s.bodies.length === 1 && s.bodies[0]?.shape === 'polygon' && s.turns === undefined && s.gravity === undefined && s.hang === undefined)
      e.push('centre_of_mass: a polygon has no lines of symmetry to draw; give it hang (its CG found by hanging it), turns or gravity, or put it with other bodies');
  }
  if ((s.turns !== undefined || s.gravity !== undefined || s.hang !== undefined) && !s.bodies) e.push('centre_of_mass: turns, gravity and hang go with bodies (one body)');
  if (s.hang !== undefined && s.bodies?.length === 1 && !e.length) e.push(...hangErrors(s));
  if (s.turns !== undefined) {
    if (!(Array.isArray(s.turns) && s.turns.length >= 2 && s.turns.length <= 4 && s.turns.every(isNum))) e.push('centre_of_mass: turns is 2 to 4 angles in degrees, the first usually 0');
    if (s.bodies?.some(b => b.shape === 'disc' || b.shape === 'ring')) e.push('centre_of_mass: a disc or ring looks the same turned; use turns with a rod, rectangle or triangle');
    if (s.gravity === 'varying') e.push("centre_of_mass: turns go with a uniform field (gravity 'uniform' or left out); in a varying field the CG moves in the body as it turns");
  }
  if (s.gravity !== undefined && !['uniform', 'varying'].includes(s.gravity)) e.push("centre_of_mass: gravity is 'uniform' or 'varying'");
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

  if (s.bodies && s.hang) return hangScene(s, W, H, k, fr, props, facts, line);
  if (s.bodies && (s.turns || s.gravity)) return gravityScene(s, W, H, k, fr, props, facts, line);

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
  const lead = 1, Ts = Math.min(7, Math.max(3.5, fl.T)), at = (i: number) => lead + Ts * i / n, tb = lead + Ts * fl.tb / fl.T, end0 = at(n);
  props.push({id: 'ground', type: 'line', plane: 'p', x1: win.x[0], y1: 0, x2: win.x[1], y2: 0, style: {stroke: 'muted', width: 4 * k}} as Prop,
    {id: 'path', type: 'polyline', plane: 'p', points: path, style: {stroke: 'accent', width: 3 * k, dash: [10 * k, 9 * k], opacity: 0.6}, show: [0.3, 1e9], layer: 1} as Prop);
  const mover = (id: string, get: (q: typeof pts[0]) => P2) => {
    actors.push({id: `d-${id}`, rig: 'dot', at: toScene(plane, get(pts[0])), opacity: [[0, 0]], layer: 1, blink: [],
      base: pts.map((q, i) => ({t: at(i), at: toScene(plane, get(q)), ...(i ? {ease: 'linear' as const} : {})}))} as Actor);
  };
  mover('p1', q => q.p1); mover('p2', q => q.p2); mover('cm', q => q.cm);
  const R1 = (10 + 12 * Math.sqrt(m1 / Math.max(m1, m2))) * k, R2 = (10 + 12 * Math.sqrt(m2 / Math.max(m1, m2))) * k, Rw = 22 * k;
  props.push({id: 'whole', type: 'circle', x: 0, y: 0, r: Rw, style: {fill: 'cool', stroke: 'ink', width: 3 * k}, show: [0, tb], layer: 4, anchor: {actor: 'd-cm', joint: 'p'}} as Prop);
  // Three names leave one point at the break, and the heavier piece flies close to the CM: of the places beside each
  // (a piece's name above or below it, the CM's at a corner), take those whose names meet least over the flight, and
  // show each piece's name once it has come clear (2026-11-05, keph1-06 C3: m₁ on m₂ at the break, m₂ on CM after).
  const names = {p1: s.illustrative ? 'm₁' : `${f(m1)} kg`, p2: s.illustrative ? 'm₂' : `${f(m2)} kg`};
  const after = pts.map((q, i) => ({t: at(i), q})).filter(x => x.t >= tb);
  const scr = (q: P2) => toScene(plane, q);
  type Spot = {o: [number, number]; align: 'start' | 'middle' | 'end'};
  const pieceAt = (r: number): Spot[] => [{o: [0, -r - 12 * k], align: 'middle'}, {o: [r + 8 * k, -r - 4 * k], align: 'start'}, {o: [-r - 8 * k, -r - 4 * k], align: 'end'}];
  const cmAt: Spot[] = [{o: [20 * k, 34 * k], align: 'start'}, {o: [-20 * k, 34 * k], align: 'end'}, {o: [20 * k, -22 * k], align: 'start'}, {o: [-20 * k, -22 * k], align: 'end'}];
  const boxAt = (c: P2, o: [number, number], t: string, size: number, align: 'start' | 'middle' | 'end') => boxOf({x: c[0] + o[0], y: c[1] + o[1], text: t, size, align}, 4 * k);
  const clashAt = (o1: Spot, o2: Spot, oc: Spot, x: typeof after[0]) => {
    const b1 = boxAt(scr(x.q.p1), o1.o, names.p1, 26 * k, o1.align), b2 = boxAt(scr(x.q.p2), o2.o, names.p2, 26 * k, o2.align), bc = boxAt(scr(x.q.cm), oc.o, 'CM', 28 * k, oc.align);
    return [meets(b1, b2) || meets(b1, bc), meets(b2, bc) || meets(b1, b2)];
  };
  let best = {o1: pieceAt(R1)[0], o2: pieceAt(R2)[0], oc: cmAt[0], score: Infinity, clear: [tb, tb]};
  for (const o1 of pieceAt(R1)) for (const o2 of pieceAt(R2)) for (const oc of cmAt) {
    const hits = after.map(x => clashAt(o1, o2, oc, x));
    // a name may wait until it is clear; what counts is a clash after it shows
    const clear = [0, 1].map(j => { const i = hits.findIndex(h => !h[j]); return i < 0 ? Infinity : after[i].t; });
    const score = hits.filter((h, i) => (h[0] && after[i].t >= clear[0]) || (h[1] && after[i].t >= clear[1])).length * 100 + clear[0] + clear[1];
    if (score < best.score) best = {o1, o2, oc, score, clear};
  }
  const offsets = {p1: best.o1, p2: best.o2};
  for (const [id, r, fill] of [['p1', R1, 'good'], ['p2', R2, 'bad']] as const) {
    props.push({id, type: 'circle', x: 0, y: 0, r, style: {fill, stroke: 'ink', width: 3 * k}, show: [tb, 1e9], layer: 4, anchor: {actor: `d-${id}`, joint: 'p'}} as Prop,
      {id: `trail-${id}`, type: 'trail', of: {actor: `d-${id}`, joint: 'p'}, t0: tb, step: 0.05, style: {stroke: fill, width: 3 * k}, layer: 2} as Prop,
      text(`l${id}`, 0, 0, names[id], 26 * k, {weight: 700, align: offsets[id].align, style: {fill}, show: [Math.min(best.clear[id === 'p1' ? 0 : 1], end0), 1e9], layer: 4,
        anchor: {actor: `d-${id}`, joint: 'p', offset: offsets[id].o}}));
  }
  props.push({id: 'boom', type: 'circle', plane: 'p', x: fl.at(fl.tb).cm[0], y: fl.at(fl.tb).cm[1], r: 40 * k, style: {stroke: 'accent', width: 4 * k}, show: [tb, tb + 0.5], fade: 0.25, layer: 3} as Prop);
  props.push({id: 'cm', type: 'circle', x: 0, y: 0, r: 13 * k, style: {fill: 'paper', stroke: 'accent', width: 4 * k}, show: [tb, 1e9], layer: 5, anchor: {actor: 'd-cm', joint: 'p'}} as Prop,
    text('lcm', 0, 0, 'CM', 28 * k, {weight: 700, align: best.oc.align, style: {fill: 'accent'}, show: [tb, 1e9], layer: 5, anchor: {actor: 'd-cm', joint: 'p', offset: best.oc.o}}));
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

const turn = (p: P2, c: P2, deg: number): P2 => {
  const a = deg * DEG, dx = p[0] - c[0], dy = p[1] - c[1];
  return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)];
};

/** Sample points of a body's mass, evenly spread (a grid over a lamina; along a rod or ring). */
function samples(b: Body, g: {c: P2; pts: P2[]}): P2[] {
  const n = 48, out: P2[] = [];
  if (b.shape === 'rod') for (let i = 0; i <= n; i++) out.push([g.pts[0][0] + (g.pts[1][0] - g.pts[0][0]) * i / n, g.pts[0][1] + (g.pts[1][1] - g.pts[0][1]) * i / n]);
  else if (b.shape === 'ring') for (let i = 0; i < n * 2; i++) out.push([g.c[0] + (b.r ?? 1) * Math.cos(Math.PI * i / n), g.c[1] + (b.r ?? 1) * Math.sin(Math.PI * i / n)]);
  else {
    const xs = g.pts.map(p => p[0]), ys = g.pts.map(p => p[1]), [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const inside = (q: P2) => b.shape === 'disc' ? Math.hypot(q[0] - g.c[0], q[1] - g.c[1]) <= (b.r ?? 1)
      : g.pts.reduce((c, p, i) => { const r = g.pts[(i + 1) % g.pts.length]; return ((p[1] > q[1]) !== (r[1] > q[1])) && q[0] < (r[0] - p[0]) * (q[1] - p[1]) / (r[1] - p[1]) + p[0] ? !c : c; }, false);
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) { const q: P2 = [x0 + (x1 - x0) * (i + 0.5) / (n + 1), y0 + (y1 - y0) * (j + 0.5) / (n + 1)]; if (inside(q)) out.push(q); }
  }
  return out;
}

/** One body's centre of gravity: turned through several orientations (one CG = CM point, the plumb line through it on
 * each), or in a uniform or a varying field (weight arrows; with g weaker higher up the CG sits below the CM). */
function gravityScene(s: ComSpec, W: number, H: number, k: number, fr: ReturnType<typeof frame>, props: Prop[], facts: string[],
  line: (id: string, t: string, when: number, extra?: Partial<Prop>) => void): Scene {
  const b = s.bodies![0], g0 = bodyOf(b), box = fr.box, u = s.unit ?? 'm';
  const xs = g0.pts.map(p => p[0]), ys = g0.pts.map(p => p[1]);
  const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), b.shape === 'disc' || b.shape === 'ring' ? 2 * (b.r ?? 1) : 0, 1e-6);
  const turns = s.turns ?? [0], gap = 1.3 * size;
  // copy i sits gap to the right of the last, turned about its own CM
  const copies = turns.map((a, i) => { const dx = i * gap - g0.c[0], c: P2 = [i * gap, 0];
    return {a, c, pts: g0.pts.map(p => turn([p[0] + dx, p[1] - g0.c[1]], c, a))}; });
  const all = copies.flatMap(c => [...c.pts, [c.c[0], c.c[1] - 0.75 * size] as P2, [c.c[0], c.c[1] + 0.75 * size] as P2,
    ...(s.turns ? [] : [[Math.max(...c.pts.map(p => p[0]), c.c[0] + (b.r ?? 0)) + 0.9 * size, c.c[1]] as P2])]);
  const win = fit(all, box[2] - box[0], box[3] - box[1]);
  const plane: Plane = {id: 'p', x: win.x, y: win.y, box}, per = (win.x[1] - win.x[0]) / (box[2] - box[0]);
  const fill = {fill: 'faint', stroke: 'ink', width: 3 * k};
  // a point's ring and dot; its name at lx, ly (scene), joined to the point by a thin leader
  const pin = (id: string, c: P2, name: string, when: number, colour: string, lx: number, ly: number, align: 'start' | 'middle' = 'start') => {
    const [x, y] = toScene(plane, c);
    props.push({id, type: 'circle', x, y, r: 15 * k, style: {fill: 'paper', stroke: colour, width: 4 * k}, show: [when, 1e9], fade: 0.3, layer: 5} as Prop,
      {id: `${id}-dot`, type: 'circle', x, y, r: 5 * k, style: {fill: colour}, show: [when, 1e9], fade: 0.3, layer: 5} as Prop,
      text(`l${id}`, lx, ly, name, 28 * k, {weight: 700, align, style: {fill: colour}, show: [when, 1e9], fade: 0.3, layer: 6}));
    if (align === 'start') props.push({id: `${id}-lead`, type: 'line', x1: x + 15 * k, y1: y, x2: lx - 8 * k, y2: ly - 9 * k, style: {stroke: colour, width: 1.5 * k}, show: [when, 1e9], fade: 0.3, layer: 4} as Prop);
  };
  const right = toScene(plane, [Math.max(...copies[0].pts.map(p => p[0]), b.shape === 'disc' || b.shape === 'ring' ? copies[0].c[0] + (b.r ?? 1) : -1e9), 0])[0] + 40 * k;
  for (const [i, c] of copies.entries()) {
    const when = 0.4 + 1.1 * i;
    if (b.shape === 'rod') props.push({id: `b${i}`, type: 'line', plane: 'p', x1: c.pts[0][0], y1: c.pts[0][1], x2: c.pts[1][0], y2: c.pts[1][1], style: {stroke: 'ink', width: 14 * k}, show: [when, 1e9], fade: 0.3, layer: 1} as Prop);
    else if (b.shape === 'disc' || b.shape === 'ring') props.push({id: `b${i}`, type: 'circle', plane: 'p', x: c.c[0], y: c.c[1], r: (b.r ?? 1) / per,
      style: b.shape === 'ring' ? {stroke: 'ink', width: 10 * k} : fill, show: [when, 1e9], fade: 0.3, layer: 1} as Prop);
    else props.push({id: `b${i}`, type: 'polyline', plane: 'p', points: c.pts, closed: true, style: fill, show: [when, 1e9], fade: 0.3, layer: 1} as Prop);
    if (s.turns) {
      // the plumb line: the total weight acts along the vertical through the one point
      props.push({id: `plumb${i}`, type: 'line', plane: 'p', x1: c.c[0], y1: c.c[1] + 0.7 * size, x2: c.c[0], y2: c.c[1] - 0.7 * size,
        style: {stroke: 'accent', width: 2.5 * k, dash: [8 * k, 7 * k]}, show: [when + 0.4, 1e9], fade: 0.3, layer: 2} as Prop);
      const [bx, by] = toScene(plane, [c.c[0], c.c[1] - 0.7 * size]);
      pin(`cg${i}`, c.c, 'CG = CM', when + 0.4, 'accent', bx, by + 36 * k, 'middle');
      if (!s.illustrative && c.a) props.push(text(`lt${i}`, bx, by + 70 * k, `turned ${f(c.a)}°`, 24 * k, {align: 'middle', style: {fill: 'muted'}, show: [when, 1e9]}));
    }
  }
  const T = 0.4 + 1.1 * copies.length;
  if (s.turns) {
    line('l1', 'The same body, turned', 0.4);
    line('l2', 'Each part weighs mᵢg; about one point their torques cancel, however the body is turned', 1.6);
    line('l3', 'That point is the centre of gravity: the total weight acts through it', T, {weight: 700, style: {fill: 'accent'}});
    line('l4', 'In a uniform field it is the centre of mass: one point, the same in every orientation', T + 0.8, {style: {fill: 'muted'}});
    facts.push(`centre of gravity = centre of mass at the body's centre, in every one of ${turns.length} orientations`);
    return scene(s, W, H, T + 3, plane, props, [], {verb: 'centre_of_mass', facts, cm: [round(g0.c[0], 6), round(g0.c[1], 6)]});
  }
  // gravity: weight arrows on a few parts, g weaker higher up when varying (top at 25% of the bottom: exaggerated)
  const c = copies[0], body: Body = {...b}, pts = samples(body, {c: g0.c, pts: g0.pts}).map(p => [p[0] - g0.c[0], p[1] - g0.c[1]] as P2);
  const ylo = Math.min(...pts.map(p => p[1])), yhi = Math.max(...pts.map(p => p[1]));
  const gOf = (y: number) => s.gravity === 'varying' ? 1 - 0.75 * (y - ylo) / Math.max(yhi - ylo, 1e-9) : 1;
  const wsum = pts.reduce((a, p) => a + gOf(p[1]), 0);
  const cg: P2 = [pts.reduce((a, p) => a + gOf(p[1]) * p[0], 0) / wsum, pts.reduce((a, p) => a + gOf(p[1]) * p[1], 0) / wsum];
  const shown = (b.shape === 'rod' ? [0.1, 0.3, 0.5, 0.7, 0.9] : [0.15, 0.5, 0.85]).flatMap(fy => (b.shape === 'rod' ? [0] : [0.2, 0.5, 0.8]).map(fx => {
    if (b.shape === 'rod') return pts[Math.round(fy * (pts.length - 1))];
    const ty = ylo + fy * (yhi - ylo), row = pts.filter(p => Math.abs(p[1] - ty) < (yhi - ylo) / 40);
    if (!row.length) return undefined;
    const rx0 = Math.min(...row.map(p => p[0])), rx1 = Math.max(...row.map(p => p[0]));
    return [rx0 + fx * (rx1 - rx0), ty] as P2;
  })).filter((p): p is P2 => !!p);
  const len = 0.2 * size, wx = c.c[0] + (right + 170 * k - toScene(plane, c.c)[0]) * per;
  const ox = b.shape === 'rod' ? -0.08 * size : 0; // a rod's arrows beside it, not hidden along it
  shown.forEach((p, i) => props.push({id: `w${i}`, type: 'arrow', plane: 'p', x1: c.c[0] + p[0] + ox, y1: c.c[1] + p[1], x2: c.c[0] + p[0] + ox, y2: c.c[1] + p[1] - len * gOf(p[1]),
    head: 12 * k, style: {stroke: 'cool', width: 3 * k}, show: [1.2 + 0.08 * i, 1e9], fade: 0.3, layer: 3} as Prop));
  const [, cy] = toScene(plane, c.c);
  pin('cm', c.c, s.gravity === 'varying' ? 'CM' : 'CG = CM', 2.6, 'accent', right, cy - 20 * k);
  if (s.gravity === 'varying') { const [, gy] = toScene(plane, [0, c.c[1] + cg[1]]); pin('cg', [c.c[0] + cg[0], c.c[1] + cg[1]], 'CG', 3.6, 'bad', right, Math.max(gy + 40 * k, cy + 30 * k)); }
  const ga = c.c[1] + (s.gravity === 'varying' ? cg[1] : 0);
  props.push({id: 'W', type: 'arrow', plane: 'p', x1: wx, y1: ga, x2: wx, y2: ga - 0.5 * size, head: 16 * k,
    style: {stroke: s.gravity === 'varying' ? 'bad' : 'accent', width: 5 * k}, show: [s.gravity === 'varying' ? 4 : 3, 1e9], fade: 0.3, layer: 4} as Prop,
    {id: 'Wlink', type: 'line', plane: 'p', x1: c.c[0] + (s.gravity === 'varying' ? cg[0] : 0), y1: ga, x2: wx, y2: ga, style: {stroke: 'muted', width: 2 * k, dash: [6 * k, 6 * k]},
      show: [s.gravity === 'varying' ? 4 : 3, 1e9], fade: 0.3, layer: 2} as Prop);
  { const [x, y] = toScene(plane, [wx, ga - 0.5 * size]);
    props.push(text('lW', x + 16 * k, y + 10 * k, 'total weight', 26 * k, {weight: 700, style: {fill: s.gravity === 'varying' ? 'bad' : 'accent'}, show: [s.gravity === 'varying' ? 4 : 3, 1e9]})); }
  if (s.gravity === 'varying') {
    line('l1', 'Where g is weaker higher up, the upper parts weigh less per kilogram', 1.2);
    line('l2', 'The centre of mass weights each part by its mass', 2.6, {style: {fill: 'accent'}});
    line('l3', 'The centre of gravity weights each part by its weight: it sits nearer the stronger field', 3.6, {weight: 700, style: {fill: 'bad'}});
    line('l4', 'Exaggerated here: on Earth g barely changes across a body, so CG and CM are one point', 4.8, {style: {fill: 'muted'}});
    facts.push(`g at the body's top is 25% of g at its foot (exaggerated)`, `centre of gravity ${f(Math.abs(cg[1]))} ${u} below the centre of mass`);
  } else {
    line('l1', 'In a uniform field every kilogram weighs the same: equal, parallel weights', 1.2);
    line('l2', 'Their torques about the centre of mass cancel, so the total weight acts there', 2.6, {weight: 700});
    line('l3', 'The centre of gravity is the centre of mass', 3.4, {weight: 700, style: {fill: 'accent'}});
    facts.push('uniform field: centre of gravity at the centre of mass');
  }
  return scene(s, W, H, 6.4, plane, props, [], {verb: 'centre_of_mass', facts, cm: [round(g0.c[0], 6), round(g0.c[1], 6)], ...(s.gravity === 'varying' ? {cg: [round(g0.c[0] + cg[0], 6), round(g0.c[1] + cg[1], 6)]} : {})});
}

/** Is q inside the body (or on its edge, within tol)? */
function inside(b: Body, g: {c: P2; pts: P2[]}, q: P2, tol = 0): boolean {
  if (b.shape === 'disc' || b.shape === 'ring') return Math.hypot(q[0] - g.c[0], q[1] - g.c[1]) <= (b.r ?? 1) + tol;
  const v = g.pts;
  const onEdge = v.some((p, i) => { const r = v[(i + 1) % v.length], dx = r[0] - p[0], dy = r[1] - p[1], L2 = dx * dx + dy * dy || 1e-18;
    const t = Math.max(0, Math.min(1, ((q[0] - p[0]) * dx + (q[1] - p[1]) * dy) / L2)); return Math.hypot(q[0] - p[0] - t * dx, q[1] - p[1] - t * dy) <= tol; });
  return onEdge || v.reduce((c, p, i) => { const r = v[(i + 1) % v.length]; return ((p[1] > q[1]) !== (r[1] > q[1])) && q[0] < (r[0] - p[0]) * (q[1] - p[1]) / (r[1] - p[1]) + p[0] ? !c : c; }, false);
}

function hangErrors(s: ComSpec): string[] {
  const e: string[] = [], h = s.hang!, b = s.bodies![0];
  if (s.turns !== undefined || s.gravity !== undefined) e.push('centre_of_mass: hang draws its own plumb lines; leave out turns and gravity');
  if (b.shape === 'rod') e.push('centre_of_mass: a rod hangs straight down from any point on it, so its lines all coincide; hang a rectangle, triangle, polygon or disc');
  if (!(Array.isArray(h.from) && h.from.length >= 1 && h.from.length <= 3 && h.from.every(isP))) return [...e, 'centre_of_mass: hang.from is 1 to 3 points of suspension [[x, y], ...] on the body, in its own coordinates'];
  if (h.cross !== undefined && typeof h.cross !== 'boolean') e.push('centre_of_mass: hang.cross is true or false');
  if (h.guesses !== undefined && typeof h.guesses !== 'boolean') e.push('centre_of_mass: hang.guesses is true or false');
  if (h.cross && h.from.length < 2) e.push('centre_of_mass: hang.cross needs two or more points in hang.from: one line has no crossing');
  if (h.cross && h.guesses) e.push('centre_of_mass: hang.guesses (the wrong idea: any point on a line) and hang.cross (the one point where the lines meet) are two different beats; give one');
  if (e.length) return e;
  const g = bodyOf(b), size = Math.max(...g.pts.map(p => Math.hypot(p[0] - g.c[0], p[1] - g.c[1])), b.r ?? 0, 1e-9);
  h.from.forEach((p, i) => {
    if (!inside(b, g, p, 1e-6 * size)) e.push(`centre_of_mass: hang.from ${i + 1} (${f(p[0])}, ${f(p[1])}) is not on the body; take a point on its edge or inside it`);
    else if (Math.hypot(p[0] - g.c[0], p[1] - g.c[1]) < 0.08 * size) e.push(`centre_of_mass: hang.from ${i + 1} is at the CM: hung there it rests in any position and gives no line; take a point nearer the edge`);
  });
  for (let i = 0; i < h.from.length; i++) for (let j = i + 1; j < h.from.length; j++) {
    const a = h.from[i], c = h.from[j], u = [a[0] - g.c[0], a[1] - g.c[1]], v = [c[0] - g.c[0], c[1] - g.c[1]];
    if (Math.abs(u[0] * v[1] - u[1] * v[0]) < 0.05 * Math.hypot(...u) * Math.hypot(...v)) e.push(`centre_of_mass: hang.from ${i + 1} and ${j + 1} lie on one line with the CM, so their plumb lines coincide; move one`);
  }
  return e;
}

/** The body hung from each point in turn (turned until its CM is straight below), a plumb line through the point;
 * then either the lines drawn on the body crossing at the CG, or "?" marks along each (the misconception). */
function hangScene(s: ComSpec, W: number, H: number, k: number, fr: ReturnType<typeof frame>, props: Prop[], facts: string[],
  line: (id: string, t: string, when: number, extra?: Partial<Prop>) => void): Scene {
  const b = s.bodies![0], g0 = bodyOf(b), h = s.hang!, box = fr.box, from = h.from, NAMES = ['A', 'B', 'C'];
  const cross = h.cross ?? (from.length > 1 && !h.guesses), disc = b.shape === 'disc' || b.shape === 'ring', R = b.r ?? 1;
  const size = Math.max(...g0.pts.map(p => Math.hypot(p[0] - g0.c[0], p[1] - g0.c[1])), disc ? R : 0, 1e-9);
  // each hung copy: turned about its pivot until the CM is straight below, the pivot then moved to (x, 0)
  const outline = (pts: P2[], c: P2): P2[] => (disc ? [[c[0] - R, c[1] - R], [c[0] + R, c[1] + R]] : pts);
  type Copy = {pts: P2[]; c: P2; pivot: P2; a: number; marks: P2[]};
  const copies: Copy[] = [];
  let x = 0;
  // a cross copy's CM level with the hung copies' CMs
  const hungCM = -from.reduce((a, p) => a + Math.hypot(g0.c[0] - p[0], g0.c[1] - p[1]), 0) / from.length;
  for (const p of [...from, ...(cross ? [null] : [])]) {
    const a = p ? -90 - Math.atan2(g0.c[1] - p[1], g0.c[0] - p[0]) / DEG : 0, q = p ?? g0.c;
    const pts = g0.pts.map(v => turn(v, q, a)), c = turn(g0.c, q, a), marks = from.map(m => turn(m, q, a));
    const o = outline(pts, c), x0 = Math.min(...o.map(v => v[0])), x1 = Math.max(...o.map(v => v[0]));
    const dx = x - x0, dy = p ? -q[1] : hungCM - c[1];
    const shift = (v: P2): P2 => [v[0] + dx, v[1] + dy];
    copies.push({pts: pts.map(shift), c: shift(c), pivot: shift(q), a, marks: marks.map(shift)});
    x = x1 + dx + 0.3 * size;
  }
  const all = copies.flatMap(c => [...outline(c.pts, c.c), [c.pivot[0], c.pivot[1] + 0.25 * size] as P2, [c.c[0], Math.min(...outline(c.pts, c.c).map(v => v[1])) - 0.25 * size] as P2]);
  const win = fit(all, box[2] - box[0], box[3] - box[1]);
  const plane: Plane = {id: 'p', x: win.x, y: win.y, box}, per = (win.x[1] - win.x[0]) / (box[2] - box[0]);
  const fill = {fill: 'faint', stroke: 'ink', width: 3 * k}, step = 1.6;
  const drawBody = (id: string, c: Copy, when: number) => props.push(disc
    ? {id, type: 'circle', plane: 'p', x: c.c[0], y: c.c[1], r: R / per, style: b.shape === 'ring' ? {stroke: 'ink', width: 10 * k} : fill, show: [when, 1e9], fade: 0.3, layer: 1} as Prop
    : {id, type: 'polyline', plane: 'p', points: c.pts, closed: true, style: fill, show: [when, 1e9], fade: 0.3, layer: 1} as Prop);
  // a point's name up and to the left, or out along u (scene directions) away from lines through it
  const name = (id: string, p: P2, t: string, when: number, u?: P2) => {
    const [sx, sy] = toScene(plane, p);
    props.push(u ? text(id, sx + u[0] * 30 * k, sy + u[1] * 30 * k + 10 * k, t, 28 * k, {weight: 700, align: 'middle', show: [when, 1e9], fade: 0.3, layer: 6})
      : text(id, sx - 20 * k, sy - 14 * k, t, 28 * k, {weight: 700, align: 'end', show: [when, 1e9], fade: 0.3, layer: 6}));
  };
  // where a vertical through the pivot runs inside the body: its top and bottom there
  const chord = (c: Copy): [number, number] => {
    const ys: number[] = [], lo = Math.min(...outline(c.pts, c.c).map(v => v[1])), hi = Math.max(...outline(c.pts, c.c).map(v => v[1]));
    const body: Body = disc ? {...b, at: c.c} : {...b, shape: 'polygon', vertices: c.pts};
    for (let i = 0; i <= 200; i++) { const y = lo + (hi - lo) * i / 200; if (inside(body, {c: c.c, pts: c.pts}, [c.pivot[0], y], 1e-9 * size)) ys.push(y); }
    return [Math.min(...ys), Math.max(...ys)];
  };
  from.forEach((p, i) => {
    const c = copies[i], when = 0.4 + step * i, [ylo] = chord(c), bottom = Math.min(...outline(c.pts, c.c).map(v => v[1])) - 0.15 * size;
    drawBody(`b${i}`, c, when);
    props.push({id: `nail${i}`, type: 'line', plane: 'p', x1: c.pivot[0] - 0.12 * size, y1: c.pivot[1] + 0.12 * size, x2: c.pivot[0] + 0.12 * size, y2: c.pivot[1] + 0.12 * size,
      style: {stroke: 'muted', width: 5 * k}, show: [when, 1e9], fade: 0.3, layer: 2} as Prop,
      {id: `pin${i}`, type: 'line', plane: 'p', x1: c.pivot[0], y1: c.pivot[1] + 0.12 * size, x2: c.pivot[0], y2: c.pivot[1], style: {stroke: 'muted', width: 3 * k}, show: [when, 1e9], fade: 0.3, layer: 2} as Prop,
      {id: `pv${i}`, type: 'circle', plane: 'p', x: c.pivot[0], y: c.pivot[1], r: 7 * k, style: {fill: 'ink'}, show: [when, 1e9], fade: 0.3, layer: 4} as Prop);
    name(`ln${i}`, c.pivot, NAMES[i], when);
    // the plumb line from the pivot, past the body's lowest point, with its bob
    props.push({id: `plumb${i}`, type: 'line', plane: 'p', x1: c.pivot[0], y1: c.pivot[1], x2: c.pivot[0], y2: bottom, style: {stroke: 'accent', width: 2.5 * k, dash: [8 * k, 7 * k]}, show: [when + 0.5, 1e9], fade: 0.3, layer: 3} as Prop,
      {id: `bob${i}`, type: 'circle', plane: 'p', x: c.pivot[0], y: bottom, r: 9 * k, style: {fill: 'accent'}, show: [when + 0.5, 1e9], fade: 0.3, layer: 3} as Prop);
    if (h.guesses) [0.3, 0.55, 0.8].forEach((fy, j) => {
      const y = c.pivot[1] - (c.pivot[1] - ylo) * fy - 0 * j, [sx, sy] = toScene(plane, [c.pivot[0], y]);
      props.push({id: `q${i}-${j}`, type: 'circle', x: sx, y: sy, r: 8 * k, style: {fill: 'paper', stroke: 'cool', width: 3 * k}, show: [when + 1 + 0.25 * j, 1e9], fade: 0.3, layer: 5} as Prop,
        text(`lq${i}-${j}`, sx + 18 * k, sy + 10 * k, '?', 30 * k, {weight: 700, style: {fill: 'cool'}, show: [when + 1 + 0.25 * j, 1e9], fade: 0.3, layer: 5}));
    });
  });
  let end = 0.4 + step * from.length;
  if (cross) {
    // the lines drawn on the body as it lies: each through its point and the CM; they meet at the CG
    const c = copies[from.length], when = end;
    drawBody('bx', c, when);
    c.marks.forEach((m, i) => {
      const d: P2 = [c.c[0] - m[0], c.c[1] - m[1]], L = Math.hypot(...d), u: P2 = [d[0] / L, d[1] / L], far: P2 = [m[0] + u[0] * (L + 0.35 * size), m[1] + u[1] * (L + 0.35 * size)];
      props.push({id: `mk${i}`, type: 'circle', plane: 'p', x: m[0], y: m[1], r: 7 * k, style: {fill: 'ink'}, show: [when, 1e9], fade: 0.3, layer: 4} as Prop,
        {id: `ln-on${i}`, type: 'line', plane: 'p', x1: m[0], y1: m[1], x2: far[0], y2: far[1], style: {stroke: 'accent', width: 2.5 * k, dash: [8 * k, 7 * k]}, show: [when + 0.5 + 0.6 * i, 1e9], fade: 0.3, layer: 3} as Prop);
      name(`lm${i}`, m, NAMES[i], when, [-u[0], u[1]]);
    });
    const [sx, sy] = toScene(plane, c.c), at = when + 0.6 + 0.6 * from.length;
    props.push({id: 'cg', type: 'circle', x: sx, y: sy, r: 15 * k, style: {fill: 'paper', stroke: 'accent', width: 4 * k}, show: [at, 1e9], fade: 0.3, layer: 5} as Prop,
      {id: 'cg-dot', type: 'circle', x: sx, y: sy, r: 5 * k, style: {fill: 'accent'}, show: [at, 1e9], fade: 0.3, layer: 5} as Prop,
      text('lcg', sx + 22 * k, sy - 18 * k, 'CG', 30 * k, {weight: 700, style: {fill: 'accent'}, show: [at, 1e9], fade: 0.3, layer: 6}));
    end = at + 0.6;
  }
  // the story, in the beat's own steps
  if (h.guesses) {
    line('l1', from.length > 1 ? 'Hung from different points: a vertical line through each point of support' : 'Hung from a point: the vertical line through it', 0.9);
    line('l2', `A common misconception: the CG is just some point on ${from.length > 1 ? 'one of these lines' : 'this line'}`, 1.4 + step * (from.length - 1), {weight: 700, style: {fill: 'cool'}});
    line('l3', 'That is not right', end + 0.4, {weight: 700, style: {fill: 'bad'}});
    end += 0.4;
  } else {
    line('l1', 'Hung from A, the body comes to rest with its CG straight below A: a plumb line marks the vertical through A', 0.9);
    if (from.length > 1) line('l2', `Hung from ${from.length > 2 ? 'B, then C' : 'B'}: another vertical line`, 0.9 + step);
    if (cross) {
      line('l3', 'Drawn on the body, the lines cross at one point', end - 1.2);
      line('l4', 'That point is the centre of gravity', end - 0.6, {weight: 700, style: {fill: 'accent'}});
    }
  }
  facts.push(`the body is hung from ${from.length} point${from.length > 1 ? 's' : ''}; each time the vertical through the point of suspension passes through the CG`,
    ...(cross ? [`the lines cross at the CG, (${f(g0.c[0])}, ${f(g0.c[1])}) ${s.unit ?? 'm'} in the body's own coordinates: in a uniform field the CM`] : []));
  return scene(s, W, H, end + 2.4, plane, props, [], {verb: 'centre_of_mass', facts, cm: [round(g0.c[0], 6), round(g0.c[1], 6)]});
}
