import type { InjectionKey, Ref } from 'vue';
import type { HSVA } from '../../internal/color';
import { useContextFactory } from '@robonen/vue';

/** CSS color string formats `ColorFieldRoot` can serialize the value to. */
export type ColorFormat = 'hsva' | 'hex' | 'hex8' | 'rgb' | 'rgba' | 'hsl' | 'hsla';

/**
 * Shared color state surfaced by `ColorFieldRoot` and consumed by the picker
 * sub-components (`ColorArea`, `HueSlider`, `AlphaSlider`).
 *
 * The canonical model is always {@link HSVA} (the value never round-trips
 * through RGB). Each picker reads `hsva` and writes back through the channel
 * setters so the whole cluster stays in sync. Sub-pickers inject this context
 * with a fallback (`undefined`) so they also work standalone, owning their own
 * HSVA via `defineModel`.
 */
export interface ColorFieldContext {
  /** The canonical, reactive HSVA color shared across the cluster. */
  hsva: Ref<HSVA>;
  /** Set the hue channel (`0–360`), preserving the other channels. */
  setHue: (hue: number) => void;
  /** Set the saturation channel (`0–1`), preserving the other channels. */
  setSaturation: (saturation: number) => void;
  /** Set the value/brightness channel (`0–1`), preserving the other channels. */
  setValue: (value: number) => void;
  /** Set the alpha channel (`0–1`), preserving the other channels. */
  setAlpha: (alpha: number) => void;
  /** Set saturation and value/brightness together (used by the 2D area). */
  setSaturationValue: (saturation: number, value: number) => void;
  /** Whether the whole cluster is disabled. */
  disabled: Ref<boolean>;
  /** Accessible name id contributed by `ColorFieldLabel`, if present. */
  labelId: Ref<string | undefined>;
}

const ctx = useContextFactory<ColorFieldContext>('ColorFieldContext');

export const provideColorFieldContext = ctx.provide;
export const useColorFieldContext = ctx.inject;

/** Injection key — used by the sub-pickers to inject with a fallback. */
export const colorFieldContextKey = ctx.key as InjectionKey<ColorFieldContext>;
