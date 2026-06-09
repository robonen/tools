<script lang="ts">
/**
 * A single menu within the menubar, pairing one MenubarTrigger with its
 * MenubarContent. Its `value` identifies the menu to the root so it can track
 * which one is open; if omitted, a stable id is generated automatically.
 */
export interface MenubarMenuProps {
  value?: string;
}
</script>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';

import { useId } from '../config-provider';
import { MenuRoot } from '../menu';
import { provideMenubarMenuContext, useMenubarRootContext } from './context';

const { value: valueProp } = defineProps<MenubarMenuProps>();
defineSlots<{ default?: (props: { open: boolean }) => unknown }>();

const rootCtx = useMenubarRootContext();

const autoValue = useId(undefined, 'menubar-menu');
const menuValue = valueProp ?? autoValue.value;

const triggerRef = shallowRef<HTMLElement | null>(null);
const triggerId = useId(undefined, 'menubar-trigger');
const contentId = useId(undefined, 'menubar-content');
const wasKeyboardTriggerOpenRef = ref(false);

const open = computed(() => rootCtx.value.value === menuValue);

provideMenubarMenuContext({
  value: menuValue,
  triggerId,
  contentId,
  triggerRef,
  onTriggerChange: (el) => { triggerRef.value = el; },
  wasKeyboardTriggerOpenRef,
});
</script>

<template>
  <MenuRoot
    :open="open"
    :dir="rootCtx.dir.value"
    :modal="false"
    @update:open="(v) => {
      if (!v) rootCtx.onMenuClose()
    }"
  >
    <slot :open="open" />
  </MenuRoot>
</template>
