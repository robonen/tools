<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { Direction } from '../../utilities/config-provider';

/**
 * A segmented input for short codes — OTP / one-time passwords, 2FA tokens, or
 * PINs split across one box per character. The interactive root: it owns the
 * value as a per-cell `string[]` (controlled via `v-model` / `update:modelValue`
 * or uncontrolled via `defaultValue`), sizes the field to `length`, enforces the
 * `type` ('text' | 'number') and `mask`, and provides context to each
 * `PinInputInput`. Emits `complete` once every cell is filled. Use it for
 * verification codes where each character gets its own cell with auto-advance,
 * arrow-key navigation, and clipboard paste spreading across cells.
 *
 * Native form support: pass `name` (and optionally `required` / `id`) to render
 * a visually-hidden form control holding the joined value, so the field submits
 * with its owning `<form>` and participates in native `required` validation.
 */
export interface PinInputRootProps extends PrimitiveProps {
  defaultValue?: string[];
  length?: number;
  mask?: boolean;
  otp?: boolean;
  type?: 'text' | 'number';
  disabled?: boolean;
  placeholder?: string;
  /**
   * Reading direction. Affects arrow-key navigation (in `rtl`, `ArrowRight`
   * moves to the previous cell). Falls back to the active `ConfigProvider`
   * `dir`, then `ltr`.
   */
  dir?: Direction;
  /** Name submitted with the owning form (enables the hidden form control). */
  name?: string;
  /** Mirror the `required` constraint so native form validation fires. */
  required?: boolean;
  /** Id forwarded to the hidden form control for label association. */
  id?: string;
}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
import { computed, ref, shallowRef, toRef, triggerRef, watch } from 'vue';
import { providePinInputContext } from './context';
import { useForwardExpose } from '@robonen/vue';
import { useDirection } from '../../utilities/config-provider';
import { resolveNextIndex } from '../../internal/utils/roving-focus';
import { VisuallyHiddenInput } from '../../utilities/visually-hidden';

defineOptions({ inheritAttrs: false });

const {
  defaultValue,
  length = 4,
  mask = false,
  otp = false,
  type = 'text',
  disabled = false,
  placeholder = '',
  dir,
  name,
  required = false,
  id,
  as = 'div',
} = defineProps<PinInputRootProps>();

const { forwardRef } = useForwardExpose();

const direction = useDirection(() => dir);

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

// `shallowRef` so the registered `<input>` elements are stored raw (a deep
// `ref` would proxy each element — breaking `includes(el)` identity checks and
// `.focus()`). The array is mutated in place, so `triggerRef` after each change.
const inputs = shallowRef<HTMLInputElement[]>([]);

function register(el: HTMLInputElement): void {
  if (!inputs.value.includes(el)) {
    inputs.value.push(el);
    triggerRef(inputs);
  }
}
function unregister(el: HTMLInputElement): void {
  const i = inputs.value.indexOf(el);
  if (i !== -1) {
    inputs.value.splice(i, 1);
    triggerRef(inputs);
  }
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

function isCellDisabled(el: HTMLInputElement | undefined): boolean {
  return !el || el.hasAttribute('data-disabled');
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

// Move focus by `delta` (±1) or to an absolute edge, skipping disabled cells.
// `delta` is already resolved by the caller for reading direction; navigation
// never loops (a pin field has hard edges).
function focusRelative(index: number, delta: number, absolute?: 'home' | 'end'): void {
  const count = inputs.value.length;
  if (count === 0)
    return;

  if (absolute) {
    let i = absolute === 'home' ? 0 : count - 1;
    const step = absolute === 'home' ? 1 : -1;
    while (i >= 0 && i < count && isCellDisabled(inputs.value[i]))
      i += step;
    if (i >= 0 && i < count)
      focusIndex(i);
    return;
  }

  let i = resolveNextIndex(index, delta, count, false);
  while (i !== index && isCellDisabled(inputs.value[i])) {
    const next = resolveNextIndex(i, delta, count, false);
    if (next === i)
      return;
    i = next;
  }
  if (i !== index && !isCellDisabled(inputs.value[i]))
    focusIndex(i);
}

function firstEmptyIndex(): number {
  return value.value.findIndex(ch => ch.length === 0);
}

const isComplete = computed(() => value.value.every(ch => ch.length === 1));

providePinInputContext({
  value,
  length: lengthRef,
  mask: toRef(() => mask),
  otp: toRef(() => otp),
  type: toRef(() => type),
  disabled: toRef(() => disabled),
  placeholder: toRef(() => placeholder),
  dir: direction,
  isComplete,
  inputs,
  register,
  unregister,
  setAt,
  clearAt,
  focusIndex,
  focusRelative,
  firstEmptyIndex,
});

defineSlots<{
  default: (props: { value: string[]; isComplete: boolean }) => unknown;
}>();

const serialized = computed(() => value.value.join(''));

function onHiddenFocus(): void {
  inputs.value[0]?.focus();
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="group"
    v-bind="$attrs"
    :dir="direction"
    :data-complete="isComplete ? '' : undefined"
    :data-disabled="disabled ? '' : undefined"
  >
    <slot :value="value" :is-complete="isComplete" />

    <VisuallyHiddenInput
      v-if="name !== undefined"
      :id="id"
      feature="focusable"
      :tabindex="-1"
      :name="name"
      :value="serialized"
      :required="required"
      :disabled="disabled"
      @focus="onHiddenFocus"
    />
  </Primitive>
</template>
