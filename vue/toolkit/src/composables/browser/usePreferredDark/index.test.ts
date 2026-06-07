import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { usePreferredDark } from '.';

describe(usePreferredDark, () => {
  beforeEach(() => vi.stubGlobal('matchMedia', undefined));
  afterEach(() => vi.unstubAllGlobals());

  it('reflects the prefers-color-scheme: dark query', async () => {
    vi.stubGlobal('matchMedia', vi.fn((media: string) => ({
      matches: media.includes('dark'),
      media,
      addEventListener: () => {},
      removeEventListener: () => {},
    })));

    const scope = effectScope();
    let isDark: ReturnType<typeof usePreferredDark>;
    scope.run(() => {
      isDark = usePreferredDark();
    });
    await nextTick();

    expect(isDark!.value).toBeTruthy();
    scope.stop();
  });
});
