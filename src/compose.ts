// Compound scenes: several verbs on one canvas (docs/compound-scenes.md). Each part is a verb spec compiled at its
// box's size (verbs lay out from width and height, so it reflows rather than shrinks) or a ready scene scaled to fit,
// drawn by reference into its box on its own clock. Parts never reach into each other's drawing: a link fills a
// part's spec from another part's computed motion and puts both on one clock.
import type {Prop, Scene, ScenePart} from './scene.ts';
import type {Vec} from './vec.ts';

type Box = [number, number, number, number];
export type PartSpec = {id: string; box?: Box; spec?: {verb: string; [k: string]: unknown}; scene?: Scene;
  start?: number; until?: number; layer?: number;
  /** Starts when that part ends (plus `start`, as a pause), which then gives way to it: a sequence in one place. */
  after?: string;
  /** Show its first frame before its clock starts, instead of nothing (a linked part waits on screen). */
  wait?: boolean};
/** trace: the `to` part (a graph) plots the `from` part's motion (its meta.signal) as series `series` and traces it on
 * the same clock, so its tracer is where the mover is; `at` is when, on the from part's clock, the motion starts. */
export type Link = {kind: 'trace'; from: string; to: string; series?: number};
export type CompoundSpec = {compound: true; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light';
  parts: PartSpec[]; links?: Link[]; props?: Prop[]; duration?: number};
/** A verb's motion as a formula of time (in t), from t0 to t1: what a link plots. */
export type Signal = {name: string; unit?: string; expr: string; t: [number, number]};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function composeErrors(c: CompoundSpec): string[] {
  const e: string[] = [];
  const W = c.width ?? 1920, H = c.height ?? 1080;
  if (!Array.isArray(c.parts) || c.parts.length < 1 || c.parts.length > 8) return ['compound: give 1–8 parts'];
  const ids = new Set<string>();
  for (const [i, p] of c.parts.entries()) {
    const where = `part ${p?.id ?? i + 1}`;
    if (typeof p?.id !== 'string' || !/^[a-z][a-z0-9-]{0,30}$/.test(p.id) || ids.has(p.id)) e.push(`${where}: needs a unique short id (a-z, 0-9, -)`);
    ids.add(p?.id);
    if ((p?.spec === undefined) === (p?.scene === undefined)) e.push(`${where}: give a verb spec or a scene, not both`);
    const [x, y, w, h] = p?.box ?? [0, 0, W, H];
    if (![x, y, w, h].every(isNum) || w < 100 || h < 100) e.push(`${where}: box is [x, y, w, h], at least 100 × 100`);
    else if (x < 0 || y < 0 || x + w > W + 1e-6 || y + h > H + 1e-6) e.push(`${where}: its box leaves the canvas (${W} × ${H})`);
    if (p?.start !== undefined && !(isNum(p.start) && p.start >= 0)) e.push(`${where}: start is seconds, 0 or later`);
    if (p?.until !== undefined && !(isNum(p.until) && p.until > (p.start ?? 0))) e.push(`${where}: until must come after start`);
    if (p?.layer !== undefined && !(Number.isInteger(p.layer) && p.layer >= 0 && p.layer <= 9)) e.push(`${where}: layer is 0 to 9`);
    if (p?.after !== undefined && (p.after === p.id || !c.parts.some(q => q.id === p.after))) e.push(`${where}: after names another part`);
  }
  // Same layer, overlapping boxes, at the same time: one would hide the other. Overlays go on a higher layer.
  const span = (p: PartSpec) => [p.start ?? 0, p.until ?? Infinity];
  for (let i = 0; i < c.parts.length; i++) for (let j = i + 1; j < c.parts.length; j++) {
    const a = c.parts[i], b = c.parts[j];
    if ((a.layer ?? 0) !== (b.layer ?? 0) || a.after === b.id || b.after === a.id) continue;     // a sequence takes turns
    const [ax, ay, aw, ah] = a.box ?? [0, 0, W, H], [bx, by, bw, bh] = b.box ?? [0, 0, W, H];
    const [a0, a1] = span(a), [b0, b1] = span(b);
    const meet = ax < bx + bw - 1 && bx < ax + aw - 1 && ay < by + bh - 1 && by < ay + ah - 1;
    if (meet && a0 < b1 && b0 < a1) e.push(`parts ${a.id} and ${b.id} overlap on layer ${a.layer ?? 0}: move a box, put one on a higher layer, or end one (until) before the other starts`);
  }
  for (const [i, l] of (c.links ?? []).entries()) {
    const from = c.parts.find(p => p.id === l?.from), to = c.parts.find(p => p.id === l?.to);
    if (l?.kind !== 'trace') e.push(`link ${i + 1}: kind is trace`);
    if (!from || !to) e.push(`link ${i + 1}: from and to name parts`);
    else if (to.spec?.verb !== 'graph') e.push(`link ${i + 1}: a trace link plots into a graph part`);
  }
  return e;
}

/** Compile a compound into a scene with parts, or the errors that stop it. */
export function compose(c: CompoundSpec, compile: (spec: {verb: string}) => {scene?: Scene; errors: string[]}): {scene?: Scene; errors: string[]} {
  const errors = composeErrors(c);
  if (errors.length) return {errors};
  const W = c.width ?? 1920, H = c.height ?? 1080, fps = c.fps ?? 30;
  const scenes = new Map<string, Scene>();
  const starts = new Map(c.parts.map(p => [p.id, p.start ?? 0]));
  const specs = new Map(c.parts.map(p => [p.id, p.spec ? structuredClone(p.spec) : undefined]));
  const build = (p: PartSpec): string[] => {
    const box = p.box ?? [0, 0, W, H];
    if (p.scene) { scenes.set(p.id, p.scene); return []; }
    const r = compile({...specs.get(p.id)!, width: box[2], height: box[3], fps, theme: c.theme ?? 'dark'} as {verb: string});
    if (r.scene) scenes.set(p.id, r.scene);
    return r.errors.map(x => `part ${p.id}: ${x}`);
  };
  const targets = new Set((c.links ?? []).map(l => l.to));
  const waits = new Set(c.parts.filter(p => p.wait).map(p => p.id));
  for (const p of c.parts) if (!targets.has(p.id)) errors.push(...build(p));
  if (errors.length) return {errors};
  // A trace link: the graph's series becomes the mover's formula, traced in step with the clock, and the mover's part
  // starts when the graph's tracer does.
  for (const l of c.links ?? []) {
    const signal = (scenes.get(l.from)?.meta as {signal?: Signal})?.signal;
    if (!signal) { errors.push(`link ${l.from} → ${l.to}: part ${l.from} has no motion to plot (no formula or accelerated motion)`); continue; }
    const g = specs.get(l.to)! as {series?: {label: string; expr?: string}[]; trace?: Record<string, unknown>; x?: {name: string}};
    const n = l.series ?? 0, series = [...(g.series ?? [])];
    const name = g.x?.name?.trim() || 't';
    series[n] = {label: series[n]?.label ?? signal.name, expr: signal.expr.replace(/(?<![A-Za-z_])t(?![A-Za-z_(])/g, name)};
    const at = isNum(g.trace?.at) ? g.trace!.at as number : 2.6;
    specs.set(l.to, {...g, series, trace: {series: n, from: signal.t[0], to: signal.t[1], at, clock: true}} as never);
    starts.set(l.from, (starts.get(l.to) ?? 0) + at - signal.t[0]);
    waits.add(l.from);
  }
  for (const p of c.parts) if (targets.has(p.id)) errors.push(...build(p));
  if (errors.length) return {errors};
  // A sequence: each part after another starts when it ends, and the earlier one gives way (in the order given).
  const untils = new Map(c.parts.filter(p => p.until !== undefined).map(p => [p.id, p.until!]));
  for (const p of c.parts) if (p.after) {
    const end = starts.get(p.after)! + scenes.get(p.after)!.duration;
    starts.set(p.id, end + (p.start ?? 0));
    if (!untils.has(p.after)) untils.set(p.after, end + (p.start ?? 0));
  }
  const parts: ScenePart[] = c.parts.map(p => {
    const box = p.box ?? [0, 0, W, H] as Box, scene = scenes.get(p.id)!;
    const scale = Math.min(box[2] / scene.width, box[3] / scene.height);
    const offset: Vec = [box[0] + (box[2] - scene.width * scale) / 2, box[1] + (box[3] - scene.height * scale) / 2];
    return {id: p.id, box, offset, scale, start: starts.get(p.id)!, ...(untils.has(p.id) ? {until: untils.get(p.id)} : {}), layer: p.layer ?? 0, ...(waits.has(p.id) ? {wait: true} : {}), scene};
  });
  const duration = c.duration ?? Math.max(...parts.map(p => Math.min(p.until ?? Infinity, p.start + p.scene.duration)));
  return {scene: {linkwork: 1, width: W, height: H, fps, duration, theme: c.theme ?? 'dark', props: c.props ?? [], actors: [], parts,
    meta: {compound: true, facts: parts.flatMap(p => ((p.scene.meta as {facts?: string[]})?.facts ?? []).map(f => `${p.id}: ${f}`)),
      parts: parts.map(p => ({id: p.id, start: p.start, duration: p.scene.duration, box: p.box}))}}, errors: []};
}
