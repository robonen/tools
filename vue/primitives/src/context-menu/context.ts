import type { Ref } from 'vue';

import { useContextFactory } from '@robonen/vue';

export interface ContextMenuRootContext {
  open: Ref<boolean>;
  onOpenChange: (open: boolean) => void;
  modal: Ref<boolean>;
}

export const {
  inject: useContextMenuRootContext,
  provide: provideContextMenuRootContext,
} = useContextFactory<ContextMenuRootContext>('ContextMenuRootContext');
