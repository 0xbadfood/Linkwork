// energy: mechanical energy, computed (NCERT Class 11 Work, Energy and Power, §5.8–5.10; user, 2026-10-30). A body
// moves under a conservative force (gravity or a spring) and code integrates its motion; bars keep its kinetic energy,
// its potential energy (mgh, or ½kx² for a spring), the heat friction makes, and the total, all live, so the trade of
// potential for kinetic energy and the constant total (conservation of mechanical energy) are seen, with or without
// numbers. Systems:
//   drop      a ball falls from h: v = √(2gh) at the ground
//   slope     a block slides down an incline from h (with friction µk, heat µk mg cos θ × distance); or a ball down a
//             straight track and a curved one together: the same speed at the bottom by either path (gravity is
//             conservative: its work depends on height alone), at different times
//   pendulum  a bob swings from an amplitude: the fastest at the bottom, at rest at either end
//   spring    a block runs into a spring at v0 (Example 5.8: a car into a buffer spring), or is let go from a
//             compression x0; with friction the block stops sooner and the heat is the energy missing
import type {Key} from '../keys.ts';
import type {Plane} from '../plane.ts';
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {round} from '../vec.ts';
import {n2, panel, scene, text} from './calculus.ts';
import {frame} from './vectors.ts';

type P2 = [number, number];
export const SYSTEMS = ['drop', 'slope', 'pendulum', 'spring'] as const;
export type EnergySpec = {verb: 'energy'; system: (typeof SYSTEMS)[number]; mass?: number; g?: number; label?: string;
  h?: number; angle?: number; paths?: 'one' | 'two'; length?: number; amplitude?: number;
  k?: number; v0?: number; x0?: number; mu?: number;
  title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};

const DEG = Math.PI / 180;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const f = (v: number) => n2(round(v, 9), Math.abs(v) >= 100 || Number.isInteger(round(v, 9)) ? 0 : 2);

/** One moment: where the body is (world metres, x right, y up), its speed, its energies. */
type St = {t: number; p: P2; v: number; K: number; U: number; Q: number; extra?: P2};
type Run = {states: St[]; facts: string[]; errors: string[]; reach: P2[]};

const DT = 1 / 600;

function simulate(s: EnergySpec): Run {
  const m = s.mass ?? 1, g = s.g ?? 9.8, mu = s.mu ?? 0, out: Run = {states: [], facts: [], errors: [], reach: []};
  const st = (t: number, p: P2, v: number, U: number, Q: number, extra?: P2): St => ({t, p, v, K: m * v * v / 2, U, Q, extra});
  if (s.system === 'drop') {
    const h = s.h!, T = Math.sqrt(2 * h / g);
    for (let i = 0; i <= 120; i++) { const t = T * i / 120, y = h - g * t * t / 2; out.states.push(st(t, [0, y], g * t, m * g * y, 0)); }
    out.reach = [[-0.5 * h, 0], [0.5 * h, h]];
    out.facts.push(`at the top: U = mgh = ${f(m * g * h)} J, K = 0`, `at the ground: K = ${f(m * g * h)} J, v = √(2gh) = ${f(Math.sqrt(2 * g * h))} m/s`,
      `it falls ${f(h)} m in ${f(T)} s`, `halfway down: K = U = ${f(m * g * h / 2)} J, v = ${f(Math.sqrt(g * h))} m/s`);
  } else if (s.system === 'slope') {
    const h = s.h!, th = (s.angle ?? 30) * DEG, run = h / Math.tan(th), len = h / Math.sin(th);
    if (s.paths === 'two') {
      // a straight track and a curve dipping below it (y = h(1 − x/run)²), both frictionless, from the same height
      const curve = (x: number) => h * (1 - x / run) ** 2, slopeAt = (x: number) => -2 * h / run * (1 - x / run);
      let x = 0, vx = 0, t = 0, xs = 0, vs = 0, doneC = Infinity, doneS = Infinity;
      const a = g * Math.sin(th);
      while ((doneC === Infinity || doneS === Infinity) && t < 60) {
        if (doneS === Infinity) { vs += a * DT; xs += vs * DT; if (xs >= len) { xs = len; doneS = t; } }
        if (doneC === Infinity) {
          // along the curve: speed from energy, direction from the slope (exact energy, no drift)
          const y = curve(x), v = Math.sqrt(Math.max(0, 2 * g * (h - y))), k1 = slopeAt(x), cos = 1 / Math.sqrt(1 + k1 * k1);
          vx = Math.max(v * cos, 0.02); x += vx * DT; if (x >= run) { x = run; doneC = t; }
        }
        t += DT;
        if (Math.round(t / DT) % 10 === 0 || (doneC !== Infinity && doneS !== Infinity)) {
          const ys = h - xs * Math.sin(th), yc = curve(x);
          out.states.push({t, p: [xs * Math.cos(th), ys], v: vs, K: m * vs * vs / 2, U: m * g * ys, Q: 0, extra: [x, yc]});
        }
      }
      out.reach = [[0, 0], [run, h]];
      const v = Math.sqrt(2 * g * h);
      out.facts.push(`both reach the bottom at v = √(2gh) = ${f(v)} m/s: the same speed by either path`,
        `down the straight track: ${f(doneS)} s; down the curve: ${f(doneC)} s`, `gravity's work, mgh = ${f(m * g * h)} J, depends only on the height`);
    } else {
      const a = g * (Math.sin(th) - mu * Math.cos(th));
      if (a <= 1e-9) { out.errors.push(`energy: with µ = ${f(mu)} the block does not slide down a ${f(th / DEG)}° slope (tan θ ≤ µ); lower mu or steepen the angle`); return out; }
      const T = Math.sqrt(2 * len / a), fr = mu * m * g * Math.cos(th);
      for (let i = 0; i <= 120; i++) {
        const t = T * i / 120, sd = a * t * t / 2, y = h - sd * Math.sin(th);
        out.states.push(st(t, [sd * Math.cos(th), y], a * t, m * g * y, fr * sd));
      }
      out.reach = [[0, 0], [run, h]];
      const vb = a * T;
      out.facts.push(`at the top: U = mgh = ${f(m * g * h)} J`, `at the bottom: v = ${f(vb)} m/s, K = ${f(m * vb * vb / 2)} J`,
        ...(mu > 0 ? [`friction f = µ mg cos θ = ${f(fr)} N turns ${f(fr * len)} J into heat over ${f(len)} m`, `mgh = K + heat: ${f(m * g * h)} = ${f(m * vb * vb / 2)} + ${f(fr * len)} J`]
          : [`v = √(2gh) = ${f(vb)} m/s, whatever the angle`]), `it takes ${f(T)} s down ${f(len)} m of slope`);
    }
  } else if (s.system === 'pendulum') {
    const L = s.length ?? 1, a0 = (s.amplitude ?? 40) * DEG, w = Math.sqrt(g / L);
    let th = a0, om = 0, t = 0, ends = 0, last = 0;
    const T0 = 2 * Math.PI / w;
    while (t < 3 * T0 && ends < 4) {
      // velocity Verlet on θ'' = −(g/L) sin θ
      const al = -w * w * Math.sin(th); th += om * DT + al * DT * DT / 2; const al2 = -w * w * Math.sin(th); om += (al + al2) / 2 * DT; t += DT;
      if (Math.sign(om) !== Math.sign(last) && last !== 0) ends++;
      last = om;
      if (Math.round(t / DT) % 8 === 0) {
        const y = L * (1 - Math.cos(th));
        out.states.push(st(t, [L * Math.sin(th), L - L * Math.cos(th)], Math.abs(om) * L, m * g * y, 0));
      }
    }
    out.states.unshift(st(0, [L * Math.sin(a0), L - L * Math.cos(a0)], 0, m * g * L * (1 - Math.cos(a0)), 0));
    out.reach = [[-L, -0.05 * L], [L, L]];
    const h = L * (1 - Math.cos(a0));
    out.facts.push(`released from ${f(a0 / DEG)}°: it starts ${f(h)} m above the lowest point (h = L(1 − cos θ))`,
      `at the bottom: v = √(2gh) = ${f(Math.sqrt(2 * g * h))} m/s, K = mgh = ${f(m * g * h)} J`, `at either end it stops for an instant: all potential energy`);
  } else {
    // spring: X is the block's face, measured from the spring's free end (X < 0: the spring is squeezed by −X)
    // v0 is the speed it arrives with (Example 5.8), so the run-up to the spring is frictionless; friction acts once it
    // touches the spring (and everywhere when let go from a compression)
    const kk = s.k!, frAll = mu * m * g, run = s.x0 === undefined ? Math.max(0.15, 0.5 * s.v0! * Math.sqrt(m / kk)) : 0;
    let X = s.x0 !== undefined ? -s.x0 : run, v = s.x0 !== undefined ? 0 : -s.v0!, t = 0, Q = 0, xm = Math.max(0, -X), i = 0;
    const push = () => out.states.push(st(t, [X, 0], Math.abs(v), kk * Math.max(0, -X) ** 2 / 2, Q, [Math.max(0, -X), 0]));
    push();
    while (t < 60) {
      const fr = X <= 0 || s.x0 !== undefined ? frAll : 0, spring = kk * Math.max(0, -X);
      if (Math.abs(v) < 1e-9 && spring <= fr) break;                                      // at rest, held by friction
      const dir = Math.abs(v) > 1e-9 ? Math.sign(v) : Math.sign(spring);
      const v1 = v + (spring - dir * fr) / m * DT;
      if (fr > 0 && Math.sign(v1) !== Math.sign(v) && Math.abs(v) > 1e-9) {               // it turns: stops if friction can hold it
        const dx = v / 2 * DT; X += dx; Q += fr * Math.abs(dx); v = 0; t += DT;
        if (kk * Math.max(0, -X) <= fr) break;
        continue;
      }
      const dx = (v + v1) / 2 * DT; X += dx; v = v1; Q += fr * Math.abs(dx); t += DT;
      xm = Math.max(xm, -X);
      if (++i % 10 === 0) push();
      if (X > Math.max(run, 0.5 * (s.x0 ?? 0)) && v > 0) break;                              // it has left the spring
      if (X > 0 && v <= 0 && fr > 0 && s.x0 !== undefined) break;
    }
    push();
    out.reach = [[-1.6 * Math.max(xm, 0.1), 0], [Math.max(run, 0.5 * (s.x0 ?? 0)) + 0.4 * Math.max(xm, 0.1), 0]];
    // the greatest compression quoted exactly: ½kx² + µmg x = ½mv² (the integration only draws it)
    if (s.x0 === undefined) xm = (-frAll + Math.sqrt(frAll * frAll + kk * m * s.v0! ** 2)) / kk;
    else xm = s.x0;
    const fr = frAll, E0 = s.x0 !== undefined ? kk * s.x0 ** 2 / 2 : m * s.v0! ** 2 / 2;
    if (s.x0 === undefined) out.facts.push(`it arrives with K = ½mv² = ${f(E0)} J`,
      fr > 0 ? `it stops at the greatest compression x = ${f(xm)} m: ½kx² + µmg x = ½mv² (${f(kk * xm * xm / 2)} + ${f(fr * xm)} = ${f(E0)} J)`
        : `greatest compression x = v√(m/k) = ${f(xm)} m, where ½kx² = ½mv² = ${f(E0)} J`);
    else out.facts.push(`let go from x = ${f(s.x0)} m with U = ½kx² = ${f(E0)} J`, ...(fr === 0 ? [`it leaves the spring at v = x√(k/m) = ${f(s.x0 * Math.sqrt(kk / m))} m/s`] : []));
    out.facts.push(`spring force F = −kx; at the greatest compression it is ${f(kk * xm)} N`);
    if (frAll > 0) out.facts.push(`friction turned ${f(Q)} J into heat`);
  }
  return out;
}

export function energyErrors(s: EnergySpec): string[] {
  const e: string[] = [];
  if (!SYSTEMS.includes(s.system)) return [`energy: system is one of ${SYSTEMS.join(', ')}`];
  if (s.mass !== undefined && !(isNum(s.mass) && s.mass > 0)) e.push('energy: mass is in kg, above 0');
  if (s.mass === undefined && !s.illustrative) e.push('energy: give mass (kg); or, when the narration states no numbers, set illustrative: true');
  if (s.g !== undefined && !(isNum(s.g) && s.g > 0)) e.push('energy: g is above 0 (default 9.8)');
  if (s.mu !== undefined && !(isNum(s.mu) && s.mu >= 0 && s.mu < 2)) e.push('energy: mu (kinetic friction) is 0 to 2');
  if (s.system === 'drop' || s.system === 'slope') if (!(isNum(s.h) && s.h > 0)) e.push(`energy: ${s.system} needs h, the starting height in m`);
  if (s.system === 'drop' && s.mu) e.push('energy: a drop has no friction; leave mu out');
  if (s.system === 'slope') {
    if (s.angle !== undefined && !(isNum(s.angle) && s.angle >= 10 && s.angle <= 70)) e.push('energy: angle (the slope) is 10 to 70 degrees');
    if (s.paths !== undefined && !['one', 'two'].includes(s.paths)) e.push("energy: paths is 'one' or 'two' (a straight track and a curve together)");
    if (s.paths === 'two' && s.mu) e.push("energy: paths 'two' compares frictionless tracks; leave mu out");
  }
  if (s.system === 'pendulum') {
    if (s.length !== undefined && !(isNum(s.length) && s.length > 0)) e.push('energy: length is the string length in m');
    if (s.amplitude !== undefined && !(isNum(s.amplitude) && s.amplitude >= 5 && s.amplitude <= 80)) e.push('energy: amplitude is 5 to 80 degrees');
    if (s.mu) e.push('energy: a pendulum here has no friction; leave mu out');
  }
  if (s.system === 'spring') {
    if (!(isNum(s.k) && s.k > 0)) e.push('energy: spring needs k, the spring constant in N/m');
    if ((s.v0 === undefined) === (s.x0 === undefined)) e.push('energy: spring takes v0 (the block runs into it, m/s) or x0 (let go from this compression, m), not both');
    if (s.v0 !== undefined && !(isNum(s.v0) && s.v0 > 0)) e.push('energy: v0 is above 0 m/s');
    if (s.x0 !== undefined && !(isNum(s.x0) && s.x0 > 0)) e.push('energy: x0 is a compression above 0 m');
  }
  if (e.length) return e;
  const run = simulate(s);
  if (run.errors.length) return run.errors;
  if (s.system === 'spring' && s.x0 !== undefined && (s.k ?? 0) * s.x0 <= (s.mu ?? 0) * (s.mass ?? 1) * (s.g ?? 9.8))
    return ['energy: friction holds the block: kx0 is not more than µmg; compress it more or lower mu'];
  return [];
}

export function energy(s: EnergySpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080;
  const fr = frame(W, H, k, s.title), box = fr.box, props: Prop[] = [...fr.titles];
  const plane: Plane = {id: 'p', x: [0, 1], y: [0, 1], box};
  const run = simulate(s), states = run.states, m = s.mass ?? 1, g = s.g ?? 9.8, facts = [...run.facts];
  const T = states[states.length - 1].t, lead = 1, Ts = Math.min(8, Math.max(3, T)), n = Math.min(160, states.length - 1);
  const pick = (i: number) => states[Math.round(i * (states.length - 1) / n)];
  const at = (i: number) => lead + Ts * pick(i).t / T;
  const key = (fn: (q: St) => number): Key[] => Array.from({length: n + 1}, (_, i) => (i ? [at(i), fn(pick(i)), 'linear'] : [at(i), fn(pick(i))]) as Key);
  const end = lead + Ts;
  // the drawing on the left 62% of the box, the bars on the right; world metres to pixels with the y axis up
  const bw = box[2] - box[0], bh = box[3] - box[1], dr: [number, number, number, number] = [box[0], box[1] + 0.06 * bh, box[0] + 0.56 * bw, box[3] - 0.06 * bh];
  const [[wx0, wy0], [wx1, wy1]] = run.reach, spanX = Math.max(wx1 - wx0, 1e-6), spanY = Math.max(wy1 - wy0, 1e-6);
  const ppm = Math.min(0.8 * (dr[2] - dr[0]) / spanX, 0.75 * (dr[3] - dr[1]) / (s.system === 'spring' ? spanX * 0.5 : spanY));
  const ox = (dr[0] + dr[2]) / 2 - (wx0 + wx1) / 2 * ppm, oy = s.system === 'spring' ? dr[1] + 0.62 * (dr[3] - dr[1]) : dr[3] - 0.08 * (dr[3] - dr[1]) - (s.system === 'pendulum' ? 0 : wy0 * ppm);
  const P = (p: P2): P2 => [ox + p[0] * ppm, oy - p[1] * ppm];
  const r = 26 * k;
  const ball = (id: string, pos: (q: St) => P2, fill = 'faint') =>
    props.push({id, type: 'circle', x: 0, y: 0, r, style: {fill, stroke: 'ink', width: 4 * k}, layer: 2, keys: {x: key(q => pos(q)[0]), y: key(q => pos(q)[1])}} as Prop);
  if (s.system === 'drop') {
    const h = s.h!, g0 = P([0, 0]), top = P([0, h]);
    props.push({id: 'ground', type: 'line', x1: dr[0], y1: g0[1] + r, x2: dr[2], y2: g0[1] + r, style: {stroke: 'muted', width: 4 * k}} as Prop,
      {id: 'hline', type: 'line', x1: top[0] - 90 * k, y1: top[1] + r, x2: top[0] - 90 * k, y2: g0[1] + r, style: {stroke: 'muted', width: 3 * k, dash: [8 * k, 6 * k]}} as Prop,
      text('lh', top[0] - 110 * k, (top[1] + g0[1]) / 2 + 2 * r, 'h', 32 * k, {weight: 700, align: 'end', style: {fill: 'muted'}}));
    ball('body', q => { const p = P(q.p); return [p[0], p[1]]; });
  } else if (s.system === 'slope') {
    const h = s.h!, th = (s.angle ?? 30) * DEG, run2 = h / Math.tan(th), A = P([0, h]), B = P([run2, 0]);
    // the body rides on the track: offset by its radius along the surface normal
    const nrm: P2 = [Math.sin(th), Math.cos(th)];
    props.push({id: 'ground', type: 'line', x1: dr[0], y1: B[1], x2: dr[2], y2: B[1], style: {stroke: 'muted', width: 4 * k}} as Prop,
      {id: 'track', type: 'line', x1: A[0], y1: A[1], x2: B[0], y2: B[1], style: {stroke: 'ink', width: 4 * k}} as Prop,
      {id: 'hline', type: 'line', x1: A[0] - 40 * k, y1: A[1], x2: A[0] - 40 * k, y2: B[1], style: {stroke: 'muted', width: 3 * k, dash: [8 * k, 6 * k]}} as Prop,
      text('lh', A[0] - 56 * k, (A[1] + B[1]) / 2, 'h', 32 * k, {weight: 700, align: 'end', style: {fill: 'muted'}}));
    if (s.paths === 'two') {
      const pts: P2[] = Array.from({length: 41}, (_, i) => { const x = run2 * i / 40; return P([x, h * (1 - x / run2) ** 2]); });
      props.push({id: 'curve', type: 'polyline', points: pts, style: {stroke: 'cool', width: 4 * k}} as Prop);
      ball('body', q => { const p = P(q.p); return [p[0] + nrm[0] * r, p[1] - nrm[1] * r]; });
      const cur = (q: St): P2 => {
        const x = q.extra![0], sl = -2 * h / run2 * (1 - x / run2), l = Math.hypot(1, sl), p = P(q.extra!);
        return [p[0] - sl / l * r, p[1] - 1 / l * r];
      };
      ball('body2', cur, 'cool');
    } else {
      const side = 1.8 * r;
      props.push({id: 'body', type: 'object', name: 'block', x: 0, y: 0, size: side, angle: -(s.angle ?? 30), layer: 2, label: s.label,
        keys: {x: key(q => P(q.p)[0]), y: key(q => P(q.p)[1])}} as Prop);
    }
  } else if (s.system === 'pendulum') {
    const L = s.length ?? 1, pivot = P([0, L]);
    props.push({id: 'ceiling', type: 'line', x1: pivot[0] - 80 * k, y1: pivot[1], x2: pivot[0] + 80 * k, y2: pivot[1], style: {stroke: 'muted', width: 5 * k}} as Prop,
      {id: 'rest', type: 'line', x1: pivot[0], y1: pivot[1], x2: pivot[0], y2: P([0, 0])[1], style: {stroke: 'faint', width: 2 * k, dash: [6 * k, 6 * k]}} as Prop,
      {id: 'string', type: 'line', x1: pivot[0], y1: pivot[1], x2: 0, y2: 0, style: {stroke: 'ink', width: 3 * k}, keys: {x2: key(q => P(q.p)[0]), y2: key(q => P(q.p)[1])}} as Prop,
      {id: 'low', type: 'line', x1: pivot[0] - 0.5 * L * ppm, y1: P([0, 0])[1] + r + 6 * k, x2: pivot[0] + 0.5 * L * ppm, y2: P([0, 0])[1] + r + 6 * k, style: {stroke: 'muted', width: 2 * k, dash: [10 * k, 8 * k]}} as Prop);
    ball('body', q => P(q.p), 'accent');
  } else {
    // the spring from a wall on the left; its free end follows the block while they touch
    const wallX = P([-1.5 * Math.max(...states.map(q => q.extra![0]), s.x0 ?? 0, 0.1), 0])[0], floorY = P([0, 0])[1], free = P([0, 0])[0];
    const side = Math.max(1.9 * r, 0.16 * (dr[2] - dr[0])), cy = floorY - 0.35 * side, zig = 0.18 * side;
    props.push({id: 'floor', type: 'line', x1: dr[0], y1: floorY, x2: dr[2], y2: floorY, style: {stroke: 'muted', width: 4 * k}} as Prop,
      {id: 'wall', type: 'rect', x: wallX - 22 * k, y: floorY - 1.4 * side, w: 22 * k, h: 1.4 * side, style: {fill: 'faint', stroke: 'muted', width: 3 * k}} as Prop,
      {id: 'freeend', type: 'line', x1: free, y1: floorY + 10 * k, x2: free, y2: floorY + 34 * k, style: {stroke: 'muted', width: 2 * k}} as Prop);
    const coils = 14, endAt = (q: St) => free - q.extra![0] * ppm;
    for (let i = 0; i < coils; i++) {
      const xa = (q: St) => wallX + (endAt(q) - wallX) * i / coils, xb = (q: St) => wallX + (endAt(q) - wallX) * (i + 1) / coils;
      const ya = i === 0 ? cy : cy + (i % 2 ? -zig : zig), yb = i === coils - 1 ? cy : cy + ((i + 1) % 2 ? -zig : zig);
      props.push({id: `coil${i}`, type: 'line', x1: 0, y1: ya, x2: 0, y2: yb, style: {stroke: 'ink', width: 3 * k}, keys: {x1: key(xa), x2: key(xb)}} as Prop);
    }
    props.push({id: 'body', type: 'object', name: 'block', x: 0, y: floorY, size: side, layer: 2, label: s.label,
      keys: {x: key(q => P(q.p)[0] + side / 2)}} as Prop);
  }
  // the bars: kinetic, potential, heat (with friction), total; heights at one scale
  const fric = (s.mu ?? 0) > 0, E = Math.max(states[0].K + states[0].U, 1e-9);           // the total it starts with
  const bars: [string, string, string, (q: St) => number][] = [['bK', 'accent', 'kinetic', q => q.K], ['bU', 'cool', 'potential', q => q.U],
    ...(fric ? [['bQ', 'bad', 'heat', (q: St) => q.Q]] as [string, string, string, (q: St) => number][] : []), ['bE', 'ink', 'total', q => q.K + q.U + q.Q]];
  const bx0 = box[0] + 0.62 * bw, bx1 = box[2], base = box[3] - 0.12 * bh, tall = 0.62 * bh, step = (bx1 - bx0) / bars.length, wbar = 0.62 * step;
  props.push({id: 'bbase', type: 'line', x1: bx0, y1: base, x2: bx1, y2: base, style: {stroke: 'muted', width: 2 * k}} as Prop);
  bars.forEach(([id, fill, name, val], i) => {
    const x = bx0 + step * i + (step - wbar) / 2;
    props.push({id, type: 'rect', x, y: base, w: wbar, h: 0, style: id === 'bE' ? {fill: 'faint', stroke: 'ink', width: 3 * k} : {fill, opacity: 0.85}, show: [0.3, 1e9],
      keys: {y: key(q => base - val(q) / E * tall), h: key(q => Math.max(1e-6, val(q) / E * tall))}} as Prop,
      // names under their bars, staggered when four would run together
      text(`l${id}`, x + wbar / 2, base + (bars.length > 3 && i % 2 ? 60 : 32) * k, name, 24 * k, {weight: 700, align: 'middle', style: {fill: id === 'bE' ? 'ink' : fill}}));
  });
  // readouts, live, then the story
  const px = fr.px, ptext = panel(W, k);
  let row = fr.row;
  const ro = (id: string, t: string, measures: Record<string, Key[]>) => {
    props.push({id, type: 'readout', x: px, y: row, size: 28 * k, text: t, decimals: 2, show: [0.3, 1e9],
      measures: Object.fromEntries(Object.entries(measures).map(([nm, keys]) => [nm, {kind: 'keys', keys}]))} as Prop);
    row += 1.35 * 28 * k;
  };
  if (s.system === 'spring') ro('rox', 'compression x = {x} m', {x: key(q => q.extra![0])});
  else ro('roh', 'height h = {h} m', {h: key(q => q.p[1])});
  ro('rov', 'speed v = {v} m/s', {v: key(q => q.v)});
  ro('rok', 'K = ½mv² = {K} J', {K: key(q => q.K)});
  ro('rou', s.system === 'spring' ? 'U = ½kx² = {U} J' : 'U = mgh = {U} J', {U: key(q => q.U)});
  if (fric) ro('roq', 'heat = {Q} J', {Q: key(q => q.Q)});
  row += 8 * k;
  const line = (id: string, t: string, when: number, extra: Partial<Prop> = {}) => {
    props.push(ptext(id, px, row, t, 27 * k, {show: [when, 1e9], ...extra}));
    row += wrapText(t, 27 * k, W - px - 40 * k).length * 1.28 * 27 * k + 5 * k;
  };
  const story: Record<string, string> = {
    drop: 'As it falls, potential energy turns into kinetic energy; the total stays the same',
    slope: s.paths === 'two' ? 'Gravity is conservative: the speed at the bottom depends only on the height, not on the path'
      : fric ? 'Friction turns some energy into heat: K + U falls, but K + U + heat stays the same' : 'Down the slope, potential energy turns into kinetic energy; the total stays the same',
    pendulum: 'At the ends: all potential energy, at rest; at the bottom: all kinetic energy, fastest',
    spring: fric ? 'The spring stores ½kx²; friction turns some energy into heat' : 'The spring stores the kinetic energy as ½kx², and gives it back',
  };
  line('s1', story[s.system], lead, {weight: 700});
  line('s2', fric ? 'K + U + heat = constant' : 'K + U = constant: mechanical energy is conserved', lead + 0.8, {style: {fill: 'muted'}});
  facts.slice(0, 2).forEach((t, i) => line(`f${i}`, t[0].toUpperCase() + t.slice(1), end + 0.3 + 0.7 * i));
  facts.push(`total energy = ${f(E)} J`, `mass = ${f(m)} kg, g = ${f(g)} m/s²`);
  return scene(s, W, H, end + 2.6, plane, props, [], {verb: 'energy', facts});
}
