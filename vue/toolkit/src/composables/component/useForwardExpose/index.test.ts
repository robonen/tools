import { describe, expect, it } from 'vitest';
import type { UseForwardExposeReturn } from '.';
import { defineComponent, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useForwardExpose } from '.';

describe(useForwardExpose, () => {
  it('returns forwardRef, currentRef, and currentElement', () => {
    let result!: UseForwardExposeReturn<any>;

    const Component = defineComponent({
      setup() {
        result = useForwardExpose();
        return {};
      },
      template: `<div>test</div>`,
    });

    mount(Component);

    expect(result.forwardRef).toBeTypeOf('function');
    expect(result.currentRef).toBeDefined();
    expect(result.currentElement).toBeDefined();
  });

  it('exposes parent props on instance.exposed', () => {
    const Component = defineComponent({
      props: {
        label: { type: String, default: 'hello' },
      },
      setup() {
        useForwardExpose();
        return {};
      },
      template: `<div>{{ label }}</div>`,
    });

    const wrapper = mount(Component, { props: { label: 'world' } });

    expect(wrapper.vm.$.exposed).toBeDefined();
    expect(wrapper.vm.$.exposed!.label).toBe('world');
  });

  it('exposes $el on instance.exposed', () => {
    const Component = defineComponent({
      setup() {
        useForwardExpose();
        return {};
      },
      template: `<div class="root">content</div>`,
    });

    const wrapper = mount(Component);

    expect(wrapper.vm.$.exposed).toBeDefined();
    expect(wrapper.vm.$.exposed!.$el).toBeInstanceOf(HTMLDivElement);
    expect(wrapper.vm.$.exposed!.$el.classList.contains('root')).toBeTruthy();
  });

  it('forwardRef with a DOM element updates $el', async () => {
    let result!: UseForwardExposeReturn<any>;

    const Component = defineComponent({
      setup() {
        result = useForwardExpose();
        return {};
      },
      template: `<div><span class="inner">inner</span></div>`,
    });

    const wrapper = mount(Component);
    const innerSpan = wrapper.find('.inner').element;

    result.forwardRef(innerSpan as Element);
    await nextTick();

    expect(result.currentRef.value).toBe(innerSpan);
    expect(wrapper.vm.$.exposed!.$el).toBe(innerSpan);
  });

  it('forwardRef with a child component instance copies child exposed', async () => {
    const Child = defineComponent({
      setup(_, { expose }) {
        const childValue = ref('from-child');
        expose({ childValue });
        return { childValue };
      },
      template: `<span class="child">child</span>`,
    });

    let result!: UseForwardExposeReturn<any>;

    const Parent = defineComponent({
      components: { Child },
      setup() {
        result = useForwardExpose();
        return { forwardRef: result.forwardRef };
      },
      template: `<Child :ref="forwardRef" />`,
    });

    const wrapper = mount(Parent);
    await nextTick();

    // The parent's exposed should contain the child's exposed ref
    expect(wrapper.vm.$.exposed).toBeDefined();
    expect(wrapper.vm.$.exposed!.childValue).toEqual(ref('from-child'));
  });

  it('forwardRef with null clears currentRef without error', async () => {
    let result!: UseForwardExposeReturn<any>;

    const Component = defineComponent({
      setup() {
        result = useForwardExpose();
        return {};
      },
      template: `<div>test</div>`,
    });

    mount(Component);

    expect(() => result.forwardRef(null)).not.toThrow();
    expect(result.currentRef.value).toBeNull();
  });

  it('merges prior expose bindings', () => {
    const Component = defineComponent({
      setup(_, { expose }) {
        const custom = ref(42);
        expose({ custom });
        useForwardExpose();
        return {};
      },
      template: `<div>test</div>`,
    });

    const wrapper = mount(Component);

    expect(wrapper.vm.$.exposed).toBeDefined();
    expect(wrapper.vm.$.exposed!.custom).toEqual(ref(42));
    expect(wrapper.vm.$.exposed!.$el).toBeDefined();
  });

  it('currentElement resolves to HTMLElement for element ref', async () => {
    let result!: UseForwardExposeReturn<any>;

    const Component = defineComponent({
      setup() {
        result = useForwardExpose();
        return {};
      },
      template: `<div class="resolved">content</div>`,
    });

    const wrapper = mount(Component);
    const el = wrapper.find('.resolved').element;

    result.forwardRef(el as Element);
    await nextTick();

    expect(result.currentElement.value).toBe(el);
  });

  it('switching child components updates exposed correctly', async () => {
    const ChildA = defineComponent({
      setup(_, { expose }) {
        const a = ref('value-a');
        expose({ a });
        return { a };
      },
      template: `<span class="a">A</span>`,
    });

    const ChildB = defineComponent({
      setup(_, { expose }) {
        const b = ref('value-b');
        expose({ b });
        return { b };
      },
      template: `<span class="b">B</span>`,
    });

    let result!: UseForwardExposeReturn<any>;

    const Parent = defineComponent({
      components: { ChildA, ChildB },
      setup() {
        const showA = ref(true);
        result = useForwardExpose();
        return { showA, forwardRef: result.forwardRef };
      },
      template: `
        <ChildA v-if="showA" :ref="forwardRef" />
        <ChildB v-else :ref="forwardRef" />
      `,
    });

    const wrapper = mount(Parent);
    await nextTick();

    // Initially ChildA is rendered
    expect(wrapper.vm.$.exposed!.a).toEqual(ref('value-a'));

    // Switch to ChildB
    wrapper.vm.showA = false;
    await nextTick();

    // ChildB's exposed should be available
    expect(wrapper.vm.$.exposed!.b).toEqual(ref('value-b'));
  });

  it('$el remains correct after switching from component to element', async () => {
    const Child = defineComponent({
      setup(_, { expose }) {
        expose({ test: ref(1) });
        return {};
      },
      template: `<span class="child-el">child</span>`,
    });

    let result!: UseForwardExposeReturn<any>;

    const Parent = defineComponent({
      components: { Child },
      setup() {
        result = useForwardExpose();
        return { forwardRef: result.forwardRef };
      },
      template: `<Child :ref="forwardRef" />`,
    });

    const wrapper = mount(Parent);
    await nextTick();

    expect(wrapper.vm.$.exposed!.test).toEqual(ref(1));

    // Now forward to a plain DOM element — $el must update on instance.exposed
    const div = document.createElement('div');
    result.forwardRef(div);
    await nextTick();

    expect(wrapper.vm.$.exposed!.$el).toBe(div);
  });

  it('parent props remain accessible after child forwarding', async () => {
    const Child = defineComponent({
      setup(_, { expose }) {
        expose({ childProp: ref('child') });
        return {};
      },
      template: `<span>child</span>`,
    });

    let result!: UseForwardExposeReturn<any>;

    const Parent = defineComponent({
      components: { Child },
      props: {
        parentLabel: { type: String, default: 'parent' },
      },
      setup() {
        result = useForwardExpose();
        return { forwardRef: result.forwardRef };
      },
      template: `<Child :ref="forwardRef" />`,
    });

    const wrapper = mount(Parent, { props: { parentLabel: 'test' } });
    await nextTick();

    // Both parent props and child exposed should be accessible
    expect(wrapper.vm.$.exposed!.parentLabel).toBe('test');
    expect(wrapper.vm.$.exposed!.childProp).toEqual(ref('child'));
  });
});
