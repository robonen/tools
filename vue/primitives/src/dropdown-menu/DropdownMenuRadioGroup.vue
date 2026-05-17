<script lang="ts">
import type { MenuRadioGroupEmits, MenuRadioGroupProps } from '../menu';

export interface DropdownMenuRadioGroupProps extends MenuRadioGroupProps {}
export type DropdownMenuRadioGroupEmits = MenuRadioGroupEmits;
</script>

<script setup lang="ts">
import { MenuRadioGroup } from '../menu';

const props = defineProps<DropdownMenuRadioGroupProps>();
const emit = defineEmits<DropdownMenuRadioGroupEmits>();
</script>

<template>
  <MenuRadioGroup v-bind="props" @update:model-value="emit('update:modelValue', $event)"><slot /></MenuRadioGroup>
</template>
