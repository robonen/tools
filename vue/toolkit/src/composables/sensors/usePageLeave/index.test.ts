import { describe, expect, it, vi } from 'vitest';
import { effectScope, isReadonly, nextTick } from 'vue';
import { usePageLeave } from '.';

function withScope<T>(fn: () => T): { value: T; stop: () => void } {
  const scope = effectScope();
  let value!: T;
  scope.run(() => {
    value = fn();
  });
  return { value, stop: () => scope.stop() };
}

describe(usePageLeave, () => {
  it('is false initially', () => {
    const { value: isLeft, stop } = withScope(() => usePageLeave());
    expect(isLeft.value).toBeFalsy();
    stop();
  });

  it('returns a writable shallow ref', () => {
    const { value: isLeft, stop } = withScope(() => usePageLeave());
    expect(isReadonly(isLeft)).toBeFalsy();
    stop();
  });

  it('becomes true when the pointer leaves the document', async () => {
    const { value: isLeft, stop } = withScope(() => usePageLeave());

    document.documentElement.dispatchEvent(new MouseEvent('mouseleave'));
    await nextTick();
    expect(isLeft.value).toBeTruthy();

    document.documentElement.dispatchEvent(new MouseEvent('mouseenter'));
    await nextTick();
    expect(isLeft.value).toBeFalsy();
    stop();
  });

  it('uses mouseout relatedTarget to detect leaving', async () => {
    const { value: isLeft, stop } = withScope(() => usePageLeave());

    // No relatedTarget => pointer left the page.
    globalThis.dispatchEvent(new MouseEvent('mouseout'));
    await nextTick();
    expect(isLeft.value).toBeTruthy();

    // relatedTarget present => pointer moved to another element, still on page.
    globalThis.dispatchEvent(new MouseEvent('mouseout', { relatedTarget: document.body }));
    await nextTick();
    expect(isLeft.value).toBeFalsy();
    stop();
  });

  it('invokes onChange with the new value and event only on change', async () => {
    const onChange = vi.fn();
    const { stop } = withScope(() => usePageLeave({ onChange }));

    document.documentElement.dispatchEvent(new MouseEvent('mouseleave'));
    await nextTick();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(true, expect.any(MouseEvent));

    // Repeated leave should not fire again (no state change).
    document.documentElement.dispatchEvent(new MouseEvent('mouseleave'));
    await nextTick();
    expect(onChange).toHaveBeenCalledTimes(1);

    document.documentElement.dispatchEvent(new MouseEvent('mouseenter'));
    await nextTick();
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith(false, expect.any(MouseEvent));
    stop();
  });

  it('does not throw and stays false when window is undefined (SSR)', () => {
    const { value: isLeft, stop } = withScope(() =>
      usePageLeave({ window: undefined }),
    );
    expect(isLeft.value).toBeFalsy();
    stop();
  });

  it('binds listeners to a custom window', async () => {
    const onChange = vi.fn();
    const { stop } = withScope(() => usePageLeave({ window: globalThis as unknown as Window, onChange }));

    document.documentElement.dispatchEvent(new MouseEvent('mouseleave'));
    await nextTick();
    expect(onChange).toHaveBeenCalledWith(true, expect.any(MouseEvent));
    document.documentElement.dispatchEvent(new MouseEvent('mouseenter'));
    await nextTick();
    stop();
  });
});
