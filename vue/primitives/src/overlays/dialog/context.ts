import type { ComputedRef, Ref, WritableComputedRef } from 'vue';
import { useContextFactory } from '@robonen/vue';

export interface DialogContext {
  /** Controlled open state. Write to toggle. */
  open: WritableComputedRef<boolean> | Ref<boolean>;
  /** Whether the dialog is modal (traps focus, locks scroll, inert outside). */
  modal: Ref<boolean>;
  /** Stable id for the trigger element (for aria-controls). */
  triggerId: ComputedRef<string>;
  /** Stable id applied to DialogContent (for aria-controls target). */
  contentId: ComputedRef<string>;
  /** Id of DialogTitle — when mounted — used as aria-labelledby. */
  titleId: Ref<string | undefined>;
  /** Id of DialogDescription — when mounted — used as aria-describedby. */
  descriptionId: Ref<string | undefined>;
  /** DOM node of DialogTrigger — used to restore focus and as a dismiss anchor. */
  triggerElement: Ref<HTMLElement | undefined>;
  /** DOM node of the currently mounted DialogContent. */
  contentElement: Ref<HTMLElement | undefined>;
  /** Programmatically open the dialog. */
  onOpen: () => void;
  /** Programmatically close the dialog. */
  onClose: () => void;
  /** Toggle the dialog. */
  onToggle: () => void;
}

const ctx = useContextFactory<DialogContext>('DialogContext');

export const provideDialogContext = ctx.provide;
export const useDialogContext = ctx.inject;
