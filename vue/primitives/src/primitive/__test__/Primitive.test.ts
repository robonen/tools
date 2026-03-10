import type { PrimitiveProps } from '..';
import { describe, expect, it, vi } from 'vitest';
import { Comment, createVNode, defineComponent, h, markRaw, nextTick, ref, shallowRef } from 'vue';
import { mount } from '@vue/test-utils';
import { Primitive, Slot } from '..';

// --- Slot ---

describe(Slot, () => {
  it('returns null when no default slot is provided', () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => h(Slot);
        },
      }),
    );

    expect(wrapper.html()).toBe('');

    wrapper.unmount();
  });

  it('renders the first valid child from the slot', () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => h(Slot, null, { default: () => [h('span', 'hello')] });
        },
      }),
    );

    expect(wrapper.html()).toBe('<span>hello</span>');

    wrapper.unmount();
  });

  it('applies attrs to the slotted child', () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(Slot, { class: 'custom', id: 'test' }, { default: () => [h('div')] });
        },
      }),
    );

    expect(wrapper.find('div').classes()).toContain('custom');
    expect(wrapper.find('div').attributes('id')).toBe('test');

    wrapper.unmount();
  });

  it('skips Comment nodes and picks the first element', () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(Slot, null, {
              default: () => [createVNode(Comment, null, 'skip'), h('em', 'content')],
            });
        },
      }),
    );

    expect(wrapper.html()).toBe('<em>content</em>');

    wrapper.unmount();
  });

  it('warns in DEV mode when multiple valid children are provided', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(Slot, null, {
              default: () => [h('div', 'a'), h('span', 'b')],
            });
        },
      }),
    );

    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls.some(args =>
      args.some(arg => typeof arg === 'string' && arg.includes('<Slot>')),
    )).toBe(true);

    warnSpy.mockRestore();
    wrapper.unmount();
  });

  it('renders null when slot has only comments', () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(Slot, null, {
              default: () => [
                createVNode(Comment, null, 'a'),
                createVNode(Comment, null, 'b'),
              ],
            });
        },
      }),
    );

    expect(wrapper.html()).toBe('');

    wrapper.unmount();
  });
});

// --- Primitive ---

describe(Primitive, () => {
  it('renders a div by default', () => {
    const wrapper = mount(Primitive, {
      slots: { default: () => 'content' },
    });

    expect(wrapper.element.tagName).toBe('DIV');
    expect(wrapper.text()).toBe('content');

    wrapper.unmount();
  });

  it('renders the element specified by "as" prop', () => {
    const wrapper = mount(Primitive, {
      props: { as: 'button' },
      slots: { default: () => 'click me' },
    });

    expect(wrapper.element.tagName).toBe('BUTTON');
    expect(wrapper.text()).toBe('click me');

    wrapper.unmount();
  });

  it('renders a span element', () => {
    const wrapper = mount(Primitive, {
      props: { as: 'span' },
      slots: { default: () => 'text' },
    });

    expect(wrapper.element.tagName).toBe('SPAN');

    wrapper.unmount();
  });

  it('passes attributes to the rendered element', () => {
    const wrapper = mount(Primitive, {
      props: { as: 'input' },
      attrs: { type: 'text', placeholder: 'enter' },
    });

    expect(wrapper.attributes('type')).toBe('text');
    expect(wrapper.attributes('placeholder')).toBe('enter');

    wrapper.unmount();
  });

  it('passes class and style attributes', () => {
    const wrapper = mount(Primitive, {
      props: { as: 'div' },
      attrs: { class: 'my-class', style: 'color: red' },
      slots: { default: () => 'styled' },
    });

    expect(wrapper.classes()).toContain('my-class');
    expect(wrapper.attributes('style')).toBe('color: red;');

    wrapper.unmount();
  });

  it('forwards event listeners', async () => {
    const onClick = vi.fn();

    const wrapper = mount(Primitive, {
      props: { as: 'button' },
      attrs: { onClick },
      slots: { default: () => 'click' },
    });

    await wrapper.trigger('click');

    expect(onClick).toHaveBeenCalledOnce();

    wrapper.unmount();
  });

  it('renders a custom Vue component via "as"', () => {
    const Custom = markRaw(defineComponent({
      props: { label: String },
      setup(props) {
        return () => h('span', { class: 'custom' }, props.label);
      },
    }));

    const wrapper = mount(Primitive, {
      props: { as: Custom },
      attrs: { label: 'hello' },
    });

    expect(wrapper.find('.custom').exists()).toBe(true);
    expect(wrapper.text()).toBe('hello');

    wrapper.unmount();
  });

  it('renders in Slot mode when as="template"', () => {
    const wrapper = mount(Primitive, {
      props: { as: 'template' },
      slots: { default: () => h('section', 'slot content') },
    });

    expect(wrapper.element.tagName).toBe('SECTION');
    expect(wrapper.text()).toBe('slot content');

    wrapper.unmount();
  });

  it('merges attrs onto the slotted child in template mode', () => {
    const wrapper = mount(Primitive, {
      props: { as: 'template' },
      attrs: { class: 'merged', 'data-testid': 'slot' },
      slots: { default: () => h('div', 'child') },
    });

    expect(wrapper.classes()).toContain('merged');
    expect(wrapper.attributes('data-testid')).toBe('slot');

    wrapper.unmount();
  });

  it('forwards event listeners in template mode', async () => {
    const onClick = vi.fn();

    const wrapper = mount(Primitive, {
      props: { as: 'template' },
      attrs: { onClick },
      slots: { default: () => h('button', 'click me') },
    });

    await wrapper.trigger('click');

    expect(onClick).toHaveBeenCalledOnce();

    wrapper.unmount();
  });

  it('renders empty when template mode has no slot', () => {
    const wrapper = mount(Primitive, {
      props: { as: 'template' },
    });

    expect(wrapper.html()).toBe('');

    wrapper.unmount();
  });

  it('can switch element via reactive "as" prop', async () => {
    const Wrapper = defineComponent({
      props: { tag: { type: String, default: 'div' } },
      setup(props) {
        return () => h(Primitive, { as: props.tag as PrimitiveProps['as'] }, { default: () => 'test' });
      },
    });

    const wrapper = mount(Wrapper, { props: { tag: 'div' } });

    expect(wrapper.element.tagName).toBe('DIV');

    await wrapper.setProps({ tag: 'span' });
    await nextTick();

    expect(wrapper.element.tagName).toBe('SPAN');

    wrapper.unmount();
  });

  it('exposes root element via template ref', async () => {
    const primitiveRef = shallowRef<Element | null>(null);

    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(Primitive, { ref: primitiveRef, as: 'button' }, { default: () => 'click' });
        },
      }),
    );

    await nextTick();

    expect(primitiveRef.value).toBeInstanceOf(HTMLButtonElement);

    wrapper.unmount();
  });

  it('exposes slotted element via template ref in template mode', async () => {
    const primitiveRef = shallowRef<Element | null>(null);

    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              Primitive,
              { ref: primitiveRef, as: 'template' },
              { default: () => h('section', 'content') },
            );
        },
      }),
    );

    await nextTick();

    expect(primitiveRef.value).toBeInstanceOf(HTMLElement);
    expect((primitiveRef.value as HTMLElement).tagName).toBe('SECTION');

    wrapper.unmount();
  });

  it('updates template ref when element changes', async () => {
    const primitiveRef = shallowRef<Element | null>(null);
    const tag = ref<PrimitiveProps['as']>('div');

    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            // @ts-expect-error — h() struggles with ref + broad PrimitiveProps['as'] union type
            h(Primitive, { ref: primitiveRef, as: tag.value }, { default: () => 'test' });
        },
      }),
    );

    await nextTick();

    expect(primitiveRef.value).toBeInstanceOf(HTMLDivElement);

    tag.value = 'span';
    await nextTick();

    expect(primitiveRef.value).toBeInstanceOf(HTMLSpanElement);

    wrapper.unmount();
  });
});

// --- Nested as="template" ---

describe.each([1, 2, 3])('Primitive nested as="template" (depth=%i)', (depth) => {
  function wrapInTemplate(attrs: Array<Record<string, unknown>>, slot: () => ReturnType<typeof h>) {
    let current = slot;

    for (let i = attrs.length - 1; i >= 0; i--) {
      const inner = current;
      current = () => h(Primitive, { as: 'template', ...attrs[i] }, { default: inner });
    }

    return current();
  }

  function makeAttrsPerLevel(base: string, depth: number) {
    return Array.from({ length: depth }, (_, i) => ({ [`data-level-${i}`]: `${base}-${i}` }));
  }

  it('renders the inner child element', () => {
    const attrs = makeAttrsPerLevel('v', depth);

    const wrapper = mount(
      defineComponent({
        setup() {
          return () => wrapInTemplate(attrs, () => h('section', 'leaf'));
        },
      }),
    );

    expect(wrapper.element.tagName).toBe('SECTION');
    expect(wrapper.text()).toBe('leaf');

    wrapper.unmount();
  });

  it('merges data attrs from all levels onto the leaf', () => {
    const attrs = makeAttrsPerLevel('v', depth);

    const wrapper = mount(
      defineComponent({
        setup() {
          return () => wrapInTemplate(attrs, () => h('div', 'child'));
        },
      }),
    );

    for (let i = 0; i < depth; i++) {
      expect(wrapper.attributes(`data-level-${i}`)).toBe(`v-${i}`);
    }

    wrapper.unmount();
  });

  it('merges classes from all levels', () => {
    const attrs = Array.from({ length: depth }, (_, i) => ({ class: `level-${i}` }));

    const wrapper = mount(
      defineComponent({
        setup() {
          return () => wrapInTemplate(attrs, () => h('div', { class: 'leaf' }, 'child'));
        },
      }),
    );

    for (let i = 0; i < depth; i++) {
      expect(wrapper.classes()).toContain(`level-${i}`);
    }
    expect(wrapper.classes()).toContain('leaf');

    wrapper.unmount();
  });

  it('forwards event listeners from all levels', async () => {
    const handlers = Array.from({ length: depth }, () => vi.fn());
    const attrs = handlers.map(fn => ({ onClick: fn }));

    const wrapper = mount(
      defineComponent({
        setup() {
          return () => wrapInTemplate(attrs, () => h('button', 'click'));
        },
      }),
    );

    await wrapper.trigger('click');

    for (const handler of handlers) {
      expect(handler).toHaveBeenCalledOnce();
    }

    wrapper.unmount();
  });

  it('exposes inner element via template ref', async () => {
    const primitiveRef = shallowRef<Element | null>(null);
    const attrs = makeAttrsPerLevel('v', depth);
    attrs[0] = { ...attrs[0], ref: primitiveRef };

    const wrapper = mount(
      defineComponent({
        setup() {
          return () => wrapInTemplate(attrs, () => h('section', 'content'));
        },
      }),
    );

    await nextTick();

    expect(primitiveRef.value).toBeInstanceOf(HTMLElement);
    expect((primitiveRef.value as HTMLElement).tagName).toBe('SECTION');

    wrapper.unmount();
  });

  it('renders empty when innermost slot is missing', () => {
    const attrs = makeAttrsPerLevel('v', depth);

    const wrapper = mount(
      defineComponent({
        setup() {
          return () => wrapInTemplate(attrs, () => h(Slot));
        },
      }),
    );

    expect(wrapper.html()).toBe('');

    wrapper.unmount();
  });
});
