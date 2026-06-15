<script lang="ts">
import type { VisuallyHiddenProps } from './VisuallyHidden.vue';

/**
 * A single native, visually-hidden `<input>` that mirrors a custom control's
 * value into native form submission. It keeps the input out of the visual
 * layout (and the accessibility tree) while staying part of the owning
 * `<form>`, so the value is submitted and native constraint validation
 * (`required`) still fires.
 *
 * When `value`/`checked` change programmatically, it writes through the native
 * `HTMLInputElement` property setter and dispatches bubbling `input` and
 * `change` events, so third-party form libraries and listeners observe the
 * change exactly as they would for direct user input.
 */
// Module-scope cache for the native `value`/`checked` property setters.
// Resolving `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, ...)`
// is constant for the whole page lifetime, so we resolve once (lazily, behind
// the caller's `window` guard for SSR-safety) and reuse a stable monomorphic
// setter reference for every programmatic value/checked change.
type InputSetter = (this: HTMLInputElement, v: unknown) => void;
let valueSetter: InputSetter | undefined;
let checkedSetter: InputSetter | undefined;
let nativeSettersResolved = false;

function resolveNativeSetters(): void {
  if (nativeSettersResolved) return;
  nativeSettersResolved = true;
  const proto = globalThis.HTMLInputElement.prototype;
  valueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set as InputSetter | undefined;
  checkedSetter = Object.getOwnPropertyDescriptor(proto, 'checked')?.set as InputSetter | undefined;
}

export interface VisuallyHiddenInputBubbleProps<T = unknown> {
  /** Name submitted with the owning form. */
  name: string;
  /** Value submitted with the owning form. */
  value: T;
  /**
   * Checked state for checkbox/radio-style submission. When provided it is the
   * source of truth driven through the native `checked` setter; otherwise
   * `value` is driven through the native `value` setter.
   */
  checked?: boolean;
  /** Mirror the `required` constraint so native validation fires. */
  required?: boolean;
  /** Mirror the `disabled` state so the field is excluded from submission. */
  disabled?: boolean;
  /**
   * Visual-hiding strategy passed through to `VisuallyHidden`.
   * @default 'hidden'
   */
  feature?: VisuallyHiddenProps['feature'];
}
</script>

<script setup lang="ts" generic="T = unknown">
import { computed, watch } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import VisuallyHidden from './VisuallyHidden.vue';

const props = withDefaults(defineProps<VisuallyHiddenInputBubbleProps<T>>(), {
  feature: 'hidden',
  checked: undefined,
});

defineOptions({ inheritAttrs: false });

const { forwardRef, currentElement } = useForwardExpose();

// `checked` (when provided) drives a checkbox-style input via the native
// `checked` setter; otherwise `value` drives a text-style input via `value`.
const isCheckbox = computed(() => props.checked !== undefined);

// Single reactive source describing what the native input should reflect.
const driven = computed(() => (isCheckbox.value ? props.checked : props.value));

watch(
  driven,
  (next, prev) => syncNativeInput(next, prev),
  { flush: 'post' },
);

function syncNativeInput(next: unknown, prev: unknown): void {
  if (next === prev) return;

  const input = currentElement.value as HTMLInputElement | undefined;
  if (!input || globalThis.window === undefined) return;

  // Write through the native property setter so frameworks that monkey-patch
  // the input's value/checked tracker (e.g. synthetic event systems) observe
  // the programmatic change, then emit the events a real edit would produce.
  resolveNativeSetters();
  const setter = isCheckbox.value ? checkedSetter : valueSetter;
  setter?.call(input, next);

  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}
</script>

<template>
  <VisuallyHidden
    :ref="forwardRef"
    as="input"
    :type="isCheckbox ? 'checkbox' : 'text'"
    :name="name"
    :value="value"
    :checked="checked"
    :required="required"
    :disabled="disabled"
    :feature="feature"
    v-bind="$attrs"
  />
</template>
