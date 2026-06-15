<script lang="ts">
import type { CompareSliderDirection, CompareSliderOrientation, CompareSliderValueText } from './context';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A before/after split-reveal slider: two stacked layers (a base
 * `CompareSliderBefore` and a clipped `CompareSliderAfter`) with a draggable
 * divider that reveals exactly `position`% of the after-layer. The root owns the
 * reveal position (controlled via `v-model:position` or uncontrolled via
 * `defaultPosition`), clamps it to 0–100, and starts a pointer drag on press —
 * mapping the pointer's position over the root's box onto the reveal
 * percentage. When `hover` is set the divider follows the pointer on hover
 * (no press needed). It provides context to `CompareSliderBefore`,
 * `CompareSliderAfter`, `CompareSliderHandle`, and `CompareSliderDivider`, and
 * supports horizontal/vertical `orientation` plus `dir`/`inverted` direction.
 * Reach for it to compare two images, designs, or any two overlaid views.
 */
export interface CompareSliderRootProps extends PrimitiveProps {
  /** Orientation. @default 'horizontal' */
  orientation?: CompareSliderOrientation;
  /** Uncontrolled initial reveal position (0–100). @default 50 */
  defaultPosition?: number;
  /** Disable all interaction. @default false */
  disabled?: boolean;
  /** Invert the direction of interaction (and the revealed side). @default false */
  inverted?: boolean;
  /**
   * Writing direction. When omitted it is inherited from the nearest
   * `ConfigProvider` (falling back to `'ltr'`); an explicit value wins.
   */
  dir?: CompareSliderDirection;
  /** Position change per Arrow key press. @default 1 */
  keyboardStep?: number;
  /** Position change per Shift+Arrow / Page key press. @default 10 */
  keyboardLargeStep?: number;
  /** When true the divider follows the pointer on hover, without a press. @default false */
  hover?: boolean;
  /**
   * Optional formatter producing a human-friendly `aria-valuetext` for the
   * handle. Receives the reveal position (0–100).
   */
  valueText?: CompareSliderValueText;
}
</script>

<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue';
import { Primitive } from '../../internal/primitive';
import { provideCompareSliderContext } from './context';
import { useDirection } from '../../utilities/config-provider';
import { usePointerDrag } from '../../internal/pointer-drag';
import { useEventListener, useForwardExpose } from '@robonen/vue';
import { clamp } from '@robonen/stdlib';

const {
  orientation = 'horizontal',
  defaultPosition = 50,
  disabled = false,
  inverted = false,
  dir,
  keyboardStep = 1,
  keyboardLargeStep = 10,
  hover = false,
  valueText,
  as = 'div',
} = defineProps<CompareSliderRootProps>();

// Resolve direction: explicit `dir` prop wins, otherwise inherit from the
// nearest `ConfigProvider` (falls back to `'ltr'`).
const direction = useDirection(() => dir);

// `defineModel` drives both controlled (`v-model:position`) and uncontrolled
// modes; in uncontrolled mode `model.value` is `undefined` until first write,
// so `localPosition` below seeds from `defaultPosition`.
const model = defineModel<number>('position');

const localPosition = ref<number>(clamp(model.value ?? defaultPosition, 0, 100));

watch(model, (v) => {
  if (v === undefined || v === null) return;
  const next = clamp(v, 0, 100);
  if (next !== localPosition.value) localPosition.value = next;
});

const position = computed<number>({
  get: () => localPosition.value,
  set: (v) => {
    const next = clamp(v, 0, 100);
    if (next === localPosition.value) return;
    localPosition.value = next;
    // `defineModel` emits `update:position` on write — no manual emit needed.
    model.value = next;
  },
});

// Combined flip flag — the SAME flag drives BOTH the pointer-offset mapping and
// the after-layer clip side (see context.ts). For horizontal, rtl and inverted
// each flip the start edge; for vertical only `inverted` flips.
const flip = computed<boolean>(() =>
  orientation === 'horizontal'
    ? (direction.value === 'rtl') !== inverted
    : inverted,
);

// `defineExpose` MUST precede `useForwardExpose` (else Vue warns "expose()
// called only once" and clobbers the forwarded `$el`/props). `currentElement`
// is consumed at top-level setup below (drag/hover/context), so `defineExpose`
// is hoisted up to here — its dep `position` is already declared above.
defineExpose({ position });

const { forwardRef, currentElement } = useForwardExpose();

// Map a client point over the root's box onto the reveal percentage (0–100).
// Guard size === 0 → return 0 (mirror SliderRoot's `getValueFromPointer`).
function positionFromClient(clientX: number, clientY: number, rect?: DOMRect): number {
  // During a drag the caller passes the rect snapshotted at onStart (the box
  // cannot change mid-drag); hover passes nothing and measures live.
  const r = rect ?? currentElement.value?.getBoundingClientRect();
  if (!r) return 0;
  const horizontal = orientation === 'horizontal';
  const size = horizontal ? r.width : r.height;
  if (size === 0) return 0;
  let offset = horizontal ? clientX - r.left : clientY - r.top;
  // The SAME flip flag drives the after-layer clip side, so the divider and the
  // revealed region stay in sync.
  if (flip.value) offset = size - offset;
  return clamp((offset / size) * 100, 0, 100);
}

// Rect snapshotted for the duration of a drag — removes a getBoundingClientRect
// reflow on every onMove frame.
let gestureRect: DOMRect | undefined;

// Drag the divider. `threshold: 0` so a single press jumps to the pointer and
// drags from there (no dead zone). `state.point` is the live client point.
const drag = usePointerDrag(currentElement, {
  threshold: 0,
  disabled: () => disabled,
  preventDefault: true,
  onStart: (state) => {
    gestureRect = currentElement.value?.getBoundingClientRect();
    position.value = positionFromClient(state.point.x, state.point.y, gestureRect);
  },
  onMove: (state) => {
    position.value = positionFromClient(state.point.x, state.point.y, gestureRect);
  },
  onEnd: () => {
    gestureRect = undefined;
  },
});

const hovering = ref(false);

// Hover-move: when `hover` is set, the divider follows the pointer over the root
// without a press. A live drag takes precedence (its own pointermove drives the
// position), so skip while dragging.
useEventListener(currentElement, 'pointermove', (event: PointerEvent) => {
  if (disabled || !hover || drag.isDragging.value) return;
  position.value = positionFromClient(event.clientX, event.clientY);
});
useEventListener(currentElement, 'pointerenter', () => {
  if (disabled || !hover) return;
  hovering.value = true;
});
useEventListener(currentElement, 'pointerleave', () => {
  hovering.value = false;
});

function setPosition(next: number): void {
  if (disabled) return;
  position.value = next;
}
function stepBy(delta: number): void {
  if (disabled) return;
  position.value = localPosition.value + delta;
}

// Stable shape: always the same keys in the same order so V8 (and Vue's style
// patcher) sees a monomorphic object.
const rootStyle = computed<{ position: string }>(() => ({ position: 'relative' }));

provideCompareSliderContext({
  position,
  // `toRef(() => prop)` → `GetterRefImpl`: reactive `Ref` without a
  // `ReactiveEffect` / cache, since these are identity passthroughs.
  orientation: toRef(() => orientation),
  // `direction` is already a `ComputedRef` from `useDirection`; `flip` a `computed`.
  direction,
  disabled: toRef(() => disabled),
  inverted: toRef(() => inverted),
  flip,
  keyboardStep: toRef(() => keyboardStep),
  keyboardLargeStep: toRef(() => keyboardLargeStep),
  valueText: toRef(() => valueText),
  step: stepBy,
  setPosition,
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :style="rootStyle"
    :aria-disabled="disabled || undefined"
    :data-disabled="disabled ? '' : undefined"
    :data-orientation="orientation"
    :data-dragging="drag.isDragging.value ? '' : undefined"
    :data-hovering="hovering ? '' : undefined"
    :dir="direction"
  >
    <slot :position="position" />
  </Primitive>
</template>
