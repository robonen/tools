<script lang="ts">
import type { PopperAnchorProps } from '../popper';
import type { PrimitiveProps } from '../primitive';

/**
 * The element that opens the hover card on pointer enter or focus and anchors
 * the floating content to it. Renders as an `<a>` by default; pass a custom
 * `reference` to position the card against a different element.
 */
export interface HoverCardTriggerProps extends PrimitiveProps, Pick<PopperAnchorProps, 'reference'> {}
</script>

<script setup lang="ts">
import { PopperAnchor } from '../popper';
import { Primitive } from '../primitive';
import { excludeTouch } from './utils';
import { useForwardExpose } from '@robonen/vue';
import { useHoverCardContext } from './context';
import { watch } from 'vue';

const { as = 'a', reference } = defineProps<HoverCardTriggerProps>();

const ctx = useHoverCardContext();
const { forwardRef, currentElement } = useForwardExpose();

watch(currentElement, el => ctx.onTriggerChange(el));

function onPointerLeave() {
  // Defer so grace-area detection can mark the pointer as in transit before
  // we decide to close.
  setTimeout(() => {
    if (!ctx.isPointerInTransit.value && !ctx.open.value) ctx.onClose();
    else if (!ctx.isPointerInTransit.value) ctx.onClose();
  }, 0);
}
</script>

<template>
  <PopperAnchor as="template" :reference="reference">
    <Primitive
      :ref="forwardRef"
      :as="as"
      :data-state="ctx.open.value ? 'open' : 'closed'"
      data-hover-card-trigger
      data-grace-area-trigger
      @pointerenter="excludeTouch(ctx.onOpen)($event)"
      @pointerleave="excludeTouch(onPointerLeave)($event)"
      @focus="ctx.onOpen()"
      @blur="ctx.onClose()"
    >
      <slot />
    </Primitive>
  </PopperAnchor>
</template>
