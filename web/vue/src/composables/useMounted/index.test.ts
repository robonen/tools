import { describe, expect, it } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils'
import { useMounted } from '.';

const ComponentStub = defineComponent({
    setup() {
        const isMounted = useMounted();
        
        return { isMounted };
    },
    template: `<div>{{ isMounted }}</div>`,
});

describe('useMounted', () => {
    it('return the mounted state of the component', async () => {
        const component = mount(ComponentStub);
        
        // Initial render
        expect(component.text()).toBe('false');

        await nextTick();
        
        // Will trigger a render
        expect(component.text()).toBe('true');
    });
});
