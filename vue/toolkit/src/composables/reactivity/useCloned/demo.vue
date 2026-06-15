<script setup lang="ts">
import { reactive } from 'vue';
import { useCloned } from './index';

const original = reactive({
  name: 'Ada Lovelace',
  role: 'Maintainer',
  tags: ['core', 'docs'],
});

const { cloned, isModified, sync } = useCloned(() => ({ ...original, tags: [...original.tags] }));

const roles = ['Maintainer', 'Contributor', 'Reviewer'];

function bumpOriginal() {
  original.role = roles[(roles.indexOf(original.role) + 1) % roles.length];
}

function addTag() {
  cloned.value.tags.push(`tag-${cloned.value.tags.length + 1}`);
}
</script>

<template>
  <div class="demo-stack max-w-md">
    <div class="flex items-center justify-between">
      <span class="demo-label">useCloned</span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition"
        :class="isModified
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'"
      >
        <span
          class="size-1.5 rounded-full"
          :class="isModified ? 'bg-amber-500' : 'bg-emerald-500'"
        />
        {{ isModified ? 'Modified' : 'In sync' }}
      </span>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="demo-card p-4">
        <p class="demo-label mb-2">Source</p>
        <dl class="space-y-1.5 text-sm text-fg">
          <div class="flex justify-between gap-2">
            <dt class="text-fg-muted">name</dt>
            <dd class="truncate font-medium">{{ original.name }}</dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt class="text-fg-muted">role</dt>
            <dd class="font-medium">{{ original.role }}</dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt class="text-fg-muted">tags</dt>
            <dd class="font-mono text-xs text-fg-muted">{{ original.tags.length }}</dd>
          </div>
        </dl>
      </div>

      <div class="demo-card p-4">
        <p class="demo-label mb-2">Cloned (editable)</p>
        <dl class="space-y-1.5 text-sm text-fg">
          <div class="flex justify-between gap-2">
            <dt class="text-fg-muted">name</dt>
            <dd class="truncate font-medium">{{ cloned.name }}</dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt class="text-fg-muted">role</dt>
            <dd class="font-medium">{{ cloned.role }}</dd>
          </div>
          <div class="flex flex-wrap justify-end gap-1">
            <span
              v-for="tag in cloned.tags"
              :key="tag"
              class="inline-flex items-center rounded-md border border-border bg-bg-inset px-1.5 py-0.5 font-mono text-[0.65rem] text-fg-muted"
            >
              {{ tag }}
            </span>
          </div>
        </dl>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="demo-btn"
        @click="bumpOriginal"
      >
        Cycle source role
      </button>
      <button
        type="button"
        class="demo-btn"
        @click="addTag"
      >
        Edit clone
      </button>
      <button
        type="button"
        class="demo-btn-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="!isModified"
        @click="sync()"
      >
        Re-sync from source
      </button>
    </div>

    <p class="text-xs text-fg-subtle">
      Editing the source auto-resyncs the clone. Editing the clone marks it modified without touching the source.
    </p>
  </div>
</template>
