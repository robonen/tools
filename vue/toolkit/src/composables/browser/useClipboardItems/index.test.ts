import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import type { UseClipboardItemsReturn } from '.';
import { useClipboardItems } from '.';

function makeItems(label: string): ClipboardItems {
  // jsdom may lack ClipboardItem; a tagged plain object is enough for assertions.
  return [{ types: [label] } as unknown as ClipboardItem];
}

function stubClipboard(readItems: ClipboardItems = makeItems('read')) {
  const write = vi.fn(async () => {});
  const read = vi.fn(async () => readItems);
  const navigator = {
    clipboard: { write, read },
  } as unknown as Navigator;
  return { navigator, write, read };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe(useClipboardItems, () => {
  it('reports support when the clipboard API exists', () => {
    const { navigator } = stubClipboard();
    const scope = effectScope();
    let clip: UseClipboardItemsReturn<false>;
    scope.run(() => {
      clip = useClipboardItems({ navigator });
    });
    expect(clip!.isSupported.value).toBeTruthy();
    scope.stop();
  });

  it('is not supported without the clipboard API', () => {
    const navigator = {} as unknown as Navigator;
    const scope = effectScope();
    let clip: UseClipboardItemsReturn<false>;
    scope.run(() => {
      clip = useClipboardItems({ navigator });
    });
    expect(clip!.isSupported.value).toBeFalsy();
    scope.stop();
  });

  it('is not supported when navigator is undefined (SSR)', () => {
    const scope = effectScope();
    let clip: UseClipboardItemsReturn<false>;
    scope.run(() => {
      clip = useClipboardItems({ navigator: undefined });
    });
    expect(clip!.isSupported.value).toBeFalsy();
    scope.stop();
  });

  it('copies items and sets copied flag', async () => {
    const { navigator, write } = stubClipboard();
    const items = makeItems('copy');
    const scope = effectScope();
    let clip: UseClipboardItemsReturn<false>;
    scope.run(() => {
      clip = useClipboardItems({ navigator });
    });

    await clip!.copy(items);
    expect(write).toHaveBeenCalledWith(items);
    expect(clip!.content.value).toBe(items);
    expect(clip!.copied.value).toBeTruthy();
    scope.stop();
  });

  it('copies the configured source when called without args', async () => {
    const { navigator, write } = stubClipboard();
    const items = makeItems('source');
    const scope = effectScope();
    let clip: any;
    scope.run(() => {
      clip = useClipboardItems({ navigator, source: items });
    });

    await clip.copy();
    expect(write).toHaveBeenCalledWith(items);
    scope.stop();
  });

  it('copies a value resolved from an async getter', async () => {
    const { navigator, write } = stubClipboard();
    const items = makeItems('lazy');
    const scope = effectScope();
    let clip: UseClipboardItemsReturn<false>;
    scope.run(() => {
      clip = useClipboardItems({ navigator });
    });

    await clip!.copy(async () => items);
    expect(write).toHaveBeenCalledWith(items);
    expect(clip!.content.value).toBe(items);
    scope.stop();
  });

  it('skips when an async getter resolves to undefined', async () => {
    const { navigator, write } = stubClipboard();
    const scope = effectScope();
    let clip: UseClipboardItemsReturn<false>;
    scope.run(() => {
      clip = useClipboardItems({ navigator });
    });

    await clip!.copy(async () => undefined);
    expect(write).not.toHaveBeenCalled();
    expect(clip!.copied.value).toBeFalsy();
    scope.stop();
  });

  it('exposes copyPending around an in-flight async copy', async () => {
    const { navigator } = stubClipboard();
    const items = makeItems('done');
    const scope = effectScope();
    let clip: UseClipboardItemsReturn<false>;
    scope.run(() => {
      clip = useClipboardItems({ navigator });
    });

    let release: (v: ClipboardItems) => void = () => {};
    const promise = clip!.copy(() => new Promise<ClipboardItems>((resolve) => {
      release = resolve;
    }));
    expect(clip!.copyPending.value).toBeTruthy();
    release(items);
    await promise;
    expect(clip!.copyPending.value).toBeFalsy();
    expect(clip!.content.value).toBe(items);
    scope.stop();
  });

  it('ignores a stale async copy superseded by a newer one', async () => {
    const { navigator, write } = stubClipboard();
    const fastItems = makeItems('fast');
    const slowItems = makeItems('slow');
    const scope = effectScope();
    let clip: UseClipboardItemsReturn<false>;
    scope.run(() => {
      clip = useClipboardItems({ navigator });
    });

    let releaseSlow: (v: ClipboardItems) => void = () => {};
    const slow = clip!.copy(() => new Promise<ClipboardItems>((resolve) => {
      releaseSlow = resolve;
    }));
    const fast = clip!.copy(async () => fastItems);
    await fast;
    releaseSlow(slowItems);
    await slow;

    expect(clip!.content.value).toBe(fastItems);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(fastItems);
    scope.stop();
  });

  it('does nothing when unsupported', async () => {
    const navigator = {} as unknown as Navigator;
    const scope = effectScope();
    let clip: UseClipboardItemsReturn<false>;
    scope.run(() => {
      clip = useClipboardItems({ navigator });
    });

    await clip!.copy(makeItems('x'));
    expect(clip!.copied.value).toBeFalsy();
    scope.stop();
  });

  it('reads the clipboard via read()', async () => {
    const readItems = makeItems('from-clipboard');
    const { navigator, read } = stubClipboard(readItems);
    const scope = effectScope();
    let clip: UseClipboardItemsReturn<false>;
    scope.run(() => {
      clip = useClipboardItems({ navigator });
    });

    await clip!.read();
    expect(read).toHaveBeenCalled();
    expect(clip!.content.value).toBe(readItems);
    scope.stop();
  });

  it('syncs content on copy/cut events when read is enabled', async () => {
    const readItems = makeItems('synced');
    const { navigator, read } = stubClipboard(readItems);
    const scope = effectScope();
    let clip: UseClipboardItemsReturn<false>;
    scope.run(() => {
      clip = useClipboardItems({ navigator, read: true });
    });

    globalThis.dispatchEvent(new Event('copy'));
    await nextTick();
    await Promise.resolve();
    expect(read).toHaveBeenCalled();
    expect(clip!.content.value).toBe(readItems);
    scope.stop();
  });

  it('routes a rejected write to onError instead of throwing', async () => {
    const error = new Error('denied');
    const write = vi.fn(async () => {
      throw error;
    });
    const navigator = {
      clipboard: { write, read: vi.fn() },
    } as unknown as Navigator;
    const onError = vi.fn();
    const scope = effectScope();
    let clip: UseClipboardItemsReturn<false>;
    scope.run(() => {
      clip = useClipboardItems({ navigator, onError });
    });

    await clip!.copy(makeItems('boom'));
    expect(onError).toHaveBeenCalledWith(error);
    expect(clip!.copied.value).toBeFalsy();
    expect(clip!.copyPending.value).toBeFalsy();
    scope.stop();
  });
});
