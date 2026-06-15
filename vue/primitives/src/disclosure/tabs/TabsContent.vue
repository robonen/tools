<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { TabsValue } from './context';

/**
 * The panel shown when its matching `TabsTrigger` is active. Mounted via
 * `Presence` so enter/leave transitions can run before it leaves the DOM; use
 * `forceMount` to keep it mounted for custom animation, or rely on the root's
 * `unmountOnHide` to keep inactive panels mounted-but-hidden. Pair one with each
 * trigger via a shared `value`.
 */
export interface TabsContentProps extends PrimitiveProps {
  /** Value that links this panel to a trigger. */
  value: TabsValue;
  /** Keep content mounted even when inactive. */
  forceMount?: boolean;
}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Presence } from '../../utilities/presence';
import { useTabsContext } from './context';

defineOptions({ inheritAttrs: false });

const { value, forceMount = false, as = 'div' } = defineProps<TabsContentProps>();

defineSlots<{
  default?: (props: {
    /** Whether this panel is the active one. */
    selected: boolean;
  }) => unknown;
}>();

const { forwardRef } = useForwardExpose();
const ctx = useTabsContext();

const isSelected = computed(() => ctx.value.value === value);

const triggerId = computed(() => ctx.getTriggerId(value));
const contentId = computed(() => ctx.getContentId(value));

// Register this panel so the matching trigger can wire `aria-controls`.
// Mount/unmount lifecycle (not a tracked effect) avoids the read-then-write
// cycle on the shared `contentIds` set; a `value` watch re-keys on the rare
// case where the panel's `value` changes in place.
onMounted(() => ctx.registerContent(value));
onBeforeUnmount(() => ctx.unregisterContent(value));
watch(() => value, (next, prev) => {
  ctx.unregisterContent(prev);
  ctx.registerContent(next);
});

// Suppress the enter animation on the very first frame so a panel that is
// active on mount (via `defaultValue`) does not animate in.
const isMountAnimationPrevented = ref(isSelected.value);
onMounted(() => {
  requestAnimationFrame(() => {
    isMountAnimationPrevented.value = false;
  });
});

const keepMounted = computed(() => forceMount || !ctx.unmountOnHide.value);
</script>

<template>
  <Presence
    v-slot="{ present }"
    :present="isSelected"
    :force-mount="keepMounted"
  >
    <Primitive
      v-bind="$attrs"
      :ref="forwardRef"
      :as="as"
      :id="contentId"
      role="tabpanel"
      :aria-labelledby="triggerId"
      :data-state="isSelected ? 'active' : 'inactive'"
      :data-orientation="ctx.orientation.value"
      :tabindex="0"
      :hidden="!isSelected ? true : undefined"
      :style="{ animationDuration: isMountAnimationPrevented ? '0s' : undefined }"
    >
      <slot v-if="ctx.unmountOnHide.value ? present : true" :selected="isSelected" />
    </Primitive>
  </Presence>
</template>
