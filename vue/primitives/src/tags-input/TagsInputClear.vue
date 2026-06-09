<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A button that removes every tag at once. No-op when the list is already
 * empty or the component is disabled.
 */
export interface TagsInputClearProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';
import { useTagsInputContext } from './context';

const { as = 'button' } = defineProps<TagsInputClearProps>();

const ctx = useTagsInputContext();
const { forwardRef } = useForwardExpose();

function onClick(): void {
  if (ctx.disabled.value) return;
  if (ctx.modelValue.value.length === 0) return;
  // Drop everything; reuse root's commit path by replaying removals in reverse.
  while (ctx.modelValue.value.length > 0) {
    ctx.onRemoveValue(ctx.modelValue.value.length - 1);
  }
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :type="as === 'button' ? 'button' : undefined"
    :disabled="ctx.disabled.value || undefined"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    @click="onClick"
  >
    <slot />
  </Primitive>
</template>
