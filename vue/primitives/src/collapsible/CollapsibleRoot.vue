<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * An interactive component that expands and collapses a panel of content.
 *
 * `CollapsibleRoot` owns the open/closed state (controlled via `v-model:open`
 * or uncontrolled via `defaultOpen`), provides it to the `Trigger` and
 * `Content` parts, and reflects it as `data-state`. Use it for show/hide
 * disclosures such as "read more" sections, FAQ entries, or settings panels.
 */
export interface CollapsibleRootProps extends PrimitiveProps {

  defaultOpen?: boolean;
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { ref, toRef } from 'vue';
import { provideCollapsibleContext } from './context';
import { useForwardExpose } from '@robonen/vue';
import { useId } from '../config-provider';

const { defaultOpen = false, disabled = false, as = 'div' } = defineProps<CollapsibleRootProps>();

const { forwardRef } = useForwardExpose();

const localOpen = ref<boolean>(defaultOpen);

const open = defineModel<boolean>('open', {
  default: undefined,
  get: v => v ?? localOpen.value,
  set: (v) => {
    localOpen.value = v;
    return v;
  },
});

// Identity passthrough via `toRef` — reactive without `computed`'s effect/cache.
const disabledRef = toRef(() => disabled);
const contentId = useId(undefined, 'collapsible-content');

provideCollapsibleContext({
  open,
  disabled: disabledRef,
  contentId,
  onToggle: () => { if (!disabled) open.value = !open.value; },
  onOpen: () => { if (!disabled) open.value = true; },
  onClose: () => { if (!disabled) open.value = false; },
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :data-state="open ? 'open' : 'closed'"
    :data-disabled="disabled ? '' : undefined"
  >
    <slot :open="open" />
  </Primitive>
</template>
