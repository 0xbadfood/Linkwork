// scattering: the scattering of light (Class 10 The Human Eye and the Colourful World, C8, 2026-10-28). Particles
// much smaller than light's wavelength (air molecules) scatter it in proportion to 1/λ⁴, so blue far more than red:
// the sky is blue, and the Sun, whose light crosses much more air near the horizon, is red at sunrise and sunset;
// red signal lights carry farthest through fog or smoke. Larger particles (a colloid, dust) scatter every colour, so a
// beam's path shows through them (the Tyndall effect). Colours here are computed: the light left after a path of length
// L is exp(−τ L (550/λ)⁴) of each colour, mixed from red, green and blue.
import type {Key} from '../keys.ts';
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {round, type Vec} from '../vec.ts';

type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};
export type ScatteringSpec = Common & {
  verb: 'scattering';
  /** tyndall: a beam through a clear liquid and a colloid; sky: air scattering blue; sunset: the Sun overhead and at the
   * horizon; fog: red and blue lamps seen through fog; sizes: very fine, larger and large particles side by side,
   * scattering blue, longer wavelengths and white. */
  scene: 'tyndall' | 'sky' | 'sunset' | 'fog' | 'sizes';
  panel?: boolean;
  seconds?: number;
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
/** The colour of white light after a path through air of optical depth tau (at 550 nm), as #rrggbb. */
export function transmitted(tau: number): string {
  const t = [650, 550, 450].map(nm => Math.exp(-tau * (550 / nm) ** 4)), max = Math.max(...t);
  const [r, g, b] = t.map(v => Math.round(255 * v / max));
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}
/** How many times more strongly light of a wavelength is scattered than red (700 nm), by the 1/λ⁴ law. */
export const versusRed = (nm: number) => (700 / nm) ** 4;
/** A fixed pseudo-random sequence, so a scene is the same every time it is compiled. */
const noise = (i: number) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };

export function scatteringErrors(s: ScatteringSpec): string[] {
  const e: string[] = [];
  if (!['tyndall', 'sky', 'sunset', 'fog', 'sizes'].includes(s.scene)) e.push('scattering: scene is tyndall, sky, sunset, fog or sizes');
  if (s.panel !== undefined && typeof s.panel !== 'boolean') e.push('scattering: panel is true or false');
  if (s.seconds !== undefined && !(isNum(s.seconds) && s.seconds >= 4 && s.seconds <= 20)) e.push('scattering: seconds is 4 to 20');
  return e;
}

export function scattering(s: ScatteringSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, panel = s.panel !== false;
  const left = 0.04 * W, right = panel ? 0.62 * W : 0.96 * W, top = panel ? 0.12 * H : (s.title ? 0.24 : 0.13) * H, bottom = 0.93 * H;
  const T = s.seconds ?? 9, props: Prop[] = [], facts: string[] = [], anchors: Record<string, Vec> = {};
  const draw = (t0: number, t1: number) => ({draw: 0, keys: {draw: [[t0, 0], [t1, 1, 'linear']] as Key[]}});
  const label = (id: string, text: string, x: number, y: number, fill: string, t = 0, align: 'start' | 'middle' | 'end' = 'start') =>
    props.push({id, type: 'text', x: round(x, 2), y: round(y, 2), text, size: 26 * k, align, weight: 700, show: [t, 1e9], fade: 0.3, style: {fill, stroke: 'paper', width: 7 * k}, layer: 7});
  const w = right - left, h = bottom - top;
  let lines: string[] = [];
  if (s.scene === 'tyndall') {
    // Two tanks side by side, one beam through each: invisible in the clear liquid, its path lit up in the colloid.
    [['clear water', 0, false], ['a colloid (milky water, smoke)', 1, true]].forEach(([name, j, colloid]) => {
      const x0 = left + (j as number) * w / 2 + 0.06 * w, x1 = x0 + 0.36 * w, y0 = top + 0.3 * h, y1 = top + 0.75 * h, yb = (y0 + y1) / 2;
      props.push({id: `tank${j}`, type: 'rect', x: round(x0, 2), y: round(y0, 2), w: round(x1 - x0, 2), h: round(y1 - y0, 2), style: {fill: 'cool', opacity: 0.14, stroke: 'cool', width: 3 * k}, layer: 1},
        {id: `torch${j}`, type: 'rect', x: round(x0 - 70 * k, 2), y: round(yb - 14 * k, 2), w: 50 * k, h: 28 * k, r: 6 * k, style: {fill: 'muted'}, layer: 3},
        {id: `beam${j}-in`, type: 'line', x1: round(x0 - 20 * k, 2), y1: round(yb, 2), x2: round(x0, 2), y2: round(yb, 2), ...draw(0.5, 0.8), style: {stroke: 'ink', width: 10 * k}, layer: 2},
        {id: `beam${j}-out`, type: 'line', x1: round(x1, 2), y1: round(yb, 2), x2: round(x1 + 30 * k, 2), y2: round(yb, 2), ...draw(1.8, 2.1), style: {stroke: 'ink', width: 10 * k, opacity: colloid ? 0.55 : 1}, layer: 2});
      label(`name${j}`, name as string, (x0 + x1) / 2, y1 + 40 * k, 'cool', 0, 'middle');
      if (colloid) {
        props.push({id: `beam${j}`, type: 'line', x1: round(x0, 2), y1: round(yb, 2), x2: round(x1, 2), y2: round(yb, 2), ...draw(0.8, 1.8), style: {stroke: 'ink', width: 14 * k, opacity: 0.55}, layer: 2});
        for (let i = 0; i < 26; i++) {
          const px = x0 + (x1 - x0) * noise(i), py = yb + (noise(i + 50) - 0.5) * 22 * k, a = noise(i + 100) * Math.PI * 2, L = 18 * k + 26 * k * noise(i + 150);
          props.push({id: `glint${i}`, type: 'line', x1: round(px, 2), y1: round(py, 2), x2: round(px + Math.cos(a) * L, 2), y2: round(py + Math.sin(a) * L, 2), show: [0.8 + 1.0 * (px - x0) / (x1 - x0), 1e9], fade: 0.3,
            style: {stroke: 'ink', width: 2 * k, opacity: 0.7}, layer: 3});
        }
        for (let i = 0; i < 60; i++) props.push({id: `particle${i}`, type: 'circle', x: round(x0 + (x1 - x0) * noise(i + 300), 2), y: round(y0 + (y1 - y0) * noise(i + 400), 2), r: 3 * k, style: {fill: 'muted', opacity: 0.6}, layer: 2});
      } else props.push({id: `beam${j}`, type: 'line', x1: round(x0, 2), y1: round(yb, 2), x2: round(x1, 2), y2: round(yb, 2), ...draw(0.8, 1.8), style: {stroke: 'ink', width: 4 * k, opacity: 0.12}, layer: 2});
      anchors[colloid ? 'colloid' : 'clear'] = [round((x0 + x1) / 2, 2), round(yb, 2)];
    });
    lines = ['In clear water the beam cannot be seen from the side', 'In a colloid the particles scatter light sideways, so the beam\'s path shows', 'This is the Tyndall effect: sunbeams in a dusty room or through a forest canopy'];
    facts.push('a beam of light passing through a colloid is seen from the side because its particles scatter the light: the Tyndall effect; in a true solution or clear water the path is not seen',
      'the colour of scattered light depends on the size of the particles: large ones scatter all colours (white), very fine ones mainly blue');
  } else if (s.scene === 'sky') {
    // Sunlight crossing the air above an observer; each molecule it passes sends a little light off sideways, blue far
    // more than red, and some of that blue comes down to the observer.
    const sun: Vec = [left + 60 * k, top + 60 * k], end: Vec = [right - 30 * k, top + 0.45 * h], eye: Vec = [left + 0.55 * w, bottom - 30 * k];
    props.push({id: 'ground', type: 'rect', x: left, y: bottom - 20 * k, w, h: 20 * k, style: {fill: 'faint'}},
      {id: 'sun', type: 'circle', x: sun[0], y: sun[1], r: 34 * k, style: {fill: '#fff4d6'}, layer: 4},
      {id: 'sunlight', type: 'line', x1: sun[0], y1: sun[1], x2: end[0], y2: end[1], ...draw(0.5, 2.0), style: {stroke: '#fff4d6', width: 8 * k}, layer: 2});
    label('sun-label', 'sunlight (white)', sun[0] + 50 * k, sun[1] - 10 * k, 'accent');
    const colours: [string, number][] = [['#7a4cff', 410], ['#3b7bff', 460], ['#3fbf6a', 530], ['#ffd23f', 580], ['#ff3b30', 680]];
    const weights = colours.map(([, nm]) => 1 / nm ** 4), sum = weights.reduce((a, b) => a + b, 0);
    let made = 0;
    for (let i = 0; i < 18; i++) {
      const f = 0.12 + 0.82 * (i / 17), m: Vec = [sun[0] + (end[0] - sun[0]) * f, sun[1] + (end[1] - sun[1]) * f];
      props.push({id: `molecule${i}`, type: 'circle', x: round(m[0], 2), y: round(m[1], 2), r: 5 * k, style: {fill: 'muted'}, layer: 3});
      // Pick each scattered ray's colour with the 1/λ⁴ weights (a fixed sequence, so the picture is repeatable).
      for (let q = 0; q < 2; q++) {
        let u = noise(i * 7 + q) * sum, c = 0;
        while (c < colours.length - 1 && u > weights[c]) { u -= weights[c]; c++; }
        const toEye = q === 0 && i % 3 === 1, a = toEye ? Math.atan2(eye[1] - m[1], eye[0] - m[0]) : noise(i * 11 + q) * Math.PI * 2;
        const L = toEye ? Math.hypot(eye[0] - m[0], eye[1] - m[1]) - 30 * k : 50 * k;
        props.push({id: `scatter${made++}`, type: 'line', x1: round(m[0], 2), y1: round(m[1], 2), x2: round(m[0] + Math.cos(a) * L, 2), y2: round(m[1] + Math.sin(a) * L, 2),
          ...draw(1.0 + 1.5 * f, 1.6 + 1.5 * f + (toEye ? 1 : 0)), style: {stroke: colours[c][0], width: 3 * k, opacity: 0.9}, layer: 3});
      }
    }
    props.push(...eyeGlyph(eye, k));
    label('eye-label', 'the sky looks blue', eye[0] + 44 * k, eye[1] - 20 * k, 'cool', 3.5);
    anchors.sun = sun; anchors.eye = eye;
    const blue = versusRed(450);
    lines = ['Air molecules are much smaller than light\'s wavelength', `They scatter blue light about ${blue.toFixed(0)} times more strongly than red (1/λ⁴)`, 'Scattered blue reaches our eyes from every part of the sky: it looks blue'];
    facts.push(`air molecules, smaller than the wavelength of light, scatter shorter wavelengths far more: blue light at 450 nm about ${blue.toFixed(1)} times more than red at 700 nm (scattering goes as 1/λ⁴)`,
      'the scattered blue light enters our eyes from all over the sky, so the clear sky looks blue; without an atmosphere (high up, in space) the sky looks dark');
  } else if (s.scene === 'sunset') {
    // The Earth, its air, and the Sun overhead and at the horizon: the light's path through the air and the colour it
    // keeps (computed from that path's length).
    const Re = 1.1 * w, shell = 0.26 * h, cx = left + 0.5 * w, cy = top + 0.62 * h + Re, eye: Vec = [cx, cy - Re];
    const arc = (r: number) => Array.from({length: 121}, (_, j) => { const a = -Math.PI / 2 - 0.9 + j * 1.8 / 120; return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as Vec; })
      .filter(p => p[0] >= left && p[0] <= right && p[1] <= bottom).map(p => [round(p[0], 2), round(p[1], 2)] as Vec);
    props.push({id: 'air', type: 'polyline', points: [...arc(Re + shell), ...arc(Re).reverse()], closed: true, style: {fill: 'cool', opacity: 0.16, stroke: 'cool', width: 2 * k}},
      {id: 'earth', type: 'polyline', points: [...arc(Re), [arc(Re).at(-1)![0], bottom] as Vec, [arc(Re)[0][0], bottom] as Vec], closed: true, style: {fill: 'faint', stroke: 'good', width: 4 * k}, layer: 1},
      ...eyeGlyph(eye, k));
    // The colours come from the real amounts of air, not the drawing's: overhead one air mass, Rayleigh optical depth
    // 0.098 at 550 nm; at the horizon about 38 air masses.
    const up = shell, along = Math.sqrt((Re + shell) ** 2 - Re ** 2), TAU = 0.098, AIRMASS = 38;
    const noon = transmitted(TAU), dusk = transmitted(TAU * AIRMASS);
    const tau = 0;
    const sunHigh: Vec = [eye[0], top + 20 * k], sunLow: Vec = [left + 40 * k, eye[1] - 20 * k];
    const segs = (from: Vec, to: Vec, inside: number, id: string, t: number) => {
      // The beam's colour changes along its path inside the air.
      const n = 8;
      for (let j = 0; j < n; j++) {
        const a: Vec = [from[0] + (to[0] - from[0]) * j / n, from[1] + (to[1] - from[1]) * j / n], b: Vec = [from[0] + (to[0] - from[0]) * (j + 1) / n, from[1] + (to[1] - from[1]) * (j + 1) / n];
        props.push({id: `${id}${j}`, type: 'line', x1: round(a[0], 2), y1: round(a[1], 2), x2: round(b[0], 2), y2: round(b[1], 2), show: [t + 0.15 * j, 1e9], style: {stroke: transmitted(TAU * inside * (j + 1) / n), width: 9 * k}, layer: 2});
      }
    };
    props.push({id: 'sun-high', type: 'circle', x: sunHigh[0], y: sunHigh[1], r: 30 * k, style: {fill: noon}, layer: 4},
      {id: 'sun-low', type: 'circle', x: sunLow[0], y: sunLow[1], r: 30 * k, show: [3.0, 1e9], fade: 0.4, style: {fill: dusk}, layer: 4});
    segs(sunHigh, [eye[0], eye[1] - 40 * k], 1, 'noon', 0.6);
    segs(sunLow, [eye[0] - 40 * k, eye[1] - 24 * k], AIRMASS, 'dusk', 3.2);
    void tau; void up; void along;
    label('noon-label', 'noon: little air, a white Sun', sunHigh[0] + 44 * k, sunHigh[1] + 8 * k, 'ink', 0.8);
    label('dusk-label', 'sunset: much more air, a red Sun', sunLow[0] + 6 * k, sunLow[1] - 50 * k, 'accent', 3.6);
    anchors.sun_noon = sunHigh; anchors.sun_sunset = sunLow; anchors.eye = eye;
    lines = ['At noon sunlight crosses little air: little blue is scattered out', `Near the horizon it crosses about ${AIRMASS} times as much air`, 'Most of the blue is scattered away on the way: the Sun looks red'];
    facts.push(`near the horizon sunlight passes through about ${AIRMASS} times as much air as overhead, so most of its blue and shorter wavelengths are scattered out and the Sun looks reddish at sunrise and sunset (the drawing is not to scale)`,
      'overhead, sunlight crosses less air and little blue is scattered out, so the Sun looks white');
  } else if (s.scene === 'sizes') {
    // The book: very fine particles scatter mainly blue; larger ones longer wavelengths; large enough ones, white.
    // Three boxes of white light, particles growing from box to box, each scattering its colours sideways.
    const kinds: [string, number, string[]][] = [['very fine', 2.5, ['#3b7bff', '#5a5bff', '#3b7bff', '#7a4cff']],
      ['larger', 6, ['#3fbf6a', '#ffd23f', '#ff9a3c', '#3b7bff']], ['large', 11, ['#ffffff', '#f4efe4', '#ffffff', '#f4efe4']]];
    kinds.forEach(([name, r, colours], j) => {
      const x0 = left + (j * w) / 3 + 0.02 * w, x1 = x0 + w / 3 - 0.04 * w, y0 = top + 0.22 * h, y1 = top + 0.78 * h, yb = (y0 + y1) / 2;
      props.push({id: `box${j}`, type: 'rect', x: round(x0, 2), y: round(y0, 2), w: round(x1 - x0, 2), h: round(y1 - y0, 2), style: {fill: 'cool', opacity: 0.1, stroke: 'cool', width: 2.5 * k}, layer: 1},
        {id: `beam${j}`, type: 'line', x1: round(x0, 2), y1: round(yb, 2), x2: round(x1, 2), y2: round(yb, 2), ...draw(0.5 + 0.5 * j, 1.5 + 0.5 * j), style: {stroke: '#fff4d6', width: 8 * k, opacity: 0.8}, layer: 2});
      for (let i = 0; i < 6; i++) {
        const px = x0 + (x1 - x0) * (0.12 + 0.15 * i), py = yb + (i % 2 ? 1 : -1) * 6 * k;
        props.push({id: `particle${j}-${i}`, type: 'circle', x: round(px, 2), y: round(py, 2), r: r * k, style: {fill: 'muted'}, layer: 3});
        for (let q = 0; q < 2; q++) {
          const a = (q ? 1 : -1) * (0.9 + 0.5 * noise(j * 40 + i * 3 + q)), L = (34 + 20 * noise(j * 50 + i + q)) * k;
          props.push({id: `ray${j}-${i}-${q}`, type: 'line', x1: round(px, 2), y1: round(py, 2), x2: round(px + Math.cos(a) * L * 0.6, 2), y2: round(py + Math.sin(a) * L, 2),
            ...draw(1.6 + 0.5 * j + 0.08 * i, 2.2 + 0.5 * j + 0.08 * i), style: {stroke: colours[(i + q) % colours.length], width: 3 * k}, layer: 3});
        }
      }
      label(`name${j}`, name, (x0 + x1) / 2, y1 + 40 * k, 'cool', 0, 'middle');
      label(`result${j}`, ['mainly blue', 'longer wavelengths', 'white'][j], (x0 + x1) / 2, y0 - 22 * k, ['cool', 'accent', 'ink'][j], 2.4 + 0.5 * j, 'middle');
      anchors[['fine', 'larger', 'large'][j]] = [round((x0 + x1) / 2, 2), round(yb, 2)];
    });
    label('size-axis', 'particle size grows →', left + w / 2, top + 0.92 * h, 'muted', 0, 'middle');
    lines = ['The colour of scattered light depends on the size of the particles', 'Very fine particles scatter mainly blue; larger ones, longer wavelengths', 'Large enough particles scatter all colours alike: the light looks white (clouds)'];
    facts.push('very fine particles scatter mainly blue light, particles of larger size scatter light of longer wavelengths, and if the particles are large enough the scattered light may even appear white');
  } else {
    // Two lamps shining through fog to a distant observer: blue thins out fast, red carries.
    const y = [top + 0.3 * h, top + 0.62 * h], x0 = left + 60 * k, x1 = right - 80 * k;
    for (let i = 0; i < 90; i++) props.push({id: `fog${i}`, type: 'circle', x: round(x0 + (x1 - x0) * noise(i + 600), 2), y: round(top + 0.15 * h + 0.65 * h * noise(i + 700), 2), r: (6 + 8 * noise(i + 800)) * k, style: {fill: 'muted', opacity: 0.18}, layer: 1});
    [['red lamp', '#ff3b30', 680, 0], ['blue lamp', '#3b7bff', 450, 1]].forEach(([name, colour, nm, j]) => {
      const yy = y[j as number], tau = 1.6 * (550 / (nm as number)) ** 4, n = 10;
      props.push({id: `lamp${j}`, type: 'circle', x: x0, y: round(yy, 2), r: 22 * k, style: {fill: colour as string}, layer: 4});
      for (let q = 0; q < n; q++) props.push({id: `beam${j}-${q}`, type: 'line', x1: round(x0 + (x1 - x0) * q / n, 2), y1: round(yy, 2), x2: round(x0 + (x1 - x0) * (q + 1) / n, 2), y2: round(yy, 2),
        show: [0.6 + 0.2 * q, 1e9], style: {stroke: colour as string, width: 12 * k, opacity: round(Math.exp(-tau * (q + 1) / n), 3)}, layer: 3});
      label(`lamp${j}-label`, name as string, x0, yy - 40 * k, colour as string, 0, 'start');
      label(`lamp${j}-left`, `${Math.round(100 * Math.exp(-tau))}% gets through`, x1 - 10 * k, yy + 44 * k, colour as string, 2.8, 'end');
    });
    props.push(...eyeGlyph([x1 + 40 * k, (y[0] + y[1]) / 2 + 26 * k], k));
    lines = ['Fog and smoke scatter light out of a beam', 'Blue is scattered far more than red, so a blue light fades fast', 'Red carries farthest: danger signals are red'];
    facts.push('red light is scattered least by fog or smoke, so it can be seen in the same colour from far away: that is why danger signal lights are red',
      `here, with the same fog, about ${Math.round(100 * Math.exp(-1.6 * (550 / 680) ** 4))}% of the red light gets through against ${Math.round(100 * Math.exp(-1.6 * (550 / 450) ** 4))}% of the blue (an illustrative amount of fog)`);
  }
  if (panel) {
    const px = 0.66 * W, pw = W - px - 40 * k;
    let row = 0.14 * H;
    if (s.title) { props.push({id: 'title', type: 'text', x: px, y: row, text: s.title, size: 44 * k, weight: 700, width: pw}); row += wrapText(s.title, 44 * k, pw).length * 1.25 * 44 * k + 18 * k; }
    lines.forEach((text, j) => { props.push({id: `line${j}`, type: 'text', x: px, y: row, text, size: 30 * k, width: pw, weight: j ? 400 : 700, show: [1 + 1.4 * j, 1e9], fade: 0.3}); row += wrapText(text, 30 * k, pw).length * 1.3 * 30 * k + 12 * k; });
  } else if (s.title) props.push({id: 'title', type: 'text', x: left, y: 0.16 * H, text: s.title, size: 44 * k, weight: 700, width: 0.92 * W});
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: T, theme: s.theme ?? 'dark', props, actors: [], meta: {verb: 'scattering', facts, anchors}};
}

function eyeGlyph(at: Vec, k: number): Prop[] {
  const c: Vec = [at[0], at[1] - 20 * k], w = 28 * k, hh = 14 * k;
  const lid = (sign: number) => Array.from({length: 13}, (_, j) => { const x = -w + (2 * w * j) / 12; return [round(c[0] + x, 2), round(c[1] + sign * hh * (1 - (x / w) ** 2), 2)] as Vec; });
  return [{id: 'eye-upper', type: 'polyline', points: lid(-1), style: {stroke: 'ink', width: 3 * k}, layer: 6},
    {id: 'eye-lower', type: 'polyline', points: lid(1), style: {stroke: 'ink', width: 3 * k}, layer: 6},
    {id: 'eye-pupil', type: 'circle', x: round(c[0], 2), y: round(c[1], 2), r: 6 * k, style: {fill: 'ink'}, layer: 6}];
}
