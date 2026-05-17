<script lang="ts">
import type { Direction } from '../config-provider';
import type { PrimitiveProps } from '../primitive';

export interface MenubarRootProps extends PrimitiveProps {
  modelValue?: string;
  defaultValue?: string;
  dir?: Direction;
  loop?: boolean;
}
export interface MenubarRootEmits {
  'update:modelValue': [value: string | undefined];
}
</script>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue';

import { useConfig } from '../config-provider';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { provideMenubarRootContext } from './context';

const {
  modelValue,
  defaultValue,
  dir: dirProp,
  loop = true,
  as = 'div',
  asChild,
} = defineProps<MenubarRootProps>();
const emit = defineEmits<MenubarRootEmits>();

const config = useConfig();
const dirRef = toRef(() => dirProp ?? config.dir.value);
const { forwardRef } = useForwardExpose();

const local = ref<string | undefined>(defaultValue);
const value = computed({
  get: () => modelValue !== undefined ? modelValue : local.value,
  set: (v) => {
    local.value = v;
    emit('update:modelValue', v);
  },
});

provideMenubarRootContext({
  value,
  dir: dirRef,
  loop: toRef(() => loop),
  onMenuOpen: (v) => { value.value = v; },
  onMenuClose: () => { value.value = undefined; },
  onMenuToggle: (v) => { value.value = value.value === v ? undefined : v; },
});
</script>

<template>
  <Primitive :ref="forwardRef" :as="as" :as-child="asChild" role="menubar">
    <slot />
  </Primitive>
</template>
