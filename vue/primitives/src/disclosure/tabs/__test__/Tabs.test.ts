import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '../index';
import { provideConfig } from '../../../utilities/config-provider';
import { defineComponent, h, nextTick, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

// Minimal declarative config wrapper (the package ships no ConfigProvider
// component; config is provided via `provideConfig` inside a setup).
const ConfigProvider = defineComponent({
  props: { dir: { type: String, default: undefined } },
  setup(props, { slots }) {
    provideConfig({ dir: () => props.dir as 'ltr' | 'rtl' | undefined });
    return () => slots.default?.();
  },
});

function createTabs(props: Record<string, unknown> = {}) {
  return mount(
    defineComponent({
      setup() {
        return () => h(TabsRoot, { ...props }, {
          default: () => [
            h(TabsList, null, {
              default: () => [
                h(TabsTrigger, { value: 'a' }, { default: () => 'Tab A' }),
                h(TabsTrigger, { value: 'b' }, { default: () => 'Tab B' }),
                h(TabsTrigger, { value: 'c', disabled: true }, { default: () => 'Tab C' }),
              ],
            }),
            h(TabsContent, { value: 'a' }, { default: () => 'Panel A' }),
            h(TabsContent, { value: 'b' }, { default: () => 'Panel B' }),
            h(TabsContent, { value: 'c' }, { default: () => 'Panel C' }),
          ],
        });
      },
    }),
    { attachTo: document.body },
  );
}

function press(el: Element, key: string, opts: Record<string, unknown> = {}) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts }));
}

describe('Tabs', () => {
  it('renders tablist with correct roles', () => {
    const w = createTabs({ defaultValue: 'a' });
    expect(w.find('[role="tablist"]').exists()).toBe(true);
    expect(w.findAll('[role="tab"]')).toHaveLength(3);
    expect(w.find('[role="tabpanel"]').exists()).toBe(true);
    w.unmount();
  });

  it('shows correct panel based on defaultValue', () => {
    const w = createTabs({ defaultValue: 'b' });
    const panels = w.findAll('[role="tabpanel"]');
    expect(panels).toHaveLength(1);
    expect(panels[0]!.text()).toBe('Panel B');
    w.unmount();
  });

  it('selects tab on click', async () => {
    const w = createTabs({ defaultValue: 'a' });
    const tabs = w.findAll('[role="tab"]');
    await tabs[1]!.trigger('click');
    await nextTick();
    expect(w.find('[role="tabpanel"]').text()).toBe('Panel B');
    const tabB = tabs[1]!.element;
    expect(tabB.getAttribute('aria-selected')).toBe('true');
    expect(tabB.getAttribute('data-state')).toBe('active');
    w.unmount();
  });

  it('supports v-model', async () => {
    const value = ref('a');
    const w = mount(
      defineComponent({
        setup() {
          return () => h(TabsRoot, {
            modelValue: value.value,
            'onUpdate:modelValue': (v: string | undefined) => { value.value = v!; },
          }, {
            default: () => [
              h(TabsList, null, {
                default: () => [
                  h(TabsTrigger, { value: 'a' }, { default: () => 'A' }),
                  h(TabsTrigger, { value: 'b' }, { default: () => 'B' }),
                ],
              }),
              h(TabsContent, { value: 'a' }, { default: () => 'PA' }),
              h(TabsContent, { value: 'b' }, { default: () => 'PB' }),
            ],
          });
        },
      }),
      { attachTo: document.body },
    );

    expect(w.find('[role="tabpanel"]').text()).toBe('PA');
    const tabs = w.findAll('[role="tab"]');
    await tabs[1]!.trigger('click');
    await nextTick();
    expect(value.value).toBe('b');
    w.unmount();
  });

  it('navigates with arrow keys (horizontal)', async () => {
    const w = createTabs({ defaultValue: 'a' });
    await nextTick();
    const tabs = w.findAll('[role="tab"]');
    const tabA = tabs[0]!.element as HTMLElement;
    tabA.focus();

    press(tabA, 'ArrowRight');
    await nextTick();
    expect(document.activeElement).toBe(tabs[1]!.element);
    // automatic mode → panel also switches
    expect(w.find('[role="tabpanel"]').text()).toBe('Panel B');

    // ArrowRight from B should skip disabled C and loop to A
    press(tabs[1]!.element, 'ArrowRight');
    await nextTick();
    expect(document.activeElement).toBe(tabs[0]!.element);

    w.unmount();
  });

  it('navigates with arrow keys (vertical)', async () => {
    const w = createTabs({ defaultValue: 'a', orientation: 'vertical' });
    await nextTick();
    const tabs = w.findAll('[role="tab"]');
    const tabA = tabs[0]!.element as HTMLElement;
    tabA.focus();

    press(tabA, 'ArrowDown');
    await nextTick();
    expect(document.activeElement).toBe(tabs[1]!.element);
    w.unmount();
  });

  it('Home/End keys', async () => {
    const w = createTabs({ defaultValue: 'a' });
    await nextTick();
    const tabs = w.findAll('[role="tab"]');
    const tabB = tabs[1]!.element as HTMLElement;
    tabB.focus();

    press(tabB, 'Home');
    await nextTick();
    expect(document.activeElement).toBe(tabs[0]!.element);

    press(tabs[0]!.element, 'End');
    await nextTick();
    // End goes to last enabled — B (C is disabled)
    expect(document.activeElement).toBe(tabs[1]!.element);
    w.unmount();
  });

  it('does not select disabled tabs', async () => {
    const w = createTabs({ defaultValue: 'a' });
    const tabs = w.findAll('[role="tab"]');
    await tabs[2]!.trigger('click');
    await nextTick();
    // Should remain on panel A
    expect(w.find('[role="tabpanel"]').text()).toBe('Panel A');
    w.unmount();
  });

  it('disabled root blocks all interaction', async () => {
    const w = createTabs({ defaultValue: 'a', disabled: true });
    const tabs = w.findAll('[role="tab"]');
    await tabs[1]!.trigger('click');
    await nextTick();
    expect(w.find('[role="tabpanel"]').text()).toBe('Panel A');
    w.unmount();
  });

  it('manual activation mode: arrow keys move focus but do not select', async () => {
    const w = createTabs({ defaultValue: 'a', activationMode: 'manual' });
    await nextTick();
    const tabs = w.findAll('[role="tab"]');
    const tabA = tabs[0]!.element as HTMLElement;
    tabA.focus();

    press(tabA, 'ArrowRight');
    await nextTick();
    expect(document.activeElement).toBe(tabs[1]!.element);
    // panel stays on A until explicit Enter/Space
    expect(w.find('[role="tabpanel"]').text()).toBe('Panel A');
    w.unmount();
  });

  it('sets correct tabindex: selected=0, others=-1', () => {
    const w = createTabs({ defaultValue: 'b' });
    const tabs = w.findAll('[role="tab"]');
    expect(tabs[0]!.attributes('tabindex')).toBe('-1');
    expect(tabs[1]!.attributes('tabindex')).toBe('0');
    expect(tabs[2]!.attributes('tabindex')).toBe('-1');
    w.unmount();
  });

  it('forceMount keeps panels in DOM', () => {
    const w = mount(
      defineComponent({
        setup() {
          return () => h(TabsRoot, { defaultValue: 'a' }, {
            default: () => [
              h(TabsList, null, {
                default: () => [
                  h(TabsTrigger, { value: 'a' }, { default: () => 'A' }),
                  h(TabsTrigger, { value: 'b' }, { default: () => 'B' }),
                ],
              }),
              h(TabsContent, { value: 'a', forceMount: true }, { default: () => 'PA' }),
              h(TabsContent, { value: 'b', forceMount: true }, { default: () => 'PB' }),
            ],
          });
        },
      }),
      { attachTo: document.body },
    );

    const panels = w.findAll('[role="tabpanel"]');
    expect(panels).toHaveLength(2);
    // inactive panel has hidden attribute
    expect(panels[1]!.attributes('hidden')).toBeDefined();
    w.unmount();
  });

  it('orientation reflects in data-orientation and aria-orientation', () => {
    const w = createTabs({ defaultValue: 'a', orientation: 'vertical' });
    expect(w.find('[role="tablist"]').attributes('aria-orientation')).toBe('vertical');
    expect(w.find('[role="tablist"]').attributes('data-orientation')).toBe('vertical');
    w.unmount();
  });

  it('wires ARIA relationship: trigger id + aria-controls, panel id + aria-labelledby', async () => {
    const w = createTabs({ defaultValue: 'a' });
    await nextTick();
    const triggerA = w.findAll('[role="tab"]')[0]!;
    const panelA = w.find('[role="tabpanel"]');

    const triggerId = triggerA.attributes('id');
    const contentId = panelA.attributes('id');
    expect(triggerId).toBeTruthy();
    expect(contentId).toBeTruthy();
    // Trigger points at its panel; panel points back at its trigger.
    expect(triggerA.attributes('aria-controls')).toBe(contentId);
    expect(panelA.attributes('aria-labelledby')).toBe(triggerId);
    w.unmount();
  });

  it('omits aria-controls on a trigger that has no matching content', async () => {
    const w = mount(
      defineComponent({
        setup() {
          return () => h(TabsRoot, { defaultValue: 'a' }, {
            default: () => [
              h(TabsList, null, {
                default: () => [
                  h(TabsTrigger, { value: 'a' }, { default: () => 'A' }),
                  h(TabsTrigger, { value: 'b' }, { default: () => 'B' }),
                ],
              }),
              // only a panel for `a`
              h(TabsContent, { value: 'a' }, { default: () => 'PA' }),
            ],
          });
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    const tabs = w.findAll('[role="tab"]');
    expect(tabs[0]!.attributes('aria-controls')).toBeTruthy();
    expect(tabs[1]!.attributes('aria-controls')).toBeUndefined();
    w.unmount();
  });

  it('Enter activates the focused tab in manual mode', async () => {
    const w = createTabs({ defaultValue: 'a', activationMode: 'manual' });
    await nextTick();
    const tabs = w.findAll('[role="tab"]');
    const tabA = tabs[0]!.element as HTMLElement;
    tabA.focus();

    press(tabA, 'ArrowRight');
    await nextTick();
    expect(document.activeElement).toBe(tabs[1]!.element);
    // still on A until explicit activation
    expect(w.find('[role="tabpanel"]').text()).toBe('Panel A');

    press(tabs[1]!.element, 'Enter');
    await nextTick();
    expect(w.find('[role="tabpanel"]').text()).toBe('Panel B');
    w.unmount();
  });

  it('Space activates the focused tab in manual mode', async () => {
    const w = createTabs({ defaultValue: 'a', activationMode: 'manual' });
    await nextTick();
    const tabs = w.findAll('[role="tab"]');
    tabs[0]!.element.focus();
    press(tabs[0]!.element, 'ArrowRight');
    await nextTick();
    press(tabs[1]!.element, ' ');
    await nextTick();
    expect(w.find('[role="tabpanel"]').text()).toBe('Panel B');
    w.unmount();
  });

  it('Enter/Space do not activate a disabled trigger', async () => {
    const w = createTabs({ defaultValue: 'a' });
    await nextTick();
    const tabs = w.findAll('[role="tab"]');
    const disabledTab = tabs[2]!.element as HTMLElement; // c is disabled
    disabledTab.focus();
    press(disabledTab, 'Enter');
    await nextTick();
    expect(w.find('[role="tabpanel"]').text()).toBe('Panel A');
    w.unmount();
  });

  it('PageUp jumps to first, PageDown jumps to last enabled tab', async () => {
    const w = createTabs({ defaultValue: 'a' });
    await nextTick();
    const tabs = w.findAll('[role="tab"]');
    const tabA = tabs[0]!.element as HTMLElement;
    tabA.focus();

    press(tabA, 'PageDown');
    await nextTick();
    // last ENABLED tab is B (C is disabled)
    expect(document.activeElement).toBe(tabs[1]!.element);

    press(tabs[1]!.element, 'PageUp');
    await nextTick();
    expect(document.activeElement).toBe(tabs[0]!.element);
    w.unmount();
  });

  it('disabled root does not roam focus with arrow keys', async () => {
    const w = createTabs({ defaultValue: 'a', disabled: true });
    await nextTick();
    const tabs = w.findAll('[role="tab"]');
    const tabA = tabs[0]!.element as HTMLElement;
    tabA.focus();
    press(tabA, 'ArrowRight');
    await nextTick();
    // a fully disabled root does not navigate focus to a sibling trigger
    expect(document.activeElement).not.toBe(tabs[1]!.element);
    w.unmount();
  });

  it('supports numeric tab values', async () => {
    const w = mount(
      defineComponent({
        setup() {
          return () => h(TabsRoot, { defaultValue: 0 }, {
            default: () => [
              h(TabsList, null, {
                default: () => [
                  h(TabsTrigger, { value: 0 }, { default: () => 'Zero' }),
                  h(TabsTrigger, { value: 1 }, { default: () => 'One' }),
                ],
              }),
              h(TabsContent, { value: 0 }, { default: () => 'P0' }),
              h(TabsContent, { value: 1 }, { default: () => 'P1' }),
            ],
          });
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    expect(w.find('[role="tabpanel"]').text()).toBe('P0');
    const tabs = w.findAll('[role="tab"]');
    await tabs[1]!.trigger('click');
    await nextTick();
    expect(w.find('[role="tabpanel"]').text()).toBe('P1');
    // automatic keyboard nav recovers the numeric identity
    tabs[1]!.element.focus();
    press(tabs[1]!.element, 'ArrowLeft');
    await nextTick();
    expect(w.find('[role="tabpanel"]').text()).toBe('P0');
    w.unmount();
  });

  it('inherits dir from ConfigProvider (rtl flips arrow navigation)', async () => {
    const w = mount(
      defineComponent({
        setup() {
          return () => h(ConfigProvider, { dir: 'rtl' }, {
            default: () => h(TabsRoot, { defaultValue: 'a' }, {
              default: () => [
                h(TabsList, null, {
                  default: () => [
                    h(TabsTrigger, { value: 'a' }, { default: () => 'A' }),
                    h(TabsTrigger, { value: 'b' }, { default: () => 'B' }),
                  ],
                }),
                h(TabsContent, { value: 'a' }, { default: () => 'PA' }),
                h(TabsContent, { value: 'b' }, { default: () => 'PB' }),
              ],
            }),
          });
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    const tabs = w.findAll('[role="tab"]');
    tabs[0]!.element.focus();
    // in RTL, ArrowLeft moves to the NEXT item
    press(tabs[0]!.element, 'ArrowLeft');
    await nextTick();
    expect(document.activeElement).toBe(tabs[1]!.element);
    w.unmount();
  });

  it('unmountOnHide=false keeps inactive panel mounted but hidden', async () => {
    const w = mount(
      defineComponent({
        setup() {
          return () => h(TabsRoot, { defaultValue: 'a', unmountOnHide: false }, {
            default: () => [
              h(TabsList, null, {
                default: () => [
                  h(TabsTrigger, { value: 'a' }, { default: () => 'A' }),
                  h(TabsTrigger, { value: 'b' }, { default: () => 'B' }),
                ],
              }),
              h(TabsContent, { value: 'a' }, { default: () => 'PA' }),
              h(TabsContent, { value: 'b' }, { default: () => 'PB' }),
            ],
          });
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    const panels = w.findAll('[role="tabpanel"]');
    expect(panels).toHaveLength(2);
    const inactive = panels.find(p => p.attributes('data-state') === 'inactive')!;
    expect(inactive.attributes('hidden')).toBeDefined();
    w.unmount();
  });
});
