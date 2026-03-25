import { describe, it, expect } from 'vitest';
import { defineComponent, ref } from 'vue';
import { useInjectionStore } from '.';
import { mount } from '@vue/test-utils';

function testFactory<Args, Return>(
  store: ReturnType<typeof useInjectionStore<Args[], Return>>,
) {
  const { useProvidingState, useInjectedState } = store;

  const Child = defineComponent({
    setup() {
      const state = useInjectedState();
      return { state };
    },
    template: `{{ state }}`,
  });

  const Parent = defineComponent({
    components: { Child },
    setup() {
      const state = useProvidingState();
      return { state };
    },
    template: `<Child />`,
  });

  return {
    Parent,
    Child,
  };
}

describe('useInjectionState', () => {
  it('provides and injects state correctly', () => {
    const { Parent } = testFactory(
      useInjectionStore(() => ref('base'))
    );

    const wrapper = mount(Parent);
    expect(wrapper.text()).toBe('base');
  });

  it('injects default value when state is not provided', () => {
    const { Child } = testFactory(
      useInjectionStore(() => ref('without provider'), {
        defaultValue: ref('default'),
        injectionKey: 'testKey',
      })
    );

    const wrapper = mount(Child);
    expect(wrapper.text()).toBe('default');
  });

  it('provides state at app level', () => {
    const injectionStore = useInjectionStore(() => ref('app level'));
    const { Child } = testFactory(injectionStore);

    const wrapper = mount(Child, {
      global: {
        plugins: [
          app => {
            const state = injectionStore.useAppProvidingState(app)();
            expect(state.value).toBe('app level');
          },
        ],
      },
    });

    expect(wrapper.text()).toBe('app level');
  });

  it('works with custom injection key', () => {
    const { Parent } = testFactory(
      useInjectionStore(() => ref('custom key'), {
        injectionKey: Symbol('customKey'),
      }),
    );

    const wrapper = mount(Parent);
    expect(wrapper.text()).toBe('custom key');
  });

  it('handles state factory with arguments', () => {
    const injectionStore = useInjectionStore((arg: string) => arg);
    const { Child } = testFactory(injectionStore);
      
    const wrapper = mount(Child, {
      global: {
        plugins: [
          app => injectionStore.useAppProvidingState(app)('with args'),
        ],
      },
    });

    expect(wrapper.text()).toBe('with args');
  });
});
