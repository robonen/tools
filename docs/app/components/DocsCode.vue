<script setup lang="ts">const props = defineProps<{
  code: string;
  lang?: string;
  /** Show the header bar with language label + copy button */
  bare?: boolean;
}>();

const { highlight } = useShiki();
const html = ref('');

const resolvedLang = computed(() => props.lang ?? 'typescript');
const langLabel = computed(() => ({
  typescript: 'ts',
  javascript: 'js',
  bash: 'sh',
  vue: 'vue',
  json: 'json',
}[resolvedLang.value] ?? resolvedLang.value));

async function render() {
  html.value = await highlight(props.code, resolvedLang.value);
}

onMounted(render);
watch(() => props.code, render);

const copied = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | undefined;

async function copy() {
  try {
    await navigator.clipboard.writeText(props.code);
    copied.value = true;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (copied.value = false), 1500);
  }
  catch { /* clipboard unavailable */ }
}
</script>

<template>
  <div class="group relative rounded-xl border border-(--border) bg-(--bg-subtle) overflow-hidden max-w-full">
    <div v-if="!bare" class="flex items-center justify-between px-3 h-9 border-b border-(--border) bg-(--bg-subtle)">
      <span class="text-[11px] font-mono uppercase tracking-wider text-(--fg-subtle)">{{ langLabel }}</span>
      <button
        type="button"
        class="inline-flex items-center gap-1 text-[11px] font-medium text-(--fg-subtle) hover:text-(--fg) transition-colors cursor-pointer"
        @click="copy"
      >
        <svg v-if="!copied" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        {{ copied ? 'Copied' : 'Copy' }}
      </button>
    </div>
    <button
      v-else
      type="button"
      class="absolute right-2 top-2 z-10 inline-flex items-center justify-center w-7 h-7 rounded-md bg-(--bg-elevated) border border-(--border) text-(--fg-subtle) opacity-0 group-hover:opacity-100 hover:text-(--fg) transition-all cursor-pointer"
      title="Copy"
      @click="copy"
    >
      <svg v-if="!copied" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </button>

    <div
      v-if="html"
      class="overflow-x-auto text-[13px] leading-relaxed [&_pre]:p-4 [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:min-w-0"
      v-html="html"
    />
    <pre v-else class="p-4 text-[13px] overflow-x-auto"><code>{{ code }}</code></pre>
  </div>
</template>
