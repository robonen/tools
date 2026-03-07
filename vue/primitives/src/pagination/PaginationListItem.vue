<script lang="ts">
import type { PrimitiveProps } from '@/primitive';

export interface PaginationListItemProps extends PrimitiveProps {
  value: number;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '@/primitive';
import { injectPaginationContext } from './context';

const { as = 'button' as const, value } = defineProps<PaginationListItemProps>();

const { forwardRef } = useForwardExpose();
const ctx = injectPaginationContext();

const isSelected = computed(() => ctx.currentPage.value === value);
const disabled = computed(() => ctx.disabled.value);

const attrs = computed(() => ({
  'data-type': 'page',
  'aria-label': `Page ${value}`,
  'aria-current': isSelected.value ? 'page' as const : undefined,
  'data-selected': isSelected.value ? 'true' : undefined,
  'disabled': disabled.value,
  'type': as === 'button' ? 'button' as const : undefined,
}));

function handleClick() {
  if (!disabled.value) {
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
