<script lang="ts">
import type { MenuLabelProps } from '../menu';

/**
 * A non-interactive heading that titles a section of a menu. It is skipped by
 * keyboard navigation and is not selectable.
 */
export interface MenubarLabelProps extends MenuLabelProps {}
</script>

<script setup lang="ts">
import { MenuLabel } from '../menu';

const props = defineProps<MenubarLabelProps>();
</script>

<template>
  <MenuLabel v-bind="props"><slot /></MenuLabel>
</template>
