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

/** The nearest contenteditable block host containing `node`, or `null`. */
export function closestBlockHost(node: Node | null): HTMLElement | null {
  if (!node)
    return null;

  const el = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
  return el?.closest<HTMLElement>('[data-block-content]') ?? null;
}
