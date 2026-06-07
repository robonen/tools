<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface SwitchProps<T = boolean> extends PrimitiveProps {

  /** Value representing the "on" state. Defaults to `true`. */
  truthy?: T;
  /** Value representing the "off" state. Defaults to `false`. */
  falsy?: T;
  /** Initial uncontrolled value. Defaults to `falsy`. */
  defaultValue?: T;
  disabled?: boolean;
  required?: boolean;
  /** Name for the hidden form input. If provided, a hidden input mirrors state. */
  name?: string;
}
</script>

<script setup lang="ts" generic="T = boolean">
import type { Ref } from 'vue';
import { Primitive } from '../primitive';
import { computed, ref, toRaw } from 'vue';
import { useForwardExpose } from '@robonen/vue';

const {
  truthy = true as unknown as T,
  falsy = false as unknown as T,
  defaultValue,
  disabled = false,
  required = false,
  name,
  as = 'button',
} = defineProps<SwitchProps<T>>();

const { forwardRef } = useForwardExpose();

const local = ref<T>((defaultValue ?? falsy) as T) as Ref<T>;

const value = defineModel<T>({
  get: v => (v ?? local.value) as T,
  set: (v) => {
    local.value = v as T;
    return v;
  },
});

const checked = computed<boolean>(() => Object.is(toRaw(value.value), toRaw(truthy)));

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
    :as="as"
    :type="as === 'button' ? 'button' : undefined"
    role="switch"
    :tabindex="as === 'button' ? undefined : (disabled ? -1 : 0)"
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
    <input
      v-if="name"
      type="checkbox"
      tabindex="-1"
      aria-hidden="true"
      :name="name"
      :value="serialize(checked ? truthy : falsy)"
      :checked="checked"
      :disabled="disabled"
      :required="required"
      :style="{
        position: 'absolute',
        pointerEvents: 'none',
        opacity: 0,
        margin: 0,
      }"
    >
  </Primitive>
</template>
