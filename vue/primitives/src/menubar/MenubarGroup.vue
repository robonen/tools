<script lang="ts">
import type { MenuGroupProps } from '../menu';

/**
 * Groups related items within a menu so assistive tech announces them together.
 * Pair it with a MenubarLabel to give the group an accessible name.
 */
export interface MenubarGroupProps extends MenuGroupProps {}
</script>

<script setup lang="ts">
import { MenuGroup } from '../menu';

const props = defineProps<MenubarGroupProps>();
</script>

<template>
  <MenuGroup v-bind="props"><slot /></MenuGroup>
</template>
