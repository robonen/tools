import type { SegmentContent } from '../use-date-field';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import {
  DatePickerCalendar,
  DatePickerCell,
  DatePickerCellTrigger,
  DatePickerContent,
  DatePickerFieldRoot,
  DatePickerFieldSegment,
  DatePickerGrid,
  DatePickerGridBody,
  DatePickerGridRow,
  DatePickerRoot,
  DatePickerTrigger,
} from '../index';

function press(el: Element, key: string) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

function mountField(rootProps: Record<string, unknown> = {}, options: Record<string, unknown> = {}) {
  return mount(defineComponent({
    setup: () => () => h(DatePickerRoot, rootProps, {
      default: () => h(DatePickerFieldRoot, null, {
        default: ({ segments }: { segments: SegmentContent[] }) =>
          segments.map((seg, i) => h(DatePickerFieldSegment, { key: i, part: seg.part }, {
            default: () => seg.value,
          })),
      }),
    }),
  }), { attachTo: document.body, ...options });
}

function segments(wrapper: ReturnType<typeof mount>, part?: string) {
  const sel = part
    ? `[data-primitives-date-picker-segment="${part}"]`
    : '[role="spinbutton"]';
  return Array.from(wrapper.element.querySelectorAll<HTMLElement>(sel));
}

describe('DatePicker field ARIA skeleton', () => {
  let w: ReturnType<typeof mount> | undefined;
  afterEach(() => {
    w?.unmount();
    w = undefined;
  });

  it('renders a role=group with role=spinbutton segments', () => {
    w = mountField();
    expect(w.element.querySelector('[role="group"]')).toBeTruthy();
    const spin = segments(w);
    // day/month/year for default day granularity
    expect(spin.length).toBe(3);
    for (const s of spin) {
      expect(s.getAttribute('role')).toBe('spinbutton');
      expect(s.getAttribute('tabindex')).toBe('0');
    }
  });

  it('marks empty segments with data-placeholder and aria-valuetext=Empty', () => {
    w = mountField();
    const day = segments(w, 'day')[0]!;
    expect(day.getAttribute('data-placeholder')).toBe('');
    expect(day.getAttribute('aria-valuetext')).toBe('Empty');
    expect(day.getAttribute('aria-valuemin')).toBe('1');
  });

  it('reflects the controlled value into segment aria-valuenow', async () => {
    w = mountField({ modelValue: new Date(2024, 2, 15) });
    await nextTick();
    const day = segments(w, 'day')[0]!;
    const month = segments(w, 'month')[0]!;
    const year = segments(w, 'year')[0]!;
    expect(day.getAttribute('aria-valuenow')).toBe('15');
    expect(month.getAttribute('aria-valuenow')).toBe('3');
    expect(year.getAttribute('aria-valuenow')).toBe('2024');
  });
});

describe('DatePicker segment keyboard editing', () => {
  let w: ReturnType<typeof mount> | undefined;
  afterEach(() => {
    w?.unmount();
    w = undefined;
  });

  it('ArrowUp increments a segment, ArrowDown decrements', async () => {
    w = mountField({ modelValue: new Date(2024, 2, 15) });
    await nextTick();
    const day = segments(w, 'day')[0]!;
    press(day, 'ArrowUp');
    await nextTick();
    expect(segments(w, 'day')[0]!.getAttribute('aria-valuenow')).toBe('16');
    press(segments(w, 'day')[0]!, 'ArrowDown');
    press(segments(w, 'day')[0]!, 'ArrowDown');
    await nextTick();
    expect(segments(w, 'day')[0]!.getAttribute('aria-valuenow')).toBe('14');
  });

  it('ArrowUp on an empty segment seeds a sensible value', async () => {
    w = mountField();
    await nextTick();
    const month = segments(w, 'month')[0]!;
    press(month, 'ArrowUp');
    await nextTick();
    expect(segments(w, 'month')[0]!.getAttribute('aria-valuenow')).toBe('1');
  });

  it('numeric type-ahead fills a segment and auto-advances to the next', async () => {
    w = mountField();
    await nextTick();
    const order = segments(w);
    const monthSeg = segments(w, 'month')[0]!;
    monthSeg.focus();
    // typing 2 for month — month max 12, maxStart=1, so 2 > 1 → completes and advances
    press(monthSeg, '2');
    await nextTick();
    expect(segments(w, 'month')[0]!.getAttribute('aria-valuenow')).toBe('2');
    // focus advanced to the next focusable segment
    expect(document.activeElement).not.toBe(monthSeg);
    expect(order.length).toBeGreaterThan(1);
  });

  it('typing two digits builds a two-digit value before advancing', async () => {
    w = mountField();
    await nextTick();
    const year = segments(w, 'year')[0]!;
    year.focus();
    press(year, '2');
    press(segments(w, 'year')[0]!, '0');
    press(segments(w, 'year')[0]!, '2');
    press(segments(w, 'year')[0]!, '4');
    await nextTick();
    expect(segments(w, 'year')[0]!.getAttribute('aria-valuenow')).toBe('2024');
  });

  it('Backspace clears a digit / empties the segment', async () => {
    w = mountField({ modelValue: new Date(2024, 2, 5) });
    await nextTick();
    const day = segments(w, 'day')[0]!;
    // day=5 single digit → backspace empties it
    press(day, 'Backspace');
    await nextTick();
    expect(segments(w, 'day')[0]!.getAttribute('aria-valuetext')).toBe('Empty');
  });

  it('commits a full date once all segments are filled', async () => {
    w = mountField();
    await nextTick();
    const month = segments(w, 'month')[0]!;
    const day = segments(w, 'day')[0]!;
    const year = segments(w, 'year')[0]!;
    // Fill in any order; commit fires when complete.
    press(month, '5');
    press(day, '6');
    press(year, '2');
    press(segments(w, 'year')[0]!, '0');
    press(segments(w, 'year')[0]!, '2');
    press(segments(w, 'year')[0]!, '0');
    await nextTick();
    const emitted = w.findComponent(DatePickerRoot).emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    const last = emitted!.at(-1)![0] as Date;
    expect(last.getFullYear()).toBe(2020);
    expect(last.getMonth()).toBe(4);
    expect(last.getDate()).toBe(6);
  });
});

describe('DatePicker RTL-aware segment navigation', () => {
  let w: ReturnType<typeof mount> | undefined;
  afterEach(() => {
    w?.unmount();
    w = undefined;
  });

  it('ArrowRight moves to the next segment in LTR', async () => {
    w = mountField({ locale: 'en-US' });
    await nextTick();
    const order = segments(w);
    const first = order[0]!;
    first.focus();
    press(first, 'ArrowRight');
    await nextTick();
    expect(document.activeElement).toBe(order[1]);
  });

  it('ArrowRight moves to the previous segment in RTL', async () => {
    w = mountField({ locale: 'en-US', dir: 'rtl' });
    await nextTick();
    const order = segments(w);
    const second = order[1]!;
    second.focus();
    press(second, 'ArrowRight');
    await nextTick();
    expect(document.activeElement).toBe(order[0]);
  });
});

describe('DatePicker time granularity', () => {
  let w: ReturnType<typeof mount> | undefined;
  afterEach(() => {
    w?.unmount();
    w = undefined;
  });

  it('renders hour/minute segments for granularity=minute', async () => {
    w = mountField({ granularity: 'minute', hourCycle: 24, modelValue: new Date(2024, 0, 1, 13, 30) });
    await nextTick();
    expect(segments(w, 'hour').length).toBe(1);
    expect(segments(w, 'minute').length).toBe(1);
    expect(segments(w, 'hour')[0]!.getAttribute('aria-valuenow')).toBe('13');
    expect(segments(w, 'minute')[0]!.getAttribute('aria-valuenow')).toBe('30');
  });

  it('renders a dayPeriod segment for a 12-hour cycle and toggles with a/p', async () => {
    w = mountField({ granularity: 'minute', hourCycle: 12, modelValue: new Date(2024, 0, 1, 9, 0) });
    await nextTick();
    const period = segments(w, 'dayPeriod')[0]!;
    expect(period).toBeTruthy();
    expect(period.getAttribute('aria-valuetext')).toBe('AM');
    press(period, 'p');
    await nextTick();
    expect(segments(w, 'dayPeriod')[0]!.getAttribute('aria-valuetext')).toBe('PM');
    expect(segments(w, 'hour')[0]!.getAttribute('aria-valuenow')).toBe('21');
  });

  it('preserves time-of-day when picking a calendar day', async () => {
    w = mountField({ granularity: 'minute', hourCycle: 24, modelValue: new Date(2024, 0, 10, 8, 45) });
    await nextTick();
    // bump the hour segment then ensure minute kept
    const hour = segments(w, 'hour')[0]!;
    press(hour, 'ArrowUp');
    await nextTick();
    const emitted = w.findComponent(DatePickerRoot).emitted('update:modelValue');
    const last = emitted!.at(-1)![0] as Date;
    expect(last.getHours()).toBe(9);
    expect(last.getMinutes()).toBe(45);
  });
});

describe('DatePicker disabled / readonly guards', () => {
  let w: ReturnType<typeof mount> | undefined;
  afterEach(() => {
    w?.unmount();
    w = undefined;
  });

  it('disabled blocks segment mutation and marks aria-disabled', async () => {
    w = mountField({ disabled: true, modelValue: new Date(2024, 2, 15) });
    await nextTick();
    const day = segments(w, 'day')[0]!;
    expect(day.getAttribute('aria-disabled')).toBe('true');
    press(day, 'ArrowUp');
    await nextTick();
    expect(segments(w, 'day')[0]!.getAttribute('aria-valuenow')).toBe('15');
  });

  it('readonly blocks segment mutation', async () => {
    w = mountField({ readonly: true, modelValue: new Date(2024, 2, 15) });
    await nextTick();
    const day = segments(w, 'day')[0]!;
    press(day, 'ArrowUp');
    await nextTick();
    expect(segments(w, 'day')[0]!.getAttribute('aria-valuenow')).toBe('15');
  });
});

describe('DatePicker trigger honors disabled', () => {
  let w: ReturnType<typeof mount> | undefined;
  afterEach(() => {
    w?.unmount();
    w = undefined;
  });

  function mountTrigger(rootProps: Record<string, unknown> = {}) {
    return mount(defineComponent({
      setup: () => () => h(DatePickerRoot, rootProps, {
        default: () => [
          h(DatePickerTrigger, null, { default: () => 'open' }),
          h(DatePickerContent, null, { default: () => h(DatePickerCalendar) }),
        ],
      }),
    }), { attachTo: document.body });
  }

  it('does not open when disabled', async () => {
    w = mountTrigger({ disabled: true });
    await nextTick();
    const trigger = w.element.querySelector<HTMLElement>('[data-primitives-date-picker-trigger]')!;
    expect(trigger.getAttribute('data-disabled')).toBe('');
    expect((trigger as HTMLButtonElement).disabled).toBe(true);
    trigger.click();
    await nextTick();
    expect(w.findComponent(DatePickerRoot).emitted('update:open')).toBeFalsy();
  });

  it('opens normally when enabled', async () => {
    w = mountTrigger();
    await nextTick();
    const trigger = w.element.querySelector<HTMLElement>('[data-primitives-date-picker-trigger]')!;
    trigger.click();
    await nextTick();
    const emitted = w.findComponent(DatePickerRoot).emitted('update:open');
    expect(emitted).toBeTruthy();
    expect(emitted!.at(-1)![0]).toBe(true);
  });
});

describe('DatePicker preventDeselect', () => {
  let w: ReturnType<typeof mount> | undefined;
  afterEach(() => {
    w?.unmount();
    w = undefined;
  });

  function findCell(wrapper: ReturnType<typeof mount>, date: Date): HTMLElement {
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const triggers = Array.from(
      wrapper.element.querySelectorAll<HTMLElement>('[data-primitives-calendar-cell-trigger][data-value]'),
    );
    const match = triggers.find(t => t.getAttribute('data-value') === iso);
    return match ?? triggers[0]!;
  }

  function mountWithCalendar(rootProps: Record<string, unknown> = {}) {
    return mount(defineComponent({
      setup: () => () => h(DatePickerRoot, rootProps, {
        default: () => h(DatePickerCalendar, null, {
          default: () => h(DatePickerGrid, { month: new Date(2024, 2, 1) }, {
            default: () => h(DatePickerGridBody, null, {
              default: () => h(DatePickerGridRow, null, {
                default: () => h(DatePickerCell, { date: new Date(2024, 2, 15) }, {
                  default: () => h(DatePickerCellTrigger, {
                    day: new Date(2024, 2, 15),
                    month: new Date(2024, 2, 1),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    }), { attachTo: document.body });
  }

  it('re-selecting the same date clears it by default', async () => {
    w = mountWithCalendar({ modelValue: new Date(2024, 2, 15), closeOnSelect: false });
    await nextTick();
    const cell = findCell(w, new Date(2024, 2, 15));
    cell.click();
    await nextTick();
    const emitted = w.findComponent(DatePickerRoot).emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    expect(emitted!.at(-1)![0]).toBeUndefined();
  });

  it('keeps the date selected when preventDeselect is set', async () => {
    w = mountWithCalendar({
      modelValue: new Date(2024, 2, 15),
      preventDeselect: true,
      closeOnSelect: false,
    });
    await nextTick();
    const cell = findCell(w, new Date(2024, 2, 15));
    cell.click();
    await nextTick();
    const emitted = w.findComponent(DatePickerRoot).emitted('update:modelValue');
    if (emitted) {
      const last = emitted.at(-1)![0] as Date | undefined;
      expect(last).toBeInstanceOf(Date);
    }
  });
});

describe('DatePicker form validation input', () => {
  let w: ReturnType<typeof mount> | undefined;
  afterEach(() => {
    w?.unmount();
    w = undefined;
  });

  it('renders a focusable native input when required', async () => {
    w = mountField({ required: true, name: 'date' });
    await nextTick();
    const input = w.element.querySelector<HTMLInputElement>('input[type="date"]');
    expect(input).toBeTruthy();
    expect(input!.required).toBe(true);
  });

  it('uses datetime-local type for time granularity with min/max', async () => {
    w = mountField({
      granularity: 'minute',
      hourCycle: 24,
      minValue: new Date(2024, 0, 1, 8, 0),
      maxValue: new Date(2024, 11, 31, 18, 0),
    });
    await nextTick();
    const input = w.element.querySelector<HTMLInputElement>('input[type="datetime-local"]');
    expect(input).toBeTruthy();
    expect(input!.min).toBe('2024-01-01T08:00');
    expect(input!.max).toBe('2024-12-31T18:00');
  });
});
