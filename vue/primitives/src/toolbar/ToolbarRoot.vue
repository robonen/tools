<script lang="ts">
import type { PrimitiveProps } from '../primitive';
import type { RovingDirection } from '../utils/roving-focus';

export interface ToolbarRootProps extends PrimitiveProps {
  orientation?: 'horizontal' | 'vertical';
  dir?: RovingDirection;
  loop?: boolean;
}
</script>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue';
import { resolveNextIndex, rovingKeyToAction } from '../utils/roving-focus';
import { useCollectionProvider } from '../collection';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { provideToolbarContext } from './context';

const { orientation = 'horizontal', dir = 'ltr', loop = true, as = 'div' } = defineProps<ToolbarRootProps>();

const { forwardRef } = useForwardExpose();

// DOM-order items via Collection primitive. Survives `v-for` reorders and
// teleport/portal children, unlike a mount-order array.
const { getItems, CollectionSlot } = useCollectionProvider();
const items = computed(() => getItems(true).map(i => i.ref));

const activeIndex = ref(0);

function focusIndex(i: number): void {
  const el = items.value[i];
  if (el) {
    activeIndex.value = i;
    el.focus();
  }
}

function onItemKeyDown(event: KeyboardEvent, el: HTMLElement): void {
  const action = rovingKeyToAction(event, { orientation, dir, loop });
  if (!action) return;
  event.preventDefault();
  const list = items.value;
  const idx = list.indexOf(el);
  if (action.absolute === 'home') return focusIndex(0);
  if (action.absolute === 'end') return focusIndex(list.length - 1);
  focusIndex(resolveNextIndex(idx, action.delta, list.length, loop));
}

provideToolbarContext({
  // Identity passthroughs via `toRef` — reactive without `computed`'s effect/cache.
  orientation: toRef(() => orientation),
  direction: toRef(() => dir),
  loop: toRef(() => loop),
  items,
  activeIndex,
  focusIndex,
  onItemKeyDown,
});
</script>

<template>
  <CollectionSlot>
    <Primitive
      :ref="forwardRef"
      :as="as"
      role="toolbar"
      :aria-orientation="orientation"
      :dir="dir"
      :data-orientation="orientation"
    >
      <slot />
    </Primitive>
  </CollectionSlot>
</template>
