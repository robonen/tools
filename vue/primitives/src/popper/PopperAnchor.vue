<script lang="ts">
import type { PrimitiveProps } from '../primitive';
import type { ReferenceElement } from '@floating-ui/vue';

/**
 * Marks the element that `PopperContent` positions itself against. Renders its
 * child and registers it with the `PopperRoot` as the positioning reference;
 * pass `reference` to anchor to a virtual or external element instead of the
 * rendered DOM node. Optional — when omitted, the content falls back to its own
 * `reference` prop or the nearest registered anchor.
 */
export interface PopperAnchorProps extends PrimitiveProps {
  /** Custom reference element for positioning. If not provided, uses the rendered element. */
  reference?: ReferenceElement;
}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';
import { usePopperRootContext } from './context';
import { watchPostEffect } from 'vue';

const props = defineProps<PopperAnchorProps>();

const { forwardRef, currentElement } = useForwardExpose();
const rootContext = usePopperRootContext();

watchPostEffect(() => {
  rootContext.onAnchorChange(props.reference ?? currentElement.value);
});
</script>

<template>
  <Primitive :ref="forwardRef" :as="as">
    <slot />
  </Primitive>
</template>
