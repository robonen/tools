<script lang="ts">
import type { GradientEditorDirection, GradientEditorValueText, GradientStop, GradientStopEntry, GradientStopPatch, GradientType } from './context';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The headless root of a gradient-stop editor. It owns the list of color stops
 * (controlled via `v-model` or uncontrolled via `defaultValue`), the gradient
 * `type` (`'linear'` / `'radial'`), and the linear `angle`, and exposes a shared
 * context so `GradientEditorTrack`, `GradientEditorStops`, `GradientEditorStop`,
 * `GradientEditorAngle`, and `GradientEditorColorEditor` stay in sync.
 *
 * Each stop is `{ id, position, color }` with `position` a fraction in `[0, 1]`
 * and `color` any CSS color string. The root keeps the stops sorted (stable
 * tie-break at identical positions), drags/keys a stop with snapping and either
 * neighbour-clamp (`reorder: false`) or cross-and-re-sort (`reorder: true`),
 * adds a stop on track clicks (color interpolated from neighbours), and never
 * removes below `minStops`. It also derives a `cssGradient` string for previews.
 *
 * Per-stop color editing is delegated to a `ColorField` (compose
 * `GradientEditorColorEditor`, or mount one yourself). Reach for it whenever a
 * user should design a multi-stop gradient (CSS backgrounds, color ramps,
 * heatmap scales).
 */
export interface GradientEditorRootProps extends PrimitiveProps {
  /** Uncontrolled initial stops. @default [] */
  defaultValue?: GradientStop[];
  /** Gradient type. @default 'linear' */
  type?: GradientType;
  /** Uncontrolled initial linear angle in degrees. @default 90 */
  defaultAngle?: number;
  /** Uncontrolled initial selected stop id. */
  defaultSelectedId?: string | null;
  /** Minimum number of stops; removal is blocked at this floor. @default 2 */
  minStops?: number;
  /**
   * Whether dragging / nudging a stop past a neighbour re-sorts the list
   * (`true`, each id keeps its color) or clamps to the neighbour so ids never
   * cross (`false`). @default true
   */
  reorder?: boolean;
  /** Keyboard step (fraction) for Arrow nudges. @default 0.001 */
  step?: number;
  /** Large keyboard step (Shift+Arrow / Page keys). @default 0.05 */
  largeStep?: number;
  /**
   * Optional grid snap increment (fraction) applied to drags and keyboard
   * moves. `undefined` disables grid snapping. @default undefined
   */
  snapStep?: number;
  /** Disable all interaction. @default false */
  disabled?: boolean;
  /**
   * Writing direction. When omitted it is inherited from the nearest
   * `ConfigProvider` (falling back to `'ltr'`); an explicit value wins.
   */
  dir?: GradientEditorDirection;
  /** Optional per-stop `aria-valuetext` formatter. */
  valueText?: GradientEditorValueText;
}

export interface GradientEditorRootEmits {
  /** Emitted when a stop is added (after the model updates), with its id. */
  addStop: [id: string];
  /** Emitted when a stop is removed, with its id. */
  removeStop: [id: string];
  /** Emitted when a stop is selected (or cleared with `null`). */
  selectStop: [id: string | null];
}
</script>

<script setup lang="ts">
import { computed, shallowRef, toRef, watch } from 'vue';
import { Primitive } from '../../internal/primitive';
import { provideGradientEditorContext } from './context';
import { useDirection, useId } from '../../utilities/config-provider';
import { useForwardExpose } from '@robonen/vue';
import { clamp } from '@robonen/stdlib';
import {
  buildCssGradient,
  getStepDecimals,
  interpolateColorAt,
  neighboursAt,
  roundToStep,
  sortStops,
} from './utils';

const {
  defaultValue,
  type = 'linear',
  defaultAngle = 90,
  defaultSelectedId,
  minStops = 2,
  reorder = true,
  step = 0.001,
  largeStep = 0.05,
  snapStep,
  disabled = false,
  dir,
  valueText,
  as = 'div',
} = defineProps<GradientEditorRootProps>();

const emit = defineEmits<GradientEditorRootEmits>();

const direction = useDirection(() => dir);

// A stable per-instance id base captured ONCE during setup (`useId` routes
// through the active config). New stops append an incrementing counter so fresh
// ids can be minted at event time without re-injecting the config context.
const idBase = useId(undefined, 'gradient-stop').value;
let stopIdCounter = 0;
function nextStopId(): string {
  return `${idBase}-${stopIdCounter++}`;
}

// `defineModel` drives controlled (`v-model`) and uncontrolled modes. The stops
// array is always replaced wholesale, so `shallowRef` is enough.
const model = defineModel<GradientStop[] | null>();
const angleModel = defineModel<number | null>('angle');
const selectedModel = defineModel<string | null>('selectedId');

function normalizeStops(v: GradientStop[] | null | undefined): GradientStop[] {
  return Array.isArray(v) ? v.slice() : [];
}

const seed = Array.isArray(model.value) ? model.value.slice() : normalizeStops(defaultValue);
const localStops = shallowRef<GradientStop[]>(seed);

const seedAngle = typeof angleModel.value === 'number' ? angleModel.value : defaultAngle;
const localAngle = shallowRef<number>(seedAngle);

const seedSelected = selectedModel.value !== undefined
  ? selectedModel.value
  : (defaultSelectedId ?? null);
const localSelected = shallowRef<string | null>(seedSelected);

// Cache decimals per `step` out of the pointermove hot path.
let stepDecimals = getStepDecimals(step);
watch(() => step, (s) => {
  stepDecimals = getStepDecimals(s);
});

// ── adopt external model changes (controlled mode) ──────────────────────────
watch(model, (v) => {
  if (v === null || v === undefined) return;
  if (v === localStops.value) return;
  localStops.value = v.slice();
});
watch(angleModel, (v) => {
  if (v === null || v === undefined) return;
  if (v === localAngle.value) return;
  localAngle.value = v;
});
watch(selectedModel, (v) => {
  if (v === undefined) return;
  if (v === localSelected.value) return;
  localSelected.value = v;
});

// ── derived, sorted view (stable tie-break) ─────────────────────────────────
const sorted = computed<GradientStop[]>(() => sortStops(localStops.value));

// Memoized `id -> { stop, index }` over the sorted stops, rebuilt once whenever
// `sorted` changes. Per-stop parts read this for O(1) lookups instead of each
// running an O(n) find + indexOf every drag frame (which was O(n^2) per frame).
const stopIndex = computed<Map<string, GradientStopEntry>>(() => {
  const list = sorted.value;
  const map = new Map<string, GradientStopEntry>();
  for (let i = 0; i < list.length; i++) {
    const s = list[i]!;
    map.set(s.id, { stop: s, index: i });
  }
  return map;
});

const cssGradient = computed(() => buildCssGradient(sorted.value, type, localAngle.value));

const canRemove = computed(() => localStops.value.length > minStops);

function indexOf(id: string): number {
  return stopIndex.value.get(id)?.index ?? -1;
}

// ── writes ──────────────────────────────────────────────────────────────────
function commitStops(next: GradientStop[]): void {
  localStops.value = next;
  // `defineModel` emits `update:modelValue` on write.
  model.value = next;
}

function setAngle(next: number): void {
  if (disabled) return;
  if (next === localAngle.value) return;
  localAngle.value = next;
  angleModel.value = next;
}

function select(id: string | null): void {
  if (id === localSelected.value) return;
  localSelected.value = id;
  selectedModel.value = id;
  emit('selectStop', id);
}

/** Snap a fractional position to the grid (when configured) then to `step`. */
function resolvePosition(raw: number): number {
  let v = clamp(raw, 0, 1);
  if (snapStep !== undefined && snapStep > 0) {
    const snapDecimals = getStepDecimals(snapStep);
    v = roundToStep(v, snapStep, snapDecimals);
  }
  v = roundToStep(v, step, stepDecimals);
  return clamp(v, 0, 1);
}

function addStop(position: number, color?: string): string | undefined {
  if (disabled) return undefined;
  const pos = resolvePosition(position);
  const { before, after } = neighboursAt(sorted.value, pos);
  const resolvedColor = color ?? interpolateColorAt(pos, before, after, '#000000');
  const id = nextStopId();
  const next = localStops.value.slice();
  next.push({ id, position: pos, color: resolvedColor });
  commitStops(next);
  select(id);
  emit('addStop', id);
  return id;
}

function removeStop(id: string): void {
  if (disabled) return;
  // No-op at the floor — surfaced via `canRemove` so consumers disable a button.
  if (localStops.value.length <= minStops) return;
  const idx = localStops.value.findIndex(s => s.id === id);
  if (idx === -1) return;
  const next = localStops.value.slice();
  next.splice(idx, 1);
  commitStops(next);
  if (localSelected.value === id) {
    // Select the nearest surviving stop (in sorted order) for a smooth handoff.
    const survivors = sortStops(next);
    const fallback = survivors[Math.min(idx, survivors.length - 1)] ?? survivors[0] ?? null;
    select(fallback ? fallback.id : null);
  }
  emit('removeStop', id);
}

function updateStop(id: string, patch: GradientStopPatch): void {
  if (disabled) return;
  const idx = localStops.value.findIndex(s => s.id === id);
  if (idx === -1) return;
  const cur = localStops.value[idx]!;
  const nextPosition = patch.position !== undefined
    ? clampPosition(id, patch.position)
    : cur.position;
  const nextColor = patch.color !== undefined ? patch.color : cur.color;
  if (nextPosition === cur.position && nextColor === cur.color) return;
  const next = localStops.value.slice();
  next[idx] = { ...cur, position: nextPosition, color: nextColor };
  commitStops(next);
}

/**
 * Resolve the position for a move/update honoring the `reorder` policy:
 * `reorder: false` clamps between the immediate neighbours in sorted order so
 * ids never cross; `reorder: true` only resolves to step/grid (the sort handles
 * crossing). Always snapped to grid/step first.
 */
function clampPosition(id: string, raw: number): number {
  const pos = resolvePosition(raw);
  if (reorder) return pos;
  const list = sorted.value;
  const i = list.findIndex(s => s.id === id);
  if (i === -1) return pos;
  const lower = list[i - 1]?.position ?? 0;
  const upper = list[i + 1]?.position ?? 1;
  return clamp(pos, lower, upper);
}

function moveStop(id: string, position: number): void {
  if (disabled) return;
  updateStop(id, { position });
}

// The bar element, set by `GradientEditorTrack` so pointer math has a rect.
const trackRef = shallowRef<HTMLElement | null>(null);

// ── stop element registry (roving focus) ────────────────────────────────────
const stopEls = new Map<string, HTMLElement>();
function registerStopEl(id: string, el: HTMLElement | null): void {
  if (el) stopEls.set(id, el);
  else stopEls.delete(id);
}
function getStopEl(id: string): HTMLElement | null {
  return stopEls.get(id) ?? null;
}

// Keep selection valid: if the selected stop disappears, clear it.
watch(sorted, (list) => {
  const sel = localSelected.value;
  if (sel !== null && !list.some(s => s.id === sel)) {
    select(list[0]?.id ?? null);
  }
});

provideGradientEditorContext({
  stops: sorted,
  stopIndex,
  selectedId: localSelected,
  type: toRef(() => type),
  angle: localAngle,
  minStops: toRef(() => minStops),
  step: toRef(() => step),
  largeStep: toRef(() => largeStep),
  snapStep: toRef(() => snapStep),
  reorder: toRef(() => reorder),
  valueText: toRef(() => valueText),
  direction,
  disabled: toRef(() => disabled),
  cssGradient,
  canRemove,
  trackRef,
  setAngle,
  select,
  addStop,
  removeStop,
  updateStop,
  moveStop,
  registerStopEl,
  getStopEl,
  indexOf,
});

defineExpose({
  /** The sorted stops (read-only view). */
  stops: sorted,
  /** The CSS gradient string. */
  cssGradient,
  /** The selected stop id. */
  selectedId: localSelected,
  addStop,
  removeStop,
  updateStop,
  moveStop,
  select,
});

// `useForwardExpose` runs AFTER `defineExpose` so the composable merges the
// prior expose bindings (plus props + `$el`) instead of clobbering them.
const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :data-type="type"
    :aria-disabled="disabled || undefined"
    :data-disabled="disabled ? '' : undefined"
    :data-can-remove="canRemove ? '' : undefined"
    :dir="direction"
  >
    <slot
      :stops="sorted"
      :selected-id="localSelected"
      :css-gradient="cssGradient"
      :type="type"
      :angle="localAngle"
      :can-remove="canRemove"
    />
  </Primitive>
</template>
