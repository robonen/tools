<script lang="ts">
import type { ComboboxContentImplEmits, ComboboxContentImplProps } from './ComboboxContentImpl.vue';

export type ComboboxContentProps = ComboboxContentImplProps;
export type ComboboxContentEmits = ComboboxContentImplEmits;
</script>

<script setup lang="ts">
import { Presence } from '../presence';
import ComboboxContentImpl from './ComboboxContentImpl.vue';
import { useComboboxRootContext } from './context';

const props = defineProps<ComboboxContentProps>();
const emit = defineEmits<ComboboxContentEmits>();
const rootCtx = useComboboxRootContext();
</script>

<template>
  <Presence :present="rootCtx.open.value">
    <ComboboxContentImpl
      v-bind="props"
      @close-auto-focus="emit('closeAutoFocus', $event)"
      @escape-key-down="emit('escapeKeyDown', $event)"
      @pointer-down-outside="emit('pointerDownOutside', $event)"
      @focus-outside="emit('focusOutside', $event)"
    >
      <slot />
    </ComboboxContentImpl>
  </Presence>
</template>
