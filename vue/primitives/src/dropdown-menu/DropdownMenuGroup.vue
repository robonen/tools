<script lang="ts">
import type { MenuGroupProps } from '../menu';

/**
 * Groups related items so assistive tech announces them together. Pair it with
 * a DropdownMenuLabel to give the group an accessible name.
 */
export interface DropdownMenuGroupProps extends MenuGroupProps {}
</script>

<script setup lang="ts">
import { MenuGroup } from '../menu';

const props = defineProps<DropdownMenuGroupProps>();
</script>

<template>
  <MenuGroup v-bind="props"><slot /></MenuGroup>
</template>
