import type { HSL, HSV, RGB, RGBA } from './types';

/**
 * Convert an {@link HSV} color to {@link RGB} (channels rounded to integers).
 */
export function hsvToRgb(hsv: HSV): RGB {
  const h = ((hsv.h % 360) + 360) % 360;
  const s = hsv.s;
  const v = hsv.v;

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  // Map the hue sector to chroma-relative r/g/b locals inline (no tuple alloc).
  let r: number;
  let g: number;
  let b: number;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  }
  else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  }
  else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  }
  else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  }
  else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  }
  else {
    r = c;
    g = 0;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/**
 * Convert an {@link RGB} color to {@link HSV} (`h`/`s`/`v` kept as floats).
 */
export function rgbToHsv(rgb: RGB): HSV {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6);
    }
    else if (max === g) {
      h = 60 * ((b - r) / delta + 2);
    }
    else {
      h = 60 * ((r - g) / delta + 4);
    }
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}

/**
 * Convert an {@link RGB} color to {@link HSL} (`h`/`s`/`l` kept as floats).
 */
export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  const l = (max + min) / 2;

  let h = 0;
  let s = 0;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6);
    }
    else if (max === g) {
      h = 60 * ((b - r) / delta + 2);
    }
    else {
      h = 60 * ((r - g) / delta + 4);
    }
  }
  if (h < 0) h += 360;

  return { h, s, l };
}

/**
 * Convert an {@link HSL} color to {@link RGB} (channels rounded to integers).
 */
export function hslToRgb(hsl: HSL): RGB {
  const h = ((hsl.h % 360) + 360) % 360;
  const s = hsl.s;
  const l = hsl.l;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  // Map the hue sector to chroma-relative r/g/b locals inline (no tuple alloc).
  let r: number;
  let g: number;
  let b: number;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  }
  else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  }
  else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  }
  else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  }
  else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  }
  else {
    r = c;
    g = 0;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/**
 * Convert an {@link HSV} color directly to {@link HSL} without an RGB round-trip.
 */
export function hsvToHsl(hsv: HSV): HSL {
  const l = hsv.v * (1 - hsv.s / 2);
  let s = 0;
  if (l !== 0 && l !== 1) {
    s = (hsv.v - l) / Math.min(l, 1 - l);
  }
  return { h: hsv.h, s, l };
}

/**
 * Convert an {@link HSL} color directly to {@link HSV} without an RGB round-trip.
 */
export function hslToHsv(hsl: HSL): HSV {
  const v = hsl.l + hsl.s * Math.min(hsl.l, 1 - hsl.l);
  let s = 0;
  if (v !== 0) {
    s = 2 * (1 - hsl.l / v);
  }
  return { h: hsl.h, s, v };
}

/** Convert a single `0–255` channel to a two-character lowercase hex pair. */
function channelToHex(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0');
}

/**
 * Convert an {@link RGB} color to a `#rrggbb` hex string, or `#rrggbbaa` when an
 * alpha (`0–1`) is provided via `withAlpha`.
 */
export function rgbToHex(rgb: RGB, withAlpha?: number): string {
  const base = `#${channelToHex(rgb.r)}${channelToHex(rgb.g)}${channelToHex(rgb.b)}`;
  if (withAlpha === undefined) return base;
  return base + channelToHex(Math.round(withAlpha * 255));
}

/**
 * Parse a `#rgb`/`#rgba`/`#rrggbb`/`#rrggbbaa` hex string into {@link RGBA},
 * returning `null` when the input is not a valid hex color.
 */
export function hexToRgba(hex: string): RGBA | null {
  const match = /^#([0-9a-f]{3,8})$/i.exec(hex.trim());
  if (!match) return null;

  let value = match[1]!;
  if (value.length === 3 || value.length === 4) {
    value = value.split('').map(c => c + c).join('');
  }
  if (value.length !== 6 && value.length !== 8) return null;

  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  const a = value.length === 8 ? Number.parseInt(value.slice(6, 8), 16) / 255 : 1;

  return { r, g, b, a };
}
