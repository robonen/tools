import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { usePreferredContrast } from '.';

function stubMatchMedia(matching: string): void {
  vi.stubGlobal('matchMedia', vi.fn((media: string) => ({
    matches: media.includes(matching),
    media,
    addEventListener: () => {},
    removeEventListener: () => {},
  })));
}

describe(usePreferredContrast, () => {
  beforeEach(() => vi.stubGlobal('matchMedia', undefined));
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ['more'],
    ['less'],
    ['custom'],
    ['no-preference'],
  ] as const)('resolves the "%s" contrast preference', async (preference) => {
    stubMatchMedia(`prefers-contrast: ${preference}`);

    const scope = effectScope();
    let contrast: ReturnType<typeof usePreferredContrast>;
    scope.run(() => {
      contrast = usePreferredContrast();
    });
    await nextTick();

    expect(contrast!.value).toBe(preference);
    scope.stop();
  });

  it('prioritizes "more" over the other preferences', async () => {
    // Match everything; the resolution order must win.
    vi.stubGlobal('matchMedia', vi.fn((media: string) => ({
      matches: true,
      media,
      addEventListener: () => {},
      removeEventListener: () => {},
    })));

    const scope = effectScope();
    let contrast: ReturnType<typeof usePreferredContrast>;
    scope.run(() => {
      contrast = usePreferredContrast();
    });
    await nextTick();

    expect(contrast!.value).toBe('more');
    scope.stop();
  });

  it('falls back to "no-preference" when matchMedia is unsupported (SSR)', async () => {
    // matchMedia is undefined (stubbed in beforeEach).
    const scope = effectScope();
    let contrast: ReturnType<typeof usePreferredContrast>;
    scope.run(() => {
      contrast = usePreferredContrast();
    });
    await nextTick();

    expect(contrast!.value).toBe('no-preference');
    scope.stop();
  });

  it('honors a custom ssrContrast fallback when unsupported', async () => {
    const scope = effectScope();
    let contrast: ReturnType<typeof usePreferredContrast>;
    scope.run(() => {
      contrast = usePreferredContrast({ ssrContrast: 'more' });
    });
    await nextTick();

    expect(contrast!.value).toBe('more');
    scope.stop();
  });

  it('returns "no-preference" with no window provided', async () => {
    const scope = effectScope();
    let contrast: ReturnType<typeof usePreferredContrast>;
    scope.run(() => {
      contrast = usePreferredContrast({ window: undefined });
    });
    await nextTick();

    expect(contrast!.value).toBe('no-preference');
    scope.stop();
  });
});
