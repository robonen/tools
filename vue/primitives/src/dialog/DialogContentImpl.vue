<script lang="ts">
import type { DismissableLayerEmits } from '../dismissable-layer';
import type { FocusScopeEmits } from '../focus-scope';
import type { PrimitiveProps } from '../primitive';

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
import { DismissableLayer } from '../dismissable-layer';
import { FocusScope } from '../focus-scope';
import { useDialogContext } from './context';

const {
  as = 'div',
  trapFocus = false,
  disableOutsidePointerEvents = false,
  role = 'dialog',
} = defineProps<DialogContentImplProps>();

const emit = defineEmits<DialogContentImplEmits>();
const ctx = useDialogContext();
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
