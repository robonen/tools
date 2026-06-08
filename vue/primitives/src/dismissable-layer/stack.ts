export interface DismissableLayerElement {
  el: HTMLElement;
  disableOutsidePointerEvents: boolean;
}

const layers: DismissableLayerElement[] = [];

/**
 * Module-level stack of active DismissableLayers. The most recently-pushed
 * non-disabled layer is considered the topmost and is the only one that
 * should dispatch dismiss-style events (escape, pointer-outside, focus-outside).
 */
export const dismissableLayerStack = {
  push(layer: DismissableLayerElement) {
    layers.push(layer);
  },

  remove(layer: DismissableLayerElement) {
    const i = layers.indexOf(layer);
    if (i !== -1) layers.splice(i, 1);
  },

  isTopmost(layer: DismissableLayerElement): boolean {
    return layers.at(-1) === layer;
  },

  hasDisablingLayerAbove(layer: DismissableLayerElement): boolean {
    const i = layers.indexOf(layer);
    if (i === -1) return false;
    return layers.slice(i + 1).some(l => l.disableOutsidePointerEvents);
  },

  any(): boolean {
    return layers.length > 0;
  },

  anyDisabling(): boolean {
    return layers.some(l => l.disableOutsidePointerEvents);
  },
};
