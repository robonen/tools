import { hexToRgba, hslToHsv, hsvToHsl, hsvToRgb, rgbToHex, rgbToHsv } from './convert';
import type { HSVA } from './types';

const RGB_RE = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i;
const HSL_RE = /^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)$/i;

/**
 * Parse a hex (`#rgb`/`#rrggbb`/`#rrggbbaa`), `rgb()`/`rgba()` or
 * `hsl()`/`hsla()` color string into canonical {@link HSVA}, or `null` when the
 * input cannot be parsed.
 */
export function parseColor(input: string): HSVA | null {
  const value = input.trim();

  const hexMatch = hexToRgba(value);
  if (hexMatch) {
    return { ...rgbToHsv(hexMatch), a: hexMatch.a };
  }

  const rgbMatch = RGB_RE.exec(value);
  if (rgbMatch) {
    const r = Number(rgbMatch[1]);
    const g = Number(rgbMatch[2]);
    const b = Number(rgbMatch[3]);
    const a = rgbMatch[4] === undefined ? 1 : Number(rgbMatch[4]);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b) || Number.isNaN(a)) return null;
    return { ...rgbToHsv({ r, g, b }), a };
  }

  const hslMatch = HSL_RE.exec(value);
  if (hslMatch) {
    const h = Number(hslMatch[1]);
    const s = Number(hslMatch[2]) / 100;
    const l = Number(hslMatch[3]) / 100;
    const a = hslMatch[4] === undefined ? 1 : Number(hslMatch[4]);
    if (Number.isNaN(h) || Number.isNaN(s) || Number.isNaN(l) || Number.isNaN(a)) return null;
    return { ...hslToHsv({ h, s, l }), a };
  }

  return null;
}

/**
 * Format a canonical {@link HSVA} color as a string in the requested CSS
 * `format`.
 */
export function formatHsva(hsva: HSVA, format: 'hex' | 'hex8' | 'rgb' | 'rgba' | 'hsl' | 'hsla'): string {
  const rgb = hsvToRgb(hsva);

  switch (format) {
    case 'hex':
      return rgbToHex(rgb);
    case 'hex8':
      return rgbToHex(rgb, hsva.a);
    case 'rgb':
      return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    case 'rgba':
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${hsva.a})`;
    case 'hsl': {
      const hsl = hsvToHsl(hsva);
      return `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s * 100)}%, ${Math.round(hsl.l * 100)}%)`;
    }
    case 'hsla': {
      const hsl = hsvToHsl(hsva);
      return `hsla(${Math.round(hsl.h)}, ${Math.round(hsl.s * 100)}%, ${Math.round(hsl.l * 100)}%, ${hsva.a})`;
    }
  }
}
