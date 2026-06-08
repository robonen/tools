import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useSpeechSynthesis } from '.';

class FakeUtterance {
  text: string;
  lang = '';
  voice: SpeechSynthesisVoice | null = null;
  pitch = 1;
  rate = 1;
  volume = 1;
  onstart: (() => void) | null = null;
  onpause: (() => void) | null = null;
  onresume: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onboundary: ((event: unknown) => void) | null = null;

  constructor(text = '') {
    this.text = text;
  }
}

function stubWindow() {
  const speechSynthesis = {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
  };
  const window = { speechSynthesis } as unknown as Window;
  return { window, speechSynthesis };
}

describe(useSpeechSynthesis, () => {
  beforeEach(() => {
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports support when window.speechSynthesis exists', () => {
    const { window } = stubWindow();
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechSynthesis>;
    scope.run(() => {
      result = useSpeechSynthesis('hi', { window });
    });

    expect(result!.isSupported.value).toBeTruthy();
    scope.stop();
  });

  it('reports unsupported when window lacks speechSynthesis', () => {
    const window = {} as Window;
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechSynthesis>;
    scope.run(() => {
      result = useSpeechSynthesis('hi', { window });
    });

    expect(result!.isSupported.value).toBeFalsy();
    scope.stop();
  });

  it('reports unsupported in the SSR path (window undefined) and never throws', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechSynthesis>;
    scope.run(() => {
      result = useSpeechSynthesis('hi', { window: undefined });
    });

    expect(result!.isSupported.value).toBeFalsy();
    expect(() => result!.speak()).not.toThrow();
    expect(() => result!.stop()).not.toThrow();
    expect(() => result!.toggle()).not.toThrow();
    scope.stop();
  });

  it('builds an utterance with the configured options', () => {
    const { window } = stubWindow();
    const voice = { name: 'Test Voice' } as SpeechSynthesisVoice;
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechSynthesis>;
    scope.run(() => {
      result = useSpeechSynthesis('hello', {
        window,
        lang: 'fr-FR',
        pitch: 1.5,
        rate: 0.8,
        volume: 0.5,
        voice,
      });
    });

    const u = result!.utterance.value;
    expect(u.text).toBe('hello');
    expect(u.lang).toBe('fr-FR');
    expect(u.pitch).toBe(1.5);
    expect(u.rate).toBe(0.8);
    expect(u.volume).toBe(0.5);
    expect(u.voice).toBe(voice);
    scope.stop();
  });

  it('defaults lang to en-US and voice to null', () => {
    const { window } = stubWindow();
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechSynthesis>;
    scope.run(() => {
      result = useSpeechSynthesis('hello', { window });
    });

    const u = result!.utterance.value;
    expect(u.lang).toBe('en-US');
    expect(u.voice).toBeNull();
    scope.stop();
  });

  it('rebuilds the utterance when reactive text changes', () => {
    const { window } = stubWindow();
    const text = ref('first');
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechSynthesis>;
    scope.run(() => {
      result = useSpeechSynthesis(text, { window });
    });

    expect(result!.utterance.value.text).toBe('first');
    text.value = 'second';
    expect(result!.utterance.value.text).toBe('second');
    scope.stop();
  });

  it('speak() cancels the queue then speaks the current utterance', () => {
    const { window, speechSynthesis } = stubWindow();
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechSynthesis>;
    scope.run(() => {
      result = useSpeechSynthesis('hello', { window });
    });

    result!.speak();
    expect(speechSynthesis.cancel).toHaveBeenCalled();
    expect(speechSynthesis.speak).toHaveBeenCalledWith(result!.utterance.value);
    scope.stop();
  });

  it('speak() is a no-op when unsupported', () => {
    const window = {} as Window;
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechSynthesis>;
    scope.run(() => {
      result = useSpeechSynthesis('hello', { window });
    });

    expect(() => result!.speak()).not.toThrow();
    scope.stop();
  });

  it('stop() cancels and clears isPlaying', () => {
    const { window, speechSynthesis } = stubWindow();
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechSynthesis>;
    scope.run(() => {
      result = useSpeechSynthesis('hello', { window });
    });

    result!.isPlaying.value = true;
    result!.stop();
    expect(speechSynthesis.cancel).toHaveBeenCalled();
    expect(result!.isPlaying.value).toBeFalsy();
    scope.stop();
  });

  it('toggle() flips and sets isPlaying which drives pause/resume', async () => {
    const { window, speechSynthesis } = stubWindow();
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechSynthesis>;
    scope.run(() => {
      result = useSpeechSynthesis('hello', { window });
    });

    result!.toggle();
    expect(result!.isPlaying.value).toBeTruthy();
    await nextTick();
    expect(speechSynthesis.resume).toHaveBeenCalled();

    result!.toggle();
    expect(result!.isPlaying.value).toBeFalsy();
    await nextTick();
    expect(speechSynthesis.pause).toHaveBeenCalled();

    result!.toggle(true);
    expect(result!.isPlaying.value).toBeTruthy();
    scope.stop();
  });

  it('updates status and isPlaying through utterance events', () => {
    const { window } = stubWindow();
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechSynthesis>;
    scope.run(() => {
      result = useSpeechSynthesis('hello', { window });
    });

    const u = result!.utterance.value as unknown as FakeUtterance;
    expect(result!.status.value).toBe('init');

    u.onstart!();
    expect(result!.status.value).toBe('play');
    expect(result!.isPlaying.value).toBeTruthy();

    u.onpause!();
    expect(result!.status.value).toBe('pause');
    expect(result!.isPlaying.value).toBeFalsy();

    u.onresume!();
    expect(result!.status.value).toBe('play');

    u.onend!();
    expect(result!.status.value).toBe('end');
    expect(result!.isPlaying.value).toBeFalsy();
    scope.stop();
  });

  it('captures errors and invokes onError', () => {
    const { window } = stubWindow();
    const onError = vi.fn();
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechSynthesis>;
    scope.run(() => {
      result = useSpeechSynthesis('hello', { window, onError });
    });

    const u = result!.utterance.value as unknown as FakeUtterance;
    const event = { error: 'network' };
    u.onerror!(event);

    expect(result!.error.value).toBe(event);
    expect(onError).toHaveBeenCalledWith(event);
    scope.stop();
  });

  it('forwards boundary events to onBoundary', () => {
    const { window } = stubWindow();
    const onBoundary = vi.fn();
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechSynthesis>;
    scope.run(() => {
      result = useSpeechSynthesis('hello', { window, onBoundary });
    });

    const u = result!.utterance.value as unknown as FakeUtterance;
    const event = { charIndex: 0 };
    u.onboundary!(event);
    expect(onBoundary).toHaveBeenCalledWith(event);
    scope.stop();
  });

  it('cancels speech when the scope is disposed', () => {
    const { window, speechSynthesis } = stubWindow();
    const scope = effectScope();
    let result: ReturnType<typeof useSpeechSynthesis>;
    scope.run(() => {
      result = useSpeechSynthesis('hello', { window });
    });

    result!.isPlaying.value = true;
    speechSynthesis.cancel.mockClear();
    scope.stop();
    expect(speechSynthesis.cancel).toHaveBeenCalled();
    expect(result!.isPlaying.value).toBeFalsy();
  });
});
