import { describe, expect, it } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useFocus } from '.';

function host<T>(fn: () => T): { result: T; stop: () => void } {
  const scope = effectScope();
  let result!: T;
  scope.run(() => {
    result = fn();
  });
  return { result, stop: () => scope.stop() };
}

describe(useFocus, () => {
  it('reflects focus and blur events on the target', async () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    const { result, stop } = host(() => useFocus(input));
    await nextTick();

    expect(result.focused.value).toBeFalsy();

    input.dispatchEvent(new FocusEvent('focus'));
    expect(result.focused.value).toBeTruthy();

    input.dispatchEvent(new FocusEvent('blur'));
    expect(result.focused.value).toBeFalsy();

    stop();
    input.remove();
  });

  it('focuses the element when writing true', async () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    const { result, stop } = host(() => useFocus(input));
    await nextTick();

    result.focused.value = true;
    // jsdom dispatches the focus event synchronously from .focus()
    expect(document.activeElement).toBe(input);
    expect(result.focused.value).toBeTruthy();

    stop();
    input.remove();
  });

  it('blurs the element when writing false', async () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    const { result, stop } = host(() => useFocus(input));
    await nextTick();

    result.focused.value = true;
    expect(document.activeElement).toBe(input);

    result.focused.value = false;
    expect(document.activeElement).not.toBe(input);
    expect(result.focused.value).toBeFalsy();

    stop();
    input.remove();
  });

  it('focuses on mount when initialValue is true', async () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    const { result, stop } = host(() => useFocus(input, { initialValue: true }));
    // the watch runs with flush: 'post'
    await nextTick();

    expect(document.activeElement).toBe(input);
    expect(result.focused.value).toBeTruthy();

    stop();
    input.remove();
  });

  it('passes preventScroll to focus()', async () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    let receivedOptions: FocusOptions | undefined;
    const originalFocus = input.focus.bind(input);
    input.focus = (opts?: FocusOptions) => {
      receivedOptions = opts;
      originalFocus(opts);
    };

    const { result, stop } = host(() => useFocus(input, { preventScroll: true }));
    await nextTick();

    result.focused.value = true;
    expect(receivedOptions).toEqual({ preventScroll: true });

    stop();
    input.remove();
  });

  it('respects focusVisible by checking :focus-visible', async () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    // emulate the element NOT matching :focus-visible (e.g. mouse focus)
    input.matches = () => false;

    const { result, stop } = host(() => useFocus(input, { focusVisible: true }));
    await nextTick();

    input.dispatchEvent(new FocusEvent('focus'));
    // focus should be ignored because :focus-visible did not match
    expect(result.focused.value).toBeFalsy();

    // now emulate a keyboard focus that does match
    input.matches = (selector: string) => selector === ':focus-visible';
    input.dispatchEvent(new FocusEvent('focus'));
    expect(result.focused.value).toBeTruthy();

    stop();
    input.remove();
  });

  it('tracks a reactive (changing) target', async () => {
    const a = document.createElement('input');
    const b = document.createElement('input');
    document.body.append(a, b);

    const target = ref<HTMLElement>(a);
    const { result, stop } = host(() => useFocus(target));
    await nextTick();

    // start unfocused, then focus the first target
    a.dispatchEvent(new FocusEvent('focus'));
    expect(result.focused.value).toBeTruthy();
    a.dispatchEvent(new FocusEvent('blur'));
    expect(result.focused.value).toBeFalsy();

    // swap the tracked target; listeners follow the reactive ref
    target.value = b;
    await nextTick();

    // events on the new element are now tracked
    b.dispatchEvent(new FocusEvent('focus'));
    expect(result.focused.value).toBeTruthy();
    b.dispatchEvent(new FocusEvent('blur'));
    expect(result.focused.value).toBeFalsy();

    // events on the old element no longer affect state
    a.dispatchEvent(new FocusEvent('focus'));
    expect(result.focused.value).toBeFalsy();

    stop();
    a.remove();
    b.remove();
  });

  it('does not throw when the target is null', async () => {
    const target = ref<HTMLElement | null>(null);
    const { result, stop } = host(() => useFocus(target));
    await nextTick();

    expect(result.focused.value).toBeFalsy();
    // writing to a null target must be a no-op, not a crash
    expect(() => {
      result.focused.value = true;
    }).not.toThrow();
    expect(result.focused.value).toBeFalsy();

    stop();
  });
});
