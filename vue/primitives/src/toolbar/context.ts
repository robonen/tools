import type { ComputedRef, Ref } from 'vue';
import type { RovingDirection, RovingOrientation } from '../utils/roving-focus';
import { useContextFactory } from '@robonen/vue';

export interface ToolbarContext {
  orientation: Ref<RovingOrientation>;
  direction: Ref<RovingDirection>;
  loop: Ref<boolean>;
  /** DOM-ordered items, sourced from the internal Collection. */
  items: ComputedRef<HTMLElement[]>;
  activeIndex: Ref<number>;
  focusIndex: (i: number) => void;
  onItemKeyDown: (event: KeyboardEvent, el: HTMLElement) => void;
}

const ctx = useContextFactory<ToolbarContext>('ToolbarContext');

export const provideToolbarContext = ctx.provide;
export const useToolbarContext = ctx.inject;
