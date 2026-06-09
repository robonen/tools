<script setup lang="ts">import type { MethodMeta } from '../../modules/extractor/types';

defineProps<{
  methods: MethodMeta[];
}>();
</script>

<template>
  <div v-if="methods.length > 0" class="space-y-3">
    <div
      v-for="method in methods"
      :key="method.name"
      class="rounded-xl border border-(--border) bg-(--bg-subtle) p-4"
    >
      <div class="flex items-center gap-2 mb-2">
        <code class="text-sm font-mono font-semibold text-(--fg)">{{ method.name }}</code>
        <span
          v-if="method.visibility !== 'public'"
          class="text-[10px] uppercase px-1.5 py-0.5 rounded bg-(--bg-inset) border border-(--border) text-(--fg-subtle)"
        >
          {{ method.visibility }}
        </span>
      </div>

      <p v-if="method.description" class="text-sm text-(--fg-muted) mb-3">
        <DocsText :text="method.description" />
      </p>

      <DocsCode
        v-for="(sig, i) in method.signatures"
        :key="i"
        :code="sig"
        class="mb-3"
      />

      <DocsParamsTable v-if="method.params.length > 0" :params="method.params" />

      <div v-if="method.returns" class="mt-2 text-sm">
        <span class="text-(--fg-subtle)">Returns</span>
        <code class="ml-1.5 text-xs font-mono bg-(--bg-inset) border border-(--border) px-1.5 py-0.5 rounded">{{ method.returns.type }}</code>
        <DocsText v-if="method.returns.description" :text="method.returns.description" class="ml-2 text-(--fg-muted)" />
      </div>
    </div>
  </div>
</template>
