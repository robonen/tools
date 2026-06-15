import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import type { Component } from 'vue';
import { defineComponent, h, nextTick, ref } from 'vue';
import {
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
  NumberFieldRoot,
} from '../index';
import {
  createNumberFormat,
  handleDecimalOperation,
  roundToStepPrecision,
  snapValueToStep,
} from '../utils';

let active: { unmount: () => void } | undefined;

function mountField(props: Record<string, unknown> = {}, opts: { inForm?: boolean } = {}) {
  const model = ref<number | null | undefined>(undefined);
  const Harness = defineComponent({
    setup: () => () => {
      const field = h(NumberFieldRoot, {
        modelValue: model.value,
        'onUpdate:modelValue': (v: number | null) => { model.value = v; },
        ...props,
      }, {
        default: () => [
          h(NumberFieldInput as Component, { id: 'inp' }),
          h(NumberFieldIncrement, { id: 'inc' }, { default: () => '+' }),
          h(NumberFieldDecrement, { id: 'dec' }, { default: () => '−' }),
        ],
      });
      return opts.inForm ? h('form', { id: 'form' }, [field]) : field;
    },
  });
  const wrapper = mount(Harness, { attachTo: document.body });
  active = wrapper;
  return { wrapper, model };
}

function press(el: Element, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

function pointerDown(el: Element): void {
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }));
}
function pointerUp(): void {
  globalThis.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, button: 0 }));
}

afterEach(() => {
  active?.unmount();
  active = undefined;
});

describe('NumberField utils', () => {
  it('handleDecimalOperation avoids float drift', () => {
    expect(handleDecimalOperation('+', 0.1, 0.2)).toBe(0.3);
    expect(handleDecimalOperation('-', 0.3, 0.1)).toBe(0.2);
    expect(handleDecimalOperation('+', 1, 2)).toBe(3);
  });

  it('roundToStepPrecision rounds to step precision', () => {
    expect(roundToStepPrecision(0.30000000000000004, 0.1)).toBe(0.3);
    expect(roundToStepPrecision(5, 1)).toBe(5);
  });

  it('snapValueToStep snaps to grid within bounds', () => {
    expect(snapValueToStep(7, 0, 10, 5)).toBe(5);
    expect(snapValueToStep(8, 0, 10, 5)).toBe(10);
    expect(snapValueToStep(2.3, 0, 10, 0.5)).toBe(2.5);
    expect(snapValueToStep(-1, 0, 10, 1)).toBe(0);
  });

  it('createNumberFormat formats and parses with locale separators', () => {
    const fmt = createNumberFormat(() => 'en-US', () => ({ minimumFractionDigits: 2 }));
    expect(fmt.format(1234.5)).toBe('1,234.50');
    expect(fmt.parse('1,234.50')).toBe(1234.5);
    expect(fmt.parse('abc')).toBeNaN();
    expect(fmt.isValidPartial('1,2')).toBe(true);
    expect(fmt.isValidPartial('xyz')).toBe(false);
  });
});

describe('NumberField ARIA / structure', () => {
  it('root has role=group', () => {
    const { wrapper } = mountField({ defaultValue: 1 });
    expect(wrapper.find('[role="group"]').exists()).toBe(true);
  });

  it('input has a11y attributes', () => {
    mountField({ min: 0, max: 10, defaultValue: 5 });
    const input = document.querySelector<HTMLInputElement>('#inp')!;
    expect(input.getAttribute('role')).toBe('spinbutton');
    expect(input.getAttribute('tabindex')).toBe('0');
    expect(input.getAttribute('autocorrect')).toBe('off');
    expect(input.getAttribute('spellcheck')).toBe('false');
    expect(input.getAttribute('aria-roledescription')).toBe('Number field');
    expect(input.getAttribute('inputmode')).toBe('numeric');
  });

  it('inputmode becomes decimal with fractional step', () => {
    mountField({ step: 0.5, defaultValue: 1 });
    const input = document.querySelector<HTMLInputElement>('#inp')!;
    expect(input.getAttribute('inputmode')).toBe('decimal');
  });

  it('stepper buttons are exposed to AT with aria-label (not aria-hidden)', () => {
    mountField({ defaultValue: 1 });
    const inc = document.querySelector<HTMLButtonElement>('#inc')!;
    const dec = document.querySelector<HTMLButtonElement>('#dec')!;
    expect(inc.getAttribute('aria-hidden')).toBeNull();
    expect(inc.getAttribute('aria-label')).toBe('Increase');
    expect(dec.getAttribute('aria-label')).toBe('Decrease');
    expect(inc.getAttribute('tabindex')).toBe('-1');
  });

  it('custom aria-label on buttons is forwarded', () => {
    const model = ref<number | null>(1);
    const wrapper = mount(defineComponent({
      setup: () => () => h(NumberFieldRoot, { modelValue: model.value }, {
        default: () => [
          h(NumberFieldIncrement, { id: 'inc', 'aria-label': 'More' }),
          h(NumberFieldDecrement, { id: 'dec', 'aria-label': 'Less' }),
        ],
      }),
    }), { attachTo: document.body });
    active = wrapper;
    expect(document.querySelector('#inc')!.getAttribute('aria-label')).toBe('More');
    expect(document.querySelector('#dec')!.getAttribute('aria-label')).toBe('Less');
  });
});

describe('NumberField decimal-safe stepping & snapping', () => {
  it('steps fractional values without float drift', async () => {
    // `stepSnapping: false` isolates the decimal-safe arithmetic from grid snapping.
    const { model } = mountField({ defaultValue: 0.1, step: 0.2, stepSnapping: false });
    await nextTick();
    (document.querySelector<HTMLButtonElement>('#inc')!).click();
    await nextTick();
    expect(model.value).toBe(0.3);
  });

  it('snaps off-grid value to step grid on commit', async () => {
    const { model } = mountField({ min: 0, max: 10, step: 5, defaultValue: 0 });
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('#inp')!;
    input.value = '7';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    expect(model.value).toBe(5);
  });

  it('stepSnapping=false clamps without snapping', async () => {
    const { model } = mountField({ min: 0, max: 10, step: 5, stepSnapping: false, defaultValue: 0 });
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('#inp')!;
    input.value = '7';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    expect(model.value).toBe(7);
  });
});

describe('NumberField at-boundary disabled', () => {
  it('disables increment at max and decrement at min', async () => {
    const { model } = mountField({ min: 0, max: 5, step: 1, defaultValue: 5 });
    await nextTick();
    const inc = document.querySelector<HTMLButtonElement>('#inc')!;
    expect(inc.hasAttribute('data-disabled')).toBe(true);
    expect(inc.disabled).toBe(true);

    // Move to min
    const input = document.querySelector<HTMLInputElement>('#inp')!;
    press(input, 'Home');
    await nextTick();
    expect(model.value).toBe(0);
    const dec = document.querySelector<HTMLButtonElement>('#dec')!;
    expect(dec.hasAttribute('data-disabled')).toBe(true);
    expect(dec.disabled).toBe(true);
  });

  it('per-button disabled prop disables independently', async () => {
    const model = ref<number | null>(2);
    const wrapper = mount(defineComponent({
      setup: () => () => h(NumberFieldRoot, { modelValue: model.value }, {
        default: () => [
          h(NumberFieldIncrement, { id: 'inc', disabled: true }),
          h(NumberFieldDecrement, { id: 'dec' }),
        ],
      }),
    }), { attachTo: document.body });
    active = wrapper;
    await nextTick();
    const inc = document.querySelector<HTMLButtonElement>('#inc')!;
    expect(inc.disabled).toBe(true);
    inc.click();
    await nextTick();
    expect(model.value).toBe(2);
  });
});

describe('NumberField wheel', () => {
  it('increments on wheel up while focused, decrements on wheel down', async () => {
    const { model } = mountField({ defaultValue: 5, step: 1 });
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('#inp')!;
    input.focus();
    input.dispatchEvent(new WheelEvent('wheel', { deltaY: -10, deltaX: 0, bubbles: true, cancelable: true }));
    await nextTick();
    expect(model.value).toBe(6);
    input.dispatchEvent(new WheelEvent('wheel', { deltaY: 10, deltaX: 0, bubbles: true, cancelable: true }));
    await nextTick();
    expect(model.value).toBe(5);
  });

  it('disableWheelChange ignores wheel', async () => {
    const { model } = mountField({ defaultValue: 5, disableWheelChange: true });
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('#inp')!;
    input.focus();
    input.dispatchEvent(new WheelEvent('wheel', { deltaY: -10, deltaX: 0, bubbles: true, cancelable: true }));
    await nextTick();
    // No value write occurred, so the uncontrolled model ref stays untouched.
    expect(model.value).toBeUndefined();
    expect(input.value).toBe('5');
  });

  it('invertWheelChange reverses direction', async () => {
    const { model } = mountField({ defaultValue: 5, invertWheelChange: true });
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('#inp')!;
    input.focus();
    input.dispatchEvent(new WheelEvent('wheel', { deltaY: -10, deltaX: 0, bubbles: true, cancelable: true }));
    await nextTick();
    expect(model.value).toBe(4);
  });

  it('ignores mostly-horizontal wheel (trackpad heuristic)', async () => {
    const { model } = mountField({ defaultValue: 5 });
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('#inp')!;
    input.focus();
    input.dispatchEvent(new WheelEvent('wheel', { deltaY: 2, deltaX: 20, bubbles: true, cancelable: true }));
    await nextTick();
    // No value write occurred, so the uncontrolled model ref stays untouched.
    expect(model.value).toBeUndefined();
    expect(input.value).toBe('5');
  });
});

describe('NumberField press-and-hold', () => {
  it('pointerdown triggers a step and sets data-pressed', async () => {
    const { model } = mountField({ defaultValue: 0, step: 1 });
    await nextTick();
    const inc = document.querySelector<HTMLButtonElement>('#inc')!;
    pointerDown(inc);
    await nextTick();
    expect(model.value).toBe(1);
    expect(inc.getAttribute('data-pressed')).toBe('true');
    pointerUp();
    await nextTick();
    expect(inc.getAttribute('data-pressed')).toBeNull();
  });

  it('synthetic click after a pointer press does not double-step', async () => {
    const { model } = mountField({ defaultValue: 0, step: 1 });
    await nextTick();
    const inc = document.querySelector<HTMLButtonElement>('#inc')!;
    pointerDown(inc);
    pointerUp();
    inc.click();
    await nextTick();
    expect(model.value).toBe(1);
  });
});

describe('NumberField commit on blur / Enter', () => {
  it('reclamps and snaps on blur', async () => {
    const { model } = mountField({ min: 0, max: 10, step: 1, defaultValue: 5 });
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('#inp')!;
    input.value = '99';
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    await nextTick();
    expect(model.value).toBe(10);
  });

  it('Enter commits the value', async () => {
    const { model } = mountField({ min: 0, max: 10, step: 1, defaultValue: 5 });
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('#inp')!;
    input.value = '99';
    press(input, 'Enter');
    await nextTick();
    expect(model.value).toBe(10);
  });
});

describe('NumberField beforeinput validation (formatOptions)', () => {
  it('rejects invalid characters when formatOptions set', async () => {
    mountField({ formatOptions: { maximumFractionDigits: 2 }, defaultValue: 1 });
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('#inp')!;
    const evt = new InputEvent('beforeinput', { data: 'a', bubbles: true, cancelable: true });
    input.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(true);

    const ok = new InputEvent('beforeinput', { data: '5', bubbles: true, cancelable: true });
    input.dispatchEvent(ok);
    expect(ok.defaultPrevented).toBe(false);
  });
});

describe('NumberField formatting', () => {
  it('displays formatted text via textValue when formatOptions set', async () => {
    const { wrapper } = mountField({
      formatOptions: { style: 'currency', currency: 'USD' },
      defaultValue: 1234.5,
    });
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('#inp')!;
    expect(input.value).toContain('1,234');
    expect(input.value).toContain('$');
    wrapper.unmount();
    active = undefined;
  });

  it('plain number display without formatOptions', async () => {
    mountField({ defaultValue: 42 });
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('#inp')!;
    expect(input.value).toBe('42');
  });
});

describe('NumberField form integration', () => {
  it('renders a hidden input inside a form', async () => {
    mountField({ name: 'qty', defaultValue: 3 }, { inForm: true });
    await nextTick();
    const hidden = document.querySelector<HTMLInputElement>('form input[name="qty"]');
    expect(hidden).not.toBeNull();
    expect(hidden!.value).toBe('3');
  });

  it('does not render a hidden input outside a form', async () => {
    mountField({ name: 'qty', defaultValue: 3 });
    await nextTick();
    const hidden = document.querySelector<HTMLInputElement>('input[name="qty"]');
    expect(hidden).toBeNull();
  });
});

describe('NumberField polymorphism', () => {
  it('Input renders the provided as element', async () => {
    const model = ref<number | null>(1);
    const wrapper = mount(defineComponent({
      setup: () => () => h(NumberFieldRoot, { modelValue: model.value }, {
        default: () => [h(NumberFieldInput as Component, { id: 'inp', as: 'input' })],
      }),
    }), { attachTo: document.body });
    active = wrapper;
    await nextTick();
    expect(document.querySelector('#inp')!.tagName).toBe('INPUT');
  });
});

describe('NumberField readonly', () => {
  it('readonly blocks stepping but exposes value', async () => {
    const { model } = mountField({ readonly: true, defaultValue: 5 });
    await nextTick();
    (document.querySelector<HTMLButtonElement>('#inc')!).click();
    await nextTick();
    expect(model.value).toBeUndefined();
    const input = document.querySelector<HTMLInputElement>('#inp')!;
    expect(input.getAttribute('aria-readonly')).toBe('true');
  });
});
