// The coordinate plane: maths coordinates mapped into a box in the scene, plus the numeric tools the maths verbs
// need (where a function is defined, its critical points, its integral) and claims such as "x >= 0" checked against
// the function itself.
import {derivative, evaluate, parse, tree} from './expr.ts';
import type {Vec} from './vec.ts';

export type Plane = {id: string; x: [number, number]; y: [number, number];
  /** The plane's box in the scene: [left, top, right, bottom]. */
  box: [number, number, number, number]};

export const toScene = (p: Plane, [x, y]: Vec): Vec => [
  p.box[0] + (x - p.x[0]) / (p.x[1] - p.x[0]) * (p.box[2] - p.box[0]),
  p.box[3] - (y - p.y[0]) / (p.y[1] - p.y[0]) * (p.box[3] - p.box[1])];
export const toPlane = (p: Plane, [sx, sy]: Vec): Vec => [
  p.x[0] + (sx - p.box[0]) / (p.box[2] - p.box[0]) * (p.x[1] - p.x[0]),
  p.y[0] + (p.box[3] - sy) / (p.box[3] - p.box[1]) * (p.y[1] - p.y[0])];
/** Scene units per maths unit along each axis. */
export const unitsOf = (p: Plane): Vec => [(p.box[2] - p.box[0]) / (p.x[1] - p.x[0]), (p.box[3] - p.box[1]) / (p.y[1] - p.y[0])];
/** The on-screen angle (degrees, counter-clockwise) of a line with this slope on the plane. */
export const slopeAngle = (p: Plane, slope: number): number => {
  const [ux, uy] = unitsOf(p);
  return Math.atan2(slope * uy, ux) * 180 / Math.PI;
};

export function planeErrors(p: Plane): string[] {
  const e: string[] = [];
  if (!p?.id) e.push('plane: needs an id');
  if (!(p?.x?.[0] < p?.x?.[1]) || !(p?.y?.[0] < p?.y?.[1])) e.push(`plane ${p?.id}: x and y are [low, high]`);
  if (!(p?.box?.[0] < p?.box?.[2]) || !(p?.box?.[1] < p?.box?.[3])) e.push(`plane ${p?.id}: box is [left, top, right, bottom] in the scene`);
  return e;
}

export type Interval = {lo: number; hi: number};

/** Where f is defined within [a, b], as closed-ish intervals found by sampling and refined by bisection. A point where
 * f jumps through a vertical asymptote counts as a gap. `big` is the size beyond which a value is an asymptote. */
export function definedIntervals(f: (x: number) => number, a: number, b: number, big = 1e6, n = 4000): Interval[] {
  const ok = (x: number) => { const v = f(x); return Number.isFinite(v) && Math.abs(v) < big; };
  const edge = (good: number, bad: number) => {
    for (let i = 0; i < 60; i++) { const m = (good + bad) / 2; if (ok(m)) good = m; else bad = m; }
    return good;
  };
  const out: Interval[] = [];
  let start: number | undefined, prevX = a, prevOk = false;
  for (let i = 0; i <= n; i++) {
    const x = a + (b - a) * i / n, good = ok(x);
    if (good && !prevOk) start = i === 0 ? a : edge(x, prevX);
    if (!good && prevOk && start !== undefined) { out.push({lo: start, hi: edge(prevX, x)}); start = undefined; }
    // A sign change between two huge values is an asymptote even when both samples are finite.
    if (good && prevOk && i > 0) {
      const p = f(prevX), q = f(x);
      if (Math.sign(p) !== Math.sign(q) && Math.abs(p - q) > big / 1e3 && start !== undefined) {
        out.push({lo: start, hi: prevX}); start = x;
      }
    }
    prevX = x; prevOk = good;
  }
  if (prevOk && start !== undefined) out.push({lo: start, hi: b});
  return out;
}

export type Critical = {x: number; y: number; kind: 'maximum' | 'minimum' | 'flat'};

/** Points in (a, b) where f′ = 0, found from sign changes of f′ and classified by how f′ changes sign. */
export function criticalPoints(f: (x: number) => number, df: (x: number) => number, a: number, b: number, n = 4000): Critical[] {
  const out: Critical[] = [];
  const zero = (lo: number, hi: number) => {
    let flo = df(lo);
    for (let i = 0; i < 80; i++) {
      const m = (lo + hi) / 2, fm = df(m);
      if (Math.sign(fm) === Math.sign(flo)) { lo = m; flo = fm; } else hi = m;
    }
    return (lo + hi) / 2;
  };
  let px = a, pd = df(a);
  for (let i = 1; i <= n; i++) {
    const x = a + (b - a) * i / n, d = df(x);
    if (Number.isFinite(pd) && Number.isFinite(d) && Number.isFinite(f(x)) && Number.isFinite(f(px))) {
      if (pd === 0 && i > 1) { /* counted when it was found */ }
      else if (Math.sign(pd) !== Math.sign(d)) {
        const z = d === 0 ? x : zero(px, x);
        if (z > a + 1e-9 && z < b - 1e-9 && Number.isFinite(f(z))) {
          const h = (b - a) * 1e-3, left = df(z - h), right = df(z + h);
          const kind = left > 0 && right < 0 ? 'maximum' : left < 0 && right > 0 ? 'minimum' : 'flat';
          if (!out.some(c => Math.abs(c.x - z) < (b - a) * 1e-4)) out.push({x: z, y: f(z), kind});
        }
      }
    }
    px = x; pd = d;
  }
  return out;
}

/** ∫ f from a to b by adaptive Simpson's rule. */
export function integrate(f: (x: number) => number, a: number, b: number, tol = 1e-9): number {
  if (a === b) return 0;
  const simpson = (l: number, r: number, fl: number, fm: number, fr: number) => (r - l) / 6 * (fl + 4 * fm + fr);
  const go = (l: number, r: number, fl: number, fm: number, fr: number, whole: number, eps: number, depth: number): number => {
    const m = (l + r) / 2, lm = (l + m) / 2, rm = (m + r) / 2, flm = f(lm), frm = f(rm);
    const left = simpson(l, m, fl, flm, fm), right = simpson(m, r, fm, frm, fr);
    if (depth <= 0 || Math.abs(left + right - whole) <= 15 * eps) return left + right + (left + right - whole) / 15;
    return go(l, m, fl, flm, fm, left, eps / 2, depth - 1) + go(m, r, fm, frm, fr, right, eps / 2, depth - 1);
  };
  const fa = f(a), fb = f(b), fm = f((a + b) / 2);
  return go(a, b, fa, fm, fb, simpson(a, b, fa, fm, fb), tol, 40);
}

/** A Riemann sum with n rectangles: left, right or midpoint heights. */
export function riemann(f: (x: number) => number, a: number, b: number, n: number, rule: 'left' | 'right' | 'mid' = 'mid'): number {
  const w = (b - a) / n;
  let s = 0;
  for (let i = 0; i < n; i++) s += f(a + w * (i + (rule === 'left' ? 0 : rule === 'right' ? 1 : 0.5))) * w;
  return s;
}

// ---- Claims: "x >= 0", "-1 <= y <= 1", "x != 0, x != 2", "all" -------------------------------------------------
export type Claim = {variable: 'x' | 'y'; all: boolean; lo: number; hi: number; loOpen: boolean; hiOpen: boolean; except: number[]; text: string};

const constant = (s: string) => evaluate(parse(s.trim(), []), {});

/** Parse a domain or range claim. Accepts >=, <=, !=, ≥, ≤, ≠, <, >, "all", and a comma list of exclusions. */
export function parseClaim(src: string, variable: 'x' | 'y'): Claim {
  const s = src.replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/≠/g, '!=').trim();
  const claim: Claim = {variable, all: false, lo: -Infinity, hi: Infinity, loOpen: true, hiOpen: true, except: [], text: ''};
  if (/^all( real numbers)?$/i.test(s)) claim.all = true;
  else for (const part of s.split(',').map(x => x.trim())) {
    let m: RegExpExecArray | null;
    const v = variable;
    if ((m = new RegExp(`^${v}\\s*!=\\s*(.+)$`).exec(part))) claim.except.push(constant(m[1]));
    else if ((m = new RegExp(`^(.+?)\\s*(<=|<)\\s*${v}\\s*(<=|<)\\s*(.+)$`).exec(part))) {
      claim.lo = constant(m[1]); claim.loOpen = m[2] === '<'; claim.hi = constant(m[4]); claim.hiOpen = m[3] === '<';
    } else if ((m = new RegExp(`^${v}\\s*(>=|>)\\s*(.+)$`).exec(part))) { claim.lo = constant(m[2]); claim.loOpen = m[1] === '>'; }
    else if ((m = new RegExp(`^${v}\\s*(<=|<)\\s*(.+)$`).exec(part))) { claim.hi = constant(m[2]); claim.hiOpen = m[1] === '<'; }
    else throw new Error(`can't read "${part}"; write it like "${v} >= 0", "-1 <= ${v} <= 1", "${v} != 0" or "all"`);
  }
  claim.text = claimText(claim);
  return claim;
}

const nice = (v: number) => {
  if (Math.abs(v - Math.PI) < 1e-9) return 'π';
  if (Math.abs(v + Math.PI) < 1e-9) return '−π';
  const r = Math.round(v * 1000) / 1000;
  return r < 0 ? `−${-r}` : `${r}`;
};
export function claimText(c: Claim): string {
  const v = c.variable;
  if (c.all || (c.lo === -Infinity && c.hi === Infinity && !c.except.length)) return 'all real numbers';
  const parts: string[] = [];
  if (c.lo > -Infinity && c.hi < Infinity) parts.push(`${nice(c.lo)} ${c.loOpen ? '<' : '≤'} ${v} ${c.hiOpen ? '<' : '≤'} ${nice(c.hi)}`);
  else if (c.lo > -Infinity) parts.push(`${v} ${c.loOpen ? '>' : '≥'} ${nice(c.lo)}`);
  else if (c.hi < Infinity) parts.push(`${v} ${c.hiOpen ? '<' : '≤'} ${nice(c.hi)}`);
  for (const e of c.except) parts.push(`${v} ≠ ${nice(e)}`);
  return parts.join(', ');
}

export const inClaim = (c: Claim, v: number, eps = 0): boolean =>
  (c.all || ((c.loOpen ? v > c.lo - eps : v >= c.lo - eps) && (c.hiOpen ? v < c.hi + eps : v <= c.hi + eps)))
  && !c.except.some(e => Math.abs(v - e) <= Math.min(eps, 1e-9));

/** Check a function's domain and range claims against the function itself, over the x window [a, b]. */
export function claimErrors(src: string, a: number, b: number, domain?: string, range?: string): string[] {
  const errors: string[] = [];
  const n = tree(src);
  const f = (x: number) => evaluate(n, {x});
  const span = b - a, eps = span * 1e-6, n2 = 3000;
  if (domain) {
    let c: Claim;
    try { c = parseClaim(domain, 'x'); } catch (e) { return [`domain: ${(e as Error).message}`]; }
    const wrongIn: number[] = [], wrongOut: number[] = [];
    for (let i = 0; i <= n2; i++) {
      const x = a + span * i / n2;
      const near = [c.lo, c.hi, ...c.except].some(e => Math.abs(x - e) < span / n2 * 1.5);
      if (near) continue;
      const defined = Number.isFinite(f(x)), claimed = inClaim(c, x);
      if (claimed && !defined) wrongIn.push(x);
      if (!claimed && defined) wrongOut.push(x);
    }
    const at = (xs: number[]) => xs.slice(0, 1).map(x => x.toFixed(3)).join('');
    if (wrongIn.length) errors.push(`domain "${domain}" includes x = ${at(wrongIn)}, but f is not defined there`);
    if (wrongOut.length) errors.push(`domain "${domain}" leaves out x = ${at(wrongOut)}, but f is defined there`);
  }
  if (range) {
    let c: Claim;
    try { c = parseClaim(range, 'y'); } catch (e) { return [...errors, `range: ${(e as Error).message}`]; }
    let lo = Infinity, hi = -Infinity;
    const values: number[] = [];
    const take = (v: number) => { if (Number.isFinite(v)) { values.push(v); lo = Math.min(lo, v); hi = Math.max(hi, v); } };
    for (let i = 0; i <= n2 * 4; i++) take(f(a + span * i / (n2 * 4)));
    // The ends of each defined stretch and the turning points, where extremes of the range usually are.
    for (const part of definedIntervals(f, a, b)) { take(f(part.lo)); take(f(part.hi)); }
    const d = derivative(n);
    for (const cp of criticalPoints(f, (x: number) => evaluate(d, {x}), a, b)) take(cp.y);
    const tol = 1e-6 * Math.max(1, Math.abs(c.lo === -Infinity ? 0 : c.lo), Math.abs(c.hi === Infinity ? 0 : c.hi));
    const outside = values.find(v => !inClaim(c, v, tol));
    if (outside !== undefined) errors.push(`range "${range}" leaves out y = ${outside.toFixed(3)}, which f reaches`);
    if (c.lo > -Infinity && !c.loOpen && lo > c.lo + tol) errors.push(`range "${range}" says y reaches ${nice(c.lo)}, but on this window f only gets down to ${lo.toFixed(3)}`);
    if (c.hi < Infinity && !c.hiOpen && hi < c.hi - tol) errors.push(`range "${range}" says y reaches ${nice(c.hi)}, but on this window f only gets up to ${hi.toFixed(3)}`);
  }
  return errors;
}
