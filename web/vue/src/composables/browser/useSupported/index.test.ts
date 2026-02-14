import { defineComponent } from 'vue';
import { describe, it, expect } from 'vitest';
import { useSupported } from '.';
import { mount } from '@vue/test-utils';

const ComponentStub = defineComponent({
  props: {
    location: {
      type: String,
      default: 'location',
    },
  },
  setup(props) {
      const isSupported = useSupported(() => props.location in window);
      
      return { isSupported };
  },
  template: `<div>{{ isSupported }}</div>`,
});

describe('useSupported', () => {
  it('return whether the feature is supported', async () => {
      const component = mount(ComponentStub);

      expect(component.text()).toBe('true');
  });

  it('return whether the feature is not supported', async () => {
      const component = mount(ComponentStub, {
        props: {
          location: 'unsupported',
        },
      });

      expect(component.text()).toBe('false');
  });
});