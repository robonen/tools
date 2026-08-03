<script lang="ts">
import type { DialogCloseProps } from '../dialog';

/**
 * A button that closes the drawer when activated. A thin wrapper over Dialog's
 * Close that tags the resulting `update:open` with the `close-press` reason.
 */
export interface DrawerCloseProps extends DialogCloseProps {}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';
import { DialogClose } from '../dialog';
import { injectDrawerRootContext } from './context';

const props = defineProps<DrawerCloseProps>();
const { armReason } = injectDrawerRootContext();
const { forwardRef } = useForwardExpose();
</script>

<template>
  <DialogClose v-bind="props" :ref="forwardRef" @click="armReason('close-press')">
    <slot />
  </DialogClose>
</template>
