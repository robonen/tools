/** Maps block ids to their contenteditable host elements for selection/focus. */
export interface BlockElementRegistry {
  set: (blockId: string, el: HTMLElement) => void;
  delete: (blockId: string) => void;
  get: (blockId: string) => HTMLElement | undefined;
}

export function createBlockElementRegistry(): BlockElementRegistry {
  const map = new Map<string, HTMLElement>();

  return {
    set: (blockId, el) => void map.set(blockId, el),
    delete: blockId => void map.delete(blockId),
    get: blockId => map.get(blockId),
  };
}

/**
 * The model position under a viewport point, or `null` when the point is not
 * over text inside `root`. Chromium and WebKit still ship the old
 * `caretRangeFromPoint`; Firefox has only the standard one.
 */
export function positionFromPoint(
  x: number,
  y: number,
  root: HTMLElement,
  toOffset: (host: HTMLElement, node: Node, offset: number) => number,
): { blockId: string; offset: number } | null {
  const doc = root.ownerDocument as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null };
  let node: Node | null = null;
  let offset = 0;

  if (typeof doc.caretPositionFromPoint === 'function') {
    const point = doc.caretPositionFromPoint(x, y);
    if (point) {
      node = point.offsetNode;
      offset = point.offset;
    }
  }
  else if (typeof doc.caretRangeFromPoint === 'function') {
    const range = doc.caretRangeFromPoint(x, y);
    if (range) {
      node = range.startContainer;
      offset = range.startOffset;
    }
  }

  if (!node || !root.contains(node))
    return null;

  const host = closestBlockHost(node);
  const blockId = host?.dataset['blockId'];
  return host && blockId ? { blockId, offset: toOffset(host, node, offset) } : null;
}

/** The nearest contenteditable block host containing `node`, or `null`. */
export function closestBlockHost(node: Node | null): HTMLElement | null {
  if (!node)
    return null;

  const el = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
  return el?.closest<HTMLElement>('[data-block-content]') ?? null;
}
