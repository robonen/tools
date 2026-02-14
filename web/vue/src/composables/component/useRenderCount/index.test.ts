import { describe, expect, it } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils'
import { useRenderCount } from '.';

const ComponentStub = defineComponent({
    setup() {
        const count = useRenderCount();
        const visibleCount = ref(0);
        const hiddenCount = ref(0);

        return { count, visibleCount, hiddenCount };
    },
    template: `<div>{{ visibleCount }}</div>`,
});

describe('useRenderCount', () => {
    it('return the number of times the component has been rendered', async () => {
        const component = mount(ComponentStub);
        
        // Initial render
        expect(component.vm.count).toBe(1);

        component.vm.hiddenCount = 1;
        await nextTick();
        
        // Will not trigger a render
        expect(component.vm.count).toBe(1);
        expect(component.text()).toBe('0');

        component.vm.visibleCount++;
        await nextTick();

        // Will trigger a render
        expect(component.vm.count).toBe(2);
        expect(component.text()).toBe('1');

        component.vm.visibleCount++;
        component.vm.visibleCount++;
        await nextTick();

        // Will trigger a single render for both updates
        expect(component.vm.count).toBe(3);
        expect(component.text()).toBe('3');
    });

    it('can be used with a specific component instance', async () => {
        const component = mount(ComponentStub);
        const instance = component.vm.$;

        const count = useRenderCount(instance);

        // Initial render (should be zero because the component has already rendered on mount)
        expect(count.value).toBe(0);

        component.vm.hiddenCount = 1;
        await nextTick();
        
        // Will not trigger a render
        expect(count.value).toBe(0);

        component.vm.visibleCount++;
        await nextTick();

        // Will trigger a render
        expect(count.value).toBe(1);

        component.vm.visibleCount++;
        component.vm.visibleCount++;
        await nextTick();

        // Will trigger a single render for both updates
        expect(count.value).toBe(2);
    });
});