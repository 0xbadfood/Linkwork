// atmosphere: atmospheric refraction (Class 10 The Human Eye and the Colourful World, C7, 2026-10-28). The air's
// refractive index rises towards the ground, so light from a star or the Sun bends gradually as it comes down: the
// ray's path is traced by integrating d(n t)/ds = ∇n step by step. star: flat layers; the star is seen along the
// light's last direction, higher than it is, and (twinkle) its light wavers. sunrise: curved layers round the Earth;
// the Sun still below the horizon is seen above it, about 2 minutes before it rises (and after it sets). The real
// bending is about half a degree at the horizon, too little to see, so it is drawn stronger and the frame says so.
import type {Key} from '../keys.ts';
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {deg, round, type Vec} from '../vec.ts';

type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};
export type AtmosphereSpec = Common & {
  verb: 'atmosphere';
  /** star: a star's light through layers of air; sunrise: the Sun seen before it rises over the horizon. */
  scene: 'star' | 'sunrise';
  /** star: its light flickers as the air's layers shift (twinkling). */
  twinkle?: boolean;
  /** star: a planet beside it, which does not twinkle (it is a disc, many points whose flickers average out). */
  planet?: boolean;
  panel?: boolean;
  seconds?: number;
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const unit = (a: Vec): Vec => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };

/** A ray traced through a medium of index n(p) with gradient g(p): d(n t)/ds = ∇n, in steps of ds. */
function march(p0: Vec, t0: Vec, n: (p: Vec) => number, g: (p: Vec) => Vec, ds: number, steps: number, stop: (p: Vec) => boolean): Vec[] {
  const pts: Vec[] = [p0];
  let p = p0, v: Vec = [t0[0] * n(p0), t0[1] * n(p0)];
  for (let i = 0; i < steps; i++) {
    const gr = g(p);
    v = [v[0] + gr[0] * ds, v[1] + gr[1] * ds];
    const t = unit(v);
    p = [p[0] + t[0] * ds, p[1] + t[1] * ds];
    if (i % 3 === 0) pts.push(p);
    if (stop(p)) break;
  }
  pts.push(p);
  return pts;
}

export function atmosphereErrors(s: AtmosphereSpec): string[] {
  const e: string[] = [];
  if (!['star', 'sunrise'].includes(s.scene)) e.push('atmosphere: scene is star or sunrise');
  if (s.twinkle !== undefined && typeof s.twinkle !== 'boolean') e.push('atmosphere: twinkle is true or false');
  if ((s.twinkle || s.planet) && s.scene !== 'star') e.push('atmosphere: twinkle and planet go with scene star');
  if (s.planet !== undefined && typeof s.planet !== 'boolean') e.push('atmosphere: planet is true or false');
  if (s.panel !== undefined && typeof s.panel !== 'boolean') e.push('atmosphere: panel is true or false');
  if (s.seconds !== undefined && !(isNum(s.seconds) && s.seconds >= 4 && s.seconds <= 20)) e.push('atmosphere: seconds is 4 to 20');
  return e;
}

export function atmosphere(s: AtmosphereSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, panel = s.panel !== false;
  const left = 0.04 * W, right = panel ? 0.62 * W : 0.96 * W, top = panel ? 0.12 * H : (s.title ? 0.24 : 0.13) * H, bottom = 0.93 * H;
  const T = s.seconds ?? 9, props: Prop[] = [], facts: string[] = [], anchors: Record<string, Vec> = {};
  const draw = (t0: number, t1: number) => ({draw: 0, keys: {draw: [[t0, 0], [t1, 1, 'linear']] as Key[]}});
  const r2 = (p: Vec): Vec => [round(p[0], 2), round(p[1], 2)];
  let lines: string[];
  if (s.scene === 'star') {
    // Screen y grows downwards; the air is denser lower down: n rises linearly from the top of the air to the ground.
    const ground = bottom - 40 * k, airTop = top + 0.22 * (bottom - top), a = 0.5 / (ground - airTop);   // drawn bending
    const n = (p: Vec) => 1 + Math.max(0, Math.min(1, (p[1] - airTop) / (ground - airTop))) * 0.5;
    const g = (p: Vec): Vec => [0, p[1] > airTop && p[1] < ground ? a : 0];
    for (let j = 0; j < 6; j++) {
      const y = airTop + (j * (ground - airTop)) / 6;
      props.push({id: `layer${j}`, type: 'rect', x: left, y: round(y, 2), w: right - left, h: round((ground - airTop) / 6, 2), style: {fill: 'cool', opacity: 0.04 + 0.04 * j}, layer: 0});
    }
    props.push({id: 'ground', type: 'rect', x: left, y: ground, w: right - left, h: bottom - ground, style: {fill: 'faint', opacity: 0.9}},
      {id: 'air-label', type: 'text', x: right - 12 * k, y: airTop + 30 * k, text: 'thinner air', size: 24 * k, align: 'end', style: {fill: 'muted'}},
      {id: 'air-label2', type: 'text', x: right - 12 * k, y: ground - 18 * k, text: 'denser air', size: 24 * k, align: 'end', style: {fill: 'muted'}});
    const eye: Vec = [left + 0.7 * (right - left), ground], star: Vec = [left + 0.12 * (right - left), top + 30 * k];
    // Trace back from the observer and aim so the light comes from the star: bisect on the angle seen.
    // A ray's path is the same traced either way (d(n t)/ds = ∇n does not depend on the direction of travel).
    const back = (angle: number) => march(eye, [-Math.sin(angle), -Math.cos(angle)], n, g, 3 * k, 4000, p => p[1] <= star[1]);
    let lo = 0.05, hi = 1.4;
    for (let j = 0; j < 40; j++) { const mid = (lo + hi) / 2, end = back(mid).at(-1)!; if (end[0] < star[0]) hi = mid; else lo = mid; }
    const path = back((lo + hi) / 2).reverse();
    const first = path[1], last = path.at(-1)!, beforeLast = path.at(-4)!;
    const seenDir = unit([beforeLast[0] - last[0], beforeLast[1] - last[1]]);
    const apparent: Vec = [eye[0] + seenDir[0] * (eye[1] - star[1]) / -seenDir[1], star[1]];
    void first;
    props.push({id: 'star', type: 'circle', x: star[0], y: star[1], r: 10 * k, style: {fill: 'accent'}, layer: 5},
      {id: 'star-label', type: 'text', x: star[0] + 20 * k, y: star[1] + 6 * k, text: 'star (where it is)', size: 26 * k, style: {fill: 'accent'}, layer: 5},
      {id: 'light', type: 'polyline', points: path.map(r2), ...draw(0.6, 3.2), style: {stroke: 'accent', width: 4.5 * k}, layer: 4},
      {id: 'seen', type: 'line', x1: eye[0], y1: eye[1], x2: round(apparent[0], 2), y2: round(apparent[1], 2), ...draw(3.4, 4.4), style: {stroke: 'cool', width: 3 * k, dash: [12 * k, 9 * k]}, layer: 3},
      {id: 'apparent', type: 'circle', x: round(apparent[0], 2), y: round(apparent[1], 2), r: 10 * k, show: [4.4, 1e9], fade: 0.3, style: {fill: 'cool', opacity: 0.85}, layer: 5},
      {id: 'apparent-label', type: 'text', x: round(apparent[0] + 24 * k, 2), y: round(apparent[1] + 40 * k, 2), text: 'where it is seen', size: 26 * k, show: [4.6, 1e9], fade: 0.3, style: {fill: 'cool'}, layer: 5},
      ...observer(eye, k));
    anchors.star = star; anchors.apparent = r2(apparent); anchors.eye = eye;
    if (s.twinkle) {
      // Twinkling: the shifting layers send now more, now less of the star's light to the eye.
      const keys: Key[] = Array.from({length: Math.round(T * 6)}, (_, j) => [round(4.6 + j / 6, 3), 0.35 + 0.65 * Math.abs(Math.sin(j * 2.3) * Math.cos(j * 1.7))] as Key);
      props.push({id: 'twinkle', type: 'circle', x: round(apparent[0], 2), y: round(apparent[1], 2), r: 18 * k, keys: {opacity: keys}, show: [4.6, 1e9], style: {fill: 'accent', opacity: 0.6}, layer: 6});
    }
    if (s.planet) {
      const p: Vec = [right - 60 * k, top + 70 * k];
      props.push({id: 'planet', type: 'circle', x: p[0], y: p[1], r: 22 * k, style: {fill: 'good'}, layer: 5},
        {id: 'planet-label', type: 'text', x: p[0] - 34 * k, y: p[1] + 8 * k, text: 'planet: steady', size: 26 * k, align: 'end', style: {fill: 'good'}, layer: 5});
      anchors.planet = p;
    }
    const bend = deg(Math.acos(Math.max(-1, Math.min(1, -seenDir[1] * unit([star[0] - eye[0], star[1] - eye[1]])[1] * -1 + seenDir[0] * unit([star[0] - eye[0], star[1] - eye[1]])[0]))));
    lines = ['Starlight bends as it comes down through denser and denser air', 'We see the star along the light\'s last direction: higher than it is',
      ...(s.twinkle ? ['The air keeps shifting, so the light reaching the eye flickers: the star twinkles'] : []),
      ...(s.planet ? ['A planet is a small disc, many points whose flickers cancel: it does not twinkle'] : [])];
    facts.push('starlight is refracted continuously by layers of air of gradually changing refractive index, bending towards the normal as it comes down, so a star appears slightly higher than it really is',
      `here the bending is drawn far stronger than it really is (about ${Math.round(bend)}°), so it can be seen`);
    if (s.twinkle) facts.push('because the air keeps moving, the star\'s apparent position and the amount of its light reaching the eye keep changing: it twinkles');
    if (s.planet) facts.push('planets are much closer and are seen as extended sources; the variations from their many points cancel, so planets do not twinkle');
  } else {
    // The Earth's curve: a large circle whose top is the observer; the air a shell over it, denser near the ground.
    const Re = 1.15 * (right - left), shell = 0.24 * (bottom - top), cx = left + 0.66 * (right - left), cy = top + 0.5 * (bottom - top) + Re;
    const centre: Vec = [cx, cy], eye: Vec = [cx, cy - Re];
    // The light curves round with a radius of about 1.6 Earth radii: gentler than the ground, so it stays in the air,
    // yet by the time it leaves the air it has turned well below the observer's horizon.
    const strength = 1 / (1.6 * Re);
    const n = (p: Vec) => { const h = Math.hypot(p[0] - cx, p[1] - cy) - Re; return 1 + strength * Math.max(0, shell - h); };
    const g = (p: Vec): Vec => { const r = Math.hypot(p[0] - cx, p[1] - cy), h = r - Re; return h > 0 && h < shell ? [-(p[0] - cx) / r * strength, -(p[1] - cy) / r * strength] : [0, 0]; };
    // Arcs kept inside the drawing: points beyond its sides are dropped.
    const arc = (r: number) => Array.from({length: 121}, (_, j) => { const a = -Math.PI / 2 - 0.9 + j * 1.8 / 120; return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as Vec; })
      .filter(p => p[0] >= left && p[0] <= right && p[1] <= bottom).map(r2);
    props.push({id: 'air', type: 'polyline', points: [...arc(Re + shell), ...arc(Re).reverse()], closed: true, style: {fill: 'cool', opacity: 0.16, stroke: 'cool', width: 2 * k}, layer: 0},
      {id: 'earth', type: 'polyline', points: [...arc(Re), [arc(Re).at(-1)![0], bottom] as Vec, [arc(Re)[0][0], bottom] as Vec], closed: true,
        style: {fill: 'faint', stroke: 'good', width: 4 * k}, layer: 1},
      {id: 'horizon', type: 'line', x1: left, y1: eye[1], x2: right, y2: eye[1], style: {stroke: 'muted', width: 2.5 * k, dash: [14 * k, 10 * k]}, layer: 2},
      {id: 'horizon-label', type: 'text', x: left + 10 * k, y: eye[1] - 14 * k, text: 'horizon', size: 24 * k, style: {fill: 'muted'}, layer: 2},
      ...observer(eye, k));
    // Trace back from the observer, looking a little above the horizon towards the left.
    const look = 0.07, path = march(eye, unit([-Math.cos(look), -Math.sin(look)]), n, g, 3 * k, 6000,
      p => Math.hypot(p[0] - cx, p[1] - cy) > Re + shell + 2 || p[0] < left);
    const last = path.at(-1)!, prev = path.at(-4)!, out = unit([last[0] - prev[0], last[1] - prev[1]]);
    const sunAt = (p: Vec, d: Vec, y: number): Vec => [p[0] + d[0] * (y - p[1]) / d[1], y];
    // The Sun where the traced light comes in from (the drawing's edge), well below the horizon.
    void sunAt;
    const sunPos: Vec = [last[0] + 40 * k, last[1] - out[1] / Math.max(1e-6, -out[0]) * 40 * k];
    const seenSun: Vec = [left + 60 * k, eye[1] - Math.tan(look) * (eye[0] - left - 60 * k)];
    props.push({id: 'sun', type: 'circle', x: round(sunPos[0], 2), y: round(sunPos[1], 2), r: 30 * k, style: {fill: 'accent'}, layer: 3},
      {id: 'sun-label', type: 'text', x: round(sunPos[0] + 40 * k, 2), y: round(sunPos[1] + 46 * k, 2), text: 'the Sun: still below the horizon', size: 26 * k, style: {fill: 'accent', stroke: 'paper', width: 8 * k}, layer: 6},
      {id: 'light', type: 'polyline', points: [...path.map(r2)].reverse(), ...draw(0.6, 3.2), style: {stroke: 'accent', width: 4.5 * k}, layer: 4},
      {id: 'seen', type: 'line', x1: eye[0], y1: eye[1], x2: round(seenSun[0], 2), y2: round(seenSun[1], 2), ...draw(3.4, 4.4), style: {stroke: 'cool', width: 3 * k, dash: [12 * k, 9 * k]}, layer: 3},
      {id: 'apparent', type: 'circle', x: round(seenSun[0], 2), y: round(seenSun[1], 2), r: 30 * k, show: [4.4, 1e9], fade: 0.3, style: {fill: 'accent', opacity: 0.45}, layer: 3},
      {id: 'apparent-label', type: 'text', x: round(seenSun[0] + 44 * k, 2), y: round(seenSun[1] - 20 * k, 2), text: 'where it is seen: above the horizon', size: 26 * k, show: [4.6, 1e9], fade: 0.3, style: {fill: 'cool', stroke: 'paper', width: 8 * k}, layer: 6});
    anchors.sun = r2(sunPos); anchors.apparent = r2(seenSun); anchors.eye = eye; anchors.horizon = [left + 10 * k, eye[1]];
    void centre;
    lines = ['Sunlight bends as it passes through the curved layers of air', 'The Sun is seen above the horizon while it is still below it',
      'So it is seen about 2 minutes before it rises, and about 2 minutes after it sets'];
    facts.push('because of atmospheric refraction the Sun is seen about 2 minutes before it actually crosses the horizon at sunrise, and about 2 minutes after it crosses it at sunset',
      'the bending is drawn far stronger than it is (about half a degree near the horizon), so it can be seen; the Sun also looks flattened at sunrise and sunset for the same reason');
  }
  props.push({id: 'note', type: 'text', x: left + 6 * k, y: s.scene === 'star' ? bottom - 8 * k : top + 18 * k, text: 'bending drawn much stronger than it really is', size: 22 * k, style: {fill: 'muted'}, layer: 7});
  if (panel) {
    const px = 0.66 * W, pw = W - px - 40 * k;
    let row = 0.14 * H;
    if (s.title) { props.push({id: 'title', type: 'text', x: px, y: row, text: s.title, size: 44 * k, weight: 700, width: pw}); row += wrapText(s.title, 44 * k, pw).length * 1.25 * 44 * k + 18 * k; }
    lines.forEach((text, j) => { props.push({id: `line${j}`, type: 'text', x: px, y: row, text, size: 30 * k, width: pw, weight: j ? 400 : 700, show: [1 + 1.6 * j, 1e9], fade: 0.3}); row += wrapText(text, 30 * k, pw).length * 1.3 * 30 * k + 12 * k; });
  } else if (s.title) props.push({id: 'title', type: 'text', x: left, y: 0.16 * H, text: s.title, size: 44 * k, weight: 700, width: 0.92 * W});
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: T, theme: s.theme ?? 'dark', props, actors: [], meta: {verb: 'atmosphere', facts, anchors}};
}

/** An observer's eye: an almond outline and a pupil, just above the ground point it stands at, labelled. */
function observer(at: Vec, k: number): Prop[] {
  const c: Vec = [at[0], at[1] - 26 * k], w = 30 * k, h = 15 * k;
  const lid = (sign: number) => Array.from({length: 13}, (_, j) => { const x = -w + (2 * w * j) / 12; return [round(c[0] + x, 2), round(c[1] + sign * h * (1 - (x / w) ** 2), 2)] as Vec; });
  return [{id: 'eye-upper', type: 'polyline', points: lid(-1), style: {stroke: 'ink', width: 3 * k}, layer: 6},
    {id: 'eye-lower', type: 'polyline', points: lid(1), style: {stroke: 'ink', width: 3 * k}, layer: 6},
    {id: 'eye-pupil', type: 'circle', x: c[0], y: c[1], r: 7 * k, style: {fill: 'ink'}, layer: 6},
    {id: 'eye-label', type: 'text', x: c[0], y: c[1] + 40 * k, text: 'observer', size: 24 * k, align: 'middle', style: {fill: 'muted'}, layer: 6}];
}
