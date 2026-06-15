<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
/**
 * Renders its content only when the parent `CheckboxRoot` is checked or
 * indeterminate, mirroring that state via `data-state`. Place the check/dash
 * icon inside it; use `forceMount` to keep it mounted for CSS exit animations.
 */
export interface CheckboxIndicatorProps extends PrimitiveProps {
  /** Keep mounted even when unchecked (for CSS exit animations). */
  forceMount?: boolean;

}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
import { Presence } from '../../utilities/presence';
import { useCheckboxContext } from './context';
import { getState, isIndeterminate } from './utils';
import { useForwardExpose } from '@robonen/vue';

const { as = 'span', forceMount = false } = defineProps<CheckboxIndicatorProps>();
const ctx = useCheckboxContext();

defineOptions({ inheritAttrs: false });

const { forwardRef } = useForwardExpose();
</script>

<template>
  <Presence
    :present="forceMount || isIndeterminate(ctx.checked.value) || ctx.checked.value === true"
  >
    <Primitive
      :ref="forwardRef"
      :as="as"
      v-bind="$attrs"
      :data-state="getState(ctx.checked.value)"
      :data-disabled="ctx.disabled.value ? '' : undefined"
      style="pointer-events: none;"
    >
      <slot :checked="ctx.checked.value" />
    </Primitive>
  </Presence>
</template>
