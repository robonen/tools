<script lang="ts">
import type { Direction } from '../config-provider';

/**
 * The unstyled, low-level menu engine that powers DropdownMenu, ContextMenu, and
 * Menubar. It is built on Popper and wires up roving-focus keyboard navigation,
 * typeahead, nested submenus, checkbox/radio items, and modal vs. non-modal
 * dismissal — but it is deliberately trigger-agnostic, so consumers supply their
 * own anchor and open logic.
 *
 * Use this directly only when composing a new menu-like primitive; for ordinary
 * app menus reach for DropdownMenu or ContextMenu instead. MenuRoot owns open
 * state and provides context to every part; bind `v-model:open` (or listen to
 * `update:open`) to control or observe whether the menu is open.
 */
export interface MenuRootProps {
  dir?: Direction;
  modal?: boolean;
}
</script>

<script setup lang="ts">
import { shallowRef, toRef } from 'vue';

import { useConfig } from '../config-provider';
import { PopperRoot } from '../popper';
import { provideMenuContext, provideMenuRootContext } from './context';
import { useIsUsingKeyboard } from './useIsUsingKeyboard';

const {
  dir: dirProp,
  modal = true,
} = defineProps<MenuRootProps>();

const open = defineModel<boolean>('open', { default: false });

defineSlots<{ default?: () => unknown }>();

const config = useConfig();
const dirRef = toRef(() => dirProp ?? config.dir.value);
const isUsingKeyboardRef = useIsUsingKeyboard();
const content = shallowRef<HTMLElement | null>(null);

provideMenuContext({
  open,
  onOpenChange: (v) => { open.value = v; },
  content,
  onContentChange: (el) => { content.value = el; },
});

provideMenuRootContext({
  onClose: () => { open.value = false; },
  dir: dirRef,
  isUsingKeyboardRef,
  modal: toRef(() => modal),
});
</script>

<template>
  <PopperRoot>
    <slot />
  </PopperRoot>
</template>
