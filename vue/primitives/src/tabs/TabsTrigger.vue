<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * The clickable control that activates its associated `TabsContent` panel.
 * Selecting it (by click or keyboard) sets the root value to its `value`.
 * Render one per tab inside a `TabsList`.
 */
export interface TabsTriggerProps extends PrimitiveProps {
  /** Value that links this trigger to a content panel. */
  value: string;
  /** Disable this trigger. */
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { computed } from 'vue';
import { useCollectionInjector } from '../collection';
import { useForwardExpose } from '@robonen/vue';
import { useTabsContext } from './context';

const { value, disabled = false, as = 'button' } = defineProps<TabsTriggerProps>();

const ctx = useTabsContext();
const { forwardRef, currentElement } = useForwardExpose();
const { CollectionItem } = useCollectionInjector();

const isSelected = computed(() => ctx.value.value === value);
const isDisabled = computed(() => ctx.disabled.value || disabled);

function onClick(): void {
  if (isDisabled.value) return;
  ctx.select(value);
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
      role="tab"
      :type="as === 'button' ? 'button' : undefined"
      :aria-selected="isSelected"
      :aria-disabled="isDisabled || undefined"
      :data-state="isSelected ? 'active' : 'inactive'"
      :data-disabled="isDisabled ? '' : undefined"
      :data-value="value"
      :tabindex="isSelected ? 0 : -1"
      :disabled="isDisabled || undefined"
      @click="onClick"
      @keydown="onKeyDown"
    >
      <slot :selected="isSelected" />
    </Primitive>
  </CollectionItem>
</template>
