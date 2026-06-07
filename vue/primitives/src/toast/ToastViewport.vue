<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface ToastViewportProps extends PrimitiveProps {
  /** Accessible label for the toast region. Overrides the provider label. */
  label?: string;
  /** Keyboard shortcut to focus the viewport. @default ['F8'] */
  hotkey?: string[];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watchPostEffect } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { useToastProviderContext } from './context';
import { VIEWPORT_PAUSE, VIEWPORT_RESUME } from './utils';

const { as = 'ol', hotkey = ['F8'], label } = defineProps<ToastViewportProps>();

const { forwardRef, currentElement } = useForwardExpose();
const providerCtx = useToastProviderContext();

watchPostEffect(() => providerCtx.onViewportChange(currentElement.value));

const viewportLabel = computed(() => label ?? providerCtx.label.value);

function handlePointerEnter() {
  currentElement.value?.dispatchEvent(new CustomEvent(VIEWPORT_PAUSE, { bubbles: true }));
}

function handlePointerLeave() {
  currentElement.value?.dispatchEvent(new CustomEvent(VIEWPORT_RESUME, { bubbles: true }));
}

function handleFocusIn() {
  currentElement.value?.dispatchEvent(new CustomEvent(VIEWPORT_PAUSE, { bubbles: true }));
}

function handleFocusOut(event: FocusEvent) {
  if (currentElement.value?.contains(event.relatedTarget as Node)) return;
  currentElement.value?.dispatchEvent(new CustomEvent(VIEWPORT_RESUME, { bubbles: true }));
}

function handleGlobalKeyDown(event: KeyboardEvent) {
  if (!hotkey || hotkey.length === 0) return;
  const isHotkey = hotkey.every((key) => {
    if (key === event.key) return true;
    if (key === 'altKey') return event.altKey;
    if (key === 'ctrlKey') return event.ctrlKey;
    if (key === 'shiftKey') return event.shiftKey;
    if (key === 'metaKey') return event.metaKey;
    return false;
  });
  if (isHotkey) currentElement.value?.focus();
}

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeyDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleGlobalKeyDown);
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="region"
    :aria-label="viewportLabel"
    tabindex="-1"
    style="outline: none"
    data-primitives-toast-viewport
    @pointerenter="handlePointerEnter"
    @pointerleave="handlePointerLeave"
    @focusin="handleFocusIn"
    @focusout="handleFocusOut"
  >
    <slot />
  </Primitive>
</template>
