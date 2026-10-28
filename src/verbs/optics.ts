// Ray optics (Class 10 Light, user 2026-10-28: Class 10 physics filmed chapter by chapter). Two verbs.
//
// ray_diagram: a plane, concave or convex mirror, or a convex or concave lens, with an object placed at one distance
// after another (the book's table: beyond C, at C, between C and F ...). Code finds the image from the mirror or lens
// formula with the New Cartesian sign convention, draws the principal rays so they meet exactly at it (dashed behind
// a mirror or lens when the image is virtual), and words the result as the book does: where the image is, real or
// virtual, inverted or erect, enlarged or diminished. An object at infinity is a parallel beam, so the same verb shows
// the focal property (rays meeting at F, or seeming to come from it).
//
// refraction: a ray going from one medium into another (or through a glass slab and out again), bent by Snell's law
// with the book's refractive indices; the angles are measured from the normal, and sin i ÷ sin r is shown for each
// angle in turn, so it can be seen to stay the same. A slab shows the emergent ray parallel to the incident one and
// the lateral shift.
import type {Key} from '../keys.ts';
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {deg, rad, round, type Vec} from '../vec.ts';
import {n2} from './calculus.ts';

type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};
export const DEVICES = ['plane_mirror', 'concave_mirror', 'convex_mirror', 'convex_lens', 'concave_lens'] as const;
export type Device = (typeof DEVICES)[number];
export const RAYS = ['parallel', 'focus', 'centre', 'pole'] as const;
export type RayName = (typeof RAYS)[number];
export type RaySpec = Common & {
  verb: 'ray_diagram';
  device: Device;
  /** The focal length's size in cm (the sign comes from the device); not for a plane mirror. */
  focal_length?: number;
  /** Object distances from the mirror or lens in cm, shown one after another; 'infinity' is a parallel beam. */
  objects: (number | 'infinity')[];
  /** The object's height in cm; default a third of f (a plane mirror: a third of the farthest distance). */
  object_height?: number;
  /** Which principal rays to draw (1 to 3; one alone shows a single ray rule): parallel to the axis, through (or towards) F, through C or the optical
   * centre, to the pole (mirrors). A ray that can't be drawn for a position is swapped for another. */
  rays?: RayName[];
  /** Show u, v, f and m with their signs, and the mirror or lens formula with the numbers in it. */
  formula?: boolean;
  /** A lens: show its power P = 1/f in dioptres. */
  power?: boolean;
  /** A plane mirror: draw the normal where a ray meets the mirror and mark the angles of incidence and reflection. */
  angles?: boolean;
  /** A plane mirror: mark the object's and the image's distances from the mirror as equal. */
  distances?: boolean;
  /** Seconds each object position is shown (3 to 12, default 6). */
  seconds_each?: number;
  /** false: no side panel; the drawing fills the frame, the title above it (a part of a side-by-side compound). */
  panel?: boolean;
  /** A spherical mirror and a parallel beam: reflect each ray off the true sphere, without the small-aperture
   * approximation, over a wide aperture (0.2 to 0.9 of R, default 0.6): edge rays cross the axis nearer the mirror
   * than central ones (spherical aberration). Leave out for the book's ideal ray diagrams. */
  exact?: boolean; aperture?: number;
  /** false: draw the rays but no image (a ray rule on its own); dashed lines then run back to F or C on the axis. */
  image?: boolean;
  /** A second thin lens in contact with the first: the pair acts as one lens of power P = P1 + P2. */
  with?: {device: 'convex_lens' | 'concave_lens'; focal_length: number};
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const fmt = (v: number, places = 2) => n2(Number(v.toFixed(places)), places).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
const signed = (v: number, places = 2) => (v > 1e-9 ? '+' : '') + fmt(v, places);
const isMirror = (d: Device) => d.endsWith('mirror');
const NAME: Record<Device, string> = {plane_mirror: 'plane mirror', concave_mirror: 'concave mirror', convex_mirror: 'convex mirror',
  convex_lens: 'convex lens', concave_lens: 'concave lens'};

/** f with its New Cartesian sign: concave mirror and concave lens negative, convex mirror and convex lens positive. */
const cartesianF = (s: RaySpec) => (s.device === 'concave_mirror' || s.device === 'concave_lens' ? -1 : 1) * (s.focal_length ?? 0);

export type Image = {u: number; v: number; m: number; atInfinity: boolean; real: boolean};

/** The image of an object d cm in front (u = −d): the mirror formula 1/v + 1/u = 1/f or the lens formula
 * 1/v − 1/u = 1/f; m = −v/u for a mirror, v/u for a lens. An object at F gives an image at infinity. */
export function imageOf(device: Device, f: number, d: number): Image {
  const u = -d;
  if (device === 'plane_mirror') return {u, v: d, m: 1, atInfinity: false, real: false};
  const fc = (device === 'concave_mirror' || device === 'concave_lens' ? -1 : 1) * f;
  const inv = isMirror(device) ? 1 / fc - 1 / u : 1 / fc + 1 / u;
  if (Math.abs(inv) < 1e-9 / f) return {u, v: Infinity, m: Infinity, atInfinity: true, real: true};
  const v = 1 / inv, m = isMirror(device) ? -v / u : v / u;
  return {u, v, m, atInfinity: false, real: isMirror(device) ? v < 0 : v > 0};
}

const nearly = (a: number, b: number, f: number) => Math.abs(a - b) < 1e-6 * Math.max(1, f);

/** Where a point d cm from the mirror or lens is, in the book's words, for the object's side or the image's. */
function zone(device: Device, f: number, d: number, side: 'object' | 'image', real = true): string {
  if (!isFinite(d)) return 'at infinity';
  // Words only: the distances are in their own lines, so a picture without numbers (illustrative) still says where.
  if (device === 'plane_mirror') return side === 'object' ? 'in front of the mirror' : 'behind the mirror, as far behind as the object is in front';
  const lens = !isMirror(device);
  if (side === 'image' && !real) {
    if (device === 'convex_mirror') return nearly(d, f, f) ? 'at F, behind the mirror' : 'between P and F, behind the mirror';
    if (device === 'concave_lens') return nearly(d, f, f) ? 'at F₁' : 'between F₁ and the optical centre O, on the object\'s side';
    return lens ? 'on the same side of the lens as the object' : 'behind the mirror';
  }
  if (side === 'object' && (device === 'convex_mirror' || device === 'concave_lens')) return `in front of the ${lens ? 'lens' : 'mirror'}`;
  const [F, C, P] = lens ? (side === 'object' ? ['F₁', '2F₁', 'O'] : ['F₂', '2F₂', 'O']) : ['F', 'C', 'P'];
  if (nearly(d, 2 * f, f)) return `at ${C}`;
  if (nearly(d, f, f)) return `at ${F}`;
  if (d > 2 * f) return `beyond ${C}`;
  if (d > f) return `between ${F} and ${C}`;
  return `between ${F} and ${P}`;
}

function sizeWord(m: number): string {
  const a = Math.abs(m);
  if (!isFinite(a)) return 'highly enlarged';
  if (a < 1e-6) return 'highly diminished, point-sized';
  if (a < 0.97) return 'diminished';
  if (a <= 1.03) return 'same size';
  return 'enlarged';
}

const DEFAULT_RAYS: Record<Device, RayName[]> = {plane_mirror: ['pole', 'parallel'], concave_mirror: ['parallel', 'focus'],
  convex_mirror: ['parallel', 'focus'], convex_lens: ['parallel', 'centre'], concave_lens: ['parallel', 'centre']};
const FALLBACK: RayName[] = ['parallel', 'centre', 'focus', 'pole'];

export function rayDiagramErrors(s: RaySpec): string[] {
  const e: string[] = [];
  if (s.with !== undefined) {
    const w = s.with as {device?: string; focal_length?: number};
    if (!(s.device === 'convex_lens' || s.device === 'concave_lens')) return ['ray_diagram: with (a lens in contact) goes with a convex or concave lens'];
    if (!w || !['convex_lens', 'concave_lens'].includes(w.device ?? '') || !(isNum(w.focal_length) && w.focal_length >= 1 && w.focal_length <= 200))
      return ['ray_diagram: with is {device: convex_lens | concave_lens, focal_length: its size in cm, 1 to 200}'];
    const P = lensPower(s.device, s.focal_length ?? 0) + lensPower(w.device as Device, w.focal_length!);
    if (Math.abs(P) < 0.25) return ['ray_diagram: the two lenses cancel (their powers add to about zero): no image to draw; choose other focal lengths'];
    if (100 / Math.abs(P) > 200) return [`ray_diagram: in contact the pair's focal length is ${fmt(100 / Math.abs(P))} cm, over 200: choose lenses whose powers add to more`];
    const inner = rayDiagramErrors({...s, with: undefined, device: P > 0 ? 'convex_lens' : 'concave_lens', focal_length: 100 / Math.abs(P)});
    return inner.map(x => x.replace('ray_diagram:', 'ray_diagram (the pair in contact):'));
  }
  if (!DEVICES.includes(s.device)) return [`ray_diagram: device is one of ${DEVICES.join(', ')}`];
  const plane = s.device === 'plane_mirror', f = s.focal_length;
  if (plane && f !== undefined) e.push('ray_diagram: a plane mirror has no focal_length; leave it out');
  if (!plane && !(isNum(f) && f >= 1 && f <= 200)) return ['ray_diagram: focal_length is the size of f in cm, 1 to 200 (no sign: the device gives it)'];
  if (!Array.isArray(s.objects) || s.objects.length < 1 || s.objects.length > 6) return [...e, 'ray_diagram: objects is a list of 1 to 6 object distances in cm (or "infinity")'];
  const h = s.object_height;
  if (h !== undefined && !(isNum(h) && h > 0 && h <= (plane ? 1000 : f!))) e.push(`ray_diagram: object_height is in cm, more than 0 and at most ${plane ? '1000' : 'f'}`);
  s.objects.forEach((d, i) => {
    const at = `ray_diagram: objects[${i}]`;
    if (d === 'infinity') {
      if (plane) e.push(`${at}: a plane mirror needs a distance, not infinity`);
      return;
    }
    if (!(isNum(d) && d > 0 && d <= 1000)) { e.push(`${at} is a distance in cm, more than 0 (or "infinity")`); return; }
    if (plane) return;
    if (d > 6 * f!) { e.push(`${at} = ${fmt(d)} cm is more than 6 f (${fmt(6 * f!)} cm) away and squeezes the picture: bring it nearer, or write "infinity"`); return; }
    const img = imageOf(s.device, f!, d);
    if (!img.atInfinity && (Math.abs(img.v) > 7 * f! || Math.abs(img.m) > 5))
      e.push(`${at} = ${fmt(d)} cm is too near F: the image would be ${fmt(Math.abs(img.v))} cm away and ${fmt(Math.abs(img.m))} times as tall, off the picture; keep the object at least ${fmt(0.2 * f!)} cm from F, or put it at F exactly (${fmt(f!)} cm: image at infinity)`);
  });
  if (s.rays !== undefined) {
    if (!Array.isArray(s.rays) || s.rays.length < 1 || s.rays.length > 3 || new Set(s.rays).size !== s.rays.length) e.push('ray_diagram: rays is 1 to 3 different ray names');
    else for (const r of s.rays) {
      if (!RAYS.includes(r)) e.push(`ray_diagram: rays: ${JSON.stringify(r)} is not a ray; use ${RAYS.join(', ')}`);
      else if (r === 'pole' && !isMirror(s.device)) e.push('ray_diagram: rays: a lens has no pole; use centre (the ray through the optical centre)');
    }
  }
  if (s.power && isMirror(s.device)) e.push('ray_diagram: power is for a lens');
  if (s.angles && !plane) e.push('ray_diagram: angles is for a plane mirror (the normal and i = r)');
  if (s.distances && !plane) e.push('ray_diagram: distances is for a plane mirror (object and image equally far from it)');
  if (s.seconds_each !== undefined && !(isNum(s.seconds_each) && s.seconds_each >= 3 && s.seconds_each <= 12)) e.push('ray_diagram: seconds_each is 3 to 12');
  if (s.panel !== undefined && typeof s.panel !== 'boolean') e.push('ray_diagram: panel is true or false');
  if (s.exact !== undefined && typeof s.exact !== 'boolean') e.push('ray_diagram: exact is true or false');
  if (s.image !== undefined && typeof s.image !== 'boolean') e.push('ray_diagram: image is true or false');
  if (s.exact && !(s.device === 'concave_mirror' || s.device === 'convex_mirror')) e.push('ray_diagram: exact is for a concave or convex mirror');
  if (s.exact && !s.objects.every(o => o === 'infinity')) e.push('ray_diagram: exact traces a parallel beam: objects ["infinity"]');
  if (s.aperture !== undefined && !(s.exact && isNum(s.aperture) && s.aperture >= 0.2 && s.aperture <= 0.9)) e.push('ray_diagram: aperture (with exact) is 0.2 to 0.9 of R');
  return e;
}

/** stop: an exact ray that meets the axis there runs on a little past it (real); back: its dashed extension's end. */
type Ray = {name: RayName; from: Vec; hit: Vec; dir: Vec; back?: Vec; stop?: Vec};

const lensPower = (device: Device, f: number) => (device === 'concave_lens' ? -100 : 100) / f;   // dioptres, f in cm

/** Two thin lenses in contact: drawn touching, the rays those of one lens of the combined power P = P1 + P2. */
function lensesInContact(s: RaySpec): Scene {
  const w = s.with!, P1 = lensPower(s.device, s.focal_length!), P2 = lensPower(w.device, w.focal_length), P = P1 + P2;
  const scene = rayDiagram({...s, with: undefined, device: P > 0 ? 'convex_lens' : 'concave_lens', focal_length: 100 / Math.abs(P), power: false});
  const k = (s.height ?? 1080) / 1080, lens = scene.props.find(p => p.id === 'lens') as {points: Vec[]} | undefined;
  if (!lens) return scene;
  const xs = lens.points.map(q => q[0]), ys = lens.points.map(q => q[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, half = (Math.max(...ys) - Math.min(...ys)) / 2;
  const width = Math.max(14 * k, (Math.max(...xs) - Math.min(...xs)) / 2);
  const outline = (device: Device, x: number): Vec[] => {
    const pts: Vec[] = [], thin = 3 * k;
    for (let j = 0; j <= 30; j++) { const y = -half + (2 * half * j) / 30, b = device === 'convex_lens' ? thin + width * (1 - (y / half) ** 2) : thin + width * (y / half) ** 2; pts.push([round(x + b, 2), round(cy + y, 2)]); }
    for (let j = 30; j >= 0; j--) { const y = -half + (2 * half * j) / 30, b = device === 'convex_lens' ? thin + width * (1 - (y / half) ** 2) : thin + width * (y / half) ** 2; pts.push([round(x - b, 2), round(cy + y, 2)]); }
    return pts;
  };
  const gap = (s.device === 'convex_lens' ? width : 3 * k) + (w.device === 'convex_lens' ? width : 3 * k) + 2 * k;
  const props = scene.props.filter(p => p.id !== 'lens' && p.id !== 'device');
  const tag = (v: number) => `${v > 0 ? '+' : '−'}${fmt(Math.abs(v))} D`;
  props.push({id: 'lens1', type: 'polyline', points: outline(s.device, cx - gap / 2), closed: true, style: {stroke: 'cool', width: 4 * k, fill: 'faint', opacity: 0.9}, layer: 3},
    {id: 'lens2', type: 'polyline', points: outline(w.device, cx + gap / 2), closed: true, style: {stroke: 'good', width: 4 * k, fill: 'faint', opacity: 0.9}, layer: 3},
    {id: 'lens1-power', type: 'text', x: round(cx - gap / 2 - 10 * k, 2), y: round(cy + half + 36 * k, 2), text: `P₁ = ${tag(P1)}`, size: 26 * k, align: 'end', weight: 700, style: {fill: 'cool', stroke: 'paper', width: 7 * k}, layer: 6},
    {id: 'lens2-power', type: 'text', x: round(cx + gap / 2 + 10 * k, 2), y: round(cy + half + 36 * k, 2), text: `P₂ = ${tag(P2)}`, size: 26 * k, align: 'start', weight: 700, style: {fill: 'good', stroke: 'paper', width: 7 * k}, layer: 6},
    {id: 'combined', type: 'text', x: round(cx, 2), y: round(cy - half - 30 * k, 2), text: `in contact: P = P₁ + P₂ = ${tag(P)}`, size: 28 * k, align: 'middle', weight: 700, style: {fill: 'accent', stroke: 'paper', width: 7 * k}, layer: 6});
  const facts = [`two lenses in contact, of power ${tag(P1)} (${NAME[s.device]}, f = ${fmt(s.focal_length!)} cm) and ${tag(P2)} (${NAME[w.device]}, f = ${fmt(w.focal_length)} cm), act as one ${P > 0 ? 'convex' : 'concave'} lens of power P = P1 + P2 = ${tag(P)}, focal length ${fmt(100 / Math.abs(P))} cm`,
    ...((scene.meta as {facts: string[]}).facts ?? []).slice(1)];
  return {...scene, props, meta: {...scene.meta, facts, power: round(P, 6)}};
}

export function rayDiagram(s: RaySpec): Scene {
  if (s.with) return lensesInContact(s);
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080;
  const dev = s.device, mirror = isMirror(dev), plane = dev === 'plane_mirror';
  const finite = s.objects.filter(isNum) as number[];
  const f = s.focal_length ?? Math.max(...finite, 1), R = 2 * f;
  const h = s.object_height ?? (plane ? Math.max(...finite) / 3 : f / 3);
  const fc = cartesianF(s);
  // The surface a ray meets at height y: a spherical mirror's arc (concave: centre in front, at x = −R), else x = 0.
  const surface = (y: number) => (dev === 'concave_mirror' ? -R + Math.sqrt(Math.max(0, R * R - y * y))
    : dev === 'convex_mirror' ? R - Math.sqrt(Math.max(0, R * R - y * y)) : 0);
  const reach = mirror && !plane ? (s.exact ? (s.aperture ?? 0.6) : 0.75) * R : Infinity;
  const xC = dev === 'concave_mirror' ? -2 * f : 2 * f, xF = dev === 'convex_mirror' || dev === 'concave_lens' ? f : -f;
  type Position = {d: number; img: Image; rays: Ray[]};
  // Each position's rays, in optical cm (x along the axis, the mirror or lens at 0, y up).
  const positions: Position[] = s.objects.map(o => {
    if (o === 'infinity' && s.exact) {
      // Each ray reflects off the sphere itself: r = d − 2(d·n)n, n the surface normal at the hit (along the radius).
      // It crosses the axis at a distance R/(2 cos θ) from C (θ: the angle of incidence), nearer the mirror the
      // farther out the ray, so the reflected rays do not meet at one point.
      const centre: Vec = [dev === 'concave_mirror' ? -R : R, 0], real = dev === 'concave_mirror';
      const img: Image = {u: -Infinity, v: fc, m: 0, atInfinity: false, real};
      const rays = [-1, -0.72, -0.42, -0.15, 0.15, 0.42, 0.72, 1].map(q => q * reach).map((y): Ray => {
        const hit: Vec = [surface(y), y], n: Vec = [(hit[0] - centre[0]) / R, (hit[1] - centre[1]) / R];
        const dot = n[0], dir: Vec = [1 - 2 * dot * n[0], -2 * dot * n[1]];
        const cross: Vec = [hit[0] - hit[1] * dir[0] / dir[1], 0];       // where the reflected line meets the axis
        return {name: 'parallel', from: [NaN, y], hit, dir, ...(real ? {stop: cross} : {back: cross})};
      });
      return {d: Infinity, img, rays};
    }
    if (o === 'infinity') {
      const focus: Vec = [fc, 0], img: Image = {u: -Infinity, v: fc, m: 0, atInfinity: false, real: fc < 0 === mirror};
      const rays = [-0.55, -0.25, 0.25, 0.55].map(q => q * Math.min(reach, 1.2 * f)).map((y): Ray => {
        const hit: Vec = [surface(y), y];
        const towards = (img.real ? [focus[0] - hit[0], focus[1] - hit[1]] : [hit[0] - focus[0], hit[1] - focus[1]]) as Vec;
        return {name: 'parallel', from: [NaN, y], hit, dir: towards, ...(img.real ? {} : {back: focus})};
      });
      return {d: Infinity, img, rays};
    }
    const d = o, img = imageOf(dev, f, d), top: Vec = [-d, h];
    if (plane) {
      // Two slanting rays; 'parallel' adds one along the normal, which comes straight back.
      const rays = [h - 0.45 * d, h + 0.45 * d].map((y): Ray => ({name: 'pole', from: top, hit: [0, y], dir: [-d, y - h], back: [d, h]}));
      if (s.rays?.includes('parallel')) rays.push({name: 'parallel', from: top, hit: [0, h], dir: [-1, 0], back: [d, h]});
      return {d, img, rays};
    }
    const heights: Record<RayName, number | null> = {
      parallel: h,
      centre: mirror ? (nearly(d, -xC, f) ? null : h * xC / (d + xC)) : 0,
      focus: nearly(d, -xF, f) ? null : h * xF / (d + xF),
      pole: mirror ? 0 : null,
    };
    const want = s.rays ?? DEFAULT_RAYS[dev], n = want.length;
    const usable = (r: RayName) => heights[r] !== null && Math.abs(heights[r]!) <= Math.min(reach, 4 * f);
    const chosen = want.filter(usable);
    for (const r of FALLBACK) if (chosen.length < n && !chosen.includes(r) && usable(r)) chosen.push(r);
    // At infinity every ray leaves parallel to the one through the pole (mirror) or the optical centre (lens).
    const parallelDir: Vec = mirror ? [-d, -h] : [d, -h];
    const I: Vec = img.atInfinity ? [NaN, NaN] : [img.v, img.m * h];
    const rays = chosen.map((name): Ray => {
      const y = heights[name]!, hit: Vec = [surface(y), y];
      if (img.atInfinity) return {name, from: top, hit, dir: parallelDir};
      const dir: Vec = img.real ? [I[0] - hit[0], I[1] - hit[1]] : [hit[0] - I[0], hit[1] - I[1]];
      return {name, from: top, hit, dir, ...(img.real ? {} : {back: I})};
    });
    return {d, img, rays};
  });

  // The window in optical cm: every object, image and marked point, with room around them.
  const xs = [0, ...finite.map(d => -d)];
  if (!plane) xs.push(xF, mirror ? xC : -2 * f, ...(mirror ? [] : [f, 2 * f]));
  for (const p of positions) if (isFinite(p.img.v) && isFinite(p.d)) xs.push(p.img.v);
  else if (p.d === Infinity) xs.push(p.img.v);
  if (s.objects.includes('infinity')) xs.push(-2.2 * f);
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  const span = x1 - x0;
  x0 -= 0.12 * span; x1 += 0.12 * span;
  if (mirror) x1 = Math.max(x1, 0.18 * span);
  const ys = [h, ...positions.flatMap(p => [isFinite(p.img.m) ? Math.abs(p.img.m * h) : 0, ...p.rays.map(r => Math.abs(r.hit[1]))])];
  // Exact rays are drawn to one scale whatever the aperture (the sphere's 0.9 R), so a small aperture looks small
  // beside a large one (C2: both were zoomed to fill their halves and looked alike).
  if (s.exact) ys.push(0.9 * R / 1.22);
  // Marked angles need the reflected ray in view for a while above the point of incidence.
  const ymax = (plane && s.angles ? 1.55 : 1.22) * Math.max(...ys);
  // Without the panel the drawing takes the whole width under its title (a part of a side-by-side compound).
  const panel = s.panel !== false, left = 0.04 * W, right = panel ? 0.62 * W : 0.96 * W, top = panel ? 0.13 * H : (s.title ? 0.24 : 0.13) * H, bottom = 0.93 * H;
  // Heights may be stretched up to 2.5 times, as book figures are, so a small object still reads; straight rays stay
  // straight and still meet at the image. A plane mirror stays to scale: its angles are shown.
  const unit = Math.min((right - left) / (x1 - x0), (bottom - top) / (2 * ymax));
  const unitY = plane ? unit : Math.min(2.5 * unit, (bottom - top) / (2 * ymax));
  const ox = left + ((right - left) - unit * (x1 - x0)) / 2 - unit * x0, oy = (top + bottom) / 2;
  const P = ([x, y]: Vec): Vec => [round(ox + unit * x, 2), round(oy - unitY * y, 2)];
  const bx0 = (left - ox) / unit, bx1 = (right - ox) / unit, by = (oy - top) / unitY;
  /** Where a ray from p going along dir leaves the drawing. */
  const exit = (p: Vec, dir: Vec): Vec => {
    let t = Infinity;
    if (dir[0] > 1e-12) t = Math.min(t, (bx1 - p[0]) / dir[0]);
    if (dir[0] < -1e-12) t = Math.min(t, (bx0 - p[0]) / dir[0]);
    if (dir[1] > 1e-12) t = Math.min(t, (by - p[1]) / dir[1]);
    if (dir[1] < -1e-12) t = Math.min(t, (-by - p[1]) / dir[1]);
    return [p[0] + dir[0] * t, p[1] + dir[1] * t];
  };

  // The device and its axis, drawn once.
  const aperture = s.exact ? reach : Math.min(Math.max((plane ? 1.45 : 1.3) * Math.max(...positions.flatMap(p => p.rays.map(r => Math.abs(r.hit[1])))), 1.4 * h), mirror && !plane ? reach : 0.98 * by);
  const props: Prop[] = [{id: 'axis', type: 'line', ...xy(P([bx0, 0]), P([bx1, 0])), style: {stroke: 'muted', width: 2.5 * k, dash: [16 * k, 10 * k]}}];
  const arc = Array.from({length: 41}, (_, i) => -aperture + (2 * aperture * i) / 40);
  if (mirror) {
    props.push({id: 'mirror', type: 'polyline', points: arc.map(y => P([surface(y), y])), style: {stroke: 'cool', width: 7 * k}, layer: 3});
    arc.filter((_, i) => i % 3 === 1).forEach((y, i) => {
      const [x, Y] = P([surface(y), y]);
      props.push({id: `hatch${i}`, type: 'line', x1: x + 4 * k, y1: Y, x2: x + 20 * k, y2: Y + 12 * k, style: {stroke: 'muted', width: 2.5 * k}, layer: 3});
    });
  } else {
    const w = Math.max(0.07 * aperture * unitY / unit, 10 / unit), thin = 0.012 * aperture;
    const edge = (y: number, side: 1 | -1) => side * (dev === 'convex_lens' ? thin + w * (1 - (y / aperture) ** 2) : thin + w * (y / aperture) ** 2);
    const outline = [...arc.map(y => P([edge(y, 1), y])), ...arc.slice().reverse().map(y => P([edge(y, -1), y]))];
    props.push({id: 'lens', type: 'polyline', points: outline, closed: true, style: {stroke: 'cool', width: 4 * k, fill: 'faint', opacity: 0.9}, layer: 3});
    // Without the panel a lens's power goes beside it, so a side-by-side picture about the sign of power shows it.
    if (s.power && s.panel === false) props.push({id: 'lens-power', type: 'text', x: P([0, -aperture])[0], y: round(P([0, -aperture])[1] + 40 * k, 2),
      text: `P = ${signed(100 / cartesianF(s))} D (f = ${signed(cartesianF(s))} cm)`, size: 28 * k, align: 'middle', weight: 700, style: {fill: 'accent', stroke: 'paper', width: 7 * k}, layer: 6});
  }
  const marks: [string, number][] = plane ? [] : mirror ? [['P', 0], ['F', xF], ['C', xC]]
    : [['O', 0], ['F₁', -f], ['F₂', f], ['2F₁', -2 * f], ['2F₂', 2 * f]];
  for (const [label, x] of marks) {
    if (x < bx0 || x > bx1) continue;
    const [X, Y] = P([x, 0]);
    if (label !== 'P' && label !== 'O') props.push({id: `mark-${label}`, type: 'circle', x: X, y: Y, r: 6 * k, style: {fill: 'ink'}, layer: 4});
    props.push({id: `label-${label}`, type: 'text', x: X + (label === 'P' || label === 'O' ? 22 * k : 0), y: Y + 40 * k, text: label, size: 30 * k, align: 'middle', weight: 700, style: {fill: 'ink'}, layer: 4});
  }

  // Each position in turn: the object, its incident rays drawing on, then the reflected or refracted rays, the image.
  // Named points for marks: the axis's points, and each position's object and image tops (object, image; object2 ...).
  const anchors: Record<string, Vec> = {};
  for (const [label, x] of marks) if (x >= bx0 && x <= bx1) anchors[label.replace('₁', '1').replace('₂', '2')] = P([x, 0]);
  anchors.edge_top = P([surface(aperture), aperture]); anchors.edge_bottom = P([surface(-aperture), -aperture]);   // the aperture's ends
  positions.forEach((p, i) => {
    const n = i ? String(i + 1) : '';
    if (isFinite(p.d)) anchors[`object${n}`] = P([-p.d, h]);
    if (!p.img.atInfinity && isFinite(p.img.v)) anchors[`image${n}`] = P([p.img.v, isFinite(p.d) ? p.img.m * h : 0]);
    if (p.rays[0]) anchors[`incidence${n}`] = P(p.rays[plane && p.rays[1] ? 1 : 0].hit);
  });
  const E = s.seconds_each ?? 6, T0 = 0.8, facts: string[] = [];
  const px = 0.66 * W, pw = W - px - 40 * k;
  let row = 0.14 * H;
  // Below a film's header strip (its top 11%), like the panel's own title.
  if (s.title && !panel) props.push({id: 'title', type: 'text', x: left, y: 0.16 * H, text: s.title, size: 44 * k, weight: 700, width: 0.92 * W});
  if (s.title && panel) {
    props.push({id: 'title', type: 'text', x: px, y: row, text: s.title, size: 44 * k, weight: 700, width: pw});
    row += wrapText(s.title, 44 * k, pw).length * 1.25 * 44 * k + 18 * k;
  }
  if (panel) props.push({id: 'device', type: 'text', x: px, y: row, text: plane ? 'Plane mirror' : `${NAME[dev][0].toUpperCase()}${NAME[dev].slice(1)}, f = ${fmt(f)} cm`,
    size: 30 * k, style: {fill: 'muted'}, width: pw});
  row += 1.6 * 30 * k;
  const draw = (t0: number, t1: number) => ({draw: 0, keys: {draw: [[t0, 0], [t1, 1, 'linear']] as Key[]}});
  positions.forEach((p, i) => {
    const s0 = T0 + i * E, last = i === positions.length - 1, show: [number, number] = [s0, last ? 1e9 : s0 + E];
    const tag = `p${i}`, img = p.img;
    let angleLine = '';
    if (isFinite(p.d)) {
      const [X, Y] = P([-p.d, 0]), [, Yt] = P([-p.d, h]);
      props.push({id: `${tag}-object`, type: 'arrow', x1: X, y1: Y, x2: X, y2: Yt, head: 22 * k, show, fade: 0.3, style: {stroke: 'accent', width: 7 * k}, layer: 5});
    }
    p.rays.forEach((r, j) => {
      const id = `${tag}-ray${j}`, from = isNaN(r.from[0]) ? [bx0, r.hit[1]] as Vec : r.from;
      // A parallel beam meeting at F stops a little past it, as in the book, rather than crossing the whole picture.
      const meet = !isFinite(p.d) && img.real ? Math.hypot((r.stop?.[0] ?? img.v) - r.hit[0], r.hit[1]) / Math.hypot(r.dir[0], r.dir[1]) * 1.45 : Infinity;
      const edge = exit(r.hit, r.dir), far = Math.hypot(edge[0] - r.hit[0], edge[1] - r.hit[1]) / Math.hypot(r.dir[0], r.dir[1]);
      const out: Vec = meet < far ? [r.hit[0] + r.dir[0] * meet, r.hit[1] + r.dir[1] * meet] : edge;
      props.push({id: `${id}-in`, type: 'line', ...xy(P(from), P(r.hit)), ...draw(s0 + 0.5 + 0.25 * j, s0 + 1.7 + 0.25 * j), show, fade: 0.3, style: {stroke: 'ink', width: 4 * k}, layer: 2},
        {id: `${id}-out`, type: 'line', ...xy(P(r.hit), P(out)), ...draw(s0 + 1.9 + 0.25 * j, s0 + 3.1 + 0.25 * j), show, fade: 0.3, style: {stroke: 'ink', width: 4 * k}, layer: 2},
        head(`${id}-hin`, P(from), P(r.hit), [s0 + 1.7 + 0.25 * j, show[1]], k));
      // A ray along the normal comes straight back over itself: one arrowhead each way would cross, so it gets none back.
      if (!(plane && r.name === 'parallel')) props.push(head(`${id}-hout`, P(r.hit), P(out), [s0 + 3.1 + 0.25 * j, show[1]], k));
      // Without an image, a ray rule's dashed lines run to where they meet the axis (F or C), as the book draws them.
      const axisAt = (pt: Vec, d: Vec): Vec | undefined => (Math.abs(d[1]) > 1e-9 ? [pt[0] - pt[1] * d[0] / d[1], 0] : undefined);
      const back = s.image === false && r.back && !s.exact ? axisAt(r.hit, r.dir) : r.back;   // parallel out: no dashed line
      // A ray aimed at F or C behind a convex mirror or a concave lens: its aim drawn on, dashed, past the surface.
      if ((dev === 'convex_mirror' || dev === 'concave_lens') && (r.name === 'focus' || r.name === 'centre') && isFinite(p.d) && !(dev === 'concave_lens' && r.name === 'centre')) {
        const aim = axisAt(r.from, [r.hit[0] - r.from[0], r.hit[1] - r.from[1]]);
        if (aim && aim[0] > r.hit[0]) props.push({id: `${id}-aim`, type: 'line', ...xy(P(r.hit), P(aim)), ...draw(s0 + 1.7 + 0.25 * j, s0 + 2.2 + 0.25 * j), show, fade: 0.3,
          style: {stroke: 'muted', width: 3 * k, dash: [10 * k, 8 * k]}, layer: 1});
      }
      if (back) props.push({id: `${id}-back`, type: 'line', ...xy(P(r.hit), P(back)), ...draw(s0 + 3.3, s0 + 3.9), show, fade: 0.3,
        style: {stroke: 'muted', width: 3 * k, dash: [10 * k, 8 * k]}, layer: 1});
    });
    if (plane && s.angles && p.rays[1]) {
      // The normal where the upper ray meets the mirror (room above the axis), the two angles drawn as arcs and named i and r (letters, so
      // they stay in a picture without numbers); their size is a line of the panel.
      const r = p.rays[1], hit = P(r.hit), i0 = deg(Math.atan2(Math.abs(r.hit[1] - h), p.d));
      const toObject = Math.atan2(P(top0(p.d, h))[1] - hit[1], P(top0(p.d, h))[0] - hit[0]), out = exit(r.hit, r.dir);
      const toOut = Math.atan2(P(out)[1] - hit[1], P(out)[0] - hit[0]);
      props.push({id: `${tag}-normal`, type: 'line', x1: hit[0], y1: hit[1], x2: hit[0] - 0.3 * (right - left), y2: hit[1], show: [s0 + 1.6, show[1]], fade: 0.3,
        style: {stroke: 'muted', width: 2.5 * k, dash: [8 * k, 8 * k]}, layer: 1},
        {id: `${tag}-normal-label`, type: 'text', x: hit[0] - 0.3 * (right - left) - 10 * k, y: hit[1] + 9 * k, text: 'normal', size: 24 * k, align: 'end', show: [s0 + 1.6, show[1]], fade: 0.3, style: {fill: 'muted'}, layer: 1});
      for (const [key, angle, t, fill] of [['i', toObject, s0 + 1.8, 'accent'], ['r', toOut, s0 + 3.2, 'good']] as const) {
        const a0 = Math.PI * Math.sign(angle || 1), R0 = 110 * k;
        const pts = Array.from({length: 13}, (_, q) => { const a = a0 + (angle - a0) * q / 12; return [round(hit[0] + R0 * Math.cos(a), 2), round(hit[1] + R0 * Math.sin(a), 2)] as Vec; });
        const mid = (a0 + angle) / 2;
        props.push({id: `${tag}-arc-${key}`, type: 'polyline', points: pts, show: [t, show[1]], fade: 0.3, style: {stroke: fill, width: 3.5 * k}, layer: 6},
          {id: `${tag}-angle-${key}`, type: 'text', x: round(hit[0] + 1.55 * R0 * Math.cos(mid), 2), y: round(hit[1] + 1.55 * R0 * Math.sin(mid) + 11 * k, 2), text: key,
            size: 34 * k, align: 'middle', weight: 700, show: [t, show[1]], fade: 0.3, style: {fill}, layer: 6});
      }
      angleLine = `∠i = ∠r = ${fmt(i0, 1)}°`;
      facts.push(`the angle of incidence and the angle of reflection are both ${fmt(i0, 1)}°`);
    }
    if (plane && s.distances) {
      // Equal distances: a measuring line from the object to the mirror and one from the mirror to the image, each with
      // the same tick marks (equal at a glance, numbers or not), and the distance written beside each.
      const yy = -0.42 * by, [Xo, Y] = P([-p.d, yy]), [Xm] = P([0, yy]), [Xi] = P([p.d, yy]);
      const ticks = (x: number, id: string) => [-1, 1].map(q => ({id: `${id}${q}`, type: 'line', x1: x + q * 6 * k - 5 * k, y1: Y - 12 * k, x2: x + q * 6 * k + 5 * k, y2: Y + 12 * k,
        show: [s0 + 3.6, show[1]], fade: 0.3, style: {stroke: 'accent', width: 3 * k}, layer: 6}) as Prop);
      props.push({id: `${tag}-dist-o`, type: 'line', x1: Xo, y1: Y, x2: Xm, y2: Y, ...draw(s0 + 3.6, s0 + 4.2), show, fade: 0.3, style: {stroke: 'accent', width: 3 * k}, layer: 6},
        {id: `${tag}-dist-i`, type: 'line', x1: Xm, y1: Y, x2: Xi, y2: Y, ...draw(s0 + 4.2, s0 + 4.8), show, fade: 0.3, style: {stroke: 'accent', width: 3 * k}, layer: 6},
        ...ticks((Xo + Xm) / 2, `${tag}-tick-o`), ...ticks((Xm + Xi) / 2, `${tag}-tick-i`),
        {id: `${tag}-dist-o-label`, type: 'text', x: (Xo + Xm) / 2, y: Y + 40 * k, text: `${fmt(p.d)} cm`, size: 28 * k, align: 'middle', show: [s0 + 4.2, show[1]], fade: 0.3, style: {fill: 'accent'}, layer: 6},
        {id: `${tag}-dist-i-label`, type: 'text', x: (Xm + Xi) / 2, y: Y + 40 * k, text: `${fmt(p.d)} cm`, size: 28 * k, align: 'middle', show: [s0 + 4.8, show[1]], fade: 0.3, style: {fill: 'accent'}, layer: 6});
    }
    const shownImage: [number, number] = [s0 + 3.3, show[1]];
    if (!img.atInfinity && isFinite(img.v) && !s.exact && s.image !== false) {      // exact rays meet at no single point
      const height = isFinite(p.d) ? img.m * h : 0, [X, Y] = P([img.v, 0]), [, Yt] = P([img.v, height]);
      if (Math.abs(height) * unitY > 6 * k) props.push({id: `${tag}-image`, type: 'arrow', x1: X, y1: Y, x2: X, y2: Yt, head: 22 * k, show: shownImage, fade: 0.3,
        style: {stroke: img.real ? 'good' : 'cool', width: 7 * k, ...(img.real ? {} : {dash: [14 * k, 8 * k]})}, layer: 5});
      else props.push({id: `${tag}-image`, type: 'circle', x: X, y: Y, r: 11 * k, show: shownImage, fade: 0.3, style: {fill: img.real ? 'good' : 'cool'}, layer: 5});
    }
    // The panel: where the object is, where the image is and what it is like, then the numbers.
    const real = img.real, size = isFinite(p.d) ? sizeWord(img.m) : sizeWord(0);
    const nature = plane ? 'virtual and erect' : real ? 'real and inverted' : 'virtual and erect';
    const where = img.atInfinity ? 'at infinity' : zone(dev, f, Math.abs(img.v), 'image', real);
    const lines: [string, string, number][] = [[`Object: ${zone(dev, f, p.d, 'object')}`, 'accent', s0 + 0.2],
      [`Image: ${where}`, real ? 'good' : 'cool', s0 + 3.4], [`${nature[0].toUpperCase()}${nature.slice(1)}; ${size}`, real ? 'good' : 'cool', s0 + 3.6]];
    if (s.image === false) lines.splice(1, 2);                // a ray rule: no image to describe
    if (s.exact) {
      // Where the edge and the central rays cross the axis, measured from P (dashed back behind a convex mirror).
      const crossings = p.rays.map(r => Math.abs((r.stop ?? r.back)![0]));
      const edge = Math.min(...crossings), centre = Math.max(...crossings);
      lines.splice(0, lines.length, ['Object: at infinity (a wide parallel beam)', 'accent', s0 + 0.2],
        [`Edge rays ${real ? 'cross the axis' : 'seem to come from a point'} nearer the mirror than central rays`, real ? 'good' : 'cool', s0 + 3.4],
        ['No single focus: the image blurs (spherical aberration); a small aperture keeps the rays near F', real ? 'good' : 'cool', s0 + 3.8]);
      anchors[`focus_edge${i ? i + 1 : ''}`] = P([(real ? -1 : 1) * edge, 0]); anchors[`focus_centre${i ? i + 1 : ''}`] = P([(real ? -1 : 1) * centre, 0]);
      facts.push(`traced exactly off the sphere (R = ${fmt(R)} cm), a beam out to ${fmt(reach)} cm from the axis: the edge rays ${real ? 'cross the axis' : 'seem to diverge from'} ${fmt(edge, 1)} cm from P and the central ones ${fmt(centre, 1)} cm, against the small-aperture focus at ${fmt(f)} cm`);
    }
    if (plane) lines.push([`${fmt(p.d)} cm in front, image ${fmt(p.d)} cm behind`, 'ink', s0 + 3.8]);
    if (angleLine) lines.push([angleLine, 'accent', s0 + 3.3]);
    if (s.formula && isFinite(p.d)) {
      const u = img.u;
      if (plane) lines.push([`u = ${signed(u)} cm, v = ${signed(img.v)} cm, m = +1`, 'ink', s0 + 3.9]);
      else if (img.atInfinity) lines.push([`u = ${signed(u)} cm, f = ${signed(fc)} cm: 1/v = 0, so v is infinite`, 'ink', s0 + 3.9]);
      else {
        lines.push([`u = ${signed(u)} cm, f = ${signed(fc)} cm`, 'ink', s0 + 3.9],
          [mirror ? `1/v = 1/f − 1/u, so v = ${signed(img.v)} cm` : `1/v = 1/f + 1/u, so v = ${signed(img.v)} cm`, 'ink', s0 + 4.2],
          [mirror ? `m = −v/u = ${signed(img.m)}` : `m = v/u = ${signed(img.m)}`, 'ink', s0 + 4.5]);
      }
    }
    if (s.power && !mirror) lines.push([`P = 1/f = 1/(${signed(fc / 100, 3)} m) = ${signed(100 / fc)} D`, 'accent', s0 + 4.8]);
    let y = row;
    if (panel) lines.forEach(([text, fill, t], j) => {
      props.push({id: `${tag}-line${j}`, type: 'text', x: px, y, text, size: 30 * k, width: pw, show: [t, show[1]], fade: 0.3, style: {fill}, weight: j < 3 ? 700 : 400});
      y += wrapText(text, 30 * k, pw).length * 1.3 * 30 * k + 10 * k;
    });
    const oz = zone(dev, f, p.d, 'object'), plain = (z: string) => /^in front of the|^behind the mirror|same side/.test(z);
    const obj = isFinite(p.d) ? `object ${fmt(p.d)} cm from the ${mirror ? 'mirror' : 'lens'}${plain(oz) ? '' : ` (${oz})`}` : 'object at infinity (a parallel beam)';
    const imgText = img.atInfinity ? 'image at infinity' : `image ${fmt(Math.abs(img.v))} cm ${mirror ? (img.v < 0 ? 'in front of' : 'behind') + ' the mirror' : (img.v > 0 ? 'beyond the lens' : 'on the object\'s side of the lens')}${plain(where) ? '' : ` (${where})`}`;
    if (!s.exact) facts.push(`${obj}: ${imgText}, ${nature}, ${size}${isFinite(p.d) && !img.atInfinity ? `; v = ${signed(img.v)} cm, m = ${signed(img.m)}` : ''}`);
  });
  if (!plane) facts.unshift(`${NAME[dev]} of focal length ${fmt(f)} cm (f = ${signed(fc)} cm in the New Cartesian sign convention)${mirror ? `; radius of curvature ${fmt(R)} cm` : ''}`);
  if (s.power && !mirror) facts.push(`power P = 1/f = ${signed(100 / fc)} dioptre`);
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: T0 + positions.length * E + 1.5, theme: s.theme ?? 'dark', props, actors: [],
    meta: {verb: 'ray_diagram', facts, anchors, labelled: marks.filter(([, x]) => x >= bx0 && x <= bx1).map(([l]) => l.replace('₁', '1').replace('₂', '2')), units: {ox, oy, sx: unit, sy: unitY, name: `cm: x along the axis (the ${mirror ? 'mirror' : 'lens'} at 0, the object's side negative), y above it`},
      images: positions.map(p => ({d: p.d, v: p.img.v, m: p.img.m, real: p.img.real}))}};
}

const top0 = (d: number, h: number): Vec => [-d, h];

function xy(a: Vec, b: Vec) { return {x1: a[0], y1: a[1], x2: b[0], y2: b[1]}; }

/** A small arrowhead partway along a ray, showing which way the light goes. */
function head(id: string, a: Vec, b: Vec, show: [number, number], k: number): Prop {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, u: Vec = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], at = Math.min(0.5, 220 * k / L);
  const m: Vec = [a[0] + (b[0] - a[0]) * at, a[1] + (b[1] - a[1]) * at];
  return {id, type: 'arrow', x1: round(m[0] - u[0] * 10 * k, 2), y1: round(m[1] - u[1] * 10 * k, 2), x2: round(m[0] + u[0] * 10 * k, 2), y2: round(m[1] + u[1] * 10 * k, 2),
    head: 22 * k, show, fade: 0.2, style: {stroke: 'ink', width: 4 * k}, layer: 2};
}

// ---- refraction ----------------------------------------------------------------------------------------------------

/** Absolute refractive indices, NCERT Class 10 Table 9.3. */
export const MEDIA: Record<string, number> = {air: 1.0003, ice: 1.31, water: 1.33, alcohol: 1.36, kerosene: 1.44,
  'fused quartz': 1.46, 'turpentine oil': 1.47, benzene: 1.5, 'crown glass': 1.52, glass: 1.5, 'canada balsam': 1.53,
  'rock salt': 1.54, 'carbon disulphide': 1.63, 'dense flint glass': 1.65, ruby: 1.71, sapphire: 1.77, diamond: 2.42};
/** Other names a narration uses: the book's turpentine is its turpentine oil; plastic is not in the book's table, so
 * it takes a typical value (acrylic) and its facts say so. */
const ALIASES: Record<string, string> = {turpentine: 'turpentine oil'};
const TYPICAL: Record<string, number> = {plastic: 1.49, perspex: 1.49, acrylic: 1.49};
/** Exact by definition: vacuum's refractive index is 1 (it was once mapped to air's 1.0003, so a film said n of air
 * relative to vacuum is 1). */
const EXACT: Record<string, number> = {vacuum: 1};

export type RefractionSpec = Common & {
  verb: 'refraction';
  /** The medium the light starts in and the one it enters: a name from the book's table or a refractive index. */
  from: string | number;
  /** One medium, or 2 to 6 to compare: the same ray entering each, every refracted ray drawn from one point. */
  to: string | number | (string | number)[];
  /** Successive wavefronts across a beam: closer together in the slower medium, turning at the surface. */
  wavefronts?: boolean;
  /** Angles of incidence in degrees (0 to 85), shown one after another: sin i ÷ sin r is listed for each. */
  angles?: number[];
  /** Apparent depth: a point object (a coin) this many cm below the surface, in `from` (the denser medium, water),
   * seen from `to` above it (air): rays leave the surface bending away from the normal, and their dashed lines back
   * meet nearer the surface, where the object seems to be. angles: the rays' angles in `from` (default 8 and 16). */
  object_depth?: number; object?: string;
  /** A parallel-sided slab of `to`, this many cm thick, with `from` on both sides: the emergent ray and the lateral shift. */
  slab?: number;
  /** Show the speed of light in each medium, v = c/n. */
  speeds?: boolean;
  seconds_each?: number;
  /** false: no side panel; the drawing fills the frame, the title above it. */
  panel?: boolean;
};

const C_LIGHT = 3e8;
const canon = (m: string) => { const k = m.toLowerCase().trim(); return ALIASES[k] ?? k; };
const known = (m: unknown) => typeof m === 'string' && (canon(m) in MEDIA || canon(m) in TYPICAL || canon(m) in EXACT);
const indexOf = (m: string | number | (string | number)[]): number => (Array.isArray(m) ? indexOf(m[0]) : typeof m === 'number' ? m : MEDIA[canon(m)] ?? EXACT[canon(m)] ?? TYPICAL[canon(m)]);
const mediumName = (m: string | number | (string | number)[]): string => (Array.isArray(m) ? mediumName(m[0]) : typeof m === 'number' ? `n = ${fmt(m, 4)}` : m.toLowerCase().trim());

export function refractionErrors(s: RefractionSpec): string[] {
  const e: string[] = [];
  const media = Array.isArray(s.to) ? s.to : [s.to];
  if (Array.isArray(s.to) && (s.to.length < 2 || s.to.length > 6)) e.push('refraction: to as a list compares 2 to 6 media');
  for (const [key, m] of [['from', s.from], ...media.map(x => ['to', x])] as [string, unknown][]) {
    if (typeof m === 'number') { if (!(isNum(m) && m >= 1 && m <= 3)) e.push(`refraction: ${key} as a refractive index is 1 to 3`); }
    else if (!known(m)) e.push(`refraction: ${key} ${JSON.stringify(m)} is a refractive index or one of ${[...Object.keys(MEDIA), ...Object.keys(EXACT), ...Object.keys(ALIASES), ...Object.keys(TYPICAL)].join(', ')}`);
  }
  if (Array.isArray(s.to) && (s.slab !== undefined || s.object_depth !== undefined || s.wavefronts)) e.push('refraction: comparing media (to as a list) goes with angles only: one ray, no slab, depth or wavefronts');
  if (Array.isArray(s.to) && Array.isArray(s.angles) && s.angles.length !== 1) e.push('refraction: comparing media takes one angle of incidence');
  if (s.wavefronts !== undefined && typeof s.wavefronts !== 'boolean') e.push('refraction: wavefronts is true or false');
  if (s.wavefronts && (s.slab !== undefined || s.object_depth !== undefined)) e.push('refraction: wavefronts go with a single surface (no slab or object_depth)');
  if (s.object_depth !== undefined) {
    if (!(isNum(s.object_depth) && s.object_depth > 0 && s.object_depth <= 500)) e.push('refraction: object_depth is the depth below the surface in cm (up to 500)');
    if (s.slab !== undefined) e.push('refraction: object_depth and slab do not go together');
    if (s.object !== undefined && (typeof s.object !== 'string' || s.object.length > 20)) e.push('refraction: object is a short name (20 characters), such as coin');
    if (s.angles !== undefined && (!Array.isArray(s.angles) || s.angles.length < 1 || s.angles.length > 3 || !s.angles.every(a => isNum(a) && a > 0 && a <= 40)))
      e.push('refraction: with object_depth, angles is 1 to 3 small angles (1 to 40 degrees) of the rays from the object');
  } else if (!Array.isArray(s.angles) || s.angles.length < 1 || s.angles.length > 5 || !s.angles.every(a => isNum(a) && a >= 0 && a <= 85))
    e.push('refraction: angles is a list of 1 to 5 angles of incidence, 0 to 85 degrees');
  if (s.slab !== undefined && !(isNum(s.slab) && s.slab >= 0.5 && s.slab <= 50)) e.push('refraction: slab is its thickness in cm, 0.5 to 50');
  if (s.seconds_each !== undefined && !(isNum(s.seconds_each) && s.seconds_each >= 3 && s.seconds_each <= 12)) e.push('refraction: seconds_each is 3 to 12');
  if (s.panel !== undefined && typeof s.panel !== 'boolean') e.push('refraction: panel is true or false');
  if (e.length) return e;
  if (s.slab !== undefined && indexOf(s.to) < indexOf(s.from)) e.push('refraction: a slab is of the optically denser medium: make `to` the one with the larger refractive index');
  if (s.object_depth !== undefined && !(indexOf(s.from) > indexOf(s.to))) e.push('refraction: with object_depth the object is in the denser medium: from (water, glass) has the larger refractive index, to (air) the smaller');
  if (s.object_depth !== undefined && (s.angles ?? [16]).some(a => indexOf(s.from) * Math.sin(rad(a)) / indexOf(s.to) >= 1))
    e.push('refraction: a ray from the object is past the critical angle and would not leave: use smaller angles');
  return e;
}

export function refraction(s: RefractionSpec): Scene {
  if (s.object_depth !== undefined) return apparentDepth(s);
  if (Array.isArray(s.to)) return compareMedia(s);
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080;
  const n1 = indexOf(s.from), n2v = indexOf(s.to), slab = s.slab;
  const panel = s.panel !== false, left = 0.04 * W, right = panel ? 0.62 * W : 0.96 * W, top = panel ? 0.12 * H : (s.title ? 0.23 : 0.13) * H, bottom = 0.94 * H;
  const y1 = slab ? 0.4 * H : 0.5 * H, thick = slab ? 0.26 * H : 0, y2 = y1 + thick;
  const hx = 0.36 * W;                                          // where the ray meets the (first) surface
  const name1 = mediumName(s.from), name2 = mediumName(s.to), denser = n2v > n1;
  const props: Prop[] = [
    {id: 'medium1', type: 'rect', x: left, y: top, w: right - left, h: y1 - top, style: {fill: 'paper', stroke: 'faint', width: 2 * k}},
    {id: 'medium2', type: 'rect', x: left, y: y1, w: right - left, h: (slab ? y2 : bottom) - y1, style: {fill: 'cool', opacity: 0.16, stroke: 'cool', width: 3 * k}},
    // The media's names and their indices are separate texts: a picture without numbers still says which is which.
    {id: 'name1', type: 'text', x: left + 18 * k, y: top + 40 * k, text: name1, size: 28 * k, weight: 700, style: {fill: 'muted'}},
    {id: 'name1-n', type: 'text', x: left + 18 * k, y: top + 76 * k, text: `n = ${fmt(n1, 4)}`, size: 26 * k, style: {fill: 'muted'}},
    {id: 'name2', type: 'text', x: left + 18 * k, y: y1 + 42 * k, text: name2, size: 28 * k, weight: 700, style: {fill: 'cool'}},
    {id: 'name2-n', type: 'text', x: left + 18 * k, y: y1 + 78 * k, text: `n = ${fmt(n2v, 4)}`, size: 26 * k, style: {fill: 'cool'}},
  ];
  if (slab) props.push({id: 'name3', type: 'text', x: left + 18 * k, y: y2 + 42 * k, text: name1, size: 28 * k, style: {fill: 'muted'}},
    {id: 'thickness', type: 'text', x: right - 18 * k, y: y1 + 42 * k, text: `${fmt(slab)} cm thick`, size: 26 * k, align: 'end', style: {fill: 'muted'}});
  const E = s.seconds_each ?? 6, T0 = 0.8, facts: string[] = [];
  const px = 0.66 * W, pw = W - px - 40 * k;
  let row = 0.14 * H;
  if (s.title && !panel) props.push({id: 'title', type: 'text', x: left, y: 0.16 * H, text: s.title, size: 44 * k, weight: 700, width: 0.92 * W});
  if (s.title && panel) {
    props.push({id: 'title', type: 'text', x: px, y: row, text: s.title, size: 44 * k, weight: 700, width: pw});
    row += wrapText(s.title, 44 * k, pw).length * 1.25 * 44 * k + 18 * k;
  }
  if (panel) props.push({id: 'rule', type: 'text', x: px, y: row, width: pw, size: 30 * k, style: {fill: 'muted'},
    text: `From ${name1} into ${name2}: ${denser ? 'into a denser medium, the ray bends towards the normal' : n2v < n1 ? 'into a rarer medium, the ray bends away from the normal' : 'the same index: no bending'}`});
  row += wrapText(`From ${name1} into ${name2}: into a denser medium, the ray bends towards the normal`, 30 * k, pw).length * 1.3 * 30 * k + 20 * k;
  const draw = (t0: number, t1: number) => ({draw: 0, keys: {draw: [[t0, 0], [t1, 1, 'linear']] as Key[]}});
  const normalLen = 0.22 * H;
  props.push({id: 'normal', type: 'line', x1: hx, y1: y1 - normalLen, x2: hx, y2: (slab ? y2 : y1 + normalLen), style: {stroke: 'muted', width: 2.5 * k, dash: [10 * k, 8 * k]}, layer: 1},
    {id: 'normal-label', type: 'text', x: hx + 12 * k, y: y1 - normalLen + 6 * k, text: 'normal', size: 24 * k, style: {fill: 'muted'}, layer: 1});
  const anchors: Record<string, Vec> = {incidence: [hx, y1], normal: [hx, y1 - normalLen]};
  const angles = s.angles!;
  if (s.wavefronts) {
    // Wavefronts across a beam (the first angle's): a front is all the points light reaches at one moment. In the
    // first medium the fronts are square to the incident ray; past the surface each part travels on at the second
    // medium's speed (n1/n2 as far in the same time), square to the refracted ray, so the fronts crowd together and
    // turn: the side that enters first slows first.
    const ai = angles[0], sr = n1 * Math.sin(rad(ai)) / n2v;
    if (sr < 1) {
      const d1: Vec = [Math.sin(rad(ai)), Math.cos(rad(ai))], d2: Vec = [n1 * Math.sin(rad(ai)) / n2v, Math.sqrt(1 - sr * sr)];
      const across: Vec = [d1[1], -d1[0]], halfWidth = 0.09 * W * k / k, L = 0.75 * (y1 - top);
      const origin: Vec = [hx - d1[0] * L / d1[1], y1 - L];                     // where the beam's middle starts
      const lowest = slab ? y2 : bottom - 8 * k, gap = 46 * k, fronts = 14;
      const edge = (u: number, phase: number): Vec | null => {
        const q: Vec = [origin[0] + across[0] * u, origin[1] + across[1] * u];
        const tB = (y1 - q[1]) / d1[1];                                          // where this part of the beam meets the surface
        const p: Vec = phase <= tB ? [q[0] + d1[0] * phase, q[1] + d1[1] * phase]
          : [q[0] + d1[0] * tB + d2[0] * (phase - tB) * n1 / n2v, y1 + d2[1] * (phase - tB) * n1 / n2v];
        return p[1] < top + 4 * k || p[1] > lowest || p[0] < left || p[0] > right ? null : p;
      };
      for (let j = 1; j <= fronts; j++) {
        const phase = j * gap, pts: Vec[] = [];
        for (let q = 0; q <= 24; q++) { const p = edge(-halfWidth + (2 * halfWidth * q) / 24, phase); if (p) pts.push([round(p[0], 2), round(p[1], 2)]); }
        if (pts.length > 2) props.push({id: `front${j}`, type: 'polyline', points: pts, show: [0.6 + 0.35 * j, 1e9], fade: 0.25, style: {stroke: 'cool', width: 3.5 * k, opacity: 0.85}, layer: 2});
      }
      facts.push(`the wavefronts are ${fmt(n1 / n2v, 2)} times as far apart in ${name2} as in ${name1}: light travels slower there, so the part of each front that enters first slows first and the front turns`);
    }
  }
  angles.forEach((ai, i) => {
    const s0 = T0 + i * E, last = i === angles.length - 1, show: [number, number] = [s0, last ? 1e9 : s0 + E], tag = `a${i}`;
    const si = Math.sin(rad(ai)), sr = n1 * si / n2v, tir = sr > 1;
    const ar = tir ? NaN : deg(Math.asin(sr));
    const inDir: Vec = [si, Math.cos(rad(ai))];
    const L = Math.min((y1 - top - 10 * k) / Math.max(inDir[1], 1e-9), si > 1e-9 ? (hx - left - 10 * k) / si : Infinity);
    const start: Vec = [hx - inDir[0] * L, y1 - inDir[1] * L], hit: Vec = [hx, y1];
    props.push({id: `${tag}-in`, type: 'line', ...xy(start, hit), ...draw(s0 + 0.4, s0 + 1.6), show, fade: 0.3, style: {stroke: 'accent', width: 5 * k}, layer: 3},
      head(`${tag}-hin`, start, hit, [s0 + 1.6, show[1]], k));
    // i and r written in the angles they name, between the ray and the normal.
    const mark = (id: string, letter: string, d: Vec, t: number, fill: string) => {
      const L0 = Math.hypot(d[0], d[1]) || 1;
      props.push({id, type: 'text', x: round(hx + 70 * k * d[0] / L0, 2), y: round(y1 + 70 * k * d[1] / L0 + 10 * k, 2), text: letter, size: 32 * k,
        align: 'middle', weight: 700, show: [t, show[1]], fade: 0.3, style: {fill}, layer: 6});
    };
    if (ai > 4) mark(`${tag}-i`, 'i', [-si, -1 - Math.cos(rad(ai))], s0 + 1.6, 'accent');
    let lines: [string, string][];
    if (tir) {
      const out: Vec = [hx + inDir[0] * L, y1 - inDir[1] * L];
      props.push({id: `${tag}-out`, type: 'line', ...xy(hit, out), ...draw(s0 + 1.7, s0 + 2.9), show, fade: 0.3, style: {stroke: 'bad', width: 5 * k}, layer: 3});
      const crit = deg(Math.asin(n2v / n1));
      lines = [[`i = ${fmt(ai, 1)}°: more than the critical angle ${fmt(crit, 1)}°`, 'accent'], ['All the light is reflected back (total internal reflection)', 'bad']];
      facts.push(`at ${fmt(ai, 1)}° the light is totally reflected; the critical angle from ${name1} into ${name2} is ${fmt(crit, 1)}°`);
    } else {
      const rDir: Vec = [Math.sin(rad(ar)), Math.cos(rad(ar))];
      const Lr = slab ? thick / rDir[1] : Math.min((bottom - y1 - 10 * k) / rDir[1], rDir[0] > 1e-9 ? (right - hx - 10 * k) / rDir[0] : Infinity);
      const exitP: Vec = [hx + rDir[0] * Lr, y1 + rDir[1] * Lr];
      if (ai > 4) mark(`${tag}-r`, 'r', [rDir[0], 1 + rDir[1]], s0 + 2.9, 'good');
      props.push({id: `${tag}-out`, type: 'line', ...xy(hit, exitP), ...draw(s0 + 1.7, s0 + 2.9), show, fade: 0.3, style: {stroke: 'good', width: 5 * k}, layer: 3},
        head(`${tag}-hout`, hit, exitP, [s0 + 2.9, show[1]], k));
      const ratio = ai === 0 ? NaN : si / Math.sin(rad(ar));
      lines = [[`i = ${fmt(ai, 1)}°, r = ${fmt(ar, 1)}°`, 'ink'],
        [ai === 0 ? 'Along the normal: the ray goes straight on' : `sin i ÷ sin r = ${fmt(si, Math.abs(ratio - 1) < 0.01 ? 5 : 3)} ÷ ${fmt(Math.sin(rad(ar)), Math.abs(ratio - 1) < 0.01 ? 5 : 3)} = ${fmt(ratio, Math.abs(ratio - 1) < 0.01 ? 4 : 2)}`, 'good']];
      facts.push(ai === 0 ? 'a ray along the normal goes straight through without bending'
        : `angle of incidence ${fmt(ai, 1)}°, angle of refraction ${fmt(ar, 1)}°, sin i / sin r = ${fmt(ratio, Math.abs(ratio - 1) < 0.01 ? 4 : 2)}`);
      if (slab) {
        // Out through the far face, parallel to the incident ray; the incident ray's line runs on, dashed, to show the shift.
        const L2 = Math.min((bottom - y2 - 10 * k) / Math.max(inDir[1], 1e-9), si > 1e-9 ? (right - exitP[0] - 10 * k) / si : Infinity);
        const out: Vec = [exitP[0] + inDir[0] * L2, y2 + inDir[1] * L2];
        const straightL = (y2 - y1 + (out[1] - y2)) / Math.max(inDir[1], 1e-9), straight: Vec = [hx + inDir[0] * straightL, y1 + inDir[1] * straightL];
        const shift = slab * Math.sin(rad(ai - ar)) / Math.cos(rad(ar));
        if (!i) anchors.exit = exitP;
        props.push({id: `${tag}-emergent`, type: 'line', ...xy(exitP, out), ...draw(s0 + 3.0, s0 + 4.0), show, fade: 0.3, style: {stroke: 'accent', width: 5 * k}, layer: 3},
          head(`${tag}-hem`, exitP, out, [s0 + 4.0, show[1]], k),
          {id: `${tag}-normal2`, type: 'line', x1: exitP[0], y1: y2 - 0.1 * H, x2: exitP[0], y2: y2 + 0.12 * H, show: [s0 + 2.9, show[1]], fade: 0.3, style: {stroke: 'muted', width: 2.5 * k, dash: [10 * k, 8 * k]}, layer: 1},
          {id: `${tag}-straight`, type: 'line', ...xy(hit, straight), ...draw(s0 + 4.1, s0 + 4.8), show, fade: 0.3, style: {stroke: 'muted', width: 3 * k, dash: [12 * k, 9 * k]}, layer: 2});
        lines.push([`Emergent ray parallel to the incident ray; lateral shift ${fmt(shift, 2)} cm`, 'accent']);
        facts.push(`through a ${fmt(slab)} cm slab at ${fmt(ai, 1)}°, the emergent ray is parallel to the incident ray, shifted sideways by ${fmt(shift, 2)} cm`);
      }
    }
    let y = row;
    if (panel) lines.forEach(([text, fill], j) => {
      props.push({id: `${tag}-line${j}`, type: 'text', x: px, y, text, size: 30 * k, width: pw, weight: j ? 400 : 700, show: [s0 + 1.8 + 0.4 * j, show[1]], fade: 0.3, style: {fill}});
      y += wrapText(text, 30 * k, pw).length * 1.3 * 30 * k + 10 * k;
    });
  });
  const end = T0 + angles.length * E;
  const n21 = n2v / n1;
  const tail: string[] = [`n of ${name2} relative to ${name1} = ${fmt(n2v, 4)} ÷ ${fmt(n1, 4)} = ${fmt(n21, Math.abs(n21 - 1) < 0.01 ? 4 : 2)}`];
  if (s.speeds) tail.push(`Speed of light: ${fmt(C_LIGHT / n1 / 1e8, 2)} × 10⁸ m/s in ${name1}, ${fmt(C_LIGHT / n2v / 1e8, 2)} × 10⁸ m/s in ${name2}`);
  let y = 0.72 * H;
  if (panel) tail.forEach((text, j) => {
    props.push({id: `tail${j}`, type: 'text', x: px, y, text, size: 30 * k, width: pw, weight: 700, show: [end - E + 4.4 + 0.4 * j, 1e9], fade: 0.3, style: {fill: 'cool'}});
    y += wrapText(text, 30 * k, pw).length * 1.3 * 30 * k + 12 * k;
  });
  facts.push(`refractive index of ${name2} relative to ${name1}: ${fmt(n21, Math.abs(n21 - 1) < 0.01 ? 4 : 2)} (absolute indices ${fmt(n1, 4)} and ${fmt(n2v, 4)})`);
  if (s.speeds) facts.push(`light travels at about ${fmt(C_LIGHT / n1 / 1e8, 2)} × 10^8 m/s in ${name1} and ${fmt(C_LIGHT / n2v / 1e8, 2)} × 10^8 m/s in ${name2}`);
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: end + 1.5, theme: s.theme ?? 'dark', props, actors: [],
    meta: {verb: 'refraction', facts, anchors, n21: round(n21, 6)}};
}

/** Apparent depth: an object in the denser medium seen from above. Each ray from it bends away from the normal as it
 * leaves; drawn back, the rays meet nearer the surface, at about depth × n(to) ÷ n(from) for rays near the normal. */
function apparentDepth(s: RefractionSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, panel = s.panel !== false;
  const nIn = indexOf(s.from), nOut = indexOf(s.to), d = s.object_depth!, name = s.object ?? 'object';
  const left = 0.04 * W, right = panel ? 0.62 * W : 0.96 * W, top = panel ? 0.12 * H : (s.title ? 0.23 : 0.13) * H, bottom = 0.94 * H;
  const surface = top + 0.36 * (bottom - top), scale = 0.72 * (bottom - surface) / d, hx = (left + right) / 2;
  const obj: Vec = [hx, surface + d * scale], apparent = d * nOut / nIn;
  const inName = mediumName(s.from), outName = mediumName(s.to);
  const props: Prop[] = [
    {id: 'medium1', type: 'rect', x: left, y: top, w: right - left, h: surface - top, style: {fill: 'paper', stroke: 'faint', width: 2 * k}},
    {id: 'medium2', type: 'rect', x: left, y: surface, w: right - left, h: bottom - surface, style: {fill: 'cool', opacity: 0.16, stroke: 'cool', width: 3 * k}},
    {id: 'name1', type: 'text', x: left + 18 * k, y: top + 40 * k, text: outName, size: 28 * k, weight: 700, style: {fill: 'muted'}},
    {id: 'name1-n', type: 'text', x: left + 18 * k, y: top + 76 * k, text: `n = ${fmt(nOut, 4)}`, size: 26 * k, style: {fill: 'muted'}},
    {id: 'name2', type: 'text', x: left + 18 * k, y: surface + 42 * k, text: inName, size: 28 * k, weight: 700, style: {fill: 'cool'}},
    {id: 'name2-n', type: 'text', x: left + 18 * k, y: surface + 78 * k, text: `n = ${fmt(nIn, 4)}`, size: 26 * k, style: {fill: 'cool'}},
    {id: 'object', type: 'circle', x: obj[0], y: round(obj[1], 2), r: 14 * k, style: {fill: 'accent'}, layer: 5},
    {id: 'object-label', ...fitLabel(name, obj[0], right, k, left), y: round(obj[1], 2), size: 28 * k, weight: 700, style: {fill: 'accent', stroke: 'paper', width: 8 * k}, layer: 6},
  ];
  if (s.title && !panel) props.push({id: 'title', type: 'text', x: left, y: 0.16 * H, text: s.title, size: 44 * k, weight: 700, width: 0.92 * W});
  const draw = (t0: number, t1: number) => ({draw: 0, keys: {draw: [[t0, 0], [t1, 1, 'linear']] as Key[]}});
  const meets: number[] = [];
  (s.angles ?? [8, 16]).forEach((a, i) => [1, -1].forEach(side => {
    const hit: Vec = [obj[0] + side * d * scale * Math.tan(rad(a)), surface], r = Math.asin(nIn * Math.sin(rad(a)) / nOut);
    const L = (surface - top - 8 * k) / Math.cos(r), out: Vec = [hit[0] + side * L * Math.sin(r), surface - L * Math.cos(r)];
    const meet = surface + Math.abs(hit[0] - obj[0]) / Math.tan(r);      // the ray drawn back meets the vertical here
    meets.push((meet - surface) / scale);
    const id = `ray${i}${side > 0 ? 'r' : 'l'}`, t = 0.6 + 0.4 * i;
    props.push({id: `${id}-in`, type: 'line', ...xy([obj[0], round(obj[1], 2)], [round(hit[0], 2), hit[1]]), ...draw(t, t + 1.2), style: {stroke: 'accent', width: 4.5 * k}, layer: 3},
      {id: `${id}-out`, type: 'line', ...xy([round(hit[0], 2), hit[1]], [round(out[0], 2), round(out[1], 2)]), ...draw(t + 1.3, t + 2.4), style: {stroke: 'good', width: 4.5 * k}, layer: 3},
      head(`${id}-hin`, obj, hit, [t + 1.2, 1e9], k), head(`${id}-hout`, hit, out, [t + 2.4, 1e9], k),
      {id: `${id}-back`, type: 'line', ...xy([round(hit[0], 2), hit[1]], [obj[0], round(meet, 2)]), ...draw(3.6, 4.4), style: {stroke: 'muted', width: 3 * k, dash: [10 * k, 8 * k]}, layer: 2},
      {id: `${id}-normal`, type: 'line', x1: round(hit[0], 2), y1: surface - 0.12 * H, x2: round(hit[0], 2), y2: surface + 0.1 * H, show: [t + 1.2, 1e9], style: {stroke: 'muted', width: 2 * k, dash: [8 * k, 8 * k]}, layer: 1});
  }));
  const seen = surface + apparent * scale;
  props.push({id: 'image', type: 'circle', x: obj[0], y: round(seen, 2), r: 12 * k, show: [4.4, 1e9], fade: 0.3, style: {fill: 'cool', opacity: 0.7}, layer: 5},
    // Read leftwards when it would run past the drawing's right edge (a half of a side-by-side compound).
    {id: 'image-label', ...fitLabel(`the ${name} seems to be here`, obj[0], right, k, left, 'seems to be here'), y: round(seen, 2), size: 28 * k, weight: 700, show: [4.6, 1e9], fade: 0.3, style: {fill: 'cool', stroke: 'paper', width: 8 * k}, layer: 6});
  if (panel) {
    const px = 0.66 * W, pw = W - px - 40 * k;
    let row = 0.14 * H;
    const lines: [string, string, number, number][] = [];
    if (s.title) lines.push([s.title, 'ink', 0, 44]);
    lines.push([`Rays from the ${name} bend away from the normal as they leave the ${inName}`, 'good', 3.0, 30],
      [`Traced back, they meet above the ${name}: it seems nearer the surface than it is`, 'cool', 4.6, 30],
      [`Real depth ${fmt(d)} cm; it seems about ${fmt(apparent, 1)} cm deep (${fmt(d)} × ${fmt(nOut, 4)} ÷ ${fmt(nIn, 4)})`, 'ink', 5.2, 30]);
    lines.forEach(([text, fill, t, size], j) => {
      props.push({id: j || !s.title ? `line${j}` : 'title', type: 'text', x: px, y: row, text, size: size * k, width: pw, weight: size > 30 || j < 3 ? 700 : 400, show: [t, 1e9], fade: 0.3, style: {fill}});
      row += wrapText(text, size * k, pw).length * 1.3 * size * k + 14 * k;
    });
  }
  const anchors: Record<string, Vec> = {object: [obj[0], round(obj[1], 2)], image: [obj[0], round(seen, 2)], surface: [obj[0], surface]};
  const facts = [`a ${name} ${fmt(d)} cm deep in ${inName} (n = ${fmt(nIn, 4)}) seen from ${outName} (n = ${fmt(nOut, 4)}) seems about ${fmt(apparent, 1)} cm deep: real depth × ${fmt(nOut, 4)} ÷ ${fmt(nIn, 4)}`,
    `rays leaving the ${inName} bend away from the normal; traced back they meet between ${fmt(Math.min(...meets), 1)} and ${fmt(Math.max(...meets), 1)} cm below the surface`];
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: 7.5, theme: s.theme ?? 'dark', props, actors: [],
    meta: {verb: 'refraction', facts, anchors, apparent_depth: round(apparent, 6)}};
}

/** A label beside a point: to its right, or to its left when it would run past `right`. */
function fitLabel(text: string, x: number, right: number, k: number, left = 0, short?: string): {type: 'text'; x: number; text: string; align: 'start' | 'end'} {
  const width = (t: string) => t.length * 28 * k * 0.58;
  for (const t of [text, short ?? text]) {
    if (x + 26 * k + width(t) <= right) return {type: 'text', x: x + 26 * k, text: t, align: 'start'};
    if (x - 26 * k - width(t) >= left) return {type: 'text', x: x - 26 * k, text: t, align: 'end'};
  }
  return {type: 'text', x: x + 26 * k, text: short ?? text, align: 'start'};
}

/** The same ray entering several media from one point: each refracted ray drawn and named, so how much it bends is
 * seen to depend on the medium (the larger the refractive index, the nearer the normal). */
const asin1 = (v: number) => deg(Math.asin(Math.min(1, v)));

function compareMedia(s: RefractionSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, panel = s.panel !== false;
  const media = s.to as (string | number)[], n1 = indexOf(s.from), ai = (s.angles ?? [45])[0];
  const left = 0.04 * W, right = panel ? 0.62 * W : 0.96 * W, top = panel ? 0.12 * H : (s.title ? 0.23 : 0.13) * H, bottom = 0.94 * H;
  const y1 = (top + bottom) / 2, hx = left + 0.4 * (right - left), L = Math.min(y1 - top - 10 * k, (hx - left - 10 * k) / Math.max(Math.sin(rad(ai)), 0.2) * Math.cos(rad(ai)));
  const tones = ['accent', 'good', 'cool', 'bad', 'ink', 'muted'];
  const props: Prop[] = [
    {id: 'medium1', type: 'rect', x: left, y: top, w: right - left, h: y1 - top, style: {fill: 'paper', stroke: 'faint', width: 2 * k}},
    {id: 'medium2', type: 'rect', x: left, y: y1, w: right - left, h: bottom - y1, style: {fill: 'cool', opacity: 0.12, stroke: 'cool', width: 3 * k}},
    {id: 'name1', type: 'text', x: left + 18 * k, y: top + 40 * k, text: mediumName(s.from), size: 28 * k, weight: 700, style: {fill: 'muted'}},
    {id: 'name2', type: 'text', x: left + 18 * k, y: bottom - 24 * k, text: 'each medium in turn', size: 26 * k, style: {fill: 'cool'}},
    {id: 'normal', type: 'line', x1: hx, y1: top + 10 * k, x2: hx, y2: bottom - 10 * k, style: {stroke: 'muted', width: 2.5 * k, dash: [10 * k, 8 * k]}, layer: 1},
  ];
  const d1: Vec = [Math.sin(rad(ai)), Math.cos(rad(ai))], start: Vec = [hx - d1[0] * L / d1[1], y1 - L];
  props.push({id: 'incident', type: 'line', x1: round(start[0], 2), y1: round(start[1], 2), x2: hx, y2: y1, draw: 0, keys: {draw: [[0.4, 0], [1.4, 1, 'linear']]}, style: {stroke: 'ink', width: 5 * k}, layer: 3},
    head('incident-head', start, [hx, y1], [1.4, 1e9], k));
  const facts: string[] = [], rows: [string, string][] = [];
  // The rays end close together (their angles differ by a few degrees): their names stand in a column beside them,
  // each in its ray's colour, like a key.
  const rMax = Math.max(...media.map(m => asin1(n1 * Math.sin(rad(ai)) / indexOf(m))));
  const columnX = Math.min(hx + Math.tan(rad(rMax)) * (bottom - y1 - 50 * k) + 50 * k, right - 200 * k);
  media.forEach((m, j) => {
    const n2 = indexOf(m), sr = n1 * Math.sin(rad(ai)) / n2, name = mediumName(m), t = 1.6 + 0.8 * j;
    if (sr >= 1) { rows.push([`${name}: totally reflected`, tones[j % tones.length]]); return; }
    const r = deg(Math.asin(sr)), d2: Vec = [Math.sin(rad(r)), Math.cos(rad(r))], len = (bottom - y1 - 50 * k) / d2[1];
    const end: Vec = [hx + d2[0] * len, y1 + d2[1] * len];
    props.push({id: `ray-${j}`, type: 'line', x1: hx, y1: y1, x2: round(end[0], 2), y2: round(end[1], 2), draw: 0, keys: {draw: [[t, 0], [t + 0.8, 1, 'linear']]}, style: {stroke: tones[j % tones.length], width: 4.5 * k}, layer: 3},
      {id: `ray-${j}-name`, type: 'text', x: round(columnX, 2), y: round(y1 + 0.3 * (bottom - y1) + 36 * k * j, 2), text: name, size: 26 * k, weight: 700, show: [t + 0.8, 1e9], fade: 0.3, style: {fill: tones[j % tones.length], stroke: 'paper', width: 7 * k}, layer: 6});
    rows.push([`${name}: n = ${fmt(n2, 4)}, r = ${fmt(r, 1)}°`, tones[j % tones.length]]);
    facts.push(`entering ${name} (n = ${fmt(n2, 4)}${canon(String(m)) in TYPICAL ? ', a typical value: the book gives none' : ''}) at ${fmt(ai, 1)}° from ${mediumName(s.from)}, the ray is refracted at ${fmt(r, 1)}°`);
  });
  facts.push('the larger the refractive index of the medium, the more the ray bends towards the normal');
  if (panel) {
    const px = 0.66 * W, pw = W - px - 40 * k;
    let row = 0.14 * H;
    if (s.title) { props.push({id: 'title', type: 'text', x: px, y: row, text: s.title, size: 44 * k, weight: 700, width: pw}); row += wrapText(s.title, 44 * k, pw).length * 1.25 * 44 * k + 18 * k; }
    props.push({id: 'rule', type: 'text', x: px, y: row, text: `The same ray from ${mediumName(s.from)} at i = ${fmt(ai, 1)}°`, size: 30 * k, weight: 700, width: pw, style: {fill: 'muted'}});
    row += 1.6 * 30 * k;
    rows.forEach(([text, fill], j) => { props.push({id: `row${j}`, type: 'text', x: px, y: row, text, size: 30 * k, width: pw, show: [2.4 + 0.8 * j, 1e9], fade: 0.3, style: {fill}}); row += 1.5 * 30 * k; });
    props.push({id: 'tail', type: 'text', x: px, y: row + 20 * k, text: 'The larger n, the more it bends towards the normal', size: 30 * k, weight: 700, width: pw, show: [2.4 + 0.8 * rows.length, 1e9], fade: 0.3, style: {fill: 'cool'}});
  } else if (s.title) props.push({id: 'title', type: 'text', x: left, y: 0.16 * H, text: s.title, size: 44 * k, weight: 700, width: 0.92 * W});
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: 3.5 + 0.8 * media.length, theme: s.theme ?? 'dark', props, actors: [],
    meta: {verb: 'refraction', facts, anchors: {incidence: [hx, y1]}}};
}
