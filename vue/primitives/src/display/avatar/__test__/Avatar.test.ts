import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { AvatarFallback, AvatarImage, AvatarRoot } from '../index';

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  complete = false;
  naturalWidth = 0;
  referrerPolicy = '';
  crossOrigin: string | null = null;
  private _src = '';
  set src(value: string) {
    this._src = value;
    queueMicrotask(() => {
      if (value.includes('broken')) {
        this.onerror?.();
      }
      else if (value.includes('zero')) {
        // Fires load but decoded to 0×0 (degenerate response).
        this.complete = true;
        this.naturalWidth = 0;
        this.onload?.();
      }
      else {
        this.complete = true;
        this.naturalWidth = 64;
        this.onload?.();
      }
    });
  }

  get src() { return this._src; }
}

// A synchronously-cached image: `complete`/`naturalWidth` are already truthy
// the moment `src` is assigned, so no async event is needed.
class CachedImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  complete = true;
  naturalWidth = 64;
  referrerPolicy = '';
  crossOrigin: string | null = null;
  src = '';
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
    }), { attachTo: document.body });
    expect(w.find('.fb').exists()).toBe(true);
    expect(w.find('img').exists()).toBe(false);
    await new Promise(r => queueMicrotask(() => r(null)));
    await nextTick();
    expect(w.find('img').exists()).toBe(true);
    expect(w.find('img').attributes('src')).toBe('/ok.png');
    expect(w.find('.fb').exists()).toBe(false);
    w.unmount();
  });

  it('keeps fallback visible on error', async () => {
    const w = mount(defineComponent({
      setup: () => () => h(AvatarRoot, null, {
        default: () => [
          h(AvatarImage, { src: '/broken.png' }),
          h(AvatarFallback, { class: 'fb' }, { default: () => 'AB' }),
        ],
      }),
    }), { attachTo: document.body });
    await new Promise(r => queueMicrotask(() => r(null)));
    await nextTick();
    expect(w.find('img').exists()).toBe(false);
    expect(w.find('.fb').exists()).toBe(true);
    w.unmount();
  });

  it('treats a zero-dimension (degenerate) onload as error', async () => {
    const w = mount(defineComponent({
      setup: () => () => h(AvatarRoot, null, {
        default: () => [
          h(AvatarImage, { src: '/zero.png' }),
          h(AvatarFallback, { class: 'fb' }, { default: () => 'AB' }),
        ],
      }),
    }), { attachTo: document.body });
    await new Promise(r => queueMicrotask(() => r(null)));
    await nextTick();
    expect(w.find('img').exists()).toBe(false);
    expect(w.find('.fb').exists()).toBe(true);
    expect(w.element.getAttribute('data-status')).toBe('error');
    w.unmount();
  });

  it('shows a browser-cached image synchronously without a fallback flash', async () => {
    vi.stubGlobal('Image', CachedImage as unknown as typeof Image);
    const statuses: string[] = [];
    const w = mount(defineComponent({
      setup: () => () => h(AvatarRoot, null, {
        default: () => [
          h(AvatarImage, {
            src: '/cached.png',
            onLoadingStatusChange: (s: string) => statuses.push(s),
          }),
          h(AvatarFallback, { class: 'fb' }, { default: () => 'AB' }),
        ],
      }),
    }), { attachTo: document.body });
    await nextTick();
    // It jumped straight to loaded — never went through a visible loading/error flash.
    expect(statuses).not.toContain('loading');
    expect(statuses).not.toContain('error');
    expect(statuses.at(-1)).toBe('loaded');
    expect(w.find('img').exists()).toBe(true);
    expect(w.find('.fb').exists()).toBe(false);
    w.unmount();
  });

  it('delays fallback rendering when delayMs is set', async () => {
    vi.useFakeTimers();
    const w = mount(defineComponent({
      setup: () => () => h(AvatarRoot, null, {
        default: () => [
          h(AvatarFallback, { class: 'fb', delayMs: 500 }, { default: () => 'AB' }),
        ],
      }),
    }), { attachTo: document.body });
    expect(w.find('.fb').exists()).toBe(false);
    vi.advanceTimersByTime(500);
    await nextTick();
    expect(w.find('.fb').exists()).toBe(true);
    vi.useRealTimers();
    w.unmount();
  });

  it('sets data-status on the root element', async () => {
    // A manually-driven image: it never auto-resolves, so the transient
    // 'loading' state is observable deterministically before we fire onload.
    const created: ManualImage[] = [];
    class ManualImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      complete = false;
      naturalWidth = 0;
      src = '';
      constructor() {
        created.push(this);
      }

      resolve() {
        this.complete = true;
        this.naturalWidth = 64;
        this.onload?.();
      }
    }
    vi.stubGlobal('Image', ManualImage as unknown as typeof Image);
    const w = mount(defineComponent({
      setup: () => () => h(AvatarRoot, null, {
        default: () => [
          h(AvatarImage, { src: '/ok.png' }),
          h(AvatarFallback, null, { default: () => '?' }),
        ],
      }),
    }), { attachTo: document.body });
    await nextTick();
    expect(w.element.getAttribute('data-status')).toBe('loading');
    created[0]!.resolve();
    await nextTick();
    expect(w.element.getAttribute('data-status')).toBe('loaded');
    w.unmount();
  });

  it('shows fallback when src is empty (error status)', async () => {
    const w = mount(defineComponent({
      setup: () => () => h(AvatarRoot, null, {
        default: () => [
          h(AvatarImage, {}),
          h(AvatarFallback, { class: 'fb' }, { default: () => 'AB' }),
        ],
      }),
    }), { attachTo: document.body });
    await nextTick();
    expect(w.element.getAttribute('data-status')).toBe('error');
    expect(w.find('img').exists()).toBe(false);
    expect(w.find('.fb').exists()).toBe(true);
    w.unmount();
  });

  it('renders role="img" on the loaded image', async () => {
    const w = mount(defineComponent({
      setup: () => () => h(AvatarRoot, null, {
        default: () => [
          h(AvatarImage, { src: '/ok.png', alt: 'user' }),
        ],
      }),
    }), { attachTo: document.body });
    await new Promise(r => queueMicrotask(() => r(null)));
    await nextTick();
    const img = w.find('img');
    expect(img.exists()).toBe(true);
    expect(img.attributes('role')).toBe('img');
    expect(img.attributes('alt')).toBe('user');
    w.unmount();
  });

  it('forwards referrerPolicy and crossOrigin to the rendered image', async () => {
    const w = mount(defineComponent({
      setup: () => () => h(AvatarRoot, null, {
        default: () => [
          h(AvatarImage, {
            src: '/ok.png',
            referrerPolicy: 'no-referrer',
            crossOrigin: 'anonymous',
          }),
        ],
      }),
    }), { attachTo: document.body });
    await new Promise(r => queueMicrotask(() => r(null)));
    await nextTick();
    const img = w.find('img');
    expect(img.attributes('referrerpolicy')).toBe('no-referrer');
    expect(img.attributes('crossorigin')).toBe('anonymous');
    w.unmount();
  });

  it('applies referrerPolicy and crossOrigin to the out-of-band preload', async () => {
    const created: MockImage[] = [];
    class TrackingImage extends MockImage {
      constructor() {
        super();
        created.push(this);
      }
    }
    vi.stubGlobal('Image', TrackingImage as unknown as typeof Image);
    const w = mount(defineComponent({
      setup: () => () => h(AvatarRoot, null, {
        default: () => [
          h(AvatarImage, {
            src: '/ok.png',
            referrerPolicy: 'origin',
            crossOrigin: 'use-credentials',
          }),
        ],
      }),
    }), { attachTo: document.body });
    await nextTick();
    expect(created.length).toBe(1);
    expect(created[0]!.referrerPolicy).toBe('origin');
    expect(created[0]!.crossOrigin).toBe('use-credentials');
    w.unmount();
  });

  it('emits loadingStatusChange as a Vue emit', async () => {
    const events: string[] = [];
    const w = mount(defineComponent({
      setup: () => () => h(AvatarRoot, null, {
        default: () => [
          h(AvatarImage, {
            src: '/ok.png',
            onLoadingStatusChange: (s: string) => events.push(s),
          }),
        ],
      }),
    }), { attachTo: document.body });
    await new Promise(r => queueMicrotask(() => r(null)));
    await nextTick();
    expect(events).toContain('loading');
    expect(events).toContain('loaded');
    w.unmount();
  });

  it('guards against a stale in-flight load when src changes', async () => {
    const statuses: string[] = [];
    const w = mount(defineComponent({
      props: { src: { type: String, default: '/broken.png' } },
      setup: props => () => h(AvatarRoot, null, {
        default: () => [
          h(AvatarImage, {
            src: props.src,
            onLoadingStatusChange: (s: string) => statuses.push(s),
          }),
          h(AvatarFallback, { class: 'fb' }, { default: () => 'AB' }),
        ],
      }),
    }), { attachTo: document.body, props: { src: '/broken.png' } });
    // Swap to a good src before the broken one's microtask resolves.
    await w.setProps({ src: '/ok.png' });
    await new Promise(r => queueMicrotask(() => r(null)));
    await new Promise(r => queueMicrotask(() => r(null)));
    await nextTick();
    // The stale broken load must not clobber the newer good status.
    expect(w.element.getAttribute('data-status')).toBe('loaded');
    expect(w.find('img').exists()).toBe(true);
    w.unmount();
  });
});
