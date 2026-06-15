import type { ComputedRef, Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';
import type { Tick } from '../../internal/scale';

/** How tick labels are rendered. */
export type TimeRulerMode = 'seconds' | 'timecode' | 'frames';

/** Writing direction; mirrors the binary contract used across primitives. */
export type TimeRulerDirection = 'ltr' | 'rtl';

/**
 * Context shared between `TimeRulerRoot` and its descendants (`TimeRulerTick`,
 * `TimeRulerLabel`, `TimeRulerCursor`, `TimeRulerScreenReaderSummary`), and the
 * surface a future `Timeline` reads to embed a ruler.
 *
 * Tick collections and the `scale`/`invert` projectors come straight from the
 * `useScale` instance the root owns; scalar props are exposed as plain `Ref`s
 * (built with `toRef(() => prop)` for identity passthrough). `scale` / `invert`
 * are stable closures safe to call on the pointer hot path.
 */
export interface TimeRulerContext {
  /** All ticks for the visible window. */
  ticks: ComputedRef<Tick[]>;
  /** Ticks where `major` is true (labelled / emphasised). */
  majorTicks: ComputedRef<Tick[]>;
  /** Ticks where `major` is false. */
  minorTicks: ComputedRef<Tick[]>;
  /** Project a time (seconds) to a pixel offset within the ruler. Stable identity. */
  scale: (seconds: number) => number;
  /** Invert a pixel offset back to a time (seconds). Stable identity. */
  invert: (px: number) => number;
  /** Left edge time (seconds) of the visible window. Two-way via `v-model:offset`. */
  offset: Ref<number>;
  /** Zoom in pixels-per-second. Two-way via `v-model:zoom`. */
  zoom: Ref<number>;
  /** Total content duration in seconds. */
  duration: Ref<number>;
  /** Frame rate used for timecode / frame modes. */
  fps: Ref<number>;
  /** Active label mode. */
  mode: Ref<TimeRulerMode>;
  /** Format a time (seconds) per the active mode. */
  formatTime: (seconds: number) => string;
  /** Whether a pan gesture (keyboard, drag, or wheel) is in progress. */
  isPanning: Ref<boolean>;
  /** Whether a zoom gesture is in progress. */
  isZooming: Ref<boolean>;
  /** Whether the ruler is disabled (non-interactive). */
  disabled: Ref<boolean>;
}

const ctx = useContextFactory<TimeRulerContext>('TimeRulerContext');

export const provideTimeRulerContext = ctx.provide;
export const useTimeRulerContext = ctx.inject;
