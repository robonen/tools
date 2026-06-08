import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useArrayJoin } from '.';

describe(useArrayJoin, () => {
  it('joins with the default comma separator', () => {
    const list = ref(['a', 'b', 'c']);
    const joined = useArrayJoin(list);
    expect(joined.value).toBe('a,b,c');
  });

  it('joins with a static separator', () => {
    const list = ref(['a', 'b', 'c']);
    const joined = useArrayJoin(list, '-');
    expect(joined.value).toBe('a-b-c');
  });

  it('recomputes when the source array changes', () => {
    const list = ref(['a', 'b']);
    const joined = useArrayJoin(list, '/');
    expect(joined.value).toBe('a/b');

    list.value = ['x', 'y', 'z'];
    expect(joined.value).toBe('x/y/z');
  });

  it('reacts to a reactive separator', () => {
    const list = ref(['a', 'b', 'c']);
    const sep = ref('-');
    const joined = useArrayJoin(list, sep);
    expect(joined.value).toBe('a-b-c');

    sep.value = ' | ';
    expect(joined.value).toBe('a | b | c');
  });

  it('unwraps reactive items', () => {
    const list = [ref('a'), ref('b'), ref('c')];
    const joined = useArrayJoin(list, '-');
    expect(joined.value).toBe('a-b-c');
  });

  it('reacts to changes in reactive items', () => {
    const a = ref('a');
    const list = [a, ref('b')];
    const joined = useArrayJoin(list, '-');
    expect(joined.value).toBe('a-b');

    a.value = 'z';
    expect(joined.value).toBe('z-b');
  });

  it('accepts a getter as the source list', () => {
    const a = ref('a');
    const b = ref('b');
    const joined = useArrayJoin(() => [a.value, b.value], '-');
    expect(joined.value).toBe('a-b');

    a.value = 'z';
    expect(joined.value).toBe('z-b');
  });

  it('returns an empty string for an empty array', () => {
    const list = ref<string[]>([]);
    const joined = useArrayJoin(list, '-');
    expect(joined.value).toBe('');
  });

  it('returns the single element with no separator applied', () => {
    const list = ref(['only']);
    const joined = useArrayJoin(list, '-');
    expect(joined.value).toBe('only');
  });

  it('stringifies non-string elements like native join', () => {
    const list = ref([1, 2, 3]);
    const joined = useArrayJoin(list, '+');
    expect(joined.value).toBe('1+2+3');
  });

  it('renders null and undefined as empty strings like native join', () => {
    const list = ref([null, 'a', undefined, 'b']);
    const joined = useArrayJoin(list, ',');
    expect(joined.value).toBe(',a,,b');
  });

  it('treats an empty-string separator as concatenation', () => {
    const list = ref(['a', 'b', 'c']);
    const joined = useArrayJoin(list, '');
    expect(joined.value).toBe('abc');
  });

  it('joins a getter list of reactive items', () => {
    const a = ref('a');
    const b = ref('b');
    const list = ref([a, b]);
    const joined = useArrayJoin(() => list.value, '-');
    expect(joined.value).toBe('a-b');

    b.value = 'z';
    expect(joined.value).toBe('a-z');
  });
});
