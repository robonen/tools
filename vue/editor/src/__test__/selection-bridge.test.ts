import { describe, expect, it } from 'vitest';
import { createBlockElementRegistry, createSelectionBridge } from '../view/selection';

/**
 * Builds the single-contenteditable DOM shape the view produces: one
 * `[data-editor-content]` root containing plain `[data-block-content]` block
 * elements. Runs in jsdom (logic project) to prove the cross-block selection
 * mapping without a real browser.
 */
function buildDoc() {
  const root = document.createElement('div');
  root.setAttribute('data-editor-content', '');

  const a = document.createElement('p');
  a.setAttribute('data-block-content', '');
  a.setAttribute('data-block-id', 'a');
  a.textContent = 'hello';

  const b = document.createElement('p');
  b.setAttribute('data-block-content', '');
  b.setAttribute('data-block-id', 'b');
  b.textContent = 'world';

  root.append(a, b);
  document.body.replaceChildren(root);

  const registry = createBlockElementRegistry();
  registry.set('a', a);
  registry.set('b', b);

  return { root, a, b, registry };
}

describe('selection bridge (jsdom)', () => {
  it('round-trips offset ↔ DOM point within a block', () => {
    const { root, a, registry } = buildDoc();
    const bridge = createSelectionBridge(() => root, registry);

    const point = bridge.offsetToDomPoint(a, 3);
    expect(bridge.domPointToOffset(a, point.node, point.offset)).toBe(3);
  });

  it('reads a cross-block native selection as a cross-block model range', () => {
    const { root, a, b, registry } = buildDoc();
    const bridge = createSelectionBridge(() => root, registry);

    const sel = globalThis.getSelection!()!;
    sel.removeAllRanges();
    const range = document.createRange();
    range.setStart(a.firstChild!, 1);
    range.setEnd(b.firstChild!, 3);
    sel.addRange(range);

    const model = bridge.read();
    expect(model?.kind).toBe('text');
    if (model?.kind === 'text') {
      expect(model.anchor).toEqual({ blockId: 'a', offset: 1 });
      expect(model.focus).toEqual({ blockId: 'b', offset: 3 });
    }
  });
});
