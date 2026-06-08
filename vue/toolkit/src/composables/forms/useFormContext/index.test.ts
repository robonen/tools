import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { useForm } from '../useForm';
import type { UseFormReturn } from '../useForm';
import { useFormContext } from '.';

describe(useFormContext, () => {
  it('returns null when no form is provided', () => {
    let ctx: UseFormReturn | null = null as UseFormReturn | null;

    mount(defineComponent({
      setup() {
        ctx = useFormContext();
        return () => h('div');
      },
    }));

    expect(ctx).toBeNull();
  });

  it('injects the form provided by an ancestor', () => {
    let injected: UseFormReturn | null = null;
    let provided: UseFormReturn | undefined;

    const Child = defineComponent({
      setup() {
        injected = useFormContext();
        return () => h('div');
      },
    });

    const Parent = defineComponent({
      setup() {
        provided = useForm({ initialValues: { a: 1 } });
        return () => h(Child);
      },
    });

    mount(Parent);

    expect(injected).toBe(provided);
  });
});
