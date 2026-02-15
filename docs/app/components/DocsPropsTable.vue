<script setup lang="ts">
import type { PropertyMeta } from '../../modules/extractor/types';

defineProps<{
  properties: PropertyMeta[];
}>();
</script>

<template>
  <div v-if="properties.length > 0" class="overflow-x-auto max-w-full">
    <table class="w-full text-sm border-collapse table-fixed">
      <thead>
        <tr class="border-b border-(--color-border)">
          <th class="text-left py-2 pr-4 font-medium text-(--color-text-soft)">Property</th>
          <th class="text-left py-2 pr-4 font-medium text-(--color-text-soft)">Type</th>
          <th class="text-left py-2 pr-4 font-medium text-(--color-text-soft)">Default</th>
          <th class="text-left py-2 font-medium text-(--color-text-soft)">Description</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="prop in properties"
          :key="prop.name"
          class="border-b border-(--color-border) last:border-b-0"
        >
          <td class="py-2 pr-4">
            <code class="text-brand-600 font-mono text-xs">{{ prop.name }}</code>
            <span v-if="prop.readonly" class="text-(--color-text-mute) text-[10px] ml-1 uppercase">readonly</span>
            <span v-if="prop.optional" class="text-(--color-text-mute) text-xs ml-1">?</span>
          </td>
          <td class="py-2 pr-4 max-w-48 overflow-hidden">
            <code class="text-xs font-mono text-(--color-text-soft) bg-(--color-bg-mute) px-1.5 py-0.5 rounded break-all">{{ prop.type }}</code>
          </td>
          <td class="py-2 pr-4">
            <code v-if="prop.defaultValue" class="text-xs font-mono text-(--color-text-mute)">{{ prop.defaultValue }}</code>
            <span v-else class="text-(--color-text-mute)">—</span>
          </td>
          <td class="py-2 text-(--color-text-soft)">
            {{ prop.description || '—' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
