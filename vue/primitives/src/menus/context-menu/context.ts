import type { Ref } from 'vue';
import type { Direction } from '../../utilities/config-provider';

import { useContextFactory } from '@robonen/vue';

export interface ContextMenuRootContext {
  open: Ref<boolean>;
  onOpenChange: (open: boolean) => void;
  modal: Ref<boolean>;
  /** Resolved reading direction (prop on root falls back to the global ConfigProvider dir). */
  dir: Ref<Direction>;
  /**
   * The trigger element captured once mounted. Used by the content's
   * interact-outside guard so a right-click on the trigger while the menu is
   * open does not dismiss-then-reopen (flicker / lost focus).
   */
  triggerElement: Ref<HTMLElement | undefined>;
  /** Delay in ms from a touch/pen press until the menu opens (long-press). */
  pressOpenDelay: Ref<number>;
}

export const {
  inject: useContextMenuRootContext,
  provide: provideContextMenuRootContext,
} = useContextFactory<ContextMenuRootContext>('ContextMenuRootContext');
