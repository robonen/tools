import type { VueWrapper } from '@vue/test-utils';
import type { FlowEdge, FlowNode } from '../index';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { h, nextTick } from 'vue';
import { FlowBackground, FlowPanel, FlowRoot } from '../index';

/**
 * Regressions found by building a real story-map consumer: the pane rendered
 * into zero area, the background painted over the graph, edge labels never
 * rendered, the declared click emits never fired, and dblclick on a node
 * zoomed the canvas. Each test pins the fixed contract.
 */

const wrappers: Array<VueWrapper<any>> = [];
afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});
function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

const nodes: FlowNode[] = [
  { id: 'a', position: { x: 0, y: 0 } },
  { id: 'b', position: { x: 300, y: 200 } },
];

function pointer(el: Element, type: string, x = 10, y = 10) {
  el.dispatchEvent(new PointerEvent(type, { button: 0, pointerId: 1, clientX: x, clientY: y, bubbles: true, cancelable: true }));
}

/** The pane sizes to its parent; give the test-utils wrapper a real box. */
function sizeWrapper(w: VueWrapper<any>, width = 600, height = 400) {
  const el = w.element as HTMLElement;
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
}

const edges: FlowEdge[] = [
  { id: 'a-b', source: 'a', target: 'b', label: 'take me' },
];

function flow(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
  return track(mount(FlowRoot, {
    attachTo: document.body,
    props: { defaultNodes: nodes, defaultEdges: edges, ...props },
    slots: { 'node-default': () => h('div', { style: 'width:120px;height:40px' }, 'n'), ...slots },
  }));
}

describe('pane sizing', () => {
  it('fills its parent instead of collapsing to zero height', () => {
    const w = flow();
    sizeWrapper(w);

    const pane = w.find('[data-flow-pane]').element as HTMLElement;

    // All pane content is absolutely positioned; without an own height the
    // whole graph rendered inside an invisible 0px strip.
    expect(pane.clientHeight).toBe(400);
  });
});

describe('stacking', () => {
  it('layers background under the graph and panels above it', () => {
    const w = flow({}, {
      default: () => [h(FlowBackground), h(FlowPanel, { position: 'top-right' }, () => 'p')],
    });

    const viewport = (w.find('[data-flow-viewport]').element as HTMLElement).style.zIndex;
    const background = (w.find('[data-flow-background]').element as HTMLElement).style.zIndex;
    const panel = (w.find('[data-flow-panel]').element as HTMLElement).style.zIndex;

    // The slot chrome renders AFTER the viewport in DOM order; without these
    // layers the background dots painted over every node.
    expect(Number(background)).toBeLessThan(Number(viewport));
    expect(Number(panel)).toBeGreaterThan(Number(viewport));
  });
});

describe('edge labels', () => {
  it('renders the label the type always promised', async () => {
    const w = flow();
    await nextTick();

    const label = w.find('[data-flow-edge-label]');

    expect(label.exists()).toBe(true);
    expect(label.text()).toBe('take me');
  });

  it('renders no label element when there is none', async () => {
    const w = flow({ defaultEdges: [{ id: 'a-b', source: 'a', target: 'b' }] });
    await nextTick();

    expect(w.find('[data-flow-edge-label]').exists()).toBe(false);
  });
});

describe('the click family', () => {
  async function settle(w: VueWrapper<any>, selector: string, times = 1, gap = 50) {
    const el = w.find(selector).element;

    for (let index = 0; index < times; index++) {
      pointer(el, 'pointerdown');
      pointer(el, 'pointerup');
      await nextTick();
      if (gap)
        await new Promise(resolve => setTimeout(resolve, gap));
    }
  }

  it('emits nodeClick for a settled click', async () => {
    const w = flow();
    await nextTick();

    await settle(w, '[data-flow-node][data-id="a"]');

    expect(w.emitted('nodeClick')?.[0]?.[0]).toBe('a');
  });

  it('pairs two settled clicks into nodeDoubleClick', async () => {
    const w = flow();
    await nextTick();

    await settle(w, '[data-flow-node][data-id="a"]', 2, 40);

    expect(w.emitted('nodeDoubleClick')?.[0]?.[0]).toBe('a');
  });

  it('emits paneClick only for background clicks', async () => {
    const w = flow();
    await nextTick();

    await w.find('[data-flow-pane]').trigger('click');
    expect(w.emitted('paneClick')).toHaveLength(1);

    await w.find('[data-flow-node][data-id="a"] div').trigger('click');
    expect(w.emitted('paneClick')).toHaveLength(1);
  });

  it('emits edgeClick when the edge is picked', async () => {
    const w = flow();
    await nextTick();

    pointer(w.findAll('[data-flow-edge] path')[1]!.element, 'pointerdown');
    await nextTick();

    expect(w.emitted('edgeClick')?.[0]?.[0]).toBe('a-b');
  });

  it('does not zoom on a node double click', async () => {
    const w = flow();
    await nextTick();

    const before = (w.find('[data-flow-viewport]').element as HTMLElement).style.transform;
    await w.find('[data-flow-node][data-id="a"]').trigger('dblclick');
    await nextTick();

    // The gesture belongs to the node (nodeDoubleClick), not the camera.
    expect((w.find('[data-flow-viewport]').element as HTMLElement).style.transform).toBe(before);
  });
});

describe('fitViewOnMount', () => {
  it('frames the graph once nodes are measured', async () => {
    const w = flow({ fitViewOnMount: true });
    sizeWrapper(w);

    await vi.waitFor(() => {
      const t = (w.find('[data-flow-viewport]').element as HTMLElement).style.transform;
      expect(t).not.toBe('translate(0px, 0px) scale(1)');
    });
  });

  it('never stomps a consumer-controlled viewport', async () => {
    const w = flow({
      fitViewOnMount: true,
      viewport: { x: 17, y: 23, zoom: 1.5 },
      'onUpdate:viewport': () => {},
    });

    await new Promise(resolve => setTimeout(resolve, 120));

    // A bound viewport is restored state; the fit must skip it entirely.
    expect((w.find('[data-flow-viewport]').element as HTMLElement).style.transform)
      .toBe('translate(17px, 23px) scale(1.5)');
  });
});
