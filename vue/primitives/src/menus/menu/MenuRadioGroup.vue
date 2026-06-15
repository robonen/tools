<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { AcceptableValue } from './utils';

/**
 * Wraps a set of MenuRadioItems so that only one can be selected at a time,
 * managing the shared selected value. Bind `v-model` to control the selection,
 * or supply `defaultValue` to leave it uncontrolled. Values may be any
 * serialisable type (string / number / boolean / object), not just strings.
 * Renders through MenuGroup so a nested MenuLabel labels the group.
 */
export interface MenuRadioGroupProps extends PrimitiveProps {
  /** The controlled selected value. Use together with `update:modelValue`. */
  modelValue?: AcceptableValue;
  /** The selected value when uncontrolled. */
  defaultValue?: AcceptableValue;
}
export interface MenuRadioGroupEmits {
  'update:modelValue': [value: AcceptableValue];
}
</script>

<script setup lang="ts">
import { computed, shallowRef } from 'vue';

import MenuGroup from './MenuGroup.vue';
import { provideMenuRadioGroupContext } from './context';

const { modelValue, defaultValue, as = 'div' } = defineProps<MenuRadioGroupProps>();
const emit = defineEmits<MenuRadioGroupEmits>();
defineSlots<{ default?: (props: { modelValue: AcceptableValue | undefined }) => unknown }>();

const local = shallowRef(defaultValue);
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
  <MenuGroup :as="as">
    <slot :model-value="value" />
  </MenuGroup>
</template>
