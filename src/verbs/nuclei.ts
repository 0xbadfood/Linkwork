// Class 12 Nuclei (leph2-05, 2026-11-04), and ICSE Class 10 radioactivity: one verb, every radius, mass, energy and
// bend computed from the book's constants (mp = 1.00727 u, mn = 1.00866 u, me = 0.00055 u, 1 u = 931.5 MeV/c²,
// R₀ = 1.2 fm) and measured atomic masses.
//
// nucleus  make: nuclides as balls of protons and neutrons, with ᴬ_Z X, and whether they are isotopes, isobars or
//          isotones. size: nuclei to one scale, R = R₀A^⅓, their density the same (Example 13.1: 2.29 × 10¹⁷ kg m⁻³).
//          defect: Z protons and N neutrons come together and the nucleus weighs less; ΔM c² is the binding energy
//          (Example 13.3: O-16, 127.5 MeV). curve: Fig. 13.1, binding energy per nucleon against A, with the fission
//          (A = 240 → 2 × 120, about 200 MeV) or fusion step marked. force: Fig. 13.2, the potential energy of two
//          nucleons, a minimum at r₀ ≈ 0.8 fm (its shape only: the book gives no depth). decay: α, β⁻, β⁺ or γ from a
//          named nucleus, Z and A kept in the books. rays: α, β and γ through an electric or magnetic field, bent by
//          their true charge-to-momentum ratios. penetration: paper, aluminium and lead stop α, β and γ in turn.
//          fission: a neutron splits U-235 into the book's fragments and neutrons. chain: the neutrons of one fission
//          start the next. fusion: the book's p-p and d-d reactions and the p-p cycle, Q from the masses.
import {kit} from './potential.ts';
import {sci} from './electric.ts';
import type {Prop, Scene} from '../scene.ts';

type P2 = [number, number];
type Common = {title?: string; width?: number; height?: number; fps?: number; theme?: 'dark' | 'light'; illustrative?: boolean};
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const sig = (v: number, p = 4) => String(+v.toPrecision(p));
const mev = (q: number) => q.toFixed(2);   // Q values to 0.01 MeV, as the book gives them
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹', SUB = '₀₁₂₃₄₅₆₇₈₉';
const sup = (n: number) => String(n).split('').map(c => SUP[+c]).join(''), sub = (n: number) => String(n).split('').map(c => SUB[+c]).join('');

export const SYMBOLS = ('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr ' +
  'Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl ' +
  'Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm').split(' ');
/** The book's constants (B8, B9, B13, B93). */
export const MP = 1.00727, MN = 1.00866, ME = 0.00055, U_MEV = 931.5, R0 = 1.2, U_KG = 1.660563e-27;
/** Measured atomic masses in u (AME). */
export const ATOMIC_MASS: Record<string, number> = {'H-1': 1.007825, 'H-2': 2.014102, 'H-3': 3.016049, 'He-3': 3.016029, 'He-4': 4.002603,
  'Li-6': 6.015123, 'Li-7': 7.016003, 'Be-9': 9.012183, 'C-12': 12, 'C-14': 14.003242, 'N-14': 14.003074, 'O-16': 15.994915,
  'Ne-20': 19.99244, 'Ca-40': 39.962591, 'Fe-56': 55.934936, 'Ni-62': 61.928345, 'Sn-120': 119.902202, 'Au-197': 196.96657,
  'Pb-208': 207.976652, 'U-235': 235.04393, 'U-238': 238.050788};
/** The neutron's mass on the same scale as the atomic masses, for reaction Q values. */
const MN_ATOMIC = 1.008665, ME_ATOMIC = 0.000549;
/** Measured binding energy per nucleon (MeV) of the nuclei Fig. 13.1 is drawn through. */
export const EBN: [string, number][] = [['H-2', 1.112], ['H-3', 2.827], ['He-3', 2.573], ['He-4', 7.074], ['Li-6', 5.332], ['Li-7', 5.606],
  ['Be-9', 6.463], ['B-11', 6.928], ['C-12', 7.68], ['N-14', 7.476], ['O-16', 7.976], ['F-19', 7.779], ['Ne-20', 8.032], ['Na-23', 8.112],
  ['Mg-24', 8.261], ['Si-28', 8.448], ['S-32', 8.493], ['Ca-40', 8.551], ['Ti-48', 8.723], ['Cr-52', 8.776], ['Fe-56', 8.79], ['Ni-62', 8.795],
  ['Zn-64', 8.736], ['Kr-84', 8.717], ['Zr-90', 8.71], ['Mo-98', 8.635], ['Sn-120', 8.505], ['Xe-132', 8.428], ['Ba-138', 8.393],
  ['Nd-142', 8.346], ['Gd-158', 8.202], ['Er-166', 8.142], ['W-184', 8.005], ['Au-197', 7.916], ['Pb-208', 7.868], ['Bi-209', 7.848],
  ['Th-232', 7.615], ['U-235', 7.591], ['U-238', 7.57], ['Pu-239', 7.56]];

/** 'O-16' → {Z, A, N, X}; undefined when it is not one. */
export function nuclide(name: unknown): {Z: number; A: number; N: number; X: string} | undefined {
  const m = typeof name === 'string' ? /^([A-Z][a-z]?)-(\d{1,3})$/.exec(name.trim()) : null;
  if (!m) return undefined;
  const Z = SYMBOLS.indexOf(m[1]) + 1, A = +m[2];
  return Z > 0 && A >= Z && A <= 300 && (A > Z || Z === 1) ? {Z, A, N: A - Z, X: m[1]} : undefined;
}
const named = (Z: number, A: number) => `${SYMBOLS[Z - 1]}-${A}`;
/** ᴬ_Z X, the book's notation. */
export const notation = (Z: number, A: number, X = SYMBOLS[Z - 1]) => `${sup(A)}${sub(Z)}${X}`;
/** R = R₀A^⅓ in fm. */
export const radiusFm = (A: number) => R0 * Math.cbrt(A);
/** Nuclear density in kg m⁻³ for a nucleus of mass M u and mass number A (Example 13.1: Fe, 55.85 u, 2.29 × 10¹⁷). */
export const density = (M: number, A: number) => M * U_KG / (4 / 3 * Math.PI * (radiusFm(A) * 1e-15) ** 3);
/** The mass defect (u) and binding energy (MeV) from the atomic mass, the book's way (B78): ΔM = Zmp + Nmn − M. */
export function binding(name: string) {
  const n = nuclide(name)!, M = ATOMIC_MASS[name] - n.Z * ME, parts = n.Z * MP + n.N * MN, dM = parts - M;
  return {M, parts, dM, Eb: dM * U_MEV, Ebn: dM * U_MEV / n.A};
}
/** Binding energy per nucleon at mass number A, read along Fig. 13.1 (straight between the plotted nuclei). */
export function ebnAt(A: number) {
  const pts = EBN.map(([n, e]) => [nuclide(n)!.A, e] as P2).sort((a, b) => a[0] - b[0]);
  if (A <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (A <= pts[i][0]) { const [a0, e0] = pts[i - 1], [a1, e1] = pts[i]; return a1 === a0 ? Math.max(e0, e1) : e0 + (e1 - e0) * (A - a0) / (a1 - a0); }
  return pts[pts.length - 1][1];
}
/** Q (MeV) of the book's fusion reactions, from atomic masses (electrons counted). */
export const FUSION = {
  pp: {Q: (2 * ATOMIC_MASS['H-1'] - ATOMIC_MASS['H-2'] - 2 * ME_ATOMIC) * U_MEV, eq: `${notation(1, 1)} + ${notation(1, 1)} → ${notation(1, 2)} + e⁺ + ν`},
  'dd-he3': {Q: (2 * ATOMIC_MASS['H-2'] - ATOMIC_MASS['He-3'] - MN_ATOMIC) * U_MEV, eq: `${notation(1, 2)} + ${notation(1, 2)} → ${notation(2, 3)} + n`},
  'dd-t': {Q: (2 * ATOMIC_MASS['H-2'] - ATOMIC_MASS['H-3'] - ATOMIC_MASS['H-1']) * U_MEV, eq: `${notation(1, 2)} + ${notation(1, 2)} → ${notation(1, 3)} + ${notation(1, 1)}`},
};
/** The p-p cycle's four steps (B66) and the net 4 ¹H → ⁴He (B67), Q from atomic masses. */
export const PP_CYCLE = [
  {eq: `${notation(1, 1)} + ${notation(1, 1)} → ${notation(1, 2)} + e⁺ + ν`, Q: FUSION.pp.Q},
  {eq: 'e⁺ + e⁻ → γ + γ', Q: 4 * ME_ATOMIC * U_MEV / 2},
  {eq: `${notation(1, 2)} + ${notation(1, 1)} → ${notation(2, 3)} + γ`, Q: (ATOMIC_MASS['H-2'] + ATOMIC_MASS['H-1'] - ATOMIC_MASS['He-3']) * U_MEV},
  {eq: `${notation(2, 3)} + ${notation(2, 3)} → ${notation(2, 4)} + ${notation(1, 1)} + ${notation(1, 1)}`, Q: (2 * ATOMIC_MASS['He-3'] - ATOMIC_MASS['He-4'] - 2 * ATOMIC_MASS['H-1']) * U_MEV},
];
export const PP_NET = (4 * ATOMIC_MASS['H-1'] - ATOMIC_MASS['He-4']) * U_MEV;
/** The book's three fission reactions of U-235 (B51, B53, B54). */
export const FISSION: Record<string, [string, string]> = {'Ba-144 + Kr-89': ['Ba-144', 'Kr-89'], 'Sb-133 + Nb-99': ['Sb-133', 'Nb-99'], 'Xe-140 + Sr-94': ['Xe-140', 'Sr-94']};
/** α at 5 MeV and β at 1 MeV: pv in MeV, for their bend in an electric field (∝ q/pv) and radius in a magnetic one (∝ p/q). */
export const RAYS = {alpha: {q: 2, p: Math.sqrt(2 * 3727.4 * 5), pv: 10}, beta: {q: -1, p: Math.sqrt(1 + 2 * .511), pv: (1 + 2 * .511) / (1 + .511)}};

export const NUCLEUS_SHOWS = ['make', 'size', 'defect', 'curve', 'force', 'decay', 'rays', 'penetration', 'fission', 'chain', 'fusion'] as const;
export type NucleusSpec = Common & {verb: 'nucleus'; show: (typeof NUCLEUS_SHOWS)[number];
  /** make: one to four nuclides ('O-16', 'H-2'); size: one to five; defect, decay: one. */
  nuclides?: string[];
  /** size: a nucleus of mass number A instead of named nuclides (a play's slider). */
  A?: number;
  /** size: the picture's width in fm, held whatever the nuclei (a play's one scale). */
  span?: number;
  /** curve: nuclides marked on the curve; and the step drawn on it: 'fission' or 'fusion'. */
  mark?: string[]; process?: 'fission' | 'fusion';
  /** decay: 'alpha', 'beta-', 'beta+' or 'gamma'. */
  mode?: 'alpha' | 'beta-' | 'beta+' | 'gamma';
  /** rays: 'electric' (between charged plates) or 'magnetic' (into the page). */
  field?: 'electric' | 'magnetic';
  /** fission: one of the book's fragment pairs. */
  products?: string;
  /** chain: neutrons that go on from each fission (2 or 3), generations (2 to 4), and controlled: only one goes on. */
  neutrons?: number; generations?: number; controlled?: boolean;
  /** fusion: 'pp', 'dd-he3', 'dd-t' or 'cycle'. */
  reaction?: 'pp' | 'dd-he3' | 'dd-t' | 'cycle'};
const FIELDS = ['nuclides', 'A', 'span', 'mark', 'process', 'mode', 'field', 'products', 'neutrons', 'generations', 'controlled', 'reaction'];
const USES: Record<string, string[]> = {make: ['nuclides'], size: ['nuclides', 'A', 'span'], defect: ['nuclides'], curve: ['mark', 'process'], force: [],
  decay: ['nuclides', 'mode'], rays: ['field'], penetration: [], fission: ['products'], chain: ['neutrons', 'generations', 'controlled'], fusion: ['reaction']};
const DECAY_DEFAULT = {alpha: 'U-238', 'beta-': 'P-32', 'beta+': 'Na-22', gamma: 'Ni-60'};
const daughter = (Z: number, A: number, mode: string) => mode === 'alpha' ? [Z - 2, A - 4] : mode === 'beta-' ? [Z + 1, A] : mode === 'beta+' ? [Z - 1, A] : [Z, A];

export function nucleusErrors(s: NucleusSpec): string[] {
  const W = 'nucleus', e: string[] = [];
  if (!NUCLEUS_SHOWS.includes(s.show)) return [`${W}: show is one of ${NUCLEUS_SHOWS.join(', ')}`];
  e.push(...FIELDS.filter(f => (s as never)[f] !== undefined && !USES[s.show].includes(f)).map(f => `${W}: ${f} is not used by show ${s.show}; leave it out`));
  const most = {make: 4, size: 5, defect: 1, decay: 1}[s.show as string] ?? 0;
  if (s.nuclides !== undefined && most) {
    if (!Array.isArray(s.nuclides) || s.nuclides.length < 1 || s.nuclides.length > most) e.push(`${W}: nuclides is a list of 1 to ${most} names such as 'O-16'`);
    else for (const x of s.nuclides) if (!nuclide(x)) e.push(`${W}: nuclide ${JSON.stringify(x)} is a symbol and mass number such as 'O-16' or 'U-235' (A at least Z)`);
  }
  if (s.show === 'defect') {
    const x = s.nuclides?.[0] ?? 'O-16';
    if (nuclide(x) && !(x in ATOMIC_MASS)) e.push(`${W}: defect knows the measured masses of ${Object.keys(ATOMIC_MASS).filter(n => n !== 'H-1').join(', ')}; use one of them`);
    if (x === 'H-1') e.push(`${W}: H-1 is one proton: it has no binding energy; use H-2 or heavier`);
  }
  if (s.show === 'size') {
    if (s.A !== undefined && !(Number.isInteger(s.A) && s.A >= 1 && s.A <= 260)) e.push(`${W}: A is a mass number, a whole number 1 to 260`);
    if (s.A !== undefined && s.nuclides !== undefined) e.push(`${W}: give nuclides or A, not both`);
    if (s.span !== undefined && !(isNum(s.span) && s.span >= 5 && s.span <= 100)) e.push(`${W}: span is the picture's width in fm, 5 to 100`);
    const As = s.A !== undefined ? [s.A] : (s.nuclides ?? []).map(n => nuclide(n)?.A ?? 1);
    if (isNum(s.span) && As.length && 2 * As.reduce((t, a) => t + radiusFm(a), 0) * 1.15 > s.span) e.push(`${W}: the nuclei are ${sig(2 * As.reduce((t, a) => t + radiusFm(a), 0), 3)} fm across in all and do not fit a span of ${s.span} fm; raise span`);
  }
  if (s.show === 'curve') {
    if (s.mark !== undefined && !(Array.isArray(s.mark) && s.mark.length <= 5 && s.mark.every(m => EBN.some(([n]) => n === m)))) e.push(`${W}: mark is up to five of the plotted nuclei: ${EBN.map(([n]) => n).join(', ')}`);
    if (s.process !== undefined && !['fission', 'fusion'].includes(s.process)) e.push(`${W}: process is 'fission' or 'fusion'`);
  }
  if (s.show === 'decay') {
    if (s.mode === undefined || !['alpha', 'beta-', 'beta+', 'gamma'].includes(s.mode)) e.push(`${W}: decay needs mode: 'alpha', 'beta-', 'beta+' or 'gamma'`);
    else {
      const p = nuclide(s.nuclides?.[0] ?? DECAY_DEFAULT[s.mode]);
      if (p) {
        const [z, a] = daughter(p.Z, p.A, s.mode);
        if (s.mode === 'alpha' && p.Z < 60) e.push(`${W}: α-decay comes from heavy nuclei, such as U-238 or Ra-226; use one with Z of 60 or more`);
        else if (z < 1 || z > SYMBOLS.length || a < z) e.push(`${W}: ${s.mode} from ${s.nuclides?.[0]} leaves no nucleus (Z ${z}, A ${a})`);
      }
    }
  }
  if (s.field !== undefined && !['electric', 'magnetic'].includes(s.field)) e.push(`${W}: field is 'electric' or 'magnetic'`);
  if (s.products !== undefined && !(s.products in FISSION)) e.push(`${W}: products is one of the book's: ${Object.keys(FISSION).join('; ')}`);
  if (s.neutrons !== undefined && ![2, 3].includes(s.neutrons)) e.push(`${W}: neutrons is 2 or 3 (each fission frees two or three)`);
  if (s.generations !== undefined && !(Number.isInteger(s.generations) && s.generations >= 2 && s.generations <= 4)) e.push(`${W}: generations is 2 to 4`);
  if (s.reaction !== undefined && !['pp', 'dd-he3', 'dd-t', 'cycle'].includes(s.reaction)) e.push(`${W}: reaction is 'pp', 'dd-he3', 'dd-t' or 'cycle'`);
  if (s.show === 'fusion' && s.reaction === undefined) e.push(`${W}: fusion needs reaction: 'pp', 'dd-he3', 'dd-t' or 'cycle'`);
  return e;
}

/** The first A spots of a hexagonal packing, nearest the centre first (a nucleus seen flat). */
function packing(A: number): P2[] {
  const spots: P2[] = [], R = Math.ceil(Math.sqrt(A)) + 2;
  for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) spots.push([i + j / 2, j * Math.sqrt(3) / 2]);
  return spots.sort((a, b) => Math.hypot(...a) - Math.hypot(...b) || Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0])).slice(0, A);
}
/** How far the packing of A balls of radius 1 reaches from its centre. */
const reach = (A: number) => Math.max(...packing(A).map(p => Math.hypot(...p))) * 2 + 1;

export function nucleus(s: NucleusSpec): Scene {
  const {k, props, bx, by, bw, bh, cx, cy, arrow, line, poly, label, keysOf, finish} = kit(s);
  const num = !s.illustrative, facts: string[] = [], anchors: Record<string, P2> = {};
  let dur = 7, story = '', second = '', n = 0;
  const PROTON = 'bad', NEUTRON = 'muted';
  // A nucleus of Z protons and N neutrons, balls of radius rb about (x, y), protons spread evenly through it.
  // move: [t0, t1, x1, y1] slides it; show: when it is on screen.
  const ball = (x: number, y: number, r: number, fill: string, extra: Record<string, unknown> = {}) =>
    props.push({id: `b${n++}`, type: 'circle', x, y, r, style: {fill, stroke: 'paper', width: Math.max(1, r * .18)}, layer: 3, ...extra} as Prop);
  const cluster = (Z: number, N: number, x: number, y: number, rb: number, extra: {show?: [number, number]; move?: [number, number, number, number]} = {}) => {
    const A = Z + N, spots = packing(A);
    spots.forEach(([u, v], i) => {
      const p = Math.floor((i + 1) * Z / A) > Math.floor(i * Z / A), px = x + u * 2 * rb, py = y + v * 2 * rb;
      const m = extra.move, keys = m ? {x: [[m[0], px], [m[1], m[2] + u * 2 * rb, 'inOut']], y: [[m[0], py], [m[1], m[3] + v * 2 * rb, 'inOut']]} : undefined;
      ball(px, py, rb, p ? PROTON : NEUTRON, {...(extra.show ? {show: extra.show, fade: .3} : {}), ...(keys ? {keys} : {})});
    });
    bodies.push([x, y, reach(A) * rb]);
    return reach(A) * rb;
  };
  const bodies: [number, number, number][] = [];
  const legend = (y: number) => {
    ball(bx + 14 * k, y, 10 * k, PROTON); label(bx + 32 * k, y + 8 * k, 'proton', PROTON, 22, {align: 'start'});
    ball(bx + 150 * k, y, 10 * k, NEUTRON); label(bx + 168 * k, y + 8 * k, 'neutron', 'muted', 22, {align: 'start'});
  };
  const wave = (p: P2, q: P2, stroke = 'accent', extra: Record<string, unknown> = {}) => {
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]), u = [(q[0] - p[0]) / L, (q[1] - p[1]) / L];
    poly(Array.from({length: 61}, (_, i) => { const s1 = i / 60 * L, w = 9 * k * Math.sin(s1 / (14 * k) * Math.PI); return [p[0] + u[0] * s1 - u[1] * w, p[1] + u[1] * s1 + u[0] * w] as P2; }), stroke, 3, extra);
  };

  if (s.show === 'make') {
    const list = (s.nuclides ?? ['H-1', 'H-2', 'H-3']).map(x => ({name: x, ...nuclide(x)!})), m = list.length;
    const slot = bw / m, rb = Math.min(slot * .42, bh * .3) / Math.max(...list.map(x => reach(x.A)));
    const base = by + bh * .42 + Math.max(...list.map(x => reach(x.A))) * rb + 64 * k;   // one baseline for every name
    list.forEach((x, i) => {
      const xc = bx + slot * (i + .5), yc = by + bh * .42, t = .4 + i * .6;
      cluster(x.Z, x.N, xc, yc, rb, {show: [t, 1e9]});
      label(xc, base, notation(x.Z, x.A, x.X), 'ink', 44, {show: [t, 1e9]});
      if (num) label(xc, base + 40 * k, `Z = ${x.Z}, N = ${x.N}, A = ${x.A}`, 'muted', 24, {show: [t + .3, 1e9]});
      anchors[`nucleus${i + 1}`] = [xc, yc];
      facts.push(`${notation(x.Z, x.A, x.X)}: ${x.Z} proton${x.Z > 1 ? 's' : ''} and ${x.N} neutron${x.N === 1 ? '' : 's'}, A = Z + N = ${x.A}`);
    });
    legend(by + bh * .95);
    const same = (f: (x: typeof list[number]) => number) => m > 1 && list.every(x => f(x) === f(list[0]));
    const kind = same(x => x.Z) ? 'isotopes' : same(x => x.A) ? 'isobars' : same(x => x.N) ? 'isotones' : '';
    story = kind === 'isotopes' ? 'Isotopes: the same number of protons, so the same element, but different numbers of neutrons'
      : kind === 'isobars' ? 'Isobars: the same mass number A, made of different numbers of protons and neutrons'
      : kind === 'isotones' ? 'Isotones: the same number of neutrons, different numbers of protons'
      : 'A nucleus is protons and neutrons: Z protons fix the element, and A = Z + N counts them all';
    second = `In a symbol such as ${notation(8, 16)}, the lower number is Z, the protons; the upper is A, all the nucleons`;
    if (kind) facts.push(`these are ${kind}`);
    dur = Math.max(4.5, 1.6 + m * .6);
  }

  if (s.show === 'size') {
    const list = s.A !== undefined ? [{name: `A = ${s.A}`, A: s.A, Z: 0, X: ''}] : (s.nuclides ?? ['C-12', 'Fe-56', 'U-238']).map(x => ({name: x, ...nuclide(x)!}));
    const Rs = list.map(x => radiusFm(x.A)), across = s.span ?? 2.3 * Rs.reduce((t, r) => t + r, 0);
    const sc = Math.min(bw / across, s.span ? Infinity : bh * .55 / (2 * Math.max(...Rs))), yc = by + bh * .45;
    let x = bx + (bw - 2 * Rs.reduce((t, r) => t + r, 0) * sc * 1.15) / 2;
    list.forEach((nu, i) => {
      const R = Rs[i] * sc, xc = x + R; x += 2 * R * 1.15;
      props.push({id: `nuc${i}`, type: 'circle', x: xc, y: yc, r: R, style: {fill: 'bad', opacity: .55, stroke: 'bad', width: 3 * k}, layer: 2, show: [.3 + i * .4, 1e9], fade: .4} as Prop);
      line([xc, yc], [xc + R, yc], 'ink', 2.5, {show: [.6 + i * .4, 1e9]});
      label(xc, yc + R + 50 * k, nu.Z ? notation(nu.Z, nu.A, nu.X) : nu.name, 'ink', 34, {show: [.3 + i * .4, 1e9]});
      if (num) label(xc, yc + R + 90 * k, `R = ${sig(Rs[i], 3)} fm`, 'accent', 26, {show: [.6 + i * .4, 1e9]});
      anchors[`nucleus${i + 1}`] = [xc, yc]; anchors[`edge${i + 1}`] = [xc + R, yc];
      facts.push(`${nu.Z ? notation(nu.Z, nu.A, nu.X) : nu.name}: R = 1.2 × ${nu.A}^⅓ fm = ${sig(Rs[i], 3)} fm`);
    });
    // a scale bar of a whole number of fm
    const bar = [1, 2, 5, 10].find(f => f * sc >= bw * .08) ?? 10;
    line([bx, by + bh * .95], [bx + bar * sc, by + bh * .95], 'muted', 3); label(bx + bar * sc / 2, by + bh * .95 - 14 * k, num ? `${bar} fm` : 'one scale', 'muted', 22);
    facts.push(`density ≈ ${sci(density(55.85, 56), 'kg m⁻³')} for every nucleus (Example 13.1, Fe: 55.85 u, A = 56); water is 10³ kg m⁻³`);
    story = 'The radius grows only as the cube root of A: eight times the nucleons, twice the radius';
    second = 'Volume grows in step with A, so every nucleus has the same density, like drops of one liquid';
    dur = Math.max(4, 1.4 + list.length * .4);
  }

  if (s.show === 'defect') {
    const name = s.nuclides?.[0] ?? 'O-16', x = nuclide(name)!, b = binding(name), rb = Math.min(bw * .22, bh * .3) / reach(x.A);
    // the nucleons apart on the left (on a loose grid), then together on the right; the binding energy leaves as γ
    const cols = Math.ceil(Math.sqrt(x.A * 1.6)), gap = Math.min(bw * .4 / cols, 5 * rb), spots = packing(x.A), xr = bx + bw * .74, yc = by + bh * .4;
    dur = 7.5;
    spots.forEach(([u, v], i) => {
      const p = Math.floor((i + 1) * x.Z / x.A) > Math.floor(i * x.Z / x.A), j = (i * 7) % x.A;
      const x0 = bx + bw * .05 + (j % cols) * gap, y0 = yc - (Math.ceil(x.A / cols) - 1) * gap / 2 + Math.floor(j / cols) * gap;
      ball(x0, y0, rb, p ? PROTON : NEUTRON, {keys: {x: [[1, x0], [3.6, xr + u * 2 * rb, 'inOut']], y: [[1, y0], [3.6, yc + v * 2 * rb, 'inOut']]}});
    });
    const R = reach(x.A) * rb;
    wave([xr + R + 10 * k, yc - 10 * k], [Math.min(xr + R + 200 * k, bx + bw), yc - 120 * k], 'accent', {show: [3.8, 1e9], fade: .3});
    label(Math.min(xr + R + 120 * k, bx + bw - 40 * k), yc - 140 * k, 'Eb', 'accent', 30, {show: [3.8, 1e9]});
    label(xr, yc - R - 24 * k, notation(x.Z, x.A, x.X), 'ink', 40, {show: [3.6, 1e9]});
    const ly = by + bh * .72;
    if (num) {
      label(bx, ly, `${x.Z} × ${MP} u + ${x.N} × ${MN} u = ${b.parts.toFixed(5)} u`, 'ink', 26, {align: 'start', show: [.6, 1e9]});
      label(bx, ly + 42 * k, `nucleus: M = ${b.M.toFixed(5)} u`, 'ink', 26, {align: 'start', show: [3.8, 1e9]});
      label(bx, ly + 84 * k, `ΔM = ${b.dM.toFixed(5)} u, so Eb = ΔM × 931.5 MeV = ${sig(b.Eb)} MeV`, 'accent', 26, {align: 'start', show: [4.6, 1e9]});
    }
    anchors.nucleus = [xr, yc]; anchors.nucleons = [bx + bw * .05, yc];
    facts.push(`${notation(x.Z, x.A, x.X)}: ΔM = ${b.dM.toFixed(5)} u, Eb = ${sig(b.Eb)} MeV, ${sig(b.Ebn, 3)} MeV per nucleon`,
      `the nucleus is ${sig(100 * b.dM / b.parts, 2)}% lighter than its protons and neutrons apart`);
    story = 'The nucleus weighs less than its protons and neutrons apart: the missing mass left as energy, Eb = ΔM c²';
    second = 'To pull the nucleus apart again, that same energy Eb has to be put back';
  }

  if (s.show === 'curve' || s.show === 'force') {
    // axes on the drawing's left part: x from 0, y from y0 to y1
    const curve = s.show === 'curve', X0 = bx + 60 * k, Y0 = curve ? by + bh * .9 : by + bh * .5, xw = bw - 80 * k;
    const xmax = curve ? 250 : 3, ymax = curve ? 9.5 : 1.3, ymin = curve ? 0 : -1.15, yh = curve ? bh * .82 : bh * .4;
    const X = (a: number) => X0 + a / xmax * xw, Y = (v: number) => Y0 - v / ymax * yh;
    line([X0, Y0], [X0 + xw, Y0], 'ink', 3); line([X0, curve ? Y0 : Y(ymin)], [X0, Y(ymax)], 'ink', 3);
    if (curve) {
      label(X0 + xw, Y0 + 70 * k, 'mass number A', 'muted', 24, {align: 'end'});
      label(X0 - 14 * k, Y(ymax) - 18 * k, 'Ebn (MeV)', 'muted', 24, {align: 'start'});
      if (num) {
        for (const a of [50, 100, 150, 200, 250]) label(X(a), Y0 + 30 * k, String(a), 'muted', 20);
        for (const v of [2, 4, 6, 8]) label(X0 - 10 * k, Y(v) + 7 * k, String(v), 'muted', 20, {align: 'end'});
      }
      const pts = EBN.map(([nm, e]) => ({nm, a: nuclide(nm)!.A, e})).sort((p, q) => p.a - q.a);
      poly(pts.map(p => [X(p.a), Y(p.e)] as P2), 'accent', 3, {draw: 0, keys: {draw: [[.4, 0], [2.6, 1, 'inOut']]}});
      pts.forEach(p => ball(X(p.a), Y(p.e), 5 * k, 'accent', {show: [.4 + 2.2 * p.a / 240, 1e9]}));
      (s.mark ?? []).forEach((m, i) => {
        const p = pts.find(q => q.nm === m)!; anchors[m] = [X(p.a), Y(p.e)];
        ball(X(p.a), Y(p.e), 9 * k, 'ink', {show: [2.8, 1e9]});
        const right = p.a > 150;   // near the right edge the name reads leftwards, inside the graph
        label(X(p.a) + (right ? -14 : 14) * k, Y(p.e) + (i % 2 || right ? 40 : -18) * k, `${notation(nuclide(m)!.Z, p.a)}${num ? `, ${p.e} MeV` : ''}`, 'ink', 22, {align: right ? 'end' : 'start', show: [2.8, 1e9]});
        facts.push(`${m}: Ebn = ${p.e} MeV`);
      });
      if (s.process === 'fission') {
        const e240 = ebnAt(240), e120 = ebnAt(120), Q = 240 * (+e120.toFixed(1) - +e240.toFixed(1));
        ball(X(240), Y(e240), 10 * k, 'bad', {show: [3, 1e9]}); ball(X(120), Y(e120), 10 * k, 'good', {show: [3.8, 1e9]});
        arrow([X(236), Y(e240) - 6 * k], [X(126), Y(e120) + 8 * k], 'bad', 4, {draw: 0, keys: {draw: [[3, 0], [3.8, 1, 'inOut']]}});
        label(X(180), Y(8.9), num ? 'fission: 240 → 2 × 120' : 'fission: heavy → two middle-sized', 'bad', 24, {show: [3.2, 1e9]});
        if (num) label(X(170), Y(5.9), `${e240.toFixed(1)} → ${e120.toFixed(1)} MeV per nucleon: Q ≈ 240 × ${(+e120.toFixed(1) - +e240.toFixed(1)).toFixed(1)} ≈ ${Math.round(Q)} MeV`, 'bad', 22, {show: [4, 1e9]});
        anchors.heavy = [X(240), Y(e240)]; anchors.fragments = [X(120), Y(e120)];
        facts.push(`fission of A = 240 into two A = 120: Ebn ${e240.toFixed(1)} → ${e120.toFixed(1)} MeV, Q ≈ ${Math.round(Q)} MeV, of the order of 200 MeV`);
      } else if (s.process === 'fusion') {
        const d = EBN[0][1], he = EBN[3][1], Q = 4 * (he - d);
        ball(X(2), Y(d), 10 * k, 'cool', {show: [3, 1e9]}); ball(X(4), Y(he), 10 * k, 'good', {show: [3.8, 1e9]});
        arrow([X(2.5), Y(d) - 8 * k], [X(3.8), Y(he) + 12 * k], 'cool', 4, {draw: 0, keys: {draw: [[3, 0], [3.8, 1, 'inOut']]}});
        label(X(14), Y(3.6), 'fusion: two ²H → ⁴He', 'cool', 24, {align: 'start', show: [3.2, 1e9]});
        if (num) label(X(14), Y(2.6), `${d} → ${he} MeV per nucleon: Q ≈ 4 × ${(he - d).toFixed(2)} ≈ ${sig(Q, 3)} MeV`, 'cool', 22, {align: 'start', show: [4, 1e9]});
        anchors.light = [X(2), Y(d)]; anchors.fused = [X(4), Y(he)];
        facts.push(`two deuterons (${d} MeV per nucleon) fusing to helium-4 (${he}) release about ${sig(Q, 3)} MeV`);
      }
      facts.push('Ebn is nearly constant, about 8 MeV, for 30 < A < 170; the peak is about 8.75 MeV near A = 56, and 7.6 MeV at A = 238');
      anchors.peak = [X(56), Y(8.79)];
      story = s.process === 'fission' ? 'A heavy nucleus splitting into two middle ones climbs the curve: its nucleons end more tightly bound, and energy is set free'
        : s.process === 'fusion' ? 'Two light nuclei fusing climb the steep left side of the curve: the bigger nucleus is more tightly bound'
        : 'Binding energy per nucleon is about 8 MeV and nearly flat in the middle, lower for light and heavy nuclei';
      second = 'Energy is released whenever nucleons move into more tightly bound nuclei';
      dur = s.process ? 6.4 : 4.6;
    } else {
      // Fig. 13.2: a smooth well, its minimum at r₀ = 0.8 fm, steeply repulsive inside, gone within a few fm (shape only)
      const r0 = .8, a = .32, V = (r: number) => (1 - Math.exp(-(r - r0) / a)) ** 2 - 1;
      const rs = Array.from({length: 200}, (_, i) => .3 + i * (xmax - .3) / 199).filter(r => V(r) <= ymax);
      poly(rs.map(r => [X(r), Y(V(r))] as P2), 'accent', 5, {draw: 0, keys: {draw: [[.4, 0], [2.6, 1, 'inOut']]}});
      line([X(r0), Y(ymin)], [X(r0), Y(ymax)], 'muted', 2, {show: [2.8, 1e9]}, true);
      label(X(r0), Y(ymin) + 34 * k, num ? 'r₀ ≈ 0.8 fm' : 'r₀', 'ink', 26, {show: [2.8, 1e9]});
      label(X(r0) + 14 * k, Y(1), 'repulsive', 'bad', 24, {align: 'start', show: [3.2, 1e9]});
      label(X(1.5), Y(-.75), 'attractive', 'good', 24, {align: 'start', show: [3.6, 1e9]});
      label(X(xmax), Y0 - 22 * k, 'separation r (fm)', 'muted', 22, {align: 'end'});
      label(X0 + 12 * k, Y(ymax) - 10 * k, 'potential energy', 'muted', 22, {align: 'start'});
      if (num) for (const r of [1, 2, 3]) label(X(r), Y0 + 30 * k, String(r), 'muted', 20);
      label(X(xmax), Y(ymin) + 34 * k, 'shape only: the book gives no depth', 'faint', 20, {align: 'end'});
      anchors.r0 = [X(r0), Y(-1)]; anchors.well = [X(r0), Y(-1)];
      facts.push('the potential energy of two nucleons is least at r₀ ≈ 0.8 fm: attractive beyond, repulsive closer', 'it falls to zero within a few fm: the nuclear force is short-ranged', 'n–n, n–p and p–p feel about the same nuclear force: it does not depend on charge');
      story = 'Closer than r₀ the nucleons push apart; beyond it they pull together, and a few fm out the pull is gone';
      second = 'A short-range pull reaches only its neighbours, so binding energy per nucleon stays nearly constant';
      dur = 5;
    }
  }

  if (s.show === 'decay') {
    const mode = s.mode!, p = nuclide(s.nuclides?.[0] ?? DECAY_DEFAULT[mode])!, [z, a] = daughter(p.Z, p.A, mode);
    const rb = Math.min(bw * .2, bh * .3) / reach(p.A), xc = bx + bw * .32, yc = by + bh * .42;
    dur = 6.5;
    const R = cluster(p.Z, p.N, xc, yc, rb, {show: [0, 2]});
    cluster(z, a - z, xc, yc, rb, {show: [2, 1e9]});
    const parentTag = notation(p.Z, p.A, p.X) + (mode === 'gamma' ? '*' : ''), childTag = notation(z, a);
    label(xc, yc + R + 56 * k, parentTag, 'ink', 40, {show: [0, 2]}); label(xc, yc + R + 56 * k, childTag, 'ink', 40, {show: [2, 1e9]});
    const out: P2 = [bx + bw * .9, by + bh * .14], start: P2 = [xc + R * .7, yc - R * .7];
    let emitted = '';
    if (mode === 'alpha') {
      const at = (t: number, d: number) => start[d] + (out[d] - start[d]) * Math.min(1, Math.max(0, (t - 1.8) / 2.2));
      packing(4).forEach(([u, v], i) => ball(start[0] + u * 2 * rb, start[1] + v * 2 * rb, rb, i % 2 ? NEUTRON : PROTON, {show: [1.8, 1e9], keys: {x: keysOf(dur, t => at(t, 0) + u * 2 * rb), y: keysOf(dur, t => at(t, 1) + v * 2 * rb)}}));
      label(out[0], out[1] + 60 * k, 'α', 'accent', 34, {show: [4, 1e9]}); emitted = `${notation(2, 4)}`;
    } else if (mode === 'gamma') {
      wave(start, out, 'accent', {draw: 0, keys: {draw: [[1.8, 0], [3.4, 1, 'inOut']]}}); label(out[0], out[1] + 50 * k, 'γ', 'accent', 34, {show: [3.4, 1e9]}); emitted = 'γ';
    } else {
      const e = mode === 'beta-' ? 'e⁻' : 'e⁺', nu = mode === 'beta-' ? 'ν̄' : 'ν', out2: P2 = [bx + bw * .9, by + bh * .55];
      for (const [to, r, fill, tag] of [[out, 7, mode === 'beta-' ? 'cool' : 'bad', e], [out2, 4, 'faint', nu]] as [P2, number, string, string][]) {
        const at = (t: number, d: number) => start[d] + (to[d] - start[d]) * Math.min(1, Math.max(0, (t - 1.8) / 1.6));
        ball(start[0], start[1], r * k, fill, {show: [1.8, 1e9], keys: {x: keysOf(dur, t => at(t, 0)), y: keysOf(dur, t => at(t, 1))}});
        label(to[0], to[1] + 40 * k, tag, fill === 'faint' ? 'muted' : fill, 30, {show: [3.4, 1e9]});
      }
      emitted = `${e} + ${nu}`;
    }
    const eq = `${parentTag} → ${childTag} + ${emitted}`;
    label(bx, by + bh * .92, eq, 'ink', 34, {align: 'start', show: [4.4, 1e9]});
    legend(by + bh * .99);
    anchors.parent = [xc, yc]; anchors.emitted = out;
    facts.push(eq, mode === 'alpha' ? 'α-decay: Z falls by 2, A by 4 (a helium nucleus leaves)' : mode === 'gamma' ? 'γ-decay: an excited nucleus gives off a photon; Z and A stay the same'
      : `β${mode === 'beta-' ? '⁻' : '⁺'}-decay: a ${mode === 'beta-' ? 'neutron becomes a proton' : 'proton becomes a neutron'}, Z ${mode === 'beta-' ? 'rises' : 'falls'} by 1, A stays the same`);
    story = mode === 'alpha' ? 'In α-decay the nucleus throws out a helium nucleus: two protons and two neutrons fewer'
      : mode === 'gamma' ? 'In γ-decay an excited nucleus settles by giving off a high-energy photon; it stays the same nuclide'
      : `In β${mode === 'beta-' ? '⁻' : '⁺'}-decay a ${mode === 'beta-' ? 'neutron turns into a proton, giving off an electron' : 'proton turns into a neutron, giving off a positron'} and a ${mode === 'beta-' ? 'antineutrino' : 'neutrino'}`;
    second = 'Charge and the number of nucleons balance on both sides';
  }

  if (s.show === 'rays') {
    // the source in a lead block at the bottom; the beams go up through the field. Bends from their true q/pv (electric)
    // or radius p/q (magnetic), α at 5 MeV, β at 1 MeV: β is scaled to fit, α to the same scale
    const mag = s.field === 'magnetic', x0 = cx, y0 = by + bh * .9, top = by + bh * .06, h = y0 - top;
    props.push({id: 'lead', type: 'rect', x: x0 - 50 * k, y: y0 - 10 * k, w: 100 * k, h: 70 * k, style: {fill: 'muted'}, layer: 2} as Prop);
    label(x0, y0 + 90 * k, 'source in lead', 'muted', 22);
    dur = 6;
    const path = (bend: number): P2[] => Array.from({length: 61}, (_, i) => {
      const y = h * i / 60;
      if (!mag) { const y1 = Math.min(y, L), dx = bend * y1 * y1 + (y > L ? 2 * bend * L * (y - L) : 0); return [x0 + dx, y0 - y]; }
      const r = 1 / bend, ang = Math.min(Math.abs(y / r), Math.PI); return [x0 + Math.sign(bend) * Math.abs(r) * (1 - Math.cos(ang)), y0 - Math.abs(r) * Math.sin(ang)];
    });
    if (mag) {
      for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) label(bx + bw * (.1 + .2 * i), by + bh * (.15 + .2 * j), '×', 'faint', 30);
      label(bx + bw, by + bh * .03, 'B into the page', 'muted', 22, {align: 'end'});
    } else {
      const L = h * .55;
      props.push({id: 'plus', type: 'rect', x: x0 - bw * .36, y: y0 - L, w: 12 * k, h: L, style: {fill: 'bad'}, layer: 2} as Prop, {id: 'minus', type: 'rect', x: x0 + bw * .36 - 12 * k, y: y0 - L, w: 12 * k, h: L, style: {fill: 'cool'}, layer: 2} as Prop);
      label(x0 - bw * .36 - 20 * k, y0 - L / 2, '+', 'bad', 40, {align: 'end'}); label(x0 + bw * .36 + 20 * k, y0 - L / 2, '−', 'cool', 40, {align: 'start'});
    }
    // electric (+ plate left): dx = b y² between the plates, b ∝ q/pv, then straight on; β ends 0.3 of the width aside.
    // magnetic (into the page): a circle of curvature b ∝ −q/p (a positive charge going up turns left); β's radius is
    // 0.55 of the height. α takes the same constant, so the two bends keep their true ratio
    const L = h * .55, bendOf = (r: {q: number; p: number; pv: number}) => mag ? -r.q / r.p : r.q / r.pv;
    const c = mag ? 1 / L / Math.abs(bendOf(RAYS.beta)) : bw * .3 / (L * (2 * h - L)) / Math.abs(bendOf(RAYS.beta));
    ([['alpha', 'accent', 'α'], ['beta', 'cool', 'β'], ['gamma', 'good', 'γ']] as const).forEach(([key, col, tag], i) => {
      const b = key === 'gamma' ? 0 : c * bendOf(RAYS[key]);
      const pts = key === 'gamma' ? [[x0, y0], [x0, top]] as P2[] : path(b);
      poly(pts, col, 4, {draw: 0, keys: {draw: [[.6 + i * .5, 0], [2.6 + i * .5, 1, 'inOut']]}});
      const end = pts[pts.length - 1];
      label(end[0] + (end[0] >= x0 ? 16 : -16) * k, Math.max(end[1], top) + 30 * k, tag, col, 34, {align: end[0] >= x0 ? 'start' : 'end', show: [2.6 + i * .5, 1e9]});
      anchors[key] = end;
    });
    const ratio = (RAYS.alpha.p / RAYS.alpha.q) / (RAYS.beta.p / -RAYS.beta.q);
    facts.push('α: helium nuclei, charge +2e; β: electrons, charge −e; γ: photons, no charge, not bent',
      mag ? `in a magnetic field the α path's radius is ${Math.round(Math.abs(ratio))} times the β path's (α at 5 MeV, β at 1 MeV): it barely bends` : 'between charged plates α bends towards −, β towards + and further (α at 5 MeV, β at 1 MeV)');
    story = mag ? 'The field bends α and β opposite ways, β far more; γ carries no charge and goes straight' : 'α is pulled towards the negative plate, β towards the positive, and γ, uncharged, goes straight';
    second = 'The direction of the bend shows the sign of the charge';
  }

  if (s.show === 'penetration') {
    // three beams from the left; paper stops α, a few mm of aluminium stops β, lead only thins γ
    const xs = bx + bw * .04, rows = [by + bh * .25, by + bh * .5, by + bh * .75], walls = [{x: bx + bw * .3, w: 6 * k, c: 'ink', t: 'paper'},
      {x: bx + bw * .52, w: 26 * k, c: 'muted', t: 'aluminium, a few mm'}, {x: bx + bw * .74, w: 90 * k, c: 'faint', t: 'lead, several cm'}];
    walls.forEach(w => { props.push({id: `wall${w.x}`, type: 'rect', x: w.x, y: by + bh * .1, w: w.w, h: bh * .78, style: {fill: w.c, opacity: .9}, layer: 2} as Prop); label(w.x + w.w / 2, by + bh * .06, w.t, 'muted', 22); });
    dur = 6;
    ([['α', 'accent', walls[0].x], ['β', 'cool', walls[1].x], ['γ', 'good', bx + bw]] as const).forEach(([tag, col, stop], i) => {
      const y = rows[i];
      label(xs, y - 18 * k, tag, col, 34, {align: 'start'});
      if (i < 2) arrow([xs + 40 * k, y], [stop, y], col, 5, {draw: 0, keys: {draw: [[.6 + i * .6, 0], [2 + i * .6, 1, 'inOut']]}});
      else {
        line([xs + 40 * k, y], [walls[2].x, y], col, 6, {draw: 0, keys: {draw: [[1.8, 0], [3, 1, 'inOut']]}});
        arrow([walls[2].x + walls[2].w, y], [bx + bw, y], col, 2.5, {show: [3, 1e9], style: {stroke: col, width: 2.5 * k, opacity: .6}});
      }
      anchors[tag === 'α' ? 'alpha' : tag === 'β' ? 'beta' : 'gamma'] = [i < 2 ? stop : bx + bw, y];
    });
    facts.push('α: stopped by a sheet of paper (or a few cm of air)', 'β: stopped by a few mm of aluminium', 'γ: lead only weakens it, halving a 1 MeV beam about every centimetre');
    story = 'Paper stops α, a few millimetres of aluminium stop β, and γ gets through, only weakened by thick lead';
    second = 'The more strongly a radiation ionises the matter it passes, the sooner it is stopped';
  }

  if (s.show === 'fission') {
    const [f1, f2] = FISSION[s.products ?? 'Ba-144 + Kr-89'].map(x => nuclide(x)!), free = 236 - f1.A - f2.A, rb = Math.min(bw * .18, bh * .26) / reach(236);
    const xc = bx + bw * .5, yc = by + bh * .42, R = reach(235) * rb;
    dur = 7;
    ball(bx, yc, rb * 1.4, NEUTRON, {keys: {x: [[.3, bx], [1.6, xc - R, 'in']]}, show: [0, 1.7]});
    cluster(92, 143, xc, yc, rb, {show: [0, 2.2]});
    const d = bw * .3, out1: P2 = [xc - d * .8, yc - bh * .06], out2: P2 = [xc + d * .8, yc + bh * .1];
    cluster(f1.Z, f1.N, xc - reach(f1.A) * rb * .6, yc, rb, {show: [2.2, 1e9], move: [2.2, 4.6, out1[0], out1[1]]});
    cluster(f2.Z, f2.N, xc + reach(f2.A) * rb * .6, yc, rb, {show: [2.2, 1e9], move: [2.2, 4.6, out2[0], out2[1]]});
    for (let i = 0; i < free; i++) {
      const ang = -1.2 + i * 2.4 / Math.max(1, free - 1) + (i % 2 ? Math.PI : 0), to: P2 = [xc + Math.cos(ang) * bw * .45, yc + Math.sin(ang) * bh * .4];
      ball(xc, yc, rb * 1.4, NEUTRON, {show: [2.2, 1e9], keys: {x: [[2.2, xc], [3.6, Math.min(Math.max(to[0], bx), bx + bw)]], y: [[2.2, yc], [3.6, Math.min(Math.max(to[1], by), by + bh * .8)]]}});
    }
    label(out1[0], out1[1] + reach(f1.A) * rb + 44 * k, notation(f1.Z, f1.A, f1.X), 'ink', 34, {show: [4.6, 1e9]});
    label(out2[0], out2[1] + reach(f2.A) * rb + 44 * k, notation(f2.Z, f2.A, f2.X), 'ink', 34, {show: [4.6, 1e9]});
    const eq = `n + ${notation(92, 235)} → ${notation(92, 236)} → ${notation(f1.Z, f1.A)} + ${notation(f2.Z, f2.A)} + ${free} n`;
    label(bx, by + bh * .93, num ? eq : eq.replace(/\+ \d n$/, '+ neutrons'), 'ink', 30, {align: 'start', show: [5, 1e9]});
    if (num) label(xc, by + bh * .84, 'about 200 MeV released', 'accent', 28, {show: [2.4, 1e9]});
    legend(by + bh * .99);
    anchors.uranium = [xc, yc]; anchors.fragment1 = out1; anchors.fragment2 = out2;
    facts.push(eq, `${free} neutrons go free; Q is of the order of 200 MeV per fission, first as the fragments' kinetic energy, then heat`);
    story = 'A slow neutron splits uranium-235 into two middle-sized nuclei and a few neutrons, releasing about 200 MeV';
    second = 'The fragments are more tightly bound than the uranium nucleus: that is where the energy comes from';
  }

  if (s.show === 'chain') {
    const k3 = s.neutrons ?? 3, G = s.generations ?? 3, ctl = !!s.controlled;
    dur = Math.round((2 + G * 1.4) * 10) / 10;
    const counts = Array.from({length: G}, (_, g) => ctl ? 1 : k3 ** g);
    let prev: P2[] = [];
    counts.forEach((cnt, g) => {
      const x = bx + bw * (g + .5) / G, t = 1 + g * 1.4, pts: P2[] = Array.from({length: cnt}, (_, i) => [x, by + bh * .1 + bh * .76 * (i + .5) / cnt]);
      const r = Math.min(26 * k, bh * .76 / cnt * .32);
      pts.forEach((p, i) => {
        props.push({id: `f${g}-${i}`, type: 'circle', x: p[0], y: p[1], r, style: {fill: 'accent', stroke: 'ink', width: 1.5 * k}, layer: 3, show: [t, 1e9], fade: .3} as Prop);
        if (g) { const from = prev[ctl ? 0 : Math.floor(i / k3)]; arrow([from[0] + 20 * k, from[1]], [p[0] - r - 6 * k, p[1]], 'muted', 2.5, {draw: 0, keys: {draw: [[t - .6, 0], [t, 1]]}}); }
      });
      if (ctl && g < G - 1) pts.forEach(p => { for (let j = 1; j < k3; j++) arrow([p[0] + r, p[1]], [p[0] + r + 50 * k, p[1] + (j % 2 ? 1 : -1) * 60 * k], 'faint', 2, {show: [t + .4, 1e9]}); });
      label(x, by + bh * .97, num ? `${cnt} fission${cnt > 1 ? 's' : ''}` : '', 'muted', 22, {show: [t, 1e9]});
      prev = pts; anchors[`generation${g + 1}`] = pts[0];
    });
    if (ctl) label(bx + bw, by + bh * .04, 'the other neutrons are absorbed', 'muted', 22, {align: 'end'});
    facts.push(ctl ? 'with one neutron going on from each fission, the rate stays steady: a controlled chain, as in a reactor'
      : `with ${k3} neutrons going on from each fission: ${counts.join(', ')} fissions in successive generations`);
    story = ctl ? 'In a reactor the extra neutrons are absorbed, so each fission starts just one more and the power stays steady'
      : 'Each fission frees neutrons that split more nuclei: the number of fissions multiplies at every step';
    second = ctl ? 'Uncontrolled, the count multiplies at each step, as in a bomb' : 'Unchecked, this chain reaction releases enormous energy almost at once';
  }

  if (s.show === 'fusion') {
    const r = s.reaction!, yc = by + bh * .42, rb = Math.min(bw, bh) * .045;
    dur = 7;
    if (r === 'cycle') {
      // four protons come together into helium-4; the four steps and their Q under it
      const xc = bx + bw * .5;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([u, v], i) => ball(xc + u * bw * .3, yc + v * bh * .2, rb, PROTON, {keys: {x: [[.6, xc + u * bw * .3], [3, xc + u * rb, 'inOut']], y: [[.6, yc + v * bh * .2], [3, yc + v * rb, 'inOut']]}, show: [0, 3.1]}));
      cluster(2, 2, xc, yc, rb, {show: [3.1, 1e9]});
      for (const u of [-1, 1]) {
        ball(xc, yc, 6 * k, 'bad', {show: [3.1, 1e9], keys: {x: [[3.1, xc], [4.4, xc + u * bw * .35]], y: [[3.1, yc], [4.4, yc - bh * .25]]}});
        label(xc + u * bw * .35, yc - bh * .25 - 20 * k, 'e⁺', 'bad', 26, {show: [4.4, 1e9]});
      }
      wave([xc + 2 * rb, yc + rb], [xc + bw * .3, yc + bh * .2], 'accent', {show: [3.4, 1e9]});
      label(xc, yc + 3 * rb + 34 * k, notation(2, 4), 'ink', 34, {show: [3.1, 1e9]});
      if (num) PP_CYCLE.forEach((st, i) => label(bx, by + bh * .66 + i * 36 * k, `${st.eq}   ${mev(st.Q)} MeV`, 'muted', 22, {align: 'start', show: [4 + i * .3, 1e9]}));
      if (num) label(bx, by + bh * .66 + 4 * 36 * k + 8 * k, `net: 4 ${notation(1, 1)} + 2e⁻ → ${notation(2, 4)} + 2ν + 6γ + ${sig(PP_NET, 3)} MeV`, 'accent', 24, {align: 'start', show: [5.4, 1e9]});
      anchors.helium = [xc, yc];
      facts.push(`p-p cycle: four hydrogen atoms make one helium-4 atom, releasing ${sig(PP_NET, 3)} MeV`, ...PP_CYCLE.map(st => `${st.eq}: ${mev(st.Q)} MeV`));
      story = 'In the Sun, four protons end as one helium-4 nucleus through the proton-proton cycle';
      second = 'The helium is lighter than the four hydrogen atoms: the difference shines as 26.7 MeV';
    } else {
      const parts = r === 'pp' ? [[1, 0], [1, 0]] : [[1, 1], [1, 1]], prod = r === 'pp' ? [1, 1] : r === 'dd-he3' ? [2, 1] : [1, 2];
      const ej = r === 'pp' ? 'e⁺ + ν' : r === 'dd-he3' ? 'n' : 'p', xl = bx + bw * .08, xr = bx + bw * .92, xc = bx + bw * .5;
      // they close in fast, slow against the Coulomb push, then fuse
      const pos = (t: number) => { const f = Math.min(1, Math.max(0, (t - .5) / 2.6)); return 1 - (1 - f) ** 2; };
      parts.forEach(([z, nn], i) => {
        const x0 = i ? xr : xl, x1 = xc + (i ? 1 : -1) * rb * 1.2;
        packing(z + nn).forEach(([u, v], j) => ball(x0 + u * 2 * rb, yc + v * 2 * rb, rb, j < z ? PROTON : NEUTRON, {show: [0, 3.2], keys: {x: keysOf(3.3, t => x0 + (x1 - x0) * pos(t) + u * 2 * rb)}}));
      });
      cluster(prod[0], prod[1], xc, yc, rb, {show: [3.2, 1e9]});
      const to: P2 = [bx + bw * .9, by + bh * .12];
      ball(xc, yc, (r === 'pp' ? 6 * k : rb), r === 'dd-t' ? PROTON : r === 'dd-he3' ? NEUTRON : 'bad', {show: [3.2, 1e9], keys: {x: [[3.2, xc], [4.6, to[0]]], y: [[3.2, yc], [4.6, to[1]]]}});
      label(to[0], to[1] + 50 * k, ej, 'ink', 28, {show: [4.6, 1e9]});
      label(xc, yc + 4 * rb + 30 * k, notation(prod[0], prod[0] + prod[1]), 'ink', 34, {show: [3.2, 1e9]});
      const F = FUSION[r];
      label(bx, by + bh * .9, num ? `${F.eq} + ${mev(F.Q)} MeV` : F.eq, 'ink', 30, {align: 'start', show: [4.8, 1e9]});
      anchors.product = [xc, yc]; anchors.left = [xl, yc]; anchors.right = [xr, yc];
      facts.push(`${F.eq} + ${mev(F.Q)} MeV (Q from the atomic masses)`, r === 'pp' ? 'two protons must overcome a Coulomb barrier of about 400 keV to fuse' : 'the two deuterons must come within reach of the nuclear force against their Coulomb repulsion');
      story = 'Two light nuclei, pushed apart by their charges, come close enough for the nuclear force to fuse them';
      second = 'The product is lighter than what went in: the difference is released as energy';
    }
    legend(by + bh * .99);
  }

  // A planner's words at a nucleus go above it, not across its nucleons (leph2-05 C2, 2026-11-04: '118 neutrons' and
  // 'gold example only' were written over the gold nucleus)
  const labelAt: Record<string, P2> = {};
  for (const [name, [x, y]] of Object.entries(anchors)) {
    const b = bodies.find(([bx_, by_, r]) => Math.hypot(x - bx_, y - by_) < r * .5);
    if (b) labelAt[name] = [b[0] - b[2], Math.max(by + 16 * k, b[1] - b[2] - 30 * k)];
  }
  return finish('nucleus', s as never, dur, story, second, facts, anchors, s.illustrative, {labelAt});
}
