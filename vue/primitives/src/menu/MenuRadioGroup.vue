<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface MenuRadioGroupProps extends PrimitiveProps {
  modelValue?: string;
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
