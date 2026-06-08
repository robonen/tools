<script lang="ts">
import type { MenuGroupProps } from '../menu';

export interface DropdownMenuGroupProps extends MenuGroupProps {}
</script>

<script setup lang="ts">
import { MenuGroup } from '../menu';

const props = defineProps<DropdownMenuGroupProps>();
</script>

<template>
  <MenuGroup v-bind="props"><slot /></MenuGroup>
</template>
