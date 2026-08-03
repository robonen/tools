import { afterEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import axe from 'axe-core';
import { defineComponent, h, nextTick } from 'vue';
import {
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHandle,
  DrawerOverlay,
  DrawerPortal,
  DrawerRoot,
  DrawerTitle,
  DrawerTrigger,
} from '../index';

async function violations(element: Element) {
  const results = await axe.run(element);
  return results.violations;
}

async function flush() {
  await nextTick();
  await nextTick();
  await nextTick();
}

function drawerFixture(defaultOpen: boolean) {
  return defineComponent({
    setup() {
      return () => h(DrawerRoot, { defaultOpen }, {
        default: () => [
          h(DrawerTrigger, null, { default: () => 'Open drawer' }),
          h(DrawerPortal, null, {
            default: () => [
              h(DrawerOverlay),
              h(DrawerContent, null, {
                default: () => [
                  h(DrawerHandle),
                  h(DrawerTitle, null, { default: () => 'Drawer title' }),
                  h(DrawerDescription, null, { default: () => 'Drawer description' }),
                  h(DrawerClose, null, { default: () => 'Close' }),
                ],
              }),
            ],
          }),
        ],
      });
    },
  });
}

describe('Drawer a11y', () => {
  let wrapper: ReturnType<typeof mount> | undefined;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    document.body.innerHTML = '';
    document.body.removeAttribute('style');
  });

  it('has no axe violations when closed', async () => {
    wrapper = mount(drawerFixture(false), { attachTo: document.body });
    await flush();
    expect(await violations(document.body)).toHaveLength(0);
  });

  it('has no axe violations when open', async () => {
    wrapper = mount(drawerFixture(true), { attachTo: document.body });
    await flush();
    expect(await violations(document.body)).toHaveLength(0);
  });
});
