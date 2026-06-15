<script lang="ts">
import type { DayPeriod, SegmentPart } from './use-date-field';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A single segment of a `DatePickerFieldRoot`. Editable parts (`day`, `month`,
 * `year`, `hour`, `minute`, `second`, `dayPeriod`) render as a focusable
 * `role="spinbutton"` with `aria-valuemin/max/now/valuetext`; `literal` parts
 * render as inert separators. Supports arrow increment/decrement, numeric
 * type-ahead with auto-advance, Backspace to clear, and `a`/`p` for AM/PM.
 */
export interface DatePickerFieldSegmentProps extends PrimitiveProps {
  /** The date part this segment edits. */
  part: SegmentPart;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { useDatePickerFieldContext } from './field-context';
import {
  applySegmentKeydown,
  isEditableSegmentPart,
  resolveHourCycle,
} from './use-date-field';

const { part, as = 'div' } = defineProps<DatePickerFieldSegmentProps>();

const ctx = useDatePickerFieldContext();
const adapter = ctx.dateAdapter;
const { forwardRef, currentElement } = useForwardExpose();

const isLiteral = computed(() => part === 'literal');
const isEditable = computed(() => isEditableSegmentPart(part));

const displayValue = computed(() => {
  // Find this part's current content. For repeated literals we just show value.
  const match = ctx.segmentContents.value.find(s => s.part === part);
  return match?.value ?? '';
});

const isEmpty = computed(() => {
  if (!isEditable.value || part === 'dayPeriod') return false;
  const v = (ctx.segmentValues.value as Record<string, unknown>)[part];
  return v === null || v === undefined;
});

// Type-ahead state lives per segment instance.
const typeState = { hasLeftFocus: true, lastKeyZero: false };

const ariaValues = computed(() => {
  const values = ctx.segmentValues.value;
  switch (part) {
    case 'day': {
      // Use the placeholder's real year so `aria-valuemax` matches the editing
      // cap in `applySegmentKeydown` (February differs across leap/non-leap years).
      const year = adapter.value.getParts(ctx.placeholder.value).year;
      const monthDays = values.month
        ? adapter.value.getDaysInMonth(adapter.value.fromParts({ year, month: values.month, day: 1 }))
        : 31;
      return { min: 1, max: monthDays, now: values.day ?? undefined, label: 'day' };
    }
    case 'month':
      return { min: 1, max: 12, now: values.month ?? undefined, label: 'month' };
    case 'year':
      return { min: 1, max: 9999, now: values.year ?? undefined, label: 'year' };
    case 'hour': {
      const is12 = resolveHourCycle(ctx.hourCycle.value, ctx.locale.value) === 12;
      return {
        min: is12 ? 1 : 0,
        max: is12 ? 12 : 23,
        now: values.hour ?? undefined,
        label: 'hour',
      };
    }
    case 'minute':
      return { min: 0, max: 59, now: values.minute ?? undefined, label: 'minute' };
    case 'second':
      return { min: 0, max: 59, now: values.second ?? undefined, label: 'second' };
    case 'dayPeriod':
      return { min: 0, max: 12, now: (values.hour ?? 0) % 12, label: 'AM/PM' };
    default:
      return { min: undefined, max: undefined, now: undefined, label: undefined };
  }
});

const ariaValueText = computed(() => {
  if (isEmpty.value) return 'Empty';
  if (part === 'dayPeriod') return ctx.segmentValues.value.dayPeriod ?? 'AM';
  return displayValue.value;
});

let cleanup: (() => void) | undefined;
onMounted(() => {
  if (isEditable.value && !ctx.readonly.value && currentElement.value)
    cleanup = ctx.registerSegment(currentElement.value, part);
});
onBeforeUnmount(() => cleanup?.());

const disabled = computed(() => ctx.disabled.value);
const readonly = computed(() => ctx.readonly.value);

function handleKeydown(e: KeyboardEvent) {
  if (!isEditable.value) return;
  if (disabled.value || readonly.value) return;

  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    ctx.focusSegment(currentElement.value!, -1);
    return;
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    ctx.focusSegment(currentElement.value!, 1);
    return;
  }
  if (e.key === 'Tab' || e.key === 'Shift')
    return;

  e.preventDefault();
  typeState.hasLeftFocus = false;

  const result = applySegmentKeydown(e, {
    adapter: adapter.value,
    part: part as Exclude<SegmentPart, 'literal'>,
    values: ctx.segmentValues.value,
    placeholder: ctx.placeholder.value,
    granularity: ctx.granularity.value,
    hourCycle: ctx.hourCycle.value,
    locale: ctx.locale.value,
    state: typeState,
    focusNext: () => ctx.focusNext(currentElement.value!),
  });

  if (!result) return;

  ctx.updateSegment(result.part, result.value);
  if ('dayPeriod' in result && result.dayPeriod !== undefined)
    ctx.updateSegment('dayPeriod', result.dayPeriod as DayPeriod);
  if ('hour' in result && typeof (result as { hour?: number }).hour === 'number')
    ctx.updateSegment('hour', (result as { hour: number }).hour);

  ctx.commit();
}

function handleFocusOut() {
  typeState.hasLeftFocus = true;
}
</script>

<template>
  <Primitive
    v-if="isLiteral"
    :as="as"
    aria-hidden="true"
    :data-primitives-date-picker-segment="part"
    data-readonly=""
  >
    <slot :value="displayValue">{{ displayValue }}</slot>
  </Primitive>
  <Primitive
    v-else
    :ref="forwardRef"
    :as="as"
    role="spinbutton"
    :contenteditable="false"
    :tabindex="disabled ? undefined : 0"
    :aria-label="ariaValues.label"
    :aria-valuemin="ariaValues.min"
    :aria-valuemax="ariaValues.max"
    :aria-valuenow="ariaValues.now"
    :aria-valuetext="ariaValueText"
    :aria-disabled="disabled ? true : undefined"
    :aria-readonly="readonly ? true : undefined"
    :aria-invalid="ctx.isInvalid.value ? true : undefined"
    :data-primitives-date-picker-segment="part"
    :data-placeholder="isEmpty ? '' : undefined"
    :data-disabled="disabled ? '' : undefined"
    :data-readonly="readonly ? '' : undefined"
    :data-invalid="ctx.isInvalid.value ? '' : undefined"
    spellcheck="false"
    autocorrect="off"
    inputmode="numeric"
    @keydown="handleKeydown"
    @focusout="handleFocusOut"
  >
    <slot :value="displayValue">{{ displayValue }}</slot>
  </Primitive>
</template>
