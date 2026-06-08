import { describe, expect, it, vi } from 'vitest';
import { computed, effectScope } from 'vue';
import type { UseGamepadReturn } from '.';
import { mapGamepadToXbox360Controller, useGamepad } from '.';

function makeButton(value = 0, pressed = false): GamepadButton {
  return { value, pressed, touched: pressed } as GamepadButton;
}

function makeGamepad(index: number, overrides: Partial<Gamepad> = {}): Gamepad {
  return {
    id: `pad-${index}`,
    index,
    connected: true,
    mapping: 'standard',
    timestamp: 0,
    vibrationActuator: null,
    hapticActuators: [],
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 16 }, () => makeButton()),
    ...overrides,
  } as Gamepad;
}

function stubNavigator(initial: Array<Gamepad | null> = []) {
  let pads = initial;
  const getGamepads = vi.fn(() => pads);

  return {
    navigator: { getGamepads } as unknown as Navigator,
    getGamepads,
    setPads: (next: Array<Gamepad | null>) => { pads = next; },
  };
}

function stubWindow() {
  const handlers = new Map<string, Set<EventListener>>();
  let rafCallback: FrameRequestCallback | null = null;
  let rafId = 0;

  const window = {
    addEventListener: vi.fn((event: string, listener: EventListener) => {
      const set = handlers.get(event) ?? new Set();
      set.add(listener);
      handlers.set(event, set);
    }),
    removeEventListener: vi.fn((event: string, listener: EventListener) => {
      handlers.get(event)?.delete(listener);
    }),
    requestAnimationFrame: vi.fn((cb: FrameRequestCallback) => {
      rafCallback = cb;
      return ++rafId;
    }),
    cancelAnimationFrame: vi.fn(() => {
      rafCallback = null;
    }),
  } as unknown as Window;

  return {
    window,
    emit: (event: string, gamepad: Gamepad) => {
      const set = handlers.get(event);
      if (set)
        for (const listener of set) listener({ gamepad } as unknown as Event);
    },
    hasListener: (event: string) => (handlers.get(event)?.size ?? 0) > 0,
    tick: () => { rafCallback?.(performance.now()); },
    isRafScheduled: () => rafCallback !== null,
  };
}

describe(useGamepad, () => {
  it('reports unsupported when getGamepads is missing', () => {
    const scope = effectScope();
    let result: UseGamepadReturn;
    scope.run(() => {
      result = useGamepad({ navigator: {} as Navigator, window: stubWindow().window });
    });

    expect(result!.isSupported.value).toBeFalsy();
    expect(result!.gamepads.value).toEqual([]);
    scope.stop();
  });

  it('handles the SSR path (no navigator/window) gracefully', () => {
    const scope = effectScope();
    let result: UseGamepadReturn;
    scope.run(() => {
      result = useGamepad({ navigator: undefined, window: undefined });
    });

    expect(result!.isSupported.value).toBeFalsy();
    expect(result!.gamepads.value).toEqual([]);
    expect(() => result!.resume()).not.toThrow();
    scope.stop();
  });

  it('reports supported when getGamepads exists', () => {
    const { navigator } = stubNavigator();
    const { window } = stubWindow();
    const scope = effectScope();
    let result: UseGamepadReturn;
    scope.run(() => {
      result = useGamepad({ navigator, window });
    });

    expect(result!.isSupported.value).toBeTruthy();
    scope.stop();
  });

  it('registers passive connection/disconnection listeners', () => {
    const { navigator } = stubNavigator();
    const win = stubWindow();
    const scope = effectScope();
    scope.run(() => {
      useGamepad({ navigator, window: win.window });
    });

    expect(win.hasListener('gamepadconnected')).toBeTruthy();
    expect(win.hasListener('gamepaddisconnected')).toBeTruthy();
    expect(win.window.addEventListener).toHaveBeenCalledWith(
      'gamepadconnected',
      expect.any(Function),
      { passive: true },
    );
    scope.stop();
  });

  it('adds a gamepad and fires onConnected when one connects', () => {
    const { navigator } = stubNavigator();
    const win = stubWindow();
    const scope = effectScope();
    const connected = vi.fn();
    let result: UseGamepadReturn;
    scope.run(() => {
      result = useGamepad({ navigator, window: win.window });
      result.onConnected(connected);
    });

    const pad = makeGamepad(0);
    win.emit('gamepadconnected', pad);

    expect(connected).toHaveBeenCalledWith(0);
    expect(result!.gamepads.value).toHaveLength(1);
    expect(result!.gamepads.value[0]!.id).toBe('pad-0');
    expect(win.isRafScheduled()).toBeTruthy();
    scope.stop();
  });

  it('does not double-add the same gamepad index', () => {
    const { navigator } = stubNavigator();
    const win = stubWindow();
    const scope = effectScope();
    const connected = vi.fn();
    let result: UseGamepadReturn;
    scope.run(() => {
      result = useGamepad({ navigator, window: win.window });
      result.onConnected(connected);
    });

    win.emit('gamepadconnected', makeGamepad(0));
    win.emit('gamepadconnected', makeGamepad(0));

    expect(connected).toHaveBeenCalledTimes(1);
    expect(result!.gamepads.value.filter(Boolean)).toHaveLength(1);
    scope.stop();
  });

  it('removes a gamepad and fires onDisconnected when one disconnects', () => {
    const { navigator } = stubNavigator();
    const win = stubWindow();
    const scope = effectScope();
    const disconnected = vi.fn();
    let result: UseGamepadReturn;
    scope.run(() => {
      result = useGamepad({ navigator, window: win.window });
      result.onDisconnected(disconnected);
    });

    const pad = makeGamepad(0);
    win.emit('gamepadconnected', pad);
    win.emit('gamepaddisconnected', pad);

    expect(disconnected).toHaveBeenCalledWith(0);
    expect(result!.gamepads.value).toHaveLength(0);
    scope.stop();
  });

  it('polls live button/axis state on every animation frame', () => {
    const stub = stubNavigator();
    const win = stubWindow();
    const scope = effectScope();
    let result: UseGamepadReturn;
    scope.run(() => {
      result = useGamepad({ navigator: stub.navigator, window: win.window });
    });

    const pad = makeGamepad(0);
    stub.setPads([pad]);
    win.emit('gamepadconnected', pad);

    // Simulate the live gamepad mutating: press button A and push left stick.
    const moved = makeGamepad(0, {
      buttons: [makeButton(1, true), ...Array.from({ length: 15 }, () => makeButton())],
      axes: [-1, 0, 0, 0],
    });
    stub.setPads([moved]);

    win.tick();

    expect(result!.gamepads.value[0]!.buttons[0]!.pressed).toBeTruthy();
    expect(result!.gamepads.value[0]!.axes[0]).toBe(-1);
    scope.stop();
  });

  it('stops the raf loop when the last gamepad disconnects', () => {
    const stub = stubNavigator();
    const win = stubWindow();
    const scope = effectScope();
    let result: UseGamepadReturn;
    scope.run(() => {
      result = useGamepad({ navigator: stub.navigator, window: win.window });
    });

    const pad = makeGamepad(0);
    stub.setPads([pad]);
    win.emit('gamepadconnected', pad);
    expect(result!.isActive.value).toBeTruthy();

    win.emit('gamepaddisconnected', pad);
    expect(result!.isActive.value).toBeFalsy();
    scope.stop();
  });

  it('onConnected returns a stop function that removes the listener', () => {
    const { navigator } = stubNavigator();
    const win = stubWindow();
    const scope = effectScope();
    const connected = vi.fn();
    let stop: () => void;
    scope.run(() => {
      const result = useGamepad({ navigator, window: win.window });
      stop = result.onConnected(connected);
    });

    stop!();
    win.emit('gamepadconnected', makeGamepad(0));

    expect(connected).not.toHaveBeenCalled();
    scope.stop();
  });

  it('cleans up event listeners when the scope is disposed', () => {
    const { navigator } = stubNavigator();
    const win = stubWindow();
    const scope = effectScope();
    scope.run(() => {
      useGamepad({ navigator, window: win.window });
    });

    expect(win.hasListener('gamepadconnected')).toBeTruthy();
    scope.stop();
    expect(win.hasListener('gamepadconnected')).toBeFalsy();
  });
});

describe(mapGamepadToXbox360Controller, () => {
  it('returns null when no gamepad is present', () => {
    const gamepad = computed<Gamepad | undefined>(() => undefined);
    const mapped = mapGamepadToXbox360Controller(gamepad);
    expect(mapped.value).toBeNull();
  });

  it('maps buttons, bumpers, triggers, sticks and dpad', () => {
    const buttons = Array.from({ length: 16 }, () => makeButton());
    buttons[0] = makeButton(1, true); // A
    buttons[9] = makeButton(1, true); // start
    const pad = makeGamepad(0, {
      buttons,
      axes: [0.5, -0.5, -0.25, 0.75],
    });

    const gamepad = computed<Gamepad | undefined>(() => pad);
    const mapped = mapGamepadToXbox360Controller(gamepad);

    expect(mapped.value!.buttons.a.pressed).toBeTruthy();
    expect(mapped.value!.start.pressed).toBeTruthy();
    expect(mapped.value!.stick.left.horizontal).toBe(0.5);
    expect(mapped.value!.stick.left.vertical).toBe(-0.5);
    expect(mapped.value!.stick.right.horizontal).toBe(-0.25);
    expect(mapped.value!.stick.right.vertical).toBe(0.75);
    expect(mapped.value!.dpad.up).toBe(pad.buttons[12]);
  });
});
