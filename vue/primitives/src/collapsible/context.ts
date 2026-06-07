import type { ComputedRef, Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';

export interface CollapsibleContext {
  open: Ref<boolean>;
  disabled: Ref<boolean>;
  contentId: ComputedRef<string>;
  onToggle: () => void;
  onOpen: () => void;
  onClose: () => void;
}

const ctx = useContextFactory<CollapsibleContext>('CollapsibleContext');

export const provideCollapsibleContext = ctx.provide;
export const useCollapsibleContext = ctx.inject;
