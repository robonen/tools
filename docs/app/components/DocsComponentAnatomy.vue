<script setup lang="ts">import type { ComponentMeta } from '../../modules/extractor/types';

const props = defineProps<{
  component: ComponentMeta;
  packageName: string;
}>();

const importPath = computed(() => {
  const sub = props.component.entryPoint.replace(/^\.\/?/, '');
  return sub ? `${props.packageName}/${sub}` : props.packageName;
});

const partNames = computed(() => props.component.parts.map(p => p.name));

/** Import statement + a composition skeleton (Root wraps the remaining parts). */
const anatomyCode = computed(() => {
  const names = partNames.value;
  if (names.length === 0) return '';

  const imports = `import {\n${names.map(n => `  ${n},`).join('\n')}\n} from '${importPath.value}';`;

  // Wrap the skeleton in the Root part (not whatever the barrel exports first),
  // with the remaining parts nested inside it.
  const root = (props.component.parts.find(p => p.role === 'Root') ?? props.component.parts[0]!).name;
  const rest = names.filter(n => n !== root);
  let tree: string;
  if (rest.length === 0) {
    tree = `<${root} />`;
  }
  else {
    tree = `<${root}>\n${rest.map(n => `  <${n} />`).join('\n')}\n</${root}>`;
  }

  return `${imports}\n\n${tree}`;
});

const roleColor: Record<string, string> = {
  Root: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300',
};
</script>

<template>
  <div class="space-y-10">
    <!-- Anatomy snippet -->
    <section>
      <h2 class="text-xs font-semibold uppercase tracking-wider text-(--fg-subtle) mb-3">
        Anatomy
      </h2>
      <p class="text-sm text-(--fg-muted) mb-3">
        Import the parts and compose them. Each part forwards attributes to its underlying element.
      </p>
      <DocsCode :code="anatomyCode" lang="vue" />
    </section>

    <!-- Parts -->
    <section>
      <h2 class="text-xs font-semibold uppercase tracking-wider text-(--fg-subtle) mb-4">
        API Reference
      </h2>
      <div class="space-y-8">
        <div
          v-for="part in component.parts"
          :id="part.name.toLowerCase()"
          :key="part.name"
          class="scroll-mt-20"
        >
          <div class="flex items-center gap-2.5 mb-2">
            <h3 class="font-mono text-base font-semibold text-(--fg)">{{ part.name }}</h3>
            <span
              :class="[
                'text-[11px] px-2 py-0.5 rounded-full font-medium leading-none',
                roleColor[part.role] ?? 'bg-(--bg-inset) text-(--fg-muted) border border-(--border)',
              ]"
            >
              {{ part.role }}
            </span>
          </div>

          <p v-if="part.description" class="text-sm text-(--fg-muted) mb-3 max-w-2xl">
            {{ part.description }}
          </p>

          <div v-if="part.props.length > 0" class="mb-3">
            <DocsPropsTable :properties="part.props" label="Prop" />
          </div>

          <div v-if="part.emits.length > 0" class="mb-3">
            <div class="text-[11px] font-semibold uppercase tracking-wider text-(--fg-subtle) mb-2">Emits</div>
            <DocsEmitsTable :emits="part.emits" />
          </div>

          <p v-if="part.props.length === 0 && part.emits.length === 0" class="text-sm text-(--fg-subtle) italic">
            No props or events — renders its element and forwards attributes.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
