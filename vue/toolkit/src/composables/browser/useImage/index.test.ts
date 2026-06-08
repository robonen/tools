import { effectScope, nextTick, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useImage } from '.';

interface FakeImage {
  src: string;
  srcset: string;
  sizes: string;
  alt: string;
  className: string;
  loading: string;
  crossOrigin: string | null;
  referrerPolicy: string;
  width: number;
  height: number;
  decoding: string;
  fetchPriority: string;
  isMap: boolean;
  useMap: string;
  onload: (() => void) | null;
  onerror: ((err: unknown) => void) | null;
}

let lastImage: FakeImage | undefined;
// Decides whether the next constructed image "loads" or "errors".
let shouldFail = false;

function createImage(): FakeImage {
  const img: FakeImage = {
    src: '',
    srcset: '',
    sizes: '',
    alt: '',
    className: '',
    loading: '',
    crossOrigin: null,
    referrerPolicy: '',
    width: 0,
    height: 0,
    decoding: '',
    fetchPriority: '',
    isMap: false,
    useMap: '',
    onload: null,
    onerror: null,
  };

  lastImage = img;

  // Mimic the browser firing load/error asynchronously after src is set.
  queueMicrotask(() => {
    if (shouldFail)
      img.onerror?.(new Error('load-error'));
    else
      img.onload?.();
  });

  return img;
}

function createFakeWindow(): Window {
  const Image = function Image(): FakeImage {
    return createImage();
  } as unknown as new () => HTMLImageElement;

  return { Image } as unknown as Window;
}

describe(useImage, () => {
  let window: Window;

  beforeEach(() => {
    lastImage = undefined;
    shouldFail = false;
    window = createFakeWindow();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads an image and exposes the element as state', async () => {
    const scope = effectScope();
    let result!: ReturnType<typeof useImage>;
    scope.run(() => {
      result = useImage({ src: '/cat.png' }, { window });
    });

    expect(result.isLoading.value).toBeTruthy();
    expect(result.isReady.value).toBeFalsy();
    expect(result.error.value).toBe(null);

    await nextTick();
    await nextTick();

    expect(result.isLoading.value).toBeFalsy();
    expect(result.isReady.value).toBeTruthy();
    expect(result.error.value).toBe(null);
    expect(result.state.value).toBe(lastImage);
    expect(lastImage?.src).toBe('/cat.png');

    scope.stop();
  });

  it('applies the provided image attributes', async () => {
    const scope = effectScope();
    scope.run(() => {
      useImage(
        {
          src: '/cat.png',
          srcset: '/cat-2x.png 2x',
          sizes: '100vw',
          alt: 'a cat',
          class: 'rounded',
          loading: 'lazy',
          crossorigin: 'anonymous',
          referrerPolicy: 'no-referrer',
          width: 320,
          height: 240,
          decoding: 'async',
          fetchPriority: 'high',
          ismap: true,
          usemap: '#map',
        },
        { window },
      );
    });

    await nextTick();
    await nextTick();

    expect(lastImage).toBeDefined();
    expect(lastImage!.src).toBe('/cat.png');
    expect(lastImage!.srcset).toBe('/cat-2x.png 2x');
    expect(lastImage!.sizes).toBe('100vw');
    expect(lastImage!.alt).toBe('a cat');
    expect(lastImage!.className).toBe('rounded');
    expect(lastImage!.loading).toBe('lazy');
    expect(lastImage!.crossOrigin).toBe('anonymous');
    expect(lastImage!.referrerPolicy).toBe('no-referrer');
    expect(lastImage!.width).toBe(320);
    expect(lastImage!.height).toBe(240);
    expect(lastImage!.decoding).toBe('async');
    expect(lastImage!.fetchPriority).toBe('high');
    expect(lastImage!.isMap).toBeTruthy();
    expect(lastImage!.useMap).toBe('#map');

    scope.stop();
  });

  it('captures load errors', async () => {
    shouldFail = true;

    const scope = effectScope();
    let result!: ReturnType<typeof useImage>;
    scope.run(() => {
      result = useImage({ src: '/missing.png' }, { window });
    });

    await nextTick();
    await nextTick();

    expect(result.isLoading.value).toBeFalsy();
    expect(result.isReady.value).toBeFalsy();
    expect(result.error.value).toBeInstanceOf(Error);
    expect(result.state.value).toBe(undefined);

    scope.stop();
  });

  it('reloads when a reactive source changes', async () => {
    const src = ref('/a.png');

    const scope = effectScope();
    let result!: ReturnType<typeof useImage>;
    scope.run(() => {
      result = useImage(() => ({ src: src.value }), { window });
    });

    await nextTick();
    await nextTick();
    expect(lastImage?.src).toBe('/a.png');
    expect(result.isReady.value).toBeTruthy();

    src.value = '/b.png';
    await nextTick();

    // resetOnExecute clears state and flips loading back on
    expect(result.isLoading.value).toBeTruthy();
    expect(result.state.value).toBe(undefined);

    await nextTick();
    await nextTick();
    expect(lastImage?.src).toBe('/b.png');
    expect(result.isReady.value).toBeTruthy();

    scope.stop();
  });

  it('does not set up a watcher for a plain options object', async () => {
    const watchSpy = vi.fn();
    const scope = effectScope();
    scope.run(() => {
      const result = useImage({ src: '/static.png' }, { window });
      // execute is the only thing a reload would call; spy after initial run
      result.execute = watchSpy;
    });

    await nextTick();
    await nextTick();

    expect(watchSpy).not.toHaveBeenCalled();

    scope.stop();
  });

  it('does not call execute immediately when immediate is false', async () => {
    const scope = effectScope();
    let result!: ReturnType<typeof useImage>;
    scope.run(() => {
      result = useImage({ src: '/cat.png' }, { window, immediate: false });
    });

    expect(result.isLoading.value).toBeFalsy();
    expect(lastImage).toBeUndefined();

    await result.execute();
    expect(lastImage?.src).toBe('/cat.png');
    expect(result.isReady.value).toBeTruthy();

    scope.stop();
  });

  it('rejects when no Image constructor is available (SSR path)', async () => {
    const onError = vi.fn();
    // A window without an Image constructor stands in for a non-DOM environment.
    const ssrWindow = {} as unknown as Window;

    const scope = effectScope();
    let result!: ReturnType<typeof useImage>;
    scope.run(() => {
      result = useImage({ src: '/cat.png' }, { window: ssrWindow, onError });
    });

    await nextTick();
    await nextTick();

    expect(result.isReady.value).toBeFalsy();
    expect(result.error.value).toBeInstanceOf(Error);
    expect(onError).toHaveBeenCalledTimes(1);

    scope.stop();
  });
});
