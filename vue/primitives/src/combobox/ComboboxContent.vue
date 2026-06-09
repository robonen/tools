<script lang="ts">
import type { ComboboxContentImplEmits, ComboboxContentImplProps } from './ComboboxContentImpl.vue';

/**
 * The popup listbox that holds the options. Mounts only while open (via Presence) and
 * positions itself relative to the anchor. Place the Viewport, Items, and Empty inside it.
 */
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
