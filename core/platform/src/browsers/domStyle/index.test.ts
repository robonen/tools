import { describe, expect, it } from 'vitest';
import { assignStyle, getTranslate, isInView, resetStyle, setStyle } from './index';

function makeEl(): HTMLElement {
  const el = document.createElement('div');
  document.body.append(el);
  return el;
}

describe('setStyle / resetStyle', () => {
  it('applies styles and caches the overwritten values', () => {
    const el = makeEl();
    el.style.transform = 'translateY(0px)';

    setStyle(el, { transform: 'translateY(20px)', transition: 'none' });
    expect(el.style.transform).toBe('translateY(20px)');
    expect(el.style.transition).toBe('none');

    resetStyle(el);
    expect(el.style.transform).toBe('translateY(0px)');
  });

  it('restores a single property when given prop', () => {
    const el = makeEl();
    el.style.opacity = '1';

    setStyle(el, { opacity: '0', transform: 'scale(0.9)' });
    resetStyle(el, 'opacity');

    expect(el.style.opacity).toBe('1');
    expect(el.style.transform).toBe('scale(0.9)');
  });

  it('writes custom properties via setProperty', () => {
    const el = makeEl();
    setStyle(el, { '--snap-point-height': '120px' });
    expect(el.style.getPropertyValue('--snap-point-height')).toBe('120px');
  });

  it('does not cache when ignoreCache is true', () => {
    const el = makeEl();
    el.style.opacity = '1';

    setStyle(el, { opacity: '0.5' }, true);
    resetStyle(el);

    expect(el.style.opacity).toBe('0.5');
  });

  it('is a no-op for non-elements', () => {
    expect(() => setStyle(null, { opacity: '0' })).not.toThrow();
    expect(() => resetStyle(null)).not.toThrow();
  });
});

describe('getTranslate', () => {
  it('returns null when there is no matrix transform', () => {
    const el = makeEl();
    expect(getTranslate(el, 'y')).toBeNull();
  });

  it('reads x and y from a 2D matrix', () => {
    const el = makeEl();
    el.style.transform = 'matrix(1, 0, 0, 1, 12, 34)';
    expect(getTranslate(el, 'x')).toBe(12);
    expect(getTranslate(el, 'y')).toBe(34);
  });

  it('reads x and y from a 3D matrix', () => {
    const el = makeEl();
    el.style.transform = 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 50, 60, 0, 1)';
    expect(getTranslate(el, 'x')).toBe(50);
    expect(getTranslate(el, 'y')).toBe(60);
  });
});

describe('assignStyle', () => {
  it('assigns styles and restores the previous cssText on cleanup', () => {
    const el = makeEl();
    el.style.cssText = 'color: red;';

    const restore = assignStyle(el, { overflow: 'hidden' });
    expect(el.style.overflow).toBe('hidden');

    restore();
    expect(el.style.overflow).toBe('');
    expect(el.style.color).toBe('red');
  });

  it('returns a no-op cleanup for a missing element', () => {
    expect(() => assignStyle(null, { overflow: 'hidden' })()).not.toThrow();
  });
});

describe('isInView', () => {
  it('returns false when visualViewport is unavailable', () => {
    const el = makeEl();
    const original = window.visualViewport;
    Object.defineProperty(globalThis, 'visualViewport', { value: null, configurable: true });

    expect(isInView(el)).toBe(false);

    Object.defineProperty(globalThis, 'visualViewport', { value: original, configurable: true });
  });
});
