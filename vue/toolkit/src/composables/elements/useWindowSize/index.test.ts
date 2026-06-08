import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { useWindowSize } from '.';

describe(useWindowSize, () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', undefined);
    window.innerWidth = 1024;
    window.innerHeight = 768;
  });
  afterEach(() => vi.unstubAllGlobals());

  it('reads the current window size', () => {
    const scope = effectScope();
    let size: ReturnType<typeof useWindowSize>;
    scope.run(() => {
      size = useWindowSize({ listenOrientation: false });
    });

    expect(size!.width.value).toBe(1024);
    expect(size!.height.value).toBe(768);
    scope.stop();
  });

  it('updates on resize', async () => {
    const scope = effectScope();
    let size: ReturnType<typeof useWindowSize>;
    scope.run(() => {
      size = useWindowSize({ listenOrientation: false });
    });

    window.innerWidth = 500;
    window.innerHeight = 400;
    globalThis.dispatchEvent(new Event('resize'));
    await nextTick();

    expect(size!.width.value).toBe(500);
    expect(size!.height.value).toBe(400);
    scope.stop();
  });

  it('uses documentElement client size when includeScrollbar is false', () => {
    Object.defineProperty(globalThis.document.documentElement, 'clientWidth', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(globalThis.document.documentElement, 'clientHeight', {
      configurable: true,
      value: 700,
    });

    const scope = effectScope();
    let size: ReturnType<typeof useWindowSize>;
    scope.run(() => {
      size = useWindowSize({ listenOrientation: false, includeScrollbar: false });
    });

    expect(size!.width.value).toBe(1000);
    expect(size!.height.value).toBe(700);
    scope.stop();
  });

  it('reads outer window size for type "outer"', () => {
    window.outerWidth = 1440;
    window.outerHeight = 900;

    const scope = effectScope();
    let size: ReturnType<typeof useWindowSize>;
    scope.run(() => {
      size = useWindowSize({ listenOrientation: false, type: 'outer' });
    });

    expect(size!.width.value).toBe(1440);
    expect(size!.height.value).toBe(900);
    scope.stop();
  });

  it('reads scaled visual viewport size for type "visual"', async () => {
    const visualViewport = {
      width: 800,
      height: 600,
      scale: 1.5,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(globalThis, 'visualViewport', {
      configurable: true,
      value: visualViewport,
    });

    const scope = effectScope();
    let size: ReturnType<typeof useWindowSize>;
    scope.run(() => {
      size = useWindowSize({ listenOrientation: false, type: 'visual' });
    });
    await nextTick();

    expect(size!.width.value).toBe(1200);
    expect(size!.height.value).toBe(900);
    expect(visualViewport.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function), expect.objectContaining({ passive: true }));
    scope.stop();

    Object.defineProperty(globalThis, 'visualViewport', { configurable: true, value: undefined });
  });

  it('falls back to inner size for type "visual" without visualViewport', () => {
    Object.defineProperty(globalThis, 'visualViewport', { configurable: true, value: undefined });

    const scope = effectScope();
    let size: ReturnType<typeof useWindowSize>;
    scope.run(() => {
      size = useWindowSize({ listenOrientation: false, type: 'visual' });
    });

    expect(size!.width.value).toBe(1024);
    expect(size!.height.value).toBe(768);
    scope.stop();
  });
});
