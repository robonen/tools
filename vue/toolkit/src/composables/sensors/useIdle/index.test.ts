import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { useIdle } from '.';
import { bypassFilter } from '@/utils/filters';

/**
 * Minimal EventTarget-like stub so we can drive listeners deterministically
 * without relying on jsdom's real window/document timing.
 */
function createTarget() {
  const listeners = new Map<string, Set<EventListener>>();
  return {
    addEventListener(type: string, listener: EventListener) {
      if (!listeners.has(type))
        listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    },
    removeEventListener(type: string, listener: EventListener) {
      listeners.get(type)?.delete(listener);
    },
    dispatch(type: string, event: Event = { type } as Event) {
      listeners.get(type)?.forEach(fn => fn(event));
    },
    count(type: string) {
      return listeners.get(type)?.size ?? 0;
    },
  };
}

function createWindow(doc: ReturnType<typeof createTarget> & { hidden?: boolean }) {
  const win = createTarget() as ReturnType<typeof createTarget> & { document: typeof doc };
  win.document = doc;
  return win;
}

describe(useIdle, () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
  });
  afterEach(() => vi.useRealTimers());

  it('starts not idle and exposes lastActive', () => {
    const scope = effectScope();
    scope.run(() => {
      const doc = createTarget();
      const window = createWindow(doc) as any;
      const { idle, lastActive, isPending } = useIdle(1000, { window });

      expect(idle.value).toBeFalsy();
      expect(isPending.value).toBeTruthy();
      expect(lastActive.value).toBe(1000);
    });
    scope.stop();
  });

  it('becomes idle after the timeout elapses with no activity', () => {
    const scope = effectScope();
    scope.run(() => {
      const doc = createTarget();
      const window = createWindow(doc) as any;
      const { idle } = useIdle(1000, { window });

      expect(idle.value).toBeFalsy();
      vi.advanceTimersByTime(999);
      expect(idle.value).toBeFalsy();
      vi.advanceTimersByTime(1);
      expect(idle.value).toBeTruthy();
    });
    scope.stop();
  });

  it('resets idle state and lastActive on user activity', () => {
    const scope = effectScope();
    scope.run(() => {
      const doc = createTarget();
      const window = createWindow(doc) as any;
      const { idle, lastActive } = useIdle(1000, { window, eventFilter: bypassFilter });

      vi.advanceTimersByTime(1000);
      expect(idle.value).toBeTruthy();

      vi.setSystemTime(2500);
      window.dispatch('mousemove');

      expect(idle.value).toBeFalsy();
      expect(lastActive.value).toBe(2500);
    });
    scope.stop();
  });

  it('restarts the timeout after activity', () => {
    const scope = effectScope();
    scope.run(() => {
      const doc = createTarget();
      const window = createWindow(doc) as any;
      const { idle } = useIdle(1000, { window, eventFilter: bypassFilter });

      vi.advanceTimersByTime(500);
      window.dispatch('keydown');
      // 500ms more would have been idle without the reset
      vi.advanceTimersByTime(500);
      expect(idle.value).toBeFalsy();
      // full timeout from the reset
      vi.advanceTimersByTime(500);
      expect(idle.value).toBeTruthy();
    });
    scope.stop();
  });

  it('honors a custom events list', () => {
    const scope = effectScope();
    scope.run(() => {
      const doc = createTarget();
      const window = createWindow(doc) as any;
      useIdle(1000, { window, events: ['keydown'] });

      expect(window.count('keydown')).toBe(1);
      expect(window.count('mousemove')).toBe(0);
    });
    scope.stop();
  });

  it('listens for visibilitychange by default and resets when visible', () => {
    const scope = effectScope();
    scope.run(() => {
      const doc = createTarget() as any;
      doc.hidden = false;
      const window = createWindow(doc) as any;
      const { idle } = useIdle(1000, { window, eventFilter: bypassFilter });

      expect(doc.count('visibilitychange')).toBe(1);

      vi.advanceTimersByTime(1000);
      expect(idle.value).toBeTruthy();

      doc.dispatch('visibilitychange');
      expect(idle.value).toBeFalsy();
    });
    scope.stop();
  });

  it('ignores visibilitychange when the document is hidden', () => {
    const scope = effectScope();
    scope.run(() => {
      const doc = createTarget() as any;
      doc.hidden = true;
      const window = createWindow(doc) as any;
      const { idle } = useIdle(1000, { window, eventFilter: bypassFilter });

      vi.advanceTimersByTime(1000);
      expect(idle.value).toBeTruthy();

      doc.dispatch('visibilitychange');
      expect(idle.value).toBeTruthy();
    });
    scope.stop();
  });

  it('does not register visibilitychange when disabled', () => {
    const scope = effectScope();
    scope.run(() => {
      const doc = createTarget();
      const window = createWindow(doc) as any;
      useIdle(1000, { window, listenForVisibilityChange: false });

      expect(doc.count('visibilitychange')).toBe(0);
    });
    scope.stop();
  });

  it('respects initialState: true (starts idle, no timer)', () => {
    const scope = effectScope();
    scope.run(() => {
      const doc = createTarget();
      const window = createWindow(doc) as any;
      const { idle } = useIdle(1000, { window, initialState: true });

      expect(idle.value).toBeTruthy();
      vi.advanceTimersByTime(5000);
      // no reset was scheduled, so it stays in the initial state
      expect(idle.value).toBeTruthy();
    });
    scope.stop();
  });

  it('reset() manually clears idle and restarts the timer', () => {
    const scope = effectScope();
    scope.run(() => {
      const doc = createTarget();
      const window = createWindow(doc) as any;
      const { idle, reset } = useIdle(1000, { window });

      vi.advanceTimersByTime(1000);
      expect(idle.value).toBeTruthy();

      reset();
      expect(idle.value).toBeFalsy();
      vi.advanceTimersByTime(1000);
      expect(idle.value).toBeTruthy();
    });
    scope.stop();
  });

  it('stop() halts tracking and start() resumes it', () => {
    const scope = effectScope();
    scope.run(() => {
      const doc = createTarget();
      const window = createWindow(doc) as any;
      const { idle, isPending, start, stop } = useIdle(1000, { window, eventFilter: bypassFilter });

      stop();
      expect(isPending.value).toBeFalsy();
      expect(idle.value).toBeFalsy();

      // events are ignored while stopped
      vi.advanceTimersByTime(1000);
      expect(idle.value).toBeFalsy();
      window.dispatch('mousemove');
      expect(idle.value).toBeFalsy();

      start();
      expect(isPending.value).toBeTruthy();
      vi.advanceTimersByTime(1000);
      expect(idle.value).toBeTruthy();
    });
    scope.stop();
  });

  it('removes listeners when the scope is disposed', () => {
    const scope = effectScope();
    let win: any;
    scope.run(() => {
      const doc = createTarget();
      win = createWindow(doc) as any;
      useIdle(1000, { window: win });
      expect(win.count('mousemove')).toBe(1);
    });
    scope.stop();
    expect(win.count('mousemove')).toBe(0);
  });

  it('is SSR-safe when no window is available', () => {
    const scope = effectScope();
    scope.run(() => {
      // simulate an environment with no window (the guard sees a falsy target)
      const { idle, isPending, lastActive } = useIdle(1000, { window: null as any });

      // never started: stays in initial state and never schedules a timer
      expect(idle.value).toBeFalsy();
      expect(isPending.value).toBeFalsy();
      expect(lastActive.value).toBe(1000);

      vi.advanceTimersByTime(5000);
      expect(idle.value).toBeFalsy();
    });
    scope.stop();
  });
});
