<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface AlertDialogActionProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { DialogClose } from '../dialog';

const { as = 'button' } = defineProps<AlertDialogActionProps>();
</script>

<template>
  <DialogClose :as="as" data-alert-dialog-action>
    <slot />
  </DialogClose>
</template>
