<script lang="ts">
import type { PrimitiveProps } from '../primitive';
import type { RovingDirection } from '../utils/roving-focus';

/**
 * A container that groups a set of controls — buttons, toggles, separators —
 * into a single keyboard-navigable strip (`role="toolbar"`). Like an editor's
 * formatting bar, the whole toolbar is one tab stop: Tab moves into it, then
 * arrow keys roam between items (Home/End jump to the ends), with optional
 * wrap-around via `loop`. It owns the roving-focus state, exposes
 * `data-orientation` for styling, and provides context to every
 * `ToolbarButton` and `ToolbarSeparator`. Reach for it to assemble action
 * bars, formatting toolbars, or any cluster of related controls.
 */
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
// Enabled-only: a disabled button is unfocusable, so letting it into the
// roving list would freeze navigation on it and drop the toolbar's tab stop.
const { getItems, CollectionSlot } = useCollectionProvider();
const items = computed(() => getItems().map(i => i.ref));

const activeIndex = ref(0);

// Read fresh rather than through `items`: `getItems` filters on live
// `data-disabled`, which the computed cannot track across runtime toggles.
function enabledItems(): HTMLElement[] {
  return getItems().map(i => i.ref);
}

function focusIndex(i: number): void {
  const el = enabledItems()[i];
  if (!el) return;
  el.focus();
  // Commit only when focus actually landed, so the tab stop never moves
  // onto an element that refused focus.
  if (document.activeElement === el) activeIndex.value = i;
}

function onItemKeyDown(event: KeyboardEvent, el: HTMLElement): void {
  const action = rovingKeyToAction(event, { orientation, dir, loop });
  if (!action) return;
  event.preventDefault();
  const list = enabledItems();
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
