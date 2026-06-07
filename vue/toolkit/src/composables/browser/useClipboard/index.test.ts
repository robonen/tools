import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import type { UseClipboardReturn } from '.';
import { useClipboard } from '.';

function stubClipboard() {
  const writeText = vi.fn(async () => {});
  const readText = vi.fn(async () => 'pasted');
  const navigator = {
    clipboard: { writeText, readText },
  } as unknown as Navigator;
  return { navigator, writeText, readText };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe(useClipboard, () => {
  it('reports support when the clipboard API exists', () => {
    const { navigator } = stubClipboard();
    const scope = effectScope();
    let clip: UseClipboardReturn<false>;
    scope.run(() => {
      clip = useClipboard({ navigator });
    });
    expect(clip!.isSupported.value).toBeTruthy();
    scope.stop();
  });

  it('is not supported without the clipboard API', () => {
    const navigator = {} as unknown as Navigator;
    const scope = effectScope();
    let clip: UseClipboardReturn<false>;
    scope.run(() => {
      clip = useClipboard({ navigator });
    });
    expect(clip!.isSupported.value).toBeFalsy();
    scope.stop();
  });

  it('copies text and sets copied flag', async () => {
    const { navigator, writeText } = stubClipboard();
    const scope = effectScope();
    let clip: UseClipboardReturn<false>;
    scope.run(() => {
      clip = useClipboard({ navigator });
    });

    await clip!.copy('hello');
    expect(writeText).toHaveBeenCalledWith('hello');
    expect(clip!.text.value).toBe('hello');
    expect(clip!.copied.value).toBeTruthy();
    scope.stop();
  });

  it('copies the configured source when called without args', async () => {
    const { navigator, writeText } = stubClipboard();
    const scope = effectScope();
    let clip: any;
    scope.run(() => {
      clip = useClipboard({ navigator, source: 'from-source' });
    });

    await clip.copy();
    expect(writeText).toHaveBeenCalledWith('from-source');
    scope.stop();
  });

  it('copies a value resolved from an async getter', async () => {
    const { navigator, writeText } = stubClipboard();
    const scope = effectScope();
    let clip: UseClipboardReturn<false>;
    scope.run(() => {
      clip = useClipboard({ navigator });
    });

    await clip!.copy(async () => 'lazy');
    expect(writeText).toHaveBeenCalledWith('lazy');
    expect(clip!.text.value).toBe('lazy');
    scope.stop();
  });

  it('skips when an async getter resolves to null', async () => {
    const { navigator, writeText } = stubClipboard();
    const scope = effectScope();
    let clip: UseClipboardReturn<false>;
    scope.run(() => {
      clip = useClipboard({ navigator });
    });

    await clip!.copy(async () => undefined);
    expect(writeText).not.toHaveBeenCalled();
    expect(clip!.copied.value).toBeFalsy();
    scope.stop();
  });

  it('exposes copyPending around an in-flight async copy', async () => {
    const { navigator } = stubClipboard();
    const scope = effectScope();
    let clip: UseClipboardReturn<false>;
    scope.run(() => {
      clip = useClipboard({ navigator });
    });

    let release: (v: string) => void = () => {};
    const promise = clip!.copy(() => new Promise<string>((resolve) => {
      release = resolve;
    }));
    expect(clip!.copyPending.value).toBeTruthy();
    release('done');
    await promise;
    expect(clip!.copyPending.value).toBeFalsy();
    expect(clip!.text.value).toBe('done');
    scope.stop();
  });

  it('ignores a stale async copy superseded by a newer one', async () => {
    const { navigator, writeText } = stubClipboard();
    const scope = effectScope();
    let clip: UseClipboardReturn<false>;
    scope.run(() => {
      clip = useClipboard({ navigator });
    });

    let releaseSlow: (v: string) => void = () => {};
    const slow = clip!.copy(() => new Promise<string>((resolve) => {
      releaseSlow = resolve;
    }));
    const fast = clip!.copy(async () => 'fast');
    await fast;
    releaseSlow('slow');
    await slow;

    expect(clip!.text.value).toBe('fast');
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith('fast');
    scope.stop();
  });

  it('does nothing when unsupported', async () => {
    const navigator = {} as unknown as Navigator;
    const scope = effectScope();
    let clip: UseClipboardReturn<false>;
    scope.run(() => {
      clip = useClipboard({ navigator });
    });

    await clip!.copy('x');
    expect(clip!.copied.value).toBeFalsy();
    scope.stop();
  });

  it('syncs text on copy/cut events when read is enabled', async () => {
    const { navigator, readText } = stubClipboard();
    const scope = effectScope();
    let clip: UseClipboardReturn<false>;
    scope.run(() => {
      clip = useClipboard({ navigator, read: true });
    });

    globalThis.dispatchEvent(new Event('copy'));
    await nextTick();
    await Promise.resolve();
    expect(readText).toHaveBeenCalled();
    expect(clip!.text.value).toBe('pasted');
    scope.stop();
  });
});
