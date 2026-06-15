import type { ComputedRef, Ref } from 'vue';
import type { DateAdapter } from '../../utilities/config-provider';
import type { Granularity, HourCycle, SegmentContent, SegmentPart, SegmentValues } from './use-date-field';
import { useContextFactory } from '@robonen/vue';

export interface DatePickerFieldContext {
  /** Resolved date backend, inherited from `DatePickerRoot`. */
  dateAdapter: ComputedRef<DateAdapter<Date>>;
  locale: Ref<string>;
  dir: Ref<'ltr' | 'rtl'>;
  placeholder: Ref<Date>;
  disabled: Ref<boolean>;
  readonly: Ref<boolean>;
  isInvalid: Ref<boolean>;
  hourCycle: Ref<HourCycle>;
  granularity: ComputedRef<Granularity>;
  /** Live per-part numeric/string values (null when empty). */
  segmentValues: Ref<SegmentValues>;
  /** Ordered, formatted segment descriptors (incl. literals) for rendering. */
  segmentContents: ComputedRef<SegmentContent[]>;
  /** Registered focusable segment elements in DOM order. */
  registerSegment: (el: HTMLElement, part: SegmentPart) => () => void;
  /** Move focus to the next/previous focusable segment (RTL-aware). */
  focusSegment: (from: HTMLElement, direction: 1 | -1) => void;
  focusNext: (from: HTMLElement) => void;
  /** Mutate a single part value and recompute the committed model value. */
  updateSegment: (part: SegmentPart, value: number | string | null) => void;
  /** Commit current segment values into the picker model if complete. */
  commit: () => void;
}

const ctx = useContextFactory<DatePickerFieldContext>('date-picker-field');
export const provideDatePickerFieldContext = ctx.provide;
export const useDatePickerFieldContext = ctx.inject;
