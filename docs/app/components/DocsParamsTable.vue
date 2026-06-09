<script setup lang="ts">import type { ParamMeta } from '../../modules/extractor/types';

defineProps<{
  params: ParamMeta[];
}>();
</script>

<template>
  <div v-if="params.length > 0" class="overflow-x-auto rounded-xl border border-(--border)">
    <table class="w-full text-sm border-collapse">
      <thead>
        <tr class="bg-(--bg-subtle) text-left">
          <th class="py-2.5 px-4 font-medium text-(--fg-muted) text-xs uppercase tracking-wider">Parameter</th>
          <th class="py-2.5 px-4 font-medium text-(--fg-muted) text-xs uppercase tracking-wider">Type</th>
          <th class="py-2.5 px-4 font-medium text-(--fg-muted) text-xs uppercase tracking-wider hidden sm:table-cell">Default</th>
          <th class="py-2.5 px-4 font-medium text-(--fg-muted) text-xs uppercase tracking-wider">Description</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="param in params"
          :key="param.name"
          class="border-t border-(--border) align-top"
        >
          <td class="py-2.5 px-4 whitespace-nowrap">
            <code class="text-(--accent-text) font-mono text-[13px] font-medium">{{ param.name }}</code><span v-if="param.optional" class="text-(--fg-subtle) text-xs">?</span>
          </td>
          <td class="py-2.5 px-4">
            <code class="text-xs font-mono text-(--fg-muted) bg-(--bg-inset) px-1.5 py-0.5 rounded border border-(--border) wrap-break-word">{{ param.type }}</code>
          </td>
          <td class="py-2.5 px-4 hidden sm:table-cell">
            <code v-if="param.defaultValue" class="text-xs font-mono text-(--fg-muted)">{{ param.defaultValue }}</code>
            <span v-else class="text-(--fg-subtle)">—</span>
          </td>
          <td class="py-2.5 px-4 text-(--fg-muted) min-w-48">
            <DocsText v-if="param.description" :text="param.description" />
            <span v-else>—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
