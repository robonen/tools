<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * The interactive header button that toggles its item's content open and
 * closed. Renders as a `<button>` by default, wires up the correct ARIA
 * (`aria-expanded`/`aria-controls`) and participates in arrow-key roving
 * focus across all triggers.
 */
export interface AccordionTriggerProps extends PrimitiveProps {
}
</script>

<script setup lang="ts">
import { useAccordionContext, useAccordionItemContext } from './context';
import { Primitive } from '../primitive';
import { useCollectionInjector } from '../collection';
import { useForwardExpose } from '@robonen/vue';

const { as = 'button' } = defineProps<AccordionTriggerProps>();

const ctx = useAccordionContext();
const item = useAccordionItemContext();
const { forwardRef, currentElement } = useForwardExpose();
const { CollectionItem } = useCollectionInjector();

function onClick(): void {
  if (item.disabled.value) return;
  ctx.toggle(item.value);
}

function onKeyDown(event: KeyboardEvent): void {
  if (!currentElement.value) return;
  ctx.onTriggerKeyDown(event, currentElement.value);
}
</script>

<template>
  <CollectionItem>
    <Primitive
      :as="as"
      :ref="forwardRef"
      :type="as === 'button' ? 'button' : undefined"
      :id="item.triggerId.value"
      :aria-expanded="item.open.value"
      :aria-controls="item.contentId.value"
      :aria-disabled="item.disabled.value || undefined"
      :data-state="item.open.value ? 'open' : 'closed'"
      :data-disabled="item.disabled.value ? '' : undefined"
      :data-orientation="ctx.orientation.value"
      :disabled="item.disabled.value || undefined"
      @click="onClick"
      @keydown="onKeyDown"
    >
      <slot :open="item.open.value" />
    </Primitive>
  </CollectionItem>
</template>
