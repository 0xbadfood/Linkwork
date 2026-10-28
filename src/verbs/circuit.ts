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
  key?: 'closed' | 'open';
  ammeter?: boolean;
  /** Voltmeters across these items (component or group ids). */
  voltmeters?: string[];
  /** Label every branch's current. */
  currents?: boolean;
  /** Charges moving along the wires, faster where the current is larger. */
  flow?: boolean;
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
  const cells = Array.isArray(s.cells) ? s.cells : s.cells === undefined ? [] : [s.cells];
  if (s.cells !== undefined && s.volts !== undefined) e.push('circuit: give cells or volts, not both');
  if (s.cells === undefined && s.volts === undefined) e.push('circuit: give the battery: cells (1.5 V each, or a list shown in turn) or volts');
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
  for (const v of s.voltmeters ?? []) if (!ids.has(v)) e.push(`circuit: voltmeters: no item ${JSON.stringify(v)}; ids are ${[...ids].join(', ')}`);
  if (s.voltmeters !== undefined && s.voltmeters.length > 4) e.push('circuit: voltmeters is up to 4 ids');
  if (s.key !== undefined && !['open', 'closed'].includes(s.key)) e.push('circuit: key is open or closed');
  if (s.seconds_each !== undefined && !(isNum(s.seconds_each) && s.seconds_each >= 3 && s.seconds_each <= 12)) e.push('circuit: seconds_each is 3 to 12');
  return e;
}

export function circuit(s: CircuitSpec): Scene {
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
  const states = (Array.isArray(s.cells) ? s.cells : [s.cells]).map(c => (c === undefined ? s.volts! : c * CELL));
  const closed = (s.key ?? 'closed') === 'closed', E = s.seconds_each ?? 6, T0 = 0.6;
  // Battery on the left side: cells as long (+) and short (−) plates; key and ammeter on the top wire.
  // A battery given in volts is drawn as the usual two-cell symbol; one given in cells, cell by cell.
  const by = (Y0 + Y1) / 2, nCells = Array.isArray(s.cells) ? Math.max(...s.cells) : s.cells ?? 2, pitch = 16 * k;
  const bTop = by - (nCells * pitch) / 2, bBot = by + (nCells * pitch) / 2;
  line('wire-left-top', [X0, Y0], [X0, bTop - 6 * k]); line('wire-left-bottom', [X0, bBot + 6 * k], [X0, Y1]);
  for (let c = 0; c < Math.min(nCells, 8); c++) {
    const y = bTop + c * pitch;
    line(`cell${c}-plus`, [X0 - 26 * k, y], [X0 + 26 * k, y], {style: {stroke: 'ink', width: 4 * k}});
    line(`cell${c}-minus`, [X0 - 13 * k, y + 8 * k], [X0 + 13 * k, y + 8 * k], {style: {stroke: 'ink', width: 9 * k}});
  }
  text('plus', '+', X0 - 44 * k, bTop + 4 * k, 'accent'); text('minus', '−', X0 - 44 * k, bBot + 4 * k, 'accent');
  anchors.battery = [X0, by];
  const keyX = X0 + 0.22 * (X1 - X0), amX = X0 + 0.5 * (X1 - X0), amR = 26 * k;
  line('wire-top-1', [X0, Y0], [keyX - 22 * k, Y0]);
  props.push({id: 'key', type: 'circle', x: round(keyX, 2), y: round(Y0, 2), r: 20 * k, style: {stroke: 'ink', width: 3 * k, fill: 'paper'}, layer: 3});
  if (closed) props.push({id: 'key-plug', type: 'circle', x: round(keyX, 2), y: round(Y0, 2), r: 7 * k, style: {fill: 'ink'}, layer: 4});
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
  (s.voltmeters ?? []).forEach((id, q) => {
    const [xa, xb, yt] = ends[id], yv = yt - 40 * k - 0 * q, cx = (xa + xb) / 2;
    line(`vm-${id}-l`, [xa, yt + 50 * k], [xa, yv], {style: {stroke: 'cool', width: 2.5 * k}}); line(`vm-${id}-r`, [xb, yt + 50 * k], [xb, yv], {style: {stroke: 'cool', width: 2.5 * k}});
    line(`vm-${id}-tl`, [xa, yv], [cx - 24 * k, yv], {style: {stroke: 'cool', width: 2.5 * k}}); line(`vm-${id}-tr`, [cx + 24 * k, yv], [xb, yv], {style: {stroke: 'cool', width: 2.5 * k}});
    props.push({id: `vm-${id}`, type: 'circle', x: round(cx, 2), y: round(yv, 2), r: 24 * k, style: {stroke: 'cool', width: 3.5 * k, fill: 'paper'}, layer: 3});
    text(`vm-${id}-V`, 'V', cx, yv + 2 * k, 'cool', 26);
    anchors[`voltmeter_${id}`] = [round(cx, 2), round(yv, 2)];
  });
  // Each battery in turn: the solution, the meters' readings, the bulbs' glow and the panel.
  const px = 0.66 * W, pw = W - px - 40 * k;
  let row = 0.14 * H;
  if (panel && s.title) { props.push({id: 'title', type: 'text', x: px, y: row, text: s.title, size: 44 * k, weight: 700, width: pw}); row += wrapText(s.title, 44 * k, pw).length * 1.25 * 44 * k + 18 * k; }
  if (!panel && s.title) props.push({id: 'title', type: 'text', x: left, y: 0.16 * H, text: s.title, size: 44 * k, weight: 700, width: 0.92 * W});
  const sols = states.map(V => solve(s.items, V, closed));
  const maxP = Math.max(1e-9, ...sols.flatMap(sol => Object.values(sol.parts).map(q => q.P)));
  sols.forEach((sol, n) => {
    const s0 = T0 + n * E, show: [number, number] = [s0, n === sols.length - 1 ? 1e9 : s0 + E];
    text(`battery-v${n}`, `${fmt(sol.V)} V`, X0 - 60 * k, by, 'accent', 28, 'end', show);
    if (s.ammeter !== false) text(`ammeter-read${n}`, `I = ${fmt(sol.I, 3)} A`, amX, Y0 - 44 * k, 'cool', 28, 'middle', show);
    for (const id of s.voltmeters ?? []) {
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
        ...(s.voltmeters ?? []).map(id => [`V across ${id} = ${fmt(sol.parts[id]?.V ?? sol.groups[id]?.V ?? 0, 3)} V`, 'cool'] as [string, string])];
      let y = row;
      rows.forEach(([t, fill], q) => { props.push({id: `row${n}-${q}`, type: 'text', x: px, y, text: t, size: 30 * k, width: pw, weight: q ? 400 : 700, show, fade: 0.3, style: {fill}}); y += wrapText(t, 30 * k, pw).length * 1.3 * 30 * k + 10 * k; });
    }
    facts.push(`with ${fmt(sol.V)} V across the circuit (${Array.isArray(s.cells) ? `${s.cells[n]} cells of 1.5 V` : 'the battery'}), the total resistance is ${fmt(sol.R, 3)} Ω and the current ${fmt(sol.I, 3)} A`
      + Object.entries(sol.parts).map(([id, q]) => `; ${id}: ${fmt(q.R, 3)} Ω, ${fmt(q.I, 3)} A, ${fmt(q.V, 3)} V${s.power ? `, ${fmt(q.P, 3)} W` : ''}`).join(''));
  });
  for (const x of s.items) if (!isGroup(x) && x.kind === 'wire') facts.push(`the ${x.material ?? 'nichrome'} wire, ${fmt(x.length ?? 1)} m long with a cross-section of ${fmt(x.area ?? 1)} mm², has R = ρl/A = ${fmt(resistance(x), 3)} Ω (ρ = ${RESISTIVITY[(x.material ?? 'nichrome').toLowerCase()].toExponential(2)} Ω m)`);
  for (const g of s.items.filter(isGroup)) facts.push(`in parallel group ${g.id}, 1/R = ${g.parallel.map(b => `1/${fmt(branchR(b), 3)}`).join(' + ')}, so R = ${fmt(groupR(g), 3)} Ω, less than the smallest branch`);
  // Moving charges: around the main loop, and round each parallel branch, faster where the current is larger.
  if (s.flow && closed) {
    const loop: Vec[] = [[X0, bTop], [X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1], [X0, bBot]];
    const lengthOf = (pts: Vec[]) => pts.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0);
    const along = (pts: Vec[], d: number): Vec => { for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (d <= L) return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * d / L, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * d / L]; d -= L; } return pts.at(-1)!; };
    const sol = sols[sols.length - 1], Imax = Math.max(sol.I, 1e-9), dur = T0 + sols.length * E + 1;
    const dots = (pts: Vec[], I: number, tag: string, count: number) => {
      const L = lengthOf(pts), speed = 140 * k * I / Imax;
      for (let d = 0; d < count; d++) {
        const keysX: Key[] = [], keysY: Key[] = [];
        for (let t = 0; t <= dur; t += 0.1) { const q = along(pts, (d * L / count + speed * t) % L); keysX.push([round(t, 2), round(q[0], 2)]); keysY.push([round(t, 2), round(q[1], 2)]); }
        props.push({id: `${tag}-charge${d}`, type: 'circle', x: keysX[0][1], y: keysY[0][1], r: 6 * k, keys: {x: keysX, y: keysY}, show: [T0, 1e9], style: {fill: 'good'}, layer: 5});
      }
    };
    dots(loop, sol.I, 'main', 14);
    branchPaths.forEach(({pts, branch: [gid, q]}) => { if (q > 0) dots(pts, sol.groups[gid].branches[q], `${gid}b${q}`, 4); });
    text('flow-note', 'moving dots: conventional current, from + to −', left + 10 * k, bottom + 4 * k, 'muted', 22, 'start');
  }
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: T0 + sols.length * E + 1, theme: s.theme ?? 'dark', props, actors: [],
    meta: {verb: 'circuit', facts, anchors, solution: sols.map(x => ({V: x.V, R: round(x.R, 6), I: round(x.I, 6)}))}};
}
