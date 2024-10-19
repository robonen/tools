import { describe, it, expect } from 'vitest';
import { defineComponent } from 'vue';
import { useContextFactory } from '.';
import { mount } from '@vue/test-utils';
import { VueToolsError } from '../../utils';

function testFactory<Data>(
  data: Data,
  options?: { contextName?: string, fallback?: Data },
) {
  const contextName = options?.contextName ?? 'TestContext';

  const [inject, provide] = useContextFactory(contextName);

  const Child = defineComponent({
    setup() {
      const value = inject(options?.fallback);
      return { value };
    },
    template: `{{ value }}`,
  });

  const Parent = defineComponent({
    components: { Child },
    setup() {
      provide(data);
    },
    template: `<Child />`,
  });

  return {
    Parent,
    Child,
  };
}

// TODO: maybe replace template with passing mock functions to setup

describe('useContextFactory', () => {
  it('provide and inject context correctly', () => {
    const { Parent } = testFactory('test');

    const component = mount(Parent);

    expect(component.text()).toBe('test');
  });

  it('throw an error when context is not provided', () => {
    const { Child } = testFactory('test');

    expect(() => mount(Child)).toThrow(VueToolsError);
  });

  it('inject a fallback value when context is not provided', () => {
    const { Child } = testFactory('test', { fallback: 'fallback' });

    const component = mount(Child);

    expect(component.text()).toBe('fallback');
  });

  it('correctly handle null values', () => {
    const { Parent } = testFactory(null);

    const component = mount(Parent);

    expect(component.text()).toBe('');
  });
});