import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, effectScope, nextTick, watch } from 'vue';
import { mount } from '@vue/test-utils';
import { broadcastedRef } from '.';

type MessageHandler = ((event: MessageEvent) => void) | null;

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];

  name: string;
  onmessage: MessageHandler = null;
  closed = false;

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  postMessage(data: unknown) {
    if (this.closed) return;

    for (const instance of MockBroadcastChannel.instances) {
      if (instance !== this && instance.name === this.name && !instance.closed && instance.onmessage) {
        instance.onmessage(new MessageEvent('message', { data }));
      }
    }
  }

  close() {
    this.closed = true;
    const index = MockBroadcastChannel.instances.indexOf(this);
    if (index > -1) MockBroadcastChannel.instances.splice(index, 1);
  }
}

const mountWithRef = (setup: () => Record<string, any> | void) => {
  return mount(
    defineComponent({
      setup,
      template: '<div></div>',
    }),
  );
};

describe(broadcastedRef, () => {
  let component: ReturnType<typeof mountWithRef>;

  beforeEach(() => {
    MockBroadcastChannel.instances = [];
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);
  });

  afterEach(() => {
    component?.unmount();
    vi.unstubAllGlobals();
  });

  it('create a ref with the initial value', () => {
    component = mountWithRef(() => {
      const count = broadcastedRef('test-key', 42);
      expect(count.value).toBe(42);
    });
  });

  it('broadcast value changes to other channels with the same key', () => {
    const ref1 = broadcastedRef('shared', 0);
    const ref2 = broadcastedRef('shared', 0);

    ref1.value = 100;

    expect(ref2.value).toBe(100);
  });

  it('not broadcast to channels with a different key', () => {
    const ref1 = broadcastedRef('key-a', 0);
    const ref2 = broadcastedRef('key-b', 0);

    ref1.value = 100;

    expect(ref2.value).toBe(0);
  });

  it('receive values from other channels and trigger reactivity', async () => {
    const callback = vi.fn();

    component = mountWithRef(() => {
      const data = broadcastedRef('reactive-test', 'initial');
      watch(data, callback, { flush: 'sync' });
    });

    const sender = broadcastedRef('reactive-test', '');
    sender.value = 'updated';

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith('updated', 'initial', expect.anything());
  });

  it('not broadcast initial value by default', () => {
    const ref1 = broadcastedRef('no-immediate', 'first');
    const ref2 = broadcastedRef('no-immediate', 'second');

    expect(ref1.value).toBe('first');
    expect(ref2.value).toBe('second');
  });

  it('broadcast initial value when immediate is true', () => {
    const ref1 = broadcastedRef('immediate-test', 'existing');
    broadcastedRef('immediate-test', 'new-value', { immediate: true });

    expect(ref1.value).toBe('new-value');
  });

  it('close channel on scope dispose', () => {
    const scope = effectScope();

    scope.run(() => {
      broadcastedRef('dispose-test', 0);
    });

    expect(MockBroadcastChannel.instances).toHaveLength(1);

    scope.stop();

    expect(MockBroadcastChannel.instances).toHaveLength(0);
  });

  it('handle complex object values via structured clone', () => {
    const ref1 = broadcastedRef('object-test', { status: 'pending', amount: 0 });
    const ref2 = broadcastedRef('object-test', { status: 'pending', amount: 0 });

    ref1.value = { status: 'paid', amount: 99.99 };

    expect(ref2.value).toEqual({ status: 'paid', amount: 99.99 });
  });

  it('fallback to a regular ref when BroadcastChannel is not available', () => {
    vi.stubGlobal('BroadcastChannel', undefined);

    const data = broadcastedRef('fallback', 'value');

    expect(data.value).toBe('value');

    data.value = 'updated';
    expect(data.value).toBe('updated');
  });
});
