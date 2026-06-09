<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * The interactive control for a step. Clicking or pressing it navigates to the
 * step (subject to the root's `linear` and `disabled` rules) and it participates
 * in roving arrow-key focus across all enabled triggers.
 */
export interface StepperTriggerProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { useStepperItemContext, useStepperRootContext } from './context';
import { Primitive } from '../primitive';
import { useCollectionInjector } from '../collection';
import { useForwardExpose } from '@robonen/vue';

const { as = 'button' } = defineProps<StepperTriggerProps>();

const root = useStepperRootContext();
const item = useStepperItemContext();
const { forwardRef, currentElement } = useForwardExpose();
const { CollectionItem } = useCollectionInjector();

function onMouseDown(event: MouseEvent): void {
  if (!item.focusable.value || event.ctrlKey) {
    event.preventDefault();
    return;
  }
  root.goToStep(item.step.value);
}

function onKeyDown(event: KeyboardEvent): void {
  if (item.disabled.value) return;
  if ((event.key === 'Enter' || event.key === ' ') && !event.ctrlKey && !event.shiftKey) {
    event.preventDefault();
    root.goToStep(item.step.value);
    return;
  }
  if (!currentElement.value) return;
  root.onTriggerKeyDown(event, currentElement.value);
}
</script>

<template>
  <CollectionItem>
    <Primitive
      :ref="forwardRef"
      :as="as"
      :type="as === 'button' ? 'button' : undefined"
      :tabindex="item.focusable.value ? 0 : -1"
      :disabled="item.disabled.value || !item.focusable.value || undefined"
      :data-state="item.state.value"
      :data-orientation="root.orientation.value"
      :data-disabled="item.disabled.value || !item.focusable.value ? '' : undefined"
      :aria-labelledby="item.titleId"
      :aria-describedby="item.descriptionId"
      @mousedown.left="onMouseDown"
      @keydown="onKeyDown"
    >
      <slot :state="item.state.value" :step="item.step.value" />
    </Primitive>
  </CollectionItem>
</template>
