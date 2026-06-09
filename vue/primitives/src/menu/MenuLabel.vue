<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A non-interactive heading for a section of the menu. It is skipped by keyboard
 * navigation and typeahead, so use it to title a group of items rather than as a
 * selectable entry.
 */
export interface MenuLabelProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';

const { as = 'div' } = defineProps<MenuLabelProps>();
</script>

<template>
  <Primitive :as="as">
    <slot />
  </Primitive>
</template>
