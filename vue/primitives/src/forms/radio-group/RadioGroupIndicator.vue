<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * Renders its content only when the parent `RadioGroupItem` is selected,
 * mirroring that state via `data-state`. Place the filled dot or check mark
 * inside it. Wrapped in `Presence`, so it can animate out via CSS leave
 * animations; use `forceMount` to keep it mounted for animation control.
 */
export interface RadioGroupIndicatorProps extends PrimitiveProps {
  /** Keep the indicator mounted regardless of checked state (for exit animations / measuring). */
  forceMount?: boolean;
}
</script>

<script setup lang="ts">
import { Presence } from '../../utilities/presence';
import { Primitive } from '../../internal/primitive';
import { useForwardExpose } from '@robonen/vue';
import { useRadioGroupItemContext } from './context';

const { as = 'span', forceMount = false } = defineProps<RadioGroupIndicatorProps>();
const { forwardRef } = useForwardExpose();
const item = useRadioGroupItemContext();
</script>

<template>
  <Presence :present="forceMount || item.checked.value">
    <Primitive
      :ref="forwardRef"
      :as="as"
      :data-state="item.checked.value ? 'checked' : 'unchecked'"
      :data-disabled="item.disabled.value ? '' : undefined"
      style="pointer-events: none;"
    >
      <slot />
    </Primitive>
  </Presence>
</template>
