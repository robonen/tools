import type { Selection } from '../../model';
import { textSelection } from '../../model';
import { FILLER_ATTR } from '../inline-content';
import type { BlockElementRegistry } from './block-host';
import { closestBlockHost } from './block-host';

/** Maps the native `Selection`/`Range` (over the single editable root) to model coordinates and back. */
export interface SelectionBridge {
  /** Read the native selection as a model selection (null if outside editor). */
  read: () => Selection | null;
  /** Apply a model selection to the native selection (focusing the root). */
  write: (selection: Selection) => void;
  /** Snapshot the current model selection. */
  save: () => Selection | null;
  /** Restore a previously saved selection. */
  restore: (selection: Selection | null) => void;
  domPointToOffset: (host: HTMLElement, node: Node, offset: number) => number;
  offsetToDomPoint: (host: HTMLElement, offset: number) => { node: Node; offset: number };
}

function isFillerBr(node: Node): boolean {
  return node.nodeType === Node.ELEMENT_NODE
    && (node as HTMLElement).tagName === 'BR'
    && (node as HTMLElement).hasAttribute(FILLER_ATTR);
}

/** Count model characters in a DOM subtree: text length + 1 per hard-break. */
function measureLength(node: Node): number {
  let length = 0;

  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      length += (child.nodeValue ?? '').length;
    }
    else if (child.nodeType === Node.ELEMENT_NODE) {
      if ((child as HTMLElement).tagName === 'BR')
        length += isFillerBr(child) ? 0 : 1;
      else
        length += measureLength(child);
    }
  }

  return length;
}

function indexInParent(el: Node): number {
  return el.parentNode ? Array.from(el.parentNode.childNodes).indexOf(el as ChildNode) : 0;
}

function getWindow(): Window | null {
  return globalThis.window === undefined ? null : globalThis.window;
}

export function createSelectionBridge(
  getRoot: () => HTMLElement | null,
  blockElements: BlockElementRegistry,
): SelectionBridge {
  /** DOM point → model character offset within one block-content element. */
  function domPointToOffset(host: HTMLElement, node: Node, offset: number): number {
    const range = host.ownerDocument.createRange();
    range.selectNodeContents(host);

    try {
      range.setEnd(node, offset);
    }
    catch {
      return measureLength(host);
    }

    return measureLength(range.cloneContents());
  }

  /** Model character offset → DOM point within one block-content element. */
  function offsetToDomPoint(host: HTMLElement, offset: number): { node: Node; offset: number } {
    let remaining = offset;

    function search(node: Node): { node: Node; offset: number } | null {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          const length = (child.nodeValue ?? '').length;
          if (remaining <= length)
            return { node: child, offset: remaining };
          remaining -= length;
        }
        else if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;

          if (el.tagName === 'BR') {
            if (isFillerBr(el))
              continue;
            if (remaining === 0)
              return { node: el.parentNode!, offset: indexInParent(el) };
            remaining -= 1;
            if (remaining === 0)
              return { node: el.parentNode!, offset: indexInParent(el) + 1 };
          }
          else {
            const found = search(el);
            if (found)
              return found;
          }
        }
      }

      return null;
    }

    return search(host) ?? { node: host, offset: 0 };
  }

  function hostFor(blockId: string): HTMLElement | null {
    return blockElements.get(blockId) ?? null;
  }

  function read(): Selection | null {
    const root = getRoot();
    const domSel = getWindow()?.getSelection();

    if (!root || !domSel || domSel.rangeCount === 0 || !domSel.anchorNode)
      return null;

    // Both endpoints must live inside our single editable root.
    if (!root.contains(domSel.anchorNode))
      return null;

    const anchorHost = closestBlockHost(domSel.anchorNode);
    const focusHost = closestBlockHost(domSel.focusNode) ?? anchorHost;

    if (!anchorHost || !focusHost)
      return null;

    const anchorId = anchorHost.dataset['blockId'];
    const focusId = focusHost.dataset['blockId'];

    if (!anchorId || !focusId)
      return null;

    const anchorOffset = domPointToOffset(anchorHost, domSel.anchorNode, domSel.anchorOffset);
    const focusOffset = domSel.focusNode
      ? domPointToOffset(focusHost, domSel.focusNode, domSel.focusOffset)
      : anchorOffset;

    return textSelection({ blockId: anchorId, offset: anchorOffset }, { blockId: focusId, offset: focusOffset });
  }

  function write(selection: Selection): void {
    const root = getRoot();
    const domSel = getWindow()?.getSelection();

    if (!root || !domSel)
      return;

    if (selection.kind === 'node') {
      // Block-level selection has no native text range; the visual highlight
      // comes from [data-selected] on the block wrapper. Keep the editable root
      // focused so keyboard commands (Backspace/Delete on the node) still reach it.
      domSel.removeAllRanges();
      if (root.isContentEditable && root.ownerDocument.activeElement !== root)
        root.focus({ preventScroll: true });
      return;
    }

    const anchorHost = hostFor(selection.anchor.blockId);
    const focusHost = hostFor(selection.focus.blockId);

    if (!anchorHost || !focusHost)
      return;

    // Focus the ONE editable root (not the block) so the caret renders.
    if (root.isContentEditable && root.ownerDocument.activeElement !== root)
      root.focus({ preventScroll: true });

    const anchorPoint = offsetToDomPoint(anchorHost, selection.anchor.offset);
    const focusPoint = offsetToDomPoint(focusHost, selection.focus.offset);

    try {
      domSel.setBaseAndExtent(anchorPoint.node, anchorPoint.offset, focusPoint.node, focusPoint.offset);
    }
    catch {
      // Invalid DOM points (e.g. mid-reconcile) — ignore; the next reconcile fixes it.
    }
  }

  return {
    read,
    write,
    save: read,
    restore: (selection) => {
      if (selection)
        write(selection);
    },
    domPointToOffset,
    offsetToDomPoint,
  };
}
