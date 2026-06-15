<script setup lang="ts">
import {
  FlowBackground,
  FlowControls,
  FlowHandle,
  FlowMiniMap,
  FlowNodeResizer,
  FlowNodeToolbar,
  FlowPanel,
  FlowRoot,
} from '@robonen/primitives';
import type { FlowEdge, FlowNode } from '@robonen/primitives';
import { computed, ref, useTemplateRef } from 'vue';

interface NodeData {
  label: string;
  hint?: string;
}

const nodes = ref<FlowNode<NodeData>[]>([
  { id: 'group', type: 'group', position: { x: 380, y: 220 }, width: 360, height: 190, data: { label: 'Processing pipeline' }, selectable: true, draggable: true },
  { id: 'src', type: 'input', position: { x: 60, y: 120 }, data: { label: 'Source', hint: 'HTTP ingest' } },
  { id: 'norm', type: 'process', position: { x: 24, y: 60 }, parentId: 'group', extent: 'parent', data: { label: 'Normalize' } },
  { id: 'enrich', type: 'process', position: { x: 200, y: 60 }, parentId: 'group', extent: 'parent', data: { label: 'Enrich' } },
  { id: 'score', type: 'process', position: { x: 60, y: 300 }, data: { label: 'Score', hint: 'ML model' } },
  { id: 'sink', type: 'output', position: { x: 820, y: 180 }, data: { label: 'Sink', hint: 'Warehouse' } },
]);

const edges = ref<FlowEdge[]>([
  { id: 'e-src-norm', source: 'src', target: 'norm', type: 'smoothstep', animated: true, markerEnd: { type: 'arrowclosed' } },
  { id: 'e-norm-enrich', source: 'norm', target: 'enrich', type: 'smoothstep', markerEnd: { type: 'arrowclosed' } },
  { id: 'e-src-score', source: 'src', target: 'score', type: 'bezier', markerEnd: { type: 'arrowclosed' } },
  { id: 'e-enrich-sink', source: 'enrich', target: 'sink', type: 'labeled', label: 'records', markerEnd: { type: 'arrowclosed' } },
  { id: 'e-score-sink', source: 'score', target: 'sink', type: 'labeled', label: 'anomalies', markerEnd: { type: 'arrowclosed' } },
]);

const flow = useTemplateRef<InstanceType<typeof FlowRoot>>('flow');
const selectedCount = computed(() => {
  const sel = flow.value?.selection?.value;
  return sel ? sel.nodes.size + sel.edges.size : 0;
});

let seq = 0;
function addNode() {
  seq += 1;
  const id = `dyn-${seq}`;
  nodes.value = [...nodes.value, { id, type: 'process', position: { x: 120 + seq * 30, y: 440 + seq * 10 }, data: { label: `Step ${seq}` } }];
}

function removeNode(id: string) {
  nodes.value = nodes.value.filter(n => n.id !== id && n.parentId !== id);
  edges.value = edges.value.filter(e => e.source !== id && e.target !== id);
}

function duplicateNode(id: string) {
  const node = nodes.value.find(n => n.id === id);
  if (!node) return;
  seq += 1;
  nodes.value = [...nodes.value, { ...node, id: `${id}-copy-${seq}`, position: { x: node.position.x + 40, y: node.position.y + 40 }, parentId: undefined }];
}
</script>

<template>
  <div class="demo-card h-[520px] w-full overflow-hidden rounded-xl border border-border bg-bg-inset text-fg-subtle">
    <FlowRoot
      ref="flow"
      v-model:nodes="nodes"
      v-model:edges="edges"
      class="size-full"
      :min-zoom="0.2"
      :max-zoom="2.5"
      :snap-to-grid="true"
      :snap-grid="[16, 16]"
    >
      <!-- Group / subflow container -->
      <template #node-group="{ data, selected }">
        <div
          class="relative size-full rounded-xl border-2 border-dashed bg-accent/5"
          :class="selected ? 'border-accent' : 'border-border'"
        >
          <span class="absolute left-3 top-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">{{ data?.label }}</span>
          <FlowNodeResizer :min-width="220" :min-height="140" />
        </div>
      </template>

      <!-- Input node -->
      <template #node-input="{ id, data, selected }">
        <div
          class="relative flex min-w-[150px] flex-col rounded-lg border-l-4 border-l-success bg-bg px-4 py-2.5 shadow-sm transition"
          :class="selected ? 'border border-accent ring-2 ring-ring' : 'border border-border'"
        >
          <span class="text-sm font-semibold text-fg">{{ data?.label }}</span>
          <span v-if="data?.hint" class="text-xs text-fg-muted">{{ data.hint }}</span>
          <FlowHandle type="source" position="right" class="flow-handle" />
          <FlowNodeToolbar class="flow-toolbar">
            <button type="button" class="flow-tool-btn" @click="duplicateNode(id)">Duplicate</button>
            <button type="button" class="flow-tool-btn flow-tool-btn--danger" @click="removeNode(id)">Delete</button>
          </FlowNodeToolbar>
        </div>
      </template>

      <!-- Process node -->
      <template #node-process="{ id, data, selected }">
        <div
          class="relative flex min-w-[140px] items-center justify-center rounded-lg bg-bg px-4 py-3 text-sm font-medium text-fg shadow-sm transition"
          :class="selected ? 'border border-accent ring-2 ring-ring' : 'border border-border'"
        >
          <FlowHandle type="target" position="left" class="flow-handle" />
          {{ data?.label }}
          <FlowHandle type="source" position="right" class="flow-handle" />
          <FlowNodeToolbar class="flow-toolbar">
            <button type="button" class="flow-tool-btn" @click="duplicateNode(id)">Duplicate</button>
            <button type="button" class="flow-tool-btn flow-tool-btn--danger" @click="removeNode(id)">Delete</button>
          </FlowNodeToolbar>
        </div>
      </template>

      <!-- Output node -->
      <template #node-output="{ data, selected }">
        <div
          class="relative flex min-w-[150px] flex-col rounded-lg border-r-4 border-r-accent bg-bg px-4 py-2.5 shadow-sm transition"
          :class="selected ? 'border border-accent ring-2 ring-ring' : 'border border-border'"
        >
          <span class="text-sm font-semibold text-fg">{{ data?.label }}</span>
          <span v-if="data?.hint" class="text-xs text-fg-muted">{{ data.hint }}</span>
          <FlowHandle type="target" position="left" class="flow-handle" />
        </div>
      </template>

      <!-- Custom edge type with a label badge -->
      <template #edge-labeled="{ path, labelX, labelY, label, markerEndUrl }">
        <path :d="path" class="edge-base" fill="none" :marker-end="markerEndUrl" />
        <foreignObject :x="labelX - 44" :y="labelY - 12" width="88" height="24" style="overflow: visible">
          <div class="edge-label">{{ label }}</div>
        </foreignObject>
      </template>

      <!-- Chrome -->
      <FlowBackground variant="dots" :gap="20" class="text-border" />

      <FlowPanel position="top-left" class="m-3 rounded-lg border border-border bg-bg/85 px-3 py-2 text-xs shadow-sm backdrop-blur">
        <div class="font-semibold text-fg">Headless flow</div>
        <div class="mt-1 flex gap-3 text-fg-muted">
          <span>{{ nodes.length }} nodes</span>
          <span>{{ edges.length }} edges</span>
          <span>{{ selectedCount }} selected</span>
        </div>
      </FlowPanel>

      <FlowPanel position="top-right" class="m-3 flex gap-2">
        <button type="button" class="panel-btn" @click="addNode()">+ Node</button>
        <button type="button" class="panel-btn" @click="flow?.fitView()">Fit</button>
        <button type="button" class="panel-btn" @click="flow?.clearSelection()">Deselect</button>
      </FlowPanel>

      <FlowControls class="m-3 flex flex-col gap-1 rounded-lg border border-border bg-bg p-1 shadow-sm" />
      <FlowMiniMap class="m-3 rounded-lg border border-border bg-bg/80 text-fg-subtle shadow-sm backdrop-blur" :width="180" :height="120" />
    </FlowRoot>
  </div>
</template>

<style scoped>
:deep(.flow-handle) {
  width: 11px;
  height: 11px;
  border-radius: 9999px;
  background: var(--ui-accent, #6366f1);
  border: 2px solid var(--ui-bg, #fff);
  box-shadow: 0 0 0 1px var(--ui-border, #cbd5e1);
}
:deep(.flow-handle[data-handletype='target']) {
  background: var(--ui-bg, #fff);
}

:deep(.flow-toolbar) {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 8px;
  border: 1px solid var(--ui-border, #cbd5e1);
  background: var(--ui-bg, #fff);
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.12);
}
:deep(.flow-tool-btn) {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--ui-fg, #0f172a);
}
:deep(.flow-tool-btn:hover) {
  background: var(--ui-bg-inset, #f1f5f9);
}
:deep(.flow-tool-btn--danger:hover) {
  background: color-mix(in oklch, var(--ui-danger, #ef4444) 14%, transparent);
  color: var(--ui-danger, #ef4444);
}

:deep([data-flow-edge-path]),
.edge-base {
  stroke: var(--ui-border, #94a3b8);
  stroke-width: 1.5;
}
:deep([data-flow-edge][data-selected] [data-flow-edge-path]) {
  stroke: var(--ui-accent, #6366f1);
  stroke-width: 2;
}
:deep([data-flow-edge][data-animated] [data-flow-edge-path]) {
  stroke-dasharray: 6 4;
  animation: flow-dash 0.6s linear infinite;
}
@keyframes flow-dash {
  to { stroke-dashoffset: -10; }
}

.edge-label {
  display: inline-block;
  transform: translateX(-50%);
  margin-left: 44px;
  padding: 1px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  color: var(--ui-fg-muted, #64748b);
  background: var(--ui-bg, #fff);
  border: 1px solid var(--ui-border, #cbd5e1);
}

:deep([data-flow-connection-line] path) {
  stroke: var(--ui-accent, #6366f1);
  stroke-width: 2;
  stroke-dasharray: 4 4;
}
:deep([data-flow-selection-rect]) {
  border: 1px solid var(--ui-accent, #6366f1);
  background: color-mix(in oklch, var(--ui-accent, #6366f1) 12%, transparent);
}

:deep([data-flow-control]) {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.375rem;
  cursor: pointer;
  color: var(--ui-fg, #0f172a);
}
:deep([data-flow-control]:hover) {
  background: var(--ui-bg-inset, #f1f5f9);
}

.panel-btn {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  color: var(--ui-fg, #0f172a);
  background: var(--ui-bg, #fff);
  border: 1px solid var(--ui-border, #cbd5e1);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
}
.panel-btn:hover {
  background: var(--ui-bg-inset, #f1f5f9);
}

:deep([data-flow-minimap-node]) {
  fill: var(--ui-fg-subtle, #94a3b8);
}
:deep([data-flow-minimap-node][data-selected]) {
  fill: var(--ui-accent, #6366f1);
}
:deep([data-flow-minimap-mask]) {
  stroke: var(--ui-accent, #6366f1);
  fill: color-mix(in oklch, var(--ui-accent, #6366f1) 8%, transparent);
}
</style>
