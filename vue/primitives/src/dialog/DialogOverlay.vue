<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A full-screen layer rendered behind the Content that dims and covers the page
 * while a modal dialog is open. Only renders in modal mode; omit it for
 * non-modal dialogs.
 */
export interface DialogOverlayProps extends PrimitiveProps {
  /**
   * Keep overlay mounted even when the dialog is closed — useful for CSS
   * exit animations.
   * @default false
   */
  forceMount?: boolean;
}
</script>

<script setup lang="ts">
import { Presence } from '../presence';
import { Primitive } from '../primitive';
import { useDialogContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'div', forceMount = false } = defineProps<DialogOverlayProps>();
const { forwardRef } = useForwardExpose();
const ctx = useDialogContext();
</script>

<template>
  <Presence v-if="ctx.modal.value" :present="ctx.open.value" :force-mount="forceMount">
    <Primitive
      :ref="forwardRef"
      :as="as"
      :data-state="ctx.open.value ? 'open' : 'closed'"
      :style="{ pointerEvents: 'auto' }"
    >
      <slot />
    </Primitive>
  </Presence>
</template>
