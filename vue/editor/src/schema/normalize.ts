import type { EditorDocument, Inline, Node } from '../model';
import { isInlineContent, normalizeInline, replaceBlocks } from '../model';
import type { NodeSpec } from './node-spec';
import type { Schema } from './schema';
import { marksAllowed } from './schema';

function filterRunMarks(inline: Inline, spec: NodeSpec, schema: Schema): Inline {
  return inline.map(run => ({
    text: run.text,
    marks: run.marks.filter(mark => schema.markSpec(mark.type) !== undefined && marksAllowed(spec, mark.type)),
  }));
}

/**
 * Bring a document to canonical form against a schema: coerce attrs, normalize
 * inline content, drop marks that are unknown or disallowed in their block, and
 * drop blocks of unknown type. This is the single funnel every document passes
 * through before it becomes editor state.
 */
export function normalizeDocument(doc: EditorDocument, schema: Schema): EditorDocument {
  const content: Node[] = [];

  for (const block of doc.content) {
    const spec = schema.nodeSpec(block.type);

    if (!spec)
      continue; // drop unknown block types

    const attrs = schema.coerceAttrs(block.type, block.attrs);

    if (spec.content.kind === 'text') {
      const inline = isInlineContent(block.content) ? block.content : [];
      content.push({ ...block, attrs, content: normalizeInline(filterRunMarks(inline, spec, schema)) });
    }
    else if (spec.content.kind === 'atom') {
      content.push({ ...block, attrs, content: block.content ?? null });
    }
    else {
      content.push({ ...block, attrs });
    }
  }

  return replaceBlocks(doc, content);
}
