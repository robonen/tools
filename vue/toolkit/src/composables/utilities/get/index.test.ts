import { describe, expect, it } from 'vitest';
import { computed, ref } from 'vue';
import { get } from '.';

describe(get, () => {
  it('unwraps a ref to its value', () => {
    const count = ref(1);

    expect(get(count)).toBe(1);
  });

  it('returns a plain value unchanged', () => {
    expect(get(42)).toBe(42);
    expect(get('hello')).toBe('hello');
    expect(get(null)).toBeNull();
    expect(get(undefined)).toBeUndefined();
  });

  it('resolves a getter function', () => {
    expect(get(() => 42)).toBe(42);
  });

  it('reads a property from a ref value', () => {
    const user = ref({ name: 'Ada', age: 36 });

    expect(get(user, 'name')).toBe('Ada');
    expect(get(user, 'age')).toBe(36);
  });

  it('reads a property from a plain object', () => {
    const user = { name: 'Grace' };

    expect(get(user, 'name')).toBe('Grace');
  });

  it('reads an index from an array ref', () => {
    const list = ref([10, 20, 30]);

    expect(get(list, 0)).toBe(10);
    expect(get(list, 2)).toBe(30);
  });

  it('reads a property from a getter result', () => {
    expect(get(() => ({ name: 'Linus' }), 'name')).toBe('Linus');
  });

  it('reflects the current value of a ref each call', () => {
    const count = ref(0);

    expect(get(count)).toBe(0);
    count.value = 5;
    expect(get(count)).toBe(5);
  });

  it('works with computed refs', () => {
    const base = ref(2);
    const doubled = computed(() => base.value * 2);

    expect(get(doubled)).toBe(4);
    base.value = 5;
    expect(get(doubled)).toBe(10);
  });

  it('treats a nullish key as no key (returns whole value)', () => {
    const user = ref({ name: 'Ada' });
    // `key` is typed as `keyof T`, but the runtime guard also handles a nullish
    // key for parity with `unref`-style accessors; exercise that branch here.
    const key = undefined as unknown as 'name';

    expect(get(user, key)).toEqual({ name: 'Ada' });
  });
});
