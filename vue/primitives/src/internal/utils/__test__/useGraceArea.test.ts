import { describe, expect, it } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useGraceArea } from '../useGraceArea';

function box(left: number): HTMLElement {
  const element = document.createElement('div');

  Object.assign(element.style, { position: 'fixed', top: '100px', left: `${left}px`, width: '40px', height: '40px' });
  document.body.append(element);

  return element;
}

describe(useGraceArea, () => {
  it('writes the transit into the ref it is given, as the pointer leaves', () => {
    const trigger = ref<HTMLElement | undefined>(box(100));
    const container = ref<HTMLElement | undefined>(box(200));
    const transit = ref(false);
    const scope = effectScope();

    scope.run(() => useGraceArea(trigger, container, transit));
    trigger.value!.dispatchEvent(new PointerEvent('pointerleave', { clientX: 141, clientY: 120 }));

    // Synchronously — a reader deciding on the same tick sees it.
    expect(transit.value).toBe(true);

    scope.stop();
    trigger.value!.remove();
    container.value!.remove();
  });

  it('gives the ref back as false when its scope ends mid-transit', async () => {
    const trigger = ref<HTMLElement | undefined>(box(100));
    const container = ref<HTMLElement | undefined>(box(200));
    const transit = ref(false);
    const scope = effectScope();

    scope.run(() => useGraceArea(trigger, container, transit));
    trigger.value!.dispatchEvent(new PointerEvent('pointerleave', { clientX: 141, clientY: 120 }));
    expect(transit.value).toBe(true);

    // The content unmounts while the pointer is still on its way: whoever
    // shares the flag must not be left believing the pointer is in transit.
    scope.stop();
    await nextTick();
    expect(transit.value).toBe(false);

    trigger.value!.remove();
    container.value!.remove();
  });
});
