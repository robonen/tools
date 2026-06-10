import type { CalendarMonth } from '../utils';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import {
  CalendarCell,
  CalendarCellTrigger,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridRow,
  CalendarRoot,
} from '../index';
import { createMonths, toIsoDate } from '../utils';

function mountCalendar(
  props: Record<string, unknown> = {},
  options: Record<string, unknown> = {},
) {
  return mount(defineComponent({
    setup: () => () => h(CalendarRoot, props, {
      default: ({ grid }: { grid: CalendarMonth[] }) => grid.map(month =>
        h(CalendarGrid, { key: month.value.toString(), month: month.value }, {
          default: () => h(CalendarGridBody, null, {
            default: () => month.weeks.map((week, w) =>
              h(CalendarGridRow, { key: w }, {
                default: () => week.map(day =>
                  h(CalendarCell, { key: day.toString(), date: day }, {
                    default: () => h(CalendarCellTrigger, { day, month: month.value }),
                  })),
              })),
          }),
        })),
    }),
  }), options);
}

describe('Calendar', () => {
  it('forwards consumer attrs (class) to the root element', () => {
    const w = mountCalendar({
      class: 'my-cal',
      'data-x': 'y',
      defaultPlaceholder: new Date(2026, 5, 1),
    });
    const root = w.find('[data-primitives-calendar-root]');
    expect(root.classes()).toContain('my-cal');
    expect(root.attributes('data-x')).toBe('y');
  });

  it('mounts cell triggers without "expose() should be called only once" warnings', () => {
    const warn = vi.spyOn(console, 'warn');
    mountCalendar({ defaultPlaceholder: new Date(2026, 5, 1) });
    const exposeWarnings = warn.mock.calls
      .filter(args => String(args[0]).includes('expose() should be called only once'));
    expect(exposeWarnings).toHaveLength(0);
    warn.mockRestore();
  });

  it('data-value matches the local calendar date of each cell', () => {
    const w = mountCalendar({ defaultPlaceholder: new Date(2026, 5, 1) });
    const triggers = w.findAll(
      '[data-primitives-calendar-cell-trigger]:not([data-outside-view])',
    );
    expect(triggers).toHaveLength(30); // June 2026
    for (const t of triggers)
      expect(t.attributes('data-value')).toBe(`2026-06-${t.text().padStart(2, '0')}`);
  });

  it('renders 6 weeks by default; :fixed-weeks="false" trims trailing outside-month weeks', () => {
    // February 2026 starts on Sunday and has 28 days — exactly 4 weeks.
    const placeholder = new Date(2026, 1, 1);
    const fixed = mountCalendar({ defaultPlaceholder: placeholder });
    expect(fixed.findAll('[data-primitives-calendar-grid-row]')).toHaveLength(6);

    const trimmed = mountCalendar({ defaultPlaceholder: placeholder, fixedWeeks: false });
    expect(trimmed.findAll('[data-primitives-calendar-grid-row]')).toHaveLength(4);
    expect(trimmed.findAll('[data-primitives-calendar-cell-trigger]')).toHaveLength(28);
  });

  it('allows arrow-key focus onto the min-value day when minValue has a time component', async () => {
    const w = mountCalendar({
      defaultPlaceholder: new Date(2026, 5, 1),
      minValue: new Date(2026, 5, 10, 12, 30),
    }, { attachTo: document.body });
    const from = w.find('[data-value="2026-06-11"]:not([data-outside-view])');
    (from.element as HTMLElement).focus();
    await from.trigger('keydown', { key: 'ArrowLeft' });
    await nextTick();
    expect(document.activeElement?.getAttribute('data-value')).toBe('2026-06-10');
    w.unmount();
  });
});

describe('createMonths', () => {
  it('keeps 6 weeks when fixedWeeks (default) and trims trailing outside-month weeks otherwise', () => {
    const feb = new Date(2026, 1, 10); // February 2026: exactly 4 in-month weeks
    expect(createMonths({ date: feb, numberOfMonths: 1, weekStartsOn: 0 })[0]!.weeks)
      .toHaveLength(6);
    const trimmed = createMonths({ date: feb, numberOfMonths: 1, weekStartsOn: 0, fixedWeeks: false })[0]!.weeks;
    expect(trimmed).toHaveLength(4);
    expect(toIsoDate(trimmed[0]![0]!)).toBe('2026-02-01');
    expect(toIsoDate(trimmed[3]![6]!)).toBe('2026-02-28');

    // August 2026 genuinely spans 6 weeks — nothing to trim.
    const aug = createMonths({ date: new Date(2026, 7, 1), numberOfMonths: 1, weekStartsOn: 0, fixedWeeks: false })[0]!.weeks;
    expect(aug).toHaveLength(6);
  });
});
