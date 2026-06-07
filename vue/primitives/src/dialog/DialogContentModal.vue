<script setup lang="ts">
import type { DialogContentImplEmits, DialogContentImplProps } from './DialogContentImpl.vue';
import type { VoidFunction } from '@robonen/stdlib';
import { onBeforeUnmount, watch } from 'vue';
import { useBodyScrollLock, useForwardExpose } from '@robonen/vue';
import { useHideOthers } from '../utils/useHideOthers';
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
</script>

<template>
  <DialogContentImpl
    :ref="forwardRef"
    :as="as"
    :role="role"
    :trap-focus="ctx.open.value"
    :disable-outside-pointer-events="true"
    @open-auto-focus="emit('openAutoFocus', $event)"
    @close-auto-focus="emit('closeAutoFocus', $event)"
    @escape-key-down="emit('escapeKeyDown', $event)"
    @pointer-down-outside="emit('pointerDownOutside', $event)"
    @focus-outside="emit('focusOutside', $event)"
    @interact-outside="emit('interactOutside', $event)"
    @dismiss="emit('dismiss')"
  >
    <slot />
  </DialogContentImpl>
</template>
