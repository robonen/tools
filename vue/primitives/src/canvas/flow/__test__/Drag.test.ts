import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { h, nextTick } from 'vue';
import { FlowRoot } from '../index';
import type { FlowEdge, FlowNode } from '../index';

const wrappers: Array<VueWrapper<any>> = [];
afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});

function raf(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

function pointer(el: Element, type: string, x: number, y: number) {
  el.dispatchEvent(new PointerEvent(type, { button: 0, pointerId: 1, clientX: x, clientY: y, bubbles: true, cancelable: true }));
}

const nodes: FlowNode[] = [
  { id: 'a', position: { x: 0, y: 0 } },
  { id: 'b', position: { x: 300, y: 200 } },
];
const edges: FlowEdge[] = [{ id: 'e', source: 'a', target: 'b', type: 'straight' }];

function mountFlow() {
  return mount(FlowRoot, {
    attachTo: document.body,
    props: { defaultNodes: nodes, defaultEdges: edges },
    slots: { 'node-default': () => h('div', { style: 'width:80px;height:40px' }, 'n') },
  });
}

describe('node drag updates the DOM (regression: in-place mutation froze nodes)', () => {
  it('moves the dragged node element and follows with the edge path', async () => {
    const w = mountFlow();
    wrappers.push(w);
    await nextTick();

    const nodeEl = w.find('[data-id="a"]').element as HTMLElement;
    const edgeBefore = w.find('[data-flow-edge-path]').attributes('d');

    pointer(nodeEl, 'pointerdown', 10, 10);
    pointer(nodeEl, 'pointermove', 70, 50); // delta (60, 40) at zoom 1
    await raf();
    await nextTick();

    const transform = (w.find('[data-id="a"]').element as HTMLElement).style.transform;
    expect(transform).toBe('translate(60px, 40px)');

    const edgeAfter = w.find('[data-flow-edge-path]').attributes('d');
    expect(edgeAfter).not.toBe(edgeBefore); // edge endpoint followed the node

    pointer(nodeEl, 'pointerup', 70, 50);
    await nextTick();
    // committed to the model
    expect((w.findAll('[data-flow-node]')[0]!.element as HTMLElement).style.transform).toBe('translate(60px, 40px)');
  });

  it('does not move other nodes', async () => {
    const w = mountFlow();
    wrappers.push(w);
    await nextTick();
    const nodeEl = w.find('[data-id="a"]').element as HTMLElement;
    pointer(nodeEl, 'pointerdown', 10, 10);
    pointer(nodeEl, 'pointermove', 70, 50);
    await raf();
    await nextTick();
    expect((w.find('[data-id="b"]').element as HTMLElement).style.transform).toBe('translate(300px, 200px)');
  });
});
