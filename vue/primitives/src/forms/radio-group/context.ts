import type { ComputedRef, Ref } from 'vue';
import type { RovingDirection, RovingOrientation } from '../../internal/utils/roving-focus';
import type { AcceptableValue } from './utils';
import { useContextFactory } from '@robonen/vue';

export interface RadioGroupContext {
  value: Ref<AcceptableValue | undefined>;
  /**
   * Commits a selection. Returns `true` when the value was applied, `false`
   * when it was blocked (disabled group/item or a vetoed `select` event), so
   * callers can decide whether to follow up (e.g. move focus).
   */
  setValue: (v: AcceptableValue) => boolean;
  /** Structural equality test against the selected value, honouring `by`. */
  isChecked: (v: AcceptableValue) => boolean;
  orientation: Ref<RovingOrientation>;
  direction: Ref<RovingDirection>;
  loop: Ref<boolean>;
  disabled: Ref<boolean>;
  required: Ref<boolean>;
  name: Ref<string | undefined>;
  /** DOM-ordered item elements, sourced from the internal Collection. */
  items: ComputedRef<HTMLElement[]>;
  /**
   * The single element that holds the roving tab stop (the checked item, or the
   * first enabled item when nothing is selected). Computed once in the Root so
   * each item does an O(1) identity check instead of scanning `items`.
   */
  tabStopElement: ComputedRef<HTMLElement | undefined>;
  onItemKeyDown: (event: KeyboardEvent, el: HTMLElement) => void;
}

const rootCtx = useContextFactory<RadioGroupContext>('RadioGroupContext');

export const provideRadioGroupContext = rootCtx.provide;
export const useRadioGroupContext = rootCtx.inject;

export interface RadioGroupItemContext {
  value: AcceptableValue;
  checked: ComputedRef<boolean>;
  disabled: ComputedRef<boolean>;
}

const itemCtx = useContextFactory<RadioGroupItemContext>('RadioGroupItemContext');

export const provideRadioGroupItemContext = itemCtx.provide;
export const useRadioGroupItemContext = itemCtx.inject;

export type { AcceptableValue, RadioCompareBy } from './utils';
