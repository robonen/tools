<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * The button in the menubar that opens its menu and anchors the content.
 * Toggles on click, opens on Enter / Space / ArrowDown / ArrowUp, and — once any
 * menu is open — switches to this menu on hover. Arrow keys, Home/End, and
 * typeahead move focus between sibling triggers.
 */
export interface MenubarTriggerProps extends PrimitiveProps {
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { useCollectionInjector } from '../collection';
import { MenuAnchor, useMenuContext } from '../menu';
import { getNextMatch } from '../menu/utils';
import { Primitive } from '../primitive';
import { useMenubarMenuContext, useMenubarRootContext } from './context';

const { disabled = false, as = 'button' } = defineProps<MenubarTriggerProps>();

const rootCtx = useMenubarRootContext();
const menuCtx = useMenubarMenuContext();
const menuMenuCtx = useMenuContext();
const collection = useCollectionInjector<string>();
const { forwardRef, currentElement } = useForwardExpose();

onMounted(() => menuCtx.onTriggerChange(currentElement.value ?? null));
onUnmounted(() => menuCtx.onTriggerChange(null));

function focusTrigger(el: HTMLElement | undefined) {
  if (!el) return;
  el.focus({ preventScroll: true });
}

function focusByIndex(items: HTMLElement[], from: number, delta: 1 | -1) {
  if (items.length === 0) return;
  const loop = rootCtx.loop.value;
  let next = from + delta;
  if (loop) {
    next = (next + items.length) % items.length;
  }
  else {
    next = Math.max(0, Math.min(items.length - 1, next));
  }
  focusTrigger(items[next]);
}

// Hover-switch: when a sibling menu is already open, hovering this trigger
// (focused or not) opens this one and moves focus over.
function handlePointerDown(event: PointerEvent) {
  if (disabled || event.button !== 0) return;
  event.preventDefault();
  rootCtx.onMenuToggle(menuCtx.value);
}

function handlePointerEnter() {
  if (disabled) return;
  if (rootCtx.value.value !== undefined && rootCtx.value.value !== menuCtx.value) {
    rootCtx.onMenuOpen(menuCtx.value);
    menuCtx.triggerRef.value?.focus({ preventScroll: true });
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (disabled) return;

  // Open the menu on Enter / Space / ArrowDown / ArrowUp (per WAI-ARIA APG).
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    menuCtx.wasKeyboardTriggerOpenRef.value = true;
    rootCtx.onMenuOpen(menuCtx.value);
    return;
  }

  // Move focus between sibling triggers.
  const triggers = collection
    .getItems(true)
    .map(i => i.ref)
    .filter(el => el.dataset['disabled'] !== '');
  if (triggers.length === 0) return;
  const currentIdx = triggers.indexOf(currentElement.value as HTMLElement);
  const dir = rootCtx.dir.value;
  const nextKey = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
  const prevKey = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';

  if (event.key === nextKey) {
    event.preventDefault();
    focusByIndex(triggers, currentIdx, 1);
    return;
  }
  if (event.key === prevKey) {
    event.preventDefault();
    focusByIndex(triggers, currentIdx, -1);
    return;
  }
  if (event.key === 'Home') {
    event.preventDefault();
    focusTrigger(triggers[0]);
    return;
  }
  if (event.key === 'End') {
    event.preventDefault();
    focusTrigger(triggers[triggers.length - 1]);
  }
}

// Typeahead — driven by the shared `searchRef` filled by MenubarRoot's
// keydown.capture. When it changes, jump focus to the matching trigger.
watch(() => rootCtx.searchRef.value, (search) => {
  if (!search) return;
  // Only react when this trigger currently has focus — prevents every trigger
  // from racing for the same match.
  if (document.activeElement !== currentElement.value) return;
  const triggers = collection
    .getItems(true)
    .map(i => i.ref)
    .filter(el => el.dataset['disabled'] !== '');
  const match = getNextMatch(triggers, search, currentElement.value as HTMLElement | null);
  if (match && match !== currentElement.value) focusTrigger(match);
});
</script>

<template>
  <MenuAnchor>
    <collection.CollectionItem :value="menuCtx.value">
      <Primitive
        :ref="forwardRef"
        :as="as"
        :id="menuCtx.triggerId.value"
        role="menuitem"
        aria-haspopup="menu"
        :aria-expanded="menuMenuCtx.open.value"
        :aria-controls="menuCtx.contentId.value"
        :data-state="menuMenuCtx.open.value ? 'open' : 'closed'"
        :data-disabled="disabled ? '' : undefined"
        :disabled="as === 'button' ? disabled : undefined"
        @pointerdown="handlePointerDown"
        @pointerenter="handlePointerEnter"
        @keydown="handleKeyDown"
      >
        <slot />
      </Primitive>
    </collection.CollectionItem>
  </MenuAnchor>
</template>
