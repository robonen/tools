import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useArrayIncludes } from '.';

describe(useArrayIncludes, () => {
  it('returns true when the value is present', () => {
    const list = ref([1, 2, 3, 4]);
    const has = useArrayIncludes(list, 3);
    expect(has.value).toBeTruthy();
  });

  it('returns false when the value is absent', () => {
    const list = ref([1, 2, 3, 4]);
    const has = useArrayIncludes(list, 5);
    expect(has.value).toBeFalsy();
  });

  it('returns false for an empty array', () => {
    const list = ref<number[]>([]);
    const has = useArrayIncludes(list, 1);
    expect(has.value).toBeFalsy();
  });

  it('updates reactively when the source array changes', () => {
    const list = ref([1, 2, 3]);
    const has = useArrayIncludes(list, 4);
    expect(has.value).toBeFalsy();

    list.value = [1, 4, 5];
    expect(has.value).toBeTruthy();

    list.value = [1, 2];
    expect(has.value).toBeFalsy();
  });

  it('updates reactively when the searched value changes', () => {
    const list = ref([1, 2, 3]);
    const target = ref(2);
    const has = useArrayIncludes(list, target);
    expect(has.value).toBeTruthy();

    target.value = 9;
    expect(has.value).toBeFalsy();
  });

  it('unwraps reactive items', () => {
    const list = [ref(1), ref(2), ref(3)];
    const has = useArrayIncludes(list, 2);
    expect(has.value).toBeTruthy();
  });

  it('reacts to changes in reactive items', () => {
    const a = ref(1);
    const b = ref(2);
    const has = useArrayIncludes([a, b], 9);
    expect(has.value).toBeFalsy();

    b.value = 9;
    expect(has.value).toBeTruthy();
  });

  it('accepts a getter as the source', () => {
    const source = ref([1, 2, 3]);
    const has = useArrayIncludes(() => source.value, 3);
    expect(has.value).toBeTruthy();

    source.value = [1, 2];
    expect(has.value).toBeFalsy();
  });

  it('supports a custom comparator function', () => {
    const list = ref([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const has = useArrayIncludes(list, 2, (element, value) => element.id === value);
    expect(has.value).toBeTruthy();

    const missing = useArrayIncludes(list, 9, (element, value) => element.id === value);
    expect(missing.value).toBeFalsy();
  });

  it('passes index and array to the comparator', () => {
    const list = ref(['a', 'b', 'c']);
    const calls: Array<[string, string, number, number]> = [];
    const has = useArrayIncludes(list, 'z', (element, value, index, array) => {
      calls.push([element, value, index, array.length]);
      return false;
    });
    expect(has.value).toBeFalsy();
    expect(calls).toEqual([
      ['a', 'z', 0, 3],
      ['b', 'z', 1, 3],
      ['c', 'z', 2, 3],
    ]);
  });

  it('supports a key of T as the comparator', () => {
    const list = ref([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const has = useArrayIncludes(list, 2, 'id');
    expect(has.value).toBeTruthy();

    const missing = useArrayIncludes(list, 9, 'id');
    expect(missing.value).toBeFalsy();
  });

  it('reacts to changes when comparing by key', () => {
    const list = ref([{ id: 1 }, { id: 2 }]);
    const target = ref(2);
    const has = useArrayIncludes(list, target, 'id');
    expect(has.value).toBeTruthy();

    target.value = 5;
    expect(has.value).toBeFalsy();

    list.value = [{ id: 5 }];
    expect(has.value).toBeTruthy();
  });

  it('honors a positive fromIndex', () => {
    const list = ref(['a', 'b', 'a']);
    const fromZero = useArrayIncludes(list, 'a', { fromIndex: 0 });
    expect(fromZero.value).toBeTruthy();

    const fromTwo = useArrayIncludes(list, 'a', { fromIndex: 2 });
    expect(fromTwo.value).toBeTruthy();

    const fromThree = useArrayIncludes(list, 'a', { fromIndex: 3 });
    expect(fromThree.value).toBeFalsy();
  });

  it('honors a negative fromIndex like Array.includes', () => {
    const list = ref([1, 2, 3, 4, 5]);
    const lastTwo = useArrayIncludes(list, 3, { fromIndex: -2 });
    expect(lastTwo.value).toBeFalsy();

    const lastThree = useArrayIncludes(list, 3, { fromIndex: -3 });
    expect(lastThree.value).toBeTruthy();

    // Negative index beyond the start clamps to 0.
    const wayBack = useArrayIncludes(list, 1, { fromIndex: -100 });
    expect(wayBack.value).toBeTruthy();
  });

  it('combines comparator and fromIndex in the options object', () => {
    const list = ref([{ id: 1 }, { id: 2 }, { id: 1 }]);
    const has = useArrayIncludes(list, 1, {
      comparator: 'id',
      fromIndex: 1,
    });
    expect(has.value).toBeTruthy();

    const missing = useArrayIncludes(list, 2, {
      comparator: 'id',
      fromIndex: 2,
    });
    expect(missing.value).toBeFalsy();
  });

  it('uses strict equality by default', () => {
    const list = ref<Array<number | string>>([1, 2, 3]);
    const has = useArrayIncludes(list, '2');
    expect(has.value).toBeFalsy();
  });

  it('matches the searched value when it is a reactive getter', () => {
    const list = ref([10, 20, 30]);
    const has = useArrayIncludes(list, () => 20);
    expect(has.value).toBeTruthy();
  });
});
