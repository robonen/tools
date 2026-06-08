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
</script>

<template>
  <DialogContentImpl
    :ref="forwardRef"
    :as="as"
    :role="role"
    :trap-focus="false"
    :disable-outside-pointer-events="false"
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
