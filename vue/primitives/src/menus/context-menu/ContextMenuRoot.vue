<script lang="ts">
import type { Direction } from '../../utilities/config-provider';

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
  /**
   * The duration in milliseconds from when a touch/pen press starts until the
   * menu opens (long-press). Right-click opens immediately regardless.
   * @default 700
   */
  pressOpenDelay?: number;
}
</script>

<script setup lang="ts">
import { shallowRef, toRef } from 'vue';

import { useConfig } from '../../utilities/config-provider';
import { MenuRoot } from '../menu';
import { provideContextMenuRootContext } from './context';

const { dir: dirProp, modal = true, pressOpenDelay = 700 } = defineProps<ContextMenuRootProps>();
defineSlots<{ default?: (props: { open: boolean }) => unknown }>();

const open = defineModel<boolean>('open', { default: false });

const config = useConfig();
const triggerElement = shallowRef<HTMLElement>();
const dir = toRef(() => dirProp ?? config.dir.value);

provideContextMenuRootContext({
  open,
  onOpenChange: (v) => { open.value = v; },
  modal: toRef(() => modal),
  dir,
  triggerElement,
  pressOpenDelay: toRef(() => pressOpenDelay),
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
