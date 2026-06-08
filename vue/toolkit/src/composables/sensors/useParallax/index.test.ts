import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import type { OrientationType } from '@/composables/sensors/useScreenOrientation';
import { useParallax } from '.';

/**
 * A minimal `window`-like stub that satisfies every composable `useParallax`
 * composes (`useDeviceOrientation`, `useMouse`, `useScreenOrientation`,
 * `useWindowSize`, `useElementBounding`). Events are routed through a real
 * registry so we can drive `deviceorientation`/`mousemove` synchronously.
 */
function createWindowStub(opts: {
  supportsOrientation?: boolean;
  orientationType?: OrientationType;
  innerWidth?: number;
  innerHeight?: number;
} = {}) {
  const {
    supportsOrientation = true,
    orientationType = 'landscape-primary',
    innerWidth = 200,
    innerHeight = 100,
  } = opts;

  const listeners = new Map<string, Set<(e: Event) => void>>();

  const target = {
    innerWidth,
    innerHeight,
    outerWidth: innerWidth,
    outerHeight: innerHeight,
    scrollX: 0,
    scrollY: 0,
    visualViewport: undefined,
    document: globalThis.document,
    matchMedia: globalThis.matchMedia?.bind(globalThis) ?? (() => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
    screen: {
      orientation: {
        type: orientationType,
        angle: 0,
        addEventListener: (type: string, fn: (e: Event) => void) => {
          (listeners.get(`screen:${type}`) ?? listeners.set(`screen:${type}`, new Set()).get(`screen:${type}`)!).add(fn);
        },
        removeEventListener: (type: string, fn: (e: Event) => void) => listeners.get(`screen:${type}`)?.delete(fn),
      },
    },
    addEventListener: (type: string, fn: (e: Event) => void) => {
      (listeners.get(type) ?? listeners.set(type, new Set()).get(type)!).add(fn);
    },
    removeEventListener: (type: string, fn: (e: Event) => void) => listeners.get(type)?.delete(fn),
    dispatch: (type: string, data: Record<string, unknown>) => {
      const event = Object.assign(new Event(type), data);
      listeners.get(type)?.forEach(fn => fn(event));
    },
  };

  if (supportsOrientation)
    (target as Record<string, unknown>).DeviceOrientationEvent = class {};

  return target as unknown as Window & {
    dispatch: (type: string, data: Record<string, unknown>) => void;
  };
}

describe(useParallax, () => {
  afterEach(() => vi.unstubAllGlobals());

  it('exposes the { roll, tilt, source } API with mouse as the default source', () => {
    const window = createWindowStub();
    const scope = effectScope();
    let result: ReturnType<typeof useParallax>;
    scope.run(() => {
      result = useParallax(null, { window });
    });

    expect(result!.source.value).toBe('mouse');
    expect(result!.roll.value).toBeTypeOf('number');
    expect(result!.tilt.value).toBeTypeOf('number');
    scope.stop();
  });

  it('computes viewport-relative mouse roll/tilt scaled to -0.5 ~ 0.5', () => {
    const window = createWindowStub({ innerWidth: 200, innerHeight: 100 });
    const scope = effectScope();
    let result: ReturnType<typeof useParallax>;
    scope.run(() => {
      result = useParallax(null, { window });
    });

    // Pointer at the exact centre => no tilt, no roll.
    window.dispatch('mousemove', { clientX: 100, clientY: 50 });
    expect(result!.tilt.value).toBeCloseTo(0);
    expect(result!.roll.value).toBeCloseTo(0);

    // Pointer at the right edge => max tilt (+0.5); bottom edge => min roll (-0.5).
    window.dispatch('mousemove', { clientX: 200, clientY: 100 });
    expect(result!.tilt.value).toBeCloseTo(0.5);
    expect(result!.roll.value).toBeCloseTo(-0.5);

    // Top-left corner => -0.5 tilt, +0.5 roll.
    window.dispatch('mousemove', { clientX: 0, clientY: 0 });
    expect(result!.tilt.value).toBeCloseTo(-0.5);
    expect(result!.roll.value).toBeCloseTo(0.5);
    scope.stop();
  });

  it('applies the mouse adjust functions', () => {
    const window = createWindowStub({ innerWidth: 200, innerHeight: 100 });
    const scope = effectScope();
    let result: ReturnType<typeof useParallax>;
    scope.run(() => {
      result = useParallax(null, {
        window,
        mouseTiltAdjust: i => i * 2,
        mouseRollAdjust: i => i + 1,
      });
    });

    window.dispatch('mousemove', { clientX: 200, clientY: 50 });
    expect(result!.tilt.value).toBeCloseTo(1); // 0.5 * 2
    expect(result!.roll.value).toBeCloseTo(1); // 0 + 1
    scope.stop();
  });

  it('prefers device orientation when supported and providing data', async () => {
    const window = createWindowStub({ orientationType: 'landscape-primary' });
    const scope = effectScope();
    let result: ReturnType<typeof useParallax>;
    scope.run(() => {
      result = useParallax(null, { window });
    });

    await nextTick(); // useSupported settles after mount

    // gamma drives roll, beta drives tilt in landscape-primary, each / 90.
    window.dispatch('deviceorientation', { absolute: true, alpha: 10, beta: 45, gamma: -90 });

    expect(result!.source.value).toBe('deviceOrientation');
    expect(result!.roll.value).toBeCloseTo(-1); // gamma -90 / 90
    expect(result!.tilt.value).toBeCloseTo(0.5); // beta 45 / 90
    scope.stop();
  });

  it('maps device orientation differently per screen orientation', async () => {
    const window = createWindowStub({ orientationType: 'portrait-primary' });
    const scope = effectScope();
    let result: ReturnType<typeof useParallax>;
    scope.run(() => {
      result = useParallax(null, { window });
    });

    await nextTick();

    // portrait-primary: roll = -beta / 90, tilt = gamma / 90.
    window.dispatch('deviceorientation', { absolute: true, alpha: 5, beta: 90, gamma: 45 });
    expect(result!.source.value).toBe('deviceOrientation');
    expect(result!.roll.value).toBeCloseTo(-1); // -beta 90 / 90
    expect(result!.tilt.value).toBeCloseTo(0.5); // gamma 45 / 90
    scope.stop();
  });

  it('applies the device-orientation adjust functions', async () => {
    const window = createWindowStub({ orientationType: 'landscape-primary' });
    const scope = effectScope();
    let result: ReturnType<typeof useParallax>;
    scope.run(() => {
      result = useParallax(null, {
        window,
        deviceOrientationRollAdjust: i => i * 10,
        deviceOrientationTiltAdjust: i => -i,
      });
    });

    await nextTick();
    window.dispatch('deviceorientation', { absolute: true, alpha: 1, beta: 45, gamma: 90 });

    expect(result!.roll.value).toBeCloseTo(10); // (90 / 90) * 10
    expect(result!.tilt.value).toBeCloseTo(-0.5); // -(45 / 90)
    scope.stop();
  });

  it('stays on mouse when orientation is supported but reports only zero/null angles', async () => {
    const window = createWindowStub();
    const scope = effectScope();
    let result: ReturnType<typeof useParallax>;
    scope.run(() => {
      result = useParallax(null, { window });
    });

    await nextTick();
    window.dispatch('deviceorientation', { absolute: true, alpha: 0, beta: 0, gamma: 0 });

    expect(result!.source.value).toBe('mouse');
    scope.stop();
  });

  it('measures the mouse fallback against a target element when provided', () => {
    const window = createWindowStub();
    const el = globalThis.document.createElement('div');
    el.getBoundingClientRect = () => ({
      x: 100,
      y: 100,
      top: 100,
      left: 100,
      right: 300,
      bottom: 200,
      width: 200,
      height: 100,
      toJSON: () => ({}),
    });

    const scope = effectScope();
    let result: ReturnType<typeof useParallax>;
    scope.run(() => {
      result = useParallax(el, { window });
    });

    // Centre of the element box (200,150) => zero tilt/roll.
    window.dispatch('mousemove', { clientX: 200, clientY: 150 });
    expect(result!.tilt.value).toBeCloseTo(0);
    expect(result!.roll.value).toBeCloseTo(0);

    // Element right/bottom edge => +0.5 tilt, -0.5 roll.
    window.dispatch('mousemove', { clientX: 300, clientY: 200 });
    expect(result!.tilt.value).toBeCloseTo(0.5);
    expect(result!.roll.value).toBeCloseTo(-0.5);
    scope.stop();
  });

  it('reports mouse source and stays inert on the unsupported / SSR path', () => {
    // A window-like object without DeviceOrientationEvent models both an
    // unsupported browser and SSR. Mouse fallback still produces finite numbers.
    const window = createWindowStub({ supportsOrientation: false, innerWidth: 100, innerHeight: 100 });
    const scope = effectScope();
    let result: ReturnType<typeof useParallax>;
    scope.run(() => {
      result = useParallax(null, { window });
    });

    expect(result!.source.value).toBe('mouse');
    window.dispatch('deviceorientation', { absolute: true, alpha: 30, beta: 60, gamma: 45 });
    // Still mouse — orientation is unsupported on this window.
    expect(result!.source.value).toBe('mouse');
    expect(Number.isFinite(result!.roll.value)).toBeTruthy();
    expect(Number.isFinite(result!.tilt.value)).toBeTruthy();
    scope.stop();
  });
});
