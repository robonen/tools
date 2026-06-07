<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface AccordionItemProps extends PrimitiveProps {
  /** Unique value for this item. */
  value: string;
  /** Disable this item. */
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { provideAccordionItemContext, useAccordionContext } from './context';
import { Primitive } from '../primitive';
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { useId } from '../config-provider';

const { value, disabled = false, as = 'div' } = defineProps<AccordionItemProps>();

const { forwardRef } = useForwardExpose();

const ctx = useAccordionContext();
const isOpen = computed(() => ctx.isOpen(value));
const isDisabled = computed(() => ctx.disabled.value || disabled);

const triggerId = useId(undefined, 'accordion-trigger');
const contentId = useId(undefined, 'accordion-content');

provideAccordionItemContext({
  value,
  open: isOpen,
  disabled: isDisabled,
  triggerId,
  contentId,
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :data-state="isOpen ? 'open' : 'closed'"
    :data-disabled="isDisabled ? '' : undefined"
    :data-orientation="ctx.orientation.value"
  >
    <slot :open="isOpen" />
  </Primitive>
</template>
