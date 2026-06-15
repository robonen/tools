import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { FlowNodeResizer, FlowNodeToolbar, FlowRoot, useFlow } from '../index';
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

const Capture = defineComponent({
  setup() {
    (globalThis as any).__api = useFlow();
    return () => null;
  },
});

describe('subflows', () => {
  it('computes absolute position as the parent chain sum', async () => {
    const nodes: FlowNode[] = [
      { id: 'p', position: { x: 100, y: 100 } },
      { id: 'c', position: { x: 10, y: 20 }, parentId: 'p' },
    ];
    track(mount(FlowRoot, {
      attachTo: document.body,
      props: { defaultNodes: nodes },
      slots: { 'node-default': () => h('div', 'n'), default: () => h(Capture) },
    }));
    await nextTick();
    const api = (globalThis as any).__api as UseFlowReturn;
    expect(api.getNode('c')?.positionAbsolute).toEqual({ x: 110, y: 120 });
  });
});

describe('FlowNodeResizer', () => {
  it('renders eight resize handles inside a node', () => {
    const w = track(mount(FlowRoot, {
      attachTo: document.body,
      props: { defaultNodes: [{ id: 'a', position: { x: 0, y: 0 }, width: 120, height: 60 }] },
      slots: { 'node-default': () => [h('div', 'n'), h(FlowNodeResizer)] },
    }));
    expect(w.findAll('[data-flow-resize-handle]')).toHaveLength(8);
    expect(w.find('[data-flow-resize-handle][data-position="bottom-right"]').exists()).toBe(true);
  });
});

describe('FlowNodeToolbar', () => {
  it('teleports a toolbar to the body only while the node is selected', async () => {
    const w = track(mount(FlowRoot, {
      attachTo: document.body,
      props: { defaultNodes: [{ id: 'a', position: { x: 0, y: 0 } }] },
      slots: {
        'node-default': () => [h('div', 'n'), h(FlowNodeToolbar, null, { default: () => h('button', 'del') })],
      },
    }));
    await nextTick();
    expect(document.querySelector('[data-flow-node-toolbar]')).toBeNull();

    w.find('[data-id="a"]').element.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
    await nextTick();
    expect(w.find('[data-id="a"]').attributes('data-selected')).toBe('');
    await nextTick();
    expect(document.querySelector('[data-flow-node-toolbar]')).not.toBeNull();
  });
});
