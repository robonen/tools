<script lang="ts">
import type { SelectContentImplEmits, SelectContentImplProps } from './SelectContentImpl.vue';

export type SelectContentProps = SelectContentImplProps;
export type SelectContentEmits = SelectContentImplEmits;
</script>

<script setup lang="ts">
import { Presence } from '../presence';
import { useSelectRootContext } from './context';
import SelectContentImpl from './SelectContentImpl.vue';

const props = defineProps<SelectContentProps>();
const emit = defineEmits<SelectContentEmits>();
const rootCtx = useSelectRootContext();
</script>

<template>
  <Presence :present="rootCtx.open.value">
    <SelectContentImpl
      v-bind="props"
      @close-auto-focus="emit('closeAutoFocus', $event)"
      @escape-key-down="emit('escapeKeyDown', $event)"
      @pointer-down-outside="emit('pointerDownOutside', $event)"
    />
  </Presence>
</template>
