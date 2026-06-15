import { getStepDecimals, roundToStep, scaleLinear } from './math';
import { formatClock, formatFrames, framesToTimecode, secondsToFrames } from './timecode';

/**
 * A single axis tick: its domain `value`, projected pixel position `px`, whether
 * it is a `major` (labelled / emphasised) tick, and its rendered `label`.
 */
export interface Tick {
  value: number;
  px: number;
  major: boolean;
  label: string;
}

/** Default upper bound on generated ticks before the step is coarsened. */
const DEFAULT_MAX_TICKS = 1000;

/** Default target pixel spacing between adjacent ticks. */
const DEFAULT_TARGET_DENSITY = 64;

/**
 * Format callback for tick labels. Receives the (already step-cleaned) `value`
 * and a small context describing the active `step`, its `decimals`, and whether
 * the tick is `major`.
 */
export type TickFormatter = (value: number, ctx: { step: number; decimals: number; major: boolean }) => string;

/** Shared geometry inputs for every tick generator. */
interface BaseTickOptions {
  /** Value-space extent `[start, end]` of the visible axis. */
  domain: readonly [number, number];
  /** Pixel-space extent `[start, end]` the domain projects onto. */
  range: readonly [number, number];
  /** Flip the value→pixel mapping (domain start maps to range end). @default false */
  reverse?: boolean;
  /** Desired pixel spacing between adjacent ticks. @default 64 */
  targetDensity?: number;
  /** Hard cap on candidate ticks; the step is coarsened until under it. @default 1000 */
  maxTicks?: number;
}

/**
 * Round `value` to the nearest "nice" number — a `1`, `2`, `5`, or `10` times a
 * power of ten. With `round` false the result is rounded up (ceil semantics),
 * producing a step no finer than `value`.
 */
export function niceNum(value: number, round: boolean): number {
  if (value <= 0 || !Number.isFinite(value)) return 0;
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;

  let niceFraction: number;
  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  }
  else if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;

  return niceFraction * 10 ** exponent;
}

/** Effective (possibly reversed) range tuple for projection. */
function effectiveRange(range: readonly [number, number], reverse: boolean | undefined): [number, number] {
  return reverse ? [range[1], range[0]] : [range[0], range[1]];
}

/**
 * Coarsen `step` (by the next nice multiple) until the number of ticks spanning
 * `[d0, d1]` drops below `maxTicks`. Guards against OOM on huge axes.
 */
function capStep(step: number, d0: number, d1: number, maxTicks: number): number {
  let s = step;
  while (s > 0 && (d1 - d0) / s > maxTicks) {
    s = niceNum(s * 2, false);
  }
  return s;
}

/** Default minor subdivision count derived from the leading digit of `step`. */
function defaultMinorSubdivisions(step: number): number {
  const exponent = Math.floor(Math.log10(step));
  const lead = Math.round(step / 10 ** exponent);
  if (lead === 2) return 2;
  if (lead === 5) return 5;
  return 2;
}

/**
 * Generate "nice" linearly-spaced ticks across the visible `domain`.
 *
 * Ticks are anchored to absolute step multiples (`start = floor(d0 / step) *
 * step`) and walked by an integer index to avoid float drift / pan-jitter, then
 * culled to the visible window. `major` ticks fall on a coarser nice multiple;
 * minor ticks subdivide between majors. Labels default to the step-cleaned
 * value (using {@link getStepDecimals} so artefacts like `1.3000001` never
 * appear).
 */
export function niceTicks(opts: BaseTickOptions & {
  /** Minor ticks per major interval. @default derived from step (2→2, 5→5, else 2) */
  minorSubdivisions?: number;
  /** Custom label formatter. */
  format?: TickFormatter;
}): Tick[] {
  const { domain, range, reverse, format } = opts;
  const targetDensity = opts.targetDensity ?? DEFAULT_TARGET_DENSITY;
  const maxTicks = opts.maxTicks ?? DEFAULT_MAX_TICKS;

  const d0 = Math.min(domain[0], domain[1]);
  const d1 = Math.max(domain[0], domain[1]);
  const span = d1 - d0;
  if (span <= 0) return [];

  const er = effectiveRange(range, reverse);
  const pxSpan = Math.abs(range[1] - range[0]);

  // Approximate tick count from the desired pixel density, then nice-round it.
  const targetCount = Math.max(1, pxSpan / targetDensity);
  const rawStep = span / targetCount;
  let minorStep = niceNum(rawStep, true);
  if (minorStep <= 0) minorStep = span;

  minorStep = capStep(minorStep, d0, d1, maxTicks);
  if (minorStep <= 0) return [];

  const decimals = getStepDecimals(minorStep);
  const minorSubdivisions = opts.minorSubdivisions ?? defaultMinorSubdivisions(minorStep);
  const majorStep = minorStep * Math.max(1, minorSubdivisions);
  const majorDecimals = getStepDecimals(majorStep);

  const ticks: Tick[] = [];
  const start = Math.floor(d0 / minorStep) * minorStep;
  const count = Math.ceil((d1 - start) / minorStep);

  for (let i = 0; i <= count; i++) {
    const raw = start + i * minorStep;
    const value = roundToStep(raw, minorStep, 0, decimals);
    if (value < d0 - minorStep * 0.5 || value > d1 + minorStep * 0.5) continue;

    // A tick is major when it lands on a major-step boundary.
    const major = Math.abs(value / majorStep - Math.round(value / majorStep)) < 1e-9;
    const step = major ? majorStep : minorStep;
    const dec = major ? majorDecimals : decimals;
    const label = major
      ? (format ? format(value, { step, decimals: dec, major }) : String(value))
      : '';

    ticks.push({ value, px: scaleLinear(value, d0, d1, er[0], er[1]), major, label });
  }

  return ticks;
}

/** Human time ladder in seconds (1s → 1 day). */
const TIME_LADDER = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 21600, 43200, 86400] as const;

/** Pick the coarsest ladder rung whose pixel spacing meets `targetDensity`. */
function pickRung(ladder: readonly number[], unitsPerPx: number, targetDensity: number): number {
  for (const rung of ladder) {
    if (rung / unitsPerPx >= targetDensity) return rung;
  }
  return ladder[ladder.length - 1]!;
}

/**
 * Generate ticks on the human time ladder (seconds): `1, 2, 5, 10, 15, 30, 60,
 * …, 86400`. The coarsest rung whose pixel spacing meets `targetDensity` is
 * chosen; minute / hour / day boundaries are marked `major`. Labels default to
 * {@link formatClock}.
 */
export function timeTicks(opts: BaseTickOptions & {
  /** Custom label formatter (value in seconds). */
  format?: TickFormatter;
}): Tick[] {
  const { domain, range, reverse, format } = opts;
  const targetDensity = opts.targetDensity ?? DEFAULT_TARGET_DENSITY;
  const maxTicks = opts.maxTicks ?? DEFAULT_MAX_TICKS;

  const d0 = Math.min(domain[0], domain[1]);
  const d1 = Math.max(domain[0], domain[1]);
  const span = d1 - d0;
  if (span <= 0) return [];

  const er = effectiveRange(range, reverse);
  const pxSpan = Math.abs(range[1] - range[0]);
  const unitsPerPx = pxSpan > 0 ? span / pxSpan : span;

  let step = pickRung(TIME_LADDER, unitsPerPx, targetDensity);
  step = capStep(step, d0, d1, maxTicks);
  if (step <= 0) return [];

  const ticks: Tick[] = [];
  const start = Math.floor(d0 / step) * step;
  const count = Math.ceil((d1 - start) / step);

  for (let i = 0; i <= count; i++) {
    const value = start + i * step;
    if (value < d0 - step * 0.5 || value > d1 + step * 0.5) continue;

    // Major on minute / hour / day boundaries; when the step is itself a whole
    // minute or coarser, promote hour (or day) boundaries to keep majors sparse.
    const major = step >= 3600
      ? value % 86400 === 0
      : step >= 60
        ? value % 3600 === 0
        : value % 60 === 0;
    const label = format ? format(value, { step, decimals: 0, major }) : formatClock(value);

    ticks.push({ value, px: scaleLinear(value, d0, d1, er[0], er[1]), major, label });
  }

  return ticks;
}

/** Build a frame-based ladder seeded by `fps`. */
function frameLadder(fps: number): number[] {
  const half = Math.max(1, Math.round(fps / 2));
  const base = [1, 2, 5, 10, half, Math.round(fps)];
  const ladder: number[] = [];
  for (const v of base) {
    if (v > 0 && !ladder.includes(v)) ladder.push(v);
  }
  ladder.sort((a, b) => a - b);
  // Extend in multiples of fps up to a day.
  const f = Math.round(fps);
  for (const mult of [2, 5, 10, 30, 60, 300, 600, 1800, 3600, 21600, 43200, 86400]) {
    ladder.push(mult * f);
  }
  return ladder;
}

/**
 * Generate timecode ticks. The ladder is computed in INTEGER FRAMES internally
 * (the seconds domain is converted to frames via `fps` once), so positions
 * never drift. Labels default to {@link framesToTimecode}. The `domain` /
 * `range` remain in seconds.
 */
export function timecodeTicks(opts: BaseTickOptions & {
  /** Frame rate used to convert the seconds domain into frames. */
  fps: number;
  /** Whether labels use drop-frame timecode. @default false */
  dropFrame?: boolean;
  /** Custom label formatter (value in seconds). */
  format?: TickFormatter;
}): Tick[] {
  const { domain, range, reverse, fps, dropFrame, format } = opts;
  const targetDensity = opts.targetDensity ?? DEFAULT_TARGET_DENSITY;
  const maxTicks = opts.maxTicks ?? DEFAULT_MAX_TICKS;

  const d0 = Math.min(domain[0], domain[1]);
  const d1 = Math.max(domain[0], domain[1]);
  if (d1 - d0 <= 0 || fps <= 0) return [];

  const f0 = secondsToFrames(d0, fps);
  const f1 = secondsToFrames(d1, fps);
  const frameSpan = f1 - f0;
  if (frameSpan <= 0) return [];

  const er = effectiveRange(range, reverse);
  const pxSpan = Math.abs(range[1] - range[0]);
  const framesPerPx = pxSpan > 0 ? frameSpan / pxSpan : frameSpan;

  const ladder = frameLadder(fps);
  let stepFrames = pickRung(ladder, framesPerPx, targetDensity);
  stepFrames = Math.round(capStep(stepFrames, f0, f1, maxTicks));
  if (stepFrames <= 0) return [];

  const fpsInt = Math.round(fps);
  const ticks: Tick[] = [];
  const startFrame = Math.floor(f0 / stepFrames) * stepFrames;
  const count = Math.ceil((f1 - startFrame) / stepFrames);

  for (let i = 0; i <= count; i++) {
    const frame = startFrame + i * stepFrames;
    if (frame < f0 - stepFrames * 0.5 || frame > f1 + stepFrames * 0.5) continue;

    const seconds = frame / fps;
    // Major on whole-second boundaries (or coarser when the step exceeds 1s).
    const major = stepFrames >= fpsInt ? frame % (fpsInt * 60) === 0 : frame % fpsInt === 0;
    const label = format
      ? format(seconds, { step: stepFrames, decimals: 0, major })
      : framesToTimecode(frame, fps, dropFrame);

    ticks.push({ value: seconds, px: scaleLinear(seconds, d0, d1, er[0], er[1]), major, label });
  }

  return ticks;
}

/** Integer frame ladder (frames), scaled until spacing meets density. */
const FRAME_LADDER = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000] as const;

/**
 * Generate an integer-frame axis. The `domain` / `range` are in frames; the step
 * is forced to integer ladder multiples (`1, 2, 5, 10, 25, 50, 100, …`) scaled
 * so spacing meets `targetDensity`. Labels default to {@link formatFrames}.
 */
export function frameTicks(opts: BaseTickOptions & {
  /** Frame rate; when given, ticks at one-second multiples are marked `major`. */
  fps?: number;
  /** Custom label formatter (value in frames). */
  format?: TickFormatter;
}): Tick[] {
  const { domain, range, reverse, fps, format } = opts;
  const targetDensity = opts.targetDensity ?? DEFAULT_TARGET_DENSITY;
  const maxTicks = opts.maxTicks ?? DEFAULT_MAX_TICKS;

  const d0 = Math.min(domain[0], domain[1]);
  const d1 = Math.max(domain[0], domain[1]);
  const span = d1 - d0;
  if (span <= 0) return [];

  const er = effectiveRange(range, reverse);
  const pxSpan = Math.abs(range[1] - range[0]);
  const framesPerPx = pxSpan > 0 ? span / pxSpan : span;

  let step = pickRung(FRAME_LADDER, framesPerPx, targetDensity);
  step = Math.round(capStep(step, d0, d1, maxTicks));
  if (step <= 0) return [];

  const fpsInt = fps ? Math.round(fps) : 0;
  const ticks: Tick[] = [];
  const start = Math.floor(d0 / step) * step;
  const count = Math.ceil((d1 - start) / step);

  for (let i = 0; i <= count; i++) {
    const value = Math.round(start + i * step);
    if (value < d0 - step * 0.5 || value > d1 + step * 0.5) continue;

    const major = fpsInt > 0 ? value % fpsInt === 0 : value % (step * 5) === 0;
    const label = format ? format(value, { step, decimals: 0, major }) : formatFrames(value);

    ticks.push({ value, px: scaleLinear(value, d0, d1, er[0], er[1]), major, label });
  }

  return ticks;
}
