<script lang="ts">
import type { DialogRootProps } from '../dialog';

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
