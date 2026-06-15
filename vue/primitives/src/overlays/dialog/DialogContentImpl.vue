<script lang="ts">
import type { DismissableLayerEmits } from '../../utilities/dismissable-layer';
import type { FocusScopeEmits } from '../../utilities/focus-scope';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * Internal shared implementation behind DialogContent — wraps a FocusScope and
 * a DismissableLayer and applies the dialog ARIA wiring. Not exported; the modal
 * and non-modal Content variants render this with the appropriate flags.
 */
export interface DialogContentImplProps extends PrimitiveProps {
  /** Trap focus inside the content (modal dialogs). */
  trapFocus?: boolean;
  /** Block outside pointer events (modal dialogs). */
  disableOutsidePointerEvents?: boolean;
  /** ARIA role on the content. Defaults to 'dialog'; use 'alertdialog' for AlertDialog. */
  role?: 'dialog' | 'alertdialog';
}

export interface DialogContentImplEmits {
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
import { onMounted } from 'vue';
import { getActiveElement } from '@robonen/platform/browsers';
import { useForwardExpose } from '@robonen/vue';
import { DismissableLayer } from '../../utilities/dismissable-layer';
import { FocusScope } from '../../utilities/focus-scope';
import { useDialogContext } from './context';
import { useDialogAccessibilityWarning } from './utils';

const {
  as = 'div',
  trapFocus = false,
  disableOutsidePointerEvents = false,
  role = 'dialog',
} = defineProps<DialogContentImplProps>();

const emit = defineEmits<DialogContentImplEmits>();
const ctx = useDialogContext();

const { forwardRef, currentElement } = useForwardExpose();

onMounted(() => {
  // Preserve the focus origin when the dialog was opened programmatically
  // (v-model / `onOpen`) without a DialogTrigger: capture whatever was focused
  // so close-restore and the non-modal trigger-containment guard still work.
  if (!ctx.triggerElement.value) {
    const active = getActiveElement();
    if (active && active !== active.ownerDocument.body)
      ctx.triggerElement.value = active;
  }
});

useDialogAccessibilityWarning({
  titleId: ctx.titleId,
  descriptionId: ctx.descriptionId,
  contentElement: currentElement,
});
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
      :id="ctx.contentId.value"
      :ref="forwardRef"
      :as="as"
      :disable-outside-pointer-events="disableOutsidePointerEvents"
      :role="role"
      :aria-modal="disableOutsidePointerEvents ? 'true' : undefined"
      :aria-labelledby="ctx.titleId.value"
      :aria-describedby="ctx.descriptionId.value"
      :data-state="ctx.open.value ? 'open' : 'closed'"
      @escape-key-down="emit('escapeKeyDown', $event)"
      @pointer-down-outside="emit('pointerDownOutside', $event)"
      @focus-outside="emit('focusOutside', $event)"
      @interact-outside="emit('interactOutside', $event)"
      @dismiss="ctx.onClose"
    >
      <slot />
    </DismissableLayer>
  </FocusScope>
</template>
