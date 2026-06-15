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

  it('teleports content to the target on the client mount tick', async () => {
    // Once mounted, content must end up inside the target rather than in place,
    // proving the reactive mounted gating flips `effectiveDisabled` to false.
    const w = mount(Teleport, {
      props: { to: '#teleport-target' },
      slots: { default: () => h('span', { 'data-testid': 'mounted-child' }, 'm') },
      attachTo: document.body,
    });

    await nextTick();
    expect(host.querySelector('[data-testid=mounted-child]')).toBeTruthy();
    w.unmount();
  });

  it('reacts to a changing `to` target', async () => {
    const second = document.createElement('div');
    second.id = 'teleport-target-2';
    document.body.appendChild(second);

    const w = mount(Teleport, {
      props: { to: '#teleport-target' },
      slots: { default: () => h('span', { 'data-testid': 'movable' }, 'mv') },
      attachTo: document.body,
    });

    await nextTick();
    expect(host.querySelector('[data-testid=movable]')).toBeTruthy();
    expect(second.querySelector('[data-testid=movable]')).toBeFalsy();

    await w.setProps({ to: '#teleport-target-2' });
    await nextTick();

    expect(host.querySelector('[data-testid=movable]')).toBeFalsy();
    expect(second.querySelector('[data-testid=movable]')).toBeTruthy();

    w.unmount();
    second.remove();
  });

  it('renders the Teleport node when forceMount is true (default)', async () => {
    // With forceMount the node always renders; teleporting still occurs once
    // mounted because `disabled` alone gates inline-vs-teleported.
    const w = mount(Teleport, {
      props: { to: '#teleport-target', forceMount: true },
      slots: { default: () => h('span', { 'data-testid': 'forced' }, 'f') },
      attachTo: document.body,
    });

    await nextTick();
    expect(host.querySelector('[data-testid=forced]')).toBeTruthy();
    w.unmount();
  });

  it('teleports after mount even with forceMount disabled', async () => {
    // forceMount=false only changes pre-mount rendering; after the mount tick
    // content must still teleport to the target.
    const w = mount(Teleport, {
      props: { to: '#teleport-target', forceMount: false },
      slots: { default: () => h('span', { 'data-testid': 'gated' }, 'g') },
      attachTo: document.body,
    });

    await nextTick();
    expect(host.querySelector('[data-testid=gated]')).toBeTruthy();
    w.unmount();
  });

  it('keeps children inline when disabled regardless of mount state', async () => {
    const Parent = defineComponent({
      render() {
        return h('div', { id: 'parent-disabled' }, [
          h(Teleport, { to: '#teleport-target', disabled: true, forceMount: true }, {
            default: () => h('span', { 'data-testid': 'still-inline' }, 'i'),
          }),
        ]);
      },
    });

    const w = mount(Parent, { attachTo: document.body });
    await nextTick();

    expect(document.querySelector('#parent-disabled [data-testid=still-inline]')).toBeTruthy();
    expect(host.querySelector('[data-testid=still-inline]')).toBeFalsy();

    w.unmount();
  });
});
