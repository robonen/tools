import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';
import { useCycleList } from '.';

describe(useCycleList, () => {
  it('starts at the first item', () => {
    const { state, index } = useCycleList(['a', 'b', 'c']);
    expect(state.value).toBe('a');
    expect(index.value).toBe(0);
  });

  it('cycles forward and wraps around', () => {
    const { state, next } = useCycleList(['a', 'b', 'c']);
    expect(next()).toBe('b');
    expect(next()).toBe('c');
    expect(next()).toBe('a');
    expect(state.value).toBe('a');
  });

  it('cycles backward and wraps around', () => {
    const { prev } = useCycleList(['a', 'b', 'c']);
    expect(prev()).toBe('c');
    expect(prev()).toBe('b');
  });

  it('honors initialValue', () => {
    const { state, index } = useCycleList(['a', 'b', 'c'], { initialValue: 'b' });
    expect(state.value).toBe('b');
    expect(index.value).toBe(1);
  });

  it('honors a ref initialValue', () => {
    const initialValue = ref('c');
    const { state, index } = useCycleList(['a', 'b', 'c'], { initialValue });
    expect(state.value).toBe('c');
    expect(index.value).toBe(2);
  });

  it('go jumps to an index', () => {
    const { go, state } = useCycleList(['a', 'b', 'c']);
    expect(go(2)).toBe('c');
    expect(state.value).toBe('c');
  });

  it('go wraps negative and out-of-range indices', () => {
    const { go } = useCycleList(['a', 'b', 'c']);
    expect(go(-1)).toBe('c');
    expect(go(3)).toBe('a');
    expect(go(4)).toBe('b');
  });

  it('next/prev accept a step count', () => {
    const { next, prev } = useCycleList(['a', 'b', 'c', 'd']);
    expect(next(2)).toBe('c');
    expect(prev(3)).toBe('d');
  });

  it('shift moves by a signed delta', () => {
    const { shift, state } = useCycleList(['a', 'b', 'c', 'd']);
    expect(shift(2)).toBe('c');
    expect(shift(-1)).toBe('b');
    expect(shift()).toBe('c');
    expect(state.value).toBe('c');
  });

  it('exposes a writable index', () => {
    const { index, state } = useCycleList(['a', 'b', 'c']);
    index.value = 2;
    expect(state.value).toBe('c');
    expect(index.value).toBe(2);

    // Out-of-range assignments wrap into bounds.
    index.value = 4;
    expect(state.value).toBe('b');
    expect(index.value).toBe(1);
  });

  it('supports a getter-based list', () => {
    const source = ref(['a', 'b', 'c']);
    const { state, next, index } = useCycleList(() => source.value);
    expect(state.value).toBe('a');
    expect(next()).toBe('b');

    source.value = ['x', 'b', 'y'];
    expect(state.value).toBe('b');
    expect(index.value).toBe(1);
  });

  it('uses a custom getIndexOf resolver', () => {
    const list = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const { state, index, next } = useCycleList(list, {
      initialValue: { id: 2 },
      getIndexOf: (value, l) => l.findIndex(item => item.id === value.id),
    });
    expect(index.value).toBe(1);
    expect(next()).toEqual({ id: 3 });
  });

  it('falls back to fallbackIndex when the current item is missing', () => {
    const { index } = useCycleList(['a', 'b', 'c'], {
      initialValue: 'z',
      fallbackIndex: 2,
    });
    expect(index.value).toBe(2);
  });

  it('preserves the current item across list changes when it still exists', () => {
    const list = ref(['a', 'b', 'c', 'd']);
    const { go, state, index } = useCycleList(list);
    go(1);
    expect(state.value).toBe('b');

    list.value = ['x', 'b', 'y'];
    expect(state.value).toBe('b');
    expect(index.value).toBe(1);
  });

  it('falls back to fallbackIndex when the current item disappears', async () => {
    const list = ref(['a', 'b', 'c']);
    const { go, state } = useCycleList(list, { fallbackIndex: 0 });
    go(2);
    expect(state.value).toBe('c');

    list.value = ['x', 'y'];
    await nextTick();
    expect(state.value).toBe('x');
  });

  it('does not corrupt state when the list is empty', () => {
    const list = ref<string[]>([]);
    const { state, next, prev, go } = useCycleList(list, { initialValue: 'a' });
    expect(state.value).toBe('a');
    // Operations on an empty list are no-ops rather than producing undefined.
    expect(next()).toBe('a');
    expect(prev()).toBe('a');
    expect(go(5)).toBe('a');
    expect(state.value).toBe('a');
  });

  it('does not throw when a non-empty list becomes empty', async () => {
    const list = ref(['a', 'b', 'c']);
    const { state, go } = useCycleList(list);
    go(1);
    expect(state.value).toBe('b');

    list.value = [];
    await nextTick();
    // State is retained (no NaN/undefined) when there is nothing to cycle to.
    expect(state.value).toBe('b');
  });
});
