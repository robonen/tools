import { describe, it, vi, expect } from 'vitest';
import { defineComponent, nextTick, type PropType } from 'vue';
import { tryOnMounted } from '.';
import { mount } from '@vue/test-utils';
import type { VoidFunction } from '@robonen/stdlib';

const ComponentStub = defineComponent({
  props: {
    callback: {
      type: Function as PropType<VoidFunction>,
    },
  },
  setup(props) {
    props.callback && tryOnMounted(props.callback);
  },
  template: `<div></div>`,
});

describe('tryOnMounted', () => {
  it('run the callback when mounted', () => {
    const callback = vi.fn();
    
    mount(ComponentStub, {
      props: { callback },
    });

    expect(callback).toHaveBeenCalled();
  });

  it('run the callback outside of a component lifecycle', () => {
    const callback = vi.fn();

    tryOnMounted(callback);

    expect(callback).toHaveBeenCalled();
  });

  it('run the callback asynchronously', async () => {
    const callback = vi.fn();

    tryOnMounted(callback, { sync: false });

    expect(callback).not.toHaveBeenCalled();
    await nextTick();
    expect(callback).toHaveBeenCalled();
  });

  it.skip('run the callback with a specific target', () => {
    const callback = vi.fn();

    const component = mount(ComponentStub);

    tryOnMounted(callback, { target: component.vm.$ });

    expect(callback).toHaveBeenCalled();
  });
});