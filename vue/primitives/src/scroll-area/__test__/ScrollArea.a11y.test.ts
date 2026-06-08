import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';

import {
  ScrollAreaRoot,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from '../../index';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

function makeApp({
  rootProps = {},
  innerSize = '500px',
}: { rootProps?: Record<string, unknown>; innerSize?: string } = {}) {
  return defineComponent({
    setup() {
      return () => h(
        ScrollAreaRoot,
        { ...rootProps, type: 'always', style: { width: '100px', height: '100px' } },
        {
          default: () => [
            h(ScrollAreaViewport, { style: { width: '100%', height: '100%' } }, {
              default: () => h('div', { style: { width: innerSize, height: innerSize } }, 'content'),
            }),
            h(ScrollAreaScrollbar, { orientation: 'vertical' }, {
              default: () => h(ScrollAreaThumb),
            }),
            h(ScrollAreaScrollbar, { orientation: 'horizontal' }, {
              default: () => h(ScrollAreaThumb),
            }),
          ],
        },
      );
    },
  });
}

function mountApp(options?: { rootProps?: Record<string, unknown>; innerSize?: string }) {
  return track(mount(makeApp(options), { attachTo: document.body }));
}

function getScrollbar(orientation: 'horizontal' | 'vertical'): HTMLElement {
  return document.querySelector(`[role="scrollbar"][aria-orientation="${orientation}"]`) as HTMLElement;
}

function getViewport(): HTMLElement {
  return document.querySelector('[data-scroll-area-viewport]') as HTMLElement;
}

async function waitFrames(n = 3) {
  for (let i = 0; i < n; i++) {
    await new Promise<void>(r => requestAnimationFrame(() => r()));
    await nextTick();
  }
}

describe('scroll-area — scrollbar ARIA', () => {
  it('exposes role=scrollbar with full ARIA contract', async () => {
    mountApp();
    await waitFrames();
    const v = getScrollbar('vertical');
    const h = getScrollbar('horizontal');
    expect(v).toBeTruthy();
    expect(h).toBeTruthy();
    for (const sb of [v, h]) {
      expect(sb.getAttribute('aria-valuemin')).toBe('0');
      expect(sb.getAttribute('aria-valuemax')).toBe('100');
      expect(sb.getAttribute('aria-valuenow')).toBe('0');
    }
    expect(v.getAttribute('aria-orientation')).toBe('vertical');
    expect(h.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('wires aria-controls to the viewport id', async () => {
    mountApp();
    await waitFrames();
    const v = getScrollbar('vertical');
    const vp = getViewport();
    expect(vp.id).toBeTruthy();
    expect(v.getAttribute('aria-controls')).toBe(vp.id);
  });

  it('marks scrollbar interactive (tabindex=0) when content overflows', async () => {
    mountApp({ innerSize: '500px' });
    await waitFrames();
    const v = getScrollbar('vertical');
    expect(v.getAttribute('tabindex')).toBe('0');
    expect(v.hasAttribute('aria-disabled')).toBe(false);
  });

  it('marks scrollbar non-interactive (tabindex=-1, aria-disabled) when content fits', async () => {
    mountApp({ innerSize: '50px' });
    await waitFrames();
    const v = getScrollbar('vertical');
    expect(v.getAttribute('tabindex')).toBe('-1');
    expect(v.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('scroll-area — scrollbar keyboard support', () => {
  it('End scrolls the vertical viewport to the bottom and updates aria-valuenow', async () => {
    mountApp({ innerSize: '500px' });
    await waitFrames();
    const v = getScrollbar('vertical');
    const vp = getViewport();
    expect(vp.scrollTop).toBe(0);
    const ev = new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true });
    v.dispatchEvent(ev);
    await waitFrames();
    expect(ev.defaultPrevented).toBe(true);
    expect(vp.scrollTop).toBeGreaterThan(0);
    expect(v.getAttribute('aria-valuenow')).toBe('100');
  });

  it('Home scrolls to the top', async () => {
    mountApp({ innerSize: '500px' });
    await waitFrames();
    const v = getScrollbar('vertical');
    const vp = getViewport();
    vp.scrollTop = 9999;
    await waitFrames();
    v.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    await waitFrames();
    expect(vp.scrollTop).toBe(0);
    expect(v.getAttribute('aria-valuenow')).toBe('0');
  });

  it('ArrowDown moves the vertical viewport forward by ~5% of viewport size', async () => {
    mountApp({ innerSize: '500px' });
    await waitFrames();
    const v = getScrollbar('vertical');
    const vp = getViewport();
    const expectedStep = Math.max(1, Math.round(vp.offsetHeight * 0.05));
    v.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    await waitFrames();
    expect(vp.scrollTop).toBe(expectedStep);
  });

  it('PageDown moves the vertical viewport by a full viewport', async () => {
    mountApp({ innerSize: '500px' });
    await waitFrames();
    const v = getScrollbar('vertical');
    const vp = getViewport();
    const page = vp.offsetHeight;
    v.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true, cancelable: true }));
    await waitFrames();
    expect(vp.scrollTop).toBe(page);
  });

  it('LTR: ArrowRight scrolls the horizontal viewport forward', async () => {
    mountApp({ innerSize: '500px' });
    await waitFrames();
    const h = getScrollbar('horizontal');
    const vp = getViewport();
    const expectedStep = Math.max(1, Math.round(vp.offsetWidth * 0.05));
    h.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    await waitFrames();
    expect(vp.scrollLeft).toBe(expectedStep);
  });

  it('RTL: ArrowLeft on the horizontal scrollbar engages the handler (visually reversed)', async () => {
    mountApp({ rootProps: { dir: 'rtl' }, innerSize: '500px' });
    await waitFrames();
    const h = getScrollbar('horizontal');
    const ev = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true });
    h.dispatchEvent(ev);
    await waitFrames();
    // In RTL the visually-forward arrow is ArrowLeft; we assert the handler
    // claimed the event (browser RTL scrollLeft semantics vary, so direction
    // of the delta itself is asserted indirectly via preventDefault here).
    expect(ev.defaultPrevented).toBe(true);
  });

  it('keydown is a no-op when the scrollbar is non-interactive', async () => {
    mountApp({ innerSize: '50px' });
    await waitFrames();
    const v = getScrollbar('vertical');
    const vp = getViewport();
    const before = vp.scrollTop;
    const ev = new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true });
    v.dispatchEvent(ev);
    await waitFrames();
    expect(ev.defaultPrevented).toBe(false);
    expect(vp.scrollTop).toBe(before);
  });
});
