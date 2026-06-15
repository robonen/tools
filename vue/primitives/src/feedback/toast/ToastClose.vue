<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A button that dismisses the toast it lives in. Renders a button by default and
 * closes the parent `ToastRoot` via toast context on click. Its visible content
 * is excluded from the screen-reader announcement (an icon-only "×" carries no
 * meaning out of context).
 */
export interface ToastCloseProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { computed } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { useToastContext } from './context';
import ToastAnnounceExclude from './ToastAnnounceExclude.vue';

const { as = 'button' } = defineProps<ToastCloseProps>();
const { forwardRef } = useForwardExpose();
const toastCtx = useToastContext();

// Avoid an implicit form submit when rendered as a native button.
const buttonType = computed(() => (as === 'button' ? 'button' : undefined));
</script>

<template>
  <ToastAnnounceExclude as="template">
    <Primitive
      :ref="forwardRef"
      :as="as"
      :type="buttonType"
      data-primitives-toast-close
      @click="toastCtx.onClose()"
    >
      <slot />
    </Primitive>
  </ToastAnnounceExclude>
</template>
