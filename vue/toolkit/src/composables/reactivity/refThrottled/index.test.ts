import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { refThrottled } from '.';

describe(refThrottled, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with the source value', () => {
    const scope = effectScope();
    scope.run(() => {
      const source = ref('init');
      const throttled = refThrottled(source, 100);
      expect(throttled.value).toBe('init');
    });
    scope.stop();
  });

  it('updates immediately on the leading edge', async () => {
    const scope = effectScope();
    await scope.run(async () => {
      const source = ref(0);
      const throttled = refThrottled(source, 100);

      source.value = 1;
      await nextTick();
      expect(throttled.value).toBe(1);
    });
    scope.stop();
  });

  it('throttles intermediate updates within the window', async () => {
    const scope = effectScope();
    await scope.run(async () => {
      const source = ref(0);
      const throttled = refThrottled(source, 100);

      source.value = 1;
      await nextTick();
      expect(throttled.value).toBe(1);

      source.value = 2;
      await nextTick();
      // Still within the window: not yet propagated as a fresh leading update.
      expect(throttled.value).toBe(1);

      source.value = 3;
      await nextTick();
      expect(throttled.value).toBe(1);

      // Trailing edge fires with the most recent value.
      vi.advanceTimersByTime(100);
      await nextTick();
      expect(throttled.value).toBe(3);
    });
    scope.stop();
  });

  it('does not emit a trailing update when trailing is false', async () => {
    const scope = effectScope();
    await scope.run(async () => {
      const source = ref(0);
      const throttled = refThrottled(source, 100, false);

      source.value = 1;
      await nextTick();
      expect(throttled.value).toBe(1);

      source.value = 2;
      await nextTick();
      expect(throttled.value).toBe(1);

      vi.advanceTimersByTime(200);
      await nextTick();
      // No trailing edge: value stays at the leading update.
      expect(throttled.value).toBe(1);
    });
    scope.stop();
  });

  it('skips the leading update when leading is false', async () => {
    const scope = effectScope();
    await scope.run(async () => {
      const source = ref(0);
      const throttled = refThrottled(source, 100, true, false);

      source.value = 1;
      await nextTick();
      // Leading suppressed: initial value retained until the trailing edge.
      expect(throttled.value).toBe(0);

      vi.advanceTimersByTime(100);
      await nextTick();
      expect(throttled.value).toBe(1);
    });
    scope.stop();
  });

  it('mirrors the source synchronously when delay <= 0', async () => {
    const scope = effectScope();
    await scope.run(async () => {
      const source = ref(0);
      const throttled = refThrottled(source, 0);

      source.value = 1;
      await nextTick();
      expect(throttled.value).toBe(1);

      source.value = 2;
      await nextTick();
      expect(throttled.value).toBe(2);
    });
    scope.stop();
  });

  it('mirrors the source synchronously when delay is negative', async () => {
    const scope = effectScope();
    await scope.run(async () => {
      const source = ref('a');
      const throttled = refThrottled(source, -50);

      source.value = 'b';
      await nextTick();
      expect(throttled.value).toBe('b');
    });
    scope.stop();
  });

  it('accepts a getter as the source', async () => {
    const scope = effectScope();
    await scope.run(async () => {
      const obj = ref({ n: 1 });
      const throttled = refThrottled(() => obj.value.n, 100);
      expect(throttled.value).toBe(1);

      obj.value = { n: 2 };
      await nextTick();
      expect(throttled.value).toBe(2);
    });
    scope.stop();
  });

  it('reopens the leading edge after the window elapses', async () => {
    const scope = effectScope();
    await scope.run(async () => {
      const source = ref(0);
      const throttled = refThrottled(source, 100);

      source.value = 1;
      await nextTick();
      expect(throttled.value).toBe(1);

      // Advance past the window so the next change is a fresh leading update.
      vi.advanceTimersByTime(100);
      await nextTick();

      source.value = 2;
      await nextTick();
      expect(throttled.value).toBe(2);
    });
    scope.stop();
  });
});
