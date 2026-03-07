<script setup lang="ts">import type { MethodMeta } from '../../modules/extractor/types';

defineProps<{
  methods: MethodMeta[];
}>();
</script>

<template>
  <div v-if="methods.length > 0" class="space-y-4">
    <div
      v-for="method in methods"
      :key="method.name"
      class="border border-(--color-border) rounded-lg p-4"
    >
      <div class="flex items-center gap-2 mb-2">
        <code class="text-sm font-mono font-semibold text-(--color-text)">{{ method.name }}</code>
        <span
          v-if="method.visibility !== 'public'"
          class="text-[10px] uppercase px-1.5 py-0.5 rounded bg-(--color-bg-mute) text-(--color-text-mute)"
        >
          {{ method.visibility }}
        </span>
      </div>

      <p v-if="method.description" class="text-sm text-(--color-text-soft) mb-3">
        {{ method.description }}
      </p>

      <DocsCode
        v-for="(sig, i) in method.signatures"
        :key="i"
        :code="sig"
        class="mb-3"
      />

      <DocsParamsTable v-if="method.params.length > 0" :params="method.params" />

      <div v-if="method.returns" class="mt-2 text-sm">
        <span class="text-(--color-text-mute)">Returns:</span>
        <code class="ml-1 text-xs font-mono bg-(--color-bg-mute) px-1.5 py-0.5 rounded">{{ method.returns.type }}</code>
        <span v-if="method.returns.description" class="ml-2 text-(--color-text-soft)">{{ method.returns.description }}</span>
      </div>
    </div>
  </div>
</template>
