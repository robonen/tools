<script lang="ts">
import type { DialogRootProps } from '../dialog';

/**
 * A modal dialog that interrupts the user with important content and expects a
 * deliberate response. Built on top of Dialog, but always modal and rendered
 * with `role="alertdialog"` — focus moves to the Cancel button on open and
 * outside clicks are ignored, so the user must explicitly confirm or cancel.
 *
 * Use it for destructive or irreversible actions (deleting data, discarding
 * changes); for non-blocking content prefer Dialog instead. Manages open state
 * and provides context to all parts. Bind `v-model:open` to control it.
 */
export interface AlertDialogRootProps extends Omit<DialogRootProps, 'modal'> {}
</script>

<script setup lang="ts">
import { DialogRoot } from '../dialog';

defineOptions({ inheritAttrs: false });

const props = defineProps<AlertDialogRootProps>();
const openModel = defineModel<boolean | undefined>('open', { default: undefined });
</script>

<template>
  <DialogRoot
    :default-open="props.defaultOpen"
    :modal="true"
    :open="openModel"
    @update:open="openModel = $event"
  >
    <slot :open="openModel" />
  </DialogRoot>
</template>
