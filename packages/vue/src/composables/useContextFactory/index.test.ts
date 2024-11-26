import { describe, it, expect } from 'vitest';
import { defineComponent } from 'vue';
import { useContextFactory } from '.';
import { mount } from '@vue/test-utils';
import { VueToolsError } from '../../utils';

function testFactory<Data>(
  data: Data,
  context: ReturnType<typeof useContextFactory<Data>>,
  fallback?: Data,
) {
  const [inject, provide] = context;

  const Child = defineComponent({
    setup() {
      const value = inject(fallback);
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
    const { Parent } = testFactory('test', useContextFactory('TestContext'));

    const component = mount(Parent);

    expect(component.text()).toBe('test');
  });

  it('throw an error when context is not provided', () => {
    const { Child } = testFactory('test', useContextFactory('TestContext'));

    expect(() => mount(Child)).toThrow(VueToolsError);
  });

  it('inject a fallback value when context is not provided', () => {
    const { Child } = testFactory('test', useContextFactory('TestContext'), 'fallback');

    const component = mount(Child);

    expect(component.text()).toBe('fallback');
  });

  it('correctly handle null values', () => {
    const { Parent } = testFactory(null, useContextFactory('TestContext'));

    const component = mount(Parent);

    expect(component.text()).toBe('');
  });

  it('provide context globally with app', () => {
    const context = useContextFactory('TestContext');
    const { Child } = testFactory(null, context);

    const childComponent = mount(Child, {
      global: {
        plugins: [app => context[1]('test', app)],
      },
    });

    expect(childComponent.text()).toBe('test');
  });
});