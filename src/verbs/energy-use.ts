// energy_use: electrical energy used at home (Class 10 Electricity, C9 Electric Power, 2026-10-29). Each appliance
// draws its rated power P for its hours a day; the energy is E = P × t, counted on an energy meter in kilowatt-hours
// (the commercial unit, 1 kWh = 3.6 × 10⁶ J), and the bill is the units times the rate. An appliance that cycles on
// and off (a refrigerator's compressor) runs for a fraction of its hours: its average power is that fraction of its
// rating. Given the supply's voltage, each appliance draws I = P/V and the total can be set against a fuse (domestic
// circuits, overloading).
import type {Prop, Scene} from '../scene.ts';
import {wrapText} from '../svg.ts';
import {round, type Vec} from '../vec.ts';

type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'};
export type Appliance = {name: string; watts: number; hours?: number; count?: number; duty?: number};
export type EnergyUseSpec = Common & {
  verb: 'energy_use';
  appliances: Appliance[];
  /** Days the use repeats (a month's bill: 30). */
  days?: number;
  /** Cost of one kWh (one unit), in rupees. */
  rate?: number;
  /** Show 1 kWh = 1000 W × 3600 s = 3.6 × 10⁶ J, and the energy in joules. */
  units?: boolean;
  /** The supply voltage: each appliance's current I = P/V and the total. */
  volts?: number;
  /** A fuse's rating in A, set against the total current (needs volts). */
  fuse?: number;
  panel?: boolean;
  seconds?: number;
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
/** A number as a book prints it: grouped thousands, at most `places` decimals, no trailing zeros. */
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
/** 3.46 × 10⁸ */
const sci = (x: number) => { const [m, e] = x.toExponential(2).split('e'); return `${Number(m)} × 10${[...String(Number(e))].map(c => c === '-' ? '⁻' : SUP[+c]).join('')}`; };
export const num = (x: number, places = 2) => x.toLocaleString('en-IN', {maximumFractionDigits: places});
/** Each appliance's energy in Wh over the days, and the total in kWh (duty: the fraction of its hours it runs). */
export function energyUse(s: Pick<EnergyUseSpec, 'appliances' | 'days'>) {
  const days = s.days ?? 1;
  const each = s.appliances.map(a => ({hours: (a.hours ?? 1) * days, wh: a.watts * (a.count ?? 1) * (a.hours ?? 1) * days * (a.duty ?? 1)}));
  return {each, kwh: each.reduce((sum, a) => sum + a.wh, 0) / 1000};
}

export function energyUseErrors(s: EnergyUseSpec): string[] {
  const e: string[] = [];
  if (!Array.isArray(s.appliances) || s.appliances.length < 1 || s.appliances.length > 5) return ['energy_use: appliances is a list of 1 to 5 {name, watts, hours?, count?, duty?}'];
  s.appliances.forEach((a, j) => {
    const at = `energy_use: appliances[${j}]`;
    if (typeof a?.name !== 'string' || !a.name.trim() || a.name.length > 24) e.push(`${at}.name is a short name (up to 24 letters): bulb, fan, refrigerator, heater, ...`);
    if (!(isNum(a?.watts) && a.watts > 0 && a.watts <= 10000)) e.push(`${at}.watts is its rated power, above 0 and up to 10000 W`);
    if (a?.hours !== undefined && !(isNum(a.hours) && a.hours > 0 && a.hours <= 24)) e.push(`${at}.hours is hours of use a day, above 0 and up to 24`);
    if (a?.count !== undefined && !(Number.isInteger(a.count) && a.count >= 1 && a.count <= 20)) e.push(`${at}.count is a whole number 1 to 20`);
    if (a?.duty !== undefined && !(isNum(a.duty) && a.duty > 0 && a.duty <= 1)) e.push(`${at}.duty is the fraction of its hours it runs, above 0 and up to 1 (0.4: on 40% of the time)`);
  });
  if (s.days !== undefined && !(Number.isInteger(s.days) && s.days >= 1 && s.days <= 31)) e.push('energy_use: days is a whole number 1 to 31');
  if (s.rate !== undefined && !(isNum(s.rate) && s.rate > 0 && s.rate <= 100)) e.push('energy_use: rate is rupees per kWh, above 0 and up to 100');
  if (s.volts !== undefined && !(isNum(s.volts) && s.volts > 0 && s.volts <= 440)) e.push('energy_use: volts is the supply voltage, up to 440 V (mains: 220)');
  if (s.fuse !== undefined && !(isNum(s.fuse) && s.fuse > 0 && s.fuse <= 63)) e.push('energy_use: fuse is its rating in A, up to 63');
  if (s.fuse !== undefined && s.volts === undefined) e.push('energy_use: a fuse needs volts, to work out the current');
  if (s.units !== undefined && typeof s.units !== 'boolean') e.push('energy_use: units is true or false');
  if (s.panel !== undefined && typeof s.panel !== 'boolean') e.push('energy_use: panel is true or false');
  if (s.seconds !== undefined && !(isNum(s.seconds) && s.seconds >= 6 && s.seconds <= 20)) e.push('energy_use: seconds is 6 to 20');
  return e;
}

export function energyUseScene(s: EnergyUseSpec): Scene {
  const W = s.width ?? 1920, H = s.height ?? 1080, k = H / 1080, panel = s.panel !== false;
  const left = 0.04 * W, right = panel ? 0.62 * W : 0.96 * W, top = (panel ? 0.13 : s.title ? 0.24 : 0.14) * H, bottom = 0.94 * H;
  const T = s.seconds ?? 10, props: Prop[] = [], facts: string[] = [], anchors: Record<string, Vec> = {};
  const days = s.days ?? 1, {each, kwh} = energyUse(s), t0 = 1.6, t1 = Math.max(t0 + 3, T - 3.2);
  const text = (id: string, value: string, x: number, y: number, fill = 'ink', size = 28, align: 'start' | 'middle' | 'end' = 'start', t = 0, weight = 700) =>
    props.push({id, type: 'text', x: round(x, 2), y: round(y, 2), text: value, size: size * k, align, weight, show: [t, 1e9], fade: 0.3, style: {fill}, layer: 6});
  const per = days > 1 && s.appliances.length === 1 ? `${num(s.appliances[0].hours ?? 1)} h a day × ${days} days` : '';
  // Rows of appliances above the meter: each with its icon, name and rating, and a bar of its hours filling in time.
  const n = s.appliances.length, rowsBottom = bottom - 0.27 * (bottom - top), rh = Math.min(150 * k, (rowsBottom - top) / n);
  const rowsTop = top + Math.max(0, (rowsBottom - top - n * rh) / 2);   // a few rows sit in the middle of their room
  const barX = left + 0.42 * (right - left), barW = right - 30 * k - barX;
  s.appliances.forEach((a, j) => {
    const y = rowsTop + rh * (j + 0.5), on = 0.3 + 0.35 * j, count = a.count ?? 1, {hours, wh} = each[j];
    props.push(...icon(a.name, [left + 45 * k, y], Math.min(1, rh / (130 * k)) * k, `app${j}`, on));
    text(`app${j}-name`, `${count > 1 ? `${count} × ` : ''}${a.name}`, left + 105 * k, y - 8 * k, 'ink', 28, 'start', on);
    text(`app${j}-watts`, `${num(a.watts)} W${a.duty ? `, on ${Math.round(a.duty * 100)}% of the time` : ''}`, left + 105 * k, y + 28 * k, 'accent', 24, 'start', on, 400);
    props.push({id: `app${j}-track`, type: 'rect', x: round(barX, 2), y: round(y - 14 * k, 2), w: round(barW, 2), h: 28 * k, r: 6 * k, style: {fill: 'faint', opacity: 0.5}, show: [on, 1e9], fade: 0.3, layer: 2});
    if (a.duty && a.duty < 1) {
      // A cycling appliance: on and off in turn (twelve illustrative cycles), so the bar fills only where it runs.
      for (let c = 0; c < 12; c++) {
        const x = barX + barW * c / 12, w = barW * a.duty / 12, ts = t0 + (t1 - t0) * c / 12;
        props.push({id: `app${j}-on${c}`, type: 'rect', x: round(x, 2), y: round(y - 14 * k, 2), w: 0, h: 28 * k, keys: {w: [[ts, 0], [ts + (t1 - t0) * a.duty / 12, round(w, 2), 'linear']]}, style: {fill: 'good'}, layer: 3});
      }
    } else props.push({id: `app${j}-bar`, type: 'rect', x: round(barX, 2), y: round(y - 14 * k, 2), w: 0, h: 28 * k, r: 6 * k, keys: {w: [[t0, 0], [t1, round(barW, 2), 'linear']]}, style: {fill: 'good'}, layer: 3});
    props.push({id: `app${j}-hours`, type: 'readout', x: round(barX, 2), y: round(y + 44 * k, 2), size: 24 * k, text: days > 1 ? 'day {d}' : '{h} h', decimals: days > 1 ? 0 : 1,
      measures: days > 1 ? {d: {kind: 'keys', keys: [[t0, 0], [t1, days, 'linear']]}} : {h: {kind: 'keys', keys: [[t0, 0], [t1, hours, 'linear']]}}, style: {fill: 'muted'}, layer: 6});
    text(`app${j}-energy`, `${num(wh / 1000, 3)} kWh`, barX + barW, y + 44 * k, 'good', 24, 'end', t1);
    anchors[`app${j}`] = [round(left + 45 * k, 2), round(y, 2)];
    facts.push(`${count > 1 ? `${count} × ` : ''}${a.name}: ${num(a.watts)} W${count > 1 ? ' each' : ''} for ${num(hours)} h${a.duty ? `, running ${Math.round(a.duty * 100)}% of that time` : ''}: E = P × t = ${num(wh)} Wh = ${num(wh / 1000, 3)} kWh`);
    if (s.volts) facts.push(`${a.name} on ${num(s.volts)} V draws I = P/V = ${num(a.watts * count / s.volts)} A`);
  });
  // The energy meter: kilowatt-hours counted as the appliances run.
  const meter = kwh < 1 ? kwh * 1000 : kwh;   // under a unit it counts watt-hours (1 W for 1 h reads 1 Wh, not 0.00 kWh)
  const mx = left + 0.1 * (right - left), my = rowsBottom + 20 * k, mw = 0.8 * (right - left), mh = bottom - my;
  props.push({id: 'meter', type: 'rect', x: round(mx, 2), y: round(my, 2), w: round(mw, 2), h: round(mh, 2), r: 14 * k, style: {fill: 'paper', stroke: 'muted', width: 3 * k}, layer: 4});
  text('meter-name', 'energy meter', mx + 24 * k, my + 40 * k, 'muted', 24, 'start', 0, 400);
  props.push({id: 'meter-reading', type: 'readout', x: round(mx + mw / 2, 2), y: round(my + mh * 0.68, 2), size: 64 * k, align: 'middle', font: 'mono', weight: 700, text: kwh < 1 ? '{e} Wh' : '{e} kWh', decimals: Number.isInteger(round(meter, 2)) || meter >= 100 ? 0 : meter >= 10 ? 1 : 2,
    measures: {e: {kind: 'keys', keys: [[t0, 0], [t1, meter, 'linear']]}}, style: {fill: 'good'}, layer: 6});
  anchors.meter = [round(mx + mw / 2, 2), round(my + mh / 2, 2)];
  // The working, in the panel or under the title: E = P × t, the total, units, current and cost.
  const lines: string[] = ['E = P × t'];
  const total = s.appliances.length > 1 ? `total: ${num(kwh, 3)} kWh (units)` : `${num(s.appliances[0].watts * (s.appliances[0].count ?? 1))} W × ${num(each[0].hours)} h${s.appliances[0].duty ? ` × ${s.appliances[0].duty}` : ''} = ${num(each[0].wh)} Wh = ${num(kwh, 3)} kWh`;
  lines.push(total);
  if (per) lines.push(per);
  if (s.units) lines.push('1 kWh = 1000 W × 3600 s = 3.6 × 10⁶ J', `${num(kwh, 3)} kWh = ${sci(kwh * 3.6e6)} J`);
  if (s.rate) lines.push(`cost = ${num(kwh, 3)} kWh × Rs ${s.rate.toFixed(2)} = Rs ${num(kwh * s.rate)}`);
  const watts = s.appliances.reduce((sum, a) => sum + a.watts * (a.count ?? 1), 0);
  if (s.volts) {
    const I = watts / s.volts;
    lines.push(`current: I = P/V = ${num(watts)} W / ${num(s.volts)} V = ${num(I)} A`);
    if (s.fuse) lines.push(I > s.fuse ? `${num(I)} A is more than the ${num(s.fuse)} A fuse: it melts and breaks the circuit` : `${num(I)} A is within the ${num(s.fuse)} A fuse`);
    facts.push(`all together the appliances take ${num(watts)} W from ${num(s.volts)} V: a current of ${num(I)} A`);
    if (s.fuse) facts.push(I > s.fuse ? `${num(I)} A exceeds the fuse's ${num(s.fuse)} A rating, so the fuse wire melts and breaks the circuit (overloading)` : `${num(I)} A is within the fuse's ${num(s.fuse)} A rating`);
  }
  facts.push(`energy used: ${num(kwh, 3)} kWh, that is ${num(kwh, 3)} units on the meter${days > 1 ? ` over ${days} days` : ''}`, '1 kWh = 1000 W × 3600 s = 3.6 × 10⁶ J');
  if (s.rate) facts.push(`at Rs ${s.rate.toFixed(2)} per kWh the cost is Rs ${num(kwh * s.rate)}`);
  const shown = (j: number) => j < 2 ? 0.6 + 0.4 * j : t1 + 0.3 + 0.7 * (j - 2);
  if (panel) {
    const px = 0.66 * W, pw = W - px - 40 * k;
    let row = 0.14 * H;
    if (s.title) { props.push({id: 'title', type: 'text', x: px, y: row, text: s.title, size: 44 * k, weight: 700, width: pw}); row += wrapText(s.title, 44 * k, pw).length * 1.25 * 44 * k + 18 * k; }
    lines.forEach((value, j) => { props.push({id: `line${j}`, type: 'text', x: px, y: row, text: value, size: 30 * k, width: pw, weight: j ? 400 : 700, show: [shown(j), 1e9], fade: 0.3}); row += wrapText(value, 30 * k, pw).length * 1.3 * 30 * k + 12 * k; });
  } else {
    if (s.title) props.push({id: 'title', type: 'text', x: left, y: 0.16 * H, text: s.title, size: 44 * k, weight: 700, width: 0.92 * W});
    text('working', lines.slice(1).join('   ·   '), left, (s.title ? 0.21 : 0.16) * H, 'accent', 28, 'start', t1 + 0.3, 400);
  }
  return {linkwork: 1, width: W, height: H, fps: s.fps ?? 30, duration: T, theme: s.theme ?? 'dark', props, actors: [], meta: {verb: 'energy_use', facts, anchors}};
}

/** A plain icon for an appliance, chosen by its name (a plug for any other); it lights when the appliance is on. */
function icon(name: string, [x, y]: Vec, k: number, id: string, on: number): Prop[] {
  const lit = {show: [on, 1e9] as [number, number], fade: 0.3}, line = {stroke: 'ink', width: 3 * k}, kind = name.toLowerCase();
  if (/bulb|lamp|light/.test(kind)) return [
    {id: `${id}-glass`, type: 'circle', x: round(x, 2), y: round(y - 8 * k, 2), r: 24 * k, ...lit, style: {fill: 'accent', opacity: 0.85, ...line}, layer: 4},
    {id: `${id}-base`, type: 'rect', x: round(x - 11 * k, 2), y: round(y + 16 * k, 2), w: 22 * k, h: 18 * k, ...lit, style: {fill: 'muted'}, layer: 4}];
  if (/fan/.test(kind)) return [0, 120, 240].map((d, j) => {
    const a = d * Math.PI / 180;
    return {id: `${id}-blade${j}`, type: 'line', x1: round(x, 2), y1: round(y, 2), x2: round(x + 32 * k * Math.cos(a), 2), y2: round(y + 32 * k * Math.sin(a), 2), ...lit, style: {stroke: 'cool', width: 10 * k}, layer: 4} as Prop;
  }).concat([{id: `${id}-hub`, type: 'circle', x: round(x, 2), y: round(y, 2), r: 8 * k, ...lit, style: {fill: 'ink'}, layer: 5}]);
  if (/fridge|refrigerator|freezer/.test(kind)) return [
    {id: `${id}-body`, type: 'rect', x: round(x - 22 * k, 2), y: round(y - 40 * k, 2), w: 44 * k, h: 80 * k, r: 5 * k, ...lit, style: {fill: 'faint', ...line}, layer: 4},
    {id: `${id}-door`, type: 'line', x1: round(x - 22 * k, 2), y1: round(y - 12 * k, 2), x2: round(x + 22 * k, 2), y2: round(y - 12 * k, 2), ...lit, style: line, layer: 5}];
  if (/tv|television|computer|monitor/.test(kind)) return [
    {id: `${id}-screen`, type: 'rect', x: round(x - 34 * k, 2), y: round(y - 26 * k, 2), w: 68 * k, h: 44 * k, r: 4 * k, ...lit, style: {fill: 'cool', opacity: 0.6, ...line}, layer: 4},
    {id: `${id}-stand`, type: 'line', x1: round(x - 14 * k, 2), y1: round(y + 30 * k, 2), x2: round(x + 14 * k, 2), y2: round(y + 30 * k, 2), ...lit, style: line, layer: 4}];
  if (/heater|iron|geyser|kettle|toaster|oven|stove|cooker/.test(kind)) return [
    {id: `${id}-body`, type: 'rect', x: round(x - 32 * k, 2), y: round(y - 24 * k, 2), w: 64 * k, h: 48 * k, r: 6 * k, ...lit, style: {fill: 'faint', ...line}, layer: 4},
    {id: `${id}-coil`, type: 'polyline', points: Array.from({length: 9}, (_, j) => [round(x - 24 * k + 6 * k * j, 2), round(y + (j % 2 ? -10 : 10) * k, 2)] as Vec), ...lit, style: {stroke: 'bad', width: 4 * k}, layer: 5}];
  return [
    {id: `${id}-plug`, type: 'rect', x: round(x - 22 * k, 2), y: round(y - 16 * k, 2), w: 44 * k, h: 36 * k, r: 6 * k, ...lit, style: {fill: 'faint', ...line}, layer: 4},
    ...[-9, 9].map((d, j) => ({id: `${id}-pin${j}`, type: 'line', x1: round(x + d * k, 2), y1: round(y - 16 * k, 2), x2: round(x + d * k, 2), y2: round(y - 34 * k, 2), ...lit, style: {stroke: 'ink', width: 5 * k}, layer: 4} as Prop))];
}

