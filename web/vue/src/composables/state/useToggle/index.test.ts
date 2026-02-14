import { it, expect, describe } from 'vitest';
import { ref } from 'vue';
import { useToggle } from '.';

describe('useToggle', () => {
  it('initialize with false by default', () => {
    const { value } = useToggle();
    expect(value.value).toBe(false);
  });

  it('initialize with the provided initial value', () => {
    const { value } = useToggle(true);
    expect(value.value).toBe(true);
  });

  it('initialize with the provided initial value from a ref', () => {
    const { value } = useToggle(ref(true));
    expect(value.value).toBe(true);
  });

  it('toggle from false to true', () => {
    const { value, toggle } = useToggle(false);
    toggle();
    expect(value.value).toBe(true);
  });

  it('toggle from true to false', () => {
    const { value, toggle } = useToggle(true);
    toggle();
    expect(value.value).toBe(false);
  });

  it('toggle multiple times', () => {
    const { value, toggle } = useToggle(false);
    toggle();
    expect(value.value).toBe(true);
    toggle();
    expect(value.value).toBe(false);
    toggle();
    expect(value.value).toBe(true);
  });

  it('toggle returns the new value', () => {
    const { toggle } = useToggle(false);
    expect(toggle()).toBe(true);
    expect(toggle()).toBe(false);
  });

  it('set a specific value via toggle', () => {
    const { value, toggle } = useToggle(false);
    toggle(true);
    expect(value.value).toBe(true);
    toggle(true);
    expect(value.value).toBe(true);
  });

  it('use custom truthy and falsy values', () => {
    const { value, toggle } = useToggle('off', {
      truthyValue: 'on',
      falsyValue: 'off',
    });

    expect(value.value).toBe('off');
    toggle();
    expect(value.value).toBe('on');
    toggle();
    expect(value.value).toBe('off');
  });

  it('set a specific custom value via toggle', () => {
    const { value, toggle } = useToggle('off', {
      truthyValue: 'on',
      falsyValue: 'off',
    });

    toggle('on');
    expect(value.value).toBe('on');
    toggle('on');
    expect(value.value).toBe('on');
  });

  it('use ref-based truthy and falsy values', () => {
    const truthy = ref('yes');
    const falsy = ref('no');

    const { value, toggle } = useToggle('no', {
      truthyValue: truthy,
      falsyValue: falsy,
    });

    expect(value.value).toBe('no');
    toggle();
    expect(value.value).toBe('yes');
    toggle();
    expect(value.value).toBe('no');
  });

  it('use getter-based truthy and falsy values', () => {
    const { value, toggle } = useToggle(0, {
      truthyValue: () => 1,
      falsyValue: () => 0,
    });

    expect(value.value).toBe(0);
    toggle();
    expect(value.value).toBe(1);
    toggle();
    expect(value.value).toBe(0);
  });
});
