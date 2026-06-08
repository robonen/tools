import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { useScriptTag } from '.';

const SRC = 'https://example.com/sdk.js';

function flushAll(): void {
  // Fire `load` on every script tag currently in the head so awaited promises resolve.
  document.head.querySelectorAll('script').forEach((el) => {
    el.setAttribute('data-loaded', 'true');
    el.dispatchEvent(new Event('load'));
  });
}

describe(useScriptTag, () => {
  afterEach(() => {
    document.head.querySelectorAll('script').forEach(el => el.remove());
    vi.unstubAllGlobals();
  });

  it('injects a script tag with the configured attributes', async () => {
    const scope = effectScope();
    let result!: ReturnType<typeof useScriptTag>;
    scope.run(() => {
      result = useScriptTag(SRC, undefined, {
        manual: true,
        type: 'module',
        defer: true,
        crossOrigin: 'anonymous',
        referrerPolicy: 'no-referrer',
        noModule: true,
        nonce: 'abc123',
        attrs: { 'data-test': 'yes', id: 'my-script' },
      });
    });

    const promise = result.load();
    const el = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`)!;
    expect(el).toBeInstanceOf(HTMLScriptElement);
    expect(el.type).toBe('module');
    expect(el.defer).toBeTruthy();
    expect(el.crossOrigin).toBe('anonymous');
    expect(el.referrerPolicy).toBe('no-referrer');
    expect(el.noModule).toBeTruthy();
    expect(el.nonce).toBe('abc123');
    expect(el.getAttribute('data-test')).toBe('yes');
    expect(el.getAttribute('id')).toBe('my-script');
    expect(el.parentElement).toBe(document.head);

    flushAll();
    await promise;
    expect(result.scriptTag.value).toBe(el);

    scope.stop();
  });

  it('defaults to async and text/javascript', async () => {
    const scope = effectScope();
    let result!: ReturnType<typeof useScriptTag>;
    scope.run(() => {
      result = useScriptTag(SRC, undefined, { manual: true });
    });

    const promise = result.load(false);
    const el = await promise as HTMLScriptElement;
    expect(el.async).toBeTruthy();
    expect(el.type).toBe('text/javascript');

    scope.stop();
  });

  it('calls onLoaded and resolves with the element when the script loads', async () => {
    const onLoaded = vi.fn();
    const scope = effectScope();
    let result!: ReturnType<typeof useScriptTag>;
    scope.run(() => {
      result = useScriptTag(SRC, onLoaded, { manual: true });
    });

    const promise = result.load();
    flushAll();
    const el = await promise;

    expect(onLoaded).toHaveBeenCalledTimes(1);
    expect(onLoaded).toHaveBeenCalledWith(el);
    expect(result.scriptTag.value).toBe(el);

    scope.stop();
  });

  it('resolves immediately when waitForScriptLoad is false', async () => {
    const scope = effectScope();
    let result!: ReturnType<typeof useScriptTag>;
    scope.run(() => {
      result = useScriptTag(SRC, undefined, { manual: true });
    });

    const el = await result.load(false);
    expect(el).toBeInstanceOf(HTMLScriptElement);
    expect(result.scriptTag.value).toBe(el);

    scope.stop();
  });

  it('de-duplicates concurrent load calls into a single promise', () => {
    const scope = effectScope();
    let result!: ReturnType<typeof useScriptTag>;
    scope.run(() => {
      result = useScriptTag(SRC, undefined, { manual: true });
    });

    const a = result.load();
    const b = result.load();
    expect(a).toBe(b);
    expect(document.querySelectorAll(`script[src="${SRC}"]`)).toHaveLength(1);

    scope.stop();
  });

  it('reuses an existing already-loaded script tag', async () => {
    // Pre-existing, already-loaded tag in the DOM.
    const existing = document.createElement('script');
    existing.src = SRC;
    existing.setAttribute('data-loaded', 'true');
    document.head.appendChild(existing);

    const onLoaded = vi.fn();
    const scope = effectScope();
    let result!: ReturnType<typeof useScriptTag>;
    scope.run(() => {
      result = useScriptTag(SRC, onLoaded, { manual: true });
    });

    const el = await result.load();
    expect(el).toBe(existing);
    expect(result.scriptTag.value).toBe(existing);
    // Only the original tag is present (no duplicate appended).
    expect(document.querySelectorAll(`script[src="${SRC}"]`)).toHaveLength(1);
    // onLoaded should not fire for the short-circuit path.
    expect(onLoaded).not.toHaveBeenCalled();

    scope.stop();
  });

  it('unload removes the tag and clears the ref', async () => {
    const scope = effectScope();
    let result!: ReturnType<typeof useScriptTag>;
    scope.run(() => {
      result = useScriptTag(SRC, undefined, { manual: true });
    });

    await result.load(false);
    expect(document.querySelector(`script[src="${SRC}"]`)).not.toBeNull();

    result.unload();
    expect(document.querySelector(`script[src="${SRC}"]`)).toBeNull();
    expect(result.scriptTag.value).toBeNull();

    scope.stop();
  });

  it('unload resets the load promise so the script can be re-loaded', async () => {
    const scope = effectScope();
    let result!: ReturnType<typeof useScriptTag>;
    scope.run(() => {
      result = useScriptTag(SRC, undefined, { manual: true });
    });

    const first = result.load();
    result.unload();
    const second = result.load();
    expect(first).not.toBe(second);
    expect(document.querySelector(`script[src="${SRC}"]`)).not.toBeNull();

    scope.stop();
  });

  it('removes the tag on scope dispose (non-manual)', () => {
    const scope = effectScope();
    scope.run(() => {
      useScriptTag(SRC);
    });

    // Outside a component instance, tryOnMounted runs synchronously -> tag injected.
    expect(document.querySelector(`script[src="${SRC}"]`)).not.toBeNull();

    scope.stop();
    expect(document.querySelector(`script[src="${SRC}"]`)).toBeNull();
  });

  it('manual mode does not auto-load on mount', () => {
    const scope = effectScope();
    let result!: ReturnType<typeof useScriptTag>;
    scope.run(() => {
      result = useScriptTag(SRC, undefined, { manual: true });
    });

    expect(document.querySelector(`script[src="${SRC}"]`)).toBeNull();
    expect(result.scriptTag.value).toBeNull();

    scope.stop();
  });

  it('immediate: false defers loading until load() is called', () => {
    const scope = effectScope();
    let result!: ReturnType<typeof useScriptTag>;
    scope.run(() => {
      result = useScriptTag(SRC, undefined, { immediate: false });
    });

    expect(document.querySelector(`script[src="${SRC}"]`)).toBeNull();

    result.load(false);
    expect(document.querySelector(`script[src="${SRC}"]`)).not.toBeNull();

    scope.stop();
  });

  it('rejects when the script errors', async () => {
    const scope = effectScope();
    let result!: ReturnType<typeof useScriptTag>;
    scope.run(() => {
      result = useScriptTag(SRC, undefined, { manual: true });
    });

    const promise = result.load();
    const el = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`)!;
    el.dispatchEvent(new Event('error'));

    await expect(promise).rejects.toBeInstanceOf(Event);

    scope.stop();
  });

  it('SSR / unsupported path: resolves false and never throws when document is absent', async () => {
    // Note: `defaultDocument` is import-time captured and the destructuring default
    // `= defaultDocument` only triggers for `undefined`, so we force a falsy document
    // (mirroring a real SSR environment where `defaultDocument` itself is undefined).
    const scope = effectScope();
    let result!: ReturnType<typeof useScriptTag>;
    expect(() => {
      scope.run(() => {
        result = useScriptTag(SRC, undefined, { document: null as unknown as Document, manual: true });
      });
    }).not.toThrow();

    // eslint-disable-next-line vitest/prefer-to-be-falsy -- assert the exact boolean `false`, not any falsy value
    await expect(result.load()).resolves.toBe(false);
    expect(() => result.unload()).not.toThrow();
    expect(result.scriptTag.value).toBeNull();

    scope.stop();
  });

  it('returns the documented shape', () => {
    const result = useScriptTag(SRC, undefined, { manual: true });
    expect(result.scriptTag.value).toBeNull();
    expect(typeof result.load).toBe('function');
    expect(typeof result.unload).toBe('function');
  });
});
