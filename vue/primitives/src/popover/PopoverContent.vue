<script lang="ts">
import type { PopoverContentImplEmits, PopoverContentImplProps } from './PopoverContentImpl.vue';

export interface PopoverContentProps extends PopoverContentImplProps {
  /** Keep mounted for CSS exit animations. */
  forceMount?: boolean;
}

export type PopoverContentEmits = PopoverContentImplEmits;
</script>

<script setup lang="ts">
import PopoverContentModal from './PopoverContentModal.vue';
import PopoverContentNonModal from './PopoverContentNonModal.vue';
import { Presence } from '../presence';
import { usePopoverContext } from './context';

const { forceMount = false, ...contentProps } = defineProps<PopoverContentProps>();
const emit = defineEmits<PopoverContentEmits>();

const ctx = usePopoverContext();
</script>

<template>
  <Presence :present="ctx.open.value" :force-mount="forceMount">
    <PopoverContentModal
      v-if="ctx.modal.value"
      v-bind="contentProps"
      @open-auto-focus="emit('openAutoFocus', $event)"
      @close-auto-focus="emit('closeAutoFocus', $event)"
      @escape-key-down="emit('escapeKeyDown', $event)"
      @pointer-down-outside="emit('pointerDownOutside', $event)"
      @focus-outside="emit('focusOutside', $event)"
      @interact-outside="emit('interactOutside', $event)"
      @dismiss="emit('dismiss')"
    >
      <slot />
    </PopoverContentModal>
    <PopoverContentNonModal
      v-else
      v-bind="contentProps"
      @open-auto-focus="emit('openAutoFocus', $event)"
      @close-auto-focus="emit('closeAutoFocus', $event)"
      @escape-key-down="emit('escapeKeyDown', $event)"
      @pointer-down-outside="emit('pointerDownOutside', $event)"
      @focus-outside="emit('focusOutside', $event)"
      @interact-outside="emit('interactOutside', $event)"
      @dismiss="emit('dismiss')"
    >
      <slot />
    </PopoverContentNonModal>
  </Presence>
</template>
