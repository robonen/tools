<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * Visually hides its content while keeping it available to assistive
 * technology. The element is removed from the visual layout but stays in the
 * accessibility tree (and remains focusable) so screen readers can still
 * announce it. Use it for accessible labels, status text, or skip links that
 * should be heard but not seen — for example a hidden heading, an icon-only
 * button's name, or extra context for a control.
 */
export interface VisuallyHiddenProps extends PrimitiveProps {
  /**
   * How the content participates: `'focusable'` keeps it in the accessibility
   * tree and focusable (visually hidden only — e.g. skip links); `'hidden'`
   * additionally hides it from layout and focus.
   * @default 'focusable'
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
