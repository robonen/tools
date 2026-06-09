<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * An actionable control inside a toast (e.g. "Undo" or "View"). Renders a button by
 * default and requires `altText` so the action remains understandable to assistive
 * technology even when the toast is announced out of context.
 */
export interface ToastActionProps extends PrimitiveProps {
  /**
   * Accessible description for screen readers (required).
   * Describes what happens when the user triggers the action.
   */
  altText: string;
}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';

import { Primitive } from '../primitive';

const { as = 'button', altText } = defineProps<ToastActionProps>();
const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :aria-label="altText"
    data-primitives-toast-action
  >
    <slot />
  </Primitive>
</template>
