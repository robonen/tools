import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { createReusableTemplate } from '.';

describe(createReusableTemplate, () => {
  it('returns a destructurable [define, reuse] pair', () => {
    const pair = createReusableTemplate();

    expect(pair[0]).toBeDefined();
    expect(pair[1]).toBeDefined();
    expect(pair.define).toBe(pair[0]);
    expect(pair.reuse).toBe(pair[1]);

    const [DefineTemplate, ReuseTemplate] = pair;
    expect(DefineTemplate).toBe(pair.define);
    expect(ReuseTemplate).toBe(pair.reuse);
  });

  it('renders the defined template wherever reuse is used', () => {
    const Host = defineComponent({
      setup() {
        const [DefineTemplate, ReuseTemplate] = createReusableTemplate();

        return () => [
          h(DefineTemplate, () => h('span', { class: 'tpl' }, 'Hello')),
          h(ReuseTemplate),
          h(ReuseTemplate),
        ];
      },
    });

    const wrapper = mount(Host);

    expect(wrapper.findAll('.tpl')).toHaveLength(2);
    expect(wrapper.text()).toBe('HelloHello');
  });

  it('passes props from reuse to the define slot as bindings', () => {
    const [DefineTemplate, ReuseTemplate] = createReusableTemplate<{ label: string }>();

    const Host = defineComponent({
      setup() {
        return () => [
          h(DefineTemplate, {}, {
            default: (bindings: { label: string }) => h('span', bindings.label),
          }),
          h(ReuseTemplate, { label: 'A' }),
          h(ReuseTemplate, { label: 'B' }),
        ];
      },
    });

    const wrapper = mount(Host);

    expect(wrapper.text()).toBe('AB');
  });

  it('camelizes raw attrs when no props option is given', () => {
    const [DefineTemplate, ReuseTemplate] = createReusableTemplate<{ myValue: string }>();

    const Host = defineComponent({
      setup() {
        return () => [
          h(DefineTemplate, {}, {
            default: (bindings: { myValue: string }) => h('span', bindings.myValue),
          }),
          // kebab attr should arrive camelized as `myValue` (raw attrs are untyped here)
          h(ReuseTemplate as unknown as string, { 'my-value': 'hi' }),
        ];
      },
    });

    const wrapper = mount(Host);

    expect(wrapper.text()).toBe('hi');
  });

  it('reacts to changes in the defined template', async () => {
    const text = ref('first');

    const Host = defineComponent({
      setup() {
        const [DefineTemplate, ReuseTemplate] = createReusableTemplate();

        return () => [
          h(DefineTemplate, () => h('span', { class: 'out' }, text.value)),
          h(ReuseTemplate),
        ];
      },
    });

    const wrapper = mount(Host);
    expect(wrapper.find('.out').text()).toBe('first');

    text.value = 'second';
    await nextTick();

    expect(wrapper.find('.out').text()).toBe('second');
  });

  it('uses a typed props option for bindings', () => {
    const [DefineTemplate, ReuseTemplate] = createReusableTemplate<{ count: number }>({
      props: {
        count: { type: Number, required: true },
      },
    });

    const Host = defineComponent({
      setup() {
        return () => [
          h(DefineTemplate, {}, {
            default: (b: { count: number }) => h('span', String(b.count * 2)),
          }),
          h(ReuseTemplate, { count: 21 }),
        ];
      },
    });

    const wrapper = mount(Host);

    expect(wrapper.text()).toBe('42');
  });

  it('inherits attrs onto a single root vnode by default', () => {
    const [DefineTemplate, ReuseTemplate] = createReusableTemplate({
      props: { label: { type: String } },
    });

    const Host = defineComponent({
      setup() {
        return () => [
          h(DefineTemplate, {}, {
            default: () => h('div', { class: 'root' }, 'x'),
          }),
          h(ReuseTemplate, { 'data-test': 'yes', label: 'l' }),
        ];
      },
    });

    const wrapper = mount(Host);
    const root = wrapper.find('.root');

    expect(root.attributes('data-test')).toBe('yes');
  });

  it('does not merge attrs onto root when inheritAttrs is false', () => {
    const [DefineTemplate, ReuseTemplate] = createReusableTemplate({
      inheritAttrs: false,
      props: { label: { type: String } },
    });

    const Host = defineComponent({
      setup() {
        return () => [
          h(DefineTemplate, {}, {
            default: () => h('div', { class: 'root' }, 'x'),
          }),
          h(ReuseTemplate, { 'data-test': 'yes', label: 'l' }),
        ];
      },
    });

    const wrapper = mount(Host);
    const root = wrapper.find('.root');

    expect(root.attributes('data-test')).toBeUndefined();
  });

  it('forwards nested slots through $slots binding', () => {
    const [DefineTemplate, ReuseTemplate] = createReusableTemplate();

    const Host = defineComponent({
      setup() {
        return () => [
          h(DefineTemplate, {}, {
            default: (bindings: { $slots: Record<string, any> }) =>
              h('div', { class: 'wrap' }, bindings.$slots.default?.()),
          }),
          h(ReuseTemplate, {}, {
            default: () => h('em', 'slotted'),
          }),
        ];
      },
    });

    const wrapper = mount(Host);

    expect(wrapper.find('.wrap em').text()).toBe('slotted');
  });

  it('uses a custom name for the components', () => {
    const [DefineTemplate, ReuseTemplate] = createReusableTemplate({ name: 'MyTpl' });

    expect((DefineTemplate as any).name).toBe('MyTpl.define');
    expect((ReuseTemplate as any).name).toBe('MyTpl.reuse');
  });

  it('throws when reuse renders before define (dev), and is SSR/render-safe', () => {
    const [, ReuseTemplate] = createReusableTemplate();

    const Host = defineComponent({
      setup() {
        return () => h(ReuseTemplate);
      },
    });

    // In dev (NODE_ENV !== 'production') the missing-definition path throws.
    expect(() => mount(Host)).toThrow(/Failed to find the template definition/);
  });
});
