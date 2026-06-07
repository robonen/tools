import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import Teleport from '../Teleport.vue';

describe('Teleport primitive', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    host.id = 'teleport-target';
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  it('teleports default slot content to `to` target', async () => {
    const w = mount(Teleport, {
      props: { to: '#teleport-target' },
      slots: { default: () => h('span', { 'data-testid': 'child' }, 'hello') },
      attachTo: document.body,
    });

    await nextTick();
    expect(host.querySelector('[data-testid=child]')?.textContent).toBe('hello');
    w.unmount();
  });

  it('accepts an HTMLElement as `to`', async () => {
    const w = mount(Teleport, {
      props: { to: host },
      slots: { default: () => h('span', { 'data-testid': 'child' }, 'x') },
      attachTo: document.body,
    });

    await nextTick();
    expect(host.querySelector('[data-testid=child]')).toBeTruthy();
    w.unmount();
  });

  it('renders children in place when disabled', async () => {
    const Parent = defineComponent({
      render() {
        return h('div', { id: 'parent' }, [
          h(Teleport, { to: '#teleport-target', disabled: true }, {
            default: () => h('span', { 'data-testid': 'child' }, 'inline'),
          }),
        ]);
      },
    });

    const w = mount(Parent, { attachTo: document.body });
    await nextTick();

    expect(document.querySelector('#parent [data-testid=child]')).toBeTruthy();
    expect(host.querySelector('[data-testid=child]')).toBeFalsy();

    w.unmount();
  });

  it('defaults to body when `to` is omitted', async () => {
    const w = mount(Teleport, {
      slots: { default: () => h('span', { 'data-testid': 'body-child' }, 'hi') },
      attachTo: document.body,
    });

    await nextTick();
    expect(document.body.querySelector('[data-testid=body-child]')).toBeTruthy();
    w.unmount();
  });
});
