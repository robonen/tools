import { describe, expect, it } from 'vitest';
import { isInteractiveTarget } from '../view/interactive';

describe('isInteractiveTarget', () => {
  it('matches atom controls and contenteditable=false islands, not editor text', () => {
    const root = document.createElement('div');
    root.setAttribute('contenteditable', 'true');
    root.innerHTML = '<p class="text">hi</p><figure contenteditable="false"><input class="cap"></figure>';
    document.body.append(root);

    expect(isInteractiveTarget(root.querySelector('input.cap'))).toBe(true);
    expect(isInteractiveTarget(root.querySelector('figure'))).toBe(true);
    expect(isInteractiveTarget(root.querySelector('p.text'))).toBe(false);
    expect(isInteractiveTarget(root)).toBe(false);
    expect(isInteractiveTarget(null)).toBe(false);

    root.remove();
  });
});
