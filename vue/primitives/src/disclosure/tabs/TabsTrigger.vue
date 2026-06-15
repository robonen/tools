<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { TabsValue } from './context';

/**
 * The clickable control that activates its associated `TabsContent` panel.
 * Selecting it (by click or keyboard) sets the root value to its `value`.
 * Render one per tab inside a `TabsList`.
 */
export interface TabsTriggerProps extends PrimitiveProps {
  /** Value that links this trigger to a content panel. */
  value: TabsValue;
  /** Disable this trigger. */
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
import { computed } from 'vue';
import { useCollectionInjector } from '../../utilities/collection';
import { useForwardExpose } from '@robonen/vue';
import { useTabsContext } from './context';

const { value, disabled = false, as = 'button' } = defineProps<TabsTriggerProps>();

const ctx = useTabsContext();
const { forwardRef, currentElement } = useForwardExpose();
const { CollectionItem } = useCollectionInjector();

const isSelected = computed(() => ctx.value.value === value);
const isDisabled = computed(() => ctx.disabled.value || disabled);

const triggerId = computed(() => ctx.getTriggerId(value));
// Only advertise `aria-controls` when a matching panel is actually mounted, so
// screen readers never point at a non-existent element.
const contentId = computed(() =>
  ctx.contentIds.value.has(value) ? ctx.getContentId(value) : undefined,
);

function onClick(): void {
  if (isDisabled.value) return;
  ctx.select(value);
}

// Guard pointer activation: ignore non-left buttons and ctrl+left-click (the
// macOS context-menu chord) so they don't accidentally select the tab. We only
// suppress focus here; activation itself still happens on `click`.
function onMouseDown(event: MouseEvent): void {
  if (isDisabled.value || event.button !== 0 || event.ctrlKey) {
    event.preventDefault();
  }
}

function onKeyDown(event: KeyboardEvent): void {
  if (!currentElement.value) return;
  // Enter/Space explicitly activate the focused tab — essential for
  // `activationMode="manual"`, where arrow keys only move focus.
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    if (!isDisabled.value) ctx.select(value);
    return;
  }
  ctx.onTriggerKeyDown(event, currentElement.value);
}
</script>

<template>
  <CollectionItem :value="value">
    <Primitive
      :as="as"
      :ref="forwardRef"
      :id="triggerId"
      role="tab"
      :type="as === 'button' ? 'button' : undefined"
      :aria-selected="isSelected"
      :aria-controls="contentId"
      :aria-disabled="isDisabled || undefined"
      :data-state="isSelected ? 'active' : 'inactive'"
      :data-disabled="isDisabled ? '' : undefined"
      :data-orientation="ctx.orientation.value"
      :data-value="value"
      :tabindex="isSelected ? 0 : -1"
      :disabled="isDisabled || undefined"
      @click="onClick"
      @mousedown="onMouseDown"
      @keydown="onKeyDown"
    >
      <slot :selected="isSelected" />
    </Primitive>
  </CollectionItem>
</template>
