<script setup lang="ts">import type { EmitMeta } from '../../modules/extractor/types';

defineProps<{
  emits: EmitMeta[];
}>();
</script>

<template>
  <div v-if="emits.length > 0" class="overflow-hidden rounded-xl border border-(--border)">
    <table class="w-full text-sm border-collapse">
      <thead>
        <tr class="bg-(--bg-subtle) text-left">
          <th class="py-2.5 px-4 font-medium text-(--fg-muted) text-xs uppercase tracking-wider">Event</th>
          <th class="py-2.5 px-4 font-medium text-(--fg-muted) text-xs uppercase tracking-wider">Payload</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="e in emits" :key="e.name" class="border-t border-(--border) align-top">
          <td class="py-2.5 px-4 whitespace-nowrap">
            <code class="text-(--accent-text) font-mono text-[13px] font-medium">{{ e.name }}</code>
          </td>
          <td class="py-2.5 px-4">
            <code class="text-xs font-mono text-(--fg-muted) bg-(--bg-inset) px-1.5 py-0.5 rounded border border-(--border) wrap-break-word">{{ e.payload }}</code>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
