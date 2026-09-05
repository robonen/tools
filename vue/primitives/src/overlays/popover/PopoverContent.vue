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
import { Presence } from '../../utilities/presence';
import { useForwardExpose, useForwardProps } from '@robonen/vue';
import { usePopoverContext } from './context';

const { forceMount = false, ...contentProps } = defineProps<PopoverContentProps>();
// Forward only what the consumer set: a spread would also hand down Vue's
// `false` for every absent Boolean and override the child's own defaults.
const forwardedProps = useForwardProps(contentProps);
const emit = defineEmits<PopoverContentEmits>();

const ctx = usePopoverContext();
const { forwardRef } = useForwardExpose();
</script>

<template>
  <Presence :present="ctx.open.value" :force-mount="forceMount">
    <PopoverContentModal
      v-if="ctx.modal.value"
      v-bind="forwardedProps"
      :ref="forwardRef"
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
      v-bind="forwardedProps"
      :ref="forwardRef"
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
