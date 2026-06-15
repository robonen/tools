import type { Ref } from 'vue';
import type { HSVA } from '../../internal/color';
import { useContextFactory } from '@robonen/vue';

export type HueSliderOrientation = 'horizontal' | 'vertical';
export type HueSliderDirection = 'ltr' | 'rtl';

/**
 * Context shared between `HueSliderRoot` and `HueSliderThumb`.
 *
 * Scalar props are exposed as plain `Ref<T>` — `HueSliderRoot` builds them with
 * `toRef(() => prop)` (a reactive getter ref without an extra effect).
 */
export interface HueSliderContext {
  /** The canonical colour the slider reads its hue from. */
  hsva: Ref<HSVA>;
  /** Current hue (`0–360`). */
  hue: Ref<number>;
  /** Step granularity for keyboard nudges. */
  step: Ref<number>;
  /** Large-step multiplier (Page keys / Shift+Arrow). */
  largeStep: Ref<number>;
  orientation: Ref<HueSliderOrientation>;
  direction: Ref<HueSliderDirection>;
  disabled: Ref<boolean>;
  /** Accessible name id contributed by a `ColorFieldLabel`, if present. */
  labelId: Ref<string | undefined>;
  trackRef: Ref<HTMLElement | null>;
  /** Set the hue (`0–360`); clamped/wrapped by the root. */
  setHue: (hue: number) => void;
}

const ctx = useContextFactory<HueSliderContext>('HueSliderContext');

export const provideHueSliderContext = ctx.provide;
export const useHueSliderContext = ctx.inject;
