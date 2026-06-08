<script lang="ts">
export interface NavigationMenuItemProps {
  /**
   * Unique value associating this item with the active state. Generated
   * automatically when omitted.
   */
  value?: string;
}
</script>

<script setup lang="ts">
import { computed, ref, shallowRef, toValue } from 'vue';

import { focusFirst, getTabbableCandidates } from '@robonen/platform/browsers';
import { useForwardExpose, useId } from '@robonen/vue';
import { Primitive } from '../primitive';
import { provideNavigationMenuItemContext, useNavigationMenuContext } from './context';
import { makeContentId, makeTriggerId, removeFromTabOrder } from './utils';

const { value: valueProp } = defineProps<NavigationMenuItemProps>();

useForwardExpose();

const context = useNavigationMenuContext();

const autoId = useId(undefined, 'primitives-navigation-menu-item');
const value = computed<string>(() => valueProp ?? autoId.value);

const triggerRef = shallowRef<HTMLElement | undefined>(undefined);
const focusProxyRef = shallowRef<HTMLElement | undefined>(undefined);
const wasEscapeCloseRef = ref(false);

const triggerId = computed(() => makeTriggerId(toValue(context.baseId), value.value));
const contentId = computed(() => makeContentId(toValue(context.baseId), value.value));

let restoreContentTabOrder: () => void = () => {};

function handleContentEntry(side: 'start' | 'end' = 'start') {
  const el = document.getElementById(contentId.value);
  if (!el) return;
  restoreContentTabOrder();
  const candidates = getTabbableCandidates(el);
  if (candidates.length) {
    focusFirst(side === 'start' ? candidates : [...candidates].reverse());
  }
}

function handleContentExit() {
  const el = document.getElementById(contentId.value);
  if (!el) return;
  const candidates = getTabbableCandidates(el);
  if (candidates.length) {
    restoreContentTabOrder = removeFromTabOrder(candidates);
  }
}

provideNavigationMenuItemContext({
  get value() { return value.value; },
  get contentId() { return contentId.value; },
  get triggerId() { return triggerId.value; },
  triggerRef,
  onTriggerChange: (el) => { triggerRef.value = el; },
  focusProxyRef,
  onFocusProxyChange: (el) => { focusProxyRef.value = el; },
  wasEscapeCloseRef,
  onEntryKeyDown: () => handleContentEntry('start'),
  onFocusProxyEnter: side => handleContentEntry(side),
  onContentFocusOutside: handleContentExit,
  onRootContentClose: handleContentExit,
});
</script>

<template>
  <Primitive
    as="li"
    data-primitives-navigation-menu-item
  >
    <slot />
  </Primitive>
</template>
