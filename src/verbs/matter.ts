// magnetic_matter: Class 12 Magnetism and Matter, computed (leph1-05, 2026-11-03). What magnetic_field (Class 10 field
// patterns) and moving_charges (currents) do not show: a dipole's energy, Gauss's law, and what materials do to a field.
//   needle     a dipole in a uniform field: τ = mB sin θ, U = −mB cos θ and its curve; swing lets it settle
//   cut        a magnet cut in two: two smaller magnets, never a lone pole
//   gauss      field lines traced from two poles: a closed surface round a pole has as many lines in as out; a charge's only leave
//   core       a solenoid with a core: H = nI, M = (μr − 1)H, B = μr μ0 H, the bars μ0H and μ0M
//   response   a bar in a uniform field, its lines traced: pushed out (diamagnetic), drawn in (paramagnetic, ferromagnetic)
//   atoms      atomic moments: random, tilting toward B as T falls, M ∝ B/T (Curie); a diamagnet's induced moments oppose B
//   domains    a ferromagnet's domains: random, then those along B grow until it is one domain
//   hysteresis B against H: the loop with its retained field and the reverse field that removes it; soft or hard
import type {Prop, Scene} from '../scene.ts';
import {kit} from './potential.ts';
import {sci} from './electric.ts';

type P2 = [number, number];
export const MATTER_SHOWS = ['needle', 'cut', 'gauss', 'core', 'response', 'atoms', 'domains', 'hysteresis'] as const;
export type MatterSpec = {verb: 'magnetic_matter'; show: (typeof MATTER_SHOWS)[number]; m?: number; B?: number; angle?: number; swing?: boolean;
  source?: 'magnet' | 'charge'; n?: number; I?: number; mur?: number; kind?: 'diamagnetic' | 'paramagnetic' | 'ferromagnetic' | 'soft' | 'hard'; T?: number; aligned?: boolean; Mspan?: number;
  title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};

const MU = 4 * Math.PI * 1e-7, RAD = Math.PI / 180;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const short = (x: number, unit: string) => `${Math.abs(x) >= 100 || Math.abs(x) < .1 ? sci(x, unit) : `${+x.toFixed(2)} ${unit}`}`;

export const torqueOf = (m: number, B: number, deg: number) => m * B * Math.sin(deg * RAD);
export const energyOf = (m: number, B: number, deg: number) => -m * B * Math.cos(deg * RAD);
export const coreOf = (n: number, I: number, mur: number) => { const H = n * I; return {H, M: (mur - 1) * H, B: mur * MU * H, Im: (mur - 1) * I}; };
/** Share of the atoms' full moment along B: Curie's law, M ∝ B/T, reaching full only at saturation. */
export const alignedShare = (B: number, T: number) => Math.min(1, 30 * B / T);
/** Stream function of a long bar of relative permeability mu across a uniform field (unit field, unit radius). */
export const stream = (x: number, y: number, mu: number) => { const r2 = x * x + y * y; return r2 < 1 ? y * 2 * mu / (mu + 1) : y * (1 + (mu - 1) / (mu + 1) / r2); };

export function matterErrors(s: MatterSpec): string[] {
  const e: string[] = [], W = 'magnetic_matter';
  if (!MATTER_SHOWS.includes(s.show)) return [`${W}: show is one of ${MATTER_SHOWS.join(', ')}`];
  for (const n of ['m', 'B', 'n', 'I', 'T', 'Mspan'] as const) if (s[n] !== undefined && !(isNum(s[n]) && s[n]! > 0)) e.push(`${W}: ${n} is a number above 0`);
  if (s.angle !== undefined && !(isNum(s.angle) && s.angle >= 0 && s.angle <= 180)) e.push(`${W}: angle is 0 to 180 degrees`);
  if (s.mur !== undefined && !(isNum(s.mur) && s.mur > 1)) e.push(`${W}: mur, the core's relative permeability, is above 1`);
  if (s.source !== undefined && !['magnet', 'charge'].includes(s.source)) e.push(`${W}: source is magnet or charge`);
  const kinds: Record<string, string[]> = {response: ['diamagnetic', 'paramagnetic', 'ferromagnetic'], atoms: ['diamagnetic', 'paramagnetic'], hysteresis: ['soft', 'hard']};
  if (s.kind !== undefined && !(kinds[s.show] ?? []).includes(s.kind)) e.push(kinds[s.show] ? `${W}: ${s.show} takes kind ${kinds[s.show].join(', ')}` : `${W}: ${s.show} has no kind`);
  return e;
}

export function magneticMatter(s: MatterSpec): Scene {
  const {k, props, bx, by, bw, bh, cx, cy, S, arrow, line, poly, label, ring, keysOf, finish} = kit(s);
  const facts: string[] = [], anchors: Record<string, P2> = {}; let dur = 8, story = '', second = '', n = 0;
  const rect = (x: number, y: number, w: number, h: number, fill: string, extra: Record<string, unknown> = {}, stroke = 'ink') => props.push({id: `r${n++}`, type: 'rect', x, y, w, h, style: {fill, stroke, width: 2 * k}, layer: 2, ...extra} as Prop);
  const magnet = (x: number, y: number, w: number, h: number, extra: Record<string, unknown> = {}) => {   // S on the left, N on the right
    rect(x, y, w / 2, h, 'cool', extra); rect(x + w / 2, y, w / 2, h, 'bad', extra);
    label(x + w / 4, y + h * .68, 'S', 'paper', 30, extra); label(x + w * .75, y + h * .68, 'N', 'paper', 30, extra);
  };
  const field = (x0: number, x1: number, ys: number[]) => ys.forEach(y => arrow([x0, y], [x1, y], 'faint', 2.5));
  const axes = (x0: number, y0: number, w: number, h: number, xn: string, yn: string) => {
    line([x0, y0], [x0 + w, y0], 'ink', 3); line([x0, y0 - h], [x0, y0 + h], 'ink', 3);
    label(x0 + w + 24 * k, y0 + 10 * k, xn, 'muted', 26); label(x0, y0 - h - 12 * k, yn, 'muted', 26);
  };

  if (s.show === 'needle') {
    const m = s.m ?? 6e-2, B = s.B ?? .44, th = s.angle ?? 60, tau = torqueOf(m, B, th), U = energyOf(m, B, th);
    const c: P2 = [bx + bw * .26, cy], L = S * .2, gx = bx + bw * .56, gw = bw * .4, gy = cy, gh = bh * .3, swing = !!s.swing && th > 0 && th < 180; dur = swing ? 10 : 8;
    field(bx + bw * .03, bx + bw * .49, [-.3, -.15, .15, .3].map(f => cy + bh * f)); label(bx + bw * .47, cy - bh * .33, 'B', 'muted', 30);
    const ang = (t: number) => swing && t > 1.5 ? th * Math.exp(-(t - 1.5) * .45) * Math.cos((t - 1.5) * 3.1) : th;
    const tipX = (t: number) => c[0] + L * Math.cos(ang(t) * RAD), tipY = (t: number) => c[1] - L * Math.sin(ang(t) * RAD), tailX = (t: number) => c[0] - L * Math.cos(ang(t) * RAD), tailY = (t: number) => c[1] + L * Math.sin(ang(t) * RAD);
    props.push({id: 'needle', type: 'arrow', x1: tailX(0), y1: tailY(0), x2: tipX(0), y2: tipY(0), head: 20 * k, style: {stroke: 'bad', width: 9 * k}, layer: 3, ...(swing ? {keys: {x1: keysOf(dur, tailX), y1: keysOf(dur, tailY), x2: keysOf(dur, tipX), y2: keysOf(dur, tipY)}} : {})} as Prop);
    props.push({id: 'pivot', type: 'circle', x: c[0], y: c[1], r: 8 * k, style: {fill: 'ink'}, layer: 4} as Prop);
    label(tipX(0) + 24 * k, tipY(0) - 12 * k, 'm', 'bad', 30, swing ? {show: [0, 1.5]} : {});
    if (th > 0 && th < 180 && !swing) { const r = L * .55; poly(Array.from({length: 25}, (_, i) => [c[0] + r * Math.cos(th * RAD * i / 24), c[1] - r * Math.sin(th * RAD * i / 24)] as P2), 'ink', 2); label(c[0] + (r + 26 * k) * Math.cos(th * RAD / 2), c[1] - (r + 26 * k) * Math.sin(th * RAD / 2) + 8 * k, 'θ', 'ink', 26); }
    axes(gx, gy, gw, gh, 'θ', 'U'); label(gx + gw, gy + 40 * k, '180°', 'muted', 22); label(gx + gw / 2 + 34 * k, gy + 40 * k, '90°', 'muted', 22); label(gx + 26 * k, gy + 40 * k, '0°', 'muted', 22);
    const gX = (d: number) => gx + gw * d / 180, gY = (d: number) => gy + gh * Math.cos(d * RAD);
    poly(Array.from({length: 61}, (_, i) => [gX(i * 3), gY(i * 3)] as P2), 'accent', 4);
    props.push({id: 'state', type: 'circle', x: gX(th), y: gY(th), r: 12 * k, style: {fill: 'bad', stroke: 'ink', width: 2 * k}, layer: 4, ...(swing ? {keys: {x: keysOf(dur, t => gX(Math.abs(ang(t)))), y: keysOf(dur, t => gY(ang(t)))}} : {})} as Prop);
    anchors.needle = c; anchors.tip = [tipX(0), tipY(0)]; anchors.state = [gX(th), gY(th)]; anchors.zero = [gX(90), gy]; anchors.lowest = [gX(0), gY(0)]; anchors.highest = [gX(180), gY(180)];
    facts.push(`τ = mB sin θ = ${short(tau, 'N m')}`, `U = −mB cos θ = ${short(U, 'J')}`, `m = ${short(m, 'A m²')}, B = ${short(B, 'T')}, θ = ${th}°`);
    story = th === 0 ? 'Along the field: no torque and the lowest energy. Stable' : th === 180 ? 'Against the field: no torque, but the highest energy. Unstable' : swing ? 'The torque swings the needle toward B; it overshoots, and settles at the lowest energy' : 'The field turns the needle toward B, down the energy curve';
    second = 'Torque mB sin θ is largest at 90°; energy −mB cos θ is lowest at 0°';
  } else if (s.show === 'cut') {
    const w = bw * .6, h = bh * .14, x = cx - w / 2, y = cy - bh * .24, y2 = cy + bh * .1, gap = bw * .1;
    magnet(x, y, w, h, {show: [0, 1e9]});
    line([cx, y - 24 * k], [cx, y + h + 24 * k], 'accent', 3, {show: [1.5, 1e9]}, true); label(cx, y - 34 * k, 'cut', 'accent', 26, {show: [1.5, 1e9]});
    magnet(x - gap / 2, y2, w / 2, h, {show: [3, 1e9]}); magnet(cx + gap / 2, y2, w / 2, h, {show: [3, 1e9]});
    anchors.magnet = [cx, y + h / 2]; anchors.left = [x - gap / 2 + w / 4, y2 + h / 2]; anchors.right = [cx + gap / 2 + w / 4, y2 + h / 2];
    story = 'Cut a magnet and you get two smaller magnets, each with a north and a south pole'; second = 'There is no lone pole: magnetic monopoles are not known to exist';
  } else if (s.show === 'gauss') {
    const charge = s.source === 'charge', c: P2 = [cx, cy], a = S * .17, N = [cx + a, cy] as P2, Sp = [cx - a, cy] as P2, Rs = S * .13, lines = 10; dur = 9;
    const surf: P2 = charge ? c : N, E = (p: P2): P2 => { const dn = [p[0] - N[0], p[1] - N[1]], ds = [p[0] - Sp[0], p[1] - Sp[1]], rn = Math.hypot(dn[0], dn[1]) ** 3, rs = Math.hypot(ds[0], ds[1]) ** 3; return [dn[0] / rn - ds[0] / rs, dn[1] / rn - ds[1] / rs]; };
    let out = 0, inward = 0;
    const inside = (p: P2) => Math.hypot(p[0] - surf[0], p[1] - surf[1]) < Rs;
    if (charge) {
      for (let i = 0; i < lines; i++) { const f = 2 * Math.PI * (i + .5) / lines, tip: P2 = [c[0] + S * .42 * Math.cos(f), c[1] + S * .42 * Math.sin(f)]; arrow(c, tip, 'accent', 3); out++; }
      props.push({id: 'q', type: 'circle', x: c[0], y: c[1], r: 20 * k, style: {fill: 'bad', stroke: 'ink', width: 2 * k}, layer: 3} as Prop); label(c[0], c[1] + 9 * k, '+', 'paper', 28);
    } else {
      for (let i = 0; i < lines; i++) {
        const f = 2 * Math.PI * (i + .5) / lines; let p: P2 = [N[0] + 6 * k * Math.cos(f), N[1] + 6 * k * Math.sin(f)]; const pts: P2[] = [p];
        for (let j = 0; j < 2500; j++) { const v = E(p), g = Math.hypot(v[0], v[1]); p = [p[0] + 3 * k * v[0] / g, p[1] + 3 * k * v[1] / g]; pts.push(p); if (Math.hypot(p[0] - Sp[0], p[1] - Sp[1]) < 8 * k || p[0] < bx - bw || p[0] > bx + 2 * bw || p[1] < by - bh || p[1] > by + 2 * bh) break; }
        const ended = Math.hypot(p[0] - Sp[0], p[1] - Sp[1]) < 8 * k;
        let piece: P2[] = []; const pieces: P2[][] = [piece];
        for (const q of pts) { if (q[0] > bx && q[0] < bx + bw && q[1] > by && q[1] < by + bh) piece.push(q); else if (piece.length) pieces.push(piece = []); }
        pieces.filter(x => x.length > 1).forEach(x => poly(x, 'accent', 3));
        const near = pieces[0], at = Math.min(near.length - 4, Math.floor(Rs * 1.5 / (3 * k)));
        if (at > 0) arrow(near[at], near[at + 3], 'accent', 3); out++;
        // back to N through the magnet: every line closes, so each that left the surface comes back in
        if (ended) { const y = N[1] + Math.sin(f) * bh * .05, x0 = Sp[0]; arrow([x0, y], [N[0] - 14 * k, y], 'accent', 3, {layer: 3}); inward++; }
        else inward++;
      }
      rect(Sp[0], cy - bh * .07, a * 2, bh * .14, 'faint', {layer: 1}, 'ink');
      label(N[0] + 42 * k, cy - bh * .09, 'N', 'bad', 30); label(Sp[0] - 42 * k, cy - bh * .09, 'S', 'cool', 30);
    }
    ring(surf, Rs, Rs, 'good', 4, true, {layer: 4, show: [1.5, 1e9]});
    anchors.surface = surf; anchors.source = c;
    facts.push(charge ? `lines out: ${out}, lines in: 0` : `lines out: ${out}, lines in: ${inward}`, charge ? 'the net flux through the surface is not zero' : 'net flux through any closed surface = 0');
    story = charge ? 'Round a charge every line leaves: a net flux, because lines start on charges' : 'Every line that leaves the closed surface comes back in: the net flux is zero';
    second = 'The closed surface is dashed. Gauss\'s law for magnetism: ∮ B · dS = 0';
  } else if (s.show === 'core') {
    const nn = s.n ?? 1000, I = s.I ?? 2, mur = s.mur ?? 400, c = coreOf(nn, I, mur), mH = MU * c.H, mM = MU * c.M, top = s.Mspan ?? mH + mM, h = bh * .6, gy = by + bh * .85, u = h / top, x1 = bx + bw * .2, x2 = bx + bw * .45, wd = bw * .16;
    line([bx + bw * .1, gy], [bx + bw * .9, gy], 'ink', 3);
    const bar = (x: number, v: number, name: string, c2: string, t: number, low = gy) => { rect(x, low - Math.max(v * u, 3 * k), wd, Math.max(v * u, 3 * k), c2, {show: [t, 1e9]}); label(x + wd / 2, low - Math.max(v * u, 3 * k) - 16 * k, name, 'ink', 26, {show: [t, 1e9]}); };
    bar(x1, mH, 'μ₀H: from the coil', 'cool', .5);
    bar(x2, mM, 'μ₀M: from the core', 'bad', 1.5);
    anchors.coil = [x1 + wd / 2, gy - mH * u]; anchors.core = [x2 + wd / 2, gy - mM * u];
    facts.push(`H = nI = ${sci(c.H, 'A/m')}`, `M = (μr − 1)H = ${sci(c.M, 'A/m')}`, `B = μr μ₀ H ≈ ${c.B.toPrecision(2)} T`, `Iₘ = (μr − 1)I = ${short(c.Im, 'A')}`, `n = ${nn} per m, I = ${short(I, 'A')}, μr = ${mur}`);
    story = mur > 10 ? 'Nearly all the field comes from the core, B = μ₀(H + M)' : 'The core adds to the coil\'s field: B = μ₀(H + M)';
    second = 'H comes from the current alone; M is the core\'s response';
  } else if (s.show === 'response') {
    const kind = s.kind ?? 'diamagnetic', mu = kind === 'diamagnetic' ? .35 : kind === 'paramagnetic' ? 1.7 : 9, R = S * .17, c: P2 = [cx, cy], span = bw * .46 / R;
    const rows = [-2.2, -1.65, -1.1, -.7, -.35, .35, .7, 1.1, 1.65, 2.2];
    rows.forEach(y0 => {
      const psi = y0, pts: P2[] = [];                                 // far out the line is at y0; follow its stream value across
      for (let i = 0; i <= 120; i++) {
        const x = -span + 2 * span * i / 120; let lo = 0, hi = 4 * Math.abs(y0) + 3;
        for (let j = 0; j < 40; j++) { const mid = (lo + hi) / 2; if (stream(x, mid, mu) < Math.abs(psi)) lo = mid; else hi = mid; }
        pts.push([c[0] + x * R, c[1] - Math.sign(y0) * lo * R]);
      }
      const seen = pts.filter(p => p[1] > by && p[1] < by + bh);
      poly(seen, 'accent', 3, {layer: 2}); const a = seen[Math.floor(seen.length * .08)], b = seen[Math.floor(seen.length * .08) + 3]; if (a && b) arrow(a, b, 'accent', 3);
    });
    props.push({id: 'bar', type: 'circle', x: c[0], y: c[1], r: R, style: {fill: 'faint', stroke: 'ink', width: 3 * k}, layer: 1} as Prop);
    label(c[0], c[1] + R + 34 * k, kind, 'ink', 26, {layer: 5}); anchors.bar = c;
    facts.push(kind === 'diamagnetic' ? 'μr slightly below 1, χ small and negative' : kind === 'paramagnetic' ? 'μr slightly above 1, χ small and positive' : 'μr much greater than 1, χ much greater than 1');
    story = kind === 'diamagnetic' ? 'Field lines are pushed out: the field inside is weaker' : kind === 'paramagnetic' ? 'Field lines are drawn in a little: the field inside is stronger' : 'Field lines crowd into the material: the field inside is far stronger';
    second = kind === 'ferromagnetic' ? 'Bent as computed for a bar across the field; drawn with μr = 9' : 'The bending is exaggerated; in real materials it is too small to see';
  } else if (s.show === 'atoms') {
    const kind = s.kind ?? 'paramagnetic', B = s.B ?? 1, T = s.T ?? 300, share = kind === 'paramagnetic' ? (s.aligned ? 1 : alignedShare(B, T)) : 0, cols = 9, rows = 7, x0 = bx + bw * .06, gw = bw * .62, y0 = by + bh * .1, gh = bh * .8, on = 2; dur = 9;
    const seed = (i: number) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
    const barx = bx + bw * .78, barw = bw * .12, base = by + bh * .9, barh = bh * .75;
    let n2 = 0;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const X = x0 + gw * (i + .5) / cols, Y = y0 + gh * (j + .5) / rows, L = 26 * k, r = seed(n2++);
      if (kind === 'diamagnetic') { props.push({id: `at${n2}`, type: 'circle', x: X, y: Y, r: 7 * k, style: {fill: 'faint'}, layer: 2} as Prop); arrow([X + L * .5, Y], [X - L * .5, Y], 'cool', 3, {show: [on, 1e9]}); continue; }
      const start = r * 2 * Math.PI - Math.PI, spread = (1 - share), end = start * spread;       // the tilt that remains leaves the mean along B at the share
      const a = (t: number) => { const f = Math.min(1, Math.max(0, (t - on) / 2.5)); return start + (end - start) * f * f * (3 - 2 * f) + Math.sin(t * 5 + r * 40) * spread * .35; };
      const hx = (t: number) => X + L * Math.cos(a(t)), hy = (t: number) => Y - L * Math.sin(a(t)), tx = (t: number) => X - L * Math.cos(a(t)), ty = (t: number) => Y + L * Math.sin(a(t));
      props.push({id: `at${n2}`, type: 'arrow', x1: tx(0), y1: ty(0), x2: hx(0), y2: hy(0), head: 9 * k, style: {stroke: 'bad', width: 3 * k}, layer: 2, keys: {x1: keysOf(dur, tx, 12), y1: keysOf(dur, ty, 12), x2: keysOf(dur, hx, 12), y2: keysOf(dur, hy, 12)}} as Prop);
    }
    arrow([x0, by + bh * .04], [x0 + gw, by + bh * .04], 'accent', 4, {show: [on - .6, 1e9]}); label(x0 + gw + 22 * k, by + bh * .05, 'B', 'accent', 28, {show: [on - .6, 1e9]});
    line([barx - 20 * k, base], [barx + barw + 20 * k, base], 'ink', 3); label(barx + barw / 2, base + 36 * k, 'M', 'ink', 28);
    if (kind === 'paramagnetic') {
      const hh = barh * share;                                         // one scale: full height is every moment along B
      props.push({id: 'M', type: 'rect', x: barx, y: base - 3 * k, w: barw, h: 3 * k, style: {fill: 'bad'}, layer: 2, keys: {y: keysOf(dur, t => base - 3 * k - hh * Math.min(1, Math.max(0, (t - on) / 2.5))), h: keysOf(dur, t => 3 * k + hh * Math.min(1, Math.max(0, (t - on) / 2.5)))}} as Prop);
      anchors.M = [barx + barw / 2, base - hh]; anchors.Mbase = [barx + barw / 2, base];
      facts.push(`T = ${short(T, 'K')}, B = ${short(B, 'T')}`, 'M ∝ B/T: twice as cold, twice the magnetisation');
      story = 'The field tilts the atoms\' moments toward it; thermal motion knocks them back'; second = 'A colder sample or a stronger field lines up more: M ∝ B/T, Curie\'s law. The tilt is exaggerated; only the proportion is true';
    } else {
      rect(barx, base, barw, barh * .08, 'cool', {show: [on, 1e9]}); anchors.M = [barx + barw / 2, base + barh * .08];
      facts.push('χ is small and negative, and hardly changes with temperature');
      story = 'Atoms with no moment of their own: the field induces small moments against it'; second = 'M points opposite to B, so the material is pushed toward the weaker field';
    }
    anchors.sample = [x0 + gw / 2, y0 + gh / 2];
  } else if (s.show === 'domains') {
    const cols = 6, rows = 4, x0 = bx + bw * .08, gw = bw * .84, y0 = by + bh * .14, gh = bh * .72, cw = gw / cols, ch = gh / rows, on = 2; dur = 10;
    const seed = (i: number) => { const v = Math.sin(i * 91.7 + 13.3) * 43758.5453; return v - Math.floor(v); };
    arrow([x0, by + bh * .07], [x0 + gw, by + bh * .07], 'accent', 4, {show: [on - .6, 1e9]}); label(x0 + gw + 24 * k, by + bh * .08, 'B', 'accent', 28, {show: [on - .6, 1e9]});
    for (let i = 0; i < cols * rows; i++) {
      const c0 = i % cols, r0 = Math.floor(i / cols), X = x0 + cw * (c0 + .5), Y = y0 + ch * (r0 + .5), start = seed(i) * 2 * Math.PI, L = Math.min(cw, ch) * .32, flip = on + .4 + seed(i + 50) * 4;
      const start2 = Math.atan2(Math.sin(start), Math.cos(start));
      const a = (t: number) => { const f = Math.min(1, Math.max(0, (t - flip) / .8)); return start2 * (1 - f); };
      rect(X - cw / 2, Y - ch / 2, cw, ch, 'paper', {layer: 1}, 'faint');
      const hx = (t: number) => X + L * Math.cos(a(t)), hy = (t: number) => Y - L * Math.sin(a(t)), tx = (t: number) => X - L * Math.cos(a(t)), ty = (t: number) => Y + L * Math.sin(a(t));
      props.push({id: `d${i}`, type: 'arrow', x1: tx(0), y1: ty(0), x2: hx(0), y2: hy(0), head: 13 * k, style: {stroke: 'bad', width: 5 * k}, layer: 2, keys: {x1: keysOf(dur, tx, 12), y1: keysOf(dur, ty, 12), x2: keysOf(dur, hx, 12), y2: keysOf(dur, hy, 12)}} as Prop);
    }
    anchors.sample = [cx, cy];
    story = 'Each domain is already magnetised, each its own way, so the whole adds up to almost nothing';
    second = 'In a field the domains line up along B: a small field gives a huge magnetisation';
  } else {
    const kind = s.kind ?? 'hard', hc = kind === 'hard' ? .55 : .06, w = .3, hm = kind === 'hard' ? 1.8 : .8, c: P2 = [cx - bw * .04, cy], sx = bw * .34 / hm, sy = bh * .38; dur = 12;
    const up = (H: number) => Math.tanh((H - hc) / w), down = (H: number) => Math.tanh((H + hc) / w), first = (H: number) => Math.tanh(H / (w * 1.2));
    const P = (H: number, B: number): P2 => [c[0] + H * sx, c[1] - B * sy];
    axes(c[0], c[1], sx * hm * 1.1, sy * 1.15, 'H', 'B'); line([c[0], c[1]], [c[0] - sx * hm * 1.1, c[1]], 'ink', 3);
    const seg = (fn: (H: number) => number, a: number, b: number, t0: number, t1: number, id2: string) => {
      const pts = Array.from({length: 61}, (_, i) => { const H = a + (b - a) * i / 60; return P(H, fn(H)); });
      props.push({id: id2, type: 'polyline', points: pts, style: {stroke: 'accent', width: 4 * k}, draw: 0, keys: {draw: [[t0, 0], [t1, 1, 'linear']]}, layer: 2} as Prop);
    };
    seg(first, 0, hm, .5, 3, 'first'); seg(down, hm, -hm, 3, 7, 'down'); seg(up, -hm, hm, 7, 11, 'up');
    const Br = down(0), Hc = -hc; anchors.retained = P(0, Br); anchors.coercive = P(Hc, 0);
    label(anchors.retained[0] - 100 * k, anchors.retained[1] - 14 * k, 'retained B', 'good', 24, {show: [5, 1e9]}); label(anchors.coercive[0] - 90 * k, anchors.coercive[1] + 36 * k, 'reverse H', 'bad', 24, {show: [6, 1e9]});
    for (const [p, c2, t] of [[anchors.retained, 'good', 5], [anchors.coercive, 'bad', 6]] as const) props.push({id: `m${n++}`, type: 'circle', x: p[0], y: p[1], r: 10 * k, style: {fill: c2, stroke: 'ink', width: 2 * k}, layer: 3, show: [t, 1e9]} as Prop);
    story = kind === 'hard' ? 'A hard material keeps much of its magnetisation, and needs a large reverse field to lose it: a permanent magnet' : 'A soft material loses its magnetisation almost as soon as the field goes: an electromagnet\'s core';
    second = 'B depends on the material\'s history. The curve is a sketch, not measured data';
  }
  return finish('magnetic_matter', s as never, dur, story, second, facts, anchors, s.illustrative);
}
