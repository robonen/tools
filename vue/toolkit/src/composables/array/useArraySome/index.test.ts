import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useArraySome } from '.';

describe(useArraySome, () => {
  it('returns true when any element matches', () => {
    const list = ref([1, 2, 3, 4]);
    const hasEven = useArraySome(list, n => n % 2 === 0);
    expect(hasEven.value).toBeTruthy();
  });

  it('returns false when no element matches', () => {
    const list = ref([1, 3, 5, 7]);
    const hasEven = useArraySome(list, n => n % 2 === 0);
    expect(hasEven.value).toBeFalsy();
  });

  it('returns false for an empty array', () => {
    const list = ref<number[]>([]);
    const result = useArraySome(list, () => true);
    expect(result.value).toBeFalsy();
  });

  it('updates reactively when the source array changes', () => {
    const list = ref([1, 3, 5]);
    const hasEven = useArraySome(list, n => n % 2 === 0);
    expect(hasEven.value).toBeFalsy();

    list.value = [1, 2, 5];
    expect(hasEven.value).toBeTruthy();

    list.value = [7, 9];
    expect(hasEven.value).toBeFalsy();
  });

  it('unwraps reactive items', () => {
    const list = [ref(1), ref(3), ref(4)];
    const hasEven = useArraySome(list, n => n % 2 === 0);
    expect(hasEven.value).toBeTruthy();
  });

  it('reacts to changes in reactive items', () => {
    const a = ref(1);
    const b = ref(3);
    const list = [a, b];
    const hasEven = useArraySome(list, n => n % 2 === 0);
    expect(hasEven.value).toBeFalsy();

    b.value = 4;
    expect(hasEven.value).toBeTruthy();
  });

  it('accepts a getter as the source', () => {
    const source = ref([1, 2, 3]);
    const hasThree = useArraySome(() => source.value, n => n === 3);
    expect(hasThree.value).toBeTruthy();

    source.value = [1, 2];
    expect(hasThree.value).toBeFalsy();
  });

  it('passes index and array to the predicate', () => {
    const list = ref(['a', 'b', 'c']);
    const calls: Array<[string, number, number]> = [];
    const result = useArraySome(list, (element, index, array) => {
      calls.push([element, index, array.length]);
      return false;
    });
    expect(result.value).toBeFalsy();
    expect(calls).toEqual([['a', 0, 3], ['b', 1, 3], ['c', 2, 3]]);
  });

  it('short-circuits on the first truthy result', () => {
    const list = ref([1, 2, 3, 4]);
    let visited = 0;
    const result = useArraySome(list, (n) => {
      visited++;
      return n === 2;
    });
    expect(result.value).toBeTruthy();
    expect(visited).toBe(2);
  });
});
