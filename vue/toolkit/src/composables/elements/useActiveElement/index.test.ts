import { describe, expect, it } from 'vitest';
import { effectScope, isReadonly, nextTick } from 'vue';
import { useActiveElement } from '.';

describe(useActiveElement, () => {
  it('tracks the focused element', async () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    const scope = effectScope();
    let active: ReturnType<typeof useActiveElement>;
    scope.run(() => {
      active = useActiveElement();
    });

    input.focus();
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await nextTick();

    expect(active!.value).toBe(input);

    scope.stop();
    input.remove();
  });

  it('returns a shallow ref (not readonly)', () => {
    const scope = effectScope();
    let active: ReturnType<typeof useActiveElement>;
    scope.run(() => {
      active = useActiveElement();
    });

    // shallowRef is writable internally; ensure we did not return a readonly wrapper
    expect(isReadonly(active!)).toBeFalsy();

    scope.stop();
  });

  it('reflects the active element on creation', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const scope = effectScope();
    let active: ReturnType<typeof useActiveElement>;
    scope.run(() => {
      active = useActiveElement();
    });

    // initial trigger should capture the already-focused element synchronously
    expect(active!.value).toBe(input);

    scope.stop();
    input.remove();
  });

  it('traverses open shadow roots when deep', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const inner = document.createElement('input');
    shadow.appendChild(inner);

    const scope = effectScope();
    let active: ReturnType<typeof useActiveElement>;
    scope.run(() => {
      active = useActiveElement();
    });

    inner.focus();
    document.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await nextTick();

    expect(active!.value).toBe(inner);

    scope.stop();
    host.remove();
  });

  it('does not descend into shadow roots when deep is false', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const inner = document.createElement('input');
    shadow.appendChild(inner);

    const scope = effectScope();
    let active: ReturnType<typeof useActiveElement>;
    scope.run(() => {
      active = useActiveElement({ deep: false });
    });

    inner.focus();
    document.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await nextTick();

    // with deep:false we stay at the shadow host instead of piercing it
    expect(active!.value).toBe(host);

    scope.stop();
    host.remove();
  });

  it('resets when focus leaves the window (blur with no relatedTarget)', async () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    const scope = effectScope();
    let active: ReturnType<typeof useActiveElement>;
    scope.run(() => {
      active = useActiveElement();
    });

    input.focus();
    globalThis.dispatchEvent(new FocusEvent('focus'));
    await nextTick();
    expect(active!.value).toBe(input);

    // simulate focus leaving the document entirely
    input.blur();
    globalThis.dispatchEvent(new FocusEvent('blur', { relatedTarget: null }));
    await nextTick();
    expect(active!.value).toBe(document.body);

    scope.stop();
    input.remove();
  });

  it('ignores window blur when focus moves to another element (relatedTarget set)', async () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    const scope = effectScope();
    let active: ReturnType<typeof useActiveElement>;
    scope.run(() => {
      active = useActiveElement();
    });

    input.focus();
    await nextTick();
    expect(active!.value).toBe(input);

    // blur carrying a relatedTarget means focus stayed within the page -> ignore
    const other = document.createElement('button');
    globalThis.dispatchEvent(new FocusEvent('blur', { relatedTarget: other }));
    await nextTick();
    expect(active!.value).toBe(input);

    scope.stop();
    input.remove();
  });

  it('accepts a custom document via options', () => {
    const fakeEl = document.createElement('textarea');
    const fakeDocument = { activeElement: fakeEl } as unknown as Document;

    const scope = effectScope();
    let active: ReturnType<typeof useActiveElement>;
    scope.run(() => {
      active = useActiveElement({ document: fakeDocument });
    });

    expect(active!.value).toBe(fakeEl);

    scope.stop();
  });

  it('does not throw and stays undefined when document has no active element', () => {
    // emulate an environment (e.g. SSR / detached document) with no focus
    const emptyDocument = { activeElement: null } as unknown as Document;

    const scope = effectScope();
    let active: ReturnType<typeof useActiveElement>;
    scope.run(() => {
      // pass a real window so listeners attach without error, but a doc with no focus
      active = useActiveElement({ document: emptyDocument });
    });

    expect(active!.value).toBeNull();

    scope.stop();
  });

  it('re-evaluates when the active element is removed (triggerOnRemoval)', async () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    const scope = effectScope();
    let active: ReturnType<typeof useActiveElement>;
    scope.run(() => {
      active = useActiveElement({ triggerOnRemoval: true });
    });

    input.focus();
    await nextTick();
    expect(active!.value).toBe(input);

    input.remove();
    // MutationObserver delivery is async; wait a microtask-ish tick
    await new Promise(resolve => setTimeout(resolve, 0));
    await nextTick();

    expect(active!.value).toBe(document.body);

    scope.stop();
  });
});
