<script lang="ts">
import type { MenuSubEmits, MenuSubProps } from '../menu';

/**
 * Wraps a nested submenu, pairing a MenubarSubTrigger with its
 * MenubarSubContent. Owns the submenu's open state: bind `v-model:open` to
 * control it, set `defaultOpen` to start open in uncontrolled mode, or leave
 * both unset to let it manage its own open state. The default slot exposes the
 * current `open` value.
 */
export interface MenubarSubProps extends MenuSubProps {
  /** Open state when initially rendered. Use when you do not control `open`. */
  defaultOpen?: boolean;
}
export type MenubarSubEmits = MenuSubEmits;
</script>

<script setup lang="ts">
import { ref } from 'vue';

import { MenuSub } from '../menu';

const { defaultOpen = false } = defineProps<MenubarSubProps>();
defineSlots<{ default?: (props: { open: boolean }) => unknown }>();

const localOpen = ref<boolean>(defaultOpen);

const open = defineModel<boolean>('open', {
  default: undefined,
  // Controlled when `v-model:open` is bound; otherwise the local ref (seeded
  // from `defaultOpen`) drives it — uncontrolled mode with an initial state.
  get: external => external ?? localOpen.value,
  set: (value) => {
    localOpen.value = value;
    return value;
  },
});
</script>

<template>
  <MenuSub :open="open" @update:open="open = $event">
    <slot :open="open" />
  </MenuSub>
</template>
