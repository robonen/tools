<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * The button that dismisses the alert without acting and closes the dialog.
 * Receives focus automatically when the alert opens, making it the safe default
 * choice; always include one so the user has a non-destructive way out.
 */
export interface AlertDialogCancelProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { DialogClose } from '../dialog';

const { as = 'button' } = defineProps<AlertDialogCancelProps>();
</script>

<template>
  <DialogClose :as="as" data-alert-dialog-cancel>
    <slot />
  </DialogClose>
</template>
