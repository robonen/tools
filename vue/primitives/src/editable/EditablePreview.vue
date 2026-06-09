<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * Read-only display of the current value (or the preview placeholder when
 * empty). It is focusable and, depending on `activationMode`, enters edit mode
 * on focus or double-click.
 */
export interface EditablePreviewProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { computed } from 'vue';
import { useEditableContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'span' } = defineProps<EditablePreviewProps>();

const ctx = useEditableContext();
const { forwardRef } = useForwardExpose();

const text = computed(() => ctx.modelValue.value || ctx.placeholder.value.preview);
const showPlaceholder = computed(() => ctx.isEmpty.value);

function onFocus(): void {
  if (ctx.activationMode.value === 'focus') ctx.edit();
}

function onDoubleClick(): void {
  if (ctx.activationMode.value === 'dblclick') ctx.edit();
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    tabindex="0"
    :hidden="ctx.autoResize.value ? undefined : ctx.isEditing.value"
    :data-placeholder-shown="showPlaceholder ? '' : undefined"
    :data-state="ctx.isEditing.value ? 'edit' : 'preview'"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :data-readonly="ctx.readonly.value ? '' : undefined"
    :style="ctx.autoResize.value ? {
      whiteSpace: 'pre',
      userSelect: 'none',
      gridArea: '1 / 1 / auto / auto',
      visibility: ctx.isEditing.value ? 'hidden' : undefined,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    } : undefined"
    @focusin="onFocus"
    @dblclick="onDoubleClick"
  >
    <slot>{{ text }}</slot>
  </Primitive>
</template>
