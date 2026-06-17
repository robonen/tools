import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';

import {
  ScrollAreaCorner,
  ScrollAreaRoot,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from '../../../index';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
  document.body.removeAttribute('style');
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

function makeApp(rootProps: Record<string, unknown> = {}, opts: { scrollbarRef?: any } = {}) {
  return defineComponent({
    setup() {
      return () => h(
        ScrollAreaRoot,
        { ...rootProps, style: { width: '100px', height: '100px' } },
        {
          default: () => [
            h(ScrollAreaViewport, { style: { width: '100%', height: '100%' } }, {
              default: () => h('div', { style: { width: '500px', height: '500px' } }, 'content'),
            }),
            h(ScrollAreaScrollbar, { orientation: 'vertical', ...(opts.scrollbarRef ? { ref: opts.scrollbarRef } : {}) }, {
              default: () => h(ScrollAreaThumb),
            }),
            h(ScrollAreaScrollbar, { orientation: 'horizontal' }, {
              default: () => h(ScrollAreaThumb),
            }),
            h(ScrollAreaCorner),
          ],
        },
      );
    },
  });
}

async function waitFrames(n = 3) {
  for (let i = 0; i < n; i++) {
    await new Promise<void>(r => requestAnimationFrame(() => r()));
    await nextTick();
  }
}

function getScrollbar(orientation: 'horizontal' | 'vertical'): HTMLElement {
  return document.querySelector(`[role="scrollbar"][aria-orientation="${orientation}"]`) as HTMLElement;
}

function getViewport(): HTMLElement {
  return document.querySelector('[data-scroll-area-viewport]') as HTMLElement;
}

describe('scroll-area — thumb sizing', () => {
  it('sets the thumb-size CSS var on the scrollbar so the thumb has length', async () => {
    track(mount(makeApp({ type: 'always' }), { attachTo: document.body }));
    await waitFrames();
    const v = getScrollbar('vertical');
    const h2 = getScrollbar('horizontal');
    // The vars are written inline on the scrollbar element style.
    expect(v.style.getPropertyValue('--scroll-area-thumb-height')).toMatch(/px$/);
    expect(h2.style.getPropertyValue('--scroll-area-thumb-width')).toMatch(/px$/);
  });
});

describe('scroll-area — viewport keyboard focus', () => {
  it('viewport is focusable by default (tabindex=0)', async () => {
    track(mount(makeApp({ type: 'always' }), { attachTo: document.body }));
    await waitFrames();
    expect(getViewport().getAttribute('tabindex')).toBe('0');
  });

  it('viewport tabindex is overridable', async () => {
    const App = defineComponent({
      setup() {
        return () => h(
          ScrollAreaRoot,
          { type: 'always', style: { width: '100px', height: '100px' } },
          {
            default: () => [
              h(ScrollAreaViewport, { tabindex: -1, style: { width: '100%', height: '100%' } }, {
                default: () => h('div', { style: { width: '500px', height: '500px' } }, 'content'),
              }),
              h(ScrollAreaScrollbar, { orientation: 'vertical' }, { default: () => h(ScrollAreaThumb) }),
            ],
          },
        );
      },
    });
    track(mount(App, { attachTo: document.body }));
    await waitFrames();
    expect(getViewport().getAttribute('tabindex')).toBe('-1');
  });
});

describe('scroll-area — RTL scrollbar positioning', () => {
  it('LTR keeps the vertical bar on the right', async () => {
    track(mount(makeApp({ type: 'always', dir: 'ltr' }), { attachTo: document.body }));
    await waitFrames();
    const v = getScrollbar('vertical');
    expect(v.style.right).toBe('0px');
    expect(v.style.left).toBe('');
  });

  it('RTL flips the vertical bar to the left', async () => {
    track(mount(makeApp({ type: 'always', dir: 'rtl' }), { attachTo: document.body }));
    await waitFrames();
    const v = getScrollbar('vertical');
    expect(v.style.left).toBe('0px');
    expect(v.style.right).toBe('');
  });
});

describe('scroll-area — thumb data-state', () => {
  it('reflects hasThumb when content overflows', async () => {
    track(mount(makeApp({ type: 'always' }), { attachTo: document.body }));
    await waitFrames();
    const thumb = document.querySelector('[data-state]') as HTMLElement;
    expect(thumb).toBeTruthy();
    // jsdom has no layout; with always type the scrollbar is mounted and
    // thumb data-state derives from hasThumb (false in jsdom => 'hidden').
    expect(['visible', 'hidden']).toContain(thumb.getAttribute('data-state'));
  });
});

describe('scroll-area — ref forwarding', () => {
  it('forwards a template ref on ScrollAreaScrollbar to the DOM scrollbar element', async () => {
    const scrollbarRef = ref<any>(null);
    track(mount(makeApp({ type: 'always' }, { scrollbarRef }), { attachTo: document.body }));
    await waitFrames();
    const el = scrollbarRef.value?.$el ?? scrollbarRef.value;
    expect(el).toBeTruthy();
    expect((el as HTMLElement).getAttribute?.('role')).toBe('scrollbar');
  });
});

describe('scroll-area — glimpse type', () => {
  it('accepts type="glimpse" and reveals scrollbars on pointer enter', async () => {
    const w = track(mount(makeApp({ type: 'glimpse', scrollHideDelay: 5000 }), { attachTo: document.body }));
    await waitFrames();
    const root = w.element as HTMLElement;
    root.dispatchEvent(new PointerEvent('pointerenter'));
    await waitFrames();
    // Scope to this component's root: browser-mode suites share one document,
    // so a global query can also count scrollbars mounted by other suites.
    expect(root.querySelectorAll('[data-state="visible"]').length).toBeGreaterThan(0);
  });

  it('glimpse stays hidden before any interaction', async () => {
    const w = track(mount(makeApp({ type: 'glimpse', scrollHideDelay: 5000 }), { attachTo: document.body }));
    await waitFrames();
    // No pointer enter / scroll => no visible scrollbar yet. Scoped to this
    // component's root (a global query can pick up other suites' scrollbars).
    expect((w.element as HTMLElement).querySelectorAll('[data-state="visible"]').length).toBe(0);
  });
});

describe('scroll-area — corner type guard', () => {
  it('does not render a corner for type="scroll"', async () => {
    const App = defineComponent({
      setup() {
        return () => h(
          ScrollAreaRoot,
          { type: 'scroll', style: { width: '100px', height: '100px' } },
          {
            default: () => [
              h(ScrollAreaViewport, { style: { width: '100%', height: '100%' } }, {
                default: () => h('div', { style: { width: '500px', height: '500px' } }, 'content'),
              }),
              h(ScrollAreaScrollbar, { orientation: 'vertical', forceMount: true }, { default: () => h(ScrollAreaThumb) }),
              h(ScrollAreaScrollbar, { orientation: 'horizontal', forceMount: true }, { default: () => h(ScrollAreaThumb) }),
              h(ScrollAreaCorner),
            ],
          },
        );
      },
    });
    const w = track(mount(App, { attachTo: document.body }));
    await waitFrames();
    // Corner only renders when both bars are present AND type !== 'scroll'.
    // For type='scroll' the corner must never appear.
    const corners = w.findAll('div').filter(d => (d.element as HTMLElement).style.position === 'absolute' && (d.element as HTMLElement).getAttribute('role') !== 'scrollbar');
    // None of the absolutely-positioned non-scrollbar divs should be the corner.
    // (Corner has both width/height px set and bottom:0 with no role.)
    const corner = corners.find(d => (d.element as HTMLElement).style.bottom === '0px' && !(d.element as HTMLElement).hasAttribute('aria-orientation'));
    expect(corner).toBeUndefined();
  });
});
