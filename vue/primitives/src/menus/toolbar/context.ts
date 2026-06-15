import type { ComputedRef, Ref } from 'vue';
import type { RovingDirection, RovingOrientation } from '../../internal/utils/roving-focus';
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
  /**
   * Notify the root that an item received focus, so the current tab stop
   * follows the focused control (backs `currentTabStopId` / roving tabindex).
   */
  onItemFocus: (el: HTMLElement) => void;
  /**
   * Notify the root that the user pressed `Shift+Tab` to leave the toolbar, so
   * the group element drops out of the tab order until focus comes back.
   */
  onItemShiftTab: () => void;
}

const ctx = useContextFactory<ToolbarContext>('ToolbarContext');

export const provideToolbarContext = ctx.provide;
export const useToolbarContext = ctx.inject;

/**
 * Dedicated collection key for toolbar items. A `ToolbarToggleGroup` nests a
 * `ToggleGroupRoot`, which provides its own default-key collection; using a
 * namespaced key here keeps the toolbar's roving collection from being shadowed
 * so that `ToolbarToggleItem`s still register with the toolbar for navigation.
 */
export const TOOLBAR_COLLECTION_KEY = 'toolbar';
