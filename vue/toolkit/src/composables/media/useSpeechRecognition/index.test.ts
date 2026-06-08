import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useSpeechRecognition } from '.';
import type {
  SpeechRecognition,
  SpeechRecognitionErrorEvent,
  SpeechRecognitionEvent,
} from './types';

// Minimal stub of the SpeechRecognition browser API.
class StubSpeechRecognition implements SpeechRecognition {
  static instances: StubSpeechRecognition[] = [];

  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 0;

  onstart: SpeechRecognition['onstart'] = null;
  onend: SpeechRecognition['onend'] = null;
  onerror: SpeechRecognition['onerror'] = null;
  onresult: SpeechRecognition['onresult'] = null;

  start = vi.fn(() => {
    this.onstart?.call(this, new Event('start'));
  });

  stop = vi.fn(() => {
    this.onend?.call(this, new Event('end'));
  });

  abort = vi.fn();

  // EventTarget stubs (unused by the composable but required by the interface).
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn(() => true);

  constructor() {
    StubSpeechRecognition.instances.push(this);
  }

  emitResult(transcript: string, isFinal: boolean, confidence = 0.9): void {
    const event = {
      resultIndex: 0,
      results: {
        length: 1,
        item: () => ({}),
        0: {
          isFinal,
          length: 1,
          item: () => ({ transcript, confidence }),
          0: { transcript, confidence },
        },
      },
    } as unknown as SpeechRecognitionEvent;

    this.onresult?.call(this, event);
  }

  emitError(code: string): void {
    const event = { error: code, message: code } as unknown as SpeechRecognitionErrorEvent;
    this.onerror?.call(this, event);
  }
}

function stubWindow(ctor: unknown = StubSpeechRecognition) {
  return { SpeechRecognition: ctor } as unknown as Window;
}

describe(useSpeechRecognition, () => {
  afterEach(() => {
    StubSpeechRecognition.instances = [];
    vi.unstubAllGlobals();
  });

  it('reports support based on the provided window', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechRecognition>;
    scope.run(() => {
      result = useSpeechRecognition({ window: stubWindow() });
    });

    expect(result!.isSupported.value).toBeTruthy();
    expect(result!.recognition).toBeInstanceOf(StubSpeechRecognition);
    scope.stop();
  });

  it('detects the webkit-prefixed constructor', () => {
    const win = { webkitSpeechRecognition: StubSpeechRecognition } as unknown as Window;
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechRecognition>;
    scope.run(() => {
      result = useSpeechRecognition({ window: win });
    });

    expect(result!.isSupported.value).toBeTruthy();
    scope.stop();
  });

  it('reports unsupported when the API is missing', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechRecognition>;
    scope.run(() => {
      result = useSpeechRecognition({ window: {} as Window });
    });

    expect(result!.isSupported.value).toBeFalsy();
    expect(result!.recognition).toBeUndefined();
    scope.stop();
  });

  it('reports unsupported when window is undefined (SSR path) and never throws', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechRecognition>;
    scope.run(() => {
      result = useSpeechRecognition({ window: undefined });
    });

    expect(result!.isSupported.value).toBeFalsy();
    expect(result!.recognition).toBeUndefined();
    expect(() => result!.start()).not.toThrow();
    expect(() => result!.stop()).not.toThrow();
    expect(() => result!.toggle()).not.toThrow();
    scope.stop();
  });

  it('applies the configured options to the recognizer', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechRecognition>;
    scope.run(() => {
      result = useSpeechRecognition({
        window: stubWindow(),
        lang: 'ru-RU',
        continuous: false,
        interimResults: false,
        maxAlternatives: 3,
      });
    });

    const recognition = result!.recognition as unknown as StubSpeechRecognition;
    expect(recognition.lang).toBe('ru-RU');
    expect(recognition.continuous).toBeFalsy();
    expect(recognition.interimResults).toBeFalsy();
    expect(recognition.maxAlternatives).toBe(3);
    scope.stop();
  });

  it('defaults lang to en-US', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechRecognition>;
    scope.run(() => {
      result = useSpeechRecognition({ window: stubWindow() });
    });

    expect((result!.recognition as unknown as StubSpeechRecognition).lang).toBe('en-US');
    scope.stop();
  });

  it('start() begins listening and stop() ends it', async () => {
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechRecognition>;
    scope.run(() => {
      result = useSpeechRecognition({ window: stubWindow() });
    });

    const recognition = result!.recognition as unknown as StubSpeechRecognition;

    result!.start();
    await nextTick();
    expect(recognition.start).toHaveBeenCalledTimes(1);
    expect(result!.isListening.value).toBeTruthy();

    result!.stop();
    await nextTick();
    expect(recognition.stop).toHaveBeenCalledTimes(1);
    expect(result!.isListening.value).toBeFalsy();
    scope.stop();
  });

  it('writing isListening directly drives the recognizer', async () => {
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechRecognition>;
    scope.run(() => {
      result = useSpeechRecognition({ window: stubWindow() });
    });

    const recognition = result!.recognition as unknown as StubSpeechRecognition;

    result!.isListening.value = true;
    await nextTick();
    expect(recognition.start).toHaveBeenCalledTimes(1);

    result!.isListening.value = false;
    await nextTick();
    expect(recognition.stop).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it('toggle() flips and forces the listening state', async () => {
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechRecognition>;
    scope.run(() => {
      result = useSpeechRecognition({ window: stubWindow() });
    });

    const recognition = result!.recognition as unknown as StubSpeechRecognition;

    result!.toggle();
    await nextTick();
    expect(result!.isListening.value).toBeTruthy();

    result!.toggle(true);
    await nextTick();
    // Already listening, no extra start.
    expect(recognition.start).toHaveBeenCalledTimes(1);

    result!.toggle();
    await nextTick();
    expect(result!.isListening.value).toBeFalsy();
    scope.stop();
  });

  it('updates result, isFinal, and confidence from recognition events', async () => {
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechRecognition>;
    scope.run(() => {
      result = useSpeechRecognition({ window: stubWindow() });
    });

    const recognition = result!.recognition as unknown as StubSpeechRecognition;
    result!.start();
    await nextTick();

    recognition.emitResult('hello', false, 0.4);
    expect(result!.result.value).toBe('hello');
    expect(result!.isFinal.value).toBeFalsy();
    expect(result!.confidence.value).toBe(0.4);

    recognition.emitResult('hello world', true, 0.95);
    expect(result!.result.value).toBe('hello world');
    expect(result!.isFinal.value).toBeTruthy();
    expect(result!.confidence.value).toBe(0.95);
    scope.stop();
  });

  it('captures recognition errors', async () => {
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechRecognition>;
    scope.run(() => {
      result = useSpeechRecognition({ window: stubWindow() });
    });

    const recognition = result!.recognition as unknown as StubSpeechRecognition;
    recognition.emitError('no-speech');

    expect((result!.error.value as SpeechRecognitionErrorEvent).error).toBe('no-speech');
    scope.stop();
  });

  it('clears error on a successful result', async () => {
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechRecognition>;
    scope.run(() => {
      result = useSpeechRecognition({ window: stubWindow() });
    });

    const recognition = result!.recognition as unknown as StubSpeechRecognition;
    recognition.emitError('network');
    expect(result!.error.value).toBeDefined();

    recognition.emitResult('ok', true);
    expect(result!.error.value).toBeUndefined();
    scope.stop();
  });

  it('captures synchronous start() errors thrown by the engine', async () => {
    class ThrowingRecognition extends StubSpeechRecognition {
      override start = vi.fn(() => {
        throw new Error('already started');
      });
    }

    const scope = effectScope();
    let result: ReturnType<typeof useSpeechRecognition>;
    scope.run(() => {
      result = useSpeechRecognition({ window: stubWindow(ThrowingRecognition) });
    });

    result!.start();
    await nextTick();

    expect(result!.error.value).toBeInstanceOf(Error);
    expect((result!.error.value as Error).message).toBe('already started');
    scope.stop();
  });

  it('syncs lang while idle and re-applies it on end', async () => {
    const lang = ref('en-US');
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechRecognition>;
    scope.run(() => {
      result = useSpeechRecognition({ window: stubWindow(), lang });
    });

    const recognition = result!.recognition as unknown as StubSpeechRecognition;

    lang.value = 'fr-FR';
    await nextTick();
    expect(recognition.lang).toBe('fr-FR');

    // While listening, lang changes are deferred.
    result!.start();
    await nextTick();
    lang.value = 'de-DE';
    await nextTick();
    expect(recognition.lang).toBe('fr-FR');

    // On end, the latest lang is re-applied.
    result!.stop();
    await nextTick();
    expect(recognition.lang).toBe('de-DE');
    scope.stop();
  });

  it('resets isListening when the engine ends on its own', async () => {
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechRecognition>;
    scope.run(() => {
      result = useSpeechRecognition({ window: stubWindow() });
    });

    const recognition = result!.recognition as unknown as StubSpeechRecognition;
    result!.start();
    await nextTick();
    expect(result!.isListening.value).toBeTruthy();

    // Simulate the browser auto-stopping.
    recognition.onend?.call(recognition, new Event('end'));
    expect(result!.isListening.value).toBeFalsy();
    scope.stop();
  });

  it('stops listening when the scope is disposed', async () => {
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechRecognition>;
    scope.run(() => {
      result = useSpeechRecognition({ window: stubWindow() });
    });

    const recognition = result!.recognition as unknown as StubSpeechRecognition;
    result!.start();
    await nextTick();

    scope.stop();
    await nextTick();
    expect(recognition.abort).toHaveBeenCalled();
    expect(result!.isListening.value).toBeFalsy();
  });
});
