<script lang="ts">
import type { PrimitiveProps } from '../primitive';
import type { QrCellPattern } from './utils';

/**
 * Renders the data modules of the code. The `pattern` prop switches between
 * pixel styles; `fluid` is neighbour-aware and merges adjacent modules into
 * smooth blobs. By default the three finder patterns are skipped so that
 * `QrCodeMarker`/`QrCodeMarkers` can style them independently — set
 * `includeMarkers` to draw a complete code from cells alone.
 *
 * For total control, provide a `#cell` slot: it is rendered once per dark
 * module with its grid position and center, and you emit whatever SVG you like.
 */
export interface QrCodeCellsProps extends PrimitiveProps {
  /** Module shape: `square` (default), `dot`, `rounded`, or `fluid` (connected). */
  pattern?: QrCellPattern;
  /** Corner roundness in `[0, 1]` for `rounded`/`fluid`. Default `0.5`. */
  radius?: number;
  /** Gap between modules in `[0, 1)`, as a fraction of cell size. Ignored by `fluid`. Default `0`. */
  gap?: number;
  /** Also render the finder-pattern modules (use when not composing `QrCodeMarkers`). Default `false`. */
  includeMarkers?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useSlots } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { useQrCodeContext } from './context';
import { cellList, cellsPath } from './utils';

const {
  as = 'path',
  pattern = 'square',
  radius = 0.5,
  gap = 0,
  includeMarkers = false,
} = defineProps<QrCodeCellsProps>();

const { forwardRef } = useForwardExpose();
const ctx = useQrCodeContext();
const slots = useSlots();

const d = computed(() =>
  cellsPath(ctx.qr.value, { pattern, radius, gap, includeMarkers, isReserved: ctx.isReserved }),
);

const cells = computed(() =>
  cellList(ctx.qr.value, { includeMarkers, isReserved: ctx.isReserved }),
);
</script>

<template>
  <Primitive
    v-if="slots.cell"
    :ref="forwardRef"
    :as="as === 'path' ? 'g' : as"
    data-qr-cells
  >
    <slot
      v-for="cell in cells"
      :key="`${cell.x}-${cell.y}`"
      name="cell"
      v-bind="cell"
    />
  </Primitive>
  <Primitive
    v-else
    :ref="forwardRef"
    :as="as"
    :d="d"
    data-qr-cells
  />
</template>
