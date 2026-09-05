<script setup lang="ts">
import type { PopoverContentImplEmits, PopoverContentImplProps } from './PopoverContentImpl.vue';
import PopoverContentImpl from './PopoverContentImpl.vue';
import { ref } from 'vue';
import { useBodyScrollLock, useForwardExpose, useForwardProps } from '@robonen/vue';
import { useHideOthers } from '../../internal/utils/useHideOthers';
import { usePopoverContext } from './context';

const props = defineProps<PopoverContentImplProps>();
// Forward only what the consumer set: a spread would also hand down Vue's
// `false` for every absent Boolean and override the child's own defaults.
const forwardedProps = useForwardProps(props);
const emit = defineEmits<PopoverContentImplEmits>();

const ctx = usePopoverContext();
const isRightClickOutsideRef = ref(false);

const { forwardRef, currentElement } = useForwardExpose();

useBodyScrollLock();
// Modal popovers hide every sibling tree from assistive tech so screen readers
// stay scoped to the content while it is open (parity with Dialog/Menu).
useHideOthers(currentElement);
</script>

<template>
  <PopoverContentImpl
    v-bind="forwardedProps"
    :ref="forwardRef"
    :trap-focus="ctx.open.value"
    disable-outside-pointer-events
    @close-auto-focus.prevent="(event: Event) => {
      emit('closeAutoFocus', event);
      if (!isRightClickOutsideRef) ctx.triggerElement.value?.focus();
    }"
    @pointer-down-outside="(event: PointerEvent | MouseEvent) => {
      emit('pointerDownOutside', event);
      const ctrlLeftClick = event.button === 0 && event.ctrlKey === true;
      isRightClickOutsideRef = event.button === 2 || ctrlLeftClick;
    }"
    @focus-outside.prevent
    @escape-key-down="emit('escapeKeyDown', $event)"
    @interact-outside="emit('interactOutside', $event)"
    @dismiss="emit('dismiss')"
    @open-auto-focus="emit('openAutoFocus', $event)"
  >
    <slot />
  </PopoverContentImpl>
</template>
