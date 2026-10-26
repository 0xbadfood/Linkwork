// stage: a small world of props on the ground, laid out in metres, where things happen by their roles' physics
// (user, 2026-10-24: the mechanics world by role). Items are placed (on the ground or resting on a support); events
// make them move, and every motion is computed, never drawn by hand:
//   move     a mover goes to x at constant velocity (or easing in and out)
//   launch   a ball leaves a launcher (or its own place) at a speed and angle and flies a parabola under g to the ground
//   slide    a block slides down a wedge, a = g(sin θ − μ cos θ)
//   roll     a roller rolls down a wedge without slipping, a = g sin θ / (1 + k) (ball 2/5, cylinder 1/2, ring 1)
//   collide  a mover runs into another (or a wall), elastic or sticking together; momentum is conserved
// and the general props (2026-10-24), which belong in any scene: a figure that stands, thinks, points or walks (pose,
// move), a bulb that lights (light; put it on a figure to hang it over the head: a new idea), a stopwatch that runs
// (run), a speedometer that reads a mover's computed speed (follows).
// Every value the narration may quote (range, flight time, top height, time down the slope, speeds after a collision)
// is computed here and listed in meta.facts. Arrows (velocity, force, direction), labels and readouts of position and
// height (measured from the drawing) are optional. Velocity arrows follow a mover's computed velocity: v and its
// components vx and vy change length as it flies, with snapshots left behind every few seconds if asked (the book's
// Fig. 3.16: vx stays the same, vy shrinks to zero at the top and grows downwards; user, 2026-10-26).
import type {Key} from '../keys.ts';
import {OBJECTS, type Role} from '../objects.ts';
import {toScene, type Plane} from '../plane.ts';
import type {Actor, Prop, Scene} from '../scene.ts';
import {round, type Vec} from '../vec.ts';
import {n2, walking} from './calculus.ts';

type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};
export type StageItem = {id: string; object: string; x: number; y?: number; on?: string; size?: number; facing?: 1 | -1;
  angle?: number; a?: number; b?: number; label?: string; params?: Record<string, number | string>; mass?: number;
  /** A figure's pose at the start. */ pose?: string;
  /** A speedometer: the mover whose speed it shows. */ follows?: string};
export type StageEvent = {t: number; item: string} & (
  | {kind: 'move'; to: number; duration: number; ease?: 'linear' | 'inOut'}
  | {kind: 'launch'; speed: number; angle?: number; from?: string}
  | {kind: 'slide'; on: string; friction?: number; then?: number}
  | {kind: 'roll'; on: string; then?: number}
  | {kind: 'collide'; with: string; speed: number; elastic?: boolean; after?: number}
  | {kind: 'pose'; pose: string}
  | {kind: 'light'; on?: boolean}
  | {kind: 'run'; duration: number});
/** The figure's poses a stage may ask for. */
export const POSES = ['stand', 'think', 'point', 'cheer', 'shrug', 'push', 'crouch'] as const;
export type StageSpec = Common & {
  verb: 'stage'; width_m?: number; ground?: 'floor' | 'grass' | 'none'; g?: number;
  items: StageItem[]; events?: StageEvent[];
  arrows?: {item: string; dx: number; dy: number; kind?: 'velocity' | 'force' | 'direction'; label?: string; t0?: number; t1?: number}[];
  labels?: {text: string; x: number; y: number; t0?: number; t1?: number}[];
  readouts?: {item: string; show: ('x' | 'height')[]}[];
  /** Arrows of a mover's computed velocity: v and/or its components, `scale` metres of arrow per m/s (default: the
   * fastest arrow is 12% of the stage), a faint copy left every `every` seconds, and readouts of the values. */
  velocity?: {item: string; show?: ('v' | 'vx' | 'vy')[]; scale?: number; every?: number; readouts?: boolean}[];
};
const VELOCITY = ['v', 'vx', 'vy'] as const;

/** Natural sizes in metres, when a spec gives none. */
export const SIZES: Record<string, number> = {car: 4, bus: 12, train: 20, bicycle: 1.8, block: 1, wedge: 4, pulley: 1, sling: 2,
  ball: 0.4, platform: 10, road: 10, parking: 6, signpost: 1.2, marker: 0.4, table: 3, plank: 3, slide: 4, cylinder: 0.6,
  ring: 0.6, cart: 1.2, wall: 0.3, spring: 2, cannon: 1.6, ruler: 3, stopwatch: 0.7, speedometer: 1, bulb: 0.4, figure: 1.7};
/** How high the top of a support is, over its size. */
const top = (i: StageItem) => (i.object === 'block' ? +(i.params?.height ?? 0.7) : OBJECTS[i.object]?.height ?? 0);
const ROLL_K: Record<string, number> = {ball: 0.4, cylinder: 0.5, ring: 1};
const DT = 1 / 30, DEG = Math.PI / 180;
const slopeOf = (wedge: StageItem) => Math.max(5, Math.min(75, wedge.a ?? 30)) * DEG;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const fmt = (v: number, p = 2) => n2(Number(v.toFixed(p)), p).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
/** The figure is a jointed rig, not a drawn object: it walks (a mover) and belongs in any scene. */
const FIGURE_ROLES: Role[] = ['mover', 'general'];
const rolesOf = (item: StageItem) => (item.object === 'figure' ? FIGURE_ROLES : OBJECTS[item.object]?.roles ?? []);
const has = (item: StageItem | undefined, role: Role) => !!item && rolesOf(item).includes(role);
let WIDTH = 10, FIGURES = new Map<string, StageItem>();
/** Its size in metres, as drawn: a launcher or a mover too small to see on a wide stage is drawn larger, as a textbook
 * figure would, and the physics uses the drawn geometry (where the muzzle is, how long the slope is) so both agree. */
const sizeOf = (i: StageItem): number => {
  const size = i.size ?? SIZES[i.object] ?? 1, roles = rolesOf(i);
  // A figure carries a pose and a face, so it is drawn at least a ninth of the stage tall; a bulb over a head is a
  // quarter of the figure; a general prop is never smaller than a few percent of the stage.
  if (i.object === 'bulb' && i.on && FIGURES.get(i.on)) return i.size ?? sizeOf(FIGURES.get(i.on)!) * 0.25;
  if (i.object === 'figure') return Math.max(size, 0.11 * WIDTH);
  return Math.max(size, roles.includes('launcher') ? 0.07 * WIDTH : roles.includes('mover') ? 0.02 * WIDTH
    : roles.includes('general') ? 0.06 * WIDTH : 0);
};

type Sample = {t: number; x: number; y: number; angle: number; travel: number};
type State = Sample;

/** Where every item starts (base point in metres, angle) and its whole timed path, plus the facts. */
function simulate(s: StageSpec): {paths: Map<string, Sample[]>; facts: string[]; end: number; errors: string[]} {
  const g = s.g ?? 9.8, W = WIDTH = s.width_m ?? 10, errors: string[] = [], facts: string[] = [];
  FIGURES = new Map(s.items.filter(i => i.object === 'figure').map(i => [i.id, i]));
  const items = new Map(s.items.map(i => [i.id, i]));
  const state = new Map<string, State>();
  const restY = (i: StageItem): number => {
    if (isNum(i.y)) return i.y;
    const under = i.on ? items.get(i.on) : undefined;
    if (under?.object === 'figure') return restY(under) + sizeOf(under) * 1.06;     // a bulb over the head
    return under ? restY(under) + top(under) * sizeOf(under) : 0;
  };
  for (const i of s.items) state.set(i.id, {t: 0, x: i.x, y: restY(i), angle: i.angle ?? 0, travel: 0});
  /** Where a launcher's ball sits: its centre at the muzzle, along the barrel. */
  const muzzle = (launcher: StageItem, ball: StageItem, angle: number): Vec => {
    const sc = sizeOf(launcher) / OBJECTS[launcher.object].length, f = launcher.facing ?? 1, a = angle * DEG, st = state.get(launcher.id)!;
    return [st.x + f * (-10 + 90 * Math.cos(a)) * sc, st.y + (40 + 90 * Math.sin(a)) * sc - sizeOf(ball) / 2];
  };
  /** A point on a wedge's slope, d metres down from its top, under the middle of something `half` metres long. */
  const onSlope = (wedge: StageItem, half: number, d: number): Vec => {
    const L = sizeOf(wedge), th = slopeOf(wedge), f = wedge.facing ?? 1, wx = state.get(wedge.id)!.x;
    return [wx + f * (L / 2 - (half + d) * Math.cos(th)), L * Math.tan(th) - (half + d) * Math.sin(th)];
  };
  const placed = new Set<string>();
  for (const e of s.events ?? []) {                 // a ball fired from a cannon waits in its muzzle; a slider waits at the top
    const item = items.get(e.item);
    if (!item || placed.has(item.id)) continue;
    placed.add(item.id);
    const launcher = e.kind === 'launch' && e.from ? items.get(e.from) : undefined;
    if (launcher && e.kind === 'launch') { const [x, y] = muzzle(launcher, item, e.angle ?? launcher.a ?? 40); state.set(item.id, {...state.get(item.id)!, x, y}); }
    const wedge = (e.kind === 'slide' || e.kind === 'roll') ? items.get(e.on) : undefined;
    if (wedge) { const [x, y] = onSlope(wedge, sizeOf(item) / 2, 0); state.set(item.id, {...state.get(item.id)!, x, y, angle: (wedge.facing ?? 1) * slopeOf(wedge) / DEG}); }
  }
  const paths = new Map<string, Sample[]>(s.items.map(i => [i.id, [{...state.get(i.id)!}]]));
  const push = (id: string, p: Sample) => { paths.get(id)!.push(p); state.set(id, p); };
  const hold = (id: string, t: number) => { const c = state.get(id)!; if (t > c.t) push(id, {...c, t}); };
  let end = 0;
  for (const e of [...(s.events ?? [])].sort((a, b) => a.t - b.t)) {
    const item = items.get(e.item)!, id = e.item;
    if (e.kind === 'pose' || e.kind === 'light' || e.kind === 'run') {      // nothing moves: the prop changes
      end = Math.max(end, e.t + (e.kind === 'run' ? e.duration : 0.6));
      continue;
    }
    hold(id, e.t);
    const c = state.get(id)!;
    const where = `stage: ${e.kind} of ${id} at ${e.t} s`;
    if (e.kind === 'move') {
      const n = Math.max(1, Math.ceil(e.duration / DT));
      for (let k = 1; k <= n; k++) {
        const u = k / n, w = e.ease === 'inOut' ? u * u * (3 - 2 * u) : u;
        push(id, {...c, t: e.t + e.duration * u, x: c.x + (e.to - c.x) * w, travel: c.travel + (e.to - c.x) * w});
      }
      facts.push(`${id} moves from x = ${fmt(c.x)} m to ${fmt(e.to)} m in ${fmt(e.duration)} s` +
        (e.ease === 'inOut' ? '' : `, at ${fmt(Math.abs(e.to - c.x) / e.duration)} m/s`));
    } else if (e.kind === 'launch') {
      const launcher = e.from ? items.get(e.from) : undefined;
      let x0 = c.x, y0 = c.y, angle = e.angle ?? 45, dir = item.facing ?? 1;
      if (launcher) {                                  // from the cannon's muzzle, along its barrel
        angle = e.angle ?? launcher.a ?? 40; dir = launcher.facing ?? 1;
        [x0, y0] = muzzle(launcher, item, angle);
      }
      const a = angle * DEG, vx = e.speed * Math.cos(a) * dir, vy = e.speed * Math.sin(a);
      const flight = (vy + Math.sqrt(vy * vy + 2 * g * y0)) / g, top = y0 + vy * vy / (2 * g);
      const n = Math.max(1, Math.ceil(flight / DT));
      for (let k = 1; k <= n; k++) {
        const tt = flight * k / n;
        push(id, {...c, t: e.t + tt, x: x0 + vx * tt, y: Math.max(0, y0 + vy * tt - g * tt * tt / 2), travel: c.travel + vx * tt});
      }
      const land = x0 + vx * flight;
      if (land < 0 || land > W) errors.push(`${where}: it lands at x = ${fmt(land)} m, off the stage (0 to ${W} m); widen width_m or lower the speed`);
      facts.push(`${id} is launched at ${fmt(e.speed)} m/s, ${fmt(angle, 1)}° above the horizontal: it rises to ${fmt(top)} m, ` +
        `lands at x = ${fmt(land)} m (${fmt(Math.abs(land - x0))} m away) after ${fmt(flight)} s`);
    } else if (e.kind === 'slide' || e.kind === 'roll') {
      const wedge = items.get(e.on)!, L = sizeOf(wedge), th = slopeOf(wedge), f = wedge.facing ?? 1;
      const slope = L / Math.cos(th), half = sizeOf(item) / 2;
      const acc = e.kind === 'slide' ? g * (Math.sin(th) - ((e as {friction?: number}).friction ?? 0) * Math.cos(th)) : g * Math.sin(th) / (1 + (ROLL_K[item.object] ?? 0.5));
      if (acc <= 0) { facts.push(`${id} stays on the slope: friction ${fmt((e as {friction?: number}).friction ?? 0)} holds it (tan θ = ${fmt(Math.tan(th))})`); continue; }
      const dist = slope - 2 * half, time = Math.sqrt(2 * dist / acc), v = acc * time;
      const at = (d: number) => onSlope(wedge, half, d);
      const n = Math.max(1, Math.ceil(time / DT));
      for (let k = 0; k <= n; k++) {
        const tt = time * k / n, d = acc * tt * tt / 2, [x, y] = at(d);
        push(id, {t: e.t + tt, x, y, angle: f * th / DEG, travel: c.travel - f * d});
      }
      const then = e.then ?? 0;
      if (then > 0) {                                  // on along the ground at the speed it reached
        const last = state.get(id)!, m = Math.max(1, Math.ceil(then / DT));
        for (let k = 1; k <= m; k++) {
          const tt = then * k / m;
          push(id, {t: last.t + tt, x: last.x - f * v * tt, y: 0, angle: 0, travel: last.travel - f * v * tt});
        }
      }
      facts.push(`${id} ${e.kind === 'slide' ? 'slides' : 'rolls'} down the ${fmt(th / DEG, 1)}° slope (${fmt(dist)} m) in ${fmt(time)} s, ` +
        `with a = ${fmt(acc)} m/s², reaching ${fmt(v)} m/s at the bottom`);
    } else if (e.kind === 'collide') {
      const other = items.get(e.with)!, oc = state.get(other.id)!;
      const dir = Math.sign(oc.x - c.x) || 1, gap = Math.abs(oc.x - c.x) - sizeOf(item) / 2 - sizeOf(other) / 2;
      if (gap < 0) { errors.push(`${where}: ${id} and ${other.id} already overlap; place them apart`); continue; }
      const tc = gap / e.speed, n = Math.max(1, Math.ceil(tc / DT));
      for (let k = 1; k <= n; k++) { const tt = tc * k / n; push(id, {...c, t: e.t + tt, x: c.x + dir * e.speed * tt, travel: c.travel + dir * e.speed * tt}); }
      hold(other.id, e.t + tc);
      const m1 = item.mass ?? 1, u1 = dir * e.speed, after = e.after ?? 2;
      let v1: number, v2: number;
      if (other.object === 'wall') { v1 = e.elastic === false ? 0 : -u1; v2 = 0; }
      else {
        const m2 = other.mass ?? 1;
        if (e.elastic === false) { v1 = v2 = m1 * u1 / (m1 + m2); }
        else { v1 = (m1 - m2) / (m1 + m2) * u1; v2 = 2 * m1 / (m1 + m2) * u1; }
        facts.push(`momentum before: ${fmt(m1 * e.speed)} kg m/s; after: ${fmt(Math.abs(m1 * v1 + m2 * v2))} kg m/s (conserved)`);
      }
      const a0 = state.get(id)!, b0 = state.get(other.id)!, m = Math.max(1, Math.ceil(after / DT));
      for (let k = 1; k <= m; k++) {
        const tt = after * k / m;
        push(id, {...a0, t: a0.t + tt, x: a0.x + v1 * tt, travel: a0.travel + v1 * tt});
        if (other.object !== 'wall') push(other.id, {...b0, t: b0.t + tt, x: b0.x + v2 * tt, travel: b0.travel + v2 * tt});
      }
      facts.push(`${id} (${fmt(m1)} kg) hits ${other.id} at ${fmt(e.speed)} m/s, ${e.elastic === false ? 'and they stick together' : 'elastically'}: ` +
        `afterwards ${id} moves at ${fmt(v1)} m/s` + (other.object === 'wall' ? '' : ` and ${other.id} at ${fmt(v2)} m/s`));
    }
    for (const [pid, p] of paths) {
      const last = p.at(-1)!;
      end = Math.max(end, last.t);
      if (items.get(pid)?.on && items.get(items.get(pid)!.on!)?.object === 'figure') continue;
      for (const q of p) if (q.x < -0.5 || q.x > W + 0.5) { errors.push(`stage: ${pid} goes off the stage (x = ${fmt(q.x)} m; it is 0 to ${W} m)`); break; }
    }
  }
  return {paths, facts, end, errors: [...new Set(errors)]};
}

export function stageErrors(s: StageSpec): string[] {
  const e: string[] = [];
  const W = s.width_m ?? 10;
  if (s.width_m !== undefined && !(s.width_m >= 1 && s.width_m <= 5000)) e.push('stage: width_m is 1 to 5000 metres');
  if (!Array.isArray(s.items) || !s.items.length) return [...e, 'stage: give at least one item'];
  const ids = new Set<string>();
  const items = new Map(s.items.map(i => [i.id, i]));
  s.items.forEach((i, n) => {
    const where = `stage: item ${i?.id ?? n + 1}`;
    if (typeof i?.id !== 'string' || !i.id || ids.has(i.id)) e.push(`${where} needs a unique id`);
    ids.add(i?.id);
    if (!OBJECTS[i?.object] && i?.object !== 'figure') e.push(`${where}: unknown object ${JSON.stringify(i?.object)}; known: figure, ${Object.keys(OBJECTS).join(', ')}`);
    if (i?.pose !== undefined && (i.object !== 'figure' || !POSES.includes(i.pose as never))) e.push(`${where}: pose is for a figure: ${POSES.join(', ')}`);
    if (i?.follows !== undefined && (i.object !== 'speedometer' || !has(items.get(i.follows), 'mover'))) e.push(`${where}: follows is for a speedometer, naming a mover`);
    if (!isNum(i?.x) || i.x < 0 || i.x > W) e.push(`${where}: x must be on the stage (0 to ${W} m)`);
    if (i?.size !== undefined && !(i.size > 0)) e.push(`${where}: size (metres) must be positive`);
    const over = i?.object === 'bulb' && items.get(i?.on as string)?.object === 'figure';
    if (i?.on !== undefined && !over && !has(items.get(i.on), 'support')) e.push(`${where}: on must name an item that things can rest on (a table, block, plank, wall), or a figure for a bulb`);
  });
  if (e.length) return e;
  for (const [n, ev] of (s.events ?? []).entries()) {
    const where = `stage: event ${n + 1} (${ev?.kind})`;
    const item = items.get(ev?.item);
    if (!isNum(ev?.t) || ev.t < 0) e.push(`${where}: t (seconds) is 0 or more`);
    if (!item) { e.push(`${where}: item ${JSON.stringify(ev?.item)} is not on the stage`); continue; }
    switch (ev.kind) {
      case 'move':
        if (!has(item, 'mover')) e.push(`${where}: a ${item.object} does not move by itself`);
        if (!isNum(ev.to) || ev.to < 0 || ev.to > W) e.push(`${where}: to must be on the stage`);
        if (!(ev.duration > 0)) e.push(`${where}: duration (seconds) must be positive`);
        break;
      case 'launch':
        if (!has(item, 'mover')) e.push(`${where}: only something that can fly (a ball) is launched`);
        if (!(ev.speed > 0 && ev.speed <= 200)) e.push(`${where}: speed is 0 to 200 m/s`);
        if (ev.angle !== undefined && !(ev.angle >= 0 && ev.angle < 90)) e.push(`${where}: angle is 0 to 89 degrees`);
        if (ev.from !== undefined && !has(items.get(ev.from), 'launcher')) e.push(`${where}: from must name a launcher (a cannon)`);
        break;
      case 'slide': case 'roll':
        if (items.get(ev.on)?.object !== 'wedge') e.push(`${where}: on must name a wedge`);
        if (ev.kind === 'roll' && !has(item, 'roller')) e.push(`${where}: only a roller (ball, cylinder, ring) rolls; a block slides`);
        if (ev.kind === 'slide' && ev.friction !== undefined && !(ev.friction >= 0 && ev.friction <= 2)) e.push(`${where}: friction is 0 to 2`);
        break;
      case 'collide':
        if (!has(item, 'impactor') || !has(items.get(ev.with), 'impactor')) e.push(`${where}: both must be things that collide (a ball, block, cart, car, wall)`);
        if (!(ev.speed > 0)) e.push(`${where}: speed (m/s) must be positive`);
        break;
      case 'pose':
        if (item.object !== 'figure' || !POSES.includes(ev.pose as never)) e.push(`${where}: a figure takes a pose: ${POSES.join(', ')}`);
        break;
      case 'light':
        if (item.object !== 'bulb') e.push(`${where}: only a bulb lights`);
        break;
      case 'run':
        if (item.object !== 'stopwatch') e.push(`${where}: only a stopwatch runs`);
        if (!(ev.duration > 0 && ev.duration <= 60)) e.push(`${where}: duration is 0 to 60 seconds`);
        break;
      default: e.push(`${where}: kind is move, launch, slide, roll, collide, pose, light or run`);
    }
  }
  // Lists must be lists: a planner wrote velocity as one object, and the crash took a film's whole batch check with it.
  for (const f of ['arrows', 'labels', 'readouts', 'velocity'] as const) if (s[f] !== undefined && !Array.isArray(s[f])) return [...e, `stage: ${f} is a list ([{...}, ...]), even for one`];
  for (const [n, a] of (s.arrows ?? []).entries()) if (!items.has(a?.item) || !isNum(a?.dx) || !isNum(a?.dy)) e.push(`stage: arrow ${n + 1} needs an item and dx, dy in metres`);
  for (const [n, r] of (s.readouts ?? []).entries()) if (!items.has(r?.item)) e.push(`stage: readout ${n + 1} names no item`);
  for (const [n, v] of (s.velocity ?? []).entries()) {
    const where = `stage: velocity ${n + 1}`;
    if (!has(items.get(v?.item), 'mover')) e.push(`${where}: item names something that moves (a ball, a block, a cart)`);
    if (v?.show !== undefined && !(Array.isArray(v.show) && v.show.length && v.show.every(q => VELOCITY.includes(q as never)))) e.push(`${where}: show is any of v, vx, vy`);
    if (v?.scale !== undefined && !(isNum(v.scale) && v.scale > 0)) e.push(`${where}: scale is metres of arrow per m/s, more than 0`);
    if (v?.every !== undefined && !(isNum(v.every) && v.every >= 0.2)) e.push(`${where}: every is seconds between snapshots, 0.2 or more`);
  }
  if (e.length) return e;
  const sim = simulate(s);
  // The stage's height follows its width (16:9): a tall setup needs a wide stage. Say exactly how wide, or a planner
  // sees only "leaves the frame" (the projectile film's 490 m cliff on a 200 m stage failed every round, 2026-10-26).
  if (!sim.errors.length) {
    const Wpx = s.width ?? 1920, Hpx = s.height ?? 1080, W = s.width_m ?? 10;
    const shown = 0.78 * Hpx * W / (0.9 * Wpx);
    let tallest = 0, what = '';
    for (const i of s.items) {
      const h = OBJECTS[i.object]?.height ?? 1;
      for (const q of sim.paths.get(i.id) ?? []) if (q.y + sizeOf(i) * h > tallest) { tallest = q.y + sizeOf(i) * h; what = i.id; }
    }
    if (tallest > shown) sim.errors.push(`stage: ${what} reaches ${fmt(tallest)} m up, but a ${fmt(W)} m wide stage shows only ${fmt(shown)} m of height; set width_m to at least ${Math.ceil(1.05 * tallest * W / shown)}`);
  }
  for (const [n, v] of (s.velocity ?? []).entries()) if ((sim.paths.get(v.item)?.length ?? 0) < 2) sim.errors.push(`stage: velocity ${n + 1}: ${v.item} never moves; give it an event (launch, slide, roll, collide)`);
  return sim.errors;
}

export function stage(s: StageSpec): Scene {
  const Wpx = s.width ?? 1920, Hpx = s.height ?? 1080, k = Hpx / 1080;
  const W = s.width_m ?? 10, box: [number, number, number, number] = [0.05 * Wpx, 0.14 * Hpx, 0.95 * Wpx, 0.84 * Hpx];
  const unit = (box[2] - box[0]) / W, Hm = (box[3] - box[1]) / unit;
  const plane: Plane = {id: 'w', x: [0, W], y: [0, Hm], box};
  const P = (x: number, y: number) => toScene(plane, [x, y]);
  const {paths, facts, end} = simulate(s);
  const props: Prop[] = [], actors: Actor[] = [];
  const ground = s.ground ?? 'floor';
  if (ground !== 'none') props.push({id: 'ground', type: 'line', x1: 0, y1: box[3], x2: Wpx, y2: box[3],
    style: {stroke: ground === 'grass' ? 'good' : 'muted', width: 4 * k}});
  if (s.title) props.push({id: 'title', type: 'text', x: box[0], y: 0.08 * Hpx, text: s.title, size: 44 * k, weight: 700, width: Wpx * 0.6});
  const events = s.events ?? [];
  /** A speedometer's reading: the speed of the mover it follows, from that mover's computed path. */
  const speedKeys = (id: string, scale: number): Key[] => {
    const p = paths.get(id)!;
    if (p.length < 2) return [[0, 0]];
    return p.map((q, i) => {
      const r = p[Math.max(1, i)], l = p[Math.max(0, i - 1)], dt = r.t - l.t;
      const v = dt > 0 ? Math.hypot(r.x - l.x, r.y - l.y) / dt : 0;
      return [q.t, v * scale, 'linear'] as Key;
    });
  };
  for (const item of s.items) {
    const path = paths.get(item.id)!, size = sizeOf(item) * unit;
    if (item.object === 'figure') {
      // A jointed figure: its height is its size; it holds its pose, changes pose on cue and walks when it moves.
      const pose: {t: number; pose: string}[] = [{t: 0, pose: item.pose ?? 'stand'}];
      for (const e of [...events].sort((a, b) => a.t - b.t).filter(e => e.item === item.id)) {
        if (e.kind === 'pose') pose.push({t: e.t, pose: e.pose}, {t: e.t + 0.5, pose: e.pose});
        if (e.kind === 'move') pose.push(...walking(e.t, e.t + e.duration));
      }
      const moves = path.length > 1;
      const facings = moves ? path.slice(1).flatMap((q, i) => (q.x !== path[i].x ? [{t: path[i].t, facing: (q.x > path[i].x ? 1 : -1) as 1 | -1}] : [])) : [];
      actors.push({id: `f-${item.id}`, rig: 'figure', at: P(path[0].x, path[0].y), scale: size / 176, facing: item.facing ?? 1,
        facings: facings.filter((x, i) => !i || x.facing !== facings[i - 1].facing), pose: pose.sort((a, b) => a.t - b.t), layer: 3,
        ...(moves ? {base: path.map((q, i) => ({t: q.t, at: P(q.x, q.y), ...(i ? {ease: 'linear' as const} : {})}))} : {})});
      if (moves) actors.push({id: `d-${item.id}`, rig: 'dot', at: P(path[0].x, path[0].y), opacity: [[0, 0]], layer: 1,
        base: path.map((q, i) => ({t: q.t, at: P(q.x, q.y), ...(i ? {ease: 'linear' as const} : {})})), blink: []});
      continue;
    }
    const keyed: Record<string, Key[]> = {};
    if (item.object === 'bulb') {
      const a: Key[] = [[0, item.a ?? 0]];
      for (const e of events.filter(e => e.item === item.id && e.kind === 'light').sort((x, y) => x.t - y.t)) {
        a.push([e.t, a.at(-1)![1]], [e.t + 0.4, (e as {on?: boolean}).on === false ? 0 : 1, 'linear']);
      }
      if (a.length > 1) keyed.a = a;
    }
    if (item.object === 'stopwatch') {
      const a: Key[] = [[0, item.a ?? 0]];
      for (const e of events.filter(e => e.item === item.id && e.kind === 'run').sort((x, y) => x.t - y.t)) {
        const from = a.at(-1)![1], dur = (e as {duration: number}).duration;
        a.push([e.t, from], [e.t + dur, from + dur, 'linear']);
      }
      if (a.length > 1) keyed.a = a;
    }
    if (item.object === 'speedometer' && item.follows) keyed.a = speedKeys(item.follows, String(item.params?.unit ?? 'm/s') === 'km/h' ? 3.6 : 1);
    const base = {id: `o-${item.id}`, type: 'object' as const, name: item.object, size, facing: item.facing ?? 1, a: item.a, b: item.b,
      label: item.label, params: item.params, layer: has(item, 'mover') ? 3 : 2};
    if (path.length === 1) {
      const [x, y] = P(path[0].x, path[0].y);
      props.push({...base, x, y, angle: path[0].angle, ...(Object.keys(keyed).length ? {keys: keyed} : {})});
      continue;
    }
    // A moving item: a hidden dot carries its place (readouts and arrows follow it); the prop rides on the dot, with
    // its angle and the distance it has rolled keyed from the same path.
    actors.push({id: `d-${item.id}`, rig: 'dot', at: P(path[0].x, path[0].y), opacity: [[0, 0]], layer: 1,
      base: path.map((q, i) => ({t: q.t, at: P(q.x, q.y), ...(i ? {ease: 'linear' as const} : {})})), blink: []});
    props.push({...base, x: 0, y: 0, anchor: {actor: `d-${item.id}`, joint: 'p'},
      keys: {angle: path.map(q => [q.t, q.angle] as Key), travel: path.map(q => [q.t, q.travel * unit] as Key)}});
  }
  for (const e of s.events ?? []) if (e.kind === 'launch') props.push({id: `trail-${e.item}-${e.t}`, type: 'trail', of: {actor: `d-${e.item}`, joint: 'p',
    offset: [0, -sizeOf(s.items.find(i => i.id === e.item)!) / 2 * unit]}, t0: e.t, step: 0.1, style: {stroke: 'muted', width: 3 * k, dash: [6 * k, 10 * k]}, layer: 1});
  const ref = (id: string) => (paths.get(id)!.length > 1 ? {actor: `d-${id}`, joint: 'p'} : null);
  for (const [n, a] of (s.arrows ?? []).entries()) {
    const item = s.items.find(i => i.id === a.item)!, start = paths.get(a.item)![0], h = sizeOf(item) * 0.5 * unit;
    const colour = a.kind === 'force' ? 'bad' : a.kind === 'velocity' ? 'cool' : 'accent';
    const r = ref(a.item), [x, y] = P(start.x, start.y);
    props.push({id: `arrow${n}`, type: 'arrow', x1: x, y1: y - h, x2: x + a.dx * unit, y2: y - h - a.dy * unit, head: 18 * k,
      style: {stroke: colour, width: 5 * k}, show: [a.t0 ?? 0, a.t1 ?? 1e9], layer: 4,
      ...(r ? {ends: [{...r, offset: [0, -h] as Vec}, {...r, offset: [a.dx * unit, -h - a.dy * unit] as Vec}]} : {})});
    if (a.label) props.push({id: `arrow${n}-label`, type: 'text', x: x + a.dx * unit, y: y - h - a.dy * unit - 26 * k, text: a.label,
      size: 28 * k, align: 'middle', weight: 700, style: {fill: colour}, show: [a.t0 ?? 0, a.t1 ?? 1e9], layer: 4,
      ...(r ? {anchor: {...r, offset: [a.dx * unit, -h - a.dy * unit - 26 * k] as Vec}} : {})});
  }
  for (const [n, l] of (s.labels ?? []).entries()) {
    const [x, y] = P(l.x, l.y);
    props.push({id: `label${n}`, type: 'text', x, y, text: l.text, size: 30 * k, align: 'middle', weight: 700, show: [l.t0 ?? 0, l.t1 ?? 1e9], layer: 4});
  }
  let row = 0.08 * Hpx;
  // Velocity arrows: from the mover's centre, keyed sample by sample from its computed path (each sample's velocity is
  // that of the step after it), so they stretch, shrink and turn as it moves; zero-length arrows draw nothing.
  const COLOURS = {v: 'accent', vx: 'cool', vy: 'good'} as const;
  for (const [n, vel] of (s.velocity ?? []).entries()) {
    const path = paths.get(vel.item)!, item = s.items.find(i => i.id === vel.item)!, h = sizeOf(item) * 0.5 * unit;
    const steps = path.slice(0, -1).map((q, i) => {
      const r = path[i + 1], dt = r.t - q.t;
      // At the step's middle, where its average velocity is the true one under constant acceleration.
      return dt > 1e-9 ? {t: q.t + dt / 2, x: (q.x + r.x) / 2, y: (q.y + r.y) / 2, vx: (r.x - q.x) / dt, vy: (r.y - q.y) / dt} : null;
    }).filter((q): q is {t: number; x: number; y: number; vx: number; vy: number} => q !== null);
    const last = path.at(-1)!;
    steps.push({t: last.t, x: last.x, y: last.y, vx: 0, vy: 0});
    const moving = steps.filter(q => Math.hypot(q.vx, q.vy) > 1e-6);
    if (!moving.length) continue;
    const fastest = Math.max(...moving.map(q => Math.hypot(q.vx, q.vy)));
    const scale = (vel.scale ?? 0.12 * W / fastest) * unit, show = vel.show ?? ['v', 'vx', 'vy'];
    const span: [number, number] = [moving[0].t, moving.at(-1)!.t + DT];
    const parts = {v: (q: typeof steps[0]) => [q.vx, q.vy], vx: (q: typeof steps[0]) => [q.vx, 0], vy: (q: typeof steps[0]) => [0, q.vy]};
    const arrowAt = (q: typeof steps[0], part: 'v' | 'vx' | 'vy') => {
      const [x, y] = P(q.x, q.y), [dx, dy] = parts[part](q);
      return {x1: x, y1: y - h, x2: x + dx * scale, y2: y - h - dy * scale, head: Math.min(18 * k, 0.45 * Math.hypot(dx, dy) * scale)};
    };
    for (const part of show) {
      const keys: Record<string, Key[]> = {x1: [], y1: [], x2: [], y2: [], head: []};
      for (const q of steps) for (const [f, v] of Object.entries(arrowAt(q, part))) keys[f].push([q.t, v, 'linear']);
      props.push({id: `vel${n}-${part}`, type: 'arrow', x1: 0, y1: 0, x2: 0, y2: 0, keys, show: span, fade: 0.15,
        style: {stroke: COLOURS[part], width: (part === 'v' ? 6 : 4.5) * k}, layer: 5});
      props.push({id: `vel${n}-${part}-label`, type: 'text', x: 0, y: 0, text: part === 'v' ? 'v' : part === 'vx' ? 'vₓ' : 'vᵧ', size: 28 * k, weight: 700,
        align: 'middle', show: span, fade: 0.15, style: {fill: COLOURS[part]}, layer: 5,
        keys: {x: steps.map(q => [q.t, arrowAt(q, part).x2 + (part === 'vy' ? 26 * k : 0), 'linear'] as Key),
          y: steps.map(q => [q.t, arrowAt(q, part).y2 - (part === 'vy' ? 0 : 22 * k), 'linear'] as Key)}});
      // Snapshots: a faint copy where the mover was, every few seconds of its flight.
      if (vel.every) for (let t = moving[0].t, i = 0; t <= span[1] && i < 40; t += vel.every, i++) {
        const q = steps.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a));
        const a = arrowAt(q, part);
        if (Math.hypot(a.x2 - a.x1, a.y2 - a.y1) > 2) props.push({id: `vel${n}-${part}-at${i}`, type: 'arrow', ...a, show: [q.t, 1e9],
          style: {stroke: COLOURS[part], width: 3 * k, opacity: 0.45}, layer: 4});
      }
      if (vel.readouts !== false) {
        const value = (q: typeof steps[0]) => (part === 'v' ? Math.hypot(q.vx, q.vy) : part === 'vx' ? q.vx : q.vy);
        props.push({id: `vel${n}-${part}-ro`, type: 'readout', x: 0.7 * Wpx, y: row, size: 32 * k, decimals: 2, show: span, fade: 0.15,
          text: `${vel.item} ${part === 'v' ? 'speed v' : part === 'vx' ? 'vₓ' : 'vᵧ'} = {v} m/s`,
          measures: {v: {kind: 'keys', keys: steps.map(q => [q.t, round(value(q), 6), 'linear'] as Key)}}, style: {fill: COLOURS[part]}});
        row += 1.3 * 32 * k;
      }
    }
    const launch = (s.events ?? []).find(e => e.item === vel.item && e.kind === 'launch') as {speed: number; angle?: number; from?: string} | undefined;
    if (launch) {
      const angle = (launch.angle ?? (launch.from ? s.items.find(i => i.id === launch.from)?.a ?? 40 : 45)) * DEG;
      facts.push(`${vel.item}'s velocity at launch: horizontal part vₓ = ${fmt(launch.speed * Math.cos(angle))} m/s (it stays the same), vertical part vᵧ = ${fmt(launch.speed * Math.sin(angle))} m/s (zero at the top)`);
    }
  }
  for (const [n, r] of (s.readouts ?? []).entries()) {
    const at = ref(r.item) ?? {plane: 'w', at: [paths.get(r.item)![0].x, paths.get(r.item)![0].y] as Vec};
    for (const q of r.show) {
      props.push({id: `ro${n}-${q}`, type: 'readout', x: 0.7 * Wpx, y: row, size: 32 * k,
        text: `${r.item} ${q === 'x' ? 'x' : 'height'} = {v} m`, decimals: 2,
        measures: {v: {kind: 'coord', of: at as never, plane: 'w', axis: q === 'x' ? 'x' : 'y'}}, style: {fill: q === 'x' ? 'accent' : 'cool'}});
      row += 1.3 * 32 * k;
    }
  }
  return {linkwork: 1, width: Wpx, height: Hpx, fps: s.fps ?? 30, duration: Math.max(3, end + 1.5), theme: s.theme ?? 'dark',
    planes: [plane], props, actors, meta: {verb: 'stage', facts, width_m: W}};
}
