<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * Wraps a set of MenuRadioItems so that only one can be selected at a time,
 * managing the shared selected value. Bind `v-model` to control the selection,
 * or supply `defaultValue` to leave it uncontrolled.
 */
export interface MenuRadioGroupProps extends PrimitiveProps {
  /** The controlled selected value. Use together with `update:modelValue`. */
  modelValue?: string;
  /** The selected value when uncontrolled. */
  defaultValue?: string;
}
export interface MenuRadioGroupEmits {
  'update:modelValue': [value: string];
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue';

import { Primitive } from '../primitive';
import { provideMenuRadioGroupContext } from './context';

const { modelValue, defaultValue, as = 'div' } = defineProps<MenuRadioGroupProps>();
const emit = defineEmits<MenuRadioGroupEmits>();

const local = ref(defaultValue);
const value = computed(() => modelValue !== undefined ? modelValue : local.value);

provideMenuRadioGroupContext({
  modelValue: value,
  onValueChange: (v) => {
    local.value = v;
    emit('update:modelValue', v);
  },
});
</script>

<template>
  <Primitive :as="as" role="group">
    <slot />
  </Primitive>
</template>
