import type { ComputedRef, Ref, ShallowRef } from 'vue';
import type { Direction } from '../config-provider';
import type { Orientation } from '../roving-focus';

import { useContextFactory } from '@robonen/vue';

/**
 * Context shared by `NavigationMenuRoot` and `NavigationMenuSub`. Children
 * (item / list / trigger / content / viewport / indicator) read from this
 * single context regardless of whether they are inside a root or a submenu.
 */
export interface NavigationMenuContext {
  isRootMenu: boolean;
  modelValue: Ref<string>;
  previousValue: Ref<string>;
  baseId: ComputedRef<string> | Ref<string>;
  dir: Ref<Direction>;
  orientation: Orientation;
  disableClickTrigger: Ref<boolean>;
  disableHoverTrigger: Ref<boolean>;
  disablePointerLeaveClose: Ref<boolean>;
  unmountOnHide: Ref<boolean>;

  rootNavigationMenu: ShallowRef<HTMLElement | undefined>;
  activeTrigger: ShallowRef<HTMLElement | undefined>;
  onActiveTriggerChange: (el: HTMLElement | undefined) => void;

  indicatorTrack: ShallowRef<HTMLElement | undefined>;
  onIndicatorTrackChange: (el: HTMLElement | undefined) => void;

  viewport: ShallowRef<HTMLElement | undefined>;
  onViewportChange: (el: HTMLElement | undefined) => void;

  onTriggerEnter: (itemValue: string) => void;
  onTriggerLeave: () => void;
  onContentEnter: (itemValue: string) => void;
  onContentLeave: () => void;
  onItemSelect: (itemValue: string) => void;
  onItemDismiss: () => void;
}

export interface NavigationMenuItemContext {
  value: string;
  contentId: string;
  triggerId: string;
  triggerRef: ShallowRef<HTMLElement | undefined>;
  onTriggerChange: (el: HTMLElement | undefined) => void;
  focusProxyRef: ShallowRef<HTMLElement | undefined>;
  onFocusProxyChange: (el: HTMLElement | undefined) => void;
  wasEscapeCloseRef: Ref<boolean>;
  onEntryKeyDown: () => void;
  onFocusProxyEnter: (side: 'start' | 'end') => void;
  onContentFocusOutside: () => void;
  onRootContentClose: () => void;
}

export const {
  inject: useNavigationMenuContext,
  provide: provideNavigationMenuContext,
} = useContextFactory<NavigationMenuContext>('NavigationMenu');

export const {
  inject: useNavigationMenuItemContext,
  provide: provideNavigationMenuItemContext,
} = useContextFactory<NavigationMenuItemContext>('NavigationMenuItem');
