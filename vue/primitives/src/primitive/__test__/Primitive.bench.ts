import { bench, describe } from 'vitest';
import { Comment, cloneVNode, createVNode, h } from 'vue';
import { Primitive, Slot } from '..';

// -- Attribute sets of increasing size --

const attrs1 = { class: 'a' };

const attrs5 = { class: 'a', id: 'b', role: 'button', tabindex: '0', title: 'tip' };

const attrs15 = {
  class: 'a',
  id: 'b',
  style: { color: 'red' },
  onClick: () => {},
  role: 'button',
  tabindex: '0',
  title: 'tip',
  'data-a': '1',
  'data-b': '2',
  'data-c': '3',
  'data-d': '4',
  'data-e': '5',
  'data-f': '6',
  'data-g': '7',
  'data-h': '8',
};

const defaultSlot = { default: () => [h('span', 'content')] };
const noop = () => {};

// ---- Baselines (raw Vue calls) ----

describe('baseline: raw h()', () => {
  bench('h() — 1 attr', () => {
    h('div', attrs1, defaultSlot);
  });

  bench('h() — 5 attrs', () => {
    h('div', attrs5, defaultSlot);
  });

  bench('h() — 15 attrs', () => {
    h('div', attrs15, defaultSlot);
  });
});

describe('baseline: raw cloneVNode()', () => {
  const child = h('div', 'content');

  bench('cloneVNode — 1 attr', () => {
    cloneVNode(child, attrs1, true);
  });

  bench('cloneVNode — 5 attrs', () => {
    cloneVNode(child, attrs5, true);
  });

  bench('cloneVNode — 15 attrs', () => {
    cloneVNode(child, attrs15, true);
  });
});

// ---- Primitive overhead vs raw h() ----

describe('Primitive vs h()', () => {
  bench('h("div") — baseline', () => {
    h('div', attrs5, defaultSlot);
  });

  bench('Primitive({ as: "div" })', () => {
    Primitive({ as: 'div' }, { attrs: attrs5, slots: defaultSlot, emit: noop });
  });

  bench('Primitive({ as: "template" }) — Slot mode', () => {
    Primitive({ as: 'template' }, { attrs: attrs5, slots: defaultSlot, emit: noop });
  });
});

// ---- Slot scaling by attribute count ----

describe('Slot — scaling by attrs', () => {
  bench('1 attr', () => {
    Slot({} as never, { attrs: attrs1, slots: defaultSlot, emit: noop });
  });

  bench('5 attrs', () => {
    Slot({} as never, { attrs: attrs5, slots: defaultSlot, emit: noop });
  });

  bench('15 attrs (mixed types)', () => {
    Slot({} as never, { attrs: attrs15, slots: defaultSlot, emit: noop });
  });
});

// ---- Slot edge cases ----

describe('Slot — edge cases', () => {
  bench('child with comments to skip', () => {
    Slot({} as never, {
      attrs: attrs5,
      slots: {
        default: () => [
          createVNode(Comment, null, 'skip'),
          createVNode(Comment, null, 'skip'),
          h('span', 'content'),
        ],
      },
      emit: noop,
    });
  });

  bench('no default slot', () => {
    Slot({} as never, { attrs: attrs5, slots: {}, emit: noop });
  });
});
