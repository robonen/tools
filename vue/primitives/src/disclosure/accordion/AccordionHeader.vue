<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The heading element that wraps an `AccordionTrigger`. The WAI-ARIA accordion
 * pattern requires each trigger to live inside a heading (`h1`–`h6`) so screen
 * readers can navigate sections by heading level. Renders as `<h3>` by default
 * and forwards `data-state` / `data-disabled` / `data-orientation` for styling.
 */
export interface AccordionHeaderProps extends PrimitiveProps {
}
</script>

<script setup lang="ts">
import { useAccordionContext, useAccordionItemContext } from './context';
import { Primitive } from '../../internal/primitive';
import { useForwardExpose } from '@robonen/vue';

const { as = 'h3' } = defineProps<AccordionHeaderProps>();

const { forwardRef } = useForwardExpose();
const ctx = useAccordionContext();
const item = useAccordionItemContext();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :data-state="item.open.value ? 'open' : 'closed'"
    :data-disabled="item.disabled.value ? '' : undefined"
    :data-orientation="ctx.orientation.value"
  >
    <slot :open="item.open.value" />
  </Primitive>
</template>
