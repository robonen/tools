<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * An actionable control inside a toast (e.g. "Undo" or "View"). Renders a button by
 * default and requires `altText` so the action remains understandable to assistive
 * technology even when the toast is announced out of context — `altText` is read by
 * the announce region in place of the button's visible label.
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

import { Primitive } from '../../internal/primitive';
import ToastAnnounceExclude from './ToastAnnounceExclude.vue';

const { as = 'button', altText } = defineProps<ToastActionProps>();

if (!altText)
  throw new Error('Missing required prop `altText` on `ToastAction`.');

const { forwardRef } = useForwardExpose();
</script>

<template>
  <ToastAnnounceExclude
    as="template"
    :alt-text="altText"
  >
    <Primitive
      :ref="forwardRef"
      :as="as"
      :aria-label="altText"
      data-primitives-toast-action
    >
      <slot />
    </Primitive>
  </ToastAnnounceExclude>
</template>
