<script setup lang="ts">const props = defineProps<{
  code: string;
  lang?: string;
}>();

const { highlight } = useShiki();
const html = ref('');

onMounted(async () => {
  html.value = await highlight(props.code, props.lang ?? 'typescript');
});

watch(() => props.code, async (newCode) => {
  html.value = await highlight(newCode, props.lang ?? 'typescript');
});
</script>

<template>
  <div class="code-block relative group rounded-lg border border-(--color-border) overflow-hidden max-w-full">
    <div
      v-if="html"
      class="overflow-x-auto text-sm leading-relaxed [&_pre]:p-4 [&_pre]:m-0 [&_pre]:min-w-0"
      v-html="html"
    />
    <pre v-else class="p-4 text-sm bg-(--color-bg-soft) overflow-x-auto"><code>{{ code }}</code></pre>
  </div>
</template>
