<script lang="ts">
import type { PrimitiveProps } from '@/primitive';

export interface PaginationListItemProps extends PrimitiveProps {
  value: number;
}
</script>

<script setup lang="ts">
import { Primitive } from '@/primitive';
import { computed } from 'vue';
import { injectPaginationContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'button' as const, value } = defineProps<PaginationListItemProps>();

const { forwardRef } = useForwardExpose();
const ctx = injectPaginationContext();

const isSelected = computed(() => ctx.currentPage.value === value);

const attrs = computed(() => ({
  'data-type': 'page',
  'aria-label': `Page ${value}`,
  'aria-current': isSelected.value ? 'page' as const : undefined,
  'data-selected': isSelected.value ? 'true' : undefined,
  disabled: ctx.disabled.value,
  type: as === 'button' ? 'button' as const : undefined,
}));

function handleClick() {
  if (!ctx.disabled.value) {
    ctx.onPageChange(value);
  }
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as
    v-bind="attrs"
    @click="handleClick"
  >
    <slot>{{ value }}</slot>
  </Primitive>
</template>
