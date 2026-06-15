<script lang="ts">
import type { PopperArrowProps } from '../../overlays/popper';

/**
 * An optional arrow that points from the content back to the trigger. Only
 * meaningful with `position="popper"`, since it relies on the popper placement;
 * render it inside `SelectContent`.
 */
export type SelectArrowProps = PopperArrowProps;
</script>

<script setup lang="ts">
import { computed } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { PopperArrow } from '../../overlays/popper';
import { useSelectContentContext } from './context';

const props = defineProps<SelectArrowProps>();
const { forwardRef } = useForwardExpose();

const contentCtx = useSelectContentContext();
// The arrow only makes sense with `position="popper"`; it relies on popper
// placement, so it is a no-op in `item-aligned` mode.
const shouldRender = computed(() => contentCtx.position === 'popper');
</script>

<template>
  <PopperArrow
    v-if="shouldRender"
    :ref="forwardRef"
    v-bind="props"
  />
</template>
