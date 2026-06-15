import type { Ref } from 'vue';
import type { HSVA } from '../../internal/color';
import { useContextFactory } from '@robonen/vue';

export type ColorAreaDirection = 'ltr' | 'rtl';

/**
 * Context shared between `ColorAreaRoot` and `ColorAreaThumb`.
 *
 * Scalar props are exposed as plain `Ref<T>` — `ColorAreaRoot` builds them with
 * `toRef(() => prop)` (a reactive getter ref without an extra effect).
 */
export interface ColorAreaContext {
  /** The canonical colour the area reads saturation/value from. */
  hsva: Ref<HSVA>;
  /** Current saturation (`0–1`, x-axis). */
  saturation: Ref<number>;
  /** Current value/brightness (`0–1`, y-axis). */
  value: Ref<number>;
  /** Step granularity for keyboard nudges. */
  step: Ref<number>;
  /** Large-step granularity (Shift+Arrow / Page keys). */
  largeStep: Ref<number>;
  direction: Ref<ColorAreaDirection>;
  disabled: Ref<boolean>;
  /** Accessible name id contributed by a `ColorFieldLabel`, if present. */
  labelId: Ref<string | undefined>;
  trackRef: Ref<HTMLElement | null>;
  /** Set the saturation channel (`0–1`), preserving hue and value. */
  setSaturation: (saturation: number) => void;
  /** Set the value/brightness channel (`0–1`), preserving hue and saturation. */
  setValue: (value: number) => void;
}

const ctx = useContextFactory<ColorAreaContext>('ColorAreaContext');

export const provideColorAreaContext = ctx.provide;
export const useColorAreaContext = ctx.inject;
