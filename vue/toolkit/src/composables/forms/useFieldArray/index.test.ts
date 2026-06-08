import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { useForm } from '../useForm';
import type { UseFieldArrayReturn, UseFormReturn } from '../useForm';
import { useFieldArray } from '.';

interface User { name: string }

function mountArray(initial: User[]) {
  let form!: UseFormReturn<{ users: User[] }>;
  let arr!: UseFieldArrayReturn<User>;

  mount(defineComponent({
    setup() {
      form = useForm<{ users: User[] }>({ initialValues: { users: initial } });
      arr = useFieldArray<User>('users', { form });
      return () => h('div');
    },
  }));

  return { form, arr };
}

const names = (form: UseFormReturn<{ users: User[] }>): string[] => form.values.users.map(u => u.name);

describe(useFieldArray, () => {
  it('exposes entries with stable keys', () => {
    const { arr } = mountArray([{ name: 'a' }, { name: 'b' }]);

    expect(arr.fields.value).toHaveLength(2);
    expect(arr.fields.value[0]!.isFirst).toBeTruthy();
    expect(arr.fields.value[1]!.isLast).toBeTruthy();
    expect(arr.fields.value[0]!.key).not.toBe(arr.fields.value[1]!.key);
  });

  it('push and prepend add items', () => {
    const { form, arr } = mountArray([{ name: 'a' }]);

    arr.push({ name: 'b' });
    expect(names(form)).toEqual(['a', 'b']);

    arr.prepend({ name: 'z' });
    expect(names(form)).toEqual(['z', 'a', 'b']);
  });

  it('insert, remove and update', () => {
    const { form, arr } = mountArray([{ name: 'a' }, { name: 'c' }]);

    arr.insert(1, { name: 'b' });
    expect(names(form)).toEqual(['a', 'b', 'c']);

    arr.remove(0);
    expect(names(form)).toEqual(['b', 'c']);

    arr.update(1, { name: 'C' });
    expect(names(form)).toEqual(['b', 'C']);
  });

  it('move and swap reorder items and keys together', () => {
    const { form, arr } = mountArray([{ name: 'a' }, { name: 'b' }, { name: 'c' }]);
    const keys = arr.fields.value.map(f => f.key);

    arr.move(0, 2);
    expect(names(form)).toEqual(['b', 'c', 'a']);
    expect(arr.fields.value.map(f => f.key)).toEqual([keys[1], keys[2], keys[0]]);

    arr.swap(0, 2);
    expect(names(form)).toEqual(['a', 'c', 'b']);
  });

  it('replace swaps the entire array', () => {
    const { form, arr } = mountArray([{ name: 'a' }]);

    arr.replace([{ name: 'x' }, { name: 'y' }]);
    expect(names(form)).toEqual(['x', 'y']);
    expect(arr.fields.value).toHaveLength(2);
  });

  it('remaps errors when an item is removed', () => {
    const { form, arr } = mountArray([{ name: 'a' }, { name: 'b' }]);

    form.setFieldError('users.1.name', 'Bad');
    expect(form.getError('users.1.name')).toBe('Bad');

    arr.remove(0);

    // The second item shifted into index 0 — its error follows.
    expect(form.getError('users.0.name')).toBe('Bad');
    expect(form.getErrors('users.1.name')).toEqual([]);
  });

  it('drops the error of a removed item', () => {
    const { form, arr } = mountArray([{ name: 'a' }, { name: 'b' }]);

    form.setFieldError('users.0.name', 'Gone');
    arr.remove(0);

    expect(form.getErrors('users.0.name')).toEqual([]);
    expect(form.getError('users.0.name')).toBeUndefined();
  });

  it('lets an entry value edit the underlying slot', () => {
    const { form, arr } = mountArray([{ name: 'a' }]);

    arr.fields.value[0]!.value.value = { name: 'edited' };
    expect(form.values.users[0]!.name).toBe('edited');
  });
});
