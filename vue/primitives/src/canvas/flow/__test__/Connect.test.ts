import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { h, nextTick } from 'vue';
import { FlowHandle, FlowRoot } from '../index';
import type { Connection, FlowNode } from '../index';

const wrappers: Array<VueWrapper<any>> = [];
afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});

function center(el: Element): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

const nodeSlot = () => [
  h('div', { style: 'width:80px;height:40px' }, 'n'),
  h(FlowHandle, { type: 'target', position: 'left', id: 'in', style: 'width:10px;height:10px' }),
  h(FlowHandle, { type: 'source', position: 'right', id: 'out', style: 'width:10px;height:10px' }),
];

describe('connection creation (regression: connecting did nothing)', () => {
  it('drags from a source handle to a target handle and emits @connect + adds the edge', async () => {
    const connections: Connection[] = [];
    const nodes: FlowNode[] = [
      { id: 'a', position: { x: 20, y: 20 } },
      { id: 'b', position: { x: 240, y: 20 } },
    ];
    const w = mount(FlowRoot, {
      attachTo: document.body,
      props: { defaultNodes: nodes, defaultEdges: [], onConnect: (c: Connection) => connections.push(c) },
      slots: { 'node-default': nodeSlot },
    });
    wrappers.push(w);
    await nextTick();
    await nextTick(); // allow handle measurement

    const sourceHandle = w.find('[data-id="a"] [data-handletype="source"]').element;
    const targetHandle = w.find('[data-id="b"] [data-handletype="target"]').element;
    const target = center(targetHandle);

    // Fast-flick gesture: NO awaits between events. With reactive (watch-based)
    // listener attachment this dropped the moves and never connected; the
    // always-on window listeners make it reliable.
    sourceHandle.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 1, ...center(sourceHandle), bubbles: true }));
    globalThis.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: target.x, clientY: target.y }));
    globalThis.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: target.x, clientY: target.y }));
    await nextTick();

    expect(connections).toHaveLength(1);
    expect(connections[0]).toMatchObject({ source: 'a', target: 'b', sourceHandle: 'out', targetHandle: 'in' });
    expect(w.findAll('[data-flow-edge]')).toHaveLength(1);
  });

  it('does not connect a node to itself (strict mode)', async () => {
    const connections: Connection[] = [];
    const nodes: FlowNode[] = [{ id: 'a', position: { x: 20, y: 20 } }];
    const w = mount(FlowRoot, {
      attachTo: document.body,
      props: { defaultNodes: nodes, defaultEdges: [], onConnect: (c: Connection) => connections.push(c) },
      slots: { 'node-default': nodeSlot },
    });
    wrappers.push(w);
    await nextTick();
    await nextTick();

    const sourceHandle = w.find('[data-id="a"] [data-handletype="source"]').element;
    const targetHandle = w.find('[data-id="a"] [data-handletype="target"]').element;
    const target = center(targetHandle);
    sourceHandle.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 1, ...center(sourceHandle), bubbles: true }));
    await nextTick();
    globalThis.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: target.x, clientY: target.y }));
    await nextTick();

    expect(connections).toHaveLength(0);
  });
});
