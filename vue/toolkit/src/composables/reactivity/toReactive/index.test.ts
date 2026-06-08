import { describe, expect, it } from 'vitest';
import { computed, effectScope, isReactive, nextTick, ref, shallowRef, watch } from 'vue';
import { toReactive } from '.';

describe(toReactive, () => {
  it('reads properties through the ref', () => {
    const state = ref({ count: 0, name: 'a' });
    const r = toReactive(state);
    expect(r.count).toBe(0);
    expect(r.name).toBe('a');
  });

  it('returns a reactive proxy', () => {
    const r = toReactive(ref({ count: 0 }));
    expect(isReactive(r)).toBeTruthy();
  });

  it('writes pass through to the ref value', () => {
    const state = ref({ count: 0 });
    const r = toReactive(state);
    r.count = 5;
    expect(state.value.count).toBe(5);
  });

  it('reflects external ref mutations', () => {
    const state = ref({ count: 0 });
    const r = toReactive(state);
    state.value.count = 9;
    expect(r.count).toBe(9);
  });

  it('survives reassignment of the whole ref value', () => {
    const state = ref({ name: 'a' });
    const r = toReactive(state);
    expect(r.name).toBe('a');
    state.value = { name: 'b' };
    expect(r.name).toBe('b');
  });

  it('unwraps nested refs on read', () => {
    // shallowRef preserves nested refs as values (a deep ref would unwrap them)
    const inner = ref(1);
    const state = shallowRef({ inner });
    const r = toReactive(state);
    expect(r.inner as unknown).toBe(1);
    inner.value = 2;
    expect(r.inner as unknown).toBe(2);
  });

  it('writes a plain value into a nested ref via .value', () => {
    const inner = ref(1);
    const state = shallowRef({ inner });
    const r = toReactive(state);
    (r as unknown as { inner: number }).inner = 42;
    expect(inner.value).toBe(42);
    // the property is still a ref, not overwritten by a plain number
    expect(state.value.inner).toBe(inner);
  });

  it('replaces a nested ref when assigning another ref', () => {
    const a = ref(1);
    const b = ref(2);
    const state = shallowRef<{ x: unknown }>({ x: a });
    const r = toReactive(state) as { x: unknown };
    r.x = b;
    expect(state.value.x).toBe(b);
  });

  it('supports the in operator (has trap)', () => {
    const state = ref<Record<string, number>>({ a: 1 });
    const r = toReactive(state);
    expect('a' in r).toBeTruthy();
    expect('b' in r).toBeFalsy();
  });

  it('supports key deletion', () => {
    const state = ref<Record<string, number>>({ a: 1, b: 2 });
    const r = toReactive(state);
    delete r.a;
    expect('a' in state.value).toBeFalsy();
    expect(r.b).toBe(2);
  });

  it('enumerates own keys via Object.keys', () => {
    const state = ref<Record<string, number>>({ a: 1, b: 2 });
    const r = toReactive(state);
    expect(Object.keys(r).sort()).toEqual(['a', 'b']);
  });

  it('spreads enumerable own properties', () => {
    const state = ref<Record<string, number>>({ a: 1, b: 2 });
    const r = toReactive(state);
    expect({ ...r }).toEqual({ a: 1, b: 2 });
  });

  it('is deeply reactive in an effect', async () => {
    const state = ref({ count: 0 });
    const r = toReactive(state);
    const seen: number[] = [];

    const scope = effectScope();
    scope.run(() => {
      watch(() => r.count, value => seen.push(value));
    });

    r.count = 1;
    await nextTick();
    state.value.count = 2;
    await nextTick();

    expect(seen).toEqual([1, 2]);
    scope.stop();
  });

  it('works as a computed source', () => {
    const state = ref({ first: 'John', last: 'Doe' });
    const r = toReactive(state);
    const full = computed(() => `${r.first} ${r.last}`);
    expect(full.value).toBe('John Doe');
    r.first = 'Jane';
    expect(full.value).toBe('Jane Doe');
  });

  it('returns reactive(object) for a plain (non-ref) object', () => {
    const plain = { count: 0 };
    const r = toReactive(plain);
    expect(isReactive(r)).toBeTruthy();
    r.count = 3;
    expect(plain.count).toBe(3);
  });

  it('handles index and length access on array-backed refs', () => {
    const state = ref<number[]>([1, 2, 3]);
    const r = toReactive(state);
    expect(r).toHaveLength(3);
    expect(r[0]).toBe(1);
    expect(r[2]).toBe(3);
    r[0] = 9;
    expect(state.value[0]).toBe(9);
  });
});
