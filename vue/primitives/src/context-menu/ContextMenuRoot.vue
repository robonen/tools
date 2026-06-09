<script lang="ts">
import type { Direction } from '../config-provider';

/**
 * A menu that opens at the pointer on right-click (or a long-press on touch),
 * replacing the platform's native context menu with your own styled actions.
 * Built on top of Menu, so it inherits keyboard navigation, typeahead, nested
 * submenus, and checkbox/radio items.
 *
 * Use it for contextual actions tied to a region or element — cut/copy/paste,
 * row actions in a table, canvas tools — when there is no persistent button to
 * click. The root owns open state and provides context to every part; listen
 * to `update:open` to react when the menu opens or closes.
 */
export interface ContextMenuRootProps {
  dir?: Direction;
  modal?: boolean;
}
</script>

<script setup lang="ts">
import { toRef } from 'vue';

import { MenuRoot } from '../menu';
import { provideContextMenuRootContext } from './context';

const { dir, modal = true } = defineProps<ContextMenuRootProps>();
defineSlots<{ default?: (props: { open: boolean }) => unknown }>();

const open = defineModel<boolean>('open', { default: false });

provideContextMenuRootContext({
  open,
  onOpenChange: (v) => { open.value = v; },
  modal: toRef(() => modal),
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
