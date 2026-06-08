<script setup lang="ts">
import { computed } from 'vue';
import type { BlockComponentProps } from '../registry';

const props = defineProps<BlockComponentProps>();

const src = computed(() => String(props.node.attrs['src'] ?? ''));
const alt = computed(() => String(props.node.attrs['alt'] ?? ''));
const caption = computed(() => String(props.node.attrs['caption'] ?? ''));
const editing = computed(() => props.editable && props.selected);

function set(key: string, event: Event): void {
  props.update({ [key]: (event.target as HTMLInputElement).value });
}
</script>

<template>
  <figure data-editor-image="" :data-selected="selected ? '' : undefined">
    <img v-if="src" :src="src" :alt="alt" draggable="false" />
    <div v-else class="image-placeholder">No image — add a URL below</div>

    <figcaption v-if="caption && !editing">{{ caption }}</figcaption>

    <div v-if="editing" class="image-fields" contenteditable="false">
      <input :value="src" placeholder="Image URL" @input="set('src', $event)" >
      <input :value="alt" placeholder="Alt text" @input="set('alt', $event)" >
      <input :value="caption" placeholder="Caption" @input="set('caption', $event)" >
    </div>
  </figure>
</template>
