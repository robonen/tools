import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { usePreferredReducedMotion } from '.';

describe(usePreferredReducedMotion, () => {
  beforeEach(() => vi.stubGlobal('matchMedia', undefined));
  afterEach(() => vi.unstubAllGlobals());

  it('resolves to "reduce" when the query matches', async () => {
    vi.stubGlobal('matchMedia', vi.fn((media: string) => ({
      matches: media.includes('reduce'),
      media,
      addEventListener: () => {},
      removeEventListener: () => {},
    })));

    const scope = effectScope();
    let motion: ReturnType<typeof usePreferredReducedMotion>;
    scope.run(() => {
      motion = usePreferredReducedMotion();
    });
    await nextTick();

    expect(motion!.value).toBe('reduce');
    scope.stop();
  });

  it('resolves to "no-preference" when the query does not match', async () => {
    vi.stubGlobal('matchMedia', vi.fn((media: string) => ({
      matches: false,
      media,
      addEventListener: () => {},
      removeEventListener: () => {},
    })));

    const scope = effectScope();
    let motion: ReturnType<typeof usePreferredReducedMotion>;
    scope.run(() => {
      motion = usePreferredReducedMotion();
    });
    await nextTick();

    expect(motion!.value).toBe('no-preference');
    scope.stop();
  });

  it('reacts to media query changes', async () => {
    const listeners = new Set<(event: { matches: boolean }) => void>();
    let currentMatches = false;

    vi.stubGlobal('matchMedia', vi.fn((media: string) => ({
      get matches() {
        return currentMatches;
      },
      media,
      addEventListener: (_: string, handler: (event: { matches: boolean }) => void) => listeners.add(handler),
      removeEventListener: (_: string, handler: (event: { matches: boolean }) => void) => listeners.delete(handler),
    })));

    const scope = effectScope();
    let motion: ReturnType<typeof usePreferredReducedMotion>;
    scope.run(() => {
      motion = usePreferredReducedMotion();
    });
    await nextTick();

    expect(motion!.value).toBe('no-preference');

    currentMatches = true;
    listeners.forEach(handler => handler({ matches: true }));
    await nextTick();

    expect(motion!.value).toBe('reduce');
    scope.stop();
  });

  it('falls back to "no-preference" when matchMedia is unsupported (SSR)', async () => {
    // matchMedia is left undefined from beforeEach.
    const scope = effectScope();
    let motion: ReturnType<typeof usePreferredReducedMotion>;
    scope.run(() => {
      motion = usePreferredReducedMotion();
    });
    await nextTick();

    expect(motion!.value).toBe('no-preference');
    scope.stop();
  });

  it('returns "no-preference" when window is explicitly undefined (SSR)', async () => {
    const scope = effectScope();
    let motion: ReturnType<typeof usePreferredReducedMotion>;
    scope.run(() => {
      motion = usePreferredReducedMotion({ window: undefined });
    });
    await nextTick();

    expect(motion!.value).toBe('no-preference');
    scope.stop();
  });
});
