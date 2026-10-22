// Easing curves, named so scene data can choose them.
export type Ease = 'linear' | 'in' | 'out' | 'inOut' | 'hold' | 'outBack' | 'sine';

const CURVES: Record<Ease, (x: number) => number> = {
  linear: x => x,
  in: x => x * x * x,
  out: x => 1 - (1 - x) ** 3,
  inOut: x => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2),
  hold: x => (x < 1 ? 0 : 1),
  outBack: x => 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2,
  sine: x => (1 - Math.cos(Math.PI * x)) / 2,
};
export const EASES = Object.keys(CURVES) as Ease[];
export const ease = (name: Ease | undefined, x: number): number =>
  CURVES[name ?? 'inOut'](Math.min(1, Math.max(0, x)));
