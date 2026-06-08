import { shallowRef, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, Ref, ShallowRef } from 'vue';
import { noop } from '@robonen/stdlib';
import { defaultNavigator } from '@/types';
import type { ConfigurableNavigator } from '@/types';
import { useSupported } from '@/composables/utilities/useSupported';
import { useEventListener } from '@/composables/browser/useEventListener';

export interface UseDisplayMediaOptions extends ConfigurableNavigator {
  /**
   * Whether the stream should be active. Toggling this reactively starts or
   * stops the screen share.
   *
   * @default false
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Video media constraints for the captured display surface.
   *
   * @default true
   */
  video?: boolean | MediaTrackConstraints;

  /**
   * Audio media constraints for the captured display surface.
   *
   * @default false
   */
  audio?: boolean | MediaTrackConstraints;

  /**
   * Called when `getDisplayMedia` rejects (e.g. the user cancels the picker).
   * Defaults to a no-op — we never log to the console.
   *
   * @default noop
   */
  onError?: (error: unknown) => void;
}

export interface UseDisplayMediaReturn {
  /**
   * Whether `navigator.mediaDevices.getDisplayMedia` is available.
   */
  isSupported: Readonly<Ref<boolean>>;

  /**
   * The active `MediaStream`, or `undefined` when not sharing.
   */
  stream: ShallowRef<MediaStream | undefined>;

  /**
   * Request the screen-share picker and start the stream. Resolves to the
   * stream (or `undefined` when unsupported / cancelled). Concurrent calls are
   * deduped and an already-running stream is returned as-is.
   */
  start: () => Promise<MediaStream | undefined>;

  /**
   * Stop every track and clear the stream.
   */
  stop: () => void;

  /**
   * Two-way switch mirroring the live state of the stream. Set it to `true` to
   * start sharing and `false` to stop.
   */
  enabled: ShallowRef<boolean>;
}

/**
 * @name useDisplayMedia
 * @category Media
 * @description Reactive `mediaDevices.getDisplayMedia` (screen share) streaming.
 *
 * @param {UseDisplayMediaOptions} [options={}] Options
 * @returns {UseDisplayMediaReturn} `stream`, `start`, `stop`, `enabled` and `isSupported`
 *
 * @example
 * const { stream, enabled, isSupported } = useDisplayMedia();
 * videoEl.srcObject = stream.value ?? null;
 * enabled.value = true; // prompts the screen-share picker
 *
 * @example
 * const { start, stop } = useDisplayMedia({ audio: true });
 * await start();
 *
 * @since 0.0.15
 */
export function useDisplayMedia(options: UseDisplayMediaOptions = {}): UseDisplayMediaReturn {
  const {
    navigator = defaultNavigator,
    video = true,
    audio = false,
    onError = noop,
  } = options;

  const enabled = shallowRef(toValue(options.enabled ?? false));
  const stream = shallowRef<MediaStream | undefined>();

  const isSupported = useSupported(() =>
    !!navigator && !!navigator.mediaDevices && !!navigator.mediaDevices.getDisplayMedia);

  // Constraints never change for the lifetime of the composable, so build the
  // object once rather than per start() call.
  const constraints: MediaStreamConstraints = { audio, video };

  // Dedupe overlapping start() calls — a single picker prompt is enough.
  let startPromise: Promise<MediaStream | undefined> | undefined;

  function release(): void {
    if (!stream.value)
      return;

    stream.value.getTracks().forEach(track => track.stop());
    stream.value = undefined;
  }

  async function open(): Promise<MediaStream | undefined> {
    if (!isSupported.value || stream.value)
      return stream.value;

    if (startPromise)
      return startPromise;

    startPromise = navigator!.mediaDevices.getDisplayMedia(constraints)
      .then((media) => {
        stream.value = media;
        // The user can stop sharing from the browser UI; mirror that here.
        media.getTracks().forEach(track =>
          useEventListener(track, 'ended', stop, { passive: true }));
        return media;
      })
      .catch((error) => {
        onError(error);
        return undefined;
      })
      .finally(() => {
        startPromise = undefined;
      });

    return startPromise;
  }

  function stop(): void {
    release();
    enabled.value = false;
  }

  async function start(): Promise<MediaStream | undefined> {
    const media = await open();
    if (media)
      enabled.value = true;

    return media;
  }

  watch(enabled, (value) => {
    if (value)
      void open();
    else
      release();
  }, { immediate: true });

  return {
    isSupported,
    stream,
    start,
    stop,
    enabled,
  };
}
