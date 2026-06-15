<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The scrollable region inside the content that wraps the options. Marked
 * `role="presentation"` (the listbox role lives on the content element), caps
 * its height to the available space, and scrolls when the list overflows. In
 * `item-aligned` mode it grows the panel as you scroll (MacOS-style). Pair it
 * with the scroll buttons for an item-aligned menu.
 */
export interface SelectViewportProps extends PrimitiveProps {
  /**
   * CSP `nonce` for the injected scrollbar-hiding `<style>` tag. Falls back to
   * the active `ConfigProvider` nonce.
   */
  nonce?: string;
}
</script>

<script setup lang="ts">
import { ref, toRef, watchPostEffect } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { useNonce } from '../../utilities/config-provider';
import { Primitive } from '../../internal/primitive';
import { useSelectContentContext, useSelectItemAlignedPositionContext } from './context';
import { CONTENT_MARGIN } from './utils';

const { as = 'div', nonce: propNonce } = defineProps<SelectViewportProps>();

const { forwardRef, currentElement } = useForwardExpose();
const contentCtx = useSelectContentContext();
const nonce = useNonce(toRef(() => propNonce));

const alignedCtx = contentCtx.position === 'item-aligned'
  ? useSelectItemAlignedPositionContext(null as never)
  : undefined;

watchPostEffect(() => contentCtx.onViewportChange(currentElement.value));

const prevScrollTopRef = ref(0);

// Expand-on-scroll for item-aligned mode: grow the wrapper as the user scrolls
// so more options become visible, matching the native MacOS menu behaviour.
function handleScroll(event: Event) {
  const viewport = event.currentTarget as HTMLElement;
  const shouldExpand = alignedCtx?.shouldExpandOnScrollRef;
  const contentWrapper = alignedCtx?.contentWrapper;
  if (shouldExpand?.value && contentWrapper?.value) {
    const scrolledBy = Math.abs(prevScrollTopRef.value - viewport.scrollTop);
    if (scrolledBy > 0) {
      const availableHeight = window.innerHeight - CONTENT_MARGIN * 2;
      const cssMinHeight = Number.parseFloat(contentWrapper.value.style.minHeight);
      const cssHeight = Number.parseFloat(contentWrapper.value.style.height);
      const prevHeight = Math.max(cssMinHeight || 0, cssHeight || 0);

      if (prevHeight < availableHeight) {
        const nextHeight = prevHeight + scrolledBy;
        const clampedNextHeight = Math.min(availableHeight, nextHeight);
        const heightDiff = nextHeight - clampedNextHeight;

        contentWrapper.value.style.height = `${clampedNextHeight}px`;
        if (contentWrapper.value.style.bottom === '0px') {
          viewport.scrollTop = heightDiff > 0 ? heightDiff : 0;
          contentWrapper.value.style.justifyContent = 'flex-end';
        }
      }
    }
  }
  prevScrollTopRef.value = viewport.scrollTop;
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="presentation"
    data-primitives-select-viewport
    style="position: relative; flex: 1; overflow: hidden auto; max-height: var(--primitives-select-content-available-height, 300px)"
    @scroll="handleScroll"
  >
    <slot />
  </Primitive>
  <Primitive as="style" :nonce="nonce">
    [data-primitives-select-viewport]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}
    [data-primitives-select-viewport]::-webkit-scrollbar{display:none;}
  </Primitive>
</template>
