// circuit: an electric circuit drawn with the book's symbols and solved by Ohm's law (Class 10 Electricity, 2026-10-29).
// A battery of cells, a plug key and an ammeter on the top wire; along the bottom wire, in series, components (resistor,
// bulb, nichrome wire, rheostat) and parallel groups whose branches are short series of components (Figs. 11.1, 11.2,
// 11.6 to 11.13). The circuit is solved exactly: the equivalent resistance, the current in the main line and in each
// branch, the potential difference across every component; meters read those values, so what is on screen always agrees.
// A wire's resistance comes from R = ρl/A with the book's resistivities (Table 11.2). A list of cell counts shows the
// circuit with one battery after another (Activity 11.1). Charges move along the wires at a pace set by the current
// (conventional current, + to −); bulbs glow by the power they take.
import type {Key} from '../keys.ts';
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {round, type Vec} from '../vec.ts';
import {n2} from './calculus.ts';

type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};
export type Part = {id: string; kind: 'resistor' | 'bulb' | 'wire' | 'rheostat'; R?: number; label?: string;
  /** A wire: its material (the book's Table 11.2), length in m and area of cross-section in mm². */
  material?: string; length?: number; area?: number};
export type Group = {id: string; parallel: Part[][]};
export type CircuitSpec = Common & {
  verb: 'circuit';
  /** Cells of 1.5 V each in the battery; a list shows the circuit with one battery after another (Activity 11.1). */
  cells?: number | number[];
  /** Or the battery's potential difference in volts. */
  volts?: number;
  /** The series items along the circuit: components and parallel groups. */
  items: (Part | Group)[];
  /** The plug key: closed (current flows) or open. */
  key?: 'closed' | 'open' | 'closes';
  /** wire: a close-up of a wire, charge crossing a marked cross-section, counted against a clock: I = Q/t. */
  view?: 'circuit' | 'wire' | 'work';
  /** view work: the charge moved from A to B, in coulombs (default 1). */
  charge?: number;
  /** A bar on the cell showing its chemical energy, running down while current flows. */
  energy?: boolean;
  /** view wire: the current in amperes (default 1). */
  current?: number;
  /** Show the main current in A, mA and µA together. */
  units?: boolean;
  /** mains: the supply is the AC mains (220 V by default), drawn as ~, not as cells. */
  source?: 'cells' | 'mains';
  ammeter?: boolean;
  /** Voltmeters across these items (component or group ids). */
  voltmeters?: string[];
  /** Label every branch's current. */
  currents?: boolean;
  /** Charges moving along the wires, faster where the current is larger. */
  /** Moving charges: true or 'conventional' (+ to −), 'electrons' (blue, − to +), or 'both' (electrons moving one way,
   * fixed arrows of conventional current pointing the other). */
  flow?: boolean | 'conventional' | 'electrons' | 'both';
  /** Show the power each component takes (P = VI) and the heat in the time given (s). */
  power?: boolean;
  seconds_each?: number;
  panel?: boolean;
};

/** Electrical resistivity at 20 °C, Ω m (NCERT Class 10 Table 11.2). */
export const RESISTIVITY: Record<string, number> = {silver: 1.6e-8, copper: 1.62e-8, aluminium: 2.63e-8, tungsten: 5.2e-8, nickel: 6.84e-8,
  iron: 10.0e-8, chromium: 12.9e-8, mercury: 94.0e-8, manganese: 1.84e-6, constantan: 49e-6, manganin: 44e-6, nichrome: 100e-6};
const CELL = 1.5;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const fmt = (v: number, places = 2) => n2(Number(v.toFixed(places)), places).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
const isGroup = (x: Part | Group): x is Group => Array.isArray((x as Group).parallel);
const resistance = (p: Part) => (p.kind === 'wire' ? RESISTIVITY[(p.material ?? 'nichrome').toLowerCase()] * (p.length ?? 1) / ((p.area ?? 1) * 1e-6) : p.R!);
const branchR = (b: Part[]) => b.reduce((a, p) => a + resistance(p), 0);
export const groupR = (g: Group) => 1 / g.parallel.reduce((a, b) => a + 1 / branchR(b), 0);
export const totalR = (items: (Part | Group)[]) => items.reduce((a, x) => a + (isGroup(x) ? groupR(x) : resistance(x)), 0);

export type Solution = {V: number; R: number; I: number; parts: Record<string, {V: number; I: number; R: number; P: number}>; groups: Record<string, {V: number; I: number; R: number; branches: number[]}>};
/** The circuit solved for a battery of V volts. */
export function solve(items: (Part | Group)[], V: number, closed = true): Solution {
  const R = totalR(items), I = closed ? V / R : 0, parts: Solution['parts'] = {}, groups: Solution['groups'] = {};
  for (const x of items) {
    if (isGroup(x)) {
      const Rg = groupR(x), Vg = I * Rg, branches = x.parallel.map(b => Vg / branchR(b));
      groups[x.id] = {V: Vg, I, R: Rg, branches};
      x.parallel.forEach((b, j) => b.forEach(p => { const r = resistance(p); parts[p.id] = {R: r, I: branches[j], V: branches[j] * r, P: branches[j] ** 2 * r}; }));
    } else { const r = resistance(x); parts[x.id] = {R: r, I, V: I * r, P: I * I * r}; }
  }
  return {V, R, I, parts, groups};
}

export function circuitErrors(s: CircuitSpec): string[] {
  const e: string[] = [];
  if (s.view !== undefined && !['circuit', 'wire', 'work'].includes(s.view)) return ['circuit: view is circuit, wire or work'];
  if (s.view === 'work') {
    if (!(isNum(s.volts) && s.volts > 0 && s.volts <= 250)) e.push('circuit: view work needs volts: the potential difference between A and B');
    if (s.charge !== undefined && !(isNum(s.charge) && s.charge > 0 && s.charge <= 100)) e.push('circuit: charge (view work) is in coulombs, more than 0 and at most 100');
    if (s.items !== undefined || s.cells !== undefined) e.push('circuit: view work shows a charge moved between two points: leave out items and cells; give volts (and charge)');
    return e;
  }
  if (s.view === 'wire') {
    if (s.current !== undefined && !(isNum(s.current) && s.current > 0 && s.current <= 10)) e.push('circuit: current (view wire) is in amperes, more than 0 and at most 10');
    if (s.seconds_each !== undefined && !(isNum(s.seconds_each) && s.seconds_each >= 3 && s.seconds_each <= 12)) e.push('circuit: seconds_each is 3 to 12');
    if (s.items !== undefined || s.cells !== undefined || s.volts !== undefined) e.push('circuit: view wire is a close-up of one wire: leave out items, cells and volts; give current');
    return e;
  }
  const cells = Array.isArray(s.cells) ? s.cells : s.cells === undefined ? [] : [s.cells];
  if (s.cells !== undefined && s.volts !== undefined) e.push('circuit: give cells or volts, not both');
  if (s.source !== undefined && !['cells', 'mains'].includes(s.source)) e.push('circuit: source is cells or mains');
  if (s.source === 'mains' && s.cells !== undefined) e.push('circuit: mains has no cells: give volts (220 by default) or leave it out');
  if (s.cells === undefined && s.volts === undefined && s.source !== 'mains') e.push('circuit: give the battery: cells (1.5 V each, or a list shown in turn) or volts, or source: mains');
  if (cells.length > 5 || !cells.every(c => Number.isInteger(c) && c >= 1 && c <= 8)) e.push('circuit: cells is 1 to 8, or a list of up to 5 such counts');
  if (s.volts !== undefined && !(isNum(s.volts) && s.volts > 0 && s.volts <= 250)) e.push('circuit: volts is the battery\'s potential difference, more than 0 and at most 250');
  if (!Array.isArray(s.items) || s.items.length < 1 || s.items.length > 5) return [...e, 'circuit: items is 1 to 5 components or parallel groups, in series'];
  const ids = new Set<string>();
  const part = (p: Part, where: string) => {
    if (typeof p?.id !== 'string' || !/^[A-Za-z][A-Za-z0-9_]{0,11}$/.test(p.id) || ids.has(p.id)) e.push(`${where}: needs a unique short id (R1, bulb, XY)`);
    ids.add(p?.id);
    if (!['resistor', 'bulb', 'wire', 'rheostat'].includes(p?.kind)) e.push(`${where}: kind is resistor, bulb, wire or rheostat`);
    else if (p.kind === 'wire') {
      if (!((p.material ?? 'nichrome').toLowerCase() in RESISTIVITY)) e.push(`${where}: material is one of ${Object.keys(RESISTIVITY).join(', ')}`);
      if (p.length !== undefined && !(isNum(p.length) && p.length > 0 && p.length <= 100)) e.push(`${where}: length is in metres, up to 100`);
      if (p.area !== undefined && !(isNum(p.area) && p.area > 0 && p.area <= 100)) e.push(`${where}: area is the cross-section in mm², up to 100`);
      if (p.R !== undefined) e.push(`${where}: a wire's resistance comes from its material, length and area: leave R out`);
    } else if (!(isNum(p.R) && p.R > 0 && p.R <= 1e6)) e.push(`${where}: R is its resistance in ohms (more than 0)`);
    if (p?.label !== undefined && (typeof p.label !== 'string' || p.label.length > 16)) e.push(`${where}: label is a short name (16 characters)`);
  };
  s.items.forEach((x, i) => {
    if (isGroup(x)) {
      if (typeof x.id !== 'string' || ids.has(x.id)) e.push(`items[${i}]: a parallel group needs a unique id`);
      ids.add(x.id);
      if (x.parallel.length < 2 || x.parallel.length > 4) e.push(`items[${i}]: parallel is 2 to 4 branches`);
      x.parallel.forEach((b, j) => {
        if (!Array.isArray(b) || b.length < 1 || b.length > 2) e.push(`items[${i}].parallel[${j}]: a branch is a list of 1 or 2 components`);
        else b.forEach((p, q) => part(p, `items[${i}].parallel[${j}][${q}]`));
      });
    } else part(x as Part, `items[${i}]`);
  });
  for (const v of s.voltmeters ?? []) if (!ids.has(v) && v !== 'battery') e.push(`circuit: voltmeters: no item ${JSON.stringify(v)}; ids are ${[...ids].join(', ')}, or battery`);
  if (s.voltmeters !== undefined && s.voltmeters.length > 4) e.push('circuit: voltmeters is up to 4 ids');
  if (s.flow !== undefined && ![true, false, 'conventional', 'electrons', 'both'].includes(s.flow as never)) e.push('circuit: flow is true (conventional current), electrons, or both');
  if (s.key !== undefined && !['open', 'closed', 'closes'].includes(s.key)) e.push('circuit: key is open, closed, or closes (open at first, then closed: the current starts)');
  if (s.seconds_each !== undefined && !(isNum(s.seconds_each) && s.seconds_each >= 3 && s.seconds_each <= 12)) e.push('circuit: seconds_each is 3 to 12');
  return e;
}

export function circuit(s: CircuitSpec): Scene {
  if (s.view === 'wire') return wireView(s);
  if (s.view === 'work') return workView(s);
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, panel = s.panel !== false;
  const left = 0.04 * W, right = panel ? 0.62 * W : 0.96 * W, top = panel ? 0.14 * H : (s.title ? 0.24 : 0.14) * H, bottom = 0.92 * H;
  // A circuit with no parallel group is a short, wide loop; with groups it needs height for their branches.
  const tall = s.items.some(isGroup), X0 = left + 0.09 * (right - left), X1 = right - 0.03 * (right - left);
  const Y0 = top + (tall ? 0.1 : 0.22) * (bottom - top), Y1 = bottom - (tall ? 0.1 : 0.24) * (bottom - top);
  const props: Prop[] = [], facts: string[] = [], anchors: Record<string, Vec> = {};
  const line = (id: string, a: Vec, b: Vec, extra: Partial<Prop> = {}) => props.push({id, type: 'line', x1: round(a[0], 2), y1: round(a[1], 2), x2: round(b[0], 2), y2: round(b[1], 2),
    style: {stroke: 'ink', width: 4 * k}, layer: 2, ...extra} as Prop);
  const text = (id: string, t: string, x: number, y: number, fill = 'ink', size = 26, align: 'start' | 'middle' | 'end' = 'middle', show?: [number, number]) =>
    props.push({id, type: 'text', x: round(x, 2), y: round(y, 2), text: t, size: size * k, align, weight: 700, ...(show ? {show, fade: 0.3} : {}), style: {fill, stroke: 'paper', width: 7 * k}, layer: 6});
  const states = (Array.isArray(s.cells) ? s.cells : [s.cells]).map(c => (c === undefined ? s.volts ?? 220 : c * CELL));
  // key closes: open at first, plugged at closeT, when current, glow and moving charges begin.
  const closed = (s.key ?? 'closed') !== 'open', E = s.seconds_each ?? 6, T0 = 0.6, closeT = s.key === 'closes' ? 1.8 : 0;
  // Battery on the left side: cells as long (+) and short (−) plates; key and ammeter on the top wire.
  // A battery given in volts is drawn as the usual two-cell symbol; one given in cells, cell by cell.
  const mains = s.source === 'mains';
  const by = (Y0 + Y1) / 2, nCells = Array.isArray(s.cells) ? Math.max(...s.cells) : s.cells ?? 2, pitch = 16 * k;
  const bTop = by - (nCells * pitch) / 2, bBot = by + (nCells * pitch) / 2;
  line('wire-left-top', [X0, Y0], [X0, bTop - 6 * k]); line('wire-left-bottom', [X0, bBot + 6 * k], [X0, Y1]);
  if (mains) {
    props.push({id: 'mains', type: 'circle', x: round(X0, 2), y: round(by, 2), r: 30 * k, style: {stroke: 'ink', width: 4 * k, fill: 'paper'}, layer: 3});
    text('mains-wave', '~', X0, by + 2 * k, 'accent', 44);
  } else for (let c = 0; c < Math.min(nCells, 8); c++) {
    const y = bTop + c * pitch;
    line(`cell${c}-plus`, [X0 - 26 * k, y], [X0 + 26 * k, y], {style: {stroke: 'ink', width: 4 * k}});
    line(`cell${c}-minus`, [X0 - 13 * k, y + 8 * k], [X0 + 13 * k, y + 8 * k], {style: {stroke: 'ink', width: 9 * k}});
  }
  if (!mains) { text('plus', '+', X0 - 44 * k, bTop + 4 * k, 'accent'); text('minus', '−', X0 - 44 * k, bBot + 4 * k, 'accent'); }
  anchors.battery = [X0, by];
  const keyX = X0 + 0.22 * (X1 - X0), amX = X0 + 0.5 * (X1 - X0), amR = 26 * k;
  line('wire-top-1', [X0, Y0], [keyX - 22 * k, Y0]);
  props.push({id: 'key', type: 'circle', x: round(keyX, 2), y: round(Y0, 2), r: 20 * k, style: {stroke: 'ink', width: 3 * k, fill: 'paper'}, layer: 3});
  if (closed) props.push({id: 'key-plug', type: 'circle', x: round(keyX, 2), y: round(Y0, 2), r: 7 * k, ...(closeT ? {show: [closeT, 1e9] as [number, number], fade: 0.2} : {}), style: {fill: 'ink'}, layer: 4});
  if (closeT) text('key-closes', 'key closed', keyX, Y0 + 44 * k, 'accent', 22, 'middle', [closeT, closeT + 2.5]);
  text('key-label', 'K', keyX, Y0 - 36 * k, 'muted', 24);
  anchors.key = [keyX, Y0];
  if (s.ammeter !== false) {
    line('wire-top-2', [keyX + 22 * k, Y0], [amX - amR, Y0]);
    props.push({id: 'ammeter', type: 'circle', x: round(amX, 2), y: round(Y0, 2), r: amR, style: {stroke: 'cool', width: 3.5 * k, fill: 'paper'}, layer: 3});
    text('ammeter-A', 'A', amX, Y0 + 2 * k, 'cool', 28);
    line('wire-top-3', [amX + amR, Y0], [X1, Y0]);
    anchors.ammeter = [amX, Y0];
  } else line('wire-top-2', [keyX + 22 * k, Y0], [X1, Y0]);
  line('wire-right', [X1, Y0], [X1, Y1]);
  // Along the bottom wire (current flows right to left there), the items in series, each in a slot.
  const slots = s.items.length, span = (X1 - X0) / slots;
  const slotOf = (j: number): [number, number] => [X1 - span * (j + 1), X1 - span * j];       // [left, right] x of item j
  const symbol = (p: Part, cx: number, y: number, id: string) => {
    const half = Math.min(0.32 * span, 90 * k);
    if (p.kind === 'bulb') {
      props.push({id: `${id}-glow`, type: 'circle', x: round(cx, 2), y: round(y, 2), r: 36 * k, style: {fill: 'accent', opacity: 0}, layer: 2},
        {id: `${id}-body`, type: 'circle', x: round(cx, 2), y: round(y, 2), r: 24 * k, style: {stroke: 'ink', width: 3.5 * k, fill: 'paper'}, layer: 3});
      line(`${id}-x1`, [cx - 16 * k, y - 16 * k], [cx + 16 * k, y + 16 * k], {layer: 4}); line(`${id}-x2`, [cx - 16 * k, y + 16 * k], [cx + 16 * k, y - 16 * k], {layer: 4});
      line(`${id}-lead-a`, [cx - half, y], [cx - 24 * k, y]); line(`${id}-lead-b`, [cx + 24 * k, y], [cx + half, y]);
    } else {
      const zig: Vec[] = [[cx - half, y], [cx - 0.6 * half, y]];
      for (let q = 0; q < 6; q++) zig.push([cx - 0.6 * half + (q + 0.5) * (1.2 * half / 6), y + (q % 2 ? 14 : -14) * k]);
      zig.push([cx + 0.6 * half, y], [cx + half, y]);
      props.push({id: `${id}-body`, type: 'polyline', points: zig.map(q => [round(q[0], 2), round(q[1], 2)] as Vec), style: {stroke: p.kind === 'wire' ? 'accent' : 'ink', width: 4 * k}, layer: 3});
      if (p.kind === 'rheostat') props.push({id: `${id}-arrow`, type: 'arrow', x1: round(cx - 0.5 * half, 2), y1: round(y + 30 * k, 2), x2: round(cx + 0.5 * half, 2), y2: round(y - 30 * k, 2), head: 14 * k, style: {stroke: 'ink', width: 3 * k}, layer: 4});
    }
    const name = p.label ?? (p.kind === 'wire' ? `${(p.material ?? 'nichrome').toLowerCase()} wire` : p.id);
    // Names below the component, so voltmeters can bridge it from above.
    text(`${id}-name`, p.kind === 'wire' ? `${name}, ${fmt(resistance(p), 3)} Ω` : `${name} = ${fmt(resistance(p))} Ω`, cx, y + 46 * k, p.kind === 'wire' ? 'accent' : 'ink', 24);
    anchors[p.id] = [round(cx, 2), round(y, 2)];
    anchors[`${p.id}_left`] = [round(cx - half, 2), round(y, 2)]; anchors[`${p.id}_right`] = [round(cx + half, 2), round(y, 2)];   // its two ends (points A and B)
    return half;
  };
  const ends: Record<string, [number, number, number]> = {};                          // id -> [x left, x right, y top]
  const branchPaths: {pts: Vec[]; branch: [string, number]}[] = [];
  s.items.forEach((x, j) => {
    const [xa, xb] = slotOf(j), cx = (xa + xb) / 2;
    if (!isGroup(x)) {
      const half = symbol(x, cx, Y1, x.id);
      line(`wire-b${j}-r`, [xb, Y1], [cx + half, Y1]); line(`wire-b${j}-l`, [cx - half, Y1], [xa, Y1]);
      ends[x.id] = [cx - half, cx + half, Y1 - 50 * k];
    } else {
      // Branches stacked upwards from the bottom wire, joined at two nodes.
      const n = x.parallel.length, gap = Math.min(0.2 * (Y1 - Y0), 120 * k), na = xa + 0.08 * span, nb = xb - 0.08 * span;
      line(`wire-b${j}-r`, [xb, Y1], [nb, Y1]); line(`wire-b${j}-l`, [na, Y1], [xa, Y1]);
      line(`${x.id}-node-r`, [nb, Y1], [nb, Y1 - gap * (n - 1)]); line(`${x.id}-node-l`, [na, Y1], [na, Y1 - gap * (n - 1)]);
      props.push({id: `${x.id}-dot-r`, type: 'circle', x: round(nb, 2), y: round(Y1, 2), r: 6 * k, style: {fill: 'ink'}, layer: 4},
        {id: `${x.id}-dot-l`, type: 'circle', x: round(na, 2), y: round(Y1, 2), r: 6 * k, style: {fill: 'ink'}, layer: 4});
      x.parallel.forEach((b, q) => {
        const y = Y1 - gap * q, bw = nb - na, m = b.length;
        let cursor = nb;
        b.forEach((p, r) => {
          const pc = nb - bw * (r + 0.5) / m, half = Math.min(symbol(p, pc, y, p.id), bw / (2 * m) - 4 * k);
          line(`${p.id}-wire-r`, [cursor, y], [pc + half, y]); cursor = pc - half;
          ends[p.id] = [pc - half, pc + half, y - 50 * k];
        });
        line(`${x.id}-b${q}-end`, [cursor, y], [na, y]);
        branchPaths.push({pts: [[nb, Y1], [nb, y], [na, y], [na, Y1]], branch: [x.id, q]});
      });
      ends[x.id] = [na, nb, Y1 - gap * (n - 1) - 50 * k];
      anchors[x.id] = [round((na + nb) / 2, 2), round(Y1 - gap * (n - 1) / 2, 2)];
    }
  });
  // Voltmeters bridge their item from above.
  // A voltmeter across the battery sits just inside the loop, beside the cells; it reads even with the key open.
  if ((s.voltmeters ?? []).includes('battery')) {
    const xv = X0 + 110 * k, st = {style: {stroke: 'cool', width: 2.5 * k}};
    line('vm-battery-t', [X0, bTop - 10 * k], [xv, bTop - 10 * k], st); line('vm-battery-b', [X0, bBot + 10 * k], [xv, bBot + 10 * k], st);
    line('vm-battery-l1', [xv, bTop - 10 * k], [xv, by - 24 * k], st); line('vm-battery-l2', [xv, by + 24 * k], [xv, bBot + 10 * k], st);
    props.push({id: 'vm-battery', type: 'circle', x: round(xv, 2), y: round(by, 2), r: 24 * k, style: {stroke: 'cool', width: 3.5 * k, fill: 'paper'}, layer: 3});
    text('vm-battery-V', 'V', xv, by + 2 * k, 'cool', 26);
    anchors.voltmeter_battery = [round(xv, 2), round(by, 2)];
  }
  (s.voltmeters ?? []).filter(id => id !== 'battery').forEach((id, q) => {
    const [xa, xb, yt] = ends[id], yv = yt - 40 * k - 0 * q, cx = (xa + xb) / 2;
    line(`vm-${id}-l`, [xa, yt + 50 * k], [xa, yv], {style: {stroke: 'cool', width: 2.5 * k}}); line(`vm-${id}-r`, [xb, yt + 50 * k], [xb, yv], {style: {stroke: 'cool', width: 2.5 * k}});
    line(`vm-${id}-tl`, [xa, yv], [cx - 24 * k, yv], {style: {stroke: 'cool', width: 2.5 * k}}); line(`vm-${id}-tr`, [cx + 24 * k, yv], [xb, yv], {style: {stroke: 'cool', width: 2.5 * k}});
    props.push({id: `vm-${id}`, type: 'circle', x: round(cx, 2), y: round(yv, 2), r: 24 * k, style: {stroke: 'cool', width: 3.5 * k, fill: 'paper'}, layer: 3});
    text(`vm-${id}-V`, 'V', cx, yv + 2 * k, 'cool', 26);
    anchors[`voltmeter_${id}`] = [round(cx, 2), round(yv, 2)];
  });
  // The cell's chemical energy: a bar that runs down while current flows (the rate is illustrative).
  if (s.energy) {
    const bx = X0 + 30 * k, bw = 0.22 * (X1 - X0), byy = Y1 - 80 * k, runs = closed && totalR(s.items) > 0;
    const startT = Math.max(T0, closeT), stopT = T0 + states.length * E;
    props.push({id: 'energy-frame', type: 'rect', x: round(bx, 2), y: round(byy, 2), w: round(bw, 2), h: 22 * k, style: {stroke: 'accent', width: 2.5 * k, fill: 'paper'}, layer: 3},
      {id: 'energy-level', type: 'rect', x: round(bx, 2), y: round(byy, 2), w: round(bw, 2), h: 22 * k, keys: runs ? {w: [[startT, round(bw, 2)], [stopT, round(0.55 * bw, 2), 'linear']]} : undefined,
        style: {fill: 'accent', opacity: 0.7}, layer: 4} as Prop);
    text('energy-label', runs ? 'chemical energy in the cell: being used' : 'chemical energy in the cell', bx, byy - 22 * k, 'accent', 22, 'start');
  }
  // Each battery in turn: the solution, the meters' readings, the bulbs' glow and the panel.
  const px = 0.66 * W, pw = W - px - 40 * k;
  let row = 0.14 * H;
  if (panel && s.title) { props.push({id: 'title', type: 'text', x: px, y: row, text: s.title, size: 44 * k, weight: 700, width: pw}); row += wrapText(s.title, 44 * k, pw).length * 1.25 * 44 * k + 18 * k; }
  if (!panel && s.title) props.push({id: 'title', type: 'text', x: left, y: 0.16 * H, text: s.title, size: 44 * k, weight: 700, width: 0.92 * W});
  const sols = states.map(V => solve(s.items, V, closed));
  const maxP = Math.max(1e-9, ...sols.flatMap(sol => Object.values(sol.parts).map(q => q.P)));
  sols.forEach((sol, n) => {
    const s0 = T0 + n * E, end = n === sols.length - 1 ? 1e9 : s0 + E, show: [number, number] = [Math.max(s0, closeT), end];
    // To the right of the supply: on its left it ran out of a half-frame (C1 of Electricity, 2026-10-29).
    text(`battery-v${n}`, `${fmt(sol.V)} V${mains ? ' mains' : ''}`, X0 + 44 * k, by - ((s.voltmeters ?? []).includes('battery') ? 70 * k : 0), 'accent', 28, 'start', [s0, end]);
    const reading = s.units && sol.I < 1 && sol.I > 0 ? `I = ${fmt(sol.I * 1000, 3)} mA` : `I = ${fmt(sol.I, 3)} A`;
    if (s.ammeter !== false) text(`ammeter-read${n}`, reading, amX, Y0 - 44 * k, 'cool', 28, 'middle', show);
    if (s.ammeter !== false && closeT && n === 0) text('ammeter-zero', 'I = 0 A', amX, Y0 - 44 * k, 'cool', 28, 'middle', [T0, closeT]);
    if ((s.voltmeters ?? []).includes('battery')) text(`vm-battery-read${n}`, `${fmt(sol.V, 3)} V`, X0 + 144 * k, by, 'cool', 26, 'start', [s0, end]);
    for (const id of (s.voltmeters ?? []).filter(v => v !== 'battery')) {
      const v = sol.parts[id]?.V ?? sol.groups[id]?.V ?? 0, [xa, xb, yt] = ends[id];
      text(`vm-${id}-read${n}`, `${fmt(v, 3)} V`, (xa + xb) / 2 + 34 * k, yt - 40 * k, 'cool', 26, 'start', show);
    }
    if (s.currents) for (const [gid, g] of Object.entries(sol.groups)) g.branches.forEach((Ib, q) => {
      // Above each branch's wire, at its right end (where the current enters it).
      const grp = s.items.find(x => isGroup(x) && x.id === gid) as Group, first = grp.parallel[q][0], [, xb2, yt] = ends[first.id];
      const nodeX = ends[gid][1];
      text(`${gid}-I${q}-${n}`, `I${q + 1} = ${fmt(Ib, 3)} A`, nodeX - 10 * k, yt + 50 * k - 20 * k, 'good', 22, 'end', show); void xb2;
    });
    for (const [id, q] of Object.entries(sol.parts)) {
      const glow = props.find(p => p.id === `${id}-glow`);
      if (glow) props.push({...glow, id: `${id}-glow${n}`, show, fade: 0.4, style: {fill: 'accent', opacity: round(0.1 + 0.45 * q.P / maxP, 3)}} as Prop);
      if (s.power) text(`${id}-P${n}`, `${fmt(q.P, 2)} W`, anchors[id][0], anchors[id][1] + 46 * k, 'accent', 22, 'middle', show);
    }
    if (panel) {
      const series = s.items.map(x => (isGroup(x) ? `R(${x.id})` : x.id)).join(' + ');
      const rows: [string, string][] = [[`Battery: ${Array.isArray(s.cells) ? `${s.cells[n]} cell${s.cells[n] > 1 ? 's' : ''}, ` : ''}${fmt(sol.V)} V`, 'accent'],
        [s.items.length > 1 || isGroup(s.items[0]) ? `R = ${series} = ${fmt(sol.R, 3)} Ω` : `R = ${fmt(sol.R, 3)} Ω`, 'ink'],
        [closed ? `I = V/R = ${fmt(sol.V)} ÷ ${fmt(sol.R, 3)} = ${fmt(sol.I, 3)} A` : 'Key open: no current flows', 'cool'],
        ...(s.units && closed ? [[`${fmt(sol.I, 4)} A = ${fmt(sol.I * 1e3, 3)} mA = ${fmt(sol.I * 1e6, 1)} µA`, 'cool'] as [string, string]] : []),
        // Across the battery: its full potential difference, current or not (the cell's own).
        ...(s.voltmeters ?? []).map(id => [`V across ${id} = ${fmt(id === 'battery' ? sol.V : sol.parts[id]?.V ?? sol.groups[id]?.V ?? 0, 3)} V`, 'cool'] as [string, string])];
      let y = row;
      rows.forEach(([t, fill], q) => { props.push({id: `row${n}-${q}`, type: 'text', x: px, y, text: t, size: 30 * k, width: pw, weight: q ? 400 : 700, show, fade: 0.3, style: {fill}}); y += wrapText(t, 30 * k, pw).length * 1.3 * 30 * k + 10 * k; });
    }
    facts.push(`with ${fmt(sol.V)} V across the circuit (${Array.isArray(s.cells) ? `${s.cells[n]} cells of 1.5 V` : 'the battery'}), the total resistance is ${fmt(sol.R, 3)} Ω and the current ${fmt(sol.I, 3)} A`
      + Object.entries(sol.parts).map(([id, q]) => `; ${id}: ${fmt(q.R, 3)} Ω, ${fmt(q.I, 3)} A, ${fmt(q.V, 3)} V${s.power ? `, ${fmt(q.P, 3)} W` : ''}`).join(''));
  });
  for (const x of s.items) if (!isGroup(x) && x.kind === 'wire') facts.push(`the ${x.material ?? 'nichrome'} wire, ${fmt(x.length ?? 1)} m long with a cross-section of ${fmt(x.area ?? 1)} mm², has R = ρl/A = ${fmt(resistance(x), 3)} Ω (ρ = ${RESISTIVITY[(x.material ?? 'nichrome').toLowerCase()].toExponential(2)} Ω m)`);
  for (const g of s.items.filter(isGroup)) facts.push(`in parallel group ${g.id}, 1/R = ${g.parallel.map(b => `1/${fmt(branchR(b), 3)}`).join(' + ')}, so R = ${fmt(groupR(g), 3)} Ω, less than the smallest branch`);
  // Moving charges: around the main loop, and round each parallel branch, faster where the current is larger.
  const mode = s.flow === true ? 'conventional' : s.flow || 'none', electrons = mode === 'electrons' || mode === 'both';
  if (mode !== 'none' && closed) {
    const loop: Vec[] = [[X0, bTop], [X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1], [X0, bBot]];
    const lengthOf = (pts: Vec[]) => pts.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0);
    const along = (pts: Vec[], d: number): Vec => { for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (d <= L) return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * d / L, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * d / L]; d -= L; } return pts.at(-1)!; };
    const sol = sols[sols.length - 1], Imax = Math.max(sol.I, 1e-9), dur = T0 + sols.length * E + 1;
    const dots = (pts: Vec[], I: number, tag: string, count: number) => {
      const L = lengthOf(pts), speed = 140 * k * I / Imax;
      for (let d = 0; d < count; d++) {
        const keysX: Key[] = [], keysY: Key[] = [];
        for (let t = 0; t <= dur; t += 0.1) { const q = along(pts, (d * L / count + speed * t) % L); keysX.push([round(t, 2), round(q[0], 2)]); keysY.push([round(t, 2), round(q[1], 2)]); }
        props.push({id: `${tag}-charge${d}`, type: 'circle', x: keysX[0][1], y: keysY[0][1], r: 6 * k, keys: {x: keysX, y: keysY}, show: [Math.max(T0, closeT), 1e9], style: {fill: electrons ? 'cool' : 'good'}, layer: 5});
      }
    };
    // Electrons go the other way round: the same paths reversed.
    const flip = (pts: Vec[]) => (electrons ? [...pts].reverse() : pts);
    dots(flip(loop), sol.I, 'main', 14);
    branchPaths.forEach(({pts, branch: [gid, q]}) => { if (q > 0) dots(flip(pts), sol.groups[gid].branches[q], `${gid}b${q}`, 4); });
    if (mode === 'both') {
      // Conventional current as fixed arrows (+ round to −), against the moving electrons.
      const mids: [Vec, Vec][] = [[[X0 + 0.36 * (X1 - X0), Y0], [1, 0]], [[X1, (Y0 + Y1) / 2], [0, 1]], [[X0 + 0.16 * (X1 - X0), Y1], [-1, 0]]];
      mids.forEach(([m, d], j) => props.push({id: `conv-arrow${j}`, type: 'arrow', x1: round(m[0] - d[0] * 40 * k + (d[1] ? 30 * k : 0), 2), y1: round(m[1] - d[1] * 40 * k - (d[0] ? 28 * k : 0), 2),
        x2: round(m[0] + d[0] * 40 * k + (d[1] ? 30 * k : 0), 2), y2: round(m[1] + d[1] * 40 * k - (d[0] ? 28 * k : 0), 2), head: 18 * k, show: [Math.max(T0, closeT), 1e9], style: {stroke: 'accent', width: 5 * k}, layer: 6}));
      text('conv-label', 'conventional current: + to −', X0 + 0.36 * (X1 - X0), Y0 - 64 * k, 'accent', 24, 'middle', [Math.max(T0, closeT), 1e9]);
    }
    text('flow-note', mode === 'conventional' ? 'moving dots: conventional current, from + to −' : mode === 'electrons' ? 'moving dots: electrons, from − to +'
      : 'blue dots: electrons, − to +; orange arrows: conventional current, + to −', left + 10 * k, bottom + 4 * k, electrons ? 'cool' : 'muted', 22, 'start');
  }
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: T0 + sols.length * E + 1, theme: s.theme ?? 'dark', props, actors: [],
    meta: {verb: 'circuit', facts, anchors, solution: sols.map(x => ({V: x.V, R: round(x.R, 6), I: round(x.I, 6)}))}};
}

/** A close-up of a wire: charge drifting through it, a marked cross-section, the charge that has crossed it counted
 * against a clock, and I = Q/t. Each dot stands for a packet of charge; 1 C is about 6 × 10¹⁸ electrons. */
function wireView(s: CircuitSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, panel = s.panel !== false;
  const left = 0.04 * W, right = panel ? 0.62 * W : 0.96 * W, top = panel ? 0.14 * H : (s.title ? 0.24 : 0.14) * H, bottom = 0.92 * H;
  const I = s.current ?? 1, T = s.seconds_each ?? 6, T0 = 0.8, cy = (top + bottom) / 2 - 0.05 * (bottom - top), R = 0.14 * (bottom - top);
  const x0 = left + 10 * k, x1 = right - 10 * k, xs = (x0 + x1) / 2, props: Prop[] = [];
  props.push({id: 'wire', type: 'rect', x: x0, y: round(cy - R, 2), w: round(x1 - x0, 2), h: round(2 * R, 2), r: R, style: {fill: 'accent', opacity: 0.12, stroke: 'accent', width: 3 * k}, layer: 1});
  // The cross-section: an upright ellipse across the wire.
  const ring: Vec[] = Array.from({length: 41}, (_, j) => { const a = (j / 40) * 2 * Math.PI; return [round(xs + 0.28 * R * Math.cos(a), 2), round(cy + R * Math.sin(a), 2)] as Vec; });
  props.push({id: 'section', type: 'polyline', points: ring, closed: true, style: {stroke: 'cool', width: 4 * k, fill: 'cool', opacity: 0.25}, layer: 3},
    {id: 'section-label', type: 'text', x: round(xs, 2), y: round(cy - R - 30 * k, 2), text: 'cross-section', size: 26 * k, align: 'middle', weight: 700, style: {fill: 'cool', stroke: 'paper', width: 7 * k}, layer: 6});
  // Dots stand for packets of charge (0.1 C each when I = 1 A): they cross the section at I ÷ 0.1 a second.
  const packet = 0.1 * Math.max(I, 0.1), speed = 160 * k, rate = I / packet, lanes = 3, spacing = speed * lanes / rate, dur = T0 + T + 1.2;   // rate shared by the lanes
  let id = 0;
  for (let lane = 0; lane < lanes; lane++) {
    const y = cy + (lane - 1) * 0.55 * R;
    // A steady stream: dots wait just before the wire, move through it, and wait just past it (both ends masked).
    const inX = x0 - 20 * k, outX = x1 + 20 * k;
    for (let x = x0 - speed * dur + lane * spacing / lanes; x < x1; x += spacing) {
      const te = Math.max(0, (inX - x) / speed), tx = (outX - x) / speed;
      const keys: Key[] = [[0, round(Math.max(x, inX), 2)], ...(te > 0 ? [[round(te, 3), round(inX, 2)] as Key] : []),
        [round(Math.min(tx, dur), 3), round(Math.min(outX, x + speed * dur), 2), 'linear'], [round(dur + 1, 3), round(Math.min(outX, x + speed * dur), 2)]];
      props.push({id: `charge${id++}`, type: 'circle', x: keys[0][1], y: round(y, 2), r: 8 * k, keys: {x: keys}, show: [T0, 1e9], style: {fill: 'good'}, layer: 4});
    }
  }
  // Masks just beyond the wire's ends (not over the panel): the waiting dots hide behind them.
  props.push({id: 'clip-left', type: 'rect', x: round(x0 - 40 * k, 2), y: round(cy - R - 4 * k, 2), w: 40 * k, h: round(2 * R + 8 * k, 2), style: {fill: 'paper'}, layer: 5},
    {id: 'clip-right', type: 'rect', x: round(x1, 2), y: round(cy - R - 4 * k, 2), w: 40 * k, h: round(2 * R + 8 * k, 2), style: {fill: 'paper'}, layer: 5},
    {id: 'direction', type: 'arrow', x1: round(x0 + 20 * k, 2), y1: round(cy + R + 40 * k, 2), x2: round(x0 + 220 * k, 2), y2: round(cy + R + 40 * k, 2), head: 18 * k, style: {stroke: 'good', width: 4 * k}, layer: 6},
    {id: 'direction-label', type: 'text', x: round(x0 + 240 * k, 2), y: round(cy + R + 46 * k, 2), text: 'flow of charge (current)', size: 24 * k, style: {fill: 'good'}, layer: 6});
  const ry = cy + R + 110 * k;
  props.push({id: 'clock', type: 'readout', x: left + 10 * k, y: round(ry, 2), size: 34 * k, text: 't = {t} s', decimals: 1, measures: {t: {kind: 'keys', keys: [[T0, 0], [T0 + T, T, 'linear']]}}},
    {id: 'charge', type: 'readout', x: left + 10 * k, y: round(ry + 50 * k, 2), size: 34 * k, text: 'Q = {q} C', decimals: 2, measures: {q: {kind: 'keys', keys: [[T0, 0], [T0 + T, I * T, 'linear']]}}, style: {fill: 'good'}},
    {id: 'rate', type: 'text', x: left + 10 * k, y: round(ry + 100 * k, 2), size: 34 * k, weight: 700, text: `I = Q / t = ${fmt(I * T)} C ÷ ${fmt(T)} s = ${fmt(I)} A`, show: [T0 + T, 1e9], fade: 0.3, style: {fill: 'accent'}});
  const lines = ['Current is the charge crossing a cross-section each second', 'I = Q / t: coulombs per second, amperes', `1 A is 1 C a second; 1 C is the charge of about 6 × 10¹⁸ electrons`];
  if (panel) {
    const px = 0.66 * W, pw = W - px - 40 * k;
    let row = 0.14 * H;
    if (s.title) { props.push({id: 'title', type: 'text', x: px, y: row, text: s.title, size: 44 * k, weight: 700, width: pw}); row += wrapText(s.title, 44 * k, pw).length * 1.25 * 44 * k + 18 * k; }
    lines.forEach((t, j) => { props.push({id: `line${j}`, type: 'text', x: px, y: row, text: t, size: 30 * k, width: pw, weight: j ? 400 : 700, show: [1 + 1.2 * j, 1e9], fade: 0.3}); row += wrapText(t, 30 * k, pw).length * 1.3 * 30 * k + 12 * k; });
  } else if (s.title) props.push({id: 'title', type: 'text', x: left, y: 0.16 * H, text: s.title, size: 44 * k, weight: 700, width: 0.92 * W});
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: T0 + T + 1.2, theme: s.theme ?? 'dark', props, actors: [],
    meta: {verb: 'circuit', facts: [`a current of ${fmt(I)} A carries ${fmt(I * T)} C across the cross-section in ${fmt(T)} s: I = Q/t`,
      'one ampere is one coulomb of charge crossing a cross-section each second; one coulomb is the charge of nearly 6 × 10^18 electrons',
      `here each dot stands for ${fmt(packet)} C`], anchors: {section: [round(xs, 2), round(cy, 2)]}}};
}

/** Potential difference as work per unit charge: a charge Q pushed from A to B across a component, the work done on it
 * counted as it goes, then V = W/Q. */
function workView(s: CircuitSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, panel = s.panel !== false;
  const left = 0.04 * W, right = panel ? 0.62 * W : 0.96 * W, top = panel ? 0.14 * H : (s.title ? 0.24 : 0.14) * H, bottom = 0.92 * H;
  const V = s.volts!, Q = s.charge ?? 1, Wk = V * Q, T = s.seconds_each ?? 6, T0 = 0.8, y = top + 0.4 * (bottom - top);
  const ax = left + 0.12 * (right - left), bx = right - 0.12 * (right - left), cx = (ax + bx) / 2, half = 0.16 * (bx - ax), props: Prop[] = [];
  const st = {stroke: 'ink', width: 4 * k};
  props.push({id: 'wire-a', type: 'line', x1: round(ax, 2), y1: round(y, 2), x2: round(cx - half, 2), y2: round(y, 2), style: st, layer: 2},
    {id: 'wire-b', type: 'line', x1: round(cx + half, 2), y1: round(y, 2), x2: round(bx, 2), y2: round(y, 2), style: st, layer: 2});
  const zig: Vec[] = [[cx - half, y]];
  for (let q = 0; q < 8; q++) zig.push([cx - half + (q + 0.5) * (2 * half / 8), y + (q % 2 ? 16 : -16) * k]);
  zig.push([cx + half, y]);
  props.push({id: 'component', type: 'polyline', points: zig.map(q => [round(q[0], 2), round(q[1], 2)] as Vec), style: st, layer: 3});
  for (const [name, x] of [['A', ax], ['B', bx]] as const) props.push({id: `point-${name}`, type: 'circle', x: round(x, 2), y: round(y, 2), r: 10 * k, style: {fill: 'cool'}, layer: 4},
    {id: `point-${name}-label`, type: 'text', x: round(x, 2), y: round(y + 44 * k, 2), text: name, size: 34 * k, align: 'middle', weight: 700, style: {fill: 'cool'}, layer: 5});
  // The charge, carried from A to B at a steady pace; the work done on it grows in step.
  const t1 = T0 + 0.5, t2 = T0 + T - 0.5;
  props.push({id: 'charge', type: 'circle', x: round(ax, 2), y: round(y - 40 * k, 2), r: 32 * k, keys: {x: [[t1, round(ax, 2)], [t2, round(bx, 2), 'linear']]}, style: {fill: 'good'}, layer: 6},
    {id: 'charge-label', type: 'text', x: round(ax, 2), y: round(y - 40 * k, 2), text: `+${fmt(Q)} C`, size: 20 * k, align: 'middle', weight: 700, keys: {x: [[t1, round(ax, 2)], [t2, round(bx, 2), 'linear']]}, style: {fill: 'paper'}, layer: 7},
    {id: 'work', type: 'readout', x: left + 10 * k, y: round(y + 130 * k, 2), size: 34 * k, text: 'work done W = {w} J', decimals: 2, measures: {w: {kind: 'keys', keys: [[t1, 0], [t2, Wk, 'linear']]}}, style: {fill: 'accent'}},
    {id: 'v', type: 'text', x: left + 10 * k, y: round(y + 182 * k, 2), size: 34 * k, weight: 700, text: `V = W / Q = ${fmt(Wk)} J ÷ ${fmt(Q)} C = ${fmt(V)} V`, show: [t2, 1e9], fade: 0.3, style: {fill: 'cool'}});
  const lines = ['Potential difference between A and B: the work done to move a unit charge from A to B', 'V = W / Q, in joules per coulomb: volts', `1 V: 1 J of work for each coulomb moved`];
  if (panel) {
    const px = 0.66 * W, pw = W - px - 40 * k;
    let row = 0.14 * H;
    if (s.title) { props.push({id: 'title', type: 'text', x: px, y: row, text: s.title, size: 44 * k, weight: 700, width: pw}); row += wrapText(s.title, 44 * k, pw).length * 1.25 * 44 * k + 18 * k; }
    lines.forEach((t, j) => { props.push({id: `line${j}`, type: 'text', x: px, y: row, text: t, size: 30 * k, width: pw, weight: j ? 400 : 700, show: [1 + 1.2 * j, 1e9], fade: 0.3}); row += wrapText(t, 30 * k, pw).length * 1.3 * 30 * k + 12 * k; });
  } else if (s.title) props.push({id: 'title', type: 'text', x: left, y: 0.16 * H, text: s.title, size: 44 * k, weight: 700, width: 0.92 * W});
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: T0 + T + 1, theme: s.theme ?? 'dark', props, actors: [],
    meta: {verb: 'circuit', facts: [`moving ${fmt(Q)} C from A to B across a potential difference of ${fmt(V)} V takes ${fmt(Wk)} J of work: V = W/Q`,
      'one volt is the potential difference across which one joule of work moves one coulomb of charge'], anchors: {A: [round(ax, 2), round(y, 2)], B: [round(bx, 2), round(y, 2)]}}};
}
