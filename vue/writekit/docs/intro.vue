<script setup lang="ts">
const quickStart = `<script setup lang="ts">
import { createDefaultRegistry, createWritekit, createWritekitState, WritekitRoot } from '@robonen/writekit';

const registry = createDefaultRegistry();
const writekit = createWritekit({ state: createWritekitState({ registry }) });
<\/script>

<template>
  <WritekitRoot :writekit="writekit" autofocus class="writekit" />
<\/template>`;

const composeSlots = `<WritekitRoot :writekit="writekit" autofocus>
  <WritekitContent />
  <WritekitBubbleMenu />  <!-- formatting toolbar on selection -->
  <WritekitSlashMenu />   <!-- type \`/\` to insert blocks -->
</WritekitRoot>`;

const commands = `import { setBlockType, toggleMark } from '@robonen/writekit';

writekit.command(toggleMark('bold'));
writekit.command(setBlockType('heading', { level: 2 }));

// Called without a dispatch they run dry — perfect for
// computing disabled / active toolbar state.
const canBold = writekit.command(toggleMark('bold'));`;
</script>

<template>
  <div class="docs-section">
    <div class="prose-docs">
      <h1>@robonen/writekit</h1>
      <p>
        A <strong>headless, block-based rich-text writekit for Vue 3</strong> — in the spirit of
        Tiptap / ProseMirror / Editor.js, but with a registry-driven schema and a
        <strong>hand-built CRDT</strong> for collaboration (no Yjs / Loro / Automerge).
      </p>
    </div>

    <div class="prose-docs">
      <p>
        Most writekits force a trade: the structured, block-first authoring of Editor.js, or the
        document fidelity of ProseMirror where native cross-block selection and arrow navigation
        just work. <code>@robonen/writekit</code> takes the ProseMirror route — a single
        <code>contenteditable</code> surface — and layers a modular block registry on top, so blocks
        and inline marks are added without touching the core. The model, schema, state, commands and
        keymap are entirely DOM-free and Vue-free; the Vue layer only renders and handles input.
        Every edit is a step-based transaction with an exact inverse, which gives you real undo/redo
        and — because the same steps drive the CRDT — conflict-free collaboration for free.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="rounded-lg border border-border bg-bg-subtle p-5">
        <h3 class="mb-1.5 text-sm font-semibold text-fg">Headless by design</h3>
        <p class="text-sm leading-relaxed text-fg-muted">
          Ships behavior and DOM structure (<code class="text-accent-text">data-block-*</code>
          hooks), never styling. Bring your own CSS and own the look completely.
        </p>
      </div>
      <div class="rounded-lg border border-border bg-bg-subtle p-5">
        <h3 class="mb-1.5 text-sm font-semibold text-fg">Registry-driven schema</h3>
        <p class="text-sm leading-relaxed text-fg-muted">
          <code class="text-accent-text">defineBlock</code> /
          <code class="text-accent-text">defineMark</code> register into an immutable schema —
          add a custom block or mark with no core changes.
        </p>
      </div>
      <div class="rounded-lg border border-border bg-bg-subtle p-5">
        <h3 class="mb-1.5 text-sm font-semibold text-fg">Step-based transactions</h3>
        <p class="text-sm leading-relaxed text-fg-muted">
          Every edit is a step with an exact inverse, powering reliable undo/redo and a single source
          of truth for both local edits and sync.
        </p>
      </div>
      <div class="rounded-lg border border-border bg-bg-subtle p-5">
        <h3 class="mb-1.5 text-sm font-semibold text-fg">Own CRDT, pluggable</h3>
        <p class="text-sm leading-relaxed text-fg-muted">
          RGA text, fractional-indexed blocks, Peritext-style marks and presence behind a
          <code class="text-accent-text">CrdtProvider</code> — over any transport.
        </p>
      </div>
    </div>

    <div class="prose-docs">
      <h2>Install</h2>
      <p>
        The writekit depends on <code>@robonen/crdt</code> for the built-in collaboration provider, and
        on <code>vue</code> as a peer.
      </p>
    </div>
    <DocsCode :code="`pnpm add @robonen/writekit @robonen/crdt vue`" lang="bash" />

    <div class="prose-docs">
      <h2>Quick start</h2>
      <p>
        Create a registry, build an writekit around its state, and mount <code>WritekitRoot</code>. Its
        default slot renders <code>WritekitContent</code> (the single <code>contenteditable</code>), so
        this is a fully working writekit with all built-in blocks and marks.
      </p>
    </div>
    <DocsCode :code="quickStart" lang="vue" />

    <div class="prose-docs">
      <p>
        Provide your own slot to add UI around the editable surface — the bubble toolbar floats over a
        selection, and the slash menu opens when you type <code>/</code> at the start of a line.
      </p>
    </div>
    <DocsCode :code="composeSlots" lang="vue" />

    <div class="prose-docs">
      <h2>Commands</h2>
      <p>
        Commands are <code>(state, dispatch?, view?) =&gt; boolean</code> functions that power the
        keymap, the UI, and programmatic edits. Run one with <code>writekit.command(...)</code>; omit
        the dispatch to dry-run it for active/disabled state.
      </p>
    </div>
    <DocsCode :code="commands" lang="ts" />

    <div class="prose-docs">
      <h2>Built-in blocks &amp; marks</h2>
      <p>
        <code>createDefaultRegistry()</code> wires up a full set out of the box —
        <strong>blocks:</strong> <code>paragraph</code>, <code>heading</code> (1–6),
        <code>bulleted-list</code> / <code>numbered-list</code> / <code>todo-list</code>,
        <code>blockquote</code>, <code>code-block</code>, <code>callout</code>, <code>divider</code>,
        <code>image</code>; <strong>marks:</strong> <code>bold</code>, <code>italic</code>,
        <code>underline</code>, <code>strike</code>, <code>highlight</code>, <code>code</code>,
        <code>link</code>. Markdown input rules (<code># </code>, <code>- </code>, <code>1. </code>,
        <code>&gt; </code>, <code>[] </code>) and hotkeys (<code>Mod-b/i/u</code>,
        <code>Mod-z</code>, …) are included.
      </p>
    </div>

    <div class="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
      <p class="text-sm leading-relaxed text-fg-muted">
        <strong class="text-amber-700 dark:text-amber-400">Status: v0, work in progress.</strong>
        Core logic is covered by unit + convergence tests; the contenteditable / Playwright suite
        runs locally. The collaboration layer has a few documented, deferred limitations.
      </p>
    </div>

    <div class="prose-docs">
      <h2>Where to next</h2>
      <p>Jump into the pieces you'll reach for first:</p>
      <ul>
        <li>
          <NuxtLink to="/writekit/playground"><strong>Playground</strong></NuxtLink> — a live writekit
          you can type in, right here in the docs.
        </li>
        <li>
          <code>WritekitRoot</code> and <code>WritekitContent</code> — the mount
          surface and the single contenteditable.
        </li>
        <li>
          <NuxtLink to="/writekit/create-default-registry"><code>createDefaultRegistry</code></NuxtLink>,
          <NuxtLink to="/writekit/define-block"><code>defineBlock</code></NuxtLink> and
          <NuxtLink to="/writekit/define-mark"><code>defineMark</code></NuxtLink> — extend the schema.
        </li>
        <li>
          <NuxtLink to="/writekit/toggle-mark"><code>toggleMark</code></NuxtLink> /
          <NuxtLink to="/writekit/set-block-type"><code>setBlockType</code></NuxtLink> — the commands
          API for programmatic and toolbar edits.
        </li>
        <li>
          <NuxtLink to="/writekit/bind-crdt"><code>bindCrdt</code></NuxtLink> and
          <NuxtLink to="/writekit/create-native-provider"><code>createNativeProvider</code></NuxtLink>
          — wire up real-time collaboration with the built-in CRDT.
        </li>
      </ul>
      <p>
        The full API reference for every export is listed right below.
      </p>
    </div>
  </div>
</template>
