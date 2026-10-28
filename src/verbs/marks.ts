// annotate: labels and points any verb's scene can carry (user, 2026-10-28: "the verbs should be capable of inserting
// labels and points; optional, as these verbs need reuse in problems"). A mark sits at a named point the verb publishes
// (meta.anchors: F, C, the object, the image, the point of incidence ...) or at [x, y] in the verb's own units: the
// coordinates of its plane (graphs, calculus, the stage) or the units it states in meta.units (ray_diagram: cm along
// and above the axis). A spec without annotate is drawn exactly as before. (Not `marks`: graph and
// motion_on_line already have marks of their own.)
import {toScene, type Plane} from '../plane.ts';
import type {Prop, Scene} from '../scene.ts';
import {round, type Vec} from '../vec.ts';

export type Mark = {text?: string; at: string | [number, number]; point?: boolean; t?: number; colour?: string};
/** px = ox + sx·x, py = oy − sy·y, for a verb that draws in units of its own without a plane. */
export type Units = {ox: number; oy: number; sx: number; sy: number; name: string};

const COLOURS = ['accent', 'ink', 'good', 'bad', 'cool', 'muted'];
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function marksErrors(marks: unknown): string[] {
  if (marks === undefined) return [];
  if (!Array.isArray(marks) || marks.length > 8) return ['annotate is a list of up to 8 {text?, at, point?, t?, colour?}'];
  const e: string[] = [];
  marks.forEach((m: Mark, i) => {
    const where = `annotate[${i}]`;
    if (typeof m !== 'object' || m === null) { e.push(`${where} is {text?, at, point?, t?, colour?}`); return; }
    if (typeof m.at !== 'string' && !(Array.isArray(m.at) && m.at.length === 2 && m.at.every(isNum))) e.push(`${where}: at is a named point of the verb or [x, y] in its units`);
    if (m.text !== undefined && (typeof m.text !== 'string' || !m.text.trim() || m.text.length > 40)) e.push(`${where}: text is a short label (40 characters)`);
    if (m.text === undefined && !m.point) e.push(`${where}: give text, point: true, or both`);
    if (m.point !== undefined && typeof m.point !== 'boolean') e.push(`${where}: point is true or false`);
    if (m.t !== undefined && !(isNum(m.t) && m.t >= 0)) e.push(`${where}: t is the second it appears, 0 or later`);
    if (m.colour !== undefined && !COLOURS.includes(m.colour)) e.push(`${where}: colour is one of ${COLOURS.join(', ')}`);
  });
  return e;
}

/** Where marks can go in this scene: its named points, and the units [x, y] is read in (or why it has none). */
export function markable(scene: Scene): {anchors: string[]; units: string | null} {
  const meta = scene.meta as {anchors?: Record<string, Vec>; units?: Units} | undefined;
  const planes = scene.planes ?? [];
  return {anchors: Object.keys(meta?.anchors ?? {}),
    units: meta?.units ? meta.units.name : planes.length === 1 ? "the drawing's own x and y (the numbers on its axes, or metres on a stage)" : null};
}

/** The scene with its marks drawn: a dot (point: true) and a label just above and to the right of it. */
export function addMarks(scene: Scene, marks: Mark[] | undefined, verb: string): {scene?: Scene; errors: string[]} {
  if (!marks?.length) return {scene, errors: []};
  const meta = scene.meta as {anchors?: Record<string, Vec>; units?: Units} | undefined;
  const planes = scene.planes ?? [];
  const k = scene.height / 1080, errors: string[] = [], props: Prop[] = [];
  const {anchors, units} = markable(scene);
  marks.forEach((m, i) => {
    let at: Vec | undefined;
    if (typeof m.at === 'string') {
      at = meta?.anchors?.[m.at];
      if (!at) { errors.push(`${verb}: annotate[${i}]: no point named ${JSON.stringify(m.at)}; ${anchors.length ? `named points: ${anchors.join(', ')}` : 'this verb names no points'}${units ? `, or [x, y] in ${units}` : ''}`); return; }
    } else if (meta?.units) at = [meta.units.ox + meta.units.sx * m.at[0], meta.units.oy - meta.units.sy * m.at[1]];
    else if (planes.length === 1) at = toScene(planes[0] as Plane, m.at);
    else { errors.push(`${verb}: annotate[${i}]: this verb takes named points only (${anchors.join(', ') || 'none'})`); return; }
    if (at[0] < 0 || at[0] > scene.width || at[1] < 0 || at[1] > scene.height) { errors.push(`${verb}: annotate[${i}] is off the picture`); return; }
    const fill = m.colour ?? 'accent', show: [number, number] = [m.t ?? 0.5, 1e9], [x, y] = [round(at[0], 2), round(at[1], 2)];
    if (m.point) props.push({id: `note${i}-point`, type: 'circle', x, y, r: 9 * k, show, fade: 0.3, style: {fill}, layer: 8});
    if (m.text) {
      const right = x > 0.85 * scene.width;   // near the right edge the label reads leftwards
      props.push({id: `note${i}-label`, type: 'text', x: right ? x - 14 * k : x + 14 * k, y: y - 16 * k, text: m.text, size: 30 * k, weight: 700,
        align: right ? 'end' : 'start', show, fade: 0.3, style: {fill, stroke: 'paper', width: 9 * k}, layer: 8});
    }
  });
  if (errors.length) return {errors};
  return {scene: {...scene, props: [...scene.props, ...props]}, errors: []};
}
