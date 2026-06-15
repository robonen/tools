<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A button that removes its parent tag from the list when clicked. Render it
 * inside `TagsInputItem`; it is labelled by the sibling `ItemText`.
 */
export interface TagsInputItemDeleteProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { useTagsInputContext, useTagsInputItemContext } from './context';
import { Primitive } from '../../internal/primitive';
import { useForwardExpose } from '@robonen/vue';
import { isEqual } from '@robonen/stdlib';

const { as = 'button' } = defineProps<TagsInputItemDeleteProps>();

const ctx = useTagsInputContext();
const item = useTagsInputItemContext();
const { forwardRef } = useForwardExpose();

function onClick(): void {
  if (item.disabled.value) return;
  // Deep equality so object tags (whose stored reference may differ from the
  // prop's reference) still resolve to the correct index.
  const idx = ctx.modelValue.value.findIndex(v => isEqual(v, item.value.value));
  if (idx !== -1) ctx.onRemoveValue(idx);
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :type="as === 'button' ? 'button' : undefined"
    tabindex="-1"
    :aria-labelledby="item.textId.value || undefined"
    :aria-current="item.isSelected.value"
    :data-state="item.isSelected.value ? 'active' : 'inactive'"
    :data-disabled="item.disabled.value ? '' : undefined"
    :disabled="item.disabled.value || undefined"
    @click="onClick"
  >
    <slot />
  </Primitive>
</template>
