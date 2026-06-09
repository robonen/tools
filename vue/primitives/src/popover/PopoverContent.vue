<script lang="ts">
import type { PopoverContentImplEmits, PopoverContentImplProps } from './PopoverContentImpl.vue';

/**
 * The floating panel itself — the positioned container for the popover's body.
 * Renders only while open and picks a modal or non-modal implementation from
 * the Root's `modal` setting: modal traps focus, locks body scroll, and blocks
 * outside pointer events; non-modal does none of these. Emits focus and
 * dismissal events so consumers can guard against closing.
 */
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
