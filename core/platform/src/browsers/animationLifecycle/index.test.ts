import { describe, it, expect, vi } from 'vitest';
import {
  getAnimationName,
  isAnimatable,
  shouldSuspendUnmount,
  dispatchAnimationEvent,
  onAnimationSettle,
} from '.';

describe('getAnimationName', () => {
  it('returns "none" for undefined element', () => {
    expect(getAnimationName(undefined)).toBe('none');
  });

  it('returns the animation name from inline style', () => {
    const el = document.createElement('div');
    el.style.animationName = 'fadeIn';
    document.body.appendChild(el);

    expect(getAnimationName(el)).toBe('fadeIn');

    document.body.removeChild(el);
  });
});

describe('isAnimatable', () => {
  it('returns false for undefined element', () => {
    expect(isAnimatable(undefined)).toBe(false);
  });

  it('returns false for element with no animation or transition', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    expect(isAnimatable(el)).toBe(false);

    document.body.removeChild(el);
  });
});

describe('shouldSuspendUnmount', () => {
  it('returns false for undefined element', () => {
    expect(shouldSuspendUnmount(undefined, 'none')).toBe(false);
  });

  it('returns false for element with no animation/transition', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    expect(shouldSuspendUnmount(el, 'none')).toBe(false);

    document.body.removeChild(el);
  });
});

describe('dispatchAnimationEvent', () => {
  it('dispatches a custom event on the element', () => {
    const el = document.createElement('div');
    const handler = vi.fn();

    el.addEventListener('enter', handler);
    dispatchAnimationEvent(el, 'enter');

    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not throw for undefined element', () => {
    expect(() => dispatchAnimationEvent(undefined, 'leave')).not.toThrow();
  });

  it('dispatches non-bubbling event', () => {
    const el = document.createElement('div');
    const parent = document.createElement('div');
    const handler = vi.fn();

    parent.appendChild(el);
    parent.addEventListener('enter', handler);
    dispatchAnimationEvent(el, 'enter');

    expect(handler).not.toHaveBeenCalled();
  });
});

describe('onAnimationSettle', () => {
  it('returns a cleanup function', () => {
    const el = document.createElement('div');
    const cleanup = onAnimationSettle(el, { onSettle: vi.fn() });

    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('calls onSettle callback on transitionend', () => {
    const el = document.createElement('div');
    const callback = vi.fn();

    onAnimationSettle(el, { onSettle: callback });
    el.dispatchEvent(new Event('transitionend'));

    expect(callback).toHaveBeenCalledOnce();
  });

  it('calls onSettle callback on transitioncancel', () => {
    const el = document.createElement('div');
    const callback = vi.fn();

    onAnimationSettle(el, { onSettle: callback });
    el.dispatchEvent(new Event('transitioncancel'));

    expect(callback).toHaveBeenCalledOnce();
  });

  it('calls onStart callback on animationstart', () => {
    const el = document.createElement('div');
    const startCallback = vi.fn();

    onAnimationSettle(el, {
      onSettle: vi.fn(),
      onStart: startCallback,
    });

    el.dispatchEvent(new Event('animationstart'));

    expect(startCallback).toHaveBeenCalledOnce();
  });

  it('removes all listeners on cleanup', () => {
    const el = document.createElement('div');
    const callback = vi.fn();

    const cleanup = onAnimationSettle(el, { onSettle: callback });
    cleanup();

    el.dispatchEvent(new Event('transitionend'));
    el.dispatchEvent(new Event('transitioncancel'));

    expect(callback).not.toHaveBeenCalled();
  });
});
