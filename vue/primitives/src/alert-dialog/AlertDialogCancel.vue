<script lang="ts">
import type { PrimitiveProps } from '../primitive';

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
