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

/**
 * Controls whose mousedown belongs to the control, not to the editor.
 *
 * Native elements are only half the story: a switch is usually a `<label>` over
 * a visually-hidden checkbox (the click lands on a `<span>`), and sliders,
 * comparison handles and menu items are plain elements carrying an ARIA role.
 * `[data-writekit-interactive]` is the escape hatch for anything else.
 */
const INTERACTIVE_CONTROL = [
  'input',
  'textarea',
  'select',
  'option',
  'button',
  'a[href]',
  'label',
  'summary',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="radio"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="combobox"]',
  '[role="option"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="tab"]',
  '[role="link"]',
  '[data-writekit-interactive]',
].join(', ');

/**
 * Whether a node is (inside) a control an atom block renders for its own use.
 *
 * Unlike {@link isInteractiveTarget} this deliberately ignores the
 * `contenteditable="false"` island itself — every atom block is one, so testing
 * for it would match every click inside an atom. Selecting the block on
 * mousedown has to `preventDefault()` to keep the browser from placing a caret,
 * and that same call is what stops a slider drag from ever starting or a
 * `<label>` from reaching its checkbox — so the editor stays out of the way
 * here and lets the control have the event.
 *
 * `boundary` is the atom's own element and is not optional in spirit: the
 * content root is itself a widget (`role="textbox"`), so an unbounded search
 * finds it from anywhere and would report every click as interactive, leaving
 * atoms permanently unselectable.
 */
export function isInteractiveControl(node: EventTarget | null, boundary?: Element | null): boolean {
  if (!(node instanceof Element))
    return false;

  const control = node.closest(INTERACTIVE_CONTROL);

  return control !== null && (!boundary || boundary.contains(control));
}
