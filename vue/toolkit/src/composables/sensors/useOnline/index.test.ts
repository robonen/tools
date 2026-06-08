import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { useOnline } from '.';

afterEach(() => vi.unstubAllGlobals());

describe(useOnline, () => {
  it('reflects the initial navigator.onLine', () => {
    const scope = effectScope();
    let online: ReturnType<typeof useOnline>;
    scope.run(() => {
      online = useOnline();
    });
    expect(online!.value).toBe(navigator.onLine);
    scope.stop();
  });

  it('updates on offline/online events', async () => {
    const scope = effectScope();
    let online: ReturnType<typeof useOnline>;
    scope.run(() => {
      online = useOnline();
    });

    globalThis.dispatchEvent(new Event('offline'));
    await nextTick();
    expect(online!.value).toBeFalsy();

    globalThis.dispatchEvent(new Event('online'));
    await nextTick();
    expect(online!.value).toBeTruthy();
    scope.stop();
  });

  it('defaults to true when there is no window (SSR)', () => {
    const scope = effectScope();
    let online: ReturnType<typeof useOnline>;
    scope.run(() => {
      online = useOnline({ window: undefined as any });
    });
    expect(online!.value).toBeTruthy();
    scope.stop();
  });
});
