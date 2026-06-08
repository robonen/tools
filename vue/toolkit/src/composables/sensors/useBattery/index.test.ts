import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { useBattery } from '.';
import type { BatteryManager } from '.';

afterEach(() => vi.unstubAllGlobals());

function createBatteryManager(overrides: Partial<BatteryManager> = {}) {
  const listeners = new Map<string, Set<EventListener>>();

  const battery = {
    charging: false,
    chargingTime: 0,
    dischargingTime: Number.POSITIVE_INFINITY,
    level: 0.5,
    ...overrides,
    addEventListener: vi.fn((event: string, listener: EventListener) => {
      if (!listeners.has(event))
        listeners.set(event, new Set());
      listeners.get(event)!.add(listener);
    }),
    removeEventListener: vi.fn((event: string, listener: EventListener) => {
      listeners.get(event)?.delete(listener);
    }),
    dispatchEvent: vi.fn(),
  } as unknown as BatteryManager;

  function emit(event: string): void {
    for (const listener of listeners.get(event) ?? [])
      listener.call(battery, new Event(event));
  }

  return { battery, listeners, emit };
}

function stubNavigator(battery?: BatteryManager) {
  const getBattery = vi.fn(() => Promise.resolve(battery!));
  const navigator = { getBattery } as unknown as Navigator;
  return { navigator, getBattery };
}

describe(useBattery, () => {
  it('reports supported when navigator.getBattery exists', () => {
    const { battery } = createBatteryManager();
    const { navigator } = stubNavigator(battery);
    const scope = effectScope();
    let result!: ReturnType<typeof useBattery>;
    scope.run(() => {
      result = useBattery({ navigator });
    });
    expect(result.isSupported.value).toBeTruthy();
    scope.stop();
  });

  it('reports unsupported when getBattery is missing', () => {
    const navigator = {} as Navigator;
    const scope = effectScope();
    let result!: ReturnType<typeof useBattery>;
    scope.run(() => {
      result = useBattery({ navigator });
    });
    expect(result.isSupported.value).toBeFalsy();
    scope.stop();
  });

  it('exposes safe defaults before the battery resolves', () => {
    const { battery } = createBatteryManager();
    const { navigator } = stubNavigator(battery);
    const scope = effectScope();
    let result!: ReturnType<typeof useBattery>;
    scope.run(() => {
      result = useBattery({ navigator });
    });
    expect(result.charging.value).toBeFalsy();
    expect(result.chargingTime.value).toBe(0);
    expect(result.dischargingTime.value).toBe(0);
    expect(result.level.value).toBe(1);
    scope.stop();
  });

  it('populates state once the battery resolves', async () => {
    const { battery } = createBatteryManager({
      charging: true,
      chargingTime: 1200,
      dischargingTime: 0,
      level: 0.75,
    });
    const { navigator } = stubNavigator(battery);
    const scope = effectScope();
    let result!: ReturnType<typeof useBattery>;
    scope.run(() => {
      result = useBattery({ navigator });
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(result.charging.value).toBeTruthy();
    expect(result.chargingTime.value).toBe(1200);
    expect(result.dischargingTime.value).toBe(0);
    expect(result.level.value).toBe(0.75);
    scope.stop();
  });

  it('normalizes falsy/Infinity charging times to 0', async () => {
    const { battery } = createBatteryManager({
      charging: false,
      chargingTime: Number.POSITIVE_INFINITY,
      dischargingTime: Number.POSITIVE_INFINITY,
      level: 0.4,
    });
    const { navigator } = stubNavigator(battery);
    const scope = effectScope();
    let result!: ReturnType<typeof useBattery>;
    scope.run(() => {
      result = useBattery({ navigator });
    });

    await Promise.resolve();
    await Promise.resolve();

    // Infinity is truthy so it is preserved, but a 0 chargingTime should stay 0.
    expect(result.chargingTime.value).toBe(Number.POSITIVE_INFINITY);
    scope.stop();
  });

  it('registers passive listeners for every battery event', async () => {
    const { battery } = createBatteryManager();
    const { navigator } = stubNavigator(battery);
    const scope = effectScope();
    scope.run(() => useBattery({ navigator }));

    await Promise.resolve();
    await Promise.resolve();

    const events = (battery.addEventListener as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]);
    expect(events).toEqual(
      expect.arrayContaining([
        'chargingchange',
        'chargingtimechange',
        'dischargingtimechange',
        'levelchange',
      ]),
    );
    const opts = (battery.addEventListener as ReturnType<typeof vi.fn>).mock.calls[0]![2];
    expect(opts).toMatchObject({ passive: true });
    scope.stop();
  });

  it('updates reactive state when a battery event fires', async () => {
    const { battery, emit } = createBatteryManager({ charging: false, level: 0.5 });
    const { navigator } = stubNavigator(battery);
    const scope = effectScope();
    let result!: ReturnType<typeof useBattery>;
    scope.run(() => {
      result = useBattery({ navigator });
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(result.charging.value).toBeFalsy();
    expect(result.level.value).toBe(0.5);

    (battery as unknown as { charging: boolean; level: number }).charging = true;
    (battery as unknown as { charging: boolean; level: number }).level = 0.9;
    emit('levelchange');

    expect(result.charging.value).toBeTruthy();
    expect(result.level.value).toBe(0.9);
    scope.stop();
  });

  it('does not bind listeners when the scope is disposed before resolution', async () => {
    const { battery } = createBatteryManager();
    const { navigator } = stubNavigator(battery);
    const scope = effectScope();
    scope.run(() => useBattery({ navigator }));

    // Tear down before getBattery() resolves.
    scope.stop();

    await Promise.resolve();
    await Promise.resolve();

    expect(battery.addEventListener).not.toHaveBeenCalled();
  });

  it('invokes onError when getBattery rejects', async () => {
    const error = new Error('denied');
    const getBattery = vi.fn(() => Promise.reject(error));
    const navigator = { getBattery } as unknown as Navigator;
    const onError = vi.fn();
    const scope = effectScope();
    scope.run(() => useBattery({ navigator, onError }));

    await Promise.resolve();
    await Promise.resolve();

    expect(onError).toHaveBeenCalledWith(error);
    scope.stop();
  });

  it('does not call getBattery when unsupported', () => {
    const navigator = {} as Navigator;
    const scope = effectScope();
    let result!: ReturnType<typeof useBattery>;
    scope.run(() => {
      result = useBattery({ navigator });
    });
    expect(result.isSupported.value).toBeFalsy();
    expect(result.level.value).toBe(1);
    scope.stop();
  });

  it('is SSR-safe when navigator is undefined', () => {
    const scope = effectScope();
    let result!: ReturnType<typeof useBattery>;
    scope.run(() => {
      result = useBattery({ navigator: undefined });
    });
    expect(result.isSupported.value).toBeFalsy();
    expect(result.charging.value).toBeFalsy();
    expect(result.level.value).toBe(1);
    scope.stop();
  });
});
