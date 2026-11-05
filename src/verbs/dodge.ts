// Moving names past fixed names: a body's label rides with it, so it crosses every fixed label on its path
// (2026-11-05, orbit kepler: the planet's name ran over "aphelion" and "perihelion" in 20 published scenes).
import type {Prop} from '../scene.ts';
import type {Key} from '../keys.ts';
import {textWidth, wrapText} from '../svg.ts';

type Box = [number, number, number, number];
type TextLike = {x: number; y: number; text: string; size?: number; align?: 'start' | 'middle' | 'end'; width?: number};

/** The box check() reads for a text (as check.ts's textBox), grown by pad. */
export function boxOf(p: TextLike, pad = 0): Box {
  const size = p.size ?? 32, lines = p.width ? wrapText(p.text, size, p.width) : [p.text];
  const w = Math.max(...lines.map(l => textWidth(l, size)));
  const x0 = p.align === 'middle' ? p.x - w / 2 : p.align === 'end' ? p.x - w : p.x;
  return [x0 - pad, p.y - size / 2 - pad, x0 + w + pad, p.y + size / 2 + (lines.length - 1) * size * 1.25 + pad];
}

export const meets = (a: Box, b: Box) => Math.min(a[2], b[2]) > Math.max(a[0], b[0]) && Math.min(a[3], b[3]) > Math.max(a[1], b[1]);

/** Whether the segment u→v passes through the box (sampled along its length; good to a couple of pixels). */
export function crosses(b: Box, u: [number, number], v: [number, number]): boolean {
  const n = Math.max(2, Math.ceil(Math.hypot(v[0] - u[0], v[1] - u[1]) / 3));
  for (let i = 0; i <= n; i++) {
    const x = u[0] + (v[0] - u[0]) * i / n, y = u[1] + (v[1] - u[1]) * i / n;
    if (x > b[0] && x < b[2] && y > b[1] && y < b[3]) return true;
  }
  return false;
}

/** A moving text: its words and size, and where its x, y are at screen times (sampled densely). */
export type Mover = Omit<TextLike, 'x' | 'y'> & {track: {t: number; at: [number, number]}[]};

/** Opacity keys that fade a fixed text out while any moving text passes over it, or undefined when none does. */
export function passKeys(fixed: TextLike, movers: Mover[], pad = 10, fade = 0.25): Key[] | undefined {
  const fb = boxOf(fixed, pad), hits: [number, number][] = [];
  for (const m of movers) for (let i = 0; i < m.track.length; i++) {
    if (!meets(fb, boxOf({...m, x: m.track[i].at[0], y: m.track[i].at[1]}))) continue;
    hits.push([m.track[Math.max(0, i - 1)].t, m.track[Math.min(m.track.length - 1, i + 1)].t]);
  }
  if (!hits.length) return undefined;
  hits.sort((p, q) => p[0] - q[0]);
  const spans: [number, number][] = [];
  for (const [t0, t1] of hits) { const last = spans[spans.length - 1]; if (last && t0 <= last[1] + 2 * fade) last[1] = Math.max(last[1], t1); else spans.push([t0, t1]); }
  // passing over it from the first frame: hidden from the start
  const keys: Key[] = spans[0][0] <= fade ? [[0, 0]] : [[0, 1]];
  for (const [t0, t1] of spans) if (t0 <= fade) keys.push([t1, 0], [t1 + fade, 1]); else keys.push([Math.max(keys[keys.length - 1][0], t0 - fade), 1], [Math.max(keys[keys.length - 1][0], t0), 0], [t1, 0], [t1 + fade, 1]);
  return keys;
}

/** Fade each fixed text prop (by id) while a moving text passes it. Leaves texts the motion never reaches alone. */
export function fadeWhilePassing(props: Prop[], ids: string[], movers: Mover[]) {
  for (const p of props) {
    if (p.type !== 'text' || !ids.includes(p.id)) continue;
    const keys = passKeys(p, movers);
    if (keys) p.keys = {...p.keys, opacity: keys};
  }
}
