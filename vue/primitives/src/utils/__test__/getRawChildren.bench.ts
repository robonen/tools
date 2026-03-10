import { bench, describe } from 'vitest';
import { Comment, Fragment, createVNode, h, render } from 'vue';
import { PatchFlags } from '@vue/shared';
import { getRawChildren } from '../getRawChildren';

// -- Helpers --

function keyedFragment(children: Array<ReturnType<typeof h>>) {
  return createVNode(Fragment, null, children, PatchFlags.KEYED_FRAGMENT);
}

const flatChildren = [h('div'), h('span'), h('p')];

const keyedChildren = Array.from({ length: 10 }, (_, i) =>
  h('div', { key: i }, `child-${i}`),
);

// ---- Processing cost ----

describe('getRawChildren', () => {
  bench('flat elements', () => {
    getRawChildren(flatChildren);
  });

  bench('mixed elements and comments', () => {
    getRawChildren([
      createVNode(Comment, null, 'c'),
      h('div'),
      createVNode(Comment, null, 'c'),
      h('span'),
      createVNode(Comment, null, 'c'),
    ]);
  });

  bench('single fragment with children', () => {
    getRawChildren([createVNode(Fragment, null, [h('a'), h('b'), h('c')])]);
  });

  bench('nested fragments (depth 5)', () => {
    let current: ReturnType<typeof h> = h('div');
    for (let i = 0; i < 5; i++) {
      current = createVNode(Fragment, null, [current, h('span')]);
    }
    getRawChildren([current]);
  });

  bench('wide fragment (50 children)', () => {
    const children = Array.from({ length: 50 }, (_, i) => h('div', `child-${i}`));
    getRawChildren([createVNode(Fragment, null, children)]);
  });
});

// ---- BAIL path cost ----

describe('getRawChildren — BAIL path', () => {
  bench('1 keyed fragment (no BAIL)', () => {
    getRawChildren([keyedFragment([...keyedChildren])]);
  });

  bench('2 keyed fragments (BAIL triggered)', () => {
    getRawChildren([
      keyedFragment(keyedChildren.slice(0, 5)),
      keyedFragment(keyedChildren.slice(5)),
    ]);
  });

  bench('3 keyed fragments (BAIL triggered)', () => {
    getRawChildren([
      keyedFragment(keyedChildren.slice(0, 3)),
      keyedFragment(keyedChildren.slice(3, 7)),
      keyedFragment(keyedChildren.slice(7)),
    ]);
  });
});

// ---- Render impact: optimized patchFlags vs BAIL ----

describe('patch — optimized vs BAIL patchFlag', () => {
  bench('patch with TEXT patchFlag', () => {
    const container = document.createElement('div');
    const initial = h('div', null, [
      createVNode('span', null, 'a', PatchFlags.TEXT),
      createVNode('span', null, 'b', PatchFlags.TEXT),
      createVNode('span', null, 'c', PatchFlags.TEXT),
    ]);
    const updated = h('div', null, [
      createVNode('span', null, 'x', PatchFlags.TEXT),
      createVNode('span', null, 'y', PatchFlags.TEXT),
      createVNode('span', null, 'z', PatchFlags.TEXT),
    ]);
    render(initial, container);
    render(updated, container);
  });

  bench('patch with BAIL patchFlag', () => {
    const container = document.createElement('div');
    const initial = h('div', null, [
      createVNode('span', null, 'a', PatchFlags.BAIL),
      createVNode('span', null, 'b', PatchFlags.BAIL),
      createVNode('span', null, 'c', PatchFlags.BAIL),
    ]);
    const updated = h('div', null, [
      createVNode('span', null, 'x', PatchFlags.BAIL),
      createVNode('span', null, 'y', PatchFlags.BAIL),
      createVNode('span', null, 'z', PatchFlags.BAIL),
    ]);
    render(initial, container);
    render(updated, container);
  });

  bench('patch with CLASS patchFlag', () => {
    const container = document.createElement('div');
    const initial = h('div', null, [
      createVNode('span', { class: 'a' }, null, PatchFlags.CLASS),
      createVNode('span', { class: 'b' }, null, PatchFlags.CLASS),
      createVNode('span', { class: 'c' }, null, PatchFlags.CLASS),
    ]);
    const updated = h('div', null, [
      createVNode('span', { class: 'x' }, null, PatchFlags.CLASS),
      createVNode('span', { class: 'y' }, null, PatchFlags.CLASS),
      createVNode('span', { class: 'z' }, null, PatchFlags.CLASS),
    ]);
    render(initial, container);
    render(updated, container);
  });

  bench('patch with CLASS→BAIL patchFlag', () => {
    const container = document.createElement('div');
    const initial = h('div', null, [
      createVNode('span', { class: 'a' }, null, PatchFlags.BAIL),
      createVNode('span', { class: 'b' }, null, PatchFlags.BAIL),
      createVNode('span', { class: 'c' }, null, PatchFlags.BAIL),
    ]);
    const updated = h('div', null, [
      createVNode('span', { class: 'x' }, null, PatchFlags.BAIL),
      createVNode('span', { class: 'y' }, null, PatchFlags.BAIL),
      createVNode('span', { class: 'z' }, null, PatchFlags.BAIL),
    ]);
    render(initial, container);
    render(updated, container);
  });
});
