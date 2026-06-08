import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import {
  breakpointsAntDesign,
  breakpointsBootstrapV5,
  breakpointsTailwind,
  breakpointsVuetifyV3,
  useBreakpoints,
} from '.';

type Listener = (event: { matches: boolean }) => void;

interface StubMql {
  readonly matches: boolean;
  media: string;
  addEventListener: (type: string, cb: Listener) => void;
  removeEventListener: (type: string, cb: Listener) => void;
}

/**
 * A `matchMedia` stub backed by a mutable viewport width. It parses
 * `(min-width: Npx)` / `(max-width: Npx)` (optionally joined by `and`) so each
 * query evaluates against the current `width`. Calling `setWidth` re-dispatches
 * `change` to every live MediaQueryList, mimicking a real viewport resize.
 */
function stubViewport(initialWidth: number) {
  let width = initialWidth;
  const lists = new Set<{ media: string; matches: boolean; listeners: Set<Listener> }>();

  function toPx(value: string): number {
    const n = Number.parseFloat(value);
    return /(?:em|rem)$/i.test(value) ? n * 16 : n;
  }

  function evaluate(media: string): boolean {
    return media.split(' and ').every((part) => {
      const min = part.match(/min-width:\s*(-?\d+(?:\.\d+)?(?:px|r?em)?)/);
      const max = part.match(/max-width:\s*(-?\d+(?:\.\d+)?(?:px|r?em)?)/);

      if (min) return width >= toPx(min[1]!);
      if (max) return width <= toPx(max[1]!);

      return false;
    });
  }

  const matchMedia = vi.fn((media: string): StubMql => {
    const entry = { media, matches: evaluate(media), listeners: new Set<Listener>() };
    lists.add(entry);

    return {
      get matches() {
        return entry.matches;
      },
      media,
      addEventListener: (_: string, cb: Listener) => entry.listeners.add(cb),
      removeEventListener: (_: string, cb: Listener) => entry.listeners.delete(cb),
    };
  });

  vi.stubGlobal('matchMedia', matchMedia);

  return {
    matchMedia,
    setWidth(next: number) {
      width = next;

      for (const entry of lists) {
        const matches = evaluate(entry.media);

        if (matches !== entry.matches) {
          entry.matches = matches;

          for (const cb of entry.listeners) cb({ matches });
        }
      }
    },
  };
}

describe(useBreakpoints, () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', undefined);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('exposes a reactive shortcut ref per breakpoint (min-width strategy)', async () => {
    stubViewport(800);
    const scope = effectScope();
    let bp: ReturnType<typeof useBreakpoints<'sm' | 'md' | 'lg'>>;

    scope.run(() => {
      bp = useBreakpoints({ sm: 640, md: 768, lg: 1024 });
    });
    await nextTick();

    // 800px: >= sm (640), >= md (768), < lg (1024)
    expect(bp!.sm.value).toBeTruthy();
    expect(bp!.md.value).toBeTruthy();
    expect(bp!.lg.value).toBeFalsy();
    scope.stop();
  });

  it('uses max-width semantics for shortcuts under the max-width strategy', async () => {
    stubViewport(800);
    const scope = effectScope();
    let bp: ReturnType<typeof useBreakpoints<'sm' | 'md' | 'lg'>>;

    scope.run(() => {
      bp = useBreakpoints({ sm: 640, md: 768, lg: 1024 }, { strategy: 'max-width' });
    });
    await nextTick();

    // 800px: <= lg (1024) only; not <= sm/md
    expect(bp!.sm.value).toBeFalsy();
    expect(bp!.md.value).toBeFalsy();
    expect(bp!.lg.value).toBeTruthy();
    scope.stop();
  });

  it('reacts to viewport changes', async () => {
    const vp = stubViewport(500);
    const scope = effectScope();
    let bp: ReturnType<typeof useBreakpoints<'sm' | 'lg'>>;

    scope.run(() => {
      bp = useBreakpoints({ sm: 640, lg: 1024 });
    });
    await nextTick();

    expect(bp!.greaterOrEqual('sm').value).toBeFalsy();

    vp.setWidth(700);
    await nextTick();
    expect(bp!.greaterOrEqual('sm').value).toBeTruthy();
    expect(bp!.greaterOrEqual('lg').value).toBeFalsy();

    vp.setWidth(1100);
    await nextTick();
    expect(bp!.greaterOrEqual('lg').value).toBeTruthy();
    scope.stop();
  });

  it('greater/smaller apply the strict (exclusive) delta', async () => {
    // Exactly at the md breakpoint (768).
    const vp = stubViewport(768);
    const scope = effectScope();
    let bp: ReturnType<typeof useBreakpoints<'md'>>;

    scope.run(() => {
      bp = useBreakpoints({ md: 768 });
    });
    await nextTick();

    // At exactly 768: greaterOrEqual true, greater false, smallerOrEqual true, smaller false.
    expect(bp!.greaterOrEqual('md').value).toBeTruthy();
    expect(bp!.greater('md').value).toBeFalsy();
    expect(bp!.smallerOrEqual('md').value).toBeTruthy();
    expect(bp!.smaller('md').value).toBeFalsy();

    vp.setWidth(900);
    await nextTick();
    expect(bp!.greater('md').value).toBeTruthy();
    expect(bp!.smaller('md').value).toBeFalsy();
    scope.stop();
  });

  it('between is half-open [a, b)', async () => {
    const vp = stubViewport(768);
    const scope = effectScope();
    let bp: ReturnType<typeof useBreakpoints<'sm' | 'md' | 'lg'>>;

    scope.run(() => {
      bp = useBreakpoints({ sm: 640, md: 768, lg: 1024 });
    });
    await nextTick();

    // 768 is in [sm, lg) and in [md, lg); the upper bound (md) is exclusive in [sm, md).
    expect(bp!.between('sm', 'lg').value).toBeTruthy();
    expect(bp!.between('sm', 'md').value).toBeFalsy();
    expect(bp!.between('md', 'lg').value).toBeTruthy();
    scope.stop();
  });

  it('current() returns active breakpoints ordered small to large; active() picks per strategy', async () => {
    stubViewport(800);
    const scope = effectScope();
    let bp: ReturnType<typeof useBreakpoints<'sm' | 'md' | 'lg'>>;

    scope.run(() => {
      bp = useBreakpoints({ lg: 1024, sm: 640, md: 768 });
    });
    await nextTick();

    // 800px: sm and md active, sorted ascending.
    expect(bp!.current().value).toEqual(['sm', 'md']);
    // min-width strategy → largest active breakpoint.
    expect(bp!.active().value).toBe('md');
    scope.stop();
  });

  it('active() picks the smallest active breakpoint under max-width strategy', async () => {
    stubViewport(800);
    const scope = effectScope();
    let bp: ReturnType<typeof useBreakpoints<'sm' | 'md' | 'lg'>>;

    scope.run(() => {
      bp = useBreakpoints({ sm: 640, md: 768, lg: 1024 }, { strategy: 'max-width' });
    });
    await nextTick();

    expect(bp!.active().value).toBe('lg');
    scope.stop();
  });

  it('synchronous is* helpers read the current match', async () => {
    stubViewport(800);
    const scope = effectScope();
    let bp: ReturnType<typeof useBreakpoints<'sm' | 'md' | 'lg'>>;

    scope.run(() => {
      bp = useBreakpoints({ sm: 640, md: 768, lg: 1024 });
    });
    await nextTick();

    expect(bp!.isGreaterOrEqual('md')).toBeTruthy();
    expect(bp!.isGreater('md')).toBeTruthy();
    expect(bp!.isGreaterOrEqual('lg')).toBeFalsy();
    expect(bp!.isSmallerOrEqual('lg')).toBeTruthy();
    expect(bp!.isSmaller('sm')).toBeFalsy();
    expect(bp!.isInBetween('sm', 'lg')).toBeTruthy();
    expect(bp!.isInBetween('sm', 'md')).toBeFalsy();
    scope.stop();
  });

  it('supports reactive breakpoint values', async () => {
    const vp = stubViewport(700);
    const threshold = ref(640);
    const scope = effectScope();
    let bp: ReturnType<typeof useBreakpoints<'point'>>;

    scope.run(() => {
      bp = useBreakpoints({ point: threshold });
    });
    await nextTick();

    expect(bp!.greaterOrEqual('point').value).toBeTruthy();

    threshold.value = 900;
    await nextTick();
    expect(bp!.greaterOrEqual('point').value).toBeFalsy();

    vp.setWidth(1000);
    await nextTick();
    expect(bp!.greaterOrEqual('point').value).toBeTruthy();
    scope.stop();
  });

  it('handles string unit breakpoint values', async () => {
    stubViewport(800); // 800px, 48em = 768px
    const scope = effectScope();
    let bp: ReturnType<typeof useBreakpoints<'md'>>;

    scope.run(() => {
      bp = useBreakpoints({ md: '48em' });
    });
    await nextTick();

    expect(bp!.greaterOrEqual('md').value).toBeTruthy();
    expect(bp!.isGreaterOrEqual('md')).toBeTruthy();
    scope.stop();
  });

  describe('SSR / unsupported path', () => {
    it('resolves width queries from ssrWidth when matchMedia is unavailable', () => {
      // matchMedia stays undefined (beforeEach), window has no matchMedia path used by match().
      const scope = effectScope();
      let bp: ReturnType<typeof useBreakpoints<'sm' | 'lg'>>;

      scope.run(() => {
        bp = useBreakpoints({ sm: 640, lg: 1024 }, { ssrWidth: 800 });
      });

      // Synchronous helpers resolve against ssrWidth.
      expect(bp!.isGreaterOrEqual('sm')).toBeTruthy();
      expect(bp!.isGreaterOrEqual('lg')).toBeFalsy();
      expect(bp!.isSmallerOrEqual('lg')).toBeTruthy();
      scope.stop();
    });

    it('returns false for snapshot helpers with no window and no ssrWidth', () => {
      const scope = effectScope();
      let bp: ReturnType<typeof useBreakpoints<'sm'>>;

      scope.run(() => {
        bp = useBreakpoints({ sm: 640 }, { window: undefined });
      });

      expect(bp!.isGreaterOrEqual('sm')).toBeFalsy();
      expect(bp!.isSmallerOrEqual('sm')).toBeFalsy();
      scope.stop();
    });

    it('does not throw when constructed without a window (SSR)', () => {
      const scope = effectScope();

      expect(() => {
        scope.run(() => {
          const bp = useBreakpoints(breakpointsTailwind, { window: undefined });
          // Accessing reactive refs should be safe and default to false.
          expect(bp.lg.value).toBeFalsy();
        });
      }).not.toThrow();
      scope.stop();
    });
  });

  describe('presets', () => {
    it('exports the expected preset values', () => {
      expect(breakpointsTailwind).toMatchObject({ sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 });
      expect(breakpointsBootstrapV5).toMatchObject({ xs: 0, sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1400 });
      expect(breakpointsAntDesign).toMatchObject({ xs: 480, sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1600 });
      expect(breakpointsVuetifyV3).toMatchObject({ xs: 0, sm: 600, md: 960, lg: 1280, xl: 1920, xxl: 2560 });
    });

    it('works with a preset', async () => {
      stubViewport(1300);
      const scope = effectScope();
      let bp: ReturnType<typeof useBreakpoints<keyof typeof breakpointsTailwind & string>>;

      scope.run(() => {
        bp = useBreakpoints(breakpointsTailwind);
      });
      await nextTick();

      expect(bp!.greaterOrEqual('xl').value).toBeTruthy();
      expect(bp!.greaterOrEqual('2xl').value).toBeFalsy();
      expect(bp!.active().value).toBe('xl');
      scope.stop();
    });
  });
});
