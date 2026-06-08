import { shallowReadonly, shallowRef, toRef, toValue, watch } from 'vue';
import type { ComputedRef, MaybeRefOrGetter, ShallowRef } from 'vue';
import { noop } from '@robonen/stdlib';
import type { ConfigurableWindow } from '@/types';
import { defaultWindow } from '@/types';
import { useSupported } from '@/composables/utilities/useSupported';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';
import type {
  SpeechRecognition,
  SpeechRecognitionConstructor,
  SpeechRecognitionErrorEvent,
} from './types';

export type {
  SpeechRecognition,
  SpeechRecognitionAlternative,
  SpeechRecognitionConstructor,
  SpeechRecognitionErrorCode,
  SpeechRecognitionErrorEvent,
  SpeechRecognitionEvent,
  SpeechRecognitionResult,
  SpeechRecognitionResultList,
} from './types';

export interface UseSpeechRecognitionOptions extends ConfigurableWindow {
  /**
   * Language of the recognition. BCP 47 tag (e.g. `'en-US'`, `'ru-RU'`).
   *
   * Reactive: while not listening, changing it updates the recognizer's language
   * for the next session.
   *
   * @default 'en-US'
   */
  lang?: MaybeRefOrGetter<string>;

  /**
   * Keep returning results for each continuous recognition, rather than stopping
   * after the first final result.
   *
   * @default true
   */
  continuous?: boolean;

  /**
   * Emit interim (not-yet-final) results while the user is still speaking.
   *
   * @default true
   */
  interimResults?: boolean;

  /**
   * Maximum number of alternatives provided per result.
   *
   * @default 1
   */
  maxAlternatives?: number;
}

export interface UseSpeechRecognitionReturn {
  /**
   * Whether the SpeechRecognition API is supported in the current environment.
   */
  isSupported: ComputedRef<boolean>;

  /**
   * Whether recognition is currently active. Writable: setting it starts/stops
   * the recognizer, mirroring `start()` / `stop()`.
   */
  isListening: ShallowRef<boolean>;

  /**
   * Whether the latest `result` is final (`true`) or interim (`false`).
   */
  isFinal: Readonly<ShallowRef<boolean>>;

  /**
   * Transcript of the most recent recognition result.
   */
  result: Readonly<ShallowRef<string>>;

  /**
   * Confidence (0-1) the engine has in the most recent result.
   */
  confidence: Readonly<ShallowRef<number>>;

  /**
   * The most recent error, or `undefined` when none.
   */
  error: ShallowRef<SpeechRecognitionErrorEvent | Error | undefined>;

  /**
   * The underlying `SpeechRecognition` instance, or `undefined` when unsupported.
   */
  recognition: SpeechRecognition | undefined;

  /**
   * Start listening.
   */
  start: () => void;

  /**
   * Stop listening.
   */
  stop: () => void;

  /**
   * Toggle listening. Pass a boolean to force a state.
   *
   * @param value - Optional forced listening state
   */
  toggle: (value?: boolean) => void;
}

/**
 * @name useSpeechRecognition
 * @category Media
 * @description Reactive wrapper around the Web Speech API `SpeechRecognition` for transcribing speech to text.
 *
 * @param {UseSpeechRecognitionOptions} [options] Configuration options
 * @returns {UseSpeechRecognitionReturn} Support flag, reactive listening/result/error state, and start/stop/toggle controls
 *
 * @example
 * const { isSupported, isListening, result, start, stop } = useSpeechRecognition({ lang: 'en-US' });
 * start();
 *
 * @example
 * // Toggle from a button, read the live transcript
 * const { result, isFinal, toggle } = useSpeechRecognition({ continuous: true });
 * watch(result, transcript => console.log(transcript));
 *
 * @since 0.0.15
 */
export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const {
    interimResults = true,
    continuous = true,
    maxAlternatives = 1,
    window = defaultWindow,
  } = options;

  const lang = toRef(options.lang ?? 'en-US');
  const isListening = shallowRef(false);
  const isFinal = shallowRef(false);
  const result = shallowRef('');
  const confidence = shallowRef(0);
  const error = shallowRef<SpeechRecognitionErrorEvent | Error | undefined>(undefined);

  const speechWindow = window as (Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }) | undefined;
  const Recognition: SpeechRecognitionConstructor | undefined
    = speechWindow?.SpeechRecognition ?? speechWindow?.webkitSpeechRecognition;

  const isSupported = useSupported(() => Recognition);

  let recognition: SpeechRecognition | undefined;

  function start(): void {
    isListening.value = true;
  }

  function stop(): void {
    isListening.value = false;
  }

  function toggle(value = !isListening.value): void {
    isListening.value = value;
  }

  if (isSupported.value && Recognition) {
    recognition = new Recognition();

    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = toValue(lang);
    recognition.maxAlternatives = maxAlternatives;

    recognition.onstart = () => {
      isListening.value = true;
      isFinal.value = false;
    };

    recognition.onresult = (event) => {
      // The result at `resultIndex` carries the latest transcript chunk.
      const currentResult = event.results[event.resultIndex];
      const alternative = currentResult?.[0];
      if (!currentResult || !alternative)
        return;

      isFinal.value = currentResult.isFinal;
      result.value = alternative.transcript;
      confidence.value = alternative.confidence;
      error.value = undefined;
    };

    recognition.onerror = (event) => {
      error.value = event;
    };

    recognition.onend = () => {
      isListening.value = false;
      // Re-apply lang (it may have been changed while listening).
      recognition!.lang = toValue(lang);
    };

    // Only sync lang while idle; mutating it mid-session takes effect on the next start.
    watch(lang, (value) => {
      if (recognition && !isListening.value)
        recognition.lang = value;
    });

    // Single source of truth: writing `isListening` (directly or via start/stop/toggle)
    // drives the recognizer. `onstart`/`onend` resync the flag if the engine self-stops.
    watch(isListening, (value, prev) => {
      if (value === prev)
        return;

      try {
        if (value)
          recognition!.start();
        else
          recognition!.stop();
      }
      catch (err) {
        error.value = err as Error;
      }
    });
  }

  tryOnScopeDispose(() => {
    if (!recognition)
      return;

    // Detach handlers first so the teardown stop() can't re-enter our state.
    recognition.onstart = noop;
    recognition.onresult = noop;
    recognition.onerror = noop;
    recognition.onend = noop;

    isListening.value = false;
    // The isListening watcher is gone with the scope, so abort the engine directly.
    recognition.abort();
  });

  return {
    isSupported,
    isListening,
    isFinal: shallowReadonly(isFinal),
    result: shallowReadonly(result),
    confidence: shallowReadonly(confidence),
    error,
    recognition,
    start,
    stop,
    toggle,
  };
}
