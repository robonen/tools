import type { Ref, WatchSource } from 'vue';
import { onScopeDispose, shallowRef, watch } from 'vue';
import type { Viewport } from './types';

/**
 * True while the viewport is actively panning/zooming, flipped back to `false`
 * `idleDelay` ms after the last change. Driven purely by viewport mutations, so
 * it covers every path — wheel, pinch, drag-pan, double-click, keyboard pan, and
 * the imperative `zoomIn`/`zoomTo`/`fit` API — without each call site having to
 * opt in.
 *
 * Used to gate `will-change: transform` on `ViewportContent`. Keeping that hint
 * on permanently pins the compositor's raster scale: the layer is rasterised
 * once and the `scale(zoom)` is applied by GPU-upscaling that cached texture, so
 * at high zoom the content stays blurry even after the gesture ends. Toggling
 * the hint on only while interacting lets the browser re-rasterise the layer
 * crisply once motion settles.
 *
 * @param source A watch source yielding the master viewport.
 * @param idleDelay Milliseconds of stillness before settling. @default 200
 * @returns A read-only ref that is `true` while interacting.
 */
export function useInteractionState(
  source: WatchSource<Viewport>,
  idleDelay = 200,
): Readonly<Ref<boolean>> {
  const interacting = shallowRef(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  watch(source, () => {
    interacting.value = true;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      interacting.value = false;
      timer = undefined;
    }, idleDelay);
  });

  onScopeDispose(() => {
    if (timer !== undefined) clearTimeout(timer);
  });

  return interacting;
}
