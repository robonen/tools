import { describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import type { UseDisplayMediaReturn } from '.';
import { useDisplayMedia } from '.';

function track() {
  let endedHandler: ((ev: Event) => any) | undefined;
  return {
    stop: vi.fn(),
    kind: 'video',
    addEventListener: vi.fn((type: string, handler: any) => {
      if (type === 'ended') endedHandler = handler;
    }),
    removeEventListener: vi.fn(() => { endedHandler = undefined; }),
    emitEnded: () => endedHandler?.(new Event('ended')),
  };
}

function stubDisplayMedia() {
  const videoTrack = track();
  const media = {
    getTracks: () => [videoTrack],
  } as unknown as MediaStream;

  const getDisplayMedia = vi.fn(async () => media);
  const mediaDevices = { getDisplayMedia } as unknown as MediaDevices;
  const navigator = { mediaDevices } as unknown as Navigator;

  return { navigator, getDisplayMedia, media, videoTrack };
}

function host(fn: () => UseDisplayMediaReturn) {
  const scope = effectScope();
  let result: UseDisplayMediaReturn;
  scope.run(() => {
    result = fn();
  });
  return { result: result!, scope };
}

describe(useDisplayMedia, () => {
  it('reports unsupported when getDisplayMedia is missing', () => {
    const { result, scope } = host(() => useDisplayMedia({ navigator: {} as Navigator }));

    expect(result.isSupported.value).toBeFalsy();
    expect(result.stream.value).toBeUndefined();
    scope.stop();
  });

  it('handles the SSR path (no navigator) gracefully', async () => {
    const { result, scope } = host(() => useDisplayMedia({ navigator: undefined }));

    expect(result.isSupported.value).toBeFalsy();
    await expect(result.start()).resolves.toBeUndefined();
    expect(result.enabled.value).toBeFalsy();
    scope.stop();
  });

  it('reports supported and starts a stream', async () => {
    const { navigator, getDisplayMedia, media } = stubDisplayMedia();
    const { result, scope } = host(() => useDisplayMedia({ navigator }));

    expect(result.isSupported.value).toBeTruthy();

    const returned = await result.start();
    expect(returned).toBe(media);
    expect(result.stream.value).toBe(media);
    expect(result.enabled.value).toBeTruthy();
    expect(getDisplayMedia).toHaveBeenCalledWith({ audio: false, video: true });
    scope.stop();
  });

  it('passes custom audio/video constraints', async () => {
    const { navigator, getDisplayMedia } = stubDisplayMedia();
    const { result, scope } = host(() =>
      useDisplayMedia({ navigator, audio: true, video: { frameRate: 30 } }));

    await result.start();
    expect(getDisplayMedia).toHaveBeenCalledWith({ audio: true, video: { frameRate: 30 } });
    scope.stop();
  });

  it('stop() releases tracks and clears the stream', async () => {
    const { navigator, videoTrack } = stubDisplayMedia();
    const { result, scope } = host(() => useDisplayMedia({ navigator }));

    await result.start();
    result.stop();

    expect(videoTrack.stop).toHaveBeenCalled();
    expect(result.stream.value).toBeUndefined();
    expect(result.enabled.value).toBeFalsy();
    scope.stop();
  });

  it('registers the ended listener passively and stops on track end', async () => {
    const { navigator, videoTrack } = stubDisplayMedia();
    const { result, scope } = host(() => useDisplayMedia({ navigator }));

    await result.start();
    expect(videoTrack.addEventListener).toHaveBeenCalledWith(
      'ended',
      expect.any(Function),
      { passive: true },
    );

    videoTrack.emitEnded();
    expect(result.stream.value).toBeUndefined();
    expect(result.enabled.value).toBeFalsy();
    scope.stop();
  });

  it('toggling enabled starts and stops the stream', async () => {
    const { navigator, getDisplayMedia, videoTrack } = stubDisplayMedia();
    const { result, scope } = host(() => useDisplayMedia({ navigator }));

    result.enabled.value = true;
    await nextTick();
    await vi.waitFor(() => expect(result.stream.value).toBeTruthy());
    expect(getDisplayMedia).toHaveBeenCalledTimes(1);

    result.enabled.value = false;
    await nextTick();
    expect(videoTrack.stop).toHaveBeenCalled();
    expect(result.stream.value).toBeUndefined();
    scope.stop();
  });

  it('starts immediately when enabled is true on init', async () => {
    const { navigator, getDisplayMedia } = stubDisplayMedia();
    const { result, scope } = host(() => useDisplayMedia({ navigator, enabled: true }));

    await vi.waitFor(() => expect(getDisplayMedia).toHaveBeenCalled());
    expect(result.enabled.value).toBeTruthy();
    scope.stop();
  });

  it('does not re-request when a stream is already running', async () => {
    const { navigator, getDisplayMedia } = stubDisplayMedia();
    const { result, scope } = host(() => useDisplayMedia({ navigator }));

    await result.start();
    await result.start();
    expect(getDisplayMedia).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it('dedupes concurrent start() calls', async () => {
    const { navigator, getDisplayMedia } = stubDisplayMedia();
    const { result, scope } = host(() => useDisplayMedia({ navigator }));

    await Promise.all([result.start(), result.start()]);
    expect(getDisplayMedia).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it('reports getDisplayMedia rejection via onError and stays disabled', async () => {
    const onError = vi.fn();
    const { navigator, getDisplayMedia } = stubDisplayMedia();
    (getDisplayMedia as any).mockRejectedValueOnce(new Error('cancelled'));
    const { result, scope } = host(() => useDisplayMedia({ navigator, onError }));

    const returned = await result.start();
    expect(returned).toBeUndefined();
    expect(onError).toHaveBeenCalled();
    expect(result.stream.value).toBeUndefined();
    expect(result.enabled.value).toBeFalsy();
    scope.stop();
  });
});
