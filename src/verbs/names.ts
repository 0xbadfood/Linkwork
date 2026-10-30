// A name that is too long is reported with its length and the limit: a bare "name is short" left the planner guessing,
// and it lengthened "heavier child" (13 characters, limit 12) four tries running (C9 of keph1-06, 2026-10-30).
export function nameError(where: string, value: unknown, max: number, examples: string): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return `${where} is a short name (${examples})`;
  if (value.length > max) return `${where} "${value}" has ${value.length} characters, at most ${max}: shorten it (${examples})`;
  return undefined;
}
