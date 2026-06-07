import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { usePreferredColorScheme } from '.';

function stubScheme(scheme: 'dark' | 'light' | 'none') {
  vi.stubGlobal('matchMedia', vi.fn((media: string) => ({
    matches: scheme !== 'none' && media.includes(scheme),
    media,
    addEventListener: () => {},
    removeEventListener: () => {},
  })));
}

describe(usePreferredColorScheme, () => {
  beforeEach(() => vi.stubGlobal('matchMedia', undefined));
  afterEach(() => vi.unstubAllGlobals());

  it('returns dark when dark is preferred', async () => {
    stubScheme('dark');
    const scope = effectScope();
    let scheme: ReturnType<typeof usePreferredColorScheme>;
    scope.run(() => {
      scheme = usePreferredColorScheme();
    });
    await nextTick();
    expect(scheme!.value).toBe('dark');
    scope.stop();
  });

  it('returns light when light is preferred', async () => {
    stubScheme('light');
    const scope = effectScope();
    let scheme: ReturnType<typeof usePreferredColorScheme>;
    scope.run(() => {
      scheme = usePreferredColorScheme();
    });
    await nextTick();
    expect(scheme!.value).toBe('light');
    scope.stop();
  });

  it('returns no-preference when neither matches', async () => {
    stubScheme('none');
    const scope = effectScope();
    let scheme: ReturnType<typeof usePreferredColorScheme>;
    scope.run(() => {
      scheme = usePreferredColorScheme();
    });
    await nextTick();
    expect(scheme!.value).toBe('no-preference');
    scope.stop();
  });
});
