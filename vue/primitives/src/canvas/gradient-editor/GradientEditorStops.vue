<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * Iterator part that keeps the DOM in sync with the root's sorted stops across
 * add / remove / reorder. By default it renders a `GradientEditorStop` per
 * entry (keyed by stop `id`). Provide a default slot to template each stop
 * yourself — it receives `{ stop, index, selected }` and you wrap your markup in
 * a `GradientEditorStop :stop-id="stop.id"`.
 */
export interface GradientEditorStopsProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
import { useForwardExpose } from '@robonen/vue';
import { useGradientEditorContext } from './context';
import GradientEditorStop from './GradientEditorStop.vue';

const { as = 'div' } = defineProps<GradientEditorStopsProps>();

const ctx = useGradientEditorContext();
const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive :ref="forwardRef" :as="as">
    <template v-for="(stop, index) in ctx.stops.value" :key="stop.id">
      <slot
        :stop="stop"
        :index="index"
        :selected="ctx.selectedId.value === stop.id"
      >
        <GradientEditorStop :stop-id="stop.id" />
      </slot>
    </template>
  </Primitive>
</template>
