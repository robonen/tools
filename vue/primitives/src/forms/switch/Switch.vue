<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A control that toggles between an on and off state, mirroring a physical
 * switch. Renders with `role="switch"`, exposes `data-state` and `data-disabled`
 * for styling, and optionally mirrors its value into a hidden form input via
 * `name`. The value is generic: it defaults to a boolean but can be any pair of
 * `truthy`/`falsy` values (strings, numbers, objects compared by identity), and
 * works uncontrolled (`defaultValue`) or controlled with `v-model`. Use it for
 * instant settings toggles where the change applies immediately, as opposed to
 * a checkbox that is typically submitted with a form.
 *
 * Pair it with `SwitchThumb` for the moving part: the thumb reads the switch
 * context and mirrors `data-state`/`data-disabled`, enabling
 * `data-[state=checked]` thumb animations.
 */
export interface SwitchProps<T = boolean> extends PrimitiveProps {

  /** Value representing the "on" state. Defaults to `true`. */
  truthy?: T;
  /** Value representing the "off" state. Defaults to `false`. */
  falsy?: T;
  /** Initial uncontrolled value. Defaults to `falsy`. */
  defaultValue?: T;
  /** Prevents toggling and reflects a disabled state to assistive technology. */
  disabled?: boolean;
  /** Marks the control as required for form submission (sets `aria-required`). */
  required?: boolean;
  /** Name for the hidden form input. If provided, a hidden input mirrors state. */
  name?: string;
  /**
   * Id of the root element. Anchors an associated `<label for>` and lets the
   * switch derive an accessible name from that label when no explicit
   * `aria-label` is supplied.
   */
  id?: string;
  /**
   * Explicit string submitted with the form when the switch is on. When omitted
   * the current `truthy`/`falsy` value is serialized automatically, so number,
   * boolean and object pairs round-trip without extra wiring.
   */
  value?: string;
}

export interface SwitchEmits<T = boolean> {
  /** Emitted whenever the value changes (also drives `v-model`). */
  'update:modelValue': [value: T];
}
</script>

<script setup lang="ts" generic="T = boolean">
import type { Ref } from 'vue';
import { Primitive } from '../../internal/primitive';
import { computed, ref, toRaw } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { VisuallyHiddenInputBubble } from '../../utilities/visually-hidden';
import { provideSwitchContext } from './context';

defineOptions({ inheritAttrs: false });

const {
  truthy = true as unknown as T,
  falsy = false as unknown as T,
  defaultValue,
  disabled = false,
  required = false,
  name,
  id,
  value: valueProp,
  as = 'button',
} = defineProps<SwitchProps<T>>();

defineEmits<SwitchEmits<T>>();

const { forwardRef, currentElement } = useForwardExpose();

const local = ref<T>((defaultValue ?? falsy) as T) as Ref<T>;

const value = defineModel<T>({
  get: v => (v ?? local.value) as T,
  set: (v) => {
    local.value = v as T;
    return v;
  },
});

const checked = computed<boolean>(() => Object.is(toRaw(value.value), toRaw(truthy)));

const disabledState = computed<boolean>(() => disabled);

// Derive an accessible name from an associated `<label for=id>` when no explicit
// `aria-label` is supplied. Guarded for SSR (no `document`).
const ariaLabel = computed<string | undefined>(() => {
  if (!id || !currentElement.value || globalThis.document === undefined) return undefined;
  const label = globalThis.document.querySelector(`[for="${id}"]`) as HTMLElement | null;
  return label?.innerText || undefined;
});

// The form value: an explicit `value` prop wins, otherwise the active
// truthy/falsy value is serialized so number/boolean/object pairs round-trip.
const formValue = computed<string>(() => valueProp ?? serialize(checked.value ? truthy : falsy));

provideSwitchContext({
  checked,
  disabled: disabledState,
});

function toggle() {
  if (disabled) return;
  value.value = checked.value ? falsy : truthy;
}

function onClick() {
  toggle();
}

function onKeydown(event: KeyboardEvent) {
  // <button> handles Space/Enter natively; only synthesize for non-button hosts.
  if (as === 'button') return;
  if (event.key !== ' ' && event.key !== 'Enter') return;
  event.preventDefault();
  toggle();
}

function serialize(v: T): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  }
  catch {
    return String(v);
  }
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    v-bind="$attrs"
    :id="id"
    :as="as"
    :type="as === 'button' ? 'button' : undefined"
    role="switch"
    :tabindex="as === 'button' ? undefined : (disabled ? -1 : 0)"
    :aria-label="($attrs['aria-label'] as string) || ariaLabel"
    :aria-checked="checked"
    :aria-required="required ? true : undefined"
    :aria-disabled="as === 'button' ? undefined : (disabled ? true : undefined)"
    :data-state="checked ? 'checked' : 'unchecked'"
    :data-disabled="disabled ? '' : undefined"
    :disabled="as === 'button' ? disabled : undefined"
    @click="onClick"
    @keydown="onKeydown"
  >
    <slot :checked="checked" :value="value" />
    <VisuallyHiddenInputBubble
      v-if="name"
      :name="name"
      :value="formValue"
      :checked="checked"
      :disabled="disabled"
      :required="required"
    />
  </Primitive>
</template>
