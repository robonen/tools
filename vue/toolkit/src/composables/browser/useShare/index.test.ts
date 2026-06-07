import { describe, expect, it, vi } from 'vitest';
import { effectScope, ref } from 'vue';
import { useShare } from '.';
import type { UseShareOptions } from '.';

function stubShareNavigator(canShareResult = true) {
  const share = vi.fn(async (_data?: UseShareOptions) => {});
  const canShare = vi.fn((_data?: UseShareOptions) => canShareResult);
  const navigator = { share, canShare } as unknown as Navigator;
  return { navigator, share, canShare };
}

function withScope<T>(fn: () => T): { result: T; stop: () => void } {
  const scope = effectScope();
  let result!: T;
  scope.run(() => {
    result = fn();
  });
  return { result, stop: () => scope.stop() };
}

describe(useShare, () => {
  it('reports supported when the Web Share API is present', () => {
    const { navigator } = stubShareNavigator();
    const { result, stop } = withScope(() => useShare({}, { navigator }));
    expect(result.isSupported.value).toBeTruthy();
    stop();
  });

  it('reports unsupported when canShare is missing', () => {
    const navigator = {} as Navigator;
    const { result, stop } = withScope(() => useShare({}, { navigator }));
    expect(result.isSupported.value).toBeFalsy();
    stop();
  });

  it('calls navigator.share with the default share options', async () => {
    const { navigator, share, canShare } = stubShareNavigator();
    const data = { title: 'Hello', text: 'World', url: 'https://example.com' };
    const { result, stop } = withScope(() => useShare(data, { navigator }));

    await result.share();

    expect(canShare).toHaveBeenCalledWith(data);
    expect(share).toHaveBeenCalledWith(data);
    stop();
  });

  it('merges overrideData over the default options', async () => {
    const { navigator, share } = stubShareNavigator();
    const { result, stop } = withScope(() =>
      useShare({ title: 'Default', text: 'Default text' }, { navigator }),
    );

    await result.share({ text: 'Override text', url: 'https://override.dev' });

    expect(share).toHaveBeenCalledWith({
      title: 'Default',
      text: 'Override text',
      url: 'https://override.dev',
    });
    stop();
  });

  it('resolves reactive/getter share options at call time', async () => {
    const { navigator, share } = stubShareNavigator();
    const title = ref('first');
    const { result, stop } = withScope(() => useShare(() => ({ title: title.value }), { navigator }));

    await result.share();
    expect(share).toHaveBeenLastCalledWith({ title: 'first' });

    title.value = 'second';
    await result.share();
    expect(share).toHaveBeenLastCalledWith({ title: 'second' });
    stop();
  });

  it('does not call share when canShare rejects the payload', async () => {
    const { navigator, share, canShare } = stubShareNavigator(false);
    const { result, stop } = withScope(() => useShare({ title: 'Nope' }, { navigator }));

    await result.share();

    expect(canShare).toHaveBeenCalled();
    expect(share).not.toHaveBeenCalled();
    stop();
  });

  it('skips canShare gating when canShare is unavailable', async () => {
    const share = vi.fn(async () => {});
    // No canShare -> isSupported is false, so share is a no-op.
    const navigator = { share } as unknown as Navigator;
    const { result, stop } = withScope(() => useShare({ title: 'Hi' }, { navigator }));

    expect(result.isSupported.value).toBeFalsy();
    await result.share();
    expect(share).not.toHaveBeenCalled();
    stop();
  });

  it('is a no-op when unsupported (SSR / missing navigator)', async () => {
    const navigator = undefined as unknown as Navigator;
    const { result, stop } = withScope(() => useShare({ title: 'Hi' }, { navigator }));

    expect(result.isSupported.value).toBeFalsy();
    await expect(result.share()).resolves.toBeUndefined();
    stop();
  });

  it('returns the share promise from navigator.share', async () => {
    const { navigator, share } = stubShareNavigator();
    share.mockResolvedValueOnce(undefined);
    const { result, stop } = withScope(() => useShare({ title: 'Hi' }, { navigator }));

    await expect(result.share()).resolves.toBeUndefined();
    stop();
  });
});
