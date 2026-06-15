<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The `'item-aligned'` positioning strategy for the content panel: positions the
 * panel like a native MacOS menu by vertically centring the selected option
 * against the trigger, horizontally aligning the selected item's text with the
 * trigger value, clamping to the viewport (collision margin), computing
 * min/max height, supporting `dir="rtl"`, growing on scroll, and repositioning
 * on trigger resize. Chosen internally by `SelectContentImpl` when `position`
 * is `'item-aligned'`.
 */
export interface SelectItemAlignedPositionProps extends PrimitiveProps {
  /** Reading direction, forwarded from the root. */
  dir?: string;
}

export interface SelectItemAlignedPositionEmits {
  placed: [];
}
</script>

<script setup lang="ts">
import { nextTick, onMounted, ref, shallowRef } from 'vue';

import { useForwardExpose, useResizeObserver } from '@robonen/vue';
import { clamp } from '@robonen/stdlib';
import { Primitive } from '../../internal/primitive';
import {
  provideSelectItemAlignedPositionContext,
  useSelectContentContext,
  useSelectRootContext,
} from './context';
import { CONTENT_MARGIN } from './utils';

const { as = 'div' } = defineProps<SelectItemAlignedPositionProps>();
const emit = defineEmits<SelectItemAlignedPositionEmits>();

defineOptions({ inheritAttrs: false });

const { forwardRef, currentElement: contentElement } = useForwardExpose();
const rootCtx = useSelectRootContext();
const contentCtx = useSelectContentContext();

const contentWrapper = shallowRef<HTMLElement | undefined>(undefined);
const shouldExpandOnScrollRef = ref(false);
const shouldRepositionRef = ref(true);
const contentZIndex = ref('');

function position() {
  const trigger = rootCtx.triggerElement.value;
  const valueNode = rootCtx.valueElement.value;
  const wrapper = contentWrapper.value;
  const content = contentElement.value;
  const viewport = contentCtx.viewportRef.value;
  const selectedItem = contentCtx.selectedItemRef.value;
  const selectedItemText = contentCtx.selectedItemTextRef.value;

  if (!trigger || !valueNode || !wrapper || !content || !viewport || !selectedItem || !selectedItemText) {
    emit('placed');
    return;
  }

  const triggerRect = trigger.getBoundingClientRect();

  // --- Horizontal positioning ---
  const contentRect = content.getBoundingClientRect();
  const valueNodeRect = valueNode.getBoundingClientRect();
  const itemTextRect = selectedItemText.getBoundingClientRect();

  if (rootCtx.dir.value !== 'rtl') {
    const itemTextOffset = itemTextRect.left - contentRect.left;
    const left = valueNodeRect.left - itemTextOffset;
    const leftDelta = triggerRect.left - left;
    const minContentWidth = triggerRect.width + leftDelta;
    const contentWidth = Math.max(minContentWidth, contentRect.width);
    const rightEdge = window.innerWidth - CONTENT_MARGIN;
    const clampedLeft = clamp(left, CONTENT_MARGIN, Math.max(CONTENT_MARGIN, rightEdge - contentWidth));

    wrapper.style.minWidth = `${minContentWidth}px`;
    wrapper.style.left = `${clampedLeft}px`;
  }
  else {
    const itemTextOffset = contentRect.right - itemTextRect.right;
    const right = window.innerWidth - valueNodeRect.right - itemTextOffset;
    const rightDelta = window.innerWidth - triggerRect.right - right;
    const minContentWidth = triggerRect.width + rightDelta;
    const contentWidth = Math.max(minContentWidth, contentRect.width);
    const leftEdge = window.innerWidth - CONTENT_MARGIN;
    const clampedRight = clamp(right, CONTENT_MARGIN, Math.max(CONTENT_MARGIN, leftEdge - contentWidth));

    wrapper.style.minWidth = `${minContentWidth}px`;
    wrapper.style.right = `${clampedRight}px`;
  }

  // --- Vertical positioning ---
  const items = Array.from(
    viewport.querySelectorAll<HTMLElement>('[data-primitives-select-item]'),
  );
  const availableHeight = window.innerHeight - CONTENT_MARGIN * 2;
  const itemsHeight = viewport.scrollHeight;

  const contentStyles = globalThis.getComputedStyle(content);
  const contentBorderTopWidth = Number.parseInt(contentStyles.borderTopWidth, 10) || 0;
  const contentPaddingTop = Number.parseInt(contentStyles.paddingTop, 10) || 0;
  const contentBorderBottomWidth = Number.parseInt(contentStyles.borderBottomWidth, 10) || 0;
  const contentPaddingBottom = Number.parseInt(contentStyles.paddingBottom, 10) || 0;
  const fullContentHeight = contentBorderTopWidth + contentPaddingTop + itemsHeight + contentPaddingBottom + contentBorderBottomWidth;
  const minContentHeight = Math.min(selectedItem.offsetHeight * 5, fullContentHeight);

  const viewportStyles = globalThis.getComputedStyle(viewport);
  const viewportPaddingTop = Number.parseInt(viewportStyles.paddingTop, 10) || 0;
  const viewportPaddingBottom = Number.parseInt(viewportStyles.paddingBottom, 10) || 0;

  const topEdgeToTriggerMiddle = triggerRect.top + triggerRect.height / 2 - CONTENT_MARGIN;
  const triggerMiddleToBottomEdge = availableHeight - topEdgeToTriggerMiddle;

  const selectedItemHalfHeight = selectedItem.offsetHeight / 2;
  const itemOffsetMiddle = selectedItem.offsetTop + selectedItemHalfHeight;
  const contentTopToItemMiddle = contentBorderTopWidth + contentPaddingTop + itemOffsetMiddle;
  const itemMiddleToContentBottom = fullContentHeight - contentTopToItemMiddle;

  const willAlignWithoutTopOverflow = contentTopToItemMiddle <= topEdgeToTriggerMiddle;

  if (willAlignWithoutTopOverflow) {
    const isLastItem = selectedItem === items.at(-1);
    wrapper.style.bottom = '0px';
    const viewportOffsetBottom = content.clientHeight - viewport.offsetTop - viewport.offsetHeight;
    const clampedTriggerMiddleToBottomEdge = Math.max(
      triggerMiddleToBottomEdge,
      selectedItemHalfHeight + (isLastItem ? viewportPaddingBottom : 0) + viewportOffsetBottom + contentBorderBottomWidth,
    );
    const height = contentTopToItemMiddle + clampedTriggerMiddleToBottomEdge;
    wrapper.style.height = `${height}px`;
  }
  else {
    const isFirstItem = selectedItem === items[0];
    wrapper.style.top = '0px';
    const clampedTopEdgeToTriggerMiddle = Math.max(
      topEdgeToTriggerMiddle,
      contentBorderTopWidth + viewport.offsetTop + (isFirstItem ? viewportPaddingTop : 0) + selectedItemHalfHeight,
    );
    const height = clampedTopEdgeToTriggerMiddle + itemMiddleToContentBottom;
    wrapper.style.height = `${height}px`;
    viewport.scrollTop = contentTopToItemMiddle - topEdgeToTriggerMiddle + viewport.offsetTop;
  }

  wrapper.style.margin = `${CONTENT_MARGIN}px 0`;
  wrapper.style.minHeight = `${minContentHeight}px`;
  wrapper.style.maxHeight = `${availableHeight}px`;

  emit('placed');
  requestAnimationFrame(() => (shouldExpandOnScrollRef.value = true));
}

onMounted(async () => {
  await nextTick();
  position();
  if (contentElement.value) {
    contentZIndex.value = globalThis.getComputedStyle(contentElement.value).zIndex;
  }
});

// When the scroll-up button mounts (because the viewport became scrollable at
// the top) it pushes the viewport down, throwing the alignment off; re-run once.
function handleScrollButtonChange(node: HTMLElement | undefined) {
  if (node && shouldRepositionRef.value) {
    position();
    contentCtx.focusSelectedItem();
    shouldRepositionRef.value = false;
  }
}

useResizeObserver(rootCtx.triggerElement, () => position());

provideSelectItemAlignedPositionContext({
  contentWrapper,
  shouldExpandOnScrollRef,
  onScrollButtonChange: handleScrollButtonChange,
});
</script>

<template>
  <div
    ref="contentWrapper"
    data-primitives-select-content-wrapper
    :style="{ display: 'flex', flexDirection: 'column', position: 'fixed', zIndex: contentZIndex }"
  >
    <Primitive
      :ref="forwardRef"
      :as="as"
      data-primitives-select-content
      :style="{ boxSizing: 'border-box', maxHeight: '100%' }"
      v-bind="$attrs"
    >
      <slot />
    </Primitive>
  </div>
</template>
