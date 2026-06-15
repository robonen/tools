import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { h, nextTick } from 'vue';
import { getVisibleEdgeIds, getVisibleNodeIds } from '../virtualization';
import { FlowRoot } from '../index';
import type { FlowEdge, FlowNode, InternalNode } from '../index';

function internal(id: string, x: number, y: number, w = 100, h = 50): InternalNode {
  return { id, position: { x, y }, measured: { width: w, height: h }, positionAbsolute: { x, y }, handleBounds: null };
}

describe('getVisibleNodeIds', () => {
  const lookup = new Map<string, InternalNode>([
    ['a', internal('a', 0, 0)],
    ['b', internal('b', 5000, 5000)],
  ]);
  const nodes = [...lookup.values()];

  it('keeps nodes intersecting the rect and culls the rest', () => {
    const rect = { x: -100, y: -100, width: 800, height: 600 };
    expect(getVisibleNodeIds(nodes, lookup, rect)).toEqual(['a']);
  });

  it('keeps unmeasured nodes (no internal entry) so they are not flicker-culled', () => {
    const ids = getVisibleNodeIds([{ id: 'z', position: { x: 9999, y: 9999 } } as FlowNode], new Map(), { x: 0, y: 0, width: 10, height: 10 });
    expect(ids).toEqual(['z']);
  });
});

describe('getVisibleEdgeIds', () => {
  it('keeps edges with at least one visible endpoint', () => {
    const edges: FlowEdge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
    ];
    expect(getVisibleEdgeIds(edges, new Set(['a']))).toEqual(['e1']);
  });
});

const wrappers: Array<VueWrapper<any>> = [];
afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});

describe('FlowRoot onlyRenderVisibleElements', () => {
  it('renders all nodes by default', async () => {
    const nodes: FlowNode[] = [
      { id: 'a', position: { x: 0, y: 0 } },
      { id: 'far', position: { x: 100000, y: 100000 } },
    ];
    const w = mount(FlowRoot, {
      attachTo: document.body,
      props: { defaultNodes: nodes },
      slots: { 'node-default': () => h('div', 'n') },
    });
    wrappers.push(w);
    await nextTick();
    expect(w.findAll('[data-flow-node]')).toHaveLength(2);
  });
});
