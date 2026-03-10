import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import FocusScope from '../FocusScope.vue';
import { mount } from '@vue/test-utils';

function createFocusScope(props: Record<string, unknown> = {}, slots?: Record<string, () => any>) {
  return mount(
    defineComponent({
      setup() {
        return () =>
          h(
            FocusScope,
            props,
            slots ?? {
              default: () => [
                h('input', { type: 'text', 'data-testid': 'first' }),
                h('input', { type: 'text', 'data-testid': 'second' }),
                h('input', { type: 'text', 'data-testid': 'third' }),
              ],
            },
          );
      },
    }),
    { attachTo: document.body },
  );
}

describe('FocusScope', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.body.focus();
  });

  it('renders slot content inside a div with tabindex="-1"', () => {
    const wrapper = createFocusScope();

    expect(wrapper.find('[tabindex="-1"]').exists()).toBe(true);
    expect(wrapper.findAll('input').length).toBe(3);

    wrapper.unmount();
  });

  it('renders with custom element via as prop', () => {
    const wrapper = createFocusScope({ as: 'section' });

    expect(wrapper.find('section').exists()).toBe(true);
    expect(wrapper.find('section').attributes('tabindex')).toBe('-1');

    wrapper.unmount();
  });

  it('auto-focuses first tabbable element on mount', async () => {
    const wrapper = createFocusScope();
    await nextTick();
    await nextTick();

    const firstInput = wrapper.find('[data-testid="first"]').element as HTMLInputElement;
    expect(document.activeElement).toBe(firstInput);

    wrapper.unmount();
  });

  it('emits mountAutoFocus on mount', async () => {
    const onMountAutoFocus = vi.fn();
    const wrapper = createFocusScope({ onMountAutoFocus });

    await nextTick();
    await nextTick();

    expect(onMountAutoFocus).toHaveBeenCalled();

    wrapper.unmount();
  });

  it('emits unmountAutoFocus on unmount', async () => {
    const onUnmountAutoFocus = vi.fn();
    const wrapper = createFocusScope({ onUnmountAutoFocus });
    await nextTick();
    await nextTick();

    wrapper.unmount();

    expect(onUnmountAutoFocus).toHaveBeenCalled();
  });

  it('focuses container when no tabbable elements exist', async () => {
    const wrapper = createFocusScope({}, {
      default: () => h('span', 'no focusable elements'),
    });
    await nextTick();
    await nextTick();

    const container = wrapper.find('[tabindex="-1"]').element;
    expect(document.activeElement).toBe(container);

    wrapper.unmount();
  });
});

describe('FocusScope loop', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.body.focus();
  });

  it('wraps focus from last to first on Tab when loop=true', async () => {
    const wrapper = createFocusScope({ loop: true });
    await nextTick();
    await nextTick();

    const lastInput = wrapper.find('[data-testid="third"]').element as HTMLInputElement;
    lastInput.focus();
    await nextTick();

    const container = wrapper.find('[tabindex="-1"]');
    await container.trigger('keydown', { key: 'Tab' });

    const firstInput = wrapper.find('[data-testid="first"]').element as HTMLInputElement;
    expect(document.activeElement).toBe(firstInput);

    wrapper.unmount();
  });

  it('wraps focus from first to last on Shift+Tab when loop=true', async () => {
    const wrapper = createFocusScope({ loop: true });
    await nextTick();
    await nextTick();

    const firstInput = wrapper.find('[data-testid="first"]').element as HTMLInputElement;
    firstInput.focus();
    await nextTick();

    const container = wrapper.find('[tabindex="-1"]');
    await container.trigger('keydown', { key: 'Tab', shiftKey: true });

    const lastInput = wrapper.find('[data-testid="third"]').element as HTMLInputElement;
    expect(document.activeElement).toBe(lastInput);

    wrapper.unmount();
  });

  it('does not wrap focus when loop=false', async () => {
    const wrapper = createFocusScope({ loop: false });
    await nextTick();
    await nextTick();

    const lastInput = wrapper.find('[data-testid="third"]').element as HTMLInputElement;
    lastInput.focus();
    await nextTick();

    const container = wrapper.find('[tabindex="-1"]');
    await container.trigger('keydown', { key: 'Tab' });

    // Focus should remain on the last element (no wrapping)
    expect(document.activeElement).toBe(lastInput);

    wrapper.unmount();
  });

  it('ignores non-Tab keys', async () => {
    const wrapper = createFocusScope({ loop: true });
    await nextTick();
    await nextTick();

    const lastInput = wrapper.find('[data-testid="third"]').element as HTMLInputElement;
    lastInput.focus();
    await nextTick();

    const container = wrapper.find('[tabindex="-1"]');
    await container.trigger('keydown', { key: 'Enter' });

    expect(document.activeElement).toBe(lastInput);

    wrapper.unmount();
  });

  it('ignores Tab with modifier keys', async () => {
    const wrapper = createFocusScope({ loop: true });
    await nextTick();
    await nextTick();

    const lastInput = wrapper.find('[data-testid="third"]').element as HTMLInputElement;
    lastInput.focus();
    await nextTick();

    const container = wrapper.find('[tabindex="-1"]');
    await container.trigger('keydown', { key: 'Tab', ctrlKey: true });

    expect(document.activeElement).toBe(lastInput);

    wrapper.unmount();
  });
});

describe('FocusScope trapped', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.body.focus();
  });

  it('returns focus to last focused element when focus leaves', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => [
            h('button', { id: 'outside' }, 'outside'),
            h(FocusScope, { trapped: true }, {
              default: () => [
                h('input', { type: 'text', 'data-testid': 'inside' }),
              ],
            }),
          ];
        },
      }),
      { attachTo: document.body },
    );

    await nextTick();
    await nextTick();

    const insideInput = wrapper.find('[data-testid="inside"]').element as HTMLInputElement;
    expect(document.activeElement).toBe(insideInput);

    // Simulate focus moving outside
    const outsideButton = wrapper.find('#outside').element as HTMLButtonElement;
    outsideButton.focus();

    // The focusin event handler should bring focus back
    await nextTick();
    expect(document.activeElement).toBe(insideInput);

    wrapper.unmount();
  });

  it('activates trap when trapped changes from false to true', async () => {
    const trapped = ref(false);
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => [
            h('button', { id: 'outside' }, 'outside'),
            h(FocusScope, { trapped: trapped.value }, {
              default: () => [
                h('input', { type: 'text', 'data-testid': 'inside' }),
              ],
            }),
          ];
        },
      }),
      { attachTo: document.body },
    );

    await nextTick();
    await nextTick();

    // Not trapped yet — focus can leave
    const outsideButton = wrapper.find('#outside').element as HTMLButtonElement;
    outsideButton.focus();
    await nextTick();
    expect(document.activeElement).toBe(outsideButton);

    // Enable trap
    trapped.value = true;
    await nextTick();
    await nextTick();

    // Focus inside first
    const insideInput = wrapper.find('[data-testid="inside"]').element as HTMLInputElement;
    insideInput.focus();
    await nextTick();

    // Try to leave — should be pulled back
    outsideButton.focus();
    await nextTick();
    expect(document.activeElement).toBe(insideInput);

    wrapper.unmount();
  });

  it('deactivates trap when trapped changes from true to false', async () => {
    const trapped = ref(true);
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => [
            h('button', { id: 'outside' }, 'outside'),
            h(FocusScope, { trapped: trapped.value }, {
              default: () => [
                h('input', { type: 'text', 'data-testid': 'inside' }),
              ],
            }),
          ];
        },
      }),
      { attachTo: document.body },
    );

    await nextTick();
    await nextTick();

    const insideInput = wrapper.find('[data-testid="inside"]').element as HTMLInputElement;
    expect(document.activeElement).toBe(insideInput);

    // Disable trap
    trapped.value = false;
    await nextTick();
    await nextTick();

    // Focus can now leave
    const outsideButton = wrapper.find('#outside').element as HTMLButtonElement;
    outsideButton.focus();
    await nextTick();
    expect(document.activeElement).toBe(outsideButton);

    wrapper.unmount();
  });

  it('refocuses container when focused element is removed from DOM', async () => {
    const showChild = ref(true);
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(FocusScope, { trapped: true }, {
              default: () =>
                showChild.value
                  ? [h('input', { type: 'text', 'data-testid': 'removable' })]
                  : [h('span', 'empty')],
            });
        },
      }),
      { attachTo: document.body },
    );

    await nextTick();
    await nextTick();

    const input = wrapper.find('[data-testid="removable"]').element as HTMLInputElement;
    expect(document.activeElement).toBe(input);

    // Remove the focused element
    showChild.value = false;
    await nextTick();
    await nextTick();

    // MutationObserver should refocus the container
    const container = wrapper.find('[tabindex="-1"]').element;
    await vi.waitFor(() => {
      expect(document.activeElement).toBe(container);
    });

    wrapper.unmount();
  });
});

describe('FocusScope preventAutoFocus', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.body.focus();
  });

  it('prevents auto-focus on mount via event.preventDefault()', async () => {
    const wrapper = createFocusScope({
      onMountAutoFocus: (e: Event) => e.preventDefault(),
    });
    await nextTick();
    await nextTick();

    const firstInput = wrapper.find('[data-testid="first"]').element;
    // Focus should not have been moved to the first input
    expect(document.activeElement).not.toBe(firstInput);

    wrapper.unmount();
  });

  it('prevents focus restore on unmount via event.preventDefault()', async () => {
    const wrapper = createFocusScope({
      onUnmountAutoFocus: (e: Event) => e.preventDefault(),
    });
    await nextTick();
    await nextTick();

    const firstInput = wrapper.find('[data-testid="first"]').element as HTMLInputElement;
    expect(document.activeElement).toBe(firstInput);

    wrapper.unmount();

    // Focus should NOT have been restored to body
    expect(document.activeElement).not.toBe(firstInput);
  });
});

describe('FocusScope nested stacks', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.body.focus();
  });

  it('pauses outer scope when inner scope mounts, resumes on inner unmount', async () => {
    const showInner = ref(false);
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(FocusScope, { trapped: true }, {
              default: () => [
                h('input', { type: 'text', 'data-testid': 'outer-input' }),
                showInner.value
                  ? h(FocusScope, { trapped: true }, {
                      default: () => [
                        h('input', { type: 'text', 'data-testid': 'inner-input' }),
                      ],
                    })
                  : null,
              ],
            });
        },
      }),
      { attachTo: document.body },
    );

    await nextTick();
    await nextTick();

    // Outer scope auto-focused
    const outerInput = wrapper.find('[data-testid="outer-input"]').element as HTMLInputElement;
    expect(document.activeElement).toBe(outerInput);

    // Mount inner scope
    showInner.value = true;
    await nextTick();
    await nextTick();

    // Inner scope should auto-focus its content
    const innerInput = wrapper.find('[data-testid="inner-input"]').element as HTMLInputElement;
    expect(document.activeElement).toBe(innerInput);

    // Unmount inner scope
    showInner.value = false;
    await nextTick();
    await nextTick();

    // Focus should return to outer scope's previously focused element
    await vi.waitFor(() => {
      expect(document.activeElement).toBe(outerInput);
    });

    wrapper.unmount();
  });
});
