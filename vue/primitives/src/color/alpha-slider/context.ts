import type { Ref } from 'vue';
import type { HSVA } from '../../internal/color';
import { useContextFactory } from '@robonen/vue';

export type AlphaSliderOrientation = 'horizontal' | 'vertical';
export type AlphaSliderDirection = 'ltr' | 'rtl';

/**
 * Context shared between `AlphaSliderRoot` and `AlphaSliderThumb`.
 *
 * Scalar props are exposed as plain `Ref<T>` — `AlphaSliderRoot` builds them
 * with `toRef(() => prop)` (a reactive getter ref without an extra effect).
 */
export interface AlphaSliderContext {
  /** The canonical colour the slider reads its alpha from. */
  hsva: Ref<HSVA>;
  /** Current alpha (`0–1`). */
  alpha: Ref<number>;
  /** Step granularity for keyboard nudges. */
  step: Ref<number>;
  /** Large-step multiplier (Page keys / Shift+Arrow). */
  largeStep: Ref<number>;
  orientation: Ref<AlphaSliderOrientation>;
  direction: Ref<AlphaSliderDirection>;
  disabled: Ref<boolean>;
  /** Accessible name id contributed by a `ColorFieldLabel`, if present. */
  labelId: Ref<string | undefined>;
  trackRef: Ref<HTMLElement | null>;
  /** Set the alpha (`0–1`); clamped by the root. */
  setAlpha: (alpha: number) => void;
}

const ctx = useContextFactory<AlphaSliderContext>('AlphaSliderContext');

export const provideAlphaSliderContext = ctx.provide;
export const useAlphaSliderContext = ctx.inject;
