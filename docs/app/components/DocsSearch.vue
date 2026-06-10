<script setup lang="ts">const { search } = useDocs();

const isOpen = ref(false);
const query = ref('');
const activeIndex = ref(0);

const results = computed(() => search(query.value).slice(0, 24));

watch(results, () => {
  activeIndex.value = 0;
});

function open() {
  isOpen.value = true;
  nextTick(() => document.querySelector<HTMLInputElement>('[data-search-input]')?.focus());
}

function close() {
  isOpen.value = false;
  query.value = '';
}

const router = useRouter();
function goTo(slug: string) {
  const r = results.value[activeIndex.value];
  // slug param kept for click handlers that pass an explicit target
  const target = slug || (r ? `/${r.pkg.slug}/${r.slug}` : '');
  if (target) {
    router.push(target);
    close();
  }
}

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    if (isOpen.value) close();
    else open();
    return;
  }
  if (!isOpen.value) return;

  if (e.key === 'Escape') {
    close();
  }
  else if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeIndex.value = Math.min(activeIndex.value + 1, results.value.length - 1);
  }
  else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeIndex.value = Math.max(activeIndex.value - 1, 0);
  }
  else if (e.key === 'Enter') {
    e.preventDefault();
    goTo('');
  }
}

onMounted(() => globalThis.addEventListener('keydown', onKeydown));
onUnmounted(() => globalThis.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div>
    <button
      type="button"
      class="flex items-center gap-2 px-2.5 h-9 text-sm text-(--fg-subtle) bg-(--bg-subtle) border border-(--border) rounded-lg hover:border-(--border-strong) transition-colors w-9 sm:w-56 justify-center sm:justify-start cursor-pointer"
      @click="open"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
      </svg>
      <span class="hidden sm:inline flex-1 text-left font-mono text-[13px]">search…</span>
      <kbd class="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-(--bg) border border-(--border) rounded text-(--fg-subtle)">⌘K</kbd>
    </button>

    <Teleport to="body">
      <Transition
        enter-active-class="duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0"
      >
        <div v-if="isOpen" class="fixed inset-0 z-100">
          <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="close" />

          <div class="fixed inset-x-0 top-[12vh] mx-auto max-w-xl px-4">
            <div class="bg-(--bg-elevated) rounded-xl border border-(--border) shadow-2xl overflow-hidden">
              <div class="flex items-center px-4 border-b border-(--border)">
                <span class="font-mono text-base text-(--accent-text) select-none shrink-0">❯</span>
                <input
                  v-model="query"
                  data-search-input
                  type="text"
                  placeholder="search across all packages…"
                  class="w-full py-3.5 px-3 bg-transparent text-(--fg) placeholder:text-(--fg-subtle) focus:outline-none font-mono text-[14px]"
                >
                <kbd class="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-(--bg-inset) border border-(--border) rounded text-(--fg-subtle)">ESC</kbd>
              </div>

              <div class="max-h-[60vh] overflow-y-auto p-2">
                <div v-if="query && results.length === 0" class="py-12 text-center text-sm text-(--fg-subtle)">
                  No results for "{{ query }}"
                </div>
                <ul v-else-if="results.length > 0" class="space-y-0.5">
                  <li v-for="(r, i) in results" :key="`${r.pkg.slug}-${r.slug}`">
                    <NuxtLink
                      :to="`/${r.pkg.slug}/${r.slug}`"
                      :class="[
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                        i === activeIndex ? 'bg-(--accent-subtle)' : 'hover:bg-(--bg-inset)',
                      ]"
                      @click="close"
                      @mouseenter="activeIndex = i"
                    >
                      <DocsBadge :kind="r.badge" size="sm" />
                      <div class="min-w-0 flex-1">
                        <div class="text-sm font-medium text-(--fg) truncate">{{ r.name }}</div>
                        <div class="text-xs text-(--fg-subtle) truncate">{{ r.pkg.name }} · {{ r.description }}</div>
                      </div>
                    </NuxtLink>
                  </li>
                </ul>
                <div v-else class="py-12 text-center text-sm text-(--fg-subtle)">
                  Type to search functions, components &amp; guides…
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
