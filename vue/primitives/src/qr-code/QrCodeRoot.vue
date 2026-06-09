<script lang="ts">
import type { PrimitiveProps } from '../primitive';
import type { QrCodeErrorCorrection, QrCodeMargin } from './context';

/**
 * The root of a QR code. Encodes `value` into a matrix (via `@robonen/encoding`)
 * and renders an `<svg>` whose viewBox is laid out in module units, so every
 * child part draws in the same resolution-independent coordinate space and the
 * whole code scales with the SVG's CSS width/height.
 *
 * It is fully headless: compose `QrCodeBackground`, `QrCodeCells`,
 * `QrCodeMarkers`/`QrCodeMarker` and `QrCodeLogo` inside it and style them with
 * CSS (`fill`, gradients, `<defs>`) — patterns, marker shapes and logos are all
 * controlled by props or slots on those parts.
 *
 * @example
 * ```vue
 * <QrCodeRoot value="https://example.com" class="size-48">
 *   <QrCodeCells pattern="fluid" />
 *   <QrCodeMarkers frame="rounded" ball="circle" />
 * </QrCodeRoot>
 * ```
 */
export interface QrCodeRootProps extends PrimitiveProps {
  /** The text to encode. Re-encodes reactively when it changes. */
  value: string;
  /** Error-correction level — higher levels survive more damage (and logos) at the cost of density. Default `'M'`. */
  errorCorrection?: QrCodeErrorCorrection;
  /** Quiet-zone width in modules, uniform or per-side. Default `4` (the spec minimum). */
  margin?: number | Partial<QrCodeMargin>;
  /** Smallest QR version (1–40) to consider. Default `1`. */
  minVersion?: number;
  /** Largest QR version (1–40) to consider. Default `40`. */
  maxVersion?: number;
  /** Mask pattern (0–7), or `-1` to auto-select the lowest-penalty mask. Default `-1`. */
  mask?: number;
  /** Whether to automatically raise the error-correction level if the data still fits. Default `true`. */
  boostEcc?: boolean;
}
</script>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { EccMap, QrCodeDataType, encodeSegments, makeSegments } from '@robonen/encoding';
import { useForwardExpose, useId } from '@robonen/vue';
import { Primitive } from '../primitive';
import { provideQrCodeContext } from './context';
import type { QrCodeRegion } from './utils';
import { markerPlacements } from './utils';

const {
  as = 'svg',
  value,
  errorCorrection = 'M',
  margin = 4,
  minVersion = 1,
  maxVersion = 40,
  mask = -1,
  boostEcc = true,
} = defineProps<QrCodeRootProps>();

const { forwardRef } = useForwardExpose();
const id = useId(undefined, 'qr');

const qr = computed(() =>
  encodeSegments(makeSegments(value), EccMap[errorCorrection], minVersion, maxVersion, mask, boostEcc),
);

const size = computed(() => qr.value.size);

const resolvedMargin = computed<QrCodeMargin>(() => {
  if (typeof margin === 'number')
    return { top: margin, right: margin, bottom: margin, left: margin };
  return { top: margin.top ?? 0, right: margin.right ?? 0, bottom: margin.bottom ?? 0, left: margin.left ?? 0 };
});

const markers = computed(() => markerPlacements(size.value));

const viewBox = computed(() => {
  const m = resolvedMargin.value;
  const width = m.left + size.value + m.right;
  const height = m.top + size.value + m.bottom;
  return `${-m.left} ${-m.top} ${width} ${height}`;
});

const reserved = reactive(new Map<symbol, QrCodeRegion>());

function reserve(owner: symbol, region: QrCodeRegion | null): void {
  if (region)
    reserved.set(owner, region);
  else
    reserved.delete(owner);
}

function release(owner: symbol): void {
  reserved.delete(owner);
}

function isReserved(x: number, y: number): boolean {
  const cx = x + 0.5;
  const cy = y + 0.5;
  for (const r of reserved.values()) {
    if (cx >= r.x && cx < r.x + r.width && cy >= r.y && cy < r.y + r.height)
      return true;
  }
  return false;
}

provideQrCodeContext({
  qr,
  size,
  margin: resolvedMargin,
  markers,
  isDark: (x, y) => qr.value.getModule(x, y),
  getModuleType: (x, y) => (x >= 0 && y >= 0 && x < size.value && y < size.value ? qr.value.getType(x, y) : QrCodeDataType.Border),
  isReserved,
  reserve,
  release,
  id,
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :viewBox="viewBox"
    role="img"
    :data-qr-size="size"
    :data-qr-version="qr.version"
  >
    <slot :qr="qr" :size="size" :markers="markers" />
  </Primitive>
</template>
