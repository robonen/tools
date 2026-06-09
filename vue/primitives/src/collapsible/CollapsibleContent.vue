<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * The panel revealed when the collapsible is open. Mounts and unmounts with
 * the open state (via `Presence`), is referenced by the trigger's
 * `aria-controls`, and is hidden from layout and assistive tech while closed.
 */
export interface CollapsibleContentProps extends PrimitiveProps {

  /** Render the content even when closed (useful for animation control). */
  forceMount?: boolean;
}
</script>

<script setup lang="ts">
import { Presence } from '../presence';
import { Primitive } from '../primitive';
import { useCollapsibleContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'div', forceMount = false } = defineProps<CollapsibleContentProps>();

const { forwardRef } = useForwardExpose();
const ctx = useCollapsibleContext();
</script>

<template>
  <Presence :present="forceMount || ctx.open.value">
    <Primitive
      :ref="forwardRef"
      :id="ctx.contentId.value"
      :as="as"
      :data-state="ctx.open.value ? 'open' : 'closed'"
      :data-disabled="ctx.disabled.value ? '' : undefined"
      :hidden="!ctx.open.value ? true : undefined"
    >
      <slot :open="ctx.open.value" />
    </Primitive>
  </Presence>
</template>
