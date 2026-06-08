import type { ComputedRef, Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';

export interface HoverCardContext {
  open: ComputedRef<boolean>;
  onOpenChange: (open: boolean) => void;
  onOpen: () => void;
  onClose: () => void;
  onDismiss: () => void;
  hasSelection: Ref<boolean>;
  isPointerDownOnContent: Ref<boolean>;
  isPointerInTransit: Ref<boolean>;
  trigger: Ref<HTMLElement | undefined>;
  onTriggerChange: (el: HTMLElement | undefined) => void;
}

const ctx = useContextFactory<HoverCardContext>('HoverCardContext');

export const provideHoverCardContext = ctx.provide;
export const useHoverCardContext = ctx.inject;
