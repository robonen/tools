<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue';
import { blockById, caret, createNode, inlineText, isCollapsed, nodeInline, nodeSelection } from '../../model';
import { createTransaction } from '../../state';
import { useEditorContext } from '../context';
import { useEventListener } from '../composables';
import type { SlashItem } from './slash-items';
import { getSlashItems } from './slash-items';

export interface EditorSlashMenuProps {
  /** Character that opens the menu (default `'/'`). */
  trigger?: string;
}

const { trigger = '/' } = defineProps<EditorSlashMenuProps>();

const ctx = useEditorContext();
const open = ref(false);
const items = ref<SlashItem[]>([]);
const highlighted = ref(0);
const reference = ref<{ getBoundingClientRect: () => DOMRect } | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

let triggerBlockId = '';
let triggerStart = 0;
let caretOffset = 0;

const { floatingStyles, update } = useFloating(reference, floatingEl, {
  placement: 'bottom-start',
  middleware: [offset(6), flip(), shift({ padding: 8 })],
  whileElementsMounted: autoUpdate,
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function caretRect(): DOMRect | null {
  const selection = typeof globalThis.window === 'undefined' ? null : globalThis.getSelection();
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
  const sel = ctx.editor.state.selection;

  if (sel.kind !== 'text' || !isCollapsed(sel) || ctx.composing.value) {
    close();
    return;
  }

  const block = blockById(ctx.editor.state.doc, sel.focus.blockId);
  const spec = block && ctx.editor.state.schema.nodeSpec(block.type);

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
  const next = getSlashItems(ctx.editor.state.registry, query);

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
  void update();
}

function selectItem(item: SlashItem): void {
  const editor = ctx.editor;
  const block = blockById(editor.state.doc, triggerBlockId);

  if (!block) {
    close();
    return;
  }

  const def = editor.state.registry.getBlock(item.type);
  const tr = createTransaction(editor.state).deleteText(triggerBlockId, triggerStart, caretOffset);

  if (def?.spec.content.kind === 'atom') {
    const node = createNode(item.type, { attrs: editor.state.schema.defaultAttrs(item.type) });
    const index = editor.state.doc.content.findIndex(candidate => candidate.id === triggerBlockId);
    tr.insertBlock(node, index + 1).setSelection(nodeSelection([node.id]));
  }
  else {
    tr.setBlockType(triggerBlockId, item.type, editor.state.schema.defaultAttrs(item.type));
    tr.setSelection(caret(triggerBlockId, triggerStart));
  }

  editor.dispatch(tr);
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

ctx.editor.on('transaction', refresh);
useEventListener(() => (typeof document === 'undefined' ? undefined : document), 'selectionchange', refresh);
useEventListener(() => (typeof document === 'undefined' ? undefined : document), 'keydown', onKeydownCapture as (event: Event) => void, { capture: true });
onBeforeUnmount(() => ctx.editor.off('transaction', refresh));
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="floatingEl"
      :style="floatingStyles"
      class="editor-slash-menu"
      role="listbox"
      data-editor-slash-menu=""
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
    </div>
  </Teleport>
</template>
