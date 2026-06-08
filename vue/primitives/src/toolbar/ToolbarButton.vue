<script lang="ts">
import type { PrimitiveProps } from '../primitive';
export interface ToolbarButtonProps extends PrimitiveProps {

  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { computed } from 'vue';
import { useCollectionInjector } from '../collection';
import { useForwardExpose } from '@robonen/vue';
import { useToolbarContext } from './context';

const { as = 'button', disabled = false } = defineProps<ToolbarButtonProps>();
const ctx = useToolbarContext();
const { forwardRef, currentElement } = useForwardExpose();
const { CollectionItem } = useCollectionInjector();

const index = computed(() => (currentElement.value ? ctx.items.value.indexOf(currentElement.value) : -1));
const isActive = computed(() => index.value === ctx.activeIndex.value);

function onKeyDown(event: KeyboardEvent): void {
  if (!currentElement.value) return;
  ctx.onItemKeyDown(event, currentElement.value);
}
function onFocus(): void {
  if (index.value !== -1) ctx.activeIndex.value = index.value;
}
</script>

<template>
  <CollectionItem>
    <Primitive
      :as="as"
      :ref="forwardRef"
      :type="as === 'button' ? 'button' : undefined"
      :tabindex="disabled ? -1 : (isActive ? 0 : -1)"
      :disabled="disabled || undefined"
      :data-disabled="disabled ? '' : undefined"
      @keydown="onKeyDown"
      @focus="onFocus"
    >
      <slot />
    </Primitive>
  </CollectionItem>
</template>
