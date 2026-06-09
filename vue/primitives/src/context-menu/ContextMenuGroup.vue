<script lang="ts">
import type { MenuGroupProps } from '../menu';

/**
 * Groups a set of related items under one accessible `role="group"`, optionally
 * labelled by a `ContextMenuLabel`. Use it to organize the menu into sections.
 */
export interface ContextMenuGroupProps extends MenuGroupProps {}
</script>

<script setup lang="ts">
import { MenuGroup } from '../menu';

const props = defineProps<ContextMenuGroupProps>();
</script>

<template>
  <MenuGroup v-bind="props"><slot /></MenuGroup>
</template>
