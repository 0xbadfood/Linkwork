// Checks: plain-language errors about a scene, found before anything is drawn. Static checks look at the data;
// motion checks sample every frame.
import {EASES} from './ease.ts';
import {keyErrors} from './keys.ts';
import {poseErrors, rigErrors, type Rig} from './rig.ts';
import {frame, rigOf, type Frame, type Prop, type Scene} from './scene.ts';
import {dist, type Vec} from './vec.ts';

export type CheckOptions = {
  /** Largest joint speed allowed outside blink intervals, in frame heights per second. */
  speed?: number;
  /** How far, in scene units, a solved constraint may be off. */
  tolerance?: number;
  /** Check every nth frame. */
  every?: number;
};

export function sceneErrors(scene: Scene): string[] {
  const errors: string[] = [];
  if (scene?.linkwork !== 1) errors.push('scene: "linkwork": 1 is required (the format version)');
  for (const f of ['width', 'height', 'fps', 'duration'] as const)
    if (!(typeof scene?.[f] === 'number' && scene[f] > 0)) errors.push(`scene: ${f} must be a positive number`);
  if (!Array.isArray(scene?.actors) || !Array.isArray(scene?.props)) return [...errors, 'scene: actors and props must be lists'];
  const ids = new Set<string>();
  const joints = new Map<string, Set<string>>();
  const rigs = new Map<string, Rig>();
  scene.actors.forEach((a, i) => {
    const where = `actor ${a.id ?? i}`;
    if (!a.id || ids.has(a.id)) errors.push(`${where}: needs a unique id`);
    ids.add(a.id);
    const rig = rigOf(a.rig);
    if (!rig) { errors.push(`${where}: unknown rig ${JSON.stringify(a.rig)}`); return; }
    if (typeof a.rig !== 'string') errors.push(...rigErrors(rig));
    rigs.set(a.id, rig);
    joints.set(a.id, new Set([rig.root, ...rig.bones.map(b => b.to)]));
    if (!Array.isArray(a.at) || a.at.length !== 2) errors.push(`${where}: at is [x, y]`);
    (a.pose ?? []).forEach((k, j) => {
      if (typeof k.pose === 'string' && !rig.poses?.[k.pose]) errors.push(`${where}: unknown pose ${k.pose}; ${rig.id} has ${Object.keys(rig.poses ?? {}).join(', ')}`);
      if (typeof k.pose === 'object') errors.push(...poseErrors(rig, k.pose, `${where} pose ${j + 1}`));
      if (k.ease && !EASES.includes(k.ease)) errors.push(`${where}: unknown ease ${k.ease}`);
      if (j && k.t < a.pose![j - 1].t) errors.push(`${where}: pose keys must be in time order`);
    });
    (a.base ?? []).forEach((k, j) => { if (j && k.t < a.base![j - 1].t) errors.push(`${where}: base keys must be in time order`); });
    for (const d of a.drivers ?? []) if (!(d.t1 > d.t0)) errors.push(`${where}: a ${d.driver} driver needs t1 after t0`);
    for (const ik of a.ik ?? []) {
      if (!joints.get(a.id)!.has(ik.joint)) errors.push(`${where}: ik names unknown joint ${ik.joint}`);
      if (!Array.isArray(ik.target)) {
        if (!joints.has(ik.target.actor)) errors.push(`${where}: ik target actor ${ik.target.actor} must be an earlier actor`);
        else if (!joints.get(ik.target.actor)!.has(ik.target.joint)) errors.push(`${where}: ik target joint ${ik.target.joint} is not on ${ik.target.actor}`);
      }
    }
    if (a.opacity) errors.push(...keyErrors(a.opacity, `${where} opacity`));
  });
  scene.props.forEach((p: Prop, i) => {
    const where = `prop ${p.id ?? i}`;
    for (const [field, keys] of Object.entries(p.keys ?? {})) errors.push(...keyErrors(keys, `${where} keys.${field}`));
    if (p.anchor && !joints.get(p.anchor.actor)?.has(p.anchor.joint)) errors.push(`${where}: anchor ${p.anchor.actor}.${p.anchor.joint} is not a joint of an actor`);
  });
  return errors;
}

/** Collapse repeats: the first time each problem happens, and how many more frames have it. */
function collect() {
  const seen = new Map<string, {t: number; n: number}>();
  return {
    add(key: string, t: number) { const s = seen.get(key); if (s) s.n++; else seen.set(key, {t, n: 0}); },
    list: () => [...seen].map(([key, s]) => `${key} at ${s.t.toFixed(2)} s${s.n ? ` (and ${s.n} more frame${s.n > 1 ? 's' : ''})` : ''}`),
  };
}

const inBlink = (blinks: [number, number][] | undefined, t: number, dt: number) =>
  (blinks ?? []).some(([a, b]) => t >= a - dt && t <= b + dt);

export function motionErrors(scene: Scene, options: CheckOptions = {}): string[] {
  const out = collect();
  const dt = 1 / scene.fps, every = options.every ?? 1;
  const limit = (options.speed ?? 3) * scene.height;
  const n = Math.floor(scene.duration * scene.fps);
  const byId = new Map(scene.actors.map(a => [a.id, a]));
  let prev: Frame | undefined;
  for (let i = 0; i <= n; i += every) {
    const t = i * dt;
    let f: Frame;
    try { f = frame(scene, t); } catch (e) { out.add(`frame fails: ${(e as Error).message}`, t); continue; }
    for (const a of f.actors) {
      const tol = (options.tolerance ?? 1.5) * Math.max(1, a.scale);
      if (a.residual > tol) out.add(`actor ${a.id}: the rig can't reach its targets (off by ${a.residual.toFixed(1)})`, t);
      if (a.opacity < 0.05) continue;
      for (const [j, p] of a.joints) {
        if (p[0] < 0 || p[0] > f.width || p[1] < 0 || p[1] > f.height) out.add(`actor ${a.id}: ${j} leaves the frame`, t);
      }
      const before = prev?.actors.find(x => x.id === a.id);
      if (before && before.opacity >= 0.05 && !inBlink(byId.get(a.id)?.blink, t, dt * every)) {
        for (const [j, p] of a.joints) {
          const q = before.joints.get(j);
          if (q && dist(p, q) / (dt * every) > limit) out.add(`actor ${a.id}: ${j} moves too fast to follow (declare a blink if the jump is meant)`, t);
        }
      }
      if (before && scene.surfaces?.length && !inBlink(byId.get(a.id)?.blink, t, dt * every)) {
        for (const c of a.rig.contacts ?? []) {
          const p = a.joints.get(c)!, q = before.joints.get(c)!;
          for (const s of scene.surfaces) {
            if (p[0] < s.x0 || p[0] > s.x1) continue;
            if (q[1] <= s.y + 1 && p[1] > s.y + 2.5) out.add(`actor ${a.id}: ${c} sinks through the surface at y ${s.y.toFixed(0)}`, t);
          }
        }
      }
    }
    for (const p of f.props) {
      if (p.opacity < 0.05) continue;
      const pts: Vec[] = p.type === 'text' ? textBox(p) : p.type === 'polyline' ? p.points
        : p.type === 'circle' ? [[p.x - p.r, p.y - p.r], [p.x + p.r, p.y + p.r]] : p.type === 'rect' ? [[p.x, p.y], [p.x + p.w, p.y + p.h]] : [];
      if (pts.some(q => q[0] < -1 || q[0] > f.width + 1 || q[1] < -1 || q[1] > f.height + 1)) out.add(`prop ${p.id}: leaves the frame`, t);
    }
    prev = f;
  }
  return out.list();
}

/** A rough box for a line of text (average glyph width ~0.55 of the size). */
function textBox(p: Prop & {type: 'text'}): Vec[] {
  const size = p.size ?? 32, w = 0.55 * size * [...p.text].length;
  const x0 = p.align === 'middle' ? p.x - w / 2 : p.align === 'end' ? p.x - w : p.x;
  return [[x0, p.y - size / 2], [x0 + w, p.y + size / 2]];
}

export function check(scene: Scene, options: CheckOptions = {}): string[] {
  const errors = sceneErrors(scene);
  return errors.length ? errors : motionErrors(scene, options);
}
