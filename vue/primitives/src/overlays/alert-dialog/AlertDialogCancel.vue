<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The button that dismisses the alert without acting and closes the dialog.
 * Receives focus automatically when the alert opens, making it the safe default
 * choice; always include one so the user has a non-destructive way out.
 */
export interface AlertDialogCancelProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { watch } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { DialogClose } from '../dialog';
import { useAlertDialogContentContext } from './context';

const { as = 'button' } = defineProps<AlertDialogCancelProps>();

const { forwardRef, currentElement } = useForwardExpose();
const ctx = useAlertDialogContentContext();

// Report this control's element to the owning Content so it can move open
// focus here — scoped per-instance, never resolved by a global DOM query.
watch(currentElement, (el) => {
  ctx.cancelElement.value = el as HTMLElement | undefined;
}, { immediate: true, flush: 'post' });
</script>

<template>
  <DialogClose :ref="forwardRef" :as="as" data-alert-dialog-cancel>
    <slot />
  </DialogClose>
</template>
