// Linkwork as plain JS for a browser: every source file with its types stripped and its imports pointing at .js. Usage: node mirror.ts outdir
import {mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {dirname, join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const src = join(dirname(dirname(fileURLToPath(import.meta.url))), 'src'), out = process.argv[2], part = `${out}.part-${process.pid}`;
const files = (dir: string): string[] => readdirSync(dir).flatMap(name => { const p = join(dir, name); return statSync(p).isDirectory() ? files(p) : name.endsWith('.ts') && name !== 'cli.ts' ? [p] : []; });
for (const f of files(src)) {
  const target = join(part, relative(src, f)).replace(/\.ts$/, '.js');
  mkdirSync(dirname(target), {recursive: true});
  writeFileSync(target, stripTypeScriptTypes(readFileSync(f, 'utf8'), {mode: 'strip'}).replace(/((?:from|import)\s*\(?\s*['"])(\.{1,2}\/[^'"]+?)\.ts(['"])/g, '$1$2.js$3'));
}
mkdirSync(dirname(out), {recursive: true});
renameSync(part, out);
