<script setup lang="ts">import type { PropertyMeta } from '../../modules/extractor/types';

defineProps<{
  properties: PropertyMeta[];
  /** Column label for the first column */
  label?: string;
}>();
</script>

<template>
  <div v-if="properties.length > 0" class="overflow-x-auto rounded-xl border border-(--border)">
    <table class="w-full text-sm border-collapse">
      <thead>
        <tr class="bg-(--bg-subtle) text-left">
          <th class="py-2.5 px-4 font-medium text-(--fg-muted) text-xs uppercase tracking-wider">{{ label ?? 'Property' }}</th>
          <th class="py-2.5 px-4 font-medium text-(--fg-muted) text-xs uppercase tracking-wider">Type</th>
          <th class="py-2.5 px-4 font-medium text-(--fg-muted) text-xs uppercase tracking-wider hidden sm:table-cell">Default</th>
          <th class="py-2.5 px-4 font-medium text-(--fg-muted) text-xs uppercase tracking-wider">Description</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="prop in properties"
          :key="prop.name"
          class="border-t border-(--border) align-top"
        >
          <td class="py-2.5 px-4 whitespace-nowrap">
            <code class="text-(--accent-text) font-mono text-[13px] font-medium">{{ prop.name }}</code><span v-if="prop.optional" class="text-(--fg-subtle) text-xs">?</span>
            <span v-if="prop.readonly" class="block text-[10px] text-(--fg-subtle) uppercase tracking-wide mt-0.5">readonly</span>
          </td>
          <td class="py-2.5 px-4">
            <code class="text-xs font-mono text-(--fg-muted) bg-(--bg-inset) px-1.5 py-0.5 rounded border border-(--border) wrap-break-word">{{ prop.type }}</code>
          </td>
          <td class="py-2.5 px-4 hidden sm:table-cell">
            <code v-if="prop.defaultValue" class="text-xs font-mono text-(--fg-muted)">{{ prop.defaultValue }}</code>
            <span v-else class="text-(--fg-subtle)">—</span>
          </td>
          <td class="py-2.5 px-4 text-(--fg-muted) min-w-48">
            {{ prop.description || '—' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
