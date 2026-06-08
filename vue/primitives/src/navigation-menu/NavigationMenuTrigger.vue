<script lang="ts">
import type { ComponentPublicInstance } from 'vue';

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
import { getOpenState } from './utils';

defineOptions({ inheritAttrs: false });

const { disabled = false } = defineProps<NavigationMenuTriggerProps>();

const menuContext = useNavigationMenuContext();
const itemContext = useNavigationMenuItemContext();

const { CollectionItem } = useCollectionInjector<{ value: string }>();
const { forwardRef, currentElement: triggerElement } = useForwardExpose();

// Auto-reset flag that suppresses click→toggle right after a pointermove open.
const hasPointerMoveOpened = ref(false);
let pointerMoveResetTimer: ReturnType<typeof setTimeout> | undefined;
function markPointerMoveOpened() {
  hasPointerMoveOpened.value = true;
  if (pointerMoveResetTimer !== undefined) clearTimeout(pointerMoveResetTimer);
  pointerMoveResetTimer = setTimeout(() => {
    hasPointerMoveOpened.value = false;
    pointerMoveResetTimer = undefined;
  }, 300);
}

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
  markPointerMoveOpened();
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
  // If pointermove already opened the menu, ignore the resulting click.
  if (hasPointerMoveOpened.value) return;
  if (open.value) menuContext.onItemSelect('');
  else menuContext.onItemSelect(itemContext.value);
  wasClickClose.value = open.value;
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
  <CollectionItem :value="{ value: itemContext.value }">
    <RovingFocusItem :focusable="!disabled">
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
    </RovingFocusItem>
  </CollectionItem>

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
