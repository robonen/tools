import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, inject, provide } from 'vue';
import type { App, InjectionKey } from 'vue';
import { activeAppPlugin, getActiveApp, injectWithApp, runWithApp, setActiveApp } from '.';
import { VueToolsError } from '@/utils';

const key: InjectionKey<string> = Symbol('TestKey');

function makeApp(setup?: () => void) {
  return createApp(defineComponent({
    setup() {
      setup?.();
      return () => h('div');
    },
  }));
}

function mountApp(app: App) {
  app.mount(document.createElement('div'));
  return app;
}

beforeEach(() => {
  setActiveApp(undefined);
});

describe(setActiveApp, () => {
  it('registers the app and returns it for chaining', () => {
    const app = makeApp();

    expect(getActiveApp()).toBeUndefined();
    expect(setActiveApp(app)).toBe(app);
    expect(getActiveApp()).toBe(app);
  });

  it('clears the registration with undefined', () => {
    setActiveApp(makeApp());
    setActiveApp(undefined);

    expect(getActiveApp()).toBeUndefined();
  });
});

describe(getActiveApp, () => {
  it('prefers the current instance app over the registered one', () => {
    const other = makeApp();
    setActiveApp(other);

    let captured: App | undefined;
    const app = mountApp(makeApp(() => {
      captured = getActiveApp();
    }));

    expect(captured).toBe(app);
    expect(captured).not.toBe(other);

    app.unmount();
  });
});

describe(runWithApp, () => {
  it('resolves app-level provides through the active app', () => {
    const app = makeApp();
    app.provide(key, 'from app');
    setActiveApp(app);

    expect(runWithApp(() => inject(key))).toBe('from app');
  });

  it('uses an explicitly passed app over the active one', () => {
    const active = makeApp();
    active.provide(key, 'active');
    setActiveApp(active);

    const explicit = makeApp();
    explicit.provide(key, 'explicit');

    expect(runWithApp(() => inject(key), explicit)).toBe('explicit');
  });

  it('returns the function result', () => {
    setActiveApp(makeApp());

    expect(runWithApp(() => 42)).toBe(42);
  });

  it('throws when no app is available', () => {
    expect(() => runWithApp(() => inject(key))).toThrow(VueToolsError);
  });
});

describe(injectWithApp, () => {
  it('resolves app-level provides outside of setup', () => {
    const app = makeApp();
    app.provide(key, 'from app');
    setActiveApp(app);

    expect(injectWithApp(key)).toBe('from app');
  });

  it('behaves like inject inside setup, component provides win', () => {
    const app = makeApp();
    app.provide(key, 'app level');
    setActiveApp(app);

    let fromParent: string | undefined;
    const Child = defineComponent({
      setup() {
        fromParent = injectWithApp(key);
        return () => h('div');
      },
    });

    const host = createApp(defineComponent({
      setup() {
        provide(key, 'component level');
        return () => h(Child);
      },
    }));
    host.provide(key, 'host app level');
    mountApp(host);

    expect(fromParent).toBe('component level');

    host.unmount();
  });

  it('falls back to the default value when the key is not provided', () => {
    setActiveApp(makeApp());

    expect(injectWithApp(key, 'fallback')).toBe('fallback');
    expect(injectWithApp(key, () => 'factory', true)).toBe('factory');
  });

  it('returns the default value when no app is available at all', () => {
    expect(injectWithApp(key, 'fallback')).toBe('fallback');
    expect(injectWithApp(key, () => 'factory', true)).toBe('factory');
  });

  it('does not call a function default unless treated as factory', () => {
    const fn = vi.fn(() => 'value');
    const injected = injectWithApp<() => string>(Symbol('FnKey'), fn);

    expect(injected).toBe(fn);
    expect(fn).not.toHaveBeenCalled();
  });

  it('throws when there is no context, no app and no default', () => {
    expect(() => injectWithApp(key)).toThrow(VueToolsError);
  });
});

describe(activeAppPlugin, () => {
  it('registers the app on install', () => {
    const app = makeApp().use(activeAppPlugin);

    expect(getActiveApp()).toBe(app);
  });

  it('clears the registration when the app unmounts', () => {
    const app = mountApp(makeApp().use(activeAppPlugin));

    app.unmount();

    expect(getActiveApp()).toBeUndefined();
  });

  it('keeps the registration when a stale app unmounts', () => {
    const first = mountApp(makeApp().use(activeAppPlugin));
    const second = makeApp().use(activeAppPlugin);

    first.unmount();

    expect(getActiveApp()).toBe(second);
  });
});
