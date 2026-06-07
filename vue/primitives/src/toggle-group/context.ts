import type { ComputedRef, Ref } from 'vue';
import type { RovingDirection, RovingOrientation } from '../utils/roving-focus';
import { useContextFactory } from '@robonen/vue';

export type ToggleGroupType = 'single' | 'multiple';

export interface ToggleGroupContext {
  type: Ref<ToggleGroupType>;
  value: Ref<string[]>;
  toggle: (v: string) => void;
  isPressed: (v: string) => boolean;
  orientation: Ref<RovingOrientation>;
  direction: Ref<RovingDirection>;
  loop: Ref<boolean>;
  disabled: Ref<boolean>;
  rovingFocus: Ref<boolean>;
  /** DOM-ordered items, sourced from the internal Collection. */
  items: ComputedRef<HTMLElement[]>;
  onItemKeyDown: (event: KeyboardEvent, el: HTMLElement) => void;
}

const ctx = useContextFactory<ToggleGroupContext>('ToggleGroupContext');

export const provideToggleGroupContext = ctx.provide;
export const useToggleGroupContext = ctx.inject;
