<script lang="ts">
import type { ComponentPublicInstance } from 'vue';

/**
 * The button that opens its item's `NavigationMenuContent` on hover, click, or keyboard.
 * Reflects open state via `data-state` and `aria-expanded`, and manages the hover/click
 * timing handshake with the root. Use it inside a `NavigationMenuItem` for entries that
 * reveal a panel; use `NavigationMenuLink` instead for plain navigation links.
 */
export interface NavigationMenuTriggerProps {
  /** Disables interaction with this trigger. */
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import { unrefElement, useForwardExpose } from '@robonen/vue';
import { useCollectionInjector } from '../collection';
import { Primitive } from '../primitive';
import { RovingFocusItem } from '../roving-focus';
import { VisuallyHidden } from '../visually-hidden';
import { useNavigationMenuContext, useNavigationMenuItemContext } from './context';
import { NAVIGATION_MENU_COLLECTION_KEY, getOpenState } from './utils';

defineOptions({ inheritAttrs: false });

const { disabled = false } = defineProps<NavigationMenuTriggerProps>();

const menuContext = useNavigationMenuContext();
const itemContext = useNavigationMenuItemContext();

const { CollectionItem } = useCollectionInjector<{ value: string }>(NAVIGATION_MENU_COLLECTION_KEY);
const { forwardRef, currentElement: triggerElement } = useForwardExpose();

// Set after a pointermove open so further pointermoves don't re-fire
// onTriggerEnter; reset on pointerleave.
const hasPointerMoveOpened = ref(false);

const wasClickClose = ref(false);

const open = computed(() => itemContext.value === menuContext.modelValue.value);

watch(triggerElement, (el) => {
  itemContext.onTriggerChange(el ?? undefined);
});

onMounted(() => {
  if (triggerElement.value) itemContext.onTriggerChange(triggerElement.value);
});

function handlePointerEnter() {
  if (menuContext.disableHoverTrigger.value) return;
  wasClickClose.value = false;
  itemContext.wasEscapeCloseRef.value = false;
}

function handlePointerMove(ev: PointerEvent) {
  if (menuContext.disableHoverTrigger.value) return;
  if (ev.pointerType !== 'mouse') return;
  if (disabled || wasClickClose.value || itemContext.wasEscapeCloseRef.value || hasPointerMoveOpened.value) return;
  menuContext.onTriggerEnter(itemContext.value);
  hasPointerMoveOpened.value = true;
}

function handlePointerLeave(ev: PointerEvent) {
  if (menuContext.disableHoverTrigger.value) return;
  if (ev.pointerType !== 'mouse') return;
  if (disabled) return;
  menuContext.onTriggerLeave();
  hasPointerMoveOpened.value = false;
}

function handleClick(event: MouseEvent | PointerEvent) {
  const isMouse = !('pointerType' in event) || (event as PointerEvent).pointerType === 'mouse';
  if (isMouse && menuContext.disableClickTrigger.value) return;
  // Capture before onItemSelect mutates modelValue — `open` is a computed over
  // it, so reading it afterwards would be inverted.
  const wasOpen = open.value;
  menuContext.onItemSelect(wasOpen ? '' : itemContext.value);
  wasClickClose.value = wasOpen;
}

function handleKeydown(ev: KeyboardEvent) {
  const verticalEntryKey = menuContext.dir.value === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
  const entryKey = menuContext.orientation === 'horizontal' ? 'ArrowDown' : verticalEntryKey;
  if (open.value && ev.key === entryKey) {
    itemContext.onEntryKeyDown();
    ev.preventDefault();
    ev.stopPropagation();
  }
}

function setFocusProxyRef(node: Element | ComponentPublicInstance | null) {
  if (!node) {
    itemContext.onFocusProxyChange(undefined);
    return;
  }
  const el = unrefElement(node as Parameters<typeof unrefElement>[0]);
  if (el instanceof HTMLElement) itemContext.onFocusProxyChange(el);
}

function handleVisuallyHiddenFocus(ev: FocusEvent) {
  const content = document.getElementById(itemContext.contentId);
  const prevFocused = ev.relatedTarget as HTMLElement | null;
  const wasTriggerFocused = prevFocused === triggerElement.value;
  const wasFocusFromContent = !!content?.contains(prevFocused);
  if (wasTriggerFocused || !wasFocusFromContent)
    itemContext.onFocusProxyEnter(wasTriggerFocused ? 'start' : 'end');
}
</script>

<template>
  <!-- CollectionItem must wrap the button itself (not RovingFocusItem, which
       renders its own span) so the element registered in the nav collection
       carries the trigger id that Root/Sub match `activeTrigger` against. -->
  <RovingFocusItem :focusable="!disabled">
    <CollectionItem :value="{ value: itemContext.value }">
      <Primitive
        :id="itemContext.triggerId"
        :ref="forwardRef"
        as="button"
        type="button"
        :disabled="disabled || undefined"
        :data-disabled="disabled ? '' : undefined"
        :data-state="getOpenState(menuContext.modelValue.value, itemContext.value)"
        :aria-expanded="open"
        :aria-controls="itemContext.contentId"
        data-primitives-navigation-menu-trigger
        data-primitives-collection-item
        v-bind="$attrs"
        @pointerenter="handlePointerEnter"
        @pointermove="handlePointerMove"
        @pointerleave="handlePointerLeave"
        @click="handleClick"
        @keydown="handleKeydown"
      >
        <slot />
      </Primitive>
    </CollectionItem>
  </RovingFocusItem>

  <template v-if="open">
    <VisuallyHidden
      :ref="setFocusProxyRef"
      aria-hidden="true"
      :tabindex="0"
      @focus="handleVisuallyHiddenFocus"
    />
    <span v-if="menuContext.viewport.value" :aria-owns="itemContext.contentId" />
  </template>
</template>
