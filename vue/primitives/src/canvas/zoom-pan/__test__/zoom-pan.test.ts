import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import type { Viewport } from '../types';
import {
  clampViewport,
  clampZoom,
  contentToScreen,
  fitViewTransform,
  screenToContent,
  zoomAtPointer,
} from '../utils';
import { ViewportRoot } from '../index';

const ORIGIN = { left: 0, top: 0 };

// ── pure-math (no DOM) ───────────────────────────────────────────────────────

describe('screenToContent / contentToScreen', () => {
  it('are exact inverses at zoom 1', () => {
    const vp: Viewport = { x: 30, y: -10, zoom: 1 };
    const p = { x: 123, y: 456 };
    const content = screenToContent(p, vp, ORIGIN);
    expect(contentToScreen(content, vp, ORIGIN)).toEqual(p);
  });

  it('are exact inverses at several zooms (!= 1) and offsets', () => {
    const cases: Array<{ vp: Viewport; origin: { left: number; top: number }; p: { x: number; y: number } }> = [
      { vp: { x: 200, y: 80, zoom: 1.5 }, origin: { left: 64, top: 40 }, p: { x: 512, y: 300 } },
      { vp: { x: -120, y: 33, zoom: 0.5 }, origin: { left: 10, top: 5 }, p: { x: 47, y: 900 } },
      { vp: { x: 7, y: -7, zoom: 2.75 }, origin: { left: 100, top: 200 }, p: { x: 333, y: 12 } },
      { vp: { x: 0, y: 0, zoom: 0.137 }, origin: { left: 0, top: 0 }, p: { x: 1000, y: -500 } },
    ];
    for (const { vp, origin, p } of cases) {
      const content = screenToContent(p, vp, origin);
      const back = contentToScreen(content, vp, origin);
      expect(back.x).toBeCloseTo(p.x, 6);
      expect(back.y).toBeCloseTo(p.y, 6);
    }
  });

  it('divides out zoom and translation', () => {
    const vp: Viewport = { x: 100, y: 50, zoom: 2 };
    expect(screenToContent({ x: 100, y: 50 }, vp, ORIGIN)).toEqual({ x: 0, y: 0 });
    expect(screenToContent({ x: 300, y: 250 }, vp, ORIGIN)).toEqual({ x: 100, y: 100 });
  });

  it('subtracts the surface origin', () => {
    const vp: Viewport = { x: 0, y: 0, zoom: 1 };
    const origin = { left: 50, top: 20 };
    expect(screenToContent({ x: 50, y: 20 }, vp, origin)).toEqual({ x: 0, y: 0 });
    expect(screenToContent({ x: 150, y: 120 }, vp, origin)).toEqual({ x: 100, y: 100 });
  });
});

describe('zoomAtPointer', () => {
  it('keeps the content point under the cursor fixed', () => {
    const vp: Viewport = { x: 0, y: 0, zoom: 1 };
    const pointer = { x: 400, y: 300 };
    const next = zoomAtPointer(vp, 2, pointer);
    const before = screenToContent(pointer, vp, ORIGIN);
    const after = screenToContent(pointer, next, ORIGIN);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
    expect(next.zoom).toBe(2);
  });

  it('keeps the anchor fixed across multiple zoom levels and a translated viewport', () => {
    const vp: Viewport = { x: 120, y: -45, zoom: 0.8 };
    const pointer = { x: 250, y: 175 };
    for (const z of [0.4, 1, 1.6, 3.2]) {
      const next = zoomAtPointer(vp, z, pointer);
      const before = screenToContent(pointer, vp, ORIGIN);
      const after = screenToContent(pointer, next, ORIGIN);
      expect(after.x).toBeCloseTo(before.x, 6);
      expect(after.y).toBeCloseTo(before.y, 6);
    }
  });

  it('honours a non-zero surface origin (pointer given in client px)', () => {
    const vp: Viewport = { x: 10, y: 10, zoom: 1 };
    const origin = { left: 80, top: 30 };
    const pointer = { x: 480, y: 230 }; // client coords
    const next = zoomAtPointer(vp, 2, pointer, origin);
    const before = screenToContent(pointer, vp, origin);
    const after = screenToContent(pointer, next, origin);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
  });
});

describe('clampZoom', () => {
  it('clamps into [min, max]', () => {
    expect(clampZoom(5, 0.5, 2)).toBe(2);
    expect(clampZoom(0.1, 0.5, 2)).toBe(0.5);
    expect(clampZoom(1, 0.5, 2)).toBe(1);
  });
});

describe('clampViewport', () => {
  it('clamps only the zoom when no translate extent is given', () => {
    const vp = clampViewport({ x: 999, y: -999, zoom: 9 }, { minZoom: 0.5, maxZoom: 2 });
    expect(vp).toEqual({ x: 999, y: -999, zoom: 2 });
  });

  it('clamps the translate to the extent', () => {
    const vp = clampViewport({ x: 500, y: -500, zoom: 1 }, {
      minZoom: 0.1,
      maxZoom: 4,
      translateExtent: { minX: -100, maxX: 100, minY: -100, maxY: 100 },
    });
    expect(vp.x).toBe(100);
    expect(vp.y).toBe(-100);
  });

  it('centres a degenerate (min > max) translate interval instead of oscillating', () => {
    // Content smaller than the surface → no room to pan → centre at the midpoint.
    const vp = clampViewport({ x: 9999, y: -9999, zoom: 1 }, {
      minZoom: 0.1,
      maxZoom: 4,
      translateExtent: { minX: 50, maxX: -50, minY: 20, maxY: -20 },
    });
    expect(vp.x).toBe(0); // (50 + -50) / 2
    expect(vp.y).toBe(0); // (20 + -20) / 2
  });

  it('leaves an unconstrained side alone', () => {
    const vp = clampViewport({ x: 1000, y: 1000, zoom: 1 }, {
      minZoom: 0.1,
      maxZoom: 4,
      translateExtent: { maxX: 200 },
    });
    expect(vp.x).toBe(200);
    expect(vp.y).toBe(1000);
  });
});

describe('fitViewTransform', () => {
  it('is a no-op on a zero-sized surface', () => {
    const vp = fitViewTransform({ x: 0, y: 0, width: 100, height: 100 }, { width: 0, height: 0 }, { minZoom: 0.5, maxZoom: 2 });
    expect(vp).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('is a no-op on zero-sized bounds', () => {
    const vp = fitViewTransform({ x: 0, y: 0, width: 0, height: 0 }, { width: 400, height: 400 }, { minZoom: 0.5, maxZoom: 2 });
    expect(vp).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('centres known bounds in the surface', () => {
    const bounds = { x: 0, y: 0, width: 100, height: 100 };
    const vp = fitViewTransform(bounds, { width: 400, height: 400 }, { padding: 0, minZoom: 0.1, maxZoom: 4 });
    expect(vp.zoom).toBeCloseTo(4, 6);
    const center = contentToScreen({ x: 50, y: 50 }, vp, ORIGIN);
    expect(center.x).toBeCloseTo(200, 6);
    expect(center.y).toBeCloseTo(200, 6);
  });

  it('respects maxZoom', () => {
    const vp = fitViewTransform({ x: 0, y: 0, width: 10, height: 10 }, { width: 1000, height: 1000 }, { padding: 0, minZoom: 0.5, maxZoom: 2 });
    expect(vp.zoom).toBe(2);
  });
});

// ── component mount smoke test (browser mode → real layout) ──────────────────

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

/** Wait for `n` real animation frames so layout + ResizeObserver settle. */
function raf(n = 1): Promise<void> {
  return new Promise((resolve) => {
    let i = 0;
    const step = (): void => {
      if (++i >= n) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

function mountViewport(props: Record<string, unknown> = {}) {
  const exposed = ref<any>(null);
  const Harness = defineComponent({
    setup() {
      return () => h(ViewportRoot, {
        ref: (r: any) => { exposed.value = r; },
        style: 'width: 400px; height: 300px;',
        ...props,
      }, {
        default: () => h('div', { 'data-child': '', style: 'width: 100px; height: 100px;' }, 'content'),
      });
    },
  });
  const w = track(mount(Harness, { attachTo: document.body }));
  return { wrapper: w, exposed };
}

describe('ViewportRoot / Surface / Content (mount)', () => {
  it('renders the surface, the transformed content layer, and the child', async () => {
    mountViewport();
    await nextTick();
    const root = document.querySelector('[data-viewport-root]');
    const surface = document.querySelector('[data-viewport-surface]');
    const content = document.querySelector<HTMLElement>('[data-viewport-content]');
    const child = document.querySelector('[data-child]');
    expect(root).toBeTruthy();
    expect(surface).toBeTruthy();
    expect(content).toBeTruthy();
    expect(child?.textContent).toBe('content');
    // Default identity transform.
    expect(content!.style.transform).toContain('translate(0px, 0px)');
    expect(content!.style.transform).toContain('scale(1)');
  });

  it('sets touch-action:none + overflow:hidden on the surface and a11y role/tabindex', async () => {
    mountViewport();
    await nextTick();
    const surface = document.querySelector<HTMLElement>('[data-viewport-surface]')!;
    expect(surface.style.overflow).toBe('hidden');
    expect(surface.style.touchAction).toBe('none');
    expect(surface.getAttribute('role')).toBe('application');
    expect(surface.tabIndex).toBe(0);
  });

  it('flags the surface as measured once it has a non-zero rect', async () => {
    mountViewport();
    await raf(2);
    await nextTick();
    const surface = document.querySelector<HTMLElement>('[data-viewport-surface]')!;
    expect(surface.getAttribute('data-measured')).toBe('');
  });

  it('exposes the imperative api and reflects it in the content transform', async () => {
    const { exposed } = mountViewport({ minZoom: 0.5, maxZoom: 4 });
    await nextTick();
    await nextTick();

    expect(typeof exposed.value.zoomTo).toBe('function');
    expect(typeof exposed.value.fit).toBe('function');

    exposed.value.zoomTo(2);
    await nextTick();
    const content = document.querySelector<HTMLElement>('[data-viewport-content]')!;
    expect(content.style.transform).toContain('scale(2)');

    // panBy moves the translate.
    exposed.value.panBy(40, 25);
    await nextTick();
    expect(content.style.transform).toContain('translate(40px, 25px)');
  });

  it('clamps an out-of-range setViewport through the api', async () => {
    const { exposed } = mountViewport({ minZoom: 0.5, maxZoom: 2 });
    await nextTick();
    await nextTick();
    exposed.value.setViewport({ x: 0, y: 0, zoom: 99 });
    await nextTick();
    expect(exposed.value.getViewport().zoom).toBe(2);
  });

  it('drives a controlled v-model:viewport', async () => {
    const vp = ref<Viewport>({ x: 0, y: 0, zoom: 1 });
    const Harness = defineComponent({
      setup() {
        return () => {
          const rootProps: Record<string, unknown> = {
            viewport: vp.value,
            'onUpdate:viewport': (v: Viewport) => { vp.value = v; },
            style: 'width: 400px; height: 300px;',
          };
          return h(ViewportRoot, rootProps, {
            default: () => h('div', { 'data-child': '' }, 'x'),
          });
        };
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    vp.value = { x: 10, y: 20, zoom: 1.5 };
    await nextTick();
    const content = document.querySelector<HTMLElement>('[data-viewport-content]')!;
    expect(content.style.transform).toContain('translate(10px, 20px)');
    expect(content.style.transform).toContain('scale(1.5)');
  });
});
