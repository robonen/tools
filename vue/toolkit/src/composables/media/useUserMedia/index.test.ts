import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import type { UseUserMediaReturn } from '.';
import { useUserMedia } from '.';

afterEach(() => {
  vi.unstubAllGlobals();
});

function createTrack() {
  return { stop: vi.fn() } as unknown as MediaStreamTrack;
}

function createStream(trackCount = 2) {
  const tracks = Array.from({ length: trackCount }, createTrack);
  return {
    getTracks: () => tracks,
    _tracks: tracks,
  } as unknown as MediaStream & { _tracks: MediaStreamTrack[] };
}

function stubNavigator(getUserMedia?: (c: MediaStreamConstraints) => Promise<MediaStream>) {
  const fn = getUserMedia ?? vi.fn(async () => createStream());
  const navigator = {
    mediaDevices: { getUserMedia: fn },
  } as unknown as Navigator;
  return { navigator, getUserMedia: fn as ReturnType<typeof vi.fn> };
}

describe(useUserMedia, () => {
  it('reports supported when getUserMedia exists', () => {
    const { navigator } = stubNavigator();
    const scope = effectScope();
    let result!: UseUserMediaReturn;
    scope.run(() => {
      result = useUserMedia({ navigator });
    });
    expect(result.isSupported.value).toBeTruthy();
    scope.stop();
  });

  it('reports unsupported when mediaDevices is missing', () => {
    const navigator = {} as Navigator;
    const scope = effectScope();
    let result!: UseUserMediaReturn;
    scope.run(() => {
      result = useUserMedia({ navigator });
    });
    expect(result.isSupported.value).toBeFalsy();
    scope.stop();
  });

  it('is SSR-safe when navigator is undefined', () => {
    const scope = effectScope();
    let result!: UseUserMediaReturn;
    scope.run(() => {
      result = useUserMedia({ navigator: undefined });
    });
    expect(result.isSupported.value).toBeFalsy();
    expect(result.stream.value).toBeUndefined();
    scope.stop();
  });

  it('does not auto-start when disabled', () => {
    const { navigator, getUserMedia } = stubNavigator();
    const scope = effectScope();
    scope.run(() => useUserMedia({ navigator }));
    expect(getUserMedia).not.toHaveBeenCalled();
    scope.stop();
  });

  it('start() acquires a stream and flips enabled', async () => {
    const stream = createStream();
    const { navigator, getUserMedia } = stubNavigator(vi.fn(async () => stream));
    const scope = effectScope();
    let result!: UseUserMediaReturn;
    scope.run(() => {
      result = useUserMedia({ navigator, constraints: { video: true } });
    });

    const returned = await result.start();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(returned).toBe(stream);
    expect(result.stream.value).toBe(stream);
    expect(result.enabled.value).toBeTruthy();
    scope.stop();
  });

  it('passes video/audio constraints through to getUserMedia', async () => {
    const { navigator, getUserMedia } = stubNavigator();
    const scope = effectScope();
    let result!: UseUserMediaReturn;
    scope.run(() => {
      result = useUserMedia({
        navigator,
        constraints: { video: { width: 1280 }, audio: true },
      });
    });

    await result.start();
    expect(getUserMedia).toHaveBeenCalledWith({ video: { width: 1280 }, audio: true });
    scope.stop();
  });

  it('defaults missing constraint kinds to false', async () => {
    const { navigator, getUserMedia } = stubNavigator();
    const scope = effectScope();
    let result!: UseUserMediaReturn;
    scope.run(() => {
      result = useUserMedia({ navigator, constraints: { video: true } });
    });

    await result.start();
    expect(getUserMedia).toHaveBeenCalledWith({ video: true, audio: false });
    scope.stop();
  });

  it('does not re-acquire when a stream is already running', async () => {
    const { navigator, getUserMedia } = stubNavigator();
    const scope = effectScope();
    let result!: UseUserMediaReturn;
    scope.run(() => {
      result = useUserMedia({ navigator });
    });

    await result.start();
    await result.start();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it('stop() stops every track and clears state', async () => {
    const stream = createStream(3);
    const { navigator } = stubNavigator(vi.fn(async () => stream));
    const scope = effectScope();
    let result!: UseUserMediaReturn;
    scope.run(() => {
      result = useUserMedia({ navigator });
    });

    await result.start();
    result.stop();

    for (const track of stream._tracks)
      expect(track.stop).toHaveBeenCalledTimes(1);

    expect(result.stream.value).toBeUndefined();
    expect(result.enabled.value).toBeFalsy();
    scope.stop();
  });

  it('starts when enabled is toggled true', async () => {
    const { navigator, getUserMedia } = stubNavigator();
    const scope = effectScope();
    let result!: UseUserMediaReturn;
    scope.run(() => {
      result = useUserMedia({ navigator });
    });

    result.enabled.value = true;
    await nextTick();
    await Promise.resolve();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it('stops the stream when enabled is toggled false', async () => {
    const stream = createStream();
    const { navigator } = stubNavigator(vi.fn(async () => stream));
    const scope = effectScope();
    let result!: UseUserMediaReturn;
    scope.run(() => {
      result = useUserMedia({ navigator, enabled: true });
    });

    await Promise.resolve();
    expect(result.stream.value).toBe(stream);

    result.enabled.value = false;
    await nextTick();
    expect(result.stream.value).toBeUndefined();
    scope.stop();
  });

  it('restart() releases the old stream and acquires a new one', async () => {
    const first = createStream();
    const second = createStream();
    const getUserMedia = vi.fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);
    const { navigator } = stubNavigator(getUserMedia);
    const scope = effectScope();
    let result!: UseUserMediaReturn;
    scope.run(() => {
      result = useUserMedia({ navigator });
    });

    await result.start();
    expect(result.stream.value).toBe(first);

    await result.restart();
    for (const track of first._tracks)
      expect(track.stop).toHaveBeenCalled();
    expect(result.stream.value).toBe(second);
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    scope.stop();
  });

  it('auto-restarts on constraint change while running', async () => {
    const first = createStream();
    const second = createStream();
    const getUserMedia = vi.fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);
    const { navigator } = stubNavigator(getUserMedia);
    const scope = effectScope();
    let result!: UseUserMediaReturn;
    scope.run(() => {
      result = useUserMedia({ navigator, constraints: { video: true } });
    });

    await result.start();
    expect(getUserMedia).toHaveBeenCalledTimes(1);

    result.constraints.value = { video: { deviceId: 'cam-2' } };
    await nextTick();
    await Promise.resolve();
    await Promise.resolve();

    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(result.stream.value).toBe(second);
    scope.stop();
  });

  it('does not restart on constraint change when not running', async () => {
    const { navigator, getUserMedia } = stubNavigator();
    const scope = effectScope();
    let result!: UseUserMediaReturn;
    scope.run(() => {
      result = useUserMedia({ navigator, constraints: { video: true } });
    });

    result.constraints.value = { video: false, audio: true };
    await nextTick();
    expect(getUserMedia).not.toHaveBeenCalled();
    scope.stop();
  });

  it('does not auto-restart when autoSwitch is false', async () => {
    const { navigator, getUserMedia } = stubNavigator();
    const scope = effectScope();
    let result!: UseUserMediaReturn;
    scope.run(() => {
      result = useUserMedia({ navigator, autoSwitch: false, constraints: { video: true } });
    });

    await result.start();
    expect(getUserMedia).toHaveBeenCalledTimes(1);

    result.constraints.value = { video: { deviceId: 'cam-2' } };
    await nextTick();
    await Promise.resolve();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it('invokes onError and leaves stream undefined when getUserMedia rejects', async () => {
    const error = new Error('denied');
    const getUserMedia = vi.fn(async () => {
      throw error;
    });
    const { navigator } = stubNavigator(getUserMedia);
    const onError = vi.fn();
    const scope = effectScope();
    let result!: UseUserMediaReturn;
    scope.run(() => {
      result = useUserMedia({ navigator, onError });
    });

    const returned = await result.start();
    expect(onError).toHaveBeenCalledWith(error);
    expect(returned).toBeUndefined();
    expect(result.stream.value).toBeUndefined();
    expect(result.enabled.value).toBeFalsy();
    scope.stop();
  });

  it('discards a stale stream when superseded by a stop', async () => {
    let resolveFirst!: (s: MediaStream) => void;
    const first = createStream();
    const getUserMedia = vi.fn(() => new Promise<MediaStream>((resolve) => {
      resolveFirst = resolve;
    }));
    const { navigator } = stubNavigator(getUserMedia);
    const scope = effectScope();
    let result!: UseUserMediaReturn;
    scope.run(() => {
      result = useUserMedia({ navigator });
    });

    const pending = result.start();
    // Stop before the acquisition resolves.
    result.stop();
    resolveFirst(first);
    await pending;

    // The orphaned stream must be torn down, not assigned.
    for (const track of first._tracks)
      expect(track.stop).toHaveBeenCalled();
    expect(result.stream.value).toBeUndefined();
    scope.stop();
  });

  it('stops the stream when the scope is disposed', async () => {
    const stream = createStream();
    const { navigator } = stubNavigator(vi.fn(async () => stream));
    const scope = effectScope();
    let result!: UseUserMediaReturn;
    scope.run(() => {
      result = useUserMedia({ navigator });
    });

    await result.start();
    expect(result.stream.value).toBe(stream);

    scope.stop();
    for (const track of stream._tracks)
      expect(track.stop).toHaveBeenCalled();
  });

  it('does not acquire when unsupported even if enabled', async () => {
    const navigator = {} as Navigator;
    const scope = effectScope();
    let result!: UseUserMediaReturn;
    scope.run(() => {
      result = useUserMedia({ navigator, enabled: true });
    });

    await Promise.resolve();
    expect(result.stream.value).toBeUndefined();
    scope.stop();
  });
});
