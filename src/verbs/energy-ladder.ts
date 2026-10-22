// energy_ladder: an electron (the figure) on hydrogen's energy levels drawn as the rungs of a ladder, at their true
// heights (E_n = −13.6 eV / n², so the rungs crowd together towards 0 eV). Absorbing a photon lifts it; falling back
// emits one. A jump is a quantum jump: the figure vanishes from one rung and appears on the other, with no
// in-between, and an arrow marks the jump as in a textbook energy-level diagram. Each photon's energy is the gap
// between the rungs, and its wavelength and colour follow from E = hc / λ.
import {bandOf, colourName, hydrogenLevel, readable, wavelengthColour, wavelengthNm} from '../physics/light.ts';
import type {Actor, Prop, Scene} from '../scene.ts';
import {round, type Vec} from '../vec.ts';

export type LadderEvent = {at: number; kind: 'absorb' | 'emit'; from: number; to: number};
export type LadderSpec = {
  verb: 'energy_ladder'; atom?: 'hydrogen'; levels?: number[]; start?: number; events: LadderEvent[];
  title?: string; width?: number; height?: number; fps?: number; duration?: number; theme?: 'dark' | 'light';
  /** A visible-light strip where each emitted line appears, at its wavelength and colour, as it is emitted. */
  spectrum?: boolean;
};
export type LadderFact = {at: number; kind: 'absorb' | 'emit'; from: number; to: number; energy_ev: number;
  wavelength_nm: number; band: string; colour: string; colour_name: string};

const MIN_GAP = 2.5;          // seconds between events, so each one can be followed
const TRAVEL = 1.2;           // seconds a photon takes to cross to the atom

export function ladderErrors(spec: LadderSpec): string[] {
  const errors: string[] = [];
  if (spec.atom && spec.atom !== 'hydrogen') errors.push(`energy_ladder: only hydrogen is supported, not ${spec.atom}`);
  const levels = spec.levels ?? [1, 2, 3, 4, 5, 6];
  if (!levels.length || levels.some((n, i) => !Number.isInteger(n) || n < 1 || (i && n <= levels[i - 1])))
    errors.push('energy_ladder: levels must be whole numbers from 1 upwards, in increasing order');
  if (levels.length > 8) errors.push('energy_ladder: at most 8 levels (the higher ones are too close to tell apart)');
  let level = spec.start ?? levels[0];
  if (!levels.includes(level)) errors.push(`energy_ladder: start ${level} is not one of the levels ${levels.join(', ')}`);
  if (!Array.isArray(spec.events) || !spec.events.length) return [...errors, 'energy_ladder: give at least one event'];
  let last = -Infinity;
  spec.events.forEach((e, i) => {
    const where = `energy_ladder event ${i + 1} (t = ${e.at} s)`;
    if (typeof e.at !== 'number' || e.at < TRAVEL + 0.2) errors.push(`${where}: starts before ${TRAVEL + 0.2} s, too soon for its photon to arrive`);
    if (e.at - last < MIN_GAP) errors.push(`${where}: less than ${MIN_GAP} s after the previous event`);
    last = e.at;
    if (e.kind !== 'absorb' && e.kind !== 'emit') errors.push(`${where}: kind is absorb or emit`);
    if (e.from !== level) errors.push(`${where}: the electron is on level ${level}, not ${e.from}`);
    if (!levels.includes(e.to)) errors.push(`${where}: level ${e.to} is not one of the levels (ionisation is not drawn yet)`);
    if (e.kind === 'absorb' && !(e.to > e.from)) errors.push(`${where}: absorbing a photon moves the electron up, to a higher n`);
    if (e.kind === 'emit' && !(e.to < e.from)) errors.push(`${where}: emitting a photon moves the electron down, to a lower n`);
    level = e.to;
  });
  return errors;
}

export function ladderFacts(spec: LadderSpec): LadderFact[] {
  return spec.events.map(e => {
    const energy = Math.abs(hydrogenLevel(e.to) - hydrogenLevel(e.from));
    const nm = wavelengthNm(energy);
    return {at: e.at, kind: e.kind, from: e.from, to: e.to, energy_ev: round(energy, 3), wavelength_nm: round(nm, 1),
      band: bandOf(nm), colour: wavelengthColour(nm), colour_name: colourName(nm)};
  });
}

const sub = (n: number) => String(n).replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]);
const minus = (x: number, places = 2) => (x < 0 ? '−' : '') + Math.abs(x).toFixed(places);

export function energyLadder(spec: LadderSpec): Scene {
  const W = spec.width ?? 1920, H = spec.height ?? 1080, k = H / 1080;
  const levels = spec.levels ?? [1, 2, 3, 4, 5, 6];
  const facts = ladderFacts(spec);
  const cx = 0.36 * W, half = 0.07 * W;
  const yTop = 0.17 * H, yBottom = 0.86 * H;
  const yOf = (n: number) => yTop + (-hydrogenLevel(n) / 13.6) * (yBottom - yTop);
  const rung = 7 * k, figureX = cx - 0.012 * W, scale = 0.8 * k;
  const stand = (n: number): Vec => [figureX, yOf(n) - rung / 2];
  const body = (n: number) => yOf(n) - 0.45 * 176 * scale;         // where a photon meets the figure: the middle of its body
  const props: Prop[] = [];

  // The ladder: two rails and a rung per level, then n = ∞ (0 eV) dashed at the top.
  for (const x of [cx - half, cx + half]) props.push({id: `rail${x}`, type: 'line', x1: x, y1: yTop - 30 * k, x2: x, y2: yBottom + 45 * k, style: {stroke: 'muted', width: 9 * k}});
  props.push({id: 'infinity', type: 'line', x1: cx - half, y1: yTop, x2: cx + half, y2: yTop, style: {stroke: 'muted', width: 4 * k, dash: [10 * k, 9 * k]}});
  props.push({id: 'infinity-label', type: 'text', x: cx - half - 26 * k, y: yTop - 34 * k, align: 'end', text: 'n = ∞    0 eV (electron free)', size: 26 * k, style: {fill: 'muted'}});
  // Labels sit left of the ladder; where rungs crowd, one label names the cluster.
  let lastY = Infinity, crowd: number[] = [];
  const flush = () => {
    if (!crowd.length) return;
    // The crowded top rungs share one small label, in the gap above "n = 4" on the left.
    props.push({id: `label-crowd`, type: 'text', x: cx - half - 26 * k, y: yTop + 10 * k, align: 'end', size: 20 * k, text: `n = ${crowd.join(', ')} …`, style: {fill: 'muted'}});
  };
  for (const n of levels) {
    const y = yOf(n);
    props.push({id: `rung${n}`, type: 'line', x1: cx - half, y1: y, x2: cx + half, y2: y, style: {stroke: 'ink', width: rung}});
    if (lastY - y >= 36 * k && y - yTop >= 30 * k) {
      props.push({id: `label${n}`, type: 'text', x: cx - half - 26 * k, y, align: 'end', size: 30 * k, text: `n = ${n}    ${minus(hydrogenLevel(n))} eV`});
      lastY = y;
    } else crowd.push(n);
  }
  flush();
  props.push({id: 'axis-note', type: 'text', x: cx - half - 26 * k, y: yBottom + 70 * k, align: 'end', size: 22 * k, text: 'rungs at their true energies', style: {fill: 'muted'}});
  if (spec.title) props.push({id: 'title', type: 'text', x: 0.6 * W, y: 0.16 * H, size: 46 * k, weight: 700, text: spec.title, width: 0.37 * W});

  const actor: Actor = {id: 'electron', rig: 'figure', at: stand(spec.start ?? levels[0]), scale, facing: 1,
    pose: [{t: 0, pose: 'stand'}], base: [{t: 0, at: stand(spec.start ?? levels[0])}], opacity: [[0, 1]],
    blink: [], expression: [{t: 0, face: 'neutral'}], pulse: [], layer: 2};
  props.push({id: 'badge', type: 'text', x: 0, y: 0, text: 'e⁻', size: 30 * k, weight: 700, align: 'middle', anchor: {actor: 'electron', joint: 'crown', offset: [0, -24 * k]}, style: {fill: 'accent'}, layer: 3});

  const ends = facts.map((f, i) => (facts[i + 1]?.at ?? Infinity));
  facts.forEach((f, i) => {
    const t = f.at, absorb = f.kind === 'absorb';
    const visual = 22 + 46 * Math.min(1, Math.max(0, Math.log(f.wavelength_nm / 90) / Math.log(1900 / 90)));
    const wave = {wavelength: visual * k, amplitude: 15 * k, length: Math.max(170, 5 * visual) * k};
    const style = {stroke: f.colour, width: 5 * k};
    // The photon: arriving from the right before an absorption, leaving to the right after an emission.
    if (absorb) {
      const x1 = W + 10, x2 = figureX + 30 * k, L = x1 - x2;
      props.push({id: `photon${i}`, type: 'wave', x1, y1: body(f.from), x2, y2: body(f.from), progress: 0, ...wave,
        keys: {progress: [[t - TRAVEL, 0], [t, L / (L + wave.length), 'linear']]}, show: [t - TRAVEL - 0.05, t + 0.04], fade: 0.06, style});
    } else {
      const x1 = figureX + 30 * k, x2 = W + 10;
      props.push({id: `photon${i}`, type: 'wave', x1, y1: body(f.to), x2, y2: body(f.to), progress: 0, ...wave,
        keys: {progress: [[t + 0.25, 0], [t + 0.25 + 1.6, 1, 'linear']]}, show: [t + 0.2, t + 1.9], fade: 0.05, style});
    }
    // The jump: vanish, the arrow draws, appear on the new rung.
    const go = absorb ? t + 0.1 : t, appear = go + 0.35;
    (actor.opacity as [number, number][]).push([go, 1], [go + 0.1, 0], [appear - 0.05, 0], [appear + 0.1, 1]);
    actor.base!.push({t: go + 0.12, at: stand(f.from)}, {t: go + 0.13, at: stand(f.to), ease: 'linear'});
    actor.blink!.push([go, appear + 0.15]);
    actor.pose!.push({t: go + 0.13, pose: 'land', ease: 'hold'}, {t: appear + 0.6, pose: 'stand'});
    actor.expression!.push({t: go + 0.13, face: absorb ? 'surprise' : 'focus'}, {t: appear + 0.8, face: absorb ? 'smile' : 'neutral'});
    if (absorb) actor.pulse!.push(t - 0.05);
    const ax = cx + half + (46 + 30 * i) * k;
    props.push({id: `jump${i}`, type: 'arrow', x1: ax, y1: yOf(f.from), x2: ax, y2: yOf(f.to), draw: 0,
      keys: {draw: [[go, 0], [appear, 1, 'out']]}, show: [go, (spec.duration ?? Infinity)], fade: 0.01,
      style: {stroke: f.colour, width: 5 * k, dash: absorb ? undefined : [12 * k, 8 * k]}});

    // What happened, in numbers, on the right; each card stays until the next event.
    const x = 0.6 * W, y0 = 0.5 * H, until = Math.min(ends[i], Infinity);
    const show: [number, number] = [appear, until === Infinity ? 1e9 : until];
    const hi = Math.max(f.from, f.to), lo = Math.min(f.from, f.to);
    const gapText = `ΔE = E${sub(hi)} − E${sub(lo)} = ${minus(hydrogenLevel(hi))} − (${minus(hydrogenLevel(lo))}) = ${f.energy_ev.toFixed(2)} eV`;
    const nmText = `λ = hc / ΔE = 1240 / ${f.energy_ev.toFixed(2)} = ${f.wavelength_nm.toFixed(0)} nm`;
    const name = f.band === 'visible' ? `visible: ${f.colour_name}` : `${f.band} (we can't see it)`;
    props.push(
      {id: `card${i}-head`, type: 'text', x, y: y0, size: 40 * k, weight: 700, show, text: absorb ? `Absorbs a photon: n = ${f.from} → ${f.to}` : `Emits a photon: n = ${f.from} → ${f.to}`},
      {id: `card${i}-gap`, type: 'text', x, y: y0 + 70 * k, size: 32 * k, show, text: gapText},
      {id: `card${i}-nm`, type: 'text', x, y: y0 + 125 * k, size: 32 * k, show, text: nmText},
      {id: `card${i}-swatch`, type: 'circle', x: x + 16 * k, y: y0 + 190 * k, r: 16 * k, show, style: {fill: f.colour}},
      {id: `card${i}-band`, type: 'text', x: x + 46 * k, y: y0 + 190 * k, size: 32 * k, show, text: name, style: {fill: readable(f.colour)}},
    );
  });
  if (spec.spectrum) props.push(...spectrumStrip(facts, W, H, k));
  const duration = Math.max(spec.duration ?? 0, (facts[facts.length - 1]?.at ?? 0) + 3);
  return {linkwork: 1, width: W, height: H, fps: spec.fps ?? 30, duration, theme: spec.theme ?? 'dark',
    surfaces: levels.map(n => ({x0: cx - half, x1: cx + half, y: yOf(n) - rung / 2})), props, actors: [actor],
    meta: {verb: 'energy_ladder', facts}};
}

/** The visible spectrum (380–750 nm) as a dim strip; each emitted visible line lights up on it when it is emitted,
 * and ultraviolet or infrared emissions are noted off its ends. */
function spectrumStrip(facts: LadderFact[], W: number, H: number, k: number): Prop[] {
  const x0 = 0.6 * W, x1 = 0.95 * W, y = 0.82 * H, h = 46 * k;
  const xOf = (nm: number) => x0 + (nm - 380) / (750 - 380) * (x1 - x0);
  const props: Prop[] = [];
  for (let nm = 380; nm < 750; nm += 5)
    props.push({id: `band${nm}`, type: 'rect', x: xOf(nm), y, w: xOf(nm + 5) - xOf(nm) + 0.5, h, style: {fill: wavelengthColour(nm + 2.5), opacity: 0.22}});
  props.push({id: 'band-label', type: 'text', x: x0, y: y - 26 * k, size: 24 * k, text: 'visible light', style: {fill: 'muted'}},
    {id: 'band-400', type: 'text', x: xOf(400), y: y + h + 22 * k, size: 20 * k, align: 'middle', text: '400 nm', style: {fill: 'muted'}},
    {id: 'band-700', type: 'text', x: xOf(700), y: y + h + 22 * k, size: 20 * k, align: 'middle', text: '700 nm', style: {fill: 'muted'}});
  let uv = 0, ir = 0;
  facts.forEach((f, i) => {
    if (f.kind !== 'emit') return;
    const t = f.at + 0.3;
    if (f.band === 'visible') {
      const x = xOf(f.wavelength_nm);
      props.push({id: `line${i}`, type: 'line', x1: x, y1: y - 6 * k, x2: x, y2: y + h + 6 * k, style: {stroke: f.colour, width: 6 * k}, show: [t, 1e9], pulse: [t], layer: 2},
        {id: `line${i}-nm`, type: 'text', x, y: y + h + 48 * k, size: 22 * k, weight: 700, align: 'middle', text: `${f.wavelength_nm.toFixed(0)}`, style: {fill: readable(f.colour)}, show: [t, 1e9]});
    } else {
      const left = f.band === 'ultraviolet', n = left ? uv++ : ir++;
      // Off the strip: noted above it, beside its label (ultraviolet first, then infrared).
      props.push({id: `off${i}`, type: 'text', x: x0 + (180 + (left ? n : uv + n) * 150) * k, y: y - 26 * k, size: 22 * k, weight: 700,
        text: `${left ? 'UV' : 'IR'} ${f.wavelength_nm.toFixed(0)} nm`, style: {fill: readable(f.colour)}, show: [t, 1e9]});
    }
  });
  return props;
}
