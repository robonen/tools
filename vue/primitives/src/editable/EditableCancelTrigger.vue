<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * Button that discards the draft, restores the committed value, and leaves edit
 * mode. It is only shown while editing.
 */
export interface EditableCancelTriggerProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useEditableContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'button' } = defineProps<EditableCancelTriggerProps>();

const ctx = useEditableContext();
const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :type="as === 'button' ? 'button' : undefined"
    aria-label="cancel"
    :disabled="ctx.disabled.value || undefined"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :hidden="ctx.isEditing.value ? undefined : ''"
    :style="ctx.isEditing.value ? undefined : { display: 'none' }"
    @click="ctx.cancel"
  >
    <slot>Cancel</slot>
  </Primitive>
</template>
