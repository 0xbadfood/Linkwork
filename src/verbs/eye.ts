// eye: the eye as a lens and a screen (Class 10 The Human Eye and the Colourful World, C2 and C3, 2026-10-28). The
// eye lens sits 2.5 cm in front of the retina; to focus an object u cm away its power must be P = 100/2.5 + 100/u
// dioptres. A normal eye can reach every power from 40 D (far point at infinity) to 44 D (near point at 25 cm):
// accommodation. A myopic eye's far point is nearer (its least power is too great), so a distant object's image falls
// in front of the retina; a concave lens of f = −(far point) puts the distant object's image at the far point. A
// hypermetropic (or presbyopic) eye's near point is farther than 25 cm, so a near object's image falls behind the
// retina; a convex lens makes an object at 25 cm seem to be at the eye's near point. Positions and powers are
// computed; distances outside the eye are drawn compressed (not to scale), as in the book's figures.
import type {Key} from '../keys.ts';
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {round, type Vec} from '../vec.ts';
import {n2} from './calculus.ts';

type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};
export type EyeSpec = Common & {
  verb: 'eye';
  condition?: 'normal' | 'myopia' | 'hypermetropia' | 'presbyopia';
  /** Object distances from the eye in cm (or "infinity"), shown one after another: the lens changes shape to focus. */
  objects: (number | 'infinity')[];
  /** A myopic eye's far point, cm (default 80). */
  far_point?: number;
  /** A hypermetropic or presbyopic eye's near point, cm (default 100). */
  near_point?: number;
  /** Put the corrective lens in front of the eye: concave for myopia, convex for hypermetropia and presbyopia. */
  correct?: boolean;
  seconds_each?: number;
  panel?: boolean;
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const fmt = (v: number, places = 2) => n2(Number(v.toFixed(places)), places).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
const RETINA = 2.5;                       // cm behind the eye lens (the book's reduced eye: 40 D focuses infinity)
const GAIN = 10;                          // how much farther a focus off the retina is drawn from it than it really is

/** The eye's range of power in dioptres: [least (far point), greatest (near point)]. */
export function eyeRange(s: EyeSpec): [number, number] {
  const base = 100 / RETINA, c = s.condition ?? 'normal';
  const far = c === 'myopia' ? s.far_point ?? 80 : Infinity, near = c === 'hypermetropia' || c === 'presbyopia' ? s.near_point ?? 100 : 25;
  return [base + (isFinite(far) ? 100 / far : 0), base + 100 / near];
}

/** The corrective lens's power in dioptres, or 0 for a normal eye. */
export function correction(s: EyeSpec): number {
  const c = s.condition ?? 'normal';
  if (c === 'myopia') return -100 / (s.far_point ?? 80);
  if (c === 'hypermetropia' || c === 'presbyopia') return 100 / 25 - 100 / (s.near_point ?? 100);
  return 0;
}

export function eyeErrors(s: EyeSpec): string[] {
  const e: string[] = [];
  const c = s.condition ?? 'normal';
  if (!['normal', 'myopia', 'hypermetropia', 'presbyopia'].includes(c)) e.push('eye: condition is normal, myopia, hypermetropia or presbyopia');
  if (!Array.isArray(s.objects) || s.objects.length < 1 || s.objects.length > 4 || !s.objects.every(o => o === 'infinity' || (isNum(o) && o >= 10 && o <= 10000)))
    e.push('eye: objects is 1 to 4 object distances from the eye in cm (10 to 10000) or "infinity"');
  if (s.far_point !== undefined && !(c === 'myopia' && isNum(s.far_point) && s.far_point >= 20 && s.far_point <= 2000)) e.push('eye: far_point (cm, 20 to 2000) is for myopia');
  if (s.near_point !== undefined && !((c === 'hypermetropia' || c === 'presbyopia') && isNum(s.near_point) && s.near_point > 25 && s.near_point <= 1000))
    e.push('eye: near_point (cm, more than 25, up to 1000) is for hypermetropia or presbyopia');
  if (s.correct !== undefined && typeof s.correct !== 'boolean') e.push('eye: correct is true or false');
  if (s.correct && c === 'normal') e.push('eye: a normal eye needs no correction');
  if (s.seconds_each !== undefined && !(isNum(s.seconds_each) && s.seconds_each >= 3 && s.seconds_each <= 12)) e.push('eye: seconds_each is 3 to 12');
  if (s.panel !== undefined && typeof s.panel !== 'boolean') e.push('eye: panel is true or false');
  return e;
}

type Result = {power: number; v: number; where: 'on' | 'in front of' | 'behind'; seen: number};

/** How the eye (with its lens, if worn) handles an object u cm away: the power it sets and where the image falls. */
function focus(s: EyeSpec, u: number): Result {
  const [least, most] = eyeRange(s), lensP = s.correct ? correction(s) : 0;
  // A lens worn at the eye: the eye sees the object where the lens puts its image (1/v = P/100 − 1/u, v < 0: in front).
  const seen = lensP === 0 ? u : !isFinite(u) ? -100 / lensP : 1 / (1 / u - lensP / 100);
  const need = 100 / RETINA + (isFinite(seen) ? 100 / seen : 0);
  const power = Math.min(most, Math.max(least, need));
  const v = 1 / (power / 100 - (isFinite(seen) ? 1 / seen : 0));
  const where = Math.abs(v - RETINA) < 0.005 ? 'on' : v < RETINA ? 'in front of' : 'behind';
  return {power, v, where, seen};
}

export function eye(s: EyeSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, panel = s.panel !== false, c = s.condition ?? 'normal';
  const left = 0.04 * W, right = panel ? 0.62 * W : 0.96 * W, top = panel ? 0.12 * H : (s.title ? 0.24 : 0.13) * H, bottom = 0.93 * H;
  const cy = (top + bottom) / 2, R = Math.min(0.17 * (right - left), 0.3 * (bottom - top));    // the eyeball's radius on screen
  const ex = right - R - 0.04 * (right - left);                                                  // its centre
  const lensX = ex - 0.62 * R, retinaX = ex + R, mm = (retinaX - lensX) / RETINA;                // px per cm inside the eye
  const objectX = left + 0.04 * (right - left), specX = lensX - 0.42 * R;                        // compressed: not to scale
  const props: Prop[] = [
    {id: 'eyeball', type: 'circle', x: ex, y: cy, r: R, style: {fill: 'faint', opacity: 0.35, stroke: 'muted', width: 3 * k}, layer: 1},
    {id: 'retina', type: 'polyline', points: Array.from({length: 21}, (_, j) => { const a = -1.0 + j * 0.1; return [round(ex + R * Math.cos(a), 2), round(cy + R * Math.sin(a), 2)] as Vec; }),
      style: {stroke: 'bad', width: 6 * k}, layer: 3},
    {id: 'retina-label', type: 'text', x: ex + R * 0.98, y: cy - R * 0.92, text: 'retina', size: 26 * k, align: 'end', style: {fill: 'bad'}, layer: 4},
    {id: 'axis', type: 'line', x1: objectX, y1: cy, x2: retinaX + 20 * k, y2: cy, style: {stroke: 'muted', width: 2 * k, dash: [14 * k, 10 * k]}},
    {id: 'cornea', type: 'polyline', points: Array.from({length: 13}, (_, j) => { const a = Math.PI - 0.55 + j * (1.1 / 12); return [round(ex + R * 1.02 * Math.cos(a) - 6 * k, 2), round(cy + R * 1.02 * Math.sin(a), 2)] as Vec; }),
      style: {stroke: 'cool', width: 3 * k}, layer: 3},
  ];
  const E = s.seconds_each ?? 7, T0 = 0.8, facts: string[] = [], anchors: Record<string, Vec> = {retina: [retinaX, cy], lens: [lensX, cy]};
  const lensP = s.correct ? correction(s) : 0;
  if (s.correct) {
    // The spectacle lens, concave or convex by its power's sign.
    const h = 0.55 * R, w = 10 * k, sg = lensP > 0 ? 1 : -1, pts: Vec[] = [];
    for (let j = 0; j <= 16; j++) { const y = -h + (2 * h * j) / 16, b = sg > 0 ? w * (1 - (y / h) ** 2) + 3 * k : 3 * k + w * (y / h) ** 2; pts.push([specX + b, cy + y]); }
    for (let j = 16; j >= 0; j--) { const y = -h + (2 * h * j) / 16, b = sg > 0 ? w * (1 - (y / h) ** 2) + 3 * k : 3 * k + w * (y / h) ** 2; pts.push([specX - b, cy + y]); }
    props.push({id: 'spectacle', type: 'polyline', points: pts.map(p => [round(p[0], 2), round(p[1], 2)] as Vec), closed: true, style: {stroke: 'good', width: 4 * k, fill: 'good', opacity: 0.25}, layer: 4},
      {id: 'spectacle-label', type: 'text', x: specX, y: cy - h - 24 * k, text: lensP < 0 ? 'concave lens' : 'convex lens', size: 26 * k, align: 'middle', weight: 700, style: {fill: 'good'}, layer: 4});
    anchors.spectacle = [specX, cy];
  }
  // Where an object distance is drawn: compressed to fit (log scale between 10 cm and infinity).
  const drawX = (u: number) => (!isFinite(u) ? objectX : Math.max(objectX, (s.correct ? specX : lensX) - (Math.log10(u / 5) / Math.log10(2000)) * ((s.correct ? specX : lensX) - objectX)));
  const lines: [string, string, number][] = [];
  const px = 0.66 * W, pw = W - px - 40 * k;
  let row = 0.14 * H;
  if (panel && s.title) { props.push({id: 'title', type: 'text', x: px, y: row, text: s.title, size: 44 * k, weight: 700, width: pw}); row += wrapText(s.title, 44 * k, pw).length * 1.25 * 44 * k + 18 * k; }
  if (!panel && s.title) props.push({id: 'title', type: 'text', x: left, y: 0.16 * H, text: s.title, size: 44 * k, weight: 700, width: 0.92 * W});
  const [least, most] = eyeRange(s);
  const name = {normal: 'A normal eye', myopia: 'A myopic (short-sighted) eye', hypermetropia: 'A hypermetropic (long-sighted) eye', presbyopia: 'An eye with presbyopia'}[c];
  const range = c === 'myopia' ? `far point ${fmt(s.far_point ?? 80)} cm (not infinity)` : c === 'normal' ? 'sees clearly from 25 cm to infinity' : `near point ${fmt(s.near_point ?? 100)} cm (not 25 cm)`;
  props.push({id: 'condition', type: 'text', x: panel ? px : left, y: panel ? row : bottom - 10 * k, text: `${name}: ${range}`, size: 30 * k, weight: 700, width: panel ? pw : 0.9 * W, style: {fill: 'muted'}});
  row += 2.6 * 30 * k;
  if (s.correct) { props.push({id: 'lens-power', type: 'text', x: px, y: row, width: pw, size: 30 * k, weight: 700, style: {fill: 'good'}, show: [0.6, 1e9],
      text: `Corrected with a ${lensP < 0 ? 'concave' : 'convex'} lens of power ${lensP > 0 ? '+' : '−'}${fmt(Math.abs(lensP))} D (f = ${fmt(100 / lensP, 1)} cm)`}); row += 2.6 * 30 * k; }
  s.objects.forEach((o, i) => {
    const u = o === 'infinity' ? Infinity : o, res = focus(s, u), s0 = T0 + i * E, last = i === s.objects.length - 1, show: [number, number] = [s0, last ? 1e9 : s0 + E], tag = `p${i}`;
    const draw = (t0: number, t1: number) => ({draw: 0, keys: {draw: [[t0, 0], [t1, 1, 'linear']] as Key[]}});
    // The eye lens, fatter for more power (accommodation).
    const h = 0.42 * R, w = (6 + 26 * (res.power - 40) / 6) * k, pts: Vec[] = [];
    for (let j = 0; j <= 16; j++) { const y = -h + (2 * h * j) / 16; pts.push([lensX + w * (1 - (y / h) ** 2) + 2 * k, cy + y]); }
    for (let j = 16; j >= 0; j--) { const y = -h + (2 * h * j) / 16; pts.push([lensX - w * (1 - (y / h) ** 2) - 2 * k, cy + y]); }
    props.push({id: `${tag}-lens`, type: 'polyline', points: pts.map(p => [round(p[0], 2), round(p[1], 2)] as Vec), closed: true, show, style: {stroke: 'cool', width: 4 * k, fill: 'cool', opacity: 0.35}, layer: 5});
    // Rays: from a point object (or parallel from infinity) to the spectacle lens, on to the eye lens as if from where
    // the lens shows the object, then to the image point, which is on, in front of or behind the retina.
    // Inside the eye a focus misses the retina by under a millimetre: drawn GAIN times as far, as the book's figures do.
    const ox = drawX(u), image: Vec = [retinaX + (res.v - RETINA) * mm * GAIN, cy], heights = [-0.32 * R, 0.32 * R];
    const sx = s.correct && isFinite(res.seen) ? drawX(Math.abs(res.seen)) : ox;      // where the lens shows the object
    if (isFinite(u)) props.push({id: `${tag}-object`, type: 'circle', x: round(ox, 2), y: cy, r: 9 * k, show, fade: 0.3, style: {fill: 'accent'}, layer: 6},
      {id: `${tag}-object-label`, type: 'text', x: round(ox, 2), y: cy - 26 * k, text: `${fmt(u, 0)} cm`, size: 24 * k, align: 'middle', show, fade: 0.3, style: {fill: 'accent'}, layer: 6});
    heights.forEach((y, j) => {
      const atEye: Vec = [lensX, cy + y];
      const segs: Vec[] = [];
      if (s.correct) {
        // Past the spectacle lens the ray runs as if from where the lens shows the object (far or near point).
        const atSpec: Vec = [specX, cy + y * (specX - sx) / (lensX - sx)];
        segs.push(isFinite(u) ? [ox, cy] : [objectX, atSpec[1]], atSpec, atEye);
      } else segs.push(isFinite(u) ? [ox, cy] : [objectX, cy + y], atEye);
      const beyond: Vec = [image[0] + (image[0] - atEye[0]) * 0.12, cy + (cy - atEye[1]) * 0.12];
      const inside = res.where === 'behind' ? [atEye, [retinaX - 4 * k, atEye[1] + (image[1] - atEye[1]) * ((retinaX - 4 * k - atEye[0]) / (image[0] - atEye[0]))] as Vec] : [atEye, image, beyond];
      props.push({id: `${tag}-ray${j}-out`, type: 'polyline', points: segs.map(p => [round(p[0], 2), round(p[1], 2)] as Vec), ...draw(s0 + 0.4, s0 + 1.8), show, fade: 0.3, style: {stroke: 'ink', width: 3.5 * k}, layer: 4},
        {id: `${tag}-ray${j}-in`, type: 'polyline', points: inside.map(p => [round(p[0], 2), round(p[1], 2)] as Vec), ...draw(s0 + 1.8, s0 + 2.8), show, fade: 0.3, style: {stroke: 'ink', width: 3.5 * k}, layer: 4});
      if (res.where === 'behind') props.push({id: `${tag}-ray${j}-meet`, type: 'line', x1: round(retinaX - 4 * k, 2), y1: round(inside[1][1], 2), x2: round(image[0], 2), y2: cy,
        ...draw(s0 + 2.8, s0 + 3.3), show, fade: 0.3, style: {stroke: 'muted', width: 2.5 * k, dash: [8 * k, 6 * k]}, layer: 4});
    });
    if (s.correct && isFinite(res.seen) && Math.abs(res.seen - u) > 1) {
      // Where the lens makes the object seem to be: the eye's far point (myopia) or near point (hypermetropia), with
      // the rays' lines back to it dashed.
      heights.forEach((y, j) => props.push({id: `${tag}-back${j}`, type: 'line', x1: round(sx, 2), y1: cy, x2: specX, y2: round(cy + y * (specX - sx) / (lensX - sx), 2),
        ...{draw: 0, keys: {draw: [[s0 + 1.8, 0], [s0 + 2.4, 1, 'linear']] as Key[]}}, show, fade: 0.3, style: {stroke: 'muted', width: 2.5 * k, dash: [8 * k, 6 * k]}, layer: 3}));
      props.push({id: `${tag}-seen`, type: 'circle', x: round(sx, 2), y: cy, r: 8 * k, show: [s0 + 1.8, show[1]], fade: 0.3, style: {fill: 'good', opacity: 0.8}, layer: 6},
        {id: `${tag}-seen-label`, type: 'text', x: round(sx, 2), y: cy + 34 * k, text: c === 'myopia' ? 'far point' : 'near point', size: 24 * k, align: 'middle', show: [s0 + 1.8, show[1]], fade: 0.3, style: {fill: 'good'}, layer: 6});
    }
    props.push({id: `${tag}-image`, type: 'circle', x: round(Math.min(image[0], retinaX + 0.5 * R), 2), y: cy, r: 9 * k, show: [s0 + 2.8, show[1]], fade: 0.3,
      style: {fill: res.where === 'on' ? 'good' : 'bad'}, layer: 6});
    anchors[`image${i ? i + 1 : ''}`] = [round(image[0], 2), cy];
    const sharp = res.where === 'on';
    const obj = isFinite(u) ? `An object ${fmt(u, 0)} cm away` : 'A distant object (at infinity)';
    const text = sharp ? `${obj}: the eye lens sets ${fmt(res.power, 1)} D and the image falls on the retina: sharp`
      : `${obj}: even at ${fmt(res.power, 1)} D the image falls ${res.where} the retina: blurred`;
    if (panel) props.push({id: `${tag}-line`, type: 'text', x: px, y: row, text, size: 30 * k, width: pw, show: [s0 + 2.8, show[1]], fade: 0.3, style: {fill: sharp ? 'good' : 'bad'}});
    facts.push(`${obj.toLowerCase()}${s.correct ? ' through the lens' : ''}: the eye focuses at ${fmt(res.power, 1)} D and the image falls ${res.where} the retina${sharp ? ' (sharp)' : ' (blurred)'}`);
    lines.push([text, sharp ? 'good' : 'bad', s0]);
  });
  facts.unshift(`the eye lens can range from ${fmt(least, 2)} D to ${fmt(most, 2)} D here (40 D focuses a distant object on a retina 2.5 cm behind it; 44 D an object at 25 cm)`);
  if (c !== 'normal') facts.push(c === 'myopia'
    ? `myopia is corrected with a concave lens of focal length −${fmt(s.far_point ?? 80)} cm (power ${fmt(correction(s))} D), which makes a distant object seem to be at the far point`
    : `${c} is corrected with a convex lens of power +${fmt(correction(s))} D, which makes an object at 25 cm seem to be at the near point ${fmt(s.near_point ?? 100)} cm`);
  facts.push(`distances outside the eye are drawn compressed, and how far a focus misses the retina ${GAIN} times larger: not to scale`);
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: T0 + s.objects.length * E + 1, theme: s.theme ?? 'dark', props, actors: [],
    meta: {verb: 'eye', facts, anchors, labelled: ['retina']}};
}
