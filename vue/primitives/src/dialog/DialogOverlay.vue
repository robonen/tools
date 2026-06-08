<script lang="ts">
import type { PrimitiveProps } from '../primitive';

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
