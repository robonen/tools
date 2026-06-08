import { ref as deepRef, shallowReadonly, shallowRef, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, Ref, ShallowRef } from 'vue';
import { noop } from '@robonen/stdlib';
import { defaultNavigator } from '@/types';
import type { ConfigurableNavigator } from '@/types';
import { useSupported } from '@/composables/utilities/useSupported';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export interface UseUserMediaOptions extends ConfigurableNavigator {
  /**
   * Whether the stream should start immediately and stay open.
   *
   * @default false
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Recreate the stream automatically when `constraints` change while the
   * stream is enabled. Disable to apply constraint changes manually via
   * `restart()`.
   *
   * @default true
   */
  autoSwitch?: MaybeRefOrGetter<boolean>;

  /**
   * `MediaStreamConstraints` applied to the requested `MediaStream`.
   *
   * @default {}
   */
  constraints?: MaybeRefOrGetter<MediaStreamConstraints>;

  /**
   * Called whenever `getUserMedia()` rejects (e.g. permission denied, device
   * busy). Receives the thrown error so failures can be surfaced without
   * inspecting them through a watcher.
   *
   * @default () => {}
   */
  onError?: (error: unknown) => void;
}

export interface UseUserMediaReturn {
  /**
   * Whether `navigator.mediaDevices.getUserMedia` is available.
   */
  isSupported: Readonly<Ref<boolean>>;

  /**
   * The active `MediaStream`, or `undefined` while stopped.
   */
  stream: Readonly<ShallowRef<MediaStream | undefined>>;

  /**
   * Request the stream and mark it as enabled. Resolves with the resulting
   * stream, or `undefined` when unsupported or already running.
   */
  start: () => Promise<MediaStream | undefined>;

  /**
   * Stop all tracks, release the stream, and mark it as disabled.
   */
  stop: () => void;

  /**
   * Stop the current stream and acquire a fresh one with the latest
   * constraints.
   */
  restart: () => Promise<MediaStream | undefined>;

  /**
   * The constraints applied to the next acquisition. Mutating or replacing
   * this re-acquires the stream while enabled and `autoSwitch` is `true`.
   */
  constraints: Ref<MediaStreamConstraints | undefined>;

  /**
   * Whether the stream is currently enabled. Toggle to start/stop.
   */
  enabled: ShallowRef<boolean>;

  /**
   * Whether constraint changes auto-restart the stream while enabled.
   */
  autoSwitch: ShallowRef<boolean>;
}

/**
 * @name useUserMedia
 * @category Media
 * @description Reactive `navigator.mediaDevices.getUserMedia` streaming. Acquires
 * a `MediaStream` for camera/microphone capture, keeps it in sync with reactive
 * constraints, and auto-restarts on constraint changes while enabled. SSR-safe
 * and race-safe — overlapping acquisitions never leave an orphaned stream open.
 *
 * @param {UseUserMediaOptions} [options={}] Options
 * @returns {UseUserMediaReturn} Reactive support flag, stream, controls, and reactive `enabled`/`autoSwitch`/`constraints`
 *
 * @example
 * const { stream, enabled } = useUserMedia({ constraints: { video: true } });
 * enabled.value = true; // start capturing
 *
 * @example
 * // Switch cameras reactively — the stream restarts automatically
 * const { constraints, start } = useUserMedia();
 * await start();
 * constraints.value = { video: { deviceId: nextCameraId } };
 *
 * @since 0.0.15
 */
export function useUserMedia(options: UseUserMediaOptions = {}): UseUserMediaReturn {
  const {
    navigator = defaultNavigator,
    onError = noop,
  } = options;

  const enabled = shallowRef(toValue(options.enabled) ?? false);
  const autoSwitch = shallowRef(toValue(options.autoSwitch) ?? true);
  const constraints = deepRef<MediaStreamConstraints | undefined>(toValue(options.constraints));

  const isSupported = useSupported(() => navigator?.mediaDevices?.getUserMedia);

  const stream = shallowRef<MediaStream | undefined>();

  // Monotonic token guarding against stale async acquisitions: getUserMedia is
  // async, so a rapid stop()/restart() could resolve out of order and overwrite
  // the current stream with an orphaned one. Only the latest request wins.
  let acquireToken = 0;

  function getDeviceOptions(type: 'video' | 'audio'): MediaStreamConstraints[typeof type] {
    const value = constraints.value;
    if (!value)
      return false;

    return value[type] ?? false;
  }

  function _stop(): void {
    const tracks = stream.value?.getTracks();
    if (tracks)
      for (const track of tracks) track.stop();

    stream.value = undefined;
  }

  async function _start(): Promise<MediaStream | undefined> {
    if (!isSupported.value || stream.value)
      return stream.value;

    const token = ++acquireToken;

    try {
      const media = await navigator!.mediaDevices.getUserMedia({
        video: getDeviceOptions('video'),
        audio: getDeviceOptions('audio'),
      });

      // A newer request (or a stop) superseded this one while awaiting — discard
      // the now-orphaned stream instead of leaking the device handle.
      if (token !== acquireToken) {
        for (const track of media.getTracks()) track.stop();
        return stream.value;
      }

      stream.value = media;
      return media;
    }
    catch (error) {
      onError(error);
      return undefined;
    }
  }

  async function start(): Promise<MediaStream | undefined> {
    await _start();
    if (stream.value)
      enabled.value = true;

    return stream.value;
  }

  function stop(): void {
    // Invalidate any in-flight acquisition before releasing tracks.
    acquireToken++;
    _stop();
    enabled.value = false;
  }

  async function restart(): Promise<MediaStream | undefined> {
    acquireToken++;
    _stop();
    return start();
  }

  watch(enabled, (value) => {
    if (value)
      void _start();
    else _stop();
  }, { immediate: true });

  watch(constraints, () => {
    if (autoSwitch.value && stream.value)
      void restart();
  }, { deep: true });

  tryOnScopeDispose(stop);

  return {
    isSupported,
    stream: shallowReadonly(stream),
    start,
    stop,
    restart,
    constraints,
    enabled,
    autoSwitch,
  };
}
