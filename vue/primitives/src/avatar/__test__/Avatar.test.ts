import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { AvatarFallback, AvatarImage, AvatarRoot } from '../index';

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src = '';
  set src(value: string) {
    this._src = value;
    queueMicrotask(() => {
      if (value.includes('broken')) this.onerror?.();
      else this.onload?.();
    });
  }

  get src() { return this._src; }
}

describe('Avatar', () => {
  beforeEach(() => {
    vi.stubGlobal('Image', MockImage as unknown as typeof Image);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders fallback until image loads', async () => {
    const w = mount(defineComponent({
      setup: () => () => h(AvatarRoot, null, {
        default: () => [
          h(AvatarImage, { src: '/ok.png', alt: 'user' }),
          h(AvatarFallback, { class: 'fb' }, { default: () => 'AB' }),
        ],
      }),
    }));
    expect(w.find('.fb').exists()).toBe(true);
    expect(w.find('img').exists()).toBe(false);
    await new Promise(r => queueMicrotask(() => r(null)));
    await nextTick();
    expect(w.find('img').exists()).toBe(true);
    expect(w.find('img').attributes('src')).toBe('/ok.png');
    expect(w.find('.fb').exists()).toBe(false);
  });

  it('keeps fallback visible on error', async () => {
    const w = mount(defineComponent({
      setup: () => () => h(AvatarRoot, null, {
        default: () => [
          h(AvatarImage, { src: '/broken.png' }),
          h(AvatarFallback, { class: 'fb' }, { default: () => 'AB' }),
        ],
      }),
    }));
    await new Promise(r => queueMicrotask(() => r(null)));
    await nextTick();
    expect(w.find('img').exists()).toBe(false);
    expect(w.find('.fb').exists()).toBe(true);
  });

  it('delays fallback rendering when delayMs is set', async () => {
    vi.useFakeTimers();
    const w = mount(defineComponent({
      setup: () => () => h(AvatarRoot, null, {
        default: () => [
          h(AvatarFallback, { class: 'fb', delayMs: 500 }, { default: () => 'AB' }),
        ],
      }),
    }));
    expect(w.find('.fb').exists()).toBe(false);
    vi.advanceTimersByTime(500);
    await nextTick();
    expect(w.find('.fb').exists()).toBe(true);
    vi.useRealTimers();
  });

  it('sets data-status on the root element', async () => {
    const w = mount(defineComponent({
      setup: () => () => h(AvatarRoot, null, {
        default: () => [
          h(AvatarImage, { src: '/ok.png' }),
          h(AvatarFallback, null, { default: () => '?' }),
        ],
      }),
    }));
    await nextTick();
    expect(w.element.getAttribute('data-status')).toBe('loading');
    await new Promise(r => queueMicrotask(() => r(null)));
    await nextTick();
    expect(w.element.getAttribute('data-status')).toBe('loaded');
  });
});
