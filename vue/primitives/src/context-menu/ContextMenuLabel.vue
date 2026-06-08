<script lang="ts">
import type { MenuLabelProps } from '../menu';

export interface ContextMenuLabelProps extends MenuLabelProps {}
</script>

<script setup lang="ts">
import { MenuLabel } from '../menu';

const props = defineProps<ContextMenuLabelProps>();
</script>

<template>
  <MenuLabel v-bind="props"><slot /></MenuLabel>
</template>
