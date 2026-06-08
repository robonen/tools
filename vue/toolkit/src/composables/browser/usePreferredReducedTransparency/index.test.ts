import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { usePreferredReducedTransparency } from '.';

describe(usePreferredReducedTransparency, () => {
  beforeEach(() => vi.stubGlobal('matchMedia', undefined));
  afterEach(() => vi.unstubAllGlobals());

  it('resolves to "reduce" when the media query matches', async () => {
    vi.stubGlobal('matchMedia', vi.fn((media: string) => ({
      matches: media.includes('reduce'),
      media,
      addEventListener: () => {},
      removeEventListener: () => {},
    })));

    const scope = effectScope();
    let transparency: ReturnType<typeof usePreferredReducedTransparency>;
    scope.run(() => {
      transparency = usePreferredReducedTransparency();
    });
    await nextTick();

    expect(transparency!.value).toBe('reduce');
    scope.stop();
  });

  it('resolves to "no-preference" when the media query does not match', async () => {
    vi.stubGlobal('matchMedia', vi.fn((media: string) => ({
      matches: false,
      media,
      addEventListener: () => {},
      removeEventListener: () => {},
    })));

    const scope = effectScope();
    let transparency: ReturnType<typeof usePreferredReducedTransparency>;
    scope.run(() => {
      transparency = usePreferredReducedTransparency();
    });
    await nextTick();

    expect(transparency!.value).toBe('no-preference');
    scope.stop();
  });

  it('defaults to "no-preference" when matchMedia is unsupported (SSR)', async () => {
    const scope = effectScope();
    let transparency: ReturnType<typeof usePreferredReducedTransparency>;
    scope.run(() => {
      transparency = usePreferredReducedTransparency({ window: undefined });
    });
    await nextTick();

    expect(transparency!.value).toBe('no-preference');
    scope.stop();
  });
});
