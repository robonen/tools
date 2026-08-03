<script lang="ts">
import type { DialogTriggerProps } from '../dialog';

/**
 * The button that toggles the drawer open. A thin wrapper over Dialog's Trigger
 * that tags the resulting `update:open` with the `trigger-press` reason.
 */
export interface DrawerTriggerProps extends DialogTriggerProps {}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';
import { DialogTrigger } from '../dialog';
import { injectDrawerRootContext } from './context';

const props = defineProps<DrawerTriggerProps>();
const { armReason } = injectDrawerRootContext();
const { forwardRef } = useForwardExpose();
</script>

<template>
  <DialogTrigger v-bind="props" :ref="forwardRef" @click="armReason('trigger-press')">
    <slot />
  </DialogTrigger>
</template>
