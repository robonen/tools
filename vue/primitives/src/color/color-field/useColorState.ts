import type { Ref } from 'vue';
import { computed, inject, ref, watch } from 'vue';
import type { HSVA } from '../../internal/color';
import { clampChannel } from '../../internal/color';
import { colorFieldContextKey } from './context';

/**
 * Wraps the four canonical HSVA channel setters so they all share one
 * **preserve-hue** policy and never round-trip through RGB.
 *
 * When saturation or value collapses to `0` the hue becomes ambiguous (any hue
 * yields the same grey). Photoshop's HSB picker keeps the *last meaningful* hue
 * so dragging into and back out of a corner restores the colour the user
 * expects. We track that last non-zero hue and re-apply it whenever the live
 * hue would otherwise be lost.
 *
 * @param hsva The reactive canonical colour to mutate.
 */
export function useHsvaSetters(hsva: Ref<HSVA>): {
  setHue: (hue: number) => void;
  setSaturation: (saturation: number) => void;
  setValue: (value: number) => void;
  setAlpha: (alpha: number) => void;
  setSaturationValue: (saturation: number, value: number) => void;
} {
  // Seed the remembered hue from the initial colour.
  let lastHue = hsva.value.h;

  // Keep `lastHue` current whenever a real (non-grey) colour is present, so an
  // externally driven hue change is respected on the next preserve.
  // No `deep: true`: `hsva` is replaced wholesale on every change, so watching its
  // identity already fires per update — a deep traverse of {h,s,v,a} (once per
  // pointer-move during a colour drag) is pure overhead.
  watch(
    () => hsva.value,
    (c) => {
      if (c.s > 0 && c.v > 0) lastHue = c.h;
    },
  );

  function commit(next: HSVA): void {
    hsva.value = next;
  }

  function setHue(hue: number): void {
    // Clamp to the [0, 360] rail rather than wrapping: the picker treats hue as
    // a bounded slider, so `End` (360°) stays 360 instead of collapsing to 0.
    // Rendering still normalizes internally, so 360 reads as red like 0.
    const h = clampChannel(hue, 360);
    lastHue = h;
    commit({ ...hsva.value, h });
  }

  function setSaturation(saturation: number): void {
    const s = clampChannel(saturation, 1);
    const cur = hsva.value;
    // Preserve hue when the colour was/becomes grey.
    const h = s > 0 && cur.v > 0 ? cur.h : lastHue;
    commit({ ...cur, s, h });
  }

  function setValue(value: number): void {
    const v = clampChannel(value, 1);
    const cur = hsva.value;
    const h = cur.s > 0 && v > 0 ? cur.h : lastHue;
    commit({ ...cur, v, h });
  }

  function setAlpha(alpha: number): void {
    commit({ ...hsva.value, a: clampChannel(alpha, 1) });
  }

  function setSaturationValue(saturation: number, value: number): void {
    const s = clampChannel(saturation, 1);
    const v = clampChannel(value, 1);
    const cur = hsva.value;
    const h = s > 0 && v > 0 ? cur.h : lastHue;
    commit({ ...cur, s, v, h });
  }

  return { setHue, setSaturation, setValue, setAlpha, setSaturationValue };
}

/**
 * Resolve the colour state a picker sub-component should drive.
 *
 * - When a `ColorFieldRoot` is an ancestor, the sub-component reads and writes
 *   that shared context so the whole cluster stays in sync.
 * - Otherwise the sub-component is **standalone**: it owns the supplied
 *   `standalone` HSVA ref (typically backed by `defineModel`) and gets its own
 *   preserve-hue setters.
 *
 * Returns the resolved `hsva` ref plus the five channel setters, regardless of
 * which mode is active, so the caller never branches.
 *
 * @param standalone The component's own HSVA ref, used only when no field
 *   context is present.
 * @param disabledLocal The component's own `disabled` getter (standalone mode).
 */
export function useColorState(
  standalone: Ref<HSVA>,
  disabledLocal: () => boolean,
): {
  hsva: Ref<HSVA>;
  disabled: Ref<boolean>;
  labelId: Ref<string | undefined>;
  setHue: (hue: number) => void;
  setSaturation: (saturation: number) => void;
  setValue: (value: number) => void;
  setAlpha: (alpha: number) => void;
  setSaturationValue: (saturation: number, value: number) => void;
} {
  const field = inject(colorFieldContextKey, null);

  if (field) {
    return {
      hsva: field.hsva,
      disabled: computed(() => field.disabled.value || disabledLocal()),
      labelId: field.labelId,
      setHue: field.setHue,
      setSaturation: field.setSaturation,
      setValue: field.setValue,
      setAlpha: field.setAlpha,
      setSaturationValue: field.setSaturationValue,
    };
  }

  const setters = useHsvaSetters(standalone);
  return {
    hsva: standalone,
    disabled: computed(disabledLocal),
    labelId: ref<string | undefined>(undefined),
    ...setters,
  };
}
