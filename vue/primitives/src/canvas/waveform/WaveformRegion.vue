<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A single audio region (selection), rendered as `role="group"` whose
 * `aria-label` is the formatted `start–end` range (plus the region `label` when
 * set). It positions and sizes itself from `projection(start)..projection(end)`
 * and hosts two `WaveformRegionHandle` children (one per edge) so trimming is
 * keyboard-driven like a two-thumb range slider. The group itself can be moved
 * by dragging its body; Enter/Space select it, Delete/Backspace remove it.
 * Exposes `data-selected` / `data-active`.
 */
export interface WaveformRegionProps extends PrimitiveProps {
  /** The id of the region (in the root's `regions`) this part renders. */
  regionId: string;
  /** Whether the group body can be dragged to move the whole region. @default true */
  draggable?: boolean;
}
</script>

<script setup lang="ts">
import { computed, shallowRef, toRef } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { usePointerDrag } from '../../internal/pointer-drag';
import { provideWaveformRegionContext, useWaveformContext } from './context';
import type { WaveformRegionEdge } from './context';

const { as = 'div', regionId, draggable = true } = defineProps<WaveformRegionProps>();
const ctx = useWaveformContext();

const { forwardRef, currentElement } = useForwardExpose();

const region = computed(() => ctx.regions.value.find(r => r.id === regionId));
const start = computed(() => region.value?.start ?? 0);
const end = computed(() => region.value?.end ?? 0);

const selected = shallowRef(false);

const leftPx = computed(() => (ctx.isEmpty.value ? 0 : ctx.projection.scale(start.value)));
const rightPx = computed(() => (ctx.isEmpty.value ? 0 : ctx.projection.scale(end.value)));
const sizePx = computed(() => Math.abs(rightPx.value - leftPx.value));

const positionStyle = computed<{ left: string | undefined; right: string | undefined; width: string }>(() => {
  const w = `${sizePx.value}px`;
  const near = `${Math.min(leftPx.value, rightPx.value)}px`;
  if (ctx.direction.value === 'rtl') return { left: undefined, right: near, width: w };
  return { left: near, right: undefined, width: w };
});

const ariaLabel = computed(() => {
  const fmt = ctx.timeFormatter.value;
  const range = `${fmt(start.value)}–${fmt(end.value)}`;
  return region.value?.label ? `${region.value.label}, ${range}` : range;
});

function trim(edge: WaveformRegionEdge, seconds: number, commit = false): void {
  if (edge === 'start') ctx.updateRegion(regionId, { start: seconds }, commit);
  else ctx.updateRegion(regionId, { end: seconds }, commit);
}

provideWaveformRegionContext({
  id: toRef(() => regionId),
  start,
  end,
  selected,
  trim,
});

// ── move the whole region by dragging its body ──────────────────────────────
let dragStart = 0;
let dragEnd = 0;
usePointerDrag(currentElement, {
  axis: 'x',
  threshold: 3,
  disabled: () => ctx.disabled.value || !draggable,
  onStart: () => {
    if (ctx.disabled.value || !draggable) return false;
    // Edge handles `stopPropagation()` on pointerdown so their press never
    // reaches this body drag — a press here always means "move the region".
    dragStart = start.value;
    dragEnd = end.value;
    selected.value = true;
    return undefined;
  },
  onMove: (state) => {
    const ppu = pxPerSecond();
    if (ppu === 0) return;
    const dt = (ctx.direction.value === 'rtl' ? -state.total.x : state.total.x) / ppu;
    const dur = ctx.duration.value;
    const span = dragEnd - dragStart;
    let ns = dragStart + dt;
    // Clamp the whole region within [0, duration] preserving its span.
    if (ns < 0) ns = 0;
    if (ns + span > dur) ns = dur - span;
    ctx.updateRegion(regionId, { start: ns, end: ns + span });
  },
  onCommit: () => {
    const r = ctx.regions.value.find(x => x.id === regionId);
    if (r) ctx.updateRegion(regionId, { start: r.start, end: r.end }, true);
  },
});

function pxPerSecond(): number {
  // Derive from the projection over a 1-second probe (robust to zoom/fit).
  const a = ctx.projection.scale(0);
  const b = ctx.projection.scale(1);
  return Math.abs(b - a);
}

function onKeyDown(event: KeyboardEvent): void {
  if (ctx.disabled.value) return;
  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault();
      selected.value = !selected.value;
      break;
    case 'Delete':
    case 'Backspace':
      event.preventDefault();
      ctx.removeRegion(regionId);
      break;
    default:
      break;
  }
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="group"
    :aria-label="ariaLabel"
    :data-selected="selected ? '' : undefined"
    :data-active="selected ? '' : undefined"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :style="{ position: 'absolute', top: '0', bottom: '0', ...positionStyle }"
    tabindex="0"
    @keydown="onKeyDown"
    @focus="selected = true"
  >
    <slot
      :region="region"
      :start="start"
      :end="end"
      :selected="selected"
    />
  </Primitive>
</template>
