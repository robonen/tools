import { AccordionContent, AccordionItem, AccordionRoot, AccordionTrigger } from '../index';
import { defineComponent, h, nextTick, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

function createAccordion(rootProps: Record<string, unknown> = {}, itemCount = 3) {
  return mount(
    defineComponent({
      setup() {
        return () => h(AccordionRoot, { ...rootProps }, {
          default: () => Array.from({ length: itemCount }, (_, i) => {
            const val = String.fromCodePoint(97 + i); // 'a', 'b', 'c'
            return h(AccordionItem, { value: val, key: val, disabled: i === 2 ? true : undefined }, {
              default: () => [
                h(AccordionTrigger, null, { default: () => `Trigger ${val.toUpperCase()}` }),
                h(AccordionContent, null, { default: () => `Content ${val.toUpperCase()}` }),
              ],
            });
          }),
        });
      },
    }),
    { attachTo: document.body },
  );
}

function press(el: Element, key: string) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('Accordion', () => {
  it('renders items with correct structure', () => {
    const w = createAccordion();
    const triggers = w.findAll('button');
    expect(triggers).toHaveLength(3);
    triggers.forEach((t) => {
      expect(t.attributes('aria-expanded')).toBeDefined();
      expect(t.attributes('aria-controls')).toBeDefined();
    });
    w.unmount();
  });

  it('all panels closed by default (single, non-collapsible)', () => {
    const w = createAccordion();
    const regions = w.findAll('[role="region"]');
    expect(regions).toHaveLength(0);
    w.unmount();
  });

  it('defaultValue opens a panel', () => {
    const w = createAccordion({ defaultValue: 'a' });
    const regions = w.findAll('[role="region"]');
    expect(regions).toHaveLength(1);
    expect(regions[0]!.text()).toBe('Content A');
    w.unmount();
  });

  it('click toggles panel open/closed (single, collapsible)', async () => {
    const w = createAccordion({ collapsible: true });
    const triggers = w.findAll('button');

    await triggers[0]!.trigger('click');
    await nextTick();
    expect(w.findAll('[role="region"]')).toHaveLength(1);
    expect(w.find('[role="region"]').text()).toBe('Content A');

    // clicking again closes it (collapsible)
    await triggers[0]!.trigger('click');
    await nextTick();
    expect(w.findAll('[role="region"]')).toHaveLength(0);
    w.unmount();
  });

  it('single mode: opening one closes previous', async () => {
    const w = createAccordion({ defaultValue: 'a' });
    const triggers = w.findAll('button');

    await triggers[1]!.trigger('click');
    await nextTick();
    const regions = w.findAll('[role="region"]');
    expect(regions).toHaveLength(1);
    expect(regions[0]!.text()).toBe('Content B');
    w.unmount();
  });

  it('single mode: cannot close when not collapsible', async () => {
    const w = createAccordion({ defaultValue: 'a', collapsible: false });
    const triggers = w.findAll('button');

    await triggers[0]!.trigger('click');
    await nextTick();
    // should stay open
    expect(w.findAll('[role="region"]')).toHaveLength(1);
    expect(w.find('[role="region"]').text()).toBe('Content A');
    w.unmount();
  });

  it('multiple mode: multiple panels open', async () => {
    const w = createAccordion({ type: 'multiple' });
    const triggers = w.findAll('button');

    await triggers[0]!.trigger('click');
    await nextTick();
    await triggers[1]!.trigger('click');
    await nextTick();

    const regions = w.findAll('[role="region"]');
    expect(regions).toHaveLength(2);
    w.unmount();
  });

  it('multiple mode: toggle individual items', async () => {
    const w = createAccordion({ type: 'multiple', defaultValue: ['a', 'b'] });

    expect(w.findAll('[role="region"]')).toHaveLength(2);

    const triggers = w.findAll('button');
    await triggers[0]!.trigger('click');
    await nextTick();
    // 'a' closed, 'b' still open
    const regions = w.findAll('[role="region"]');
    expect(regions).toHaveLength(1);
    expect(regions[0]!.text()).toBe('Content B');
    w.unmount();
  });

  it('v-model works (single)', async () => {
    const value = ref<string | undefined>('a');
    const w = mount(
      defineComponent({
        setup() {
          return () => h(AccordionRoot, {
            modelValue: value.value,
            'onUpdate:modelValue': (v: string | string[] | undefined) => { value.value = v as string | undefined; },
            collapsible: true,
          }, {
            default: () => [
              h(AccordionItem, { value: 'a' }, {
                default: () => [
                  h(AccordionTrigger, null, { default: () => 'A' }),
                  h(AccordionContent, null, { default: () => 'PA' }),
                ],
              }),
              h(AccordionItem, { value: 'b' }, {
                default: () => [
                  h(AccordionTrigger, null, { default: () => 'B' }),
                  h(AccordionContent, null, { default: () => 'PB' }),
                ],
              }),
            ],
          });
        },
      }),
      { attachTo: document.body },
    );

    expect(w.find('[role="region"]').text()).toBe('PA');
    const triggers = w.findAll('button');
    await triggers[1]!.trigger('click');
    await nextTick();
    expect(value.value).toBe('b');
    w.unmount();
  });

  it('keyboard navigation (vertical, ArrowDown/ArrowUp)', async () => {
    const w = createAccordion({ defaultValue: 'a' });
    await nextTick();
    const triggers = w.findAll('button');
    const trigA = triggers[0]!.element as HTMLElement;
    trigA.focus();

    press(trigA, 'ArrowDown');
    await nextTick();
    expect(document.activeElement).toBe(triggers[1]!.element);

    press(triggers[1]!.element, 'ArrowUp');
    await nextTick();
    expect(document.activeElement).toBe(triggers[0]!.element);
    w.unmount();
  });

  it('Home/End keys move focus', async () => {
    const w = createAccordion({ defaultValue: 'a' });
    await nextTick();
    const triggers = w.findAll('button');
    const trigA = triggers[0]!.element as HTMLElement;
    trigA.focus();

    press(trigA, 'End');
    await nextTick();
    // End goes to last enabled trigger (B, since C is disabled)
    expect(document.activeElement).toBe(triggers[1]!.element);

    press(triggers[1]!.element, 'Home');
    await nextTick();
    expect(document.activeElement).toBe(triggers[0]!.element);
    w.unmount();
  });

  it('disabled item cannot be toggled', async () => {
    const w = createAccordion({ type: 'multiple' });
    const triggers = w.findAll('button');
    await triggers[2]!.trigger('click');
    await nextTick();
    expect(w.findAll('[role="region"]')).toHaveLength(0);
    w.unmount();
  });

  it('disabled root blocks all interaction', async () => {
    const w = createAccordion({ disabled: true });
    const triggers = w.findAll('button');
    await triggers[0]!.trigger('click');
    await nextTick();
    expect(w.findAll('[role="region"]')).toHaveLength(0);
    w.unmount();
  });

  it('data-state and aria-expanded reflect open state', async () => {
    const w = createAccordion({ defaultValue: 'a' });
    const triggers = w.findAll('button');
    expect(triggers[0]!.attributes('aria-expanded')).toBe('true');
    expect(triggers[0]!.attributes('data-state')).toBe('open');
    expect(triggers[1]!.attributes('aria-expanded')).toBe('false');
    expect(triggers[1]!.attributes('data-state')).toBe('closed');
    w.unmount();
  });

  it('content has role=region with aria-labelledby', () => {
    const w = createAccordion({ defaultValue: 'a' });
    const region = w.find('[role="region"]');
    expect(region.attributes('aria-labelledby')).toBeDefined();
    const trigger = w.findAll('button')[0]!;
    expect(region.attributes('aria-labelledby')).toBe(trigger.attributes('id'));
    w.unmount();
  });

  it('orientation reflects in data-orientation', () => {
    const w = createAccordion({ orientation: 'horizontal' });
    expect(w.find('[data-orientation="horizontal"]').exists()).toBe(true);
    w.unmount();
  });
});
