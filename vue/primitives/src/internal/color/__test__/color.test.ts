import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  formatHsva,
  hexToRgba,
  hslToHsv,
  hsvToHsl,
  hsvToRgb,
  isLight,
  parseColor,
  rgbToHex,
  rgbToHsv,
} from '../index';
import type { RGB } from '../index';

const BLACK: RGB = { r: 0, g: 0, b: 0 };
const WHITE: RGB = { r: 255, g: 255, b: 255 };

describe('hsvToRgb known conversions', () => {
  it('maps primary hues to pure channels', () => {
    expect(hsvToRgb({ h: 0, s: 1, v: 1 })).toEqual({ r: 255, g: 0, b: 0 });
    expect(hsvToRgb({ h: 120, s: 1, v: 1 })).toEqual({ r: 0, g: 255, b: 0 });
    expect(hsvToRgb({ h: 240, s: 1, v: 1 })).toEqual({ r: 0, g: 0, b: 255 });
  });

  it('maps achromatic extremes to white and black', () => {
    expect(hsvToRgb({ h: 0, s: 0, v: 1 })).toEqual({ r: 255, g: 255, b: 255 });
    expect(hsvToRgb({ h: 0, s: 0, v: 0 })).toEqual({ r: 0, g: 0, b: 0 });
    expect(hsvToRgb({ h: 200, s: 1, v: 0 })).toEqual({ r: 0, g: 0, b: 0 });
  });
});

describe('rgb/hsv round-trip stability', () => {
  const samples: RGB[] = [
    { r: 255, g: 0, b: 128 },
    { r: 12, g: 200, b: 87 },
    { r: 64, g: 64, b: 64 },
    { r: 255, g: 255, b: 255 },
    { r: 0, g: 0, b: 0 },
    { r: 33, g: 150, b: 243 },
  ];

  it('survives rgbToHsv -> hsvToRgb within +/-1 per channel', () => {
    for (const rgb of samples) {
      const back = hsvToRgb(rgbToHsv(rgb));
      expect(Math.abs(back.r - rgb.r)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.g - rgb.g)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.b - rgb.b)).toBeLessThanOrEqual(1);
    }
  });

  it('survives hsvToHsl -> hslToHsv within tolerance', () => {
    const hsv = { h: 210, s: 0.6, v: 0.8 };
    const back = hslToHsv(hsvToHsl(hsv));
    expect(back.h).toBeCloseTo(hsv.h, 5);
    expect(back.s).toBeCloseTo(hsv.s, 5);
    expect(back.v).toBeCloseTo(hsv.v, 5);
  });
});

describe('hex conversions', () => {
  it('serializes rgb to lowercase hex', () => {
    expect(rgbToHex({ r: 255, g: 0, b: 128 })).toBe('#ff0080');
    expect(rgbToHex({ r: 255, g: 0, b: 128 }, 0.5)).toBe('#ff008080');
  });

  it('parses 6 and 8 digit hex', () => {
    expect(hexToRgba('#ff0080')).toEqual({ r: 255, g: 0, b: 128, a: 1 });
    const withAlpha = hexToRgba('#ff008080');
    expect(withAlpha).not.toBeNull();
    expect(withAlpha!.a).toBeCloseTo(0.5, 2);
  });

  it('parses shorthand hex', () => {
    expect(hexToRgba('#f00')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it('returns null on invalid hex', () => {
    expect(hexToRgba('bad')).toBeNull();
    expect(hexToRgba('#12')).toBeNull();
  });
});

describe('parseColor', () => {
  it('parses shorthand hex to canonical HSVA', () => {
    const hsva = parseColor('#f00');
    expect(hsva).not.toBeNull();
    expect(hsva!.h).toBeCloseTo(0, 5);
    expect(hsva!.s).toBeCloseTo(1, 5);
    expect(hsva!.v).toBeCloseTo(1, 5);
    expect(hsva!.a).toBe(1);
  });

  it('parses rgb() to canonical hue', () => {
    const hsva = parseColor('rgb(0,255,0)');
    expect(hsva).not.toBeNull();
    expect(hsva!.h).toBeCloseTo(120, 5);
  });

  it('parses rgba() with alpha', () => {
    const hsva = parseColor('rgba(0, 0, 255, 0.5)');
    expect(hsva).not.toBeNull();
    expect(hsva!.h).toBeCloseTo(240, 5);
    expect(hsva!.a).toBe(0.5);
  });

  it('parses hsl()/hsla()', () => {
    const hsva = parseColor('hsl(120, 100%, 50%)');
    expect(hsva).not.toBeNull();
    expect(hsva!.h).toBeCloseTo(120, 5);
    expect(hsva!.s).toBeCloseTo(1, 5);
    expect(hsva!.v).toBeCloseTo(1, 5);
  });

  it('returns null on nonsense', () => {
    expect(parseColor('nonsense')).toBeNull();
    expect(parseColor('rgb(a, b, c)')).toBeNull();
  });
});

describe('formatHsva', () => {
  const red = parseColor('#ff0000')!;

  it('formats across CSS formats', () => {
    expect(formatHsva(red, 'hex')).toBe('#ff0000');
    expect(formatHsva({ ...red, a: 0.5 }, 'hex8')).toBe('#ff000080');
    expect(formatHsva(red, 'rgb')).toBe('rgb(255, 0, 0)');
    expect(formatHsva({ ...red, a: 0.5 }, 'rgba')).toBe('rgba(255, 0, 0, 0.5)');
    expect(formatHsva(red, 'hsl')).toBe('hsl(0, 100%, 50%)');
    expect(formatHsva({ ...red, a: 0.5 }, 'hsla')).toBe('hsla(0, 100%, 50%, 0.5)');
  });
});

describe('wcag helpers', () => {
  it('computes max contrast for black/white', () => {
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21, 1);
  });

  it('detects light vs dark colors', () => {
    expect(isLight(WHITE)).toBe(true);
    expect(isLight(BLACK)).toBe(false);
  });
});
