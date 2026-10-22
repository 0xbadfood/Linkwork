// Drawing: a frame becomes one SVG string. Colours are theme tokens (ink, muted, faint, accent, figure, paper, good,
// bad) or literal colours (#rrggbb, rgb(...)) where colour is the subject, such as a photon's.
import {frame, type ActorFrame, type Frame, type PropFrame, type Scene, type Style} from './scene.ts';
import {add, dist, len, mul, sub, type Vec} from './vec.ts';

export const THEMES: Record<'dark' | 'light', Record<string, string>> = {
  dark: {paper: '#0b2a30', ink: '#f4efe4', muted: '#8fb3b8', faint: '#2f5960', accent: '#f3b85e', figure: '#f4efe4',
    good: '#8fd18f', bad: '#ff8a7a', cool: '#7cc4ff'},
  light: {paper: '#fbf8f1', ink: '#1d2a2e', muted: '#5f7377', faint: '#d9d3c4', accent: '#c7771a', figure: '#1d2a2e',
    good: '#2f8f46', bad: '#c2412d', cool: '#1f6fb2'},
};
const FONTS = {sans: "InfoSans, Inter, 'Helvetica Neue', Arial, sans-serif", serif: "InfoSerif, Georgia, serif",
  mono: "'JetBrains Mono', Menlo, monospace"};

export type SvgOptions = {background?: boolean; theme?: Record<string, string>};

const num = (x: number) => (Math.round(x * 100) / 100).toString();
const pt = (p: Vec) => `${num(p[0])},${num(p[1])}`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function themeOf(scene: Scene, override?: Record<string, string>): Record<string, string> {
  const t = scene.theme ?? 'dark';
  const base = typeof t === 'string' ? THEMES[t] : {...THEMES.dark, ...t};
  return {...base, ...override};
}

export function svg(scene: Scene, t: number, options: SvgOptions = {}): string {
  return drawFrame(frame(scene, t), themeOf(scene, options.theme), options);
}

export function drawFrame(f: Frame, theme: Record<string, string>, options: SvgOptions = {}): string {
  const colour = (c: string | undefined, fallback: string) => {
    const v = c ?? fallback;
    return v === 'none' || v.startsWith('#') || v.startsWith('rgb') || v.startsWith('var(') ? v : theme[v] ?? v;
  };
  const items: {layer: number; i: number; svg: string}[] = [];
  f.props.forEach((p, i) => { if (p.opacity > 0.001) items.push({layer: p.layer, i, svg: drawProp(p, colour)}); });
  f.actors.forEach((a, i) => { if (a.opacity > 0.001) items.push({layer: a.layer, i: 1000 + i, svg: drawActor(a, colour)}); });
  items.sort((a, b) => a.layer - b.layer || a.i - b.i);
  const bg = options.background === false ? '' : `<rect width="${f.width}" height="${f.height}" fill="${colour('paper', '#000')}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f.width} ${f.height}" width="${f.width}" height="${f.height}">${bg}${items.map(x => x.svg).join('')}</svg>`;
}

type Colour = (c: string | undefined, fallback: string) => string;

function glow(pulse: number, colour: Colour): string {
  if (pulse <= 0.01) return '';
  const c = colour('accent', '#fff');
  return ` style="filter: drop-shadow(0 0 ${num(4 + 14 * pulse)}px ${c}) drop-shadow(0 0 ${num(2 + 4 * pulse)}px ${c})"`;
}

function stroke(style: Style | undefined, colour: Colour, fallback = 'ink', width = 3): string {
  const s = style ?? {};
  const dash = s.dash?.length ? ` stroke-dasharray="${s.dash.join(' ')}"` : '';
  return `stroke="${colour(s.stroke, fallback)}" stroke-width="${num(s.width ?? width)}" stroke-linecap="${s.cap ?? 'round'}" stroke-linejoin="round"${dash}`;
}

/** The part of a polyline from its start up to a fraction of its length. */
export function partOf(points: Vec[], fraction: number): Vec[] {
  if (fraction >= 1) return points;
  const lengths = points.slice(1).map((p, i) => dist(points[i], p));
  let left = Math.max(0, fraction) * lengths.reduce((a, b) => a + b, 0);
  const out: Vec[] = [points[0]];
  for (let i = 0; i < lengths.length; i++) {
    if (left >= lengths[i]) { out.push(points[i + 1]); left -= lengths[i]; continue; }
    out.push(add(points[i], mul(sub(points[i + 1], points[i]), left / (lengths[i] || 1))));
    break;
  }
  return out;
}

function arrowHead(tip: Vec, from: Vec, size: number, fill: string): string {
  const d = sub(tip, from), l = len(d) || 1, u: Vec = [d[0] / l, d[1] / l], n: Vec = [-u[1], u[0]];
  const back = sub(tip, mul(u, size));
  return `<path d="M${pt(tip)}L${pt(add(back, mul(n, size * 0.55)))}L${pt(sub(back, mul(n, size * 0.55)))}Z" fill="${fill}"/>`;
}

export function drawProp(p: PropFrame, colour: Colour): string {
  const open = `<g opacity="${num(p.opacity)}"${glow(p.glow, colour)}>`;
  const s = p.style ?? {};
  switch (p.type) {
    case 'line': case 'arrow': {
      const a: Vec = [p.x1, p.y1], b: Vec = [p.x2, p.y2];
      const e = add(a, mul(sub(b, a), Math.max(0, Math.min(1, p.draw ?? 1))));
      if (dist(a, e) < 0.5) return '';
      let out = `<path d="M${pt(a)}L${pt(e)}" fill="none" ${stroke(s, colour)}/>`;
      if (p.type === 'arrow') out += arrowHead(e, a, p.head ?? 6 + 3.5 * (s.width ?? 3), colour(s.stroke, 'ink'));
      return open + out + '</g>';
    }
    case 'polyline': {
      const pts = partOf(p.points, p.draw ?? 1);
      if (pts.length < 2) return '';
      return `${open}<path d="M${pts.map(pt).join('L')}${p.closed && (p.draw ?? 1) >= 1 ? 'Z' : ''}" fill="${colour(s.fill, 'none')}" ${stroke(s, colour)}/></g>`;
    }
    case 'rect':
      return `${open}<rect x="${num(p.x)}" y="${num(p.y)}" width="${num(p.w)}" height="${num(p.h)}" rx="${num(p.r ?? 0)}" fill="${colour(s.fill, 'none')}" ${stroke(s, colour, s.stroke ? 'ink' : 'none')}/></g>`;
    case 'circle':
      return `${open}<circle cx="${num(p.x)}" cy="${num(p.y)}" r="${num(p.r)}" fill="${colour(s.fill, 'none')}" ${stroke(s, colour, s.stroke ? 'ink' : 'none')}/></g>`;
    case 'text': {
      const anchor = p.align ?? 'start';
      return `${open}<text x="${num(p.x)}" y="${num(p.y)}" font-family="${esc(FONTS[p.font ?? 'sans'])}" font-size="${num(p.size ?? 32)}" font-weight="${p.weight ?? 500}" text-anchor="${anchor}" dominant-baseline="middle" fill="${colour(s.fill, 'ink')}">${esc(p.text)}</text></g>`;
    }
    case 'wave': {
      const a: Vec = [p.x1, p.y1], b: Vec = [p.x2, p.y2], L = dist(a, b) || 1;
      const u: Vec = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n: Vec = [-u[1], u[0]];
      const head = p.progress * (L + p.length), tail = head - p.length;
      const s0 = Math.max(0, tail), s1 = Math.min(L, head);
      if (s1 - s0 < 1) return '';
      const pts: Vec[] = [];
      for (let x = s0; x <= s1 + 0.01; x += 2) {
        const env = Math.sin(Math.PI * Math.min(1, Math.max(0, (x - tail) / p.length))) ** 0.6;
        pts.push(add(add(a, mul(u, x)), mul(n, p.amplitude * env * Math.sin(2 * Math.PI * x / p.wavelength))));
      }
      let out = `<path d="M${pts.map(pt).join('L')}" fill="none" ${stroke(s, colour)}/>`;
      if (head <= L && head > p.length * 0.5) out += arrowHead(add(add(a, mul(u, s1)), mul(u, 10)), add(a, mul(u, s1 - 10)), 8 + 3 * (s.width ?? 3), colour(s.stroke, 'ink'));
      return open + out + '</g>';
    }
  }
}

const SIDE_BACK = ['upper_arm_r', 'forearm_r', 'thigh_r', 'shin_r'];

export function drawActor(a: ActorFrame, colour: Colour): string {
  const w = (a.skin.width ?? 6.5) * a.scale;
  const ink = colour(a.skin.color, 'figure'), paper = colour('paper', '#000');
  const back = new Set(a.skin.back ?? (a.rig.id === 'figure' ? SIDE_BACK : []));
  const headBone = a.skin.head ?? (a.rig.id === 'figure' ? 'head' : undefined);
  const bone = (id: string, width: number, c: string, extra = '') => {
    const b = a.rig.bones.find(x => x.id === id)!;
    return `<path d="M${pt(a.joints.get(b.from)!)}L${pt(a.joints.get(b.to)!)}" stroke="${c}" stroke-width="${num(width)}" stroke-linecap="round"${extra}/>`;
  };
  const halo = w * 0.9;
  const parts: string[] = [];
  const layer = (ids: string[], opacity = 1) => {
    // A paper-coloured halo under each bone breaks the lines behind it, so crossings read in depth.
    for (const id of ids) parts.push(bone(id, w + halo, paper));
    for (const id of ids) parts.push(bone(id, w, ink, opacity < 1 ? ` opacity="${opacity}"` : ''));
  };
  const others = a.rig.bones.map(b => b.id).filter(id => id !== headBone);
  layer(others.filter(id => back.has(id)), 0.6);
  layer(others.filter(id => !back.has(id)));
  if (headBone) {
    const b = a.rig.bones.find(x => x.id === headBone)!;
    const p0 = a.joints.get(b.from)!, p1 = a.joints.get(b.to)!;
    const c: Vec = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2], r = dist(p0, p1) / 2;
    parts.push(`<circle cx="${num(c[0])}" cy="${num(c[1])}" r="${num(r + halo / 2)}" fill="${paper}"/>`);
    parts.push(`<circle cx="${num(c[0])}" cy="${num(c[1])}" r="${num(r - w / 2)}" fill="${paper}" stroke="${ink}" stroke-width="${num(w)}"/>`);
    if (a.skin.face !== false && a.face !== 'none') parts.push(face(c, sub(p1, p0), r, a.facing, a.face, ink, w));
  }
  return `<g opacity="${num(a.opacity)}"${glow(a.glow, colour)}>${parts.join('')}</g>`;
}

function face(c: Vec, axis: Vec, r: number, facing: 1 | -1, kind: string, ink: string, w: number): string {
  const l = len(axis) || 1, up: Vec = [axis[0] / l, axis[1] / l];
  const fwd: Vec = [-up[1] * facing, up[0] * facing];
  const at = (u: number, f: number): Vec => add(c, add(mul(up, u * r), mul(fwd, f * r)));
  const eye = (p: Vec, s = 0.11) => `<circle cx="${num(p[0])}" cy="${num(p[1])}" r="${num(s * r)}" fill="${ink}"/>`;
  const big = kind === 'surprise' ? 0.14 : 0.11;
  let out = eye(at(0.18, 0.42), big) + eye(at(0.18, 0.02), big);
  const m0 = at(-0.3, 0.05), m1 = at(-0.3, 0.55), mid = at(-0.3, 0.3);
  const line = `stroke="${ink}" stroke-width="${num(w * 0.45)}" stroke-linecap="round" fill="none"`;
  const curve = (k: number) => `<path d="M${pt(m0)}Q${pt(add(mid, mul(up, -k * r)))} ${pt(m1)}" ${line}/>`;
  if (kind === 'smile') out += curve(0.3);
  else if (kind === 'grin') out += `<path d="M${pt(m0)}Q${pt(add(mid, mul(up, -0.45 * r)))} ${pt(m1)}Z" fill="${ink}"/>`;
  else if (kind === 'sad') out += curve(-0.25);
  else if (kind === 'surprise') out += `<circle cx="${num(mid[0])}" cy="${num(mid[1] )}" r="${num(0.12 * r)}" ${line}/>`;
  else if (kind === 'focus') out += `<path d="M${pt(at(-0.3, 0.12))}L${pt(at(-0.3, 0.48))}" ${line}/>`;
  else out += curve(0.12);
  return out;
}
