<script lang="ts">
import type { MenuSubEmits, MenuSubProps } from '../menu';

/**
 * Wraps a nested submenu, pairing a DropdownMenuSubTrigger with its
 * DropdownMenuSubContent. Owns the submenu's open state; bind `v-model:open`
 * to control or observe it, or leave it unbound and set `defaultOpen` to run
 * uncontrolled. The default slot also exposes the current `open` value.
 */
export interface DropdownMenuSubProps extends MenuSubProps {
  /** The submenu's open state when first rendered, for uncontrolled usage. */
  defaultOpen?: boolean;
}
export type DropdownMenuSubEmits = MenuSubEmits;
</script>

<script setup lang="ts">
import { ref } from 'vue';

import { MenuSub } from '../menu';

const { defaultOpen = false } = defineProps<DropdownMenuSubProps>();
defineSlots<{ default?: (props: { open: boolean }) => unknown }>();

const localOpen = ref<boolean>(defaultOpen);

const open = defineModel<boolean>('open', {
  default: undefined,
  get: v => v ?? localOpen.value,
  set: (v) => {
    localOpen.value = v;
    return v;
  },
});
</script>

<template>
  <MenuSub v-model:open="open">
    <slot :open="open" />
  </MenuSub>
</template>
