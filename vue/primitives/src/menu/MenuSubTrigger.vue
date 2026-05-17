<script lang="ts">
import type { MenuItemImplProps } from './MenuItemImpl.vue';

export interface MenuSubTriggerProps extends MenuItemImplProps {}
</script>

<script setup lang="ts">
import { PopperAnchor } from '../popper';
import { useMenuContentContext, useMenuContext, useMenuRootContext, useMenuSubContext } from './context';
import MenuItemImpl from './MenuItemImpl.vue';
import { SUB_CLOSE_KEYS, SUB_OPEN_KEYS, getOpenState, isPointerInGraceArea } from './utils';

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
</script>

<template>
  <PopperAnchor as-child>
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
      @select.prevent
    >
      <slot />
    </MenuItemImpl>
  </PopperAnchor>
</template>
