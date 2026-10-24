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

type Def = {about: string; length: number; a?: string; b?: string; params?: Record<string, string>; ground: boolean};
export const OBJECTS: Record<string, Def> = {
  car: {about: 'a car; wheels roll with the distance travelled', length: 200, ground: true},
  bus: {about: 'a city bus; wheels roll with the distance travelled', length: 300, ground: true},
  train: {about: 'a locomotive with smoke (and carriages behind it); wheels roll, smoke trails while it moves', length: 260,
    params: {cars: 'carriages behind the engine, 0–3 (each as long as the engine)', smoke: '0 for no smoke'}, ground: true},
  bicycle: {about: 'a cyclist on a bicycle; wheels roll and the pedals turn with the distance travelled', length: 170, ground: true},
  block: {about: 'a block (a box of mass m)', length: 100, params: {height: 'height as a share of the length, default 0.7'}, ground: true},
  wedge: {about: 'a wedge or inclined plane with its angle marked', length: 300, a: 'the angle of the slope in degrees (5–75, default 30)', ground: true},
  pulley: {about: 'a fixed pulley hanging from the ceiling, a rope over it and a block on each side; the wheel turns with the rope',
    length: 100, a: 'the left rope length below the wheel, in pulley diameters (default 2)',
    b: 'the right rope length below the wheel, in pulley diameters (default 2)', ground: false},
  sling: {about: 'a stone whirled on a string (circular motion), with its path and, optionally, its velocity arrow',
    length: 240, a: 'the angle of the string in degrees, counter-clockwise from the right', b: 'velocity arrow length as a share of the radius (0: none)', ground: false},
  ball: {about: 'a ball', length: 40, ground: true},
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
      if (o.label) text([0, -h / 2], o.label, 32);
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
    case 'ball':
      circle([0, -20], 20, {fill: 'accent', stroke: 'ink', width: W(3)});
      break;
  }
  return items;
}
