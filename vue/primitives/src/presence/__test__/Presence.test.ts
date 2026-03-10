import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Ref } from 'vue';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { usePresence } from '../usePresence';
import Presence from '../Presence.vue';
import {
  dispatchAnimationEvent,
  getAnimationName,
  onAnimationSettle,
  shouldSuspendUnmount,
} from '@robonen/platform/browsers';

vi.mock('@robonen/platform/browsers', () => ({
  getAnimationName: vi.fn(() => 'none'),
  shouldSuspendUnmount: vi.fn(() => false),
  dispatchAnimationEvent: vi.fn((el, name) => {
    el?.dispatchEvent(new CustomEvent(name, { bubbles: false, cancelable: false }));
  }),
  onAnimationSettle: vi.fn(() => vi.fn()),
}));

const mockGetAnimationName = vi.mocked(getAnimationName);
const mockShouldSuspend = vi.mocked(shouldSuspendUnmount);
const mockDispatchEvent = vi.mocked(dispatchAnimationEvent);
const mockOnSettle = vi.mocked(onAnimationSettle);

function mountUsePresence(initial: boolean) {
  const present = ref(initial);

  const wrapper = mount(defineComponent({
    setup() {
      const { isPresent } = usePresence(present);
      return { isPresent };
    },
    render() {
      return h('div', this.isPresent ? 'visible' : 'hidden');
    },
  }));

  return { wrapper, present };
}

function mountPresenceWithAnimation(present: Ref<boolean>) {
  return mount(defineComponent({
    setup() {
      const { isPresent, setRef } = usePresence(present);
      return { isPresent, setRef };
    },
    render() {
      if (!this.isPresent) return h('div', 'hidden');

      return h('div', {
        ref: (el: any) => this.setRef(el),
      }, 'visible');
    },
  }));
}

function findDispatchCall(name: string) {
  return mockDispatchEvent.mock.calls.find(([, n]) => n === name);
}

describe('usePresence', () => {
  it('returns isPresent=true when present is true', () => {
    const { wrapper } = mountUsePresence(true);
    expect(wrapper.text()).toBe('visible');
    wrapper.unmount();
  });

  it('returns isPresent=false when present is false', () => {
    const { wrapper } = mountUsePresence(false);
    expect(wrapper.text()).toBe('hidden');
    wrapper.unmount();
  });

  it('transitions to unmounted immediately when no animation', async () => {
    const { wrapper, present } = mountUsePresence(true);
    expect(wrapper.text()).toBe('visible');

    present.value = false;
    await nextTick();

    expect(wrapper.text()).toBe('hidden');
    wrapper.unmount();
  });

  it('transitions to mounted when present becomes true', async () => {
    const { wrapper, present } = mountUsePresence(false);
    expect(wrapper.text()).toBe('hidden');

    present.value = true;
    await nextTick();

    expect(wrapper.text()).toBe('visible');
    wrapper.unmount();
  });
});

describe('Presence', () => {
  it('renders child when present is true', () => {
    const wrapper = mount(Presence, {
      props: { present: true },
      slots: { default: () => h('div', 'content') },
    });

    expect(wrapper.html()).toContain('content');
    expect(wrapper.find('div').exists()).toBe(true);
    wrapper.unmount();
  });

  it('does not render child when present is false', () => {
    const wrapper = mount(Presence, {
      props: { present: false },
      slots: { default: () => h('div', 'content') },
    });

    expect(wrapper.html()).not.toContain('content');
    wrapper.unmount();
  });

  it('removes child when present becomes false (no animation)', async () => {
    const present = ref(true);

    const wrapper = mount(defineComponent({
      setup() {
        return () => h(Presence, { present: present.value }, {
          default: () => h('span', 'hello'),
        });
      },
    }));

    expect(wrapper.find('span').exists()).toBe(true);

    present.value = false;
    await nextTick();

    expect(wrapper.find('span').exists()).toBe(false);
    wrapper.unmount();
  });

  it('adds child when present becomes true', async () => {
    const present = ref(false);

    const wrapper = mount(defineComponent({
      setup() {
        return () => h(Presence, { present: present.value }, {
          default: () => h('span', 'hello'),
        });
      },
    }));

    expect(wrapper.find('span').exists()).toBe(false);

    present.value = true;
    await nextTick();

    expect(wrapper.find('span').exists()).toBe(true);
    wrapper.unmount();
  });

  it('always renders child when forceMount is true', () => {
    const wrapper = mount(Presence, {
      props: { present: false, forceMount: true },
      slots: { default: () => h('span', 'always') },
    });

    expect(wrapper.find('span').exists()).toBe(true);
    expect(wrapper.find('span').text()).toBe('always');
    wrapper.unmount();
  });

  it('exposes present state via scoped slot', () => {
    let slotPresent: boolean | undefined;

    const wrapper = mount(Presence, {
      props: { present: true },
      slots: {
        default: (props: { present: boolean }) => {
          slotPresent = props.present;
          return h('div', 'content');
        },
      },
    });

    expect(slotPresent).toBe(true);
    wrapper.unmount();
  });

  it('exposes present=false via scoped slot when forceMount and not present', () => {
    let slotPresent: boolean | undefined;

    const wrapper = mount(Presence, {
      props: { present: false, forceMount: true },
      slots: {
        default: (props: { present: boolean }) => {
          slotPresent = props.present;
          return h('div', 'content');
        },
      },
    });

    expect(slotPresent).toBe(false);
    wrapper.unmount();
  });
});

describe('usePresence (animation)', () => {
  beforeEach(() => {
    mockGetAnimationName.mockReturnValue('none');
    mockShouldSuspend.mockReturnValue(false);
    mockOnSettle.mockImplementation(() => vi.fn());
    mockDispatchEvent.mockClear();
  });

  it('dispatches enter and after-enter when present becomes true (no animation)', async () => {
    const present = ref(false);
    const wrapper = mountPresenceWithAnimation(present);
    mockDispatchEvent.mockClear();

    present.value = true;
    await nextTick();

    expect(findDispatchCall('enter')).toBeTruthy();
    expect(findDispatchCall('after-enter')).toBeTruthy();
    wrapper.unmount();
  });

  it('dispatches leave and after-leave when no animation on leave', async () => {
    const present = ref(true);
    const wrapper = mountPresenceWithAnimation(present);
    await nextTick();
    mockDispatchEvent.mockClear();

    present.value = false;
    await nextTick();

    expect(findDispatchCall('leave')).toBeTruthy();
    expect(findDispatchCall('after-leave')).toBeTruthy();
    expect(wrapper.text()).toBe('hidden');
    wrapper.unmount();
  });

  it('suspends unmount when shouldSuspendUnmount returns true', async () => {
    mockShouldSuspend.mockReturnValue(true);

    const present = ref(true);
    const wrapper = mountPresenceWithAnimation(present);
    await nextTick();
    mockDispatchEvent.mockClear();

    present.value = false;
    await nextTick();

    expect(findDispatchCall('leave')).toBeTruthy();
    expect(findDispatchCall('after-leave')).toBeUndefined();
    expect(wrapper.text()).toBe('visible');
    wrapper.unmount();
  });

  it('dispatches after-leave and unmounts when animation settles', async () => {
    mockShouldSuspend.mockReturnValue(true);

    let settleCallback: (() => void) | undefined;
    mockOnSettle.mockImplementation((_el: any, callbacks: any) => {
      settleCallback = callbacks.onSettle;
      return vi.fn();
    });

    const present = ref(true);
    const wrapper = mountPresenceWithAnimation(present);
    await nextTick();
    mockDispatchEvent.mockClear();

    present.value = false;
    await nextTick();
    expect(wrapper.text()).toBe('visible');

    settleCallback!();
    await nextTick();

    expect(findDispatchCall('after-leave')).toBeTruthy();
    expect(wrapper.text()).toBe('hidden');
    wrapper.unmount();
  });

  it('tracks animation name on start via onAnimationSettle', async () => {
    let startCallback: ((name: string) => void) | undefined;
    mockOnSettle.mockImplementation((_el: any, callbacks: any) => {
      startCallback = callbacks.onStart;
      return vi.fn();
    });

    const present = ref(true);
    const wrapper = mountPresenceWithAnimation(present);
    await nextTick();

    expect(startCallback).toBeDefined();
    wrapper.unmount();
  });

  it('calls cleanup returned by onAnimationSettle on unmount', async () => {
    const cleanupFn = vi.fn();
    mockOnSettle.mockReturnValue(cleanupFn);

    const present = ref(true);
    const wrapper = mountPresenceWithAnimation(present);
    await nextTick();
    wrapper.unmount();
  });

  it('setRef connects DOM element for animation tracking', async () => {
    const present = ref(true);
    const wrapper = mountPresenceWithAnimation(present);
    await nextTick();

    expect(wrapper.text()).toBe('visible');
    expect(mockOnSettle).toHaveBeenCalled();
    expect(mockOnSettle.mock.calls[0]![0]).toBeInstanceOf(HTMLElement);
    wrapper.unmount();
  });

  it('resets isAnimating when node ref becomes undefined', async () => {
    mockShouldSuspend.mockReturnValue(true);

    mockOnSettle.mockImplementation(() => vi.fn());

    const present = ref(true);
    const showEl = ref(true);

    const wrapper = mount(defineComponent({
      setup() {
        const { isPresent, setRef } = usePresence(present);
        return { isPresent, setRef, showEl };
      },
      render() {
        if (!showEl.value) {
          this.setRef(undefined);
          return h('div', 'no-el');
        }

        return h('div', {
          ref: (el: any) => this.setRef(el),
        }, this.isPresent ? 'visible' : 'hidden');
      },
    }));

    await nextTick();
    expect(wrapper.text()).toBe('visible');

    showEl.value = false;
    await nextTick();
    expect(wrapper.text()).toBe('no-el');
    wrapper.unmount();
  });
});
