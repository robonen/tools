import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, shallowRef } from 'vue';
import type { ComputedRef } from 'vue';
import { formatTimeAgo, useTimeAgo } from '.';
import type { UseTimeAgoControls, UseTimeAgoMessages } from '.';

const BASE = 1_700_000_000_000; // fixed epoch for deterministic diffs

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

describe(formatTimeAgo, () => {
  it('returns justNow when under a minute by default', () => {
    expect(formatTimeAgo(new Date(BASE - 30 * SECOND), {}, BASE)).toBe('just now');
  });

  it('shows seconds when showSecond is true', () => {
    expect(formatTimeAgo(new Date(BASE - 30 * SECOND), { showSecond: true }, BASE)).toBe('30 seconds ago');
  });

  it('formats minutes in the past', () => {
    expect(formatTimeAgo(new Date(BASE - 3 * MINUTE), {}, BASE)).toBe('3 minutes ago');
  });

  it('formats a single minute (no pluralization)', () => {
    expect(formatTimeAgo(new Date(BASE - 1 * MINUTE), {}, BASE)).toBe('1 minute ago');
  });

  it('formats future minutes', () => {
    expect(formatTimeAgo(new Date(BASE + 5 * MINUTE), {}, BASE)).toBe('in 5 minutes');
  });

  it('formats hours', () => {
    expect(formatTimeAgo(new Date(BASE - 2 * HOUR), {}, BASE)).toBe('2 hours ago');
  });

  it('uses the special yesterday/tomorrow forms for a single day', () => {
    expect(formatTimeAgo(new Date(BASE - 1 * DAY), {}, BASE)).toBe('yesterday');
    expect(formatTimeAgo(new Date(BASE + 1 * DAY), {}, BASE)).toBe('tomorrow');
  });

  it('uses last week / next week for a single week', () => {
    expect(formatTimeAgo(new Date(BASE - 1 * WEEK), {}, BASE)).toBe('last week');
    expect(formatTimeAgo(new Date(BASE + 1 * WEEK), {}, BASE)).toBe('next week');
  });

  it('falls back to the full date when a numeric max is exceeded', () => {
    const from = new Date(BASE - 10 * DAY);
    expect(formatTimeAgo(from, { max: 5 * DAY }, BASE)).toBe(from.toISOString().slice(0, 10));
  });

  it('falls back to the full date when a named-unit max is exceeded', () => {
    const from = new Date(BASE - 3 * WEEK);
    expect(formatTimeAgo(from, { max: 'day' }, BASE)).toBe(from.toISOString().slice(0, 10));
  });

  it('respects a custom fullDateFormatter', () => {
    const from = new Date(BASE - 10 * DAY);
    expect(formatTimeAgo(from, { max: 'day', fullDateFormatter: () => 'CUSTOM' }, BASE)).toBe('CUSTOM');
  });

  it('honors a ceil rounding strategy', () => {
    // 90 seconds -> 1.5 minutes -> ceil = 2
    expect(formatTimeAgo(new Date(BASE - 90 * SECOND), { rounding: 'ceil' }, BASE)).toBe('2 minutes ago');
  });

  it('honors floor rounding', () => {
    // 119 seconds -> 1.98 minutes -> floor = 1
    expect(formatTimeAgo(new Date(BASE - 119 * SECOND), { rounding: 'floor' }, BASE)).toBe('1 minute ago');
  });

  it('honors numeric (decimal-place) rounding', () => {
    // 90 seconds -> 1.5 minutes, rounded to 1 dp = 1.5
    expect(formatTimeAgo(new Date(BASE - 90 * SECOND), { rounding: 1 }, BASE)).toBe('1.5 minutes ago');
  });

  it('returns the invalid message for an unparseable date', () => {
    expect(formatTimeAgo(new Date('not a date'), {}, BASE)).toBe('');
  });

  it('supports custom i18n messages', () => {
    const messages: UseTimeAgoMessages = {
      justNow: 'à l\'instant',
      past: n => `il y a ${n}`,
      future: n => `dans ${n}`,
      invalid: 'invalide',
      second: n => `${n} seconde${n > 1 ? 's' : ''}`,
      minute: n => `${n} minute${n > 1 ? 's' : ''}`,
      hour: n => `${n} heure${n > 1 ? 's' : ''}`,
      day: n => `${n} jour${n > 1 ? 's' : ''}`,
      week: n => `${n} semaine${n > 1 ? 's' : ''}`,
      month: n => `${n} mois`,
      year: n => `${n} an${n > 1 ? 's' : ''}`,
    };

    expect(formatTimeAgo(new Date(BASE - 3 * MINUTE), { messages }, BASE)).toBe('il y a 3 minutes');
    expect(formatTimeAgo(new Date(BASE + 3 * MINUTE), { messages }, BASE)).toBe('dans 3 minutes');
  });

  it('supports string-template (i18n) past/future with {0} placeholder', () => {
    const messages: UseTimeAgoMessages = {
      justNow: 'now',
      past: '{0} ago',
      future: 'in {0}',
      invalid: '',
      second: '{0}s',
      minute: '{0}m',
      hour: '{0}h',
      day: '{0}d',
      week: '{0}w',
      month: '{0}mo',
      year: '{0}y',
    };

    expect(formatTimeAgo(new Date(BASE - 3 * MINUTE), { messages }, BASE)).toBe('3m ago');
  });
});

describe(useTimeAgo, () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE);
  });
  afterEach(() => vi.useRealTimers());

  it('returns a computed string by default', () => {
    const scope = effectScope();
    let timeAgo: ComputedRef<string> | undefined;

    scope.run(() => {
      timeAgo = useTimeAgo(new Date(BASE - 3 * MINUTE));
    });

    expect(timeAgo?.value).toBe('3 minutes ago');
    scope.stop();
  });

  it('recomputes as the clock advances on the interval', () => {
    const scope = effectScope();
    let timeAgo: ComputedRef<string> | undefined;

    scope.run(() => {
      timeAgo = useTimeAgo(new Date(BASE - 5 * SECOND), { updateInterval: 1000, showSecond: true });
    });

    expect(timeAgo?.value).toBe('5 seconds ago');

    vi.advanceTimersByTime(55 * SECOND);
    expect(timeAgo?.value).toBe('1 minute ago');

    scope.stop();
  });

  it('reacts to a changing reactive time source', () => {
    const scope = effectScope();
    const time = shallowRef(new Date(BASE - 1 * MINUTE));
    let timeAgo: ComputedRef<string> | undefined;

    scope.run(() => {
      timeAgo = useTimeAgo(time);
    });

    expect(timeAgo?.value).toBe('1 minute ago');

    time.value = new Date(BASE - 2 * HOUR);
    expect(timeAgo?.value).toBe('2 hours ago');

    scope.stop();
  });

  it('accepts a numeric timestamp and a string date', () => {
    const scope = effectScope();
    let fromNumber: ComputedRef<string> | undefined;
    let fromString: ComputedRef<string> | undefined;

    scope.run(() => {
      fromNumber = useTimeAgo(BASE - 3 * MINUTE);
      fromString = useTimeAgo(new Date(BASE - 3 * MINUTE).toISOString());
    });

    expect(fromNumber?.value).toBe('3 minutes ago');
    expect(fromString?.value).toBe('3 minutes ago');

    scope.stop();
  });

  it('exposes controls when controls: true', () => {
    const scope = effectScope();
    let ctrl: UseTimeAgoControls | undefined;

    scope.run(() => {
      ctrl = useTimeAgo(new Date(BASE - 5 * SECOND), { controls: true, updateInterval: 1000, showSecond: true });
    });

    if (!ctrl)
      throw new Error('controls not created');

    expect(ctrl.timeAgo.value).toBe('5 seconds ago');
    expect(ctrl.isActive.value).toBeTruthy();

    vi.advanceTimersByTime(55 * SECOND);
    expect(ctrl.timeAgo.value).toBe('1 minute ago');

    // pausing stops further recomputation
    ctrl.pause();
    expect(ctrl.isActive.value).toBeFalsy();

    vi.advanceTimersByTime(60 * SECOND);
    expect(ctrl.timeAgo.value).toBe('1 minute ago');

    ctrl.resume();
    expect(ctrl.isActive.value).toBeTruthy();
    // resume does not fire the callback immediately; the next tick refreshes now
    vi.advanceTimersByTime(1 * SECOND);
    expect(ctrl.timeAgo.value).toBe('2 minutes ago');

    ctrl.toggle();
    expect(ctrl.isActive.value).toBeFalsy();

    scope.stop();
  });

  it('does not start ticking when immediate is false', () => {
    const scope = effectScope();
    let result: { timeAgo: { value: string }; isActive: { value: boolean } } | undefined;

    scope.run(() => {
      result = useTimeAgo(new Date(BASE - 5 * SECOND), {
        controls: true,
        updateInterval: 1000,
        immediate: false,
        showSecond: true,
      });
    });

    expect(result?.isActive.value).toBeFalsy();

    vi.advanceTimersByTime(60 * SECOND);
    // value reflects construction-time "now" since no tick fired
    expect(result?.timeAgo.value).toBe('5 seconds ago');

    scope.stop();
  });

  it('stops updating once the scope is disposed (cleanup)', () => {
    const scope = effectScope();
    let timeAgo: ComputedRef<string> | undefined;

    scope.run(() => {
      timeAgo = useTimeAgo(new Date(BASE), { updateInterval: 1000, showSecond: true });
    });

    vi.advanceTimersByTime(60 * SECOND);
    expect(timeAgo?.value).toBe('1 minute ago');

    scope.stop();

    vi.advanceTimersByTime(120 * SECOND);
    expect(timeAgo?.value).toBe('1 minute ago');
  });

  it('constructs without touching window/document/navigator (SSR-safe)', () => {
    // useTimeAgo is pure date math + an interval; it must build with no DOM
    // globals present. We simulate an SSR-ish absence and assert no throw.
    const originalWindow = (globalThis as Record<string, unknown>).window;
    const originalDocument = (globalThis as Record<string, unknown>).document;
    const originalNavigator = (globalThis as Record<string, unknown>).navigator;

    vi.stubGlobal('window', undefined);
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('navigator', undefined);

    try {
      const scope = effectScope();
      let timeAgo: ComputedRef<string> | undefined;

      scope.run(() => {
        timeAgo = useTimeAgo(new Date(BASE - 3 * MINUTE), { immediate: false });
      });

      expect(timeAgo?.value).toBe('3 minutes ago');
      scope.stop();
    }
    finally {
      vi.unstubAllGlobals();
      // restore (vi.unstubAllGlobals already does, but keep references used)
      void originalWindow;
      void originalDocument;
      void originalNavigator;
    }
  });
});
