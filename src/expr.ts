// A small, safe maths expression language: numbers, variables (x, t and named parameters), the constants pi and e,
// + − × ÷ ^ (with implicit multiplication such as 2x or 3(x + 1)), and sin cos tan exp ln log sqrt abs. It is parsed
// into a tree, never evaluated as code. Trees can be evaluated, differentiated exactly and printed.

export type Node =
  | {k: 'num'; v: number; name?: string}
  | {k: 'var'; n: string}
  | {k: 'neg'; a: Node}
  | {k: 'bin'; op: '+' | '-' | '*' | '/' | '^'; a: Node; b: Node}
  | {k: 'fn'; f: Fn; a: Node};
export type Fn = 'sin' | 'cos' | 'tan' | 'exp' | 'ln' | 'log' | 'sqrt' | 'abs';
const FNS = new Set<Fn>(['sin', 'cos', 'tan', 'exp', 'ln', 'log', 'sqrt', 'abs']);
const CONSTS: Record<string, [number, string]> = {pi: [Math.PI, 'π'], 'π': [Math.PI, 'π'], e: [Math.E, 'e']};

type Token = {t: 'num'; v: number} | {t: 'id'; v: string} | {t: 'op'; v: string};

function tokens(src: string): Token[] {
  const out: Token[] = [];
  const s = src.replace(/−/g, '-').replace(/×|·/g, '*').replace(/÷/g, '/').replace(/²/g, '^2').replace(/³/g, '^3');
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    const num = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i));
    if (num && !/^e[a-z]/i.test(s.slice(i))) { out.push({t: 'num', v: Number(num[0])}); i += num[0].length; continue; }
    const id = /^([a-zA-Zπ_][a-zA-Z0-9_]*)/.exec(s.slice(i));
    if (id) {
      // Split runs like "xy" or "pix" into known pieces only when the whole run is not itself a name we know.
      out.push({t: 'id', v: id[0]}); i += id[0].length; continue;
    }
    if ('+-*/^()'.includes(c)) { out.push({t: 'op', v: c}); i++; continue; }
    throw new Error(`unexpected "${c}" in ${JSON.stringify(src)}`);
  }
  return out;
}

export function parse(src: string, names: Iterable<string> = ['x']): Node {
  if (typeof src !== 'string' || !src.trim()) throw new Error('an expression is needed');
  const known = new Set(names);
  const ts = tokens(src);
  let i = 0;
  const peek = () => ts[i];
  const eat = (v?: string) => {
    const tk = ts[i++];
    if (!tk || (v !== undefined && tk.v !== v)) throw new Error(`expected ${v ?? 'more'} in ${JSON.stringify(src)}`);
    return tk;
  };
  const startsAtom = (tk: Token | undefined) => !!tk && (tk.t === 'num' || tk.t === 'id' || tk.v === '(');
  function sum(): Node {
    let a = product();
    while (peek()?.t === 'op' && (peek().v === '+' || peek().v === '-')) {
      const op = eat().v as '+' | '-';
      a = {k: 'bin', op, a, b: product()};
    }
    return a;
  }
  function product(): Node {
    let a = unary();
    for (;;) {
      const tk = peek();
      if (tk?.t === 'op' && (tk.v === '*' || tk.v === '/')) { eat(); a = {k: 'bin', op: tk.v as '*' | '/', a, b: unary()}; }
      else if (startsAtom(tk)) a = {k: 'bin', op: '*', a, b: power()};       // implicit: 2x, 3(x + 1), x sin(x)
      else return a;
    }
  }
  function unary(): Node {
    if (peek()?.t === 'op' && peek().v === '-') { eat(); return {k: 'neg', a: unary()}; }
    if (peek()?.t === 'op' && peek().v === '+') { eat(); return unary(); }
    return power();
  }
  function power(): Node {
    const base = atom();
    if (peek()?.t === 'op' && peek().v === '^') { eat(); return {k: 'bin', op: '^', a: base, b: unary()}; }
    return base;
  }
  function atom(): Node {
    const tk = eat();
    if (tk.t === 'num') return {k: 'num', v: tk.v};
    if (tk.t === 'op' && tk.v === '(') { const e = sum(); eat(')'); return e; }
    if (tk.t === 'id') {
      if (FNS.has(tk.v as Fn)) {
        if (peek()?.v !== '(') throw new Error(`${tk.v} needs brackets: ${tk.v}(…)`);
        eat('('); const a = sum(); eat(')');
        return {k: 'fn', f: tk.v as Fn, a};
      }
      if (Object.hasOwn(CONSTS, tk.v)) return {k: 'num', v: CONSTS[tk.v][0], name: CONSTS[tk.v][1]};
      if (known.has(tk.v)) return {k: 'var', n: tk.v};
      throw new Error(`unknown name "${tk.v}" in ${JSON.stringify(src)} (known: ${[...known].join(', ')}, pi, e, ${[...FNS].join(', ')})`);
    }
    throw new Error(`unexpected "${tk.v}" in ${JSON.stringify(src)}`);
  }
  const tree = sum();
  if (i < ts.length) throw new Error(`unexpected "${ts[i].v}" in ${JSON.stringify(src)}`);
  return tree;
}

/** Errors in an expression, or [] if it parses. */
export function exprErrors(src: unknown, names: Iterable<string> = ['x'], where = 'expression'): string[] {
  try { parse(src as string, names); return []; } catch (e) { return [`${where}: ${(e as Error).message}`]; }
}

/** The value, or NaN where it is undefined (a square root of a negative, a log of 0, a division by 0, …). */
export function evaluate(n: Node, vars: Record<string, number>): number {
  const v = ev(n, vars);
  return Number.isFinite(v) ? v : NaN;
}

function ev(n: Node, vars: Record<string, number>): number {
  switch (n.k) {
    case 'num': return n.v;
    case 'var': return vars[n.n] ?? NaN;
    case 'neg': return -ev(n.a, vars);
    case 'bin': {
      const a = ev(n.a, vars), b = ev(n.b, vars);
      switch (n.op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return b === 0 ? NaN : a / b;
        case '^': return a === 0 && b < 0 ? NaN : Math.pow(a, b);
      }
    }
    // falls through: unreachable
    case 'fn': {
      const a = ev(n.a, vars);
      switch (n.f) {
        case 'sin': return Math.sin(a);
        case 'cos': return Math.cos(a);
        case 'tan': return Math.abs(Math.cos(a)) < 1e-12 ? NaN : Math.tan(a);
        case 'exp': return Math.exp(a);
        case 'ln': return a > 0 ? Math.log(a) : NaN;
        case 'log': return a > 0 ? Math.log10(a) : NaN;
        case 'sqrt': return a >= 0 ? Math.sqrt(a) : NaN;
        case 'abs': return Math.abs(a);
      }
    }
  }
}

const num = (v: number): Node => ({k: 'num', v});
const isNum = (n: Node, v?: number) => n.k === 'num' && (v === undefined || n.v === v);
const has = (n: Node, x: string): boolean =>
  n.k === 'var' ? n.n === x : n.k === 'num' ? false : n.k === 'bin' ? has(n.a, x) || has(n.b, x) : has(n.a, x);

function bin(op: '+' | '-' | '*' | '/' | '^', a: Node, b: Node): Node {
  if (isNum(a) && isNum(b)) {
    const v = ev({k: 'bin', op, a, b}, {});
    if (Number.isFinite(v) && Number.isInteger(v * 1e6)) return num(v);
  }
  switch (op) {
    case '+': if (isNum(a, 0)) return b; if (isNum(b, 0)) return a; if (b.k === 'neg') return bin('-', a, b.a); break;
    case '-': if (isNum(b, 0)) return a; if (isNum(a, 0)) return neg(b); break;
    case '*':
      if (isNum(a, 0) || isNum(b, 0)) return num(0);
      if (isNum(a, 1)) return b; if (isNum(b, 1)) return a;
      if (isNum(a, -1)) return neg(b); if (isNum(b, -1)) return neg(a);
      if (isNum(b) && !isNum(a)) return bin('*', b, a);
      if (isNum(a) && b.k === 'bin' && b.op === '*' && isNum(b.a)) return bin('*', num((a as {v: number}).v * (b.a as {v: number}).v), b.b);
      if (a.k === 'neg') return neg(bin('*', a.a, b));
      if (b.k === 'neg') return neg(bin('*', a, b.a));
      break;
    case '/': if (isNum(a, 0)) return num(0); if (isNum(b, 1)) return a; break;
    case '^': if (isNum(b, 0)) return num(1); if (isNum(b, 1)) return a; break;
  }
  return {k: 'bin', op, a, b};
}
function neg(a: Node): Node {
  if (a.k === 'num') return num(-a.v);
  if (a.k === 'neg') return a.a;
  if (a.k === 'bin' && a.op === '*' && a.a.k === 'num' && !a.a.name) return bin('*', num(-a.a.v), a.b);
  return {k: 'neg', a};
}
const fn = (f: Fn, a: Node): Node => {
  if (a.k === 'num') {
    const v = ev({k: 'fn', f, a}, {});
    if (Number.isFinite(v) && Math.abs(v - Math.round(v)) < 1e-12) return num(Math.round(v));
  }
  return {k: 'fn', f, a};
};

/** The exact derivative with respect to x, lightly simplified. */
export function derivative(n: Node, x = 'x'): Node {
  if (!has(n, x)) return num(0);
  switch (n.k) {
    case 'num': return num(0);
    case 'var': return num(n.n === x ? 1 : 0);
    case 'neg': return neg(derivative(n.a, x));
    case 'bin': {
      const {a, b} = n, da = derivative(a, x), db = derivative(b, x);
      switch (n.op) {
        case '+': return bin('+', da, db);
        case '-': return bin('-', da, db);
        case '*': return bin('+', bin('*', da, b), bin('*', a, db));
        case '/': return bin('/', bin('-', bin('*', da, b), bin('*', a, db)), bin('^', b, num(2)));
        case '^':
          if (!has(b, x)) return bin('*', bin('*', b, bin('^', a, bin('-', b, num(1)))), da);
          if (!has(a, x)) return bin('*', bin('*', n, fn('ln', a)), db);
          return bin('*', n, bin('+', bin('*', db, fn('ln', a)), bin('/', bin('*', b, da), a)));
      }
    }
    // falls through: unreachable
    case 'fn': {
      const a = n.a, da = derivative(a, x);
      const inner = (outer: Node) => bin('*', outer, da);
      switch (n.f) {
        case 'sin': return inner(fn('cos', a));
        case 'cos': return inner(neg(fn('sin', a)));
        case 'tan': return inner(bin('/', num(1), bin('^', fn('cos', a), num(2))));
        case 'exp': return inner(fn('exp', a));
        case 'ln': return bin('/', da, a);
        case 'log': return bin('/', da, bin('*', a, fn('ln', num(10))));
        case 'sqrt': return bin('/', da, bin('*', num(2), fn('sqrt', a)));
        case 'abs': return inner(bin('/', a, fn('abs', a)));
      }
    }
  }
}

const PREC = {'+': 1, '-': 1, '*': 2, '/': 2, '^': 4} as const;
const SUP: Record<string, string> = {'0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'};
const fmt = (v: number) => {
  const r = Math.round(v * 1e6) / 1e6;
  if (Math.abs(r - Math.PI) < 1e-9) return 'π';
  return String(r);
};

/** Print a tree. `pretty` uses school notation (2x², √(x), −) for the screen; otherwise it prints input syntax. */
export function show(n: Node, pretty = true, parent = 0, right = false, parentOp = ''): string {
  const minus = pretty ? '−' : '-';
  let s: string, p: number;
  switch (n.k) {
    case 'num': s = n.name ?? (n.v < 0 ? minus + fmt(-n.v) : fmt(n.v)); p = n.v < 0 && !n.name ? 3 : 9; break;
    case 'var': s = n.n; p = 9; break;
    case 'neg': s = minus + show(n.a, pretty, 3); p = 3; break;
    case 'fn': s = pretty && n.f === 'sqrt' ? `√(${show(n.a, pretty)})` : `${n.f}(${show(n.a, pretty)})`; p = 9; break;
    case 'bin': {
      p = PREC[n.op];
      if (pretty && n.op === '^' && n.b.k === 'num' && Number.isInteger(n.b.v) && n.b.v >= 0 && n.b.v < 10)
        { s = show(n.a, pretty, 5) + SUP[String(n.b.v)]; p = 4; break; }
      const a = show(n.a, pretty, p, false, n.op), b = show(n.b, pretty, p, true, n.op);
      if (n.op === '*' && pretty && (n.a.k === 'num' && (n.b.k === 'var' || n.b.k === 'fn' || (n.b.k === 'bin' && n.b.op === '^'))))
        s = a + b;
      else s = `${a} ${pretty && n.op === '-' ? '−' : pretty && n.op === '*' ? '·' : n.op} ${b}`;
      if (n.op === '^') s = `${a}^${b}`;
    }
  }
  const needs = p < parent || (right && p === parent && (parentOp === '-' || parentOp === '/'));
  return needs ? `(${s})` : s;
}

// Parsed trees are cached by source text, so curves and drivers can name their expression as a string.
const TREES = new Map<string, Node>();
export function tree(src: string, names: Iterable<string> = ['x']): Node {
  const key = `${src}|${[...names].join(',')}`;
  let n = TREES.get(key);
  if (!n) { n = parse(src, names); TREES.set(key, n); }
  return n;
}
/** f(x) for an expression in x. */
export const fOf = (src: string) => { const n = tree(src); return (x: number) => evaluate(n, {x}); };
/** f′(x) for an expression in x, exactly. */
export const dfOf = (src: string) => { const n = derivative(tree(src)); return (x: number) => evaluate(n, {x}); };
