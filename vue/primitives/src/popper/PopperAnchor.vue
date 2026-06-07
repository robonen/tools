<script lang="ts">
import type { PrimitiveProps } from '../primitive';
import type { ReferenceElement } from '@floating-ui/vue';

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
