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
import { shallowRef } from 'vue';

import { PopperAnchor } from '../../overlays/popper';
import { useMenuContentContext, useMenuContext, useMenuItemSelectContext, useMenuRootContext, useMenuSubContext } from './context';
import type { Side } from './utils';
import MenuItemImpl from './MenuItemImpl.vue';
import { SUB_CLOSE_KEYS, SUB_OPEN_KEYS, buildSubmenuGraceArea, getOpenState, isMousePointer } from './utils';

const props = defineProps<MenuSubTriggerProps>();

const menuCtx = useMenuContext();
const subCtx = useMenuSubContext();
const rootCtx = useMenuRootContext();
const contentCtx = useMenuContentContext();
// Injected from the parent content (the sub-trigger lives inside it); falls
// back to never-typing when used outside a content during isolated tests.
const selectCtx = useMenuItemSelectContext({ isTypingAhead: shallowRef(false) });

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
  if (!isMousePointer(event)) return;
  if (props.disabled) return;
  if (contentCtx.onItemEnter(event)) return;
  if (!menuCtx.open.value && !openTimer) {
    // Cancel any pending grace intent before scheduling this trigger's open.
    contentCtx.onPointerGraceIntentChange(null);
    openTimer = setTimeout(() => {
      menuCtx.onOpenChange(true);
      openTimer = undefined;
    }, 100);
  }
}

function handlePointerLeave(event: PointerEvent) {
  if (!isMousePointer(event)) return;
  clearTimeout(openTimer);
  openTimer = undefined;

  const contentRect = menuCtx.content.value?.getBoundingClientRect();
  if (contentRect?.width) {
    const side = (menuCtx.content.value?.dataset['side'] as Side) ?? 'right';
    // Register a safe diagonal triangle toward the open submenu so the cursor
    // can travel to it without the submenu closing. Auto-expires after 300ms.
    contentCtx.onPointerGraceIntentChange({
      area: buildSubmenuGraceArea(event, contentRect, side),
      side,
    });
    globalThis.clearTimeout(contentCtx.pointerGraceTimerRef.value);
    contentCtx.pointerGraceTimerRef.value = globalThis.setTimeout(
      () => contentCtx.onPointerGraceIntentChange(null),
      300,
    );
  }
  else {
    if (contentCtx.onTriggerLeave(event)) return;
    contentCtx.onPointerGraceIntentChange(null);
    close();
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (props.disabled) return;
  // While typing ahead, Space extends the search instead of opening the submenu.
  if (selectCtx.isTypingAhead.value && event.key === ' ') return;
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
