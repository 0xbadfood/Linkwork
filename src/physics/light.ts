// Light: photon energy and wavelength (E = hc / λ) and the colour of a wavelength.

/** hc in eV·nm. */
export const HC = 1239.84;
export const wavelengthNm = (energyEv: number): number => HC / energyEv;
export const energyEv = (wavelength: number): number => HC / wavelength;

export type Band = 'ultraviolet' | 'visible' | 'infrared';
export const bandOf = (nm: number): Band => (nm < 380 ? 'ultraviolet' : nm > 750 ? 'infrared' : 'visible');

/** The everyday colour name of a visible wavelength. */
export function colourName(nm: number): string {
  if (nm < 380 || nm > 750) return bandOf(nm);
  return nm < 450 ? 'violet' : nm < 480 ? 'blue' : nm < 500 ? 'blue-green' : nm < 570 ? 'green' : nm < 590 ? 'yellow' : nm < 620 ? 'orange' : 'red';
}

/** The sRGB colour of a visible wavelength (Bruton's approximation, dimmed towards the ends of the spectrum). Light
 * outside the visible band has no colour; it gets a stand-in so it can still be drawn, and callers should say so. */
export function wavelengthColour(nm: number): string {
  if (nm < 380) return '#b9a7ff';
  if (nm > 750) return '#d9785f';
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else r = 1;
  const edge = nm < 420 ? 0.3 + 0.7 * (nm - 380) / 40 : nm > 700 ? 0.3 + 0.7 * (750 - nm) / 50 : 1;
  const hex = (x: number) => Math.round(255 * Math.pow(x * edge, 0.8)).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** Hydrogen's energy levels: E_n = −13.6 eV / n². */
export const hydrogenLevel = (n: number): number => -13.6 / (n * n);

/** A lighter tint of a colour for text on a dark background (deep violets and blues are hard to read as text). */
export function readable(hex: string, white = 0.45): string {
  const v = hex.replace('#', '');
  const c = [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16));
  return '#' + c.map(x => Math.round(x + (255 - x) * white).toString(16).padStart(2, '0')).join('');
}
