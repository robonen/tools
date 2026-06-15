<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { DismissableLayer, PopperContent, PopperRoot, Portal } from '@robonen/primitives';
import { blockById, caret, createNode, inlineText, isCollapsed, nodeInline, nodeSelection } from '../../model';
import { createTransaction } from '../../state';
import { useWritekitContext } from '../context';
import { useEventListener } from '../composables';
import type { SlashItem } from './slash-items';
import { getSlashItems } from './slash-items';

export interface WritekitSlashMenuProps {
  /** Character that opens the menu (default `'/'`). */
  trigger?: string;
}

const { trigger = '/' } = defineProps<WritekitSlashMenuProps>();

const ctx = useWritekitContext();
const open = ref(false);
const items = ref<SlashItem[]>([]);
const highlighted = ref(0);
// Virtual reference (a `Measurable`) anchored to the caret rect; Popper positions
// against it with no trigger element. Focus stays in the contenteditable (so the
// user keeps typing to filter), so nav is driven by the capture-phase keydown
// below and the highlight is an index — not roving focus / listbox focus.
const reference = ref<{ getBoundingClientRect: () => DOMRect } | undefined>();

let triggerBlockId = '';
let triggerStart = 0;
let caretOffset = 0;

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function caretRect(): DOMRect | null {
  const selection = globalThis.window === undefined ? null : globalThis.getSelection();
  if (!selection || selection.rangeCount === 0)
    return null;

  const range = selection.getRangeAt(0);
  const rects = range.getClientRects();
  const rect = rects.length > 0 ? rects[0]! : range.getBoundingClientRect();
  return rect.width || rect.height ? rect : null;
}

function close(): void {
  open.value = false;
}

function refresh(): void {
  const sel = ctx.writekit.state.selection;

  if (sel.kind !== 'text' || !isCollapsed(sel) || ctx.composing.value) {
    close();
    return;
  }

  const block = blockById(ctx.writekit.state.doc, sel.focus.blockId);
  const spec = block && ctx.writekit.state.schema.nodeSpec(block.type);

  if (!block || spec?.content.kind !== 'text' || spec.code) {
    close();
    return;
  }

  const before = inlineText(nodeInline(block)).slice(0, sel.focus.offset);
  const match = new RegExp(`(?:^|\\s)${escapeRegExp(trigger)}([\\p{L}\\p{N}]*)$`, 'u').exec(before);

  if (!match) {
    close();
    return;
  }

  const query = match[1] ?? '';
  const next = getSlashItems(ctx.writekit.state.registry, query);

  if (next.length === 0) {
    close();
    return;
  }

  triggerBlockId = block.id;
  caretOffset = sel.focus.offset;
  triggerStart = caretOffset - query.length - trigger.length;
  items.value = next;
  highlighted.value = open.value ? Math.min(highlighted.value, next.length - 1) : 0;

  if (!caretRect()) {
    close();
    return;
  }

  reference.value = { getBoundingClientRect: () => caretRect() ?? new DOMRect() };
  open.value = true;
}

function selectItem(item: SlashItem): void {
  const writekit = ctx.writekit;
  const block = blockById(writekit.state.doc, triggerBlockId);

  if (!block) {
    close();
    return;
  }

  const def = writekit.state.registry.getBlock(item.type);
  const tr = createTransaction(writekit.state).deleteText(triggerBlockId, triggerStart, caretOffset);

  if (def?.spec.content.kind === 'atom') {
    const node = createNode(item.type, { attrs: writekit.state.schema.defaultAttrs(item.type) });
    const index = writekit.state.doc.content.findIndex(candidate => candidate.id === triggerBlockId);
    tr.insertBlock(node, index + 1).setSelection(nodeSelection([node.id]));
  }
  else {
    tr.setBlockType(triggerBlockId, item.type, writekit.state.schema.defaultAttrs(item.type));
    tr.setSelection(caret(triggerBlockId, triggerStart));
  }

  writekit.dispatch(tr);
  close();
}

function onKeydownCapture(event: KeyboardEvent): void {
  if (!open.value || items.value.length === 0)
    return;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      event.stopImmediatePropagation();
      highlighted.value = (highlighted.value + 1) % items.value.length;
      break;
    case 'ArrowUp':
      event.preventDefault();
      event.stopImmediatePropagation();
      highlighted.value = (highlighted.value - 1 + items.value.length) % items.value.length;
      break;
    case 'Enter':
      event.preventDefault();
      event.stopImmediatePropagation();
      selectItem(items.value[highlighted.value]!);
      break;
    case 'Escape':
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
      break;
  }
}

ctx.writekit.on('transaction', refresh);
useEventListener(() => (typeof document === 'undefined' ? undefined : document), 'selectionchange', refresh);
useEventListener(() => (typeof document === 'undefined' ? undefined : document), 'keydown', onKeydownCapture as (event: Event) => void, { capture: true });
onBeforeUnmount(() => ctx.writekit.off('transaction', refresh));
</script>

<template>
  <Portal to="body">
    <PopperRoot>
      <PopperContent
        v-if="open && reference"
        :reference="reference"
        side="bottom"
        align="start"
        :side-offset="6"
        :collision-padding="8"
      >
        <DismissableLayer
          class="writekit-slash-menu"
          role="listbox"
          data-writekit-slash-menu=""
          @dismiss="close"
          @focus-outside.prevent
        >
          <button
            v-for="(item, index) in items"
            :key="item.type"
            type="button"
            role="option"
            :data-highlighted="index === highlighted || undefined"
            :aria-selected="index === highlighted"
            @mousedown.prevent="selectItem(item)"
            @mousemove="highlighted = index"
          >
            <span class="slash-title">{{ item.title }}</span>
            <span class="slash-group">{{ item.group }}</span>
          </button>
        </DismissableLayer>
      </PopperContent>
    </PopperRoot>
  </Portal>
</template>
