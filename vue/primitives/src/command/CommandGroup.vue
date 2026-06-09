<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * Labelled section that visually clusters related items under an optional
 * heading. Hides itself automatically when every item it contains is filtered
 * out (unless `forceMount`), so empty categories disappear during search.
 */
export interface CommandGroupProps extends PrimitiveProps {
  /** Group heading text (rendered when the default slot doesn't override it). */
  heading?: string;
  /** Stable identifier for the group. Auto-generated when omitted. */
  value?: string;
  /** Render the group even when all of its items are filtered out. */
  forceMount?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, toRef } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { useId } from '../config-provider';
import { Primitive } from '../primitive';
import { provideCommandGroupContext, useCommandContext } from './context';

const {
  as = 'div',
  heading,
  value,
  forceMount = false,
} = defineProps<CommandGroupProps>();

const { forwardRef } = useForwardExpose();
const ctx = useCommandContext();

const id = useId(() => value, 'command-group');
const headingId = useId(undefined, 'command-group-heading');

const hasVisibleItem = computed(() => {
  const set = ctx.allGroups.value.get(id.value);
  if (!set || set.size === 0) return false;
  for (const v of set) {
    const info = ctx.allItems.value.get(v);
    if (!info || info.disabled) continue;
    if (ctx.filteredItems.value.has(v)) return true;
  }
  return false;
});

const isVisible = computed(() => forceMount || hasVisibleItem.value);

onMounted(() => ctx.registerGroup(id.value));
onBeforeUnmount(() => ctx.unregisterGroup(id.value));

provideCommandGroupContext({
  id,
  forceMount: toRef(() => forceMount),
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="presentation"
    :data-primitives-state="isVisible ? 'visible' : 'hidden'"
    :hidden="!isVisible || undefined"
    data-primitives-command-group
  >
    <div v-if="heading" :id="headingId" data-primitives-command-group-heading>
      {{ heading }}
    </div>
    <div role="group" :aria-labelledby="heading ? headingId : undefined">
      <slot />
    </div>
  </Primitive>
</template>
