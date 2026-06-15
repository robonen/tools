import type { Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';

export type SliderOrientation = 'horizontal' | 'vertical';
export type SliderDirection = 'ltr' | 'rtl';

/**
 * Thumb positioning strategy.
 * - `'overflow'` — thumbs are positioned purely by percentage; at the
 *   extremes half the thumb sits outside the track (default — preserves the
 *   original behaviour and lets the consumer offset via CSS `transform`).
 * - `'contain'` — thumbs are inset so they stay fully within the track bounds
 *   at `0 %` / `100 %`.
 */
export type SliderThumbAlignment = 'overflow' | 'contain';

/**
 * Formatter turning a raw thumb value into a human-friendly string for
 * `aria-valuetext`. Receives the value and its thumb index; return `undefined`
 * to omit `aria-valuetext` for that thumb.
 */
export type SliderValueText = (value: number, index: number) => string | undefined;

/**
 * Context shared between `SliderRoot` and its descendants.
 *
 * Scalar props are exposed as plain `Ref<T>` values, but `SliderRoot` builds
 * them with `toRef(() => prop)` — a `GetterRefImpl` that is reactive without
 * allocating a `ReactiveEffect` / cache (unlike `computed`). For identity
 * passthrough of scalar props this avoids seven redundant effects per
 * instance while keeping template auto-unwrap and `.value` ergonomics.
 */
export interface SliderContext {
  values: Ref<number[]>;
  min: Ref<number>;
  max: Ref<number>;
  step: Ref<number>;
  orientation: Ref<SliderOrientation>;
  direction: Ref<SliderDirection>;
  disabled: Ref<boolean>;
  inverted: Ref<boolean>;
  /** Thumb positioning strategy — `'overflow'` (default) or `'contain'`. */
  thumbAlignment: Ref<SliderThumbAlignment>;
  /** Optional formatter for per-thumb `aria-valuetext`; `undefined` when unset. */
  valueText: Ref<SliderValueText | undefined>;
  trackRef: Ref<HTMLElement | null>;
  registerThumb: (el: HTMLElement) => number;
  unregisterThumb: (el: HTMLElement) => void;
  getThumbIndex: (el: HTMLElement) => number;
  /** Large-step multiplier (Page keys / Shift+Arrow) applied to `step`. */
  largeStepMultiplier: Ref<number>;
  updateValue: (index: number, next: number) => void;
  startDragFromTrack: (event: PointerEvent) => void;
}

const ctx = useContextFactory<SliderContext>('SliderContext');

export const provideSliderContext = ctx.provide;
export const useSliderContext = ctx.inject;
