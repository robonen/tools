/** Filter out touch pointer events — they're handled by long-press behavior elsewhere. */
export function excludeTouch<T extends (event: PointerEvent) => void>(handler: T) {
  return (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    handler(event);
  };
}

/** Walk a subtree and collect elements that can receive focus via Tab. */
export function getTabbableNodes(container: HTMLElement): HTMLElement[] {
  const nodes: HTMLElement[] = [];
  const walker = container.ownerDocument.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => {
      const el = node as HTMLElement;
      return el.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });
  while (walker.nextNode()) nodes.push(walker.currentNode as HTMLElement);
  return nodes;
}
