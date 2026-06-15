import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { h, nextTick, ref } from 'vue';
import { FlowRoot } from '../index';
import type { FlowEdge, FlowNode, Viewport } from '../index';

const wrappers: Array<VueWrapper<any>> = [];
afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});
function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

const nodeSlot = (p: { data?: { label?: string } }) => h('div', { class: 'node-body' }, p.data?.label ?? '');

function mountFlow(props: Record<string, unknown> = {}) {
  return track(mount(FlowRoot, {
    attachTo: document.body,
    props,
    slots: { 'node-default': nodeSlot },
  }));
}

describe('FlowRoot skeleton', () => {
  it('renders pane, single transformed viewport and the edge svg', () => {
    const w = mountFlow({ defaultNodes: [], defaultEdges: [] });
    expect(w.find('[data-flow-pane]').exists()).toBe(true);
    const viewport = w.find('[data-flow-viewport]');
    expect(viewport.exists()).toBe(true);
    expect((viewport.element as HTMLElement).style.transformOrigin).toBe('0px 0px');
    // exactly one shared edge layer
    expect(w.findAll('[data-flow-edges]')).toHaveLength(1);
  });

  it('applies the viewport transform string', () => {
    const w = mountFlow({ defaultViewport: { x: 40, y: 20, zoom: 2 } });
    const t = (w.find('[data-flow-viewport]').element as HTMLElement).style.transform;
    expect(t).toContain('translate(40px, 20px)');
    expect(t).toContain('scale(2)');
  });
});

describe('node state model', () => {
  const nodes: FlowNode[] = [
    { id: 'a', position: { x: 0, y: 0 }, data: { label: 'A' } },
    { id: 'b', position: { x: 200, y: 100 }, data: { label: 'B' } },
  ];

  it('uncontrolled defaultNodes seeds the canvas', () => {
    const w = mountFlow({ defaultNodes: nodes });
    const els = w.findAll('[data-flow-node]');
    expect(els).toHaveLength(2);
    expect(els[0]!.attributes('data-id')).toBe('a');
    expect((els[1]!.element as HTMLElement).style.transform).toBe('translate(200px, 100px)');
  });

  it('controlled v-model:nodes reflects external updates', async () => {
    const model = ref<FlowNode[]>([{ id: 'a', position: { x: 0, y: 0 }, data: { label: 'A' } }]);
    const w = track(mount(FlowRoot, {
      attachTo: document.body,
      props: { nodes: model.value, 'onUpdate:nodes': (v: FlowNode[]) => { model.value = v; } },
      slots: { 'node-default': nodeSlot },
    }));
    expect(w.findAll('[data-flow-node]')).toHaveLength(1);

    await w.setProps({ nodes: [...model.value, { id: 'c', position: { x: 10, y: 10 }, data: { label: 'C' } }] });
    await nextTick();
    expect(w.findAll('[data-flow-node]')).toHaveLength(2);
  });

  it('renders the node-default slot content', () => {
    const w = mountFlow({ defaultNodes: nodes });
    expect(w.find('[data-id="a"] .node-body').text()).toBe('A');
  });

  it('hides hidden nodes', () => {
    const w = mountFlow({ defaultNodes: [{ id: 'a', position: { x: 0, y: 0 } }, { id: 'h', position: { x: 0, y: 0 }, hidden: true }] });
    expect(w.findAll('[data-flow-node]')).toHaveLength(1);
  });
});

describe('edges', () => {
  const nodes: FlowNode[] = [
    { id: 'a', position: { x: 0, y: 0 } },
    { id: 'b', position: { x: 200, y: 100 } },
  ];
  const edges: FlowEdge[] = [{ id: 'e1', source: 'a', target: 'b', type: 'straight' }];

  it('renders an edge path between two nodes', async () => {
    const w = mountFlow({ defaultNodes: nodes, defaultEdges: edges });
    await nextTick();
    const edge = w.find('[data-flow-edge]');
    expect(edge.exists()).toBe(true);
    expect(edge.attributes('data-id')).toBe('e1');
    const d = w.find('[data-flow-edge-path]').attributes('d');
    expect(d).toMatch(/^M /);
    expect(d).not.toContain('NaN');
  });

  it('drops edges whose endpoints are missing', () => {
    const w = mountFlow({ defaultNodes: nodes, defaultEdges: [{ id: 'bad', source: 'a', target: 'zzz' }] });
    expect(w.find('[data-flow-edge]').exists()).toBe(false);
  });
});

describe('selection', () => {
  it('selects a node on click and marks data-selected', async () => {
    const onSel = ref<{ nodes: string[]; edges: string[] } | null>(null);
    const w = track(mount(FlowRoot, {
      attachTo: document.body,
      props: {
        defaultNodes: [{ id: 'a', position: { x: 0, y: 0 } }],
        onSelectionChange: (s: { nodes: string[]; edges: string[] }) => { onSel.value = s; },
      },
      slots: { 'node-default': nodeSlot },
    }));
    const node = w.find('[data-id="a"]');
    node.element.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
    await nextTick();
    expect(onSel.value?.nodes).toEqual(['a']);
    expect(w.find('[data-id="a"]').attributes('data-selected')).toBe('');
  });
});

describe('viewport v-model', () => {
  it('exposes the viewport and updates on prop change', async () => {
    const vp = ref<Viewport>({ x: 0, y: 0, zoom: 1 });
    const w = track(mount(FlowRoot, {
      attachTo: document.body,
      props: { viewport: vp.value, 'onUpdate:viewport': (v: Viewport) => { vp.value = v; } },
      slots: { 'node-default': nodeSlot },
    }));
    await w.setProps({ viewport: { x: 100, y: 50, zoom: 1.5 } });
    await nextTick();
    const t = (w.find('[data-flow-viewport]').element as HTMLElement).style.transform;
    expect(t).toContain('translate(100px, 50px)');
  });
});
