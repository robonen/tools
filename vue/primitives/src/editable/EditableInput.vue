<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface EditableInputProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { nextTick, onMounted, watch } from 'vue';
import { Primitive } from '../primitive';
import { useEditableContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'input' } = defineProps<EditableInputProps>();

const ctx = useEditableContext();
const { forwardRef, currentElement } = useForwardExpose();

function syncRef(): void {
  const el = currentElement.value as HTMLInputElement | undefined;
  ctx.inputRef.value = el;
}

function focusAndSelect(): void {
  const el = ctx.inputRef.value;
  if (!el) return;
  el.focus({ preventScroll: true });
  if (ctx.selectOnFocus.value) el.select();
}

onMounted(() => {
  syncRef();
  if (ctx.startWithEditMode.value) focusAndSelect();
});

watch(ctx.isEditing, (editing) => {
  if (!editing) return;
  nextTick(() => {
    syncRef();
    focusAndSelect();
  });
});

function onInput(event: Event): void {
  ctx.inputValue.value = (event.target as HTMLInputElement).value;
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    ctx.cancel();
    return;
  }
  if (event.key !== 'Enter' || event.shiftKey || event.metaKey || event.isComposing) return;
  const mode = ctx.submitMode.value;
  if (mode === 'enter' || mode === 'both') {
    event.preventDefault();
    ctx.submit();
  }
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :value="ctx.inputValue.value"
    :placeholder="ctx.placeholder.value.edit"
    :disabled="ctx.disabled.value"
    :readonly="ctx.readonly.value"
    :maxlength="ctx.maxLength.value"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :data-readonly="ctx.readonly.value ? '' : undefined"
    :hidden="ctx.autoResize.value ? undefined : !ctx.isEditing.value"
    :style="ctx.autoResize.value ? {
      all: 'unset',
      gridArea: '1 / 1 / auto / auto',
      visibility: !ctx.isEditing.value ? 'hidden' : undefined,
    } : undefined"
    aria-label="editable input"
    @input="onInput"
    @keydown="onKeyDown"
  >
    <slot />
  </Primitive>
</template>
