<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface TagsInputInputProps extends PrimitiveProps {
  /** Placeholder text. */
  placeholder?: string;
  /** Focus on mount. */
  autoFocus?: boolean;
  /** Max input length. */
  maxLength?: number;
}
</script>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';
import { useTagsInputContext } from './context';

const {
  as = 'input',
  placeholder,
  autoFocus = false,
  maxLength,
} = defineProps<TagsInputInputProps>();

const ctx = useTagsInputContext();
const { forwardRef, currentElement } = useForwardExpose();

const isComposing = ref(false);

function onCompositionStart(): void {
  isComposing.value = true;
}
function onCompositionEnd(): void {
  nextTick(() => {
    isComposing.value = false;
  });
}

function commitCurrent(target: HTMLInputElement): void {
  if (!target.value) return;
  const ok = ctx.onAddValue(target.value);
  if (ok) target.value = '';
}

async function onEnter(event: KeyboardEvent): Promise<void> {
  if (isComposing.value) return;
  await nextTick();
  if (event.defaultPrevented) return;
  const target = event.target as HTMLInputElement;
  if (!target.value) return;
  event.preventDefault();
  commitCurrent(target);
}

function onTab(event: KeyboardEvent): void {
  if (!ctx.addOnTab.value) return;
  const target = event.target as HTMLInputElement;
  if (!target.value) return;
  event.preventDefault();
  commitCurrent(target);
}

function onBlur(event: FocusEvent): void {
  ctx.selectedElement.value = undefined;
  if (!ctx.addOnBlur.value) return;
  const target = event.target as HTMLInputElement;
  if (!target.value) return;
  commitCurrent(target);
}

function onInput(event: Event): void {
  ctx.isInvalidInput.value = false;
  const ev = event as InputEvent;
  if (ev.data === null || ev.data === undefined) return;
  const delim = ctx.delimiter.value;
  const matches = typeof delim === 'string' ? ev.data === delim : delim.test(ev.data);
  if (!matches) return;
  const target = event.target as HTMLInputElement;
  target.value = target.value.replace(delim, '');
  if (target.value.trim() === '') {
    target.value = '';
    return;
  }
  commitCurrent(target);
}

function onPaste(event: ClipboardEvent): void {
  if (!ctx.addOnPaste.value) return;
  const data = event.clipboardData?.getData('text');
  if (!data) return;
  event.preventDefault();
  const delim = ctx.delimiter.value;
  const parts = delim ? data.split(delim) : [data];
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed) ctx.onAddValue(trimmed);
  }
}

onMounted(() => {
  if (!autoFocus) return;
  const el = currentElement.value;
  const input = el?.nodeName === 'INPUT' ? el : el?.querySelector('input');
  // Defer to let the surrounding DOM settle before stealing focus.
  setTimeout(() => {
    (input as HTMLInputElement | null)?.focus();
  }, 0);
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    type="text"
    autocomplete="off"
    autocorrect="off"
    autocapitalize="off"
    :placeholder="placeholder"
    :maxlength="maxLength"
    :disabled="ctx.disabled.value || undefined"
    :data-invalid="ctx.isInvalidInput.value ? '' : undefined"
    @input="onInput"
    @keydown.enter="onEnter"
    @keydown.tab="onTab"
    @keydown="ctx.onInputKeyDown"
    @blur="onBlur"
    @compositionstart="onCompositionStart"
    @compositionend="onCompositionEnd"
    @paste="onPaste"
  >
    <slot />
  </Primitive>
</template>
