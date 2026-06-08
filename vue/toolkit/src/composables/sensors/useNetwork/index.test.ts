import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { useNetwork } from '.';

afterEach(() => vi.unstubAllGlobals());

describe(useNetwork, () => {
  it('exposes the full reactive network state shape', () => {
    const scope = effectScope();
    let state: ReturnType<typeof useNetwork>;
    scope.run(() => {
      state = useNetwork();
    });

    expect(state!.isOnline.value).toBe(navigator.onLine);
    expect(state!.type.value).toBe('unknown');
    // while online on mount, offlineAt stays undefined and onlineAt is stamped
    expect(state!.offlineAt.value).toBeUndefined();
    expect(typeof state!.onlineAt.value).toBe('number');
    expect(state!.downlink.value).toBeUndefined();
    expect(state!.downlinkMax.value).toBeUndefined();
    expect(state!.rtt.value).toBeUndefined();
    expect(state!.effectiveType.value).toBeUndefined();
    expect(state!.saveData.value).toBeUndefined();
    scope.stop();
  });

  it('reflects the initial navigator.onLine from a supplied window', () => {
    const fakeWindow = {
      navigator: { onLine: false },
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as Window;

    const scope = effectScope();
    let state: ReturnType<typeof useNetwork>;
    scope.run(() => {
      state = useNetwork({ window: fakeWindow });
    });
    expect(state!.isOnline.value).toBeFalsy();
    scope.stop();
  });

  it('records offlineAt and onlineAt timestamps on transitions', async () => {
    const scope = effectScope();
    let state: ReturnType<typeof useNetwork>;
    scope.run(() => {
      state = useNetwork();
    });

    expect(state!.offlineAt.value).toBeUndefined();

    globalThis.dispatchEvent(new Event('offline'));
    await nextTick();
    expect(state!.isOnline.value).toBeFalsy();
    expect(typeof state!.offlineAt.value).toBe('number');

    globalThis.dispatchEvent(new Event('online'));
    await nextTick();
    expect(state!.isOnline.value).toBeTruthy();
    expect(typeof state!.onlineAt.value).toBe('number');
    scope.stop();
  });

  it('stays inert and reports online when window is undefined (SSR)', () => {
    const scope = effectScope();
    let state: ReturnType<typeof useNetwork>;
    scope.run(() => {
      state = useNetwork({ window: undefined });
    });

    expect(state!.isOnline.value).toBeTruthy();
    expect(state!.isSupported.value).toBeFalsy();
    expect(state!.type.value).toBe('unknown');
    expect(state!.downlink.value).toBeUndefined();
    scope.stop();
  });

  it('isSupported is false when Network Information API is unavailable', () => {
    const fakeWindow = {
      navigator: { onLine: true },
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as Window;

    const scope = effectScope();
    let state: ReturnType<typeof useNetwork>;
    scope.run(() => {
      state = useNetwork({ window: fakeWindow });
    });
    expect(state!.isSupported.value).toBeFalsy();
    scope.stop();
  });

  it('reads connection info and listens for change events when supported', () => {
    const listeners: Record<string, Array<(e: Event) => void>> = {};
    const connection = {
      downlink: 10,
      downlinkMax: 100,
      effectiveType: '4g',
      rtt: 50,
      saveData: true,
      type: 'wifi',
      addEventListener: (event: string, cb: (e: Event) => void) => {
        (listeners[event] ??= []).push(cb);
      },
      removeEventListener: () => {},
    };

    const fakeWindow = {
      navigator: { onLine: true, connection },
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as Window;

    const scope = effectScope();
    let state: ReturnType<typeof useNetwork>;
    scope.run(() => {
      state = useNetwork({ window: fakeWindow });
    });

    expect(state!.isSupported.value).toBeTruthy();
    expect(state!.downlink.value).toBe(10);
    expect(state!.downlinkMax.value).toBe(100);
    expect(state!.effectiveType.value).toBe('4g');
    expect(state!.rtt.value).toBe(50);
    expect(state!.saveData.value).toBeTruthy();
    expect(state!.type.value).toBe('wifi');

    // a registered change listener should re-read connection state
    connection.downlink = 5;
    connection.effectiveType = '3g';
    listeners.change?.forEach(cb => cb(new Event('change')));
    expect(state!.downlink.value).toBe(5);
    expect(state!.effectiveType.value).toBe('3g');
    scope.stop();
  });

  it('falls back to "unknown" type when connection.type is missing', () => {
    const connection = {
      downlink: 8,
      effectiveType: '4g',
      addEventListener: () => {},
      removeEventListener: () => {},
    };

    const fakeWindow = {
      navigator: { onLine: true, connection },
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as Window;

    const scope = effectScope();
    let state: ReturnType<typeof useNetwork>;
    scope.run(() => {
      state = useNetwork({ window: fakeWindow });
    });

    expect(state!.isSupported.value).toBeTruthy();
    expect(state!.type.value).toBe('unknown');
    expect(state!.downlink.value).toBe(8);
    scope.stop();
  });
});
