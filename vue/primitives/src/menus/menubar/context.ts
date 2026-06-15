import type { ComputedRef, Ref, ShallowRef } from 'vue';
import type { Direction } from '../../utilities/config-provider';
import type { CollectionItemData } from '../../utilities/collection';

import { useContextFactory } from '@robonen/vue';

/**
 * Marker attribute placed on a sub-trigger. Cross-menu arrow navigation reads it
 * to avoid switching menubar menus while the same arrow key is opening a submenu.
 */
export const SUBTRIGGER_ATTR = 'data-primitives-menubar-subtrigger';

export interface MenubarRootContext {
  value: Ref<string | undefined>;
  dir: Ref<Direction>;
  loop: Ref<boolean>;
  onMenuOpen: (value: string) => void;
  /**
   * Closes the menubar. Pass the value of the menu requesting the close so a
   * stale menu dismissing mid-switch cannot clobber the sibling that just
   * opened — only the currently-active menu actually closes. Omit the value to
   * force-close whichever menu is open.
   */
  onMenuClose: (value?: string) => void;
  onMenuToggle: (value: string) => void;
  /** Ordered list of all currently-mounted menubar triggers (DOM order). */
  getTriggers: (includeDisabled?: boolean) => Array<CollectionItemData<string>>;
  /** Buffered typeahead search string (cleared after ~1000ms idle). */
  searchRef: Ref<string>;
  /**
   * Value of the trigger that is the menubar's single tab stop (roving tabindex).
   * Exactly one trigger has `tabindex="0"`; the rest are `-1`, so the whole
   * menubar is one tab stop and Arrow keys move between triggers.
   */
  currentTabStopId: Ref<string | undefined>;
  /** Sets which trigger value owns the roving tab stop. */
  onTabStopChange: (value: string | undefined) => void;
}

export const {
  inject: useMenubarRootContext,
  provide: provideMenubarRootContext,
} = useContextFactory<MenubarRootContext>('MenubarRootContext');

export interface MenubarMenuContext {
  value: string;
  triggerId: ComputedRef<string>;
  contentId: ComputedRef<string>;
  triggerRef: ShallowRef<HTMLElement | null>;
  onTriggerChange: (el: HTMLElement | null) => void;
  wasKeyboardTriggerOpenRef: Ref<boolean>;
}

export const {
  inject: useMenubarMenuContext,
  provide: provideMenubarMenuContext,
} = useContextFactory<MenubarMenuContext>('MenubarMenuContext');
