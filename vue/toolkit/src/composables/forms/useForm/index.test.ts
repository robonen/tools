import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useForm } from '.';
import type { UseFormOptions, UseFormReturn } from '.';
import type { StandardSchemaIssue, StandardSchemaV1 } from '@/types';

/**
 * A hand-rolled Standard Schema (no zod dependency) proving `~standard` interop.
 * Each entry returns a message string for an invalid field, or `undefined`.
 */
function makeSchema<T extends Record<string, any>>(
  rules: { [K in keyof T]?: (value: any) => string | undefined },
): StandardSchemaV1<T> {
  return {
    '~standard': {
      version: 1,
      vendor: 'test',
      validate(value: any) {
        const issues: StandardSchemaIssue[] = [];
        for (const key of Object.keys(rules)) {
          const message = rules[key]!(value?.[key]);
          if (message)
            issues.push({ message, path: [key] });
        }
        return issues.length > 0 ? { issues } : { value: value as T };
      },
    },
  };
}

function mountForm<TInput extends object, TOutput = TInput>(
  options: UseFormOptions<TInput, TOutput>,
) {
  let form!: UseFormReturn<TInput, TOutput>;
  const wrapper = mount(defineComponent({
    setup() {
      form = useForm<TInput, TOutput>(options);
      return () => h('form');
    },
  }));
  return { form: form!, wrapper };
}

describe(useForm, () => {
  it('exposes reactive values from initialValues', () => {
    const { form } = mountForm({ initialValues: { email: 'a@b.com', age: 30 } });

    expect(form.values.email).toBe('a@b.com');
    expect(form.getFieldValue('age')).toBe(30);
  });

  it('writes a field value by path', () => {
    const { form } = mountForm({ initialValues: { address: { city: '' } } });

    form.setFieldValue('address.city', 'NYC');

    expect(form.values.address.city).toBe('NYC');
    expect(form.getFieldValue('address.city')).toBe('NYC');
  });

  it('tracks dirty state against the initial snapshot', () => {
    const { form } = mountForm({ initialValues: { name: 'Jane' } });

    expect(form.isDirty.value).toBeFalsy();
    form.setFieldValue('name', 'John');
    expect(form.isDirty.value).toBeTruthy();
    expect(form.isFieldDirty('name')).toBeTruthy();
    form.setFieldValue('name', 'Jane');
    expect(form.isDirty.value).toBeFalsy();
  });

  it('validates with a Standard Schema and maps issues by path', async () => {
    const { form } = mountForm({
      initialValues: { email: '', age: 0 },
      schema: makeSchema<{ email: string; age: number }>({
        email: v => (typeof v === 'string' && v.includes('@') ? undefined : 'Invalid email'),
        age: v => (v >= 18 ? undefined : 'Too young'),
      }),
    });

    const result = await form.validate();

    expect(result.valid).toBeFalsy();
    expect(form.getError('email')).toBe('Invalid email');
    expect(form.getError('age')).toBe('Too young');
    expect(form.isValid.value).toBeFalsy();

    form.setFieldValue('email', 'a@b.com');
    form.setFieldValue('age', 21);
    const ok = await form.validate();

    expect(ok.valid).toBeTruthy();
    expect(ok.output).toEqual({ email: 'a@b.com', age: 21 });
    expect(form.isValid.value).toBeTruthy();
  });

  it('supports a custom resolver', async () => {
    const { form } = mountForm<{ pin: string }>({
      initialValues: { pin: '12' },
      resolver: values => (values.pin.length === 4 ? { values } : { errors: { pin: ['Need 4 digits'] } }),
    });

    expect((await form.validate()).valid).toBeFalsy();
    expect(form.getError('pin')).toBe('Need 4 digits');

    form.setFieldValue('pin', '1234');
    expect((await form.validate()).valid).toBeTruthy();
  });

  it('merges per-field function validators with the schema', async () => {
    const { form } = mountForm<{ password: string; confirm: string }>({
      initialValues: { password: 'secret', confirm: 'nope' },
    });

    form.defineField('confirm', {
      validate: (value, values) => (value === values.password ? true : 'Passwords must match'),
    });

    expect((await form.validate()).valid).toBeFalsy();
    expect(form.getError('confirm')).toBe('Passwords must match');

    form.setFieldValue('confirm', 'secret');
    expect((await form.validate()).valid).toBeTruthy();
  });

  it('handleSubmit calls onValid with typed output and bumps submitCount', async () => {
    const onValid = vi.fn();
    const { form } = mountForm({
      initialValues: { name: 'Jane' },
      schema: makeSchema<{ name: string }>({ name: v => (v ? undefined : 'Required') }),
    });

    await form.handleSubmit(onValid)();

    expect(onValid).toHaveBeenCalledWith({ name: 'Jane' }, undefined);
    expect(form.submitCount.value).toBe(1);
  });

  it('handleSubmit calls onInvalid and marks errored fields touched', async () => {
    const onValid = vi.fn();
    const onInvalid = vi.fn();
    const { form } = mountForm({
      initialValues: { name: '' },
      schema: makeSchema<{ name: string }>({ name: v => (v ? undefined : 'Required') }),
    });

    await form.handleSubmit(onValid, onInvalid)();

    expect(onValid).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledTimes(1);
    expect(form.isFieldTouched('name')).toBeTruthy();
  });

  it('prevents the native submit event default', async () => {
    const { form } = mountForm({ initialValues: { a: 1 } });
    const event = { preventDefault: vi.fn() } as unknown as Event;

    await form.handleSubmit(vi.fn())(event);

    expect((event.preventDefault as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });

  it('setValues merges by default and replaces when asked', () => {
    const { form } = mountForm({ initialValues: { a: 1, b: 2 } });

    form.setValues({ a: 9 });
    expect(form.values).toEqual({ a: 9, b: 2 });

    form.setValues({ a: 5 }, { merge: false });
    expect(form.values).toEqual({ a: 5 });
  });

  it('sets and clears field errors directly', () => {
    const { form } = mountForm({ initialValues: { name: '' } });

    form.setFieldError('name', 'Bad');
    expect(form.getError('name')).toBe('Bad');

    form.setFieldError('name', null);
    expect(form.getErrors('name')).toEqual([]);

    form.setErrors({ name: ['One', 'Two'] });
    expect(form.getErrors('name')).toEqual(['One', 'Two']);
  });

  it('resets values, errors, touched and submitCount', async () => {
    const { form } = mountForm({
      initialValues: { name: 'Jane' },
      schema: makeSchema<{ name: string }>({ name: () => 'always-bad' }),
    });

    form.setFieldValue('name', 'John');
    form.setFieldTouched('name', true);
    await form.handleSubmit(vi.fn())();

    form.resetForm();

    expect(form.values.name).toBe('Jane');
    expect(form.getErrors('name')).toEqual([]);
    expect(form.isFieldTouched('name')).toBeFalsy();
    expect(form.submitCount.value).toBe(0);
  });

  it('resetField restores a single field to its initial value', () => {
    const { form } = mountForm({ initialValues: { a: 1, b: 2 } });

    form.setFieldValue('a', 10);
    form.setFieldValue('b', 20);
    form.resetField('a');

    expect(form.values.a).toBe(1);
    expect(form.values.b).toBe(20);
  });

  it('defineField yields a working v-model + props pair', async () => {
    const { form } = mountForm({
      initialValues: { name: '' },
      schema: makeSchema<{ name: string }>({ name: v => (v ? undefined : 'Required') }),
    });

    const [model, props] = form.defineField('name');

    expect(props.value.name).toBe('name');
    expect(props.value['aria-invalid']).toBeUndefined();

    model.value = 'Jane';
    expect(form.values.name).toBe('Jane');

    form.setFieldError('name', 'Required');
    await nextTick();
    expect(props.value['aria-invalid']).toBeTruthy();
  });

  it('validateOnMount validates immediately', async () => {
    const { form } = mountForm({
      initialValues: { name: '' },
      schema: makeSchema<{ name: string }>({ name: v => (v ? undefined : 'Required') }),
      validateOnMount: true,
    });

    await flushPromises();
    expect(form.getError('name')).toBe('Required');
  });
});
