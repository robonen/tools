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
import { shallowRef } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { DialogContent } from '../dialog';
import { provideAlertDialogContentContext } from './context';

const props = defineProps<AlertDialogContentProps>();
const emit = defineEmits<AlertDialogContentEmits>();

const { forwardRef } = useForwardExpose();

// Per-instance Cancel element registered by AlertDialogCancel through context.
// Scoped to this Content so nested/multiple alert dialogs each focus their own
// Cancel instead of the first match in document order.
const cancelElement = shallowRef<HTMLElement | undefined>(undefined);
provideAlertDialogContentContext({ cancelElement });

function onOpenAutoFocus(event: Event) {
  emit('openAutoFocus', event);
  if (event.defaultPrevented) return;
  // Suppress the focus-scope's default first-tabbable focus synchronously, then
  // redirect to the safe Cancel choice. The focus runs on a microtask so the
  // Cancel control has registered its element in context even when its
  // post-flush registration watch settles after this synchronous event.
  // `preventScroll` keeps the page/scroll container from jumping to the button.
  event.preventDefault();
  queueMicrotask(() => {
    cancelElement.value?.focus({ preventScroll: true });
  });
}
</script>

<template>
  <DialogContent
    :ref="forwardRef"
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
