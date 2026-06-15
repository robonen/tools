import type { CalendarMonth } from '../utils';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import {
  CalendarCell,
  CalendarCellTrigger,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHead,
  CalendarGridRow,
  CalendarHeadCell,
  CalendarRoot,
} from '../index';
import { findFirstFocusableDate, getLocaleWeekStartsOn, toIsoDate } from '../utils';

function mountCalendar(
  props: Record<string, unknown> = {},
  options: Record<string, unknown> = {},
) {
  return mount(defineComponent({
    setup: () => () => h(CalendarRoot, props, {
      default: ({ grid, weekDays }: { grid: CalendarMonth[]; weekDays: string[] }) =>
        grid.map(month =>
          h(CalendarGrid, { key: month.value.toString(), month: month.value }, {
            default: () => [
              h(CalendarGridHead, null, {
                default: () => h(CalendarGridRow, null, {
                  default: () => weekDays.map((wd, i) => h(CalendarHeadCell, { key: i }, () => wd)),
                }),
              }),
              h(CalendarGridBody, null, {
                default: () => month.weeks.map((week, w) =>
                  h(CalendarGridRow, { key: w }, {
                    default: () => week.map(day =>
                      h(CalendarCell, { key: day.toString(), date: day }, {
                        default: () => h(CalendarCellTrigger, { day, month: month.value }),
                      })),
                  })),
              }),
            ],
          })),
    }),
  }), options);
}

function press(el: Element, key: string) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('Calendar — accessibility skeleton', () => {
  it('renders an SR-only role=heading mirroring the calendar label', () => {
    const w = mountCalendar({ defaultPlaceholder: new Date(2026, 5, 1) });
    const srHeading = w.find('[data-primitives-calendar-sr-heading] [role="heading"]');
    expect(srHeading.exists()).toBe(true);
    expect(srHeading.attributes('aria-level')).toBe('2');
    expect(srHeading.text()).toContain('2026');
    w.unmount();
  });

  it('marks the grid head as aria-hidden', () => {
    const w = mountCalendar({ defaultPlaceholder: new Date(2026, 5, 1) });
    const head = w.find('[data-primitives-calendar-grid-head]');
    expect(head.attributes('aria-hidden')).toBe('true');
    w.unmount();
  });
});

describe('Calendar — single mode deselect', () => {
  it('re-clicking the selected date clears the model (deselect-on-reclick)', async () => {
    const selected = new Date(2026, 5, 15);
    const w = mountCalendar({ defaultValue: selected, defaultPlaceholder: selected });
    const cell = w.find('[data-value="2026-06-15"]:not([data-outside-view])');
    await cell.trigger('click');
    await nextTick();
    expect(w.find('[data-value="2026-06-15"][data-selected]').exists()).toBe(false);
    w.unmount();
  });

  it('preventDeselect keeps the selected date on re-click', async () => {
    const selected = new Date(2026, 5, 15);
    const w = mountCalendar({ defaultValue: selected, defaultPlaceholder: selected, preventDeselect: true });
    const cell = w.find('[data-value="2026-06-15"]:not([data-outside-view])');
    await cell.trigger('click');
    await nextTick();
    expect(w.find('[data-value="2026-06-15"]:not([data-outside-view])').attributes('data-selected')).toBe('');
    w.unmount();
  });
});

describe('Calendar — multiple mode', () => {
  it('toggles membership: click adds, re-click removes', async () => {
    const w = mountCalendar({ multiple: true, defaultPlaceholder: new Date(2026, 5, 1) });
    const a = () => w.find('[data-value="2026-06-10"]:not([data-outside-view])');
    const b = () => w.find('[data-value="2026-06-20"]:not([data-outside-view])');

    await a().trigger('click');
    await b().trigger('click');
    await nextTick();
    expect(a().attributes('data-selected')).toBe('');
    expect(b().attributes('data-selected')).toBe('');

    await a().trigger('click');
    await nextTick();
    expect(a().attributes('data-selected')).toBeUndefined();
    expect(b().attributes('data-selected')).toBe('');
    w.unmount();
  });

  it('accepts an array defaultValue and marks each as selected', async () => {
    const w = mountCalendar({
      multiple: true,
      defaultValue: [new Date(2026, 5, 5), new Date(2026, 5, 12)],
      defaultPlaceholder: new Date(2026, 5, 1),
    });
    await nextTick();
    expect(w.find('[data-value="2026-06-05"]:not([data-outside-view])').attributes('data-selected')).toBe('');
    expect(w.find('[data-value="2026-06-12"]:not([data-outside-view])').attributes('data-selected')).toBe('');
    w.unmount();
  });

  it('preventDeselect in multiple mode blocks removal but allows addition', async () => {
    const w = mountCalendar({
      multiple: true,
      preventDeselect: true,
      defaultValue: [new Date(2026, 5, 5)],
      defaultPlaceholder: new Date(2026, 5, 1),
    });
    const existing = () => w.find('[data-value="2026-06-05"]:not([data-outside-view])');
    await existing().trigger('click'); // attempt removal — blocked
    await nextTick();
    expect(existing().attributes('data-selected')).toBe('');

    const next = () => w.find('[data-value="2026-06-09"]:not([data-outside-view])');
    await next().trigger('click'); // addition allowed
    await nextTick();
    expect(next().attributes('data-selected')).toBe('');
    w.unmount();
  });
});

describe('Calendar — disableDaysOutsideCurrentView', () => {
  it('disables adjacent-month days when enabled', () => {
    const w = mountCalendar({
      disableDaysOutsideCurrentView: true,
      defaultPlaceholder: new Date(2026, 5, 1), // June 2026 starts on a Monday → leading outside days
    });
    const outside = w.findAll('[data-primitives-calendar-cell-trigger][data-outside-view]');
    expect(outside.length).toBeGreaterThan(0);
    for (const t of outside)
      expect(t.attributes('data-disabled')).toBe('');
    w.unmount();
  });

  it('leaves adjacent-month days enabled by default', () => {
    const w = mountCalendar({ defaultPlaceholder: new Date(2026, 5, 1) });
    const outside = w.findAll('[data-primitives-calendar-cell-trigger][data-outside-view]');
    for (const t of outside)
      expect(t.attributes('data-disabled')).toBeUndefined();
    w.unmount();
  });
});

describe('Calendar — keyboard skips disabled days', () => {
  it('ArrowRight jumps over a disabled day to the next available one', async () => {
    const w = mountCalendar({
      defaultPlaceholder: new Date(2026, 5, 1),
      isDateDisabled: (d: Date) => d.getDate() === 11, // disable June 11
    }, { attachTo: document.body });
    const from = w.find('[data-value="2026-06-10"]:not([data-outside-view])');
    (from.element as HTMLElement).focus();
    press(from.element, 'ArrowRight');
    await nextTick();
    await nextTick();
    expect(document.activeElement?.getAttribute('data-value')).toBe('2026-06-12');
    w.unmount();
  });

  it('intra-month arrow navigation does not shift a multi-month visible window', async () => {
    const w = mountCalendar({
      defaultPlaceholder: new Date(2026, 5, 1),
      numberOfMonths: 2,
    }, { attachTo: document.body });
    // Both June and July grids are present before navigation.
    expect(w.findAll('[data-value="2026-06-15"]:not([data-outside-view])').length).toBe(1);
    expect(w.findAll('[data-value="2026-07-15"]:not([data-outside-view])').length).toBe(1);

    const from = w.find('[data-value="2026-06-15"]:not([data-outside-view])');
    (from.element as HTMLElement).focus();
    press(from.element, 'ArrowRight');
    await nextTick();
    await nextTick();
    // Window unchanged: July is still rendered, June 16 received focus.
    expect(document.activeElement?.getAttribute('data-value')).toBe('2026-06-16');
    expect(w.findAll('[data-value="2026-07-15"]:not([data-outside-view])').length).toBe(1);
    w.unmount();
  });
});

describe('Calendar — roving fallback tabindex', () => {
  it('initial tab stop skips disabled leading days and lands on the first available day', () => {
    // Disable the entire first half of June; tab stop should land on the 16th.
    const w = mountCalendar({
      defaultPlaceholder: new Date(2026, 5, 1),
      isDateDisabled: (d: Date) => d.getMonth() === 5 && d.getDate() < 16,
    });
    const focusable = w.findAll('[data-primitives-calendar-cell-trigger][tabindex="0"]');
    expect(focusable).toHaveLength(1);
    expect(focusable[0]!.attributes('data-value')).toBe('2026-06-16');
    w.unmount();
  });
});

describe('Calendar — outside-visible-view marker', () => {
  it('marks single-month padding days (from adjacent months) as outside-visible-view', () => {
    const w = mountCalendar({ defaultPlaceholder: new Date(2026, 5, 1), numberOfMonths: 1 });
    // With one visible month, an adjacent-month padding day is both
    // outside-view and outside-visible-view, and every such pair must agree.
    const outsideView = w.findAll('[data-primitives-calendar-cell-trigger][data-outside-view]');
    const outsideVisible = w.findAll('[data-primitives-calendar-cell-trigger][data-outside-visible-view]');
    expect(outsideVisible.length).toBe(outsideView.length);
    expect(outsideVisible.length).toBeGreaterThan(0);
    w.unmount();
  });

  it('a padding day belonging to a second visible month is outside-view but not outside-visible-view', () => {
    // June + July 2026 visible. July 1 appears as a padding cell in June's grid:
    // outside June's view, yet July is a visible month → not outside-visible-view.
    const w = mountCalendar({ defaultPlaceholder: new Date(2026, 5, 1), numberOfMonths: 2 });
    const julyFirstPadding = w.findAll('[data-value="2026-07-01"][data-outside-view]');
    expect(julyFirstPadding.length).toBeGreaterThan(0);
    for (const t of julyFirstPadding)
      expect(t.attributes('data-outside-visible-view')).toBeUndefined();
    w.unmount();
  });
});

describe('Calendar — locale-aware week start', () => {
  it('defaults weekStartsOn from the locale when the prop is omitted', () => {
    expect(getLocaleWeekStartsOn('en-US')).toBe(0);
    expect(getLocaleWeekStartsOn('fr-FR')).toBe(1);
    expect(getLocaleWeekStartsOn('de-DE')).toBe(1);
  });

  it('an explicit weekStartsOn overrides the locale default', () => {
    const w = mountCalendar({ defaultPlaceholder: new Date(2026, 5, 1), locale: 'fr-FR', weekStartsOn: 0 });
    // weekStartsOn=0 (Sunday): first cell of the first week is a Sunday.
    const firstTrigger = w.find('[data-primitives-calendar-cell-trigger]');
    const iso = firstTrigger.attributes('data-value')!;
    expect(new Date(`${iso}T00:00:00`).getDay()).toBe(0);
    w.unmount();
  });
});

describe('findFirstFocusableDate', () => {
  it('returns the first non-disabled, non-unavailable in-view date', () => {
    const months = [{ value: new Date(2026, 5, 1), weeks: [] }];
    const first = findFirstFocusableDate(
      months,
      d => d.getDate() < 5,
      () => false,
    );
    expect(first && toIsoDate(first)).toBe('2026-06-05');
  });

  it('returns undefined when every day is blocked', () => {
    const months = [{ value: new Date(2026, 5, 1), weeks: [] }];
    expect(findFirstFocusableDate(months, () => true, () => false)).toBeUndefined();
  });
});
