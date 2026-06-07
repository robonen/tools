<script lang="ts">
import type { PrimitiveProps } from '../primitive';
import type { RovingDirection } from '../utils/roving-focus';

export interface TabsRootProps extends PrimitiveProps {
  /** Uncontrolled initial value. */
  defaultValue?: string;
  /** Orientation of the tab list. @default 'horizontal' */
  orientation?: 'horizontal' | 'vertical';
  /** Writing direction. @default 'ltr' */
  dir?: RovingDirection;
  /** Wrap keyboard navigation. @default true */
  loop?: boolean;
  /** Disable all tabs. */
  disabled?: boolean;
  /** How tabs are activated. @default 'automatic' */
  activationMode?: 'automatic' | 'manual';
}
</script>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue';
import { resolveNextIndex, rovingKeyToAction } from '../utils/roving-focus';
import { useCollectionProvider } from '../collection';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { provideTabsContext } from './context';

const {
  orientation = 'horizontal',
  dir = 'ltr',
  loop = true,
  disabled = false,
  activationMode = 'automatic',
  defaultValue,
  as = 'div',
} = defineProps<TabsRootProps>();

const { forwardRef } = useForwardExpose();

const localValue = ref<string | undefined>(defaultValue);

const value = defineModel<string | undefined>({
  get: v => v ?? localValue.value,
  set: (v) => {
    localValue.value = v;
    return v;
  },
});

function select(v: string): void {
  if (disabled) return;
  value.value = v;
}

// DOM-order tabs via Collection primitive — survives `v-for` reorders and
// teleport/portal children, unlike a mount-order array.
const { getItems, CollectionSlot } = useCollectionProvider();
const tabElements = computed(() => getItems(true).map(i => i.ref));

function onTriggerKeyDown(event: KeyboardEvent, el: HTMLElement): void {
  const action = rovingKeyToAction(event, { orientation, dir, loop });
  if (!action) return;
  event.preventDefault();
  const enabled = tabElements.value.filter(x => !x.hasAttribute('data-disabled'));
  if (enabled.length === 0) return;
  const current = enabled.indexOf(el);
  if (action.absolute === 'home') {
    enabled[0]!.focus();
    return;
  }
  if (action.absolute === 'end') {
    enabled[enabled.length - 1]!.focus();
    return;
  }
  const nextIdx = resolveNextIndex(current === -1 ? 0 : current, action.delta, enabled.length, loop);
  const target = enabled[nextIdx]!;
  target.focus();
  if (activationMode === 'automatic') {
    const val = target.getAttribute('data-value');
    if (val !== null) select(val);
  }
}

provideTabsContext({
  value,
  // Identity passthroughs via `toRef` — reactive without `computed`'s effect/cache.
  orientation: toRef(() => orientation),
  direction: toRef(() => dir),
  loop: toRef(() => loop),
  disabled: toRef(() => disabled),
  activationMode: toRef(() => activationMode),
  tabElements,
  select,
  onTriggerKeyDown,
});
</script>

<template>
  <CollectionSlot>
    <Primitive
      :ref="forwardRef"
      :as="as"
      :dir="dir"
      :data-orientation="orientation"
      :data-disabled="disabled ? '' : undefined"
    >
      <slot :value="value" />
    </Primitive>
  </CollectionSlot>
</template>
