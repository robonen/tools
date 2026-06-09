<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * Empty-state message shown when the search yields no matching items. By default
 * it appears only while a search term is active; set `always` to also show it for
 * an empty list with no query.
 */
export interface CommandEmptyProps extends PrimitiveProps {
  /** Render even while there is no active search term. */
  always?: boolean;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { useCommandContext } from './context';

const { as = 'div', always = false } = defineProps<CommandEmptyProps>();

const { forwardRef } = useForwardExpose();
const ctx = useCommandContext();

const shouldRender = computed(() => {
  if (ctx.filteredItems.value.size !== 0) return false;
  if (always) return true;
  return ctx.searchTerm.value.length > 0;
});
</script>

<template>
  <Primitive
    v-if="shouldRender"
    :ref="forwardRef"
    :as="as"
    role="presentation"
    data-primitives-command-empty
  >
    <slot />
  </Primitive>
</template>
