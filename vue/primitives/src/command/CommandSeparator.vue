<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * Visual divider between groups or items. Hidden automatically while a search
 * term is active (since filtering collapses the list) unless `alwaysRender` is set.
 */
export interface CommandSeparatorProps extends PrimitiveProps {
  /** Render the separator even while the search term is active. */
  alwaysRender?: boolean;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { useCommandContext } from './context';

const { as = 'div', alwaysRender = false } = defineProps<CommandSeparatorProps>();

const { forwardRef } = useForwardExpose();
const ctx = useCommandContext();

const isVisible = computed(() => alwaysRender || ctx.searchTerm.value.length === 0);
</script>

<template>
  <Primitive
    v-if="isVisible"
    :ref="forwardRef"
    :as="as"
    role="separator"
    aria-orientation="horizontal"
    aria-hidden="true"
    data-primitives-command-separator
  >
    <slot />
  </Primitive>
</template>
