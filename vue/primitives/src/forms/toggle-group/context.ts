import type { ComputedRef, Ref } from 'vue';
import type { RovingDirection, RovingOrientation } from '../../internal/utils/roving-focus';
import { useContextFactory } from '@robonen/vue';

export type ToggleGroupType = 'single' | 'multiple';

/**
 * An individual item value. Beyond plain strings, the group accepts numbers,
 * bigints, `null`, and plain objects, comparing them with structural deep
 * equality so object/number values toggle correctly. `boolean` is intentionally
 * excluded so the `modelValue` prop is not coerced by Vue's boolean-prop casting.
 */
export type ToggleGroupValue = string | number | bigint | null | Record<string, unknown>;

export interface ToggleGroupContext {
  type: Ref<ToggleGroupType>;
  value: Ref<ToggleGroupValue[]>;
  toggle: (v: ToggleGroupValue) => void;
  isPressed: (v: ToggleGroupValue) => boolean;
  orientation: Ref<RovingOrientation>;
  direction: Ref<RovingDirection>;
  loop: Ref<boolean>;
  disabled: Ref<boolean>;
  rovingFocus: Ref<boolean>;
  /** DOM-ordered items, sourced from the internal Collection. */
  items: ComputedRef<HTMLElement[]>;
  /**
   * The single enabled item that holds the roving tab stop (first pressed, else
   * first enabled), computed once in the Root from reactive pressed state. Each
   * item compares its own element against this to derive `isTabStop` in O(1).
   */
  tabStopElement: ComputedRef<HTMLElement | undefined>;
  onItemKeyDown: (event: KeyboardEvent, el: HTMLElement) => void;
}

const ctx = useContextFactory<ToggleGroupContext>('ToggleGroupContext');

export const provideToggleGroupContext = ctx.provide;
export const useToggleGroupContext = ctx.inject;
