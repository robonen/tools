<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { useParentElement } from './index';

const child = useTemplateRef<HTMLElement>('child');

// useParentElement returns a read-only shallow ref of the element's parent.
const parent = useParentElement(child);

// Reparent the child between two wrappers to watch the resolved parent change.
const inSecond = ref(false);

const parentInfo = computed(() => {
  const el = parent.value;
  if (!el)
    return null;

  return {
    tag: el.tagName.toLowerCase(),
    id: el.id || '—',
    classes: el.className || '—',
    width: Math.round(el.getBoundingClientRect().width),
    height: Math.round(el.getBoundingClientRect().height),
  };
});
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">parentElement</span>

    <!-- Two candidate parents; the child is teleported between them via v-if -->
    <div class="flex flex-col gap-3">
      <div
        id="wrapper-a"
        class="rounded-xl border border-dashed p-3 transition"
        :class="!inSecond ? 'border-(--accent) bg-(--accent-subtle)' : 'border-(--border) bg-(--bg-elevated)'"
      >
        <div class="mb-2 text-xs font-medium uppercase tracking-wide" :class="!inSecond ? 'text-(--accent-text)' : 'text-(--fg-subtle)'">
          #wrapper-a
        </div>
        <div
          v-if="!inSecond"
          ref="child"
          class="rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-2 text-sm font-medium text-(--fg)"
        >
          Tracked child
        </div>
        <div v-else class="text-xs text-(--fg-subtle)">empty</div>
      </div>

      <div
        id="wrapper-b"
        class="rounded-xl border border-dashed p-3 transition"
        :class="inSecond ? 'border-(--accent) bg-(--accent-subtle)' : 'border-(--border) bg-(--bg-elevated)'"
      >
        <div class="mb-2 text-xs font-medium uppercase tracking-wide" :class="inSecond ? 'text-(--accent-text)' : 'text-(--fg-subtle)'">
          #wrapper-b
        </div>
        <div
          v-if="inSecond"
          ref="child"
          class="rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-2 text-sm font-medium text-(--fg)"
        >
          Tracked child
        </div>
        <div v-else class="text-xs text-(--fg-subtle)">empty</div>
      </div>
    </div>

    <button
      type="button"
      class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
      @click="inSecond = !inSecond"
    >
      Move child to #wrapper-{{ inSecond ? 'a' : 'b' }}
    </button>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) tabular-nums">
      <div class="mb-2 font-sans text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Resolved parent</div>
      <template v-if="parentInfo">
        <div class="flex justify-between gap-2">
          <span class="text-(--fg-subtle)">tag</span>
          <span class="text-(--accent-text)">&lt;{{ parentInfo.tag }}&gt;</span>
        </div>
        <div class="flex justify-between gap-2">
          <span class="text-(--fg-subtle)">id</span>
          <span class="truncate">{{ parentInfo.id }}</span>
        </div>
        <div class="flex justify-between gap-2">
          <span class="text-(--fg-subtle)">size</span>
          <span>{{ parentInfo.width }} × {{ parentInfo.height }}</span>
        </div>
      </template>
      <div v-else class="font-sans text-xs text-(--fg-subtle)">Resolving parent on the client…</div>
    </div>
  </div>
</template>
