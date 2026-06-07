import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';

import { NavigationMenuList, NavigationMenuRoot } from '../index';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

function mountRoot(attrs: Record<string, unknown> = {}) {
  const Harness = defineComponent({
    setup() {
      return () => h(NavigationMenuRoot, attrs, {
        default: () => h(NavigationMenuList),
      });
    },
  });
  return track(mount(Harness, { attachTo: document.body }));
}

describe('navigation-menu — root landmark a11y', () => {
  it('renders a <nav> element (implicit role=navigation)', () => {
    mountRoot();
    const nav = document.querySelector('nav');
    expect(nav).toBeTruthy();
    // <nav> has implicit role="navigation" — no explicit role attribute needed.
  });

  it('falls back to aria-label="Main" when no label is supplied', () => {
    mountRoot();
    const nav = document.querySelector('nav') as HTMLElement;
    expect(nav.getAttribute('aria-label')).toBe('Main');
  });

  it('honours a user-supplied aria-label', () => {
    mountRoot({ 'aria-label': 'Primary site navigation' });
    const nav = document.querySelector('nav') as HTMLElement;
    expect(nav.getAttribute('aria-label')).toBe('Primary site navigation');
  });

  it('exposes data-orientation matching the orientation prop', () => {
    mountRoot({ orientation: 'vertical' });
    const nav = document.querySelector('nav') as HTMLElement;
    expect(nav.getAttribute('data-orientation')).toBe('vertical');
  });
});
