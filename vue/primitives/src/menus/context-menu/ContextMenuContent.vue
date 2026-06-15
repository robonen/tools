<script lang="ts">
import type { MenuContentEmits, MenuContentProps } from '../menu';

/**
 * The floating surface that holds the menu items, positioned at the pointer
 * where the menu was invoked. Handles focus management, typeahead, and
 * dismissal on outside click or Escape; render it inside a portal.
 *
 * Cursor-anchored positioning (`side`/`align`) is fixed by this part; pass
 * collision/sizing props as needed.
 */
export interface ContextMenuContentProps extends MenuContentProps {}
export type ContextMenuContentEmits = MenuContentEmits;
</script>

<script setup lang="ts">
import { shallowRef } from 'vue';

import { MenuContent } from '../menu';
import { useContextMenuRootContext } from './context';

const {
  sideOffset = 2,
  alignOffset = 0,
  avoidCollisions = true,
  collisionPadding = 0,
  sticky = 'partial',
  hideWhenDetached = false,
  ...rest
} = defineProps<ContextMenuContentProps>();
const emit = defineEmits<ContextMenuContentEmits>();

const rootCtx = useContextMenuRootContext();
// In non-modal mode, an outside interaction should dismiss the menu but must
// not yank focus back to the trigger afterwards.
const hasInteractedOutside = shallowRef(false);

function handleInteractOutside(event: PointerEvent | MouseEvent | FocusEvent) {
  // Right-clicking the trigger while the menu is open would otherwise dismiss
  // (via pointerdown-outside) and immediately reopen (via contextmenu), causing
  // a flicker and lost focus. Suppress the dismiss in that case.
  const trigger = rootCtx.triggerElement.value;
  const target = event.target as Node | null;
  if (
    'button' in event
    && event.button === 2
    && trigger !== undefined
    && target !== null
    && (trigger === target || trigger.contains(target))
  ) {
    event.preventDefault();
    return;
  }
  if (!event.defaultPrevented && !rootCtx.modal.value) hasInteractedOutside.value = true;
}

function handleCloseAutoFocus(event: Event) {
  if (!event.defaultPrevented && hasInteractedOutside.value) event.preventDefault();
  hasInteractedOutside.value = false;
  emit('closeAutoFocus', event);
}
</script>

<template>
  <MenuContent
    v-bind="rest"
    side="right"
    :side-offset="sideOffset"
    align="start"
    :align-offset="alignOffset"
    :avoid-collisions="avoidCollisions"
    :collision-padding="collisionPadding"
    :sticky="sticky"
    :hide-when-detached="hideWhenDetached"
    update-position-strategy="optimized"
    :style="{
      '--primitives-context-menu-content-transform-origin': 'var(--popper-transform-origin)',
      '--primitives-context-menu-content-available-width': 'var(--popper-available-width)',
      '--primitives-context-menu-content-available-height': 'var(--popper-available-height)',
      '--primitives-context-menu-trigger-width': 'var(--popper-anchor-width)',
      '--primitives-context-menu-trigger-height': 'var(--popper-anchor-height)',
    }"
    @close-auto-focus="handleCloseAutoFocus"
    @escape-key-down="emit('escapeKeyDown', $event)"
    @pointer-down-outside="emit('pointerDownOutside', $event)"
    @focus-outside="emit('focusOutside', $event)"
    @interact-outside="(event) => { handleInteractOutside(event); emit('interactOutside', event); }"
    @dismiss="emit('dismiss')"
    @entry-focus="emit('entryFocus', $event)"
    @open-auto-focus="emit('openAutoFocus', $event)"
  >
    <slot />
  </MenuContent>
</template>
