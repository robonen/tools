import { defineMark } from '../registry';

/** `bold`/`bolder` or a numeric weight from 600 up. */
function isBoldWeight(weight: string): boolean {
  return weight === 'bold' || weight === 'bolder' || Number.parseInt(weight, 10) >= 600;
}

export const bold = defineMark({
  type: 'bold',
  spec: {
    inclusive: true,
    rank: 1,
    toDOM: () => ['strong', 0],
    parseDOM: [
      { tag: 'strong' },
      // Google Docs wraps a whole paste in `<b style="font-weight:normal">`.
      { tag: 'b', getAttrs: (el: HTMLElement) => (el.style.fontWeight === 'normal' ? false : {}) },
      { style: 'font-weight', getAttrs: (el: HTMLElement) => (isBoldWeight(el.style.fontWeight) ? {} : false) },
    ],
  },
  meta: { title: 'Bold', icon: 'bold', hotkey: 'Mod-b' },
});
