import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useCssVar } from '.';

let mutationInstances: Array<{ cb: MutationCallback; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }> = [];

class StubMutationObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
  cb: MutationCallback;
  constructor(cb: MutationCallback) {
    this.cb = cb;
    mutationInstances.push(this);
  }
}

describe(useCssVar, () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    mutationInstances = [];
  });

  it('reads the existing custom property from the target', () => {
    const el = document.createElement('div');
    el.style.setProperty('--color', 'red');
    document.body.appendChild(el);

    const scope = effectScope();
    let color: ReturnType<typeof useCssVar>;
    scope.run(() => {
      color = useCssVar('--color', el);
    });

    expect(color!.value).toBe('red');
    scope.stop();
  });

  it('writes the property to the element when set', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    const scope = effectScope();
    let color: ReturnType<typeof useCssVar>;
    scope.run(() => {
      color = useCssVar('--color', el);
    });

    color!.value = 'blue';
    await nextTick();

    expect(el.style.getPropertyValue('--color')).toBe('blue');
    expect(color!.value).toBe('blue');
    scope.stop();
  });

  it('removes the property when set to null', () => {
    const el = document.createElement('div');
    el.style.setProperty('--color', 'green');
    document.body.appendChild(el);

    const scope = effectScope();
    let color: ReturnType<typeof useCssVar>;
    scope.run(() => {
      color = useCssVar('--color', el);
    });

    color!.value = null;

    expect(el.style.getPropertyValue('--color')).toBe('');
    expect(color!.value).toBeNull();
    scope.stop();
  });

  it('falls back to initialValue when the property is unset', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    const scope = effectScope();
    let color: ReturnType<typeof useCssVar>;
    scope.run(() => {
      color = useCssVar('--missing', el, { initialValue: 'gray' });
    });

    expect(color!.value).toBe('gray');
    scope.stop();
  });

  it('defaults the target to document.documentElement', () => {
    document.documentElement.style.setProperty('--root-var', 'rootval');

    const scope = effectScope();
    let v: ReturnType<typeof useCssVar>;
    scope.run(() => {
      v = useCssVar('--root-var');
    });

    expect(v!.value).toBe('rootval');
    v!.value = 'changed';
    expect(document.documentElement.style.getPropertyValue('--root-var')).toBe('changed');

    document.documentElement.style.removeProperty('--root-var');
    scope.stop();
  });

  it('removes the old property and re-reads when the prop name changes', async () => {
    const el = document.createElement('div');
    el.style.setProperty('--a', 'one');
    el.style.setProperty('--b', 'two');
    document.body.appendChild(el);

    const prop = ref('--a');
    const scope = effectScope();
    let v: ReturnType<typeof useCssVar>;
    scope.run(() => {
      v = useCssVar(prop, el);
    });

    expect(v!.value).toBe('one');

    prop.value = '--b';
    await nextTick();

    expect(el.style.getPropertyValue('--a')).toBe('');
    expect(v!.value).toBe('two');
    scope.stop();
  });

  it('re-reads when a reactive target changes', async () => {
    const a = document.createElement('div');
    a.style.setProperty('--c', 'fromA');
    const b = document.createElement('div');
    b.style.setProperty('--c', 'fromB');
    document.body.append(a, b);

    const target = ref<HTMLElement>(a);
    const scope = effectScope();
    let v: ReturnType<typeof useCssVar>;
    scope.run(() => {
      v = useCssVar('--c', target);
    });

    expect(v!.value).toBe('fromA');

    target.value = b;
    await nextTick();

    expect(v!.value).toBe('fromB');
    scope.stop();
  });

  it('attaches a MutationObserver only when observe is true', () => {
    vi.stubGlobal('MutationObserver', StubMutationObserver);
    const el = document.createElement('div');
    document.body.appendChild(el);

    const scopeOff = effectScope();
    scopeOff.run(() => useCssVar('--x', el));
    expect(mutationInstances).toHaveLength(0);
    scopeOff.stop();

    const scopeOn = effectScope();
    scopeOn.run(() => useCssVar('--x', el, { observe: true }));
    expect(mutationInstances).toHaveLength(1);
    expect(mutationInstances[0]!.observe).toHaveBeenCalledWith(
      el,
      expect.objectContaining({ attributeFilter: ['style', 'class'] }),
    );
    scopeOn.stop();
  });

  it('updates the ref when an observed mutation fires', () => {
    vi.stubGlobal('MutationObserver', StubMutationObserver);
    const el = document.createElement('div');
    el.style.setProperty('--y', 'initial');
    document.body.appendChild(el);

    const scope = effectScope();
    let v: ReturnType<typeof useCssVar>;
    scope.run(() => {
      v = useCssVar('--y', el, { observe: true });
    });

    expect(v!.value).toBe('initial');

    // Simulate an external change followed by a mutation record.
    el.style.setProperty('--y', 'external');
    mutationInstances[0]!.cb([{ type: 'attributes' } as MutationRecord], mutationInstances[0] as unknown as MutationObserver);

    expect(v!.value).toBe('external');
    scope.stop();
  });

  it('does not throw and keeps initialValue under SSR (no window)', () => {
    const scope = effectScope();
    let v: ReturnType<typeof useCssVar>;
    scope.run(() => {
      v = useCssVar('--ssr', null, {
        initialValue: 'fallback',
        window: undefined as unknown as Window,
      });
    });

    expect(v!.value).toBe('fallback');
    // Writing is a no-op on the (missing) element but still updates the store.
    v!.value = 'next';
    expect(v!.value).toBe('next');
    scope.stop();
  });

  it('uses a custom window from options for getComputedStyle', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    const getComputedStyle = vi.fn(() => ({
      getPropertyValue: () => '  spaced  ',
    })) as unknown as Window['getComputedStyle'];

    const fakeWindow = {
      getComputedStyle,
      document: { documentElement: el },
    } as unknown as Window;

    const scope = effectScope();
    let v: ReturnType<typeof useCssVar>;
    scope.run(() => {
      v = useCssVar('--z', el, { window: fakeWindow });
    });

    expect(getComputedStyle).toHaveBeenCalledWith(el);
    expect(v!.value).toBe('spaced');
    scope.stop();
  });
});
