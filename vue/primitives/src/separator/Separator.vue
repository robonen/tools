<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A thin visual divider that separates and gives meaning to groups of content,
 * such as items in a menu, sections of a toolbar, or rows in a list. Renders
 * horizontally or vertically and, unless marked `decorative`, exposes
 * `role="separator"` with the matching `aria-orientation` to assistive
 * technology. Use it to break up related content into distinct regions.
 */
export interface SeparatorProps extends PrimitiveProps {
  /** The orientation of the separator. */
  orientation?: 'horizontal' | 'vertical';
  /**
   * When `true` the separator is purely decorative and is hidden from
   * assistive technology (no role, `aria-hidden`). Otherwise it exposes
   * `role="separator"` and the correct `aria-orientation`.
   * @default false
   */
  decorative?: boolean;
}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';

const { orientation = 'horizontal', decorative = false, as = 'div' } = defineProps<SeparatorProps>();

const { forwardRef } = useForwardExpose();

const ariaProps = computed(() => decorative
  ? { role: 'none' as const }
  : {
      role: 'separator' as const,
      'aria-orientation': orientation === 'vertical' ? 'vertical' as const : undefined,
    });
</script>

<template>
  <Primitive :ref="forwardRef" :as="as" :data-orientation="orientation" v-bind="ariaProps">
    <slot />
  </Primitive>
</template>
