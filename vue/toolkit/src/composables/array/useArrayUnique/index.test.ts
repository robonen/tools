import { describe, expect, it } from 'vitest';
import { effectScope, ref } from 'vue';
import { useArrayUnique } from '.';

describe(useArrayUnique, () => {
  it('de-duplicates primitive values using strict identity', () => {
    const list = ref([1, 2, 2, 3, 3, 3]);
    const result = useArrayUnique(list);
    expect(result.value).toEqual([1, 2, 3]);
  });

  it('preserves first-seen insertion order', () => {
    const list = ref([3, 1, 3, 2, 1]);
    const result = useArrayUnique(list);
    expect(result.value).toEqual([3, 1, 2]);
  });

  it('distinguishes values of different types with === semantics', () => {
    const list = ref<Array<number | string>>([1, '1', 1, '1']);
    const result = useArrayUnique(list);
    expect(result.value).toEqual([1, '1']);
  });

  it('treats NaN occurrences as a single unique value', () => {
    const list = ref([Number.NaN, Number.NaN, 1]);
    const result = useArrayUnique(list);
    expect(result.value).toEqual([Number.NaN, 1]);
  });

  it('returns an empty array for an empty source', () => {
    const list = ref<number[]>([]);
    const result = useArrayUnique(list);
    expect(result.value).toEqual([]);
  });

  it('updates reactively when the source array changes', () => {
    const list = ref([1, 1, 2]);
    const result = useArrayUnique(list);
    expect(result.value).toEqual([1, 2]);

    list.value = [3, 3, 3, 4];
    expect(result.value).toEqual([3, 4]);
  });

  it('accepts a getter as the source', () => {
    const source = ref([1, 2, 2]);
    const result = useArrayUnique(() => source.value);
    expect(result.value).toEqual([1, 2]);

    source.value = [5, 5, 6];
    expect(result.value).toEqual([5, 6]);
  });

  it('unwraps reactive items', () => {
    const list = [ref(1), ref(1), ref(2)];
    const result = useArrayUnique(list);
    expect(result.value).toEqual([1, 2]);
  });

  it('reacts to changes in reactive items', () => {
    const a = ref(1);
    const b = ref(2);
    const result = useArrayUnique([a, b]);
    expect(result.value).toEqual([1, 2]);

    b.value = 1;
    expect(result.value).toEqual([1]);
  });

  it('de-duplicates by a key of T', () => {
    const list = ref([{ id: 1 }, { id: 2 }, { id: 1 }]);
    const result = useArrayUnique(list, 'id');
    expect(result.value).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('keeps the first occurrence when de-duplicating by key', () => {
    const list = ref([
      { id: 1, label: 'a' },
      { id: 1, label: 'b' },
      { id: 2, label: 'c' },
    ]);
    const result = useArrayUnique(list, 'id');
    expect(result.value).toEqual([
      { id: 1, label: 'a' },
      { id: 2, label: 'c' },
    ]);
  });

  it('de-duplicates by a key extractor function', () => {
    const list = ref([
      { name: 'Ann' },
      { name: 'Bob' },
      { name: 'Ann' },
    ]);
    const result = useArrayUnique(list, item => item.name);
    expect(result.value).toEqual([{ name: 'Ann' }, { name: 'Bob' }]);
  });

  it('de-duplicates with a custom comparator function', () => {
    const list = ref([1.1, 1.4, 2.2, 2.9, 3.0]);
    const result = useArrayUnique(list, (a: number, b: number) => Math.floor(a) === Math.floor(b));
    expect(result.value).toEqual([1.1, 2.2, 3.0]);
  });

  it('passes the resolved array to the comparator', () => {
    const list = ref([1, 2, 2]);
    const seen: number[] = [];
    const result = useArrayUnique(list, (a: number, b: number, array: number[]) => {
      seen.push(array.length);
      return a === b;
    });
    expect(result.value).toEqual([1, 2]);
    expect(seen.every(length => length === 3)).toBeTruthy();
  });

  it('reacts to changes when comparing by key', () => {
    const list = ref([{ id: 1 }, { id: 2 }, { id: 1 }]);
    const result = useArrayUnique(list, 'id');
    expect(result.value).toEqual([{ id: 1 }, { id: 2 }]);

    list.value = [{ id: 3 }, { id: 3 }, { id: 4 }];
    expect(result.value).toEqual([{ id: 3 }, { id: 4 }]);
  });

  it('reacts to changes when using a comparator function', () => {
    const list = ref([1.1, 1.9]);
    const result = useArrayUnique(list, (a: number, b: number) => Math.floor(a) === Math.floor(b));
    expect(result.value).toEqual([1.1]);

    list.value = [1.1, 2.2, 2.9];
    expect(result.value).toEqual([1.1, 2.2]);
  });

  it('works outside of a component instance (SSR-safe, no global access)', () => {
    // The composable must not touch window/document/navigator: running it inside
    // a bare effectScope (no component, no DOM globals needed) must succeed.
    const scope = effectScope();
    let result: ReturnType<typeof useArrayUnique<number>> | undefined;

    scope.run(() => {
      result = useArrayUnique(ref([1, 1, 2, 3, 3]));
    });

    expect(result?.value).toEqual([1, 2, 3]);
    scope.stop();
  });
});
