import { ref, nextTick } from 'vue';
import { describe, it, expect } from 'vitest';
import { useLastChanged } from '.';
import { timestamp } from '@robonen/stdlib';

describe('useLastChanged', () => {
  it('initialize with null if no initialValue is provided', () => {
    const source = ref(0);
    const lastChanged = useLastChanged(source);

    expect(lastChanged.value).toBeNull();
  });

  it('initialize with the provided initialValue', () => {
    const source = ref(0);
    const initialValue = 123456789;
    const lastChanged = useLastChanged(source, { initialValue });

    expect(lastChanged.value).toBe(initialValue);
  });

  it('update the timestamp when the source changes', async () => {
    const source = ref(0);
    const lastChanged = useLastChanged(source);

    const initialTimestamp = lastChanged.value;
    source.value = 1;
    await nextTick();

    expect(lastChanged.value).not.toBe(initialTimestamp);
    expect(lastChanged.value).toBeLessThanOrEqual(timestamp());
  });

  it('update the timestamp immediately if immediate option is true', async () => {
    const source = ref(0);
    const lastChanged = useLastChanged(source, { immediate: true });

    expect(lastChanged.value).toBeLessThanOrEqual(timestamp());
  });

  it('not update the timestamp if the source does not change', async () => {
    const source = ref(0);
    const lastChanged = useLastChanged(source);

    const initialTimestamp = lastChanged.value;
    await nextTick();

    expect(lastChanged.value).toBe(initialTimestamp);
  });
});