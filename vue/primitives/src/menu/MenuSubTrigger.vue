<script lang="ts">
import type { MenuItemImplProps } from './MenuItemImpl.vue';

/**
 * A menu item that opens its parent MenuSub's submenu. It acts as both the
 * positioning anchor and the trigger, opening on hover (with a grace delay) or
 * via the directional arrow key and closing on the opposite arrow. Must be used
 * inside a MenuSub, alongside a MenuSubContent.
 */
export interface MenuSubTriggerProps extends MenuItemImplProps {}
</script>

<script setup lang="ts">
import { PopperAnchor } from '../popper';
import { useMenuContentContext, useMenuContext, useMenuRootContext, useMenuSubContext } from './context';
import MenuItemImpl from './MenuItemImpl.vue';
import { SUB_CLOSE_KEYS, SUB_OPEN_KEYS, getOpenState } from './utils';

const props = defineProps<MenuSubTriggerProps>();

const menuCtx = useMenuContext();
const subCtx = useMenuSubContext();
const rootCtx = useMenuRootContext();
const contentCtx = useMenuContentContext();

let openTimer: ReturnType<typeof setTimeout> | undefined;

function open() {
  clearTimeout(openTimer);
  menuCtx.onOpenChange(true);
}

function close() {
  clearTimeout(openTimer);
  menuCtx.onOpenChange(false);
}

function handlePointerMove(event: PointerEvent) {
  if (event.pointerType === 'touch') return;
  if (props.disabled) return;
  if (contentCtx.onItemEnter(event)) return;
  if (!menuCtx.open.value) {
    clearTimeout(openTimer);
    openTimer = setTimeout(() => menuCtx.onOpenChange(true), 100);
  }
}

function handlePointerLeave(event: PointerEvent) {
  if (event.pointerType === 'touch') return;
  clearTimeout(openTimer);
  if (contentCtx.onTriggerLeave(event)) return;
  close();
}

function handleKeyDown(event: KeyboardEvent) {
  if (props.disabled) return;
  const openKeys = SUB_OPEN_KEYS[rootCtx.dir.value]!;
  const closeKeys = SUB_CLOSE_KEYS[rootCtx.dir.value]!;
  if (openKeys.includes(event.key)) {
    event.preventDefault();
    open();
  }
  if (closeKeys.includes(event.key)) {
    event.preventDefault();
    close();
  }
}

function handleSelect(event: Event) {
  // Sub triggers open their submenu instead of closing the menu tree —
  // this is also the only open path for touch pointers.
  event.preventDefault();
  if (!menuCtx.open.value) open();
}

// PopperAnchor renders as="template" so the item element itself becomes the
// popper anchor and fallthrough attrs land on the element carrying
// data-state/highlight (a wrapper div would swallow them). The template must
// stay single-root without top-level comments — see MenuItemImpl.
</script>

<template>
  <PopperAnchor as="template">
    <MenuItemImpl
      v-bind="props"
      :id="subCtx.triggerId.value"
      :ref="(el: unknown) => subCtx.onTriggerChange((el as any)?.$el ?? null)"
      aria-haspopup="menu"
      :aria-expanded="menuCtx.open.value"
      :aria-controls="subCtx.contentId.value"
      :data-state="getOpenState(menuCtx.open.value)"
      role="menuitem"
      @pointermove="handlePointerMove"
      @pointerleave="handlePointerLeave"
      @keydown="handleKeyDown"
      @select="handleSelect"
    >
      <slot />
    </MenuItemImpl>
  </PopperAnchor>
</template>
