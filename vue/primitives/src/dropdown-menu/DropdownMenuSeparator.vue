<script lang="ts">
import type { MenuSeparatorProps } from '../menu';

export interface DropdownMenuSeparatorProps extends MenuSeparatorProps {}
</script>

<script setup lang="ts">
import { MenuSeparator } from '../menu';

const props = defineProps<DropdownMenuSeparatorProps>();
</script>

<template>
  <MenuSeparator v-bind="props"><slot /></MenuSeparator>
</template>
