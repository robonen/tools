import {
  ScrollAreaCorner,
  ScrollAreaRoot,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from '../../index';
import {
  clamp,
  getScrollPositionFromPointer,
  getThumbOffsetFromScroll,
  getThumbRatio,
  getThumbSize,
  isScrollingWithinScrollbarBounds,
  toInt,
} from '../utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';

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

function makeApp(rootProps: Record<string, unknown> = {}) {
  return defineComponent({
    setup(_, { expose }) {
      const rootRef = ref<any>(null);
      expose({ rootRef });
      return () => h(ScrollAreaRoot, { ref: rootRef, ...rootProps, style: { width: '100px', height: '100px' } }, {
        default: () => [
          h(ScrollAreaViewport, { style: { width: '100%', height: '100%' } }, {
            default: () => h('div', { style: { width: '500px', height: '500px' } }, 'content'),
          }),
          h(ScrollAreaScrollbar, { orientation: 'vertical' }, {
            default: () => h(ScrollAreaThumb),
          }),
          h(ScrollAreaScrollbar, { orientation: 'horizontal' }, {
            default: () => h(ScrollAreaThumb),
          }),
          h(ScrollAreaCorner),
        ],
      });
    },
  });
}

describe('scrollArea utils', () => {
  it('clamp constrains value to range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });

  it('toInt parses pixel strings', () => {
    expect(toInt('12px')).toBe(12);
    expect(toInt('')).toBe(0);
    expect(toInt(undefined)).toBe(0);
    expect(toInt(null)).toBe(0);
  });

  it('getThumbRatio is 1 when viewport >= content', () => {
    expect(getThumbRatio(100, 100)).toBe(1);
    expect(getThumbRatio(200, 100)).toBe(1);
    expect(getThumbRatio(0, 0)).toBe(1);
  });

  it('getThumbRatio is fraction when content exceeds viewport', () => {
    expect(getThumbRatio(100, 200)).toBe(0.5);
    expect(getThumbRatio(50, 200)).toBe(0.25);
  });

  it('getThumbSize enforces 18px minimum', () => {
    const sizes = {
      content: 100000,
      viewport: 100,
      scrollbar: { size: 100, paddingStart: 0, paddingEnd: 0 },
    };
    expect(getThumbSize(sizes)).toBe(18);
  });

  it('getThumbSize scales with ratio', () => {
    const sizes = {
      content: 200,
      viewport: 100,
      scrollbar: { size: 100, paddingStart: 0, paddingEnd: 0 },
    };
    expect(getThumbSize(sizes)).toBe(50);
  });

  it('getThumbOffsetFromScroll maps 0 → 0 and max → maxThumbPos (LTR)', () => {
    const sizes = {
      content: 200,
      viewport: 100,
      scrollbar: { size: 100, paddingStart: 0, paddingEnd: 0 },
    };
    expect(getThumbOffsetFromScroll(0, sizes)).toBe(0);
    expect(getThumbOffsetFromScroll(100, sizes)).toBe(50);
    expect(getThumbOffsetFromScroll(50, sizes)).toBe(25);
  });

  it('getThumbOffsetFromScroll handles RTL negative scroll', () => {
    const sizes = {
      content: 200,
      viewport: 100,
      scrollbar: { size: 100, paddingStart: 0, paddingEnd: 0 },
    };
    expect(getThumbOffsetFromScroll(0, sizes, 'rtl')).toBe(50);
    expect(getThumbOffsetFromScroll(-100, sizes, 'rtl')).toBe(0);
  });

  it('getScrollPositionFromPointer maps min/max pointer to scroll range', () => {
    const sizes = {
      content: 200,
      viewport: 100,
      scrollbar: { size: 100, paddingStart: 0, paddingEnd: 0 },
    };
    expect(getScrollPositionFromPointer(25, 25, sizes)).toBe(0);
    expect(getScrollPositionFromPointer(75, 25, sizes)).toBe(100);
    expect(getScrollPositionFromPointer(50, 25, sizes)).toBe(50);
  });

  it('isScrollingWithinScrollbarBounds detects intermediate scroll positions', () => {
    expect(isScrollingWithinScrollbarBounds(0, 100)).toBe(false);
    expect(isScrollingWithinScrollbarBounds(100, 100)).toBe(false);
    expect(isScrollingWithinScrollbarBounds(50, 100)).toBe(true);
  });
});

describe('scrollArea components', () => {
  it('renders root with viewport and scrollbars', async () => {
    const w = track(mount(makeApp({ type: 'always' }), { attachTo: document.body }));
    await nextTick();
    expect(w.find('[data-scroll-area-viewport]').exists()).toBe(true);
    expect(w.findAll('[data-orientation="vertical"]').length).toBeGreaterThan(0);
    expect(w.findAll('[data-orientation="horizontal"]').length).toBeGreaterThan(0);
  });

  it('viewport hides native scrollbars via injected stylesheet', () => {
    const w = track(mount(makeApp({ type: 'always' }), { attachTo: document.body }));
    expect(w.html()).toContain('-webkit-scrollbar');
  });

  it('honours `dir` prop', () => {
    const w = track(mount(makeApp({ dir: 'rtl' }), { attachTo: document.body }));
    expect(w.find('[dir="rtl"]').exists()).toBe(true);
  });

  it('forwards `as` to Primitive', () => {
    const w = track(mount(makeApp({ as: 'section' }), { attachTo: document.body }));
    expect(w.find('section').exists()).toBe(true);
  });

  it('hover mode keeps scrollbar mounted while pointer is over root', async () => {
    const w = track(mount(makeApp({ type: 'hover', scrollHideDelay: 1 }), { attachTo: document.body }));
    await nextTick();
    const root = w.find('[dir]').element as HTMLElement;
    root.dispatchEvent(new PointerEvent('pointerenter'));
    await nextTick();
    expect(w.findAll('[data-state="visible"]').length).toBeGreaterThan(0);
  });

  it('exposes scrollTop / scrollTopLeft', async () => {
    const w = track(mount(makeApp({ type: 'always' }), { attachTo: document.body }));
    await nextTick();
    const root = (w.vm as any).rootRef;
    expect(typeof root.scrollTop).toBe('function');
    expect(typeof root.scrollTopLeft).toBe('function');
    root.scrollTop();
    root.scrollTopLeft();
  });
});
