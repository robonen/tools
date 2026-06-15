<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The fixed-position region (an `<ol>`) where toasts are rendered. Provides the
 * accessible landmark for the toast list, pauses auto-dismiss timers on
 * hover/focus/window-blur, can be focused via a keyboard hotkey, and manages tab
 * order across portaled toasts (newest-first) with head/tail focus proxies.
 * Render exactly one per provider.
 */
export interface ToastViewportProps extends PrimitiveProps {
  /**
   * Accessible label for the toast region. Overrides the provider label.
   * The `{hotkey}` placeholder is replaced with the configured hotkey, and a
   * `(hotkey) => string` function form is also accepted.
   */
  label?: string | ((hotkey: string) => string);
  /** Keyboard shortcut to focus the viewport. @default ['F8'] */
  hotkey?: string[];
}
</script>

<script setup lang="ts">
import { computed, shallowRef, watchPostEffect } from 'vue';

import { focusFirst, getActiveElement, getTabbableCandidates } from '@robonen/platform/browsers';
import { unrefElement, useEventListener, useForwardExpose } from '@robonen/vue';
import { useCollectionInjector } from '../../utilities/collection';
import { DismissableLayerBranch } from '../../utilities/dismissable-layer';
import { Primitive } from '../../internal/primitive';
import { useToastProviderContext } from './context';
import { TOAST_COLLECTION_KEY } from './shared';
import ToastFocusProxy from './ToastFocusProxy.vue';
import { VIEWPORT_PAUSE, VIEWPORT_RESUME } from './utils';

defineOptions({
  inheritAttrs: false,
});

const { as = 'ol', hotkey = ['F8'], label } = defineProps<ToastViewportProps>();

const { forwardRef, currentElement } = useForwardExpose();
const providerCtx = useToastProviderContext();
const { CollectionSlot, getItems } = useCollectionInjector(TOAST_COLLECTION_KEY);

const hasToasts = computed(() => providerCtx.toastCount.value > 0);
// Cache the branch style object so the DismissableLayerBranch child receives a
// stable reference between renders instead of a freshly-allocated literal on
// every viewport re-render (viewport re-renders on each toast add/remove).
const branchStyle = computed(() => ({ pointerEvents: hasToasts.value ? undefined : ('none' as const) }));
const headFocusProxy = shallowRef<HTMLElement>();
const tailFocusProxy = shallowRef<HTMLElement>();

watchPostEffect(() => providerCtx.onViewportChange(currentElement.value));

const hotkeyMessage = computed(() =>
  hotkey.join('+').replaceAll('Key', '').replaceAll('Digit', ''),
);

const viewportLabel = computed(() => {
  const base = label ?? providerCtx.label.value;
  if (typeof base === 'function') return base(hotkeyMessage.value);
  return base.replace('{hotkey}', hotkeyMessage.value);
});

// Dispatch pause/resume only on an actual state transition. Guarding on the
// shared `isClosePausedRef` makes repeated `pointermove`/window events idempotent
// so the per-toast timer is not re-banked on every move.
function dispatchPause() {
  if (providerCtx.isClosePausedRef.value) return;
  providerCtx.isClosePausedRef.value = true;
  currentElement.value?.dispatchEvent(new CustomEvent(VIEWPORT_PAUSE, { bubbles: true }));
}

function dispatchResume() {
  if (!providerCtx.isClosePausedRef.value) return;
  providerCtx.isClosePausedRef.value = false;
  currentElement.value?.dispatchEvent(new CustomEvent(VIEWPORT_RESUME, { bubbles: true }));
}

function handlePointerEnter() {
  dispatchPause();
}

function handlePointerLeave() {
  // Don't resume if focus is still inside the viewport (focus pause wins).
  if (currentElement.value?.contains(getActiveElement())) return;
  dispatchResume();
}

function handleFocusIn() {
  dispatchPause();
}

function handleFocusOut(event: FocusEvent) {
  if (currentElement.value?.contains(event.relatedTarget as Node)) return;
  dispatchResume();
}

function handleWindowBlur() {
  dispatchPause();
}

function handleWindowFocus() {
  // Only resume if focus is not parked inside the viewport.
  if (currentElement.value?.contains(getActiveElement())) return;
  dispatchResume();
}

// Newest-to-oldest tab order across portaled toasts. Portals can't influence
// source order, so we manage Tab/Shift+Tab manually and proxy out at the edges.
function getSortedTabbableCandidates(direction: 'forwards' | 'backwards') {
  const toastNodes = getItems(true).map(i => i.ref);
  const perToast = toastNodes.map((node) => {
    const candidates = [node, ...getTabbableCandidates(node)];
    return direction === 'forwards' ? candidates : candidates.reverse();
  });
  return (direction === 'forwards' ? perToast.reverse() : perToast).flat();
}

function handleKeyDown(event: KeyboardEvent) {
  const viewport = currentElement.value;
  if (!viewport) return;

  const isModifier = event.altKey || event.ctrlKey || event.metaKey;
  if (event.key !== 'Tab' || isModifier) return;

  const focused = getActiveElement();
  const isTabbingBackwards = event.shiftKey;
  const targetIsViewport = event.target === viewport;

  if (targetIsViewport && isTabbingBackwards) {
    headFocusProxy.value?.focus();
    return;
  }

  const direction = isTabbingBackwards ? 'backwards' : 'forwards';
  const sorted = getSortedTabbableCandidates(direction);
  const index = sorted.indexOf(focused);

  if (focusFirst(sorted.slice(index + 1))) {
    event.preventDefault();
  }
  else if (isTabbingBackwards) {
    // At an edge — proxy out so the browser hands focus to the next document element.
    headFocusProxy.value?.focus();
  }
  else {
    tailFocusProxy.value?.focus();
  }
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

useEventListener(document, 'keydown', handleGlobalKeyDown);
useEventListener(globalThis, 'blur', handleWindowBlur);
useEventListener(globalThis, 'focus', handleWindowFocus);

function setHeadProxy(node: unknown) {
  headFocusProxy.value = (unrefElement(node as Parameters<typeof unrefElement>[0]) as HTMLElement) ?? undefined;
}

function setTailProxy(node: unknown) {
  tailFocusProxy.value = (unrefElement(node as Parameters<typeof unrefElement>[0]) as HTMLElement) ?? undefined;
}

function focusToastsForwards() {
  focusFirst(getSortedTabbableCandidates('forwards'));
}

function focusToastsBackwards() {
  focusFirst(getSortedTabbableCandidates('backwards'));
}
</script>

<template>
  <DismissableLayerBranch
    :style="branchStyle"
  >
    <ToastFocusProxy
      v-if="hasToasts"
      :ref="setHeadProxy"
      @focus-from-outside-viewport="focusToastsForwards"
    />

    <CollectionSlot>
      <Primitive
        :ref="forwardRef"
        :as="as"
        v-bind="$attrs"
        role="region"
        :aria-label="viewportLabel"
        tabindex="-1"
        style="outline: none"
        data-primitives-toast-viewport
        @pointerenter="handlePointerEnter"
        @pointermove="handlePointerEnter"
        @pointerleave="handlePointerLeave"
        @focusin="handleFocusIn"
        @focusout="handleFocusOut"
        @keydown="handleKeyDown"
      >
        <slot />
      </Primitive>
    </CollectionSlot>

    <ToastFocusProxy
      v-if="hasToasts"
      :ref="setTailProxy"
      @focus-from-outside-viewport="focusToastsBackwards"
    />
  </DismissableLayerBranch>
</template>
