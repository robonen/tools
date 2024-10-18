import { describe, expect, it, vi } from 'vitest';
import { defineComponent, effectScope, type PropType } from 'vue';
import { tryOnScopeDispose } from '.';
import { mount } from '@vue/test-utils';
import type { VoidFunction } from '@robonen/stdlib';

const ComponentStub = defineComponent({
  props: {
    callback: {
      type: Function as PropType<VoidFunction>,
      required: true
    }
  },
  setup(props) {
    tryOnScopeDispose(props.callback);
  },
});

describe('tryOnScopeDispose', () => {
  it('returns false when the scope is not active', () => {
    const callback = vi.fn();
    const detectedScope = tryOnScopeDispose(callback);

    expect(detectedScope).toBe(false);
    expect(callback).not.toHaveBeenCalled();
  });
  
  it('run the callback when the scope is disposed', () => {
    const callback = vi.fn();
    const scope = effectScope();
    let detectedScope: boolean | undefined;

    scope.run(() => {
      detectedScope = tryOnScopeDispose(callback);
    });

    expect(detectedScope).toBe(true);
    expect(callback).not.toHaveBeenCalled();

    scope.stop();

    expect(callback).toHaveBeenCalled();
  });

  it('run callback when the component is unmounted', () => {
    const callback = vi.fn();
    const component = mount(ComponentStub, {
      props: { callback },
    });

    expect(callback).not.toHaveBeenCalled();

    component.unmount();

    expect(callback).toHaveBeenCalled();
  });
});