<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A segmented input for short codes — OTP / one-time passwords, 2FA tokens, or
 * PINs split across one box per character. The interactive root: it owns the
 * value as a per-cell `string[]` (controlled via `v-model` / `update:modelValue`
 * or uncontrolled via `defaultValue`), sizes the field to `length`, enforces the
 * `type` ('text' | 'number') and `mask`, and provides context to each
 * `PinInputInput`. Emits `complete` once every cell is filled. Use it for
 * verification codes where each character gets its own cell with auto-advance,
 * arrow-key navigation, and clipboard paste spreading across cells.
 */
export interface PinInputRootProps extends PrimitiveProps {
  defaultValue?: string[];
  length?: number;
  mask?: boolean;
  otp?: boolean;
  type?: 'text' | 'number';
  disabled?: boolean;
  placeholder?: string;

}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { computed, ref, toRef, watch } from 'vue';
import { providePinInputContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const {
  defaultValue,
  length = 4,
  mask = false,
  otp = false,
  type = 'text',
  disabled = false,
  placeholder = '',
  as = 'div',
} = defineProps<PinInputRootProps>();

const { forwardRef } = useForwardExpose();

const emit = defineEmits<{
  complete: [value: string];
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

// `defineModel` owns the `modelValue` prop in both modes: controlled (parent
// `v-model`) and uncontrolled (its own internal store). Writing `model.value`
// emits `update:modelValue`, so no manual emit is needed. `value` is the
// normalized, per-cell `string[]` source of truth read by the inputs — kept as
// a local ref so synchronous bursts (e.g. paste) always read the latest write
// rather than a not-yet-propagated controlled prop.
const model = defineModel<string[]>();

const value = ref<string[]>(normalize(model.value ?? defaultValue));

watch(model, (v) => {
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

function commit(v: string[]): void {
  // `value` is the synchronous source of truth; `model.value` mirrors it and,
  // via `defineModel`, emits `update:modelValue`. No manual emit needed.
  value.value = v;
  model.value = v;
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
  commit(next);
}

function clearAt(index: number): void {
  if (disabled)
    return;
  const next = value.value.slice();
  next[index] = '';
  commit(next);
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
