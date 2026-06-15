import type { GradientStop, GradientType } from './context';
import { clamp } from '@robonen/stdlib';
import { hsvToRgb, parseColor } from '../../internal/color';
import type { RGB } from '../../internal/color';

/**
 * Returns the number of decimal digits in a numeric `step`.
 *
 * Used by {@link roundToStep} to compensate floating-point drift without
 * allocating strings on every invocation (the cost is paid once per `step`
 * change and cached by the caller).
 */
export function getStepDecimals(step: number): number {
  if (!Number.isFinite(step)) return 0;
  const str = String(step);
  const dot = str.indexOf('.');
  if (dot === -1) return 0;
  return str.length - dot - 1;
}

/**
 * Snap `value` to the nearest multiple of `step` anchored at `0`.
 *
 * `decimals` must be pre-computed by the caller via {@link getStepDecimals} and
 * cached per-`step` — this is on the pointermove hot path.
 */
export function roundToStep(value: number, step: number, decimals: number): number {
  if (!(step > 0)) return value;
  const nearest = Math.round(value / step) * step;
  return decimals > 0 ? Number(nearest.toFixed(decimals)) : nearest;
}

/**
 * Stable comparator for two stops: ascending by `position`, then by the
 * positional `index` they held in the source array as a tie-break.
 *
 * Tying on the source index (rather than `id`) keeps an O(n log n) sort total
 * order deterministic AND stable — two stops at the same position never swap on
 * an unrelated re-render, and the CSS string stays byte-identical frame to
 * frame (important so the browser does not re-rasterize the preview).
 */
function compareIndexed(a: { stop: GradientStop; index: number }, b: { stop: GradientStop; index: number }): number {
  if (a.stop.position !== b.stop.position) return a.stop.position - b.stop.position;
  return a.index - b.index;
}

/**
 * Return a new array of `stops` sorted ascending by `position`, breaking ties at
 * identical positions by the stop's original index so the order is stable and
 * deterministic (both stops remain present and individually selectable).
 *
 * The input is never mutated.
 */
export function sortStops(stops: readonly GradientStop[]): GradientStop[] {
  const indexed = stops.map((stop, index) => ({ stop, index }));
  indexed.sort(compareIndexed);
  return indexed.map(e => e.stop);
}

/** Round a fractional position to a percentage string used in CSS gradients. */
function positionToPercent(position: number): string {
  const pct = clamp(position, 0, 1) * 100;
  // Trim to at most 3 decimals, then drop trailing zeros for a stable, compact
  // string (`50%` not `50.000%`); avoids float noise like `33.333333%`.
  const rounded = Math.round(pct * 1000) / 1000;
  return `${rounded}%`;
}

/**
 * Build a CSS `linear-gradient(...)` / `radial-gradient(...)` string from the
 * (already-sorted) `stops`.
 *
 * For `'linear'` the `angle` (degrees) is emitted as `${angle}deg`; `'radial'`
 * ignores the angle and produces `radial-gradient(circle, ...)`. Each stop
 * contributes `<color> <pct>%`. Returns an empty string when there are no stops.
 */
export function buildCssGradient(stops: readonly GradientStop[], type: GradientType, angle: number): string {
  if (stops.length === 0) return '';
  let body = '';
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i]!;
    if (i > 0) body += ', ';
    body += `${s.color} ${positionToPercent(s.position)}`;
  }
  if (type === 'radial') return `radial-gradient(circle, ${body})`;
  return `linear-gradient(${angle}deg, ${body})`;
}

/** Resolve any CSS color string to opaque-or-alpha RGBA channels, or `null`. */
function toRgb(color: string): (RGB & { a: number }) | null {
  const hsva = parseColor(color);
  if (!hsva) return null;
  const rgb = hsvToRgb(hsva);
  return { r: rgb.r, g: rgb.g, b: rgb.b, a: hsva.a };
}

/** Linear interpolation of a single numeric channel. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Interpolate a color at fractional `position` (0..1) between two neighbouring
 * stops `before`/`after` (either may be `null` at the ends). The blend happens
 * in sRGB space and the result is returned as an `rgba(...)` string.
 *
 * - Both neighbours present: linearly blend by the relative position.
 * - One neighbour: copy that neighbour's color.
 * - Neither (no stops): fall back to `fallback`.
 * - A neighbour whose color cannot be parsed is treated as absent.
 */
export function interpolateColorAt(
  position: number,
  before: GradientStop | null,
  after: GradientStop | null,
  fallback: string,
): string {
  const lo = before ? toRgb(before.color) : null;
  const hi = after ? toRgb(after.color) : null;

  if (lo && hi) {
    const span = after!.position - before!.position;
    const t = span <= 0 ? 0.5 : clamp((position - before!.position) / span, 0, 1);
    const r = Math.round(lerp(lo.r, hi.r, t));
    const g = Math.round(lerp(lo.g, hi.g, t));
    const b = Math.round(lerp(lo.b, hi.b, t));
    const a = lerp(lo.a, hi.a, t);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  if (lo) return before!.color;
  if (hi) return after!.color;
  return fallback;
}

/**
 * Given the sorted stops and an insertion `position`, find the immediate
 * lower/upper neighbours (by position) used to interpolate a new stop's color.
 * `before` is the last stop at or below `position`; `after` is the first stop
 * strictly above it.
 */
export function neighboursAt(
  sorted: readonly GradientStop[],
  position: number,
): { before: GradientStop | null; after: GradientStop | null } {
  let before: GradientStop | null = null;
  let after: GradientStop | null = null;
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i]!;
    if (s.position <= position) {
      before = s;
    }
    else {
      after = s;
      break;
    }
  }
  return { before, after };
}

/**
 * Default accessible value text for a stop: `<color> at <pct>%`. NEVER the color
 * alone — a screen-reader user must hear the position too, and color must never
 * be the sole carrier of meaning (WCAG 1.4.1 Use of Color).
 */
export function defaultStopValueText(color: string, position: number): string {
  const pct = Math.round(clamp(position, 0, 1) * 100);
  return `${color} at ${pct}%`;
}
