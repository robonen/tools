import { clamp } from '@robonen/stdlib';
import { toLUT } from '../../internal/spline';

/** The five handles a levels adjustment exposes. */
export type LevelsHandleKind = 'black' | 'gamma' | 'white' | 'outputBlack' | 'outputWhite';

/**
 * A complete levels adjustment.
 *
 * - `black` / `white` — input clipping points in the `0..255` domain
 *   (`black < white`).
 * - `gamma` — midtone factor in `0.1..9.99`; `1` is linear, `> 1` brightens
 *   midtones, `< 1` darkens them.
 * - `outputBlack` / `outputWhite` — the output range the remapped tones are
 *   compressed into (`0..255`).
 */
export interface LevelsValue {
  black: number;
  gamma: number;
  white: number;
  outputBlack: number;
  outputWhite: number;
}

/** Inclusive bounds for the input/output `0..255` domain. */
export const LEVELS_INPUT_MIN = 0;
export const LEVELS_INPUT_MAX = 255;
/** Inclusive bounds for the gamma factor. */
export const LEVELS_GAMMA_MIN = 0.1;
export const LEVELS_GAMMA_MAX = 9.99;

/** The canonical identity adjustment (a no-op pass-through). */
export const LEVELS_DEFAULT_VALUE: LevelsValue = Object.freeze({
  black: 0,
  gamma: 1,
  white: 255,
  outputBlack: 0,
  outputWhite: 255,
});

/** Round to `decimals` places, killing float drift, then clamp to `[lo, hi]`. */
export function roundClamp(value: number, lo: number, hi: number, decimals = 0): number {
  const rounded = decimals > 0
    ? Number((Math.round(value / 10 ** -decimals) / 10 ** decimals).toFixed(decimals))
    : Math.round(value);
  return clamp(rounded, lo, hi);
}

/** Whether `kind` is one of the two `0..255` output handles. */
export function isOutputHandle(kind: LevelsHandleKind): boolean {
  return kind === 'outputBlack' || kind === 'outputWhite';
}

/**
 * The effective input level the gamma midpoint maps to: the point in
 * `[black, white]` whose normalised position is `0.5 ** gamma`. With `gamma = 1`
 * this is the literal midpoint `(black + white) / 2`; raising gamma slides the
 * midtone anchor toward black. Reported in `aria-valuetext` so screen-reader
 * users hear where the midtone sits.
 */
export function gammaMidtoneLevel(value: Pick<LevelsValue, 'black' | 'gamma' | 'white'>): number {
  const span = value.white - value.black;
  if (span <= 0) return value.black;
  const t = 0.5 ** value.gamma;
  return Math.round(value.black + t * span);
}

/**
 * Apply a levels adjustment to a single normalised-ish `0..255` input sample,
 * returning the `0..255` output. The pipeline is the standard one:
 *
 * 1. remap `[black, white]` → `[0, 1]` (clipping outside the window),
 * 2. apply gamma as `t ** (1 / gamma)` (so `gamma > 1` lifts midtones),
 * 3. expand `[0, 1]` → `[outputBlack, outputWhite]`.
 */
export function applyLevels(input: number, value: LevelsValue): number {
  const { black, gamma, white, outputBlack, outputWhite } = value;
  const span = white - black;
  // Degenerate window (black >= white): everything below the point is output
  // black, everything at/above is output white — a hard threshold.
  if (span <= 0) {
    return input < black ? outputBlack : outputWhite;
  }
  let t = (input - black) / span;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  // gamma > 1 brightens midtones → exponent 1/gamma.
  const corrected = gamma === 1 ? t : t ** (1 / gamma);
  return outputBlack + corrected * (outputWhite - outputBlack);
}

/**
 * Build the `size`-length lookup table (default 256) that applies `value` across
 * the full `0..255` input domain, via the shared `toLUT` sampler. Each entry is
 * the `0..255` output for input index `i`. The curve is monotonic non-decreasing
 * when `outputBlack <= outputWhite` (the normal case), and is exactly the
 * identity for the default adjustment.
 */
export function buildOutputCurve(value: LevelsValue, size = 256): number[] {
  // toLUT samples `fn` across `[x0, x1]` → here the full input domain. The LUT
  // index IS the input level, so we sample over `0..(size-1)` mapped to
  // `0..255`.
  return toLUT(
    input => applyLevels(input, value),
    size,
    LEVELS_INPUT_MIN,
    LEVELS_INPUT_MAX,
  );
}

/**
 * Neighbour-clamp a candidate value for `kind` against the rest of `value`,
 * preserving the structural invariants:
 *
 * - `black` stays in `[0, white - minGap]`,
 * - `white` stays in `[black + minGap, 255]`,
 * - `gamma` stays in `[0.1, 9.99]`,
 * - `outputBlack` stays in `[0, outputWhite]`,
 * - `outputWhite` stays in `[outputBlack, 255]`.
 *
 * `minGap` (`minStepsBetweenHandles * step`) keeps `black` strictly below
 * `white`. A value pushed past its neighbour PINS at the boundary rather than
 * swapping order.
 */
export function clampHandle(
  kind: LevelsHandleKind,
  candidate: number,
  value: LevelsValue,
  minGap: number,
): number {
  switch (kind) {
    case 'black':
      return clamp(candidate, LEVELS_INPUT_MIN, value.white - minGap);
    case 'white':
      return clamp(candidate, value.black + minGap, LEVELS_INPUT_MAX);
    case 'gamma':
      return clamp(candidate, LEVELS_GAMMA_MIN, LEVELS_GAMMA_MAX);
    case 'outputBlack':
      return clamp(candidate, LEVELS_INPUT_MIN, value.outputWhite);
    case 'outputWhite':
      return clamp(candidate, value.outputBlack, LEVELS_INPUT_MAX);
  }
}

/** Per-kind inclusive bounds reported as `aria-valuemin` / `aria-valuemax`. */
export function handleBounds(kind: LevelsHandleKind, value: LevelsValue, minGap: number): { min: number; max: number } {
  switch (kind) {
    case 'black':
      return { min: LEVELS_INPUT_MIN, max: value.white - minGap };
    case 'white':
      return { min: value.black + minGap, max: LEVELS_INPUT_MAX };
    case 'gamma':
      return { min: LEVELS_GAMMA_MIN, max: LEVELS_GAMMA_MAX };
    case 'outputBlack':
      return { min: LEVELS_INPUT_MIN, max: value.outputWhite };
    case 'outputWhite':
      return { min: value.outputBlack, max: LEVELS_INPUT_MAX };
  }
}

/** Read the current numeric value for `kind` out of a `LevelsValue`. */
export function handleValue(kind: LevelsHandleKind, value: LevelsValue): number {
  return value[kind];
}

/** Human-readable label for each handle, used for `aria-label`. */
export const LEVELS_HANDLE_LABELS: Record<LevelsHandleKind, string> = {
  black: 'Black point',
  gamma: 'Gamma',
  white: 'White point',
  outputBlack: 'Output black',
  outputWhite: 'Output white',
};

/**
 * Derive auto black/white points from a 256-bin luminance `histogram` by
 * clipping `clipFraction` of the total pixel count off each tail (Photoshop's
 * default is 0.1 % per side). Gamma is left at `1` and the output range is left
 * full. Returns the default adjustment when the histogram is empty/flat so the
 * caller never produces a degenerate (black >= white) window.
 */
export function computeAutoLevels(
  histogram: number[] | undefined,
  clipFraction = 0.001,
): Pick<LevelsValue, 'black' | 'white'> {
  if (!histogram || histogram.length === 0) {
    return { black: LEVELS_DEFAULT_VALUE.black, white: LEVELS_DEFAULT_VALUE.white };
  }
  let total = 0;
  for (let i = 0; i < histogram.length; i++) total += histogram[i]!;
  if (total <= 0) {
    return { black: LEVELS_DEFAULT_VALUE.black, white: LEVELS_DEFAULT_VALUE.white };
  }

  const lastBin = histogram.length - 1;
  const clipCount = total * clipFraction;
  const toLevel = (bin: number): number => Math.round((bin / lastBin) * LEVELS_INPUT_MAX);

  // Walk in from the dark end until `clipCount` pixels are accounted for.
  let acc = 0;
  let blackBin = 0;
  for (let i = 0; i <= lastBin; i++) {
    acc += histogram[i]!;
    if (acc > clipCount) {
      blackBin = i;
      break;
    }
  }

  // Walk in from the bright end.
  acc = 0;
  let whiteBin = lastBin;
  for (let i = lastBin; i >= 0; i--) {
    acc += histogram[i]!;
    if (acc > clipCount) {
      whiteBin = i;
      break;
    }
  }

  let black = toLevel(blackBin);
  let white = toLevel(whiteBin);
  // Guarantee a valid window even on near-flat data.
  if (white <= black) {
    black = LEVELS_DEFAULT_VALUE.black;
    white = LEVELS_DEFAULT_VALUE.white;
  }
  return { black, white };
}
