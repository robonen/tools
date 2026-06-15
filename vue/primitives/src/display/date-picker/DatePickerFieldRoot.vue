<script lang="ts">
import type { SegmentContent, SegmentPart, SegmentValues } from './use-date-field';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A segmented date field: a `role="group"` of individually-focusable
 * `role="spinbutton"` segments (`DatePickerFieldSegment`) that edit one part of
 * the date each. It reads the picker's value, placeholder, locale, granularity,
 * and hour cycle from `DatePickerRoot`, and commits a complete date back to the
 * picker. This is the accessible, keyboard-driven alternative to the plain
 * `DatePickerField` text input.
 *
 * The default slot receives the ordered `segments` descriptors (including
 * literals) and the current `modelValue`, so the consumer renders a
 * `DatePickerFieldSegment` per segment.
 */
export interface DatePickerFieldRootProps extends PrimitiveProps {}

export interface DatePickerFieldRootSlot {
  default?: (props: {
    segments: SegmentContent[];
    modelValue: Date | undefined;
    isInvalid: boolean;
  }) => unknown;
}
</script>

<script setup lang="ts">
import { computed, markRaw, shallowRef, triggerRef, watch } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { useDatePickerRootContext } from './context';
import { provideDatePickerFieldContext } from './field-context';
import {
  createSegmentContents,
  initializeSegmentValues,
  isSegmentValuesComplete,
  segmentValuesToDate,
  syncSegmentValues,
} from './use-date-field';

const { as = 'div' } = defineProps<DatePickerFieldRootProps>();
defineSlots<DatePickerFieldRootSlot>();
defineOptions({ inheritAttrs: false });

const ctx = useDatePickerRootContext();
const { forwardRef, currentElement } = useForwardExpose();

const adapter = ctx.dateAdapter;
const granularity = ctx.granularity;
const hourCycle = ctx.hourCycle;

const segmentValues = shallowRef<SegmentValues>(
  ctx.modelValue.value
    ? syncSegmentValues(adapter.value, ctx.modelValue.value, granularity.value)
    : initializeSegmentValues(granularity.value),
);

// Re-seed when the model or granularity changes from the outside.
watch([() => ctx.modelValue.value, granularity], ([value, gran]) => {
  if (value) {
    segmentValues.value = syncSegmentValues(adapter.value, value, gran);
  }
  else if (Object.values(segmentValues.value).every(v => v !== null)) {
    // Only reset when the field was fully populated; preserve mid-edit state.
    segmentValues.value = initializeSegmentValues(gran);
  }
});

const segmentContents = computed<SegmentContent[]>(() => createSegmentContents(
  segmentValues.value,
  ctx.placeholder.value,
  granularity.value,
  hourCycle.value,
  ctx.locale.value,
));

// Ordered registry of focusable segment elements (DOM order via querySelectorAll).
// `shallowRef` so element keys stay raw (a deep `ref` would proxy the Map and
// its entries); mutated in place, so `triggerRef` after each change.
const segmentMap = shallowRef<Map<HTMLElement, SegmentPart>>(new Map());

function registerSegment(el: HTMLElement, part: SegmentPart): () => void {
  const key = markRaw(el);
  segmentMap.value.set(key, part);
  triggerRef(segmentMap);
  return () => {
    segmentMap.value.delete(key);
    triggerRef(segmentMap);
  };
}

function orderedSegments(): HTMLElement[] {
  const root = currentElement.value;
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>('[data-primitives-date-picker-segment]:not([data-readonly])'),
  );
}

function focusSegment(from: HTMLElement, direction: 1 | -1) {
  const sign = ctx.dir.value === 'rtl' ? -direction : direction;
  const els = orderedSegments();
  const index = els.indexOf(from);
  if (index < 0) return;
  const next = els[index + sign];
  next?.focus();
}

function focusNext(from: HTMLElement) {
  const els = orderedSegments();
  const index = els.indexOf(from);
  if (index < 0) return;
  els[index + 1]?.focus();
}

function commit() {
  if (ctx.readonly.value || ctx.disabled.value) return;
  if (!isSegmentValuesComplete(segmentValues.value, granularity.value)) return;
  ctx.onDateChange(segmentValuesToDate(adapter.value, segmentValues.value, granularity.value));
}

function updateSegment(part: SegmentPart, value: number | string | null) {
  // Replace wholesale so shallowRef triggers without deep tracking.
  segmentValues.value = { ...segmentValues.value, [part]: value };
}

provideDatePickerFieldContext({
  dateAdapter: adapter,
  locale: ctx.locale,
  dir: ctx.dir,
  placeholder: ctx.placeholder,
  disabled: ctx.disabled,
  readonly: ctx.readonly,
  isInvalid: ctx.isInvalid,
  hourCycle,
  granularity,
  segmentValues,
  segmentContents,
  registerSegment,
  focusSegment,
  focusNext,
  updateSegment,
  commit,
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    v-bind="$attrs"
    :as="as"
    role="group"
    :data-primitives-date-picker-field-root="''"
    :aria-disabled="ctx.disabled.value ? true : undefined"
    :aria-invalid="ctx.isInvalid.value ? true : undefined"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :data-readonly="ctx.readonly.value ? '' : undefined"
    :data-invalid="ctx.isInvalid.value ? '' : undefined"
    :dir="ctx.dir.value"
  >
    <slot
      :segments="segmentContents"
      :model-value="ctx.modelValue.value"
      :is-invalid="ctx.isInvalid.value"
    />
  </Primitive>
</template>
