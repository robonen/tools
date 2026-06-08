import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { useLocalFonts } from '.';
import type { FontData, QueryLocalFontsOptions } from '.';

function makeFont(overrides: Partial<FontData> = {}): FontData {
  return {
    postscriptName: 'Arial-BoldMT',
    fullName: 'Arial Bold',
    family: 'Arial',
    style: 'Bold',
    blob: async () => new Blob(),
    ...overrides,
  };
}

/**
 * Build a fake `window` exposing `queryLocalFonts`. Passed through options so it
 * reaches the import-time-captured `defaultWindow` substitute (see test gotcha).
 */
function createWindow(fonts: FontData[] = [makeFont()]) {
  const queryLocalFonts = vi.fn(async (_options?: QueryLocalFontsOptions) => fonts);
  const win = { queryLocalFonts } as unknown as Window & typeof globalThis;

  return { window: win, queryLocalFonts };
}

describe(useLocalFonts, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports supported when queryLocalFonts exists on window', () => {
    const scope = effectScope();
    const { window } = createWindow();

    let result: ReturnType<typeof useLocalFonts>;
    scope.run(() => {
      result = useLocalFonts({ window });
    });

    expect(result!.isSupported.value).toBeTruthy();
    scope.stop();
  });

  it('reports unsupported when the API is absent', () => {
    const scope = effectScope();
    const win = {} as unknown as Window & typeof globalThis;

    let result: ReturnType<typeof useLocalFonts>;
    scope.run(() => {
      result = useLocalFonts({ window: win });
    });

    expect(result!.isSupported.value).toBeFalsy();
    scope.stop();
  });

  it('is SSR safe when window is undefined', async () => {
    const scope = effectScope();

    let result: ReturnType<typeof useLocalFonts>;
    scope.run(() => {
      result = useLocalFonts({ window: undefined as unknown as Window });
    });

    expect(result!.isSupported.value).toBeFalsy();
    await expect(result!.query()).resolves.toBeUndefined();
    scope.stop();
  });

  it('defaults fonts to an empty array', () => {
    const scope = effectScope();
    const { window } = createWindow();

    let result: ReturnType<typeof useLocalFonts>;
    scope.run(() => {
      result = useLocalFonts({ window });
    });

    expect(result!.fonts.value).toEqual([]);
    scope.stop();
  });

  it('populates fonts and returns the list on a successful query', async () => {
    const scope = effectScope();
    const fonts = [makeFont(), makeFont({ postscriptName: 'Times', fullName: 'Times New Roman' })];
    const { window, queryLocalFonts } = createWindow(fonts);

    let result: ReturnType<typeof useLocalFonts>;
    scope.run(() => {
      result = useLocalFonts({ window });
    });

    const returned = await result!.query();

    expect(queryLocalFonts).toHaveBeenCalledTimes(1);
    expect(returned).toEqual(fonts);
    expect(result!.fonts.value).toEqual(fonts);
    scope.stop();
  });

  it('forwards query options to the native API', async () => {
    const scope = effectScope();
    const { window, queryLocalFonts } = createWindow();

    let result: ReturnType<typeof useLocalFonts>;
    scope.run(() => {
      result = useLocalFonts({ window });
    });

    await result!.query({ postscriptNames: ['Arial-BoldMT'] });

    expect(queryLocalFonts).toHaveBeenCalledWith({ postscriptNames: ['Arial-BoldMT'] });
    scope.stop();
  });

  it('stores the error and invokes onError when the query rejects', async () => {
    const scope = effectScope();
    const error = new DOMException('denied', 'NotAllowedError');
    const queryLocalFonts = vi.fn(async () => {
      throw error;
    });
    const win = { queryLocalFonts } as unknown as Window & typeof globalThis;
    const onError = vi.fn();

    let result: ReturnType<typeof useLocalFonts>;
    scope.run(() => {
      result = useLocalFonts({ window: win, onError });
    });

    await expect(result!.query()).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledWith(error);
    expect(result!.error.value).toBe(error);
    expect(result!.fonts.value).toEqual([]);
    scope.stop();
  });

  it('returns undefined and does not call the API when unsupported', async () => {
    const scope = effectScope();
    const win = {} as unknown as Window & typeof globalThis;

    let result: ReturnType<typeof useLocalFonts>;
    scope.run(() => {
      result = useLocalFonts({ window: win });
    });

    await expect(result!.query()).resolves.toBeUndefined();
    scope.stop();
  });
});
