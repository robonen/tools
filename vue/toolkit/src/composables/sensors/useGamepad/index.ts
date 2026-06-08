import type { VoidFunction } from '@robonen/stdlib';
import { PubSub } from '@robonen/stdlib';
import { computed, ref } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import { defaultNavigator, defaultWindow } from '@/types';
import type { ConfigurableNavigator, ConfigurableWindow, ResumableActions } from '@/types';
import { useSupported } from '@/composables/utilities/useSupported';
import { useRafFn } from '@/composables/animation/useRafFn';
import { useEventListener } from '@/composables/browser/useEventListener';
import { tryOnMounted } from '@/composables/lifecycle/tryOnMounted';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export interface UseGamepadOptions extends ConfigurableNavigator, ConfigurableWindow {}

/**
 * Subscribe to a gamepad lifecycle event. Returns a stop function that
 * removes the listener; it is also auto-removed when the owning scope is disposed.
 */
export type GamepadEventHookOn = (listener: (index: number) => void) => VoidFunction;

export interface UseGamepadReturn extends ResumableActions {
  /**
   * Whether the Gamepad API is supported in the current environment
   */
  isSupported: ComputedRef<boolean>;

  /**
   * The list of currently connected gamepads, kept in sync each animation frame
   */
  gamepads: Ref<Gamepad[]>;

  /**
   * Subscribe to gamepad connection. The listener receives the gamepad index.
   */
  onConnected: GamepadEventHookOn;

  /**
   * Subscribe to gamepad disconnection. The listener receives the gamepad index.
   */
  onDisconnected: GamepadEventHookOn;

  /**
   * Whether the polling loop is currently active
   */
  isActive: Readonly<Ref<boolean>>;
}

export interface MappedGamepadButton {
  /**
   * The single (top/bottom/left/right) button under this slot
   */
  button: GamepadButton;
}

export interface MappedGamepadStick {
  /**
   * Horizontal axis value, `-1` (left) to `1` (right)
   */
  horizontal: number;

  /**
   * Vertical axis value, `-1` (up) to `1` (down)
   */
  vertical: number;

  /**
   * The stick's click button (e.g. L3 / R3)
   */
  button: GamepadButton;
}

export interface MappedXbox360Controller {
  buttons: {
    a: GamepadButton;
    b: GamepadButton;
    x: GamepadButton;
    y: GamepadButton;
  };
  bumper: {
    left: GamepadButton;
    right: GamepadButton;
  };
  triggers: {
    left: GamepadButton;
    right: GamepadButton;
  };
  stick: {
    left: MappedGamepadStick;
    right: MappedGamepadStick;
  };
  dpad: {
    up: GamepadButton;
    down: GamepadButton;
    left: GamepadButton;
    right: GamepadButton;
  };
  back: GamepadButton;
  start: GamepadButton;
}

/**
 * @name mapGamepadToXbox360Controller
 * @category Sensors
 * @description Maps a raw {@link Gamepad} into a named Xbox 360 controller layout
 * (buttons, bumpers, triggers, sticks, dpad). Returns `null` while no gamepad is present.
 *
 * @param {Ref<Gamepad | undefined>} gamepad The reactive gamepad to map
 * @returns {ComputedRef<MappedXbox360Controller | null>} The mapped controller, or `null`
 *
 * @example
 * const { gamepads } = useGamepad();
 * const gamepad = computed(() => gamepads.value[0]);
 * const controller = mapGamepadToXbox360Controller(gamepad);
 * watchEffect(() => {
 *   if (controller.value?.buttons.a.pressed) console.log('A pressed');
 * });
 *
 * @since 0.0.15
 */
export function mapGamepadToXbox360Controller(
  gamepad: Ref<Gamepad | undefined>,
): ComputedRef<MappedXbox360Controller | null> {
  return computed(() => {
    const pad = gamepad.value;

    if (!pad)
      return null;

    const { buttons, axes } = pad;

    // Indexed access is `T | undefined` under noUncheckedIndexedAccess; the Xbox
    // layout assumes the standard mapping, so resolve each slot non-null.
    const btn = (index: number): GamepadButton => buttons[index]!;
    const axis = (index: number): number => axes[index]!;

    return {
      buttons: {
        a: btn(0),
        b: btn(1),
        x: btn(2),
        y: btn(3),
      },
      bumper: {
        left: btn(4),
        right: btn(5),
      },
      triggers: {
        left: btn(6),
        right: btn(7),
      },
      stick: {
        left: {
          horizontal: axis(0),
          vertical: axis(1),
          button: btn(10),
        },
        right: {
          horizontal: axis(2),
          vertical: axis(3),
          button: btn(11),
        },
      },
      dpad: {
        up: btn(12),
        down: btn(13),
        left: btn(14),
        right: btn(15),
      },
      back: btn(8),
      start: btn(9),
    };
  });
}

const CONNECTED = 'connected';
const DISCONNECTED = 'disconnected';

interface GamepadEvents {
  connected: (index: number) => void;
  disconnected: (index: number) => void;
}

/**
 * Build a deep, plain snapshot of a live `Gamepad`. The native object is a
 * live view that mutates between frames, so we copy axes and button state
 * into fresh structures to keep Vue reactivity reliable.
 */
function snapshotGamepad(gamepad: Gamepad): Gamepad {
  return {
    id: gamepad.id,
    index: gamepad.index,
    connected: gamepad.connected,
    mapping: gamepad.mapping,
    timestamp: gamepad.timestamp,
    vibrationActuator: gamepad.vibrationActuator,
    hapticActuators: gamepad.hapticActuators,
    axes: gamepad.axes.slice(),
    buttons: gamepad.buttons.map(button => ({
      pressed: button.pressed,
      touched: button.touched,
      value: button.value,
    })),
  } as Gamepad;
}

/**
 * @name useGamepad
 * @category Sensors
 * @description Reactive wrapper around the Gamepad API. Tracks connected gamepads,
 * emits connection/disconnection events, and polls live button/axis state on every
 * animation frame. The polling loop stays paused while no gamepad is connected and
 * resumes automatically on the first connection, so there is zero idle work. SSR-safe.
 *
 * @param {UseGamepadOptions} [options] Configuration options
 * @param {Navigator} [options.navigator=defaultNavigator] Custom navigator (testing/iframes)
 * @param {Window} [options.window=defaultWindow] Custom window for the polling loop and events
 * @returns {UseGamepadReturn} Reactive gamepad state, lifecycle hooks, and loop controls
 *
 * @example
 * const { gamepads, isSupported, onConnected, onDisconnected } = useGamepad();
 *
 * onConnected((index) => console.log(`gamepad ${index} connected`));
 * onDisconnected((index) => console.log(`gamepad ${index} disconnected`));
 *
 * @example
 * // Map the first gamepad to an Xbox 360 layout
 * const { gamepads } = useGamepad();
 * const gamepad = computed(() => gamepads.value[0]);
 * const controller = mapGamepadToXbox360Controller(gamepad);
 *
 * @since 0.0.15
 */
export function useGamepad(options: UseGamepadOptions = {}): UseGamepadReturn {
  const {
    navigator = defaultNavigator,
    window = defaultWindow,
  } = options;

  const isSupported = useSupported(() => Boolean(navigator) && 'getGamepads' in navigator!);
  const gamepads = ref<Gamepad[]>([]);

  // PubSub's `Record<string, …>` constraint rejects interfaces; a mapped type satisfies it.
  const hub = new PubSub<{ [K in keyof GamepadEvents]: GamepadEvents[K] }>();

  function makeHook(event: keyof GamepadEvents): GamepadEventHookOn {
    return (listener) => {
      hub.on(event, listener);

      const stop = (): void => void hub.off(event, listener);

      tryOnScopeDispose(stop);

      return stop;
    };
  }

  // Pull the current device list once; reused by polling, connect and the initial scan.
  function readGamepads(): Array<Gamepad | null> {
    return navigator?.getGamepads() ?? [];
  }

  function updateGamepadState(): void {
    const devices = readGamepads();

    for (const device of devices) {
      if (device && gamepads.value[device.index])
        gamepads.value[device.index] = snapshotGamepad(device);
    }
  }

  const { isActive, pause, resume, toggle } = useRafFn(updateGamepadState, {
    immediate: false,
    window,
  });

  function onGamepadConnected(gamepad: Gamepad): void {
    // O(index) direct slot check beats a linear `.some()` scan on every connect.
    const existing = gamepads.value[gamepad.index];

    if (!existing || existing.index !== gamepad.index) {
      gamepads.value[gamepad.index] = snapshotGamepad(gamepad);
      hub.emit(CONNECTED, gamepad.index);
    }

    resume();
  }

  function onGamepadDisconnected(gamepad: Gamepad): void {
    gamepads.value = gamepads.value.filter(pad => pad.index !== gamepad.index);
    hub.emit(DISCONNECTED, gamepad.index);

    // Nothing left to poll — stop the loop to avoid idle frames.
    if (!gamepads.value.some(Boolean))
      pause();
  }

  const listenerOptions = { passive: true };

  useEventListener(window, 'gamepadconnected', (event: GamepadEvent) => onGamepadConnected(event.gamepad), listenerOptions);
  useEventListener(window, 'gamepaddisconnected', (event: GamepadEvent) => onGamepadDisconnected(event.gamepad), listenerOptions);

  tryOnMounted(() => {
    if (!isSupported.value)
      return;

    const devices = readGamepads();

    for (const device of devices) {
      if (device)
        onGamepadConnected(device);
    }
  });

  return {
    isSupported,
    gamepads,
    onConnected: makeHook(CONNECTED),
    onDisconnected: makeHook(DISCONNECTED),
    isActive,
    pause,
    resume,
    toggle,
  };
}
