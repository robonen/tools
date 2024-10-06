import { describe, it, vi, expect } from 'vitest';
import { defineComponent, nextTick, type PropType } from 'vue';
import { tryOnMounted } from '.';
import { mount } from '@vue/test-utils';

const ComponentStub = defineComponent({
  props: {
    callback: {
      type: Function as PropType<() => void>,
      required: true,
    },
  },
  setup(props) {
    tryOnMounted(props.callback);
  },
  template: `<div></div>`,
});

describe('tryOnMounted', () => {
  it('should run the callback when mounted', () => {
    const callback = vi.fn();
    
    mount(ComponentStub, {
      props: { callback },
    });

    expect(callback).toHaveBeenCalled();
  });

  it('should run the callback outside of a component lifecycle', () => {
    const callback = vi.fn();

    tryOnMounted(callback);

    expect(callback).toHaveBeenCalled();
  });

  it('should run the callback asynchronously', async () => {
    const callback = vi.fn();

    tryOnMounted(callback, { sync: false });

    expect(callback).not.toHaveBeenCalled();
    await nextTick();
    expect(callback).toHaveBeenCalled();
  });

  it('should run the callback with a specific target', () => {
    const callback = vi.fn();

    const component = mount(ComponentStub, {
      props: { callback: () => {} },
    });

    tryOnMounted(callback, { target: component.vm.$ });

    expect(callback).toHaveBeenCalled();
  });
});