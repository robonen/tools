import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, effectScope, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useIntervalFn } from '.';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const ComponentStub = defineComponent({
  props: {
    callback: {
      type: Function,
      required: true,
    },
    interval: {
      type: Number,
      default: 1000,
    },
    options: {
      type: Object,
      default: () => ({}),
    },
  },
  setup(props) {
    const result = useIntervalFn(props.callback as () => void, props.interval, props.options);
    return { ...result };
  },
  template: '<div>{{ isActive }}</div>',
});

describe(useIntervalFn, () => {
  it('starts immediately by default', () => {
    const callback = vi.fn();
    const wrapper = mount(ComponentStub, {
      props: { callback },
    });

    expect(wrapper.text()).toBe('true');
  });

  it('does not start when immediate is false', () => {
    const callback = vi.fn();
    mount(ComponentStub, {
      props: {
        callback,
        options: { immediate: false },
      },
    });

    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(callback).not.toHaveBeenCalled();
  });

  it('calls callback on each interval', () => {
    const callback = vi.fn();
    mount(ComponentStub, {
      props: { callback, interval: 500 },
    });

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(1500);
    expect(callback).toHaveBeenCalledTimes(5);
  });

  it('calls callback immediately when immediateCallback is true', () => {
    const callback = vi.fn();
    mount(ComponentStub, {
      props: {
        callback,
        interval: 1000,
        options: { immediateCallback: true },
      },
    });

    expect(callback).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('pauses and resumes', async () => {
    const callback = vi.fn();
    const wrapper = mount(ComponentStub, {
      props: { callback, interval: 100 },
    });

    vi.advanceTimersByTime(300);
    expect(callback).toHaveBeenCalledTimes(3);

    wrapper.vm.pause();
    await nextTick();

    expect(wrapper.text()).toBe('false');
    vi.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalledTimes(3);

    wrapper.vm.resume();
    await nextTick();

    expect(wrapper.text()).toBe('true');
    vi.advanceTimersByTime(200);
    expect(callback).toHaveBeenCalledTimes(5);
  });

  it('toggles the interval', async () => {
    const callback = vi.fn();
    const wrapper = mount(ComponentStub, {
      props: { callback },
    });

    expect(wrapper.text()).toBe('true');

    wrapper.vm.toggle();
    await nextTick();
    expect(wrapper.text()).toBe('false');

    wrapper.vm.toggle();
    await nextTick();
    expect(wrapper.text()).toBe('true');
  });

  it('supports reactive interval', async () => {
    const callback = vi.fn();
    const interval = ref(1000);
    const scope = effectScope();

    scope.run(() => {
      useIntervalFn(callback, interval);
    });

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    // Change interval to 200ms — watcher triggers async
    interval.value = 200;
    await nextTick();

    vi.advanceTimersByTime(200);
    expect(callback).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(200);
    expect(callback).toHaveBeenCalledTimes(3);

    scope.stop();
  });

  it('does not fire with interval <= 0', () => {
    const callback = vi.fn();
    const scope = effectScope();

    scope.run(() => {
      const { isActive } = useIntervalFn(callback, 0);
      expect(isActive.value).toBeFalsy();
    });

    vi.advanceTimersByTime(5000);
    expect(callback).not.toHaveBeenCalled();

    scope.stop();
  });

  it('cleans up on scope dispose', () => {
    const callback = vi.fn();
    const scope = effectScope();

    scope.run(() => {
      useIntervalFn(callback, 100);
    });

    vi.advanceTimersByTime(300);
    expect(callback).toHaveBeenCalledTimes(3);

    scope.stop();

    vi.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('cleans up on component unmount', () => {
    const callback = vi.fn();
    const wrapper = mount(ComponentStub, {
      props: { callback, interval: 100 },
    });

    vi.advanceTimersByTime(300);
    expect(callback).toHaveBeenCalledTimes(3);

    wrapper.unmount();

    vi.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('resume is idempotent when already active', () => {
    const callback = vi.fn();
    const scope = effectScope();
    let result: ReturnType<typeof useIntervalFn>;

    scope.run(() => {
      result = useIntervalFn(callback, 100);
    });

    expect(result!.isActive.value).toBeTruthy();
    result!.resume();
    expect(result!.isActive.value).toBeTruthy();

    // Should still tick normally — no double interval
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it('pause is idempotent when already paused', () => {
    const callback = vi.fn();
    const scope = effectScope();
    let result: ReturnType<typeof useIntervalFn>;

    scope.run(() => {
      result = useIntervalFn(callback, 100, { immediate: false });
    });

    expect(result!.isActive.value).toBeFalsy();
    result!.pause();
    expect(result!.isActive.value).toBeFalsy();

    scope.stop();
  });

  it('uses default interval of 1000ms', () => {
    const callback = vi.fn();
    const scope = effectScope();

    scope.run(() => {
      useIntervalFn(callback);
    });

    vi.advanceTimersByTime(999);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);

    scope.stop();
  });
});
