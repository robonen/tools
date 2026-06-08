import { computed, shallowRef, toRef, toValue, watch } from 'vue';
import type { ComputedRef, MaybeRefOrGetter, ShallowRef } from 'vue';
import { noop } from '@robonen/stdlib';
import type { ConfigurableWindow } from '@/types';
import { defaultWindow } from '@/types';
import { useSupported } from '@/composables/utilities/useSupported';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export type UseSpeechSynthesisStatus = 'init' | 'play' | 'pause' | 'end';

export interface UseSpeechSynthesisOptions extends ConfigurableWindow {
  /**
   * Language used to speak the utterance (BCP 47 tag).
   *
   * @default 'en-US'
   */
  lang?: MaybeRefOrGetter<string>;

  /**
   * Pitch the utterance is spoken at, between `0` and `2`.
   *
   * @default 1
   */
  pitch?: MaybeRefOrGetter<number>;

  /**
   * Rate the utterance is spoken at, between `0.1` and `10`.
   *
   * @default 1
   */
  rate?: MaybeRefOrGetter<number>;

  /**
   * Volume the utterance is spoken at, between `0` and `1`.
   *
   * @default 1
   */
  volume?: MaybeRefOrGetter<number>;

  /**
   * Voice used to speak the utterance. Defaults to the platform's default voice.
   */
  voice?: MaybeRefOrGetter<SpeechSynthesisVoice | undefined>;

  /**
   * Fired when the spoken utterance reaches a word or sentence boundary.
   */
  onBoundary?: (event: SpeechSynthesisEvent) => void;

  /**
   * Called with any `SpeechSynthesisErrorEvent` raised while speaking.
   *
   * @default noop
   */
  onError?: (event: SpeechSynthesisErrorEvent) => void;
}

export interface UseSpeechSynthesisReturn {
  /**
   * Whether the SpeechSynthesis API is supported in the current environment.
   */
  isSupported: ComputedRef<boolean>;

  /**
   * Whether the utterance is currently being spoken.
   */
  isPlaying: ShallowRef<boolean>;

  /**
   * Current lifecycle status of the utterance.
   */
  status: ShallowRef<UseSpeechSynthesisStatus>;

  /**
   * The reactive `SpeechSynthesisUtterance` rebuilt whenever the text or options change.
   */
  utterance: ComputedRef<SpeechSynthesisUtterance>;

  /**
   * The most recent error raised while speaking, if any.
   */
  error: ShallowRef<SpeechSynthesisErrorEvent | undefined>;

  /**
   * Pause/resume speaking. Pass an explicit boolean to force a state.
   *
   * @param value - `true` to resume, `false` to pause; toggles when omitted
   */
  toggle: (value?: boolean) => void;

  /**
   * Cancel any queued speech and speak the current utterance from the start.
   */
  speak: () => void;

  /**
   * Stop speaking and clear the queue.
   */
  stop: () => void;
}

/**
 * @name useSpeechSynthesis
 * @category Media
 * @description Reactive wrapper around the Web Speech `SpeechSynthesis` API for text-to-speech.
 *
 * @param {MaybeRefOrGetter<string>} text - The text to speak; rebuilds the utterance reactively
 * @param {UseSpeechSynthesisOptions} [options] - Configuration options
 * @returns {UseSpeechSynthesisReturn} Support flag, playing/status/error state, the reactive utterance, and speak/stop/toggle actions
 *
 * @example
 * const { speak, stop, isPlaying } = useSpeechSynthesis('Hello world', { lang: 'en-US', rate: 1.2 });
 * speak();
 *
 * @example
 * // Reactive text and voice
 * const text = ref('Initial');
 * const { speak, status } = useSpeechSynthesis(text, { pitch: 1.5 });
 * text.value = 'Updated';
 * speak();
 *
 * @since 0.0.15
 */
export function useSpeechSynthesis(
  text: MaybeRefOrGetter<string>,
  options: UseSpeechSynthesisOptions = {},
): UseSpeechSynthesisReturn {
  const {
    lang = 'en-US',
    pitch = 1,
    rate = 1,
    volume = 1,
    voice,
    window = defaultWindow,
    onBoundary,
    onError = noop,
  } = options;

  const synth = window?.speechSynthesis;
  const isSupported = useSupported(() => synth);

  const isPlaying = shallowRef(false);
  const status = shallowRef<UseSpeechSynthesisStatus>('init');
  const error = shallowRef<SpeechSynthesisErrorEvent | undefined>(undefined);

  const spokenText = toRef(text);

  function configure(target: SpeechSynthesisUtterance): SpeechSynthesisUtterance {
    target.lang = toValue(lang);
    target.voice = toValue(voice) ?? null;
    target.pitch = toValue(pitch);
    target.rate = toValue(rate);
    target.volume = toValue(volume);

    target.onstart = () => {
      isPlaying.value = true;
      status.value = 'play';
    };

    target.onpause = () => {
      isPlaying.value = false;
      status.value = 'pause';
    };

    target.onresume = () => {
      isPlaying.value = true;
      status.value = 'play';
    };

    target.onend = () => {
      isPlaying.value = false;
      status.value = 'end';
    };

    target.onerror = (event) => {
      error.value = event;
      onError(event);
    };

    if (onBoundary)
      target.onboundary = onBoundary;

    return target;
  }

  const utterance = computed<SpeechSynthesisUtterance>(() => {
    isPlaying.value = false;
    status.value = 'init';
    return configure(new SpeechSynthesisUtterance(spokenText.value));
  });

  function speak(): void {
    if (!isSupported.value)
      return;

    synth!.cancel();
    synth!.speak(utterance.value);
  }

  function stop(): void {
    if (isSupported.value)
      synth!.cancel();

    isPlaying.value = false;
  }

  function toggle(value = !isPlaying.value): void {
    isPlaying.value = value;
  }

  if (isSupported.value) {
    // Eagerly build the first utterance so it is ready to speak.
    void utterance.value;

    watch(isPlaying, (playing) => {
      if (playing)
        synth!.resume();
      else
        synth!.pause();
    });
  }

  tryOnScopeDispose(() => {
    isPlaying.value = false;

    if (isSupported.value)
      synth!.cancel();
  });

  return {
    isSupported,
    isPlaying,
    status,
    utterance,
    error,
    toggle,
    speak,
    stop,
  };
}
