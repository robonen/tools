<script lang="ts">
import type { MenuGroupProps } from '../menu';

export interface ContextMenuGroupProps extends MenuGroupProps {}
</script>

<script setup lang="ts">
import { MenuGroup } from '../menu';

const props = defineProps<ContextMenuGroupProps>();
</script>

<template>
  <MenuGroup v-bind="props"><slot /></MenuGroup>
</template>
