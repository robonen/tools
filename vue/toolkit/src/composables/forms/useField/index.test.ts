import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { useForm } from '../useForm';
import type { UseFieldOptions, UseFieldReturn, UseFormReturn } from '../useForm';
import { useField } from '.';

function mountField<T>(
  path: string,
  fieldOptions: Omit<UseFieldOptions<T>, 'form'> = {},
  initialValues: Record<string, any> = {},
) {
  let form!: UseFormReturn<any>;
  let field!: UseFieldReturn<T>;

  mount(defineComponent({
    setup() {
      form = useForm({ initialValues });
      field = useField<T>(path, { ...fieldOptions, form });
      return () => h('div');
    },
  }));

  return { form, field };
}

function mountStandalone<T>(path: string, fieldOptions: UseFieldOptions<T>) {
  let field!: UseFieldReturn<T>;

  mount(defineComponent({
    setup() {
      field = useField<T>(path, fieldOptions);
      return () => h('div');
    },
  }));

  return field;
}

describe(useField, () => {
  describe('bound to a form', () => {
    it('reads and writes the form value through value', () => {
      const { form, field } = mountField<string>('email', {}, { email: 'init' });

      expect(field.value.value).toBe('init');
      field.value.value = 'changed';
      expect(form.values.email).toBe('changed');
    });

    it('reflects the form errors for its path', async () => {
      const { field } = mountField<string>('email', {
        validate: value => (value.includes('@') ? true : 'Invalid'),
      }, { email: '' });

      const result = await field.validate();
      expect(result.valid).toBeFalsy();
      expect(field.errorMessage.value).toBe('Invalid');

      field.value.value = 'a@b.com';
      const ok = await field.validate();
      expect(ok.valid).toBeTruthy();
      expect(field.errors.value).toEqual([]);
    });

    it('validates with a per-field schema', async () => {
      const { field } = mountField<string>('name', {
        schema: {
          '~standard': {
            version: 1,
            vendor: 'test',
            validate: (value: any) => (value ? { value } : { issues: [{ message: 'Required' }] }),
          },
        },
      }, { name: '' });

      expect((await field.validate()).valid).toBeFalsy();
      expect(field.errorMessage.value).toBe('Required');
    });

    it('marks the field touched on blur', () => {
      const { field } = mountField<string>('email', {}, { email: '' });

      expect(field.meta.touched.value).toBeFalsy();
      field.handleBlur();
      expect(field.meta.touched.value).toBeTruthy();
    });

    it('tracks dirty state', () => {
      const { field } = mountField<string>('email', {}, { email: 'a' });

      expect(field.meta.dirty.value).toBeFalsy();
      field.value.value = 'b';
      expect(field.meta.dirty.value).toBeTruthy();
    });

    it('exposes attrs with name and aria-invalid', async () => {
      const { form, field } = mountField<string>('email', {}, { email: '' });

      expect(field.attrs.value.name).toBe('email');
      expect(field.attrs.value['aria-invalid']).toBeUndefined();

      form.setFieldError('email', 'bad');
      expect(field.attrs.value['aria-invalid']).toBeTruthy();
    });
  });

  describe('standalone (no form)', () => {
    it('holds its own value and validates locally', async () => {
      const field = mountStandalone<string>('search', {
        initialValue: '',
        validate: value => (value.length >= 3 ? true : 'Too short'),
      });

      expect(field.value.value).toBe('');
      field.handleChange('ab');
      const result = await field.validate();
      expect(result.valid).toBeFalsy();
      expect(field.errorMessage.value).toBe('Too short');

      field.handleChange('abc');
      expect((await field.validate()).valid).toBeTruthy();
    });

    it('resets to its initial value', () => {
      const field = mountStandalone<string>('x', { initialValue: 'start' });

      field.value.value = 'changed';
      expect(field.meta.dirty.value).toBeTruthy();
      field.reset();
      expect(field.value.value).toBe('start');
      expect(field.meta.dirty.value).toBeFalsy();
    });
  });
});
