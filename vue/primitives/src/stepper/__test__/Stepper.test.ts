import {
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperRoot,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '../index';
import { defineComponent, h, nextTick, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

function createStepper(rootProps: Record<string, unknown> = {}, stepCount = 3, itemProps: Record<number, Record<string, unknown>> = {}) {
  return mount(
    defineComponent({
      setup() {
        return () => h(
          StepperRoot,
          rootProps,
          {
            default: () => Array.from({ length: stepCount }, (_, i) => {
              const step = i + 1;
              return h(
                StepperItem,
                { key: step, step, ...itemProps[step] },
                {
                  default: () => [
                    h(StepperTrigger, null, { default: () => [
                      h(StepperIndicator),
                      h(StepperTitle, null, { default: () => `Step ${step}` }),
                      h(StepperDescription, null, { default: () => `Description ${step}` }),
                    ] }),
                    i < stepCount - 1 ? h(StepperSeparator) : null,
                  ],
                },
              );
            }),
          },
        );
      },
    }),
    { attachTo: document.body },
  );
}

function press(el: Element, key: string) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('Stepper', () => {
  it('renders with role=group', () => {
    const w = createStepper();
    const root = w.find('[role="group"]');
    expect(root.exists()).toBe(true);
    expect(root.attributes('aria-label')).toBe('progress');
    w.unmount();
  });

  it('first item is active by default (step=1)', () => {
    const w = createStepper();
    const items = w.findAllComponents(StepperItem);
    expect(items[0]!.attributes('data-state')).toBe('active');
    expect(items[0]!.attributes('aria-current')).toBe('step');
    expect(items[1]!.attributes('data-state')).toBe('inactive');
    w.unmount();
  });

  it('honors defaultValue', () => {
    const w = createStepper({ defaultValue: 2 });
    const items = w.findAllComponents(StepperItem);
    expect(items[0]!.attributes('data-state')).toBe('completed');
    expect(items[1]!.attributes('data-state')).toBe('active');
    expect(items[2]!.attributes('data-state')).toBe('inactive');
    w.unmount();
  });

  it('v-model moves the active step', async () => {
    const value = ref(1);
    const w = mount(
      defineComponent({
        setup() {
          return () => h(
            StepperRoot,
            { modelValue: value.value, 'onUpdate:modelValue': (v: number) => (value.value = v) },
            {
              default: () => [1, 2, 3].map(step =>
                h(StepperItem, { key: step, step }, { default: () => h(StepperTrigger, null, { default: () => `S${step}` }) }),
              ),
            },
          );
        },
      }),
      { attachTo: document.body },
    );
    const triggers = w.findAll('button');
    await triggers[1]!.trigger('mousedown');
    await nextTick();
    expect(value.value).toBe(2);
    w.unmount();
  });

  it('linear mode blocks skipping ahead', async () => {
    const w = createStepper();
    const triggers = w.findAll('button');
    await triggers[2]!.trigger('mousedown'); // try to skip to 3
    await nextTick();
    const items = w.findAllComponents(StepperItem);
    expect(items[0]!.attributes('data-state')).toBe('active'); // unchanged
    w.unmount();
  });

  it('non-linear mode allows arbitrary step', async () => {
    const w = createStepper({ linear: false });
    const triggers = w.findAll('button');
    await triggers[2]!.trigger('mousedown');
    await nextTick();
    const items = w.findAllComponents(StepperItem);
    expect(items[2]!.attributes('data-state')).toBe('active');
    w.unmount();
  });

  it('disabled item is not focusable and cannot be activated', async () => {
    const w = createStepper({ linear: false }, 3, { 2: { disabled: true } });
    const items = w.findAllComponents(StepperItem);
    expect(items[1]!.attributes('data-disabled')).toBe('');
    const triggers = w.findAll('button');
    expect(triggers[1]!.attributes('tabindex')).toBe('-1');
    await triggers[1]!.trigger('mousedown');
    await nextTick();
    expect(items[0]!.attributes('data-state')).toBe('active'); // unchanged
    w.unmount();
  });

  it('Enter/Space on trigger activates step', async () => {
    const w = createStepper({ linear: false });
    const triggers = w.findAll('button');
    (triggers[1]!.element as HTMLElement).focus();
    press(triggers[1]!.element, 'Enter');
    await nextTick();
    const items = w.findAllComponents(StepperItem);
    expect(items[1]!.attributes('data-state')).toBe('active');
    w.unmount();
  });

  it('ArrowRight / ArrowLeft move focus between triggers', () => {
    const w = createStepper({ linear: false });
    const triggers = w.findAll('button').map(t => t.element as HTMLElement);
    triggers[0]!.focus();
    press(triggers[0]!, 'ArrowRight');
    expect(document.activeElement).toBe(triggers[1]);
    press(triggers[1]!, 'ArrowRight');
    expect(document.activeElement).toBe(triggers[2]);
    press(triggers[2]!, 'ArrowLeft');
    expect(document.activeElement).toBe(triggers[1]);
    w.unmount();
  });

  it('Home / End jump to first / last trigger', () => {
    const w = createStepper({ linear: false });
    const triggers = w.findAll('button').map(t => t.element as HTMLElement);
    triggers[1]!.focus();
    press(triggers[1]!, 'End');
    expect(document.activeElement).toBe(triggers[2]);
    press(triggers[2]!, 'Home');
    expect(document.activeElement).toBe(triggers[0]);
    w.unmount();
  });

  it('completed prop forces completed state', () => {
    const w = createStepper({}, 3, { 1: { completed: true } });
    const items = w.findAllComponents(StepperItem);
    expect(items[0]!.attributes('data-state')).toBe('completed');
    w.unmount();
  });
});
