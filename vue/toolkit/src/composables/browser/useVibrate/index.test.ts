import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useVibrate } from '.';

function stubNavigator() {
  const vibrate = vi.fn(() => true);
  const navigator = { vibrate } as unknown as Navigator;
  return { navigator, vibrate };
}

describe(useVibrate, () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('reports support based on the provided navigator', () => {
    const { navigator } = stubNavigator();
    const scope = effectScope();
    let result: ReturnType<typeof useVibrate>;
    scope.run(() => {
      result = useVibrate({ navigator });
    });

    expect(result!.isSupported.value).toBeTruthy();
    scope.stop();
  });

  it('reports unsupported when navigator lacks vibrate', () => {
    const navigator = {} as Navigator;
    const scope = effectScope();
    let result: ReturnType<typeof useVibrate>;
    scope.run(() => {
      result = useVibrate({ navigator });
    });

    expect(result!.isSupported.value).toBeFalsy();
    scope.stop();
  });

  it('reports unsupported when navigator is undefined (SSR path)', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useVibrate>;
    scope.run(() => {
      result = useVibrate({ navigator: undefined });
    });

    expect(result!.isSupported.value).toBeFalsy();
    // vibrate/stop must not throw when unsupported
    expect(() => result!.vibrate()).not.toThrow();
    expect(() => result!.stop()).not.toThrow();
    scope.stop();
  });

  it('vibrates with the configured pattern by default', () => {
    const { navigator, vibrate } = stubNavigator();
    const scope = effectScope();
    let result: ReturnType<typeof useVibrate>;
    scope.run(() => {
      result = useVibrate({ pattern: [200, 100, 200], navigator });
    });

    result!.vibrate();
    expect(vibrate).toHaveBeenCalledWith([200, 100, 200]);
    scope.stop();
  });

  it('vibrates with a one-off pattern argument', () => {
    const { navigator, vibrate } = stubNavigator();
    const scope = effectScope();
    let result: ReturnType<typeof useVibrate>;
    scope.run(() => {
      result = useVibrate({ pattern: [200], navigator });
    });

    result!.vibrate(500);
    expect(vibrate).toHaveBeenCalledWith(500);
    scope.stop();
  });

  it('exposes a reactive pattern that controls default vibration', () => {
    const { navigator, vibrate } = stubNavigator();
    const scope = effectScope();
    let result: ReturnType<typeof useVibrate>;
    scope.run(() => {
      result = useVibrate({ pattern: [100], navigator });
    });

    result!.pattern.value = [300, 50, 300];
    result!.vibrate();
    expect(vibrate).toHaveBeenCalledWith([300, 50, 300]);
    scope.stop();
  });

  it('accepts a ref pattern', () => {
    const { navigator, vibrate } = stubNavigator();
    const pattern = ref<number[]>([10]);
    const scope = effectScope();
    let result: ReturnType<typeof useVibrate>;
    scope.run(() => {
      result = useVibrate({ pattern, navigator });
    });

    pattern.value = [20, 30];
    result!.vibrate();
    expect(vibrate).toHaveBeenCalledWith([20, 30]);
    scope.stop();
  });

  it('stop() cancels any ongoing vibration', () => {
    const { navigator, vibrate } = stubNavigator();
    const scope = effectScope();
    let result: ReturnType<typeof useVibrate>;
    scope.run(() => {
      result = useVibrate({ pattern: [200], navigator });
    });

    result!.stop();
    expect(vibrate).toHaveBeenCalledWith(0);
    scope.stop();
  });

  it('does not expose interval controls when interval is 0', () => {
    const { navigator } = stubNavigator();
    const scope = effectScope();
    let result: ReturnType<typeof useVibrate>;
    scope.run(() => {
      result = useVibrate({ navigator });
    });

    expect(result!.intervalControls).toBeUndefined();
    scope.stop();
  });

  it('exposes interval controls when interval > 0 and loops the pattern', () => {
    vi.useFakeTimers();
    const { navigator, vibrate } = stubNavigator();
    const scope = effectScope();
    let result: ReturnType<typeof useVibrate>;
    scope.run(() => {
      result = useVibrate({ pattern: [100], interval: 1000, navigator });
    });

    expect(result!.intervalControls).toBeDefined();
    expect(result!.intervalControls!.isActive.value).toBeFalsy();

    result!.intervalControls!.resume();
    expect(result!.intervalControls!.isActive.value).toBeTruthy();

    vi.advanceTimersByTime(2500);
    expect(vibrate).toHaveBeenCalledTimes(2);
    expect(vibrate).toHaveBeenCalledWith([100]);

    scope.stop();
  });

  it('stop() pauses the interval loop', () => {
    vi.useFakeTimers();
    const { navigator, vibrate } = stubNavigator();
    const scope = effectScope();
    let result: ReturnType<typeof useVibrate>;
    scope.run(() => {
      result = useVibrate({ pattern: [100], interval: 1000, navigator });
    });

    result!.intervalControls!.resume();
    vi.advanceTimersByTime(1000);
    expect(vibrate).toHaveBeenCalledTimes(1);

    result!.stop();
    expect(result!.intervalControls!.isActive.value).toBeFalsy();

    // vibrate(0) from stop plus the single loop tick
    vibrate.mockClear();
    vi.advanceTimersByTime(3000);
    expect(vibrate).not.toHaveBeenCalled();

    scope.stop();
  });

  it('stops the interval loop when the scope is disposed', async () => {
    vi.useFakeTimers();
    const { navigator, vibrate } = stubNavigator();
    const scope = effectScope();
    let result: ReturnType<typeof useVibrate>;
    scope.run(() => {
      result = useVibrate({ pattern: [100], interval: 1000, navigator });
    });

    result!.intervalControls!.resume();
    scope.stop();
    await nextTick();

    vibrate.mockClear();
    vi.advanceTimersByTime(3000);
    expect(vibrate).not.toHaveBeenCalled();
  });
});
