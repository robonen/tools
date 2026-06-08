import { describe, expect, it } from 'vitest';
import { computed, effectScope, isReactive, nextTick, reactive, ref, watch } from 'vue';
import { reactivePick } from '.';

describe(reactivePick, () => {
  it('picks the listed keys from a reactive object', () => {
    const state = reactive({ x: 1, y: 2, z: 3 });
    const picked = reactivePick(state, 'x', 'y');
    expect(picked.x).toBe(1);
    expect(picked.y).toBe(2);
    expect((picked as Record<string, unknown>).z).toBeUndefined();
  });

  it('returns a reactive proxy', () => {
    const picked = reactivePick(reactive({ a: 1 }), 'a');
    expect(isReactive(picked)).toBeTruthy();
  });

  it('accepts an array of keys', () => {
    const state = reactive({ a: 1, b: 2, c: 3 });
    const picked = reactivePick(state, ['a', 'c']);
    expect(Object.keys(picked).sort()).toEqual(['a', 'c']);
  });

  it('accepts mixed spread keys and arrays', () => {
    const state = reactive({ a: 1, b: 2, c: 3, d: 4 });
    const picked = reactivePick(state, 'a', ['b', 'c']);
    expect(Object.keys(picked).sort()).toEqual(['a', 'b', 'c']);
  });

  it('stays in sync with source mutations', () => {
    const state = reactive({ x: 1, y: 2 });
    const picked = reactivePick(state, 'x');
    state.x = 99;
    expect(picked.x).toBe(99);
  });

  it('writes pass back to the source', () => {
    const state = reactive({ x: 1, y: 2 });
    const picked = reactivePick(state, 'x');
    picked.x = 42;
    expect(state.x).toBe(42);
  });

  it('ignores writes to keys that were not picked', () => {
    const state = reactive({ x: 1, y: 2 });
    const picked = reactivePick(state, 'x') as Record<string, number>;
    picked.y = 100;
    expect(state.y).toBe(2);
  });

  it('supports the in operator (has trap)', () => {
    const state = reactive({ x: 1, y: 2 });
    const picked = reactivePick(state, 'x');
    expect('x' in picked).toBeTruthy();
    expect('y' in picked).toBeFalsy();
  });

  it('enumerates only the picked own keys', () => {
    const state = reactive({ a: 1, b: 2, c: 3 });
    const picked = reactivePick(state, 'a', 'b');
    expect(Object.keys(picked).sort()).toEqual(['a', 'b']);
  });

  it('spreads only the picked enumerable properties', () => {
    const state = reactive({ a: 1, b: 2, c: 3 });
    const picked = reactivePick(state, 'a', 'c');
    expect({ ...picked }).toEqual({ a: 1, c: 3 });
  });

  it('is reactive inside an effect', async () => {
    const state = reactive({ x: 0, y: 0 });
    const picked = reactivePick(state, 'x');
    const seen: number[] = [];

    const scope = effectScope();
    scope.run(() => {
      watch(() => picked.x, value => seen.push(value));
    });

    state.x = 1;
    await nextTick();
    picked.x = 2;
    await nextTick();

    expect(seen).toEqual([1, 2]);
    scope.stop();
  });

  it('works as a computed source', () => {
    const state = reactive({ first: 'John', last: 'Doe', age: 30 });
    const picked = reactivePick(state, 'first', 'last');
    const full = computed(() => `${picked.first} ${picked.last}`);
    expect(full.value).toBe('John Doe');
    state.first = 'Jane';
    expect(full.value).toBe('Jane Doe');
  });

  it('unwraps nested refs on read', () => {
    const inner = ref(1);
    const state = reactive({ inner, other: 2 });
    const picked = reactivePick(state, 'inner');
    expect(picked.inner as unknown).toBe(1);
    inner.value = 5;
    expect(picked.inner as unknown).toBe(5);
  });

  describe('predicate form', () => {
    it('keeps only keys matched by the predicate', () => {
      const state = reactive({ a: 1, b: 'x', c: 3 });
      const picked = reactivePick(state, value => typeof value === 'number');
      expect(Object.keys(picked).sort()).toEqual(['a', 'c']);
    });

    it('passes the key as the second predicate argument', () => {
      const state = reactive({ keepMe: 1, dropMe: 2 });
      const picked = reactivePick(state, (_value, key) => key === 'keepMe');
      expect(Object.keys(picked)).toEqual(['keepMe']);
    });

    it('re-evaluates membership reactively as values change', () => {
      const state = reactive<{ a: number | string; b: number }>({ a: 1, b: 2 });
      const picked = reactivePick(state, value => typeof value === 'number');
      expect(Object.keys(picked).sort()).toEqual(['a', 'b']);
      state.a = 'now a string';
      expect(Object.keys(picked)).toEqual(['b']);
    });

    it('reads picked values through the predicate proxy', () => {
      const state = reactive({ a: 1, b: 2, c: 3 });
      const picked = reactivePick(state, value => value > 1);
      expect((picked as Record<string, number>).b).toBe(2);
      expect((picked as Record<string, number>).a).toBeUndefined();
    });
  });

  it('works with a ref-of-object value passed via toValue resolution on reads', () => {
    // Source is a plain reactive whose property holds a ref — covers unwrap path.
    const flag = ref(true);
    const state = reactive({ flag, count: 1 });
    const picked = reactivePick(state, 'flag', 'count');
    expect(picked.flag as unknown).toBeTruthy();
    expect(picked.count).toBe(1);
  });
});
