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

type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};
export type Outlet = {name: string; watts: number; earth?: boolean};
export type DomesticSpec = Common & {
  verb: 'domestic_circuit';
  /** 1 to 3 circuits, each with its fuse rating in A and 1 to 4 appliances. */
  circuits: {rating: number; appliances: Outlet[]}[];
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

export function domesticErrors(s: DomesticSpec): string[] {
  const e: string[] = [];
  if (!Array.isArray(s.circuits) || s.circuits.length < 1 || s.circuits.length > 3) return ['domestic_circuit: circuits is a list of 1 to 3 {rating, appliances}'];
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
  if (s.volts !== undefined && !(isNum(s.volts) && s.volts >= 100 && s.volts <= 250)) e.push('domestic_circuit: volts is the mains voltage, 100 to 250 (India: 220)');
  if (s.panel !== undefined && typeof s.panel !== 'boolean') e.push('domestic_circuit: panel is true or false');
  if (s.seconds !== undefined && !(isNum(s.seconds) && s.seconds >= 6 && s.seconds <= 20)) e.push('domestic_circuit: seconds is 6 to 20');
  return e;
}

export function domesticCircuit(s: DomesticSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, panel = s.panel !== false, V = s.volts ?? 220;
  const left = 0.03 * W, right = panel ? 0.63 * W : 0.97 * W, top = (panel ? 0.12 : s.title ? 0.22 : 0.13) * H, bottom = 0.95 * H;
  const T = s.seconds ?? 12, props: Prop[] = [], facts: string[] = [], anchors: Record<string, Vec> = {}, lines: string[] = [];
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
  s.circuits.forEach((c, i) => c.appliances.forEach((_, j) => order.push([i, j])));
  const t0 = 1.2, faultAt = s.fault ? Math.max(t0 + 0.7 * order.length + 0.6, T * 0.6) : 1e9;
  const onAt = (i: number, j: number) => t0 + 0.7 * order.findIndex(([a, b]) => a === i && b === j);
  const overloaded = s.fault === 'overload' ? (typeof s.at === 'number' ? s.at : 0) : -1;
  const faultCircuit = s.fault === 'overload' ? overloaded : Array.isArray(s.at) ? s.at[0] : -1;
  // An overloaded circuit's fuse melts as soon as its current passes the rating.
  const cutAt = s.circuits.map((c, i) => {
    if (i === overloaded) { let I = 0; for (let j = 0; j < c.appliances.length; j++) { I += c.appliances[j].watts / V; if (I > c.rating) return onAt(i, j) + 0.6; } }
    return i === faultCircuit ? faultAt + 0.6 : 1e9;
  });
  const leakSafe = s.fault === 'leak' && Array.isArray(s.at) && s.circuits[s.at[0]].appliances[s.at[1]].earth !== false;
  if (s.fault === 'leak' && !leakSafe) cutAt[faultCircuit] = 1e9;   // no earth wire: nothing makes the fuse blow, the body stays live
  // The supply: live and neutral from the pole, through the meter and the main fuse to the distribution box.
  const yL = top + 50 * k, yN = top + 90 * k, meterX = left + 120 * k, fuseX = left + 360 * k, boxX = left + 440 * k, boxW = 170 * k, busX = boxX + 40 * k;
  text('mains', `mains ${V} V, 50 Hz AC`, [left, yL - 40 * k], 'ink', 22, [0, 1e9], 'start');
  wire('supply-live', [[left, yL], [boxX, yL]], LIVE); wire('supply-neutral', [[left, yN], [boxX, yN]], NEUTRAL);
  props.push({id: 'meter', type: 'rect', x: round(meterX, 2), y: round(yL - 30 * k, 2), w: 150 * k, h: 90 * k, r: 8 * k, style: {fill: 'paper', stroke: 'muted', width: 3 * k}, layer: 5},
    {id: 'main-fuse', type: 'rect', x: round(fuseX - 25 * k, 2), y: round(yL - 10 * k, 2), w: 50 * k, h: 20 * k, r: 4 * k, style: {fill: 'paper', stroke: 'accent', width: 3 * k}, layer: 5},
    {id: 'box', type: 'rect', x: round(boxX, 2), y: round(yL - 30 * k, 2), w: round(boxW, 2), h: 90 * k, r: 8 * k, style: {fill: 'paper', stroke: 'muted', width: 3 * k}, layer: 5});
  text('meter-label', 'electricity meter', [meterX + 75 * k, yL + 22 * k], 'muted', 18);
  text('main-fuse-label', 'main fuse', [fuseX, yL - 18 * k], 'accent', 18);
  text('box-label', 'distribution box', [boxX + boxW / 2, yL + 22 * k], 'muted', 18);
  anchors.meter = [round(meterX + 75 * k, 2), round(yL + 15 * k, 2)]; anchors.main_fuse = [round(fuseX, 2), round(yL, 2)]; anchors.distribution_box = [round(boxX + boxW / 2, 2), round(yL + 15 * k, 2)];
  // Earth: a plate deep in the ground near the house, its wire running up beside the bus.
  const yTop = top + 170 * k, rows = s.circuits.length, rowH = Math.min(270 * k, (bottom - 70 * k - yTop) / rows), eX = busX + 36 * k;
  const plate: Vec = [eX, bottom - 20 * k];
  props.push({id: 'ground', type: 'line', x1: round(left, 2), y1: round(bottom - 50 * k, 2), x2: round(right, 2), y2: round(bottom - 50 * k, 2), style: {stroke: 'faint', width: 3 * k, dash: [10 * k, 8 * k]}, layer: 1},
    {id: 'plate', type: 'rect', x: round(plate[0] - 40 * k, 2), y: round(plate[1] - 6 * k, 2), w: 80 * k, h: 12 * k, style: {fill: 'muted'}, layer: 4});
  text('plate-label', 'earth: a metal plate deep in the ground', [plate[0] + 56 * k, plate[1] + 6 * k], EARTH, 18, [0, 1e9], 'start');
  anchors.earth_plate = plate;
  // The bus down from the distribution box, and each circuit's row.
  const lastRow = yTop + (rows - 1) * rowH;
  wire('bus-live', [[busX, yL + 60 * k], [busX, lastRow]], LIVE); wire('bus-neutral', [[busX + 18 * k, yL + 60 * k], [busX + 18 * k, lastRow + 0.55 * rowH]], NEUTRAL);
  wire('bus-earth', [[eX, yL + 60 * k], [eX, plate[1]]], EARTH, [0, 1e9], 2);
  const totals: string[] = [];
  s.circuits.forEach((c, i) => {
    const rL = yTop + i * rowH, rN = rL + 0.55 * rowH, rE = rL + 0.75 * rowH, x0 = busX, x1 = right - 10 * k, cut = cutAt[i];
    const fX = x0 + 110 * k;
    wire(`c${i}-live`, [[x0, rL], [x1, rL]], LIVE); wire(`c${i}-neutral`, [[x0 + 18 * k, rN], [x1, rN]], NEUTRAL); wire(`c${i}-earth`, [[eX, rE], [x1, rE]], EARTH, [0, 1e9], 2);
    // The circuit's fuse: whole, then melted and gapped once it is cut.
    props.push({id: `c${i}-fuse`, type: 'rect', x: round(fX - 28 * k, 2), y: round(rL - 11 * k, 2), w: 56 * k, h: 22 * k, r: 4 * k, show: [0, cut], style: {fill: 'paper', stroke: 'accent', width: 3 * k}, layer: 6},
      {id: `c${i}-fuse-wire`, type: 'line', x1: round(fX - 24 * k, 2), y1: round(rL, 2), x2: round(fX + 24 * k, 2), y2: round(rL, 2), show: [0, cut], style: {stroke: 'ink', width: 2 * k}, layer: 7});
    if (cut < 1e9) props.push({id: `c${i}-fuse-blown`, type: 'rect', x: round(fX - 28 * k, 2), y: round(rL - 11 * k, 2), w: 56 * k, h: 22 * k, r: 4 * k, show: [cut, 1e9], style: {fill: 'paper', stroke: 'bad', width: 4 * k}, layer: 6},
      ...[-1, 1].map(d => ({id: `c${i}-fuse-end${d}`, type: 'line' as const, x1: round(fX + d * 24 * k, 2), y1: round(rL, 2), x2: round(fX + d * 8 * k, 2), y2: round(rL + 5 * k, 2), show: [cut, 1e9] as [number, number], style: {stroke: 'bad', width: 2.5 * k}, layer: 7})));
    text(`c${i}-rating`, `${num(c.rating)} A fuse`, [fX, rL - 20 * k], 'accent', 18);
    if (cut < 1e9) text(`c${i}-melted`, 'fuse melts: circuit cut', [fX, rL + 30 * k], 'bad', 18, [cut, 1e9]);
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
      props.push({id: `c${i}a${j}-switch`, type: 'line', x1: round(x, 2), y1: round(sw - 14 * k, 2), x2: round(x + 22 * k, 2), y2: round(sw + 10 * k, 2), keys: {x2: [[on - 0.2, round(x + 22 * k, 2)], [on, round(x, 2), 'out']], y2: [[on - 0.2, round(sw + 10 * k, 2)], [on, round(sw + 14 * k, 2), 'out']]},
        style: {stroke: 'ink', width: 4 * k}, layer: 6});
      props.push({id: `c${i}a${j}-housing`, type: 'rect', x: round(x - 38 * k, 2), y: round(mid[1] - 34 * k, 2), w: 76 * k, h: 64 * k, r: 8 * k, style: {fill: 'paper', stroke: a.earth ? 'muted' : 'faint', width: a.earth ? 4 * k : 2 * k}, layer: 4},
        ...icon(a.name, mid, 0.7 * k, `c${i}a${j}-icon`, on, off));
      if (a.earth) wire(`c${i}a${j}-earth`, [[x + 38 * k, mid[1] + 20 * k], [x + 50 * k, mid[1] + 20 * k], [x + 50 * k, rE]], EARTH, [0, 1e9], 2);
      text(`c${i}a${j}-name`, `${a.name} ${num(a.watts)} W`, [x, rN + 26 * k], 'ink', 17, [0, 1e9], 'middle', 400);
      text(`c${i}a${j}-amps`, `${num(a.watts / V)} A`, [x - 44 * k, mid[1] + 6 * k], 'accent', 17, [on, off], 'end');
      I += a.watts / V; Ikeys.push([on - 0.01, Ikeys.at(-1)![1]], [on, round(I, 2)]);
      anchors[`c${i}a${j}`] = [round(x, 2), round(mid[1], 2)];
    });
    if (cut < 1e9) Ikeys.push([cut - 0.01, Ikeys.at(-1)![1]], [cut, 0]);
    props.push({id: `c${i}-current`, type: 'readout', x: round(fX + 75 * k, 2), y: round(rL - 14 * k, 2), size: 18 * k, weight: 700, text: 'I = {i} A', decimals: 2,
      measures: {i: {kind: 'keys', keys: Ikeys}}, style: {fill: 'accent'}, layer: 9});
    totals.push(`circuit ${i + 1}: ${num(I)} A on a ${num(c.rating)} A fuse`);
    facts.push(`circuit ${i + 1} (${num(c.rating)} A fuse): ${c.appliances.map(a => `${a.name} ${num(a.watts)} W takes ${num(a.watts / V)} A`).join('; ')}; together ${num(I)} A`);
  });
  // Faults: a spark where they happen; with a leak and an earth wire, the current runs down to the plate.
  if (s.fault === 'short' || s.fault === 'leak') {
    const [i, j] = s.at as [number, number], p = anchors[`c${i}a${j}`];
    props.push({id: 'spark', type: 'polyline', points: [[-1, 0], [-0.3, 0.2], [0, 1], [0.3, 0.2], [1, 0], [0.3, -0.2], [0, -1], [-0.3, -0.2]].map(([a, b]) => [round(p[0] + (s.fault === 'leak' ? 38 : 0) * k + a * 26 * k, 2), round(p[1] - 30 * k + b * 26 * k, 2)] as Vec),
      closed: true, show: [faultAt, faultAt + 1.2], style: {fill: '#ffd23f', stroke: 'bad', width: 2 * k}, layer: 10});
    text('fault-label', s.fault === 'short' ? 'short circuit: live touches neutral' : 'live wire touches the metal body', [p[0], yTop + i * rowH + 0.75 * rowH + 30 * k], 'bad', 20, [faultAt, 1e9]);
    if (s.fault === 'leak') {
      if (leakSafe) text('earth-path', 'current flows to earth, not through you', [p[0], yTop + i * rowH + 0.75 * rowH + 58 * k], EARTH, 18, [faultAt + 0.3, 1e9]);
      else text('shock', 'no earth wire: touching it gives a severe shock', [p[0], yTop + i * rowH + 0.75 * rowH + 58 * k], 'bad', 20, [faultAt + 0.3, 1e9]);
    }
  }
  // The words.
  lines.push(`Live (red) and neutral (black): ${V} V AC; earth (green) to a plate in the ground`, 'Appliances in parallel: each gets the full voltage and has its own switch', ...totals);
  facts.push(`mains electricity in India is AC at ${V} V and 50 Hz; the live wire has red insulation, the neutral black, and the earth wire green`,
    'appliances are connected in parallel across live and neutral, each with its own switch, so each gets the same potential difference; separate circuits are used: 15 A for high-power appliances like geysers and heaters, 5 A for bulbs and fans',
    'the current an appliance takes is I = P/V; the currents of a circuit\'s appliances add up');
  if (s.fault === 'overload') { lines.push('Too many appliances: the current exceeds the fuse rating, the fuse melts'); facts.push('overloading: when too many appliances are switched on in one circuit the current exceeds its rating; the fuse wire melts and breaks the circuit, protecting the wiring and appliances'); }
  if (s.fault === 'short') { lines.push('Short circuit: live touches neutral, the current increases heavily; the fuse melts'); facts.push('a short circuit happens when the live and neutral wires touch directly (damaged insulation, a fault in an appliance): the resistance is tiny, the current increases heavily, and the fuse melts'); }
  if (s.fault === 'leak') {
    lines.push(leakSafe ? 'The earth wire carries the leaking current to the ground: the fuse blows, the user is safe' : 'Without an earth wire the metal body stays live: a severe shock');
    facts.push('the earth wire is joined to the metal bodies of appliances such as electric irons, toasters and refrigerators: if the live wire touches the body, current flows to the earth through this low-resistance path, so the user gets no severe shock and the fuse blows');
  }
  if (panel) {
    const px = 0.66 * W, pw = W - px - 40 * k;
    let row = 0.14 * H;
    if (s.title) { props.push({id: 'title', type: 'text', x: px, y: row, text: s.title, size: 44 * k, weight: 700, width: pw}); row += wrapText(s.title, 44 * k, pw).length * 1.25 * 44 * k + 18 * k; }
    lines.forEach((value, j) => { props.push({id: `say${j}`, type: 'text', x: px, y: row, text: value, size: 28 * k, width: pw, weight: j ? 400 : 700, show: [0.6 + 1.2 * j, 1e9], fade: 0.3}); row += wrapText(value, 28 * k, pw).length * 1.3 * 28 * k + 12 * k; });
  } else if (s.title) props.push({id: 'title', type: 'text', x: left, y: 0.16 * H, text: s.title, size: 44 * k, weight: 700, width: 0.92 * W});
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: T, theme: s.theme ?? 'dark', props, actors: [], meta: {verb: 'domestic_circuit', facts, anchors}};
}
