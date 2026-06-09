<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * Button that commits the draft value and leaves edit mode. It is only shown
 * while editing.
 */
export interface EditableSubmitTriggerProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useEditableContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'button' } = defineProps<EditableSubmitTriggerProps>();

const ctx = useEditableContext();
const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :type="as === 'button' ? 'button' : undefined"
    aria-label="submit"
    :disabled="ctx.disabled.value || undefined"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :hidden="ctx.isEditing.value ? undefined : ''"
    @click="ctx.submit"
  >
    <slot>Submit</slot>
  </Primitive>
</template>
