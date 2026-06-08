<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import type { RemoteCursor } from '@editor';
import {
  EditorBubbleMenu,
  EditorContent,
  EditorRemoteCursors,
  EditorRoot,
  EditorSlashMenu,
  bindCrdt,
  createDefaultRegistry,
  createDoc,
  createEditor,
  createEditorState,
  createNativeProvider,
} from '@editor';
import { h, p } from '../lib';

const registry = createDefaultRegistry();
const seed = createDoc([
  h(1, 'Shared document'),
  p('Edit in either pane — changes sync to the other through its own CRDT replica.'),
  p(''),
]);

// Peer A owns the initial document.
const editorA = createEditor({ state: createEditorState({ registry, doc: seed }) });
const providerA = createNativeProvider({ schema: registry.schema, doc: editorA.state.doc, user: { name: 'Alice', color: '#2563eb' } });

// Peer B starts empty and joins by syncing A's full state.
const editorB = createEditor({ state: createEditorState({ registry }) });
const providerB = createNativeProvider({ schema: registry.schema, user: { name: 'Bob', color: '#db2777' } });

const bindingA = bindCrdt(editorA, providerA);
const bindingB = bindCrdt(editorB, providerB);

providerB.applyUpdate(providerA.encodeDelta());

// Live two-way transport, in memory (stand-in for a BroadcastChannel/WebSocket).
const offOpsA = providerA.onLocalOps(bytes => providerB.applyUpdate(bytes));
const offOpsB = providerB.onLocalOps(bytes => providerA.applyUpdate(bytes));

// Awareness (cursors) over the same in-memory channel.
const cursorsA = ref<RemoteCursor[]>([]);
const cursorsB = ref<RemoteCursor[]>([]);
const offCurA = providerA.onAwareness((cursors) => {
  cursorsA.value = cursors;
});
const offCurB = providerB.onAwareness((cursors) => {
  cursorsB.value = cursors;
});
const offAwA = providerA.onLocalAwareness(bytes => providerB.applyAwareness(bytes));
const offAwB = providerB.onLocalAwareness(bytes => providerA.applyAwareness(bytes));

onBeforeUnmount(() => {
  for (const off of [offOpsA, offOpsB, offCurA, offCurB, offAwA, offAwB])
    off();
  bindingA.detach();
  bindingB.detach();
});
</script>

<template>
  <section>
    <h2>Collaboration (own CRDT)</h2>
    <p class="hint">Two independent editors, each backed by a separate <code>@robonen/crdt</code> replica, synced in memory. Type in either pane — concurrent edits converge live and you'll see the other peer's cursor; no Yjs.</p>
    <div class="cols">
      <div>
        <div class="peer-label"><span class="peer-dot" style="background: #2563eb" />Alice</div>
        <EditorRoot :editor="editorA" autofocus class="editor collab">
          <EditorContent />
          <EditorRemoteCursors :cursors="cursorsA" />
          <EditorBubbleMenu />
          <EditorSlashMenu />
        </EditorRoot>
      </div>
      <div>
        <div class="peer-label"><span class="peer-dot" style="background: #db2777" />Bob</div>
        <EditorRoot :editor="editorB" class="editor collab">
          <EditorContent />
          <EditorRemoteCursors :cursors="cursorsB" />
          <EditorBubbleMenu />
          <EditorSlashMenu />
        </EditorRoot>
      </div>
    </div>
  </section>
</template>

<style scoped>
.peer-label { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #888; margin-bottom: 4px; }
.peer-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
</style>
