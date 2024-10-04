import { it, expect, describe } from 'vitest';
import { ref } from 'vue';
import { useCounter } from '.';

describe('useCounter', () => {
  it('initialize count with the provided initial value', () => {
    const { count } = useCounter(5);
    expect(count.value).toBe(5);
  });

  it('initialize count with the provided initial value from a ref', () => {
    const { count } = useCounter(ref(5));
    expect(count.value).toBe(5);
  });

  it('initialize count with the provided initial value from a getter', () => {
    const { count } = useCounter(() => 5);
    expect(count.value).toBe(5);
  });

  it('increment count by 1 by default', () => {
    const { count, increment } = useCounter(0);
    increment();
    expect(count.value).toBe(1);
  });

  it('increment count by the specified delta', () => {
    const { count, increment } = useCounter(0);
    increment(5);
    expect(count.value).toBe(5);
  });

  it('decrement count by 1 by default', () => {
    const { count, decrement } = useCounter(5);
    decrement();
    expect(count.value).toBe(4);
  });

  it('decrement count by the specified delta', () => {
    const { count, decrement } = useCounter(10);
    decrement(5);
    expect(count.value).toBe(5);
  });

  it('set count to the specified value', () => {
    const { count, set } = useCounter(0);
    set(10);
    expect(count.value).toBe(10);
  });

  it('get the current count value', () => {
    const { get } = useCounter(5);
    expect(get()).toBe(5);
  });

  it('reset count to the initial value', () => {
    const { count, reset } = useCounter(10);
    count.value = 5;
    reset();
    expect(count.value).toBe(10);
  });

  it('reset count to the specified value', () => {
    const { count, reset } = useCounter(10);
    count.value = 5;
    reset(20);
    expect(count.value).toBe(20);
  });

  it('clamp count to the minimum value', () => {
      const { count, decrement } = useCounter(Number.MIN_SAFE_INTEGER);
      decrement();
      expect(count.value).toBe(Number.MIN_SAFE_INTEGER);
  });

  it('clamp count to the maximum value', () => {
      const { count, increment } = useCounter(Number.MAX_SAFE_INTEGER);
      increment();
      expect(count.value).toBe(Number.MAX_SAFE_INTEGER);
  });
});