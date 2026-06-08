import { computed, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { createGenericProjection, createProjection, useProjection } from '.';

describe(useProjection, () => {
  it('projects a static value linearly', () => {
    const projected = useProjection(50, [0, 100], [0, 1]);

    expect(projected.value).toBe(0.5);
  });

  it('reacts to input changes', () => {
    const input = ref(0);
    const projected = useProjection(input, [0, 100], [0, 1]);

    expect(projected.value).toBe(0);

    input.value = 100;
    expect(projected.value).toBe(1);

    input.value = 25;
    expect(projected.value).toBe(0.25);
  });

  it('reacts to domain changes (getters)', () => {
    const input = ref(5);
    const from = ref<[number, number]>([0, 10]);
    const to = ref<[number, number]>([0, 100]);
    const projected = useProjection(input, () => from.value, () => to.value);

    expect(projected.value).toBe(50);

    to.value = [0, 200];
    expect(projected.value).toBe(100);

    from.value = [0, 5];
    expect(projected.value).toBe(200);
  });

  it('extrapolates past the bounds by default', () => {
    const projected = useProjection(150, [0, 100], [0, 10]);

    expect(projected.value).toBe(15);
  });

  it('clamps to the from-domain when { clamp: true }', () => {
    const above = useProjection(150, [0, 100], [0, 10], { clamp: true });
    const below = useProjection(-50, [0, 100], [0, 10], { clamp: true });

    expect(above.value).toBe(10);
    expect(below.value).toBe(0);
  });

  it('handles a reversed output domain', () => {
    const projected = useProjection(0, [0, 100], [10, 0]);

    expect(projected.value).toBe(10);
  });

  it('maps a degenerate (zero-width) from-domain to the to-start instead of NaN', () => {
    const projected = useProjection(7, [5, 5], [0, 100]);

    expect(projected.value).toBe(0);
    expect(Number.isNaN(projected.value)).toBeFalsy();
  });

  it('accepts a custom projector function', () => {
    const projector = (input: number, from: readonly [number, number], to: readonly [number, number]): number =>
      Math.round((input - from[0]) / (from[1] - from[0]) * (to[1] - to[0]) + to[0]);
    const projected = useProjection(0.4, [0, 1], [0, 3], projector);

    expect(projected.value).toBe(1);
  });

  it('works with readonly/computed inputs (SSR-safe, pure)', () => {
    const source = computed(() => 25);
    const projected = useProjection(source, [0, 100], [0, 4]);

    expect(projected.value).toBe(1);
  });
});

describe(createProjection, () => {
  it('returns a reusable factory', () => {
    const project = createProjection([0, 10], [0, 100]);

    expect(project(0).value).toBe(0);
    expect(project(5).value).toBe(50);
    expect(project(10).value).toBe(100);
  });

  it('keeps each produced ref reactive to its own input', () => {
    const project = createProjection([0, 10], [0, 100]);
    const a = ref(1);
    const b = ref(2);
    const pa = project(a);
    const pb = project(b);

    a.value = 3;
    expect(pa.value).toBe(30);
    expect(pb.value).toBe(20);
  });

  it('supports the clamp option', () => {
    const project = createProjection([0, 10], [0, 100], { clamp: true });

    expect(project(20).value).toBe(100);
    expect(project(-5).value).toBe(0);
  });
});

describe(createGenericProjection, () => {
  it('projects across non-numeric domains via a custom projector', () => {
    const project = createGenericProjection<number, string>(
      [0, 25],
      ['a', 'z'],
      (n, from, to) => {
        const lo = to[0].charCodeAt(0);
        const hi = to[1].charCodeAt(0);
        const t = (n - from[0]) / (from[1] - from[0]);

        return String.fromCharCode(Math.round(lo + t * (hi - lo)));
      },
    );

    expect(project(0).value).toBe('a');
    expect(project(25).value).toBe('z');
  });

  it('reacts to a reactive input', () => {
    const input = ref(0);
    const project = createGenericProjection<number, number>(
      [0, 10],
      [0, 1],
      (n, from, to) => (n - from[0]) / (from[1] - from[0]) * (to[1] - to[0]) + to[0],
    );
    const projected = project(input);

    expect(projected.value).toBe(0);

    input.value = 10;
    expect(projected.value).toBe(1);
  });
});
