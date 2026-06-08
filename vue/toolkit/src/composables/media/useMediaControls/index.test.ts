import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, shallowRef } from 'vue';
import type { UseMediaControlsReturn } from '.';
import { useMediaControls } from '.';

/**
 * A minimal fake HTMLMediaElement backed by a real EventTarget so
 * useEventListener can attach/dispatch, with the props the composable touches.
 */
class FakeMediaElement extends EventTarget {
  currentTime = 0;
  duration = 0;
  volume = 1;
  muted = false;
  playbackRate = 1;
  buffered = { length: 0, start: () => 0, end: () => 0 } as unknown as TimeRanges;
  textTracks = makeTextTrackList();

  play = vi.fn(() => Promise.resolve());
  pause = vi.fn(() => {});
  load = vi.fn(() => {});
  requestPictureInPicture = vi.fn(() => Promise.resolve({} as PictureInPictureWindow));

  // Source/track injection paths
  private children: any[] = [];
  appendChild = vi.fn((node: any) => {
    this.children.push(node);
    return node;
  });

  querySelectorAll = vi.fn((selector: string) => {
    const tag = selector.toLowerCase();
    return this.children.filter(c => c.tagName?.toLowerCase() === tag);
  });

  emit(type: string): void {
    this.dispatchEvent(new Event(type));
  }
}

function makeTextTrackList(modes: TextTrackMode[] = ['disabled', 'disabled']): TextTrackList {
  const list = modes.map((mode, id) => ({
    id,
    label: `Track ${id}`,
    language: 'en',
    mode,
    kind: 'subtitles' as TextTrackKind,
    inBandMetadataTrackDispatchType: '',
    cues: null,
    activeCues: null,
  }));
  const target = new EventTarget();
  return new Proxy(list, {
    get(t, prop) {
      if (prop === 'length')
        return t.length;
      if (prop === 'addEventListener' || prop === 'removeEventListener' || prop === 'dispatchEvent')
        return (target as any)[prop].bind(target);
      return (t as any)[prop];
    },
  }) as unknown as TextTrackList;
}

function makeDocument(supportsPip = true): Document {
  const doc: any = {
    createElement: vi.fn((tag: string) => {
      const el: any = new EventTarget();
      el.tagName = tag.toUpperCase();
      el.setAttribute = vi.fn();
      return el;
    }),
    exitPictureInPicture: vi.fn(() => Promise.resolve()),
  };
  if (supportsPip)
    doc.pictureInPictureEnabled = false;
  return doc as Document;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe(useMediaControls, () => {
  it('reports Picture-in-Picture support from the document', () => {
    const el = new FakeMediaElement();
    const scope = effectScope();
    let controls: UseMediaControlsReturn;
    scope.run(() => {
      controls = useMediaControls(shallowRef(el as unknown as HTMLMediaElement), {
        document: makeDocument(true),
      });
    });
    expect(controls!.supportsPictureInPicture).toBeTruthy();
    scope.stop();
  });

  it('does not report Picture-in-Picture support when the document lacks it', () => {
    const el = new FakeMediaElement();
    const scope = effectScope();
    let controls: UseMediaControlsReturn;
    scope.run(() => {
      controls = useMediaControls(shallowRef(el as unknown as HTMLMediaElement), {
        document: makeDocument(false),
      });
    });
    expect(controls!.supportsPictureInPicture).toBeFalsy();
    scope.stop();
  });

  it('is SSR-safe when no document is available', () => {
    const el = new FakeMediaElement();
    const scope = effectScope();
    let controls: UseMediaControlsReturn;
    scope.run(() => {
      controls = useMediaControls(shallowRef(el as unknown as HTMLMediaElement), {
        document: undefined,
      });
    });
    expect(controls!.supportsPictureInPicture).toBeFalsy();
    // Source injection is skipped without a document.
    expect(el.load).not.toHaveBeenCalled();
    scope.stop();
  });

  it('reflects timeupdate into currentTime without re-seeking', async () => {
    const el = new FakeMediaElement();
    const scope = effectScope();
    let controls: UseMediaControlsReturn;
    scope.run(() => {
      controls = useMediaControls(shallowRef(el as unknown as HTMLMediaElement), {
        document: makeDocument(),
      });
    });
    await nextTick();

    el.currentTime = 12.5;
    el.emit('timeupdate');
    await nextTick();

    expect(controls!.currentTime.value).toBe(12.5);
    scope.stop();
  });

  it('seeks the element when currentTime is written', async () => {
    const el = new FakeMediaElement();
    const scope = effectScope();
    let controls: UseMediaControlsReturn;
    scope.run(() => {
      controls = useMediaControls(shallowRef(el as unknown as HTMLMediaElement), {
        document: makeDocument(),
      });
    });
    await nextTick();

    controls!.currentTime.value = 42;
    await nextTick();

    expect(el.currentTime).toBe(42);
    scope.stop();
  });

  it('tracks duration, buffered, seeking, ended, stalled, waiting', async () => {
    const el = new FakeMediaElement();
    const scope = effectScope();
    let controls: UseMediaControlsReturn;
    scope.run(() => {
      controls = useMediaControls(shallowRef(el as unknown as HTMLMediaElement), {
        document: makeDocument(),
      });
    });
    await nextTick();

    el.duration = 100;
    el.emit('durationchange');
    el.buffered = { length: 1, start: () => 0, end: () => 50 } as unknown as TimeRanges;
    el.emit('progress');
    el.emit('seeking');
    el.emit('stalled');
    el.emit('ended');
    el.emit('waiting');
    await nextTick();

    expect(controls!.duration.value).toBe(100);
    expect(controls!.buffered.value).toEqual([[0, 50]]);
    expect(controls!.seeking.value).toBeTruthy();
    expect(controls!.stalled.value).toBeTruthy();
    expect(controls!.ended.value).toBeTruthy();
    expect(controls!.waiting.value).toBeTruthy();

    el.emit('seeked');
    el.emit('loadeddata');
    await nextTick();
    expect(controls!.seeking.value).toBeFalsy();
    expect(controls!.waiting.value).toBeFalsy();
    scope.stop();
  });

  it('plays and pauses through the playing ref', async () => {
    const el = new FakeMediaElement();
    const scope = effectScope();
    let controls: UseMediaControlsReturn;
    scope.run(() => {
      controls = useMediaControls(shallowRef(el as unknown as HTMLMediaElement), {
        document: makeDocument(),
      });
    });
    await nextTick();

    controls!.playing.value = true;
    await nextTick();
    expect(el.play).toHaveBeenCalled();

    controls!.playing.value = false;
    await nextTick();
    expect(el.pause).toHaveBeenCalled();
    scope.stop();
  });

  it('reflects play/pause events into playing without re-calling play()', async () => {
    const el = new FakeMediaElement();
    const scope = effectScope();
    let controls: UseMediaControlsReturn;
    scope.run(() => {
      controls = useMediaControls(shallowRef(el as unknown as HTMLMediaElement), {
        document: makeDocument(),
      });
    });
    await nextTick();

    el.emit('play');
    await nextTick();
    expect(controls!.playing.value).toBeTruthy();
    expect(el.play).not.toHaveBeenCalled();

    el.emit('pause');
    await nextTick();
    expect(controls!.playing.value).toBeFalsy();
    expect(el.pause).not.toHaveBeenCalled();
    scope.stop();
  });

  it('surfaces playback errors via onPlaybackError and onError', async () => {
    const el = new FakeMediaElement();
    const boom = new Error('cannot play');
    el.play = vi.fn(() => Promise.reject(boom));
    const onError = vi.fn();
    const onPlayback = vi.fn();

    const scope = effectScope();
    let controls: UseMediaControlsReturn;
    scope.run(() => {
      controls = useMediaControls(shallowRef(el as unknown as HTMLMediaElement), {
        document: makeDocument(),
        onError,
      });
    });
    controls!.onPlaybackError(onPlayback);
    await nextTick();

    controls!.playing.value = true;
    await nextTick();
    await Promise.resolve();
    await Promise.resolve();

    expect(onPlayback).toHaveBeenCalledWith(boom);
    expect(onError).toHaveBeenCalledWith(boom);
    scope.stop();
  });

  it('pushes volume, muted and rate to the element', async () => {
    const el = new FakeMediaElement();
    const scope = effectScope();
    let controls: UseMediaControlsReturn;
    scope.run(() => {
      controls = useMediaControls(shallowRef(el as unknown as HTMLMediaElement), {
        document: makeDocument(),
      });
    });
    await nextTick();

    controls!.volume.value = 0.3;
    controls!.muted.value = true;
    controls!.rate.value = 1.5;
    await nextTick();

    expect(el.volume).toBe(0.3);
    expect(el.muted).toBeTruthy();
    expect(el.playbackRate).toBe(1.5);
    // playbackRate alias is the same ref as rate
    expect(controls!.playbackRate).toBe(controls!.rate);
    scope.stop();
  });

  it('reads volume and muted back from a volumechange event', async () => {
    const el = new FakeMediaElement();
    const scope = effectScope();
    let controls: UseMediaControlsReturn;
    scope.run(() => {
      controls = useMediaControls(shallowRef(el as unknown as HTMLMediaElement), {
        document: makeDocument(),
      });
    });
    await nextTick();

    el.volume = 0.8;
    el.muted = true;
    el.emit('volumechange');
    await nextTick();

    expect(controls!.volume.value).toBe(0.8);
    expect(controls!.muted.value).toBeTruthy();
    scope.stop();
  });

  it('injects sources and loads the element', async () => {
    const el = new FakeMediaElement();
    const document = makeDocument();
    const scope = effectScope();
    scope.run(() => {
      useMediaControls(shallowRef(el as unknown as HTMLMediaElement), {
        document,
        src: 'https://example.com/clip.mp4',
      });
    });
    await nextTick();

    expect(document.createElement).toHaveBeenCalledWith('source');
    expect(el.appendChild).toHaveBeenCalled();
    expect(el.load).toHaveBeenCalled();
    scope.stop();
  });

  it('injects a list of sources', async () => {
    const el = new FakeMediaElement();
    const document = makeDocument();
    const scope = effectScope();
    scope.run(() => {
      useMediaControls(shallowRef(el as unknown as HTMLMediaElement), {
        document,
        src: [
          { src: 'a.webm', type: 'video/webm' },
          { src: 'b.mp4', type: 'video/mp4' },
        ],
      });
    });
    await nextTick();

    expect(document.createElement).toHaveBeenCalledTimes(2);
    scope.stop();
  });

  it('injects text tracks and selects the default', async () => {
    const el = new FakeMediaElement();
    const document = makeDocument();
    const scope = effectScope();
    let controls: UseMediaControlsReturn;
    scope.run(() => {
      controls = useMediaControls(shallowRef(el as unknown as HTMLMediaElement), {
        document,
        tracks: [
          { src: 'en.vtt', srcLang: 'en', label: 'English', kind: 'subtitles' },
          { default: true, src: 'fr.vtt', srcLang: 'fr', label: 'French', kind: 'subtitles' },
        ],
      });
    });
    await nextTick();

    expect(document.createElement).toHaveBeenCalledWith('track');
    expect(controls!.selectedTrack.value).toBe(1);
    scope.stop();
  });

  it('enables and disables text tracks', async () => {
    const el = new FakeMediaElement();
    const scope = effectScope();
    let controls: UseMediaControlsReturn;
    scope.run(() => {
      controls = useMediaControls(shallowRef(el as unknown as HTMLMediaElement), {
        document: makeDocument(),
      });
    });
    await nextTick();

    controls!.enableTrack(1);
    expect(el.textTracks[1]!.mode).toBe('showing');
    expect(el.textTracks[0]!.mode).toBe('disabled');
    expect(controls!.selectedTrack.value).toBe(1);

    controls!.disableTrack(1);
    expect(el.textTracks[1]!.mode).toBe('disabled');
    expect(controls!.selectedTrack.value).toBe(-1);

    controls!.enableTrack(0, false);
    expect(el.textTracks[0]!.mode).toBe('showing');

    controls!.disableTrack();
    expect(el.textTracks[0]!.mode).toBe('disabled');
    expect(controls!.selectedTrack.value).toBe(-1);
    scope.stop();
  });

  it('syncs tracks on addtrack/change/removetrack events', async () => {
    const el = new FakeMediaElement();
    const scope = effectScope();
    let controls: UseMediaControlsReturn;
    scope.run(() => {
      controls = useMediaControls(shallowRef(el as unknown as HTMLMediaElement), {
        document: makeDocument(),
      });
    });
    await nextTick();

    (el.textTracks as unknown as EventTarget).dispatchEvent(new Event('addtrack'));
    await nextTick();

    expect(controls!.tracks.value).toHaveLength(2);
    expect(controls!.tracks.value[0]).toMatchObject({ id: 0, label: 'Track 0', kind: 'subtitles' });
    scope.stop();
  });

  it('toggles Picture-in-Picture and reflects enter/leave events', async () => {
    const el = new FakeMediaElement();
    const document = makeDocument(true);
    const scope = effectScope();
    let controls: UseMediaControlsReturn;
    scope.run(() => {
      controls = useMediaControls(shallowRef(el as unknown as HTMLMediaElement), {
        document,
      });
    });
    await nextTick();

    await controls!.togglePictureInPicture();
    expect(el.requestPictureInPicture).toHaveBeenCalled();

    el.emit('enterpictureinpicture');
    await nextTick();
    expect(controls!.isPictureInPicture.value).toBeTruthy();

    await controls!.togglePictureInPicture();
    expect(document.exitPictureInPicture).toHaveBeenCalled();

    el.emit('leavepictureinpicture');
    await nextTick();
    expect(controls!.isPictureInPicture.value).toBeFalsy();
    scope.stop();
  });

  it('resolves togglePictureInPicture to a no-op when unsupported', async () => {
    const el = new FakeMediaElement();
    const scope = effectScope();
    let controls: UseMediaControlsReturn;
    scope.run(() => {
      controls = useMediaControls(shallowRef(el as unknown as HTMLMediaElement), {
        document: makeDocument(false),
      });
    });
    await nextTick();

    await expect(controls!.togglePictureInPicture()).resolves.toBeUndefined();
    expect(el.requestPictureInPicture).not.toHaveBeenCalled();
    scope.stop();
  });

  it('emits onSourceError when a source errors', async () => {
    const el = new FakeMediaElement();
    const created: any[] = [];
    const document: any = {
      createElement: vi.fn((tag: string) => {
        const node = new EventTarget() as any;
        node.tagName = tag.toUpperCase();
        node.setAttribute = vi.fn();
        created.push(node);
        return node;
      }),
      exitPictureInPicture: vi.fn(() => Promise.resolve()),
      pictureInPictureEnabled: false,
    };
    const onSource = vi.fn();
    const scope = effectScope();
    let controls: UseMediaControlsReturn;
    scope.run(() => {
      controls = useMediaControls(shallowRef(el as unknown as HTMLMediaElement), {
        document: document as Document,
        src: 'broken.mp4',
      });
    });
    controls!.onSourceError(onSource);
    await nextTick();

    created[0].dispatchEvent(new Event('error'));
    expect(onSource).toHaveBeenCalled();
    scope.stop();
  });

  it('does nothing when target is null', async () => {
    const scope = effectScope();
    let controls: UseMediaControlsReturn;
    scope.run(() => {
      controls = useMediaControls(shallowRef(null), {
        document: makeDocument(),
      });
    });
    await nextTick();

    expect(controls!.duration.value).toBe(0);
    expect(() => controls!.disableTrack()).not.toThrow();
    expect(() => controls!.enableTrack(0)).not.toThrow();
    await expect(controls!.togglePictureInPicture()).resolves.toBeUndefined();
    scope.stop();
  });
});
