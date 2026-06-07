<script lang="ts">
import type { PrimitiveProps } from './primitive';
import type { Keymap } from '../keymap';
import type { Command, CommandView, Editor, EditorState, Transaction } from '../state';
import type { Platform } from './config';
</script>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, shallowRef } from 'vue';
import { blockById, caret, inlineLength, nodeInline, selectionEq } from '../model';
import { compileKeymaps, defaultKeymap, runKeydown } from '../keymap';
import { createTransaction } from '../state';
import { Primitive } from './primitive';
import { provideEditorContext } from './context';
import { resolveConfig } from './config';
import { createBlockElementRegistry, createSelectionBridge } from './selection';
import { useEventListener } from './composables';
import { isInteractiveTarget } from './interactive';
import EditorContent from './EditorContent.vue';

export interface EditorRootProps extends PrimitiveProps {
  /** The headless controller (create with `createEditor(createEditorState(...))`). */
  editor: Editor;
  /** User keymaps, merged over the defaults (earlier wins). */
  keymaps?: Keymap[];
  editable?: boolean;
  dir?: 'ltr' | 'rtl';
  spellcheck?: boolean;
  platform?: Platform;
  /** Show per-block drag handles for reordering. */
  draggable?: boolean;
  /** Focus the start of the document on mount. */
  autofocus?: boolean;
}

const {
  editor,
  keymaps,
  as = 'div',
  editable = true,
  dir = 'ltr',
  spellcheck = true,
  platform,
  draggable = false,
  autofocus = false,
} = defineProps<EditorRootProps>();

const root = ref<HTMLElement | null>(null);
const contentRoot = shallowRef<HTMLElement | null>(null);
const state = shallowRef<EditorState>(editor.state);
const composing = ref(false);
const lastOrigin = ref<string | undefined>(undefined);
const blockElements = createBlockElementRegistry();
const selection = createSelectionBridge(() => contentRoot.value, blockElements);
const config = resolveConfig({ editable, dir, spellcheck, platform, draggable });
const compiled = compileKeymaps([...(keymaps ?? []), defaultKeymap(editor)], config.platform);

let suppressSelectionSync = false;

function focusBlock(blockId: string, offset: number | 'start' | 'end'): void {
  const block = blockById(editor.state.doc, blockId);
  const length = block ? inlineLength(nodeInline(block)) : 0;
  const resolved = offset === 'start' ? 0 : offset === 'end' ? length : offset;
  selection.write(caret(blockId, resolved));
}

const view: CommandView = { focusBlock };

provideEditorContext({
  editor,
  state,
  registry: editor.state.registry,
  config,
  contentRoot,
  blockElements,
  selection,
  composing,
  lastOrigin,
  dispatch: editor.dispatch,
  exec: (command: Command) => editor.command(command),
  focusBlock,
});

/** After a transaction, reflect the model selection back into the DOM caret. */
function reconcileSelection(): void {
  if (composing.value)
    return;

  // The user is editing an atom's control (e.g. an image caption input); writing
  // the model selection here would focus the editor and yank focus out of it.
  if (typeof document !== 'undefined' && isInteractiveTarget(document.activeElement))
    return;

  const current = selection.read();
  if (current && selectionEq(current, editor.state.selection))
    return;

  suppressSelectionSync = true;
  selection.write(editor.state.selection);
  nextTick(() => {
    suppressSelectionSync = false;
  });
}

function onTransaction(tr: Transaction, next: EditorState): void {
  state.value = next;
  lastOrigin.value = tr.getMeta('origin') as string | undefined;
  // Defer to nextTick so block content re-renders (TextBlockHost) run first.
  nextTick(reconcileSelection);
}

editor.on('transaction', onTransaction);
onBeforeUnmount(() => editor.off('transaction', onTransaction));

function onKeydown(event: KeyboardEvent): void {
  if (composing.value || event.isComposing || !editable || isInteractiveTarget(event.target))
    return; // let atom controls (e.g. image caption inputs) handle their own keys

  if (runKeydown(event, compiled, editor.state, editor.dispatch, view)) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function onSelectionChange(): void {
  if (composing.value || suppressSelectionSync)
    return;

  // Ignore selection changes that belong to an atom's own control (e.g. an image
  // caption input) — reading/writing them would steal focus back into the editor.
  if (typeof document !== 'undefined' && isInteractiveTarget(document.activeElement))
    return;

  const sel = selection.read();
  if (!sel || selectionEq(sel, editor.state.selection))
    return;

  editor.dispatch(createTransaction(editor.state).setSelection(sel).setMeta('selectionOnly', true));
}

useEventListener(root, 'keydown', onKeydown as (event: Event) => void, { capture: true });
useEventListener(() => (typeof document === 'undefined' ? undefined : document), 'selectionchange', onSelectionChange);

if (autofocus) {
  nextTick(() => {
    const first = editor.state.doc.content[0];
    if (first)
      focusBlock(first.id, 'start');
  });
}

function setRoot(el: unknown): void {
  root.value = (el as HTMLElement | null) ?? null;
}
</script>

<template>
  <Primitive
    :ref="setRoot"
    :as="as"
    role="group"
    data-editor-root=""
    :data-editable="editable ? '' : undefined"
    :dir="dir"
  >
    <slot><EditorContent /></slot>
  </Primitive>
</template>
