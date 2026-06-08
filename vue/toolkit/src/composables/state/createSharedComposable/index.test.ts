import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';
import type { Ref } from 'vue';
import { mount } from '@vue/test-utils';
import { createSharedComposable } from '.';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

describe(createSharedComposable, () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('@robonen/platform/multi');
  });

  it('returns a function with the same call signature', () => {
    const shared = createSharedComposable((value: number) => ref(value));

    expect(shared).toBeTypeOf('function');
  });

  it('reuses a single instance across consumers', () => {
    const factory = vi.fn(() => ({ count: ref(0) }));
    const useShared = createSharedComposable(factory);

    let firstState: { count: Ref<number> } | undefined;
    let secondState: { count: Ref<number> } | undefined;

    const Host = defineComponent({
      setup() {
        const a = useShared();
        const b = useShared();
        firstState = a;
        secondState = b;
        return () => null;
      },
    });

    const wrapper = mount(Host);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(firstState).toBe(secondState);

    wrapper.unmount();
  });

  it('shares reactive state between separate component instances', () => {
    const useShared = createSharedComposable(() => ({ count: ref(0) }));

    let stateA: { count: Ref<number> } | undefined;
    let stateB: { count: Ref<number> } | undefined;

    const ComponentA = defineComponent({
      setup() {
        stateA = useShared();
        return () => null;
      },
    });

    const ComponentB = defineComponent({
      setup() {
        stateB = useShared();
        return () => null;
      },
    });

    const a = mount(ComponentA);
    const b = mount(ComponentB);

    expect(stateA).toBe(stateB);

    stateA!.count.value = 42;
    expect(stateB!.count.value).toBe(42);

    a.unmount();
    b.unmount();
  });

  it('keeps state alive while at least one consumer remains', () => {
    const factory = vi.fn(() => ({ count: ref(0) }));
    const useShared = createSharedComposable(factory);

    const make = () => defineComponent({
      setup() {
        useShared();
        return () => null;
      },
    });

    const a = mount(make());
    const b = mount(make());

    expect(factory).toHaveBeenCalledTimes(1);

    a.unmount();

    // Still one consumer (b), so a new mount must reuse the existing instance.
    const c = mount(make());
    expect(factory).toHaveBeenCalledTimes(1);

    b.unmount();
    c.unmount();
  });

  it('disposes the scope and recreates state after the last consumer leaves', () => {
    const factory = vi.fn(() => ({ count: ref(0) }));
    const useShared = createSharedComposable(factory);

    const make = () => defineComponent({
      setup() {
        useShared();
        return () => null;
      },
    });

    const a = mount(make());
    expect(factory).toHaveBeenCalledTimes(1);

    a.unmount();

    // Last consumer gone -> next call rebuilds.
    const b = mount(make());
    expect(factory).toHaveBeenCalledTimes(2);

    b.unmount();
  });

  it('stops effects in the shared scope when fully disposed', () => {
    const stop = vi.fn();
    const useShared = createSharedComposable(() => {
      // tryOnScopeDispose registers against the shared effect scope.
      tryOnScopeDispose(stop);
      return ref(0);
    });

    const make = () => defineComponent({
      setup() {
        useShared();
        return () => null;
      },
    });

    const a = mount(make());
    const b = mount(make());

    expect(stop).not.toHaveBeenCalled();

    a.unmount();
    expect(stop).not.toHaveBeenCalled();

    b.unmount();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('works outside of a component scope (no tracking, no crash)', () => {
    const factory = vi.fn(() => ({ count: ref(0) }));
    const useShared = createSharedComposable(factory);

    const first = useShared();
    const second = useShared();

    expect(factory).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it('falls back to the raw composable in a non-client (SSR) environment', async () => {
    vi.resetModules();
    vi.doMock('@robonen/platform/multi', () => ({ isClient: false }));

    const { createSharedComposable: ssrShared } = await import('.');

    const factory = vi.fn(() => ({ count: ref(0) }));
    const useShared = ssrShared(factory);

    const a = useShared();
    const b = useShared();

    // No sharing on the server: every call builds a fresh instance.
    expect(factory).toHaveBeenCalledTimes(2);
    expect(a).not.toBe(b);
  });
});
