import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { h, nextTick } from 'vue';
import { FlowHandle, FlowRoot } from '../index';
import type { FlowEdge, FlowNode } from '../index';

const wrappers: Array<VueWrapper<any>> = [];
afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});
function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

const nodeWithHandles = () => [
  h('div', { class: 'body' }, 'node'),
  h(FlowHandle, { type: 'target', position: 'left', id: 'in' }),
  h(FlowHandle, { type: 'source', position: 'right', id: 'out' }),
];

describe('FlowHandle', () => {
  const nodes: FlowNode[] = [
    { id: 'a', position: { x: 0, y: 0 } },
    { id: 'b', position: { x: 300, y: 0 } },
  ];

  it('renders handles with the right data attributes and side positioning', () => {
    const w = track(mount(FlowRoot, {
      attachTo: document.body,
      props: { defaultNodes: nodes },
      slots: { 'node-default': nodeWithHandles },
    }));
    const source = w.find('[data-flow-handle][data-handletype="source"]');
    const target = w.find('[data-flow-handle][data-handletype="target"]');
    expect(source.exists()).toBe(true);
    expect(target.exists()).toBe(true);
    expect(source.attributes('data-handlepos')).toBe('right');
    expect(source.attributes('data-handleid')).toBe('out');
    expect((source.element as HTMLElement).style.position).toBe('absolute');
  });

  it('measures handle bounds so handle ids are present in the DOM for hit-testing', async () => {
    const w = track(mount(FlowRoot, {
      attachTo: document.body,
      props: { defaultNodes: nodes },
      slots: { 'node-default': nodeWithHandles },
    }));
    await nextTick();
    expect(w.findAll('[data-handleid]').length).toBeGreaterThanOrEqual(4);
  });
});

describe('edge markers', () => {
  it('renders a deduped marker def and references it from the path', async () => {
    const nodes: FlowNode[] = [
      { id: 'a', position: { x: 0, y: 0 } },
      { id: 'b', position: { x: 200, y: 0 } },
    ];
    const edges: FlowEdge[] = [
      { id: 'e1', source: 'a', target: 'b', markerEnd: { type: 'arrowclosed', color: '#333' } },
      { id: 'e2', source: 'b', target: 'a', markerEnd: { type: 'arrowclosed', color: '#333' } },
    ];
    const w = track(mount(FlowRoot, {
      attachTo: document.body,
      props: { defaultNodes: nodes, defaultEdges: edges },
      slots: { 'node-default': () => h('div', 'n') },
    }));
    await nextTick();
    // identical markers dedupe to a single <marker>
    expect(w.findAll('marker')).toHaveLength(1);
    const path = w.find('[data-flow-edge-path]');
    expect(path.attributes('marker-end')).toMatch(/^url\(#/);
  });
});
