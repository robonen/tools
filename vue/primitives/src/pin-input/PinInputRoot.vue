<script setup lang="ts">
import type { PrimitiveProps } from '../primitive';
import { Primitive } from '../primitive';
import { computed, ref, toRef, watch } from 'vue';
import { providePinInputContext } from './context';
import { useForwardExpose } from '@robonen/vue';

interface Props extends PrimitiveProps {
  modelValue?: string[];
  defaultValue?: string[];
  length?: number;
  mask?: boolean;
  otp?: boolean;
  type?: 'text' | 'number';
  disabled?: boolean;
  placeholder?: string;

}

const {
  modelValue,
  defaultValue,
  length = 4,
  mask = false,
  otp = false,
  type = 'text',
  disabled = false,
  placeholder = '',
  as = 'div',
} = defineProps<Props>();

const { forwardRef } = useForwardExpose();

const emit = defineEmits<{
  (e: 'update:modelValue', v: string[]): void;
  (e: 'complete', v: string): void;
}>();

const lengthRef = computed(() => Math.max(1, length | 0));

function normalize(v: readonly string[] | undefined): string[] {
  const out = Array.from<string>({ length: lengthRef.value }, () => '');
  if (!v)
    return out;
  for (let i = 0; i < Math.min(v.length, lengthRef.value); i++)
    out[i] = (v[i] ?? '').slice(0, 1);
  return out;
}

const value = ref<string[]>(normalize(modelValue ?? defaultValue));

watch(() => modelValue, (v) => {
  if (v === undefined)
    return;
  const nv = normalize(v);
  if (nv.join('\u0000') !== value.value.join('\u0000'))
    value.value = nv;
});

watch(lengthRef, (n) => {
  if (value.value.length === n)
    return;
  const next = Array.from<string>({ length: n }, () => '');
  for (let i = 0; i < Math.min(value.value.length, n); i++)
    next[i] = value.value[i]!;
  value.value = next;
});

const inputs = ref<HTMLInputElement[]>([]);

function register(el: HTMLInputElement): void {
  if (!inputs.value.includes(el))
    inputs.value.push(el);
}
function unregister(el: HTMLInputElement): void {
  const i = inputs.value.indexOf(el);
  if (i !== -1)
    inputs.value.splice(i, 1);
}

function emitValue(v: string[]): void {
  emit('update:modelValue', v);
  if (v.every(ch => ch.length === 1))
    emit('complete', v.join(''));
}

function setAt(index: number, char: string): void {
  if (disabled)
    return;
  const ch = char.slice(0, 1);
  if (ch && type === 'number' && !/\d/.test(ch))
    return;
  const next = value.value.slice();
  next[index] = ch;
  value.value = next;
  emitValue(next);
}

function clearAt(index: number): void {
  if (disabled)
    return;
  const next = value.value.slice();
  next[index] = '';
  value.value = next;
  emitValue(next);
}

function focusIndex(index: number): void {
  const el = inputs.value[index];
  if (el) {
    el.focus();
    try {
      el.select();
    }
    catch {
      /* noop */
    }
  }
}

providePinInputContext({
  value,
  length: lengthRef,
  mask: toRef(() => mask),
  otp: toRef(() => otp),
  type: toRef(() => type),
  disabled: toRef(() => disabled),
  placeholder: toRef(() => placeholder),
  inputs,
  register,
  unregister,
  setAt,
  clearAt,
  focusIndex,
});

defineSlots<{
  default: (props: { value: string[]; isComplete: boolean }) => unknown;
}>();

const isComplete = computed(() => value.value.every(ch => ch.length === 1));
</script>

<template>
  <Primitive :ref="forwardRef" :as="as" role="group" :data-disabled="disabled ? '' : undefined">
    <slot :value="value" :is-complete="isComplete" />
  </Primitive>
</template>
