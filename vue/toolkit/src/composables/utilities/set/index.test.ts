import { describe, expect, it } from 'vitest';
import { nextTick, reactive, ref, shallowRef, watch } from 'vue';
import { set } from '.';

describe(set, () => {
  it('assigns a value to a ref', () => {
    const count = ref(0);

    set(count, 5);

    expect(count.value).toBe(5);
  });

  it('overwrites an existing ref value', () => {
    const message = ref('hello');

    set(message, 'world');

    expect(message.value).toBe('world');
  });

  it('assigns a value to a shallowRef', () => {
    const state = shallowRef({ open: false });
    const next = { open: true };

    set(state, next);

    expect(state.value).toBe(next);
  });

  it('triggers ref reactivity', async () => {
    const count = ref(0);
    let observed = 0;

    watch(count, (value) => {
      observed = value;
    });
    set(count, 42);
    await nextTick();

    expect(observed).toBe(42);
  });

  it('sets a property on a plain object', () => {
    const user = { name: 'Ada', age: 36 };

    set(user, 'name', 'Grace');

    expect(user.name).toBe('Grace');
    expect(user.age).toBe(36);
  });

  it('sets a property on a reactive object', async () => {
    const user = reactive({ name: 'Ada' });
    let observed = '';

    watch(() => user.name, (value) => {
      observed = value;
    });
    set(user, 'name', 'Linus');
    await nextTick();

    expect(user.name).toBe('Linus');
    expect(observed).toBe('Linus');
  });

  it('sets an index on an array', () => {
    const list = [10, 20, 30];

    set(list, 1, 99);

    expect(list).toEqual([10, 99, 30]);
  });

  it('assigns falsy values to a ref', () => {
    const count = ref<number | null>(5);

    set(count, 0);
    expect(count.value).toBe(0);

    set(count, null);
    expect(count.value).toBeNull();
  });

  it('assigns undefined to a ref (two-argument form is detected by arity)', () => {
    const value = ref<string | undefined>('present');

    set(value, undefined);

    expect(value.value).toBeUndefined();
  });

  it('sets a falsy property value on an object', () => {
    const flags = { active: true };

    set(flags, 'active', false);

    expect(flags.active).toBeFalsy();
  });

  it('does not mutate other properties when setting one', () => {
    const config = { a: 1, b: 2, c: 3 };

    set(config, 'b', 20);

    expect(config).toEqual({ a: 1, b: 20, c: 3 });
  });
});
