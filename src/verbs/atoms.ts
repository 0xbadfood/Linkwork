// Class 12 Atoms (leph2-04, 2026-11-04): two verbs, every distance, angle, energy and wavelength computed from e, h,
// the electron's mass, ε₀ and the nuclear charge.
//
// rutherford  models: Thomson's sphere of positive charge beside Rutherford's tiny nucleus, α-particles crossing each:
//             all pass nearly straight through the spread-out charge; the nucleus turns a few aside and one back.
//             scattering: Fig. 12.4, α paths past a gold nucleus at several impact parameters b, integrated under the
//             Coulomb repulsion, each deflected by θ with cot(θ/2) = 2b/d. closest: Example 12.2, a head-on α slowing
//             to rest at d = 2Ze²/4πε₀K and turning back, its kinetic energy turned into potential energy.
// bohr        classical: the electron on a circle round the proton, the Coulomb pull as its centripetal force,
//             K = e²/8πε₀r, U = −2K, E = −K (Examples 12.3, 12.4). spiral: classical electromagnetism's verdict, the
//             accelerating electron radiates and spirals in, its frequency changing all the way. orbits: Bohr's orbits
//             to one scale, rₙ = n²a₀, vₙ = v₁/n, Lₙ = nh/2π, each electron going round at its true relative rate.
//             standing: Fig. 12.8, de Broglie's standing wave round orbit n, 2πrₙ = nλ; a wave that does not fit does
//             not join itself. levels: Fig. 12.7, Eₙ = −13.6/n² eV to one scale with the continuum above 0 and the
//             transitions of the Lyman, Balmer, Paschen, Brackett and Pfund series. spectrum: Fig. 12.5, one series'
//             lines on a wavelength strip, crowding to the series limit.
import {kit} from './potential.ts';
import {sci} from './electric.ts';
import {wavelengthColour} from '../physics/light.ts';
import {H, E, C, ME} from './dual-nature.ts';
import type {Prop, Scene} from '../scene.ts';

type P2 = [number, number];
type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const sig = (v: number, p = 3) => String(+v.toPrecision(p));
const halo = (k: number, fill: string, extra: Record<string, unknown> = {}) => ({...extra, style: {fill, stroke: 'paper', width: 6 * k}});
const only = (s: Record<string, unknown>, verb: string, show: string, allowed: string[], all: string[]) =>
  all.filter(f => s[f] !== undefined && !allowed.includes(f)).map(f => `${verb}: ${f} is not used by show ${show}; leave it out`);
const SUB = '₀₁₂₃₄₅₆₇₈₉', sub = (n: number) => String(n).split('').map(c => SUB[+c]).join('');
const deg = (rad: number) => rad * 180 / Math.PI;
const ev = (v: number) => sig(v).replace('-', '−');

export const EPS0 = 8.854e-12;
/** e²/4πε₀ in MeV fm (1.44). */
export const COULOMB_MEV_FM = E * E / (4 * Math.PI * EPS0) / 1.602e-13 / 1e-15;
/** Bohr radius a₀ = ε₀h²/πme² in m (5.29 × 10⁻¹¹). */
export const A0 = EPS0 * H * H / (Math.PI * ME * E * E);
/** Hydrogen's ground-state binding energy me⁴/8ε₀²h² in eV (13.6). */
export const E1 = ME * E ** 4 / (8 * EPS0 ** 2 * H ** 2) / E;
/** Example 12.2: the distance of closest approach in fm of an α (charge 2e) of K MeV to a nucleus of charge Ze. */
export const closestFm = (kMeV: number, Z = 79) => 2 * Z * COULOMB_MEV_FM / kMeV;
/** Rutherford: the deflection (radians) of an α at impact parameter b, cot(θ/2) = 2b/d (head-on, b = 0: θ = π). */
export const deflection = (bFm: number, dFm: number) => 2 * Math.atan2(dFm, 2 * Math.abs(bFm));
/** Bohr: rₙ = n²a₀ (m), vₙ = v₁/n (m/s), Eₙ = −13.6/n² (eV). */
export const bohrRadius = (n: number) => n * n * A0;
export const bohrSpeed = (n: number) => E * E / (2 * EPS0 * H) / n;
export const levelEv = (n: number) => -E1 / (n * n);
/** The wavelength (nm) of the photon emitted from level ni down to nf. */
export const lineNm = (ni: number, nf: number) => H * C / ((levelEv(ni) - levelEv(nf)) * E) * 1e9;
/** Classical: an electron on a circle of radius r (m) round a proton: speed (m/s), kinetic energy (eV), revolution frequency (Hz). */
export const classical = (r: number) => { const v = Math.sqrt(E * E / (4 * Math.PI * EPS0 * ME * r)); return {v, K: E * E / (8 * Math.PI * EPS0 * r) / E, nu: v / (2 * Math.PI * r)}; };

/** An α's path past a repelling nucleus at the origin, lengths in fm, speed 1 far away: points with the time at each.
 * a = (d/2)/r² outward (U = Kd/r, K = ½mv², so F/m = v²d/2r²); it starts at x = −L, y = b and stops on leaving the box. */
export function alphaPath(b: number, d: number, L: number, box: [number, number, number, number]): {pts: P2[]; ts: number[]} {
  let x = -L, y = b, vx = 1, vy = 0, t = 0;
  const acc = (px: number, py: number): P2 => { const r = Math.hypot(px, py), f = d / 2 / (r * r * r); return [f * px, f * py]; };
  const pts: P2[] = [[x, y]], ts = [0];
  for (let i = 0; i < 20000; i++) {
    const r = Math.hypot(x, y), dt = Math.min(.02 * L, .02 * Math.max(r, d / 4));
    // RK4 on (x, y, vx, vy)
    const k1 = acc(x, y), k2 = acc(x + vx * dt / 2, y + vy * dt / 2), k3 = acc(x + (vx + k2[0] * dt / 2) * dt / 2, y + (vy + k2[1] * dt / 2) * dt / 2);
    const k4 = acc(x + (vx + k3[0] * dt / 2) * dt, y + (vy + k3[1] * dt / 2) * dt);
    x += dt * (vx + dt / 6 * (k1[0] + k2[0] + k3[0])); y += dt * (vy + dt / 6 * (k1[1] + k2[1] + k3[1]));
    vx += dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); vy += dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    t += dt; pts.push([x, y]); ts.push(t);
    if (x < box[0] || x > box[2] || y < box[1] || y > box[3]) break;
  }
  return {pts, ts};
}

// ------------------------------------------------------------------------------------------------------- rutherford
export const RUTHERFORD_SHOWS = ['models', 'scattering', 'closest'] as const;
export type RutherfordSpec = Common & {verb: 'rutherford'; show: (typeof RUTHERFORD_SHOWS)[number];
  /** the α-particles' kinetic energy in MeV (default 5.5, Geiger and Marsden's; Example 12.2: 7.7). */
  energy?: number;
  /** the nucleus's atomic number (default 79, gold). */
  Z?: number;
  /** scattering: impact parameters in fm, one to six (default four from head-on to well wide). */
  impacts?: number[];
  /** closest: the picture's width in fm, held whatever the energy (a play's one scale); left out, it fits d. */
  span?: number};
const RUTH_FIELDS = ['energy', 'Z', 'impacts', 'span'];

export function rutherfordErrors(s: RutherfordSpec): string[] {
  const W = 'rutherford', e: string[] = [];
  if (!RUTHERFORD_SHOWS.includes(s.show)) return [`${W}: show is one of ${RUTHERFORD_SHOWS.join(', ')}`];
  e.push(...only(s as never, W, s.show, s.show === 'models' ? [] : s.show === 'closest' ? ['energy', 'Z', 'span'] : ['energy', 'Z', 'impacts'], RUTH_FIELDS));
  if (s.energy !== undefined && !(isNum(s.energy) && s.energy >= 1 && s.energy <= 10)) e.push(`${W}: energy is the α's kinetic energy in MeV, 1 to 10 (natural α-particles reach 7.7)`);
  if (s.Z !== undefined && !(Number.isInteger(s.Z) && s.Z >= 2 && s.Z <= 92)) e.push(`${W}: Z is a whole number, 2 to 92 (gold is 79)`);
  if (s.span !== undefined && !(isNum(s.span) && s.span >= 20 && s.span <= 1000)) e.push(`${W}: span is the picture's width in fm, 20 to 1000`);
  else if (s.span !== undefined && closestFm(s.energy ?? 5.5, s.Z ?? 79) > .85 * s.span) e.push(`${W}: d = ${sig(closestFm(s.energy ?? 5.5, s.Z ?? 79))} fm does not fit a span of ${s.span} fm; raise span or the energy`);
  if (s.impacts !== undefined) {
    if (!(Array.isArray(s.impacts) && s.impacts.length >= 1 && s.impacts.length <= 6 && s.impacts.every(isNum))) e.push(`${W}: impacts is one to six impact parameters in fm`);
    else {
      const d = closestFm(s.energy ?? 5.5, s.Z ?? 79);
      if (s.impacts.some(b => Math.abs(b) > 4 * d)) e.push(`${W}: impacts beyond ${sig(4 * d)} fm (four times the closest approach) are barely deflected and leave the picture; use smaller ones`);
      if (new Set(s.impacts).size !== s.impacts.length) e.push(`${W}: impacts are all different`);
    }
  }
  return e;
}

export function rutherford(s: RutherfordSpec): Scene {
  const {k, props, bx, by, bw, bh, arrow, line, poly, label, charge, keysOf, finish} = kit(s);
  const num = !s.illustrative, facts: string[] = [], anchors: Record<string, P2> = {};
  const K = s.energy ?? 5.5, Z = s.Z ?? 79, d = closestFm(K, Z);
  let dur = 7, story = '', second = '';
  // a moving α: a small dot with its path drawn on behind it
  const mover = (id: string, path: P2[], at: (t: number) => number, fill = 'accent') => {
    poly(path, fill, 3, {draw: 0, keys: {draw: keysOf(dur, at)}, layer: 2});
    const idx = (t: number) => Math.min(path.length - 1, Math.max(0, Math.round(at(t) * (path.length - 1))));
    props.push({id, type: 'circle', x: path[0][0], y: path[0][1], r: 7 * k, style: {fill, stroke: 'ink', width: 1.5 * k}, layer: 4,
      keys: {x: keysOf(dur, t => path[idx(t)][0]), y: keysOf(dur, t => path[idx(t)][1])}} as Prop);
  };
  // a path's share drawn at scene time t, the beam's clock running from T0 to T1 over path time 0 to tMax
  const share = (ts: number[], tMax: number, T0: number, T1: number) => (t: number) => {
    const pt = (t - T0) / (T1 - T0) * tMax; if (pt <= 0) return 0; if (pt >= ts[ts.length - 1]) return 1;
    let lo = 0, hi = ts.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ts[m] < pt) lo = m; else hi = m; }
    return hi / (ts.length - 1);
  };

  if (s.show === 'models') {
    // two atoms side by side, the same size; five α-particles cross each from the left
    const R = Math.min(bw * .15, bh * .3), cy = by + bh * .5, cxs = [bx + bw * .25, bx + bw * .75];
    const ys = [-.8, -.4, -.07, .3, .7];
    dur = 7.4;
    cxs.forEach((cx, side) => {
      if (side === 0) {
        props.push({id: 'thomson', type: 'circle', x: cx, y: cy, r: R, style: {fill: 'bad', opacity: .22, stroke: 'bad', width: 2 * k}, layer: 1} as Prop);
        for (let j = 0; j < 9; j++) { const a = j * 2.4, rr = R * (.25 + .6 * ((j * .618) % 1)); charge(cx + rr * Math.cos(a), cy + rr * Math.sin(a), -1, 11); }
        label(cx, cy - R - 60 * k, 'Thomson', 'ink', 26); label(cx, cy + R + 50 * k, 'charge spread through it', 'muted', 22);
      } else {
        for (const f of [.45, .85]) props.push({id: `shell${f}`, type: 'circle', x: cx, y: cy, r: R * f, style: {stroke: 'faint', width: 1.5 * k}, layer: 1} as Prop);
        props.push({id: 'nucleus', type: 'circle', x: cx, y: cy, r: 6 * k, style: {fill: 'bad'}, layer: 3} as Prop);
        for (let j = 0; j < 4; j++) { const a = .7 + j * 1.6, rr = R * (j % 2 ? .45 : .85); charge(cx + rr * Math.cos(a), cy + rr * Math.sin(a), -1, 11); }
        label(cx, cy - R - 60 * k, 'Rutherford', 'ink', 26); label(cx, cy + R + 50 * k, 'charge in a tiny nucleus', 'muted', 22);
      }
      // the paths: straight through Thomson's atom; past the nucleus, integrated with an exaggerated closest approach
      // (the true one would not show at this scale), so the near ones turn and the head-on one comes back
      const L = 1.45 * R, dd = R * .09;
      ys.forEach((f, j) => {
        let pts: P2[], ts: number[];
        if (side === 0) { pts = [[-L, f * R], [L, f * R * 1.01]]; ts = [0, 2 * L]; }
        else ({pts, ts} = alphaPath(f * R * (j === 2 ? .03 : 1), dd, L, [-L, -L, L, L]));
        const path = pts.map(([x, y]) => [cx + x, cy - y] as P2);
        mover(`alpha${side}-${j}`, path, share(ts, 2 * L * 1.1, .8 + j * .25, 5.6 + j * .25), 'accent');
      });
    });
    label(bx + bw * .02, by + bh * .06, 'α-particles', 'accent', 24, {align: 'start'});
    anchors.thomson = [cxs[0], cy - R]; anchors.rutherford = [cxs[1], cy - R]; anchors.nucleus = [cxs[1], cy];
    story = 'α-particles pass almost straight through a spread-out charge; only a tiny, dense nucleus can turn one back';
    second = 'Geiger and Marsden saw a few bounce back, so Rutherford put the positive charge in a nucleus';
    facts.push('about 0.14% of α-particles scatter by more than 1°; about 1 in 8000 by more than 90° (Geiger and Marsden)', 'the paths past the nucleus are drawn with its pull exaggerated: at true scale it is far smaller than the atom');
  }

  if (s.show === 'scattering') {
    // Fig. 12.4: the nucleus near the bottom middle, the beam coming in from the left above the axis, one scale in fm
    const bs = (s.impacts ?? [0, .25 * d, .5 * d, d, 2 * d].slice(0, 5)).slice().sort((a, b) => a - b);
    const below = bs.some(b => b < 0), bmax = Math.max(...bs.map(Math.abs), d);
    const L = Math.max(3 * d, 1.5 * bmax), sc = bw * .5 / L;
    const cx = bx + bw * .5, cy = below ? by + bh * .5 : by + bh * .8;
    const box: [number, number, number, number] = [-L, (cy - (by + bh)) / sc, L, (cy - by) / sc];
    line([bx, cy], [bx + bw, cy], 'faint', 2, {}, true);
    props.push({id: 'nucleus', type: 'circle', x: cx, y: cy, r: 12 * k, style: {fill: 'bad', stroke: 'ink', width: 2 * k}, layer: 3} as Prop);
    label(cx, cy + 44 * k, num && Z === 79 ? 'gold nucleus, charge +79e' : num ? `nucleus, charge +${Z}e` : 'nucleus', 'bad', 22);
    const paths = bs.map(b => alphaPath(b, d, L, box)), tMax = Math.max(...paths.map(p => p.ts[p.ts.length - 1]));
    dur = 7.6;
    const tones = ['bad', 'accent', 'good', 'cool', 'ink', 'muted'];
    let lastY = -1e9;
    paths.forEach(({pts, ts}, j) => {
      const path = pts.map(([x, y]) => [cx + x * sc, cy - y * sc] as P2), b = bs[j], th = deflection(b, d), end = path[path.length - 1];
      mover(`alpha${j + 1}`, path, share(ts, tMax, .8, 6.4), tones[j]);
      anchors[`alpha${j + 1}`] = end;
      // θ at the exit, read inwards from the edge, stepped clear of the one before
      const lx = Math.min(Math.max(end[0], bx + 70 * k), bx + bw - 70 * k);
      let ly = Math.min(Math.max(end[1] + (end[1] < by + 30 * k ? 34 * k : -14 * k), by + 30 * k), by + bh - 10 * k);
      if (Math.abs(ly - lastY) < 30 * k) ly = lastY + 30 * k; lastY = ly;
      label(lx, ly, num ? `θ = ${Math.round(deg(th))}°` : 'θ', tones[j], 22, halo(k, tones[j], {show: [6.4, 1e9]}));
      facts.push(`b = ${sig(b)} fm: θ = ${Math.round(deg(th))}°`);
    });
    // b as a measuring bracket at the start, on the first path tall enough to read; a b too small for two heads between
    // them (5 fm against d = 41 fm, leph2-04 C2, 2026-11-04) is marked as a dimension, its arrows pointing in from outside
    const pos = bs.filter(b => b > 0), bb = pos.find(b => b * sc >= 40 * k) ?? pos[pos.length - 1];
    if (bb !== undefined) {
      const x = bx + bw * .22, h = bb * sc, at = {show: [.5, 1e9]};
      if (h >= 40 * k) { arrow([x, cy], [x, cy - h], 'muted', 2.5, at); arrow([x, cy - h], [x, cy], 'muted', 2.5, at); }
      else { arrow([x, cy + 30 * k], [x, cy], 'muted', 2.5, at); arrow([x, cy - h - 30 * k], [x, cy - h], 'muted', 2.5, at); }
      // beside the bracket, or under the axis by the lower arrow when the gap is too narrow for the letter
      label(x + 12 * k, h >= 40 * k ? cy - h / 2 + 8 * k : cy + 28 * k, 'b', 'muted', 24, {align: 'start', ...at});
      anchors.b = [x, cy - h / 2];
    }
    label(bx + bw, by + bh - 4 * k, num ? `α at ${sig(K)} MeV; scale: ${sig(2 * L, 2)} fm across` : '', 'faint', 20, {align: 'end'});
    anchors.nucleus = [cx, cy];
    story = 'The nearer an α-particle heads to the nucleus, the more it is turned; head-on, it comes straight back';
    second = 'The impact parameter b sets the deflection θ: a small b means a large θ';
    facts.unshift(`closest approach d = 2Ze²/4πε₀K = ${sig(d)} fm; cot(θ/2) = 2b/d`);
  }

  if (s.show === 'closest') {
    // head-on along the axis: the α slows as it climbs the Coulomb hill, stops at d, and goes back
    const L = s.span ?? 5 * d, sc = bw * .8 / L, cy = by + bh * .36, nx = bx + bw * .9;
    const {pts, ts} = alphaPath(0, d, L, [-L, -1, L, 1]);
    line([bx, cy], [nx, cy], 'faint', 2, {}, true);
    props.push({id: 'nucleus', type: 'circle', x: nx, y: cy, r: 14 * k, style: {fill: 'bad', stroke: 'ink', width: 2 * k}, layer: 3} as Prop);
    label(nx, cy + 46 * k, num && Z === 79 ? 'gold, +79e' : num ? `+${Z}e` : 'nucleus', 'bad', 22);
    const path = pts.map(([x]) => [nx + x * sc, cy] as P2), tEnd = ts[ts.length - 1];
    dur = 8;
    const at = share(ts, tEnd, .8, 6.8);
    const idx = (t: number) => Math.min(path.length - 1, Math.round(at(t) * (path.length - 1)));
    props.push({id: 'alpha', type: 'circle', x: path[0][0], y: cy, r: 10 * k, style: {fill: 'accent', stroke: 'ink', width: 2 * k}, layer: 4, keys: {x: keysOf(dur, t => path[idx(t)][0])}} as Prop);
    label(bx + 10 * k, cy - 30 * k, num ? `α, ${sig(K)} MeV` : 'α', 'accent', 24, {align: 'start'});
    // d marked once it has stopped (the turning point is the middle of the path's time)
    const tStop = .8 + 6 * .5, xs = nx - d * sc;
    arrow([xs, cy - 60 * k], [nx, cy - 60 * k], 'good', 3, {show: [tStop, 1e9]}); arrow([nx, cy - 60 * k], [xs, cy - 60 * k], 'good', 3, {show: [tStop, 1e9]});
    label((xs + nx) / 2, cy - 76 * k, num ? `d = ${sig(d)} fm` : 'd', 'good', 26, halo(k, 'good', {show: [tStop, 1e9]}));
    // the energy bar: K (accent) giving way to U (bad), their sum fixed
    const ex0 = bx + bw * .1, ex1 = bx + bw * .9, ey = by + bh * .72, eh = 34 * k;
    const xAt = (t: number) => path[idx(t)][0], kFrac = (t: number) => Math.max(0, 1 - d / Math.max(d, (nx - xAt(t)) / sc));
    props.push({id: 'Ubar', type: 'rect', x: ex0, y: ey, w: ex1 - ex0, h: eh, style: {fill: 'bad', opacity: .7}, layer: 2} as Prop);
    props.push({id: 'Kbar', type: 'rect', x: ex0, y: ey, w: ex1 - ex0, h: eh, style: {fill: 'accent'}, layer: 3, keys: {w: keysOf(dur, t => (ex1 - ex0) * kFrac(t))}} as Prop);
    label(ex0, ey - 16 * k, 'kinetic energy K', 'accent', 22, {align: 'start'}); label(ex1, ey - 16 * k, 'potential energy U', 'bad', 22, {align: 'end'});
    label((ex0 + ex1) / 2, ey + eh + 34 * k, 'K + U stays the same', 'muted', 22);
    anchors.nucleus = [nx, cy]; anchors.alpha = [xs, cy]; anchors.d = [(xs + nx) / 2, cy - 60 * k];
    story = 'Head-on, the α-particle slows as it nears the nucleus, stops for an instant at d, and is pushed back';
    second = 'All its kinetic energy has become potential energy there: the nucleus must be smaller than d';
    facts.push(`K = 2Ze²/4πε₀d, so d = 2 × ${Z} × ${sig(COULOMB_MEV_FM)} MeV fm / ${sig(K)} MeV = ${sig(d)} fm`, `the nucleus's radius is less than ${sci(d * 1e-15, 'm')}`);
  }
  return finish('rutherford', s as never, dur, story, second, facts, anchors, s.illustrative);
}

// ------------------------------------------------------------------------------------------------------------- bohr
export const BOHR_SHOWS = ['classical', 'spiral', 'orbits', 'standing', 'levels', 'spectrum'] as const;
export const SERIES: Record<string, number> = {lyman: 1, balmer: 2, paschen: 3, brackett: 4, pfund: 5};
export type BohrSpec = Common & {verb: 'bohr'; show: (typeof BOHR_SHOWS)[number];
  /** classical: the energy needed to free the electron, eV (Example 12.3: 13.6, the default), or its orbit's radius in m. */
  energy?: number; radius?: number;
  /** orbits: how many orbits, 2 to 4 (default 3). standing: the orbit n (default 4, Fig. 12.8); a number that is not
   * whole (3.5) draws a wave that does not join itself. */
  n?: number;
  /** levels: the series whose transitions are drawn (default lyman, balmer, paschen); spectrum: one series (default balmer). */
  series?: string[] | string};
const BOHR_FIELDS = ['energy', 'radius', 'n', 'series'];

export function bohrErrors(s: BohrSpec): string[] {
  const W = 'bohr', e: string[] = [];
  if (!BOHR_SHOWS.includes(s.show)) return [`${W}: show is one of ${BOHR_SHOWS.join(', ')}`];
  const allowed: Record<string, string[]> = {classical: ['energy', 'radius'], spiral: [], orbits: ['n'], standing: ['n'], levels: ['series'], spectrum: ['series']};
  e.push(...only(s as never, W, s.show, allowed[s.show], BOHR_FIELDS));
  if (s.energy !== undefined && s.radius !== undefined) e.push(`${W}: give energy or radius, not both`);
  if (s.energy !== undefined && !(isNum(s.energy) && s.energy >= 1 && s.energy <= 100)) e.push(`${W}: energy is the energy to free the electron, eV, 1 to 100 (13.6 for hydrogen)`);
  if (s.radius !== undefined && !(isNum(s.radius) && s.radius >= 1e-11 && s.radius <= 1e-9)) e.push(`${W}: radius is in m, 1e-11 to 1e-9 (hydrogen's is 5.3e-11)`);
  if (s.n !== undefined) {
    if (s.show === 'orbits' && !(Number.isInteger(s.n) && s.n >= 2 && s.n <= 4)) e.push(`${W}: orbits draws 2 to 4 orbits to one scale (n)`);
    if (s.show === 'standing' && !(isNum(s.n) && s.n >= 1 && s.n <= 8)) e.push(`${W}: n is the orbit, 1 to 8 (not whole, such as 3.5, for a wave that does not fit)`);
  }
  if (s.series !== undefined) {
    const list = Array.isArray(s.series) ? s.series : [s.series], names = Object.keys(SERIES).join(', ');
    if (s.show === 'spectrum' && Array.isArray(s.series) && s.series.length !== 1) e.push(`${W}: spectrum draws one series`);
    else if (!(list.length >= 1 && list.length <= 5 && list.every(x => typeof x === 'string' && x in SERIES))) e.push(`${W}: series is one or more of ${names}`);
    else if (new Set(list).size !== list.length) e.push(`${W}: series are all different`);
  }
  return e;
}

export function bohr(s: BohrSpec): Scene {
  const {k, props, bx, by, bw, bh, arrow, line, poly, label, ring, charge, keysOf, finish} = kit(s);
  const num = !s.illustrative, facts: string[] = [], anchors: Record<string, P2> = {};
  let dur = 7, story = '', second = '';
  const cx = bx + bw * .42, cy = by + bh * .5;
  const proton = () => { charge(cx, cy, 1, 16); anchors.proton = [cx, cy]; };
  const orbiter = (id: string, R: number, period: number, phase = 0, fill = 'cool') => {
    const ang = (t: number) => phase + 2 * Math.PI * t / period;
    props.push({id, type: 'circle', x: cx + R * Math.cos(phase), y: cy - R * Math.sin(phase), r: 10 * k, style: {fill, stroke: 'ink', width: 2 * k}, layer: 4,
      keys: {x: keysOf(dur, t => cx + R * Math.cos(ang(t)), 48), y: keysOf(dur, t => cy - R * Math.sin(ang(t)), 48)}} as Prop);
  };

  if (s.show === 'classical') {
    const r = s.radius ?? E * E / (8 * Math.PI * EPS0 * (s.energy ?? E1) * E), {v, K, nu} = classical(r), R = Math.min(bw * .3, bh * .36);
    proton(); ring([cx, cy], R, R, 'faint', 2, true);
    dur = 7; orbiter('electron', R, 3.5, Math.PI / 2);
    // the velocity along the circle and the pull towards the proton ride with the electron (leph2-04 C1 drew them
    // fixed at the top while it went round, v pointing against its motion); their names sit in a key below
    const ang = (t: number) => Math.PI / 2 + 2 * Math.PI * t / 3.5, top: P2 = [cx, cy - R];
    const at = (t: number, rr: number): P2 => [cx + rr * Math.cos(ang(t)), cy - rr * Math.sin(ang(t))];
    const tip = (t: number): P2 => [at(t, R)[0] - R * .55 * Math.sin(ang(t)), at(t, R)[1] - R * .55 * Math.cos(ang(t))];
    const ride = (to: (t: number) => P2) => ({keys: {x1: keysOf(dur, t => at(t, R)[0], 48), y1: keysOf(dur, t => at(t, R)[1], 48),
      x2: keysOf(dur, t => to(t)[0], 48), y2: keysOf(dur, t => to(t)[1], 48)}});
    arrow(top, tip(0), 'good', 4, ride(tip));
    arrow(top, at(0, R * .45), 'bad', 4, ride(t => at(t, R * .45)));
    const ky = cy + R + 44 * k;
    label(cx - R * .55, ky, 'v, along the orbit', 'good', 22); label(cx + R * .55, ky, 'Coulomb pull', 'bad', 22);
    // K, U and E as bars on one energy scale, zero at the line
    const zx0 = bx + bw * .82, zy = by + bh * .32, sc = bh * .5 / (2 * K), bwid = bw * .045;
    line([zx0 - bwid, zy], [zx0 + 3 * bwid * 1.6, zy], 'ink', 2);
    const bars: [string, number, string][] = [['K', K, 'good'], ['U', -2 * K, 'bad'], ['E', -K, 'accent']];
    bars.forEach(([n, ev, c], j) => {
      const x = zx0 + j * bwid * 1.6, h = Math.abs(ev) * sc;
      props.push({id: `bar${n}`, type: 'rect', x, y: ev > 0 ? zy - h : zy, w: bwid, h, style: {fill: c, opacity: .85}, layer: 2} as Prop);
      label(x + bwid / 2, ev > 0 ? zy - h - 12 * k : zy + h + 30 * k, n, c, 24);
    });
    label(zx0 - bwid - 8 * k, zy + 8 * k, '0', 'muted', 20, {align: 'end'});
    anchors.electron = top; anchors.energy = [zx0 + bwid * 1.6, zy];
    story = "The proton's Coulomb pull is the electron's centripetal force: the faster it goes, the closer it can circle";
    second = 'Its kinetic energy is half the size of its potential energy, so its total energy is negative: it is bound';
    facts.push(`r = ${sci(r, 'm')}: K = e²/8πε₀r = ${sig(K)} eV, U = −e²/4πε₀r = ${ev(-2 * K)} eV, E = ${ev(-K)} eV`,
      `v = ${sci(v, 'm/s')}; it goes round ${sci(nu, 'times a second')} (ν = v/2πr)`);
  }

  if (s.show === 'spiral') {
    // classical electromagnetism: an accelerating charge radiates, so the electron loses energy and spirals in; r³ falls
    // steadily with time, and the frequency of revolution (and of the light) climbs as it goes
    const R0 = Math.min(bw * .32, bh * .38), T = 5.4, t0 = .6, rAt = (t: number) => R0 * Math.max(.04, 1 - Math.max(0, t - t0) / T) ** (1 / 3);
    proton(); ring([cx, cy], R0, R0, 'faint', 2, true);
    dur = 7.2;
    let a = Math.PI / 2; const pts: P2[] = [], dt = .004, angs: number[] = [];
    for (let t = 0; t <= dur; t += dt) { const r = rAt(t); a += dt * 2.2 * (R0 / r) ** 1.5; pts.push([cx + r * Math.cos(a), cy - r * Math.sin(a)]); angs.push(a); }
    const at = (t: number) => Math.min(1, Math.max(0, t / dur));
    poly(pts, 'cool', 2, {draw: 0, keys: {draw: keysOf(dur, at, 48)}, layer: 2});
    const idx = (t: number) => Math.min(pts.length - 1, Math.round(at(t) * (pts.length - 1)));
    props.push({id: 'electron', type: 'circle', x: pts[0][0], y: pts[0][1], r: 10 * k, style: {fill: 'cool', stroke: 'ink', width: 2 * k}, layer: 4,
      keys: {x: keysOf(dur, t => pts[idx(t)][0], 48), y: keysOf(dur, t => pts[idx(t)][1], 48), opacity: keysOf(dur, t => (t > t0 + T * .96 ? 0 : 1))}} as Prop);
    // light given off all the way, its waves getting shorter as the revolutions speed up
    for (let j = 0; j < 4; j++) {
      const t1 = 1 + j * 1.3, r = rAt(t1), ang = -.5 + j * .15, wl = 34 * k * (r / R0) ** 1.5 + 6 * k, x0 = cx + (r + 30 * k) * Math.cos(ang), y0 = cy - (r + 30 * k) * Math.sin(ang);
      const w = Array.from({length: 61}, (_, i) => { const u = i / 60 * 160 * k; return [x0 + u * Math.cos(ang) + 8 * k * Math.sin(2 * Math.PI * u / wl) * Math.sin(ang), y0 - u * Math.sin(ang) + 8 * k * Math.sin(2 * Math.PI * u / wl) * Math.cos(ang)] as P2; });
      poly(w, 'accent', 3, {draw: 0, keys: {draw: [[t1, 0], [t1 + .8, 1, 'linear']]}, layer: 3});
    }
    label(cx + R0 * .95, cy - R0 * .9, 'light, ever higher in frequency', 'accent', 22, {align: 'start', show: [1.6, 1e9]});
    anchors.electron = [cx, cy - R0];
    story = 'Classically, the circling electron is accelerating, so it radiates, loses energy and spirals into the nucleus';
    second = 'Its frequency would change all the way in, giving a continuous spectrum: atoms would collapse, and they do not';
    const {nu} = classical(A0);
    facts.push(`starting on hydrogen's orbit (${sci(A0, 'm')}) it goes round ${sci(nu, 'times a second')}: light of ${sci(nu, 'Hz')} (Example 12.4)`);
  }

  if (s.show === 'orbits') {
    const N = s.n ?? 3, R1 = Math.min(bw * .34, bh * .42) / (N * N);
    proton();
    dur = 8;
    for (let n = 1; n <= N; n++) {
      const R = R1 * n * n;
      ring([cx, cy], R, R, 'faint', 2, true);
      // the true ratio of periods, Tₙ ∝ n³: the first goes round in 1.6 s
      orbiter(`electron${n}`, R, 1.6 * n ** 3, Math.PI / 2 + n * .9);
      const lx = cx + R * Math.cos(Math.PI / 4), ly = cy + R * Math.sin(Math.PI / 4) + 26 * k;
      label(lx + 8 * k, ly, num ? `n = ${n}` : `r${sub(n)}`, 'muted', 22, {align: 'start'});
      anchors[`orbit${n}`] = [cx, cy - R];
      facts.push(`n = ${n}: r = ${n === 1 ? '' : n * n}a₀ = ${sci(bohrRadius(n), 'm')}, v = ${sci(bohrSpeed(n), 'm/s')}, L = ${n === 1 ? '' : n}h/2π`);
    }
    story = 'Only certain orbits are allowed: the radius grows with the square of n, and the speed falls as n grows';
    second = 'On each the electron does not radiate; its angular momentum is a whole number of units of h over two pi';
    label(bx + bw * .02, by + bh * .97, num ? 'drawn to one scale; each goes round at its true relative rate' : 'drawn to one scale', 'faint', 20, {align: 'start'});
  }

  if (s.show === 'standing') {
    const n = s.n ?? 4, whole = Math.abs(n - Math.round(n)) < 1e-9, R = Math.min(bw * .3, bh * .36), A = R * .12, M = 360;
    proton(); ring([cx, cy], R, R, 'faint', 2, true);
    dur = 7;
    const wave = (sign: number, turns = 1) => Array.from({length: M * turns + 1}, (_, i) => {
      const f = i / M * 2 * Math.PI, rr = R + sign * A * Math.sin(n * f); return [cx + rr * Math.cos(f + Math.PI / 2), cy - rr * Math.sin(f + Math.PI / 2)] as P2; });
    if (whole) {
      // the standing wave: its two extremes in turn, the nodes fixed
      const swing = (phase: number) => keysOf(dur, t => t < .6 ? 0 : .5 + .5 * Math.cos(2 * Math.PI * (t - .6) / 1.4 + phase));
      poly(wave(1), 'accent', 4, {opacity: 0, keys: {opacity: swing(0)}, layer: 3});
      poly(wave(-1), 'accent', 4, {opacity: 0, keys: {opacity: swing(Math.PI)}, layer: 3});
      for (let j = 0; j < 2 * n; j++) { const f = j * Math.PI / n + Math.PI / 2; props.push({id: `node${j}`, type: 'circle', x: cx + R * Math.cos(f), y: cy - R * Math.sin(f), r: 5 * k, style: {fill: 'ink'}, layer: 4, show: [.6, 1e9]} as Prop); }
      story = `De Broglie: the electron's wave fits round its orbit a whole number of times, so it stands still`;
      second = "That is Bohr's rule: the circumference is n wavelengths, so the angular momentum is n units of h over two pi";
      facts.push(`n = ${n}: 2πr = ${n}λ, with r = ${n * n}a₀ = ${sci(bohrRadius(n), 'm')} and λ = h/mv = ${sci(2 * Math.PI * bohrRadius(n) / n, 'm')}`);
    } else {
      // a wave that does not fit: drawn once round, its end misses its start
      poly(wave(1), 'accent', 4, {draw: 0, keys: {draw: [[.6, 0], [4, 1, 'linear']]}, layer: 3});
      const f = 2 * Math.PI + Math.PI / 2, rr = R + A * Math.sin(n * 2 * Math.PI), end: P2 = [cx + rr * Math.cos(f), cy - rr * Math.sin(f)];
      props.push({id: 'gap', type: 'circle', x: end[0], y: end[1], r: 16 * k, style: {stroke: 'bad', width: 3 * k}, layer: 4, show: [4, 1e9]} as Prop);
      label(end[0] + 24 * k, end[1] - 20 * k, 'does not join: no such orbit', 'bad', 22, halo(k, 'bad', {align: 'start', show: [4.2, 1e9]}));
      anchors.gap = end;
      story = 'A wave that does not fit round the orbit a whole number of times does not join itself, and dies away';
      second = 'So only orbits whose circumference holds a whole number of wavelengths are allowed';
      facts.push(`${sig(n)} wavelengths round the orbit: not a whole number, so no standing wave`);
    }
    anchors.orbit = [cx, cy - R];
  }

  if (s.show === 'levels') {
    // Fig. 12.7 to one scale: E = 0 at the top (the free electron), n = 1 at −13.6 eV
    const list = (Array.isArray(s.series) ? s.series : s.series ? [s.series] : ['lyman', 'balmer', 'paschen']).slice().sort((a, b) => SERIES[a] - SERIES[b]);
    const top = by + bh * .1, bot = by + bh * .92, Y = (ev: number) => top + (-ev / E1) * (bot - top), x0 = bx + bw * .16, x1 = bx + bw * .98;
    props.push({id: 'continuum', type: 'rect', x: x0, y: by, w: x1 - x0, h: top - by, style: {fill: 'cool', opacity: .12}, layer: 1} as Prop);
    label(x1, by + 24 * k, 'free electron: any energy', 'muted', 20, {align: 'end'});
    line([x0, top], [x1, top], 'ink', 2.5); label(x0 - 10 * k, top + 8 * k, num ? '0 eV' : 'E = 0', 'muted', 20, {align: 'end'});
    for (let n = 1; n <= 6; n++) {
      line([x0, Y(levelEv(n))], [x1, Y(levelEv(n))], 'muted', n === 1 ? 3 : 2);
      anchors[`level${n}`] = [x0, Y(levelEv(n))];
      if (n <= 4) label(x0 - 10 * k, Y(levelEv(n)) + 8 * k, num ? `${ev(levelEv(n))} eV` : `E${sub(n)}`, 'muted', 20, {align: 'end'});
      if (n <= 3) label(x1, Y(levelEv(n)) - 10 * k, num ? `n = ${n}` : '', 'faint', 20, {align: 'end'});
    }
    label(x1, top - 10 * k, num ? 'n = ∞' : '', 'faint', 20, {align: 'end'});
    anchors.top = [x0, top];
    // each series a group of arrows down to its own floor, drawn on one after the other
    const gw = (x1 - x0) * .9 / list.length;
    dur = 1 + list.length * 2 + 1;
    list.forEach((name, g) => {
      const nf = SERIES[name], gx = x0 + (x1 - x0) * .05 + g * gw, ups = Array.from({length: 6 - nf}, (_, i) => nf + 1 + i);
      ups.forEach((ni, j) => {
        const x = gx + gw * (.15 + .7 * j / Math.max(1, ups.length - 1 || 1)), lam = lineNm(ni, nf), col = lam >= 380 && lam <= 750 ? wavelengthColour(lam) : name === 'lyman' ? 'cool' : 'bad';
        const t0 = 1 + g * 2 + j * .3;
        props.push({id: `t${name}${ni}`, type: 'arrow', x1: x, y1: Y(levelEv(ni)), x2: x, y2: Y(levelEv(nf)), head: 12 * k, style: {stroke: col, width: 3 * k}, draw: 0, keys: {draw: [[t0, 0], [t0 + .5, 1, 'inOut']]}, layer: 3} as Prop);
      });
      const lx = gx + gw * .5, ly = Y(levelEv(nf)) + 30 * k;
      label(lx, ly, name[0].toUpperCase() + name.slice(1), 'ink', 22, halo(k, 'ink', {show: [1 + g * 2, 1e9]}));
      anchors[name] = [lx, Y(levelEv(nf))];
      const first = lineNm(nf + 1, nf), limit = H * C / (-levelEv(nf) * E) * 1e9;
      facts.push(`${name[0].toUpperCase() + name.slice(1)}: ${sig(first)} nm down to ${sig(limit)} nm${nf === 1 ? ', ultraviolet' : nf === 2 ? ', visible lines' : ', infrared'}`);
    });
    facts.unshift(`Eₙ = −${sig(E1)}/n² eV`);
    story = "Hydrogen's levels crowd together near zero; each jump down gives out one photon";
    second = 'Jumps ending on the same level make one series';
  }

  if (s.show === 'spectrum') {
    // Fig. 12.5: one series' lines on a wavelength strip, crowding together to the series limit
    const name = (Array.isArray(s.series) ? s.series[0] : s.series) ?? 'balmer', nf = SERIES[name];
    const limit = H * C / (-levelEv(nf) * E) * 1e9, first = lineNm(nf + 1, nf);
    const l0 = limit * .96, l1 = first * 1.04, x0 = bx + bw * .04, x1 = bx + bw * .96, X = (l: number) => x0 + (l - l0) / (l1 - l0) * (x1 - x0);
    const sy0 = by + bh * .3, sy1 = by + bh * .62;
    props.push({id: 'strip', type: 'rect', x: x0, y: sy0, w: x1 - x0, h: sy1 - sy0, style: {fill: 'paper', stroke: 'muted', width: 2 * k}, layer: 1} as Prop);
    const greek = ['α', 'β', 'γ', 'δ'];
    dur = 6.5;
    for (let ni = nf + 1; ni <= nf + 14; ni++) {
      const lam = lineNm(ni, nf), x = X(lam), vis = lam >= 380 && lam <= 750, col = vis ? wavelengthColour(lam) : 'muted', j = ni - nf - 1, t0 = .6 + Math.min(j, 8) * .35;
      props.push({id: `line${ni}`, type: 'line', x1: x, y1: sy0, x2: x, y2: sy1, style: {stroke: col, width: (j < 4 ? 5 : 2.5) * k}, layer: 2, show: [t0, 1e9]} as Prop);
      if (j < 4) {
        label(x, sy0 - 16 * k, `H${greek[j]}`, col, 22, halo(k, col, {show: [t0, 1e9]}));
        if (num) label(x, sy1 + 30 * k, `${sig(lam, 4)}`, 'muted', 18, {show: [t0, 1e9]});
        anchors[`line${j + 1}`] = [x, sy0];
      }
    }
    line([X(limit), sy0 - 10 * k], [X(limit), sy1 + 10 * k], 'ink', 2, {show: [4, 1e9]}, true);
    label(X(limit), sy1 + 64 * k, 'series limit', 'ink', 22, {show: [4, 1e9]});
    label(x1, sy1 + 64 * k, num ? 'wavelength, nm' : 'wavelength', 'muted', 20, {align: 'end'});
    anchors.limit = [X(limit), sy1];
    const Name = name[0].toUpperCase() + name.slice(1);
    story = `The ${Name} series: lines at sharp wavelengths, closer and closer together towards the series limit`;
    second = `Each line is a jump down to the same level; the limit is a jump from a free electron`;
    facts.push(`1/λ = R(1/${nf}² − 1/n²): the first line ${sig(first, 4)} nm, the limit ${sig(limit, 4)} nm`, `R = ${sci(1 / (lineNm(1e9, 1) * 1e-9), 'm⁻¹')}`);
  }
  return finish('bohr', s as never, dur, story, second, facts, anchors, s.illustrative);
}
