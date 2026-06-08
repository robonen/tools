import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { useCloseWatcher } from '.';

/**
 * Minimal fake of the native `CloseWatcher`: tracks instances so tests can drive
 * close/destroy and assert recreation behaviour.
 */
function createCloseWatcherStub() {
  const instances: FakeCloseWatcher[] = [];

  class FakeCloseWatcher {
    listeners = new Map<string, Set<(event: Event) => void>>();
    destroyed = false;
    requestCloseCalls = 0;
    closeCalls = 0;

    constructor() {
      instances.push(this);
    }

    addEventListener(type: string, listener: (event: Event) => void) {
      if (!this.listeners.has(type))
        this.listeners.set(type, new Set());
      this.listeners.get(type)!.add(listener);
    }

    removeEventListener(type: string, listener: (event: Event) => void) {
      this.listeners.get(type)?.delete(listener);
    }

    requestClose() {
      this.requestCloseCalls++;
      this.fireClose();
    }

    close() {
      this.closeCalls++;
      this.fireClose();
    }

    destroy() {
      this.destroyed = true;
    }

    private fireClose() {
      const event = new Event('close');
      this.listeners.get('close')?.forEach(fn => fn(event));
    }

    oncancel: ((event: Event) => void) | null = null;
    onclose: ((event: Event) => void) | null = null;
  }

  // A window-like object that exposes CloseWatcher and basic event listening
  const eventTarget = new EventTarget();
  const win = {
    CloseWatcher: FakeCloseWatcher,
    addEventListener: eventTarget.addEventListener.bind(eventTarget),
    removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
    dispatchEvent: eventTarget.dispatchEvent.bind(eventTarget),
  } as unknown as Window;

  return { win, instances };
}

/** A window-like object WITHOUT CloseWatcher (fallback path). */
function createFallbackWindow() {
  const eventTarget = new EventTarget();
  const win = {
    addEventListener: eventTarget.addEventListener.bind(eventTarget),
    removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
    dispatchEvent: eventTarget.dispatchEvent.bind(eventTarget),
  } as unknown as Window;

  const dispatchKey = (key: string) =>
    win.dispatchEvent(new KeyboardEvent('keydown', { key }));

  return { win, dispatchKey };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe(useCloseWatcher, () => {
  it('reports support when CloseWatcher exists on window', () => {
    const { win } = createCloseWatcherStub();
    const scope = effectScope();
    let cw: ReturnType<typeof useCloseWatcher>;
    scope.run(() => {
      cw = useCloseWatcher({ window: win });
    });
    expect(cw!.isSupported.value).toBeTruthy();
    scope.stop();
  });

  it('reports unsupported when CloseWatcher is absent', () => {
    const { win } = createFallbackWindow();
    const scope = effectScope();
    let cw: ReturnType<typeof useCloseWatcher>;
    scope.run(() => {
      cw = useCloseWatcher({ window: win });
    });
    expect(cw!.isSupported.value).toBeFalsy();
    scope.stop();
  });

  it('is a safe no-op when there is no window (SSR)', () => {
    // Force the SSR branch with an explicit falsy (non-undefined) window so the
    // default-parameter fallback to `defaultWindow` does not kick in: only
    // `undefined` triggers a parameter default, `null` survives the destructure.
    const scope = effectScope();
    let cw: ReturnType<typeof useCloseWatcher>;
    scope.run(() => {
      cw = useCloseWatcher({ window: null as unknown as Window });
    });

    expect(cw!.isSupported.value).toBeFalsy();

    const handler = vi.fn();
    const stop = cw!.onClose(handler);
    expect(() => cw!.close()).not.toThrow();
    expect(handler).not.toHaveBeenCalled();
    expect(() => stop()).not.toThrow();
    expect(() => cw!.destroy()).not.toThrow();
    scope.stop();
  });

  describe('native CloseWatcher path', () => {
    it('fires registered handler when close() is requested', () => {
      const { win, instances } = createCloseWatcherStub();
      const scope = effectScope();
      let cw: ReturnType<typeof useCloseWatcher>;
      scope.run(() => {
        cw = useCloseWatcher({ window: win });
      });

      const handler = vi.fn();
      cw!.onClose(handler);
      expect(instances).toHaveLength(1);

      cw!.close();
      expect(instances[0]!.requestCloseCalls).toBe(1);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0]![0]).toBeInstanceOf(Event);
      scope.stop();
    });

    it('fires handler when the native close event occurs (Esc / back)', () => {
      const { win, instances } = createCloseWatcherStub();
      const scope = effectScope();
      let cw: ReturnType<typeof useCloseWatcher>;
      scope.run(() => {
        cw = useCloseWatcher({ window: win });
      });

      const handler = vi.fn();
      cw!.onClose(handler);

      // Simulate the platform firing the close event (e.g. Esc / Android back)
      instances[0]!.close();
      expect(handler).toHaveBeenCalledTimes(1);
      scope.stop();
    });

    it('recreates the watcher after a close so it keeps working', () => {
      const { win, instances } = createCloseWatcherStub();
      const scope = effectScope();
      let cw: ReturnType<typeof useCloseWatcher>;
      scope.run(() => {
        cw = useCloseWatcher({ window: win });
      });

      const handler = vi.fn();
      cw!.onClose(handler);
      expect(instances).toHaveLength(1);

      cw!.close();
      // a fresh watcher is created after the close fired
      expect(instances).toHaveLength(2);

      cw!.close();
      expect(handler).toHaveBeenCalledTimes(2);
      scope.stop();
    });

    it('fires all registered handlers with a single watcher', () => {
      const { win, instances } = createCloseWatcherStub();
      const scope = effectScope();
      let cw: ReturnType<typeof useCloseWatcher>;
      scope.run(() => {
        cw = useCloseWatcher({ window: win });
      });

      const a = vi.fn();
      const b = vi.fn();
      cw!.onClose(a);
      cw!.onClose(b);
      // both handlers share one native watcher
      expect(instances).toHaveLength(1);

      cw!.close();
      expect(a).toHaveBeenCalledTimes(1);
      expect(b).toHaveBeenCalledTimes(1);
      scope.stop();
    });

    it('stop handle removes only its own handler', () => {
      const { win } = createCloseWatcherStub();
      const scope = effectScope();
      let cw: ReturnType<typeof useCloseWatcher>;
      scope.run(() => {
        cw = useCloseWatcher({ window: win });
      });

      const a = vi.fn();
      const b = vi.fn();
      const stopA = cw!.onClose(a);
      cw!.onClose(b);

      stopA();
      cw!.close();
      expect(a).not.toHaveBeenCalled();
      expect(b).toHaveBeenCalledTimes(1);
      scope.stop();
    });

    it('destroy() tears down the watcher and clears handlers', () => {
      const { win, instances } = createCloseWatcherStub();
      const scope = effectScope();
      let cw: ReturnType<typeof useCloseWatcher>;
      scope.run(() => {
        cw = useCloseWatcher({ window: win });
      });

      const handler = vi.fn();
      cw!.onClose(handler);
      cw!.destroy();

      expect(instances[0]!.destroyed).toBeTruthy();
      cw!.close();
      expect(handler).not.toHaveBeenCalled();
      scope.stop();
    });

    it('survives a handler calling destroy() during dispatch', () => {
      const { win } = createCloseWatcherStub();
      const scope = effectScope();
      let cw: ReturnType<typeof useCloseWatcher>;
      scope.run(() => {
        cw = useCloseWatcher({ window: win });
      });

      const other = vi.fn();
      cw!.onClose(() => cw!.destroy());
      cw!.onClose(other);

      // dispatch must not throw even though destroy() clears the set mid-loop
      expect(() => cw!.close()).not.toThrow();
      // the snapshot means the second handler still runs for this dispatch
      expect(other).toHaveBeenCalledTimes(1);
      scope.stop();
    });
  });

  describe('fallback (keydown) path', () => {
    it('fires handler on Escape keydown', () => {
      const { win, dispatchKey } = createFallbackWindow();
      const scope = effectScope();
      let cw: ReturnType<typeof useCloseWatcher>;
      scope.run(() => {
        cw = useCloseWatcher({ window: win });
      });

      const handler = vi.fn();
      cw!.onClose(handler);

      dispatchKey('Escape');
      expect(handler).toHaveBeenCalledTimes(1);
      scope.stop();
    });

    it('ignores non-Escape keys', () => {
      const { win, dispatchKey } = createFallbackWindow();
      const scope = effectScope();
      let cw: ReturnType<typeof useCloseWatcher>;
      scope.run(() => {
        cw = useCloseWatcher({ window: win });
      });

      const handler = vi.fn();
      cw!.onClose(handler);

      dispatchKey('Enter');
      expect(handler).not.toHaveBeenCalled();
      scope.stop();
    });

    it('close() synthesizes a close event in the fallback path', () => {
      const { win } = createFallbackWindow();
      const scope = effectScope();
      let cw: ReturnType<typeof useCloseWatcher>;
      scope.run(() => {
        cw = useCloseWatcher({ window: win });
      });

      const handler = vi.fn();
      cw!.onClose(handler);

      cw!.close();
      expect(handler).toHaveBeenCalledTimes(1);
      scope.stop();
    });

    it('destroy() removes the keydown listener', () => {
      const { win, dispatchKey } = createFallbackWindow();
      const scope = effectScope();
      let cw: ReturnType<typeof useCloseWatcher>;
      scope.run(() => {
        cw = useCloseWatcher({ window: win });
      });

      const handler = vi.fn();
      cw!.onClose(handler);
      cw!.destroy();

      dispatchKey('Escape');
      expect(handler).not.toHaveBeenCalled();
      scope.stop();
    });
  });

  it('disposes when the effect scope stops', () => {
    const { win, instances } = createCloseWatcherStub();
    const scope = effectScope();
    let cw: ReturnType<typeof useCloseWatcher>;
    scope.run(() => {
      cw = useCloseWatcher({ window: win });
    });

    cw!.onClose(vi.fn());
    expect(instances[0]!.destroyed).toBeFalsy();

    scope.stop();
    expect(instances[0]!.destroyed).toBeTruthy();
  });
});
