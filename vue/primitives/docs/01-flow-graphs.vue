<!-- title: Building flow graphs -->
<script setup lang="ts">
// Prose + snippets only — static content, prerenders cleanly.

const minimal = `<script setup lang="ts">
import { FlowBackground, FlowControls, FlowRoot } from '@robonen/primitives';
import type { FlowEdge, FlowNode } from '@robonen/primitives';

const nodes: FlowNode[] = [
  { id: 'a', position: { x: 0, y: 0 }, data: { label: 'Start' } },
  { id: 'b', position: { x: 260, y: 120 }, data: { label: 'Finish' } },
];
const edges: FlowEdge[] = [
  { id: 'a-b', source: 'a', target: 'b', label: 'then' },
];
<\/script>

<template>
  <!-- The pane fills this element — give it a real height. -->
  <div style="height: 480px">
    <FlowRoot :default-nodes="nodes" :default-edges="edges" fit-view-on-mount>
      <template #node-default="{ node }">
        <div class="card">{{ node.data.label }}</div>
      </template>

      <FlowBackground />
      <FlowControls />
    </FlowRoot>
  </div>
</template>`;

const customNode = `<!-- Register per-type renderers via nodeTypes (module-level map)… -->
<FlowRoot :node-types="{ scene: SceneNode }" … />

<!-- …or inline via a #node-<type> scoped slot: -->
<FlowRoot :default-nodes="nodes">
  <template #node-scene="{ node, selected }">
    <article :data-selected="selected" class="scene">
      <h4>{{ node.data.title }}</h4>

      <!-- One SOURCE handle per row: anchor it to the row, not the side's
           midpoint — same-position handles of one type otherwise overlap. -->
      <div v-for="option in node.data.options" :key="option.id" class="row">
        {{ option.label }}
        <FlowHandle
          :id="'opt:' + option.id"
          type="source"
          position="right"
          class="row-port"
        />
      </div>
    </article>
  </template>
</FlowRoot>`;

const nodrag = `<!-- Form controls inside a node already win over dragging:
     input, textarea, select, button, [contenteditable], [data-handleid]
     start no drag. Everything else opts out with the .nodrag class: -->
<template #node-scene="{ node }">
  <div class="scene">
    <button @click="open(node.id)">Edit</button>   <!-- just works -->
    <div class="nodrag">
      <MyColorWheel />                              <!-- opted out -->
    </div>
  </div>
</template>`;

const events = `<FlowRoot
  :default-nodes="nodes"
  @node-click="(id) => select(id)"
  @node-double-click="(id) => openEditor(id)"
  @node-drag-stop="(ids) => persistPositions(ids)"
  @pane-click="clearInspector()"
  @edge-click="(id) => selectEdge(id)"
/>`;

const instance = `<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { FlowRoot } from '@robonen/primitives';

const flow = useTemplateRef('flow');

function frameSelection(ids: string[]) {
  flow.value?.fitView({ padding: 0.2, nodes: ids });
}

function addAtCursor(event: MouseEvent) {
  const position = flow.value!.screenToFlowPosition({
    x: event.clientX,
    y: event.clientY,
  });
  // …push a node at \`position\`
}
<\/script>

<template>
  <FlowRoot ref="flow" :default-nodes="nodes" fit-view-on-mount />
</template>`;
</script>

<template>
  <div class="docs-section">
    <div class="prose-docs">
      <h1>Building flow graphs</h1>
      <p>
        <code>Flow</code> is a headless node-and-edge canvas: panning, zooming,
        dragging, connecting, selection and virtualization are handled for you;
        every pixel of a node is yours. This guide covers the contracts that are
        easy to miss: sizing, custom nodes, drag opt-out, events and the
        imperative API.
      </p>

      <h2>A minimal graph</h2>
      <p>
        The pane fills its nearest sized ancestor — the graph lives in
        absolutely-positioned layers, so the <em>host</em> element must have a
        real height. <code>fit-view-on-mount</code> frames the graph once nodes
        are measured; it is skipped when you control the viewport yourself
        (<code>v-model:viewport</code> / <code>defaultViewport</code>).
      </p>
    </div>

    <DocsCode :code="minimal" lang="vue" />

    <div class="prose-docs">
      <h2>Custom nodes</h2>
      <p>
        Nodes render through a component map (<code>nodeTypes</code>, keyed by
        <code>node.type</code>) or a <code>#node-&lt;type&gt;</code> scoped
        slot. The slot receives the internal node (<code>node.data</code> is
        yours) and its <code>selected</code> state. Place
        <code>FlowHandle</code>s anywhere inside — give repeated same-side
        handles their own anchors, since handles of one type default to the
        side's midpoint and would overlap.
      </p>
    </div>

    <DocsCode :code="customNode" lang="vue" />

    <div class="prose-docs">
      <h2>Interactive content and <code>.nodrag</code></h2>
      <p>
        The drag layer owns <code>pointerdown</code> on the node. Native form
        controls (<code>input</code>, <code>textarea</code>, <code>select</code>,
        <code>button</code>), <code>[contenteditable]</code> elements and
        handles are excluded automatically; any other interactive element opts
        out of dragging with the <code>.nodrag</code> class.
      </p>
    </div>

    <DocsCode :code="nodrag" lang="vue" />

    <div class="prose-docs">
      <h2>Click, double-click, drag</h2>
      <p>
        The drag layer distinguishes a settled click from a drag, so
        <code>@node-click</code> never fires after a real move, and
        <code>@node-double-click</code> pairs two settled clicks — double-click
        on a node does <em>not</em> zoom the canvas. Positions are persisted
        from <code>@node-drag-stop</code>, which reports every node that moved.
      </p>
    </div>

    <DocsCode :code="events" lang="vue" />

    <div class="prose-docs">
      <h2>The instance API</h2>
      <p>
        <code>FlowRoot</code> exposes its whole imperative surface through the
        template ref — <code>fitView</code>, zooming, viewport get/set,
        coordinate conversion (<code>screenToFlowPosition</code> /
        <code>flowToScreenPosition</code>), node/edge lookups and selection
        control. The full list is on the <code>Flow</code> component page under
        <em>Exposes</em>.
      </p>
    </div>

    <DocsCode :code="instance" lang="vue" />

    <div class="prose-docs">
      <h2>Edge labels</h2>
      <p>
        An edge with a <code>label</code> renders it at the path midpoint as
        <code>[data-flow-edge-label]</code>, haloed with
        <code>--flow-edge-label-halo</code> (defaults to white) so it stays
        readable over the wire. For richer labels, take over the edge with
        <code>edgeTypes</code> or an <code>#edge-&lt;type&gt;</code> slot.
      </p>
    </div>
  </div>
</template>
