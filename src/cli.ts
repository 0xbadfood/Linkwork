#!/usr/bin/env node
// linkwork compile | check | svg | frames | verbs. A file is a scene, or a verb spec (it has "verb"), which is
// compiled first.
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {check} from './check.ts';
import type {Scene} from './scene.ts';
import {svg} from './svg.ts';
import {cards, compile, VERBS} from './verbs/index.ts';

const USAGE = `linkwork compile <spec.json> [-o scene.json]
linkwork check <file.json> [--every n]           errors, one per line; exit 1 if any
linkwork svg <file.json> --t <seconds> [-o out.svg] [--transparent]
linkwork frames <file.json> --out <dir> [--every n] [--transparent]
linkwork verbs [--json [--all]]                 the verbs, or their cards as JSON`;

function arg(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function load(path: string): {scene?: Scene; errors: string[]} {
  let data: any;
  try { data = JSON.parse(readFileSync(path, 'utf8')); } catch (e) { return {errors: [`${path}: ${(e as Error).message}`]}; }
  return data && typeof data.verb === 'string' ? compile(data) : {scene: data as Scene, errors: []};
}

function main(argv: string[]): number {
  const [command, file, ...rest] = argv;
  if (command === 'verbs') {
    // --json prints the cards (all statuses with --all), for a pipeline's planner.
    if (argv.includes('--json')) { console.log(JSON.stringify(cards(argv.includes('--all') ? ['candidate', 'trial', 'trusted'] : ['trusted']), null, 1)); return 0; }
    for (const [name, v] of Object.entries(VERBS)) console.log(`${name}: ${v.about}`);
    return 0;
  }
  if (!command || !file) { console.error(USAGE); return 2; }
  const {scene, errors} = load(file);
  if (!scene) { errors.forEach(e => console.log(e)); return 1; }
  const transparent = rest.includes('--transparent') ? {background: false} : {};
  switch (command) {
    case 'compile': {
      const out = JSON.stringify(scene, null, 1);
      const o = arg(rest, '-o');
      if (o) writeFileSync(o, out); else console.log(out);
      return 0;
    }
    case 'check': {
      const problems = check(scene, {every: Number(arg(rest, '--every') ?? 1)});
      problems.forEach(e => console.log(e));
      if (!problems.length) console.error(`ok: ${scene.duration.toFixed(2)} s, ${scene.actors.length} actor(s), ${scene.props.length} props`);
      return problems.length ? 1 : 0;
    }
    case 'svg': {
      const out = svg(scene, Number(arg(rest, '--t') ?? 0), transparent);
      const o = arg(rest, '-o');
      if (o) writeFileSync(o, out); else process.stdout.write(out);
      return 0;
    }
    case 'frames': {
      const dir = arg(rest, '--out');
      if (!dir) { console.error(USAGE); return 2; }
      mkdirSync(dir, {recursive: true});
      const every = Number(arg(rest, '--every') ?? 1), n = Math.floor(scene.duration * scene.fps);
      for (let i = 0; i <= n; i += every) writeFileSync(join(dir, `${String(i).padStart(5, '0')}.svg`), svg(scene, i / scene.fps, transparent));
      console.error(`${Math.floor(n / every) + 1} frames in ${dir}`);
      return 0;
    }
  }
  console.error(USAGE);
  return 2;
}

process.exitCode = main(process.argv.slice(2));
