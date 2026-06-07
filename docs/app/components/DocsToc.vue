<script setup lang="ts">interface TocItem {
  id: string;
  text: string;
  depth: number;
}

const props = defineProps<{
  items: TocItem[];
}>();

const activeId = ref<string>('');
let observer: IntersectionObserver | null = null;

function setup() {
  if (!import.meta.client || props.items.length === 0) return;

  observer?.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) activeId.value = entry.target.id;
      }
    },
    { rootMargin: '0px 0px -75% 0px', threshold: 0 },
  );

  for (const item of props.items) {
    const el = document.getElementById(item.id);
    if (el) observer.observe(el);
  }
}

onMounted(() => nextTick(setup));
watch(() => props.items, () => nextTick(setup));
onUnmounted(() => observer?.disconnect());

function go(id: string) {
  const el = document.getElementById(id);
  if (el) {
    activeId.value = id;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
  }
}
</script>

<template>
  <nav v-if="items.length > 0" class="text-sm">
    <div class="text-[11px] font-semibold uppercase tracking-wider text-(--fg-subtle) mb-3">
      On this page
    </div>
    <ul class="space-y-1 border-l border-(--border)">
      <li v-for="item in items" :key="item.id">
        <a
          :href="`#${item.id}`"
          :class="[
            'block py-1 -ml-px border-l-2 transition-colors',
            item.depth === 3 ? 'pl-6' : 'pl-4',
            activeId === item.id
              ? 'border-(--accent) text-(--accent-text) font-medium'
              : 'border-transparent text-(--fg-muted) hover:text-(--fg)',
          ]"
          @click.prevent="go(item.id)"
        >
          {{ item.text }}
        </a>
      </li>
    </ul>
  </nav>
</template>
