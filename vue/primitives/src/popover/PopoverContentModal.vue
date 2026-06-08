<script setup lang="ts">
import type { PopoverContentImplEmits, PopoverContentImplProps } from './PopoverContentImpl.vue';
import PopoverContentImpl from './PopoverContentImpl.vue';
import { ref } from 'vue';
import { useBodyScrollLock } from '@robonen/vue';
import { usePopoverContext } from './context';

const props = defineProps<PopoverContentImplProps>();
const emit = defineEmits<PopoverContentImplEmits>();

const ctx = usePopoverContext();
const isRightClickOutsideRef = ref(false);

useBodyScrollLock();
</script>

<template>
  <PopoverContentImpl
    v-bind="props"
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
