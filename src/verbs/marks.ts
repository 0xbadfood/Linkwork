// annotate: labels and points any verb's scene can carry (user, 2026-10-28: "the verbs should be capable of inserting
// labels and points; optional, as these verbs need reuse in problems"). A mark sits at a named point the verb publishes
// (meta.anchors: F, C, the object, the image, the point of incidence ...) or at [x, y] in the verb's own units: the
// coordinates of its plane (graphs, calculus, the stage) or the units it states in meta.units (ray_diagram: cm along
// and above the axis). A spec without annotate is drawn exactly as before. (Not `marks`: graph and
// motion_on_line already have marks of their own.)
import {toScene, type Plane} from '../plane.ts';
import type {Prop, Scene} from '../scene.ts';
import {round, type Vec} from '../vec.ts';
import {wrapText} from '../svg.ts';

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
  // Labels placed so far (x0, y0, x1, y1): a label that would overlap one is moved up, then down, until it is clear,
  // so two marks at nearby points (edge and central rays crossing the axis close together) both read.
  // The verb's own texts count as placed too: a planner's label moved clear of them as well (2026-10-29: 'Red bends
  // least' landed on the screen's colour names, 'Light bends in air' on the star's label).
  const placed: [number, number, number, number][] = scene.props.filter(p => p.type === 'text' && !p.id.startsWith('note')).map(p => {
    const t = p as unknown as {x: number; y: number; text: string; size?: number; align?: string; width?: number};
    const size = t.size ?? 32, w = Math.min(t.width ?? Infinity, String(t.text).length * size * 0.56), x0 = t.align === 'end' ? t.x - w : t.align === 'middle' ? t.x - w / 2 : t.x;
    // a wrapped text (a panel's title) covers all its lines: a label once sat on a title's second line (C6, 2026-10-30)
    const lines = t.width ? wrapText(String(t.text), size, t.width).length : 1;
    return [x0, t.y - size * 0.6, x0 + w, t.y + size * 0.6 + (lines - 1) * 1.25 * size] as [number, number, number, number];
  });
  const clear = (x: number, y: number, text: string, align: 'start' | 'middle' | 'end'): number => {
    const w = text.length * 30 * k * 0.58, h = 36 * k, x0 = align === 'start' ? x : align === 'end' ? x - w : x - w / 2;
    for (const dy of [0, -40, 40, -80, 80, -120, 120].map(v => v * k).filter(dy => y + dy >= 0.14 * scene.height)) {   // never into a film's header
      const box: [number, number, number, number] = [x0, y + dy - h / 2, x0 + w, y + dy + h / 2];
      if (!placed.some(b => box[0] < b[2] && b[0] < box[2] && box[1] < b[3] && b[1] < box[3])) { placed.push(box); return y + dy; }
    }
    placed.push([x0, y - h / 2, x0 + w, y + h / 2]);
    return y;
  };
  // A mark's text is words for the viewer. A point's id (focus_edge) on screen reads as code: it goes back to the
  // planner. The name of a point the verb already labels (P, F, C) is not drawn twice: only its dot, if asked for.
  const labelled = new Set(((meta as {labelled?: string[]})?.labelled ?? []).map(n => n.toLowerCase()));
  // A label the verb already draws, written again (the curve's 'permanent set' twice, keph2-01 C3): it goes back.
  const own = new Set(scene.props.filter(p => p.type === 'text' && p.id !== 'title').map(p => String((p as {text: string}).text).trim().toLowerCase()));
  marks.forEach((m, i) => {
    if (m.text && /_/.test(m.text) && anchors.includes(m.text.trim())) errors.push(`${verb}: annotate[${i}].text ${JSON.stringify(m.text)} is a point's name: write the words to show, such as ${JSON.stringify(m.text.replace(/_/g, ' '))}`);
    if (m.text && typeof m.at === 'string' && !m.to && labelled.has(m.text.trim().replace(/[₁₂]/g, c => (c === '₁' ? '1' : '2')).toLowerCase()) && m.text.trim().toLowerCase().replace(/[₁₂]/g, c => (c === '₁' ? '1' : '2')) === m.at.toLowerCase()) {
      if (!m.point) return;
      m = {...m, text: undefined};
    }
    if (m.text && !m.to && own.has(m.text.trim().toLowerCase())) { errors.push(`${verb}: annotate[${i}].text ${JSON.stringify(m.text)} is already on the picture: leave it out, or give point: true without text for a dot`); return; }
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
        props.push({id: `note${i}-label`, type: 'text', x: round(x, 2), y: round(clear(x, y, m.text, upright ? 'end' : 'middle'), 2), text: m.text, size: 30 * k, weight: 700,
          align: upright ? 'end' : 'middle', show, fade: 0.3, style: {fill, stroke: 'paper', width: 9 * k}, layer: 8});
      }
      return;
    }
    const fill = m.colour ?? 'accent', show: [number, number] = [m.t ?? 0.5, 1e9], [x, y] = [round(at[0], 2), round(at[1], 2)];
    if (m.point) props.push({id: `note${i}-point`, type: 'circle', x, y, r: 9 * k, show, fade: 0.3, style: {fill}, layer: 8});
    if (m.text) {
      // near the right edge the label reads leftwards; so does one that would run out of a drawing into its panel
      const box = planes.length === 1 ? (planes[0] as Plane).box : undefined;
      const right = x > 0.85 * scene.width || (!!box && x < box[2] && x + 14 * k + m.text.length * 30 * k * 0.58 > box[2] + 20 * k);
      // Kept inside the frame: a label near an edge reads inwards, and never above the top or below the bottom.
      // A label at a large filled disc goes beside it, not across it (a radiating body, keph2-03 C10, 2026-10-31); small dots stay.
      const disc = scene.props.find(p => { const c = p as unknown as {type: string; x: number; y: number; r: number; plane?: string; style?: {fill?: string}};
        return c.type === 'circle' && !c.plane && c.r >= 40 * k && c.style?.fill && Math.hypot(x - c.x, y - c.y) < c.r + 14 * k; }) as unknown as {x: number; r: number} | undefined;
      const start = disc ? (right ? disc.x - disc.r - 12 * k : disc.x + disc.r + 12 * k) : right ? x - 14 * k : x + 14 * k;
      const lx = right ? start : Math.min(start, scene.width - 10 * k - m.text.length * 30 * k * 0.58);
      props.push({id: `note${i}-label`, type: 'text', x: lx, y: round(Math.min(scene.height - 24 * k, Math.max(0.14 * scene.height, clear(lx, Math.max(0.14 * scene.height, y - 16 * k), m.text, right ? 'end' : 'start'))), 2), text: m.text, size: 30 * k, weight: 700,
        align: right ? 'end' : 'start', show, fade: 0.3, style: {fill, stroke: 'paper', width: 9 * k}, layer: 8});
    }
  });
  if (errors.length) return {errors};
  return {scene: {...scene, props: [...scene.props, ...props]}, errors: []};
}
