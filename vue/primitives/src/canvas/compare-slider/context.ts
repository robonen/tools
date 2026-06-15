import type { Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';

export type CompareSliderOrientation = 'horizontal' | 'vertical';
export type CompareSliderDirection = 'ltr' | 'rtl';

/**
 * Formatter turning the raw reveal position (0–100) into a human-friendly
 * string for the handle's `aria-valuetext`. Return `undefined` to omit
 * `aria-valuetext`.
 */
export type CompareSliderValueText = (position: number) => string | undefined;

/**
 * Context shared between `CompareSliderRoot` and its descendants
 * (`CompareSliderBefore`, `CompareSliderAfter`, `CompareSliderHandle`,
 * `CompareSliderDivider`).
 *
 * Scalar props are exposed as plain `Ref<T>`, but `CompareSliderRoot` builds
 * them with `toRef(() => prop)` — a `GetterRefImpl` that is reactive without
 * allocating a `ReactiveEffect` / cache (unlike `computed`). For identity
 * passthrough of scalar props this avoids redundant effects per instance while
 * keeping template auto-unwrap and `.value` ergonomics.
 */
export interface CompareSliderContext {
  /** Reveal position, 0–100 (percentage of the after-layer shown). */
  position: Ref<number>;
  orientation: Ref<CompareSliderOrientation>;
  direction: Ref<CompareSliderDirection>;
  disabled: Ref<boolean>;
  inverted: Ref<boolean>;
  /**
   * Combined flip flag driving BOTH the pointer-offset mapping and the
   * after-layer clip side. For horizontal: `(dir === 'rtl') !== inverted`; for
   * vertical: `inverted`. Keeping a single source of truth prevents the divider
   * and the revealed region from desyncing.
   */
  flip: Ref<boolean>;
  /** Single keyboard step (Arrow). */
  keyboardStep: Ref<number>;
  /** Large keyboard step (Shift+Arrow / Page keys). */
  keyboardLargeStep: Ref<number>;
  /** Optional formatter for the handle's `aria-valuetext`; `undefined` when unset. */
  valueText: Ref<CompareSliderValueText | undefined>;
  /** Move the reveal position by `delta` (clamped to 0–100). */
  step: (delta: number) => void;
  /** Set the reveal position to an absolute value (clamped to 0–100). */
  setPosition: (next: number) => void;
}

const ctx = useContextFactory<CompareSliderContext>('CompareSliderContext');

export const provideCompareSliderContext = ctx.provide;
export const useCompareSliderContext = ctx.inject;
