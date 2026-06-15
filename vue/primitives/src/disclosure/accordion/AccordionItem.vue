<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A single collapsible section of the accordion, grouping one trigger with
 * its content. Identified by a unique `value` that the root uses to track
 * open state; provides item-level context (open, disabled, ids) to its
 * `AccordionTrigger` and `AccordionContent`.
 */
export interface AccordionItemProps extends PrimitiveProps {
  /** Unique value for this item. */
  value: string;
  /** Disable this item. */
  disabled?: boolean;
  /**
   * Override the root's `unmountOnHide` for this item only. When omitted the
   * root value is inherited. Set `false` to keep this item's closed content
   * mounted (find-in-page discoverable) regardless of the root setting.
   */
  unmountOnHide?: boolean;
}
</script>

<script setup lang="ts">
import { provideAccordionItemContext, useAccordionContext } from './context';
import { Primitive } from '../../internal/primitive';
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { useId } from '../../utilities/config-provider';

// `unmountOnHide` defaults to `undefined` (not Vue's boolean-cast `false`) so
// an omitted prop inherits the root value; only an explicit boolean overrides.
const { value, disabled = false, unmountOnHide = undefined, as = 'div' } = defineProps<AccordionItemProps>();

const ctx = useAccordionContext();
const isOpen = computed(() => ctx.isOpen(value));
const isDisabled = computed(() => ctx.disabled.value || disabled);
const itemUnmountOnHide = computed(() => unmountOnHide ?? ctx.unmountOnHide.value);

// Expose before `useForwardExpose` so the latter merges these into the
// forwarded expose, keeping both element ref-forwarding and readable state.
defineExpose({ open: isOpen, disabled: isDisabled });

const { forwardRef } = useForwardExpose();

const triggerId = useId(undefined, 'accordion-trigger');
const contentId = useId(undefined, 'accordion-content');

provideAccordionItemContext({
  value,
  open: isOpen,
  disabled: isDisabled,
  triggerId,
  contentId,
  unmountOnHide: itemUnmountOnHide,
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
