// Drawing: a frame becomes one SVG string. Colours are theme tokens (ink, muted, faint, accent, figure, paper, good,
// bad) or literal colours (#rrggbb, rgb(...)) where colour is the subject, such as a photon's.
import type {JointSkin} from './rig.ts';
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
  const bg = options.background === false ? '' : `<rect width="${f.width}" height="${f.height}" fill="${colour('paper', '#000')}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f.width} ${f.height}" width="${f.width}" height="${f.height}">${bg}${drawItems(f, colour)}</svg>`;
}

/** A frame's props and actors in layer order; a compound's parts are drawn among them by their layer (a part's own
 * layers stay inside it), each moved into its box and clipped to it. */
function drawItems(f: Frame, colour: Colour): string {
  const items: {layer: number; i: number; svg: string}[] = [];
  f.props.forEach((p, i) => { if (p.opacity > 0.001) items.push({layer: p.layer, i, svg: drawProp(p, colour)}); });
  f.actors.forEach((a, i) => { if (a.opacity > 0.001) items.push({layer: a.layer, i: 1000 + i, svg: drawActor(a, colour)}); });
  (f.parts ?? []).forEach((p, i) => {
    const [x, y, w, h] = p.box, clip = `lw-part-${esc(p.id)}`;
    items.push({layer: p.layer, i: -1000 + i, svg: `<defs><clipPath id="${clip}"><rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}"/></clipPath></defs>`
      + `<g clip-path="url(#${clip})"><g transform="translate(${num(p.offset[0])} ${num(p.offset[1])}) scale(${+p.scale.toFixed(5)})">${drawItems(p.frame, colour)}</g></g>`});
  });
  items.sort((a, b) => a.layer - b.layer || a.i - b.i);
  return items.map(x => x.svg).join('');
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

/** An estimate of a line of text's width (an average glyph is about 0.55 of the font size). */
export const textWidth = (text: string, size: number) => 0.55 * size * [...text].length;

/** Break text into lines no wider than `width`, at spaces. */
export function wrapText(text: string, size: number, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    // Wrapped at 0.6 of the size a glyph, not textWidth's 0.55: bold titles are wider than average, and a line that
    // runs past its panel is cut off at the canvas edge (seen in a compound's smoke test, 2026-10-26).
    if (line && 0.6 * size * [...next].length > width) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
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
      const anchor = p.align ?? 'start', size = p.size ?? 32;
      const lines = p.width ? wrapText(p.text, size, p.width) : [p.text];
      // A stroke on text is a halo behind the letters, so a label stays readable across lines: the same text drawn
      // first as an outline (a copy, not paint-order, which not every SVG renderer honours).
      const attrs = `x="${num(p.x)}" y="${num(p.y)}" font-family="${esc(FONTS[p.font ?? 'sans'])}" font-size="${num(size)}" font-weight="${p.weight ?? 500}" text-anchor="${anchor}" dominant-baseline="middle"`;
      const body = lines.length === 1 ? esc(lines[0])
        : lines.map((l, i) => `<tspan x="${num(p.x)}" dy="${i ? num(size * 1.25) : 0}">${esc(l)}</tspan>`).join('');
      const halo = s.stroke ? `<text ${attrs} fill="none" stroke="${colour(s.stroke, 'paper')}" stroke-width="${num(s.width ?? size * 0.25)}" stroke-linejoin="round">${body}</text>` : '';
      return `${open}${halo}<text ${attrs} fill="${colour(s.fill, 'ink')}">${body}</text></g>`;
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
    case 'group':
      return `${open}${p.items.map(it => drawProp({...it, opacity: 1, glow: 0, layer: 0} as PropFrame, colour)).join('')}</g>`;
    default:
      return '';                                   // trails and readouts arrive here already turned into polylines and text
  }
}

const SIDE_BACK = ['upper_arm_r', 'forearm_r', 'thigh_r', 'shin_r'];

export function drawActor(a: ActorFrame, colour: Colour): string {
  const w = (a.skin.width ?? 6.5) * a.scale;
  const ink = colour(a.skin.color, 'figure'), paper = colour('paper', '#000');
  const back = new Set(a.skin.back ?? (a.rig.id === 'figure' ? SIDE_BACK : []));
  const headBone = a.skin.head ?? (a.rig.id === 'figure' ? 'head' : undefined);
  const halo = w * 0.9;
  const seg = (p: Vec, q: Vec, width: number, c: string, extra = '') =>
    `<path d="M${pt(p)}L${pt(q)}" stroke="${c}" stroke-width="${num(width)}" stroke-linecap="round"${extra}/>`;
  const ends = (id: string) => {
    const b = a.rig.bones.find(x => x.id === id)!;
    return [a.joints.get(b.from)!, a.joints.get(b.to)!] as const;
  };
  // Halos first (a paper-coloured band under each bone breaks the lines behind it, so crossings read in depth),
  // then the bones themselves, back side before front side.
  const unders: string[] = [], overs: string[] = [];
  const drawBone = (id: string, opacity: number) => {
    const style = a.skin.bones?.[id] ?? {};
    const bw = (style.width ?? a.skin.width ?? 6.5) * a.scale, c = colour(style.color ?? a.skin.color, 'figure');
    const [p, q] = ends(id);
    const extra = opacity < 1 ? ` opacity="${opacity}"` : '';
    switch (style.style ?? 'line') {
      case 'none': return;
      case 'string': overs.push(seg(p, q, Math.max(1.5, bw * 0.35), colour(style.color, 'muted'), extra)); return;
      case 'rod':
        unders.push(seg(p, q, bw + halo, paper));
        overs.push(seg(p, q, bw, c, extra), seg(p, q, bw * 0.42, paper));
        return;
      case 'ladder': {
        const d = sub(q, p), l = len(d) || 1, n: Vec = [-d[1] / l * bw * 2.2, d[0] / l * bw * 2.2];
        const rungs = style.rungs ?? Math.max(2, Math.round(l / (bw * 6)));
        unders.push(seg(add(p, n), add(q, n), bw * 0.7 + halo, paper), seg(sub(p, n), sub(q, n), bw * 0.7 + halo, paper));
        for (let i = 1; i < rungs; i++) {
          const m = add(p, mul(d, i / rungs));
          overs.push(seg(add(m, n), sub(m, n), bw * 0.45, c, extra));
        }
        overs.push(seg(add(p, n), add(q, n), bw * 0.7, c, extra), seg(sub(p, n), sub(q, n), bw * 0.7, c, extra));
        return;
      }
      default:
        unders.push(seg(p, q, bw + halo, paper));
        overs.push(seg(p, q, bw, c, extra));
    }
  };
  const parts: string[] = [];
  const others = a.rig.bones.map(b => b.id).filter(id => id !== headBone);
  for (const group of [others.filter(id => back.has(id)), others.filter(id => !back.has(id))]) {
    unders.length = 0; overs.length = 0;
    group.forEach(id => drawBone(id, back.has(id) ? 0.6 : 1));
    parts.push(...unders, ...overs);
  }
  if (headBone) {
    const [p0, p1] = ends(headBone);
    const c: Vec = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2], r = dist(p0, p1) / 2;
    parts.push(`<circle cx="${num(c[0])}" cy="${num(c[1])}" r="${num(r + halo / 2)}" fill="${paper}"/>`);
    parts.push(`<circle cx="${num(c[0])}" cy="${num(c[1])}" r="${num(r - w / 2)}" fill="${paper}" stroke="${ink}" stroke-width="${num(w)}"/>`);
    if (a.skin.face !== false && a.face !== 'none') parts.push(face(c, sub(p1, p0), r, a.facing, a.face, ink, w));
  }
  for (const [joint, js] of Object.entries(a.skin.joints ?? {})) {
    const at = a.joints.get(joint);
    if (at) parts.push(drawJoint(a, joint, at, js, w, colour));
  }
  return `<g opacity="${num(a.opacity)}"${glow(a.glow, colour)}>${parts.join('')}</g>`;
}

function drawJoint(a: ActorFrame, joint: string, at: Vec, js: JointSkin, w: number, colour: Colour): string {
  const size = (js.size ?? 2.2 * (a.skin.width ?? 6.5)) * a.scale;
  const ink = colour(js.color ?? a.skin.color, 'figure'), paper = colour('paper', '#000');
  const circle = (r: number, fill: string, strokeWidth = 0) =>
    `<circle cx="${num(at[0])}" cy="${num(at[1])}" r="${num(r)}" fill="${fill}"${strokeWidth ? ` stroke="${ink}" stroke-width="${num(strokeWidth)}"` : ''}/>`;
  switch (js.style) {
    case 'ball': return circle(size, colour(js.fill, 'accent'), w * 0.4);
    case 'knob': return circle(size * 0.7, ink);
    case 'pivot': return circle(size * 0.6, paper, w * 0.5) + circle(size * 0.18, ink);
    case 'block': {
      const bw = size * 2.6, bh = size * 1.8;
      return `<rect x="${num(at[0] - bw / 2)}" y="${num(at[1] - bh / 2)}" width="${num(bw)}" height="${num(bh)}" rx="${num(size * 0.2)}" fill="${colour(js.fill, 'faint')}" stroke="${ink}" stroke-width="${num(w * 0.5)}"/>` + circle(size * 0.22, ink);
    }
    case 'pencil': case 'needle': {
      // A tip at the joint, pointing along the bone that ends there.
      const into = a.rig.bones.find(b => b.to === joint), out = a.rig.bones.find(b => b.from === joint);
      const from = into ? a.joints.get(into.from)! : out ? a.joints.get(out.to)! : sub(at, [0, -1]);
      const d = sub(at, from), l = len(d) || 1, u: Vec = [d[0] / l, d[1] / l], n: Vec = [-u[1], u[0]];
      const long = size * (js.style === 'pencil' ? 1.6 : 1.1), wide = size * (js.style === 'pencil' ? 0.55 : 0.3);
      const b0 = sub(at, mul(u, long));
      const fill = js.style === 'pencil' ? colour(js.fill, 'accent') : ink;
      return `<path d="M${pt(at)}L${pt(add(b0, mul(n, wide)))}L${pt(sub(b0, mul(n, wide)))}Z" fill="${fill}" stroke="${ink}" stroke-width="${num(w * 0.25)}" stroke-linejoin="round"/>`;
    }
  }
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
