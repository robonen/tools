<script lang="ts">
import type { PopperAnchorProps } from '../../overlays/popper';

/**
 * The element the popup is positioned against, typically wrapping the Input and Trigger.
 * Acts as the Popper anchor and the boundary used for the blur-to-close heuristic.
 */
export interface ComboboxAnchorProps extends PopperAnchorProps {}
</script>

<script setup lang="ts">
import { onBeforeUnmount, watchPostEffect } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { PopperAnchor } from '../../overlays/popper';
import { useComboboxRootContext } from './context';

const props = defineProps<ComboboxAnchorProps>();

const { forwardRef, currentElement } = useForwardExpose();
const rootCtx = useComboboxRootContext();

watchPostEffect(() => rootCtx.onParentChange(currentElement.value));
onBeforeUnmount(() => rootCtx.onParentChange(undefined));
</script>

<template>
  <!-- PopperAnchor IS the single anchor element: the consumer's class (e.g. a
       flex row of Input + Trigger) and the slotted children must live on the
       SAME element. A nested Primitive split them — the class landed here while
       the children sat in an unstyled inner div, stacking them vertically. -->
  <PopperAnchor
    :ref="forwardRef"
    :as="props.as ?? 'div'"
    :reference="props.reference"
  >
    <slot />
  </PopperAnchor>
</template>
