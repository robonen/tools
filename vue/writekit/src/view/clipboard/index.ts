import type { Slice } from '../../model';
import { isEmptySlice } from '../../model';
import type { Registry } from '../../registry';
import { isStructureless, parseHtmlSlice } from './parse-html';
import { parseTextSlice } from './parse-text';
import { WRITEKIT_MIME, parseJsonSlice, serializeSlice } from './serialize';

export { compiledRules, matchBlock, matchMarks } from './rules';
export type { CompiledRules } from './rules';
export { isStructureless, parseDOMSlice, parseHtmlSlice } from './parse-html';
export { parseTextSlice } from './parse-text';
export { WRITEKIT_MIME, parseJsonSlice, renderSpec, serializeSlice } from './serialize';
export type { SerializedSlice } from './serialize';

export interface ReadSliceOptions {
  /** Ignore markup and writekit's own format: paste what the text says (Mod-Shift-V). */
  readonly plain?: boolean;
}

/**
 * The fragment a clipboard (or drop) payload holds, by fidelity: writekit's own
 * JSON, then HTML, then text. HTML that adds no structure of its own — a code
 * editor's coloured spans, a terminal — defers to the text beside it, which
 * also gets the markdown-style line rules. `null` when there is nothing to
 * paste as content (an image file, say).
 */
export function readSlice(data: DataTransfer, registry: Registry, options: ReadSliceOptions = {}): Slice | null {
  const text = data.getData('text/plain');

  if (!options.plain) {
    const own = data.getData(WRITEKIT_MIME);
    if (own) {
      const slice = parseJsonSlice(own, registry);
      if (slice && !isEmptySlice(slice))
        return slice;
    }

    const html = data.getData('text/html');
    if (html) {
      const slice = parseHtmlSlice(html, registry);
      if (!isEmptySlice(slice) && (!text || !isStructureless(slice, registry)))
        return slice;
    }
  }

  if (text) {
    const slice = parseTextSlice(text, registry);
    return isEmptySlice(slice) ? null : slice;
  }

  return null;
}

/** Put a fragment on the clipboard in every format writekit can produce. */
export function writeSlice(data: DataTransfer, slice: Slice, registry: Registry): void {
  const { html, text, json } = serializeSlice(slice, registry);
  data.setData('text/html', html);
  data.setData('text/plain', text);
  data.setData(WRITEKIT_MIME, json);
}
