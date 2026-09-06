import type { Attrs, Node, Slice } from '../../model';
import { createDoc, createNode, createSlice, inlineSlice } from '../../model';
import type { BlockDefinition, Registry } from '../../registry';
import { normalizeDocument } from '../../schema';

const FENCE = /^```\s*(\S*)$/;
/** How far into a line a block marker may reach (`1. `, `- [ ] `, `### `). */
const MARKER_REACH = 12;

interface LineHit {
  readonly def: BlockDefinition;
  readonly type: string;
  readonly attrs: Attrs | undefined;
  readonly rest: string;
}

/**
 * The block input rule a line starts with, if any — the same rules that turn
 * `# ` into a heading while typing, applied to a pasted line. Rules match a
 * marker ending in whitespace, so a bare marker line (`---`) is tried with a
 * space appended.
 */
function matchLine(line: string, registry: Registry): LineHit | null {
  const probe = `${line} `;
  const reach = Math.min(probe.length, MARKER_REACH);

  for (const def of registry.listBlocks()) {
    for (const rule of def.inputRules ?? []) {
      for (let length = 1; length <= reach; length++) {
        if (!rule.match.test(probe.slice(0, length)))
          continue;

        const rest = line.slice(length).trimStart();
        const type = rule.type ?? def.type;
        const target = registry.getBlock(type);

        if (!target || (target.spec.content.kind === 'atom' && rest.length > 0))
          break;

        return { def: target, type, attrs: rule.attrs, rest };
      }
    }
  }

  return null;
}

function textBlock(type: string, text: string, registry: Registry, attrs?: Attrs): Node {
  return createNode(type, {
    attrs: registry.schema.coerceAttrs(type, attrs),
    content: text ? [{ text, marks: [] }] : [],
  });
}

/**
 * Parse plain text: one block per line, blank lines dropped, ``` fences
 * folded into a code block, and each line's leading marker resolved through
 * the registry's input rules — so a markdown file pastes as headings, lists
 * and quotes. A single line with no marker is inline: it joins the caret's
 * line rather than splitting it.
 */
export function parseTextSlice(text: string, registry: Registry): Slice {
  const lines = text.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n');
  const defaultType = registry.hasBlock('paragraph') ? 'paragraph' : (registry.listBlocks().find(def => def.spec.content.kind === 'text')?.type ?? 'paragraph');
  const codeType = registry.hasBlock('code-block') ? 'code-block' : null;
  const blocks: Node[] = [];

  let fence: { language: string; lines: string[] } | null = null;

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (codeType) {
      const opening = FENCE.exec(line);

      if (fence && opening) {
        blocks.push(textBlock(codeType, fence.lines.join('\n'), registry, { language: fence.language || 'plain' }));
        fence = null;
        continue;
      }

      if (fence) {
        fence.lines.push(raw);
        continue;
      }

      if (opening) {
        fence = { language: opening[1] ?? '', lines: [] };
        continue;
      }
    }

    if (!line)
      continue;

    const hit = matchLine(line, registry);

    if (!hit) {
      blocks.push(textBlock(defaultType, line, registry));
      continue;
    }

    blocks.push(hit.def.spec.content.kind === 'atom'
      ? createNode(hit.type, { attrs: registry.schema.coerceAttrs(hit.type, hit.attrs) })
      : textBlock(hit.type, hit.rest, registry, hit.attrs));
  }

  if (fence && codeType)
    blocks.push(textBlock(codeType, fence.lines.join('\n'), registry, { language: fence.language || 'plain' }));

  const normalized = normalizeDocument(createDoc(blocks), registry.schema).content;
  const only = normalized.length === 1 ? normalized[0] : undefined;

  if (only && only.type === defaultType && Array.isArray(only.content))
    return inlineSlice(only.content, defaultType);

  const isText = (node: Node | undefined): boolean => node !== undefined && registry.schema.nodeSpec(node.type)?.content.kind === 'text';
  return createSlice(normalized, isText(normalized[0]), isText(normalized[normalized.length - 1]));
}
