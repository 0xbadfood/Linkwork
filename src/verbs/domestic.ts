// domestic_circuit: the wiring of a house (Class 10 Magnetic Effects of Electric Current, C7 Domestic Electric
// Circuits, 2026-10-29). The mains (220 V, 50 Hz AC) comes in on a live wire (red) and a neutral wire (black), through
// the electricity meter and a main fuse to a distribution box, which feeds separate circuits (15 A for heaters and
// geysers, 5 A for bulbs and fans), each with its own fuse. Appliances sit in parallel across live and neutral, each
// with its own switch, so each gets the full 220 V; a metal-bodied appliance's body is joined to the earth wire (green),
// which goes to a metal plate deep in the ground. Currents are I = P/V, added up per circuit and set against its fuse:
// too many appliances overload it, a short circuit (live touching neutral) sends a very large current, and a live wire
// touching a metal body sends current to earth; either way the fuse melts and the circuit is cut.
import type {Key} from '../keys.ts';
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {round, type Vec} from '../vec.ts';
import {icon, num} from './energy-use.ts';
import {frame} from './vectors.ts';

type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};
export type Outlet = {name: string; watts: number; earth?: boolean};
export const DOMESTIC_SHOWS = ['house', 'staircase', 'ring'] as const;
type Way = 'up' | 'down';
export type DomesticSpec = Common & {
  verb: 'domestic_circuit';
  /** house (default): the wiring of a house; staircase: one lamp worked by two two-way switches; ring: the ring main. */
  show?: (typeof DOMESTIC_SHOWS)[number];
  /** house: 1 to 3 circuits, each with its fuse rating in A and 1 to 4 appliances. */
  circuits?: {rating: number; appliances: Outlet[]}[];
  /** house: fuses (default) or miniature circuit breakers, which trip and (reset: true) are switched on again once the
   * fault is removed. */
  protect?: 'fuse' | 'mcb';
  reset?: boolean;
  /** staircase: the switches' first positions, and which switch is flipped in turn. */
  start?: [Way, Way];
  toggles?: ('S1' | 'S2')[];
  /** ring: 2 to 6 sockets round the ring (at: the one in use, default the farthest), and the MCB's rating in A. */
  sockets?: Outlet[];
  rating?: number;
  /** overload: the appliances of the circuit `at` switched on until it carries more than its fuse allows; short: live
   * and neutral touch in appliance `at`; leak: the live wire touches the metal body of appliance `at`. */
  fault?: 'overload' | 'short' | 'leak';
  /** overload: the circuit (0, 1, ...); short and leak: the appliance, as [circuit, appliance]. */
  at?: number | [number, number];
  volts?: number;
  panel?: boolean;
  seconds?: number;
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const LIVE = '#e5484d', NEUTRAL = '#1d1d1f', EARTH = '#2fbf4a';   // the insulation colours, as the book gives them

/** Two two-way switches: the lamp is on when both connect the same wire of the pair between them. */
export const staircaseLamp = (s1: Way, s2: Way) => s1 === s2;
/** The ring's two ways to a socket a fraction f of the way round: the current divides inversely as their lengths
 * (resistances), so the shorter way carries more: I1 (the way of length f) = I(1 − f), I2 = I f. */
export const ringShares = (I: number, f: number) => ({I1: I * (1 - f), I2: I * f});
const ONLY: Record<string, (typeof DOMESTIC_SHOWS)[number][]> = {circuits: ['house'], fault: ['house'], protect: ['house'], reset: ['house'], start: ['staircase'], toggles: ['staircase'],
  sockets: ['ring'], rating: ['ring'], at: ['house', 'ring']};

export function domesticErrors(s: DomesticSpec): string[] {
  const e: string[] = [];
  if (s.show !== undefined && !DOMESTIC_SHOWS.includes(s.show)) return [`domestic_circuit: show is ${DOMESTIC_SHOWS.join(', ')}`];
  const show = s.show ?? 'house';
  for (const [f, shows] of Object.entries(ONLY)) if ((s as Record<string, unknown>)[f] !== undefined && !shows.includes(show)) e.push(`domestic_circuit: ${f} is for show ${shows.join(' or ')}, not ${show}`);
  if (s.seconds !== undefined && !(isNum(s.seconds) && s.seconds >= 6 && s.seconds <= 20)) e.push('domestic_circuit: seconds is 6 to 20');
  if (s.volts !== undefined && !(isNum(s.volts) && s.volts >= 100 && s.volts <= 250)) e.push('domestic_circuit: volts is the mains voltage, 100 to 250 (India: 220)');
  if (s.panel !== undefined && typeof s.panel !== 'boolean') e.push('domestic_circuit: panel is true or false');
  if (show === 'staircase') {
    if (s.start !== undefined && !(Array.isArray(s.start) && s.start.length === 2 && s.start.every(w => w === 'up' || w === 'down'))) e.push("domestic_circuit: start is the two switches' positions, e.g. ['up', 'down']");
    if (s.toggles !== undefined && !(Array.isArray(s.toggles) && s.toggles.length >= 1 && s.toggles.length <= 6 && s.toggles.every(t => t === 'S1' || t === 'S2'))) e.push("domestic_circuit: toggles is 1 to 6 flips in turn, each 'S1' (bottom of the stairs) or 'S2' (top)");
    return e;
  }
  if (show === 'ring') {
    if (!Array.isArray(s.sockets) || s.sockets.length < 2 || s.sockets.length > 6) return [...e, 'domestic_circuit: ring: sockets is a list of 2 to 6 {name, watts} round the ring'];
    s.sockets.forEach((a, j) => {
      if (typeof a?.name !== 'string' || !a.name.trim() || a.name.length > 18) e.push(`domestic_circuit: sockets[${j}].name is a short name (up to 18 letters)`);
      if (!(isNum(a?.watts) && a.watts > 0 && a.watts <= 10000)) e.push(`domestic_circuit: sockets[${j}].watts is the power of what is plugged in, above 0 and up to 10000 W`);
    });
    if (s.at !== undefined && !(Number.isInteger(s.at) && (s.at as number) >= 0 && (s.at as number) < s.sockets.length)) e.push(`domestic_circuit: ring: at is the socket in use, 0 to ${s.sockets.length - 1}`);
    if (s.rating !== undefined && !(isNum(s.rating) && s.rating > 0 && s.rating <= 63)) e.push('domestic_circuit: rating is the ring\'s MCB in A (about 30), up to 63');
    const use = s.sockets[typeof s.at === 'number' ? s.at : Math.floor((s.sockets.length - 1) / 2)];
    if (isNum(use?.watts) && isNum(s.rating ?? 30) && use.watts / (s.volts ?? 220) > (s.rating ?? 30)) e.push(`domestic_circuit: ring: ${use.name} takes ${num(use.watts / (s.volts ?? 220))} A, over the ${s.rating ?? 30} A MCB: a smaller load or a larger rating`);
    return e;
  }
  if (s.protect !== undefined && !['fuse', 'mcb'].includes(s.protect)) e.push('domestic_circuit: protect is fuse or mcb (a miniature circuit breaker)');
  if (s.reset !== undefined && typeof s.reset !== 'boolean') e.push('domestic_circuit: reset is true or false');
  if (s.reset && s.protect !== 'mcb') e.push('domestic_circuit: reset needs protect mcb (a melted fuse is replaced, not reset)');
  if (s.reset && !s.fault) e.push('domestic_circuit: reset needs a fault for the MCB to trip on');
  if (!Array.isArray(s.circuits) || s.circuits.length < 1 || s.circuits.length > 3) return [...e, 'domestic_circuit: circuits is a list of 1 to 3 {rating, appliances}'];
  s.circuits.forEach((c, i) => {
    if (!(isNum(c?.rating) && c.rating > 0 && c.rating <= 63)) e.push(`domestic_circuit: circuits[${i}].rating is its fuse in A (5 for lights and fans, 15 for heaters), up to 63`);
    if (!Array.isArray(c?.appliances) || c.appliances.length < 1 || c.appliances.length > 4) { e.push(`domestic_circuit: circuits[${i}].appliances is a list of 1 to 4 {name, watts, earth?}`); return; }
    c.appliances.forEach((a, j) => {
      if (typeof a?.name !== 'string' || !a.name.trim() || a.name.length > 18) e.push(`domestic_circuit: circuits[${i}].appliances[${j}].name is a short name (up to 18 letters)`);
      if (!(isNum(a?.watts) && a.watts > 0 && a.watts <= 10000)) e.push(`domestic_circuit: circuits[${i}].appliances[${j}].watts is its power, above 0 and up to 10000 W`);
      if (a?.earth !== undefined && typeof a.earth !== 'boolean') e.push(`domestic_circuit: circuits[${i}].appliances[${j}].earth is true (a metal body joined to the earth wire) or false`);
    });
  });
  if (s.fault !== undefined && !['overload', 'short', 'leak'].includes(s.fault)) e.push('domestic_circuit: fault is overload, short or leak');
  const n = s.circuits.length;
  if (s.fault === 'overload') {
    const c = typeof s.at === 'number' ? s.at : 0, V = s.volts ?? 220;
    if (s.at !== undefined && !(Number.isInteger(s.at) && (s.at as number) >= 0 && (s.at as number) < n)) e.push(`domestic_circuit: overload: at is the circuit, 0 to ${n - 1}`);
    else if (s.circuits[c]?.appliances?.every(a => isNum(a?.watts)) && s.circuits[c].appliances.reduce((t, a) => t + a.watts, 0) / V <= s.circuits[c].rating)
      e.push(`domestic_circuit: overload: circuit ${c}'s appliances take ${num(s.circuits[c].appliances.reduce((t, a) => t + a.watts, 0) / V)} A, within its ${s.circuits[c].rating} A fuse: add appliances or lower its rating`);
  }
  if (s.fault === 'short' || s.fault === 'leak') {
    const at = s.at;
    if (!(Array.isArray(at) && at.length === 2 && Number.isInteger(at[0]) && Number.isInteger(at[1]) && s.circuits[at[0]]?.appliances?.[at[1]]))
      e.push(`domestic_circuit: ${s.fault}: at is [circuit, appliance], e.g. [0, 1]`);
  }
  if (s.at !== undefined && !s.fault) e.push('domestic_circuit: at goes with a fault');
  s.circuits.forEach((c, i) => {
    const I = Array.isArray(c?.appliances) && c.appliances.every(a => isNum(a?.watts)) ? c.appliances.reduce((t, a) => t + a.watts, 0) / (s.volts ?? 220) : 0;
    if (isNum(c?.rating) && I > c.rating && !(s.fault === 'overload' && (s.at ?? 0) === i))
      e.push(`domestic_circuit: circuit ${i}'s appliances take ${num(I)} A, over its ${c.rating} A fuse: fewer or smaller appliances, a higher rating, or fault overload at ${i}`);
  });
  if (s.reset && s.fault === 'leak' && Array.isArray(s.at) && s.circuits[s.at[0]]?.appliances?.[s.at[1]]?.earth === false)
    e.push('domestic_circuit: reset: without an earth wire the leak trips nothing (the body stays live); give the appliance earth: true');
  return e;
}

export function domesticCircuit(s: DomesticSpec): Scene {
  if (s.show === 'staircase') return staircase(s);
  if (s.show === 'ring') return ringMain(s);
  const circuits = s.circuits ?? [], mcb = s.protect === 'mcb';
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, panel = s.panel !== false, V = s.volts ?? 220;
  // A half-width part (narrow) reflows: the title on top, the house across the box with its supply drawn closer
  // together, and the words under it (2026-11-05: at 960 px the fixed layout ran its fuse labels and currents under
  // the panel's sentences).
  const narrow = W < 1.3 * H, fr = narrow && panel ? frame(W, H, k, s.title) : undefined;
  const left = 0.03 * W, right = panel && !narrow ? 0.63 * W : 0.97 * W, top = fr ? fr.box[1] : (panel ? 0.12 : s.title ? 0.22 : 0.13) * H;
  let bottom = 0.95 * H;
  const T = s.seconds ?? (s.reset ? 15 : 12), props: Prop[] = [], facts: string[] = [], anchors: Record<string, Vec> = {};
  const text = (id: string, value: string, [x, y]: Vec, fill = 'ink', size = 22, show: [number, number] = [0, 1e9], align: 'start' | 'middle' | 'end' = 'middle', weight = 700) =>
    props.push({id, type: 'text', x: round(x, 2), y: round(y, 2), text: value, size: size * k, align, weight, show, fade: 0.3, style: {fill, stroke: 'paper', width: 5 * k}, layer: 9});
  const wire = (id: string, pts: Vec[], colour: string, show: [number, number] = [0, 1e9], layer = 3) => {
    const points = pts.map(([x, y]) => [round(x, 2), round(y, 2)] as Vec);
    // Black insulation shows on a dark page with a pale edge under it.
    if (colour === NEUTRAL) props.push({id: `${id}-edge`, type: 'polyline', points, show, style: {stroke: 'muted', width: 9 * k}, layer});
    props.push({id, type: 'polyline', points, show, style: {stroke: colour, width: 5 * k}, layer});
  };
  // When each appliance switches on, and when a fault cuts its circuit.
  const order: [number, number][] = [];
  circuits.forEach((c, i) => c.appliances.forEach((_, j) => order.push([i, j])));
  const t0 = 1.2, faultAt = s.fault ? Math.max(t0 + 0.7 * order.length + 0.6, T * (s.reset ? 0.45 : 0.6)) : 1e9;
  const onAt = (i: number, j: number) => t0 + 0.7 * order.findIndex(([a, b]) => a === i && b === j);
  const overloaded = s.fault === 'overload' ? (typeof s.at === 'number' ? s.at : 0) : -1;
  const faultCircuit = s.fault === 'overload' ? overloaded : Array.isArray(s.at) ? s.at[0] : -1;
  // An overloaded circuit's fuse melts as soon as its current passes the rating.
  const cutAt = circuits.map((c, i) => {
    if (i === overloaded) { let I = 0; for (let j = 0; j < c.appliances.length; j++) { I += c.appliances[j].watts / V; if (I > c.rating) return onAt(i, j) + 0.6; } }
    return i === faultCircuit ? faultAt + 0.6 : 1e9;
  });
  const leakSafe = s.fault === 'leak' && Array.isArray(s.at) && circuits[s.at[0]].appliances[s.at[1]].earth !== false;
  if (s.fault === 'leak' && !leakSafe) cutAt[faultCircuit] = 1e9;   // no earth wire: nothing makes the fuse blow, the body stays live
  // An MCB, once tripped, is switched on again (reset) after the fault is removed: the overloading appliance or the
  // faulty one switched off first.
  const fixAt = cutAt.map(c => (mcb && s.reset && c < 1e9 ? c + 1.4 : 1e9)), resetAt = fixAt.map(f => (f < 1e9 ? f + 1 : 1e9));
  const removed = circuits.map((c, i) => {
    if (resetAt[i] >= 1e9) return -1;
    if (i === overloaded) { let I = 0; for (let j = 0; j < c.appliances.length; j++) { I += c.appliances[j].watts / V; if (I > c.rating) return j; } }
    return Array.isArray(s.at) && s.at[0] === i ? s.at[1] : -1;
  });
  const until = Math.max(...resetAt.filter(r => r < 1e9), 0), dur = until ? Math.max(T, until + 2) : T;
  const blows = mcb ? 'the MCB trips' : 'the fuse melts';
  /** The panel's sentences, known before the drawing so a narrow part can leave room for them under it. */
  const words = () => {
    const lines = [`Live (red) and neutral (black): ${V} V AC; earth (green) to a plate in the ground`, 'Appliances in parallel: each gets the full voltage and has its own switch',
      ...circuits.map((c, i) => `circuit ${i + 1}: ${num(c.appliances.reduce((t, a) => t + a.watts / V, 0))} A on a ${num(c.rating)} A ${mcb ? 'MCB' : 'fuse'}`)];
    if (s.fault === 'overload') lines.push(`Too many appliances: the current exceeds the ${mcb ? 'MCB' : 'fuse'} rating, ${blows}`);
    if (s.fault === 'short') lines.push(`Short circuit: live touches neutral, the current increases heavily; ${blows}`);
    if (s.fault === 'leak') lines.push(leakSafe ? `The earth wire carries the leaking current to the ground: ${mcb ? 'the MCB trips' : 'the fuse blows'}, the user is safe` : 'Without an earth wire the metal body stays live: a severe shock');
    if (mcb && until) lines.push('Remove the fault, then switch the MCB on again: no fuse wire to replace');
    return lines;
  };
  // The supply: live and neutral from the pole, through the meter and the main fuse to the distribution box.
  const yL = top + 70 * k, yN = top + 110 * k, meterW = (narrow ? 130 : 150) * k, meterX = left + (narrow ? 40 : 120) * k, fuseX = left + (narrow ? 268 : 360) * k,
    boxX = left + (narrow ? 312 : 440) * k, boxW = (narrow ? 150 : 170) * k, busX = boxX + 40 * k;
  text('mains', `mains ${V} V, 50 Hz AC`, [left, yL - 40 * k], 'ink', 22, [0, 1e9], 'start');
  wire('supply-live', [[left, yL], [boxX, yL]], LIVE); wire('supply-neutral', [[left, yN], [boxX, yN]], NEUTRAL);
  props.push({id: 'meter', type: 'rect', x: round(meterX, 2), y: round(yL - 30 * k, 2), w: meterW, h: 90 * k, r: 8 * k, style: {fill: 'paper', stroke: 'muted', width: 3 * k}, layer: 5},
    {id: 'main-fuse', type: 'rect', x: round(fuseX - 25 * k, 2), y: round(yL - 10 * k, 2), w: 50 * k, h: 20 * k, r: 4 * k, style: {fill: 'paper', stroke: 'accent', width: 3 * k}, layer: 5},
    {id: 'box', type: 'rect', x: round(boxX, 2), y: round(yL - 30 * k, 2), w: round(boxW, 2), h: 90 * k, r: 8 * k, style: {fill: 'paper', stroke: 'muted', width: 3 * k}, layer: 5});
  text('meter-label', 'electricity meter', [meterX + meterW / 2, yL + 22 * k], 'muted', 18);
  text('main-fuse-label', 'main fuse', [fuseX, yL - 18 * k], 'accent', 18);
  text('box-label', 'distribution box', [boxX + boxW / 2, yL + 22 * k], 'muted', 18);
  anchors.meter = [round(meterX + meterW / 2, 2), round(yL + 15 * k, 2)]; anchors.main_fuse = [round(fuseX, 2), round(yL, 2)]; anchors.distribution_box = [round(boxX + boxW / 2, 2), round(yL + 15 * k, 2)];
  // Earth: a plate deep in the ground near the house, its wire running up beside the bus.
  const yTop = top + 170 * k, rows = circuits.length;
  const lines = words(), pw = fr ? W - fr.px - 40 * k : 0, wordsH = lines.reduce((h, l) => h + wrapText(l, 28 * k, pw).length * 1.3 * 28 * k + 12 * k, 0);
  // appliances' names wider than their spacing take two rows, alternately, and their circuit a taller row
  const nameW = (a: Outlet) => 0.55 * 18 * k * `${a.name} ${num(a.watts)} W`.length;
  const crowded = (c: {appliances: Outlet[]}) => c.appliances.length > 1 && Math.max(...c.appliances.map(nameW)) > (right - 10 * k - busX - 260 * k) / (c.appliances.length - 1) - 8 * k;
  if (fr) bottom = Math.min(0.95 * H, Math.max(H - 60 * k - wordsH, yTop + 70 * k + rows * (circuits.some(crowded) ? 180 : 140) * k));
  const rowH = Math.min(270 * k, (bottom - 70 * k - yTop) / rows), eX = busX + 36 * k;
  const plate: Vec = [eX, bottom - 20 * k];
  props.push({id: 'ground', type: 'line', x1: round(left, 2), y1: round(bottom - 50 * k, 2), x2: round(right, 2), y2: round(bottom - 50 * k, 2), style: {stroke: 'faint', width: 3 * k, dash: [10 * k, 8 * k]}, layer: 1},
    {id: 'plate', type: 'rect', x: round(plate[0] - 40 * k, 2), y: round(plate[1] - 6 * k, 2), w: 80 * k, h: 12 * k, style: {fill: 'muted'}, layer: 4});
  text('plate-label', 'earth: a metal plate deep in the ground', [plate[0] + 56 * k, plate[1] + 6 * k], EARTH, 18, [0, 1e9], 'start');
  anchors.earth_plate = plate;
  // The bus down from the distribution box, and each circuit's row.
  const lastRow = yTop + (rows - 1) * rowH;
  wire('bus-live', [[busX, yL + 60 * k], [busX, lastRow]], LIVE); wire('bus-neutral', [[busX + 18 * k, yL + 60 * k], [busX + 18 * k, lastRow + 0.55 * rowH]], NEUTRAL);
  wire('bus-earth', [[eX, yL + 60 * k], [eX, plate[1]]], EARTH, [0, 1e9], 2);
  circuits.forEach((c, i) => {
    const rL = yTop + i * rowH, rN = rL + 0.55 * rowH, rE = rL + 0.75 * rowH, x0 = busX, x1 = right - 10 * k, cut = cutAt[i];
    const fX = x0 + 110 * k;
    wire(`c${i}-live`, [[x0, rL], [x1, rL]], LIVE); wire(`c${i}-neutral`, [[x0 + 18 * k, rN], [x1, rN]], NEUTRAL); wire(`c${i}-earth`, [[eX, rE], [x1, rE]], EARTH, [0, 1e9], 2);
    // The circuit's fuse: whole, then melted and gapped once it is cut. An MCB: its lever up (on), down once tripped,
    // and up again when reset.
    const re = resetAt[i];
    if (mcb) {
      const up = round(rL - 24 * k, 2), dn = round(rL + 24 * k, 2), lk: Key[] = [[0, up]];
      if (cut < 1e9) lk.push([cut, up], [cut + 0.08, dn, 'in']);
      if (re < 1e9) lk.push([re - 0.25, dn], [re, up, 'out']);
      props.push({id: `c${i}-mcb`, type: 'rect', x: round(fX - 28 * k, 2), y: round(rL - 16 * k, 2), w: 56 * k, h: 32 * k, r: 4 * k, style: {fill: 'paper', stroke: 'accent', width: 3 * k}, layer: 6},
        {id: `c${i}-mcb-lever`, type: 'line', x1: round(fX, 2), y1: round(rL, 2), x2: round(fX, 2), y2: up, style: {stroke: 'ink', width: 7 * k, cap: 'round'}, layer: 7, ...(lk.length > 1 ? {keys: {y2: lk}} : {})});
    } else props.push({id: `c${i}-fuse`, type: 'rect', x: round(fX - 28 * k, 2), y: round(rL - 11 * k, 2), w: 56 * k, h: 22 * k, r: 4 * k, show: [0, cut], style: {fill: 'paper', stroke: 'accent', width: 3 * k}, layer: 6},
      {id: `c${i}-fuse-wire`, type: 'line', x1: round(fX - 24 * k, 2), y1: round(rL, 2), x2: round(fX + 24 * k, 2), y2: round(rL, 2), show: [0, cut], style: {stroke: 'ink', width: 2 * k}, layer: 7});
    if (cut < 1e9 && !mcb) props.push({id: `c${i}-fuse-blown`, type: 'rect', x: round(fX - 28 * k, 2), y: round(rL - 11 * k, 2), w: 56 * k, h: 22 * k, r: 4 * k, show: [cut, 1e9], style: {fill: 'paper', stroke: 'bad', width: 4 * k}, layer: 6},
      ...[-1, 1].map(d => ({id: `c${i}-fuse-end${d}`, type: 'line' as const, x1: round(fX + d * 24 * k, 2), y1: round(rL, 2), x2: round(fX + d * 8 * k, 2), y2: round(rL + 5 * k, 2), show: [cut, 1e9] as [number, number], style: {stroke: 'bad', width: 2.5 * k}, layer: 7})));
    text(`c${i}-rating`, `${num(c.rating)} A ${mcb ? 'MCB' : 'fuse'}`, [fX, rL - (mcb ? 34 : 20) * k], 'accent', 18);
    // an MCB's state is written on the wire's line, after the current readout
    // (narrow: above the readout, where the line has room)
    const state: Vec = narrow ? [fX + 75 * k, rL - 38 * k] : [fX + 200 * k, rL - 14 * k];
    if (cut < 1e9) text(`c${i}-melted`, mcb ? 'MCB trips: circuit off' : 'fuse melts: circuit cut', mcb ? state : [fX, rL + 30 * k], 'bad', 18, [cut, re], mcb ? 'start' : 'middle');
    if (re < 1e9) text(`c${i}-reset`, 'fault removed: MCB switched on again', state, 'good', 18, [re, 1e9], 'start');
    anchors[`fuse${i}`] = [round(fX, 2), round(rL, 2)];
    // Appliances across live and neutral, each with its own switch.
    const n = c.appliances.length, xa = (j: number) => fX + 90 * k + (x1 - fX - 150 * k) * (n === 1 ? 0.5 : j / (n - 1));
    const Ikeys: Key[] = [[0, 0]];
    let I = 0;
    c.appliances.forEach((a, j) => {
      const x = xa(j), on = onAt(i, j), off = Math.min(cut, 1e9), mid: Vec = [x, (rL + rN) / 2 + 8 * k], sw = rL + 0.18 * (rN - rL);
      wire(`c${i}a${j}-up`, [[x, rL], [x, sw - 14 * k]], LIVE); wire(`c${i}a${j}-down`, [[x, mid[1] + 30 * k], [x, rN]], NEUTRAL);
      wire(`c${i}a${j}-in`, [[x, sw + 14 * k], [x, mid[1] - 34 * k]], LIVE);
      // The switch: open, then closed when the appliance is switched on.
      const out = removed[i] === j, fx = fixAt[i];
      props.push({id: `c${i}a${j}-switch`, type: 'line', x1: round(x, 2), y1: round(sw - 14 * k, 2), x2: round(x + 22 * k, 2), y2: round(sw + 10 * k, 2),
        keys: {x2: [[on - 0.2, round(x + 22 * k, 2)], [on, round(x, 2), 'out'], ...(out ? [[fx - 0.2, round(x, 2)], [fx, round(x + 22 * k, 2), 'out']] as Key[] : [])],
          y2: [[on - 0.2, round(sw + 10 * k, 2)], [on, round(sw + 14 * k, 2), 'out'], ...(out ? [[fx - 0.2, round(sw + 14 * k, 2)], [fx, round(sw + 10 * k, 2), 'out']] as Key[] : [])]},
        style: {stroke: 'ink', width: 4 * k}, layer: 6});
      if (re < 1e9 && !out) props.push(...icon(a.name, mid, 0.7 * k, `c${i}a${j}-icon-again`, re));
      props.push({id: `c${i}a${j}-housing`, type: 'rect', x: round(x - 38 * k, 2), y: round(mid[1] - 34 * k, 2), w: 76 * k, h: 64 * k, r: 8 * k, style: {fill: 'paper', stroke: a.earth ? 'muted' : 'faint', width: a.earth ? 4 * k : 2 * k}, layer: 4},
        ...icon(a.name, mid, 0.7 * k, `c${i}a${j}-icon`, on, off));
      if (a.earth) wire(`c${i}a${j}-earth`, [[x + 38 * k, mid[1] + 20 * k], [x + 50 * k, mid[1] + 20 * k], [x + 50 * k, rE]], EARTH, [0, 1e9], 2);
      // names wider than their spacing take two lines, alternately
      text(`c${i}a${j}-name`, `${a.name} ${num(a.watts)} W`, [x, rN + (crowded(c) && j % 2 ? 46 : 26) * k], 'ink', 18, [0, 1e9], 'middle', 400);
      text(`c${i}a${j}-amps`, `${num(a.watts / V)} A`, [x - 44 * k, mid[1] + 6 * k], 'accent', 18, [on, off], 'end');
      if (re < 1e9 && !out) text(`c${i}a${j}-amps-again`, `${num(a.watts / V)} A`, [x - 44 * k, mid[1] + 6 * k], 'accent', 18, [re, 1e9], 'end');
      I += a.watts / V; Ikeys.push([on - 0.01, Ikeys.at(-1)![1]], [on, round(I, 2)]);
      anchors[`c${i}a${j}`] = [round(x, 2), round(mid[1], 2)];
    });
    if (cut < 1e9) Ikeys.push([cut - 0.01, Ikeys.at(-1)![1]], [cut, 0]);
    if (re < 1e9) Ikeys.push([re - 0.01, 0], [re, round(c.appliances.reduce((t, a, j) => t + (j === removed[i] ? 0 : a.watts / V), 0), 2)]);
    props.push({id: `c${i}-current`, type: 'readout', x: round(fX + 75 * k, 2), y: round(rL - 14 * k, 2), size: 18 * k, weight: 700, text: 'I = {i} A', decimals: 2,
      measures: {i: {kind: 'keys', keys: Ikeys}}, style: {fill: 'accent'}, layer: 9});
    facts.push(`circuit ${i + 1} (${num(c.rating)} A ${mcb ? 'MCB' : 'fuse'}): ${c.appliances.map(a => `${a.name} ${num(a.watts)} W takes ${num(a.watts / V)} A`).join('; ')}; together ${num(I)} A`);
  });
  // Faults: a spark where they happen; with a leak and an earth wire, the current runs down to the plate.
  if (s.fault === 'short' || s.fault === 'leak') {
    const [i, j] = s.at as [number, number], p = anchors[`c${i}a${j}`];
    props.push({id: 'spark', type: 'polyline', points: [[-1, 0], [-0.3, 0.2], [0, 1], [0.3, 0.2], [1, 0], [0.3, -0.2], [0, -1], [-0.3, -0.2]].map(([a, b]) => [round(p[0] + (s.fault === 'leak' ? 38 : 0) * k + a * 26 * k, 2), round(p[1] - 30 * k + b * 26 * k, 2)] as Vec),
      closed: true, show: [faultAt, faultAt + 1.2], style: {fill: '#ffd23f', stroke: 'bad', width: 2 * k}, layer: 10});
    // narrow rows are short: under any but the last row the words would run into the next circuit, and the panel says them
    const room = !narrow || i === rows - 1;
    if (room) text('fault-label', s.fault === 'short' ? 'short circuit: live touches neutral' : 'live wire touches the metal body', [p[0], yTop + i * rowH + 0.75 * rowH + 30 * k], 'bad', 20, [faultAt, fixAt[i]]);
    if (s.fault === 'leak') {
      if (!room) { /* in the panel only */ } else if (leakSafe) text('earth-path', 'current flows to earth, not through you', [p[0], yTop + i * rowH + 0.75 * rowH + 58 * k], EARTH, 18, [faultAt + 0.3, fixAt[i]]);
      else text('shock', 'no earth wire: touching it gives a severe shock', [p[0], yTop + i * rowH + 0.75 * rowH + 58 * k], 'bad', 20, [faultAt + 0.3, 1e9]);
    }
  }
  // The words.
  facts.push(`mains electricity in India is AC at ${V} V and 50 Hz; the live wire has red insulation, the neutral black, and the earth wire green`,
    'appliances are connected in parallel across live and neutral, each with its own switch, so each gets the same potential difference; separate circuits are used: 15 A for high-power appliances like geysers and heaters, 5 A for bulbs and fans',
    'the current an appliance takes is I = P/V; the currents of a circuit\'s appliances add up');
  if (s.fault === 'overload') { facts.push('overloading: when too many appliances are switched on in one circuit the current exceeds its rating; the fuse wire melts and breaks the circuit, protecting the wiring and appliances'); }
  if (s.fault === 'short') { facts.push('a short circuit happens when the live and neutral wires touch directly (damaged insulation, a fault in an appliance): the resistance is tiny, the current increases heavily, and the fuse melts'); }
  if (s.fault === 'leak') {
    facts.push('the earth wire is joined to the metal bodies of appliances such as electric irons, toasters and refrigerators: if the live wire touches the body, current flows to the earth through this low-resistance path, so the user gets no severe shock and the fuse blows');
  }
  if (mcb) {
    facts.push('a miniature circuit breaker (MCB) in each circuit switches it off within a very short time (about 25 ms) when the current exceeds its rating, from overloading or a short circuit; once the fault is removed it is simply switched on again, which is easier and safer than replacing a fuse wire');
  }
  if (fr) {
    // narrow: the title on top, the words under the drawing (any that would run off the bottom are left out)
    props.push(...fr.titles);
    let row = bottom + 30 * k;
    lines.forEach((value, j) => {
      const h = wrapText(value, 28 * k, pw).length * 1.3 * 28 * k;
      if (row + h > H - 20 * k) return;
      props.push({id: `say${j}`, type: 'text', x: fr.px, y: row, text: value, size: 28 * k, width: pw, weight: j ? 400 : 700, show: [0.6 + 1.2 * j, 1e9], fade: 0.3});
      row += h + 12 * k;
    });
  } else if (panel) {
    const px = 0.66 * W, pw = W - px - 40 * k;
    let row = 0.14 * H;
    if (s.title) { props.push({id: 'title', type: 'text', x: px, y: row, text: s.title, size: 44 * k, weight: 700, width: pw}); row += wrapText(s.title, 44 * k, pw).length * 1.25 * 44 * k + 18 * k; }
    lines.forEach((value, j) => { props.push({id: `say${j}`, type: 'text', x: px, y: row, text: value, size: 28 * k, width: pw, weight: j ? 400 : 700, show: [0.6 + 1.2 * j, 1e9], fade: 0.3}); row += wrapText(value, 28 * k, pw).length * 1.3 * 28 * k + 12 * k; });
  } else if (s.title) props.push({id: 'title', type: 'text', x: left, y: 0.16 * H, text: s.title, size: 44 * k, weight: 700, width: 0.92 * W});
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: dur, theme: s.theme ?? 'dark', props, actors: [], meta: {verb: 'domestic_circuit', facts, anchors}};
}

// ---- staircase wiring and the ring main (ICSE Class 10 Household Circuits, 9.3 and 9.6; 2026-11-05) -------------------

/** The box, panel and helpers the two diagrams share; laid out by the frame, so a half-width part reflows. */
function sheet(s: DomesticSpec) {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, fr = frame(W, H, k, s.title), [bx, by, x1, y1] = fr.box, bw = x1 - bx, bh = y1 - by, S = Math.min(bw, bh);
  const props: Prop[] = [...fr.titles];
  let n = 0; const id = (p: string) => `${p}${n++}`, r2 = (v: number) => round(v, 2);
  const text = (x: number, y: number, t: string, fill = 'ink', size = 22, show: [number, number] = [0, 1e9], align: 'start' | 'middle' | 'end' = 'middle', weight = 700) =>
    props.push({id: id('t'), type: 'text', x: r2(x), y: r2(y), text: t, size: size * k, align, weight, show, fade: 0.3, style: {fill, stroke: 'paper', width: 5 * k}, layer: 9} as Prop);
  const wire = (pts: Vec[], colour: string, show: [number, number] = [0, 1e9], layer = 3, width = 5) => {
    const points = pts.map(([x, y]) => [r2(x), r2(y)] as Vec);
    if (colour === NEUTRAL) props.push({id: id('edge'), type: 'polyline', points, show, style: {stroke: 'muted', width: (width + 4) * k}, layer} as Prop);
    props.push({id: id('w'), type: 'polyline', points, show, style: {stroke: colour, width: width * k}, layer} as Prop);
  };
  const glow = (pts: Vec[], show: [number, number]) => props.push({id: id('g'), type: 'polyline', points: pts.map(([x, y]) => [r2(x), r2(y)] as Vec), show, fade: 0.2, style: {stroke: 'accent', width: 14 * k, opacity: 0.35}, layer: 1} as Prop);
  const dot = (p: Vec, r: number, fill: string, layer = 6) => props.push({id: id('d'), type: 'circle', x: r2(p[0]), y: r2(p[1]), r: r2(r), style: {fill, stroke: 'ink', width: 2 * k}, layer} as Prop);
  const caps: {t: number; text: string; bold?: boolean; fill?: string}[] = [];
  const say = (t: number, value: string, bold = false, fill?: string) => caps.push({t, text: value, bold, fill});
  const finish = (dur: number, facts: string[], anchors: Record<string, Vec>): Scene => {
    if (s.panel !== false) {
      const px = fr.px, pw = W - px - 40 * k, size = 28 * k;
      let row = fr.row;
      caps.forEach((c, i) => {
        const h = wrapText(c.text, size, pw).length * 1.28 * size;
        if (row + h > H - 20 * k) return;
        props.push({id: `say${i}`, type: 'text', x: r2(px), y: r2(row), text: c.text, size, width: pw, weight: c.bold ? 700 : 400, show: [c.t, 1e9], fade: 0.3, ...(c.fill ? {style: {fill: c.fill}} : {})} as Prop);
        row += h + 10 * k;
      });
    }
    return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: dur, theme: s.theme ?? 'dark', props, actors: [],
      meta: {verb: 'domestic_circuit', facts, anchors: Object.fromEntries(Object.entries(anchors).map(([n, p]) => [n, [r2(p[0]), r2(p[1])] as Vec]))}};
  };
  return {W, H, k, bx, by, bw, bh, S, props, id, text, wire, glow, dot, say, finish};
}

/** One lamp worked from the bottom and the top of the stairs: each two-way switch joins its common terminal to the upper
 * or the lower of two wires running between them; the lamp lights when both pick the same wire. */
function staircase(s: DomesticSpec): Scene {
  const {k, bx, by, bw, bh, S, props, text, wire, glow, dot, say, finish} = sheet(s);
  const start = s.start ?? ['up', 'down'], toggles = s.toggles ?? ['S1', 'S2', 'S1'], V = s.volts ?? 220;
  const states: {t: number; s1: Way; s2: Way}[] = [{t: 0, s1: start[0], s2: start[1]}];
  toggles.forEach((w, i) => { const p = states[states.length - 1], flip = (x: Way): Way => (x === 'up' ? 'down' : 'up'); states.push({t: 1.8 + 2.2 * i, s1: w === 'S1' ? flip(p.s1) : p.s1, s2: w === 'S2' ? flip(p.s2) : p.s2}); });
  const dur = Math.max(s.seconds ?? 0, states[states.length - 1].t + 2.6);
  const dx = 0.08 * bw, dy = Math.max(0.06 * bh, 22 * k), run = 0.06 * bw;
  const P1: Vec = [bx + 0.2 * bw, by + 0.7 * bh], P2: Vec = [bx + 0.72 * bw, by + 0.3 * bh];
  const T1 = {up: [P1[0] + dx, P1[1] - dy] as Vec, down: [P1[0] + dx, P1[1] + dy] as Vec}, T2 = {up: [P2[0] - dx, P2[1] - dy] as Vec, down: [P2[0] - dx, P2[1] + dy] as Vec};
  // the stairs, under the wiring
  const st0: Vec = [bx + 0.06 * bw, by + 0.98 * bh], st1: Vec = [bx + 0.48 * bw, by + 0.56 * bh], steps = 5, pts: Vec[] = [st0];
  for (let i = 0; i < steps; i++) { const x = st0[0] + (st1[0] - st0[0]) * (i + 1) / steps, y = st0[1] + (st1[1] - st0[1]) * i / steps; pts.push([pts[pts.length - 1][0], y], [x, y]); }
  props.push({id: 'stairs', type: 'polyline', points: pts.map(([x, y]) => [round(x, 2), round(y, 2)] as Vec), style: {stroke: 'faint', width: 4 * k}, layer: 0} as Prop);
  // the two wires between the switches
  const strap = (w: Way): Vec[] => [T1[w], [T1[w][0] + run, T1[w][1]], [T2[w][0] - run, T2[w][1]], T2[w]];
  wire(strap('up'), LIVE); wire(strap('down'), LIVE);
  // mains, live to S1's common; S2's common to the lamp, and the lamp back on the neutral
  const mx = bx + 0.03 * bw, lamp: Vec = [P2[0] + 0.12 * bw, by + 0.08 * bh], top = lamp[1];
  const live: Vec[] = [[mx, P1[1]], P1], toLamp: Vec[] = [P2, [lamp[0], P2[1]], [lamp[0], lamp[1] + 24 * k]], back: Vec[] = [[lamp[0] - 24 * k, top], [mx + 14 * k, top], [mx + 14 * k, P1[1] - 0.16 * bh]];
  wire(live, LIVE); wire(toLamp, LIVE); wire(back, NEUTRAL);
  props.push({id: 'mains', type: 'rect', x: round(mx - 0.03 * bw, 2), y: round(P1[1] - 0.16 * bh, 2), w: round(0.05 * bw + 14 * k, 2), h: round(0.16 * bh + 14 * k, 2), r: 6 * k, style: {fill: 'paper', stroke: 'muted', width: 3 * k}, layer: 4} as Prop);
  text(mx + 8 * k, P1[1] + 46 * k, `mains ${V} V`, 'muted', 20);
  text(mx + 0.06 * bw, P1[1] - 22 * k, 'live', LIVE, 18, [0, 1e9], 'start'); text(mx + 24 * k, top + 26 * k, 'neutral', 'ink', 18, [0, 1e9], 'start');
  // the switches: common terminal, two contacts, the blade keyed to each state
  const sw = (name: string, P: Vec, T: {up: Vec; down: Vec}, pick: (q: {s1: Way; s2: Way}) => Way, side: number, label: string) => {
    props.push({id: `${name}-box`, type: 'rect', x: round(Math.min(P[0], T.up[0]) - 18 * k, 2), y: round(T.up[1] - 22 * k, 2), w: round(dx + 36 * k, 2), h: round(2 * dy + 44 * k, 2), r: 8 * k, style: {stroke: 'muted', width: 2 * k, dash: [6 * k, 5 * k]}, layer: 2} as Prop);
    dot(P, 7 * k, 'ink'); dot(T.up, 6 * k, 'paper'); dot(T.down, 6 * k, 'paper');
    const end = (w: Way): Vec => [T[w][0] - side * 6 * k, T[w][1] + (w === 'up' ? 4 : -4) * k];
    const kx: Key[] = [], ky: Key[] = [];
    states.forEach((q, i) => { const e = end(pick(q)); if (i) { const p = end(pick(states[i - 1])); kx.push([q.t - 0.25, round(p[0], 2)]); ky.push([q.t - 0.25, round(p[1], 2)]); } kx.push([q.t, round(e[0], 2), 'inOut']); ky.push([q.t, round(e[1], 2), 'inOut']); });
    const e0 = end(pick(states[0]));
    props.push({id: `${name}-blade`, type: 'line', x1: round(P[0], 2), y1: round(P[1], 2), x2: round(e0[0], 2), y2: round(e0[1], 2), style: {stroke: 'ink', width: 6 * k, cap: 'round'}, layer: 7, keys: {x2: kx, y2: ky}} as Prop);
    text((P[0] + T.up[0]) / 2, T.up[1] - 32 * k, name, 'ink', 26);
    text((P[0] + T.up[0]) / 2, T.down[1] + 48 * k, label, 'muted', 19);
  };
  sw('S1', P1, T1, q => q.s1, 1, 'bottom of the stairs'); sw('S2', P2, T2, q => q.s2, -1, 'top of the stairs');
  // the lamp, lit while both switches pick the same wire; the live path glows
  props.push({id: 'lamp-off', type: 'circle', x: round(lamp[0], 2), y: round(lamp[1], 2), r: round(24 * k, 2), style: {fill: 'paper', stroke: 'muted', width: 3 * k}, layer: 5} as Prop);
  text(lamp[0] + 34 * k, lamp[1] + 8 * k, 'lamp', 'muted', 20, [0, 1e9], 'start');
  states.forEach((q, i) => {
    const t1 = i + 1 < states.length ? states[i + 1].t : 1e9, on = staircaseLamp(q.s1, q.s2);
    if (!on) return;
    props.push({id: `lamp-on${i}`, type: 'circle', x: round(lamp[0], 2), y: round(lamp[1], 2), r: round(24 * k, 2), show: [q.t, t1], fade: 0.15, style: {fill: 'accent', stroke: 'ink', width: 3 * k}, layer: 6} as Prop,
      {id: `lamp-rays${i}`, type: 'polyline', points: Array.from({length: 9}, (_, j) => { const a = Math.PI * (1 + j / 8), r = (j % 2 ? 34 : 44) * k; return [round(lamp[0] + r * Math.cos(a), 2), round(lamp[1] + r * Math.sin(a), 2)] as Vec; }), show: [q.t, t1], fade: 0.15, style: {stroke: 'accent', width: 3 * k, dash: [4 * k, 6 * k]}, layer: 5} as Prop);
    const w = q.s1;
    glow([...live, T1[w], ...strap(w), P2, ...toLamp.slice(1)], [q.t, t1]);
  });
  // the truth table, a row as each state is reached
  const cw = Math.min(0.12 * bw, 130 * k), tx = bx + bw - 2.5 * cw, ty = by + 0.66 * bh, rh = Math.max(28 * k, 0.065 * bh);   // right of the stairs
  ['S1', 'S2', 'lamp'].forEach((h, j) => text(tx + j * cw, ty, h, 'muted', 21));
  props.push({id: 'table-rule', type: 'line', x1: round(tx - cw / 2, 2), y1: round(ty + 8 * k, 2), x2: round(tx + 2.5 * cw, 2), y2: round(ty + 8 * k, 2), style: {stroke: 'faint', width: 2 * k}, layer: 3} as Prop);
  const seen: string[] = [];
  states.forEach(q => {
    const key = `${q.s1}${q.s2}`; if (seen.includes(key)) return; seen.push(key);
    const y = ty + seen.length * rh, on = staircaseLamp(q.s1, q.s2), show: [number, number] = [q.t + 0.2, 1e9];
    text(tx, y, q.s1, 'ink', 21, show, 'middle', 400); text(tx + cw, y, q.s2, 'ink', 21, show, 'middle', 400); text(tx + 2 * cw, y, on ? 'on' : 'off', on ? 'good' : 'bad', 21, show);
  });
  // the words
  const said = (q: {s1: Way; s2: Way}) => (staircaseLamp(q.s1, q.s2) ? 'the lamp comes on' : 'the lamp goes off');
  say(0.3, 'Staircase wiring: one lamp and two two-way switches, one at the bottom of the stairs and one at the top', true);
  say(0.9, `Each switch joins the live to one of two wires between them: ${staircaseLamp(start[0], start[1]) ? 'both pick the same wire, so the lamp is on' : 'they pick different wires, so the lamp is off'}`);
  states.slice(1).forEach((q, i) => say(q.t, `${toggles[i]} flipped at the ${toggles[i] === 'S1' ? 'bottom' : 'top'}: ${said(q)}`));
  say(states[states.length - 1].t + 0.8, 'Either switch changes the lamp: on when both pick the same wire, off when they differ', true);
  const facts = ['staircase (dual control) wiring uses two two-way switches, one at each end of the stairs, joined by two wires; the lamp can be switched on or off from either end',
    'the lamp is on when both switches connect the same wire and off when they connect different wires; flipping either switch changes it',
    'the switches are in the live wire, so a lamp that is off is cut off from the live supply'];
  return finish(dur, facts, {S1: P1, S2: P2, lamp, table: [tx + cw, ty]});
}

/** The ring main: live, neutral and earth leave the distribution box (with its MCB), run round the rooms and return to
 * it; sockets are tapped off in parallel, so each is fed from both sides and the current to one divides between the
 * two ways inversely as their lengths. */
function ringMain(s: DomesticSpec): Scene {
  const {k, bx, by, bw, bh, props, id, text, wire, dot, say, finish} = sheet(s);
  const sockets = s.sockets!, V = s.volts ?? 220, rating = s.rating ?? 30, use = typeof s.at === 'number' ? s.at : Math.floor((sockets.length - 1) / 2), dur = s.seconds ?? 11;
  const xl = bx + 0.2 * bw, xr = bx + 0.96 * bw, yt = by + 0.06 * bh, yb = by + 0.8 * bh, dbTop = yb - 0.1 * bh, dbR = xl + 0.06 * bw, gap = 15 * k;
  const path = (o: number): Vec[] => [[xl + o, dbTop], [xl + o, yt + o], [xr - o, yt + o], [xr - o, yb - o], [dbR, yb - o]];
  const conductors: [string, number][] = [[LIVE, 0], [NEUTRAL, gap], [EARTH, 2 * gap]];
  conductors.forEach(([c, o]) => wire(path(o), c, [0, 1e9], c === EARTH ? 2 : 3, 4));
  // the distribution box with its MCB, fed from the meter
  props.push({id: 'db', type: 'rect', x: round(xl - 0.1 * bw, 2), y: round(dbTop, 2), w: round(dbR - xl + 0.1 * bw, 2), h: round(0.18 * bh, 2), r: 6 * k, style: {fill: 'paper', stroke: 'muted', width: 3 * k}, layer: 5} as Prop);
  const mcb: Vec = [xl - 0.02 * bw, dbTop + 0.07 * bh];
  props.push({id: 'db-mcb', type: 'rect', x: round(mcb[0] - 16 * k, 2), y: round(mcb[1] - 20 * k, 2), w: 32 * k, h: 40 * k, r: 4 * k, style: {fill: 'paper', stroke: 'accent', width: 3 * k}, layer: 6} as Prop,
    {id: 'db-mcb-lever', type: 'line', x1: round(mcb[0], 2), y1: round(mcb[1], 2), x2: round(mcb[0], 2), y2: round(mcb[1] - 16 * k, 2), style: {stroke: 'ink', width: 6 * k, cap: 'round'}, layer: 7} as Prop);
  text(mcb[0], dbTop + 0.18 * bh + 26 * k, `distribution box, ${rating} A MCB`, 'muted', 19);
  wire([[bx, mcb[1] + 0.05 * bh], [xl - 0.1 * bw, mcb[1] + 0.05 * bh]], LIVE); text(bx + 4 * k, mcb[1] + 0.05 * bh - 12 * k, 'mains', 'muted', 18, [0, 1e9], 'start');
  // points along the live ring by distance, the way it runs from the box
  const lp = path(0), seg = lp.slice(1).map((q, i) => Math.hypot(q[0] - lp[i][0], q[1] - lp[i][1])), Ltot = seg.reduce((a, b) => a + b, 0);
  const along = (d: number, o = 0): {p: Vec; n: Vec; t: Vec} => {
    const pp = path(o), sg = pp.slice(1).map((q, i) => Math.hypot(q[0] - pp[i][0], q[1] - pp[i][1])), tot = sg.reduce((a, b) => a + b, 0);
    let r = Math.max(0, Math.min(tot, d * tot / Ltot));
    for (let i = 0; i < sg.length; i++) { if (r <= sg[i] || i === sg.length - 1) { const a = pp[i], b = pp[i + 1], t: Vec = [(b[0] - a[0]) / sg[i], (b[1] - a[1]) / sg[i]]; return {p: [a[0] + t[0] * r, a[1] + t[1] * r], t, n: [-t[1], t[0]]}; } r -= sg[i]; }
    return {p: pp[0], t: [0, -1], n: [1, 0]};
  };
  // the ring turns clockwise on screen, so the inside is the tangent turned a right angle: (−ty, tx) points inward
  const anchors: Record<string, Vec> = {distribution_box: [xl - 0.02 * bw, dbTop + 0.09 * bh], mcb};
  // evenly along the ring's straight runs, each kept clear of the corners and the box (a socket at a corner would be
  // tapped off two sides at once, and its name would meet its neighbour's)
  const clear = 110 * k, runs: [number, number][] = [];
  seg.reduce((d0, len) => { if (len > 2 * clear) runs.push([d0 + clear, d0 + len - clear]); return d0 + len; }, 0);
  const usable = runs.reduce((a, [p, q]) => a + q - p, 0);
  const where = sockets.map((_, j) => { let r = usable * (j + 0.5) / sockets.length; for (const [p, q] of runs) { if (r <= q - p) return p + r; r -= q - p; } return runs[runs.length - 1][1]; });
  sockets.forEach((a, j) => {
    const {p, n, t} = along(where[j]), c: Vec = [p[0] + n[0] * 70 * k, p[1] + n[1] * 70 * k];
    conductors.forEach(([col, o], m) => {
      const d = (m - 1) * 12 * k, from: Vec = [p[0] + n[0] * o + t[0] * d, p[1] + n[1] * o + t[1] * d], to: Vec = [c[0] - n[0] * 22 * k + t[0] * d, c[1] - n[1] * 22 * k + t[1] * d];
      wire([from, to], col, [0, 1e9], 4, 3); dot(from, 4 * k, col === NEUTRAL ? 'muted' : col, 5);
    });
    props.push({id: `socket${j}`, type: 'rect', x: round(c[0] - 22 * k, 2), y: round(c[1] - 22 * k, 2), w: 44 * k, h: 44 * k, r: 6 * k, style: {fill: 'paper', stroke: 'ink', width: 3 * k}, layer: 6} as Prop);
    dot([c[0], c[1] - 9 * k], 6 * k, 'ink', 7); dot([c[0] - 10 * k, c[1] + 9 * k], 4 * k, 'ink', 7); dot([c[0] + 10 * k, c[1] + 9 * k], 4 * k, 'ink', 7);
    const lab: Vec = [c[0] + n[0] * 50 * k, c[1] + n[1] * 50 * k + (Math.abs(n[1]) > 0.5 ? (n[1] > 0 ? 8 : 0) * k : 8 * k)];
    text(lab[0], lab[1], j === use ? `${a.name} ${num(a.watts)} W` : a.name, j === use ? 'accent' : 'muted', 19, [0, 1e9], Math.abs(n[0]) > 0.5 ? (n[0] > 0 ? 'start' : 'end') : 'middle', j === use ? 700 : 400);
    anchors[`socket${j}`] = c;
  });
  // the socket in use: current reaches it both ways round the live ring, dots moving as fast as the share they carry
  const I = sockets[use].watts / V, f = where[use] / Ltot, {I1, I2} = ringShares(I, f), tOn = 1.4, tStop = dur - 1.2;
  const lit = along(where[use]), cU: Vec = [lit.p[0] + lit.n[0] * 70 * k, lit.p[1] + lit.n[1] * 70 * k];
  props.push({id: 'in-use', type: 'rect', x: round(cU[0] - 26 * k, 2), y: round(cU[1] - 26 * k, 2), w: 52 * k, h: 52 * k, r: 8 * k, show: [tOn, 1e9], fade: 0.3, style: {stroke: 'accent', width: 4 * k}, layer: 6} as Prop);
  // drift speed goes as the current in the same wire: v = c I_way / I, c set so the slower way's trip lasts 3 s
  const ways: [number, number, number][] = [[0, where[use], I1], [Ltot, where[use], I2]];
  const c = Math.max(...ways.map(([a, b, Ii]) => Math.abs(b - a) * I / Math.max(Ii, 1e-9))) / 3;
  ways.forEach(([from, to, Ii], w) => {
    const v = c * Ii / I, d = Math.abs(to - from), trip = d / Math.max(v, 1e-9), every = 0.45;
    for (let t0 = tOn; t0 + trip <= tStop; t0 += every) {
      const xs: Key[] = [], ys: Key[] = [], m = Math.max(2, Math.ceil(trip * 12));
      for (let i = 0; i <= m; i++) { const tt = t0 + trip * i / m, q = along(from + (to - from) * i / m).p; xs.push(i ? [round(tt, 3), round(q[0], 1), 'linear'] : [round(tt, 3), round(q[0], 1)]); ys.push(i ? [round(tt, 3), round(q[1], 1), 'linear'] : [round(tt, 3), round(q[1], 1)]); }
      props.push({id: id(`flow${w}-`), type: 'circle', x: xs[0][1], y: ys[0][1], r: 7 * k, show: [t0, t0 + trip], style: {fill: 'accent', stroke: 'paper', width: 2 * k}, layer: 8, keys: {x: xs, y: ys}} as Prop);
    }
    // an arrow at the start of each way, as thick as its share
    // at set distances from the box, so the label clears the box's own name (capped to the way's first half)
    const at = (dd: number) => along(from + Math.sign(to - from) * Math.min(dd, 0.45 * Math.abs(to - from)));
    const a = at(0.1 * bw), b = at(0.16 * bw), off = -22 * k;
    props.push({id: `way${w}`, type: 'arrow', x1: round(a.p[0] + a.n[0] * off, 2), y1: round(a.p[1] + a.n[1] * off, 2), x2: round(b.p[0] + b.n[0] * off, 2), y2: round(b.p[1] + b.n[1] * off, 2), head: 16 * k,
      show: [tOn, 1e9], fade: 0.3, style: {stroke: 'accent', width: (2 + 8 * Ii / I) * k}, layer: 8} as Prop);
    const lt = at(0.24 * bw), lo = -52 * k;
    text(lt.p[0] + lt.n[0] * lo, lt.p[1] + lt.n[1] * lo + 6 * k, `${w ? 'I₂' : 'I₁'} = ${num(Ii)} A`, 'accent', 20, [tOn + 0.5, 1e9], Math.abs(lt.n[0]) > 0.5 ? (lt.n[0] > 0 ? 'end' : 'start') : 'middle');
  });
  anchors.in_use = cU;
  say(0.3, 'Ring system: live, neutral and earth run from the distribution box round the rooms and back to it', true);
  say(1.0, 'Each socket is tapped off the ring, in parallel: every socket gets the full voltage');
  say(tOn, `The ${sockets[use].name} is switched on: current reaches its socket along both sides of the ring`, true);
  say(tOn + 1.4, 'The shorter way has less resistance and carries more; each wire carries only part of the current, so a thinner wire will do');
  const facts = ['in the ring system the live, neutral and earth wires start from the distribution box, run round all the rooms of a portion of the house and come back to the box, forming a ring; the box has an MCB of about 30 A',
    'appliances and sockets are tapped off the ring in parallel, so each gets the full voltage and can be switched on and off independently',
    `the ${sockets[use].name} (${num(sockets[use].watts)} W) takes I = P/V = ${num(I)} A; it arrives both ways round the ring: ${num(I1)} A the shorter way and ${num(I2)} A the longer (inversely as their lengths)`,
    'because each socket is fed from two sides, the ring wire carries less current than one long wire would, so thinner wire can be used'];
  return finish(dur, facts, anchors);
}
