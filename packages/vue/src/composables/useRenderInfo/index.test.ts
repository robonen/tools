import { describe, it, expect } from 'vitest';
import { useRenderInfo } from '.';
import { defineComponent, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';

const NamedComponentStub = defineComponent({
  name: 'ComponentStub',
  setup() {
      const info = useRenderInfo();
      const visibleCount = ref(0);
      const hiddenCount = ref(0);

      return { info, visibleCount, hiddenCount };
  },
  template: `<div>{{ visibleCount }}</div>`,
});

const UnnamedComponentStub = defineComponent({
  setup() {
      const info = useRenderInfo();
      const visibleCount = ref(0);
      const hiddenCount = ref(0);

      return { info, visibleCount, hiddenCount };
  },
  template: `<div>{{ visibleCount }}</div>`,
});

describe('useRenderInfo', () => {
  it('return uid if component name is not available', async () => {
    const wrapper = mount(UnnamedComponentStub);

    expect(wrapper.vm.info.component).toBe(wrapper.vm.$.uid);
  });

  it('return render info for the given instance', async () => {
    const wrapper = mount(NamedComponentStub);

    // Initial render
    expect(wrapper.vm.info.component).toBe('ComponentStub');
    expect(wrapper.vm.info.count.value).toBe(1);
    expect(wrapper.vm.info.duration.value).toBeGreaterThan(0);
    expect(wrapper.vm.info.lastRendered).toBeGreaterThan(0);

    let lastRendered = wrapper.vm.info.lastRendered;
    let duration = wrapper.vm.info.duration.value;

    // Will not trigger a render
    wrapper.vm.hiddenCount++;
    await nextTick();

    expect(wrapper.vm.info.component).toBe('ComponentStub');
    expect(wrapper.vm.info.count.value).toBe(1);
    expect(wrapper.vm.info.duration.value).toBe(duration);
    expect(wrapper.vm.info.lastRendered).toBe(lastRendered);

    // Will trigger a render
    wrapper.vm.visibleCount++;
    await nextTick();

    expect(wrapper.vm.info.component).toBe('ComponentStub');
    expect(wrapper.vm.info.count.value).toBe(2);
    expect(wrapper.vm.info.duration.value).not.toBe(duration);
    expect(wrapper.vm.info.lastRendered).toBeGreaterThan(0);
  });

  it('can be used with a specific component instance', async () => {
    const wrapper = mount(NamedComponentStub);
    const instance = wrapper.vm.$;

    const info = useRenderInfo(instance);

    // Initial render (should be zero because the component has already rendered on mount)
    expect(info.component).toBe('ComponentStub');
    expect(info.count.value).toBe(0);
    expect(info.duration.value).toBe(0);
    expect(info.lastRendered).toBeGreaterThan(0);

    let lastRendered = info.lastRendered;
    let duration = info.duration.value;

    // Will not trigger a render
    wrapper.vm.hiddenCount++;
    await nextTick();

    expect(info.component).toBe('ComponentStub');
    expect(info.count.value).toBe(0);
    expect(info.duration.value).toBe(duration);
    expect(info.lastRendered).toBe(lastRendered);

    // Will trigger a render
    wrapper.vm.visibleCount++;
    await nextTick();

    expect(info.component).toBe('ComponentStub');
    expect(info.count.value).toBe(1);
    expect(info.duration.value).not.toBe(duration);
    expect(info.lastRendered).toBeGreaterThan(0);
  });
});