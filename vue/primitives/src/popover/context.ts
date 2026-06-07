import type { ComputedRef, Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';

export interface PopoverContext {
  open: Ref<boolean>;
  modal: Ref<boolean>;
  triggerId: ComputedRef<string>;
  contentId: ComputedRef<string>;
  triggerElement: Ref<HTMLElement | undefined>;
  hasCustomAnchor: Ref<boolean>;
  onOpenChange: (value: boolean) => void;
  onOpenToggle: () => void;
}

const ctx = useContextFactory<PopoverContext>('PopoverContext');

export const providePopoverContext = ctx.provide;
export const usePopoverContext = ctx.inject;
