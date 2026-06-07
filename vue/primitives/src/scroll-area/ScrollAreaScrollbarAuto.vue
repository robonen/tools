<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface ScrollAreaScrollbarAutoProps extends PrimitiveProps {
  orientation?: 'horizontal' | 'vertical';
  forceMount?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue';
import { Presence } from '../presence';
import ScrollAreaScrollbarVisible from './ScrollAreaScrollbarVisible.vue';
import { debounceCallback } from './utils';
import { useScrollAreaRootContext } from './context';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<ScrollAreaScrollbarAutoProps>(), {
  orientation: 'vertical',
});

const ctx = useScrollAreaRootContext();
const visible = ref(false);
const isHorizontal = computed(() => props.orientation === 'horizontal');

const handleResize = debounceCallback(() => {
  const vp = ctx.viewport.value;
  if (!vp)
    return;
  const overflowX = vp.offsetWidth < vp.scrollWidth;
  const overflowY = vp.offsetHeight < vp.scrollHeight;
  visible.value = isHorizontal.value ? overflowX : overflowY;
}, 10);

let viewportObserver: ResizeObserver | null = null;
let contentObserver: ResizeObserver | null = null;

function attach() {
  detach();
  const vp = ctx.viewport.value;
  const co = ctx.content.value;
  if (vp) {
    viewportObserver = new ResizeObserver(handleResize);
    viewportObserver.observe(vp);
  }
  if (co) {
    contentObserver = new ResizeObserver(handleResize);
    contentObserver.observe(co);
  }
  handleResize();
}

function detach() {
  viewportObserver?.disconnect();
  viewportObserver = null;
  contentObserver?.disconnect();
  contentObserver = null;
}

onMounted(attach);
watch([() => ctx.viewport.value, () => ctx.content.value], attach);
onScopeDispose(() => {
  handleResize.cancel();
  detach();
});
</script>

<template>
  <Presence :present="forceMount || visible">
    <ScrollAreaScrollbarVisible
      v-bind="$attrs"
      :orientation="orientation"
      :as="as"
      :data-state="visible ? 'visible' : 'hidden'"
    >
      <slot />
    </ScrollAreaScrollbarVisible>
  </Presence>
</template>
