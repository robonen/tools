<script setup lang="ts">
import type { PopoverContentImplEmits, PopoverContentImplProps } from './PopoverContentImpl.vue';
import PopoverContentImpl from './PopoverContentImpl.vue';
import { ref } from 'vue';
import { useForwardExpose, useForwardProps } from '@robonen/vue';
import { usePopoverContext } from './context';

const props = defineProps<PopoverContentImplProps>();
// Forward only what the consumer set: a spread would also hand down Vue's
// `false` for every absent Boolean and override the child's own defaults.
const forwardedProps = useForwardProps(props);
const emit = defineEmits<PopoverContentImplEmits>();

const ctx = usePopoverContext();
const hasInteractedOutsideRef = ref(false);
const hasPointerDownOutsideRef = ref(false);

const { forwardRef } = useForwardExpose();
</script>

<template>
  <PopoverContentImpl
    v-bind="forwardedProps"
    :ref="forwardRef"
    :trap-focus="false"
    :disable-outside-pointer-events="false"
    @close-auto-focus="(event: Event) => {
      emit('closeAutoFocus', event);
      if (!event.defaultPrevented) {
        if (!hasInteractedOutsideRef) ctx.triggerElement.value?.focus();
        event.preventDefault();
      }
      hasInteractedOutsideRef = false;
      hasPointerDownOutsideRef = false;
    }"
    @interact-outside="(event: PointerEvent | MouseEvent | FocusEvent) => {
      emit('interactOutside', event);
      if (!event.defaultPrevented) {
        hasInteractedOutsideRef = true;
        if (event.type === 'pointerdown') hasPointerDownOutsideRef = true;
      }
      const target = event.target as HTMLElement;
      if (ctx.triggerElement.value?.contains(target)) event.preventDefault();
      if (event.type === 'focusin' && hasPointerDownOutsideRef) event.preventDefault();
    }"
    @escape-key-down="emit('escapeKeyDown', $event)"
    @pointer-down-outside="emit('pointerDownOutside', $event)"
    @focus-outside="emit('focusOutside', $event)"
    @dismiss="emit('dismiss')"
    @open-auto-focus="emit('openAutoFocus', $event)"
  >
    <slot />
  </PopoverContentImpl>
</template>
