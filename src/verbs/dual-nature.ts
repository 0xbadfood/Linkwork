// Class 12 Dual Nature of Radiation and Matter (leph2-03, 2026-11-03): two verbs, every energy, potential and
// wavelength computed from h, e and the metal's work function.
//
// photoelectric  emission: the energy picture of one electron at the metal's surface, height = energy: a photon gives
//                it hν; past the work function φ₀ it leaves with Kmax = hν − φ₀ (Einstein's equation), short of it it
//                falls back, however bright the light. apparatus: Fig. 11.1, the evacuated tube, emitter C and
//                collector A, the light through the window, the battery, voltmeter and microammeter; electrons leave C
//                with kinetic energies up to Kmax and a retarding potential turns back all those below e|V|. curves:
//                Figs. 11.3, 11.4, photocurrent against collector potential, three intensities (one stopping
//                potential, three saturation currents) or three frequencies (three stopping potentials, one saturation
//                current). stopping: Fig. 11.5, V₀ against ν for one to three metals, parallel lines of slope h/e
//                starting at each threshold ν₀. photons: Example 11.1, light as a stream of photons, E = hν each,
//                N = P/E of them a second; brighter light is more photons, not bigger ones.
// matter_wave    electron: de Broglie's λ = h/p for an electron accelerated through V (λ = 1.227/√V nm) or moving at
//                a given speed, drawn to one scale against a crystal's atoms; scale: a ruler of lengths in powers of
//                ten with the electron's and a ball's wavelengths beside an atom, a nucleus and visible light
//                (Example 11.3).
import {kit} from './potential.ts';
import {sci} from './electric.ts';
import {wavelengthColour} from '../physics/light.ts';
import type {Prop, Scene} from '../scene.ts';

type P2 = [number, number];
type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const sig = (v: number, p = 3) => String(+v.toPrecision(p));
const halo = (k: number, fill: string, extra: Record<string, unknown> = {}) => ({...extra, style: {fill, stroke: 'paper', width: 6 * k}});
const only = (s: Record<string, unknown>, verb: string, show: string, allowed: string[], all: string[]) =>
  all.filter(f => s[f] !== undefined && !allowed.includes(f)).map(f => `${verb}: ${f} is not used by show ${show}; leave it out`);

export const H = 6.626e-34, E = 1.602e-19, C = 2.998e8, ME = 9.109e-31;
/** Work functions in eV: caesium from the book (Example 11.2), the rest from its earlier Table 11.1. */
export const WORK_FUNCTIONS: Record<string, number> = {caesium: 2.14, potassium: 2.30, sodium: 2.75, calcium: 3.20, molybdenum: 4.17,
  lead: 4.25, copper: 4.65, silver: 4.70, nickel: 5.15, platinum: 5.65};
/** A photon's energy in eV at frequency ν (in units of 10¹⁴ Hz). */
export const photonEv = (nu14: number) => H * nu14 * 1e14 / E;
/** The threshold frequency (10¹⁴ Hz) of a work function in eV: ν₀ = φ₀/h. */
export const thresholdNu = (phiEv: number) => phiEv * E / H / 1e14;
/** Einstein: Kmax = hν − φ₀ in eV (negative: no emission); the stopping potential V₀ = Kmax/e is the same number in volts. */
export const kmax = (nu14: number, phiEv: number) => photonEv(nu14) - phiEv;
/** The fastest electron's speed in m/s for Kmax in eV. */
export const vmax = (kEv: number) => Math.sqrt(2 * Math.max(0, kEv) * E / ME);
/** de Broglie: λ in nm of an electron accelerated from rest through V volts (λ = h/√(2meV) = 1.227/√V nm). */
export const electronLambdaNm = (V: number) => H / Math.sqrt(2 * ME * E * V) * 1e9;
/** de Broglie: λ in m of a mass m (kg) at speed v (m/s), λ = h/mv. */
export const lambdaOf = (m: number, v: number) => H / (m * v);
// the photocurrent's shape against collector potential, as a share of saturation: none past the stopping potential, then
// rising as fewer electrons are turned back, all of them collected at saturation (the curve's shape is schematic)
export const photocurrent = (V: number, V0: number) => V <= -V0 ? 0 : V < 0 ? .78 * (1 + V / V0) ** 1.6 : 1 - .22 * Math.exp(-V / .6);

function frequencyOf(s: {frequency?: number; wavelength?: number}) { return isNum(s.wavelength) ? C / (s.wavelength * 1e-9) / 1e14 : s.frequency ?? 6; }
function phiOf(s: {metal?: string; work_function?: number}) { return s.work_function ?? WORK_FUNCTIONS[s.metal ?? 'caesium']; }
const metalName = (s: {metal?: string; work_function?: number}) => s.work_function !== undefined && !s.metal ? 'the metal' : s.metal ?? 'caesium';

// -------------------------------------------------------------------------------------------------- photoelectric
export const PHOTO_SHOWS = ['emission', 'apparatus', 'curves', 'stopping', 'photons'] as const;
export type PhotoelectricSpec = Common & {verb: 'photoelectric'; show: (typeof PHOTO_SHOWS)[number];
  /** the emitter's metal (default caesium, 2.14 eV) or its work function in eV. */
  metal?: string; work_function?: number;
  /** the light: frequency in units of 10¹⁴ Hz (default 6) or wavelength in nm, not both. */
  frequency?: number; wavelength?: number;
  /** apparatus: the collector's potential in volts relative to the emitter (negative retards; default 1). */
  potential?: number;
  /** apparatus, photons: the light's intensity, 1 to 3 (relative; default 1; photons draws 1 and 2 side by side when left out). */
  intensity?: number;
  /** curves: what changes between the three curves (default intensity). */
  vary?: 'intensity' | 'frequency';
  /** curves with vary frequency: three frequencies in 10¹⁴ Hz, all above threshold (default the light's and two higher). */
  frequencies?: number[];
  /** stopping: one to three metals (default caesium and sodium); the light's frequency is marked on the first. */
  metals?: string[];
  /** photons: the source's power in watts (Example 11.1: 2.0e-3 with frequency 6). */
  power?: number;
  /** emission: the energy scale's top in eV, held whatever the light (a play's one scale); left out, it fits the light. */
  top?: number};

const PHOTO_FIELDS = ['metal', 'work_function', 'frequency', 'wavelength', 'potential', 'intensity', 'vary', 'frequencies', 'metals', 'power', 'top'];
const PHOTO_ALLOWED: Record<string, string[]> = {
  emission: ['metal', 'work_function', 'frequency', 'wavelength', 'top'],
  apparatus: ['metal', 'work_function', 'frequency', 'wavelength', 'potential', 'intensity'],
  curves: ['metal', 'work_function', 'frequency', 'wavelength', 'vary', 'frequencies'],
  stopping: ['metals', 'frequency', 'wavelength'],
  photons: ['metal', 'work_function', 'frequency', 'wavelength', 'intensity', 'power'],
};

export function photoelectricErrors(s: PhotoelectricSpec): string[] {
  const W = 'photoelectric', e: string[] = [];
  if (!PHOTO_SHOWS.includes(s.show)) return [`${W}: show is one of ${PHOTO_SHOWS.join(', ')}`];
  e.push(...only(s as never, W, s.show, PHOTO_ALLOWED[s.show], PHOTO_FIELDS));
  const metals = Object.keys(WORK_FUNCTIONS).join(', ');
  if (s.metal !== undefined && !(s.metal in WORK_FUNCTIONS)) e.push(`${W}: metal is one of ${metals}, or give work_function in eV`);
  if (s.metal !== undefined && s.work_function !== undefined) e.push(`${W}: give metal or work_function, not both`);
  if (s.work_function !== undefined && !(isNum(s.work_function) && s.work_function >= 1 && s.work_function <= 6)) e.push(`${W}: work_function is 1 to 6 eV`);
  if (s.frequency !== undefined && s.wavelength !== undefined) e.push(`${W}: give frequency or wavelength, not both`);
  if (s.frequency !== undefined && !(isNum(s.frequency) && s.frequency >= 1 && s.frequency <= 30)) e.push(`${W}: frequency is in units of 10^14 Hz, 1 to 30 (6.0 × 10^14 Hz is 6)`);
  if (s.wavelength !== undefined && !(isNum(s.wavelength) && s.wavelength >= 100 && s.wavelength <= 2000)) e.push(`${W}: wavelength is 100 to 2000 nm`);
  if (s.potential !== undefined && !(isNum(s.potential) && s.potential >= -5 && s.potential <= 5)) e.push(`${W}: potential is -5 to 5 V`);
  if (s.intensity !== undefined && !(isNum(s.intensity) && s.intensity >= 1 && s.intensity <= 3)) e.push(`${W}: intensity is 1 to 3 (relative)`);
  if (s.vary !== undefined && !['intensity', 'frequency'].includes(s.vary)) e.push(`${W}: vary is intensity or frequency`);
  if (s.top !== undefined && !(isNum(s.top) && s.top >= 1 && s.top <= 8)) e.push(`${W}: top is 1 to 8 eV`);
  if (s.power !== undefined && !(isNum(s.power) && s.power > 0 && s.power <= 100)) e.push(`${W}: power is in watts, above 0 and up to 100`);
  if (e.length) return e;
  const phi = phiOf(s), nu = frequencyOf(s), nu0 = thresholdNu(phi);
  if (s.show === 'apparatus' || (s.show === 'curves' && s.vary !== 'frequency')) {
    if (nu <= nu0) e.push(`${W}: ${sig(nu)} × 10^14 Hz is below ${metalName(s)}'s threshold ${sig(nu0)} × 10^14 Hz, so nothing is emitted; use a higher frequency (or show emission to show that)`);
  }
  if (s.show === 'curves' && s.vary === 'frequency') {
    const fs = s.frequencies ?? [nu, nu + 1.5, nu + 3];
    if (s.frequencies !== undefined && !(Array.isArray(fs) && fs.length === 3 && fs.every(isNum))) e.push(`${W}: frequencies is three numbers in 10^14 Hz`);
    else if (fs.some(f => f <= nu0)) e.push(`${W}: every frequency must be above ${metalName(s)}'s threshold ${sig(nu0)} × 10^14 Hz`);
    else if (Math.max(...fs.map(f => kmax(f, phi))) > 5) e.push(`${W}: a stopping potential above 5 V will not fit; choose lower frequencies`);
  }
  if (s.show === 'stopping') {
    const ms = s.metals ?? ['caesium', 'sodium'];
    if (!(Array.isArray(ms) && ms.length >= 1 && ms.length <= 3 && ms.every(m => m in WORK_FUNCTIONS))) e.push(`${W}: metals is one to three of ${metals}`);
    else if (new Set(ms).size !== ms.length) e.push(`${W}: metals are all different`);
  }
  if (s.show === 'emission' && s.top !== undefined && Math.max(photonEv(nu), phi) > s.top) e.push(`${W}: hν and φ₀ must be below top (${s.top} eV); raise top or lower the frequency`);
  if ((s.show === 'emission' || s.show === 'curves') && kmax(nu, phi) > 5) e.push(`${W}: Kmax above 5 eV will not fit; choose a lower frequency`);
  return e;
}

export function photoelectric(s: PhotoelectricSpec): Scene {
  const {k, props, bx, by, bw, bh, on, arrow, line, poly, label, keysOf, finish} = kit(s);
  const num = !s.illustrative, facts: string[] = [], anchors: Record<string, P2> = {};
  const phi = phiOf(s), nu = frequencyOf(s), nu0 = thresholdNu(phi), hv = photonEv(nu), K = kmax(nu, phi), lam = C / (nu * 1e14) * 1e9;
  const colour = wavelengthColour(lam), emits = K > 0, name = metalName(s);
  let dur = 7, story = '', second = '';
  const lightFacts = () => facts.push(`hν = ${sig(hv)} eV (ν = ${sig(nu)} × 10¹⁴ Hz, λ = ${sig(lam)} nm)`,
    `${name}: φ₀ = ${sig(phi)} eV, ν₀ = ${sig(nu0)} × 10¹⁴ Hz (λ₀ = ${sig(C / (nu0 * 1e14) * 1e9)} nm)`);
  // a wavy photon from p to q, coloured by its wavelength (a stand-in colour outside the visible band)
  const photon = (p: P2, q: P2, t0: number, t1: number, id: string, fill = colour) => {
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]), ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L, n = 60;
    const pts = Array.from({length: n + 1}, (_, j) => { const u = j / n, w = 9 * k * Math.sin(u * L / (16 * k)); return [p[0] + ux * u * L - uy * w, p[1] + uy * u * L + ux * w] as P2; });
    props.push({id, type: 'polyline', points: pts, style: {stroke: fill, width: 4 * k}, draw: 0, keys: {draw: [[t0, 0], [t1, 1, 'linear']]}, layer: 3} as Prop);
  };

  if (s.show === 'emission') {
    // height is energy: the electron at the metal's surface at 0, free and at rest outside at φ₀
    const Emax = s.top ?? Math.max(hv, phi) * 1.2, y0 = by + bh * .86, sc = bh * .74 / Emax, Y = (ev: number) => y0 - ev * sc;
    const mx0 = bx + bw * .2, mx1 = bx + bw * .5, xe = mx1 - bw * .07;
    props.push({id: 'metal', type: 'rect', x: mx0, y: y0, w: mx1 - mx0, h: by + bh - y0, style: {fill: 'figure', opacity: .35, stroke: 'muted', width: 2 * k}, layer: 1} as Prop);
    label((mx0 + mx1) / 2, by + bh - 14 * k, name, 'muted', 24);
    for (let j = 0; j < 6; j++) props.push({id: `free${j}`, type: 'circle', x: mx0 + (j + .5) * (mx1 - mx0) / 7, y: y0 + 22 * k + (j % 2) * 18 * k, r: 7 * k, style: {fill: 'cool'}, layer: 2} as Prop);
    line([mx0, Y(phi)], [bx + bw, Y(phi)], 'muted', 2.5, {}, true);
    label(bx + bw, Y(phi) + 30 * k, 'free, at rest outside the metal', 'muted', 22, {align: 'end'});
    // φ₀ bracket on the left of the metal
    arrow([mx0 - 26 * k, y0], [mx0 - 26 * k, Y(phi)], 'cool', 3); arrow([mx0 - 26 * k, Y(phi)], [mx0 - 26 * k, y0], 'cool', 3);
    label(mx0 - 40 * k, (y0 + Y(phi)) / 2 + 9 * k, num ? `φ₀ = ${sig(phi)} eV` : 'φ₀', 'cool', 26, halo(k, 'cool', {align: 'end'}));
    // the photon comes in and is absorbed: the whole hν goes to one electron
    photon([bx + bw * .02, by + bh * .06], [xe, y0], .6, 1.8, 'photon');
    label(bx + bw * .07, by + bh * .04, num ? `photon, hν = ${sig(hv)} eV` : 'photon, hν', 'accent', 24, {align: 'start', show: [.6, 1e9]});
    const T1 = 2, T2 = 3.2, T3 = 4.4, T4 = 6.4, top = emits ? Y(hv) : Y(hv);
    props.push({id: 'gain', type: 'arrow', x1: xe + 30 * k, y1: y0, x2: xe + 30 * k, y2: top, head: 15 * k, style: {stroke: 'accent', width: 5 * k}, draw: 0, keys: {draw: [[T1, 0], [T2, 1, 'inOut']]}, layer: 3} as Prop);
    label(xe + 46 * k, (y0 + top) / 2, 'hν', 'accent', 28, {align: 'start', show: [T2, 1e9]});
    const ex = (t: number) => t < T2 ? xe : emits ? xe + (t < T3 ? 0 : (bx + bw * .94 - xe) * Math.min(1, (t - T3) / (T4 - T3))) : xe;
    const ey = (t: number) => t < T1 ? y0 : t < T2 ? y0 + (top - y0) * (t - T1) / (T2 - T1) : emits ? top : t < T3 ? top : t < T3 + .6 ? top + (y0 - top) * ((t - T3) / .6) ** 2 : y0;
    dur = 7.2;
    props.push({id: 'electron', type: 'circle', x: xe, y: y0, r: 11 * k, style: {fill: 'cool', stroke: 'ink', width: 2 * k}, layer: 4, keys: {x: keysOf(dur, ex), y: keysOf(dur, ey)}} as Prop);
    if (emits) {
      const xk = mx1 + bw * .12;
      props.push({id: 'kbar', type: 'line', x1: xk, y1: Y(phi), x2: xk, y2: Y(hv), style: {stroke: 'good', width: 6 * k}, draw: 0, keys: {draw: [[T3, 0], [T3 + .8, 1, 'inOut']]}, layer: 3} as Prop);
      label(xk + 14 * k, Math.min(Y(phi) - 12 * k, (Y(phi) + Y(hv)) / 2 + 9 * k), num ? `Kmax = ${sig(K)} eV` : 'Kmax', 'good', 26, halo(k, 'good', {align: 'start', show: [T3 + .5, 1e9]}));
      anchors.kmax = [xk, Y(hv)];
      story = `One photon's energy hν goes to one electron: Kmax = hν − φ₀`;
      second = 'φ₀ frees it; electrons from deeper inside leave slower';
      facts.push(`Kmax = ${sig(hv)} − ${sig(phi)} = ${sig(K)} eV`);
    } else {
      label(xe + 60 * k, top - 24 * k, 'short of φ₀: it falls back', 'bad', 24, halo(k, 'bad', {align: 'start', show: [T3, 1e9]}));
      story = `hν is less than φ₀: no electron leaves, however bright the light or however long it shines`;
      second = `Below the threshold frequency ν₀ = φ₀/h there is no photoelectric emission`;
      facts.push(`hν = ${sig(hv)} eV is below φ₀ = ${sig(phi)} eV: no emission`);
    }
    lightFacts();
    if (emits) facts.push(`stopping potential V₀ = ${sig(K)} V; vmax = ${sci(vmax(K), 'm/s')}`);
    Object.assign(anchors, {electron: [xe, y0] as P2, barrier: [mx1, Y(phi)] as P2, photon: [xe, y0] as P2, metal: [(mx0 + mx1) / 2, y0] as P2});
  }

  if (s.show === 'apparatus') {
    // the tube, with emitter C on the left and collector A on the right
    const V = s.potential ?? 1, I = s.intensity ?? 1, V0 = K;
    const tx0 = bx + bw * .14, tx1 = bx + bw * .86, ty0 = by + bh * .14, ty1 = by + bh * .56, cyT = (ty0 + ty1) / 2;
    props.push({id: 'tube', type: 'rect', x: tx0, y: ty0, w: tx1 - tx0, h: ty1 - ty0, r: (ty1 - ty0) / 2, style: {stroke: 'muted', width: 3 * k, fill: 'paper'}, layer: 1} as Prop);
        const xC = tx0 + bw * .1, xA = tx1 - bw * .1, ph = (ty1 - ty0) * .5;
    props.push({id: 'C', type: 'rect', x: xC - 8 * k, y: cyT - ph / 2, w: 16 * k, h: ph, style: {fill: 'figure', stroke: 'ink', width: 2 * k}, layer: 2} as Prop);
    props.push({id: 'A', type: 'rect', x: xA - 8 * k, y: cyT - ph / 2, w: 16 * k, h: ph, style: {fill: 'muted', stroke: 'ink', width: 2 * k}, layer: 2} as Prop);
    label(xC, cyT - ph / 2 - 14 * k, 'C', 'ink', 28); label(xA, cyT - ph / 2 - 14 * k, 'A', 'ink', 28);
    label(xC - 12 * k, cyT + ph / 2 + 30 * k, `emitter (${name})`, 'muted', 20, {align: 'start'}); label(tx1 - 20 * k, ty0 - 14 * k, 'evacuated tube', 'muted', 20, {align: 'end'});
    label(xA + 12 * k, cyT + ph / 2 + 30 * k, 'collector', 'muted', 20, {align: 'end'});
    // the window and the light falling on C
    const src: P2 = [xC + bw * .26, by + 16 * k], wx = src[0] + (xC - src[0]) * (ty0 - src[1]) / (cyT - src[1]);
    line([wx - 34 * k, ty0], [wx + 34 * k, ty0], 'cool', 7); label(wx + 46 * k, ty0 + 30 * k, 'W', 'cool', 24, {align: 'start'});
    label(src[0] + 20 * k, src[1] + 22 * k, 'S', 'ink', 26, {align: 'start'});
    for (const d of [-14, 14]) photon([src[0] + d * k, src[1] + 28 * k], [xC + 12 * k, cyT + d * 3 * k], .3, 1.2, `light${d}`);
    // the circuit below: C and A wired down to a battery (polarity set by V), a voltmeter across, a microammeter in series
    const yc = by + bh * .82, xm = (tx0 + tx1) / 2;
    line([xC, cyT + ph / 2], [xC, yc], 'muted', 3); line([xA, cyT + ph / 2], [xA, yc], 'muted', 3);
    line([xC, yc], [xm - 60 * k, yc], 'muted', 3); line([xm + 60 * k, yc], [xA - bw * .1 - 34 * k, yc], 'muted', 3); line([xA - bw * .1 + 34 * k, yc], [xA, yc], 'muted', 3);
    // the battery: long plate +, short plate −; A's side is + when V > 0
    const left = V >= 0 ? -1 : 1;     // which plate is long (left long: C at +, retarding)
    line([xm - 12 * k, yc - (left < 0 ? 18 : 34) * k], [xm - 12 * k, yc + (left < 0 ? 18 : 34) * k], 'ink', 4);
    line([xm + 12 * k, yc - (left < 0 ? 34 : 18) * k], [xm + 12 * k, yc + (left < 0 ? 34 : 18) * k], 'ink', 4);
    line([xm - 60 * k, yc], [xm - 12 * k, yc], 'muted', 3); line([xm + 12 * k, yc], [xm + 60 * k, yc], 'muted', 3);
    label(xm, yc + 66 * k, V >= 0 ? 'A at + : accelerating' : 'A at − : retarding', V >= 0 ? 'good' : 'bad', 22);
    // voltmeter across the tube's leads
    const vy = yc - bh * .1;
    props.push({id: 'voltmeter', type: 'circle', x: xm, y: vy, r: 24 * k, style: {stroke: 'ink', width: 3 * k, fill: 'paper'}, layer: 2} as Prop);
    label(xm, vy + 9 * k, 'V', 'ink', 26); line([xC, vy], [xm - 24 * k, vy], 'faint', 2); line([xm + 24 * k, vy], [xA, vy], 'faint', 2);
    label(xm, vy - 40 * k, num ? `${sig(V)} V` : 'V', 'ink', 24, halo(k, 'ink'));
    // the microammeter, its needle set by the photocurrent (full scale: saturation at intensity 3)
    const xa = xA - bw * .1, frac = photocurrent(V, V0) * I / 3;
    props.push({id: 'ammeter', type: 'circle', x: xa, y: yc, r: 34 * k, style: {stroke: 'ink', width: 3 * k, fill: 'paper'}, layer: 2} as Prop);
    label(xa, yc + 22 * k, 'μA', 'ink', 20);
    const ang = Math.PI * (.85 - .7 * frac), nd: P2 = [xa + 26 * k * Math.cos(ang), yc - 26 * k * Math.sin(ang)];
    props.push({id: 'needle', type: 'line', x1: xa, y1: yc + 6 * k, x2: nd[0], y2: nd[1], style: {stroke: 'accent', width: 3 * k}, layer: 3} as Prop);
    // electrons: launched from C at a rate set by the intensity, each with a kinetic energy between 0 and Kmax; a field
    // eV/d across the gap turns back those with less than e|V|
    const n = 6 * I, Kref = Math.max(K, Math.abs(V), .4), m = 2 * Kref / 1.44;   // the fastest crosses in about a second
    dur = 8; let reach = 0;
    for (let j = 0; j < n; j++) {
      const t0 = .9 + j * 5.8 / n, Kj = K * (.15 + .85 * ((j * .618034) % 1)), v0 = Math.sqrt(2 * Kj / m), a = V / m;
      const yj = cyT + ph * .38 * (((j * .38197) % 1) * 2 - 1);
      // u(τ) = v0 τ + ½ a τ², across the gap 0 → 1; ends at A (collected) or back at C (turned back)
      let tEnd = 3;
      if (a > 0 || (a < 0 && v0 * v0 + 2 * a > 0) || (a === 0 && v0 > 0)) { tEnd = a === 0 ? 1 / v0 : (-v0 + Math.sqrt(v0 * v0 + 2 * a)) / a; reach++; }
      else if (a < 0) tEnd = -2 * v0 / a;
      const u = (t: number) => { const tau = Math.min(Math.max(0, t - t0), tEnd); return Math.max(0, Math.min(1, v0 * tau + .5 * a * tau * tau)); };
      const vis = (t: number) => t >= t0 && t <= t0 + tEnd ? 1 : 0;
      props.push({id: `e${j}`, type: 'circle', x: xC + 12 * k, y: yj, r: 7 * k, style: {fill: 'cool'}, layer: 3,
        keys: {x: keysOf(dur, t => xC + 12 * k + (xA - xC - 24 * k) * u(t)), opacity: keysOf(dur, vis)}} as Prop);
    }
    story = V >= 0 ? 'Light on C frees electrons; A, positive, collects them: a photocurrent flows'
      : V <= -V0 ? `A at ${sig(V)} V retards every electron: even the fastest turns back, no current` : 'A retards the electrons: only those with more than e|V| reach it';
    second = `Every electron leaves C with kinetic energy up to Kmax = ${num ? sig(K) + ' eV' : 'hν − φ₀'}; the stopping potential is V₀ = Kmax/e`;
    facts.push(`stopping potential V₀ = ${sig(V0)} V: at A below −${sig(V0)} V no electron arrives`, `${reach} of ${n} electrons drawn reach A at ${sig(V)} V`);
    lightFacts();
    Object.assign(anchors, {C: [xC, cyT] as P2, A: [xA, cyT] as P2, window: [wx, ty0] as P2, source: src, ammeter: [xa, yc] as P2, voltmeter: [xm, vy] as P2, battery: [xm, yc] as P2});
  }

  if (s.show === 'curves') {
    const byF = s.vary === 'frequency', fs = byF ? (s.frequencies ?? [nu, nu + 1.5, nu + 3]).slice().sort((a, b) => a - b) : [nu, nu, nu];
    const V0s = fs.map(f => kmax(f, phi)), sats = byF ? [1, 1, 1] : [1 / 3, 2 / 3, 1];
    const vMin = -Math.max(...V0s) * 1.35, vMax = 3, g0 = bx + bw * .05, g1 = bx + bw * .95, gy0 = by + bh * .86, gy1 = by + bh * .1;
    const GX = (v: number) => g0 + (v - vMin) / (vMax - vMin) * (g1 - g0), GY = (f: number) => gy0 - f * (gy0 - gy1) * .85;
    line([g0, gy0], [g1, gy0], 'ink', 2.5); arrow([GX(0), gy0 + 10 * k], [GX(0), gy1 - 10 * k], 'ink', 2.5);
    label(GX(0) + 12 * k, gy1, 'photocurrent', 'muted', 22, {align: 'start'});
    label(g1, gy0 + 34 * k, 'collector plate potential', 'muted', 22, {align: 'end'});
    label(g0, gy0 + 34 * k, 'retarding', 'muted', 22, {align: 'start'});
    const tones = byF ? ['good', 'accent', 'bad'] : ['cool', 'accent', 'good'];
    fs.forEach((f, j) => {
      const t0 = .8 + j * 1.6, pts = Array.from({length: 121}, (_, i) => { const v = vMin + (vMax - vMin) * i / 120; return [GX(v), GY(sats[j] * photocurrent(v, V0s[j]))] as P2; });
      poly(pts, tones[j], 4, on(t0, t0 + 1.3));
      const nm = byF ? `ν${'₁₂₃'[j]}` : `I${'₁₂₃'[j]}`;
      label(g1 - 10 * k, GY(sats[j]) - 14 * k, nm, tones[j], 26, halo(k, tones[j], {align: 'end', show: [t0 + 1, 1e9]}));
      if (byF || j === 0) {
        label(GX(-V0s[j]), gy0 + (byF ? 64 + 28 * j : 64) * k, num ? `−${sig(V0s[j])} V` : `−V₀${byF ? '₁₂₃'[j] : ''}`, tones[byF ? j : 0], 22, {show: [t0 + 1, 1e9]});
        line([GX(-V0s[j]), gy0 - 8 * k], [GX(-V0s[j]), gy0 + 8 * k], tones[byF ? j : 0], 3);
      }
      anchors[`curve${j + 1}`] = [g1, GY(sats[j])];
      anchors[`stop${j + 1}`] = [GX(-V0s[j]), gy0];
    });
    label(GX(vMax * .55), GY(1) - (byF ? 40 : 60) * k, 'saturation current', 'muted', 22);
    dur = 6.6;
    story = byF ? `Three frequencies at one intensity: one saturation current, but the higher the frequency, the larger the stopping potential`
      : `Three intensities at one frequency: the saturation current grows with intensity, the stopping potential stays the same`;
    second = byF ? 'Kmax = eV₀ rises with frequency, not with intensity' : 'More light means more electrons a second, not faster ones';
    if (byF) fs.forEach((f, j) => facts.push(`ν${'₁₂₃'[j]} = ${sig(f)} × 10¹⁴ Hz: V₀ = ${sig(V0s[j])} V`));
    else facts.push(`one stopping potential for every intensity: V₀ = ${sig(V0s[0])} V`, `saturation currents in the ratio 1 : 2 : 3 for intensities in the ratio 1 : 2 : 3`);
    facts.push(`${name}: φ₀ = ${sig(phi)} eV; ν₀ = ${sig(nu0)} × 10¹⁴ Hz`);
    anchors.origin = [GX(0), gy0];
  }

  if (s.show === 'stopping') {
    const ms = s.metals ?? ['caesium', 'sodium'], nus0 = ms.map(m => thresholdNu(WORK_FUNCTIONS[m]));
    const xMax = Math.max(nu, ...nus0) * 1.35, yMax = Math.max(kmax(xMax, WORK_FUNCTIONS[ms[0]]), 1) * 1.1;
    const g0 = bx + bw * .08, g1 = bx + bw * .95, gy0 = by + bh * .86, gy1 = by + bh * .08;
    const GX = (f: number) => g0 + f / xMax * (g1 - g0), GY = (v: number) => gy0 - v / yMax * (gy0 - gy1);
    arrow([g0, gy0], [g1 + 10 * k, gy0], 'ink', 2.5); arrow([g0, gy0], [g0, gy1 - 10 * k], 'ink', 2.5);
    label(g1, gy0 + 30 * k, num ? 'frequency ν (10¹⁴ Hz)' : 'frequency ν', 'muted', 22, {align: 'end'});
    label(g0 + 12 * k, gy1, 'stopping potential V₀', 'muted', 22, {align: 'start'});
    if (num) for (let f = 2; GX(f) < g1 - 250 * k; f += 2) { line([GX(f), gy0], [GX(f), gy0 + 8 * k], 'ink', 2); label(GX(f), gy0 + 30 * k, String(f), 'muted', 20); }
    if (num) for (let v = 1; v < yMax; v++) { line([g0 - 8 * k, GY(v)], [g0, GY(v)], 'ink', 2); label(g0 - 14 * k, GY(v) + 7 * k, `${v}`, 'muted', 20, {align: 'end'}); }
    const tones = ['accent', 'cool', 'good'];
    ms.forEach((m, j) => {
      const p = WORK_FUNCTIONS[m], t0 = .8 + j * 1.4, top = Math.min(xMax, thresholdNu(p + yMax));
      line([GX(nus0[j]), GY(0)], [GX(top), GY(kmax(top, p))], tones[j], 4, on(t0, t0 + 1.2));
      label(GX(nus0[j]), gy0 + (58 + 26 * j) * k, num ? `ν₀ = ${sig(nus0[j])}` : 'ν₀', tones[j], 22, {show: [t0, 1e9]});
      label(GX(top) - 10 * k, GY(kmax(top, p)) + 30 * k, m, tones[j], 24, halo(k, tones[j], {align: 'end', show: [t0 + 1, 1e9]}));
      anchors[`threshold${j + 1}`] = [GX(nus0[j]), gy0];
    });
    // the slope triangle on the first line: Δ V₀ / Δν = h/e
    const p0 = WORK_FUNCTIONS[ms[0]], fa = nus0[0] + (xMax - nus0[0]) * .25, fb = fa + (xMax - nus0[0]) * .3;
    line([GX(fa), GY(kmax(fa, p0))], [GX(fb), GY(kmax(fa, p0))], 'muted', 2, {show: [4.6, 1e9]}, true);
    line([GX(fb), GY(kmax(fa, p0))], [GX(fb), GY(kmax(fb, p0))], 'muted', 2, {show: [4.6, 1e9]}, true);
    label(GX(fb) + 12 * k, (GY(kmax(fa, p0)) + GY(kmax(fb, p0))) / 2 + 8 * k, 'slope h/e', 'ink', 24, halo(k, 'ink', {align: 'start', show: [4.8, 1e9]}));
    // the light's frequency on the first metal's line
    const Kp = kmax(nu, p0), pt: P2 = [GX(nu), GY(Math.max(0, Kp))];
    if (Kp > 0) {
      line([GX(nu), gy0], pt, 'faint', 2, {show: [5.4, 1e9]}, true); line([g0, pt[1]], pt, 'faint', 2, {show: [5.4, 1e9]}, true);
      props.push({id: 'point', type: 'circle', x: pt[0], y: pt[1], r: 9 * k, style: {fill: 'accent'}, layer: 4, show: [5.4, 1e9]} as Prop);
      if (num) label(pt[0] + 14 * k, pt[1] - 14 * k, `${sig(nu)} × 10¹⁴ Hz: V₀ = ${sig(Kp)} V`, 'accent', 22, halo(k, 'accent', {align: 'start', show: [5.6, 1e9]}));
      facts.push(`${ms[0]} at ν = ${sig(nu)} × 10¹⁴ Hz: V₀ = (h/e)(ν − ν₀) = ${sig(Kp)} V`);
    }
    anchors.point = pt;
    dur = 7;
    story = 'V₀ rises in a straight line with ν from each metal\'s threshold ν₀; below ν₀ nothing is emitted';
    second = 'Every metal\'s line has the same slope, h/e: Millikan measured h from it';
    facts.push(`slope h/e = ${sci(H / E, 'V s')} for every metal`, ...ms.map((m, j) => `${m}: φ₀ = ${WORK_FUNCTIONS[m]} eV, ν₀ = ${sig(nus0[j])} × 10¹⁴ Hz`));
  }

  if (s.show === 'photons') {
    // two beams of one colour from the left to a metal plate: the brighter carries more photons, each the same hν
    const both = s.intensity === undefined, levels = both ? [1, 2] : [s.intensity!], P = s.power, Ej = H * nu * 1e14;
    const xs0 = bx + bw * .04, xs1 = bx + bw * .8, rows = levels.map((_, j) => by + bh * (levels.length === 1 ? .45 : .26 + .42 * j));
    dur = 7.5;
    levels.forEach((lv, j) => {
      const y = rows[j];
      props.push({id: `lamp${j}`, type: 'circle', x: xs0, y, r: 20 * k, style: {fill: colour, opacity: .3 + .25 * lv, stroke: 'ink', width: 2 * k}, layer: 2} as Prop);
      props.push({id: `plate${j}`, type: 'rect', x: xs1, y: y - bh * .12, w: 18 * k, h: bh * .24, style: {fill: 'figure', stroke: 'ink', width: 2 * k}, layer: 2} as Prop);
      if (both) label(xs0 - 20 * k, y - bh * .13, lv === 1 ? 'dim' : 'twice as bright', 'muted', 22, {align: 'start'});
      // photons: equal packets at a steady rate ∝ intensity, crossing in 1.6 s; each one hitting frees one electron (above ν₀)
      const n = Math.round(5 * lv), span = xs1 - xs0 - 26 * k, cross = 1.6, len = 60 * k;
      for (let i = 0; i < n * 4; i++) {
        const t0 = .4 + i * 1.5 / n, yi = y + bh * .08 * (((i * .618034) % 1) * 2 - 1);
        if (t0 > dur - .2) break;
        // a packet of one wavelength-colour travelling to the plate and absorbed there (it reaches the plate at span/(span+len))
        props.push({id: `ph${j}-${i}`, type: 'wave', x1: xs0 + 26 * k, y1: yi, x2: xs1, y2: yi, progress: 0, wavelength: 18 * k, amplitude: 8 * k, length: len,
          style: {stroke: colour, width: 3.5 * k}, layer: 3, keys: {progress: [[t0, 0], [t0 + cross * (span + len) / span, 1, 'linear']]}} as Prop);
        if (emits && t0 + cross < dur) {
          const te = t0 + cross, ex = (t: number) => xs1 + 18 * k + Math.max(0, t - te) * bw * .1;
          props.push({id: `pe${j}-${i}`, type: 'circle', x: xs1 + 18 * k, y: yi, r: 6 * k, style: {fill: 'cool'}, layer: 3,
            keys: {x: keysOf(dur, ex), opacity: keysOf(dur, t => t >= te && t < te + 1.4 ? 1 : 0)}} as Prop);
        }
      }
      anchors[`beam${j + 1}`] = [(xs0 + xs1) / 2, y];
    });
    label((xs0 + xs1) / 2, by + bh * .96, num ? `each photon: E = hν = ${sig(hv)} eV, p = h/λ = ${sci(H / (lam * 1e-9), 'kg m/s')}` : 'each photon: E = hν, p = h/λ', 'accent', 22, halo(k, 'accent'));
    story = 'Light is a stream of photons, each carrying energy hν and momentum h/λ';
    second = emits ? 'Brighter light brings more photons a second, so more electrons, each no faster' : `Below ν₀ no photon frees an electron, however many arrive`;
    facts.push(`photon energy E = hν = ${sci(Ej, 'J')} = ${sig(hv)} eV; momentum p = hν/c = ${sci(Ej / C, 'kg m/s')}`);
    if (P !== undefined) facts.push(`a ${sci(P, 'W')} source emits N = P/E = ${sci(P / Ej)} photons per second`);
    facts.push(`light: ν = ${sig(nu)} × 10¹⁴ Hz, λ = ${sig(lam)} nm`, 'photons drawn far fewer and slower than in truth');
    anchors.plate = [xs1, rows[0]];
  }
  return finish('photoelectric', s as never, dur, story, second, facts, anchors, s.illustrative);
}

// ---------------------------------------------------------------------------------------------------- matter_wave
export const MATTER_SHOWS = ['electron', 'scale'] as const;
export type MatterWaveSpec = Common & {verb: 'matter_wave'; show: (typeof MATTER_SHOWS)[number];
  /** the electron's accelerating potential in volts (default 100), or its speed in m/s (Example 11.3: 5.4e6), not both. */
  voltage?: number; speed?: number;
  /** scale: the everyday body's mass in kg and speed in m/s (Example 11.3: a 0.150 kg ball at 30 m/s, the default). */
  mass?: number; body_speed?: number; body?: string};

export function matterWaveErrors(s: MatterWaveSpec): string[] {
  const W = 'matter_wave', e: string[] = [];
  if (!MATTER_SHOWS.includes(s.show)) return [`${W}: show is one of ${MATTER_SHOWS.join(', ')}`];
  e.push(...only(s as never, W, s.show, s.show === 'electron' ? ['voltage', 'speed'] : ['voltage', 'speed', 'mass', 'body_speed', 'body'], ['voltage', 'speed', 'mass', 'body_speed', 'body']));
  if (s.voltage !== undefined && s.speed !== undefined) e.push(`${W}: give voltage or speed, not both`);
  if (s.voltage !== undefined && !(isNum(s.voltage) && s.voltage >= 20 && s.voltage <= 5000)) e.push(`${W}: voltage is 20 to 5000 V (the wavelength must be drawable beside the atoms)`);
  if (s.speed !== undefined && !(isNum(s.speed) && s.speed >= 2.7e6 && s.speed <= 4e7)) e.push(`${W}: speed is 2.7e6 to 4e7 m/s for an electron (non-relativistic and drawable)`);
  if (s.mass !== undefined && !(isNum(s.mass) && s.mass > 1e-6 && s.mass <= 1e4)) e.push(`${W}: mass is in kg, an everyday body (1e-6 to 1e4)`);
  if (s.body_speed !== undefined && !(isNum(s.body_speed) && s.body_speed > 0 && s.body_speed <= 1e4)) e.push(`${W}: body_speed is in m/s, above 0 up to 1e4`);
  if (s.body !== undefined && !(typeof s.body === 'string' && s.body.length <= 16)) e.push(`${W}: body is a short name, such as ball`);
  return e;
}

export function matterWave(s: MatterWaveSpec): Scene {
  const {k, props, bx, by, bw, bh, on, arrow, line, poly, label, keysOf, finish} = kit(s);
  const num = !s.illustrative, facts: string[] = [], anchors: Record<string, P2> = {};
  const v = s.speed ?? Math.sqrt(2 * E * (s.voltage ?? 100) / ME), lamNm = H / (ME * v) * 1e9, Vacc = ME * v * v / (2 * E);
  let dur = 7, story = '', second = '';
  facts.push(s.speed !== undefined ? `electron at ${sci(v, 'm/s')}: p = mv = ${sci(ME * v, 'kg m/s')}, λ = h/p = ${sig(lamNm)} nm`
    : `electron through ${sig(Vacc)} V: λ = h/√(2meV) = 1.227/√V nm = ${sig(lamNm)} nm`);

  if (s.show === 'electron') {
    // one scale for the wave and the crystal's atoms (0.2 nm apart): the window is 2 nm wide
    const x0 = bx + bw * .04, x1 = bx + bw * .96, ppn = (x1 - x0) / 2, yb = by + bh * .34, amp = bh * .1;
    const gx = bx + bw * .04;
    // the gun: a filament and an anode, then the electron and its wave moving right
    line([x0, yb], [x1, yb], 'faint', 2, {}, true);
    const T0 = .8, T1 = 5.6; dur = 6.6;
    const head = (t: number) => x0 + (x1 - x0) * Math.min(1, Math.max(0, (t - T0) / (T1 - T0)));
    const wave = Array.from({length: 301}, (_, j) => { const x = x0 + (x1 - x0) * j / 300; return [x, yb - amp * Math.sin(2 * Math.PI * (x - x0) / (lamNm * ppn))] as P2; });
    poly(wave, 'accent', 4, {draw: 0, keys: {draw: [[T0, 0], [T1, 1, 'linear']]}});
    props.push({id: 'electron', type: 'circle', x: x0, y: yb, r: 10 * k, style: {fill: 'cool', stroke: 'ink', width: 2 * k}, layer: 4, keys: {x: keysOf(dur, head)}} as Prop);
    // λ bracket on one full wavelength near the middle
    const xa = x0 + Math.ceil((x1 - x0) * .4 / (lamNm * ppn)) * lamNm * ppn, xb2 = xa + lamNm * ppn, yl = yb - amp - 26 * k;
    line([xa, yl], [xb2, yl], 'accent', 3, {show: [T1, 1e9]}); line([xa, yl - 10 * k], [xa, yl + 10 * k], 'accent', 3, {show: [T1, 1e9]}); line([xb2, yl - 10 * k], [xb2, yl + 10 * k], 'accent', 3, {show: [T1, 1e9]});
    label((xa + xb2) / 2, yl - 16 * k, num ? `λ = ${sig(lamNm)} nm` : 'λ', 'accent', 26, halo(k, 'accent', {show: [T1, 1e9]}));
    // the crystal: atoms 0.2 nm apart, below, to the same scale
    const ya = by + bh * .72, gap = .2 * ppn;
    for (let x = x0, j = 0; x <= x1 + 1; x += gap, j++) for (const dy of [0, 1]) props.push({id: `atom${j}-${dy}`, type: 'circle', x, y: ya + dy * gap * .8, r: 9 * k, style: {fill: 'figure', stroke: 'muted', width: 1.5 * k}, layer: 2} as Prop);
    label(gx, ya - 30 * k, num ? 'atoms in a crystal, about 0.2 nm apart, to the same scale' : 'atoms in a crystal, to the same scale', 'muted', 22, {align: 'start'});
    label(x1, by + bh * .96, num ? 'scale: 2 nm across' : '', 'faint', 20, {align: 'end'});
    anchors.electron = [x1, yb]; anchors.wavelength = [(xa + xb2) / 2, yl]; anchors.crystal = [(x0 + x1) / 2, ya];
    story = lamNm > .05 ? 'A moving electron has a wavelength λ = h/p, close to the spacing of atoms in a crystal' : 'A moving electron has a wavelength λ = h/p: the faster it moves, the shorter, here well below the spacing of atoms';
    second = 'So a crystal can diffract electrons as it does X-rays: their wave nature shows';
    facts.push(`electron speed ${sci(v, 'm/s')}`, 'wave and atoms drawn to one scale');
  } else {
    // a ruler in powers of ten, 10⁻³⁶ m to 10⁻⁶ m, with the ball's and the electron's wavelengths among things we know
    const m = s.mass ?? .15, u = s.body_speed ?? 30, body = s.body ?? 'ball', lb = lambdaOf(m, u);
    const e0 = -36, e1 = -5, rx0 = bx + bw * .04, rx1 = bx + bw * .96, ry = by + bh * .55, RX = (L: number) => rx0 + (Math.log10(L) - e0) / (e1 - e0) * (rx1 - rx0);
    arrow([rx0, ry], [rx1 + 10 * k, ry], 'ink', 3);
    for (let p = e0; p <= e1; p += 3) { line([RX(10 ** p), ry - 8 * k], [RX(10 ** p), ry + 8 * k], 'ink', 2); if (num) label(RX(10 ** p), ry + 34 * k, `10${String(p).replace('-', '⁻').split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c] ?? c).join('')}`, 'muted', 20); }
    label(rx0, ry + 70 * k, num ? 'length, metres (each step ×1000)' : 'length', 'muted', 22, {align: 'start'});
    const marks: [number, string, string, boolean][] = [[lb, `${body}'s λ`, 'bad', true], [1e-15, 'a nucleus', 'muted', false], [lamNm * 1e-9, "electron's λ", 'accent', true], [1e-10, 'an atom', 'muted', false], [5e-7, 'visible light', 'cool', false]];
    marks.forEach(([L, t, c, up], j) => {
      const x = RX(L), t0 = .6 + j * .9, yt = up ? ry - bh * (.18 + .1 * (j % 2)) : ry + bh * (.2 + .08 * (j % 2));
      line([x, ry], [x, yt + (up ? 12 : -24) * k], c, 3, on(t0, t0 + .5));
      props.push({id: `mark${j}`, type: 'circle', x, y: ry, r: 8 * k, style: {fill: c}, layer: 4, show: [t0, 1e9]} as Prop);
      label(x, yt, t, c, 24, halo(k, c, {show: [t0 + .3, 1e9]}));
      if (num && up) label(x, yt - 28 * k, `${sci(L, 'm')}`, c, 20, halo(k, c, {show: [t0 + .3, 1e9]}));
    });
    dur = 6.4;
    anchors.body = [RX(lb), ry]; anchors.electron = [RX(lamNm * 1e-9), ry]; anchors.nucleus = [RX(1e-15), ry]; anchors.atom = [RX(1e-10), ry];
    story = `Everything that moves has λ = h/p, but a ${body}'s is far smaller than a nucleus`;
    second = "No experiment can find it: matter's wave nature shows only for tiny masses like the electron's";
    facts.push(`a ${body}'s λ is ${sci(1e-15 / lb)} times smaller than a nucleus (10⁻¹⁵ m)`, `${body}: ${sig(m)} kg at ${sig(u)} m/s, p = ${sci(m * u, 'kg m/s')}, λ = h/p = ${sci(lb, 'm')}`);
  }
  return finish('matter_wave', s as never, dur, story, second, facts, anchors, s.illustrative);
}
