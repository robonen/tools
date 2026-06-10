<script lang="ts">
import type { DismissableLayerEmits, DismissableLayerProps } from '../dismissable-layer';

/**
 * Internal rendering body for `NavigationMenuContent`. Wraps the panel in a
 * `FocusScope` and `DismissableLayer`, implementing arrow-key/Tab navigation between
 * links, escape-to-dismiss, outside-interaction handling, and the `data-motion`
 * transition attribute. Not part of the public anatomy; use `NavigationMenuContent`.
 */
export interface NavigationMenuContentImplProps extends DismissableLayerProps {}

export type NavigationMenuContentImplEmits = DismissableLayerEmits & {
  pointerEnterContent: [];
  pointerLeaveContent: [];
};
</script>

<script setup lang="ts">
import { computed, watchEffect } from 'vue';

import { focusFirst, getActiveElement, getTabbableCandidates } from '@robonen/platform/browsers';
import { useForwardExpose } from '@robonen/vue';
import { DismissableLayer } from '../dismissable-layer';
import { FocusScope } from '../focus-scope';
import { getFocusIntent, wrapArray } from '../roving-focus/utils';
import { useNavigationMenuContext, useNavigationMenuItemContext } from './context';
import { COLLECTION_ITEM_ATTR, EVENT_ROOT_CONTENT_DISMISS, getOpenState } from './utils';

defineOptions({ inheritAttrs: false });

const { as } = defineProps<NavigationMenuContentImplProps>();

const emit = defineEmits<NavigationMenuContentImplEmits>();

const menuContext = useNavigationMenuContext();
const itemContext = useNavigationMenuItemContext();

const { forwardRef, currentElement } = useForwardExpose();

const motionAttribute = computed<'from-start' | 'from-end' | 'to-start' | 'to-end' | undefined>(() => {
  const items = menuContext.rootNavigationMenu.value
    ? Array.from(menuContext.rootNavigationMenu.value.querySelectorAll('[data-primitives-navigation-menu-trigger]'))
    : [];
  const values = items.map(el => el.id.split('-trigger-').pop()).filter(Boolean) as string[];
  if (menuContext.dir.value === 'rtl') values.reverse();
  const index = values.indexOf(itemContext.value);
  const prevIndex = values.indexOf(menuContext.previousValue.value);
  const isSelected = itemContext.value === menuContext.modelValue.value;
  const wasSelected = prevIndex === values.indexOf(menuContext.modelValue.value) && prevIndex !== -1;
  if (!isSelected && !wasSelected) return undefined;
  if (index === -1) return undefined;
  if (isSelected) {
    return prevIndex === -1 ? undefined : index > prevIndex ? 'from-end' : 'from-start';
  }
  // we are leaving
  const curIndex = values.indexOf(menuContext.modelValue.value);
  if (curIndex === -1) return undefined;
  return curIndex > index ? 'to-start' : 'to-end';
});

function handleKeydown(ev: KeyboardEvent) {
  const isMetaKey = ev.altKey || ev.ctrlKey || ev.metaKey;

  if (ev.key === 'Tab' && !isMetaKey) {
    const root = currentElement.value;
    if (!root) return;
    const candidates = getTabbableCandidates(root);
    const focused = getActiveElement(document) as HTMLElement | null;
    const idx = focused ? candidates.indexOf(focused) : -1;
    const isMovingBackwards = ev.shiftKey;
    const nextCandidates = isMovingBackwards
      ? candidates.slice(0, idx).reverse()
      : candidates.slice(idx + 1);
    if (focusFirst(nextCandidates)) {
      ev.preventDefault();
    }
    else {
      // edge — delegate to focus proxy
      itemContext.focusProxyRef.value?.focus();
    }
    return;
  }

  const intent = getFocusIntent(ev, menuContext.orientation, menuContext.dir.value);
  if (!intent) return;

  const root = currentElement.value;
  if (!root) return;

  const linkItems = Array.from(root.querySelectorAll<HTMLElement>(`[${COLLECTION_ITEM_ATTR}]`));
  const focused = getActiveElement(document) as HTMLElement | null;
  const focusedIndex = focused ? linkItems.indexOf(focused) : -1;

  if (intent === 'first') {
    if (focusFirst(linkItems)) ev.preventDefault();
    return;
  }
  if (intent === 'last') {
    if (focusFirst([...linkItems].reverse())) ev.preventDefault();
    return;
  }
  if (focusedIndex === -1) {
    if (focusFirst(linkItems)) ev.preventDefault();
    return;
  }
  const rotated = wrapArray(linkItems, focusedIndex);
  const candidates = intent === 'prev' ? rotated.slice(1).reverse() : rotated.slice(1);
  if (focusFirst(candidates)) ev.preventDefault();
}

function handleEscapeKeyDown(ev: KeyboardEvent) {
  emit('escapeKeyDown', ev);
  if (ev.defaultPrevented) return;
  itemContext.wasEscapeCloseRef.value = true;
  menuContext.onItemDismiss();
  itemContext.triggerRef.value?.focus();
}

function handleFocusOutside(ev: FocusEvent) {
  emit('focusOutside', ev);
  if (ev.defaultPrevented) return;
  itemContext.onContentFocusOutside();
  const target = ev.target as Node | null;
  if (menuContext.rootNavigationMenu.value?.contains(target)) ev.preventDefault();
}

function handlePointerDownOutside(ev: PointerEvent | MouseEvent) {
  emit('pointerDownOutside', ev);
  if (ev.defaultPrevented) return;
  const target = ev.target as HTMLElement | null;
  const isTrigger = menuContext.activeTrigger.value?.contains(target);
  const isRootViewport = menuContext.isRootMenu && menuContext.viewport.value?.contains(target);
  if (isTrigger || isRootViewport || !menuContext.isRootMenu) ev.preventDefault();
}

function handleDismiss() {
  emit('dismiss');
  const el = currentElement.value;
  if (menuContext.isRootMenu && el) {
    // Bubbles up to NavigationMenuRoot's listener (closes the menu) and hits
    // our own EVENT_ROOT_CONTENT_DISMISS listener (restores content tab order).
    el.dispatchEvent(new CustomEvent(EVENT_ROOT_CONTENT_DISMISS, { bubbles: true, cancelable: true }));
  }
  else {
    // Submenus: the root listener isn't on an ancestor of this element.
    menuContext.onItemDismiss();
  }
}

// Listen for sibling/global EVENT_ROOT_CONTENT_DISMISS for root menus so links
// inside content can request the whole root close.
watchEffect((onCleanup) => {
  const el = currentElement.value;
  if (!el || !menuContext.isRootMenu) return;
  function onDismiss() {
    itemContext.onRootContentClose();
  }
  el.addEventListener(EVENT_ROOT_CONTENT_DISMISS, onDismiss);
  onCleanup(() => el.removeEventListener(EVENT_ROOT_CONTENT_DISMISS, onDismiss));
});
</script>

<template>
  <FocusScope
    :trapped="false"
    @mount-auto-focus.prevent
    @unmount-auto-focus.prevent
  >
    <DismissableLayer
      :id="itemContext.contentId"
      :ref="forwardRef"
      :as="as"
      :aria-labelledby="itemContext.triggerId"
      :data-motion="motionAttribute"
      :data-state="getOpenState(menuContext.modelValue.value, itemContext.value)"
      :data-orientation="menuContext.orientation"
      :data-primitives-navigation-menu-content="itemContext.value"
      :disable-outside-pointer-events="false"
      v-bind="$attrs"
      @keydown="handleKeydown"
      @escape-key-down="handleEscapeKeyDown"
      @pointer-down-outside="handlePointerDownOutside"
      @focus-outside="handleFocusOutside"
      @interact-outside="emit('interactOutside', $event)"
      @dismiss="handleDismiss"
      @pointerenter="emit('pointerEnterContent')"
      @pointerleave="emit('pointerLeaveContent')"
    >
      <slot />
    </DismissableLayer>
  </FocusScope>
</template>
