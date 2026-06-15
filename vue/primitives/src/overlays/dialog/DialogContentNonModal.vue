<script setup lang="ts">
import type { DialogContentImplEmits, DialogContentImplProps } from './DialogContentImpl.vue';
import { watch } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { useDialogContext } from './context';
import DialogContentImpl from './DialogContentImpl.vue';

const { as = 'div', role = 'dialog' } = defineProps<DialogContentImplProps>();
const emit = defineEmits<DialogContentImplEmits>();

const ctx = useDialogContext();
const { forwardRef, currentElement } = useForwardExpose();

watch(currentElement, (el) => {
  ctx.contentElement.value = el as HTMLElement | undefined;
}, { immediate: true, flush: 'post' });

// Track outside interaction so closing a non-modal dialog does not steal focus
// back to the trigger when the user has deliberately moved focus elsewhere.
let hasInteractedOutside = false;
let hasPointerDownOutside = false;

function onCloseAutoFocus(event: Event) {
  emit('closeAutoFocus', event);
  if (!event.defaultPrevented) {
    // Only pull focus back to the trigger when the close was driven from inside
    // the dialog; otherwise respect the user's focus target.
    if (!hasInteractedOutside) ctx.triggerElement.value?.focus();
    event.preventDefault();
  }
  hasInteractedOutside = false;
  hasPointerDownOutside = false;
}

function onInteractOutside(event: PointerEvent | MouseEvent | FocusEvent) {
  emit('interactOutside', event);
  if (!event.defaultPrevented) {
    hasInteractedOutside = true;
    if (event.type === 'pointerdown') hasPointerDownOutside = true;
  }

  // Clicking the trigger while open should not dismiss-then-reopen: the trigger
  // already toggles, so suppress the outside-interaction dismiss for it.
  const target = event.target as Node | null;
  if (target && ctx.triggerElement.value?.contains(target))
    event.preventDefault();

  // Safari edge case: a pointerdown on a trigger inside a focusable container
  // also fires a later focusin outside; ignore that focusin once we already saw
  // the pointerdown.
  if (event.type === 'focusin' && hasPointerDownOutside)
    event.preventDefault();
}
</script>

<template>
  <DialogContentImpl
    :ref="forwardRef"
    :as="as"
    :role="role"
    :trap-focus="false"
    :disable-outside-pointer-events="false"
    @open-auto-focus="emit('openAutoFocus', $event)"
    @close-auto-focus="onCloseAutoFocus"
    @escape-key-down="emit('escapeKeyDown', $event)"
    @pointer-down-outside="emit('pointerDownOutside', $event)"
    @focus-outside="emit('focusOutside', $event)"
    @interact-outside="onInteractOutside"
    @dismiss="emit('dismiss')"
  >
    <slot />
  </DialogContentImpl>
</template>
