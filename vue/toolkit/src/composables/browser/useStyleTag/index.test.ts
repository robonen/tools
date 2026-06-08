import { afterEach, describe, expect, it } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useStyleTag } from '.';

describe(useStyleTag, () => {
  afterEach(() => {
    // Clean up any leaked style tags between tests.
    document.head.querySelectorAll('style[id^="vuetools_styletag_"]').forEach(el => el.remove());
    document.head.querySelectorAll('style#shared, style#manual, style#mediaq, style#csp').forEach(el => el.remove());
  });

  it('injects a style tag with the given css', () => {
    const scope = effectScope();
    let result!: ReturnType<typeof useStyleTag>;
    scope.run(() => {
      result = useStyleTag('body { color: red }');
    });

    const el = document.getElementById(result.id) as HTMLStyleElement;
    expect(el).toBeInstanceOf(HTMLStyleElement);
    expect(el.textContent).toBe('body { color: red }');
    expect(el.parentElement).toBe(document.head);
    expect(result.isLoaded.value).toBeTruthy();

    scope.stop();
  });

  it('updates the stylesheet when css ref changes', async () => {
    const scope = effectScope();
    let result!: ReturnType<typeof useStyleTag>;
    scope.run(() => {
      result = useStyleTag('a { color: red }');
    });

    result.css.value = 'a { color: blue }';
    await nextTick();

    const el = document.getElementById(result.id) as HTMLStyleElement;
    expect(el.textContent).toBe('a { color: blue }');

    scope.stop();
  });

  it('accepts a ref / getter as the css source', async () => {
    const scope = effectScope();
    const source = ref('p { margin: 0 }');
    let result!: ReturnType<typeof useStyleTag>;
    scope.run(() => {
      result = useStyleTag(source);
    });

    const el = document.getElementById(result.id) as HTMLStyleElement;
    expect(el.textContent).toBe('p { margin: 0 }');

    source.value = 'p { margin: 1px }';
    await nextTick();
    expect(el.textContent).toBe('p { margin: 1px }');

    scope.stop();
  });

  it('applies media and nonce attributes', () => {
    const scope = effectScope();
    scope.run(() => {
      useStyleTag('.q {}', { id: 'mediaq', media: 'screen and (max-width: 600px)' });
      useStyleTag('.c {}', { id: 'csp', nonce: 'abc123' });
    });

    const mediaEl = document.getElementById('mediaq') as HTMLStyleElement;
    const cspEl = document.getElementById('csp') as HTMLStyleElement;
    expect(mediaEl.media).toBe('screen and (max-width: 600px)');
    expect(cspEl.nonce).toBe('abc123');

    scope.stop();
  });

  it('removes the tag on scope dispose', () => {
    const scope = effectScope();
    let result!: ReturnType<typeof useStyleTag>;
    scope.run(() => {
      result = useStyleTag('.x {}');
    });

    expect(document.getElementById(result.id)).not.toBeNull();
    scope.stop();
    expect(document.getElementById(result.id)).toBeNull();
  });

  it('reference-counts a shared id and only removes when last is unloaded', () => {
    const a = useStyleTag('.shared { color: red }', { id: 'shared', manual: true });
    const b = useStyleTag('.shared { color: red }', { id: 'shared', manual: true });

    a.load();
    b.load();
    expect(document.getElementById('shared')).not.toBeNull();

    a.unload();
    // Still present — b holds a reference.
    expect(document.getElementById('shared')).not.toBeNull();
    expect(b.isLoaded.value).toBeTruthy();

    b.unload();
    expect(document.getElementById('shared')).toBeNull();
  });

  it('manual mode does not auto-load', () => {
    const scope = effectScope();
    let result!: ReturnType<typeof useStyleTag>;
    scope.run(() => {
      result = useStyleTag('.manual {}', { id: 'manual', manual: true });
    });

    expect(result.isLoaded.value).toBeFalsy();
    expect(document.getElementById('manual')).toBeNull();

    result.load();
    expect(result.isLoaded.value).toBeTruthy();
    expect(document.getElementById('manual')).not.toBeNull();

    result.unload();
    scope.stop();
  });

  it('load is idempotent (does not double reference-count)', () => {
    const result = useStyleTag('.dup {}', { manual: true });
    result.load();
    result.load();
    result.load();

    // A single unload removes it because the ref count was incremented only once.
    result.unload();
    expect(document.getElementById(result.id)).toBeNull();
  });

  it('immediate: false defers loading until load() is called outside a component', () => {
    const scope = effectScope();
    let result!: ReturnType<typeof useStyleTag>;
    scope.run(() => {
      result = useStyleTag('.imm {}', { immediate: false });
    });

    // Without a component instance, tryOnMounted runs synchronously; immediate: false
    // means load is not registered, so nothing is injected yet.
    expect(result.isLoaded.value).toBeFalsy();

    result.load();
    expect(result.isLoaded.value).toBeTruthy();

    scope.stop();
  });

  it('is SSR-safe / unsupported path: never throws when document is absent', () => {
    // Passing `document: undefined` exercises the configurable-document fallback
    // path; in a real SSR environment `defaultDocument` is itself undefined and
    // `load`/`unload` early-return. We assert the construction never throws and a
    // stable id is still produced.
    const scope = effectScope();
    let result!: ReturnType<typeof useStyleTag>;
    expect(() => {
      scope.run(() => {
        result = useStyleTag('.ssr {}', { document: undefined });
      });
    }).not.toThrow();
    expect(result.id).toMatch(/^vuetools_styletag_/);
    scope.stop();
  });

  it('returns the documented shape', () => {
    const result = useStyleTag('.shape {}', { manual: true });
    expect(typeof result.id).toBe('string');
    expect(typeof result.css.value).toBe('string');
    expect(typeof result.load).toBe('function');
    expect(typeof result.unload).toBe('function');
    expect(typeof result.isLoaded.value).toBe('boolean');
  });
});
