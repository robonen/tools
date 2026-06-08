import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import VisuallyHidden from '../VisuallyHidden.vue';

describe('VisuallyHidden', () => {
  it('renders a span with sr-only style by default', () => {
    const w = mount(VisuallyHidden, { slots: { default: 'Screen reader only' } });

    const el = w.element as HTMLElement;
    expect(el.tagName).toBe('SPAN');
    expect(el.style.position).toBe('absolute');
    expect(el.style.width).toBe('1px');
    expect(el.style.height).toBe('1px');
    expect(el.style.overflow).toBe('hidden');
    expect(w.text()).toBe('Screen reader only');
  });

  it('does not set aria-hidden by default (content is announced)', () => {
    const w = mount(VisuallyHidden, { slots: { default: 'x' } });
    expect(w.element.getAttribute('aria-hidden')).toBeNull();
  });

  it('sets aria-hidden when feature="hidden"', () => {
    const w = mount(VisuallyHidden, {
      props: { feature: 'hidden' },
      slots: { default: 'x' },
    });

    expect(w.element.getAttribute('aria-hidden')).toBe('true');
  });

  it('exposes a data attribute describing the feature', () => {
    const w = mount(VisuallyHidden, { slots: { default: 'x' } });
    expect(w.element.getAttribute('data-visually-hidden')).toBe('focusable');
  });
});
