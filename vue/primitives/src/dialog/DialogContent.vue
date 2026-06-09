<script lang="ts">
import type { DialogContentImplEmits, DialogContentImplProps } from './DialogContentImpl.vue';

/**
 * The dialog panel itself — the container for Title, Description, and the body.
 * Renders only while open and picks a modal or non-modal implementation from
 * the Root's `modal` setting: modal traps focus, locks body scroll, and hides
 * the rest of the page from assistive tech; non-modal does none of these. Emits
 * focus and dismissal events so consumers can guard against closing.
 */
export interface DialogContentProps extends Omit<DialogContentImplProps, 'trapFocus' | 'disableOutsidePointerEvents'> {
  /** Keep mounted for CSS exit animations. */
  forceMount?: boolean;
}

export type DialogContentEmits = DialogContentImplEmits;
</script>

<script setup lang="ts">
import { Presence } from '../presence';
import { useDialogContext } from './context';
import DialogContentModal from './DialogContentModal.vue';
import DialogContentNonModal from './DialogContentNonModal.vue';

const { as = 'div', forceMount = false, role = 'dialog' } = defineProps<DialogContentProps>();
const emit = defineEmits<DialogContentEmits>();

const ctx = useDialogContext();
</script>

<template>
  <Presence :present="ctx.open.value" :force-mount="forceMount">
    <DialogContentModal
      v-if="ctx.modal.value"
      :as="as"
      :role="role"
      @open-auto-focus="emit('openAutoFocus', $event)"
      @close-auto-focus="emit('closeAutoFocus', $event)"
      @escape-key-down="emit('escapeKeyDown', $event)"
      @pointer-down-outside="emit('pointerDownOutside', $event)"
      @focus-outside="emit('focusOutside', $event)"
      @interact-outside="emit('interactOutside', $event)"
      @dismiss="emit('dismiss')"
    >
      <slot />
    </DialogContentModal>
    <DialogContentNonModal
      v-else
      :as="as"
      :role="role"
      @open-auto-focus="emit('openAutoFocus', $event)"
      @close-auto-focus="emit('closeAutoFocus', $event)"
      @escape-key-down="emit('escapeKeyDown', $event)"
      @pointer-down-outside="emit('pointerDownOutside', $event)"
      @focus-outside="emit('focusOutside', $event)"
      @interact-outside="emit('interactOutside', $event)"
      @dismiss="emit('dismiss')"
    >
      <slot />
    </DialogContentNonModal>
  </Presence>
</template>
