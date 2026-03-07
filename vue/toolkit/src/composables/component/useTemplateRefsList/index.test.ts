import { describe, expect, it } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useTemplateRefsList } from '.';

describe(useTemplateRefsList, () => {
  it('collects elements rendered with v-for', async () => {
    const Component = defineComponent({
      setup() {
        const items = ref([1, 2, 3]);
        const { refs, set } = useTemplateRefsList<HTMLDivElement>();
        return { items, refs, set };
      },
      template: `<div v-for="item in items" :key="item" :ref="set">{{ item }}</div>`,
    });

    const wrapper = mount(Component);
    await nextTick();

    expect(wrapper.vm.refs).toHaveLength(3);
    expect(wrapper.vm.refs[0]).toBeInstanceOf(HTMLDivElement);
    expect(wrapper.vm.refs[1]).toBeInstanceOf(HTMLDivElement);
    expect(wrapper.vm.refs[2]).toBeInstanceOf(HTMLDivElement);
  });

  it('updates refs when items are added', async () => {
    const Component = defineComponent({
      setup() {
        const items = ref([1, 2]);
        const { refs, set } = useTemplateRefsList<HTMLDivElement>();
        return { items, refs, set };
      },
      template: `<div v-for="item in items" :key="item" :ref="set">{{ item }}</div>`,
    });

    const wrapper = mount(Component);
    await nextTick();
    expect(wrapper.vm.refs).toHaveLength(2);

    wrapper.vm.items.push(3);
    await nextTick();
    expect(wrapper.vm.refs).toHaveLength(3);
  });

  it('updates refs when items are removed', async () => {
    const Component = defineComponent({
      setup() {
        const items = ref([1, 2, 3]);
        const { refs, set } = useTemplateRefsList<HTMLDivElement>();
        return { items, refs, set };
      },
      template: `<div v-for="item in items" :key="item" :ref="set">{{ item }}</div>`,
    });

    const wrapper = mount(Component);
    await nextTick();
    expect(wrapper.vm.refs).toHaveLength(3);

    wrapper.vm.items.splice(0, 1);
    await nextTick();
    expect(wrapper.vm.refs).toHaveLength(2);
  });

  it('returns empty array when no elements are rendered', async () => {
    const Component = defineComponent({
      setup() {
        const items = ref<number[]>([]);
        const { refs, set } = useTemplateRefsList<HTMLDivElement>();
        return { items, refs, set };
      },
      template: `<div><span v-for="item in items" :key="item" :ref="set">{{ item }}</span></div>`,
    });

    const wrapper = mount(Component);
    await nextTick();
    expect(wrapper.vm.refs).toHaveLength(0);
  });

  it('unwraps component instances to their root elements', async () => {
    const Child = defineComponent({
      template: `<span class="child">child</span>`,
    });

    const Parent = defineComponent({
      components: { Child },
      setup() {
        const items = ref([1, 2]);
        const { refs, set } = useTemplateRefsList<HTMLSpanElement>();
        return { items, refs, set };
      },
      template: `<div><Child v-for="item in items" :key="item" :ref="set" /></div>`,
    });

    const wrapper = mount(Parent);
    await nextTick();

    expect(wrapper.vm.refs).toHaveLength(2);
    expect(wrapper.vm.refs[0]).toBeInstanceOf(HTMLSpanElement);
    expect(wrapper.vm.refs[0]!.classList.contains('child')).toBeTruthy();
  });

  it('preserves element order matching v-for order', async () => {
    const Component = defineComponent({
      setup() {
        const items = ref(['a', 'b', 'c']);
        const { refs, set } = useTemplateRefsList<HTMLDivElement>();
        return { items, refs, set };
      },
      template: `<div v-for="item in items" :key="item" :ref="set" :data-item="item">{{ item }}</div>`,
    });

    const wrapper = mount(Component);
    await nextTick();

    expect(wrapper.vm.refs[0]!.dataset.item).toBe('a');
    expect(wrapper.vm.refs[1]!.dataset.item).toBe('b');
    expect(wrapper.vm.refs[2]!.dataset.item).toBe('c');
  });

  it('handles complete list replacement', async () => {
    const Component = defineComponent({
      setup() {
        const items = ref([1, 2, 3]);
        const { refs, set } = useTemplateRefsList<HTMLDivElement>();
        return { items, refs, set };
      },
      template: `<div v-for="item in items" :key="item" :ref="set" :data-item="item">{{ item }}</div>`,
    });

    const wrapper = mount(Component);
    await nextTick();
    expect(wrapper.vm.refs).toHaveLength(3);

    wrapper.vm.items = [4, 5];
    await nextTick();

    expect(wrapper.vm.refs).toHaveLength(2);
    expect(wrapper.vm.refs[0]!.dataset.item).toBe('4');
    expect(wrapper.vm.refs[1]!.dataset.item).toBe('5');
  });
});
