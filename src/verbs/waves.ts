// wave: waves, computed (NCERT Class 11 Physics, Ch. 14 Waves; 2026-11-02). Every picture is a sum of y = a sin(kx − ωt + φ),
// drawn live, so a crest, a node or a beat is where the formula puts it, not where someone placed it.
//   travelling    a harmonic wave on a string: one element only goes up and down, a crest travels; its y–t beside y–x
//   pulse         a single pulse on a string (with two: they cross, and add up to nothing as they overlap)
//   longitudinal  sound in a pipe: layers of air pushed by a piston, compressions and rarefactions travelling
//   superposition two equal waves at phase difference φ and their sum, amplitude 2a cos(φ/2)
//   reflection    a pulse at a rigid end comes back inverted, at a free end upright
//   standing      two opposite waves and their sum, 2a sin kx cos ωt: nodes and antinodes
//   modes         the harmonics of a string, an open pipe or a closed pipe; frequencies from L and v
//   beats         two close frequencies and their sum: the loudness swells at ν₁ − ν₂
//   compare       two or three displacement–time traces, as a C.R.O. shows them (ICSE Class 10 Sound, 2026-11-05): loudness
//                 (amplitude), pitch (frequency) or quality (wave form: overtones at the same amplitude and frequency)
// Heights are drawn large to be seen; lengths along x are to scale. Motion is slowed to a watchable rate, and says so.
import type {Key} from '../keys.ts';
import type {Plane} from '../plane.ts';
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {round} from '../vec.ts';
import {n2, panel, scene} from './calculus.ts';
import {frame} from './vectors.ts';

export const WAVE_SHOWS = ['travelling', 'pulse', 'longitudinal', 'superposition', 'reflection', 'standing', 'modes', 'beats', 'compare'] as const;
export const WAVE_COMPARES = ['loudness', 'pitch', 'quality'] as const;
/** Wave forms by their harmonics' amplitudes and phases (n = 1, 2, 3 ...): a tuning fork's pure note, the book's triangular
 * wave (Fig. 7.20), and instruments with few (flute) or many (piano) subsidiary notes; drawn to one peak amplitude. */
export const WAVEFORMS: Record<string, {name: string; h: [number, number][]}> = {
  sine: {name: 'tuning fork: a pure note', h: [[1, 0]]},
  triangle: {name: 'a triangular wave', h: [1, 3, 5, 7, 9, 11].map(n => [(n % 4 === 1 ? 1 : -1) / (n * n), 0] as [number, number]).flatMap((x, i) => (i ? [[0, 0], x] : [x])) as [number, number][]},
  square: {name: 'a square wave', h: [1, 3, 5, 7, 9, 11, 13].map(n => [1 / n, 0] as [number, number]).flatMap((x, i) => (i ? [[0, 0], x] : [x])) as [number, number][]},
  flute: {name: 'flute: few overtones', h: [[1, 0], [0.28, 0.6], [0.1, 1.1]]},
  violin: {name: 'violin: strong overtones', h: [1, 2, 3, 4, 5, 6, 7, 8].map(n => [1 / n, 0] as [number, number])},
  piano: {name: 'piano: many overtones', h: [[1, 0], [0.55, 0.5], [0.38, 1.3], [0.22, 2.2], [0.14, 0.7], [0.08, 1.7]]},
};
export type WaveSpec = {verb: 'wave'; show: (typeof WAVE_SHOWS)[number]; a?: number; wavelength?: number; frequency?: number; speed?: number;
  k?: number; omega?: number; tension?: number; mu?: number; bulk?: number; rho?: number; phase?: number; direction?: 1 | -1; pulses?: 1 | 2;
  end?: 'rigid' | 'free'; system?: 'string' | 'open_pipe' | 'closed_pipe'; L?: number; harmonics?: number[]; source?: number; nu1?: number; nu2?: number; window?: number;
  title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean;
  /** compare: what differs between the traces, and its values: amplitudes (mm), frequencies (Hz) or wave forms */
  compare?: (typeof WAVE_COMPARES)[number]; amplitudes?: number[]; frequencies?: number[]; waveforms?: string[];
  against?: {wavelength: number; frequency: number}};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const f = (v: number) => { const r = round(v, 9); return n2(r, Math.abs(r) >= 100 || Number.isInteger(r) ? 0 : Math.abs(r) < 0.1 ? 4 : 2); };
const num = (v: number) => (v === 0 ? '0' : v.toFixed(6));

/** λ, ν, v from whichever the spec gives: the book's y = a sin(kx − ωt) (k, omega), or two of λ, ν, v, or v from T and μ or B and ρ. */
function model(s: WaveSpec) {
  let v = s.speed;
  if (s.tension !== undefined && s.mu !== undefined) v = Math.sqrt(s.tension / s.mu);
  if (s.bulk !== undefined && s.rho !== undefined) v = Math.sqrt(s.bulk / s.rho);
  let lam = s.wavelength, nu = s.frequency;
  if (s.k !== undefined) lam = 2 * Math.PI / s.k;
  if (s.omega !== undefined) nu = s.omega / (2 * Math.PI);
  if (lam === undefined && nu !== undefined && v !== undefined) lam = v / nu;
  if (nu === undefined && lam !== undefined && v !== undefined) nu = v / lam;
  if (v === undefined && lam !== undefined && nu !== undefined) v = lam * nu;
  return {a: s.a ?? 0.1, lam: lam ?? 1, nu: nu ?? 1, v: v ?? (lam ?? 1) * (nu ?? 1), given: lam !== undefined && nu !== undefined};
}

function modeFreq(s: WaveSpec, n: number, v: number) { const L = s.L ?? 1; return s.system === 'closed_pipe' ? (2 * n - 1) * v / (4 * L) : n * v / (2 * L); }

/** Waves in a compound's panels are compared, so they share one scale: each is drawn against the longest wavelength and
 *  the lowest frequency among them. Drawn alone, each would fill its panel alike and the comparison would show nothing. */
export function shareWaveScale(specs: unknown[]) {
  const moving = (specs as WaveSpec[]).filter(s => s?.verb === 'wave' && (s.show === 'travelling' || s.show === 'longitudinal'));
  if (moving.length < 2 || !moving.every(s => model(s).given)) return;
  const against = {wavelength: Math.max(...moving.map(s => model(s).lam)), frequency: Math.min(...moving.map(s => model(s).nu))};
  for (const s of moving) s.against = against;
}

// A wave at most this many times shorter or quicker than the one it is compared with is still drawn truly; beyond it, it would be a blur.
const MOST_AGAINST = 3;

function compareErrors(s: WaveSpec): string[] {
  const e: string[] = [], W = 'wave';
  for (const n of ['compare', 'amplitudes', 'frequencies', 'waveforms'] as const) if (s[n] !== undefined && s.show !== 'compare') e.push(`${W}: ${n} is for show compare`);
  if (s.show !== 'compare') return e;
  if (!WAVE_COMPARES.includes(s.compare!)) return [...e, `${W}: compare is ${WAVE_COMPARES.join(', ')}: what differs between the traces (amplitude, frequency or wave form)`];
  const list = (n: 'amplitudes' | 'frequencies', unit: string) => {
    const v = s[n];
    if (v === undefined) return;
    if (!(Array.isArray(v) && v.length >= 2 && v.length <= 3 && v.every(x => isNum(x) && x > 0))) { e.push(`${W}: ${n} is 2 or 3 values in ${unit}, above 0, one trace each`); return; }
    if (new Set(v).size < v.length) e.push(`${W}: ${n} must differ, or the traces show nothing`);
    else if (Math.max(...v) / Math.min(...v) > (n === 'frequencies' ? 6 : 8)) e.push(`${W}: ${n}: the largest at most ${n === 'frequencies' ? 6 : 8} times the smallest, so both can be drawn to one scale`);
  };
  list('amplitudes', 'mm'); list('frequencies', 'Hz');
  if (s.waveforms !== undefined && !(Array.isArray(s.waveforms) && s.waveforms.length >= 2 && s.waveforms.length <= 3 && s.waveforms.every(x => x in WAVEFORMS) && new Set(s.waveforms).size === s.waveforms.length))
    e.push(`${W}: waveforms is 2 or 3 different ones of ${Object.keys(WAVEFORMS).join(', ')}`);
  const own = {loudness: 'amplitudes', pitch: 'frequencies', quality: 'waveforms'}[s.compare!];
  for (const n of ['amplitudes', 'frequencies', 'waveforms'] as const) if (s[n] !== undefined && n !== own) e.push(`${W}: compare ${s.compare} varies only ${own}; leave out ${n} (the rest are kept the same)`);
  if (!s.illustrative && s.compare !== 'quality' && s[own as 'amplitudes'] === undefined)
    e.push(`${W}: compare ${s.compare} needs ${own} (${own === 'amplitudes' ? 'mm' : 'Hz'}, 2 or 3 values); or, when the narration states no numbers, set illustrative: true`);
  return e;
}

export function waveErrors(s: WaveSpec): string[] {
  const e: string[] = [], W = 'wave';
  if (!WAVE_SHOWS.includes(s.show)) return [`${W}: show is one of ${WAVE_SHOWS.join(', ')}`];
  for (const n of ['a', 'wavelength', 'frequency', 'speed', 'k', 'omega', 'tension', 'mu', 'bulk', 'rho', 'L', 'source', 'nu1', 'nu2', 'window'] as const)
    if (s[n] !== undefined && !(isNum(s[n]) && s[n]! > 0)) e.push(`${W}: ${n} is above 0`);
  if (s.phase !== undefined && !(isNum(s.phase) && Math.abs(s.phase) <= 360)) e.push(`${W}: phase is in degrees, −360 to 360`);
  if (s.direction !== undefined && ![1, -1].includes(s.direction)) e.push(`${W}: direction is 1 (along +x) or -1`);
  if (s.pulses !== undefined && ![1, 2].includes(s.pulses)) e.push(`${W}: pulses is 1 or 2 (two opposite pulses crossing)`);
  if (s.end !== undefined && !['rigid', 'free'].includes(s.end)) e.push(`${W}: end is rigid or free`);
  if (s.tension !== undefined && s.mu === undefined) e.push(`${W}: tension needs mu (kg/m): v = √(T/μ)`);
  if (s.bulk !== undefined && s.rho === undefined) e.push(`${W}: bulk needs rho (kg/m³): v = √(B/ρ)`);
  const given = [s.wavelength ?? s.k, s.frequency ?? s.omega, s.speed ?? s.tension ?? s.bulk].filter(x => x !== undefined).length;
  if (given === 3) { const m = model({...s, speed: undefined, tension: undefined, bulk: undefined}), v = model({...s, wavelength: undefined, k: undefined}).v;
    if (Math.abs(m.v - v) > 0.01 * v) e.push(`${W}: λν = ${f(m.v)} m/s disagrees with the speed ${f(v)} m/s; give any two`); }
  const numbers = s.show !== 'modes' && s.show !== 'beats' && s.show !== 'pulse' && s.show !== 'reflection' && s.show !== 'compare';
  e.push(...compareErrors(s));
  if (numbers && !s.illustrative && given < 2) e.push(`${W}: give two of wavelength (or k), frequency (or omega), speed (or tension and mu, or bulk and rho); or, when the narration states no numbers, set illustrative: true`);
  if (s.show === 'modes') {
    if (s.system !== undefined && !['string', 'open_pipe', 'closed_pipe'].includes(s.system)) e.push(`${W}: system is string, open_pipe or closed_pipe`);
    if (s.harmonics !== undefined && !(Array.isArray(s.harmonics) && s.harmonics.length >= 1 && s.harmonics.length <= 4 && s.harmonics.every(n => Number.isInteger(n) && n >= 1 && n <= 12)))
      e.push(`${W}: harmonics is 1 to 4 mode numbers n, 1 to 12; in a closed pipe n gives the odd harmonic 2n − 1`);
    if (!s.illustrative && (s.L === undefined || model(s).v === undefined || (s.speed === undefined && s.tension === undefined && s.bulk === undefined))) e.push(`${W}: modes needs L (m) and speed (or tension and mu); or set illustrative: true`);
  }
  if (s.show === 'beats') {
    if (!s.illustrative && (s.nu1 === undefined || s.nu2 === undefined)) e.push(`${W}: beats needs nu1 and nu2 (Hz); or set illustrative: true`);
    if (s.nu1 !== undefined && s.nu1 === s.nu2) e.push(`${W}: nu1 and nu2 must differ, or there are no beats`);
    const n1 = s.nu1 ?? 11, n2_ = s.nu2 ?? 9;
    if (Math.abs(n1 - n2_) > 0.5 * Math.max(n1, n2_)) e.push(`${W}: beats need close frequencies: nu1 and nu2 within a third or so`);
    if ((s.window ?? 2 / Math.abs(n1 - n2_)) * Math.max(n1, n2_) > 60) e.push(`${W}: too many waves to draw: shorten window (s), to a few beats and 60 waves at most`);
  }
  return e;
}

export function wave(s: WaveSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080;
  const fr = frame(W, H, k, s.title), box = fr.box, props: Prop[] = [...fr.titles];
  const plane: Plane = {id: 'p', x: [0, 1], y: [0, 1], box};
  const m = model(s), {a, lam, nu, v} = m, dir = s.direction ?? 1, phi = (s.phase ?? 0) * Math.PI / 180;
  const facts: string[] = [];
  // a period on screen takes 2.5 s; `TW` is its ω on screen
  const trueShort = s.against ? s.against.wavelength / lam : 1, trueQuick = s.against ? nu / s.against.frequency : 1;
  const shorter = Math.min(trueShort, MOST_AGAINST), quicker = Math.min(trueQuick, MOST_AGAINST);
  const TW = 2 * Math.PI / 2.5 * quicker, lead = 1;
  const curve = (id: string, expr: string, stroke = 'accent', width = 5, extra: Record<string, unknown> = {}) =>
    props.push({id, type: 'curve', plane: 'p', expr, live: true, samples: 360, style: {stroke, width: width * k}, layer: 2, ...extra} as Prop);
  const still = (id: string, expr: string, stroke = 'faint', width = 2, dash = true) =>
    props.push({id, type: 'curve', plane: 'p', expr, samples: 360, style: {stroke, width: width * k, ...(dash ? {dash: [8 * k, 6 * k]} : {})}} as Prop);
  const line = (id: string, x1: number, y1: number, x2: number, y2: number, stroke = 'muted', width = 3, extra: Record<string, unknown> = {}) =>
    props.push({id, type: 'line', plane: 'p', x1, y1, x2, y2, style: {stroke, width: width * k}, ...extra} as Prop);
  const label = (id: string, x: number, y: number, t: string, fill = 'muted', size = 28, align = 'middle', extra: Record<string, unknown> = {}) =>
    props.push({id, type: 'text', plane: 'p', x, y, text: t, size: size * k, weight: 700, align, style: {fill}, layer: 3, ...extra} as Prop);
  const dot = (id: string, x: Key[] | number, y: Key[] | number, fill = 'accent', r = 11) =>
    props.push({id, type: 'circle', plane: 'p', x: typeof x === 'number' ? x : 0, y: typeof y === 'number' ? y : 0, r: r * k, style: {fill, stroke: 'ink', width: 2 * k}, layer: 3,
      keys: {...(typeof x === 'number' ? {} : {x}), ...(typeof y === 'number' ? {} : {y})}} as Prop);
  const keys = (end: number, fn: (t: number) => number, per = 24): Key[] => { const n = Math.ceil(end * per); return Array.from({length: n + 1}, (_, i) => { const t = end * i / n; return (i ? [t, fn(t), 'linear'] : [t, fn(t)]) as Key; }); };
  let dur = 8, story = '', second = '';
  const anchors: Record<string, [number, number]> = {};

  if (s.show === 'travelling') {
    // two wavelengths across; the upper part y against x, the lower the marked element's y against t
    const across = 2 * shorter, K = 2 * Math.PI * across, top = 0.72, amp = 0.17, xe = 0.3, sg = dir;
    const Y = `${top} + ${amp} * sin(${num(K)} * x - ${num(sg * TW)} * t)`, ey = (t: number) => top + amp * Math.sin(K * xe - sg * TW * t);
    line('rest', 0, top, 1, top, 'faint', 2); curve('w', Y); dot('el', xe, keys(dur, ey), 'bad', 13); label('lel', xe, top + amp + 0.07, 'this bit only goes up and down', 'bad', 22);
    // a crest rides along at v: its phase stays fixed
    // sin(Kx − ωt) = 1: x = (π/2 + ωt)/K, wrapped across the window
    const whole = Math.floor(across) / across, xc = (t: number) => { const c = (0.25 / across + sg * TW * t / K) % whole; return (c + whole) % whole; };
    dot('crest', keys(dur, xc, 60), top + amp, 'cool', 11);
    line('lam0', 0.375, top - amp - 0.05, 0.375 + 1 / across, top - amp - 0.05, 'muted', 3); label('lam', 0.35, top - amp - 0.06, 'λ', 'ink', 30, 'end');
    const by = 0.22, ba = 0.13, W1 = TW;
    line('ax', 0.03, by, 1, by, 'muted', 2); label('ny', 0.03, by + ba + 0.05, 'y of the marked bit, against t', 'muted', 22, 'start');
    props.push({id: 'et', type: 'curve', plane: 'p', expr: `${by} + ${ba} * sin(${num(K * xe)} - ${num(sg * W1 * dur / 0.97)} * (x - 0.03))`, from: 0.03, to: 1, draw: 0, samples: 300, keys: {draw: [[0, 0], [dur, 1, 'linear']]}, style: {stroke: 'bad', width: 4 * k}} as Prop);
    story = 'The wave travels; each piece of string only goes up and down';
    second = `One period later the pattern has moved one wavelength: v = λν`;
    if (s.against) second = `Drawn to one scale with the wave beside it: ${f(lam)} m, ${f(nu)} Hz`;
    if (trueShort > MOST_AGAINST || trueQuick > MOST_AGAINST) second = `Too short or quick to draw beside the other at true scale: ${f(lam)} m, ${f(nu)} Hz`;
  } else if (s.show === 'pulse') {
    const two = s.pulses === 2, w = 0.07, amp = 0.28, c = 0.5, sp = 0.13; dur = 7;
    const p = (centre: string, sign: number) => `${sign * amp} * exp(0 - ((x - (${centre})) / ${w}) ^ 2)`;
    const x1 = `0.1 + ${sp} * t`, x2 = `0.9 - ${sp} * t`;
    line('rest', 0, c, 1, c, 'faint', 2);
    curve('w', `${c} + ${p(x1, 1)}${two ? ` + ${p(x2, -1)}` : ''}`);
    const xe = 0.5, ey = (t: number) => c + amp * Math.exp(-(((xe - (0.1 + sp * t)) / w) ** 2)) - (two ? amp * Math.exp(-(((xe - (0.9 - sp * t)) / w) ** 2)) : 0);
    dot('el', xe, keys(dur, ey, 30), 'bad', 12);
    story = two ? 'Equal and opposite pulses cross: for a moment they add up to nothing, then go on unchanged' : 'The pulse moves along; the string itself only moves up and back down';
    second = two ? 'Displacements add: y = y₁ + y₂' : 'A wave carries energy along, not the string';
  } else if (s.show === 'longitudinal') {
    // layers of air in a pipe, shifted by s = s₀ sin(kx − ωt): crowded where it is compressed
    const K = 2 * Math.PI * 2.5 * shorter, top = 0.62, half = 0.2, n = 64, shift = 0.022; dur = 7.5;
    line('p1', 0.05, top + half, 1, top + half, 'ink', 4); line('p2', 0.05, top - half, 1, top - half, 'ink', 4);
    const piston = (t: number) => 0.035 + shift * Math.sin(-TW * t);
    props.push({id: 'piston', type: 'line', plane: 'p', x1: 0, y1: top + half, x2: 0, y2: top - half, style: {stroke: 'accent', width: 14 * k}, layer: 2, keys: {x1: keys(dur, piston), x2: keys(dur, piston)}} as Prop);
    for (let i = 0; i < n; i++) {
      const x0 = 0.06 + 0.91 * i / (n - 1), x = (t: number) => x0 + shift * Math.sin(K * x0 - TW * t);
      const marked = i === 16;
      props.push({id: `l${i}`, type: 'line', plane: 'p', x1: 0, y1: top + half * 0.92, x2: 0, y2: top - half * 0.92, style: {stroke: marked ? 'bad' : 'cool', width: (marked ? 5 : 2.5) * k}, keys: {x1: keys(dur, x, 12), x2: keys(dur, x, 12)}} as Prop);
    }
    const by = 0.17, ba = 0.11;
    line('ax', 0.05, by, 1, by, 'muted', 2); label('nb', 0.05, by + ba + 0.045, 'pressure above and below normal', 'muted', 22, 'start');
    // pressure peaks where the layers crowd: −ds/dx
    curve('pr', `${by} - ${ba} * cos(${num(K)} * x - ${num(TW)} * t)`, 'accent', 4, {from: 0.05, to: 1});
    story = 'Layers of air move back and forth along the wave: compressions and rarefactions travel down the pipe';
    second = 'The marked layer only moves to and fro';
  } else if (s.show === 'superposition') {
    const K = 2 * Math.PI * 2, r = [0.83, 0.57, 0.22], amp = 0.09;
    const y1 = `sin(${num(K)} * x - ${num(TW)} * t)`, y2 = `sin(${num(K)} * x - ${num(TW)} * t + ${num(phi)})`;
    r.forEach((c, i) => line(`rest${i}`, 0, c, 1, c, 'faint', 2));
    curve('a', `${r[0]} + ${amp} * ${y1}`, 'accent', 4); curve('b', `${r[1]} + ${amp} * ${y2}`, 'cool', 4); curve('sum', `${r[2]} + ${amp} * (${y1} + ${y2})`, 'ink', 5);
    label('n1', 0.01, r[0] + amp + 0.03, 'y₁', 'accent', 26, 'start'); label('n2', 0.01, r[1] + amp + 0.03, 'y₂', 'cool', 26, 'start'); label('n3', 0.01, r[2] + 2 * amp + 0.02, 'y₁ + y₂', 'ink', 26, 'start');
    const res = 2 * a * Math.abs(Math.cos(phi / 2));
    facts.push(`resultant amplitude 2a cos(φ/2) = ${f(res)} m, with a = ${f(a)} m and φ = ${f(s.phase ?? 0)}°`);
    story = Math.abs(Math.cos(phi / 2)) > 0.999 ? 'In step, they add: amplitude 2a. Constructive interference' : Math.abs(Math.cos(phi / 2)) < 0.001 ? 'Half a wave out of step, they cancel: destructive interference' : 'The sum is a wave of the same wavelength, its amplitude set by the phase difference';
    second = 'Resultant amplitude = 2a cos(φ/2)';
  } else if (s.show === 'reflection') {
    const c = 0.5, amp = 0.26, w = 0.07, sp = 0.14, rigid = s.end !== 'free'; dur = 9;
    const pp = (centre: string) => `${amp} * exp(0 - ((x - (${centre})) / ${w}) ^ 2)`, X = `0.08 + ${sp} * t`, R = `1.92 - ${sp} * t`, wallX = 1;
    line('rest', 0, c, 1, c, 'faint', 2);
    curve('w', `${c} + ${pp(X)} ${rigid ? '-' : '+'} ${pp(R)}`);
    if (rigid) props.push({id: 'wall', type: 'line', plane: 'p', x1: wallX, y1: c - 0.35, x2: wallX, y2: c + 0.35, style: {stroke: 'ink', width: 12 * k}} as Prop);
    else { line('rod', wallX, c - 0.35, wallX, c + 0.35, 'muted', 3); props.push({id: 'ring', type: 'circle', plane: 'p', x: wallX, y: 0, r: 12 * k, style: {stroke: 'ink', width: 4 * k, fill: 'none'}, layer: 3, keys: {y: keys(dur, t => { const e = (u: number) => amp * Math.exp(-(((1 - u) / w) ** 2)); return c + e(0.08 + sp * t) + e(1.92 - sp * t); }, 30)}} as Prop); }
    label('e', wallX - 0.01, c + 0.39, rigid ? 'rigid end' : 'free end', 'muted', 24, 'end');
    story = rigid ? 'At a rigid end the pulse comes back upside down: a phase change of π' : 'At a free end the pulse comes back upright: no phase change';
    second = 'Same speed, same wavelength, on the way back';
  } else if (s.show === 'standing') {
    const K = 2 * Math.PI * 1.5, c0 = 0.28, c1 = 0.8, amp = 0.09, big = 0.16;
    line('r1', 0, c1, 1, c1, 'faint', 2);
    curve('a', `${c1} + ${amp} * sin(${num(K)} * x - ${num(TW)} * t)`, 'accent', 3); curve('b', `${c1} + ${amp} * sin(${num(K)} * x + ${num(TW)} * t)`, 'cool', 3);
    label('nt', 0.01, c1 + amp + 0.03, 'two waves, opposite ways', 'muted', 22, 'start');
    line('r0', 0, c0, 1, c0, 'faint', 2);
    still('ep', `${c0} + ${big} * sin(${num(K)} * x)`); still('en', `${c0} - ${big} * sin(${num(K)} * x)`);
    curve('s', `${c0} + ${big} * sin(${num(K)} * x) * cos(${num(TW)} * t)`, 'ink', 5);
    for (let i = 0; i <= 3; i++) { const x = i / 3; dot(`n${i}`, x, c0, 'bad', 9); label(`ln${i}`, Math.min(0.98, Math.max(0.02, x)), c0 - 0.05, 'N', 'bad', 24); }
    for (let i = 0; i < 3; i++) label(`la${i}`, (i + 0.5) / 3, c0 + big + 0.035, 'A', 'cool', 24);
    story = 'Added, they make a pattern that stays put: y = 2a sin kx cos ωt. Nodes never move; antinodes swing the most';
    second = 'Neighbouring nodes are λ/2 apart';
    facts.push('nodes at x = 0, λ/2, λ, …', 'antinodes at x = λ/4, 3λ/4, …');
  } else if (s.show === 'modes') {
    const sys = s.system ?? 'string', L = s.L ?? 1, list = s.harmonics ?? [1, 2, 3], rows = list.length, h = 1 / rows, vv = v;
    list.forEach((n, i) => {
      const c = 1 - (i + 0.5) * h, amp = 0.32 * h;
      const shape = sys === 'string' ? `sin(${num(n * Math.PI)} * x)` : sys === 'open_pipe' ? `cos(${num(n * Math.PI)} * x)` : `sin(${num((2 * n - 1) * Math.PI / 2)} * x)`;
      const rate = TW * 0.6;
      if (sys !== 'string') { line(`pt${i}`, 0, c + 0.42 * h, 1, c + 0.42 * h, 'ink', 3); line(`pb${i}`, 0, c - 0.42 * h, 1, c - 0.42 * h, 'ink', 3); if (sys === 'closed_pipe') line(`pc${i}`, 0, c - 0.42 * h, 0, c + 0.42 * h, 'ink', 9); }
      else { line(`r${i}`, 0, c, 1, c, 'faint', 2); dot(`e${i}a`, 0, c, 'muted', 7); dot(`e${i}b`, 1, c, 'muted', 7); }
      still(`ep${i}`, `${c} + ${amp} * ${shape}`); still(`en${i}`, `${c} - ${amp} * ${shape}`);
      curve(`m${i}`, `${c} + ${amp} * ${shape} * cos(${num(rate * (sys === 'closed_pipe' ? 2 * n - 1 : n) / (sys === 'closed_pipe' ? 2 : 1))} * t)`, 'accent', 4);
      const harm = sys === 'closed_pipe' ? 2 * n - 1 : n, fq = modeFreq(s, n, vv);
      props.push({id: `lb${i}`, type: 'text', plane: 'p', x: 0.015, y: c + 0.36 * h, text: harm === 1 ? 'fundamental' : `harmonic ${harm}`, size: 22 * k, weight: 700, style: {fill: 'muted'}, layer: 3} as Prop);
      facts.push(`harmonic ${harm}: ν = ${f(fq)} Hz, wavelength ${f(sys === 'closed_pipe' ? 4 * L / harm : 2 * L / n)} m`);
    });
    story = { string: 'Fixed at both ends, a whole number of half-waves must fit: ν = nv/2L', open_pipe: 'Open at both ends, a whole number of half-waves fit: ν = nv/2L, all harmonics', closed_pipe: 'Closed at one end, a node at the closed end: ν = (2n − 1)v/4L, only odd harmonics' }[sys];
    second = sys === 'closed_pipe' ? 'Closed end: node. Open end: antinode' : sys === 'open_pipe' ? 'Antinodes at both open ends' : 'Nodes at both fixed ends';
    if (s.source !== undefined) { const base = modeFreq(s, 1, vv), r = s.source / base, step = sys === 'closed_pipe' ? (Math.abs(((r + 1) / 2) - Math.round((r + 1) / 2)) < 0.01) : Math.abs(r - Math.round(r)) < 0.01;
      facts.push(step ? `a ${f(s.source)} Hz source resonates: it is harmonic ${Math.round(r)}, ${f(base)} Hz × ${Math.round(r)}` : `a ${f(s.source)} Hz source does not resonate: ${f(s.source)} / ${f(base)} = ${f(r)} is not an allowed harmonic`); }
  } else if (s.show === 'compare') {
    // two or three traces, one above another, sharing one time axis and one displacement scale, drawn left to right
    const kind = s.compare!, amps = kind === 'loudness' ? s.amplitudes ?? [1, 2] : undefined, freqs = kind === 'pitch' ? s.frequencies ?? [1, 2] : undefined;
    const forms = kind === 'quality' ? s.waveforms ?? ['sine', 'piano'] : undefined, n = (amps ?? freqs ?? forms)!.length;
    const top = Math.max(...(amps ?? [1])), low = Math.min(...(freqs ?? [1]));
    const cycles = kind === 'pitch' ? 2.5 : 3, h = 1 / n, amp = 0.3 * h, draw = {draw: 0, keys: {draw: [[lead, 0], [lead + 3, 1, 'linear']]}, live: false, samples: 900};
    const order = (v: number[], i: number) => v.filter(x => x < v[i]).length;   // rank of trace i, smallest first
    const rank = (v: number[], i: number, words: string[][]) => words[v.length - 2][order(v, i)];
    const loud = [['softer: smaller amplitude', 'louder: larger amplitude'], ['soft: small amplitude', 'louder: larger amplitude', 'loudest: largest amplitude']];
    const high = [['lower pitch (grave): lower frequency', 'higher pitch (shrill): higher frequency'], ['low pitch: low frequency', 'higher pitch: higher frequency', 'highest pitch: highest frequency']];
    const colours = ['accent', 'cool', 'good'];
    for (let i = 0; i < n; i++) {
      const c = 1 - (i + 0.5) * h, K = 2 * Math.PI * cycles * (freqs ? freqs[i] / low : 1), A = amp * (amps ? amps[i] / top : 1);
      let y = `sin(${num(K)} * x)`;
      if (forms) {
        const hs = WAVEFORMS[forms[i]].h, terms = hs.map(([a, p], j) => (a ? `${num(a)} * sin(${num((j + 1) * K)} * x + ${num(p)})` : '')).filter(Boolean);
        // scaled to one peak, so the loudness looks the same: only the shape differs
        let peak = 0;
        for (let q = 0; q <= 2000; q++) { const x = q / 2000 / cycles; peak = Math.max(peak, Math.abs(hs.reduce((sum, [a, p], j) => sum + a * Math.sin((j + 1) * K * x + p), 0))); }
        y = `(${terms.join(' + ')}) / ${num(peak)}`;
      }
      line(`rest${i}`, 0, c, 1, c, 'faint', 2);
      line(`yax${i}`, 0, c - amp * 1.12, 0, c + amp * 1.12, 'faint', 2);
      curve(`w${i}`, `${c} + ${num(A)} * ${y}`, colours[i], 4, draw);
      const words = amps ? rank(amps, i, loud) : freqs ? rank(freqs, i, high) : WAVEFORMS[forms![i]].name;
      const value = s.illustrative ? '' : amps ? `, a = ${f(amps[i])} mm` : freqs ? `, ${f(freqs[i])} Hz` : '';
      label(`n${i}`, 0.015, c + amp + 0.045 * Math.min(1, 2 / n), words + value, colours[i], n === 3 ? 22 : 24, 'start');
    }
    label('nt', 1, -0.035, 'time', 'muted', 22, 'end');
    dur = lead + 3 + 3;
    if (kind === 'loudness') {
      story = 'Same frequency and wave form, different amplitude: the larger amplitude is the louder sound';
      second = 'Loudness grows as the square of the amplitude';
      if (s.amplitudes) facts.push(`loudness ratio (${f(top)} / ${f(Math.min(...amps!))})² = ${f((top / Math.min(...amps!)) ** 2)}`, 'same pitch and same quality: same frequency and wave form');
    } else if (kind === 'pitch') {
      story = 'Same amplitude and wave form, different frequency: the higher frequency is the higher pitch (a shrill sound)';
      second = 'More waves in the same time';
      if (s.frequencies) facts.push(`frequencies ${freqs!.map(x => `${f(x)} Hz`).join(', ')}: the ${f(Math.max(...freqs!))} Hz note has the ${n === 2 ? 'higher' : 'highest'} pitch`, 'same loudness and quality: same amplitude and wave form', `time shown ${f(cycles / low * 1000)} ms`);
    } else {
      story = 'Same amplitude and frequency, so the same loudness and pitch, but different wave forms: a different quality (timbre)';
      second = 'The overtones (subsidiary notes) sounding with the fundamental shape the wave';
      facts.push('quality depends on the wave form: the number and strength of the subsidiary notes with the principal note');
    }
  } else {
    const n1 = s.nu1 ?? 11, n2_ = s.nu2 ?? 9, beat = Math.abs(n1 - n2_), span = s.window ?? 2 / beat, r = [0.85, 0.6, 0.23], amp = 0.09; dur = 8;
    const y1 = `sin(${num(2 * Math.PI * n1 * span)} * x)`, y2 = `sin(${num(2 * Math.PI * n2_ * span)} * x)`, draw = {draw: 0, keys: {draw: [[lead, 0], [lead + 5, 1, 'linear']]}, live: false, samples: 800};
    r.forEach((c, i) => line(`rest${i}`, 0, c, 1, c, 'faint', 2));
    curve('a', `${r[0]} + ${amp} * ${y1}`, 'accent', 3, draw); curve('b', `${r[1]} + ${amp} * ${y2}`, 'cool', 3, draw); curve('sum', `${r[2]} + ${amp} * (${y1} + ${y2})`, 'ink', 3, draw);
    const env = `${2 * amp} * cos(${num(Math.PI * (n1 - n2_) * span)} * x)`;
    still('e1', `${r[2]} + ${env}`, 'bad', 2); still('e2', `${r[2]} - ${env}`, 'bad', 2);
    label('n1', 0.01, r[0] + amp + 0.025, s.illustrative ? 'ν₁' : `ν₁ = ${f(n1)} Hz`, 'accent', 24, 'start'); label('n2', 0.01, r[1] + amp + 0.025, s.illustrative ? 'ν₂' : `ν₂ = ${f(n2_)} Hz`, 'cool', 24, 'start'); label('n3', 0.01, r[2] + 2 * amp + 0.015, 'the sum', 'ink', 24, 'start');
    anchors.start = [box[0], box[3]]; anchors.end = [box[2], box[3]];
    facts.push(`beat frequency ν₁ − ν₂ = ${f(beat)} Hz`, `one beat every ${f(1 / beat)} s`);
    story = 'The two drift in and out of step: the sum swells and fades'; second = 'Beats per second = ν₁ − ν₂';
  }

  if (s.show === 'travelling' || s.show === 'longitudinal' || s.show === 'standing' || s.show === 'superposition') {
    if (s.wavelength !== undefined || s.k !== undefined || s.frequency !== undefined || s.omega !== undefined || s.speed !== undefined || s.tension !== undefined || s.bulk !== undefined) {
      facts.unshift(`wavelength λ = ${f(lam)} m`, `frequency ν = ${f(nu)} Hz`, `period T = ${f(1 / nu)} s`, `angular wave number k = 2π/λ = ${f(2 * Math.PI / lam)} rad/m`, `ω = 2πν = ${f(2 * Math.PI * nu)} rad/s`, `speed v = λν = ${f(v)} m/s`);
    }
  }
  if (s.tension !== undefined) facts.push(`v = √(T/μ) = √(${f(s.tension)} / ${f(s.mu!)}) = ${f(v)} m/s`);
  if (s.bulk !== undefined) facts.push(`v = √(B/ρ) = ${f(v)} m/s`);

  // the panel
  const px = fr.px, ptext = panel(W, k);
  let row = fr.row;
  const say = (id: string, t: string, when: number, extra: Record<string, unknown> = {}) => {
    props.push(ptext(id, px, row, t, 28 * k, {show: [when, 1e9], ...extra} as never));
    row += wrapText(t, 28 * k, W - px - 40 * k).length * 1.28 * 28 * k + 8 * k;
  };
  say('s1', story, 0.3, {weight: 700});
  if (second) say('s2', second, 0.3 + lead, {style: {fill: 'muted'}});
  if (!s.illustrative) facts.slice(0, 3).forEach((t, i) => say(`f${i}`, t[0].toUpperCase() + t.slice(1), lead + 1 + i * 0.5));
  if (s.show === 'compare') say('sc', 'Displacement against time, as a C.R.O. screen shows it', 0.3, {style: {fill: 'faint'}});
  else if (s.show !== 'modes' || !s.illustrative) say('sc', 'Heights enlarged and motion slowed, to be seen', 0.3, {style: {fill: 'faint'}});
  return scene(s, W, H, dur, plane, props, [], {verb: 'wave', facts, anchors});
}
