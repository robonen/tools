import type { CheckedState } from './types';
import type { ComputedRef, Ref, ShallowRef } from 'vue';
import type { Direction } from '../config-provider';

import { useContextFactory } from '@robonen/vue';

export interface MenuContext {
  open: Ref<boolean>;
  onOpenChange: (open: boolean) => void;
  content: Ref<HTMLElement | null>;
  onContentChange: (el: HTMLElement | null) => void;
}
export const { inject: useMenuContext, provide: provideMenuContext }
  = useContextFactory<MenuContext>('MenuContext');

export interface MenuRootContext {
  onClose: () => void;
  dir: Ref<Direction>;
  isUsingKeyboardRef: Ref<boolean>;
  modal: Ref<boolean>;
}
export const { inject: useMenuRootContext, provide: provideMenuRootContext }
  = useContextFactory<MenuRootContext>('MenuRootContext');

export interface MenuContentContext {
  onItemEnter: (event: PointerEvent) => boolean;
  onItemLeave: (event: PointerEvent) => void;
  onTriggerLeave: (event: PointerEvent) => boolean;
  searchRef: Ref<string>;
  pointerGraceTimerRef: Ref<number>;
  onPointerGraceIntentChange: (intent: { area: Array<{ x: number; y: number }>; side: 'left' | 'right' } | null) => void;
}
export const { inject: useMenuContentContext, provide: provideMenuContentContext }
  = useContextFactory<MenuContentContext>('MenuContentContext');

export interface MenuSubContext {
  contentId: ComputedRef<string>;
  triggerId: ComputedRef<string>;
  trigger: ShallowRef<HTMLElement | null>;
  onTriggerChange: (el: HTMLElement | null) => void;
}
export const { inject: useMenuSubContext, provide: provideMenuSubContext }
  = useContextFactory<MenuSubContext>('MenuSubContext');

export interface MenuRadioGroupContext {
  modelValue: Ref<string | undefined>;
  onValueChange: (value: string) => void;
}
export const { inject: useMenuRadioGroupContext, provide: provideMenuRadioGroupContext }
  = useContextFactory<MenuRadioGroupContext>('MenuRadioGroupContext');

export interface MenuItemIndicatorContext {
  checkedState: Ref<CheckedState>;
}
export const { inject: useMenuItemIndicatorContext, provide: provideMenuItemIndicatorContext }
  = useContextFactory<MenuItemIndicatorContext>('MenuItemIndicatorContext');

export interface MenuGroupContext {
  id: string;
}
export const { inject: useMenuGroupContext, provide: provideMenuGroupContext }
  = useContextFactory<MenuGroupContext>('MenuGroupContext');
