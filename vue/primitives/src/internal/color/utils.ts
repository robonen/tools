import { clamp } from '@robonen/stdlib';
import { hsvToRgb } from './convert';
import type { HSVA, RGB } from './types';

/** Clamp `value` to the inclusive `[0, max]` range. */
export function clampChannel(value: number, max: number): number {
  return clamp(value, 0, max);
}

/** Linearize a single sRGB `0–1` channel for WCAG luminance math. */
function linearize(channel: number): number {
  return channel <= 0.03928
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

/** Compute the WCAG relative luminance (`0–1`) of an {@link RGB} color. */
export function relativeLuminance(rgb: RGB): number {
  const r = linearize(rgb.r / 255);
  const g = linearize(rgb.g / 255);
  const b = linearize(rgb.b / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Compute the WCAG contrast ratio (`1–21`) between two {@link RGB} colors. */
export function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Whether `rgb` is light enough that a dark contrasting element reads best. */
export function isLight(rgb: RGB): boolean {
  return relativeLuminance(rgb) > 0.179;
}

/** Render an {@link HSVA} color as a CSS `rgba(r, g, b, a)` string. */
export function hsvaToCss(hsva: HSVA): string {
  const { r, g, b } = hsvToRgb(hsva);
  return `rgba(${r}, ${g}, ${b}, ${hsva.a})`;
}
