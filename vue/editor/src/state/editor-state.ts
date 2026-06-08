import type { EditorDocument, Marks, Selection } from '../model';
import { caret, createDoc, createNode, firstBlock, nodeSelection } from '../model';
import type { Registry } from '../registry';
import type { Schema } from '../schema';
import { normalizeDocument } from '../schema';

/** Immutable snapshot of everything the editor renders and commands read. */
export interface EditorState {
  readonly doc: EditorDocument;
  readonly selection: Selection;
  readonly schema: Schema;
  readonly registry: Registry;
  /** Marks to apply to the next typed character (toggle-before-type). */
  readonly storedMarks: Marks | null;
}

export interface CreateEditorStateOptions {
  readonly registry: Registry;
  readonly doc?: EditorDocument;
  readonly selection?: Selection;
}

function defaultBlockType(registry: Registry): string | undefined {
  if (registry.hasBlock('paragraph'))
    return 'paragraph';

  for (const def of registry.listBlocks()) {
    if (def.spec.content.kind === 'text')
      return def.type;
  }

  return registry.listBlocks()[0]?.type;
}

/**
 * Build the initial editor state: normalize the document against the schema and
 * ensure it has at least one editable block to place the caret in.
 */
export function createEditorState(options: CreateEditorStateOptions): EditorState {
  const { registry } = options;
  const schema = registry.schema;

  let doc = normalizeDocument(options.doc ?? createDoc(), schema);

  if (doc.content.length === 0) {
    const type = defaultBlockType(registry);
    if (type)
      doc = createDoc([createNode(type, { attrs: schema.defaultAttrs(type) })]);
  }

  const first = firstBlock(doc);
  const selection = options.selection ?? (first ? caret(first.id, 0) : nodeSelection([]));

  return { doc, selection, schema, registry, storedMarks: null };
}
