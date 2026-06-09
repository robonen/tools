<script lang="ts">
import type { DialogContentEmits, DialogContentProps } from '../dialog';

/**
 * The container for the alert's content, rendered into the portal with
 * `role="alertdialog"`. Hosts the Title, Description, Cancel, and Action parts,
 * moves focus to Cancel on open, and disables dismissal via outside clicks or
 * loss of focus so the alert can only be resolved by an explicit choice.
 */
export interface AlertDialogContentProps extends Omit<DialogContentProps, 'role'> {}
export type AlertDialogContentEmits = DialogContentEmits;
</script>

<script setup lang="ts">
import { DialogContent } from '../dialog';

const props = defineProps<AlertDialogContentProps>();
const emit = defineEmits<AlertDialogContentEmits>();

function onOpenAutoFocus(event: Event) {
  emit('openAutoFocus', event);
  if (event.defaultPrevented) return;
  queueMicrotask(() => {
    const content = document.querySelector<HTMLElement>('[data-alert-dialog-content]');
    const cancel = content?.querySelector<HTMLElement>('[data-alert-dialog-cancel]');
    if (cancel) {
      event.preventDefault();
      cancel.focus();
    }
  });
}
</script>

<template>
  <DialogContent
    v-bind="props"
    role="alertdialog"
    data-alert-dialog-content
    @open-auto-focus="onOpenAutoFocus"
    @close-auto-focus="emit('closeAutoFocus', $event)"
    @escape-key-down="emit('escapeKeyDown', $event)"
    @pointer-down-outside="(e: PointerEvent | MouseEvent) => { e.preventDefault(); emit('pointerDownOutside', e); }"
    @focus-outside="(e: FocusEvent) => { e.preventDefault(); emit('focusOutside', e); }"
    @interact-outside="emit('interactOutside', $event)"
    @dismiss="emit('dismiss')"
  >
    <slot />
  </DialogContent>
</template>
