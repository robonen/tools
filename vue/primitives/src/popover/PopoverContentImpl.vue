<script lang="ts">
import type { DismissableLayerEmits } from '../dismissable-layer';
import type { FocusScopeEmits } from '../focus-scope';
import type { PopperContentProps } from '../popper';

export interface PopoverContentImplProps extends PopperContentProps {
  /** Trap focus inside the content (modal popovers). */
  trapFocus?: boolean;
  /** Block outside pointer events (modal popovers). */
  disableOutsidePointerEvents?: boolean;
}

export interface PopoverContentImplEmits {
  openAutoFocus: FocusScopeEmits['mountAutoFocus'];
  closeAutoFocus: FocusScopeEmits['unmountAutoFocus'];
  escapeKeyDown: DismissableLayerEmits['escapeKeyDown'];
  pointerDownOutside: DismissableLayerEmits['pointerDownOutside'];
  focusOutside: DismissableLayerEmits['focusOutside'];
  interactOutside: DismissableLayerEmits['interactOutside'];
  dismiss: [];
}
</script>

<script setup lang="ts">
import { DismissableLayer } from '../dismissable-layer';
import { FocusScope } from '../focus-scope';
import { PopperContent } from '../popper';
import { usePopoverContext } from './context';

const {
  trapFocus = false,
  disableOutsidePointerEvents = false,
  as = 'div',
  ...popperProps
} = defineProps<PopoverContentImplProps>();

const emit = defineEmits<PopoverContentImplEmits>();

const ctx = usePopoverContext();
</script>

<template>
  <FocusScope
    as="template"
    :loop="true"
    :trapped="trapFocus"
    @mount-auto-focus="emit('openAutoFocus', $event)"
    @unmount-auto-focus="emit('closeAutoFocus', $event)"
  >
    <DismissableLayer
      as="template"
      :disable-outside-pointer-events="disableOutsidePointerEvents"
      @escape-key-down="emit('escapeKeyDown', $event)"
      @pointer-down-outside="emit('pointerDownOutside', $event)"
      @focus-outside="emit('focusOutside', $event)"
      @interact-outside="emit('interactOutside', $event)"
      @dismiss="ctx.onOpenChange(false)"
    >
      <PopperContent
        :id="ctx.contentId.value"
        :as="as"
        v-bind="popperProps"
        :data-state="ctx.open.value ? 'open' : 'closed'"
        :aria-labelledby="ctx.triggerId.value"
        role="dialog"
        :style="{
          '--popover-content-transform-origin': 'var(--popper-transform-origin)',
          '--popover-content-available-width': 'var(--popper-available-width)',
          '--popover-content-available-height': 'var(--popper-available-height)',
          '--popover-trigger-width': 'var(--popper-anchor-width)',
          '--popover-trigger-height': 'var(--popper-anchor-height)',
        }"
      >
        <slot />
      </PopperContent>
    </DismissableLayer>
  </FocusScope>
</template>
