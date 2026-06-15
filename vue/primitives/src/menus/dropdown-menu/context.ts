import type { ComputedRef, Ref, ShallowRef } from 'vue';

import type { Direction } from '../../utilities/config-provider';
import { useContextFactory } from '@robonen/vue';

export interface DropdownMenuRootContext {
  triggerId: ComputedRef<string>;
  triggerRef: ShallowRef<HTMLElement | null>;
  contentId: ComputedRef<string>;
  onTriggerChange: (el: HTMLElement | null) => void;
  /** Reactive open state, mirrored from the underlying menu, for composition. */
  open: Ref<boolean>;
  /** Sets the open state explicitly. */
  onOpenChange: (open: boolean) => void;
  /** Flips the open state. */
  onOpenToggle: () => void;
  /** Whether the menu blocks interaction with the rest of the page while open. */
  modal: Ref<boolean>;
  /** Resolved reading direction (`'ltr' | 'rtl'`). */
  dir: Ref<Direction>;
}

export const {
  inject: useDropdownMenuRootContext,
  provide: provideDropdownMenuRootContext,
} = useContextFactory<DropdownMenuRootContext>('DropdownMenuRootContext');
