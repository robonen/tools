<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { useCollectionInjector } from '../../utilities/collection';
import { MenuAnchor, useMenuContext } from '../menu';
import { getNextMatch } from '../menu/utils';
import { Primitive } from '../../internal/primitive';
import { useMenubarMenuContext, useMenubarRootContext } from './context';

const { disabled = false, as = 'button' } = defineProps<MenubarTriggerProps>();

const rootCtx = useMenubarRootContext();
const menuCtx = useMenubarMenuContext();
const menuMenuCtx = useMenuContext();
const collection = useCollectionInjector<string>();
const { forwardRef, currentElement } = useForwardExpose();

const isFocused = ref(false);

onMounted(() => menuCtx.onTriggerChange(currentElement.value ?? null));
onUnmounted(() => menuCtx.onTriggerChange(null));

// Roving tabindex: the menubar is a single tab stop. A trigger is tabbable when
// it owns the current tab stop, or — until one is chosen — when it is the first
// enabled trigger in DOM order. Keeping the existing Arrow/Home/End handler
// below means focus still moves with arrows once the bar is entered.
const isCurrentTabStop = computed(() => {
  if (disabled) return false;
  const current = rootCtx.currentTabStopId.value;
  if (current === menuCtx.value) return true;
  // Fall back to the first enabled trigger when no tab stop is chosen yet, or
  // when the chosen one is no longer mounted (e.g. its menu was v-if'd away) —
  // otherwise the menubar could end up with zero tabbable triggers.
  const enabled = rootCtx.getTriggers();
  if (current !== undefined && enabled.some(i => i.value === current)) return false;
  return enabled.at(0)?.value === menuCtx.value;
});

const tabindex = computed(() => (isCurrentTabStop.value ? 0 : -1));

function handleFocus() {
  isFocused.value = true;
  // Entering this trigger (Tab, arrow, or programmatic) makes it the tab stop.
  if (!disabled) rootCtx.onTabStopChange(menuCtx.value);
}

function handleBlur() {
  isFocused.value = false;
}

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
  // Left button only; `ctrlKey` filters out a macOS ctrl+click (context menu)
  // that the OS reports as a left button press.
  if (disabled || event.button !== 0 || event.ctrlKey) return;
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
        :aria-controls="menuMenuCtx.open.value ? menuCtx.contentId.value : undefined"
        :tabindex="tabindex"
        :data-state="menuMenuCtx.open.value ? 'open' : 'closed'"
        :data-highlighted="isFocused ? '' : undefined"
        :data-disabled="disabled ? '' : undefined"
        :data-value="menuCtx.value"
        :disabled="as === 'button' ? disabled : undefined"
        @pointerdown="handlePointerDown"
        @pointerenter="handlePointerEnter"
        @keydown="handleKeyDown"
        @focus="handleFocus"
        @blur="handleBlur"
      >
        <slot />
      </Primitive>
    </collection.CollectionItem>
  </MenuAnchor>
</template>
