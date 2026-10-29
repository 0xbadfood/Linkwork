// Objects: the common things of physics problems (a car, a bus, a train, a bicycle, a block, a wedge, a pulley, a
// sling, a ball), drawn by code from a few numbers so they keep their sizes and move truthfully. Only the motion is
// given (where the object is, which way it faces, an angle); what follows from it is computed: wheels roll with the
// distance travelled (no skid), smoke trails a moving engine and thins when it stops, a pulley's wheel turns with its
// rope. Each object is a group of plain props in theme colours, so it draws, themes and checks like everything else.
//
// An object stands with (x, y) at the middle of its base on the ground (a sling and a pulley: at their pivot), faces
// right when facing is 1, and is `size` scene units long. Two keyable numbers, a and b, drive its parts (see OBJECTS).
import type {Prop, Style} from './scene.ts';
import type {Vec} from './vec.ts';

export type ObjectSpec = {name: string; x: number; y: number; size?: number; facing?: number; angle?: number; a?: number; b?: number;
  label?: string; params?: Record<string, number | string>};
/** What the scene knows about the object's motion at this moment: how far it has travelled along the ground since
 * the start (scene units, + to the right) and its speed (scene units per second). */
export type Motion = {t: number; travel: number; speed: number};

/** What a prop can do in a scene (user, 2026-10-24: the mechanics world by role). The stage verb's physics follows
 * the role: a mover moves, a roller rolls without slipping, a launcher fires, a support carries what rests on it, a
 * surface is slid or rolled down, an impactor collides, a path and a direction show the way, a connector joins, a
 * measure reads a quantity, ground is what everything stands on; a general prop belongs in any scene of any subject
 * (a stopwatch, a speedometer, a bulb for a new idea). */
export const ROLES = ['mover', 'path', 'direction', 'launcher', 'support', 'surface', 'roller', 'impactor', 'ground',
  'connector', 'measure', 'general'] as const;
export type Role = (typeof ROLES)[number];
type Def = {about: string; length: number; a?: string; b?: string; params?: Record<string, string>; roles: Role[];
  /** Height over length, in its own units (for fitting and for what rests on top). */
  height?: number};
export const OBJECTS: Record<string, Def> = {
  car: {about: 'a car; wheels roll with the distance travelled', length: 200, roles: ['mover', 'impactor']},
  bus: {about: 'a city bus; wheels roll with the distance travelled', length: 300, roles: ['mover', 'impactor']},
  train: {about: 'a locomotive with smoke (and carriages behind it); wheels roll, smoke trails while it moves', length: 260,
    params: {cars: 'carriages behind the engine, 0–3 (each as long as the engine)', smoke: '0 for no smoke'}, roles: ['mover', 'impactor']},
  bicycle: {about: 'a cyclist on a bicycle; wheels roll and the pedals turn with the distance travelled', length: 170, roles: ['mover']},
  block: {about: 'a block (a box of mass m)', length: 100, params: {height: 'height as a share of the length, default 0.7'}, roles: ['mover', 'support', 'impactor']},
  wedge: {about: 'a wedge or inclined plane with its angle marked', length: 300, a: 'the angle of the slope in degrees (5–75, default 30)', roles: ['support', 'surface']},
  pulley: {about: 'a fixed pulley hanging from the ceiling, a rope over it and a block on each side; the wheel turns with the rope',
    length: 100, a: 'the left rope length below the wheel, in pulley diameters (default 2)',
    b: 'the right rope length below the wheel, in pulley diameters (default 2)', roles: ['connector']},
  sling: {about: 'a stone whirled on a string (circular motion), with its path and, optionally, its velocity arrow',
    length: 240, a: 'the angle of the string in degrees, counter-clockwise from the right', b: 'velocity arrow length as a share of the radius (0: none)', roles: ['connector', 'mover']},
  ball: {about: 'a ball', length: 40, roles: ['mover', 'roller', 'impactor']},
  upright_ruler: {about: 'a ruler held upright, with centimetre marks (its length is its long side; its foot is its position): dropped between a friend\'s fingers to measure reaction time',
    length: 300, roles: ['mover', 'measure'], height: 1},
  platform: {about: 'a railway platform beside the track (its length is its size)', length: 300, roles: ['ground', 'path']},
  road: {about: 'a stretch of road with a dashed centre line (its length is its size)', length: 300, roles: ['ground', 'path']},
  parking: {about: 'a parking bay between two kerbs, with a P sign (its length is its size)', length: 300, roles: ['ground', 'path']},
  signpost: {about: 'a signpost whose arrow board points the way it faces (label: the word on the board)', length: 120, roles: ['direction'], height: 1.3},
  marker: {about: 'a stone marker with a small flag: a chosen starting point (label under it)', length: 40, roles: ['direction', 'path'], height: 1.6},
  table: {about: 'a table; things rest on its top', length: 300, roles: ['support', 'ground'], height: 0.5},
  plank: {about: 'a plank; things rest on it, tilt it with angle', length: 300, roles: ['support', 'surface'], height: 0.04},
  slide: {about: 'a smooth curved slide (rounded surface) from a high end on the left down to the ground on the right', length: 300, roles: ['surface', 'support'], height: 0.7},
  cylinder: {about: 'a solid cylinder seen end-on; rolls without slipping (the stripe turns with it)', length: 60, roles: ['mover', 'roller', 'impactor'], height: 1},
  ring: {about: 'a ring or hoop seen end-on; rolls without slipping', length: 60, roles: ['mover', 'roller'], height: 1},
  cart: {about: 'a trolley on two small wheels (collisions, pushes)', length: 120, roles: ['mover', 'impactor'], height: 0.5},
  wall: {about: 'a wall: things stop or bounce at it', length: 30, roles: ['impactor', 'support'], height: 6},
  spring: {about: 'a coil spring lying along the ground from x - size/2 to x + size/2 (key size to stretch or squeeze it)', length: 200, roles: ['connector'], height: 0.15},
  cannon: {about: 'a cannon on wheels; its barrel points at angle a (degrees, default 40) and launches a ball', length: 160, a: 'barrel angle in degrees (0–80)', roles: ['launcher'], height: 0.6},
  ruler: {about: 'a measuring rule with ticks (size is its length; label gives what it measures)', length: 300, roles: ['measure'], height: 0.08},
  stopwatch: {about: 'a stopwatch; its hand shows a seconds (key a to run it)', length: 70, a: 'seconds shown', roles: ['measure', 'general'], height: 1.2},
  speedometer: {about: "a speedometer: its needle and its number show a speed (a stage keeps it on a mover's speed)", length: 160,
    a: 'the speed shown', params: {max: 'the top of the dial (default 30)', unit: 'unit under the number (default m/s)'}, roles: ['measure', 'general'], height: 0.9},
  bulb: {about: 'a light bulb that lights up (a new idea, a light turned on); a sets its glow, 0 to 1', length: 60, a: 'brightness 0 to 1', roles: ['general'], height: 1.7},
};

export function objectErrors(o: ObjectSpec, where: string): string[] {
  const e: string[] = [];
  const def = OBJECTS[o.name];
  if (!def) return [`${where}: unknown object ${JSON.stringify(o.name)}; known: ${Object.keys(OBJECTS).join(', ')}`];
  if (o.size !== undefined && !(o.size > 0)) e.push(`${where}: size must be positive`);
  if (o.name === 'train' && o.params?.cars !== undefined && !(Number.isInteger(o.params.cars) && +o.params.cars >= 0 && +o.params.cars <= 3))
    e.push(`${where}: a train has 0–3 cars`);
  if (o.name === 'wedge' && o.a !== undefined && !(o.a >= 5 && o.a <= 75)) e.push(`${where}: a wedge's angle is 5–75 degrees`);
  return e;
}

const DEG = Math.PI / 180;

/** The object's props at this moment, in scene coordinates. */
export function objectItems(o: ObjectSpec, m: Motion, id: string): Prop[] {
  const def = OBJECTS[o.name];
  if (!def) return [];
  const s = (o.size ?? def.length) / def.length, f = (o.facing ?? 1) < 0 ? -1 : 1, rot = (o.angle ?? 0) * DEG;
  const cos = Math.cos(rot), sin = Math.sin(rot);
  // Local units: x forward, y down, origin at the middle of the base (or the pivot).
  const P = ([lx, ly]: Vec): Vec => {
    const x = lx * f * s, y = ly * s;
    return [o.x + x * cos + y * sin, o.y - x * sin + y * cos];
  };
  const items: Prop[] = [];
  let n = 0;
  const add = (p: Record<string, unknown>) => items.push({id: `${id}.${n++}`, ...p} as Prop);
  const W = (w: number) => w * s;
  const poly = (pts: Vec[], style: Style, closed = true) => add({type: 'polyline', points: pts.map(P), closed, style});
  const line = (a: Vec, b: Vec, style: Style) => { const [p, q] = [P(a), P(b)]; add({type: 'line', x1: p[0], y1: p[1], x2: q[0], y2: q[1], style}); };
  const circle = (c: Vec, r: number, style: Style) => { const p = P(c); add({type: 'circle', x: p[0], y: p[1], r: r * s, style}); };
  const text = (at: Vec, t: string, size: number, fill = 'ink') => { const p = P(at); add({type: 'text', x: p[0], y: p[1], text: t, size: size * s, align: 'middle', weight: 700, style: {fill}}); };
  const box = (x0: number, y0: number, x1: number, y1: number): Vec[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  /** A wheel at local (cx, cy) of radius r that has rolled `travel` scene units: spokes turn by travel / R. */
  const wheel = (cx: number, cy: number, r: number, spokes = 3) => {
    circle([cx, cy], r, {fill: 'paper', stroke: 'ink', width: W(5)});
    const turn = m.travel / (r * s) * f;        // radians; rolling right turns clockwise on screen
    for (let i = 0; i < spokes; i++) {
      const a = turn + i * Math.PI / spokes, d: Vec = [Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82];   // P mirrors x
      line([cx - d[0], cy - d[1]], [cx + d[0], cy + d[1]], {stroke: 'muted', width: W(3)});
    }
    circle([cx, cy], r * 0.16, {fill: 'ink'});
  };
  const body = {fill: 'faint', stroke: 'ink', width: W(4)};
  const glass = {fill: 'cool', stroke: 'ink', width: W(2.5), opacity: 0.55};

  switch (o.name) {
    case 'car':
      poly([[-100, -22], [-100, -52], [-62, -58], [-36, -92], [34, -92], [62, -58], [98, -50], [100, -22]], body);
      poly([[-30, -86], [-2, -86], [-2, -60], [-54, -60]], glass);
      poly([[4, -86], [30, -86], [52, -60], [4, -60]], glass);
      wheel(-60, -22, 22); wheel(62, -22, 22);
      break;
    case 'bus':
      poly(box(-150, -118, 150, -22), body);
      for (let i = 0; i < 5; i++) poly(box(-128 + i * 46, -104, -94 + i * 46, -72), glass);
      poly(box(108, -104, 140, -50), glass);
      wheel(-100, -22, 24); wheel(98, -22, 24);
      break;
    case 'train': {
      const cars = Math.max(0, Math.min(3, Math.round(+(o.params?.cars ?? 0))));
      for (let c = 1; c <= cars; c++) {
        const x0 = -130 - 270 * c;
        poly(box(x0, -120, x0 + 260, -26), body);
        for (let i = 0; i < 4; i++) poly(box(x0 + 18 + i * 60, -104, x0 + 56 + i * 60, -76), glass);
        line([x0 + 260, -40], [x0 + 270, -40], {stroke: 'ink', width: W(5)});
        wheel(x0 + 50, -24, 22); wheel(x0 + 210, -24, 22);
      }
      poly(box(-130, -140, -40, -26), body);                                   // cab
      poly(box(-118, -126, -66, -96), glass);
      poly([[-40, -100], [110, -100], [130, -70], [130, -26], [-40, -26]], body);   // boiler
      poly(box(60, -146, 84, -100), {fill: 'muted', stroke: 'ink', width: W(3)});   // chimney
      wheel(-95, -24, 22); wheel(-20, -24, 26); wheel(55, -24, 26); wheel(108, -22, 18);
      // Smoke: puffs leave the chimney in turn, rise and grow, and stay behind as the engine moves on. A standing
      // engine gives a thin rising wisp.
      const rate = 1.6, life = 2.2, drift = Math.min(1, Math.abs(m.speed) / (300 * s));
      for (let i = 0; i < (o.params?.smoke === 0 ? 0 : 6); i++) {
        const age = ((m.t * rate + i / 6) % 1) * life;
        const back = age * m.speed / s * f;             // where the engine has gone since the puff left, in local x
        const r = 10 + 16 * age;
        const alpha = Math.max(0, (0.55 - 0.22 * age) * (0.35 + 0.65 * drift));
        if (alpha > 0.02) circle([72 - back - 12 * age, -152 - 38 * age], r, {fill: 'muted', opacity: alpha});
      }
      break;
    }
    case 'bicycle': {
      const r = 34, back: Vec = [-56, -r], front: Vec = [58, -r], crank: Vec = [0, -r], seat: Vec = [-14, -98], bar: Vec = [44, -102];
      wheel(back[0], back[1], r, 4); wheel(front[0], front[1], r, 4);
      const frame = {stroke: 'accent', width: W(5)};
      line(back, crank, frame); line(crank, seat, frame); line(seat, back, frame); line(seat, [36, -86], frame);
      line([36, -86], crank, frame); line([36, -86], front, frame); line([36, -86], bar, frame);
      // Pedals turn with the wheels (a 1:1 gear is close enough for a picture).
      const pa = m.travel / (r * s) * f;
      const pedal = (k: number): Vec => [crank[0] + Math.cos(pa + k) * 14, crank[1] + Math.sin(pa + k) * 14];
      const hip: Vec = [-12, -104], shoulder: Vec = [12, -150], hand: Vec = [42, -104];
      const rider = {stroke: 'figure', width: W(6)};
      for (const k of [0, Math.PI]) {
        const foot = pedal(k), knee: Vec = [(hip[0] + foot[0]) / 2 + 14, (hip[1] + foot[1]) / 2 - 10];
        line(hip, knee, rider); line(knee, foot, rider);
      }
      line(hip, shoulder, rider); line(shoulder, hand, rider);
      circle([20, -170], 15, {fill: 'paper', stroke: 'figure', width: W(5)});
      break;
    }
    case 'block': {
      const h = 100 * +(o.params?.height ?? 0.7);
      poly(box(-50, -h, 50, 0), {fill: 'faint', stroke: 'ink', width: W(4)});
      // the name fits inside the block: a word like "cylinder" ran out past both sides (Laws of Motion C7, 2026-10-30)
      if (o.label) text([0, -h / 2], o.label, Math.min(32, 150 / Math.max(1, o.label.length)));
      break;
    }
    case 'upright_ruler': {
      // Upright, its foot at the position and just right of it (clear of an axis there): 30 centimetre marks, every fifth
      // longer (a 30 cm school ruler at full size).
      poly(box(12, -300, 44, 0), {fill: 'faint', stroke: 'ink', width: W(3)});
      for (let i = 1; i < 30; i++) line([12, -10 * i], [12 + (i % 5 ? 9 : 18), -10 * i], {stroke: 'ink', width: W(i % 5 ? 1.5 : 2.5)});
      break;
    }
    case 'wedge': {
      const angle = Math.max(5, Math.min(75, o.a ?? 30)), h = 300 * Math.tan(angle * DEG);
      poly([[-150, 0], [150, 0], [150, -h]], {fill: 'faint', stroke: 'ink', width: W(4)});
      const r = 70, pts: Vec[] = [];
      for (let i = 0; i <= 16; i++) { const a = angle * DEG * i / 16; pts.push([-150 + r * Math.cos(a), -r * Math.sin(a)]); }
      poly(pts, {stroke: 'accent', width: W(3)}, false);
      // The angle's label sits past the arc, along the bisector, with room for a few characters.
      const lab = o.label ?? `${Math.round(angle)}°`, out = r + 24 + 7 * lab.length;
      text([-150 + out * Math.cos(angle * DEG / 3), -out * Math.sin(angle * DEG / 3)], lab, 30, 'accent');
      break;
    }
    case 'pulley': {
      const r = 50, left = 100 * (o.a ?? 2), right = 100 * (o.b ?? 2);
      poly(box(-90, -150, 90, -138), {fill: 'muted', stroke: 'muted', width: W(2)});            // ceiling
      for (let i = 0; i < 6; i++) line([-84 + i * 32, -150], [-70 + i * 32, -170], {stroke: 'muted', width: W(2)});
      line([0, -138], [0, 0], {stroke: 'ink', width: W(5)});
      const rope = {stroke: 'ink', width: W(3)};
      line([-r, 0], [-r, left], rope); line([r, 0], [r, right], rope);
      circle([0, 0], r, {fill: 'paper', stroke: 'ink', width: W(5)});
      const turn = (left - 200) / r;              // the wheel turns as rope passes over it: angle = length / radius
      for (let i = 0; i < 3; i++) {
        const a = turn + i * Math.PI / 3, d: Vec = [Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8];
        line([-d[0], -d[1]], d, {stroke: 'muted', width: W(3)});
      }
      circle([0, 0], 8, {fill: 'ink'});
      poly(box(-r - 30, left, -r + 30, left + 60), {fill: 'faint', stroke: 'ink', width: W(4)});
      poly(box(r - 30, right, r + 30, right + 60), {fill: 'faint', stroke: 'ink', width: W(4)});
      const [la, lb] = String(o.label ?? '').split('|');
      if (la) text([-r, left + 30], la, 26);
      if (lb) text([r, right + 30], lb, 26);
      break;
    }
    case 'sling': {
      const R = 120, a = (o.a ?? 0) * DEG, stone: Vec = [Math.cos(a) * R, -Math.sin(a) * R];
      const path: Vec[] = [];
      for (let i = 0; i <= 48; i++) path.push([Math.cos(i * Math.PI / 24) * R, Math.sin(i * Math.PI / 24) * R]);
      poly(path, {stroke: 'muted', width: W(2.5), dash: [W(8), W(10)]}, false);
      line([0, 0], stone, {stroke: 'muted', width: W(3)});
      circle([0, 0], 9, {fill: 'figure'});
      circle(stone, 16, {fill: 'accent', stroke: 'ink', width: W(3)});
      if ((o.b ?? 0) > 0) {
        const v = (o.b ?? 0) * R, dir: Vec = [-Math.sin(a), -Math.cos(a)];       // tangent, counter-clockwise
        const tip: Vec = [stone[0] + dir[0] * v, stone[1] + dir[1] * v];
        const [p, q] = [P(stone), P(tip)];
        add({type: 'arrow', x1: p[0], y1: p[1], x2: q[0], y2: q[1], style: {stroke: 'cool', width: W(5)}, head: W(18)});
      }
      break;
    }
    case 'ball': case 'cylinder': case 'ring': {
      // A roller: a stripe through its centre turns by the distance rolled over its radius (no slipping).
      const r = def.length / 2, c: Vec = [0, -r];
      circle(c, o.name === 'ring' ? r - 3 : r, o.name === 'ring' ? {fill: 'none', stroke: 'accent', width: W(8)} : {fill: o.name === 'ball' ? 'accent' : 'faint', stroke: 'ink', width: W(3)});
      const turn = m.travel / (r * s) * f, d: Vec = [Math.cos(turn) * r * 0.8, Math.sin(turn) * r * 0.8];
      line([c[0] - d[0], c[1] - d[1]], [c[0] + d[0], c[1] + d[1]], {stroke: 'ink', width: W(o.name === 'ball' ? 3 : 4)});
      if (o.name !== 'ball') circle(c, r * 0.12, {fill: 'ink'});
      break;
    }
    case 'signpost': {
      line([0, 0], [0, -150], {stroke: 'muted', width: W(8)});
      poly([[-50, -150], [40, -150], [60, -132], [40, -114], [-50, -114]], {fill: 'accent', stroke: 'ink', width: W(3)});
      if (o.label) text([-4, -132], o.label, 22, 'paper');
      break;
    }
    case 'marker': {
      poly([[-20, 0], [-14, -22], [14, -22], [20, 0]], {fill: 'muted', stroke: 'ink', width: W(3)});
      line([0, -22], [0, -64], {stroke: 'ink', width: W(3)});
      poly([[0, -64], [26, -56], [0, -48]], {fill: 'cool', stroke: 'cool', width: W(1)});
      if (o.label) text([0, 26], o.label, 26);
      break;
    }
    case 'table':
      poly(box(-150, -150, 150, -136), {fill: 'faint', stroke: 'ink', width: W(4)});
      for (const x of [-130, 122]) poly(box(x, -136, x + 8, 0), {fill: 'muted', stroke: 'muted', width: W(1)});
      break;
    case 'plank':
      poly(box(-150, -12, 150, 0), {fill: 'faint', stroke: 'ink', width: W(3)});
      break;
    case 'slide': {
      const pts: Vec[] = [];
      for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push([-150 + 300 * u, -210 * (1 - u) ** 2]); }
      poly([...pts, [150, 0], [-150, 0]], {fill: 'faint', stroke: 'ink', width: W(3)});
      poly(pts, {stroke: 'accent', width: W(4)}, false);
      break;
    }
    case 'cart':
      poly(box(-60, -50, 60, -16), {fill: 'faint', stroke: 'ink', width: W(4)});
      wheel(-36, -12, 12, 2); wheel(36, -12, 12, 2);
      if (o.label) text([0, -33], o.label, 22);
      break;
    case 'wall':
      poly(box(-15, -180, 15, 0), {fill: 'muted', stroke: 'ink', width: W(3)});
      for (let y = -170; y < 0; y += 30) line([-15, y], [15, y + 12], {stroke: 'faint', width: W(2)});
      break;
    case 'spring': {
      const pts: Vec[] = [[-100, -15]];
      for (let i = 1; i < 20; i++) pts.push([-100 + i * 10, i % 2 ? -27 : -3]);
      pts.push([100, -15]);
      poly(pts, {stroke: 'ink', width: 3}, false);
      break;
    }
    case 'cannon': {
      const a = Math.max(0, Math.min(80, o.a ?? 40)) * DEG, base: Vec = [-10, -40];
      const tip: Vec = [base[0] + Math.cos(a) * 90, base[1] - Math.sin(a) * 90];
      const n: Vec = [Math.sin(a) * 14, Math.cos(a) * 14];
      poly([[base[0] - n[0], base[1] - n[1]], [tip[0] - n[0], tip[1] - n[1]], [tip[0] + n[0], tip[1] + n[1]], [base[0] + n[0], base[1] + n[1]]], {fill: 'ink', stroke: 'ink', width: W(2)});
      poly([[-60, -40], [40, -40], [30, -16], [-50, -16]], {fill: 'faint', stroke: 'ink', width: W(3)});
      wheel(-30, -16, 16, 3);
      break;
    }
    case 'ruler': {
      const len = 300, h = 24 / s;
      poly(box(-150, -h, 150, 0), {fill: 'paper', stroke: 'accent', width: 2});
      const ticks = Math.max(1, Math.round(+(o.params?.ticks ?? 10)));
      for (let i = 0; i <= ticks; i++) { const x = -150 + len * i / ticks; line([x, -h], [x, -h * (i % 5 ? 0.55 : 0.2)], {stroke: 'accent', width: 2}); }
      if (o.label) text([0, -h - 16 / s], o.label, 22 / s, 'accent');
      break;
    }
    case 'speedometer': {
      const c: Vec = [0, -72], r = 66, max = Math.max(1e-9, +(o.params?.max ?? 30)), sweep = 240;
      const at = (frac: number, rr: number): Vec => {       // 0 at the lower left, 1 at the lower right, clockwise
        const ang = (210 - sweep * frac) * DEG;
        return [c[0] + Math.cos(ang) * rr * f, c[1] - Math.sin(ang) * rr];     // P mirrors x; undo it so it reads left to right
      };
      circle(c, r + 8, {fill: 'paper', stroke: 'ink', width: W(4)});
      const arc: Vec[] = [];
      for (let i = 0; i <= 24; i++) arc.push(at(i / 24, r - 4));
      poly(arc, {stroke: 'muted', width: W(3)}, false);
      const step = [1, 2, 5, 10, 20, 25, 50, 100, 200].find(v => max / v <= 6) ?? max / 5;
      for (let v = 0; v <= max + 1e-9; v += step) {
        line(at(v / max, r - 4), at(v / max, r - 16), {stroke: 'ink', width: W(3)});
        if (o.params?.digits !== 'none') text(at(v / max, r - 34), String(Math.round(v * 100) / 100), 17, 'muted');
      }
      const value = Math.max(0, o.a ?? 0), frac = Math.min(1, value / max);
      line(c, at(frac, r - 10), {stroke: 'bad', width: W(5)});
      circle(c, 6, {fill: 'ink'});
      if (o.params?.digits !== 'none') text([0, 26], `${value < 10 ? value.toFixed(1) : Math.round(value)} ${o.params?.unit ?? 'm/s'}`, 24);
      if (o.label) text([0, 54], o.label, 20);
      break;
    }
    case 'bulb': {
      const glow = Math.max(0, Math.min(1, o.a ?? 0)), c: Vec = [0, -72];
      if (glow > 0) {
        circle(c, 30 + 34 * glow, {fill: 'accent', opacity: 0.25 * glow});
        for (let i = 0; i < 8; i++) {
          const ang = i * Math.PI / 4, r0 = 40, r1 = 40 + 26 * glow;
          line([c[0] + Math.cos(ang) * r0, c[1] + Math.sin(ang) * r0], [c[0] + Math.cos(ang) * r1, c[1] + Math.sin(ang) * r1], {stroke: 'accent', width: W(4), opacity: glow});
        }
      }
      circle(c, 30, {fill: glow > 0 ? 'accent' : 'faint', stroke: 'ink', width: W(3), opacity: 0.35 + 0.65 * Math.max(glow, 0.4)});
      poly([[-14, -48], [14, -48], [12, -30], [-12, -30]], {fill: 'muted', stroke: 'ink', width: W(2)});
      for (const y of [-42, -36]) line([-13, y], [13, y], {stroke: 'ink', width: W(1.5)});
      poly([[-12, -30], [12, -30], [6, -22], [-6, -22]], {fill: 'ink'});
      if (o.label) text([0, 16], o.label, 20);
      break;
    }
    case 'stopwatch': {
      const c: Vec = [0, -40];
      circle(c, 35, {fill: 'paper', stroke: 'ink', width: W(4)});
      line([0, -75], [0, -84], {stroke: 'ink', width: W(5)});
      const hand = (o.a ?? 0) * 6 * DEG;          // one turn a minute
      line(c, [Math.sin(hand) * 28, -40 - Math.cos(hand) * 28], {stroke: 'bad', width: W(3)});
      circle(c, 3, {fill: 'ink'});
      if (o.params?.digits !== 'none') text([0, 22], `${(o.a ?? 0).toFixed(1)} s`, 20);
      if (o.label) text([0, 46], o.label, 22);
      break;
    }
    // Settings are long and thin: their thickness keeps a fixed screen size (k), whatever their length.
    case 'platform': {
      const h = 16 / s;
      poly(box(-150, 0, 150, h), {fill: 'faint', stroke: 'ink', width: 3});
      line([-150, 0], [150, 0], {stroke: 'accent', width: 4});
      break;
    }
    case 'road': {
      const h = 14 / s;
      poly(box(-150, 0, 150, h), {fill: 'faint', stroke: 'muted', width: 2});
      line([-150, h / 2], [150, h / 2], {stroke: 'ink', width: 2, dash: [10, 10]});
      break;
    }
    case 'parking': {
      const h = 14 / s;
      poly(box(-150, 0, 150, h), {fill: 'faint', stroke: 'muted', width: 2});
      for (const x of [-150, 150]) poly(box(x - 3 / s, -18 / s, x + 3 / s, 0), {fill: 'ink', stroke: 'ink', width: 1});
      text([-150 + 22 / s, -30 / s], 'P', 26 / s, 'cool');
      break;
    }
  }
  return items;
}
