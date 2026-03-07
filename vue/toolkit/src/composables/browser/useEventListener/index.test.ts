import { describe, it, expect, vi, afterEach } from 'vitest';
import { defineComponent, effectScope, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useEventListener } from '.';

const mountWithEventListener = (
  setup: () => Record<string, any> | void,
) => {
  return mount(
    defineComponent({
      setup,
      template: '<div></div>',
    }),
  );
};

describe(useEventListener, () => {
  let component: ReturnType<typeof mountWithEventListener>;

  afterEach(() => {
    component?.unmount();
  });

  it('register and trigger a listener on an explicit target', async () => {
    const listener = vi.fn();
    const target = document.createElement('div');

    component = mountWithEventListener(() => {
      useEventListener(target, 'click', listener);
    });

    await nextTick();

    target.dispatchEvent(new Event('click'));

    expect(listener).toHaveBeenCalledOnce();
  });

  it('remove listener when stop is called', async () => {
    const listener = vi.fn();
    const target = document.createElement('div');
    let stop: () => void;

    component = mountWithEventListener(() => {
      stop = useEventListener(target, 'click', listener);
    });

    await nextTick();

    stop!();
    target.dispatchEvent(new Event('click'));

    expect(listener).not.toHaveBeenCalled();
  });

  it('remove listener when component is unmounted', async () => {
    const listener = vi.fn();
    const target = document.createElement('div');

    component = mountWithEventListener(() => {
      useEventListener(target, 'click', listener);
    });

    await nextTick();

    component.unmount();
    target.dispatchEvent(new Event('click'));

    expect(listener).not.toHaveBeenCalled();
  });

  it('register multiple events at once', async () => {
    const listener = vi.fn();
    const target = document.createElement('div');

    component = mountWithEventListener(() => {
      useEventListener(target, ['click', 'focus'], listener);
    });

    await nextTick();

    target.dispatchEvent(new Event('click'));
    target.dispatchEvent(new Event('focus'));

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('register multiple listeners at once', async () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const target = document.createElement('div');

    component = mountWithEventListener(() => {
      useEventListener(target, 'click', [listener1, listener2]);
    });

    await nextTick();

    target.dispatchEvent(new Event('click'));

    expect(listener1).toHaveBeenCalledOnce();
    expect(listener2).toHaveBeenCalledOnce();
  });

  it('register multiple events and multiple listeners', async () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const target = document.createElement('div');

    component = mountWithEventListener(() => {
      useEventListener(target, ['click', 'focus'], [listener1, listener2]);
    });

    await nextTick();

    target.dispatchEvent(new Event('click'));
    target.dispatchEvent(new Event('focus'));

    expect(listener1).toHaveBeenCalledTimes(2);
    expect(listener2).toHaveBeenCalledTimes(2);
  });

  it('react to a reactive target change', async () => {
    const listener = vi.fn();
    const el1 = document.createElement('div');
    const el2 = document.createElement('div');
    const target = ref<HTMLElement>(el1);

    component = mountWithEventListener(() => {
      useEventListener(target, 'click', listener);
    });

    await nextTick();

    el1.dispatchEvent(new Event('click'));
    expect(listener).toHaveBeenCalledTimes(1);

    target.value = el2;
    await nextTick();

    // Old target should no longer trigger listener
    el1.dispatchEvent(new Event('click'));
    expect(listener).toHaveBeenCalledTimes(1);

    // New target should trigger listener
    el2.dispatchEvent(new Event('click'));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('cleanup when reactive target becomes null', async () => {
    const listener = vi.fn();
    const el = document.createElement('div');
    const target = ref<HTMLElement | null>(el);

    component = mountWithEventListener(() => {
      useEventListener(target, 'click', listener);
    });

    await nextTick();

    el.dispatchEvent(new Event('click'));
    expect(listener).toHaveBeenCalledTimes(1);

    target.value = null;
    await nextTick();

    el.dispatchEvent(new Event('click'));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('return noop when target is undefined', () => {
    const listener = vi.fn();
    const stop = useEventListener(undefined as any, 'click', listener);

    expect(stop).toBeTypeOf('function');
    stop(); // should not throw
    expect(listener).not.toHaveBeenCalled();
  });

  it('pass options to addEventListener', async () => {
    const target = document.createElement('div');
    const addSpy = vi.spyOn(target, 'addEventListener');

    component = mountWithEventListener(() => {
      useEventListener(target, 'click', () => {}, { capture: true });
    });

    await nextTick();

    expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function), { capture: true });
  });

  it('use window as default target when event string is passed directly', async () => {
    const listener = vi.fn();
    const addSpy = vi.spyOn(globalThis, 'addEventListener');
    const removeSpy = vi.spyOn(globalThis, 'removeEventListener');

    component = mountWithEventListener(() => {
      useEventListener('click', listener);
    });

    await nextTick();

    expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function), undefined);

    component.unmount();

    expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function), undefined);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('use window as default target when event array is passed directly', async () => {
    const listener = vi.fn();
    const addSpy = vi.spyOn(globalThis, 'addEventListener');

    component = mountWithEventListener(() => {
      useEventListener(['click', 'keydown'], listener);
    });

    await nextTick();

    expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function), undefined);
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function), undefined);

    addSpy.mockRestore();
  });

  it('work with document target', async () => {
    const listener = vi.fn();

    component = mountWithEventListener(() => {
      useEventListener(document, 'click', listener);
    });

    await nextTick();

    document.dispatchEvent(new Event('click'));

    expect(listener).toHaveBeenCalledOnce();
  });

  it('auto cleanup when effectScope is disposed', async () => {
    const listener = vi.fn();
    const target = document.createElement('div');
    const scope = effectScope();

    scope.run(() => {
      useEventListener(target, 'click', listener);
    });

    await nextTick();

    target.dispatchEvent(new Event('click'));
    expect(listener).toHaveBeenCalledTimes(1);

    scope.stop();

    target.dispatchEvent(new Event('click'));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('re-register when reactive options change', async () => {
    const target = document.createElement('div');
    const listener = vi.fn();
    const options = ref<boolean | AddEventListenerOptions>(false);
    const addSpy = vi.spyOn(target, 'addEventListener');
    const removeSpy = vi.spyOn(target, 'removeEventListener');

    component = mountWithEventListener(() => {
      useEventListener(target, 'click', listener, options);
    });

    await nextTick();

    expect(addSpy).toHaveBeenCalledTimes(1);
    expect(addSpy).toHaveBeenLastCalledWith('click', listener, false);

    options.value = true;
    await nextTick();

    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(addSpy).toHaveBeenCalledTimes(2);
    expect(addSpy).toHaveBeenLastCalledWith('click', listener, true);
  });

  it('pass correct arguments to removeEventListener on stop', async () => {
    const listener = vi.fn();
    const options = { capture: true };
    const target = document.createElement('div');
    const removeSpy = vi.spyOn(target, 'removeEventListener');
    let stop: () => void;

    component = mountWithEventListener(() => {
      stop = useEventListener(target, 'click', listener, options);
    });

    await nextTick();

    stop!();

    expect(removeSpy).toHaveBeenCalledWith('click', listener, { capture: true });
  });

  it('remove all listeners for all events on stop', async () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const events = ['click', 'scroll', 'blur'];
    const options = { capture: true };
    const target = document.createElement('div');
    const removeSpy = vi.spyOn(target, 'removeEventListener');
    let stop: () => void;

    component = mountWithEventListener(() => {
      stop = useEventListener(target, events, [listener1, listener2], options);
    });

    await nextTick();

    stop!();

    expect(removeSpy).toHaveBeenCalledTimes(events.length * 2);

    for (const event of events) {
      expect(removeSpy).toHaveBeenCalledWith(event, listener1, { capture: true });
      expect(removeSpy).toHaveBeenCalledWith(event, listener2, { capture: true });
    }
  });

  it('clone object options to prevent reactive mutation issues', async () => {
    const target = document.createElement('div');
    const listener = vi.fn();
    const options = ref<AddEventListenerOptions>({ capture: true });
    const addSpy = vi.spyOn(target, 'addEventListener');
    const removeSpy = vi.spyOn(target, 'removeEventListener');

    component = mountWithEventListener(() => {
      useEventListener(target, 'click', listener, options);
    });

    await nextTick();

    expect(addSpy).toHaveBeenCalledWith('click', listener, { capture: true });

    // Change options reactively — old removal should use the snapshotted options
    options.value = { capture: false };
    await nextTick();

    expect(removeSpy).toHaveBeenCalledWith('click', listener, { capture: true });
    expect(addSpy).toHaveBeenLastCalledWith('click', listener, { capture: false });
  });

  it('not listen when reactive target starts as null', async () => {
    const listener = vi.fn();
    const target = ref<HTMLElement | null>(null);
    const el = document.createElement('div');

    component = mountWithEventListener(() => {
      useEventListener(target, 'click', listener);
    });

    await nextTick();

    el.dispatchEvent(new Event('click'));
    expect(listener).not.toHaveBeenCalled();

    // Set target later
    target.value = el;
    await nextTick();

    el.dispatchEvent(new Event('click'));
    expect(listener).toHaveBeenCalledOnce();
  });

  it('register listener synchronously for static target', () => {
    const listener = vi.fn();
    const target = document.createElement('div');

    component = mountWithEventListener(() => {
      useEventListener(target, 'click', listener);
    });

    // No nextTick needed — listener is registered synchronously for static targets
    target.dispatchEvent(new Event('click'));
    expect(listener).toHaveBeenCalledOnce();
  });

  it('register listener synchronously for default window target', () => {
    const listener = vi.fn();
    const addSpy = vi.spyOn(globalThis, 'addEventListener');

    component = mountWithEventListener(() => {
      useEventListener('click', listener);
    });

    // No nextTick needed — registered synchronously
    expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function), undefined);

    addSpy.mockRestore();
  });
});
