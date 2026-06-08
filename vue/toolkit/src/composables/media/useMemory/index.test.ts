import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { useMemory } from '.';
import type { MemoryInfo } from '.';

function makeMemory(used: number): MemoryInfo {
  return {
    jsHeapSizeLimit: 4096,
    totalJSHeapSize: 2048,
    usedJSHeapSize: used,
    [Symbol.toStringTag]: 'MemoryInfo',
  };
}

function makeWindow(memory?: MemoryInfo): Window {
  const performance = memory === undefined
    ? ({} as Performance)
    : ({ memory } as unknown as Performance);

  return { performance } as unknown as Window;
}

describe(useMemory, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('reports supported and reads the first sample immediately', () => {
    const info = makeMemory(100);
    const win = makeWindow(info);

    const scope = effectScope();
    let result: ReturnType<typeof useMemory>;
    scope.run(() => {
      result = useMemory({ window: win });
    });

    expect(result!.isSupported.value).toBeTruthy();
    expect(result!.memory.value).toBe(info);
    expect(result!.memory.value?.usedJSHeapSize).toBe(100);
    scope.stop();
  });

  it('polls on the configured interval', () => {
    let current = makeMemory(1);
    const win = {
      get performance() {
        return { memory: current } as unknown as Performance;
      },
    } as unknown as Window;

    const scope = effectScope();
    let result: ReturnType<typeof useMemory>;
    scope.run(() => {
      result = useMemory({ window: win, interval: 500 });
    });

    expect(result!.memory.value?.usedJSHeapSize).toBe(1);

    current = makeMemory(2);
    vi.advanceTimersByTime(500);
    expect(result!.memory.value?.usedJSHeapSize).toBe(2);

    current = makeMemory(3);
    vi.advanceTimersByTime(500);
    expect(result!.memory.value?.usedJSHeapSize).toBe(3);

    scope.stop();
  });

  it('does not poll when immediate is false', () => {
    const info = makeMemory(42);
    const win = makeWindow(info);

    const scope = effectScope();
    let result: ReturnType<typeof useMemory>;
    scope.run(() => {
      result = useMemory({ window: win, immediate: false });
    });

    expect(result!.memory.value).toBeUndefined();

    vi.advanceTimersByTime(5000);
    expect(result!.memory.value).toBeUndefined();
    scope.stop();
  });

  it('stops polling when the scope is disposed', () => {
    let current = makeMemory(1);
    const win = {
      get performance() {
        return { memory: current } as unknown as Performance;
      },
    } as unknown as Window;

    const scope = effectScope();
    let result: ReturnType<typeof useMemory>;
    scope.run(() => {
      result = useMemory({ window: win });
    });

    expect(result!.memory.value?.usedJSHeapSize).toBe(1);
    scope.stop();

    current = makeMemory(99);
    vi.advanceTimersByTime(5000);
    expect(result!.memory.value?.usedJSHeapSize).toBe(1);
  });

  it('reports unsupported when performance.memory is missing', () => {
    const win = makeWindow(undefined);

    const scope = effectScope();
    let result: ReturnType<typeof useMemory>;
    scope.run(() => {
      result = useMemory({ window: win });
    });

    expect(result!.isSupported.value).toBeFalsy();
    expect(result!.memory.value).toBeUndefined();

    vi.advanceTimersByTime(5000);
    expect(result!.memory.value).toBeUndefined();
    scope.stop();
  });

  it('is SSR-safe when window is undefined', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useMemory>;
    scope.run(() => {
      result = useMemory({ window: undefined });
    });

    expect(result!.isSupported.value).toBeFalsy();
    expect(result!.memory.value).toBeUndefined();
    scope.stop();
  });
});
