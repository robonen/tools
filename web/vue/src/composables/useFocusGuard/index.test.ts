import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { useFocusGuard } from '.';

const setupFocusGuard = (namespace?: string) => {
  return mount(
    defineComponent({
      setup() {
        useFocusGuard(namespace);
      },
      template: '<div></div>',
    })
  );
};

const getFocusGuards = (namespace: string) =>
  document.querySelectorAll(`[data-${namespace}]`);

describe('useFocusGuard', () => {
  let component: ReturnType<typeof setupFocusGuard>;
  const namespace = 'test-guard';

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    component.unmount();
  });

  it('create focus guards when mounted', async () => {
    component = setupFocusGuard(namespace);

    const guards = getFocusGuards(namespace);
    expect(guards.length).toBe(2);

    guards.forEach((guard) => {
      expect(guard.getAttribute('tabindex')).toBe('0');
      expect(guard.getAttribute('style')).toContain('opacity: 0');
    });
  });

  it('remove focus guards when unmounted', () => {
    component = setupFocusGuard(namespace);

    component.unmount();

    expect(getFocusGuards(namespace).length).toBe(0);
  });

  it('correctly manage multiple instances with the same namespace', () => {
    const wrapper1 = setupFocusGuard(namespace);
    const wrapper2 = setupFocusGuard(namespace);

    // Guards should not be duplicated
    expect(getFocusGuards(namespace).length).toBe(2);

    wrapper1.unmount();

    // Second instance still keeps the guards
    expect(getFocusGuards(namespace).length).toBe(2);

    wrapper2.unmount();

    // No guards left after all instances are unmounted
    expect(getFocusGuards(namespace).length).toBe(0);
  });
});
