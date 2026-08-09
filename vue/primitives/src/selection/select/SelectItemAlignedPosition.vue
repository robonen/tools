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

// When nothing is selected the content adopts the first valid item as the
// alignment anchor, but only that item is registered — its text node registers
// solely for the *selected* value. Recover it from the item's own label
// association instead of demanding a second registration, which would mean
// writing to the anchor refs from inside the item's own tracking effect.
function itemTextOf(item: HTMLElement | undefined): HTMLElement | undefined {
  const id = item?.getAttribute('aria-labelledby');
  return id ? item?.ownerDocument.getElementById(id) ?? undefined : undefined;
}

/**
 * Inline styles the wrapper is positioned with. Written as one object and
 * committed in a single pass: every geometry read below happens before the
 * first write, so the browser performs one layout for the whole placement
 * instead of one per interleaved read.
 *
 * Both edges of each axis are always present. A resize can flip the vertical
 * branch, and leaving the previous edge behind would over-constrain the box.
 */
interface WrapperPlacement {
  minWidth: string;
  left: string;
  right: string;
  top: string;
  bottom: string;
  height: string;
  minHeight: string;
  maxHeight: string;
  margin: string;
}

const EMPTY_PLACEMENT: WrapperPlacement = {
  minWidth: '', left: '', right: '', top: '', bottom: '',
  height: '', minHeight: '', maxHeight: '', margin: '',
};

function commit(wrapper: HTMLElement, placement: Partial<WrapperPlacement>) {
  Object.assign(wrapper.style, EMPTY_PLACEMENT, placement);
}

function position() {
  const trigger = rootCtx.triggerElement.value;
  const valueNode = rootCtx.valueElement.value;
  const wrapper = contentWrapper.value;
  const content = contentElement.value;
  const viewport = contentCtx.viewportRef.value;
  const selectedItem = contentCtx.selectedItemRef.value;
  const selectedItemText = contentCtx.selectedItemTextRef.value ?? itemTextOf(selectedItem);

  if (!trigger || !wrapper || !content || !viewport) {
    emit('placed');
    return;
  }

  // Item-aligned placement centres the panel on the selected item, so without
  // one there is nothing to align to — an empty option list, or items that have
  // not registered yet. Drop the panel under the trigger instead of returning:
  // the wrapper is `position: fixed`, so leaving it unplaced pins it to the
  // viewport origin, where it reads as "the dropdown does not open".
  if (!valueNode || !selectedItem || !selectedItemText) {
    const rect = trigger.getBoundingClientRect();
    const rightEdge = window.innerWidth - CONTENT_MARGIN;
    commit(wrapper, {
      minWidth: `${rect.width}px`,
      left: `${clamp(rect.left, CONTENT_MARGIN, Math.max(CONTENT_MARGIN, rightEdge - rect.width))}px`,
      top: `${rect.bottom}px`,
      maxHeight: `${Math.max(0, window.innerHeight - rect.bottom - CONTENT_MARGIN)}px`,
    });
    emit('placed');
    return;
  }

  // --- Measure: every layout read lives here, before the first write ---
  const triggerRect = trigger.getBoundingClientRect();
  const contentRect = content.getBoundingClientRect();
  const valueNodeRect = valueNode.getBoundingClientRect();
  const itemTextRect = selectedItemText.getBoundingClientRect();

  const items = Array.from(
    viewport.querySelectorAll<HTMLElement>('[data-primitives-select-item]'),
  );
  const itemsHeight = viewport.scrollHeight;
  const viewportOffsetTop = viewport.offsetTop;
  const viewportOffsetHeight = viewport.offsetHeight;
  const contentClientHeight = content.clientHeight;
  const selectedItemHeight = selectedItem.offsetHeight;
  const selectedItemOffsetTop = selectedItem.offsetTop;

  const contentStyles = globalThis.getComputedStyle(content);
  const contentBorderTopWidth = Number.parseInt(contentStyles.borderTopWidth, 10) || 0;
  const contentPaddingTop = Number.parseInt(contentStyles.paddingTop, 10) || 0;
  const contentBorderBottomWidth = Number.parseInt(contentStyles.borderBottomWidth, 10) || 0;
  const contentPaddingBottom = Number.parseInt(contentStyles.paddingBottom, 10) || 0;

  const viewportStyles = globalThis.getComputedStyle(viewport);
  const viewportPaddingTop = Number.parseInt(viewportStyles.paddingTop, 10) || 0;
  const viewportPaddingBottom = Number.parseInt(viewportStyles.paddingBottom, 10) || 0;

  // --- Compute ---
  const placement: Partial<WrapperPlacement> = {};
  const availableHeight = window.innerHeight - CONTENT_MARGIN * 2;

  if (rootCtx.dir.value !== 'rtl') {
    const itemTextOffset = itemTextRect.left - contentRect.left;
    const left = valueNodeRect.left - itemTextOffset;
    const leftDelta = triggerRect.left - left;
    const minContentWidth = triggerRect.width + leftDelta;
    const contentWidth = Math.max(minContentWidth, contentRect.width);
    const rightEdge = window.innerWidth - CONTENT_MARGIN;

    placement.minWidth = `${minContentWidth}px`;
    placement.left = `${clamp(left, CONTENT_MARGIN, Math.max(CONTENT_MARGIN, rightEdge - contentWidth))}px`;
  }
  else {
    const itemTextOffset = contentRect.right - itemTextRect.right;
    const right = window.innerWidth - valueNodeRect.right - itemTextOffset;
    const rightDelta = window.innerWidth - triggerRect.right - right;
    const minContentWidth = triggerRect.width + rightDelta;
    const contentWidth = Math.max(minContentWidth, contentRect.width);
    const leftEdge = window.innerWidth - CONTENT_MARGIN;

    placement.minWidth = `${minContentWidth}px`;
    placement.right = `${clamp(right, CONTENT_MARGIN, Math.max(CONTENT_MARGIN, leftEdge - contentWidth))}px`;
  }

  const fullContentHeight = contentBorderTopWidth + contentPaddingTop + itemsHeight + contentPaddingBottom + contentBorderBottomWidth;
  const topEdgeToTriggerMiddle = triggerRect.top + triggerRect.height / 2 - CONTENT_MARGIN;
  const triggerMiddleToBottomEdge = availableHeight - topEdgeToTriggerMiddle;

  const selectedItemHalfHeight = selectedItemHeight / 2;
  const itemOffsetMiddle = selectedItemOffsetTop + selectedItemHalfHeight;
  const contentTopToItemMiddle = contentBorderTopWidth + contentPaddingTop + itemOffsetMiddle;
  const itemMiddleToContentBottom = fullContentHeight - contentTopToItemMiddle;

  let scrollTop: number | undefined;

  if (contentTopToItemMiddle <= topEdgeToTriggerMiddle) {
    const isLastItem = selectedItem === items.at(-1);
    const viewportOffsetBottom = contentClientHeight - viewportOffsetTop - viewportOffsetHeight;
    const clampedTriggerMiddleToBottomEdge = Math.max(
      triggerMiddleToBottomEdge,
      selectedItemHalfHeight + (isLastItem ? viewportPaddingBottom : 0) + viewportOffsetBottom + contentBorderBottomWidth,
    );

    placement.bottom = '0px';
    placement.height = `${contentTopToItemMiddle + clampedTriggerMiddleToBottomEdge}px`;
  }
  else {
    const isFirstItem = selectedItem === items[0];
    const clampedTopEdgeToTriggerMiddle = Math.max(
      topEdgeToTriggerMiddle,
      contentBorderTopWidth + viewportOffsetTop + (isFirstItem ? viewportPaddingTop : 0) + selectedItemHalfHeight,
    );

    placement.top = '0px';
    placement.height = `${clampedTopEdgeToTriggerMiddle + itemMiddleToContentBottom}px`;
    scrollTop = contentTopToItemMiddle - topEdgeToTriggerMiddle + viewportOffsetTop;
  }

  placement.margin = `${CONTENT_MARGIN}px 0`;
  placement.minHeight = `${Math.min(selectedItemHeight * 5, fullContentHeight)}px`;
  placement.maxHeight = `${availableHeight}px`;

  // --- Commit ---
  commit(wrapper, placement);
  if (scrollTop !== undefined) viewport.scrollTop = scrollTop;

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
