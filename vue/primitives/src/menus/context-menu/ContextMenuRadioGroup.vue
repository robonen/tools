<script lang="ts">
import type { MenuRadioGroupEmits, MenuRadioGroupProps } from '../menu';

/**
 * A group of mutually exclusive `ContextMenuRadioItem`s sharing a single
 * selected value. Bind `v-model` to track the active choice.
 */
export interface ContextMenuRadioGroupProps extends MenuRadioGroupProps {}
export type ContextMenuRadioGroupEmits = MenuRadioGroupEmits;
</script>

<script setup lang="ts">
import { MenuRadioGroup } from '../menu';

const props = defineProps<ContextMenuRadioGroupProps>();
const emit = defineEmits<ContextMenuRadioGroupEmits>();
</script>

<template>
  <MenuRadioGroup v-bind="props" @update:model-value="emit('update:modelValue', $event)"><slot /></MenuRadioGroup>
</template>
