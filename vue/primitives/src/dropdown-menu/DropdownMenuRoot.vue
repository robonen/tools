<script lang="ts">
import type { Direction } from '../config-provider';

/**
 * A button-triggered menu of actions, opened on click and built on top of Menu,
 * so it inherits keyboard navigation, typeahead, nested submenus, and
 * checkbox/radio items. Unlike a context menu, it is anchored to a persistent
 * trigger button rather than the pointer.
 *
 * Use it for action menus on a toolbar, an avatar, or a "more" button — settings,
 * row actions, account menus, and the like. The root owns open state and provides
 * context to every part; bind `v-model:open` (or listen to `update:open`) to
 * control or observe whether the menu is open.
 */
export interface DropdownMenuRootProps {
  defaultOpen?: boolean;
  dir?: Direction;
  modal?: boolean;
}
</script>

<script setup lang="ts">
import { ref, shallowRef } from 'vue';

import { useId } from '../config-provider';
import { MenuRoot } from '../menu';
import { provideDropdownMenuRootContext } from './context';

const {
  defaultOpen = false,
  dir,
  modal = true,
} = defineProps<DropdownMenuRootProps>();

const localOpen = ref<boolean>(defaultOpen);

const open = defineModel<boolean>('open', {
  default: undefined,
  get: v => v ?? localOpen.value,
  set: (v) => {
    localOpen.value = v;
    return v;
  },
});
defineSlots<{ default?: (props: { open: boolean }) => unknown }>();

const triggerRef = shallowRef<HTMLElement | null>(null);
const triggerId = useId(undefined, 'dropdown-trigger');
const contentId = useId(undefined, 'dropdown-content');

provideDropdownMenuRootContext({
  triggerId,
  contentId,
  triggerRef,
  onTriggerChange: (el) => {
    triggerRef.value = el;
  },
});
</script>

<template>
  <MenuRoot
    v-model:open="open"
    :dir="dir"
    :modal="modal"
  >
    <slot :open="open" />
  </MenuRoot>
</template>
