import { describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, shallowRef } from 'vue';
import type { Viewport } from '../types';
import { useInteractionState } from '../composables/useInteractionState';

describe('useInteractionState', () => {
  it('flips true on a viewport change and back to false after the idle delay', async () => {
    vi.useFakeTimers();
    try {
      const viewport = shallowRef<Viewport>({ x: 0, y: 0, zoom: 1 });
      const scope = effectScope();
      const interacting = scope.run(() => useInteractionState(() => viewport.value, 200))!;

      expect(interacting.value).toBe(false);

      viewport.value = { x: 10, y: 0, zoom: 1.2 };
      await nextTick();
      expect(interacting.value).toBe(true);

      // Still interacting before the idle delay elapses.
      vi.advanceTimersByTime(150);
      expect(interacting.value).toBe(true);

      // A further change (continuous zoom) resets the idle countdown.
      viewport.value = { x: 20, y: 0, zoom: 1.5 };
      await nextTick();
      vi.advanceTimersByTime(150);
      expect(interacting.value).toBe(true);

      // Settles to false once motion stops for the full delay.
      vi.advanceTimersByTime(200);
      expect(interacting.value).toBe(false);

      scope.stop();
    }
    finally {
      vi.useRealTimers();
    }
  });

  it('clears its pending timer on scope dispose so it never resolves late', async () => {
    vi.useFakeTimers();
    try {
      const viewport = shallowRef<Viewport>({ x: 0, y: 0, zoom: 1 });
      const scope = effectScope();
      const interacting = scope.run(() => useInteractionState(() => viewport.value, 200))!;

      viewport.value = { x: 5, y: 5, zoom: 1 };
      await nextTick();
      expect(interacting.value).toBe(true);

      scope.stop();
      // The pending idle timer was cleared on dispose: advancing past it must
      // not flip the (now detached) ref.
      vi.advanceTimersByTime(500);
      expect(interacting.value).toBe(true);
    }
    finally {
      vi.useRealTimers();
    }
  });
});
