import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useToNumber } from '.';

describe(useToNumber, () => {
  it('parses a numeric string with parseFloat by default', () => {
    const str = ref('42.5');
    const num = useToNumber(str);
    expect(num.value).toBe(42.5);
  });

  it('reacts to source changes', () => {
    const str = ref('1');
    const num = useToNumber(str);
    expect(num.value).toBe(1);
    str.value = '2.5';
    expect(num.value).toBe(2.5);
  });

  it('passes through numbers unchanged', () => {
    expect(useToNumber(10).value).toBe(10);
  });

  it('does not truncate a number source when method is parseInt', () => {
    expect(useToNumber(3.9, { method: 'parseInt' }).value).toBe(3.9);
  });

  it('uses parseInt with radix', () => {
    expect(useToNumber('ff', { method: 'parseInt', radix: 16 }).value).toBe(255);
  });

  it('resolves NaN to 0 when nanToZero is set', () => {
    expect(useToNumber('abc', { nanToZero: true }).value).toBe(0);
    expect(useToNumber('abc').value).toBeNaN();
  });

  it('supports a custom converter function', () => {
    const num = useToNumber('10.4', { method: v => Math.round(+v) });
    expect(num.value).toBe(10);
  });

  it('applies the custom converter to number sources too', () => {
    const num = useToNumber(3.7, { method: v => Math.floor(+v) });
    expect(num.value).toBe(3);
  });

  it('reacts to source changes with a custom converter', () => {
    const src = ref<number | string>('5.6');
    const num = useToNumber(src, { method: v => Math.round(+v) });
    expect(num.value).toBe(6);
    src.value = 2.2;
    expect(num.value).toBe(2);
  });

  it('clamps to min', () => {
    expect(useToNumber('-5', { min: 0 }).value).toBe(0);
    expect(useToNumber('5', { min: 0 }).value).toBe(5);
  });

  it('clamps to max', () => {
    expect(useToNumber('150', { max: 100 }).value).toBe(100);
    expect(useToNumber('50', { max: 100 }).value).toBe(50);
  });

  it('clamps to both min and max', () => {
    expect(useToNumber('-10', { min: 0, max: 100 }).value).toBe(0);
    expect(useToNumber('200', { min: 0, max: 100 }).value).toBe(100);
    expect(useToNumber('42', { min: 0, max: 100 }).value).toBe(42);
  });

  it('reacts to clamped source changes', () => {
    const src = ref('5');
    const num = useToNumber(src, { min: 0, max: 10 });
    expect(num.value).toBe(5);
    src.value = '20';
    expect(num.value).toBe(10);
    src.value = '-3';
    expect(num.value).toBe(0);
  });

  it('applies nanToZero before clamping', () => {
    expect(useToNumber('abc', { nanToZero: true, min: 1 }).value).toBe(1);
  });

  it('supports getter sources', () => {
    const base = ref(2);
    const num = useToNumber(() => `${base.value}5`);
    expect(num.value).toBe(25);
    base.value = 9;
    expect(num.value).toBe(95);
  });
});
