import type { ComputedRef, ShallowRef } from 'vue';

import { useContextFactory } from '@robonen/vue';

export interface DropdownMenuRootContext {
  triggerId: ComputedRef<string>;
  triggerRef: ShallowRef<HTMLElement | null>;
  contentId: ComputedRef<string>;
  onTriggerChange: (el: HTMLElement | null) => void;
}

export const {
  inject: useDropdownMenuRootContext,
  provide: provideDropdownMenuRootContext,
} = useContextFactory<DropdownMenuRootContext>('DropdownMenuRootContext');
