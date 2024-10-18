import { describe, it, vi, expect } from 'vitest';
import { ref, reactive } from 'vue';
import { useAppSharedState } from '.';

describe('useAppSharedState', () => {
  it('initialize state only once', () => {
    const stateFactory = (initValue?: number) => {
      const count = ref(initValue ?? 0);
      return { count };
    };

    const useSharedState = useAppSharedState(stateFactory);

    const state1 = useSharedState(1);
    const state2 = useSharedState(2);

    expect(state1.count.value).toBe(1);
    expect(state2.count.value).toBe(1);
    expect(state1).toBe(state2);
  });

  it('return the same state object across different calls', () => {
    const stateFactory = () => {
      const state = reactive({ count: 0 });
      const increment = () => state.count++;
      return { state, increment };
    };

    const useSharedState = useAppSharedState(stateFactory);

    const sharedState1 = useSharedState();
    const sharedState2 = useSharedState();

    expect(sharedState1.state.count).toBe(0);
    sharedState1.increment();
    expect(sharedState1.state.count).toBe(1);
    expect(sharedState2.state.count).toBe(1);
    expect(sharedState1).toBe(sharedState2);
  });
});