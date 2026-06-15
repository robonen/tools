<script lang="ts">
import type { CurveEditorAnchor } from './context';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * One anchor handle of a `CurveEditorRoot`, rendered as `role="slider"`. A 2D
 * control whose single `aria-valuenow` (the output `y`) can't carry both axes,
 * so `aria-valuetext` announces the pair as `"input {x}, output {y}"`.
 * `aria-valuemin`/`max` describe the output (`y`) domain.
 *
 * Anchors share one tab-stop (roving focus): Tab moves focus between them, the
 * arrow keys nudge the focused anchor. Left/Right nudge `x` by `step`
 * (neighbour- and domain-clamped; no-op for fixed endpoints), Up/Down nudge `y`
 * (Up = +y), Shift+Arrow uses the large step, PageUp/PageDown jump `y`, Home/End
 * move `x` to the domain min/max. Enter adds an anchor at the midpoint to the
 * next anchor; Delete/Backspace removes the focused anchor (never an endpoint).
 * Double-click also adds, drag moves the anchor (2D, clamped). Exposes the
 * anchor and its pixel position as slot props.
 */
export interface CurveEditorPointProps extends PrimitiveProps {
  /** The anchor this point renders. */
  anchor: CurveEditorAnchor;
  /**
   * Override the announced `aria-valuetext`. Receives the anchor's `x` and `y`
   * in domain space.
   */
  valueText?: (x: number, y: number) => string;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, useAttrs, watch } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useCurveEditorContext } from './context';
import { usePointerDrag } from '../../internal/pointer-drag';
import { useForwardExpose } from '@robonen/vue';
import { formatAnchorValueText } from './utils';

const { anchor, valueText, as = 'div' } = defineProps<CurveEditorPointProps>();
const ctx = useCurveEditorContext();
const attrs = useAttrs();

const index = computed(() => ctx.indexOf(anchor.id));
const isEndpoint = computed(() => ctx.isEndpoint(anchor.id));
const isActive = computed(() => ctx.activeIndex.value === index.value);

// Pixel position from the axis projections (x horizontal, y value-up vertical).
const pxX = computed(() => ctx.scaleX.scale(anchor.x));
const pxY = computed(() => ctx.scaleY.scale(anchor.y));

const positionStyle = computed<{ left: string; top: string }>(() => ({
  left: `${pxX.value}px`,
  top: `${pxY.value}px`,
}));

// `aria-valuemin`/`max`/`now` describe the OUTPUT (y) domain — the single axis a
// slider can express; `aria-valuetext` conveys both coordinates.
const domainY = computed(() => ctx.domainY.value);
const ariaValueMin = computed(() => Math.min(domainY.value[0], domainY.value[1]));
const ariaValueMax = computed(() => Math.max(domainY.value[0], domainY.value[1]));

const ariaValueText = computed<string | undefined>(() => {
  if (attrs['aria-valuetext'] !== undefined && attrs['aria-valuetext'] !== null) return undefined;
  if (valueText) return valueText(anchor.x, anchor.y);
  return formatAnchorValueText(anchor.x, anchor.y);
});

// Roving focus: only the active anchor is in the tab order.
const tabindex = computed(() => {
  if (ctx.disabled.value) return -1;
  return isActive.value ? 0 : -1;
});

const { forwardRef, currentElement } = useForwardExpose();

watch(currentElement, (node) => {
  ctx.registerAnchorEl(anchor.id, node ?? null);
});
onBeforeUnmount(() => ctx.registerAnchorEl(anchor.id, null));

// ── pointer drag (2D) ─────────────────────────────────────────────────────
// Map the element-relative pointer to domain x/y via inverse projection. The
// drag tracks the ROOT element's rect (the projections measure that box).
// Capture the anchor's pixel origin at drag start so cumulative drag totals
// (client px, which equal plot px 1:1) project back through the scales without
// needing the plot rect.
let dragOriginX = 0;
let dragOriginY = 0;
usePointerDrag(currentElement, {
  axis: 'both',
  threshold: 0,
  disabled: () => ctx.disabled.value,
  onStart: () => {
    ctx.setActiveIndex(index.value);
    dragOriginX = pxX.value;
    dragOriginY = pxY.value;
  },
  onMove: (state) => {
    const x = ctx.scaleX.invert(dragOriginX + state.total.x);
    const y = ctx.scaleY.invert(dragOriginY + state.total.y);
    // Live update only — the drag commits once on settle (onCommit), so
    // `anchorsCommit` fires per the documented "after a drag settles" contract
    // rather than once per rAF frame.
    ctx.updateAnchor(anchor.id, { x, y });
  },
  // Successful pointerup only (never on cancel/abort): emit the settled anchors.
  onCommit: () => ctx.commit(),
});

// ── keyboard ──────────────────────────────────────────────────────────────
// A keyboard nudge is a discrete settle: emit `anchorsCommit` once, only when
// the anchor actually moved (a clamped no-op at a domain edge does not commit,
// matching the original updateAnchor-only-on-change behaviour).
function nudge(dx: number, dy: number): void {
  let changed = false;
  if (dx !== 0) changed = ctx.updateAnchor(anchor.id, { x: anchor.x + dx }) || changed;
  if (dy !== 0) changed = ctx.updateAnchor(anchor.id, { y: anchor.y + dy }) || changed;
  if (changed) ctx.commit();
}

function onKeyDown(event: KeyboardEvent): void {
  if (ctx.disabled.value) return;
  const rtl = ctx.direction.value === 'rtl';
  const step = ctx.step.value;
  const big = ctx.largeStep.value;
  const unit = event.shiftKey ? big : step;
  const [dyMin, dyMax] = ctx.domainY.value;
  const ySpan = Math.abs(dyMax - dyMin);
  const xLocked = ctx.fixedEndpoints.value && isEndpoint.value;

  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault();
      if (!xLocked) nudge(rtl ? -unit : unit, 0);
      return;
    case 'ArrowLeft':
      event.preventDefault();
      if (!xLocked) nudge(rtl ? unit : -unit, 0);
      return;
    case 'ArrowUp':
      event.preventDefault();
      nudge(0, unit);
      return;
    case 'ArrowDown':
      event.preventDefault();
      nudge(0, -unit);
      return;
    case 'PageUp':
      event.preventDefault();
      if (ctx.updateAnchor(anchor.id, { y: anchor.y + ySpan * 0.1 })) ctx.commit();
      return;
    case 'PageDown':
      event.preventDefault();
      if (ctx.updateAnchor(anchor.id, { y: anchor.y - ySpan * 0.1 })) ctx.commit();
      return;
    case 'Home':
      event.preventDefault();
      if (!xLocked && ctx.updateAnchor(anchor.id, { x: ctx.domainX.value[0] })) ctx.commit();
      return;
    case 'End':
      event.preventDefault();
      if (!xLocked && ctx.updateAnchor(anchor.id, { x: ctx.domainX.value[1] })) ctx.commit();
      return;
    case 'Enter': {
      event.preventDefault();
      // Add an anchor between this one and the next (or before, at the last).
      const list = ctx.anchors.value;
      const i = index.value;
      const next = list[i + 1] ?? list[i - 1];
      if (!next) return;
      const midX = (anchor.x + next.x) / 2;
      ctx.addAnchor(midX);
      return;
    }
    case 'Delete':
    case 'Backspace':
      event.preventDefault();
      ctx.removeAnchor(anchor.id);
      break;
    default:
      break;
  }
}

function onDblClick(event: MouseEvent): void {
  if (ctx.disabled.value) return;
  event.preventDefault();
  // Double-click on an interior anchor removes it; on an endpoint adds a midpoint.
  if (!isEndpoint.value) {
    ctx.removeAnchor(anchor.id);
    return;
  }
  const list = ctx.anchors.value;
  const i = index.value;
  const neighbour = list[i + 1] ?? list[i - 1];
  if (neighbour) ctx.addAnchor((anchor.x + neighbour.x) / 2);
}

function onFocus(): void {
  if (index.value !== -1) ctx.setActiveIndex(index.value);
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="slider"
    :tabindex="tabindex"
    :aria-valuemin="ariaValueMin"
    :aria-valuemax="ariaValueMax"
    :aria-valuenow="anchor.y"
    :aria-valuetext="ariaValueText"
    :aria-orientation="undefined"
    :aria-disabled="ctx.disabled.value || undefined"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :data-endpoint="isEndpoint ? '' : undefined"
    :data-active="isActive ? '' : undefined"
    :data-channel="ctx.channel.value"
    :style="positionStyle"
    @keydown="onKeyDown"
    @dblclick="onDblClick"
    @focus="onFocus"
  >
    <slot :anchor="anchor" :x="pxX" :y="pxY" :active="isActive" :endpoint="isEndpoint" />
  </Primitive>
</template>
