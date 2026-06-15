/**
 * Whether a node is (inside) an atom's interactive control — a form field or a
 * `contenteditable="false"` island. Events from these must NOT be treated as
 * writekit input: e.g. typing in an image's caption `<input>` bubbles up to the
 * single contenteditable, and without this guard the writekit would re-sync a text
 * block and yank the caret to the start of the document.
 */
export function isInteractiveTarget(node: EventTarget | null): boolean {
  return node instanceof Element
    && node.closest('input, textarea, select, button, [contenteditable="false"]') !== null;
}
