// Keyed values: [time, value, ease]. The ease of a key says how the value arrives at it.
import {ease, type Ease} from './ease.ts';
import {lerp} from './vec.ts';

export type Key = [number, number] | [number, number, Ease];

export function valueAt(keys: Key[], t: number): number {
  if (!keys.length) return NaN;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      return t1 === t0 ? v1 : lerp(v0, v1, ease(e, (t - t0) / (t1 - t0)));
    }
  }
  return keys[keys.length - 1][1];
}

/** Errors in a list of keys: times must be numbers in order. */
export function keyErrors(keys: unknown, where: string): string[] {
  if (!Array.isArray(keys) || !keys.length) return [`${where}: keys must be a non-empty list of [t, value, ease?]`];
  const errors: string[] = [];
  keys.forEach((k, i) => {
    if (!Array.isArray(k) || typeof k[0] !== 'number' || typeof k[1] !== 'number') errors.push(`${where}[${i}]: a key is [t, value, ease?]`);
    else if (i && k[0] < keys[i - 1][0]) errors.push(`${where}[${i}]: keys must be in time order`);
  });
  return errors;
}

/** A 0-to-1 visibility for show: [t0, t1] with fades at both ends. */
export function shown(show: [number, number] | undefined, t: number, fade = 0.3): number {
  if (!show) return 1;
  const [t0, t1] = show;
  if (t < t0 || t > t1) return 0;
  const f = Math.max(1e-6, fade);
  return Math.min(1, (t - t0) / f, (t1 - t) / f, 1);
}

/** The highlight pulse: three soft pulses of 0.6 s from each start time (as the diagram figures do). */
export function pulseAt(starts: number[] | undefined, t: number, period = 0.6, count = 3): number {
  let p = 0;
  for (const s of starts ?? []) {
    const d = t - s;
    if (d >= 0 && d <= period * count) p = Math.max(p, Math.sin(Math.PI * d / period) ** 2);
  }
  return p;
}
