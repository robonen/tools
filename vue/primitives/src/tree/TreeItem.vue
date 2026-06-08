<script lang="ts" generic="T">
import type { FlatItem } from './utils';
import type { PrimitiveProps } from '../primitive';

export interface TreeItemProps<U = unknown> extends PrimitiveProps {
  /** Flattened item produced by `TreeRoot` (from its default slot). */
  item: FlatItem<U>;
  /** Disable this specific item. */
  disabled?: boolean;
}
</script>

<script setup lang="ts" generic="T">
import { computed } from 'vue';
import { useCollectionInjector } from '../collection';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { useTreeContext } from './context';

const { as = 'li', item, disabled = false } = defineProps<TreeItemProps<T>>();

const ctx = useTreeContext();
const { forwardRef, currentElement } = useForwardExpose();
const { CollectionItem } = useCollectionInjector();

const isDisabled = computed(() => ctx.disabled.value || disabled);
const isExpanded = computed(() => item.hasChildren && ctx.isExpanded(item.key));
const isSelected = computed(() => ctx.isSelected(item.key));

function onClick(event: MouseEvent): void {
  if (isDisabled.value) return;
  event.stopPropagation();
  ctx.select(item.value as T);
  if (item.hasChildren) ctx.toggleExpanded(item.value as T);
}

function onKeyDown(event: KeyboardEvent): void {
  if (isDisabled.value || !currentElement.value) return;
  ctx.onItemKeyDown(event, currentElement.value, item);
}
</script>

<template>
  <CollectionItem>
    <Primitive
      :ref="forwardRef"
      :as="as"
      role="treeitem"
      :tabindex="isDisabled ? -1 : 0"
      :aria-level="item.level"
      :aria-selected="isSelected"
      :aria-expanded="item.hasChildren ? isExpanded : undefined"
      :aria-disabled="isDisabled || undefined"
      :data-state="item.hasChildren ? (isExpanded ? 'open' : 'closed') : undefined"
      :data-selected="isSelected ? '' : undefined"
      :data-disabled="isDisabled ? '' : undefined"
      :data-level="item.level"
      @click="onClick"
      @keydown="onKeyDown"
    >
      <slot
        :item="item"
        :is-expanded="isExpanded"
        :is-selected="isSelected"
        :is-disabled="isDisabled"
      />
    </Primitive>
  </CollectionItem>
</template>
