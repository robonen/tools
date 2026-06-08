import { describe, expect, it } from 'vitest';
import { effectScope, nextTick, shallowRef } from 'vue';
import { useFocusWithin } from '.';

function makeTree(): { container: HTMLDivElement; input: HTMLInputElement; outside: HTMLButtonElement } {
  const container = document.createElement('div');
  const input = document.createElement('input');
  container.appendChild(input);

  const outside = document.createElement('button');

  document.body.appendChild(container);
  document.body.appendChild(outside);

  return { container, input, outside };
}

describe(useFocusWithin, () => {
  it('is not focused initially when nothing inside has focus', () => {
    const { container } = makeTree();

    const scope = effectScope();
    let result: ReturnType<typeof useFocusWithin>;
    scope.run(() => {
      result = useFocusWithin(container);
    });

    expect(result!.focused.value).toBeFalsy();

    scope.stop();
    document.body.replaceChildren();
  });

  it('becomes focused when a descendant receives focus', async () => {
    const { container, input } = makeTree();

    const scope = effectScope();
    let result: ReturnType<typeof useFocusWithin>;
    scope.run(() => {
      result = useFocusWithin(container);
    });

    input.focus();
    container.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await nextTick();

    expect(result!.focused.value).toBeTruthy();

    scope.stop();
    document.body.replaceChildren();
  });

  it('is focused when the target element itself receives focus', async () => {
    const { container } = makeTree();
    container.tabIndex = 0;

    const scope = effectScope();
    let result: ReturnType<typeof useFocusWithin>;
    scope.run(() => {
      result = useFocusWithin(container);
    });

    container.focus();
    container.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await nextTick();

    expect(result!.focused.value).toBeTruthy();

    scope.stop();
    document.body.replaceChildren();
  });

  it('clears focus when focus leaves the element entirely', async () => {
    const { container, input, outside } = makeTree();

    const scope = effectScope();
    let result: ReturnType<typeof useFocusWithin>;
    scope.run(() => {
      result = useFocusWithin(container);
    });

    input.focus();
    container.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await nextTick();
    expect(result!.focused.value).toBeTruthy();

    // Move focus to an element outside the container.
    outside.focus();
    container.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
    await nextTick();

    expect(result!.focused.value).toBeFalsy();

    scope.stop();
    document.body.replaceChildren();
  });

  it('stays focused when focus moves between descendants', async () => {
    const { container, input } = makeTree();
    const second = document.createElement('input');
    container.appendChild(second);

    const scope = effectScope();
    let result: ReturnType<typeof useFocusWithin>;
    scope.run(() => {
      result = useFocusWithin(container);
    });

    input.focus();
    container.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await nextTick();
    expect(result!.focused.value).toBeTruthy();

    // focusout fires as focus shifts, but the second input is still inside
    // the container, so `:focus-within` keeps the state true.
    second.focus();
    container.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: second }));
    await nextTick();

    expect(result!.focused.value).toBeTruthy();

    scope.stop();
    document.body.replaceChildren();
  });

  it('reflects focus that already lives inside the target on creation', () => {
    const { container, input } = makeTree();
    input.focus();

    const scope = effectScope();
    let result: ReturnType<typeof useFocusWithin>;
    scope.run(() => {
      result = useFocusWithin(container);
    });

    expect(result!.focused.value).toBeTruthy();

    scope.stop();
    document.body.replaceChildren();
  });

  it('accepts a reactive ref target', async () => {
    const { container, input } = makeTree();
    const targetRef = shallowRef<HTMLElement | null>(container);

    const scope = effectScope();
    let result: ReturnType<typeof useFocusWithin>;
    scope.run(() => {
      result = useFocusWithin(targetRef);
    });

    input.focus();
    container.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await nextTick();

    expect(result!.focused.value).toBeTruthy();

    scope.stop();
    document.body.replaceChildren();
  });

  it('exposes a read-only computed (write throws / has no setter)', () => {
    const { container } = makeTree();

    const scope = effectScope();
    let result: ReturnType<typeof useFocusWithin>;
    scope.run(() => {
      result = useFocusWithin(container);
    });

    // computed without a setter ignores writes (does not mutate internal state)
    // @ts-expect-error - intentionally writing to a read-only computed
    result!.focused.value = true;
    expect(result!.focused.value).toBeFalsy();

    scope.stop();
    document.body.replaceChildren();
  });

  it('does not throw and stays false when window is unavailable (SSR)', () => {
    const { container } = makeTree();

    const scope = effectScope();
    let result: ReturnType<typeof useFocusWithin>;
    scope.run(() => {
      result = useFocusWithin(container, { window: undefined });
    });

    expect(result!.focused.value).toBeFalsy();

    scope.stop();
    document.body.replaceChildren();
  });
});
