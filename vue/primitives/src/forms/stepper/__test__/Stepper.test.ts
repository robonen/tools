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

  it('renders a visually-hidden status live region announcing the active step', async () => {
    const w = createStepper({ defaultValue: 2 });
    await nextTick();
    const status = w.find('[role="status"]');
    expect(status.exists()).toBe(true);
    expect(status.attributes('aria-live')).toBe('polite');
    expect(status.attributes('aria-atomic')).toBe('true');
    expect(status.attributes('aria-hidden')).toBeUndefined();
    expect(status.text()).toBe('Step 2 of 3');
    w.unmount();
  });

  it('live region updates its message when the step changes', async () => {
    const value = ref(1);
    const w = mount(
      defineComponent({
        setup() {
          return () => h(
            StepperRoot,
            { modelValue: value.value, 'onUpdate:modelValue': (v: number) => (value.value = v), linear: false },
            { default: () => [1, 2, 3].map(step => h(StepperItem, { key: step, step }, { default: () => h(StepperTrigger, null, { default: () => `S${step}` }) })) },
          );
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    expect(w.find('[role="status"]').text()).toBe('Step 1 of 3');
    const triggers = w.findAll('button');
    await triggers[2]!.trigger('mousedown');
    await nextTick();
    expect(w.find('[role="status"]').text()).toBe('Step 3 of 3');
    w.unmount();
  });

  it('announceLabel customizes the live-region message', async () => {
    const w = createStepper({
      defaultValue: 2,
      announceLabel: ({ value, total }: { value: number; total: number }) => `${value}/${total} done`,
    });
    await nextTick();
    expect(w.find('[role="status"]').text()).toBe('2/3 done');
    w.unmount();
  });

  it('does not render the live region when as="template"', () => {
    const w = mount(
      defineComponent({
        setup() {
          return () => h(
            StepperRoot,
            { as: 'template' },
            { default: () => h('div', { class: 'root-shell' }, [1, 2].map(step => h(StepperItem, { key: step, step }, { default: () => h(StepperTrigger) }))) },
          );
        },
      }),
      { attachTo: document.body },
    );
    expect(w.find('[role="status"]').exists()).toBe(false);
    expect(w.find('.root-shell').exists()).toBe(true);
    w.unmount();
  });

  it('exposes imperative navigation API via template ref', async () => {
    const value = ref(1);
    const rootRef = ref<any>(null);
    const w = mount(
      defineComponent({
        setup() {
          return () => h(
            StepperRoot,
            { ref: rootRef, modelValue: value.value, 'onUpdate:modelValue': (v: number) => (value.value = v) },
            { default: () => [1, 2, 3].map(step => h(StepperItem, { key: step, step }, { default: () => h(StepperTrigger) })) },
          );
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    expect(rootRef.value.value).toBe(1);
    expect(rootRef.value.total).toBe(3);
    expect(rootRef.value.isFirstStep).toBe(true);
    expect(rootRef.value.isLastStep).toBe(false);
    expect(rootRef.value.hasNext()).toBe(true);
    expect(rootRef.value.hasPrev()).toBe(false);

    rootRef.value.goToNextStep();
    await nextTick();
    expect(value.value).toBe(2);
    expect(rootRef.value.isFirstStep).toBe(false);

    rootRef.value.goToPrevStep();
    await nextTick();
    expect(value.value).toBe(1);

    rootRef.value.goToStep(2);
    await nextTick();
    expect(value.value).toBe(2);
    w.unmount();
  });

  it('prevStep at first step and nextStep at last step are no-ops', async () => {
    const value = ref(1);
    const rootRef = ref<any>(null);
    const w = mount(
      defineComponent({
        setup() {
          return () => h(
            StepperRoot,
            { ref: rootRef, modelValue: value.value, 'onUpdate:modelValue': (v: number) => (value.value = v), linear: false },
            { default: () => [1, 2, 3].map(step => h(StepperItem, { key: step, step }, { default: () => h(StepperTrigger) })) },
          );
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    rootRef.value.goToPrevStep();
    await nextTick();
    expect(value.value).toBe(1); // clamped at first

    rootRef.value.goToStep(3);
    await nextTick();
    expect(value.value).toBe(3);
    rootRef.value.goToNextStep();
    await nextTick();
    expect(value.value).toBe(3); // clamped at last
    w.unmount();
  });

  it('disabled root blocks imperative navigation', async () => {
    const value = ref(1);
    const rootRef = ref<any>(null);
    const w = mount(
      defineComponent({
        setup() {
          return () => h(
            StepperRoot,
            { ref: rootRef, modelValue: value.value, 'onUpdate:modelValue': (v: number) => (value.value = v), disabled: true, linear: false },
            { default: () => [1, 2, 3].map(step => h(StepperItem, { key: step, step }, { default: () => h(StepperTrigger) })) },
          );
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    expect(rootRef.value.isNextDisabled).toBe(true);
    expect(rootRef.value.isPrevDisabled).toBe(true);
    rootRef.value.goToNextStep();
    await nextTick();
    expect(value.value).toBe(1); // unchanged
    w.unmount();
  });

  it('isNextDisabled reflects the next step being DOM-disabled', async () => {
    const rootRef = ref<any>(null);
    const w = mount(
      defineComponent({
        setup() {
          return () => h(
            StepperRoot,
            { ref: rootRef, defaultValue: 1, linear: false },
            { default: () => [1, 2, 3].map(step => h(StepperItem, { key: step, step, disabled: step === 2 }, { default: () => h(StepperTrigger) })) },
          );
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    expect(rootRef.value.isNextDisabled).toBe(true); // step 2 is disabled
    expect(rootRef.value.isPrevDisabled).toBe(true); // no prev at step 1
    w.unmount();
  });

  it('exposes expanded slot props on the root default slot', async () => {
    const captured: Record<string, unknown> = {};
    const w = mount(
      defineComponent({
        setup() {
          return () => h(
            StepperRoot,
            { defaultValue: 1 },
            {
              default: (slotProps: Record<string, unknown>) => {
                Object.assign(captured, slotProps);
                return [1, 2, 3].map(step => h(StepperItem, { key: step, step }, { default: () => h(StepperTrigger) }));
              },
            },
          );
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    expect(captured.value).toBe(1);
    expect(captured.total).toBe(3);
    expect(captured.isFirstStep).toBe(true);
    expect(captured.isLastStep).toBe(false);
    expect(typeof captured.goToStep).toBe('function');
    expect(typeof captured.goToNextStep).toBe('function');
    expect(typeof captured.goToPrevStep).toBe('function');
    expect(typeof captured.hasNext).toBe('function');
    expect(typeof captured.hasPrev).toBe('function');
    w.unmount();
  });

  it('StepperSeparator inherits orientation and can override it', () => {
    const w = createStepper({ orientation: 'vertical' });
    const sep = w.find('[role="separator"]');
    expect(sep.exists()).toBe(true);
    expect(sep.attributes('aria-hidden')).toBe('true');
    expect(sep.attributes('data-orientation')).toBe('vertical');
    w.unmount();
  });

  it('StepperSeparator orientation prop overrides the root orientation', () => {
    const w = mount(
      defineComponent({
        setup() {
          return () => h(
            StepperRoot,
            { orientation: 'horizontal' },
            { default: () => h(StepperItem, { step: 1 }, { default: () => [h(StepperTrigger), h(StepperSeparator, { orientation: 'vertical' })] }) },
          );
        },
      }),
      { attachTo: document.body },
    );
    const sep = w.find('[role="separator"]');
    expect(sep.attributes('data-orientation')).toBe('vertical');
    w.unmount();
  });
});
