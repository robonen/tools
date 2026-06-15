<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

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

  /**
   * Keep the content mounted while closed instead of unmounting it. When
   * `false`, the closed content stays in the DOM and is rendered with
   * `hidden="until-found"` so the browser's find-in-page can locate and
   * reveal it. Defaults to `true` (closed content is unmounted).
   */
  unmountOnHide?: boolean;
}

/** Emit contract for the open/closed state of `CollapsibleRoot`. */
export interface CollapsibleRootEmits {
  /** Fired when the open state of the collapsible changes. */
  'update:open': [value: boolean];
}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
import { ref, toRef } from 'vue';
import { provideCollapsibleContext } from './context';
import { useForwardExpose } from '@robonen/vue';
import { useId } from '../../utilities/config-provider';

const { defaultOpen = false, disabled = false, unmountOnHide = true, as = 'div' } = defineProps<CollapsibleRootProps>();

defineSlots<{
  default?: (props: {
    /** Current open state of the collapsible. */
    open: boolean;
  }) => unknown;
}>();

const localOpen = ref<boolean>(defaultOpen);

const open = defineModel<boolean>('open', {
  default: undefined,
  get: v => v ?? localOpen.value,
  set: (v) => {
    localOpen.value = v;
    return v;
  },
});

// Expose `open` before `useForwardExpose` so the latter merges it into the
// forwarded expose (it reads `instance.exposed`), keeping both the element
// ref-forwarding and the readable open state without calling expose() twice.
defineExpose({ open });

const { forwardRef } = useForwardExpose();

// Identity passthrough via `toRef` — reactive without `computed`'s effect/cache.
const disabledRef = toRef(() => disabled);
const unmountOnHideRef = toRef(() => unmountOnHide);
const contentId = useId(undefined, 'collapsible-content');

provideCollapsibleContext({
  open,
  disabled: disabledRef,
  contentId,
  unmountOnHide: unmountOnHideRef,
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
