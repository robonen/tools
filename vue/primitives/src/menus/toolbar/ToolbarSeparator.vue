<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A visual divider that delimits groups of controls inside a `ToolbarRoot`,
 * exposed as `role="separator"`. When `orientation` is omitted it inherits the
 * opposite of the toolbar's orientation (a horizontal toolbar gets a vertical
 * separator), so it sits correctly across the line of items by default. Mark it
 * `decorative` to drop it from the accessibility tree entirely.
 */
export interface ToolbarSeparatorProps extends PrimitiveProps {
  orientation?: 'horizontal' | 'vertical';
  /**
   * When `true` the separator is purely decorative and is hidden from
   * assistive technology (`role="none"`, no `aria-orientation`). Otherwise it
   * exposes `role="separator"` and its `aria-orientation`.
   * @default false
   */
  decorative?: boolean;
}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { useToolbarContext } from './context';

const { as = 'span', orientation, decorative = false } = defineProps<ToolbarSeparatorProps>();
const { forwardRef } = useForwardExpose();
const ctx = useToolbarContext();
// If no orientation passed, inherit from toolbar — but invert (horizontal toolbar needs vertical separator).
const effective = computed(() => orientation ?? (ctx.orientation.value === 'horizontal' ? 'vertical' : 'horizontal'));

const ariaProps = computed(() => decorative
  ? { role: 'none' as const, 'aria-orientation': undefined }
  : { role: 'separator' as const, 'aria-orientation': effective.value });
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :data-orientation="effective"
    v-bind="ariaProps"
  >
    <slot />
  </Primitive>
</template>
