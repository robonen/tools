<script lang="ts">
import type { PopperAnchorProps } from '../popper';

export interface ComboboxAnchorProps extends PopperAnchorProps {}
</script>

<script setup lang="ts">
import { onBeforeUnmount, watchPostEffect } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { PopperAnchor } from '../popper';
import { Primitive } from '../primitive';
import { useComboboxRootContext } from './context';

const props = defineProps<ComboboxAnchorProps>();

const { forwardRef, currentElement } = useForwardExpose();
const rootCtx = useComboboxRootContext();

watchPostEffect(() => rootCtx.onParentChange(currentElement.value));
onBeforeUnmount(() => rootCtx.onParentChange(undefined));
</script>

<template>
  <PopperAnchor :reference="props.reference">
    <Primitive
      :ref="forwardRef"
      :as="props.as ?? 'div'"
    >
      <slot />
    </Primitive>
  </PopperAnchor>
</template>
