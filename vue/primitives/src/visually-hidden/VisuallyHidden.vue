<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface VisuallyHiddenProps extends PrimitiveProps {
  /**
   * Exclude the element from the accessibility tree entirely.
   * Useful when the content is purely decorative and must not be announced.
   * @default false
   */
  feature?: 'focusable' | 'hidden';
}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';

const { as = 'span', feature = 'focusable' } = defineProps<VisuallyHiddenProps>();

const { forwardRef } = useForwardExpose();

const style = {
  position: 'absolute',
  top: '-1px',
  left: '-1px',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  wordWrap: 'normal',
  border: '0',
} as const;
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :style="style"
    :tabindex="feature === 'hidden' ? -1 : undefined"
    :aria-hidden="feature === 'hidden' ? true : undefined"
    :data-visually-hidden="feature"
  >
    <slot />
  </Primitive>
</template>
