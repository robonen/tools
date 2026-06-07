<script lang="ts">
const DIGIT_RE = /\d/;
const NON_DIGIT_G = /\D/g;
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, useTemplateRef, watch } from 'vue';
import { usePinInputContext } from './context';

interface Props {
  index: number;
}

const props = defineProps<Props>();
const ctx = usePinInputContext();
const el = useTemplateRef<HTMLInputElement>('el');

watch(el, (curr, prev) => {
  if (prev)
    ctx.unregister(prev);
  if (curr)
    ctx.register(curr);
});

onBeforeUnmount(() => {
  if (el.value)
    ctx.unregister(el.value);
});

const displayed = computed(() => {
  const ch = ctx.value.value[props.index] ?? '';
  if (!ch)
    return '';
  return ctx.mask.value ? '•' : ch;
});

// `inputType` / `inputMode` were thin ternary wrappers — inline in template.

function onInput(e: Event): void {
  const target = e.target as HTMLInputElement;
  const raw = target.value;
  // keep only the last typed character
  let ch = raw.length > 0 ? raw[raw.length - 1]! : '';
  if (ctx.type.value === 'number' && ch && !DIGIT_RE.test(ch))
    ch = '';
  ctx.setAt(props.index, ch);
  // re-sync DOM input since we overwrite with displayed
  target.value = ch ? (ctx.mask.value ? '•' : ch) : '';
  if (ch && props.index < ctx.length.value - 1)
    ctx.focusIndex(props.index + 1);
}

function onKeyDown(e: KeyboardEvent): void {
  const i = props.index;
  const n = ctx.length.value;
  switch (e.key) {
    case 'Backspace': {
      const current = ctx.value.value[i] ?? '';
      if (current) {
        ctx.clearAt(i);
      }
      else if (i > 0) {
        ctx.focusIndex(i - 1);
        ctx.clearAt(i - 1);
      }
      e.preventDefault();
      break;
    }
    case 'Delete': {
      ctx.clearAt(i);
      e.preventDefault();
      break;
    }
    case 'ArrowLeft': {
      if (i > 0)
        ctx.focusIndex(i - 1);
      e.preventDefault();
      break;
    }
    case 'ArrowRight': {
      if (i < n - 1)
        ctx.focusIndex(i + 1);
      e.preventDefault();
      break;
    }
    case 'Home': {
      ctx.focusIndex(0);
      e.preventDefault();
      break;
    }
    case 'End': {
      ctx.focusIndex(n - 1);
      e.preventDefault();
      break;
    }
  }
}

function onPaste(e: ClipboardEvent): void {
  const data = e.clipboardData?.getData('text') ?? '';
  if (!data)
    return;
  e.preventDefault();
  const chars = ctx.type.value === 'number'
    ? data.replace(NON_DIGIT_G, '').split('')
    : data.split('');
  let idx = props.index;
  for (const ch of chars) {
    if (idx >= ctx.length.value)
      break;
    ctx.setAt(idx, ch);
    idx++;
  }
  ctx.focusIndex(Math.min(idx, ctx.length.value - 1));
}
</script>

<template>
  <input
    ref="el"
    :type="ctx.mask.value ? 'password' : 'text'"
    :inputmode="ctx.type.value === 'number' ? 'numeric' : 'text'"
    :value="displayed"
    :placeholder="ctx.placeholder.value"
    :disabled="ctx.disabled.value"
    :autocomplete="ctx.otp.value ? 'one-time-code' : 'off'"
    :data-index="props.index"
    maxlength="1"
    @input="onInput"
    @keydown="onKeyDown"
    @paste="onPaste"
  >
</template>
