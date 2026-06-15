<script setup lang="ts">
import { ref, shallowRef, useTemplateRef } from 'vue';
import { useMutationObserver } from './index';

const target = useTemplateRef<HTMLElement>('target');

// Mutable state that drives the observed element so changes are visible.
const labels = ref(['Inbox', 'Drafts', 'Archive']);
const accent = ref(false);
const fontSize = ref(14);

const mutationCount = shallowRef(0);
const lastType = shallowRef<MutationRecordType | '—'>('—');
const log = ref<string[]>([]);

const { isSupported, isActive, pause, resume } = useMutationObserver(
  target,
  (records) => {
    for (const record of records) {
      mutationCount.value++;
      lastType.value = record.type;

      let detail = record.type as string;
      if (record.type === 'attributes')
        detail = `attribute "${record.attributeName}"`;
      else if (record.type === 'childList')
        detail = `children +${record.addedNodes.length} −${record.removedNodes.length}`;

      log.value.unshift(detail);
      if (log.value.length > 5)
        log.value.pop();
    }
  },
  { attributes: true, childList: true, subtree: true, attributeFilter: ['style', 'class'] },
);

function addLabel() {
  const pool = ['Spam', 'Sent', 'Starred', 'Trash', 'Snoozed', 'Important'];
  labels.value.push(pool[labels.value.length % pool.length]);
}

function removeLabel() {
  labels.value.pop();
}
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div class="flex items-center justify-between">
      <span class="demo-label">MutationObserver</span>
      <span class="demo-badge">
        <span class="size-1.5 rounded-full transition" :class="isActive ? 'bg-emerald-500' : 'bg-amber-500'" />
        {{ isActive ? 'Observing' : 'Paused' }}
      </span>
    </div>

    <p v-if="!isSupported" class="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
      MutationObserver is not supported in this browser.
    </p>

    <template v-else>
      <!-- Observed subtree: every attribute/child change fires the callback -->
      <div
        ref="target"
        class="rounded-xl border p-4 transition"
        :class="accent ? 'border-accent bg-accent-subtle' : 'border-border bg-bg-elevated'"
        :style="{ fontSize: `${fontSize}px` }"
      >
        <div class="mb-2 text-xs font-medium uppercase tracking-wide" :class="accent ? 'text-accent-text' : 'text-fg-subtle'">
          Observed element
        </div>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="(label, i) in labels"
            :key="`${label}-${i}`"
            class="inline-flex items-center rounded-md border border-border bg-bg-inset px-2 py-0.5 text-xs font-medium text-fg-muted"
          >
            {{ label }}
          </span>
          <span v-if="!labels.length" class="text-xs text-fg-subtle">No labels</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div class="rounded-lg border border-border bg-bg-inset p-3 text-center">
          <div class="demo-stat text-3xl">{{ mutationCount }}</div>
          <div class="text-[10px] uppercase tracking-wide text-fg-subtle">mutations</div>
        </div>
        <div class="rounded-lg border border-border bg-bg-inset p-3 text-center">
          <div class="truncate font-mono text-sm font-bold text-fg">{{ lastType }}</div>
          <div class="text-[10px] uppercase tracking-wide text-fg-subtle">last record type</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class="demo-btn"
          @click="addLabel"
        >
          Add child
        </button>
        <button
          type="button"
          class="demo-btn disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="!labels.length"
          @click="removeLabel"
        >
          Remove child
        </button>
        <button
          type="button"
          class="demo-btn"
          @click="accent = !accent"
        >
          Toggle class
        </button>
        <button
          type="button"
          class="demo-btn"
          @click="fontSize = fontSize === 14 ? 18 : 14"
        >
          Toggle style
        </button>
      </div>

      <div class="rounded-lg border border-border bg-bg-inset p-3">
        <div class="demo-label mb-1.5">Recent records</div>
        <ul v-if="log.length" class="flex flex-col gap-1 font-mono text-xs text-fg">
          <li v-for="(entry, i) in log" :key="i" class="truncate">{{ entry }}</li>
        </ul>
        <p v-else class="font-mono text-xs text-fg-subtle">Mutate the element above to record changes.</p>
      </div>

      <button
        type="button"
        class="demo-btn-primary"
        @click="isActive ? pause() : resume()"
      >
        {{ isActive ? 'Pause observer' : 'Resume observer' }}
      </button>
    </template>
  </div>
</template>
