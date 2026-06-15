<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The two valid layout directions a separator can take. Mirrors the binary
 * orientation contract shared across orientation-aware primitives.
 */
export type SeparatorOrientation = 'horizontal' | 'vertical';

/**
 * A thin visual divider that separates and gives meaning to groups of content,
 * such as items in a menu, sections of a toolbar, or rows in a list. Renders
 * horizontally or vertically and, unless marked `decorative`, exposes
 * `role="separator"` with the matching `aria-orientation` to assistive
 * technology. Use it to break up related content into distinct regions.
 *
 * For slot-merging composition (rendering onto a consumer-provided element
 * instead of an extra wrapper) pass `as="template"` — the underlying
 * `Primitive` merges its props/ref onto the single child of the default slot.
 */
export interface SeparatorProps extends PrimitiveProps {
  /**
   * The orientation of the separator. Any value other than `'vertical'` is
   * normalized to `'horizontal'`, so `data-orientation` is always a valid
   * token even when an unexpected value is supplied.
   * @default 'horizontal'
   */
  orientation?: SeparatorOrientation;
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
import { Primitive } from '../../internal/primitive';
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';

const { orientation = 'horizontal', decorative = false, as = 'div' } = defineProps<SeparatorProps>();

const { forwardRef } = useForwardExpose();

// Normalize any unexpected runtime value to a valid token. `aria-orientation`
// defaults to `horizontal`, so it is only emitted when the separator is
// actually vertical.
const resolvedOrientation = computed<SeparatorOrientation>(() =>
  orientation === 'vertical' ? 'vertical' : 'horizontal');

const ariaProps = computed(() => decorative
  ? { role: 'none' as const }
  : {
      role: 'separator' as const,
      'aria-orientation': resolvedOrientation.value === 'vertical' ? 'vertical' as const : undefined,
    });
</script>

<template>
  <Primitive :ref="forwardRef" :as="as" :data-orientation="resolvedOrientation" v-bind="ariaProps">
    <slot />
  </Primitive>
</template>
