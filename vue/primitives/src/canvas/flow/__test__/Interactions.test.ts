import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { FlowRoot, useFlow } from '../index';
import type { FlowNode, UseFlowReturn } from '../index';

const wrappers: Array<VueWrapper<any>> = [];
afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
  delete (globalThis as any).__api;
});
function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

const nodes: FlowNode[] = [
  { id: 'a', position: { x: 0, y: 0 } },
  { id: 'b', position: { x: 200, y: 0 } },
  { id: 'c', position: { x: 0, y: 200 } },
];

function key(el: Element, k: string, opts: KeyboardEventInit = {}) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...opts }));
}

describe('keyboard', () => {
  it('select-all then delete removes all selected nodes', async () => {
    const events: Array<{ nodes: string[] }> = [];
    const w = track(mount(FlowRoot, {
      attachTo: document.body,
      props: {
        defaultNodes: nodes,
        onSelectionChange: (s: { nodes: string[] }) => events.push(s),
        onNodesChange: () => {},
      },
      slots: { 'node-default': () => h('div', 'n') },
    }));
    const pane = w.find('[data-flow-pane]').element;

    key(pane, 'a', { metaKey: true });
    await nextTick();
    expect(events.at(-1)?.nodes.sort()).toEqual(['a', 'b', 'c']);

    key(pane, 'Delete');
    await nextTick();
    expect(w.findAll('[data-flow-node]')).toHaveLength(0);
  });

  it('arrow keys nudge the selected node', async () => {
    const changes: any[] = [];
    const w = track(mount(FlowRoot, {
      attachTo: document.body,
      props: { defaultNodes: nodes, onNodesChange: (c: any) => changes.push(...c) },
      slots: { 'node-default': () => h('div', 'n') },
    }));
    const pane = w.find('[data-flow-pane]').element;
    w.find('[data-id="a"]').element.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
    await nextTick();
    key(pane, 'ArrowRight');
    await nextTick();
    const move = changes.find(c => c.type === 'position' && c.id === 'a');
    expect(move?.position.x).toBe(5);
  });
});

describe('useFlow imperative API', () => {
  const Capture = defineComponent({
    setup() {
      (globalThis as any).__api = useFlow();
      return () => null;
    },
  });

  it('exposes nodes and drives the viewport', async () => {
    track(mount(FlowRoot, {
      attachTo: document.body,
      props: { defaultNodes: nodes },
      slots: {
        'node-default': () => h('div', 'n'),
        default: () => h(Capture),
      },
    }));
    await nextTick();
    const api = (globalThis as any).__api as UseFlowReturn;
    expect(api.getNodes()).toHaveLength(3);
    expect(api.getNode('a')?.id).toBe('a');

    const before = api.getViewport().zoom;
    api.zoomIn();
    expect(api.getViewport().zoom).toBeGreaterThan(before);
  });
});
