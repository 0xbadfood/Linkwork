// Gravitation (NCERT Class 11 Physics, Ch. 7; 2026-10-30). Two verbs, every number computed:
// - orbit: a planet on its Kepler ellipse (the Sun at a focus, equal areas swept in equal times, fastest at perihelion);
//   planets' periods (T² / a³ the same for all); Newton's cannon (launch speeds that fall back, circle, ellipse,
//   escape: v₁ = √(GM/R), vₑ = √(2GM/R)); a satellite in a circular orbit (v, T, and KE, PE, E = −GMm / 2r);
// - gravity_law: two masses pulling each other, F = G m₁ m₂ / r², moved apart step by step (twice the distance, a
//   quarter of the force); or g against distance from a planet's centre (linear inside, 1 / r² outside; height, depth).
import type {Actor, Prop, Scene} from '../scene.ts';
import type {Plane} from '../plane.ts';
import {toScene} from '../plane.ts';
import {wrapText} from '../svg.ts';
import {round} from '../vec.ts';
import {n2, panel, scene, text} from './calculus.ts';
import {frame} from './vectors.ts';
import {nameError} from './names.ts';

type P2 = [number, number];
const G = 6.67e-11, EARTH = {M: 5.97e24, R: 6.37e6}, AU = 1.496e11, YEAR = 3.156e7;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const f = (v: number, p = 2) => n2(round(v, 9), Number.isInteger(round(v, 9)) ? 0 : p);
/** A number in powers of ten when large or small: 6.67 × 10⁻¹¹ */
export const sci = (v: number, p = 2) => {
  if (v === 0 || (Math.abs(v) >= 0.01 && Math.abs(v) < 1e5)) return f(v, p);
  const e = Math.floor(Math.log10(Math.abs(v))), m = v / 10 ** e, sup = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  return `${f(round(m, p), p)} × 10${e < 0 ? '⁻' : ''}${String(Math.abs(e)).split('').map(d => sup[+d]).join('')}`;
};
// ratios in words, for illustrative scenes (their digits are hidden): twice as far, a quarter of the force
const times = (x: number) => ({2: 'twice', 3: 'three times', 4: 'four times'} as Record<number, string>)[round(x, 6)] ?? 'farther';
const part = (x: number) => ({4: 'a quarter', 9: 'a ninth', 16: 'a sixteenth'} as Record<number, string>)[round(x, 6)] ?? 'less';
export const ORBIT_KINDS = ['kepler', 'periods', 'launch', 'satellite'] as const;

type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};
type Planet = {M?: number; R?: number; name?: string};
export type OrbitSpec = Common & {verb: 'orbit'; kind: (typeof ORBIT_KINDS)[number];
  a?: number; e?: number; show?: ('areas' | 'speeds' | 'energy')[]; planet?: Planet; star?: string; body?: string;
  planets?: {name: string; a: number; T?: number}[]; speeds?: number[]; h?: number; m?: number};
export type GravityLawSpec = Common & {verb: 'gravity_law'; m1?: number; m2?: number; r?: number; rs?: number[];
  names?: [string, string]; profile?: boolean; planet?: Planet; altitude?: number; depth?: number};

/** A window with equal units across and up, holding every point with a margin. */
function fit(ps: P2[], box: [number, number, number, number], margin = 0.12): {x: P2; y: P2} {
  let x0 = Math.min(...ps.map(p => p[0])), x1 = Math.max(...ps.map(p => p[0])), y0 = Math.min(...ps.map(p => p[1])), y1 = Math.max(...ps.map(p => p[1]));
  const m = margin * Math.max(x1 - x0, y1 - y0, 1e-12);
  x0 -= m; x1 += m; y0 -= m; y1 += m;
  const bw = box[2] - box[0], bh = box[3] - box[1], per = Math.max((x1 - x0) / bw, (y1 - y0) / bh), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return {x: [cx - per * bw / 2, cx + per * bw / 2], y: [cy - per * bh / 2, cy + per * bh / 2]};
}

/** Kepler's equation E − e sin E = M, by Newton's method. */
function eccentric(M: number, e: number): number {
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 40; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return E;
}

const planetOf = (p?: Planet) => ({M: p?.M ?? EARTH.M, R: p?.R ?? EARTH.R, name: p?.name ?? 'Earth'});
/** A planet's own numbers, SI: a toy planet (R = 10, M = 1) drew nothing a viewer could read (C5 of keph1-07, 2026-10-30). */
function planetErrors(verb: string, p: unknown): string[] {
  if (p === undefined) return [];
  const q = p as Planet;
  if (typeof p !== 'object' || p === null || (q.M !== undefined && !(isNum(q.M) && q.M >= 1e18 && q.M <= 1e32))
    || (q.R !== undefined && !(isNum(q.R) && q.R >= 1e5 && q.R <= 1e9)))
    return [`${verb}: planet is {M in kg (the Earth's 5.97e24), R in metres (the Earth's 6.37e6), name}; leave it out for the Earth, illustrative scenes too (the shape is the same)`];
  return [];
}

export function orbitErrors(s: OrbitSpec): string[] {
  const e: string[] = [];
  if (!ORBIT_KINDS.includes(s.kind)) return [`orbit: kind is one of ${ORBIT_KINDS.join(', ')}`];
  e.push(...planetErrors('orbit', s.planet));
  if (s.kind === 'kepler') {
    if (s.a !== undefined && !(isNum(s.a) && s.a > 0)) e.push('orbit: a is the semi-major axis in AU (above 0)');
    if (!(isNum(s.e) && s.e >= 0 && s.e <= 0.9)) e.push('orbit: e is the eccentricity, 0 (a circle) to 0.9; exaggerate a near-circle (0.5) to show the ellipse');
    for (const x of s.show ?? []) if (!['areas', 'speeds'].includes(x)) e.push("orbit: a kepler orbit shows 'areas' and/or 'speeds'");
  }
  if (s.kind === 'periods') {
    if (!(Array.isArray(s.planets) && s.planets.length >= 2 && s.planets.length <= 6)) e.push('orbit: planets is 2 to 6 {name, a (AU), T? (years)}');
    else for (const [i, p] of s.planets.entries()) {
      const bad = nameError(`orbit: planets ${i + 1}: name`, p?.name, 12, 'Mercury, Earth, Mars'); if (bad) e.push(bad);
      if (!(isNum(p?.a) && p.a > 0 && p.a <= 50)) e.push(`orbit: planets ${i + 1}: a is in AU, 0 to 50`);
      if (p?.T !== undefined && !(isNum(p.T) && p.T > 0)) e.push(`orbit: planets ${i + 1}: T is in years`);
    }
  }
  if (s.kind === 'launch') {
    if (!(Array.isArray(s.speeds) && s.speeds.length >= 1 && s.speeds.length <= 5 && s.speeds.every(v => isNum(v) && v > 0 && v <= 20)))
      e.push("orbit: speeds is 1 to 5 launch speeds in km/s (the Earth's: under 7.9 falls back, 7.9 circles, 7.9 to 11.2 an ellipse, 11.2 or more escapes)");
    if (s.h !== undefined && !(isNum(s.h) && s.h >= 0 && s.h <= 2000)) e.push('orbit: h is the launch height above the surface in km, 0 to 2000');
  }
  if (s.kind === 'satellite') {
    if (!(isNum(s.h) && s.h > 0 && s.h <= 400000)) e.push('orbit: h is the height above the surface in km (a geostationary orbit is 35 900 km)');
    if (s.m !== undefined && !(isNum(s.m) && s.m > 0)) e.push("orbit: m is the satellite's mass in kg");
    for (const x of s.show ?? []) if (x !== 'energy') e.push("orbit: a satellite shows 'energy'");
  }
  return e;
}

export function orbit(s: OrbitSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080;
  const fr = frame(W, H, k, s.title), box = fr.box, props: Prop[] = [...fr.titles], actors: Actor[] = [], facts: string[] = [];
  const px = fr.px, ptext = panel(W, k);
  let row = fr.row;
  const line = (id: string, t: string, when: number, extra: Partial<Prop> = {}) => {
    props.push(ptext(id, px, row, t, 30 * k, {show: [when, 1e9], ...extra}));
    row += wrapText(t, 30 * k, W - px - 40 * k).length * 1.3 * 30 * k + 6 * k;
  };
  // a dot actor following plane points at screen times; returns its id for props to anchor to
  const mover = (plane: Plane, id: string, pts: P2[], times: number[], layer = 4) => {
    actors.push({id: `d-${id}`, rig: 'dot', at: toScene(plane, pts[0]), opacity: [[0, 0]], layer, blink: [],
      base: pts.map((q, i) => ({t: times[i], at: toScene(plane, q), ...(i ? {ease: 'linear' as const} : {})}))} as Actor);
    return `d-${id}`;
  };
  const body = (id: string, actor: string, r: number, fill: string, name: string | undefined, when = 0) => {
    props.push({id, type: 'circle', x: 0, y: 0, r, style: {fill, stroke: 'ink', width: 2 * k}, show: [when, 1e9], layer: 5, anchor: {actor, joint: 'p'}} as Prop);
    if (name) props.push(text(`l${id}`, 0, 0, name, 26 * k, {weight: 700, align: 'middle', style: {fill}, show: [when, 1e9], layer: 6,
      anchor: {actor, joint: 'p', offset: [0, -r - 12 * k]}}));
  };
  const lead = 0.8;

  if (s.kind === 'kepler') {
    const a = s.a ?? 1, e = s.e!, b = a * Math.sqrt(1 - e * e), T = a ** 1.5, show = new Set(s.show ?? ['areas']);
    const at = (t: number): P2 => { const E = eccentric(2 * Math.PI * t / T, e); return [a * (Math.cos(E) - e), b * Math.sin(E)]; };
    const ring = Array.from({length: 121}, (_, i) => { const E = 2 * Math.PI * i / 120; return [a * (Math.cos(E) - e), b * Math.sin(E)] as P2; });
    const win = fit(ring, box), plane: Plane = {id: 'p', x: win.x, y: win.y, box};
    const span = 8, n = 240, ts = Array.from({length: n + 1}, (_, i) => T * i / n), screen = ts.map(t => lead + span * t / T);
    props.push({id: 'path', type: 'polyline', plane: 'p', points: ring, closed: true, style: {stroke: 'muted', width: 2.5 * k, dash: [10 * k, 8 * k]}, layer: 1} as Prop);
    const star = toScene(plane, [0, 0]);
    props.push({id: 'star', type: 'circle', x: star[0], y: star[1], r: 26 * k, style: {fill: 'accent', stroke: 'accent', width: 2 * k}, layer: 3} as Prop,
      text('lstar', star[0], star[1] + 58 * k, s.star ?? 'Sun', 26 * k, {weight: 700, align: 'middle', style: {fill: 'accent'}}));
    // the empty focus, and the perihelion and aphelion
    const f2 = toScene(plane, [-2 * a * e, 0]);
    if (e > 0.05) props.push({id: 'focus2', type: 'circle', x: f2[0], y: f2[1], r: 6 * k, style: {fill: 'muted'}, layer: 2} as Prop,
      text('lfocus2', f2[0], f2[1] + 34 * k, 'other focus', 22 * k, {align: 'middle', style: {fill: 'muted'}}));
    const P = toScene(plane, [a * (1 - e), 0]), A = toScene(plane, [-a * (1 + e), 0]);
    props.push(text('lP', P[0], P[1] + 40 * k, 'perihelion', 22 * k, {align: 'middle', style: {fill: 'muted'}}),
      text('lA', A[0], A[1] - 30 * k, 'aphelion', 22 * k, {align: 'middle', style: {fill: 'muted'}}));
    const planet = mover(plane, 'planet', ts.map(at), screen);
    body('planet', planet, 16 * k, 'cool', s.body);
    props.push({id: 'radius', type: 'line', x1: star[0], y1: star[1], x2: star[0], y2: star[1], ends: [null, {actor: planet, joint: 'p'}],
      style: {stroke: 'cool', width: 2 * k, opacity: 0.7}, layer: 2} as Prop);
    const dt = T / 10, areas: number[] = [];
    if (show.has('areas')) {
      // equal times around perihelion and aphelion: the swept sectors, shaded as the planet passes
      for (const [i, t0, fill] of [[0, -dt / 2, 'good'], [1, T / 2 - dt / 2, 'figure']] as const) {
        const arc = Array.from({length: 25}, (_, j) => at(t0 + dt * j / 24)), poly: P2[] = [[0, 0], ...arc];
        areas.push(Math.abs(poly.reduce((acc, p, j) => { const q = poly[(j + 1) % poly.length]; return acc + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2);
        const t1 = lead + span * ((t0 + dt + T) % T) / T;
        props.push({id: `sweep${i}`, type: 'polyline', plane: 'p', points: poly, closed: true, style: {fill, stroke: fill, width: 2 * k, opacity: 0.45},
          show: [i === 0 ? lead + span * (dt / 2) / T : t1, 1e9], fade: 0.4, layer: 1} as Prop);
      }
    }
    const vp = Math.sqrt((1 + e) / (1 - e)), va = Math.sqrt((1 - e) / (1 + e));
    if (show.has('speeds')) {
      const L = 0.25 * (box[2] - box[0]) / Math.max(vp, 1);
      props.push({id: 'vP', type: 'arrow', x1: P[0], y1: P[1], x2: P[0], y2: P[1] - L * vp, head: 16 * k, style: {stroke: 'good', width: 4 * k}, show: [lead + 0.2, 1e9], fade: 0.3, layer: 4} as Prop,
        {id: 'vA', type: 'arrow', x1: A[0], y1: A[1], x2: A[0], y2: A[1] + L * va, head: 16 * k, style: {stroke: 'bad', width: 4 * k}, show: [lead + span / 2, 1e9], fade: 0.3, layer: 4} as Prop,
        text('lvP', P[0] + 14 * k, P[1] - L * vp / 2, 'fastest', 24 * k, {weight: 700, style: {fill: 'good'}, show: [lead + 0.2, 1e9]}),
        text('lvA', A[0] - 14 * k, A[1] + L * va + 10 * k, 'slowest', 24 * k, {weight: 700, align: 'end', style: {fill: 'bad'}, show: [lead + span / 2, 1e9]}));
    }
    line('l1', `Law of orbits: an ellipse, with the ${s.star ?? 'Sun'} at one focus`, 0.3);
    if (show.has('areas')) {
      line('l2', 'Law of areas: the line to the planet sweeps equal areas in equal times', lead + span * 0.1, {weight: 700});
      line('l3', 'Near the Sun it moves faster, far away slower: the same area each time', lead + span * 0.6, {style: {fill: 'muted'}});
    }
    if (show.has('speeds')) line('l4', s.illustrative ? 'Fastest at perihelion, slowest at aphelion' : `vP / vA = (1 + e) / (1 − e) = ${f(vp / va)}`, lead + span / 2, {style: {fill: 'cool'}});
    facts.push(`semi-major axis a = ${f(a)} AU, eccentricity e = ${f(e)}`, `perihelion ${f(a * (1 - e))} AU, aphelion ${f(a * (1 + e))} AU from the ${s.star ?? 'Sun'}`,
      `period T = ${f(T)} ${T === 1 ? 'year' : 'years'} (T² = a³ for the Sun's planets)`, `speed at perihelion / speed at aphelion = ${f(vp / va)}`,
      ...(areas.length ? [`areas swept in the same time near perihelion and aphelion: ${f(areas[0], 4)} and ${f(areas[1], 4)} AU² (equal)`] : []));
    return scene(s, W, H, lead + span + 1.2, plane, props, actors, {verb: 'orbit', facts, ...(areas.length ? {areas} : {}), ratio: vp / va});
  }

  if (s.kind === 'periods') {
    const ps = s.planets!.map(p => ({...p, T: p.T ?? p.a ** 1.5})).sort((p, q) => p.a - q.a), aMax = Math.max(...ps.map(p => p.a));
    // orbits from Mercury to Jupiter span 13 times: drawn to scale the inner ones crowd the Sun and their names pile up
    // (C1 of keph1-07, 2026-10-30); past 4 times, radii are drawn on a square-root scale and the scene says so
    const squeeze = aMax / Math.min(...ps.map(p => p.a)) > 4, rd = (a: number) => (squeeze ? Math.sqrt(a * aMax) : a);
    const win = fit([[-aMax, -aMax], [aMax, aMax]], box, 0.08), plane: Plane = {id: 'p', x: win.x, y: win.y, box};
    const Tin = Math.min(...ps.map(p => p.T)), Tout = Math.max(...ps.map(p => p.T)), physical = Math.min(Tout, 5 * Tin), span = 8, n = 240;
    const c = toScene(plane, [0, 0]);
    props.push({id: 'star', type: 'circle', x: c[0], y: c[1], r: 22 * k, style: {fill: 'accent', stroke: 'accent', width: 2 * k}, layer: 3} as Prop);
    const colours = ['cool', 'good', 'figure', 'bad', 'accent', 'ink'];
    ps.forEach((p, i) => {
      const r = rd(p.a) * (box[2] - box[0]) / (win.x[1] - win.x[0]);
      props.push({id: `o${i}`, type: 'circle', x: c[0], y: c[1], r, style: {stroke: 'muted', width: 2 * k, dash: [8 * k, 7 * k]}, layer: 1} as Prop);
      const ts = Array.from({length: n + 1}, (_, j) => physical * j / n), ph = 0.6 * i;
      const id = mover(plane, `p${i}`, ts.map(t => [rd(p.a) * Math.cos(ph + 2 * Math.PI * t / p.T), rd(p.a) * Math.sin(ph + 2 * Math.PI * t / p.T)] as P2), ts.map(t => lead + span * t / physical));
      body(`p${i}`, id, 12 * k, colours[i % colours.length], p.name);
    });
    line('l1', 'Law of periods: T² / a³ is the same for every planet', 0.3, {weight: 700});
    ps.forEach((p, i) => line(`t${i}`, s.illustrative ? `${p.name}: ${i ? 'farther out, a longer year' : 'nearest, the shortest year'}` : `${p.name}: a = ${f(p.a)} AU, T = ${f(p.T)} y, T²/a³ = ${f(p.T ** 2 / p.a ** 3)}`,
      lead + 0.5 + 0.4 * i, {style: {fill: colours[i % colours.length]}}));
    if (W >= 1.3 * H) line('l9', 'Farther planets move slower and go farther round: a much longer year', lead + 1 + 0.4 * ps.length, {style: {fill: 'muted'}});
    if (squeeze) line('l10', 'Orbits not to scale: the outer ones are drawn closer in', lead + 1.4 + 0.4 * ps.length, {style: {fill: 'muted'}});
    facts.push(...ps.map(p => `${p.name}: a = ${f(p.a)} AU, T = ${f(p.T)} years, T²/a³ = ${f(p.T ** 2 / p.a ** 3)}`));
    return scene(s, W, H, lead + span + 1.2, plane, props, actors, {verb: 'orbit', facts, ratios: ps.map(p => p.T ** 2 / p.a ** 3)});
  }

  const pl = planetOf(s.planet), GM = G * pl.M;
  if (s.kind === 'launch') {
    // Newton's cannon: launched level from the top of a mountain at r0, each path integrated (velocity Verlet)
    const r0 = pl.R + (s.h ?? 0) * 1000, v1 = Math.sqrt(GM / r0), ve = Math.sqrt(2 * GM / r0), P0 = 2 * Math.PI * Math.sqrt(r0 ** 3 / GM);
    const lim = 3.2 * pl.R, colours = ['bad', 'figure', 'good', 'cool', 'accent'];
    const paths = s.speeds!.map(vk => {
      const v = vk * 1000; let p: P2 = [0, r0], u: P2 = [v, 0], t = 0;
      const dt = P0 / 2000, out: {t: number; p: P2}[] = [{t, p}];
      const acc = (q: P2): P2 => { const r = Math.hypot(...q); return [-GM * q[0] / r ** 3, -GM * q[1] / r ** 3]; };
      let a0 = acc(p), end = 'circles', turned = 0;
      for (let i = 0; i < 200000; i++) {
        const q: P2 = [p[0] + u[0] * dt + a0[0] * dt * dt / 2, p[1] + u[1] * dt + a0[1] * dt * dt / 2], a1 = acc(q);
        u = [u[0] + (a0[0] + a1[0]) * dt / 2, u[1] + (a0[1] + a1[1]) * dt / 2]; turned += Math.atan2(p[0] * q[1] - p[1] * q[0], p[0] * q[0] + p[1] * q[1]);
        p = q; a0 = a1; t += dt;
        if (i % 10 === 0) out.push({t, p});
        if (Math.hypot(...p) < pl.R) { end = 'falls back'; break; }
        if (Math.abs(p[0]) > lim || Math.abs(p[1]) > lim) { end = v >= ve * (1 - 1e-9) ? 'escapes' : 'leaves the frame on an ellipse'; break; }
        if (Math.abs(turned) >= 2 * Math.PI) { end = Math.abs(v - v1) < 0.01 * v1 ? 'circles' : 'orbits on an ellipse'; break; }
      }
      out.push({t, p});
      const kind = v < v1 * 0.99 ? 'falls back' : Math.abs(v - v1) <= 0.01 * v1 ? 'circular orbit' : v < ve ? 'elliptical orbit' : 'escapes';
      return {vk, pts: out, end, kind};
    });
    const win = fit([[-lim, -lim], [lim, lim]], box, 0), plane: Plane = {id: 'p', x: win.x, y: win.y, box};
    const c = toScene(plane, [0, 0]), Rpx = pl.R * (box[2] - box[0]) / (win.x[1] - win.x[0]);
    props.push({id: 'planet', type: 'circle', x: c[0], y: c[1], r: Rpx, style: {fill: 'faint'}, layer: 1} as Prop, // no outline: a circular orbit's trail runs along it
      text('lplanet', c[0], c[1] + 10 * k, pl.name, 30 * k, {weight: 700, align: 'middle', style: {fill: 'cool'}, layer: 2}));
    const top = toScene(plane, [0, r0]);
    props.push({id: 'cannon', type: 'polyline', points: [[top[0] - 24 * k, top[1] + 4 * k], [top[0], top[1] - 14 * k], [top[0] + 24 * k, top[1] + 4 * k]], closed: true,
      style: {fill: 'muted', stroke: 'ink', width: 2 * k}, layer: 3} as Prop);
    const tEnd = Math.min(Math.max(...paths.map(q => q.pts[q.pts.length - 1].t)), 1.1 * P0), span = 8;
    paths.forEach((q, i) => {
      const start = lead + 1.6 * i, pts = q.pts.filter(x => x.t <= tEnd), fill = colours[i % colours.length];
      const id = mover(plane, `s${i}`, pts.map(x => x.p), pts.map(x => start + span * x.t / tEnd));
      props.push({id: `ball${i}`, type: 'circle', x: 0, y: 0, r: 10 * k, style: {fill, stroke: 'ink', width: 2 * k}, show: [start, 1e9], layer: 5, anchor: {actor: id, joint: 'p'}} as Prop,
        {id: `trail${i}`, type: 'trail', of: {actor: id, joint: 'p'}, t0: start, step: 0.04, style: {stroke: fill, width: 3 * k}, layer: 2} as Prop);
      line(`l${i}`, `${s.illustrative ? ['slow', 'faster', 'faster still', 'fastest', 'very fast'][i] : `${f(q.vk)} km/s`}: ${q.kind}`, start, {style: {fill}});
    });
    const T = lead + 1.6 * (paths.length - 1) + span;
    if (!s.illustrative) line('lv', `v₁ = √(GM/R) = ${f(v1 / 1000)} km/s, vₑ = √(2GM/R) = ${f(ve / 1000)} km/s`, T - 2, {weight: 700, style: {fill: 'accent'}});
    else line('lv', 'Fast enough, it falls round the planet; faster still, it escapes', T - 2, {weight: 700, style: {fill: 'accent'}});
    facts.push(`orbital speed at launch height v₁ = ${f(v1 / 1000)} km/s`, `escape speed vₑ = √2 v₁ = ${f(ve / 1000)} km/s`,
      `circular orbit period there ${f(P0 / 60, 1)} min`, ...paths.map(q => `${f(q.vk)} km/s: ${q.kind}`));
    return scene(s, W, H, T + 1.2, plane, props, actors, {verb: 'orbit', facts, v1: v1 / 1000, ve: ve / 1000, kinds: paths.map(q => q.kind)});
  }

  // satellite: a circular orbit at height h; its speed, period and energies
  const r = pl.R + s.h! * 1000, v = Math.sqrt(GM / r), T = 2 * Math.PI * r / v, m = s.m;
  const win = fit([[-r, -r], [r, r]], box, 0.1), plane: Plane = {id: 'p', x: win.x, y: win.y, box};
  const c = toScene(plane, [0, 0]), per = (box[2] - box[0]) / (win.x[1] - win.x[0]);
  props.push({id: 'planet', type: 'circle', x: c[0], y: c[1], r: Math.max(pl.R * per, 14 * k), style: {fill: 'faint', stroke: 'cool', width: 3 * k}, layer: 1} as Prop,
    text('lplanet', c[0], c[1] + 10 * k, pl.name, 28 * k, {weight: 700, align: 'middle', style: {fill: 'cool'}, layer: 2}),
    {id: 'orbit', type: 'circle', x: c[0], y: c[1], r: r * per, style: {stroke: 'muted', width: 2 * k, dash: [8 * k, 7 * k]}, layer: 1} as Prop);
  const span = 6, n = 180, ts = Array.from({length: n + 1}, (_, i) => T * i / n);
  const sat = mover(plane, 'sat', ts.map(t => [r * Math.sin(2 * Math.PI * t / T), r * Math.cos(2 * Math.PI * t / T)] as P2), ts.map(t => lead + span * t / T));
  body('sat', sat, 12 * k, 'accent', s.body ?? 'satellite');
  props.push({id: 'rline', type: 'line', x1: c[0], y1: c[1], x2: c[0], y2: c[1], ends: [null, {actor: sat, joint: 'p'}], style: {stroke: 'muted', width: 2 * k}, layer: 2} as Prop);
  const hours = T / 3600;
  line('l1', 'Gravity supplies the centripetal force: GMm / r² = mv² / r', 0.3);
  line('l2', s.illustrative ? 'So v = √(GM / r): a higher orbit is slower' : `v = √(GM / r) = ${f(v / 1000)} km/s`, 1, {weight: 700});
  if (!s.illustrative) line('l3', `T = 2πr / v = ${hours >= 2 ? `${f(hours)} h` : `${f(T / 60, 1)} min`}`, 1.6, {style: {fill: 'cool'}});
  const show = new Set(s.show ?? []);
  if (show.has('energy')) {
    const mm = m ?? 1, KE = GM * mm / (2 * r), PE = -GM * mm / r, E = KE + PE;
    line('l4', s.illustrative ? 'Kinetic energy is half the size of the potential energy' : `KE = GMm / 2r = ${sci(KE)} J`, 2.4, {style: {fill: 'good'}});
    line('l5', s.illustrative ? 'Potential energy is negative, twice as large' : `PE = −GMm / r = ${sci(PE)} J`, 2.9, {style: {fill: 'bad'}});
    line('l6', s.illustrative ? 'Total energy is negative: the satellite is bound' : `E = KE + PE = −GMm / 2r = ${sci(E)} J (bound)`, 3.4, {weight: 700, style: {fill: 'accent'}});
    // bars from a zero line: KE up, PE down twice as far, E down as far as KE is up; left out where the text column
    // has no room below (a half-width part), the lines above carry the same numbers
    const zx = px + 20 * k, zy = row + 140 * k, unit = 110 * k / (GM * mm / (2 * r)), bw = 90 * k;
    if (zy + 2 * 110 * k + 20 * k <= H) {
    props.push({id: 'zero', type: 'line', x1: zx, y1: zy, x2: zx + 3.6 * bw, y2: zy, style: {stroke: 'muted', width: 2 * k}, show: [2.4, 1e9]} as Prop);
    ([['KE', KE, 'good', 2.4], ['PE', PE, 'bad', 2.9], ['E', E, 'accent', 3.4]] as const).forEach(([name, val, fill, when], i) => {
      const x = zx + 0.2 * bw + 1.2 * bw * i, hgt = Math.abs(val) * unit;
      props.push({id: `bar${name}`, type: 'rect', x, y: val > 0 ? zy - hgt : zy, w: bw, h: hgt, style: {fill}, show: [when, 1e9], fade: 0.3} as Prop,
        text(`lbar${name}`, x + bw / 2, val > 0 ? zy + 30 * k : zy - 10 * k, name, 24 * k, {weight: 700, align: 'middle', style: {fill}, show: [when, 1e9]}));
    });
    }
    facts.push(`KE = ${sci(KE)} J`, `PE = ${sci(PE)} J`, `total energy E = ${sci(E)} J (negative: bound)`, ...(m === undefined ? ['energies per kg of satellite'] : []));
  }
  facts.push(`orbit radius r = R + h = ${sci(r / 1000)} km`, `orbital speed v = ${f(v / 1000)} km/s`, `period T = ${f(hours)} h (${f(T / 60, 1)} min)`);
  return scene(s, W, H, lead + span + 1.2, plane, props, actors, {verb: 'orbit', facts, v: v / 1000, T: hours});
}

export function gravityLawErrors(s: GravityLawSpec): string[] {
  const e: string[] = [];
  e.push(...planetErrors('gravity_law', s.planet));
  if (e.length) return e;
  if (s.profile) {
    if (s.altitude !== undefined && !(isNum(s.altitude) && s.altitude >= 0)) e.push('gravity_law: altitude is a height in km above the surface');
    if (s.depth !== undefined && !(isNum(s.depth) && s.depth >= 0)) e.push('gravity_law: depth is in km below the surface');
    const R = planetOf(s.planet).R / 1000;
    if (isNum(s.altitude) && s.altitude > 3 * R) e.push(`gravity_law: altitude is at most ${f(3 * R, 0)} km (three radii) to fit the graph`);
    if (isNum(s.depth) && s.depth > R) e.push(`gravity_law: depth is at most the radius, ${f(R, 0)} km`);
    return e;
  }
  for (const k of ['m1', 'm2'] as const) if (!(isNum(s[k]) && s[k]! > 0)) e.push(`gravity_law: ${k} is a mass in kg (above 0); or give profile: true for g against distance`);
  const rs = s.rs ?? (s.r !== undefined ? [s.r] : undefined);
  if (!(Array.isArray(rs) && rs.length >= 1 && rs.length <= 4 && rs.every(r => isNum(r) && r > 0))) e.push('gravity_law: r is the distance between the centres in m, or rs 2 to 4 distances to compare');
  else if (rs.some((r, i) => i && r <= rs[i - 1])) e.push('gravity_law: rs grow, each farther than the last (2, 4, 6 m)');
  if (s.names !== undefined) (Array.isArray(s.names) && s.names.length === 2 ? s.names : [undefined, undefined]).forEach((n, i) => {
    const bad = nameError(`gravity_law: names ${i + 1}`, n, 12, 'm₁, Earth, Moon'); if (bad) e.push(bad); });
  return e;
}

export function gravityLaw(s: GravityLawSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080;
  const fr = frame(W, H, k, s.title), box = fr.box, props: Prop[] = [...fr.titles], facts: string[] = [];
  const px = fr.px, ptext = panel(W, k);
  let row = fr.row;
  const line = (id: string, t: string, when: number, extra: Partial<Prop> = {}) => {
    props.push(ptext(id, px, row, t, 30 * k, {show: [when, 1e9], ...extra}));
    row += wrapText(t, 30 * k, W - px - 40 * k).length * 1.3 * 30 * k + 6 * k;
  };

  if (s.profile) {
    // g against r / R: g₀ r / R inside, g₀ (R / r)² outside
    const pl = planetOf(s.planet), g0 = G * pl.M / pl.R ** 2, R = pl.R / 1000;
    const plane: Plane = {id: 'p', x: [0, 4], y: [0, 1.15], box};
    const gOf = (x: number) => (x <= 1 ? x : 1 / (x * x));
    const curve = Array.from({length: 161}, (_, i) => { const x = 4 * i / 160; return [x, gOf(x)] as P2; });
    props.push({id: 'axes', type: 'axes', plane: 'p', step: [1, 0.25], size: 22 * k, grid: true} as Prop,
      {id: 'surface', type: 'line', plane: 'p', x1: 1, y1: 0, x2: 1, y2: 1.12, style: {stroke: 'muted', width: 2 * k, dash: [8 * k, 7 * k]}} as Prop,
      {id: 'inside', type: 'polyline', plane: 'p', points: curve.filter(p => p[0] <= 1), draw: 0, keys: {draw: [[0.5, 0], [2, 1, 'linear']]}, style: {stroke: 'good', width: 5 * k}, layer: 3} as Prop,
      {id: 'outside', type: 'polyline', plane: 'p', points: curve.filter(p => p[0] >= 1), draw: 0, keys: {draw: [[2.2, 0], [4.2, 1, 'linear']]}, style: {stroke: 'cool', width: 5 * k}, layer: 3} as Prop);
    const [sx, sy] = toScene(plane, [1, 1.12]), [ox, oy] = toScene(plane, [4, 0]), [, gy] = toScene(plane, [0, 1]);
    props.push(text('lsurf', sx, sy - 10 * k, 'surface, r = R', 24 * k, {align: 'middle', style: {fill: 'muted'}}),
      text('lx', ox - 10 * k, oy - 20 * k, 'distance from the centre, r / R', 24 * k, {align: 'end', style: {fill: 'muted'}}),
      text('ly', box[0] + 10 * k, gy - 16 * k, s.illustrative ? 'g' : `g (g₀ = ${f(g0)} m/s²)`, 24 * k, {style: {fill: 'muted'}}));
    line('l1', 'Inside, only the mass nearer the centre pulls: g grows as r', 0.5, {style: {fill: 'good'}});
    line('l2', 'Outside, g = GM / r²: it falls as the square of the distance grows', 2.2, {style: {fill: 'cool'}});  // no digit: kept when illustrative
    line('l3', 'Greatest at the surface', 4.2, {weight: 700});
    const mark = (id: string, x: number, label: string, when: number, fill: string) => {
      const [mx, my] = toScene(plane, [x, gOf(x)]);
      props.push({id, type: 'circle', x: mx, y: my, r: 9 * k, style: {fill}, show: [when, 1e9], fade: 0.3, layer: 4} as Prop,
        text(`l${id}`, mx + 16 * k, my - 14 * k, label, 24 * k, {weight: 700, style: {fill}, show: [when, 1e9], layer: 4}));
    };
    if (isNum(s.altitude)) {
      const x = 1 + s.altitude / R, g = g0 / x ** 2;
      mark('mh', x, s.illustrative ? 'height h' : `h = ${f(s.altitude, 0)} km`, 4.8, 'accent');
      if (!s.illustrative) line('l4', `At h = ${f(s.altitude, 0)} km: g = g₀ (R / (R + h))² = ${f(g)} m/s²${s.altitude < 0.1 * R ? ` ≈ g₀ (1 − 2h/R) = ${f(g0 * (1 - 2 * s.altitude / R))}` : ''}`, 4.8, {style: {fill: 'accent'}});
      facts.push(`g at height ${f(s.altitude, 0)} km = ${f(g)} m/s²`, ...(s.altitude < 0.1 * R ? [`small-height approximation g₀(1 − 2h/R) = ${f(g0 * (1 - 2 * s.altitude / R))} m/s²`] : []));
    }
    if (isNum(s.depth)) {
      const x = 1 - s.depth / R, g = g0 * x;
      mark('md', x, s.illustrative ? 'depth d' : `d = ${f(s.depth, 0)} km`, 5.4, 'figure');
      if (!s.illustrative) line('l5', `At depth d = ${f(s.depth, 0)} km: g = g₀ (1 − d/R) = ${f(g)} m/s²`, 5.4, {style: {fill: 'figure'}});
      facts.push(`g at depth ${f(s.depth, 0)} km = ${f(g)} m/s²`);
    }
    facts.push(`g at the surface g₀ = GM/R² = ${f(g0)} m/s²`, `radius R = ${f(R, 0)} km`, 'g = 0 at the centre');
    return scene(s, W, H, 7, plane, props, [], {verb: 'gravity_law', facts, g0});
  }

  // two masses pulling each other, moved apart step by step
  const m1 = s.m1!, m2 = s.m2!, rs = s.rs ?? [s.r!], Fs = rs.map(r => G * m1 * m2 / r ** 2), rMax = rs[rs.length - 1];
  const plane: Plane = {id: 'p', ...fit([[-0.15 * rMax, -0.4 * rMax], [1.15 * rMax, 0.4 * rMax]], box, 0)} as Plane;
  plane.box = box;
  const per = (box[2] - box[0]) / (plane.x[1] - plane.x[0]), big = Math.max(m1, m2);
  const rad = (m: number) => Math.min(70 * k, Math.max(18 * k, 70 * k * Math.cbrt(m / big)), 0.3 * rs[0] * per);
  const [n1, n2] = s.names ?? ['m₁', 'm₂'], step = 2, lead = 0.6;
  const at = (i: number) => lead + step * i;
  const A = toScene(plane, [0, 0]);
  const keysX = rs.map((r, i) => [at(i), toScene(plane, [r, 0])[0], 'linear'] as [number, number, 'linear']).flatMap((kf, i) => i ? [[at(i) - 0.8, toScene(plane, [rs[i - 1], 0])[0], 'linear'] as [number, number, 'linear'], kf] : [kf]);
  const Bx = toScene(plane, [rs[0], 0])[0];
  props.push({id: 'b1', type: 'circle', x: A[0], y: A[1], r: rad(m1), style: {fill: 'cool', stroke: 'ink', width: 3 * k}, layer: 3} as Prop,
    text('lb1', A[0], A[1] - rad(m1) - 16 * k, s.illustrative ? n1 : `${n1} = ${sci(m1)} kg`, 26 * k, {weight: 700, align: 'middle', style: {fill: 'cool'}}),
    {id: 'b2', type: 'circle', x: Bx, y: A[1], r: rad(m2), keys: {x: keysX}, style: {fill: 'figure', stroke: 'ink', width: 3 * k}, layer: 3} as Prop,
    text('lb2', Bx, A[1] - rad(m2) - 16 * k, s.illustrative ? n2 : `${n2} = ${sci(m2)} kg`, 26 * k, {weight: 700, align: 'middle', style: {fill: 'figure'}, keys: {x: keysX}}));
  // the pulls: equal and opposite, toward each other, length by force (the first distance's force sets the scale)
  const L = (F: number) => Math.max(14 * k, 0.32 * rs[0] * per * F / Fs[0]);
  rs.forEach((r, i) => {
    const B = toScene(plane, [r, 0]), show: [number, number] = [at(i) + (i ? 0.1 : 0.4), i < rs.length - 1 ? at(i + 1) - 0.8 : 1e9];
    props.push({id: `F1-${i}`, type: 'arrow', x1: A[0] + rad(m1), y1: A[1], x2: A[0] + rad(m1) + L(Fs[i]), y2: A[1], head: 16 * k, style: {stroke: 'accent', width: 5 * k}, show, fade: 0.2, layer: 4} as Prop,
      {id: `F2-${i}`, type: 'arrow', x1: B[0] - rad(m2), y1: B[1], x2: B[0] - rad(m2) - L(Fs[i]), y2: B[1], head: 16 * k, style: {stroke: 'accent', width: 5 * k}, show, fade: 0.2, layer: 4} as Prop,
      {id: `rl-${i}`, type: 'line', x1: A[0], y1: A[1] + 0.25 * rMax * per, x2: B[0], y2: B[1] + 0.25 * rMax * per, style: {stroke: 'muted', width: 2 * k}, show, fade: 0.2} as Prop,
      text(`lr-${i}`, (A[0] + B[0]) / 2, A[1] + 0.25 * rMax * per + 36 * k, s.illustrative ? (i ? `${times(r / rs[0])} r` : 'r') : `r = ${sci(r)} m`, 26 * k, {align: 'middle', style: {fill: 'muted'}, show, fade: 0.2}));
  });
  line('l1', 'Every two masses attract: F = G m₁ m₂ / r²', 0.3, {weight: 700});
  const narrow = W < 1.3 * H;            // a half-width part: the law and the forces, not the side notes
  if (!narrow) line('l2', 'Equal and opposite pulls, along the line joining the centres', 0.9, {style: {fill: 'accent'}});
  if (!s.illustrative && !narrow) line('l3', `G = 6.67 × 10⁻¹¹ N m² kg⁻²`, 1.2, {style: {fill: 'muted'}});
  // illustrative lines say the ratios in words (digits are hidden then): twice as far, a quarter of the force
  rs.forEach((r, i) => line(`f${i}`, s.illustrative ? (i ? `${times(r / rs[0])} as far: ${part((r / rs[0]) ** 2)} of the force` : 'The force F at distance r')
    : `r = ${sci(r)} m: F = ${sci(Fs[i])} N${i ? ` (${f(r / rs[0])}× the distance, F ÷ ${f(Fs[0] / Fs[i])})` : ''}`, at(i) + 0.3, {style: {fill: i ? 'cool' : 'ink'}}));
  if (rs.length > 1) line('l9', 'Inverse square: twice as far, a quarter of the force', at(rs.length - 1) + 1, {weight: 700, style: {fill: 'accent'}});
  facts.push(...rs.map((r, i) => `at r = ${sci(r)} m: F = ${sci(Fs[i])} N`), 'G = 6.67 × 10⁻¹¹ N m² kg⁻²',
    ...(rs.length > 1 ? [`F at ${f(rs[rs.length - 1] / rs[0])}× the distance is ${f(Fs[0] / Fs[Fs.length - 1])} times smaller`] : []));
  return scene(s, W, H, at(rs.length - 1) + 2.4, plane, props, [], {verb: 'gravity_law', facts, F: Fs});
}
