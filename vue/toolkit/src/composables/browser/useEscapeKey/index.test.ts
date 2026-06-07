import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEscapeKey } from '.';

function dispatchEscape() {
  globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
}

describe(useEscapeKey, () => {
  afterEach(() => {
    // Ensure no lingering subscribers between tests
  });

  it('fires handler on Escape', () => {
    const h = vi.fn();
    const stop = useEscapeKey(h);

    dispatchEscape();
    expect(h).toHaveBeenCalledTimes(1);

    stop();
  });

  it('ignores non-Escape keys', () => {
    const h = vi.fn();
    const stop = useEscapeKey(h);

    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(h).not.toHaveBeenCalled();

    stop();
  });

  it('only topmost handler fires when multiple are stacked', () => {
    const bottom = vi.fn();
    const top = vi.fn();

    const stopBottom = useEscapeKey(bottom);
    const stopTop = useEscapeKey(top);

    dispatchEscape();
    expect(top).toHaveBeenCalledTimes(1);
    expect(bottom).not.toHaveBeenCalled();

    stopTop();
    dispatchEscape();
    expect(bottom).toHaveBeenCalledTimes(1);

    stopBottom();
  });

  it('stop handle unsubscribes the listener', () => {
    const h = vi.fn();
    const stop = useEscapeKey(h);
    stop();

    dispatchEscape();
    expect(h).not.toHaveBeenCalled();
  });
});
