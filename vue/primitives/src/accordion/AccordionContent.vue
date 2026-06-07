<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface AccordionContentProps extends PrimitiveProps {
  /** Keep content mounted even when closed. */
  forceMount?: boolean;
}
</script>

<script setup lang="ts">
import { useAccordionContext, useAccordionItemContext } from './context';
import { Presence } from '../presence';
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';

const { as = 'div', forceMount = false } = defineProps<AccordionContentProps>();

const { forwardRef } = useForwardExpose();
const ctx = useAccordionContext();
const item = useAccordionItemContext();
</script>

<template>
  <Presence :present="forceMount || item.open.value">
    <Primitive
      :ref="forwardRef"
      :as="as"
      role="region"
      :id="item.contentId.value"
      :aria-labelledby="item.triggerId.value"
      :data-state="item.open.value ? 'open' : 'closed'"
      :data-disabled="item.disabled.value ? '' : undefined"
      :data-orientation="ctx.orientation.value"
      :hidden="!item.open.value || undefined"
    >
      <slot :open="item.open.value" />
    </Primitive>
  </Presence>
</template>
