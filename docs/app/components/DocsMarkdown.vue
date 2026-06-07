<script setup lang="ts">const props = defineProps<{
  source: string;
}>();

const { highlight } = useShiki();

const html = computed(() => renderMarkdown(props.source));
const root = ref<HTMLElement | null>(null);

/** Replace marked's <pre><code> blocks with Shiki-highlighted markup. */
async function highlightCodeBlocks() {
  const el = root.value;
  if (!el) return;

  const blocks = Array.from(el.querySelectorAll('pre > code'));
  for (const code of blocks) {
    const langClass = Array.from(code.classList).find(c => c.startsWith('language-'));
    const lang = langClass?.replace('language-', '') || 'typescript';
    const supported = ['typescript', 'javascript', 'ts', 'js', 'vue', 'json', 'bash', 'sh'];
    const resolved = supported.includes(lang)
      ? ({ ts: 'typescript', js: 'javascript', sh: 'bash' }[lang] ?? lang)
      : 'typescript';

    const text = code.textContent ?? '';
    const pre = code.parentElement;
    if (!pre) continue;

    try {
      const out = await highlight(text, resolved);
      const wrapper = document.createElement('div');
      wrapper.className = 'not-prose rounded-xl border border-(--border) bg-(--bg-subtle) overflow-x-auto text-[13px] my-5 [&_pre]:p-4 [&_pre]:m-0 [&_pre]:bg-transparent!';
      wrapper.innerHTML = out;
      pre.replaceWith(wrapper);
    }
    catch { /* leave the fallback <pre> as-is */ }
  }
}

onMounted(highlightCodeBlocks);
watch(() => props.source, async () => {
  await nextTick();
  await highlightCodeBlocks();
});
</script>

<template>
  <div ref="root" class="prose-docs max-w-none" v-html="html" />
</template>
