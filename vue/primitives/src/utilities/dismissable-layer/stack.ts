import { shallowRef } from 'vue';

export interface DismissableLayerElement {
  el: HTMLElement;
  disableOutsidePointerEvents: boolean;
}

const layers: DismissableLayerElement[] = [];

// Subtrees that are physically rendered outside a layer's DOM node but belong to
// it semantically (e.g. a portaled trigger, an anchor, a toast viewport). Pointer
// and focus interactions originating inside a registered branch are treated as
// *inside* — they must never dismiss the layer.
const branches = new Set<HTMLElement>();

/**
 * Reactive revision counter. Bumped whenever the stack or branch set mutates so
 * that `computed`s reading derived stack state (e.g. per-layer pointer-events)
 * re-evaluate. The stack itself stays a plain array for cheap, allocation-free
 * topmost/index lookups on hot paths.
 */
export const dismissableLayerVersion = shallowRef(0);

function bump() {
  dismissableLayerVersion.value++;
}

/**
 * Module-level stack of active DismissableLayers. The most recently-pushed
 * non-disabled layer is considered the topmost and is the only one that
 * should dispatch dismiss-style events (escape, pointer-outside, focus-outside).
 */
export const dismissableLayerStack = {
  push(layer: DismissableLayerElement) {
    layers.push(layer);
    bump();
  },

  remove(layer: DismissableLayerElement) {
    const i = layers.indexOf(layer);
    if (i !== -1) {
      layers.splice(i, 1);
      bump();
    }
  },

  isTopmost(layer: DismissableLayerElement): boolean {
    return layers.at(-1) === layer;
  },

  indexOf(layer: DismissableLayerElement): number {
    return layers.indexOf(layer);
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

  /** Notify derived `computed`s that stack-affecting layer state changed in place. */
  touch() {
    bump();
  },

  /**
   * Resolves the `pointer-events` value a given layer should carry, mirroring the
   * nested-modal contract: while any layer disables outside pointer events the
   * document body is `pointer-events: none`. A layer at or above the highest
   * disabling layer stays interactive (`auto`); a layer below it is made
   * non-interactive (`none`). When nothing is blocking, no override is applied.
   */
  pointerEventsFor(layer: DismissableLayerElement): 'auto' | 'none' | undefined {
    let highestDisablingIndex = -1;
    for (let i = layers.length - 1; i >= 0; i--) {
      if (layers[i]!.disableOutsidePointerEvents) {
        highestDisablingIndex = i;
        break;
      }
    }

    if (highestDisablingIndex === -1) return undefined;

    const index = layers.indexOf(layer);
    return index >= highestDisablingIndex ? 'auto' : 'none';
  },

  // Branch registry -------------------------------------------------------

  addBranch(el: HTMLElement) {
    branches.add(el);
    bump();
  },

  removeBranch(el: HTMLElement) {
    branches.delete(el);
    bump();
  },

  /** Live snapshot of registered branch elements (for outside-detection ignore lists). */
  getBranches(): HTMLElement[] {
    return Array.from(branches);
  },

  /** Whether `target` lives inside any registered branch subtree. */
  isInBranch(target: Node | null): boolean {
    if (!target) return false;
    for (const branch of branches) {
      if (branch === target || branch.contains(target)) return true;
    }
    return false;
  },
};
