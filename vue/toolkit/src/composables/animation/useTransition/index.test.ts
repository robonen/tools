import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import {
  TransitionPresets,
  useTransition,
} from '@/composables/animation/useTransition';

// A controllable window stub: requestAnimationFrame frames are flushed
// manually via `frame()`, and timers are driven by vitest fake timers.
function createWindowStub() {
  let rafId = 0;
  const callbacks = new Map<number, FrameRequestCallback>();

  const win = {
    requestAnimationFrame: (cb: FrameRequestCallback) => {
      const id = ++rafId;
      callbacks.set(id, cb);
      return id;
    },
    cancelAnimationFrame: (id: number) => {
      callbacks.delete(id);
    },
    setTimeout: (fn: (...args: unknown[]) => void, ms?: number) =>
      setTimeout(fn, ms) as unknown as number,
    clearTimeout: (id: number) => clearTimeout(id),
  } as unknown as Window;

  function frame() {
    const pending = [...callbacks.entries()];
    callbacks.clear();
    for (const [, cb] of pending)
      cb(Date.now());
  }

  return { win, frame, get pending() {
    return callbacks.size;
  } };
}

describe(useTransition, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('seeds output with the initial source value', () => {
    const { win } = createWindowStub();
    const scope = effectScope();

    scope.run(() => {
      const output = useTransition(ref(5), { window: win });
      expect(output.value).toBe(5);
    });

    scope.stop();
  });

  it('transitions a number from old to new over the duration', async () => {
    const { win, frame } = createWindowStub();
    vi.setSystemTime(0);
    const scope = effectScope();
    const source = ref(0);
    let output!: ReturnType<typeof useTransition<number>>;

    scope.run(() => {
      output = useTransition(source, { duration: 100, window: win });
    });

    source.value = 100;
    await nextTick();

    // Halfway through.
    vi.setSystemTime(50);
    frame();
    expect(output.value).toBeCloseTo(50, 5);

    // End.
    vi.setSystemTime(100);
    frame();
    expect(output.value).toBe(100);

    scope.stop();
  });

  it('fires onStarted and onFinished', async () => {
    const { win, frame } = createWindowStub();
    vi.setSystemTime(0);
    const onStarted = vi.fn();
    const onFinished = vi.fn();
    const scope = effectScope();
    const source = ref(0);

    scope.run(() => {
      useTransition(source, { duration: 100, window: win, onStarted, onFinished });
    });

    source.value = 10;
    await nextTick();

    expect(onStarted).toHaveBeenCalledTimes(1);
    expect(onFinished).not.toHaveBeenCalled();

    vi.setSystemTime(100);
    frame();

    expect(onFinished).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it('transitions numeric arrays element-wise', async () => {
    const { win, frame } = createWindowStub();
    vi.setSystemTime(0);
    const scope = effectScope();
    const source = ref([0, 100]);
    let output!: ReturnType<typeof useTransition<number[]>>;

    scope.run(() => {
      output = useTransition(source, { duration: 100, window: win });
    });

    source.value = [100, 0];
    await nextTick();

    vi.setSystemTime(50);
    frame();
    expect(output.value[0]).toBeCloseTo(50, 5);
    expect(output.value[1]).toBeCloseTo(50, 5);

    vi.setSystemTime(100);
    frame();
    expect(output.value).toEqual([100, 0]);

    scope.stop();
  });

  it('applies an easing preset (eased value differs from linear midpoint)', async () => {
    const { win, frame } = createWindowStub();
    vi.setSystemTime(0);
    const scope = effectScope();
    const source = ref(0);
    let output!: ReturnType<typeof useTransition<number>>;

    scope.run(() => {
      output = useTransition(source, {
        duration: 100,
        transition: TransitionPresets.easeInCubic,
        window: win,
      });
    });

    source.value = 100;
    await nextTick();

    vi.setSystemTime(50);
    frame();
    // easeInCubic at t=0.5 is well below the linear midpoint of 50.
    expect(output.value).toBeLessThan(50);
    expect(output.value).toBeGreaterThan(0);

    scope.stop();
  });

  it('accepts a custom easing function', async () => {
    const { win, frame } = createWindowStub();
    vi.setSystemTime(0);
    const scope = effectScope();
    const source = ref(0);
    const easing = vi.fn((n: number) => n);
    let output!: ReturnType<typeof useTransition<number>>;

    scope.run(() => {
      output = useTransition(source, { duration: 100, transition: easing, window: win });
    });

    source.value = 100;
    await nextTick();

    vi.setSystemTime(50);
    frame();

    expect(easing).toHaveBeenCalled();
    expect(output.value).toBeCloseTo(50, 5);

    scope.stop();
  });

  it('delays the start of a transition', async () => {
    const { win, frame } = createWindowStub();
    vi.setSystemTime(0);
    const onStarted = vi.fn();
    const scope = effectScope();
    const source = ref(0);

    scope.run(() => {
      useTransition(source, { duration: 100, delay: 200, window: win, onStarted });
    });

    source.value = 100;
    await nextTick();

    // Still in the delay window: not started yet.
    expect(onStarted).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(onStarted).toHaveBeenCalledTimes(1);

    vi.setSystemTime(200);
    frame();
    expect(onStarted).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it('snaps instantly when disabled and tracks the source', async () => {
    const { win, frame, pending } = createWindowStub();
    const scope = effectScope();
    const source = ref(0);
    let output!: ReturnType<typeof useTransition<number>>;

    scope.run(() => {
      output = useTransition(source, { duration: 100, disabled: true, window: win });
    });

    source.value = 42;
    await nextTick();

    expect(output.value).toBe(42);
    expect(pending).toBe(0);
    frame();
    expect(output.value).toBe(42);

    scope.stop();
  });

  it('disabling mid-transition snaps to the source', async () => {
    const { win, frame } = createWindowStub();
    vi.setSystemTime(0);
    const scope = effectScope();
    const source = ref(0);
    const disabled = ref(false);
    let output!: ReturnType<typeof useTransition<number>>;

    scope.run(() => {
      output = useTransition(source, { duration: 100, disabled, window: win });
    });

    source.value = 100;
    await nextTick();

    vi.setSystemTime(50);
    frame();
    expect(output.value).toBeCloseTo(50, 5);

    disabled.value = true;
    await nextTick();

    expect(output.value).toBe(100);

    scope.stop();
  });

  it('jumps immediately when duration is zero', async () => {
    const { win } = createWindowStub();
    vi.setSystemTime(0);
    const onFinished = vi.fn();
    const scope = effectScope();
    const source = ref(0);
    let output!: ReturnType<typeof useTransition<number>>;

    scope.run(() => {
      output = useTransition(source, { duration: 0, window: win, onFinished });
    });

    source.value = 100;
    await nextTick();

    expect(output.value).toBe(100);
    expect(onFinished).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it('is SSR-safe: without a window it mirrors the source synchronously', async () => {
    const onFinished = vi.fn();
    const scope = effectScope();
    const source = ref(0);
    let output!: ReturnType<typeof useTransition<number>>;

    scope.run(() => {
      output = useTransition(source, { duration: 100, window: undefined, onFinished });
    });

    expect(output.value).toBe(0);

    source.value = 100;
    await nextTick();

    // No RAF available: transition resolves immediately to the target.
    expect(output.value).toBe(100);
    expect(onFinished).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it('exposes the documented easing presets', () => {
    expect(TransitionPresets.linear).toEqual([0, 0, 1, 1]);
    expect(TransitionPresets.easeInOutCubic).toEqual([0.65, 0, 0.35, 1]);
    expect(Object.keys(TransitionPresets)).toContain('easeOutBack');
  });
});
