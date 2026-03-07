import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, effectScope, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { useRafFn } from '.';

let rafCallbacks: Array<(time: number) => void> = [];
let rafIdCounter = 0;
let currentTime = 0;

beforeEach(() => {
  rafCallbacks = [];
  rafIdCounter = 0;
  currentTime = 0;

  vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
    const id = ++rafIdCounter;
    rafCallbacks.push(cb);
    return id;
  });

  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function triggerFrame(time: number) {
  currentTime = time;
  const cbs = [...rafCallbacks];
  rafCallbacks = [];
  cbs.forEach(cb => cb(currentTime));
}

const ComponentStub = defineComponent({
  props: {
    callback: {
      type: Function,
      required: true,
    },
    options: {
      type: Object,
      default: () => ({}),
    },
  },
  setup(props) {
    const result = useRafFn(props.callback as any, props.options);
    return { ...result };
  },
  template: '<div>{{ isActive }}</div>',
});

describe(useRafFn, () => {
  it('starts immediately by default', () => {
    const callback = vi.fn();
    const wrapper = mount(ComponentStub, {
      props: { callback },
    });

    expect(wrapper.text()).toBe('true');
  });

  it('does not start when immediate is false', () => {
    const callback = vi.fn();
    const wrapper = mount(ComponentStub, {
      props: {
        callback,
        options: { immediate: false },
      },
    });

    expect(wrapper.text()).toBe('false');
    expect(callback).not.toHaveBeenCalled();
  });

  it('calls the callback on animation frame with delta and timestamp', () => {
    const callback = vi.fn();
    mount(ComponentStub, {
      props: { callback },
    });

    triggerFrame(100);
    expect(callback).toHaveBeenCalledWith({ delta: 0, timestamp: 100 });
  });

  it('provides correct delta between frames', () => {
    const callback = vi.fn();
    mount(ComponentStub, {
      props: { callback },
    });

    triggerFrame(100);
    triggerFrame(116.67);

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback.mock.calls[1]![0]!.delta).toBeCloseTo(16.67, 1);
  });

  it('pauses and resumes the loop', async () => {
    const callback = vi.fn();
    const wrapper = mount(ComponentStub, {
      props: { callback },
    });

    triggerFrame(100);
    expect(callback).toHaveBeenCalledTimes(1);

    wrapper.vm.pause();
    await nextTick();

    expect(wrapper.text()).toBe('false');
    triggerFrame(200);
    expect(callback).toHaveBeenCalledTimes(1);

    wrapper.vm.resume();
    await nextTick();

    expect(wrapper.text()).toBe('true');
    triggerFrame(300);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('resets delta after resume', () => {
    const callback = vi.fn();
    const wrapper = mount(ComponentStub, {
      props: { callback },
    });

    triggerFrame(100);
    wrapper.vm.pause();

    wrapper.vm.resume();
    triggerFrame(500);

    // After resume, first frame delta resets to 0
    const lastCall = callback.mock.calls[callback.mock.calls.length - 1]![0]!;
    expect(lastCall.delta).toBe(0);
    expect(lastCall.timestamp).toBe(500);
  });

  it('toggles the loop', async () => {
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

  it('limits frame rate with fpsLimit', () => {
    const callback = vi.fn();
    mount(ComponentStub, {
      props: {
        callback,
        options: { fpsLimit: 30 },
      },
    });

    // First frame always fires (delta is 0)
    triggerFrame(100);
    expect(callback).toHaveBeenCalledTimes(1);

    // 30fps = ~33.33ms per frame — too soon, skipped
    triggerFrame(110);
    expect(callback).toHaveBeenCalledTimes(1);

    // Enough time passed (~40ms > 33.33ms)
    triggerFrame(140);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('cleans up on scope dispose', () => {
    const callback = vi.fn();
    const scope = effectScope();

    scope.run(() => {
      useRafFn(callback);
    });

    triggerFrame(100);
    expect(callback).toHaveBeenCalledTimes(1);

    scope.stop();
    triggerFrame(200);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('cleans up on component unmount', () => {
    const callback = vi.fn();
    const wrapper = mount(ComponentStub, {
      props: { callback },
    });

    triggerFrame(100);
    expect(callback).toHaveBeenCalledTimes(1);

    wrapper.unmount();
    triggerFrame(200);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does nothing when window is undefined (SSR)', () => {
    const callback = vi.fn();
    const scope = effectScope();

    scope.run(() => {
      const { isActive } = useRafFn(callback, { window: undefined as any });
      expect(isActive.value).toBeFalsy();
    });

    expect(callback).not.toHaveBeenCalled();
    scope.stop();
  });

  it('resume is idempotent when already active', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useRafFn>;

    scope.run(() => {
      result = useRafFn(vi.fn());
    });

    expect(result!.isActive.value).toBeTruthy();
    result!.resume();
    expect(result!.isActive.value).toBeTruthy();

    scope.stop();
  });

  it('pause is idempotent when already paused', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useRafFn>;

    scope.run(() => {
      result = useRafFn(vi.fn(), { immediate: false });
    });

    expect(result!.isActive.value).toBeFalsy();
    result!.pause();
    expect(result!.isActive.value).toBeFalsy();

    scope.stop();
  });
});
