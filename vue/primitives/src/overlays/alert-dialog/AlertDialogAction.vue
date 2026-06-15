<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The button that confirms the alert and closes the dialog. Use it for the
 * action being warned about (e.g. "Delete"); wire your own handler to perform
 * the work, the part only handles closing.
 */
export interface AlertDialogActionProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';
import { DialogClose } from '../dialog';

const { as = 'button' } = defineProps<AlertDialogActionProps>();

const { forwardRef } = useForwardExpose();
</script>

<template>
  <DialogClose :ref="forwardRef" :as="as" data-alert-dialog-action>
    <slot />
  </DialogClose>
</template>
