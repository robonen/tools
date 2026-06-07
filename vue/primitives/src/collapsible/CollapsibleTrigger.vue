<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface CollapsibleTriggerProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useCollapsibleContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'button' } = defineProps<CollapsibleTriggerProps>();

const { forwardRef } = useForwardExpose();
const ctx = useCollapsibleContext();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :type="as === 'button' ? 'button' : undefined"
    :aria-expanded="ctx.open.value"
    :aria-controls="ctx.contentId.value"
    :data-state="ctx.open.value ? 'open' : 'closed'"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :disabled="as === 'button' ? ctx.disabled.value : undefined"
    @click="ctx.onToggle"
  >
    <slot :open="ctx.open.value" />
  </Primitive>
</template>
