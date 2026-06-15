import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import { computed, toValue } from 'vue';
import { clamp } from '@robonen/stdlib';
import { getStepDecimals, roundToStep, scaleLinear } from './math';
import type { Tick } from './ticks';
import { frameTicks, niceTicks, timeTicks, timecodeTicks } from './ticks';

/** Axis orientation. `'vertical'` defaults to value-up (domain start at range end). */
export type ScaleOrientation = 'horizontal' | 'vertical';

/** Which tick generator the composable dispatches to. */
export type TickKind = 'nice' | 'time' | 'timecode' | 'frame' | 'none';

/**
 * Reactive options for {@link useScale}. Every value may be a ref, getter, or
 * plain value (resolved via `toValue` on read).
 */
export interface UseScaleOptions {
  /** Value-space extent `[start, end]`. */
  domain: MaybeRefOrGetter<readonly [number, number]>;
  /** Pixel-space extent `[start, end]`. */
  range: MaybeRefOrGetter<readonly [number, number]>;
  /** Axis orientation. @default 'horizontal' */
  orientation?: MaybeRefOrGetter<ScaleOrientation>;
  /** Flip the mapping independent of orientation. @default false */
  inverted?: MaybeRefOrGetter<boolean>;
  /** Right-to-left; flips horizontal axes only. @default false */
  rtl?: MaybeRefOrGetter<boolean>;
  /** Clamp `scale`/`invert` outputs to the bounds. @default false */
  clamp?: MaybeRefOrGetter<boolean>;
  /** Snap step for {@link roundValue}. @default undefined (no snapping) */
  step?: MaybeRefOrGetter<number | undefined>;
  /** Lower clamp bound; falls back to `domain[0]`. @default undefined */
  min?: MaybeRefOrGetter<number | undefined>;
  /** Upper clamp bound; falls back to `domain[1]`. @default undefined */
  max?: MaybeRefOrGetter<number | undefined>;
  /** Tick generator selector. @default 'nice' */
  tickKind?: MaybeRefOrGetter<TickKind>;
  /** Extra options forwarded to the active tick generator. @default {} */
  tickOptions?: MaybeRefOrGetter<Record<string, unknown>>;
}

/** Reactive scale returned by {@link useScale}. */
export interface UseScaleReturn {
  /** Project a value to a pixel position. Stable function identity. */
  scale: (value: number) => number;
  /** Invert a pixel position back to a value. Stable function identity. */
  invert: (px: number) => number;
  /** Clamp a value to `[min ?? d0, max ?? d1]`. */
  clampValue: (value: number) => number;
  /** Snap a value to `step` then clamp (no-op when `step` is undefined). */
  roundValue: (value: number) => number;
  /** All ticks for the current geometry. */
  ticks: ComputedRef<Tick[]>;
  /** Ticks where `major` is true. */
  majorTicks: ComputedRef<Tick[]>;
  /** Ticks where `major` is false. */
  minorTicks: ComputedRef<Tick[]>;
  /** Absolute pixels-per-value-unit; guards divide-by-zero. */
  pxPerUnit: ComputedRef<number>;
  /** The resolved domain. */
  domain: ComputedRef<readonly [number, number]>;
  /** The resolved range. */
  range: ComputedRef<readonly [number, number]>;
}

/**
 * Compose orientation / inverted / rtl into the effective reverse flag.
 *
 * Three independent flips XOR-composed: vertical reverses (value-up), `inverted`
 * reverses unconditionally, and `rtl` reverses horizontal axes only.
 */
function computeReverse(orientation: ScaleOrientation, inverted: boolean, rtl: boolean): boolean {
  return (orientation === 'vertical') !== inverted !== (rtl && orientation === 'horizontal');
}

/**
 * Reactive value↔pixel scale with tick generation for rulers, axes, histograms,
 * and waveforms.
 *
 * `scale`/`invert` are stable closures that read the current domain/range/flips
 * at call time (no per-change projection rebuild), so they stay cheap on the
 * pointer hot path.
 */
export function useScale(options: UseScaleOptions): UseScaleReturn {
  const domain = computed<readonly [number, number]>(() => toValue(options.domain));
  const range = computed<readonly [number, number]>(() => toValue(options.range));

  const reverse = computed(() => computeReverse(
    toValue(options.orientation) ?? 'horizontal',
    toValue(options.inverted) ?? false,
    toValue(options.rtl) ?? false,
  ));

  // Cache decimals per step value to avoid re-deriving on every roundValue call.
  const decimals = computed(() => {
    const step = toValue(options.step);
    return step !== undefined ? getStepDecimals(step) : 0;
  });

  const scale = (value: number): number => {
    const [d0, d1] = domain.value;
    const [r0, r1] = range.value;
    const [er0, er1] = reverse.value ? [r1, r0] : [r0, r1];
    const px = scaleLinear(value, d0, d1, er0, er1);
    if (toValue(options.clamp)) {
      const lo = Math.min(er0, er1);
      const hi = Math.max(er0, er1);
      return clamp(px, lo, hi);
    }
    return px;
  };

  const invert = (px: number): number => {
    const [d0, d1] = domain.value;
    const [r0, r1] = range.value;
    const [er0, er1] = reverse.value ? [r1, r0] : [r0, r1];
    const value = scaleLinear(px, er0, er1, d0, d1);
    if (toValue(options.clamp)) {
      const lo = Math.min(d0, d1);
      const hi = Math.max(d0, d1);
      return clamp(value, lo, hi);
    }
    return value;
  };

  const clampValue = (value: number): number => {
    const [d0, d1] = domain.value;
    const lo = toValue(options.min) ?? d0;
    const hi = toValue(options.max) ?? d1;
    return clamp(value, lo, hi);
  };

  const roundValue = (value: number): number => {
    const step = toValue(options.step);
    if (step === undefined) return clampValue(value);
    const [d0] = domain.value;
    const min = toValue(options.min) ?? d0;
    // Round THEN clamp.
    return clampValue(roundToStep(value, step, min, decimals.value));
  };

  const pxPerUnit = computed(() => {
    const [d0, d1] = domain.value;
    const [r0, r1] = range.value;
    const dSpan = d1 - d0;
    if (dSpan === 0) return 0;
    return Math.abs(r1 - r0) / Math.abs(dSpan);
  });

  const ticks = computed<Tick[]>(() => {
    const kind = (toValue(options.tickKind) ?? 'nice') as TickKind;
    if (kind === 'none') return [];

    const d = domain.value;
    const r = range.value;
    if (r[1] - r[0] === 0) return [];

    const extra = toValue(options.tickOptions) ?? {};
    const base = { domain: d, range: r, reverse: reverse.value, ...extra };

    switch (kind) {
      case 'time':
        return timeTicks(base);
      case 'timecode':
        return timecodeTicks(base as typeof base & { fps: number });
      case 'frame':
        return frameTicks(base);
      case 'nice':
      default:
        return niceTicks(base);
    }
  });

  const majorTicks = computed(() => ticks.value.filter(t => t.major));
  const minorTicks = computed(() => ticks.value.filter(t => !t.major));

  return {
    scale,
    invert,
    clampValue,
    roundValue,
    ticks,
    majorTicks,
    minorTicks,
    pxPerUnit,
    domain,
    range,
  };
}
