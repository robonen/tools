<script setup lang="ts">const { searchItems } = useDocs();

const isOpen = ref(false);
const query = ref('');

const results = computed(() => searchItems(query.value).slice(0, 20));

function open() {
  isOpen.value = true;
  nextTick(() => {
    const input = document.querySelector<HTMLInputElement>('[data-search-input]');
    input?.focus();
  });
}

function close() {
  isOpen.value = false;
  query.value = '';
}

// Keyboard shortcut: Cmd+K / Ctrl+K
if (import.meta.client) {
  useEventListener(window, 'keydown', (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (isOpen.value) close();
      else open();
    }
    if (e.key === 'Escape' && isOpen.value) {
      close();
    }
  });
}

function useEventListener(target: Window, event: string, handler: (e: any) => void) {
  onMounted(() => target.addEventListener(event, handler));
  onUnmounted(() => target.removeEventListener(event, handler));
}
</script>

<template>
  <div>
    <button
      class="flex items-center gap-2 px-3 py-1.5 text-sm text-(--color-text-mute) bg-(--color-bg-mute) border border-(--color-border) rounded-lg hover:border-(--color-text-mute) transition-colors"
      @click="open"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <span class="hidden sm:inline">Search...</span>
      <kbd class="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-(--color-bg) border border-(--color-border) rounded">
        <span>⌘</span>K
      </kbd>
    </button>

    <!-- Search modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="isOpen" class="fixed inset-0 z-50">
          <div class="fixed inset-0 bg-black/50" @click="close" />

          <div class="fixed inset-x-0 top-[10vh] mx-auto max-w-lg px-4">
            <div class="bg-(--color-bg) rounded-xl border border-(--color-border) shadow-2xl overflow-hidden">
              <div class="flex items-center px-4 border-b border-(--color-border)">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-(--color-text-mute) shrink-0">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  v-model="query"
                  data-search-input
                  type="text"
                  placeholder="Search documentation..."
                  class="w-full py-3 px-3 bg-transparent text-(--color-text) placeholder:text-(--color-text-mute) focus:outline-none"
                >
              </div>

              <div class="max-h-80 overflow-y-auto">
                <div v-if="query && results.length === 0" class="py-8 text-center text-sm text-(--color-text-mute)">
                  No results found
                </div>
                <ul v-else-if="results.length > 0" class="py-2">
                  <li v-for="{ pkg, item } in results" :key="`${pkg.slug}-${item.slug}`">
                    <NuxtLink
                      :to="`/${pkg.slug}/${item.slug}`"
                      class="flex items-center gap-3 px-4 py-2.5 hover:bg-(--color-bg-mute) transition-colors"
                      @click="close"
                    >
                      <DocsBadge :kind="item.kind" size="sm" />
                      <div class="min-w-0">
                        <div class="text-sm font-medium text-(--color-text) truncate">
                          {{ item.name }}
                        </div>
                        <div class="text-xs text-(--color-text-mute) truncate">
                          {{ pkg.name }} · {{ item.description }}
                        </div>
                      </div>
                    </NuxtLink>
                  </li>
                </ul>
                <div v-else class="py-8 text-center text-sm text-(--color-text-mute)">
                  Type to search...
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
