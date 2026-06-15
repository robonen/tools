<script lang="ts">
import type { ColorFormat } from '../../color/color-field';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * Optional color editor for the selected stop. It mounts a `ColorFieldRoot`
 * (from `../color-field`) whose `v-model` is bridged to the selected stop's
 * `color`, so editing the color in any `ColorField` part (area, sliders, input,
 * swatch) writes straight back to the stop via the root's `updateStop`. The
 * `ColorField` parts are exposed through the default slot — drop in
 * `ColorArea`, `HueSlider`, `ColorFieldInput`, etc.
 *
 * Renders nothing when no stop is selected (the default slot is suppressed).
 * Consumers who want a different color UI can compose a `ColorField` themselves
 * and bind it to `ctx.selectedId` / `ctx.updateStop` the same way.
 */
export interface GradientEditorColorEditorProps extends PrimitiveProps {
  /**
   * Serialization format written back to the stop's `color`.
   * @default 'rgba'
   */
  format?: ColorFormat;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import type { HSVA } from '../../internal/color';
import { ColorFieldRoot } from '../../color/color-field';
import { useForwardExpose } from '@robonen/vue';
import { useGradientEditorContext } from './context';

const { as = 'div', format = 'rgba' } = defineProps<GradientEditorColorEditorProps>();

const ctx = useGradientEditorContext();
const { forwardRef } = useForwardExpose();

const selectedStop = computed(() => {
  const id = ctx.selectedId.value;
  if (id === null) return null;
  return ctx.stopIndex.value.get(id)?.stop ?? null;
});

// Bridge the ColorField model (a CSS color string in `format`) to the selected
// stop's color. Writing flows back through `updateStop`. The getter feeds a CSS
// string in; the setter receives whatever the ColorField emits (a string in the
// configured `format`, but typed as `HSVA | string | null` by its model).
const color = computed<HSVA | string | null | undefined>({
  get: () => selectedStop.value?.color ?? '#000000',
  set: (value) => {
    const id = ctx.selectedId.value;
    if (id === null || value === null || value === undefined || typeof value !== 'string') return;
    ctx.updateStop(id, { color: value });
  },
});
</script>

<template>
  <ColorFieldRoot
    v-if="selectedStop"
    :ref="forwardRef"
    :as="as"
    v-model="color"
    :format="format"
    :disabled="ctx.disabled.value"
  >
    <template #default="slotProps">
      <slot v-bind="slotProps" :stop="selectedStop" />
    </template>
  </ColorFieldRoot>
</template>
