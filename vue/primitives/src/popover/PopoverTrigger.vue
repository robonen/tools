<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface PopoverTriggerProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { PopperAnchor } from '../popper';
import { Primitive } from '../primitive';
import { onMounted } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { usePopoverContext } from './context';

const { as = 'button' } = defineProps<PopoverTriggerProps>();

const ctx = usePopoverContext();
const { forwardRef, currentElement: triggerElement } = useForwardExpose();

onMounted(() => {
  ctx.triggerElement.value = triggerElement.value;
});
</script>

<template>
  <component :is="ctx.hasCustomAnchor.value ? Primitive : PopperAnchor" as="template">
    <Primitive
      :id="ctx.triggerId.value"
      :ref="forwardRef"
      :as="as"
      :type="as === 'button' ? 'button' : undefined"
      aria-haspopup="dialog"
      :aria-expanded="ctx.open.value"
      :aria-controls="ctx.contentId.value"
      :data-state="ctx.open.value ? 'open' : 'closed'"
      @click="ctx.onOpenToggle"
    >
      <slot />
    </Primitive>
  </component>
</template>
