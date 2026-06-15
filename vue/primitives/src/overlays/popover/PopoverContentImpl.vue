<script lang="ts">
import type { DismissableLayerEmits } from '../../utilities/dismissable-layer';
import type { FocusScopeEmits } from '../../utilities/focus-scope';
import type { PopperContentProps } from '../popper';

/**
 * Internal shared implementation behind PopoverContent — wraps a FocusScope, a
 * DismissableLayer, and a PopperContent and applies the popover ARIA wiring and
 * `--popover-*` style variables. Not exported; the modal and non-modal Content
 * variants render this with the appropriate flags.
 */
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

/**
 * Static `--popover-*` CSS-variable mappings forwarded to PopperContent. The
 * values never change (pure `var(--popper-*)` references), so the object is
 * hoisted to module scope with a stable, frozen identity. PopperContent
 * re-positions on every animation frame while open (updatePositionStrategy
 * 'always'); a stable reference lets Vue short-circuit the :style diff and
 * removes a per-render object allocation on that hot path.
 */
const POPOVER_CONTENT_STYLE = Object.freeze({
  '--popover-content-transform-origin': 'var(--popper-transform-origin)',
  '--popover-content-available-width': 'var(--popper-available-width)',
  '--popover-content-available-height': 'var(--popper-available-height)',
  '--popover-trigger-width': 'var(--popper-anchor-width)',
  '--popover-trigger-height': 'var(--popper-anchor-height)',
});
</script>

<script setup lang="ts">
import { DismissableLayer } from '../../utilities/dismissable-layer';
import { FocusScope } from '../../utilities/focus-scope';
import { PopperContent } from '../popper';
import { useFocusGuard, useForwardExpose } from '@robonen/vue';
import { usePopoverContext } from './context';

const {
  trapFocus = false,
  disableOutsidePointerEvents = false,
  as = 'div',
  ...popperProps
} = defineProps<PopoverContentImplProps>();

const emit = defineEmits<PopoverContentImplEmits>();

const ctx = usePopoverContext();
const { forwardRef } = useForwardExpose();

// Insert tabbable focus-guard sentinels at the document edges so focusin/out
// are caught consistently and Tab cannot escape into the browser chrome.
useFocusGuard();
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
        :ref="forwardRef"
        :as="as"
        v-bind="popperProps"
        :data-state="ctx.open.value ? 'open' : 'closed'"
        :aria-labelledby="ctx.triggerId.value"
        role="dialog"
        :style="POPOVER_CONTENT_STYLE"
      >
        <slot />
      </PopperContent>
    </DismissableLayer>
  </FocusScope>
</template>
