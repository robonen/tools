<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A visual and semantic divider (`role="separator"`) between groups of menu
 * items. It is purely decorative for navigation and is skipped by keyboard focus.
 */
export interface MenuSeparatorProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';

const { as = 'div' } = defineProps<MenuSeparatorProps>();
</script>

<template>
  <Primitive :as="as" role="separator" aria-orientation="horizontal">
    <slot />
  </Primitive>
</template>
