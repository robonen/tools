<script setup lang="ts">
import type { DialogContentImplEmits, DialogContentImplProps } from './DialogContentImpl.vue';
import type { VoidFunction } from '@robonen/stdlib';
import { onBeforeUnmount, watch } from 'vue';
import { useBodyScrollLock, useForwardExpose } from '@robonen/vue';
import { useHideOthers } from '../../internal/utils/useHideOthers';
import { useDialogContext } from './context';
import DialogContentImpl from './DialogContentImpl.vue';

const { as = 'div', role = 'dialog' } = defineProps<DialogContentImplProps>();
const emit = defineEmits<DialogContentImplEmits>();

const ctx = useDialogContext();
const { forwardRef, currentElement } = useForwardExpose();

watch(currentElement, (el) => {
  ctx.contentElement.value = el as HTMLElement | undefined;
}, { immediate: true, flush: 'post' });

useHideOthers(currentElement);

let release: VoidFunction | null = null;
watch(() => ctx.open.value, (open) => {
  if (open && !release) release = useBodyScrollLock();
  else if (!open && release) {
    release();
    release = null;
  }
}, { immediate: true, flush: 'post' });

onBeforeUnmount(() => {
  release?.();
  release = null;
});

function onCloseAutoFocus(event: Event) {
  emit('closeAutoFocus', event);
  // The trap restores focus to the previously-focused element on its own, but a
  // consumer may have re-pointed focus; pin it back to the trigger explicitly so
  // a programmatically-opened modal still returns focus to its origin.
  if (!event.defaultPrevented) {
    event.preventDefault();
    ctx.triggerElement.value?.focus();
  }
}

function onPointerDownOutside(event: PointerEvent | MouseEvent) {
  emit('pointerDownOutside', event);
  // A right-click (or ctrl+left on macOS) on the overlay opens a context menu —
  // it should not be treated as a dismiss gesture, mirroring a real overlay click.
  const isRightClick = event.button === 2 || (event.button === 0 && event.ctrlKey);
  if (isRightClick) event.preventDefault();
}

function onFocusOutside(event: FocusEvent) {
  emit('focusOutside', event);
  // While focus is trapped a stray `focusout`/`focusin` can still fire; never let
  // it drive a dismiss, the trap will pull focus back inside.
  event.preventDefault();
}
</script>

<template>
  <DialogContentImpl
    :ref="forwardRef"
    :as="as"
    :role="role"
    :trap-focus="ctx.open.value"
    :disable-outside-pointer-events="true"
    @open-auto-focus="emit('openAutoFocus', $event)"
    @close-auto-focus="onCloseAutoFocus"
    @escape-key-down="emit('escapeKeyDown', $event)"
    @pointer-down-outside="onPointerDownOutside"
    @focus-outside="onFocusOutside"
    @interact-outside="emit('interactOutside', $event)"
    @dismiss="emit('dismiss')"
  >
    <slot />
  </DialogContentImpl>
</template>
