import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useArrayReduce } from '.';

describe(useArrayReduce, () => {
  it('reduces without an initial value', () => {
    const list = ref([1, 2, 3, 4]);
    const sum = useArrayReduce(list, (acc, n) => acc + n);
    expect(sum.value).toBe(10);
  });

  it('reduces with an initial value', () => {
    const list = ref([1, 2, 3, 4]);
    const sum = useArrayReduce(list, (acc, n) => acc + n, 100);
    expect(sum.value).toBe(110);
  });

  it('recomputes when the source array changes', () => {
    const list = ref([1, 2, 3]);
    const sum = useArrayReduce(list, (acc, n) => acc + n, 0);
    expect(sum.value).toBe(6);

    list.value = [10, 20];
    expect(sum.value).toBe(30);
  });

  it('unwraps reactive items', () => {
    const list = [ref(1), ref(2), ref(3)];
    const sum = useArrayReduce(list, (acc, n) => acc + n, 0);
    expect(sum.value).toBe(6);
  });

  it('reacts to a reactive initial value', () => {
    const list = ref([1, 2, 3]);
    const seed = ref(10);
    const sum = useArrayReduce(list, (acc, n) => acc + n, seed);
    expect(sum.value).toBe(16);

    seed.value = 100;
    expect(sum.value).toBe(106);
  });

  it('passes the current index to the reducer', () => {
    const list = ref(['a', 'b', 'c']);
    const indexed = useArrayReduce(
      list,
      (acc, value, index) => `${acc}${index}:${value};`,
      '',
    );
    expect(indexed.value).toBe('0:a;1:b;2:c;');
  });

  it('supports a different accumulator type via initial value', () => {
    const list = ref(['a', 'b', 'a', 'c', 'b']);
    const counts = useArrayReduce(
      list,
      (acc: Record<string, number>, key) => {
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      () => ({}) as Record<string, number>,
    );
    expect(counts.value).toEqual({ a: 2, b: 2, c: 1 });
  });

  it('treats undefined as a valid initial value (not a missing seed)', () => {
    const list = ref([1, 2]);
    // With a real seed of `undefined`, the reducer runs for every element.
    const calls: Array<[unknown, number]> = [];
    const result = useArrayReduce<number, number | undefined>(
      list,
      (acc, n) => {
        calls.push([acc, n]);
        return n;
      },
      undefined,
    );
    expect(result.value).toBe(2);
    expect(calls).toEqual([[undefined, 1], [1, 2]]);
  });

  it('throws on an empty array with no initial value (native reduce semantics)', () => {
    const list = ref<number[]>([]);
    const sum = useArrayReduce(list, (acc, n) => acc + n);
    expect(() => sum.value).toThrow(TypeError);
  });

  it('returns the initial value for an empty array', () => {
    const list = ref<number[]>([]);
    const sum = useArrayReduce(list, (acc, n) => acc + n, 42);
    expect(sum.value).toBe(42);
  });

  it('accepts a getter as the source list', () => {
    const a = ref(1);
    const b = ref(2);
    const product = useArrayReduce(() => [a.value, b.value], (acc, n) => acc * n, 1);
    expect(product.value).toBe(2);

    a.value = 5;
    expect(product.value).toBe(10);
  });
});
