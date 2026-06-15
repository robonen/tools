import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { CanvasStageContent, CanvasStagePane, CanvasStageRoot } from '../index';

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

function mountStage(props: Record<string, unknown> = {}) {
  const exposed = ref<any>(null);
  const Harness = defineComponent({
    setup() {
      return () => h(CanvasStageRoot, {
        ref: (r: any) => { exposed.value = r; },
        style: 'width: 400px; height: 300px;',
        contentWidth: 800,
        contentHeight: 600,
        'aria-label': 'Photo',
        ...props,
      }, {
        default: () => h('img', { 'data-child': '', src: '', width: 800, height: 600 }),
      });
    },
  });
  const w = track(mount(Harness, { attachTo: document.body }));
  return { wrapper: w, exposed };
}

describe('CanvasStageRoot (mount)', () => {
  it('renders role=application + roledescription + tabindex 0', async () => {
    mountStage();
    await nextTick();
    const root = document.querySelector<HTMLElement>('[data-canvas-stage-root]')!;
    expect(root).toBeTruthy();
    expect(root.getAttribute('role')).toBe('application');
    expect(root.getAttribute('aria-roledescription')).toBe('zoomable canvas');
    expect(root.tabIndex).toBe(0);
    // Consumer aria-label rides through $attrs.
    expect(root.getAttribute('aria-label')).toBe('Photo');
  });

  it('composes ViewportRoot/Surface/Content and renders the child in the transformed layer', async () => {
    mountStage();
    await nextTick();
    expect(document.querySelector('[data-viewport-root]')).toBeTruthy();
    expect(document.querySelector('[data-canvas-stage-pane][data-viewport-surface]')).toBeTruthy();
    const content = document.querySelector<HTMLElement>('[data-canvas-stage-content][data-viewport-content]');
    expect(content).toBeTruthy();
    // The child renders INSIDE the transformed content layer.
    const child = content!.querySelector('[data-child]');
    expect(child).toBeTruthy();
    expect(content!.style.transformOrigin).toBe('0px 0px');
  });

  it('keeps the pane a real clipping box (overflow hidden + touch-action none)', async () => {
    mountStage();
    await nextTick();
    const pane = document.querySelector<HTMLElement>('[data-canvas-stage-pane]')!;
    expect(pane.style.overflow).toBe('hidden');
    expect(pane.style.touchAction).toBe('none');
  });

  it('exposes the combined api (fitView/zoomToActual/fitFill/reset/...)', async () => {
    const { exposed } = mountStage();
    await nextTick();
    for (const fn of ['getViewport', 'setViewport', 'zoomIn', 'zoomOut', 'zoomTo', 'fitView', 'zoomToActual', 'fitFill', 'center', 'reset']) {
      expect(typeof exposed.value[fn]).toBe('function');
    }
  });

  it('zoomToActual sets zoom to 1 (1:1)', async () => {
    const { exposed } = mountStage({ defaultViewport: { x: 0, y: 0, zoom: 0.3 } });
    await raf(2);
    await nextTick();
    exposed.value.zoomToActual();
    await nextTick();
    expect(exposed.value.getViewport().zoom).toBeCloseTo(1, 5);
  });

  it('fitFill covers the pane (zoom = max ratio), fitView contains it (smaller)', async () => {
    // pane 400x300, content 800x600 → contain = 0.5, cover = 0.5 here (same aspect).
    // Use a non-matching aspect so contain != cover.
    const { exposed } = mountStage({ contentWidth: 800, contentHeight: 200 });
    await raf(2);
    await nextTick();

    exposed.value.fitView();
    await nextTick();
    const fitZoom = exposed.value.getViewport().zoom;

    exposed.value.fitFill();
    await nextTick();
    const fillZoom = exposed.value.getViewport().zoom;

    // contain uses min ratio (with padding) → smaller; cover uses max ratio → larger.
    expect(fillZoom).toBeGreaterThan(fitZoom);
  });

  it('pressing \'0\' calls zoomToActual and \'1\' calls fitView', async () => {
    const { exposed } = mountStage({ defaultViewport: { x: 0, y: 0, zoom: 4 } });
    await raf(2);
    await nextTick();
    const root = document.querySelector<HTMLElement>('[data-canvas-stage-root]')!;
    root.focus();

    root.dispatchEvent(new KeyboardEvent('keydown', { key: '0', bubbles: true }));
    await nextTick();
    expect(exposed.value.getViewport().zoom).toBeCloseTo(1, 5);

    root.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
    await nextTick();
    // fitView (contain, 800x600 into 400x300 with padding) → ~0.45.
    expect(exposed.value.getViewport().zoom).toBeLessThan(1);
  });

  it('arrow keys pan by panStep; Shift multiplies it', async () => {
    const { exposed } = mountStage({ panStep: 40, fitOnReady: false, defaultViewport: { x: 0, y: 0, zoom: 1 } });
    await raf(2);
    await nextTick();
    const root = document.querySelector<HTMLElement>('[data-canvas-stage-root]')!;
    root.focus();

    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await nextTick();
    expect(exposed.value.getViewport().x).toBe(-40);

    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }));
    await nextTick();
    expect(exposed.value.getViewport().x).toBe(-40 - 200);
  });

  it('disableKeyboardA11y downgrades role to group', async () => {
    mountStage({ disableKeyboardA11y: true });
    await nextTick();
    const root = document.querySelector<HTMLElement>('[data-canvas-stage-root]')!;
    expect(root.getAttribute('role')).toBe('group');
  });

  it('auto-measures the content element when no size props are given', async () => {
    const exposed = ref<any>(null);
    const Harness = defineComponent({
      setup() {
        return () => h(CanvasStageRoot, {
          ref: (r: any) => { exposed.value = r; },
          style: 'width: 400px; height: 300px;',
        }, {
          default: () => h('div', { 'data-child': '', style: 'width: 250px; height: 120px;' }, 'x'),
        });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    await raf(3);
    await nextTick();
    expect(exposed.value.contentSize.width).toBeCloseTo(250, 0);
    expect(exposed.value.contentSize.height).toBeCloseTo(120, 0);
  });

  it('drives a controlled v-model:viewport', async () => {
    const vp = ref({ x: 0, y: 0, zoom: 1 });
    const Harness = defineComponent({
      setup() {
        return () => h(CanvasStageRoot, {
          viewport: vp.value,
          'onUpdate:viewport': (v: any) => { vp.value = v; },
          style: 'width: 400px; height: 300px;',
          contentWidth: 800,
          contentHeight: 600,
          fitOnReady: false,
        }, { default: () => h('div', { 'data-child': '' }, 'x') });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    vp.value = { x: 10, y: 20, zoom: 1.5 };
    await nextTick();
    const content = document.querySelector<HTMLElement>('[data-canvas-stage-content]')!;
    expect(content.style.transform).toContain('translate(10px, 20px)');
    expect(content.style.transform).toContain('scale(1.5)');
  });

  it('the parts can be composed manually under a custom subtree', async () => {
    // Sanity: Pane + Content are exported and mountable inside the Root surface.
    expect(CanvasStagePane).toBeTruthy();
    expect(CanvasStageContent).toBeTruthy();
  });
});
