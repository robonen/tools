<script lang="ts">
import type { PrimitiveProps } from '../primitive';

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
    @click="ctx.edit"
  >
    <slot>Edit</slot>
  </Primitive>
</template>
