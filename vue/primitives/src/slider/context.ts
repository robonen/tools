import type { Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';

export type SliderOrientation = 'horizontal' | 'vertical';
export type SliderDirection = 'ltr' | 'rtl';

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
  trackRef: Ref<HTMLElement | null>;
  registerThumb: (el: HTMLElement) => number;
  unregisterThumb: (el: HTMLElement) => void;
  getThumbIndex: (el: HTMLElement) => number;
  updateValue: (index: number, next: number) => void;
  startDragFromTrack: (event: PointerEvent) => void;
}

const ctx = useContextFactory<SliderContext>('SliderContext');

export const provideSliderContext = ctx.provide;
export const useSliderContext = ctx.inject;
