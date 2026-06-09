<script lang="ts">
import type { MenuRadioGroupEmits, MenuRadioGroupProps } from '../menu';

/**
 * Groups MenubarRadioItems into a single-choice set. Bind `v-model` to track the
 * selected item's value across the group.
 */
export interface MenubarRadioGroupProps extends MenuRadioGroupProps {}
export type MenubarRadioGroupEmits = MenuRadioGroupEmits;
</script>

<script setup lang="ts">
import { MenuRadioGroup } from '../menu';

const props = defineProps<MenubarRadioGroupProps>();
const emit = defineEmits<MenubarRadioGroupEmits>();
</script>

<template>
  <MenuRadioGroup v-bind="props" @update:model-value="emit('update:modelValue', $event)"><slot /></MenuRadioGroup>
</template>
