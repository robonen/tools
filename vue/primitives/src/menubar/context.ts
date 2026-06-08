import type { ComputedRef, Ref, ShallowRef } from 'vue';
import type { Direction } from '../config-provider';
import type { CollectionItemData } from '../collection';

import { useContextFactory } from '@robonen/vue';

export interface MenubarRootContext {
  value: Ref<string | undefined>;
  dir: Ref<Direction>;
  loop: Ref<boolean>;
  onMenuOpen: (value: string) => void;
  onMenuClose: () => void;
  onMenuToggle: (value: string) => void;
  /** Ordered list of all currently-mounted menubar triggers (DOM order). */
  getTriggers: (includeDisabled?: boolean) => Array<CollectionItemData<string>>;
  /** Buffered typeahead search string (cleared after ~1000ms idle). */
  searchRef: Ref<string>;
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
