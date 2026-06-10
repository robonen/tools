<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * Button that enters edit mode. It is hidden while editing and disabled when the
 * Root is disabled.
 */
export interface EditableEditTriggerProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useEditableContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'button' } = defineProps<EditableEditTriggerProps>();

const ctx = useEditableContext();
const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :type="as === 'button' ? 'button' : undefined"
    aria-label="edit"
    :disabled="ctx.disabled.value || undefined"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :hidden="ctx.isEditing.value ? '' : undefined"
    :style="ctx.isEditing.value ? { display: 'none' } : undefined"
    @click="ctx.edit"
  >
    <slot>Edit</slot>
  </Primitive>
</template>
