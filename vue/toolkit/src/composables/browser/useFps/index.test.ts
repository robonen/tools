import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { effectScope } from 'vue';
import { useFps } from '.';

let rafCallbacks: Array<(time: number) => void> = [];
let rafIdCounter = 0;

beforeEach(() => {
  rafCallbacks = [];
  rafIdCounter = 0;

  vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
    const id = ++rafIdCounter;
    rafCallbacks.push(cb);
    return id;
  });

  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function triggerFrame(time: number) {
  const cbs = [...rafCallbacks];
  rafCallbacks = [];
  cbs.forEach(cb => cb(time));
}

function triggerFrames(startTime: number, interval: number, count: number) {
  for (let i = 0; i < count; i++) {
    triggerFrame(startTime + i * interval);
  }
}

describe(useFps, () => {
  it('starts at 0 fps', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useFps>;

    scope.run(() => {
      result = useFps();
    });

    expect(result!.fps.value).toBe(0);
    scope.stop();
  });

  it('reports fps after "every" frames', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useFps>;

    scope.run(() => {
      result = useFps({ every: 5 });
    });

    // ~60fps = 16.67ms per frame
    // First frame has delta=0, skipped by useFps. Need 5 real-delta frames.
    triggerFrame(100); // delta=0, skipped
    triggerFrame(116.67); // delta=16.67
    triggerFrame(133.33); // delta=16.66
    triggerFrame(150); // delta=16.67
    triggerFrame(166.67); // delta=16.67
    triggerFrame(183.33); // delta=16.66 → 5 deltas collected, update

    expect(result!.fps.value).toBe(60);
    scope.stop();
  });

  it('does not update fps before collecting enough frames', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useFps>;

    scope.run(() => {
      result = useFps({ every: 10 });
    });

    triggerFrame(100);
    triggerFrame(116.67);
    triggerFrame(133.33);

    expect(result!.fps.value).toBe(0);
    scope.stop();
  });

  it('tracks min and max fps', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useFps>;

    scope.run(() => {
      result = useFps({ every: 3 });
    });

    // First batch: ~60fps (16.67ms intervals)
    triggerFrame(100); // delta=0, skipped
    triggerFrame(116.67); // delta=16.67
    triggerFrame(133.33); // delta=16.66
    triggerFrame(150); // delta=16.67 → 3 deltas, update

    const firstFps = result!.fps.value;
    expect(firstFps).toBe(60);

    // Second batch: ~30fps (33.33ms intervals)
    triggerFrame(183.33); // delta=33.33
    triggerFrame(216.67); // delta=33.34
    triggerFrame(250); // delta=33.33 → 3 deltas, update

    const secondFps = result!.fps.value;
    expect(secondFps).toBe(30);

    expect(result!.max.value).toBe(60);
    expect(result!.min.value).toBe(30);

    scope.stop();
  });

  it('resets min, max, and fps', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useFps>;

    scope.run(() => {
      result = useFps({ every: 3 });
    });

    triggerFrame(100);
    triggerFrame(116.67);
    triggerFrame(133.33);
    triggerFrame(150);

    expect(result!.fps.value).toBe(60);

    result!.reset();

    expect(result!.fps.value).toBe(0);
    expect(result!.min.value).toBe(Infinity);
    expect(result!.max.value).toBe(0);

    scope.stop();
  });

  it('cleans up on scope dispose', () => {
    const scope = effectScope();

    scope.run(() => {
      useFps();
    });

    // Should not throw on stop
    scope.stop();

    // No more raf callbacks should be registered after stop
    triggerFrame(100);
    expect(rafCallbacks).toHaveLength(0);
  });

  it('does nothing when window is undefined (SSR)', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useFps>;

    scope.run(() => {
      result = useFps({ window: undefined as any });
    });

    expect(result!.fps.value).toBe(0);
    scope.stop();
  });

  it('is active by default', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useFps>;

    scope.run(() => {
      result = useFps();
    });

    expect(result!.isActive.value).toBeTruthy();
    scope.stop();
  });

  it('does not start when immediate is false', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useFps>;

    scope.run(() => {
      result = useFps({ immediate: false });
    });

    expect(result!.isActive.value).toBeFalsy();
    scope.stop();
  });

  it('pauses and resumes fps tracking', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useFps>;

    scope.run(() => {
      result = useFps({ every: 3 });
    });

    // Collect one batch
    triggerFrame(100);
    triggerFrame(116.67);
    triggerFrame(133.33);
    triggerFrame(150);

    expect(result!.fps.value).toBe(60);

    result!.pause();
    expect(result!.isActive.value).toBeFalsy();

    // Frames while paused should not update
    triggerFrame(200);
    triggerFrame(300);
    triggerFrame(400);
    triggerFrame(500);

    expect(result!.fps.value).toBe(60);

    result!.resume();
    expect(result!.isActive.value).toBeTruthy();

    scope.stop();
  });

  it('toggles fps tracking', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useFps>;

    scope.run(() => {
      result = useFps();
    });

    expect(result!.isActive.value).toBeTruthy();

    result!.toggle();
    expect(result!.isActive.value).toBeFalsy();

    result!.toggle();
    expect(result!.isActive.value).toBeTruthy();

    scope.stop();
  });
});
