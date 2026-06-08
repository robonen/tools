import { shallowRef, toValue, watch, watchEffect } from 'vue';
import type { MaybeRefOrGetter, ShallowRef } from 'vue';
import { isArray, isString, noop } from '@robonen/stdlib';
import { defaultDocument } from '@/types';
import type { ConfigurableDocument } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';
import { unrefElement } from '@/composables/component/unrefElement';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';
import { watchIgnorable } from '@/composables/watch/watchIgnorable';

/**
 * A media `<source>` descriptor injected as a child `<source>` element.
 *
 * Many of these definitions mirror MDN's HTMLMediaElement documentation.
 */
export interface UseMediaSource {
  /**
   * The source url for the media
   */
  src: string;

  /**
   * The media codec type
   */
  type?: string;

  /**
   * Media query for the resource's intended media
   */
  media?: string;
}

/**
 * A text track `<track>` descriptor injected as a child `<track>` element.
 */
export interface UseMediaTextTrackSource {
  /**
   * Mark the track as enabled unless the user's preferences indicate another is preferred
   */
  default?: boolean;

  /**
   * How the text track is meant to be used. Defaults to `subtitles` when omitted.
   */
  kind: TextTrackKind;

  /**
   * A user-readable title used by the browser when listing tracks
   */
  label: string;

  /**
   * Address of the track (`.vtt` file). Must be same-origin as the document.
   */
  src: string;

  /**
   * Language of the track text data. A valid BCP 47 language tag.
   */
  srcLang: string;
}

/**
 * A reactive snapshot of a single `TextTrack`.
 */
export interface UseMediaTextTrack {
  /**
   * The index of the text track within the element's `textTracks`
   */
  id: number;

  /**
   * The text track label
   */
  label: string;

  /**
   * Language of the track text data (BCP 47)
   */
  language: string;

  /**
   * The display mode of the text track: `disabled`, `hidden`, or `showing`
   */
  mode: TextTrackMode;

  /**
   * How the text track is meant to be used
   */
  kind: TextTrackKind;

  /**
   * The track's in-band metadata track dispatch type
   */
  inBandMetadataTrackDispatchType: string;

  /**
   * A list of text track cues
   */
  cues: TextTrackCueList | null;

  /**
   * A list of active text track cues
   */
  activeCues: TextTrackCueList | null;
}

/**
 * Subscribe to a media event hook; returns an unsubscribe handle.
 */
export type MediaEventHookOn<T = void> = (callback: (param: T) => void) => { off: () => void };

export interface UseMediaControlsOptions extends ConfigurableDocument {
  /**
   * The media source(s). A url string, a `UseMediaSource`, or a list of them.
   * When provided, matching `<source>` children are injected and the element is reloaded.
   */
  src?: MaybeRefOrGetter<string | UseMediaSource | UseMediaSource[]>;

  /**
   * Text tracks to inject as `<track>` children
   */
  tracks?: MaybeRefOrGetter<UseMediaTextTrackSource[]>;

  /**
   * Error handler invoked when `play()` or `exitPictureInPicture()` rejects.
   * Defaults to a no-op (errors are also surfaced via `onPlaybackError`).
   *
   * @default noop
   */
  onError?: (error: unknown) => void;
}

export interface UseMediaControlsReturn {
  /**
   * Current playback position in seconds. Writing seeks the media.
   */
  currentTime: ShallowRef<number>;

  /**
   * Total media duration in seconds (read-only mirror)
   */
  duration: ShallowRef<number>;

  /**
   * Whether the media is buffering and waiting for more data
   */
  waiting: ShallowRef<boolean>;

  /**
   * Whether a seek operation is in progress
   */
  seeking: ShallowRef<boolean>;

  /**
   * Whether playback has reached the end of the media
   */
  ended: ShallowRef<boolean>;

  /**
   * Whether the browser is trying to fetch data but it is not forthcoming
   */
  stalled: ShallowRef<boolean>;

  /**
   * Buffered time ranges as `[start, end]` second pairs
   */
  buffered: ShallowRef<Array<[number, number]>>;

  /**
   * Whether the media is currently playing. Writing toggles play/pause.
   */
  playing: ShallowRef<boolean>;

  /**
   * Playback rate (`1` is normal speed). Writing sets `playbackRate`.
   */
  rate: ShallowRef<number>;

  /**
   * Alias of `rate` for API parity. Writing sets `playbackRate`.
   */
  playbackRate: ShallowRef<number>;

  /**
   * Audio volume in the range `[0, 1]`. Writing sets the element volume.
   */
  volume: ShallowRef<number>;

  /**
   * Whether the media is muted. Writing mutes/unmutes the element.
   */
  muted: ShallowRef<boolean>;

  /**
   * Reactive snapshot of the element's text tracks
   */
  tracks: ShallowRef<UseMediaTextTrack[]>;

  /**
   * The id of the currently selected (`showing`) track, or `-1` when none
   */
  selectedTrack: ShallowRef<number>;

  /**
   * Enable a track (set to `showing`), optionally disabling all others first.
   *
   * @param track The track or its id to enable
   * @param disableTracks Disable all other tracks first (default `true`)
   */
  enableTrack: (track: number | UseMediaTextTrack, disableTracks?: boolean) => void;

  /**
   * Disable a track. With no argument, disables every track.
   *
   * @param track The track or its id to disable
   */
  disableTrack: (track?: number | UseMediaTextTrack) => void;

  /**
   * Whether the Picture-in-Picture API is available
   */
  supportsPictureInPicture: boolean;

  /**
   * Toggle Picture-in-Picture for a `<video>` element
   */
  togglePictureInPicture: () => Promise<PictureInPictureWindow | void>;

  /**
   * Whether the element is currently in Picture-in-Picture mode
   */
  isPictureInPicture: ShallowRef<boolean>;

  /**
   * Register a callback fired when a `<source>` element errors
   */
  onSourceError: MediaEventHookOn<Event>;

  /**
   * Register a callback fired when playback errors (e.g. `play()` rejects)
   */
  onPlaybackError: MediaEventHookOn<unknown>;
}

interface MediaEventHook<T> {
  on: MediaEventHookOn<T>;
  trigger: (param: T) => void;
}

function createEventHook<T = void>(): MediaEventHook<T> {
  const callbacks = new Set<(param: T) => void>();

  const on: MediaEventHookOn<T> = (callback) => {
    callbacks.add(callback);
    return {
      off: () => {
        callbacks.delete(callback);
      },
    };
  };

  const trigger = (param: T): void => {
    callbacks.forEach(cb => cb(param));
  };

  return { on, trigger };
}

/**
 * Convert a `TimeRanges` object to an array of `[start, end]` pairs.
 */
function timeRangeToArray(timeRanges: TimeRanges): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];

  for (let i = 0; i < timeRanges.length; ++i)
    ranges.push([timeRanges.start(i), timeRanges.end(i)]);

  return ranges;
}

/**
 * Convert a `TextTrackList` to an array of `UseMediaTextTrack`.
 */
function tracksToArray(tracks: TextTrackList): UseMediaTextTrack[] {
  return Array.from(tracks).map(
    ({ label, kind, language, mode, activeCues, cues, inBandMetadataTrackDispatchType }, id) => ({
      id,
      label,
      kind,
      language,
      mode,
      activeCues,
      cues,
      inBandMetadataTrackDispatchType,
    }),
  );
}

const LISTENER_OPTIONS = { passive: true } as const;

/**
 * @name useMediaControls
 * @category Media
 * @description Reactive controls and state for an `<audio>`/`<video>` element:
 * play/pause, seeking, duration, buffered ranges, volume, mute, rate, text tracks,
 * and Picture-in-Picture. Source and track injection are handled for you, and all
 * DOM listeners attach passively with automatic cleanup. SSR-safe.
 *
 * @param {MaybeComputedElementRef<HTMLMediaElement | null | undefined>} target The media element (reactive ref, getter, or component instance)
 * @param {UseMediaControlsOptions} [options={}] Source/track configuration and a custom `document`
 * @returns {UseMediaControlsReturn} Reactive media state plus track and Picture-in-Picture controls
 *
 * @example
 * const video = useTemplateRef<HTMLVideoElement>('video');
 * const { playing, currentTime, duration, volume } = useMediaControls(video, {
 *   src: 'https://example.com/clip.mp4',
 * });
 * playing.value = true; // start playback
 *
 * @example
 * const { tracks, enableTrack, togglePictureInPicture } = useMediaControls(video, {
 *   src: 'video.mp4',
 *   tracks: [{ default: true, src: 'en.vtt', srcLang: 'en', label: 'English', kind: 'subtitles' }],
 * });
 *
 * @since 0.0.15
 */
export function useMediaControls(
  target: MaybeComputedElementRef<HTMLMediaElement | null | undefined>,
  options: UseMediaControlsOptions = {},
): UseMediaControlsReturn {
  const {
    document = defaultDocument,
    onError = noop,
  } = options;

  const resolve = (): HTMLMediaElement | undefined =>
    unrefElement(target) as HTMLMediaElement | undefined;

  const currentTime = shallowRef(0);
  const duration = shallowRef(0);
  const seeking = shallowRef(false);
  const volume = shallowRef(1);
  const waiting = shallowRef(false);
  const ended = shallowRef(false);
  const playing = shallowRef(false);
  const rate = shallowRef(1);
  const stalled = shallowRef(false);
  const buffered = shallowRef<Array<[number, number]>>([]);
  const tracks = shallowRef<UseMediaTextTrack[]>([]);
  const selectedTrack = shallowRef<number>(-1);
  const isPictureInPicture = shallowRef(false);
  const muted = shallowRef(false);

  const supportsPictureInPicture = Boolean(document && 'pictureInPictureEnabled' in document);

  const sourceErrorEvent = createEventHook<Event>();
  const playbackErrorEvent = createEventHook<unknown>();

  const disableTrack = (track?: number | UseMediaTextTrack): void => {
    const el = resolve();
    if (!el)
      return;

    if (track !== undefined) {
      const id = typeof track === 'number' ? track : track.id;
      const textTrack = el.textTracks[id];
      if (textTrack)
        textTrack.mode = 'disabled';
    }
    else {
      for (const textTrack of el.textTracks)
        textTrack.mode = 'disabled';
    }

    selectedTrack.value = -1;
  };

  const enableTrack = (track: number | UseMediaTextTrack, disableTracks = true): void => {
    const el = resolve();
    if (!el)
      return;

    const id = typeof track === 'number' ? track : track.id;

    if (disableTracks)
      disableTrack();

    const textTrack = el.textTracks[id];
    if (textTrack)
      textTrack.mode = 'showing';
    selectedTrack.value = id;
  };

  const togglePictureInPicture = (): Promise<PictureInPictureWindow | void> => {
    const el = resolve() as HTMLVideoElement | undefined;

    if (!el || !supportsPictureInPicture)
      return Promise.resolve();

    return isPictureInPicture.value
      ? document!.exitPictureInPicture()
      : el.requestPictureInPicture();
  };

  // Inject <source> children and (re)load whenever the resolved element or src changes.
  watchEffect(() => {
    if (!document)
      return;

    const el = resolve();
    const src = toValue(options.src);

    if (!el || !src)
      return;

    let sources: UseMediaSource[];
    if (isString(src))
      sources = [{ src }];
    else if (isArray(src))
      sources = src;
    else
      sources = [src];

    el.querySelectorAll('source').forEach(node => node.remove());

    for (const { src, type, media } of sources) {
      const source = document.createElement('source');
      source.setAttribute('src', src);
      source.setAttribute('type', type ?? '');
      source.setAttribute('media', media ?? '');
      useEventListener(source, 'error', sourceErrorEvent.trigger, LISTENER_OPTIONS);
      el.appendChild(source);
    }

    el.load();
  });

  // Inject <track> children whenever the resolved element or tracks change.
  watchEffect(() => {
    if (!document)
      return;

    const el = resolve();
    const textTracks = toValue(options.tracks);

    if (!el || !textTracks || !textTracks.length)
      return;

    // The Media API can add but not remove text tracks, so recreate via the HTML API.
    el.querySelectorAll('track').forEach(node => node.remove());

    textTracks.forEach(({ default: isDefault, kind, label, src, srcLang }, i) => {
      const track = document.createElement('track');
      track.default = isDefault ?? false;
      track.kind = kind;
      track.label = label;
      track.src = src;
      track.srclang = srcLang;

      if (track.default)
        selectedTrack.value = i;

      el.appendChild(track);
    });
  });

  // Push volume/muted/rate to the element, also when the element itself changes.
  watch([resolve, volume], () => {
    const el = resolve();
    if (el)
      el.volume = volume.value;
  });

  watch([resolve, muted], () => {
    const el = resolve();
    if (el)
      el.muted = muted.value;
  });

  watch([resolve, rate], () => {
    const el = resolve();
    if (el)
      el.playbackRate = rate.value;
  });

  // Ignorable so the timeupdate-driven write does not re-seek the media.
  const { ignoreUpdates: ignoreCurrentTimeUpdates } = watchIgnorable(currentTime, (time) => {
    const el = resolve();
    if (el)
      el.currentTime = time;
  });

  // Ignorable so play/pause events do not re-trigger play()/pause().
  const { ignoreUpdates: ignorePlayingUpdates } = watchIgnorable(playing, (isPlaying) => {
    const el = resolve();
    if (!el)
      return;

    if (isPlaying) {
      el.play().catch((error) => {
        playbackErrorEvent.trigger(error);
        onError(error);
      });
    }
    else {
      el.pause();
    }
  });

  const onTimeUpdate = (): void => {
    ignoreCurrentTimeUpdates(() => {
      currentTime.value = resolve()!.currentTime;
    });
  };

  const onDurationChange = (): void => {
    duration.value = resolve()!.duration;
  };

  const onProgress = (): void => {
    buffered.value = timeRangeToArray(resolve()!.buffered);
  };

  const onWaiting = (): void => {
    waiting.value = true;
    ignorePlayingUpdates(() => {
      playing.value = false;
    });
  };

  const onPlaying = (): void => {
    waiting.value = false;
    ended.value = false;
    ignorePlayingUpdates(() => {
      playing.value = true;
    });
  };

  const onRateChange = (): void => {
    rate.value = resolve()!.playbackRate;
  };

  const onPause = (): void => {
    ignorePlayingUpdates(() => {
      playing.value = false;
    });
  };

  const onPlay = (): void => {
    ignorePlayingUpdates(() => {
      playing.value = true;
    });
  };

  const onVolumeChange = (): void => {
    const el = resolve();
    if (!el)
      return;

    volume.value = el.volume;
    muted.value = el.muted;
  };

  const setSeeking = (value: boolean) => (): void => {
    seeking.value = value;
  };

  useEventListener(target, 'timeupdate', onTimeUpdate, LISTENER_OPTIONS);
  useEventListener(target, 'durationchange', onDurationChange, LISTENER_OPTIONS);
  useEventListener(target, 'progress', onProgress, LISTENER_OPTIONS);
  useEventListener(target, 'seeking', setSeeking(true), LISTENER_OPTIONS);
  useEventListener(target, 'seeked', setSeeking(false), LISTENER_OPTIONS);
  useEventListener(target, ['waiting', 'loadstart'], onWaiting, LISTENER_OPTIONS);
  useEventListener(target, 'loadeddata', () => (waiting.value = false), LISTENER_OPTIONS);
  useEventListener(target, 'playing', onPlaying, LISTENER_OPTIONS);
  useEventListener(target, 'ratechange', onRateChange, LISTENER_OPTIONS);
  useEventListener(target, 'stalled', () => (stalled.value = true), LISTENER_OPTIONS);
  useEventListener(target, 'ended', () => (ended.value = true), LISTENER_OPTIONS);
  useEventListener(target, 'pause', onPause, LISTENER_OPTIONS);
  useEventListener(target, 'play', onPlay, LISTENER_OPTIONS);
  useEventListener(target, 'enterpictureinpicture', () => (isPictureInPicture.value = true), LISTENER_OPTIONS);
  useEventListener(target, 'leavepictureinpicture', () => (isPictureInPicture.value = false), LISTENER_OPTIONS);
  useEventListener(target, 'volumechange', onVolumeChange, LISTENER_OPTIONS);

  // The text-track list lives on a nested object; attach its listeners reactively
  // via a getter so they re-bind when the element changes and auto-clean on dispose.
  const syncTracks = (): void => {
    const el = resolve();
    if (el)
      tracks.value = tracksToArray(el.textTracks);
  };
  const trackListTarget = (): TextTrackList | undefined => resolve()?.textTracks;
  useEventListener(trackListTarget, 'addtrack', syncTracks, LISTENER_OPTIONS);
  useEventListener(trackListTarget, 'removetrack', syncTracks, LISTENER_OPTIONS);
  useEventListener(trackListTarget, 'change', syncTracks, LISTENER_OPTIONS);

  return {
    currentTime,
    duration,
    waiting,
    seeking,
    ended,
    stalled,
    buffered,
    playing,
    rate,
    playbackRate: rate,
    volume,
    muted,
    tracks,
    selectedTrack,
    enableTrack,
    disableTrack,
    supportsPictureInPicture,
    togglePictureInPicture,
    isPictureInPicture,
    onSourceError: sourceErrorEvent.on,
    onPlaybackError: playbackErrorEvent.on,
  };
}
