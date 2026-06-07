import type { ComputedRef, Ref } from 'vue';
import type { RovingDirection, RovingOrientation } from '../utils/roving-focus';
import { useContextFactory } from '@robonen/vue';

export interface RadioGroupContext {
  value: Ref<string | undefined>;
  setValue: (v: string) => void;
  orientation: Ref<RovingOrientation>;
  direction: Ref<RovingDirection>;
  loop: Ref<boolean>;
  disabled: Ref<boolean>;
  required: Ref<boolean>;
  name: Ref<string | undefined>;
  /** DOM-ordered items, sourced from the internal Collection. */
  items: ComputedRef<HTMLElement[]>;
  onItemKeyDown: (event: KeyboardEvent, el: HTMLElement) => void;
}

const rootCtx = useContextFactory<RadioGroupContext>('RadioGroupContext');

export const provideRadioGroupContext = rootCtx.provide;
export const useRadioGroupContext = rootCtx.inject;

export interface RadioGroupItemContext {
  value: string;
  checked: ComputedRef<boolean>;
  disabled: ComputedRef<boolean>;
}

const itemCtx = useContextFactory<RadioGroupItemContext>('RadioGroupItemContext');

export const provideRadioGroupItemContext = itemCtx.provide;
export const useRadioGroupItemContext = itemCtx.inject;
