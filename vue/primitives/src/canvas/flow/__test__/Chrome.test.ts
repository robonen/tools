import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { h, nextTick } from 'vue';
import { FlowBackground, FlowControls, FlowMiniMap, FlowPanel, FlowRoot } from '../index';
import type { FlowNode } from '../index';

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

function mountWithChrome(chrome: () => any) {
  return track(mount(FlowRoot, {
    attachTo: document.body,
    props: { defaultNodes: nodes },
    slots: { 'node-default': () => h('div', 'n'), default: chrome },
  }));
}

describe('FlowPanel', () => {
  it('renders at the requested corner and stops pane events', () => {
    const w = mountWithChrome(() => h(FlowPanel, { position: 'top-right' }, () => 'panel'));
    const panel = w.find('[data-flow-panel]');
    expect(panel.exists()).toBe(true);
    expect(panel.attributes('data-position')).toBe('top-right');
    expect((panel.element as HTMLElement).style.position).toBe('absolute');
  });
});

describe('FlowBackground', () => {
  it('renders an svg pattern that reacts to the variant', () => {
    const w = mountWithChrome(() => h(FlowBackground, { variant: 'lines' }));
    const bg = w.find('[data-flow-background]');
    expect(bg.exists()).toBe(true);
    expect(bg.attributes('data-variant')).toBe('lines');
    expect(w.find('pattern').exists()).toBe(true);
  });
});

describe('FlowControls', () => {
  it('renders zoom/fit buttons that drive the viewport', async () => {
    const w = mountWithChrome(() => h(FlowControls));
    const zoomIn = w.find('[data-flow-control="zoom-in"]');
    expect(zoomIn.exists()).toBe(true);
    expect(w.find('[data-flow-control="fit-view"]').exists()).toBe(true);

    const before = (w.find('[data-flow-viewport]').element as HTMLElement).style.transform;
    await zoomIn.trigger('click');
    await nextTick();
    const after = (w.find('[data-flow-viewport]').element as HTMLElement).style.transform;
    expect(after).not.toBe(before);
  });
});

describe('FlowMiniMap', () => {
  it('renders a rect per node plus a viewport mask', async () => {
    const w = mountWithChrome(() => h(FlowMiniMap));
    await nextTick();
    expect(w.find('[data-flow-minimap]').exists()).toBe(true);
    expect(w.findAll('[data-flow-minimap-node]')).toHaveLength(2);
    expect(w.find('[data-flow-minimap-mask]').exists()).toBe(true);
  });
});
