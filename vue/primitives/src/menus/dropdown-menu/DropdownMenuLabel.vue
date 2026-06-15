<script lang="ts">
import type { MenuLabelProps } from '../menu';

/**
 * A non-interactive heading that titles a section of the menu. It is skipped
 * by keyboard navigation and is not selectable.
 */
export interface DropdownMenuLabelProps extends MenuLabelProps {}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';
import { MenuLabel } from '../menu';

const props = defineProps<DropdownMenuLabelProps>();
useForwardExpose();
</script>

<template>
  <MenuLabel v-bind="props"><slot /></MenuLabel>
</template>
