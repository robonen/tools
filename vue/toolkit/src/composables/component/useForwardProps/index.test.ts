import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useForwardProps } from '.';

// A leaf with its own defaults — the thing a composite must not clobber.
const Leaf = defineComponent({
  props: {
    avoidCollisions: { type: Boolean, default: true },
    sideOffset: { type: Number, default: 4 },
    label: String,
  },
  setup(props) {
    return () => h('div', {
      'data-avoid': String(props.avoidCollisions),
      'data-offset': String(props.sideOffset),
      'data-label': props.label ?? '',
    });
  },
});

// A composite that re-declares the leaf's props and forwards them.
const Composite = defineComponent({
  props: {
    avoidCollisions: Boolean,
    sideOffset: Number,
    label: String,
  },
  setup(props) {
    const forwarded = useForwardProps(props);
    return () => h(Leaf, forwarded.value);
  },
});

describe(useForwardProps, () => {
  it('skips props the parent never passed, so the leaf keeps its own defaults', () => {
    const wrapper = mount(Composite, { props: { label: 'x' } });

    // A plain spread would have sent `avoidCollisions: false` and `sideOffset: undefined`.
    expect(wrapper.attributes('data-avoid')).toBe('true');
    expect(wrapper.attributes('data-offset')).toBe('4');
    expect(wrapper.attributes('data-label')).toBe('x');
  });

  it('forwards what was passed, an explicit false included', () => {
    const wrapper = mount(Composite, { props: { avoidCollisions: false, sideOffset: 9 } });

    expect(wrapper.attributes('data-avoid')).toBe('false');
    expect(wrapper.attributes('data-offset')).toBe('9');
  });

  it('matches kebab-case attributes to their camelCase props', () => {
    const wrapper = mount(defineComponent({
      components: { Composite },
      template: '<Composite :side-offset="7" />',
    }));

    expect(wrapper.attributes('data-offset')).toBe('7');
    expect(wrapper.attributes('data-avoid')).toBe('true');
  });

  it('follows later changes to the passed props', async () => {
    const offset = ref(1);
    const wrapper = mount(defineComponent({
      setup: () => () => h(Composite, { sideOffset: offset.value }),
    }));

    expect(wrapper.attributes('data-offset')).toBe('1');
    offset.value = 2;
    await nextTick();
    expect(wrapper.attributes('data-offset')).toBe('2');
  });
});
