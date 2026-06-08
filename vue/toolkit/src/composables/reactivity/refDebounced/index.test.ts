import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, isReadonly, nextTick, reactive, ref } from 'vue';
import { refDebounced } from '.';

describe(refDebounced, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('returns a readonly ref', () => {
    const source = ref('a');
    const debounced = refDebounced(source);
    expect(isReadonly(debounced)).toBeTruthy();
  });

  it('mirrors the initial value synchronously', () => {
    const source = ref('initial');
    const debounced = refDebounced(source, 100);
    expect(debounced.value).toBe('initial');
  });

  it('delays updates by the given ms', async () => {
    const source = ref('a');
    const debounced = refDebounced(source, 100);

    source.value = 'b';
    await nextTick();
    expect(debounced.value).toBe('a');

    vi.advanceTimersByTime(99);
    expect(debounced.value).toBe('a');

    vi.advanceTimersByTime(1);
    expect(debounced.value).toBe('b');
  });

  it('uses a default delay of 200ms', async () => {
    const source = ref(0);
    const debounced = refDebounced(source);

    source.value = 1;
    await nextTick();

    vi.advanceTimersByTime(199);
    expect(debounced.value).toBe(0);

    vi.advanceTimersByTime(1);
    expect(debounced.value).toBe(1);
  });

  it('coalesces rapid bursts into a single trailing update', async () => {
    const source = ref(0);
    const debounced = refDebounced(source, 100);

    source.value = 1;
    await nextTick();
    vi.advanceTimersByTime(50);

    source.value = 2;
    await nextTick();
    vi.advanceTimersByTime(50);

    source.value = 3;
    await nextTick();

    // Still within the debounce window — no update yet.
    expect(debounced.value).toBe(0);

    vi.advanceTimersByTime(100);
    expect(debounced.value).toBe(3);
  });

  it('respects maxWait to force progress under sustained input', async () => {
    const source = ref(0);
    const debounced = refDebounced(source, 100, { maxWait: 250 });

    // Keep pushing updates just before each debounce timer fires.
    for (let i = 1; i <= 5; i++) {
      source.value = i;
      await nextTick();
      vi.advanceTimersByTime(60);
    }

    // 5 * 60 = 300ms elapsed; maxWait (250ms) must have forced a flush.
    expect(debounced.value).not.toBe(0);
  });

  it('supports a reactive ms', async () => {
    const source = ref('a');
    const ms = ref(100);
    const debounced = refDebounced(source, ms);

    ms.value = 50;
    source.value = 'b';
    await nextTick();

    vi.advanceTimersByTime(50);
    expect(debounced.value).toBe('b');
  });

  it('runs synchronously when ms is zero or negative', async () => {
    const source = ref('a');
    const debounced = refDebounced(source, 0);

    source.value = 'b';
    await nextTick();
    expect(debounced.value).toBe('b');
  });

  it('works with a getter source', async () => {
    const state = reactive({ n: 1 });
    const debounced = refDebounced(() => state.n, 100);

    expect(debounced.value).toBe(1);

    state.n = 2;
    await nextTick();
    vi.advanceTimersByTime(100);
    expect(debounced.value).toBe(2);
  });

  it('disposes pending timers when the owning scope stops', async () => {
    const source = ref('a');
    let debounced: ReturnType<typeof refDebounced<string>>;

    const scope = effectScope();
    scope.run(() => {
      debounced = refDebounced(source, 100);
    });

    source.value = 'b';
    await nextTick();

    scope.stop();

    vi.advanceTimersByTime(200);
    // The pending update was cancelled with the scope.
    expect(debounced!.value).toBe('a');
  });

  it('does not update when the source never changes (SSR-safe, no timers)', () => {
    const source = ref('stable');
    const debounced = refDebounced(source, 100);

    vi.advanceTimersByTime(1000);
    expect(debounced.value).toBe('stable');
  });
});
