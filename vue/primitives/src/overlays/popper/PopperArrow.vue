<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { Side } from './utils';

const OPPOSITE_SIDE: Record<Side, Side> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
};

// Hoisted to module scope — one allocation per module load instead of one per
// render. Values are primitive strings, so objects are frozen-in-practice.
const TRANSFORM_ORIGIN: Record<Side, string> = {
  top: '',
  right: '0 0',
  bottom: 'center 0',
  left: '100% 0',
};

const TRANSFORM: Record<Side, string> = {
  top: 'translateY(100%)',
  right: 'translateY(50%) rotate(90deg) translateX(-50%)',
  bottom: 'rotate(180deg)',
  left: 'translateY(50%) rotate(-90deg) translateX(50%)',
};

// Default arrow geometry, sized against the 12×6 viewBox so the SVG scales to
// any width/height via preserveAspectRatio="none".
const ARROW_PATH = 'M0 0L6 6L12 0';
const ARROW_PATH_ROUNDED = 'M0 0L4.58579 4.58579C5.36683 5.36683 6.63316 5.36684 7.41421 4.58579L12 0';

/**
 * An optional arrow/pointer rendered inside `PopperContent` that points back at
 * the anchor. It reads the resolved side and arrow offset from the content
 * context to position and rotate itself against the correct edge, and hides
 * automatically when it cannot be centered. By default it renders a real `<svg>`
 * triangle (a `rounded` variant is available); supply your own SVG/element via
 * the default slot, or switch the rendered element with `as`. Must be a child of
 * `PopperContent`.
 */
export interface PopperArrowProps extends PrimitiveProps {
  /** Arrow width in pixels. @default 10 */
  width?: number;
  /** Arrow height in pixels. @default 5 */
  height?: number;
  /** Render the rounded variant of the default arrow path. Ignored when a custom default slot or `as="template"` is used. @default false */
  rounded?: boolean;
}
</script>

<script setup lang="ts">
import type { CSSProperties, ComponentPublicInstance } from 'vue';
import { Primitive } from '../../internal/primitive';
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { usePopperContentContext } from './context';

const { as = 'svg', width = 10, height = 5, rounded = false } = defineProps<PopperArrowProps>();

const { forwardRef } = useForwardExpose();
const contentContext = usePopperContentContext();
const baseSide = computed(() => OPPOSITE_SIDE[contentContext.placedSide.value]);

// When the consumer merges the arrow onto their own element (`as="template"`)
// the intrinsic SVG attributes would be invalid, so they are only applied to a
// real rendered element. Mirrors the slot-merge escape hatch of `Primitive`.
const isTemplate = computed(() => as === 'template');
const arrowPath = computed(() => (rounded ? ARROW_PATH_ROUNDED : ARROW_PATH));

// Memoize the wrapper style. PopperArrow re-renders on every scroll/resize/
// layout-shift frame while open; binding an inline object literal would
// re-allocate it and re-read every ref + re-run both table lookups each frame.
// A computed caches the object and recomputes only when its tracked deps change.
const wrapperStyle = computed(() => {
  const placedSide = contentContext.placedSide.value;
  const arrowX = contentContext.arrowX.value;
  const arrowY = contentContext.arrowY.value;
  return {
    position: 'absolute',
    left: arrowX ? `${arrowX}px` : undefined,
    top: arrowY ? `${arrowY}px` : undefined,
    [baseSide.value]: 0,
    transformOrigin: TRANSFORM_ORIGIN[placedSide],
    transform: TRANSFORM[placedSide],
    visibility: contentContext.shouldHideArrow.value ? 'hidden' : undefined,
  } as CSSProperties;
});
</script>

<template>
  <span
    :ref="(el: Element | ComponentPublicInstance | null) => {
      contentContext.onArrowChange((el as HTMLElement) ?? undefined);
      return undefined;
    }"
    :style="wrapperStyle"
  >
    <Primitive
      :ref="forwardRef"
      :as="as"
      :style="{ display: 'block' }"
      :width="width"
      :height="height"
      :viewBox="isTemplate ? undefined : '0 0 12 6'"
      :preserveAspectRatio="isTemplate ? undefined : 'none'"
    >
      <slot>
        <path :d="arrowPath" />
      </slot>
    </Primitive>
  </span>
</template>
