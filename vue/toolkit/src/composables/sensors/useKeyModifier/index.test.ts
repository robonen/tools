import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { useKeyModifier } from '.';
import type { KeyModifier } from '.';

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Dispatch an event on `document` whose `getModifierState(modifier)` resolves to `active`.
 * jsdom does not track real modifier state, so we stub the method per event.
 */
function dispatchModifier(
  type: string,
  active: boolean,
  modifier: KeyModifier = 'Shift',
  withGetModifierState = true,
) {
  const event = new Event(type) as Event & {
    getModifierState?: (key: string) => boolean;
  };

  if (withGetModifierState) {
    event.getModifierState = (key: string) => (key === modifier ? active : false);
  }

  document.dispatchEvent(event);
}

describe(useKeyModifier, () => {
  it('defaults to null until the first matching event', () => {
    const scope = effectScope();
    let state: ReturnType<typeof useKeyModifier>;
    scope.run(() => {
      state = useKeyModifier('Shift');
    });

    expect(state!.value).toBeNull();
    scope.stop();
  });

  it('respects a provided initial value', () => {
    const scope = effectScope();
    let state: ReturnType<typeof useKeyModifier<boolean>>;
    scope.run(() => {
      state = useKeyModifier('Shift', { initial: false });
    });

    expect(state!.value).toBeFalsy();
    scope.stop();
  });

  it('updates when a default event reports the modifier active', async () => {
    const scope = effectScope();
    let state: ReturnType<typeof useKeyModifier>;
    scope.run(() => {
      state = useKeyModifier('Shift');
    });

    dispatchModifier('keydown', true, 'Shift');
    await nextTick();
    expect(state!.value).toBeTruthy();

    dispatchModifier('keyup', false, 'Shift');
    await nextTick();
    expect(state!.value).toBeFalsy();

    scope.stop();
  });

  it('tracks each modifier independently', async () => {
    const scope = effectScope();
    let caps: ReturnType<typeof useKeyModifier>;
    scope.run(() => {
      caps = useKeyModifier('CapsLock');
    });

    dispatchModifier('keydown', true, 'CapsLock');
    await nextTick();
    expect(caps!.value).toBeTruthy();

    // An event reporting a different modifier (Shift) must not flip CapsLock
    dispatchModifier('keydown', true, 'Shift');
    await nextTick();
    expect(caps!.value).toBeFalsy();

    scope.stop();
  });

  it('only listens on the configured events', async () => {
    const scope = effectScope();
    let state: ReturnType<typeof useKeyModifier>;
    scope.run(() => {
      state = useKeyModifier('Shift', { events: ['keydown'] });
    });

    dispatchModifier('keyup', true, 'Shift');
    await nextTick();
    expect(state!.value).toBeNull();

    dispatchModifier('keydown', true, 'Shift');
    await nextTick();
    expect(state!.value).toBeTruthy();

    scope.stop();
  });

  it('ignores events without getModifierState', async () => {
    const scope = effectScope();
    let state: ReturnType<typeof useKeyModifier>;
    scope.run(() => {
      state = useKeyModifier('Shift', { initial: false });
    });

    dispatchModifier('keydown', true, 'Shift', false);
    await nextTick();
    expect(state!.value).toBeFalsy();

    scope.stop();
  });

  it('removes its listeners when the scope is disposed', async () => {
    const scope = effectScope();
    let state: ReturnType<typeof useKeyModifier>;
    scope.run(() => {
      state = useKeyModifier('Shift');
    });

    scope.stop();

    dispatchModifier('keydown', true, 'Shift');
    await nextTick();
    expect(state!.value).toBeNull();
  });

  it('accepts a custom document and listens on it', async () => {
    const listeners = new Map<string, Set<EventListener>>();
    const fakeDocument = {
      addEventListener(type: string, listener: EventListener) {
        if (!listeners.has(type))
          listeners.set(type, new Set());
        listeners.get(type)!.add(listener);
      },
      removeEventListener(type: string, listener: EventListener) {
        listeners.get(type)?.delete(listener);
      },
    } as unknown as Document;

    const scope = effectScope();
    let state: ReturnType<typeof useKeyModifier>;
    scope.run(() => {
      state = useKeyModifier('Meta', { document: fakeDocument });
    });

    const event = { getModifierState: (k: string) => k === 'Meta' } as unknown as KeyboardEvent;
    listeners.get('keydown')!.forEach(fn => fn(event));
    await nextTick();
    expect(state!.value).toBeTruthy();

    scope.stop();
  });

  it('is a no-op under SSR (no document)', () => {
    const scope = effectScope();
    let state: ReturnType<typeof useKeyModifier>;
    scope.run(() => {
      state = useKeyModifier('Shift', { document: undefined, initial: false });
    });

    expect(state!.value).toBeFalsy();
    scope.stop();
  });
});
