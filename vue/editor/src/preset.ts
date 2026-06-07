import { createRegistry } from './registry';
import {
  blockquote,
  bulletedList,
  callout,
  codeBlock,
  divider,
  heading,
  image,
  numberedList,
  paragraph,
  todoList,
} from './blocks';
import { bold, code, highlight, italic, link, strike, underline } from './marks';

/** The block definitions bundled in the default preset (registration order = menu order). */
export const defaultBlocks = [
  paragraph,
  heading,
  blockquote,
  codeBlock,
  callout,
  bulletedList,
  numberedList,
  todoList,
  divider,
  image,
];

/** The mark definitions bundled in the default preset. */
export const defaultMarks = [bold, italic, underline, strike, highlight, code, link];

/** Batteries-included registry with the default blocks and marks. */
export function createDefaultRegistry() {
  return createRegistry({ blocks: defaultBlocks, marks: defaultMarks });
}

/** Lightweight registry — basic text blocks and the common marks only. */
export function createBasicRegistry() {
  return createRegistry({
    blocks: [paragraph, heading, blockquote, bulletedList, numberedList],
    marks: [bold, italic, link],
  });
}
