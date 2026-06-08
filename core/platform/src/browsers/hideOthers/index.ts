import { noop } from '@robonen/stdlib';
import type { VoidFunction } from '@robonen/stdlib';

type Undo = VoidFunction;

const CONTROL_ATTR = 'aria-hidden';
const DEFAULT_MARKER = 'data-aria-hidden';
/**
 * `aria-live` regions and scripts stay readable — see theKashey/aria-hidden#10.
 */
const PRESERVE_SELECTOR = '[aria-live], script';

/**
 * Ref-counted global state. Shapes are intentionally monomorphic and only
 * mutated via `.set/.get/.delete` so V8 keeps fast-property access on the
 * backing `WeakMap`s.
 */
let counterMap = new WeakMap<Element, number>();
let uncontrolledNodes = new WeakMap<Element, boolean>();
let markerRegistry = new Map<string, WeakMap<Element, number>>();
let lockCount = 0;

function unwrapHost(node: Node | null): Element | null {
  let cursor: Node | null = node;
  while (cursor) {
    const host = (cursor as unknown as { host?: Element }).host;
    if (host) return host;
    cursor = cursor.parentNode;
  }
  return null;
}

/**
 * Projects each target into `parent`: if a target sits outside (e.g. inside a
 * shadow root), substitute its nearest ShadowDOM host.
 */
function normalizeTargets(parent: Element, targets: readonly Element[]): Element[] {
  const out: Element[] = [];
  for (let i = 0, len = targets.length; i < len; i++) {
    const target = targets[i]!;
    if (parent.contains(target)) {
      out.push(target);
      continue;
    }
    const host = unwrapHost(target);
    if (host && parent.contains(host)) out.push(host);
  }
  return out;
}

function markAncestors(targets: readonly Element[], keep: Set<Node>): void {
  for (let i = 0, len = targets.length; i < len; i++) {
    let cursor: Node | null = targets[i]!;
    while (cursor && !keep.has(cursor)) {
      keep.add(cursor);
      cursor = cursor.parentNode;
    }
  }
}

function getOrCreateMarker(name: string): WeakMap<Element, number> {
  let marker = markerRegistry.get(name);
  if (!marker) {
    marker = new WeakMap<Element, number>();
    markerRegistry.set(name, marker);
  }
  return marker;
}

function hideNode(node: Element, marker: WeakMap<Element, number>, markerName: string): void {
  try {
    const attr = node.getAttribute(CONTROL_ATTR);
    const alreadyHidden = attr !== null && attr !== 'false';
    const counterValue = (counterMap.get(node) || 0) + 1;
    const markerValue = (marker.get(node) || 0) + 1;

    counterMap.set(node, counterValue);
    marker.set(node, markerValue);

    if (counterValue === 1 && alreadyHidden) uncontrolledNodes.set(node, true);
    if (markerValue === 1) node.setAttribute(markerName, 'true');
    if (!alreadyHidden) node.setAttribute(CONTROL_ATTR, 'true');
  }
  catch (error) {
    console.error('hideOthers: cannot operate on', node, error);
  }
}

function restoreNode(node: Element, marker: WeakMap<Element, number>, markerName: string): void {
  const counterValue = (counterMap.get(node) || 0) - 1;
  const markerValue = (marker.get(node) || 0) - 1;

  counterMap.set(node, counterValue);
  marker.set(node, markerValue);

  if (counterValue === 0) {
    if (!uncontrolledNodes.has(node)) node.removeAttribute(CONTROL_ATTR);
    uncontrolledNodes.delete(node);
  }
  if (markerValue === 0) node.removeAttribute(markerName);
}

function applyAttributeToOthers(originalTargets: Element[], parentNode: Element, markerName: string): Undo {
  const targets = normalizeTargets(parentNode, originalTargets);
  const marker = getOrCreateMarker(markerName);

  // PACKED_ELEMENTS from cradle to grave: only `Element` is ever pushed.
  const hiddenNodes: Element[] = [];
  const toKeep = new Set<Node>();
  const toStop = new Set<Element>();
  for (let i = 0, len = targets.length; i < len; i++) toStop.add(targets[i]!);

  markAncestors(targets, toKeep);

  // Iterative DFS over live `HTMLCollection`s — no closure per descent, no
  // `Array.from` clone.
  const stack: Element[] = [parentNode];
  while (stack.length > 0) {
    const parent = stack.pop()!;
    if (toStop.has(parent)) continue;

    const children = parent.children;
    for (let i = 0, len = children.length; i < len; i++) {
      const node = children[i]!;
      if (toKeep.has(node)) {
        stack.push(node);
      }
      else {
        hideNode(node, marker, markerName);
        hiddenNodes.push(node);
      }
    }
  }
  lockCount++;

  return () => {
    for (let i = 0, len = hiddenNodes.length; i < len; i++) {
      restoreNode(hiddenNodes[i]!, marker, markerName);
    }
    lockCount--;
    if (lockCount === 0) {
      counterMap = new WeakMap();
      uncontrolledNodes = new WeakMap();
      markerRegistry = new Map();
    }
  };
}

/**
 * @name hideOthers
 * @category Browsers
 * @description Marks every sibling of `target` (within `parentNode`, defaulting
 * to `document.body`) as `aria-hidden="true"` so assistive technologies skip
 * them. `aria-live` regions and `<script>` elements are preserved. Returns an
 * undo function that restores the previous state; calls stack (ref-counted)
 * across multiple layers.
 *
 * Port of the `aria-hidden` npm package, kept dependency-free.
 *
 * @param {Element | Element[]} target - Element(s) to keep visible to AT
 * @param {Element} [parentNode] - Root to scan; defaults to `document.body`
 * @param {string} [markerName] - Data attribute used to ref-count our mutations
 * @returns {Undo} Function that reverts the aria-hidden mutations
 *
 * @since 0.0.5
 */
export function hideOthers(target: Element | Element[], parentNode?: Element, markerName = DEFAULT_MARKER): Undo {
  // `typeof` avoids a ReferenceError in SSR environments where `document` is
  // not defined as a global.
  if (typeof document === 'undefined') return noop;

  // Copy the input into our own packed `Element[]` so user mutations don't
  // affect us and we never call into the iterator protocol later.
  const targets: Element[] = [];
  if (Array.isArray(target)) {
    for (let i = 0, len = target.length; i < len; i++)
      targets.push(target[i]!);
  }
  else {
    targets.push(target);
  }

  const activeParent = parentNode ?? targets[0]?.ownerDocument.body;
  if (!activeParent) return noop;

  const preserved = activeParent.querySelectorAll(PRESERVE_SELECTOR);
  for (let i = 0, len = preserved.length; i < len; i++) targets.push(preserved[i]!);

  return applyAttributeToOthers(targets, activeParent, markerName);
}
