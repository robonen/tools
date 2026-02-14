import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useSyncRefs } from '.';

describe('useSyncRefs', () => {
  it('sync the value of a source ref with multiple target refs', () => {
    const source = ref(0);
    const target1 = ref(0);
    const target2 = ref(0);
    useSyncRefs(source, [target1, target2]);

    source.value = 10;

    expect(target1.value).toBe(10);
    expect(target2.value).toBe(10);
  });

  it('sync the value of a source ref with a single target ref', () => {
    const source = ref(0);
    const target = ref(0);
    useSyncRefs(source, target);

    source.value = 20;

    expect(target.value).toBe(20);
  });

  it('stop watching when the stop handle is called', () => {
    const source = ref(0);
    const target = ref(0);
    const stop = useSyncRefs(source, target);

    source.value = 30;
    stop();
    source.value = 40;

    expect(target.value).toBe(30);
  });
});