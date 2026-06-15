<script lang="ts">
import type { MenuContentEmits, MenuContentProps } from '../menu';

/**
 * The floating surface that holds the menu items, positioned relative to the
 * trigger. Handles focus management, typeahead, and dismissal on outside click
 * or Escape; render it inside a portal so it escapes overflow clipping.
 */
export interface DropdownMenuContentProps extends MenuContentProps {}
export type DropdownMenuContentEmits = MenuContentEmits;
</script>

<script setup lang="ts">
import type { CSSProperties } from 'vue';

import { ref } from 'vue';

import { MenuContent } from '../menu';
import { useDropdownMenuRootContext } from './context';

const props = defineProps<DropdownMenuContentProps>();
const emit = defineEmits<DropdownMenuContentEmits>();
const ddCtx = useDropdownMenuRootContext();

// Tracks whether the menu closed because of an outside / right-click / non-modal
// interaction. When it did, focus must stay where the user pointed instead of
// snapping back to the trigger (which would be jarring and steal the caret).
const hasInteractedOutside = ref(false);

// Map the Popper-computed measurements onto dropdown-scoped CSS custom
// properties so consumers can size/animate the menu relative to its trigger.
const contentStyle: CSSProperties = {
  '--primitives-dropdown-menu-content-transform-origin': 'var(--popper-transform-origin)',
  '--primitives-dropdown-menu-content-available-width': 'var(--popper-available-width)',
  '--primitives-dropdown-menu-content-available-height': 'var(--popper-available-height)',
  '--primitives-dropdown-menu-trigger-width': 'var(--popper-anchor-width)',
  '--primitives-dropdown-menu-trigger-height': 'var(--popper-anchor-height)',
} as CSSProperties;

function handleCloseAutoFocus(event: Event) {
  // Let the consumer opt out of the managed focus return entirely.
  emit('closeAutoFocus', event);
  if (event.defaultPrevented) return;
  if (!hasInteractedOutside.value) {
    ddCtx.triggerRef.value?.focus({ preventScroll: true });
  }
  hasInteractedOutside.value = false;
  // Either we refocused the trigger ourselves or the user is interacting
  // elsewhere — in both cases the underlying scope's default restore must not run.
  event.preventDefault();
}

function handleInteractOutside(event: PointerEvent | MouseEvent | FocusEvent) {
  if (!event.defaultPrevented) {
    const originalEvent = event as Partial<MouseEvent>;
    const ctrlLeftClick = originalEvent.button === 0 && originalEvent.ctrlKey === true;
    const isRightClick = originalEvent.button === 2 || ctrlLeftClick;
    if (!ddCtx.modal.value || isRightClick) hasInteractedOutside.value = true;
  }
  emit('interactOutside', event);
}
</script>

<template>
  <MenuContent
    v-bind="props"
    :id="ddCtx.contentId.value"
    :aria-labelledby="ddCtx.triggerId.value"
    :style="contentStyle"
    @close-auto-focus="handleCloseAutoFocus"
    @escape-key-down="emit('escapeKeyDown', $event)"
    @pointer-down-outside="(event: PointerEvent | MouseEvent) => {
      const target = event.target as Node
      // The trigger owns pointerdown toggling — letting the layer also dismiss
      // here would close the menu before the trigger handler runs and make its
      // toggle reopen it.
      const isTriggerPointerDown = ddCtx.triggerRef.value?.contains(target)
      if (isTriggerPointerDown) event.preventDefault()
      emit('pointerDownOutside', event)
    }"
    @focus-outside="emit('focusOutside', $event)"
    @interact-outside="handleInteractOutside"
    @dismiss="emit('dismiss')"
    @entry-focus="emit('entryFocus', $event)"
    @open-auto-focus="emit('openAutoFocus', $event)"
  >
    <slot />
  </MenuContent>
</template>
