// annotate: labels and points any verb's scene can carry (user, 2026-10-28: "the verbs should be capable of inserting
// labels and points; optional, as these verbs need reuse in problems"). A mark sits at a named point the verb publishes
// (meta.anchors: F, C, the object, the image, the point of incidence ...) or at [x, y] in the verb's own units: the
// coordinates of its plane (graphs, calculus, the stage) or the units it states in meta.units (ray_diagram: cm along
// and above the axis). A spec without annotate is drawn exactly as before. (Not `marks`: graph and
// motion_on_line already have marks of their own.)
import {toScene, type Plane} from '../plane.ts';
import type {Prop, Scene} from '../scene.ts';
import {round, type Vec} from '../vec.ts';
import {textWidth, wrapText} from '../svg.ts';
import {actorsAt, propFrame, type ActorFrame} from '../scene.ts';

/** `to`: a second point, making the mark a measuring line from `at` to it, with the text at its middle (f, R, aperture). */
export type Mark = {text?: string; at: string | [number, number]; to?: string | [number, number]; point?: boolean; t?: number; colour?: string};
/** px = ox + sx·x, py = oy − sy·y, for a verb that draws in units of its own without a plane. */
export type Units = {ox: number; oy: number; sx: number; sy: number; name: string};

const COLOURS = ['accent', 'ink', 'good', 'bad', 'cool', 'muted'];
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function marksErrors(marks: unknown): string[] {
  if (marks === undefined) return [];
  if (!Array.isArray(marks) || marks.length > 8) return ['annotate is a list of up to 8 {text?, at, to?, point?, t?, colour?}'];
  const e: string[] = [];
  marks.forEach((m: Mark, i) => {
    const where = `annotate[${i}]`;
    if (typeof m !== 'object' || m === null) { e.push(`${where} is {text?, at, point?, t?, colour?}`); return; }
    const place = (v: unknown) => typeof v === 'string' || (Array.isArray(v) && v.length === 2 && v.every(isNum));
    if (!place(m.at)) e.push(`${where}: at is a named point of the verb or [x, y] in its units`);
    if (m.to !== undefined && !place(m.to)) e.push(`${where}: to (a measuring line's other end) is a named point or [x, y]`);
    if (m.text !== undefined && (typeof m.text !== 'string' || !m.text.trim() || m.text.length > 40)) e.push(`${where}: text is a short label (40 characters)`);
    if (m.text === undefined && !m.point && m.to === undefined) e.push(`${where}: give text, point: true, or both`);
    if (m.point !== undefined && typeof m.point !== 'boolean') e.push(`${where}: point is true or false`);
    if (m.t !== undefined && !(isNum(m.t) && m.t >= 0)) e.push(`${where}: t is the second it appears, 0 or later`);
    if (m.colour !== undefined && !COLOURS.includes(m.colour)) e.push(`${where}: colour is one of ${COLOURS.join(', ')}`);
  });
  return e;
}

/** A plane that is only the drawing's box (x and y from 0 to 1, no axes drawn on it): its numbers mean nothing to a
 * planner, who guessed [0.3, 1] for 'the top of the block' and put Δx in an empty corner (keph2-01 C2, 2026-10-30). */
const placeholder = (scene: Scene, plane: Plane) => plane.x[0] === 0 && plane.x[1] === 1 && plane.y[0] === 0 && plane.y[1] === 1
  && !scene.props.some(p => p.type === 'axes' && (p as {plane?: string}).plane === plane.id);

/** Where marks can go in this scene: its named points, and the units [x, y] is read in (or why it has none). A verb
 * whose meta says anchorsOnly (its plane is not to scale, such as a curve's shape) takes named points only. */
export function markable(scene: Scene): {anchors: string[]; units: string | null} {
  const meta = scene.meta as {anchors?: Record<string, Vec>; units?: Units; anchorsOnly?: boolean} | undefined;
  const planes = scene.planes ?? [];
  return {anchors: Object.keys(meta?.anchors ?? {}),
    units: meta?.units ? meta.units.name : planes.length === 1 && !meta?.anchorsOnly && !placeholder(scene, planes[0] as Plane) ? "the drawing's own x and y (the numbers on its axes, or metres on a stage)" : null};
}

const FILLER = new Set('a an the of to in on at by for and or is are be it its this that here there out up so all its with from not no'.split(' '));
/** A label's words that carry meaning, without plural s: 'fields cancel here' -> field, cancel. */
const contentWords = (t: string) => (t.toLowerCase().match(/[a-z]+/g) ?? []).filter(w => !FILLER.has(w)).map(w => (w.length > 3 ? w.replace(/s$/, '') : w));
/** Every meaningful word of the label (two at least) is already in one of the verb's own texts. */
export function repeats(text: string, own: Set<string>[]): boolean {
  const words = contentWords(text);
  return words.length >= 2 && own.some(o => words.every(w => o.has(w)));
}

/** The scene with its marks drawn: a dot (point: true) and a label just above and to the right of it. */
export function addMarks(scene: Scene, marks: Mark[] | undefined, verb: string): {scene?: Scene; errors: string[]} {
  if (!marks?.length) return {scene, errors: []};
  const meta = scene.meta as {anchors?: Record<string, Vec>; units?: Units} | undefined;
  const planes = scene.planes ?? [];
  const k = scene.height / 1080, errors: string[] = [], props: Prop[] = [];
  const {anchors, units} = markable(scene);
  const resolve = (v: string | [number, number], i: number, field: string): Vec | undefined => {
    let at: Vec | undefined;
    if (typeof v === 'string') {
      at = meta?.anchors?.[v];
      if (!at) { errors.push(`${verb}: annotate[${i}].${field}: no point named ${JSON.stringify(v)}; ${anchors.length ? `named points: ${anchors.join(', ')}` : 'this verb names no points'}${units ? `, or [x, y] in ${units}` : ''}`); return; }
    } else if (meta?.units) at = [meta.units.ox + meta.units.sx * v[0], meta.units.oy - meta.units.sy * v[1]];
    else if (units) at = toScene(planes[0] as Plane, v);
    else { errors.push(`${verb}: annotate[${i}]: this verb takes named points only (${anchors.join(', ') || 'none'})`); return; }
    if (at[0] < 0 || at[0] > scene.width || at[1] < 0 || at[1] > scene.height) { errors.push(`${verb}: annotate[${i}].${field} is off the picture`); return; }
    return at;
  };
  // Where a note may not go: every text the verb draws, where it is at each moment it shows. A note stays until the
  // end, so it must keep clear of a text's box from the note's first second on, moving labels sampled along their way
  // ('F₁' riding a piston, a planet's name on its orbit), the title included, and of the notes placed before it
  // (2026-11-05: 31 published scenes had a note on a verb's own name, a moving label, a field's × or the title, as the
  // spot was chosen from where texts start, and kept when nothing near was clear).
  const taken = takenBoxes(scene), notes: Box[] = [];
  const free = (box: Box, from: number) => box[0] >= 4 * k && box[2] <= scene.width - 4 * k
    && !notes.some(b => overlaps(b, box)) && !taken.some(o => o.to >= from && overlaps(o.box, box));
  /** The first clear spot for a note's text: each of its spots as asked, then moved further up or down from it (the
   * nearer the better, the asked side first); none clear and the note is left out (a note is optional, the verb's own
   * labels are not). */
  const clear = (spots: Spot[], text: string, from: number): Spot | undefined => {
    const w = [...text].length * 30 * k * 0.58, h = 36 * k, tries: [number, Spot][] = [];
    spots.forEach((s, i) => { for (let d = 0; d <= 400; d += 20) for (const dy of d ? [-d, d] : [0]) tries.push([Math.abs(dy) + i * 90, {...s, y: s.y + dy * k}]); });
    tries.sort((a, b) => a[0] - b[0]);
    for (const [, s] of tries) {
      if (s.y < 0.14 * scene.height || s.y > scene.height - 24 * k) continue;   // never into a film's header, nor off the bottom
      const x0 = s.align === 'start' ? s.x : s.align === 'end' ? s.x - w : s.x - w / 2, box: Box = [x0, s.y - h / 2, x0 + w, s.y + h / 2];
      if (free(box, from)) { notes.push(box); return s; }
    }
    return undefined;
  };
  // A mark's text is words for the viewer. A point's id (focus_edge) on screen reads as code: it goes back to the
  // planner. The name of a point the verb already labels (P, F, C) is not drawn twice: only its dot, if asked for.
  const labelled = new Set(((meta as {labelled?: string[]})?.labelled ?? []).map(n => n.toLowerCase()));
  // A label the verb already draws, written again (the curve's 'permanent set' twice, keph2-01 C3): it goes back.
  const own = new Set(scene.props.filter(p => p.type === 'text' && p.id !== 'title').map(p => String((p as {text: string}).text).trim().toLowerCase()));
  // Only the drawing's short labels count, not the panel's lines (long, or starting at the title's x): a panel sentence
  // speaks generally ('Edge rays cross the axis nearer the mirror than central rays'), and a label naming one place in
  // it ('central rays' at that focus) is wanted.
  const panelX = (scene.props.find(p => p.id === 'title') as {x?: number} | undefined)?.x;
  const ownWords = scene.props.filter(p => p.type === 'text' && p.id !== 'title' && String((p as {text: string}).text).length <= 48
    && (panelX === undefined || Math.abs((p as {x: number}).x - panelX) > 1))
    .map(p => new Set(contentWords(String((p as {text: string}).text))));
  marks.forEach((m, i) => {
    if (m.text && /_/.test(m.text) && anchors.includes(m.text.trim())) errors.push(`${verb}: annotate[${i}].text ${JSON.stringify(m.text)} is a point's name: write the words to show, such as ${JSON.stringify(m.text.replace(/_/g, ' '))}`);
    if (m.text && typeof m.at === 'string' && !m.to && labelled.has(m.text.trim().replace(/[₁₂]/g, c => (c === '₁' ? '1' : '2')).toLowerCase()) && m.text.trim().toLowerCase().replace(/[₁₂]/g, c => (c === '₁' ? '1' : '2')) === m.at.toLowerCase()) {
      if (!m.point) return;
      m = {...m, text: undefined};
    }
    if (m.text && !m.to && own.has(m.text.trim().toLowerCase())) { errors.push(`${verb}: annotate[${i}].text ${JSON.stringify(m.text)} is already on the picture: leave it out, or give point: true without text for a dot`); return; }
    // Said again in other words by the drawing ('fields cancel here' beside 'They cancel: no field between the turns';
    // leph1-04 C7 S07, 2026-11-04): it only clutters, often over the
    // drawing. Dropped, not refused, so films already made still compile.
    if (m.text && !m.to && repeats(m.text, ownWords)) { if (!m.point) return; m = {...m, text: undefined}; }
    const at = resolve(m.at, i, 'at');
    if (!at) return;
    const to = m.to === undefined ? undefined : resolve(m.to, i, 'to');
    if (m.to !== undefined && !to) return;
    if (to) {
      // A measuring line: arrowheads at both ends, short end bars, the text at its middle set off to one side.
      const fill = m.colour ?? 'accent', show: [number, number] = [m.t ?? 0.5, 1e9];
      const L = Math.hypot(to[0] - at[0], to[1] - at[1]) || 1, u: Vec = [(to[0] - at[0]) / L, (to[1] - at[1]) / L], n: Vec = [-u[1], u[0]];
      const mid: Vec = [(at[0] + to[0]) / 2, (at[1] + to[1]) / 2], style = {stroke: fill, width: 3.5 * k};
      props.push({id: `note${i}-a`, type: 'arrow', x1: round(mid[0], 2), y1: round(mid[1], 2), x2: round(at[0], 2), y2: round(at[1], 2), head: 18 * k, show, fade: 0.3, style, layer: 8},
        {id: `note${i}-b`, type: 'arrow', x1: round(mid[0], 2), y1: round(mid[1], 2), x2: round(to[0], 2), y2: round(to[1], 2), head: 18 * k, show, fade: 0.3, style, layer: 8});
      for (const [end, q] of [[at, 'a'], [to, 'b']] as const)
        props.push({id: `note${i}-bar-${q}`, type: 'line', x1: round(end[0] - n[0] * 14 * k, 2), y1: round(end[1] - n[1] * 14 * k, 2), x2: round(end[0] + n[0] * 14 * k, 2), y2: round(end[1] + n[1] * 14 * k, 2), show, fade: 0.3, style, layer: 8});
      if (m.text) {
        // Across a level line: above its middle. Along an upright one (an aperture, a height): to its left, a quarter
        // of the way down, clear of an axis through its middle.
        const upright = Math.abs(u[1]) > 0.7, side = n[1] > 0 ? -1 : 1;
        const top = at[1] < to[1] ? at : to, bottom = top === at ? to : at;
        const [x, y] = upright ? [Math.min(top[0], bottom[0]) - 20 * k, top[1] + (bottom[1] - top[1]) * 0.25] : [mid[0] + side * n[0] * 30 * k, mid[1] + side * n[1] * 30 * k];
        const w = [...m.text].length * 30 * k * 0.58;
        const spot = clear(upright ? [{x, y, align: 'end'}, {x: Math.max(top[0], bottom[0]) + 20 * k, y, align: 'start'}]
          : [{x, y, align: 'middle'}, {x: mid[0] - side * n[0] * 30 * k, y: mid[1] - side * n[1] * 30 * k, align: 'middle'}, {x: Math.min(x, scene.width - 10 * k - w / 2), y, align: 'middle'}], m.text, show[0]);
        if (spot) props.push({id: `note${i}-label`, type: 'text', x: round(spot.x, 2), y: round(spot.y, 2), text: m.text, size: 30 * k, weight: 700,
          align: spot.align, show, fade: 0.3, style: {fill, stroke: 'paper', width: 9 * k}, layer: 8});
      }
      return;
    }
    const fill = m.colour ?? 'accent', show: [number, number] = [m.t ?? 0.5, 1e9], [x, y] = [round(at[0], 2), round(at[1], 2)];
    if (m.point) props.push({id: `note${i}-point`, type: 'circle', x, y, r: 9 * k, show, fade: 0.3, style: {fill}, layer: 8});
    // A point on something narrow or crowded (a cylinder, a reservoir holding its own name, an arrow) names where its words
    // go instead: across it they read as neither (keph2-04 C13 and C15, 2026-10-31).
    // labelEnd: where the graph stops and something else of the drawing starts; words too long for that room go to labelSpill
    const {labelAt, labelEnd, labelSpill} = (meta ?? {}) as {labelAt?: Record<string, Vec>; labelEnd?: number; labelSpill?: Vec};
    const spills = !!m.text && labelEnd !== undefined && !!labelSpill && x < labelEnd && x + 14 * k + m.text.length * 30 * k * 0.58 > labelEnd;
    const beside = (typeof m.at === 'string' ? labelAt?.[m.at] : undefined) ?? (spills ? labelSpill : undefined);
    if (m.text && beside) {
      const w = [...m.text].length * 30 * k * 0.58, lx = Math.min(beside[0], scene.width - 10 * k - w);
      const spot = clear([{x: lx, y: beside[1], align: 'start'}, {x: Math.max(x - 14 * k, 10 * k + w), y: y - 16 * k, align: 'end'}], m.text, show[0]);
      if (spot) props.push({id: `note${i}-label`, type: 'text', x: round(spot.x, 2), y: round(spot.y, 2), text: m.text, size: 30 * k, weight: 700,
        align: spot.align, show, fade: 0.3, style: {fill, stroke: 'paper', width: 9 * k}, layer: 8});
    } else if (m.text) {
      // near the right edge the label reads leftwards; so does one that would run out of a drawing into its panel
      const box = planes.length === 1 ? (planes[0] as Plane).box : undefined;
      const stop = labelEnd ?? (box ? box[2] + 20 * k : undefined);
      const right = x > 0.85 * scene.width || (stop !== undefined && x < stop && x + 14 * k + m.text.length * 30 * k * 0.58 > stop);
      // Kept inside the frame: a label near an edge reads inwards, and never above the top or below the bottom.
      // A label at a filled disc goes beside it, not across it (a radiating body, keph2-03 C10, 2026-10-31; a charge of
      // radius 22, leph2-04 C2, 2026-11-04); a dot the usual 14 clears stays.
      const disc = scene.props.find(p => { const c = p as unknown as {type: string; x: number; y: number; r: number; plane?: string; style?: {fill?: string}};
        return c.type === 'circle' && !c.plane && c.r >= 12 * k && c.style?.fill && Math.hypot(x - c.x, y - c.y) < c.r + 14 * k; }) as unknown as {x: number; r: number} | undefined;
      const start = disc ? (right ? disc.x - disc.r - 12 * k : disc.x + disc.r + 12 * k) : right ? x - 14 * k : x + 14 * k;
      const w = [...m.text].length * 30 * k * 0.58;
      const lx = right ? Math.max(start, 10 * k + w) : Math.min(start, scene.width - 10 * k - w);
      // the other side of the point, should the asked side be crowded
      const other = disc ? (right ? disc.x + disc.r + 12 * k : disc.x - disc.r - 12 * k) : right ? x + 14 * k : x - 14 * k;
      const ox = right ? Math.min(other, scene.width - 10 * k - w) : Math.max(other, 10 * k + w);
      const y0 = Math.min(scene.height - 24 * k, Math.max(0.14 * scene.height, y - 16 * k));
      const spot = clear([{x: lx, y: y0, align: right ? 'end' : 'start'}, {x: ox, y: y0, align: right ? 'start' : 'end'}], m.text, show[0]);
      if (spot) props.push({id: `note${i}-label`, type: 'text', x: round(spot.x, 2), y: round(spot.y, 2), text: m.text, size: 30 * k, weight: 700,
        align: spot.align, show, fade: 0.3, style: {fill, stroke: 'paper', width: 9 * k}, layer: 8});
    }
  });
  if (errors.length) return {errors};
  return {scene: {...scene, props: [...scene.props, ...props]}, errors: []};
}

type Box = [number, number, number, number];
type Spot = {x: number; y: number; align: 'start' | 'middle' | 'end'};
const overlaps = (a: Box, b: Box) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

/** Every text the scene draws (readouts as their words), as boxes with the seconds each is shown there: sampled through
 * the scene, a box kept while a text stays put and a new one each time it moves. The box is check()'s own (glyphs 0.55
 * of the size, wrapped lines included), padded a little. */
function takenBoxes(scene: Scene): {box: Box; from: number; to: number}[] {
  const texts = scene.props.filter(p => (p.type === 'text' || p.type === 'readout') && !/^note\d/.test(p.id));
  if (!texts.length) return [];
  const needsActors = texts.some(p => p.anchor || p.type === 'readout') && scene.actors.length > 0;
  const dt = Math.max(1 / (scene.fps || 30), scene.duration / 240), pad = 3 * scene.height / 1080;
  const out: {box: Box; from: number; to: number}[] = [], last = new Map<string, {box: Box; from: number; to: number}>();
  const none = new Map<string, ActorFrame>();
  for (let t = 0; t <= scene.duration + 1e-9; t += dt) {
    const actors = needsActors ? actorsAt(scene, t) : none;
    for (const p of texts) {
      const f = propFrame(p, t, actors, scene) as unknown as {opacity: number; x: number; y: number; text: string; size?: number; align?: string; width?: number};
      if (f.opacity <= 0.05 || !String(f.text).trim()) { last.delete(p.id); continue; }
      const size = f.size ?? 32, lines = f.width ? wrapText(String(f.text), size, f.width) : [String(f.text)];
      const w = Math.max(...lines.map(l => textWidth(l, size))), x0 = f.align === 'middle' ? f.x - w / 2 : f.align === 'end' ? f.x - w : f.x;
      const box: Box = [x0 - pad, f.y - size / 2 - pad, x0 + w + pad, f.y + size / 2 + (lines.length - 1) * size * 1.25 + pad];
      const prev = last.get(p.id);
      if (prev && prev.box.every((v, j) => Math.abs(v - box[j]) < 0.5)) { prev.to = t + dt; continue; }
      const o = {box, from: t, to: t + dt};
      out.push(o); last.set(p.id, o);
    }
  }
  return out;
}
