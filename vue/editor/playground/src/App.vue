<script setup lang="ts">
import { shallowRef } from 'vue';
import CollabDemo from './demos/CollabDemo.vue';
import CommandsDemo from './demos/CommandsDemo.vue';
import ComplexBlocksDemo from './demos/ComplexBlocksDemo.vue';
import CustomKeymapDemo from './demos/CustomKeymapDemo.vue';
import ManyBlocksDemo from './demos/ManyBlocksDemo.vue';
import MarksDemo from './demos/MarksDemo.vue';
import MultiEditorDemo from './demos/MultiEditorDemo.vue';
import ReadOnlyDemo from './demos/ReadOnlyDemo.vue';
import RichTextDemo from './demos/RichTextDemo.vue';

const demos = [
  { id: 'rich', title: 'Rich text', component: RichTextDemo },
  { id: 'complex', title: 'Complex blocks', component: ComplexBlocksDemo },
  { id: 'collab', title: 'Collaboration', component: CollabDemo },
  { id: 'marks', title: 'Inline marks', component: MarksDemo },
  { id: 'many', title: 'Many blocks', component: ManyBlocksDemo },
  { id: 'multi', title: 'Multiple editors', component: MultiEditorDemo },
  { id: 'readonly', title: 'Read-only', component: ReadOnlyDemo },
  { id: 'commands', title: 'Commands API', component: CommandsDemo },
  { id: 'keymap', title: 'Custom keymap', component: CustomKeymapDemo },
];

const current = shallowRef(demos[0]!);
</script>

<template>
  <div class="layout">
    <nav class="sidebar">
      <h1>@robonen/editor</h1>
      <button
        v-for="demo in demos"
        :key="demo.id"
        :class="{ active: demo.id === current.id }"
        @click="current = demo"
      >
        {{ demo.title }}
      </button>
    </nav>
    <main class="content">
      <component :is="current.component" :key="current.id" />
    </main>
  </div>
</template>

<style>
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, sans-serif; color: #1a1a1a; background: #fafafa; }

.layout { display: grid; grid-template-columns: 220px 1fr; min-height: 100vh; }
.sidebar { border-right: 1px solid #e5e5e5; padding: 1rem; background: #fff; position: sticky; top: 0; height: 100vh; }
.sidebar h1 { font-size: 14px; margin: 0 0 1rem; color: #666; }
.sidebar button { display: block; width: 100%; text-align: left; padding: 8px 10px; margin-bottom: 2px; border: 0; background: transparent; border-radius: 6px; cursor: pointer; font-size: 14px; color: #333; }
.sidebar button:hover { background: #f0f0f0; }
.sidebar button.active { background: #1a1a1a; color: #fff; }

.content { padding: 2rem; max-width: 880px; }
.content section > h2 { margin: 0 0 0.25rem; }
.hint { color: #888; font-size: 13px; margin: 0 0 1rem; }

.toolbar { display: flex; gap: 4px; align-items: center; margin-bottom: 0.75rem; }
.toolbar.wrap { flex-wrap: wrap; }
.toolbar button { min-width: 32px; height: 32px; padding: 0 8px; border: 1px solid #ddd; background: #fff; border-radius: 6px; cursor: pointer; font-size: 13px; }
.toolbar button:hover { border-color: #bbb; }
.toolbar button:disabled { opacity: 0.4; cursor: default; }
.toolbar button[data-active] { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }
.toolbar .sep { width: 1px; height: 20px; background: #ddd; margin: 0 4px; }

.editor { border: 1px solid #e5e5e5; border-radius: 8px; padding: 1rem 1.25rem; min-height: 120px; background: #fff; }
.editor:focus-within { border-color: #999; }
.editor.scroll { max-height: 420px; overflow: auto; }
.editor [data-block-content] { outline: none; margin: 0.4em 0; line-height: 1.6; }
.editor [data-block-content]:is(h1, h2, h3, h4, h5, h6) { margin: 0.6em 0 0.3em; line-height: 1.3; }
.editor [data-block-type='heading'] [data-block-content] { font-weight: 700; }
.editor [data-block-content][data-empty]::before { content: attr(data-placeholder); color: #bbb; pointer-events: none; }
.editor [data-block-content] strong { font-weight: 700; }
.editor [data-block-content] em { font-style: italic; }
.editor ::selection { background: #b3d4fc; }

.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

details { margin-top: 1rem; }
summary { cursor: pointer; color: #666; font-size: 13px; }
details pre { background: #f6f6f6; padding: 1rem; border-radius: 8px; overflow: auto; font-size: 12px; max-height: 300px; }

/* inline marks */
.editor [data-block-content] mark { background: #fde68a; border-radius: 2px; }
.editor [data-block-content] code { background: #eef0f2; padding: 0.1em 0.35em; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; }
.editor [data-block-content] a { color: #2563eb; text-decoration: underline; cursor: pointer; }

/* blockquote */
.editor blockquote[data-block-content] { border-left: 3px solid #ddd; padding-left: 1rem; color: #555; font-style: italic; }

/* code block */
.editor pre[data-block-content] { background: #f6f8fa; border: 1px solid #eaecef; border-radius: 6px; padding: 0.75rem 1rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; white-space: pre-wrap; }

/* callout */
.editor [data-callout] { position: relative; border-radius: 8px; margin: 0.5em 0; padding: 0.6rem 0.8rem 0.6rem 2.4rem; }
.editor [data-callout]::before { position: absolute; left: 0.8rem; }
.editor [data-callout='info'] { background: #eef4ff; } .editor [data-callout='info']::before { content: 'ℹ️'; }
.editor [data-callout='warn'] { background: #fff6e6; } .editor [data-callout='warn']::before { content: '⚠️'; }
.editor [data-callout='success'] { background: #ecfdf3; } .editor [data-callout='success']::before { content: '✅'; }

/* lists (flat-with-indent; marker in the gutter, indent via inline margin-left) */
.editor { counter-reset: editor-ol; }
.editor [data-list] { position: relative; }
.editor [data-list]::before { position: absolute; left: 0.1em; color: #555; }
.editor [data-list='bullet']::before { content: '•'; }
.editor [data-list='ordered'] { counter-increment: editor-ol; }
.editor [data-list='ordered']::before { content: counter(editor-ol) '.'; }
.editor [data-list='todo']::before { content: '☐'; }
.editor [data-list='todo'][data-checked='true']::before { content: '☑'; }
.editor [data-list='todo'][data-checked='true'] { color: #999; text-decoration: line-through; }

/* atoms: image + divider */
.editor [data-editor-image] { margin: 0.8em 0; text-align: center; }
.editor [data-editor-image] img { max-width: 100%; border-radius: 8px; }
.editor [data-editor-image] figcaption { color: #888; font-size: 13px; margin-top: 4px; }
.editor [data-editor-image] .image-placeholder { background: #f3f3f3; border: 1px dashed #ccc; border-radius: 8px; padding: 1.5rem; color: #999; }
.editor [data-editor-image] .image-fields { display: flex; flex-direction: column; gap: 4px; margin: 6px auto 0; max-width: 360px; }
.editor [data-editor-image] .image-fields input { padding: 4px 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; }
.editor [data-editor-divider] { border: 0; border-top: 2px solid #e5e5e5; margin: 1em 0; }

/* node selection highlight */
.editor [data-block-type='image'][data-selected], .editor [data-block-type='divider'][data-selected] { outline: 2px solid #2563eb; outline-offset: 2px; border-radius: 6px; }
.editor [data-block-content][data-selected], .editor [data-block-id][data-selected]:not([data-block-type='image']):not([data-block-type='divider']) { background: rgba(37, 99, 235, 0.08); border-radius: 4px; }

/* floating menus (teleported to body) */
.editor-bubble-menu { display: flex; gap: 2px; background: #1a1a1a; border-radius: 8px; padding: 4px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25); z-index: 50; }
.editor-bubble-menu button { min-width: 30px; height: 28px; padding: 0 8px; border: 0; background: transparent; color: #fff; border-radius: 5px; cursor: pointer; font-size: 13px; text-transform: capitalize; }
.editor-bubble-menu button:hover { background: rgba(255, 255, 255, 0.15); }
.editor-bubble-menu button[data-active] { background: #fff; color: #1a1a1a; }

.editor-slash-menu { background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 4px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12); width: 230px; max-height: 280px; overflow: auto; z-index: 50; }
.editor-slash-menu button { display: flex; justify-content: space-between; align-items: baseline; width: 100%; text-align: left; border: 0; background: transparent; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 14px; color: #333; }
.editor-slash-menu button[data-highlighted] { background: #f0f0f0; }
.editor-slash-menu .slash-group { font-size: 11px; color: #aaa; text-transform: capitalize; }

kbd { background: #eee; border: 1px solid #ddd; border-radius: 4px; padding: 1px 5px; font-size: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

/* drag-to-reorder handle */
.editor [data-block-id] { position: relative; }
.editor-drag-handle { position: absolute; left: -1.2em; top: 0.25em; cursor: grab; color: #ccc; user-select: none; opacity: 0; transition: opacity 0.1s; line-height: 1.4; }
.editor [data-block-id]:hover > .editor-drag-handle { opacity: 1; }
.editor-drag-handle:hover { color: #888; }
.editor-drag-handle:active { cursor: grabbing; }

/* remote collaboration cursors */
.editor.collab { position: relative; }
.editor-remote-cursors { position: absolute; inset: 0; pointer-events: none; overflow: visible; z-index: 4; }
.editor-remote-selection { position: absolute; background: var(--cursor-color); opacity: 0.22; border-radius: 2px; }
.editor-remote-caret { position: absolute; width: 2px; background: var(--cursor-color); }
.editor-remote-caret-label { position: absolute; top: -1.05em; left: -1px; font-size: 10px; line-height: 1; white-space: nowrap; color: #fff; background: var(--cursor-color); padding: 1px 4px; border-radius: 3px 3px 3px 0; }
</style>
