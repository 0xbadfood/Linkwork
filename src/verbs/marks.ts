// annotate: labels and points any verb's scene can carry (user, 2026-10-28: "the verbs should be capable of inserting
// labels and points; optional, as these verbs need reuse in problems"). A mark sits at a named point the verb publishes
// (meta.anchors: F, C, the object, the image, the point of incidence ...) or at [x, y] in the verb's own units: the
// coordinates of its plane (graphs, calculus, the stage) or the units it states in meta.units (ray_diagram: cm along
// and above the axis). A spec without annotate is drawn exactly as before. (Not `marks`: graph and
// motion_on_line already have marks of their own.)
import {toScene, type Plane} from '../plane.ts';
import type {Prop, Scene} from '../scene.ts';
import {round, type Vec} from '../vec.ts';

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
  const resolve = (v: string | [number, number], i: number, field: string): Vec | undefined => {
    let at: Vec | undefined;
    if (typeof v === 'string') {
      at = meta?.anchors?.[v];
      if (!at) { errors.push(`${verb}: annotate[${i}].${field}: no point named ${JSON.stringify(v)}; ${anchors.length ? `named points: ${anchors.join(', ')}` : 'this verb names no points'}${units ? `, or [x, y] in ${units}` : ''}`); return; }
    } else if (meta?.units) at = [meta.units.ox + meta.units.sx * v[0], meta.units.oy - meta.units.sy * v[1]];
    else if (planes.length === 1) at = toScene(planes[0] as Plane, v);
    else { errors.push(`${verb}: annotate[${i}]: this verb takes named points only (${anchors.join(', ') || 'none'})`); return; }
    if (at[0] < 0 || at[0] > scene.width || at[1] < 0 || at[1] > scene.height) { errors.push(`${verb}: annotate[${i}].${field} is off the picture`); return; }
    return at;
  };
  marks.forEach((m, i) => {
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
        props.push({id: `note${i}-label`, type: 'text', x: round(x, 2), y: round(y, 2), text: m.text, size: 30 * k, weight: 700,
          align: upright ? 'end' : 'middle', show, fade: 0.3, style: {fill, stroke: 'paper', width: 9 * k}, layer: 8});
      }
      return;
    }
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
