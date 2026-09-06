import type { Attrs, InlineNode, Marks, Node, Slice } from '../../model';
import { createDoc, createNode, createSlice, inlineLength, normalizeInline, normalizeMarks } from '../../model';
import type { Registry } from '../../registry';
import { normalizeDocument } from '../../schema';
import type { CompiledRules } from './rules';
import { compiledRules, matchBlock, matchMarks } from './rules';
import { normalizeText, trimInline } from './whitespace';

/** Elements that start a new line in HTML even when no rule claims them: their content flows on as blocks of the enclosing type. */
const BLOCK_LEVEL = new Set([
  'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'BODY', 'CENTER', 'DD', 'DETAILS', 'DIV', 'DL', 'DT',
  'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER',
  'HR', 'HTML', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION', 'SUMMARY', 'TABLE', 'TBODY', 'TD',
  'TFOOT', 'TH', 'THEAD', 'TR', 'UL',
]);

/** Elements whose content is never text: scripts, styles, media, form controls, and the document head. */
const SKIPPED = new Set([
  'AUDIO', 'BUTTON', 'CANVAS', 'HEAD', 'IFRAME', 'INPUT', 'LINK', 'META', 'NOSCRIPT', 'OBJECT',
  'SCRIPT', 'SELECT', 'STYLE', 'SVG', 'TEMPLATE', 'TEXTAREA', 'TITLE', 'VIDEO',
]);

/** The block a stretch of text is being collected for. */
interface BlockContext {
  readonly type: string;
  readonly attrs: Attrs | undefined;
}

/**
 * Walks parsed HTML and collects blocks. Text accumulates in a buffer under the
 * innermost block context; a block boundary (a matched block element, or any
 * block-level element) flushes the buffer into a block of that context's type.
 * Atoms flush and stand alone. So `<blockquote><p>a</p><p>b</p></blockquote>`
 * yields two quote blocks and `<li><p>x</p></li>` one list item — the default
 * text type inherits the type of the block it sits in.
 */
class Collector {
  readonly blocks: Node[] = [];
  private buffer: InlineNode[] = [];
  private readonly rules: CompiledRules;
  private readonly defaultType: string;

  constructor(private readonly registry: Registry) {
    this.rules = compiledRules(registry);
    this.defaultType = registry.hasBlock('paragraph') ? 'paragraph' : (registry.listBlocks().find(def => def.spec.content.kind === 'text')?.type ?? 'paragraph');
  }

  walk(parent: globalThis.Node, marks: Marks, context: BlockContext | null, preserve: boolean): void {
    for (const child of Array.from(parent.childNodes)) {
      if (child.nodeType === globalThis.Node.TEXT_NODE) {
        const text = normalizeText(child.nodeValue ?? '', preserve);
        if (text)
          this.buffer.push({ text, marks });
        continue;
      }

      if (child.nodeType !== globalThis.Node.ELEMENT_NODE)
        continue;

      const el = child as HTMLElement;

      if (SKIPPED.has(el.tagName))
        continue;

      if (el.tagName === 'BR') {
        this.buffer.push({ text: '\n', marks });
        continue;
      }

      const pre = preserve || el.tagName === 'PRE' || el.style.whiteSpace.startsWith('pre');
      const hit = matchBlock(el, this.rules);

      if (hit?.def.spec.content.kind === 'atom') {
        this.flush(context, preserve);
        this.blocks.push(createNode(hit.def.type, { attrs: hit.attrs }));
        continue;
      }

      if (hit?.def.spec.content.kind === 'text') {
        this.flush(context, preserve);
        const inner = context && hit.def.type === this.defaultType ? context : { type: hit.def.type, attrs: hit.attrs };
        this.walk(el, marks, inner, pre);
        this.flush(inner, pre);
        continue;
      }

      if (BLOCK_LEVEL.has(el.tagName) || el.style.display === 'block') {
        this.flush(context, preserve);
        this.walk(el, marks, context, pre);
        this.flush(context, pre);
        continue;
      }

      this.walk(el, normalizeMarks([...marks, ...matchMarks(el, this.rules)]), context, pre);
    }
  }

  /** Turn the buffered text into a block of the context's type; nothing but whitespace makes no block. */
  flush(context: BlockContext | null, preserve: boolean): void {
    const runs = trimInline(normalizeInline(this.buffer), preserve);
    this.buffer = [];

    if (inlineLength(runs) === 0)
      return;

    const type = context?.type ?? this.defaultType;
    this.blocks.push(createNode(type, { attrs: this.registry.schema.coerceAttrs(type, context?.attrs), content: runs }));
  }
}

/**
 * Read a DOM subtree into a fragment. Only the model comes out: no element of
 * the source, no style, no attribute the rules did not ask for. Works on a
 * detached (inert) document or a live one.
 */
export function parseDOMSlice(root: globalThis.Node, registry: Registry): Slice {
  const collector = new Collector(registry);
  collector.walk(root, [], null, false);
  collector.flush(null, false);

  const blocks = normalizeDocument(createDoc(collector.blocks), registry.schema).content;
  const first = blocks[0];
  const last = blocks[blocks.length - 1];
  const isText = (node: Node | undefined): boolean => node !== undefined && registry.schema.nodeSpec(node.type)?.content.kind === 'text';

  // Other apps copy text, not block boundaries: the ends flow into the line they land on.
  return createSlice(blocks, isText(first), isText(last));
}

/**
 * Parse clipboard HTML. `DOMParser` builds an inert document — scripts never
 * run, images never load — and the walk copies text and marks out of it, so
 * pasted markup cannot reach the live page at all.
 */
export function parseHtmlSlice(html: string, registry: Registry): Slice {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return parseDOMSlice(doc.body, registry);
}

/**
 * Whether a fragment carries no structure the HTML added: only default-type
 * blocks, no marks, no attrs. Such HTML (a code editor's coloured spans, a
 * terminal, a textarea) says less than the plain-text payload beside it.
 */
export function isStructureless(slice: Slice, registry: Registry): boolean {
  const defaultType = registry.hasBlock('paragraph') ? 'paragraph' : undefined;

  return slice.blocks.every(block =>
    block.type === defaultType
    && Object.keys(block.attrs).length === 0
    && Array.isArray(block.content)
    && block.content.every(run => 'marks' in run && run.marks.length === 0));
}
