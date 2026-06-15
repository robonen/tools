<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The button that toggles the select open and anchors the floating content.
 * Renders as a `role="combobox"` control wired with the appropriate ARIA and
 * `data-state`/`data-placeholder` attributes; place a `SelectValue` and
 * `SelectIcon` inside it. Supports type-to-select while closed and touch-device
 * pointer hardening.
 */
export interface SelectTriggerProps extends PrimitiveProps {
  /** Disable this trigger independently from the root. */
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, watchEffect } from 'vue';

import { refAutoReset, useForwardExpose } from '@robonen/vue';
import { PopperAnchor } from '../../overlays/popper';
import { useSelectRootContext } from './context';
import { OPEN_KEYS, getNextMatch, getOpenState, shouldShowPlaceholder } from './utils';

const { as = 'button', disabled = false } = defineProps<SelectTriggerProps>();

const { forwardRef, currentElement } = useForwardExpose();
const rootCtx = useSelectRootContext();

const isDisabled = computed(() => rootCtx.disabled.value || disabled);

watchEffect(() => rootCtx.onTriggerChange(currentElement.value));
onBeforeUnmount(() => rootCtx.onTriggerChange(undefined));

// Type-to-select on the closed trigger: cycle through the registered options by
// label prefix and select the match without opening the listbox.
const search = refAutoReset('', 1000);

function handleOpen() {
  if (isDisabled.value) return;
  rootCtx.onOpenChange(true);
  search.value = '';
}

function handlePointerOpen(event: PointerEvent) {
  handleOpen();
  rootCtx.triggerPointerDownPosRef.value = {
    x: Math.round(event.pageX),
    y: Math.round(event.pageY),
  };
}

function handlePointerDown(event: PointerEvent) {
  if (isDisabled.value) return;

  // Prevent opening on touch down — open on touch pointerup instead.
  if (event.pointerType === 'touch') {
    event.preventDefault();
    return;
  }

  // Release implicit pointer capture so subsequent pointer events target items.
  const target = event.target as HTMLElement;
  if (target.hasPointerCapture?.(event.pointerId)) {
    target.releasePointerCapture(event.pointerId);
  }

  if (event.button === 0 && !event.ctrlKey) {
    handlePointerOpen(event);
    // Prevent the trigger from stealing focus from the active item after open.
    event.preventDefault();
  }
}

function handlePointerUp(event: PointerEvent) {
  event.preventDefault();
  if (event.pointerType === 'touch') {
    handlePointerOpen(event);
  }
}

function handleClick(event: MouseEvent) {
  // Safari focuses the trigger on label clicks but skips pointerdown; force it.
  (event.currentTarget as HTMLElement | null)?.focus();
}

function typeaheadSelect(key: string) {
  search.value += key;
  const options = Array.from(rootCtx.optionsSet.value);
  if (options.length === 0) return;

  const labels = options.map(o => o.textContent);
  const current = Array.isArray(rootCtx.value.value) ? rootCtx.value.value[0] : rootCtx.value.value;
  const currentLabel = options.find(o => o.value === current)?.textContent;
  const next = getNextMatch(labels, search.value, currentLabel);
  if (next === undefined) return;

  const matched = options[labels.indexOf(next)];
  if (matched) rootCtx.onValueChange(matched.value);
}

function handleKeyDown(event: KeyboardEvent) {
  if (isDisabled.value) return;
  const isModifierKey = event.ctrlKey || event.altKey || event.metaKey;
  const isTypingAhead = search.value !== '';

  if (!isModifierKey && event.key.length === 1) {
    if (isTypingAhead && event.key === ' ') return;
    typeaheadSelect(event.key);
  }

  if (OPEN_KEYS.includes(event.key)) {
    handleOpen();
    event.preventDefault();
  }
}
</script>

<template>
  <!-- PopperAnchor IS the trigger button: the role/aria/handlers AND the
       consumer's class + children must live on the SAME element. A nested
       Primitive split them — the styled box landed on this anchor wrapper while
       the real button stayed an unstyled inline element with stacked content. -->
  <PopperAnchor
    :ref="forwardRef"
    :as="as"
    role="combobox"
    :type="as === 'button' ? 'button' : undefined"
    aria-autocomplete="none"
    :aria-controls="rootCtx.contentId.value"
    :aria-expanded="rootCtx.open.value"
    :aria-required="rootCtx.required.value || undefined"
    :dir="rootCtx.dir.value"
    :data-state="getOpenState(rootCtx.open.value)"
    :disabled="isDisabled || undefined"
    :data-disabled="isDisabled ? '' : undefined"
    :data-placeholder="shouldShowPlaceholder(rootCtx.value.value) ? '' : undefined"
    @pointerdown="handlePointerDown"
    @pointerup="handlePointerUp"
    @click="handleClick"
    @keydown="handleKeyDown"
  >
    <slot />
  </PopperAnchor>
</template>
