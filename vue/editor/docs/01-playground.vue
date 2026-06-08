<!-- title: Playground -->
<!-- order: 1 -->
<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import type { Inline, InlineNode, Node } from '../src';
import {
  createDefaultRegistry,
  createDoc,
  createEditor,
  createEditorState,
  createNode,
  EditorBubbleMenu,
  EditorContent,
  EditorRoot,
  EditorSlashMenu,
  isBlockActive,
  isMarkActive,
  setBlockType,
  toggleBlockType,
  toggleMark,
} from '../src';

// ── Tiny content helpers (same shape as the playground's lib) ────────────────
function t(text: string, ...markTypes: string[]): InlineNode {
  return { text, marks: markTypes.map(type => ({ type })) };
}
function p(content: string | Inline = ''): Node {
  const inline = typeof content === 'string' ? (content ? [t(content)] : []) : content;
  return createNode('paragraph', { content: inline });
}
const heading = (level: number, text: string): Node => createNode('heading', { attrs: { level }, content: text ? [t(text)] : [] });
const quote = (text: string): Node => createNode('blockquote', { content: [t(text)] });
const codeBlock = (text: string): Node => createNode('code-block', { content: [t(text)] });
const callout = (variant: string, text: string): Node => createNode('callout', { attrs: { variant }, content: [t(text)] });
const bullet = (text: string): Node => createNode('bulleted-list', { attrs: { indent: 0 }, content: [t(text)] });
const numbered = (text: string): Node => createNode('numbered-list', { attrs: { indent: 0 }, content: [t(text)] });
const todo = (text: string, checked = false): Node => createNode('todo-list', { attrs: { checked, indent: 0 }, content: [t(text)] });
const divider = (): Node => createNode('divider');

// The editor controller is pure model/state (no DOM) — safe to build during SSR;
// only EditorRoot below touches the DOM, and it's wrapped in <ClientOnly>.
const editor = createEditor({
  state: createEditorState({
    registry: createDefaultRegistry(),
    doc: createDoc([
      heading(1, 'Try the editor'),
      p([
        t('A headless, block-based rich-text editor for Vue. This line mixes '),
        t('bold', 'bold'), t(', '), t('italic', 'italic'), t(', '), t('code', 'code'),
        t(' and '), t('highlight', 'highlight'), t('.'),
      ]),
      p('Select any text to reveal the bubble menu, or type “/” on an empty line to insert a block.'),
      heading(2, 'Blocks'),
      bullet('Bulleted lists'),
      numbered('Numbered lists'),
      todo('A checkable to-do item', false),
      quote('Block quotes for asides and citations.'),
      callout('info', 'Callouts highlight tips and notes.'),
      codeBlock('const editor = createEditor(createEditorState({ registry, doc }))'),
      divider(),
      p(''),
    ]),
  }),
});

// Re-derive toolbar active-states on every transaction.
const rev = ref(0);
const bump = (): void => void (rev.value += 1);
editor.on('transaction', bump);
onBeforeUnmount(() => editor.off('transaction', bump));

const boldActive = computed(() => (rev.value, isMarkActive(editor.state, 'bold')));
const italicActive = computed(() => (rev.value, isMarkActive(editor.state, 'italic')));
const codeActive = computed(() => (rev.value, isMarkActive(editor.state, 'code')));
const highlightActive = computed(() => (rev.value, isMarkActive(editor.state, 'highlight')));
const h1Active = computed(() => (rev.value, isBlockActive(editor.state, 'heading', { level: 1 })));
const h2Active = computed(() => (rev.value, isBlockActive(editor.state, 'heading', { level: 2 })));
const quoteActive = computed(() => (rev.value, isBlockActive(editor.state, 'blockquote')));
const canUndo = computed(() => (rev.value, editor.canUndo()));
const canRedo = computed(() => (rev.value, editor.canRedo()));
</script>

<template>
  <div class="docs-section">
    <div class="prose-docs">
      <h1>Playground</h1>
      <p>
        A live <code>@robonen/editor</code> instance built with the default registry. Everything
        below is the real editor — the same headless controller, single-contenteditable view, and
        CRDT-backed model documented in the API reference.
      </p>
      <h2>Try it</h2>
      <p>
        Edit the document directly. <strong>Select text</strong> to format it with the bubble menu,
        or type <kbd>/</kbd> on an empty line to open the block menu. <kbd>Enter</kbd> splits a block,
        <kbd>Backspace</kbd> at the start merges into the previous one, and
        <kbd>⌘/Ctrl</kbd>+<kbd>Z</kbd> undoes.
      </p>
    </div>

    <ClientOnly>
      <div class="editor-demo">
        <div class="editor-demo-toolbar">
          <button type="button" title="Bold" :data-active="boldActive || undefined" @mousedown.prevent="editor.command(toggleMark('bold'))"><b>B</b></button>
          <button type="button" title="Italic" :data-active="italicActive || undefined" @mousedown.prevent="editor.command(toggleMark('italic'))"><i>I</i></button>
          <button type="button" title="Inline code" :data-active="codeActive || undefined" @mousedown.prevent="editor.command(toggleMark('code'))"><code>&lt;&gt;</code></button>
          <button type="button" title="Highlight" :data-active="highlightActive || undefined" @mousedown.prevent="editor.command(toggleMark('highlight'))">H</button>
          <span class="sep" />
          <button type="button" title="Heading 1" :data-active="h1Active || undefined" @mousedown.prevent="editor.command(toggleBlockType('heading', { level: 1 }))">H1</button>
          <button type="button" title="Heading 2" :data-active="h2Active || undefined" @mousedown.prevent="editor.command(toggleBlockType('heading', { level: 2 }))">H2</button>
          <button type="button" title="Quote" :data-active="quoteActive || undefined" @mousedown.prevent="editor.command(toggleBlockType('blockquote'))">❝</button>
          <button type="button" title="Paragraph" @mousedown.prevent="editor.command(setBlockType('paragraph'))">¶</button>
          <span class="sep" />
          <button type="button" title="Undo" :disabled="!canUndo" @mousedown.prevent="editor.undo()">↺</button>
          <button type="button" title="Redo" :disabled="!canRedo" @mousedown.prevent="editor.redo()">↻</button>
        </div>
        <EditorRoot :editor="editor" class="editor-demo-root">
          <EditorContent />
          <EditorBubbleMenu />
          <EditorSlashMenu />
        </EditorRoot>
      </div>

      <template #fallback>
        <div class="flex min-h-60 items-center justify-center gap-2 rounded-xl border border-(--border) bg-(--bg-subtle) text-sm text-(--fg-subtle)">
          <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Loading editor…
        </div>
      </template>
    </ClientOnly>

    <div class="prose-docs">
      <h2>How it's wired</h2>
      <p>
        The editor is created from a registry and a document, then rendered with a single
        <code>EditorRoot</code> over one contenteditable host — the toolbar above just dispatches
        the same commands you'd call programmatically.
      </p>
    </div>
    <DocsCode
      lang="ts"
      :code="`import {
  EditorRoot, EditorContent, EditorBubbleMenu, EditorSlashMenu,
  createDefaultRegistry, createDoc, createEditor, createEditorState,
  toggleMark, toggleBlockType,
} from '@robonen/editor';

const editor = createEditor({
  state: createEditorState({ registry: createDefaultRegistry(), doc: createDoc(blocks) }),
});

// Commands are plain values you run on the editor:
editor.command(toggleMark('bold'));
editor.command(toggleBlockType('heading', { level: 1 }));`"
    />

    <div class="prose-docs">
      <p>
        See <NuxtLink to="/editor/create-editor">createEditor</NuxtLink>,
        <NuxtLink to="/editor/create-default-registry">createDefaultRegistry</NuxtLink> and
        <NuxtLink to="/editor/toggle-mark">toggleMark</NuxtLink> in the API reference for the full surface.
      </p>
    </div>
  </div>
</template>

<style>
/* Unscoped on purpose: the editor renders its own DOM (and teleports the menus
   to <body>), so scoped styles can't reach them. All selectors are namespaced
   under `.editor-demo*` / the editor's own menu classes to avoid leaking. */
.editor-demo { counter-reset: editor-demo-ol; }

.editor-demo-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  padding: 6px;
  border: 1px solid var(--border);
  border-bottom: 0;
  border-radius: 12px 12px 0 0;
  background: var(--bg-subtle);
}
.editor-demo-toolbar button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 30px;
  padding: 0 9px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--fg);
  border-radius: 7px;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  transition: background 0.12s, border-color 0.12s;
}
.editor-demo-toolbar button code { font-family: var(--font-mono, ui-monospace, monospace); font-size: 12px; }
.editor-demo-toolbar button:hover { border-color: var(--border-strong); background: var(--bg-inset); }
.editor-demo-toolbar button:disabled { opacity: 0.4; cursor: not-allowed; }
.editor-demo-toolbar button[data-active] { background: var(--accent); color: var(--accent-fg); border-color: transparent; }
.editor-demo-toolbar .sep { width: 1px; height: 18px; background: var(--border); margin: 0 4px; }

.editor-demo-root {
  border: 1px solid var(--border);
  border-radius: 0 0 12px 12px;
  padding: 1rem 1.25rem;
  min-height: 260px;
  background: var(--bg);
  color: var(--fg);
  outline: none;
}
.editor-demo-root:focus-within { border-color: var(--accent); }

.editor-demo-root [data-block-content] { outline: none; margin: 0.45em 0; line-height: 1.7; }
.editor-demo-root h1[data-block-content],
.editor-demo-root h2[data-block-content],
.editor-demo-root h3[data-block-content] { margin: 0.7em 0 0.3em; line-height: 1.3; font-weight: 700; letter-spacing: -0.01em; }
.editor-demo-root h1[data-block-content] { font-size: 1.6rem; }
.editor-demo-root h2[data-block-content] { font-size: 1.3rem; }
.editor-demo-root h3[data-block-content] { font-size: 1.1rem; }
.editor-demo-root [data-block-content][data-empty]::before { content: attr(data-placeholder); color: var(--fg-subtle); pointer-events: none; }

/* inline marks */
.editor-demo-root [data-block-content] strong { font-weight: 700; }
.editor-demo-root [data-block-content] em { font-style: italic; }
.editor-demo-root [data-block-content] u { text-decoration: underline; }
.editor-demo-root [data-block-content] s,
.editor-demo-root [data-block-content] del { text-decoration: line-through; }
.editor-demo-root [data-block-content] mark { background: rgba(245, 200, 66, 0.4); color: inherit; border-radius: 2px; padding: 0 0.1em; }
.editor-demo-root [data-block-content] code {
  background: var(--bg-inset);
  border: 1px solid var(--border);
  padding: 0.05em 0.35em;
  border-radius: 4px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.9em;
}
.editor-demo-root [data-block-content] a { color: var(--accent-text); text-decoration: underline; cursor: pointer; }

.editor-demo-root blockquote[data-block-content] { border-left: 3px solid var(--border-strong); padding-left: 1rem; color: var(--fg-muted); font-style: italic; }
.editor-demo-root pre[data-block-content] {
  background: var(--bg-inset);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.85rem;
  white-space: pre-wrap;
}

/* callouts */
.editor-demo-root [data-callout] { position: relative; border-radius: 8px; margin: 0.5em 0; padding: 0.6rem 0.8rem 0.6rem 2.4rem; border: 1px solid var(--border); background: var(--bg-subtle); }
.editor-demo-root [data-callout]::before { position: absolute; left: 0.8rem; }
.editor-demo-root [data-callout='info']::before { content: 'ℹ️'; }
.editor-demo-root [data-callout='warn']::before { content: '⚠️'; }
.editor-demo-root [data-callout='success']::before { content: '✅'; }

/* lists (flat with marker in the gutter) */
.editor-demo-root [data-list] { position: relative; padding-left: 1.6em; }
.editor-demo-root [data-list]::before { position: absolute; left: 0.35em; color: var(--fg-muted); }
.editor-demo-root [data-list='bullet']::before { content: '•'; }
.editor-demo-root [data-list='ordered'] { counter-increment: editor-demo-ol; }
.editor-demo-root [data-list='ordered']::before { content: counter(editor-demo-ol) '.'; }
.editor-demo-root [data-list='todo']::before { content: '☐'; }
.editor-demo-root [data-list='todo'][data-checked='true']::before { content: '☑'; }
.editor-demo-root [data-list='todo'][data-checked='true'] { color: var(--fg-subtle); text-decoration: line-through; }

.editor-demo-root [data-editor-divider] { border: 0; border-top: 2px solid var(--border); margin: 1em 0; }

/* selection highlight */
.editor-demo-root ::selection { background: var(--accent-subtle); }
.editor-demo-root [data-block-content][data-selected],
.editor-demo-root [data-block-id][data-selected] { background: var(--accent-subtle); border-radius: 4px; }

/* floating menus (teleported to <body>) — editor-namespaced classes */
.editor-bubble-menu {
  display: flex;
  gap: 2px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  z-index: 60;
}
.editor-bubble-menu button { min-width: 30px; height: 28px; padding: 0 8px; border: 0; background: transparent; color: var(--fg-muted); border-radius: 5px; cursor: pointer; font-size: 13px; text-transform: capitalize; }
.editor-bubble-menu button:hover { background: var(--bg-inset); color: var(--fg); }
.editor-bubble-menu button[data-active] { background: var(--accent); color: var(--accent-fg); }

.editor-slash-menu {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16);
  width: 240px;
  max-height: 300px;
  overflow: auto;
  z-index: 60;
}
.editor-slash-menu button { display: flex; justify-content: space-between; align-items: baseline; width: 100%; text-align: left; border: 0; background: transparent; padding: 7px 10px; border-radius: 7px; cursor: pointer; font-size: 14px; color: var(--fg); }
.editor-slash-menu button[data-highlighted] { background: var(--bg-inset); }
.editor-slash-menu .slash-group { font-size: 11px; color: var(--fg-subtle); text-transform: capitalize; }
</style>
