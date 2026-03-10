import { describe, expect, it } from 'vitest';
import { Comment, Fragment, createVNode, h } from 'vue';
import { getRawChildren } from '../getRawChildren';

describe(getRawChildren, () => {
  it('returns empty array for empty input', () => {
    expect(getRawChildren([])).toEqual([]);
  });

  it('returns element vnodes as-is', () => {
    const div = h('div');
    const span = h('span');

    const result = getRawChildren([div, span]);

    expect(result).toHaveLength(2);
    expect(result[0]!.type).toBe('div');
    expect(result[1]!.type).toBe('span');
  });

  it('filters out Comment vnodes', () => {
    const div = h('div');
    const comment = createVNode(Comment, null, 'comment');

    const result = getRawChildren([comment, div, comment]);

    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe('div');
  });

  it('flattens Fragment children', () => {
    const fragment = createVNode(Fragment, null, [h('a'), h('b')]);

    const result = getRawChildren([fragment]);

    expect(result).toHaveLength(2);
    expect(result[0]!.type).toBe('a');
    expect(result[1]!.type).toBe('b');
  });

  it('recursively flattens nested Fragment children', () => {
    const innerFragment = createVNode(Fragment, null, [h('span')]);
    const outerFragment = createVNode(Fragment, null, [innerFragment, h('div')]);

    const result = getRawChildren([outerFragment]);

    expect(result).toHaveLength(2);
    expect(result[0]!.type).toBe('span');
    expect(result[1]!.type).toBe('div');
  });

  it('filters comments inside fragments', () => {
    const fragment = createVNode(Fragment, null, [
      createVNode(Comment, null, 'skip'),
      h('p'),
    ]);

    const result = getRawChildren([fragment]);

    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe('p');
  });
});
