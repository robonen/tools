<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * Wrapper that groups the preview and input. It mirrors edit/empty/disabled
 * state via data attributes and, when `autoResize` is set, becomes the grid that
 * sizes the input to match the preview text.
 */
export interface EditableAreaProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useEditableContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'div' } = defineProps<EditableAreaProps>();

const ctx = useEditableContext();
const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :data-state="ctx.isEditing.value ? 'edit' : 'preview'"
    :data-empty="ctx.isEmpty.value ? '' : undefined"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :data-readonly="ctx.readonly.value ? '' : undefined"
    :style="ctx.autoResize.value ? { display: 'inline-grid' } : undefined"
  >
    <slot />
  </Primitive>
</template>
